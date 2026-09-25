import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { parseCallableData } from '../security/parse-callable-data';

const OPERATOR_EMAILS = ['asher.wright202@gmail.com'];

const CreateTicketSchema = z.object({
  subject: z.string().min(3).max(200),
  category: z.enum(['technical', 'billing', 'workflow', 'feature_request', 'other']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  message: z.string().min(10).max(5000),
  email: z.string().email().optional(),
  name: z.string().max(100).optional(),
  orgId: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/).optional(),
}).strict();

const AddReplySchema = z.object({
  ticketId: z.string().min(5).max(100),
  message: z.string().min(1).max(5000),
}).strict();

const UpdateStatusSchema = z.object({
  ticketId: z.string().min(5).max(100),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
}).strict();

const ListTicketsSchema = z.object({
  all: z.boolean().optional(),
}).strict();

function isOperator(email?: string | null): boolean {
  return Boolean(email && OPERATOR_EMAILS.includes(email.toLowerCase().trim()));
}

export const createSupportTicket = onCall(
  { region: 'us-central1', enforceAppCheck: true },
  async (request) => {
    const input = parseCallableData(CreateTicketSchema, request.data);
    const db = getFirestore();

    const uid = request.auth?.uid || null;
    const email = request.auth?.token.email || input.email;
    if (!email) {
      throw new HttpsError('invalid-argument', 'An email address is required to submit a support ticket.');
    }

    let orgId: string | null = null;
    let orgName = '';
    if (input.orgId) {
      const orgSnap = await db.doc(`orgs/${input.orgId}`).get();
      if (orgSnap.exists) {
        orgId = input.orgId;
        orgName = orgSnap.data()?.name || '';
      }
    } else if (uid) {
      const workspaceSnap = await db.doc(`account_workspaces/${uid}`).get();
      if (workspaceSnap.exists) {
        orgId = workspaceSnap.data()?.orgId || null;
        if (orgId) {
          const orgSnap = await db.doc(`orgs/${orgId}`).get();
          orgName = orgSnap.data()?.name || '';
        }
      }
    }

    const ticketRef = db.collection('support_tickets').doc();
    const ticketId = ticketRef.id;
    const ticketNumber = `FL-${Date.now().toString().slice(-5)}-${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date().toISOString();

    const initialResponse = {
      id: `msg_${Date.now()}`,
      senderId: uid || 'visitor',
      senderEmail: email,
      senderName: input.name || email.split('@')[0],
      senderRole: uid ? (isOperator(email) ? 'operator' : 'user') : 'visitor',
      message: input.message,
      createdAt: now,
    };

    const ticketData = {
      id: ticketId,
      ticketNumber,
      userId: uid,
      userEmail: email,
      userName: input.name || email.split('@')[0],
      orgId,
      orgName,
      subject: input.subject,
      category: input.category,
      priority: input.priority,
      status: 'open',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      responses: [initialResponse],
    };

    await ticketRef.set(ticketData);

    return {
      success: true,
      ticketId,
      ticketNumber,
    };
  }
);

export const addTicketReply = onCall(
  { region: 'us-central1', enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in to reply to a ticket.');
    }
    const input = parseCallableData(AddReplySchema, request.data);
    const db = getFirestore();
    const callerEmail = request.auth.token.email || '';
    const callerIsOperator = isOperator(callerEmail);

    const ticketRef = db.doc(`support_tickets/${input.ticketId}`);
    const ticketSnap = await ticketRef.get();
    if (!ticketSnap.exists) {
      throw new HttpsError('not-found', 'Support ticket not found.');
    }

    const ticket = ticketSnap.data()!;
    const isOwner = ticket.userId === request.auth.uid;
    const isOrgMember = ticket.orgId ? (await db.doc(`orgs/${ticket.orgId}/users/${request.auth.uid}`).get()).exists : false;

    if (!callerIsOperator && !isOwner && !isOrgMember) {
      throw new HttpsError('permission-denied', 'You do not have permission to reply to this ticket.');
    }

    const replyId = `msg_${Date.now()}`;
    const newResponse = {
      id: replyId,
      senderId: request.auth.uid,
      senderEmail: callerEmail,
      senderName: callerEmail.split('@')[0],
      senderRole: callerIsOperator ? 'operator' : 'user',
      message: input.message,
      createdAt: new Date().toISOString(),
    };

    const updates: Record<string, unknown> = {
      responses: FieldValue.arrayUnion(newResponse),
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (callerIsOperator && ticket.status === 'open') {
      updates.status = 'in_progress';
    } else if (!callerIsOperator && ticket.status === 'resolved') {
      updates.status = 'open';
    }

    await ticketRef.update(updates);

    return {
      success: true,
      replyId,
    };
  }
);

export const updateTicketStatus = onCall(
  { region: 'us-central1', enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in to update ticket status.');
    }
    const input = parseCallableData(UpdateStatusSchema, request.data);
    const db = getFirestore();
    const callerEmail = request.auth.token.email || '';
    const callerIsOperator = isOperator(callerEmail);

    const ticketRef = db.doc(`support_tickets/${input.ticketId}`);
    const ticketSnap = await ticketRef.get();
    if (!ticketSnap.exists) {
      throw new HttpsError('not-found', 'Support ticket not found.');
    }

    const ticket = ticketSnap.data()!;
    const isOwner = ticket.userId === request.auth.uid;

    if (!callerIsOperator && !isOwner) {
      throw new HttpsError('permission-denied', 'You do not have permission to update this ticket.');
    }

    if (!callerIsOperator && !['resolved', 'closed'].includes(input.status)) {
      throw new HttpsError('permission-denied', 'Users can only mark tickets resolved or closed.');
    }

    await ticketRef.update({
      status: input.status,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      status: input.status,
    };
  }
);

export const listSupportTickets = onCall(
  { region: 'us-central1', enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required.');
    }
    const input = parseCallableData(ListTicketsSchema, request.data);
    const db = getFirestore();
    const callerEmail = request.auth.token.email || '';
    const callerIsOperator = isOperator(callerEmail);

    let query;
    if (callerIsOperator && input.all) {
      query = db.collection('support_tickets').orderBy('updatedAt', 'desc').limit(100);
    } else {
      query = db.collection('support_tickets').where('userId', '==', request.auth.uid).limit(50);
    }

    const snapshot = await query.get();
    const tickets = snapshot.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        ticketNumber: d.ticketNumber || doc.id,
        userId: d.userId,
        userEmail: d.userEmail,
        userName: d.userName,
        orgId: d.orgId,
        orgName: d.orgName,
        subject: d.subject,
        category: d.category,
        priority: d.priority,
        status: d.status,
        createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : d.createdAt,
        updatedAt: d.updatedAt?.toDate ? d.updatedAt.toDate().toISOString() : d.updatedAt,
        responses: d.responses || [],
      };
    });

    return {
      success: true,
      tickets,
      isOperator: callerIsOperator,
    };
  }
);
