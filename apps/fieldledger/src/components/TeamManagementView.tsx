import React, { useState } from 'react';
import {
  Users, UserPlus, Shield, UserCheck, AlertTriangle, Copy, Check,
  Trash2, RefreshCw, Mail, Clock, ShieldAlert, ArrowUpRight
} from 'lucide-react';
import { useOperations } from '../context/OperationsContext';
import type { TeamMemberRecord, InvitationRecord, TeamRole } from '../domain';

export function TeamManagementView() {
  const {
    snapshot,
    user,
    mode,
    createInvitation,
    revokeInvitation,
    updateMemberRole,
    setMemberActive,
    removeMember,
    setView,
  } = useOperations();

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'manager' | 'technician'>('technician');
  const [createdInviteUrl, setCreatedInviteUrl] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const org = snapshot.organization;
  const members = snapshot.members || [];
  const invitations = (snapshot.invitations || []).filter((inv) => inv.status === 'pending' && inv.expiresAtMs > Date.now());

  const currentMember = members.find((m) => m.userId === user?.uid) || {
    userId: user?.uid || 'current-user',
    orgId: org.id,
    role: (mode === 'demo' ? 'owner' : 'technician') as TeamRole,
    active: true,
  };
  const isOwner = currentMember.role === 'owner';
  const isManager = currentMember.role === 'manager';
  const canManageTeam = isOwner || isManager;

  const activeTechs = members.filter((m) => m.role === 'technician' && m.active).length;
  const pendingTechInvites = invitations.filter((inv) => inv.role === 'technician').length;
  const maxTechs = org.maxTechnicians || 3;
  const techSeatsUsed = activeTechs + pendingTechInvites;
  const seatsRemaining = Math.max(0, maxTechs - techSeatsUsed);
  const isAtSeatLimit = techSeatsUsed >= maxTechs;

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setBusy(true);
    try {
      const res = await createInvitation(inviteEmail.trim().toLowerCase(), inviteRole);
      setCreatedInviteUrl(res.inviteUrl);
      setInviteEmail('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to create invitation.');
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleRevoke = async (invitationId: string) => {
    if (!confirm('Are you sure you want to revoke this invitation?')) return;
    setActionError(null);
    try {
      await revokeInvitation(invitationId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to revoke invitation.');
    }
  };

  const handleRoleChange = async (targetUserId: string, newRole: TeamRole) => {
    setActionError(null);
    try {
      await updateMemberRole(targetUserId, newRole as 'manager' | 'technician' | 'client');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update member role.');
    }
  };

  const handleToggleActive = async (targetUserId: string, currentActive: boolean) => {
    setActionError(null);
    try {
      await setMemberActive(targetUserId, !currentActive);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to change member status.');
    }
  };

  const handleRemove = async (targetUserId: string, email?: string) => {
    if (!confirm(`Are you sure you want to remove ${email || 'this member'} from the organization?`)) return;
    setActionError(null);
    try {
      await removeMember(targetUserId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to remove member.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[.18em] text-slate-500 font-bold">Organization & Access</p>
          <h1 className="text-3xl font-black tracking-[-.04em] mt-1 text-white">Team & Dispatch</h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage dispatchers, technicians, and mobile access seats.
          </p>
        </div>

        {canManageTeam && (
          <button
            onClick={() => {
              setCreatedInviteUrl(null);
              setInviteModalOpen(true);
            }}
            className="primary-button justify-center"
          >
            <UserPlus className="w-4 h-4" />
            Invite team member
          </button>
        )}
      </div>

      {actionError && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-200 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Seat Capacity Card */}
      <div className="rounded-2xl border border-white/8 bg-[#101620]/80 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-orange-400" />
              <span className="text-xs uppercase tracking-wider font-mono font-bold text-slate-400">
                Technician Seat Limit
              </span>
            </div>
            <p className="text-2xl font-black text-white mt-2">
              {techSeatsUsed} of {maxTechs} seats used
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {activeTechs} active · {pendingTechInvites} pending invite{pendingTechInvites === 1 ? '' : 's'} · {seatsRemaining} available
            </p>
          </div>

          <div className="sm:text-right">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
              isAtSeatLimit
                ? 'bg-amber-400/15 text-amber-300 border border-amber-400/30'
                : 'bg-emerald-400/15 text-emerald-300 border border-emerald-400/30'
            }`}>
              {isAtSeatLimit ? 'Seat cap reached' : `${seatsRemaining} seats left`}
            </span>
            {isAtSeatLimit && (
              <p className="text-xs text-slate-400 mt-2">
                Need more technicians?{' '}
                <button
                  onClick={() => setView('billing')}
                  className="text-orange-400 hover:text-orange-300 underline font-semibold"
                >
                  Upgrade plan
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full bg-white/5 h-2 rounded-full mt-4 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isAtSeatLimit ? 'bg-amber-400' : 'bg-orange-500'
            }`}
            style={{ width: `${Math.min(100, (techSeatsUsed / maxTechs) * 100)}%` }}
          />
        </div>
      </div>

      {/* Active Team Members Section */}
      <div className="rounded-2xl border border-white/8 bg-[#101620]/75 overflow-hidden">
        <div className="p-5 border-b border-white/8 flex items-center justify-between">
          <div>
            <h2 className="font-black text-white">Active Team Members ({members.length})</h2>
            <p className="text-xs text-slate-400 mt-0.5">Technicians and administrators with active access.</p>
          </div>
        </div>

        <div className="divide-y divide-white/6">
          {members.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              No team members found.
            </div>
          ) : (
            members.map((member) => {
              const isSelf = member.userId === user?.uid;
              return (
                <div key={member.userId} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[.02] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/8 grid place-items-center text-slate-300 font-bold">
                      {(member.displayName || member.email || 'U')[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{member.displayName || member.email || 'Team member'}</span>
                        {isSelf && (
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/10 text-slate-300">You</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{member.email || 'No email recorded'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                    {/* Role badge or selector */}
                    {canManageTeam && isOwner && !isSelf ? (
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.userId, e.target.value as TeamRole)}
                        className="rounded-lg bg-[#090d14] border border-white/10 px-2.5 py-1 text-xs text-white font-medium"
                      >
                        <option value="manager">Manager</option>
                        <option value="technician">Technician</option>
                        <option value="client">Client</option>
                      </select>
                    ) : (
                      <span className="text-xs font-mono uppercase tracking-wider px-2.5 py-1 rounded-md bg-white/5 border border-white/8 text-slate-300 font-bold">
                        {member.role}
                      </span>
                    )}

                    {/* Status badge */}
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${
                      member.active
                        ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20'
                        : 'bg-rose-400/10 text-rose-400 border border-rose-400/20'
                    }`}>
                      {member.active ? 'Active' : 'Suspended'}
                    </span>

                    {/* Actions */}
                    {canManageTeam && !isSelf && (
                      <div className="flex items-center gap-1.5">
                        <button
                          title={member.active ? 'Suspend member' : 'Reactivate member'}
                          onClick={() => handleToggleActive(member.userId, member.active)}
                          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                        <button
                          title="Remove member"
                          onClick={() => handleRemove(member.userId, member.email)}
                          className="p-1.5 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Pending Invitations Section */}
      <div className="rounded-2xl border border-white/8 bg-[#101620]/75 overflow-hidden">
        <div className="p-5 border-b border-white/8">
          <h2 className="font-black text-white">Pending Invitations ({invitations.length})</h2>
          <p className="text-xs text-slate-400 mt-0.5">Users who have been invited but have not yet accepted.</p>
        </div>

        <div className="divide-y divide-white/6">
          {invitations.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              No pending invitations.
            </div>
          ) : (
            invitations.map((inv) => (
              <div key={inv.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[.02] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-400/10 border border-orange-400/20 grid place-items-center text-orange-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-white">{inv.email}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-slate-300 font-bold uppercase">{inv.role}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1 text-[11px]">
                        <Clock className="w-3 h-3 text-slate-500" />
                        Expires in {Math.max(0, Math.ceil((inv.expiresAtMs - Date.now()) / (1000 * 60 * 60 * 24)))} days
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRevoke(inv.id)}
                    className="text-xs text-rose-400 hover:text-rose-300 px-3 py-1.5 rounded-lg border border-rose-500/20 hover:bg-rose-500/10 transition-colors"
                  >
                    Revoke
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#101620] border border-white/10 p-6 shadow-2xl space-y-5">
            <div>
              <h3 className="text-lg font-black text-white">Invite Team Member</h3>
              <p className="text-xs text-slate-400 mt-1">
                An invitation token will be generated. Send the invite link to your colleague.
              </p>
            </div>

            {createdInviteUrl ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-400/10 border border-emerald-400/20 text-emerald-300 text-xs">
                  <p className="font-bold text-sm">Invitation Created!</p>
                  <p className="mt-1">Share this direct acceptance link with your team member:</p>
                </div>

                <div className="p-3 rounded-xl bg-[#080b11] border border-white/10 flex items-center justify-between gap-2">
                  <span className="text-xs font-mono text-slate-300 truncate">{createdInviteUrl}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(createdInviteUrl)}
                    className="primary-button py-1.5 px-3 text-xs shrink-0"
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedUrl ? 'Copied' : 'Copy'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setInviteModalOpen(false);
                    setCreatedInviteUrl(null);
                  }}
                  className="secondary-button w-full justify-center"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateInvite} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Colleague Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@example.com"
                    className="w-full rounded-xl border border-white/10 bg-[#090d14] px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-orange-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Role & Permissions
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'manager' | 'technician')}
                    className="w-full rounded-xl border border-white/10 bg-[#090d14] px-4 py-2.5 text-sm text-white focus:border-orange-400 focus:outline-none"
                  >
                    <option value="technician">Field Technician (Mobile service execution)</option>
                    {isOwner && <option value="manager">Manager (Dispatch, scheduling & reports)</option>}
                  </select>
                </div>

                {inviteRole === 'technician' && isAtSeatLimit && (
                  <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>All {maxTechs} technician seats are currently allocated.</span>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setInviteModalOpen(false)}
                    className="secondary-button flex-1 justify-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={busy || (inviteRole === 'technician' && isAtSeatLimit)}
                    className="primary-button flex-1 justify-center"
                  >
                    {busy ? 'Creating…' : 'Generate Invite'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
