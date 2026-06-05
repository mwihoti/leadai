// ============================================================
// Linked Lead AI — Pipeline Page (Kanban Board)
// ============================================================

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { Plus, Copy, Check, ChevronRight } from 'lucide-react';
import { getScoreColor, getStatusLabel, formatDateShort, getLeadTypeLabel } from '../../lib/utils';
import type { CRMStatus, Lead } from '../../types';

const PIPELINE_COLUMNS: { status: CRMStatus; label: string; color: string }[] = [
  { status: 'new', label: 'New', color: 'border-t-gray-400' },
  { status: 'analyzed', label: 'Analyzed', color: 'border-t-blue-500' },
  { status: 'message_ready', label: 'Message Ready', color: 'border-t-indigo-500' },
  { status: 'contacted', label: 'Contacted', color: 'border-t-purple-500' },
  { status: 'follow_up_due', label: 'Follow-up Due', color: 'border-t-yellow-500' },
  { status: 'replied', label: 'Replied', color: 'border-t-cyan-500' },
  { status: 'call_booked', label: 'Call Booked', color: 'border-t-orange-500' },
  { status: 'won', label: 'Won', color: 'border-t-green-500' },
  { status: 'lost', label: 'Lost', color: 'border-t-red-500' },
];

export default function PipelinePage() {
  const { state, updateLead } = useApp();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function getLeadsByStatus(status: CRMStatus): Lead[] {
    return state.leads.filter((l) => l.status === status);
  }

  function moveToNextStage(lead: Lead) {
    const statusOrder: CRMStatus[] = ['new', 'analyzed', 'message_ready', 'contacted', 'follow_up_due', 'replied', 'call_booked', 'won', 'lost', 'archived'];
    const currentIndex = statusOrder.indexOf(lead.status);
    if (currentIndex < statusOrder.length - 1) {
      const nextStatus = statusOrder[currentIndex + 1];
      if (!['won', 'lost', 'archived'].includes(nextStatus) || confirm(`Move to "${getStatusLabel(nextStatus)}"?`)) {
        updateLead(lead.id, { status: nextStatus });
      }
    }
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
          <p className="text-gray-500 mt-1">Drag and drop leads through your CRM stages</p>
        </div>
        <Link
          to="/leads/new"
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:from-blue-700 hover:to-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Lead
        </Link>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: '60vh' }}>
        {PIPELINE_COLUMNS.map((column) => {
          const columnLeads = getLeadsByStatus(column.status);
          return (
            <div key={column.status} className="flex-shrink-0 w-72 bg-gray-50 rounded-xl border border-gray-200">
              {/* Column Header */}
              <div className={`p-3 border-t-4 ${column.color} rounded-t-xl bg-white border-x-0 border-b border-gray-100`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">{column.label}</h3>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    {columnLeads.length}
                  </span>
                </div>
              </div>

              {/* Cards */}
              <div className="p-2 space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
                {columnLeads.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-xs text-gray-400">No leads</p>
                  </div>
                ) : (
                  columnLeads.map((lead) => {
                    const firstMsg = state.messages.find((m) => m.leadId === lead.id && m.messageType === 'first_message');
                    return (
                      <div
                        key={lead.id}
                        className="bg-white rounded-lg border border-gray-200 p-3 space-y-2 hover:shadow-sm transition-shadow cursor-pointer"
                      >
                        <Link to={`/leads/${lead.id}`} className="block">
                          <div className="flex items-start justify-between">
                            <p className="text-sm font-medium text-gray-900">{lead.name || 'Unnamed'}</p>
                            {lead.score > 0 && (
                              <span className={`text-xs font-medium px-1.5 py-0.5 rounded border ${getScoreColor(lead.score)}`}>
                                {lead.score}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {lead.company || getLeadTypeLabel(lead.leadType)}
                          </p>
                          {lead.followUpDate && (
                            <p className="text-xs text-yellow-600 mt-1">
                              Follow-up: {formatDateShort(lead.followUpDate)}
                            </p>
                          )}
                        </Link>

                        <div className="flex items-center justify-between pt-1 border-t border-gray-50">
                          <button
                            onClick={() => moveToNextStage(lead)}
                            className="text-xs text-gray-400 hover:text-blue-600 flex items-center gap-1"
                            title="Move to next stage"
                          >
                            Move <ChevronRight className="w-3 h-3" />
                          </button>
                          {firstMsg && (
                            <button
                              onClick={() => copyToClipboard(firstMsg.body, firstMsg.id)}
                              className="p-1 text-gray-400 hover:text-blue-600"
                              title="Copy message"
                            >
                              {copiedId === firstMsg.id ? (
                                <Check className="w-3.5 h-3.5 text-green-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}