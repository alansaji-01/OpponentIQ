import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Shield,
  CalendarDays,
  Brain,
  Users,
  Flame,
  FileText,
  Database,
  Settings as SettingsIcon,
  LogOut,
  Video,
  Activity
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/overview', label: 'OVERVIEW', icon: LayoutDashboard },
  { to: '/video-analysis', label: 'REALTIME CV TRACKING', icon: Video, badge: 'LIVE CV' },
  { to: '/opponents', label: 'OPPONENTS', icon: Shield },
  { to: '/matches', label: 'MATCH LOGS', icon: CalendarDays },
  { to: '/tactical-intelligence', label: 'TACTICAL INTEL', icon: Brain },
  { to: '/players', label: 'SQUAD ANALYTICS', icon: Users },
  { to: '/heatmaps', label: 'PITCH MAPS', icon: Flame },
  { to: '/reports', label: 'BRIEFS & REPORTS', icon: FileText },
  { to: '/data-management', label: 'DATA INGESTION', icon: Database },
  { to: '/settings', label: 'SETTINGS', icon: SettingsIcon },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-bg-primary text-text-primary selection:bg-accent selection:text-black">
      {/* Sidebar - Heavy tactical broadcast border style */}
      <aside className="w-64 bg-bg-sidebar border-r border-border flex flex-col shrink-0 select-none">
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-border bg-[#0B0F19]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-accent flex items-center justify-center font-black text-black text-sm tracking-tighter">
              IQ
            </div>
            <div>
              <h1 className="text-sm font-black tracking-widest text-white uppercase font-mono">
                OPPONENT<span className="text-accent">IQ</span>
              </h1>
              <p className="text-[9px] text-text-muted tracking-widest font-mono">
                CV &amp; TACTICAL RADAR
              </p>
            </div>
          </div>
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse" title="System Online" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-0.5">
          {NAV_ITEMS.map(({ to, label, icon: Icon, badge }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center justify-between px-4 py-3 text-xs font-bold font-mono tracking-wider transition-all border-l-2 ${
                  isActive
                    ? 'bg-bg-card text-accent border-accent'
                    : 'text-text-secondary hover:bg-bg-hover hover:text-white border-transparent'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{label}</span>
              </div>
              {badge && (
                <span className="px-1.5 py-0.5 text-[9px] bg-accent/20 text-accent border border-accent/40 font-mono">
                  {badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Session User Info */}
        <div className="p-4 border-t border-border bg-[#0B0F19]">
          <div className="flex items-center justify-between mb-3 text-xs font-mono">
            <div className="flex items-center gap-2 overflow-hidden">
              <Activity className="w-3.5 h-3.5 text-accent shrink-0" />
              <span className="font-bold truncate text-white uppercase">
                {user ? user.username : 'OPERATOR'}
              </span>
            </div>
            {user && (
              <span className="px-1.5 py-0.5 text-[9px] bg-accent text-black font-black">
                {user.role}
              </span>
            )}
          </div>
          {user ? (
            <button
              onClick={handleLogout}
              className="w-full btn-tactical btn-secondary py-2 text-[11px] gap-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              DISCONNECT
            </button>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="w-full btn-tactical btn-primary py-2 text-[11px]"
            >
              CONNECT OPERATOR
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Viewport */}
      <main className="flex-1 overflow-y-auto bg-bg-primary">
        <Outlet />
      </main>
    </div>
  );
}
