import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Wallet, Play, Zap, Eye, Bell } from 'lucide-react';
import { signIn } from '../near';

interface LoginProps {
  onDemoMode: () => void;
}

const features = [
  { icon: <Eye size={18} />, label: 'Local AI Vision', desc: 'All processing on-device. Zero cloud exposure.' },
  { icon: <Zap size={18} />, label: 'Fall Detection', desc: 'Real-time pose tracking with instant alerts.' },
  { icon: <Bell size={18} />, label: 'Med Reminders', desc: 'Voice-guided medication & event reminders.' },
  { icon: <Wallet size={18} />, label: 'NEAR Auth', desc: 'Decentralised login — no passwords.' },
];

export default function Login({ onDemoMode }: LoginProps) {
  const [connecting, setConnecting] = useState(false);

  const handleNearConnect = async () => {
    setConnecting(true);
    try {
      await signIn();
      // page will redirect to NEAR wallet; no need to reset state
    } catch (e) {
      console.error('NEAR sign-in error:', e);
      setConnecting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-dark-900 flex items-center justify-center relative overflow-hidden">

      {/* ── Animated background grid ── */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `
          linear-gradient(rgba(57,255,20,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(57,255,20,0.04) 1px, transparent 1px)
        `,
        backgroundSize: '48px 48px',
      }} />

      {/* ── Corner accent glows ── */}
      <div className="absolute top-0 left-0 w-96 h-96 rounded-full opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #39FF14, transparent 70%)', transform: 'translate(-50%, -50%)' }} />
      <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #00F0FF, transparent 70%)', transform: 'translate(50%, 50%)' }} />

      {/* ── Main card ── */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-5"
            style={{
              background: 'linear-gradient(135deg, rgba(57,255,20,0.15), rgba(0,240,255,0.08))',
              border: '1px solid rgba(57,255,20,0.3)',
              boxShadow: '0 0 40px rgba(57,255,20,0.2)',
            }}
          >
            <ShieldCheck size={40} className="neon-green" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl font-black tracking-wider mb-2"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            Guardian<span className="neon-green">Lens</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-gray-500 text-sm tracking-wider"
          >
            PRIVACY-FIRST ELDER CARE · EDGE AI
          </motion.p>
        </div>

        {/* Glass card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass-card border-glow-green p-8 space-y-6"
        >
          <div className="text-center">
            <h2 className="text-lg font-bold mb-1" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              CONNECT TO ACCESS
            </h2>
            <p className="text-gray-500 text-xs">Secure, decentralised login via NEAR Protocol</p>
          </div>

          {/* NEAR wallet button */}
          <button
            onClick={handleNearConnect}
            disabled={connecting}
            className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl font-bold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              fontFamily: 'Orbitron, sans-serif',
              background: connecting
                ? 'rgba(30,30,30,0.9)'
                : 'linear-gradient(135deg, #000000, #1a1a1a)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff',
              boxShadow: connecting ? 'none' : '0 0 20px rgba(255,255,255,0.08)',
              letterSpacing: '0.05em',
            }}
          >
            {/* NEAR logo SVG */}
            <svg width="22" height="22" viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M72.7 14.3L54.4 41.1c-1.2 1.8.9 4 2.7 2.5l17.9-15.2c.5-.4 1.2-.1 1.2.6v33.5c0 .7-.9 1-1.3.5L25.3 14.3C23.7 12.3 21.3 11 18.6 11H17c-5 0-9.1 4-9.1 9v51c0 5 4.1 9 9.1 9 3.2 0 6.2-1.7 7.8-4.3l18.2-26.8c1.2-1.8-.9-4-2.7-2.5L22.5 60.6c-.5.4-1.2.1-1.2-.6V26.5c0-.7.9-1 1.3-.5l49.5 48.7C73.7 76.7 76.1 78 78.8 78H80c5 0 9.1-4 9.1-9V20c0-5-4.1-9-9.1-9-3.2 0-6.2 1.7-7.8 4.3z" fill="white"/>
            </svg>
            {connecting ? 'REDIRECTING TO NEAR...' : 'CONNECT NEAR WALLET'}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-gray-600 text-xs">OR</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Demo mode */}
          <button
            onClick={onDemoMode}
            className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold text-sm transition-all duration-200 btn-secondary"
            style={{ fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.05em' }}
          >
            <Play size={16} className="neon-green" />
            ENTER DEMO MODE
          </button>

          <p className="text-center text-gray-600 text-xs">
            Demo mode runs locally with no wallet required
          </p>
        </motion.div>

        {/* Feature pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 grid grid-cols-2 gap-3"
        >
          {features.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65 + i * 0.07 }}
              className="flex items-start gap-2 p-3 rounded-xl"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <span className="neon-green mt-0.5 shrink-0">{f.icon}</span>
              <div>
                <p className="text-xs font-bold text-white">{f.label}</p>
                <p className="text-xs text-gray-600 mt-0.5 leading-tight">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <p className="text-center text-gray-700 text-xs mt-6">
          v1.0 · Built with ❤️ for elder safety
        </p>
      </motion.div>
    </div>
  );
}
