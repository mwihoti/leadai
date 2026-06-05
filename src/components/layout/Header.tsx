// ============================================================
// Linked Lead AI — Layout: Header
// ============================================================

import { useApp } from '../../contexts/AppContext';
import { Link } from 'react-router-dom';
import { CheckCircle2, LogOut, Send, User } from 'lucide-react';

export function Header() {
  const { state, logout } = useApp();
  const botLink = state.telegramConnection.botUsername && state.user
    ? `https://t.me/${state.telegramConnection.botUsername}?start=user_${state.user.id}`
    : '';

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-20">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Welcome back, {state.profile?.fullName || state.user?.name || 'User'}</h2>
      </div>

      <div className="flex items-center gap-4">
        {state.telegramConnection.connected ? (
          <Link
            to="/settings"
            className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 text-green-700 border border-green-100 text-sm font-medium hover:bg-green-100 transition-colors"
            title="Telegram connected"
          >
            <CheckCircle2 className="w-4 h-4" />
            Telegram
          </Link>
        ) : botLink ? (
          <a
            href={botLink}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-600 text-white text-sm font-medium hover:bg-cyan-700 transition-colors"
            title="Connect Telegram for reminders"
          >
            <Send className="w-4 h-4" />
            Connect Telegram
          </a>
        ) : (
          <Link
            to="/settings"
            className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-50 text-cyan-700 border border-cyan-100 text-sm font-medium hover:bg-cyan-100 transition-colors"
            title="Set up Telegram reminders"
          >
            <Send className="w-4 h-4" />
            Connect Telegram
          </Link>
        )}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-medium text-gray-700">
            {state.user?.name || 'User'}
          </span>
        </div>
        <button
          onClick={logout}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          title="Log out"
        >
          <LogOut className="w-4.5 h-4.5" />
        </button>
      </div>
    </header>
  );
}
