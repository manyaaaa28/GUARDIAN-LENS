import { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings as SettingsIcon, Shield, CreditCard, Bell, CheckCircle, ExternalLink, Send } from 'lucide-react';
import { motion } from 'framer-motion';

interface SettingsProps {
  accountId?: string | null;
}

const defaultCfg = {
  twilio_sid: '', twilio_token: '', phone_from: '', phone_to: '',
  whatsapp_enabled: false, telegram_token: '', telegram_chat_id: '',
};

export default function SettingsPage({ accountId }: SettingsProps) {
  const [activeTab, setActiveTab] = useState('security');
  const [cfg, setCfg] = useState(defaultCfg);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);

  const isDemo = accountId === 'demo';
  const isConnected = !!accountId && !isDemo;

  useEffect(() => {
    if (activeTab === 'notifications') {
      axios.get('/api/notifications/config').then(r => setCfg({ ...defaultCfg, ...r.data })).catch(() => { });
    }
  }, [activeTab]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.post('/api/notifications/config', cfg);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      await axios.post('/api/notifications/test');
      alert('Test alert sent! Check your Telegram.');
    } catch (err: any) {
      const detail = err?.response?.data?.detail || 'Failed to send test.';
      alert(`Error: ${detail}`);
    }
    setTesting(false);
  };

  const tabItems = [
    { id: 'security', icon: <Shield size={18} />, label: 'Security & Privacy' },
    { id: 'notifications', icon: <Bell size={18} />, label: 'Notifications' },
    { id: 'wallet', icon: <CreditCard size={18} />, label: 'NEAR Wallet' },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <SettingsIcon className="neon-cyan" size={32} />
        <div>
          <h1 className="text-3xl font-bold tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            <span className="neon-cyan">SETTINGS</span>
          </h1>
          <p className="text-gray-500 mt-1">Configure your GuardianLens edge environment.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Nav */}
        <div className="w-full md:w-64 space-y-1">
          {tabItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium border ${activeTab === item.id
                ? 'neon-cyan bg-neon-cyan/10 border-neon-cyan/30'
                : 'text-gray-500 hover:text-white hover:bg-white/5 border-transparent'
                }`}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 glass-card border-glow-cyan p-6 min-h-[400px]">

          {/* ── Notifications ─────────────────────────── */}
          {activeTab === 'notifications' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <h2 className="text-lg font-bold neon-cyan mb-1" style={{ fontFamily: 'Orbitron' }}>FALL ALERT NOTIFICATIONS</h2>
              <p className="text-gray-500 text-sm mb-6">Get notified via SMS, WhatsApp, or Telegram when a fall is detected.</p>

              <form onSubmit={handleSave} className="space-y-6">

                {/* Twilio / SMS */}
                <div className="space-y-3">
                  <p className="text-xs font-bold tracking-widest text-gray-400 uppercase" style={{ fontFamily: 'Orbitron' }}>
                    Twilio — SMS &amp; WhatsApp
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      className="bg-dark-900 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-neon-cyan/50"
                      placeholder="Twilio Account SID"
                      value={cfg.twilio_sid}
                      onChange={e => setCfg(c => ({ ...c, twilio_sid: e.target.value }))}
                    />
                    <input
                      type="password"
                      className="bg-dark-900 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-neon-cyan/50"
                      placeholder="Twilio Auth Token"
                      value={cfg.twilio_token}
                      onChange={e => setCfg(c => ({ ...c, twilio_token: e.target.value }))}
                    />
                    <input
                      className="bg-dark-900 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-neon-cyan/50"
                      placeholder="From number (+1234567890)"
                      value={cfg.phone_from}
                      onChange={e => setCfg(c => ({ ...c, phone_from: e.target.value }))}
                    />
                    <input
                      className="bg-dark-900 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-neon-cyan/50"
                      placeholder="To number (+1234567890)"
                      value={cfg.phone_to}
                      onChange={e => setCfg(c => ({ ...c, phone_to: e.target.value }))}
                    />
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cfg.whatsapp_enabled}
                      onChange={e => setCfg(c => ({ ...c, whatsapp_enabled: e.target.checked }))}
                      className="w-4 h-4 accent-green-400"
                    />
                    <span className="text-sm text-gray-300">Also send via WhatsApp (requires Twilio WhatsApp sandbox)</span>
                  </label>
                </div>

                {/* Telegram */}
                <div className="space-y-3">
                  <p className="text-xs font-bold tracking-widest text-gray-400 uppercase" style={{ fontFamily: 'Orbitron' }}>
                    Telegram Bot
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="password"
                      className="bg-dark-900 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-neon-cyan/50"
                      placeholder="Bot Token (from @BotFather)"
                      value={cfg.telegram_token}
                      onChange={e => setCfg(c => ({ ...c, telegram_token: e.target.value }))}
                    />
                    <input
                      className="bg-dark-900 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-neon-cyan/50"
                      placeholder="Chat ID (use @userinfobot)"
                      value={cfg.telegram_chat_id}
                      onChange={e => setCfg(c => ({ ...c, telegram_chat_id: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                    {saved ? <CheckCircle size={16} /> : null}
                    {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Config'}
                  </button>
                  <button type="button" onClick={handleTest} disabled={testing} className="btn-secondary flex items-center gap-2">
                    <Send size={14} />
                    {testing ? 'Sending...' : 'Send Test Alert'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* ── NEAR Wallet ─────────────────────────── */}
          {activeTab === 'wallet' && (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center space-y-5">
              <div className="w-20 h-20 rounded-2xl bg-dark-900 border flex items-center justify-center mb-2"
                style={{ borderColor: isConnected ? 'rgba(57,255,20,0.3)' : 'rgba(189,0,255,0.2)' }}>
                <CreditCard size={32} style={{ color: isConnected ? '#39FF14' : '#BD00FF' }} />
              </div>
              <h2 className="text-2xl font-bold" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                <span style={{ color: isConnected ? '#39FF14' : '#BD00FF' }}>NEAR</span> WALLET
              </h2>
              {isConnected ? (
                <div className="space-y-4 w-full max-w-sm">
                  <div className="flex items-center justify-center gap-2 neon-green">
                    <CheckCircle size={18} />
                    <span className="font-bold text-sm tracking-wide" style={{ fontFamily: 'Orbitron' }}>CONNECTED</span>
                  </div>
                  <div className="bg-dark-900 border border-neon-green/20 rounded-xl p-4 text-left space-y-2">
                    <p className="text-xs text-gray-500 uppercase tracking-widest" style={{ fontFamily: 'Orbitron' }}>Account</p>
                    <p className="neon-green font-mono text-sm break-all">{accountId}</p>
                    <p className="text-xs text-gray-600 mt-1">NEAR Testnet</p>
                  </div>
                  <a href={`https://testnet.nearblocks.io/address/${accountId}`} target="_blank" rel="noopener noreferrer"
                    className="btn-secondary w-full flex items-center justify-center gap-2 py-2 text-sm">
                    <ExternalLink size={14} /> View on NearBlocks
                  </a>
                </div>
              ) : (
                <div className="space-y-3 max-w-sm">
                  <p className="text-gray-500 text-sm">{isDemo ? "You're in Demo Mode — no wallet connected." : "Connect your NEAR wallet for decentralized authentication."}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Security ─────────────────────────── */}
          {activeTab === 'security' && (
            <motion.div key="security" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="flex h-full items-center justify-center text-gray-600 min-h-[300px] flex-col gap-3">
              <Shield size={40} className="opacity-20" />
              <p style={{ fontFamily: 'Orbitron, sans-serif' }} className="tracking-wider text-sm">COMING SOON</p>
            </motion.div>
          )}

        </div>
      </div>
    </div>
  );
}
