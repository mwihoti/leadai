// ============================================================
// Linked Lead AI — Dashboard Page
// ============================================================

import { useApp } from '../../contexts/AppContext';
import { Link } from 'react-router-dom';
import {
  Users,
  TrendingUp,
  CalendarCheck,
  MessageSquare,
  Reply,
  Award,
  Target,
  ArrowRight,
  Plus,
  Sparkles,
} from 'lucide-react';
import { getStatusColor, getStatusLabel, getScoreColor } from '../../lib/utils';

export default function DashboardPage() {
  const { state, getDashboardStats, getFollowUpsDue } = useApp();
  const stats = getDashboardStats();
  const followUpsDue = getFollowUpsDue();
  const recentLeads = [...state.leads].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  const pendingTasks = state.dailyTasks.filter((t) => t.status === 'pending');

  const statCards = [
    { label: 'Total Leads', value: stats.totalLeads, icon: Users, color: 'blue' },
    { label: 'High Score (60+)', value: stats.highScoreLeads, icon: TrendingUp, color: 'green' },
    { label: 'Follow-ups Due', value: stats.followUpsDueToday, icon: CalendarCheck, color: 'yellow' },
    { label: 'Messages Ready', value: stats.messagesReady, icon: MessageSquare, color: 'indigo' },
    { label: 'Replied', value: stats.repliedLeads, icon: Reply, color: 'cyan' },
    { label: 'Won', value: stats.wonOpportunities, icon: Award, color: 'green' },
  ];

  const colorMap: Record<string, { bg: string; text: string; iconBg: string }> = {
    blue: { bg: 'bg-blue-50 border-blue-100', text: 'text-blue-700', iconBg: 'bg-blue-100 text-blue-600' },
    green: { bg: 'bg-green-50 border-green-100', text: 'text-green-700', iconBg: 'bg-green-100 text-green-600' },
    yellow: { bg: 'bg-yellow-50 border-yellow-100', text: 'text-yellow-700', iconBg: 'bg-yellow-100 text-yellow-600' },
    indigo: { bg: 'bg-indigo-50 border-indigo-100', text: 'text-indigo-700', iconBg: 'bg-indigo-100 text-indigo-600' },
    cyan: { bg: 'bg-cyan-50 border-cyan-100', text: 'text-cyan-700', iconBg: 'bg-cyan-100 text-cyan-600' },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Your lead intelligence overview</p>
        </div>
        <Link
          to="/leads/new"
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:from-blue-700 hover:to-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Lead
        </Link>
      </div>

      {/* Conversion Rate */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Conversion Rate</p>
              <p className="text-2xl font-bold text-gray-900">{stats.conversionRate}%</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>{stats.wonOpportunities} won out of {stats.totalLeads} leads</span>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-xl border p-4 ${colorMap[card.color]?.bg || 'bg-white border-gray-200'}`}
          >
            <div className="flex items-center justify-between">
              <div className={`w-10 h-10 rounded-lg ${colorMap[card.color]?.iconBg || 'bg-gray-100'} flex items-center justify-center`}>
                <card.icon className="w-5 h-5" />
              </div>
              <span className={`text-2xl font-bold ${colorMap[card.color]?.text || 'text-gray-900'}`}>
                {card.value}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-2">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Daily Action List */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Sparkles className="w-4.5 h-4.5 text-blue-600" />
            Daily Action List
          </h3>
          <div className="space-y-2">
            {pendingTasks.length === 0 ? (
              <p className="text-sm text-gray-400">No pending tasks. Great job!</p>
            ) : (
              pendingTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100"
                >
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{task.title}</p>
                    <p className="text-xs text-gray-500">{task.description}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          {followUpsDue.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm font-medium text-yellow-700 mb-2">
                {followUpsDue.length} follow-up{followUpsDue.length > 1 ? 's' : ''} due
              </p>
              <Link to="/follow-ups" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                View follow-ups <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* Recent Leads */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Recent Leads</h3>
            <Link to="/leads" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="space-y-2">
            {recentLeads.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No leads yet</p>
                <Link
                  to="/leads/new"
                  className="text-sm text-blue-600 hover:text-blue-700 mt-2 inline-block"
                >
                  Add your first lead
                </Link>
              </div>
            ) : (
              recentLeads.map((lead) => (
                <Link
                  key={lead.id}
                  to={`/leads/${lead.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100 hover:bg-blue-50 hover:border-blue-100 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{lead.name || 'Unnamed'}</p>
                    <p className="text-xs text-gray-500">{lead.company || lead.role || '—'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {lead.score > 0 && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getScoreColor(lead.score)}`}>
                        {lead.score}
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(lead.status)}`}>
                      {getStatusLabel(lead.status)}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
