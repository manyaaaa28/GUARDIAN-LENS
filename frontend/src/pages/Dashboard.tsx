import { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, ShieldCheck, HeartPulse, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const [stats, setStats] = useState({
    camera_available: false,
    hours_monitored: 0,
    alerts_today: 0,
    status: 'safe',
    statusLabel: 'All Clear',
    medicationAdherence: 100,
    lastActivity: 'Loading...'
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get('/api/stats');
        setStats(res.data);
      } catch (err) {
        console.error("Failed to fetch stats", err);
      }
    };
    fetchStats();
    const intv = setInterval(fetchStats, 5000);
    return () => clearInterval(intv);
  }, []);

  const borderColors = [
    'border-glow-cyan',
    'border-glow-orange',
    'border-glow-pink',
    'border-glow-green'
  ];

  const cards = [
    {
      icon: <Activity className="neon-cyan" />,
      label: 'Last Activity',
      labelClass: 'neon-cyan',
      value: stats.lastActivity.split(' at ')[0],
      sub: stats.lastActivity.split(' at ')[1] || 'Today',
      border: borderColors[0],
    },
    {
      icon: <HeartPulse className="neon-orange" />,
      label: 'Medication Adherence',
      labelClass: 'neon-orange',
      value: `${stats.medicationAdherence}%`,
      sub: 'Taken today',
      border: borderColors[1],
    },
    {
      icon: <ShieldAlert className="neon-pink" />,
      label: 'Alerts Today',
      labelClass: 'neon-pink',
      value: String(stats.alerts_today),
      sub: 'Safety incidents',
      border: borderColors[2],
    },
    {
      icon: <ShieldCheck className="neon-green" />,
      label: 'Hours Monitored',
      labelClass: 'neon-green',
      value: `${stats.hours_monitored.toFixed(1)}h`,
      sub: 'Local processing only',
      border: borderColors[3],
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            <span className="neon-green">DASH</span>BOARD
          </h1>
          <p className="text-gray-500 mt-1">Overview of your family member's wellbeing.</p>
        </div>
        <div className={`px-4 py-2 rounded-full border flex items-center gap-2 font-bold text-sm tracking-wider ${
          stats.status === 'alert'
            ? 'border-neon-pink/50 neon-pink'
            : 'border-neon-green/50 neon-green'
        }`} style={{ fontFamily: 'Orbitron, sans-serif', boxShadow: stats.status === 'alert' ? '0 0 15px rgba(255,20,147,0.15)' : '0 0 15px rgba(57,255,20,0.15)' }}>
          {stats.status === 'alert' ? <ShieldAlert size={18} /> : <ShieldCheck size={18} />}
          {stats.statusLabel}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => (
          <motion.div
            key={i}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            className={`glass-card p-6 ${card.border}`}
          >
            <div className="flex items-center gap-3 mb-3">
              {card.icon}
              <span className={`font-semibold text-sm tracking-wide ${card.labelClass}`}>{card.label}</span>
            </div>
            <p className="text-3xl font-bold" style={{ fontFamily: 'Orbitron, sans-serif' }}>{card.value}</p>
            <p className="text-sm text-gray-500 mt-1">{card.sub}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
