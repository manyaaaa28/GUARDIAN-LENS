import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { Home, Camera, Activity as ActivityIcon, Calendar as CalendarIcon, FileText, Settings as SettingsIcon, ShieldCheck, Menu, X, Users, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import Dashboard from './pages/Dashboard';
import LiveFeed from './pages/LiveFeed';
import ActivityPage from './pages/Activity';
import Assistant from './pages/Assistant';
import CalendarPage from './pages/Calendar';
import SettingsPage from './pages/Settings';
import MembersPage from './pages/Members';
import Login from './pages/Login';
import { initNear, signOut } from './near';

/* ═══════════════ REMINDER TOAST ═══════════════ */
const ReminderToast = ({ reminders, onDismiss }: { reminders: any[], onDismiss: (id: number) => void }) => (
  <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm">
    {reminders.map(r => (
      <motion.div
        key={r.id}
        initial={{ opacity: 0, x: 80 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 80 }}
        className="glass-card border-glow-cyan p-4 flex items-start gap-3 shadow-xl"
      >
        <Bell size={18} className="neon-cyan mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm neon-cyan" style={{ fontFamily: 'Orbitron' }}>REMINDER</p>
          <p className="text-white text-sm font-medium">{r.title}</p>
          {r.description && <p className="text-gray-400 text-xs mt-0.5">{r.description}</p>}
          <p className="text-gray-500 text-xs mt-1">{r.time} — {r.date}</p>
        </div>
        <button onClick={() => onDismiss(r.id)} className="text-gray-600 hover:text-white text-lg leading-none">×</button>
      </motion.div>
    ))}
  </div>
);

/* ═══════════════ NAVIGATION ═══════════════ */
const Navigation = ({ onClose }: { onClose?: () => void }) => {
  const links = [
    { to: '/', icon: <Home size={20} />, label: 'Dashboard' },
    { to: '/live', icon: <Camera size={20} />, label: 'Live Feed' },
    { to: '/activity', icon: <ActivityIcon size={20} />, label: 'Activity' },
    { to: '/assistant', icon: <FileText size={20} />, label: 'AI Assistant' },
    { to: '/calendar', icon: <CalendarIcon size={20} />, label: 'Calendar' },
    { to: '/members', icon: <Users size={20} />, label: 'Members' },
    { to: '/settings', icon: <SettingsIcon size={20} />, label: 'Settings' },
  ];
  return (
    <nav className="flex flex-col gap-2 p-4">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.to === '/'}
          onClick={onClose}
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          {link.icon}
          <span>{link.label}</span>
        </NavLink>
      ))}
    </nav>
  );
};

/* ═══════════════ LAYOUT ═══════════════ */
const Layout = ({
  children,
  accountId,
  onDisconnect,
}: {
  children: React.ReactNode;
  accountId: string;
  onDisconnect: () => void;
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isDemo = accountId === 'demo';
  const shortId = isDemo
    ? 'Demo Mode'
    : accountId.length > 22
      ? `${accountId.slice(0, 18)}...`
      : accountId;

  return (
    <div className="flex h-screen w-full bg-dark-900 text-white overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-neon-green/10 bg-dark-800/90">
        <div className="p-6 flex items-center gap-3 border-b border-neon-green/10">
          <ShieldCheck size={28} className="neon-green" />
          <h1 className="text-xl font-bold tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            Guardian<span className="neon-green">Lens</span>
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <Navigation />
        </div>

        {/* Wallet badge */}
        <div className="p-4 border-t border-neon-green/10 space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-dark-700 border border-neon-cyan/20 flex items-center justify-center text-lg">
              {isDemo ? '🎮' : '🔑'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm neon-cyan truncate">{shortId}</p>
              <p className="text-xs text-gray-500">{isDemo ? 'No wallet' : 'NEAR Testnet'}</p>
            </div>
          </div>
          <button
            onClick={onDisconnect}
            className="w-full text-xs text-gray-600 hover:text-red-400 transition-colors py-1.5 border border-white/5 hover:border-red-500/20 rounded-lg"
          >
            Disconnect
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between p-4 border-b border-neon-green/10 bg-dark-800/95 sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <ShieldCheck size={24} className="neon-green" />
            <h1 className="text-lg font-bold" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              Guardian<span className="neon-green">Lens</span>
            </h1>
          </div>
          <button onClick={() => setMobileMenuOpen(true)} className="p-2 -mr-2 text-gray-400 hover:text-white">
            <Menu size={24} />
          </button>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.aside
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-64 bg-dark-800 border-l border-neon-green/15 z-50 flex flex-col shadow-2xl md:hidden"
            >
              <div className="p-4 flex items-center justify-between border-b border-white/5">
                <span className="font-semibold text-lg">Menu</span>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 -mr-2 text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto py-2">
                <Navigation onClose={() => setMobileMenuOpen(false)} />
              </div>
              <div className="p-4 border-t border-white/5 space-y-2">
                <p className="text-xs neon-cyan truncate">{shortId}</p>
                <button onClick={onDisconnect} className="text-xs text-gray-600 hover:text-red-400 transition-colors">
                  Disconnect
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ═══════════════ ROOT APP ═══════════════ */
export default function App() {
  const [accountId, setAccountId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [dueReminders, setDueReminders] = useState<any[]>([]);
  const dismissedRef = useRef<Set<number>>(new Set());

  // Poll for due reminders every 60s
  useEffect(() => {
    const checkReminders = async () => {
      try {
        const res = await axios.get('/api/reminders/due');
        const fresh = (res.data.due || []).filter((r: any) => !dismissedRef.current.has(r.id));
        setDueReminders(fresh);
      } catch { /* backend may not be up yet */ }
    };
    checkReminders();
    const iv = setInterval(checkReminders, 60_000);
    return () => clearInterval(iv);
  }, []);

  const dismissReminder = (id: number) => {
    dismissedRef.current.add(id);
    setDueReminders(prev => prev.filter(r => r.id !== id));
  };

  useEffect(() => {
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));
    (async () => {
      try {
        const wallet = await Promise.race([initNear(), timeout]);
        if (wallet && typeof (wallet as any).isSignedIn === 'function' && (wallet as any).isSignedIn()) {
          setAccountId((wallet as any).getAccountId());
        }
      } catch (e) {
        console.warn('NEAR init failed, proceeding without wallet:', e);
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  const handleDisconnect = async () => {
    try { await signOut(); } catch (_) { /* ignore */ }
    setAccountId(null);
  };

  /* Loading splash */
  if (checking) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <ShieldCheck size={52} className="neon-green animate-pulse" />
          <p className="text-gray-500 text-sm tracking-widest" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            INITIALISING...
          </p>
        </div>
      </div>
    );
  }

  /* Login screen */
  if (!accountId) {
    return (
      <AnimatePresence mode="wait">
        <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <Login onDemoMode={() => setAccountId('demo')} />
        </motion.div>
      </AnimatePresence>
    );
  }

  /* Main app */
  return (
    <BrowserRouter>
      <Layout accountId={accountId} onDisconnect={handleDisconnect}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/live" element={<LiveFeed />} />
          <Route path="/activity" element={<ActivityPage />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/members" element={<MembersPage />} />
          <Route path="/settings" element={<SettingsPage accountId={accountId} />} />
        </Routes>
      </Layout>
      <AnimatePresence>
        {dueReminders.length > 0 && (
          <ReminderToast reminders={dueReminders} onDismiss={dismissReminder} />
        )}
      </AnimatePresence>
    </BrowserRouter>
  );
}
