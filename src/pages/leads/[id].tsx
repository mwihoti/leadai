// ============================================================
// Linked Lead AI — Lead Detail Page
// ============================================================

import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { v4 as uuidv4 } from 'uuid';
import {
  ArrowLeft,
  Sparkles,
  Copy,
  Check,
  Trash2,
  MessageSquare,
  Target,
  User,
  Building2,
  Globe,
  ExternalLink,
  Tag,
  ClipboardList,
  CalendarDays,
  ShieldCheck,
  AlertTriangle,
  Send,
  FileText,
  Wand2,
} from 'lucide-react';
import {
  formatDate,
  getScoreColor,
  getScoreLabel,
  getStatusLabel,
  getLeadTypeLabel,
  getOpportunityTypeLabel,
  getTodayISO,
  getTrustColor,
  getTrustLabel,
} from '../../lib/utils';
import type { CRMStatus, Interaction } from '../../types';

function getStoredInteractions(): Interaction[] {
  try {
    return JSON.parse(localStorage.getItem('linked_lead_ai_interactions') || '[]');
  } catch {
    return [];
  }
}

function ListBlock({ title, items, tone = 'gray' }: { title: string; items?: string[]; tone?: 'gray' | 'green' | 'yellow' | 'red' | 'blue' }) {
  const toneMap = {
    gray: 'bg-gray-50 border-gray-100 text-gray-800',
    green: 'bg-green-50 border-green-100 text-green-800',
    yellow: 'bg-yellow-50 border-yellow-100 text-yellow-800',
    red: 'bg-red-50 border-red-100 text-red-800',
    blue: 'bg-blue-50 border-blue-100 text-blue-800',
  };

  if (!items || items.length === 0) return null;

  return (
    <div className={`rounded-lg border p-3 ${toneMap[tone]}`}>
      <p className="text-xs font-medium uppercase tracking-wider">{title}</p>
      <ul className="mt-2 space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-sm">- {item}</li>
        ))}
      </ul>
    </div>
  );
}

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state, updateLead, deleteLead, analyzeLead, compareCVWithLead, dispatch } = useApp();

  const lead = state.leads.find((l) => l.id === id);
  const leadMessages = state.messages.filter((m) => m.leadId === id);
  const leadInteractions = state.interactions.filter((i) => i.leadId === id);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<CRMStatus>(lead?.status || 'new');
  const [followUpDate, setFollowUpDate] = useState(lead?.followUpDate || '');
  const [followUpTime, setFollowUpTime] = useState(lead?.followUpTime || '');
  const [interactionNote, setInteractionNote] = useState('');

  useEffect(() => {
    if (lead) {
      setNewStatus(lead.status);
      setFollowUpDate(lead.followUpDate || '');
      setFollowUpTime(lead.followUpTime || '');
    }
  }, [lead]);

  if (!lead) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Lead not found</p>
        <Link to="/leads" className="text-blue-600 hover:text-blue-700 mt-2 inline-block">Back to leads</Link>
      </div>
    );
  }

  const currentLead = lead;
  const primaryMessage = leadMessages.find((m) => m.messageType === 'first_message') || leadMessages[0];

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function handleStatusUpdate(status: CRMStatus) {
    setNewStatus(status);
    updateLead(currentLead.id, { status, updatedAt: new Date().toISOString() });
    const interaction: Interaction = {
      id: uuidv4(),
      userId: state.user?.id || '',
      leadId: currentLead.id,
      interactionType: 'note',
      note: `Status changed to ${getStatusLabel(status)}`,
      createdAt: new Date().toISOString(),
    };
    const storedInteractions = getStoredInteractions();
    storedInteractions.push(interaction);
    localStorage.setItem('linked_lead_ai_interactions', JSON.stringify(storedInteractions));
    dispatch({ type: 'ADD_INTERACTION', payload: interaction });
  }

  function handleFollowUpDateChange(date: string) {
    setFollowUpDate(date);
    updateLead(currentLead.id, { followUpDate: date, updatedAt: new Date().toISOString() });
  }

  function handleFollowUpTimeChange(time: string) {
    setFollowUpTime(time);
    updateLead(currentLead.id, { followUpTime: time, updatedAt: new Date().toISOString() });
  }

  function handleAddInteraction(e: React.FormEvent) {
    e.preventDefault();
    if (!interactionNote.trim()) return;
    const interaction: Interaction = {
      id: uuidv4(),
      userId: state.user?.id || '',
      leadId: currentLead.id,
      interactionType: 'note',
      note: interactionNote.trim(),
      createdAt: new Date().toISOString(),
    };
    const storedInteractions = getStoredInteractions();
    storedInteractions.push(interaction);
    localStorage.setItem('linked_lead_ai_interactions', JSON.stringify(storedInteractions));
    dispatch({ type: 'ADD_INTERACTION', payload: interaction });
    setInteractionNote('');
  }

  function handleDelete() {
    if (confirm('Delete this lead permanently?')) {
      deleteLead(currentLead.id);
      navigate('/leads');
    }
  }

  function handleAnalyze() {
    analyzeLead(currentLead.id);
  }

  function handleCompareCV() {
    compareCVWithLead(currentLead.id);
  }

  const statuses: CRMStatus[] = ['new', 'analyzed', 'message_ready', 'contacted', 'follow_up_due', 'replied', 'call_booked', 'won', 'lost', 'archived'];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/leads" className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{lead.name || 'Unnamed Lead'}</h1>
            <p className="text-gray-500 mt-1">{lead.company} {lead.role ? `· ${lead.role}` : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!lead.aiSummary && (
            <button
              onClick={handleAnalyze}
              disabled={state.aiLoading}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-blue-700 hover:to-purple-700 transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {state.aiLoading ? 'Analyzing...' : 'Analyze with AI'}
            </button>
          )}
          <button
            onClick={handleDelete}
            className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
          <span className="text-sm text-red-700">{state.error}</span>
          <button onClick={() => dispatch({ type: 'SET_ERROR', payload: null })} className="text-red-500 hover:text-red-700 text-sm">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          {lead.aiSummary ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Sparkles className="w-4.5 h-4.5 text-purple-600" />
                  Claude Analysis
                </h2>
                <button onClick={handleAnalyze} disabled={state.aiLoading} className="text-xs text-blue-600 hover:text-blue-700">
                  Re-analyze
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className={`rounded-lg border p-3 ${getScoreColor(lead.score)}`}>
                  <p className="text-xs font-medium uppercase tracking-wider">Match Score</p>
                  <p className="text-2xl font-bold mt-1">{lead.score}/100</p>
                  <p className="text-xs mt-1">{getScoreLabel(lead.score)}</p>
                </div>
                <div className={`rounded-lg border p-3 ${getTrustColor(lead.trustLevel)}`}>
                  <p className="text-xs font-medium uppercase tracking-wider">Trust Score</p>
                  <p className="text-2xl font-bold mt-1">{lead.trustScore ?? 0}/100</p>
                  <p className="text-xs mt-1">{getTrustLabel(lead.trustLevel)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{getLeadTypeLabel(lead.leadType)}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{getOpportunityTypeLabel(lead.opportunityType)}</span>
                {lead.applyMethod && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">{lead.applyMethod}</span>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Opportunity Summary</p>
                  <p className="text-sm text-gray-800 mt-1">{lead.aiSummary}</p>
                </div>
                {(lead.redFlags?.length || 0) > 0 && (
                  <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                    <p className="text-xs font-medium text-red-700 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Red Flags
                    </p>
                    <ul className="mt-2 space-y-1">
                      {lead.redFlags?.map((flag, i) => (
                        <li key={i} className="text-sm text-red-800">- {flag}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Pain Point</p>
                  <p className="text-sm text-gray-800 mt-1">{lead.painPoint}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Suggested Pitch</p>
                  <p className="text-sm text-gray-800 mt-1">{lead.suggestedPitch}</p>
                </div>
                {lead.bestProjectToMention && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                    <p className="text-xs font-medium text-blue-700 uppercase tracking-wider">Best Project to Mention</p>
                    <p className="text-sm font-medium text-blue-800 mt-1">{lead.bestProjectToMention}</p>
                    <p className="text-xs text-blue-600 mt-1">{lead.whyProjectMatches}</p>
                  </div>
                )}
                <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                  <p className="text-xs font-medium text-green-700 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Apply Strategy
                  </p>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div>
                      <p className="text-xs text-green-600">Best action</p>
                      <p className="text-sm text-green-900">{lead.bestAction || lead.recommendedNextAction}</p>
                    </div>
                    <div>
                      <p className="text-xs text-green-600">Backup action</p>
                      <p className="text-sm text-green-900">{lead.backupAction || 'Send a concise DM after applying.'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-green-600">Follow-up</p>
                      <p className="text-sm text-green-900">{lead.followUpTiming || 'After 3 days'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-green-600">Message angle</p>
                      <p className="text-sm text-green-900">{lead.messageAngle || lead.suggestedPitch}</p>
                    </div>
                  </div>
                  {lead.applyUrl && (
                    <a href={lead.applyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-green-700 hover:text-green-800 mt-3">
                      Open apply link <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
                {primaryMessage && (
                  <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Send className="w-3.5 h-3.5" />
                        Generated Message
                      </p>
                      <button onClick={() => copyToClipboard(primaryMessage.body, primaryMessage.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Copy message">
                        {copiedId === primaryMessage.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap mt-2">{primaryMessage.body}</p>
                  </div>
                )}
                {lead.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {lead.tags.map((tag, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
              <Sparkles className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No AI analysis yet</p>
              <p className="text-xs text-gray-400 mt-1">Click "Analyze with AI" to get started</p>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="w-4.5 h-4.5 text-indigo-600" />
                  Claude CV Coach
                </h2>
                <p className="text-xs text-gray-500 mt-1">Compares your saved CV against this role without inventing experience.</p>
              </div>
              <button
                onClick={handleCompareCV}
                disabled={state.aiLoading || !state.profile?.cvText?.trim()}
                className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                <Wand2 className="w-3.5 h-3.5" />
                {state.aiLoading ? 'Comparing...' : 'Compare CV with Role'}
              </button>
            </div>

            {!state.profile?.cvText?.trim() ? (
              <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3">
                <p className="text-sm text-yellow-800">Paste your CV in Settings before running Claude CV Coach.</p>
                <Link to="/settings" className="text-sm text-yellow-700 hover:text-yellow-900 font-medium mt-1 inline-block">
                  Open Settings
                </Link>
              </div>
            ) : lead.cvMatchScore === undefined ? (
              <div className="text-center py-6">
                <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No CV match yet</p>
                <p className="text-xs text-gray-400 mt-1">Run the comparison to get gaps, improvements, outreach, and a tailored CV.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className={`rounded-lg border p-3 ${getScoreColor(lead.cvMatchScore)}`}>
                  <p className="text-xs font-medium uppercase tracking-wider">CV Match Score</p>
                  <p className="text-2xl font-bold mt-1">{lead.cvMatchScore}/100</p>
                  <p className="text-xs mt-1">{getScoreLabel(lead.cvMatchScore)}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <ListBlock title="Must-have requirements" items={lead.cvMustHaveRequirements} tone="blue" />
                  <ListBlock title="Nice-to-have requirements" items={lead.cvNiceToHaveRequirements} tone="gray" />
                  <ListBlock title="Strong matching evidence" items={lead.cvStrongEvidence} tone="green" />
                  <ListBlock title="Missing or weak" items={lead.cvMissingOrWeak} tone="red" />
                  <ListBlock title="Weak CV sections" items={lead.cvWeakSections} tone="yellow" />
                  <ListBlock title="Improve before applying" items={lead.cvImprovements} tone="blue" />
                </div>

                {lead.cvPersonalizedOutreach && (
                  <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Personalized Outreach</p>
                      <button onClick={() => copyToClipboard(lead.cvPersonalizedOutreach || '', 'cv-outreach')} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Copy outreach">
                        {copiedId === 'cv-outreach' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap mt-2">{lead.cvPersonalizedOutreach}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  {lead.cvEmailApplication && (
                    <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Application Email</p>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap mt-2">{lead.cvEmailApplication}</p>
                    </div>
                  )}
                  {lead.cvFollowUpMessage && (
                    <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Follow-up Message</p>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap mt-2">{lead.cvFollowUpMessage}</p>
                    </div>
                  )}
                </div>

                {lead.cvCoverLetter && (
                  <div className="bg-white border border-gray-200 rounded-lg p-3">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Cover Letter</p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap mt-2">{lead.cvCoverLetter}</p>
                  </div>
                )}

                {lead.tailoredCv && (
                  <div className="bg-white border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tailored Clean CV</p>
                      <button onClick={() => copyToClipboard(lead.tailoredCv || '', 'tailored-cv')} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Copy tailored CV">
                        {copiedId === 'tailored-cv' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap mt-2 max-h-96 overflow-y-auto">{lead.tailoredCv}</p>
                  </div>
                )}

                <ListBlock title="Truthfulness notes" items={lead.cvTruthfulnessNotes} tone="yellow" />
                {lead.cvMatchUpdatedAt && (
                  <p className="text-xs text-gray-400">Last compared {formatDate(lead.cvMatchUpdatedAt)}</p>
                )}
              </div>
            )}
          </div>

          {leadMessages.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-4.5 h-4.5 text-blue-600" />
                Generated Messages
              </h2>
              <div className="space-y-3">
                {leadMessages.map((msg) => (
                  <div key={msg.id} className="bg-gray-50 border border-gray-100 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-600 uppercase tracking-wider">
                          {msg.messageType.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-gray-400">({msg.tone})</span>
                      </div>
                      <button onClick={() => copyToClipboard(msg.body, msg.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Copy message">
                        {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{msg.body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <ClipboardList className="w-4.5 h-4.5 text-gray-600" />
              Interaction History
            </h2>
            {leadInteractions.length === 0 ? (
              <p className="text-sm text-gray-400">No interactions recorded yet</p>
            ) : (
              <div className="space-y-2">
                {[...leadInteractions].reverse().map((interaction) => (
                  <div key={interaction.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-600 uppercase">{interaction.interactionType}</span>
                        <span className="text-xs text-gray-400">{formatDate(interaction.createdAt)}</span>
                      </div>
                      <p className="text-sm text-gray-800 mt-0.5">{interaction.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={handleAddInteraction} className="flex gap-2">
              <input
                type="text"
                value={interactionNote}
                onChange={(e) => setInteractionNote(e.target.value)}
                placeholder="Add a note..."
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
              <button type="submit" disabled={!interactionNote.trim()} className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50">
                Add
              </button>
            </form>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h3 className="font-semibold text-gray-900 text-sm">Lead Info</h3>
            {lead.name && <div className="flex items-center gap-2 text-sm"><User className="w-4 h-4 text-gray-400" /><span className="text-gray-700">{lead.name}</span></div>}
            {lead.company && <div className="flex items-center gap-2 text-sm"><Building2 className="w-4 h-4 text-gray-400" /><span className="text-gray-700">{lead.company}</span></div>}
            {lead.role && <div className="flex items-center gap-2 text-sm"><Target className="w-4 h-4 text-gray-400" /><span className="text-gray-700">{lead.role}</span></div>}
            {lead.linkedinUrl && <div className="flex items-center gap-2 text-sm"><ExternalLink className="w-4 h-4 text-gray-400" /><a href={lead.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 truncate">View LinkedIn Profile</a></div>}
            {lead.website && <div className="flex items-center gap-2 text-sm"><Globe className="w-4 h-4 text-gray-400" /><a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 truncate">Visit Website</a></div>}
            <div className="flex items-center gap-2 text-sm"><Tag className="w-4 h-4 text-gray-400" /><span className="text-gray-600">{lead.source}</span></div>
            <div className="text-xs text-gray-400">Added {formatDate(lead.createdAt)}</div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h3 className="font-semibold text-gray-900 text-sm">Update Status</h3>
            <select value={newStatus} onChange={(e) => handleStatusUpdate(e.target.value as CRMStatus)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
              {statuses.map((s) => <option key={s} value={s}>{getStatusLabel(s)}</option>)}
            </select>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-gray-400" />
              Follow-up Reminder
            </h3>
            <input type="date" value={followUpDate} onChange={(e) => handleFollowUpDateChange(e.target.value)} min={getTodayISO()}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
            <input type="time" value={followUpTime} onChange={(e) => handleFollowUpTimeChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
            <p className="text-xs text-gray-400">Telegram uses the time here, or the default time in Settings if empty.</p>
          </div>

          {lead.rawText && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              <h3 className="font-semibold text-gray-900 text-sm">Original Content</h3>
              <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">{lead.rawText}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
