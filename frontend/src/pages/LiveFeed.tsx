import { useState, useEffect } from 'react';
import axios from 'axios';
import { Camera, Radio, Mic, ShieldCheck, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

const LIVE_FEED_URL = `${window.location.protocol}//${window.location.hostname}:8000/api/live-feed`;

export default function LiveFeed() {
  const [snapshot, setSnapshot] = useState<any>(null);
  const [voiceMsg, setVoiceMsg] = useState('');
  const [sendingVoice, setSendingVoice] = useState(false);
  const [feedError, setFeedError] = useState(false);

  // Poll metadata only (pose, status, timestamp) — video itself is MJPEG stream
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const res = await axios.get('/api/snapshot');
        setSnapshot(res.data);
      } catch { }
    };
    fetchMeta();
    const intv = setInterval(fetchMeta, 2000);
    return () => clearInterval(intv);
  }, []);

  const sendVoiceMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voiceMsg.trim()) return;
    setSendingVoice(true);
    try {
      await axios.post('/api/voice', { message: voiceMsg });
      setVoiceMsg('');
    } catch (e) { console.error(e); }
    setSendingVoice(false);
  };

  const isAlert = snapshot?.status === 'alert';
  const cameraAvailable = snapshot?.camera_available !== false;

  return (
    <div className="p-6 max-w-7xl mx-auto h-full flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            <span className="neon-pink">LIVE</span> OPS
          </h1>
          <p className="text-gray-500 mt-1">Private on-device camera &amp; communication</p>
        </div>
        <div className={`flex items-center gap-2 text-sm font-bold tracking-wider ${isAlert ? 'neon-pink' : 'neon-green'}`} style={{ fontFamily: 'Orbitron, sans-serif' }}>
          <span className="relative flex h-3 w-3">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isAlert ? 'bg-neon-pink' : 'bg-neon-green'}`}></span>
            <span className={`relative inline-flex rounded-full h-3 w-3 ${isAlert ? 'bg-neon-pink' : 'bg-neon-green'}`}></span>
          </span>
          {isAlert ? 'FALL ALERT' : 'MONITORING'}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {/* Main Feed */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`glass-card overflow-hidden flex-1 relative flex flex-col items-center justify-center min-h-[420px] ${isAlert ? 'border-glow-pink' : 'border-glow-cyan'}`}
          >
            {/* MJPEG stream — browser handles this natively */}
            {cameraAvailable && !feedError ? (
              <img
                src={LIVE_FEED_URL}
                alt="GuardianLens Live Feed"
                className="absolute inset-0 w-full h-full object-contain bg-black"
                onError={() => setFeedError(true)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-gray-500 gap-4">
                <Camera size={48} className="opacity-50" />
                {feedError ? (
                  <>
                    <p className="neon-pink font-medium">Stream unavailable.</p>
                    <p className="text-xs text-gray-600">Make sure the backend is running at localhost:8000</p>
                    <button
                      onClick={() => setFeedError(false)}
                      className="mt-2 px-4 py-2 rounded-lg border border-neon-cyan/40 text-neon-cyan text-xs hover:bg-neon-cyan/10 transition-colors"
                    >
                      Retry
                    </button>
                  </>
                ) : (
                  <p>Camera initializing...</p>
                )}
              </div>
            )}

            {/* LIVE badge */}
            <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md px-4 py-2 rounded-lg border border-neon-pink/30 flex items-center gap-3">
              <div className="flex items-center gap-2 neon-pink">
                <span className="w-2 h-2 rounded-full bg-neon-pink animate-pulse"></span>
                <span className="font-bold text-xs tracking-widest" style={{ fontFamily: 'Orbitron' }}>LIVE</span>
              </div>
              <div className="w-px h-4 bg-white/20"></div>
              <span className="text-xs font-mono text-gray-300">{snapshot?.timestamp || '00:00:00'}</span>
            </div>

            {/* On-Device badge */}
            <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-md px-4 py-2 rounded-lg border border-neon-green/30 flex items-center gap-2">
              <ShieldCheck size={16} className="neon-green" />
              <span className="text-xs font-semibold neon-green" style={{ fontFamily: 'Orbitron' }}>On-Device</span>
            </div>

            {/* Fall alert overlay */}
            {isAlert && (
              <div className="absolute bottom-0 inset-x-0 bg-red-900/80 backdrop-blur-sm px-6 py-3 flex items-center gap-3 border-t border-neon-pink/50">
                <AlertTriangle className="neon-pink animate-pulse" size={20} />
                <span className="font-bold neon-pink tracking-widest text-sm" style={{ fontFamily: 'Orbitron' }}>
                  FALL DETECTED — CHECKING STABILITY
                </span>
              </div>
            )}
          </motion.div>

          {/* Metadata readout */}
          <div className="glass-card border-glow-cyan p-4 flex items-center justify-between">
            <div>
              <p className="text-xs neon-cyan uppercase tracking-widest font-bold" style={{ fontFamily: 'Orbitron' }}>Current Pose</p>
              <p className="text-xl font-bold capitalize mt-1">
                {isAlert ? '🚨 Fallen' : 'Standing'}
              </p>
            </div>
            <div className="h-10 w-px bg-white/10"></div>
            <div>
              <p className="text-xs neon-green uppercase tracking-widest font-bold" style={{ fontFamily: 'Orbitron' }}>Status</p>
              <p className={`text-xl font-bold capitalize mt-1 ${isAlert ? 'neon-pink' : 'neon-green'}`}>
                {isAlert ? '🚨 Alert' : '✅ Safe'}
              </p>
            </div>
            <div className="h-10 w-px bg-white/10"></div>
            <div>
              <p className="text-xs neon-orange uppercase tracking-widest font-bold" style={{ fontFamily: 'Orbitron' }}>Stream</p>
              <p className="text-xl font-bold mt-1 neon-cyan">MJPEG</p>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-6">
          <div className="glass-card border-glow-cyan p-6">
            <div className="flex items-center gap-3 mb-4">
              <Mic className="neon-cyan" />
              <h3 className="text-lg font-bold neon-cyan" style={{ fontFamily: 'Orbitron' }}>Voice Check-in</h3>
            </div>
            <p className="text-sm text-gray-500 mb-6">Send a synthesized voice message to the edge device speaker.</p>
            <form onSubmit={sendVoiceMessage} className="flex flex-col gap-3">
              <textarea
                value={voiceMsg}
                onChange={(e) => setVoiceMsg(e.target.value)}
                placeholder="Type a message to read aloud..."
                className="w-full bg-dark-900 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-neon-cyan/50 resize-none h-24 transition-colors"
              ></textarea>
              <button type="submit" disabled={sendingVoice || !voiceMsg.trim()} className="btn-primary flex items-center justify-center gap-2">
                {sendingVoice ? 'Sending...' : 'Broadcast'}
                <Radio size={16} />
              </button>
            </form>
          </div>

          {/* Camera status card */}
          <div className="glass-card border-glow-pink p-6">
            <div className="flex items-center gap-3 mb-3">
              <Camera className="neon-pink" />
              <h3 className="text-lg font-bold neon-pink" style={{ fontFamily: 'Orbitron' }}>Camera</h3>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className={`w-2 h-2 rounded-full ${cameraAvailable ? 'bg-neon-green animate-pulse' : 'bg-gray-600'}`}></span>
              <span className="text-sm text-gray-400">{cameraAvailable ? 'Active — streaming at ~20 FPS' : 'Camera unavailable'}</span>
            </div>
            <p className="text-xs text-gray-600 mt-3">Pose detection + fall monitoring active</p>
          </div>
        </div>
      </div>
    </div>
  );
}
