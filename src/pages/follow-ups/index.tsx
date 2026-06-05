// ============================================================
// Linked Lead AI — Follow-ups Page
// ============================================================

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { Copy, Check, CalendarDays, ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { formatDate, getTodayISO, getStatusColor, getStatusLabel, getScoreColor } from '../../lib/utils';
import type { CRMStatus } from '../../types';

export default function FollowUpsPage() {
  const { state, updateLead } = useApp();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'due_today' | 'overdue' | 'upcoming'>('all');

  const today = getTodayISO();

  const followUpLeads = state.leads.filter(
    (l) =>
      l.followUpDate &&
      !['won', 'lost', 'archived'].includes(l.status)
  );

  const dueToday = followUpLeads.filter((l) => l.followUpDate === today);
  const overdue = followUpLeads.filter((l) => l.followUpDate < today);
  const upcoming = followUpLeads.filter((l) => l.followUpDate > today);

  let displayedLeads = followUpLeads;
  if (filter === 'due_today') displayedLeads = dueToday;
  else if (filter === 'overdue') displayedLeads = overdue;
  else if (filter === 'upcoming') displayedLeads = upcoming;

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function markFollowedUp(leadId: string) {
    const lead = state.leads.find((l) => l.id === leadId);
    if (!lead) return;
    const nextStatus: CRMStatus = lead.status === 'follow_up_due' ? 'replied' : 'contacted';
    updateLead(leadId, { status: nextStatus, followUpDate: '' });
  }

  function getFollowUpMessage(leadId: string): string {
    const msg = state.messages.find((m) => m.leadId === leadId && m.messageType === 'follow_up');
    return msg?.body || '';
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Follow-ups</h1>
        <p className="text-gray-500 mt-1">Track and manage your follow-up schedule</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <span className="text-2xl font-bold text-yellow-700">{dueToday.length}</span>
          </div>
          <p className="text-sm text-yellow-700 mt-2">Due Today</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-2xl font-bold text-red-700">{overdue.length}</span>
          </div>
          <p className="text-sm text-red-700 mt-2">Overdue</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-2xl font-bold text-blue-700">{upcoming.length}</span>
          </div>
          <p className="text-sm text-blue-700 mt-2">Upcoming</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {[
          { key: 'all', label: 'All' },
          { key: 'due_today', label: 'Due Today' },
          { key: 'overdue', label: 'Overdue' },
          { key: 'upcoming', label: 'Upcoming' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === tab.key
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Follow-up Cards */}
      <div className="space-y-3">
        {displayedLeads.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-green-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">All caught up! No follow-ups needed.</p>
          </div>
        ) : (
          displayedLeads.map((lead) => {
            const followUpMsg = getFollowUpMessage(lead.id);
            return (
              <div key={lead.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Link to={`/leads/${lead.id}`} className="text-sm font-semibold text-gray-900 hover:text-blue-600">
                        {lead.name || 'Unnamed'}
                      </Link>
                      {lead.score > 0 && (
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded border ${getScoreColor(lead.score)}`}>
                          {lead.score}
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(lead.status)}`}>
                        {getStatusLabel(lead.status)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {lead.company} · {lead.role || '—'}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
                      <span className={`text-xs font-medium ${
                        lead.followUpDate < today ? 'text-red-600' : lead.followUpDate === today ? 'text-yellow-600' : 'text-gray-600'
                      }`}>
                        {lead.followUpDate < today
                          ? `Overdue: ${formatDate(lead.followUpDate)}${lead.followUpTime ? ` at ${lead.followUpTime}` : ''}`
                          : lead.followUpDate === today
                          ? `Due Today${lead.followUpTime ? ` at ${lead.followUpTime}` : ''}`
                          : `Follow up: ${formatDate(lead.followUpDate)}${lead.followUpTime ? ` at ${lead.followUpTime}` : ''}`}
                      </span>
                    </div>
                  </div>
                </div>

                {followUpMsg && (
                  <div className="mt-3 bg-gray-50 border border-gray-100 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Follow-up message:</p>
                    <p className="text-sm text-gray-700">{followUpMsg}</p>
                    <button
                      onClick={() => copyToClipboard(followUpMsg, `msg-${lead.id}`)}
                      className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                    >
                      {copiedId === `msg-${lead.id}` ? (
                        <><Check className="w-3 h-3" /> Copied</>
                      ) : (
                        <><Copy className="w-3 h-3" /> Copy message</>
                      )}
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => markFollowedUp(lead.id)}
                    className="flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700 bg-green-50 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Mark Followed Up
                  </button>
                  <Link
                    to={`/leads/${lead.id}`}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600"
                  >
                    View Lead <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
