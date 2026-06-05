// ============================================================
// Linked Lead AI — Layout: Header
// ============================================================

import { useApp } from '../../contexts/AppContext';
import { LogOut, User } from 'lucide-react';

export function Header() {
  const { state, logout } = useApp();

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-20">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Welcome back, {state.profile?.fullName || state.user?.name || 'User'}</h2>
      </div>

      <div className="flex items-center gap-4">
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