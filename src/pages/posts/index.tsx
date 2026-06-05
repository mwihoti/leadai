// ============================================================
// Linked Lead AI — Content Studio
// ============================================================

import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { CalendarClock, Check, Copy, FileEdit, Sparkles, XCircle } from 'lucide-react';
import type { ContentFormat, ContentPlatform, PostType } from '../../types';

const POST_TYPES: { value: PostType; label: string; description: string }[] = [
  { value: 'project_demo', label: 'Project Demo', description: 'Showcase a project you built' },
  { value: 'technical_breakdown', label: 'Technical Breakdown', description: 'Explain how you built something' },
  { value: 'business_problem', label: 'Business Problem', description: 'Solve a business challenge' },
  { value: 'case_study', label: 'Case Study', description: 'Share a client success story' },
  { value: 'hiring_availability', label: 'Hiring Availability', description: 'Let recruiters know you are open' },
  { value: 'service_offer', label: 'Service Offer', description: 'Promote your services professionally' },
  { value: 'learning_update', label: 'Learning Update', description: 'Share what you are learning' },
];

const PLATFORMS: { value: ContentPlatform; label: string }[] = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'x', label: 'X / Twitter' },
  { value: 'medium', label: 'Medium' },
  { value: 'blog', label: 'Blog' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'devto', label: 'Dev.to' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
];

const FORMATS: { value: ContentFormat; label: string }[] = [
  { value: 'short_post', label: 'Short Post' },
  { value: 'thread', label: 'Thread' },
  { value: 'outline', label: 'Outline' },
  { value: 'full_draft', label: 'Full Draft' },
  { value: 'caption', label: 'Caption' },
];

export default function PostsPage() {
  const { state, generatePost, scheduleContentReminder, updateContentReminder } = useApp();
  const [postType, setPostType] = useState<PostType>('project_demo');
  const [platform, setPlatform] = useState<ContentPlatform>('linkedin');
  const [format, setFormat] = useState<ContentFormat>('short_post');
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('professional');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [scheduleMessage, setScheduleMessage] = useState('');

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) return;
    setScheduleMessage('');
    const content = await generatePost(postType, topic, tone, selectedProjectId || undefined, platform, format);
    setGeneratedContent(content);
  }

  function handleCopy() {
    if (!generatedContent) return;
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSchedule() {
    if (!generatedContent || !scheduledAt) return;
    const platformLabel = PLATFORMS.find((item) => item.value === platform)?.label || platform;
    const reminder = scheduleContentReminder({
      platform,
      platformLabel,
      postType,
      format,
      topic,
      tone,
      title: `${platformLabel}: ${topic}`,
      content: generatedContent,
      scheduledAt: new Date(scheduledAt).toISOString(),
    });
    if (reminder) {
      setScheduleMessage('Post reminder scheduled for Telegram.');
    }
  }

  const upcomingReminders = [...state.contentReminders]
    .filter((reminder) => reminder.status === 'scheduled')
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
    .slice(0, 8);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Content Studio</h1>
        <p className="text-gray-500 mt-1">Generate platform-specific content and schedule Telegram posting reminders</p>
      </div>

      <div className="grid grid-cols-[420px_1fr] gap-6">
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileEdit className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold text-gray-900">Generator</h2>
            </div>

            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Platform</label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value as ContentPlatform)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  >
                    {PLATFORMS.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Format</label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as ContentFormat)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  >
                    {FORMATS.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Content Type</label>
                <select
                  value={postType}
                  onChange={(e) => setPostType(e.target.value as PostType)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  {POST_TYPES.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  {POST_TYPES.find((item) => item.value === postType)?.description}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Topic</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. WhatsApp booking automation, CRM lessons, portfolio launch"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Project</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">None</option>
                    {state.projects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
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
                    <option value="conversational">Conversational</option>
                    <option value="storytelling">Storytelling</option>
                    <option value="educational">Educational</option>
                    <option value="inspiring">Inspiring</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={!topic.trim() || state.aiLoading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:from-blue-700 hover:to-purple-700 transition-colors disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                {state.aiLoading ? 'Generating...' : 'Generate Content'}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <CalendarClock className="w-5 h-5 text-cyan-600" />
              <h2 className="font-semibold text-gray-900">Schedule Reminder</h2>
            </div>
            <div className="space-y-3">
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
              <button
                onClick={handleSchedule}
                disabled={!generatedContent || !scheduledAt}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-600 text-white text-sm font-medium hover:bg-cyan-700 disabled:opacity-50"
              >
                <CalendarClock className="w-4 h-4" />
                Schedule Telegram Reminder
              </button>
              {scheduleMessage && <p className="text-xs text-green-700">{scheduleMessage}</p>}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Generated Content</h2>
              {generatedContent && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                >
                  {copied ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy</>}
                </button>
              )}
            </div>

            {generatedContent ? (
              <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{generatedContent}</p>
              </div>
            ) : (
              <div className="text-center py-16">
                <FileEdit className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">
                  {state.aiLoading ? 'Generating your content...' : 'Generated content will appear here'}
                </p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Scheduled Content Reminders</h2>
            {upcomingReminders.length === 0 ? (
              <p className="text-sm text-gray-400">No scheduled content reminders.</p>
            ) : (
              <div className="space-y-2">
                {upcomingReminders.map((reminder) => (
                  <div key={reminder.id} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{reminder.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(reminder.scheduledAt).toLocaleString()} - {reminder.format.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <button
                      onClick={() => updateContentReminder(reminder.id, { status: 'cancelled' })}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                      title="Cancel reminder"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
