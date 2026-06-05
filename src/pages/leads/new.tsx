// ============================================================
// Linked Lead AI — New Lead Page
// ============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { Sparkles, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const SOURCES = [
  { value: '', label: 'Auto-detect from content' },
  { value: 'LinkedIn Job', label: 'LinkedIn Job' },
  { value: 'LinkedIn Profile', label: 'LinkedIn Profile' },
  { value: 'LinkedIn Post', label: 'LinkedIn Post' },
  { value: 'Job Board', label: 'Job Board' },
  { value: 'Company Website', label: 'Company Website' },
  { value: 'WhatsApp Group', label: 'WhatsApp Group' },
  { value: 'Telegram', label: 'Telegram' },
  { value: 'Email', label: 'Email' },
  { value: 'Referral', label: 'Referral' },
  { value: 'Other', label: 'Other' },
];

export default function NewLeadPage() {
  const navigate = useNavigate();
  const { addLead, analyzeLead } = useApp();

  const [form, setForm] = useState({
    name: '',
    company: '',
    role: '',
    linkedinUrl: '',
    website: '',
    source: '',
    rawText: '',
    tags: '',
  });

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSaveAndAnalyze(e: React.FormEvent) {
    e.preventDefault();
    
    const leadData = {
      name: form.name,
      company: form.company,
      role: form.role,
      linkedinUrl: form.linkedinUrl,
      website: form.website,
      source: form.source,
      rawText: form.rawText,
      leadType: 'unknown' as any,
      opportunityType: 'unknown' as any,
      score: 0,
      aiSummary: '',
      painPoint: '',
      suggestedPitch: '',
      bestProjectToMention: '',
      whyProjectMatches: '',
      recommendedNextAction: '',
      tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      status: 'new' as any,
      followUpDate: '',
    };

    const newLead = addLead(leadData);
    
    if (newLead && form.rawText.trim()) {
      setTimeout(() => analyzeLead(newLead.id), 300);
    }

    navigate('/leads');
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/leads" className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Lead</h1>
          <p className="text-gray-500 mt-1">Paste a job, post, profile, email, or company page and let Claude structure it</p>
        </div>
      </div>

      <form onSubmit={handleSaveAndAnalyze} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div>
            <h2 className="font-semibold text-gray-900">Basic Information</h2>
            <p className="text-sm text-gray-500 mt-1">Optional. Leave these blank if the pasted content contains the details.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Person / Lead Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Recruiter, poster, company, or contact"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Company</label>
              <input
                type="text"
                value={form.company}
                onChange={(e) => handleChange('company', e.target.value)}
                placeholder="Company name"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Role / Opportunity Title</label>
              <input
                type="text"
                value={form.role}
                onChange={(e) => handleChange('role', e.target.value)}
                placeholder="e.g. Fullstack Engineer, Founder, Hiring Manager"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Source</label>
              <select
                value={form.source}
                onChange={(e) => handleChange('source', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                {SOURCES.map((s) => (
                  <option key={s.value || 'auto'} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">LinkedIn URL</label>
              <input
                type="url"
                value={form.linkedinUrl}
                onChange={(e) => handleChange('linkedinUrl', e.target.value)}
                placeholder="https://linkedin.com/in/..."
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Website</label>
              <input
                type="url"
                value={form.website}
                onChange={(e) => handleChange('website', e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
              />
            </div>
          </div>
        </div>

        {/* Raw Text - The Core Input */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div>
            <h2 className="font-semibold text-gray-900">Post / Job / Content Context</h2>
            <p className="text-sm text-gray-500 mt-1">
              Paste the full text. Claude will extract company, role, apply method, trust signals, and outreach strategy.
            </p>
          </div>
          <textarea
            value={form.rawText}
            onChange={(e) => handleChange('rawText', e.target.value)}
            placeholder={`Paste a lead, job, post, email, or company page here...

Example: LinkedIn job details, recruiter post, founder request, client brief, grant/collaboration post, company website content, or email.`}
            rows={10}
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm resize-y"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tags (comma separated)</label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => handleChange('tags', e.target.value)}
              placeholder="e.g. high-priority, climate, finance, remote, internship"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link to="/leads" className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={!form.rawText.trim()}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:from-blue-700 hover:to-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-4 h-4" />
            Save & Analyze with AI
          </button>
        </div>
      </form>
    </div>
  );
}
