// ============================================================
// Linked Lead AI — Layout: Sidebar
// ============================================================

import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Kanban,
  CalendarCheck,
  MessageSquare,
  FileEdit,
  FolderKanban,
  Settings,
  Target,
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/leads', label: 'Leads', icon: Users },
  { to: '/pipeline', label: 'Pipeline', icon: Kanban },
  { to: '/follow-ups', label: 'Follow-ups', icon: CalendarCheck },
  { to: '/messages', label: 'Messages', icon: MessageSquare },
  { to: '/posts', label: 'Content Studio', icon: FileEdit },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col fixed left-0 top-0 z-30">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-gray-100">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
          <Target className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold text-gray-900">Linked Lead</h1>
          <p className="text-[11px] text-gray-500 font-medium">AI</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700 border border-blue-100'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
              }`
            }
          >
            <item.icon className="w-4.5 h-4.5 flex-shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100">
        <p className="text-[11px] text-gray-400 text-center">Linked Lead AI v1.0</p>
      </div>
    </aside>
  );
}
