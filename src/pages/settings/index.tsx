// ============================================================
// Linked Lead AI — Settings Page
// ============================================================

import { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Save, User, Settings2, Target, Download, Sparkles, Upload, FileText, Send, RefreshCw, Bell } from 'lucide-react';
import { extractTextFromPDF } from '../../lib/pdf';

export default function SettingsPage() {
  const {
    state,
    saveProfile,
    exportLeadsCSV,
    updateTelegramSettings,
    refreshTelegramStatus,
    sendTelegramTestMessage,
  } = useApp();
  const profile = state.profile;
  const provider = (import.meta.env.VITE_AI_PROVIDER || 'anthropic').toLowerCase();
  const providerLabel =
    provider === 'anthropic' || provider === 'claude'
      ? 'Anthropic Claude'
      : provider === 'gemini'
      ? 'Google Gemini'
      : provider === 'groq'
      ? 'Groq (Llama)'
      : 'Anthropic Claude';

  const [form, setForm] = useState({
    fullName: '',
    headline: '',
    skills: '',
    portfolioSummary: '',
    cvText: '',
    targetRoles: '',
    targetMarkets: '',
    defaultTone: 'professional',
  });
  const [pdfStatus, setPdfStatus] = useState('');
  const [pdfError, setPdfError] = useState('');
  const [telegramMessage, setTelegramMessage] = useState('');

  useEffect(() => {
    if (profile) {
      setForm({
        fullName: profile.fullName || '',
        headline: profile.headline || '',
        skills: profile.skills.join(', ') || '',
        portfolioSummary: profile.portfolioSummary || '',
        cvText: profile.cvText || '',
        targetRoles: profile.targetRoles.join(', ') || '',
        targetMarkets: profile.targetMarkets.join(', ') || '',
        defaultTone: profile.defaultTone || 'professional',
      });
    } else if (state.user) {
      setForm((prev) => ({
        ...prev,
        fullName: state.user?.name || '',
      }));
    }
  }, [profile, state.user]);

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    saveProfile({
      fullName: form.fullName,
      headline: form.headline,
      skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean),
      portfolioSummary: form.portfolioSummary,
      cvText: form.cvText,
      targetRoles: form.targetRoles.split(',').map((s) => s.trim()).filter(Boolean),
      targetMarkets: form.targetMarkets.split(',').map((s) => s.trim()).filter(Boolean),
      defaultTone: form.defaultTone,
    });
  }

  async function handlePDFUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    setPdfError('');
    setPdfStatus('');

    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setPdfError('Please upload a PDF file.');
      return;
    }

    try {
      setPdfStatus(`Extracting text from ${file.name}...`);
      const text = await extractTextFromPDF(file);
      if (!text) {
        throw new Error('No selectable text was found in this PDF.');
      }
      setForm((prev) => ({ ...prev, cvText: text }));
      setPdfStatus(`Extracted ${text.length.toLocaleString()} characters from ${file.name}. Save your profile to keep it.`);
    } catch (err: any) {
      setPdfError(err.message || 'Failed to extract text from PDF.');
      setPdfStatus('');
    }
  }

  function handleTelegramToggle(field: keyof typeof state.telegramSettings, checked: boolean) {
    updateTelegramSettings({ ...state.telegramSettings, [field]: checked });
  }

  function handleTelegramField(field: keyof typeof state.telegramSettings, value: string) {
    updateTelegramSettings({
      ...state.telegramSettings,
      [field]: field === 'highScoreThreshold' ? Number(value) : value,
    });
  }

  async function handleRefreshTelegram() {
    setTelegramMessage('');
    await refreshTelegramStatus();
    setTelegramMessage('Telegram status refreshed.');
  }

  async function handleTestTelegram() {
    try {
      setTelegramMessage('');
      await sendTelegramTestMessage();
      setTelegramMessage('Test reminder sent to Telegram.');
    } catch (err: any) {
      setTelegramMessage(err.message || 'Unable to send test reminder.');
    }
  }

  const startCommand = state.user ? `/start user_${state.user.id}` : '';
  const botLink = state.telegramConnection.botUsername && state.user
    ? `https://t.me/${state.telegramConnection.botUsername}?start=user_${state.user.id}`
    : '';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Configure your profile and preferences</p>
      </div>

      {/* Profile */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <User className="w-5 h-5 text-blue-600" />
          <h2 className="font-semibold text-gray-900">Profile</h2>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Professional Headline</label>
              <input
                type="text"
                value={form.headline}
                onChange={(e) => handleChange('headline', e.target.value)}
                placeholder="e.g. Full-Stack Developer | React, Node.js, TypeScript"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Skills (comma separated)</label>
            <input
              type="text"
              value={form.skills}
              onChange={(e) => handleChange('skills', e.target.value)}
              placeholder="e.g. React, Next.js, Node.js, TypeScript, Python, APIs, WhatsApp Automation"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Portfolio Summary</label>
            <textarea
              value={form.portfolioSummary}
              onChange={(e) => handleChange('portfolioSummary', e.target.value)}
              rows={3}
              placeholder="Brief summary of your work and what you build..."
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-y"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">CV Text</label>
            <div className="mb-3 flex items-center gap-3">
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">
                <Upload className="w-4 h-4" />
                Upload CV PDF
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handlePDFUpload}
                  className="hidden"
                />
              </label>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <FileText className="w-3.5 h-3.5" />
                PDF text is extracted into the CV field below.
              </div>
            </div>
            {pdfStatus && (
              <p className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2 mb-3">{pdfStatus}</p>
            )}
            {pdfError && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">{pdfError}</p>
            )}
            <textarea
              value={form.cvText}
              onChange={(e) => handleChange('cvText', e.target.value)}
              rows={10}
              placeholder="Paste your current CV here. Claude CV Coach uses this as the source of truth and will not invent experience."
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-y font-mono leading-relaxed"
            />
            <p className="text-xs text-gray-400 mt-1">
              Include your summary, skills, experience, projects, education, links, and any measurable results.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-gray-400" />
                Target Roles
              </label>
              <input
                type="text"
                value={form.targetRoles}
                onChange={(e) => handleChange('targetRoles', e.target.value)}
                placeholder="e.g. Full-Stack Developer, Freelancer"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-gray-400" />
                Target Markets
              </label>
              <input
                type="text"
                value={form.targetMarkets}
                onChange={(e) => handleChange('targetMarkets', e.target.value)}
                placeholder="e.g. Startups, US Market"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Default Outreach Tone</label>
            <select
              value={form.defaultTone}
              onChange={(e) => handleChange('defaultTone', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              <option value="professional">Professional</option>
              <option value="friendly">Friendly</option>
              <option value="casual">Casual</option>
              <option value="formal">Formal</option>
              <option value="enthusiastic">Enthusiastic</option>
            </select>
          </div>

          <button
            type="submit"
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:from-blue-700 hover:to-purple-700 transition-colors"
          >
            <Save className="w-4 h-4" />
            Save Profile
          </button>
        </form>
      </div>

      {/* Telegram */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-cyan-600" />
            <h2 className="font-semibold text-gray-900">Telegram Reminders</h2>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full border ${
            state.telegramConnection.connected
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-gray-50 text-gray-600 border-gray-200'
          }`}>
            {state.telegramConnection.connected ? 'Connected' : 'Not connected'}
          </span>
        </div>

        <div className="space-y-4">
          {!state.telegramConnection.botConfigured && (
            <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                Start the Telegram backend with <code className="bg-yellow-100 px-1 rounded">npm run server</code> and set <code className="bg-yellow-100 px-1 rounded">TELEGRAM_BOT_TOKEN</code>.
              </p>
            </div>
          )}

          <div className="bg-cyan-50 border border-cyan-100 rounded-lg p-4">
            <p className="text-sm font-medium text-cyan-900">Connect Telegram to get task, follow-up, post, and lead alerts.</p>
            {botLink ? (
              <a
                href={botLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-3 bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-cyan-700 transition-colors"
              >
                <Send className="w-4 h-4" />
                Connect Telegram
              </a>
            ) : (
              <div className="mt-3">
                <p className="text-xs text-cyan-700 mb-1">Send this command to your Telegram bot:</p>
                <code className="block bg-white border border-cyan-100 rounded-lg px-3 py-2 text-xs text-cyan-900 break-all">{startCommand}</code>
              </div>
            )}
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleRefreshTelegram}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-cyan-100 rounded-lg text-xs text-cyan-700 hover:bg-cyan-50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh Status
              </button>
              <button
                onClick={handleTestTelegram}
                disabled={!state.telegramConnection.connected}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-cyan-100 rounded-lg text-xs text-cyan-700 hover:bg-cyan-50 disabled:opacity-50"
              >
                <Bell className="w-3.5 h-3.5" />
                Send Test
              </button>
            </div>
            {telegramMessage && <p className="text-xs text-cyan-700 mt-2">{telegramMessage}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'enabled', label: 'Enable Telegram' },
              { key: 'taskReminders', label: 'Task reminders' },
              { key: 'followUpReminders', label: 'Follow-up reminders' },
              { key: 'postReminders', label: 'Post reminders' },
              { key: 'leadAlerts', label: 'High-score lead alerts' },
            ].map((item) => (
              <label key={item.key} className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 bg-gray-50">
                <input
                  type="checkbox"
                  checked={Boolean(state.telegramSettings[item.key as keyof typeof state.telegramSettings])}
                  onChange={(e) => handleTelegramToggle(item.key as keyof typeof state.telegramSettings, e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">{item.label}</span>
              </label>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Daily Task Time</label>
              <input
                type="time"
                value={state.telegramSettings.dailyTaskReminderTime}
                onChange={(e) => handleTelegramField('dailyTaskReminderTime', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Default Follow-up Time</label>
              <input
                type="time"
                value={state.telegramSettings.followUpReminderTime}
                onChange={(e) => handleTelegramField('followUpReminderTime', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Lead Alert Score</label>
              <input
                type="number"
                min="0"
                max="100"
                value={state.telegramSettings.highScoreThreshold}
                onChange={(e) => handleTelegramField('highScoreThreshold', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
            <p className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-2">Bot Commands</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              <code>/today</code> shows due tasks and follow-ups. <code>/leads</code> shows top active leads.
              <code> /followups</code> shows pending follow-ups. <code> /post x topic</code> drafts content.
              <code> /done task_id</code> marks a task complete.
            </p>
          </div>
        </div>
      </div>

      {/* AI Provider Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h2 className="font-semibold text-gray-900">AI Provider</h2>
        </div>
        <p className="text-sm text-gray-600 mb-2">
          Your AI provider is determined by the <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">VITE_AI_PROVIDER</code> environment variable.
        </p>
        <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
          <p className="text-sm">
            <span className="font-medium">Current provider:</span>{' '}
            {providerLabel}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Primary: {providerLabel}. Fallback: Groq when <code className="bg-gray-100 px-1">VITE_GROQ_API_KEY</code> is configured.
          </p>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Set <code className="bg-gray-100 px-1">VITE_AI_PROVIDER=anthropic</code>. Groq is used as fallback when configured.
        </p>
      </div>

      {/* Data */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings2 className="w-5 h-5 text-gray-600" />
          <h2 className="font-semibold text-gray-900">Data</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900">Export Leads</p>
              <p className="text-xs text-gray-500">Download all leads as CSV</p>
            </div>
            <button
              onClick={exportLeadsCSV}
              disabled={state.leads.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
          <p className="text-xs text-gray-400">
            {state.leads.length} lead{state.leads.length !== 1 ? 's' : ''} available for export
          </p>
        </div>
      </div>
    </div>
  );
}
