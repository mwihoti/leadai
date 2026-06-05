// ============================================================
// Linked Lead AI — Messages Page
// ============================================================

import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Copy, Check, Sparkles, MessageSquare } from 'lucide-react';
import type { MessageType } from '../../types';

const MESSAGE_TYPES: { value: MessageType; label: string }[] = [
  { value: 'linkedin_connection', label: 'LinkedIn Connection' },
  { value: 'first_message', label: 'First Message' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'recruiter', label: 'Recruiter Message' },
  { value: 'founder_pitch', label: 'Founder Pitch' },
  { value: 'business_owner_pitch', label: 'Business Owner Pitch' },
  { value: 'agency_pitch', label: 'Agency Pitch' },
  { value: 'email', label: 'Email' },
  { value: 'soft_close', label: 'Soft Close' },
];

export default function MessagesPage() {
  const { state, generateMessage } = useApp();
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [selectedType, setSelectedType] = useState<MessageType>('first_message');
  const [tone, setTone] = useState('professional');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const leadsWithAnalyzed = state.leads.filter((l) => l.aiSummary);

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedLeadId) return;
    generateMessage(selectedLeadId, selectedType, tone);
  }

  const leadMessages = selectedLeadId
    ? state.messages.filter((m) => m.leadId === selectedLeadId)
    : [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        <p className="text-gray-500 mt-1">Generate and manage outreach messages</p>
      </div>

      {/* Generator Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5 text-blue-600" />
          <h2 className="font-semibold text-gray-900">Generate New Message</h2>
        </div>

        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Lead</label>
              <select
                value={selectedLeadId}
                onChange={(e) => setSelectedLeadId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Select a lead...</option>
                {leadsWithAnalyzed.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name || 'Unnamed'} ({l.company || '—'})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Message Type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as MessageType)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                {MESSAGE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Tone</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="casual">Casual</option>
                <option value="formal">Formal</option>
                <option value="enthusiastic">Enthusiastic</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={!selectedLeadId || state.aiLoading}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:from-blue-700 hover:to-purple-700 transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            {state.aiLoading ? 'Generating...' : 'Generate Message'}
          </button>
        </form>
      </div>

      {/* Generated Messages */}
      {leadMessages.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-900">Generated Messages</h2>
          {leadMessages.map((msg) => (
            <div key={msg.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {msg.messageType.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{msg.tone}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(msg.body, msg.id)}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                >
                  {copiedId === msg.id ? (
                    <><Check className="w-3.5 h-3.5" /> Copied</>
                  ) : (
                    <><Copy className="w-3.5 h-3.5" /> Copy</>
                  )}
                </button>
              </div>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{msg.body}</p>
            </div>
          ))}
        </div>
      )}

      {/* All Messages */}
      {!selectedLeadId && state.messages.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-900">All Generated Messages</h2>
          {state.messages.slice().reverse().slice(0, 10).map((msg) => {
            const lead = state.leads.find((l) => l.id === msg.leadId);
            return (
              <div key={msg.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-600 uppercase">
                      {msg.messageType.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-gray-400">· {lead?.name || 'Unknown lead'}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(msg.body, msg.id)}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                  >
                    {copiedId === msg.id ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                  </button>
                </div>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{msg.body}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}