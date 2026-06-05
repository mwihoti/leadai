// ============================================================
// Linked Lead AI — Leads List Page
// ============================================================

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import {
  Plus,
  Search,
  Eye,
  Trash2,
  Sparkles,
  ClipboardPaste,
} from 'lucide-react';
import {
  formatDate,
  getScoreColor,
  getScoreLabel,
  getStatusColor,
  getStatusLabel,
  getLeadTypeLabel,
  getTrustColor,
  getTrustLabel,
} from '../../lib/utils';

export default function LeadsPage() {
  const { state, deleteLead, analyzeLead, dispatch } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredLeads = state.leads.filter((lead) => {
    const matchesSearch =
      (lead.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (lead.company?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (lead.role?.toLowerCase() || '').includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  function handleDelete(id: string) {
    if (confirm('Are you sure you want to delete this lead?')) {
      deleteLead(id);
    }
  }

  function handleAnalyze(leadId: string) {
    if (confirm('Analyze this lead with AI? This may take a moment.')) {
      analyzeLead(leadId);
    }
  }

  const statuses = ['all', 'new', 'analyzed', 'message_ready', 'contacted', 'follow_up_due', 'replied', 'call_booked', 'won', 'lost', 'archived'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-500 mt-1">{filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/leads/bulk"
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <ClipboardPaste className="w-4 h-4" />
            Bulk Paste
          </Link>
          <Link
            to="/leads/new"
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:from-blue-700 hover:to-purple-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Lead
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="w-4.5 h-4.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search leads by name, company, or role..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          >
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s === 'all' ? 'All Statuses' : getStatusLabel(s as any)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {state.aiLoading && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
          <span className="text-sm text-blue-700">AI analysis in progress...</span>
        </div>
      )}

      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <span className="text-sm text-red-700">{state.error}</span>
          <button onClick={() => dispatch({ type: 'SET_ERROR', payload: null })} className="ml-2 text-red-500 hover:text-red-700">
            Dismiss
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Name</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Company</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Role</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Type</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Score</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Trust</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Follow-up</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Created</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center">
                    <div className="text-gray-400">
                      <Search className="w-10 h-10 mx-auto mb-2" />
                      <p className="text-sm">No leads found</p>
                      <Link to="/leads/new" className="text-sm text-blue-600 hover:text-blue-700 mt-2 inline-block">
                        Add your first lead
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <Link to={`/leads/${lead.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600">
                        {lead.name || 'Unnamed'}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{lead.company || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{lead.role || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-600">{getLeadTypeLabel(lead.leadType)}</span>
                    </td>
                    <td className="px-4 py-3">
                      {lead.score > 0 ? (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getScoreColor(lead.score)}`}>
                          {lead.score} - {getScoreLabel(lead.score)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {lead.trustScore ? (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getTrustColor(lead.trustLevel)}`}>
                          {lead.trustScore} - {getTrustLabel(lead.trustLevel)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(lead.status)}`}>
                        {getStatusLabel(lead.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(lead.followUpDate)}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">{formatDate(lead.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/leads/${lead.id}`}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {lead.status === 'new' && (
                          <button
                            onClick={() => handleAnalyze(lead.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                            title="Analyze with AI"
                          >
                            <Sparkles className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(lead.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
