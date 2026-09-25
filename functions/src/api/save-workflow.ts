import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { z } from 'zod';
import { VerticalWorkflowConfigSchema } from '@compliance-saas/backend-core';
import { authorizeOrganizationRequest } from '../security/authorize-request';
import { parseCallableData } from '../security/parse-callable-data';

const schema = z.object({ orgId: z.string().regex(/^[\w-]{1,128}$/), config: VerticalWorkflowConfigSchema }).strict();
export const saveWorkflow = onCall({ region: 'us-central1', enforceAppCheck: true }, async request => {
  const input = parseCallableData(schema, request.data);
  await authorizeOrganizationRequest(request, input.orgId, ['owner', 'manager']);
  if (new Set(input.config.checklist.map(item => item.id)).size !== input.config.checklist.length) throw new HttpsError('invalid-argument', 'Checklist field identifiers must be unique.');
  const org = getFirestore().doc(`orgs/${input.orgId}`);
  if ((await org.get()).data()?.vertical !== input.config.vertical) throw new HttpsError('permission-denied', 'Workflow must match the workspace service.');
  await org.collection('workflow_configs').doc(input.config.vertical).set(input.config);
  return { success: true };
});
