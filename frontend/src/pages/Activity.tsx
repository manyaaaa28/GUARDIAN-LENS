import { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity as ActivityIcon } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Activity() {
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    const fetchAct = async () => {
      try {
        const res = await axios.get('/api/activity?limit=20');
        setActivities(res.data.activities);
      } catch (e) { console.error(e); }
    };
    fetchAct();
    const inv = setInterval(fetchAct, 5000);
    return () => clearInterval(inv);
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <ActivityIcon className="text-brand-secondary" size={32} />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Activity Timeline</h1>
          <p className="text-gray-400 mt-1">Decentralized logging of daily events.</p>
        </div>
      </div>

      <div className="glass-card p-6 overflow-hidden relative">
        <div className="absolute left-10 top-0 bottom-0 w-px bg-white/10 hidden md:block"></div>
        {activities.length > 0 ? (
          <div className="space-y-6 relative">
            {activities.map((act, i) => (
              <motion.div 
                initial={{ opacity: 0, x: -20 }} 
                animate={{ opacity: 1, x: 0 }} 
                transition={{ delay: i * 0.05 }} 
                key={act.id} 
                className="flex flex-col md:flex-row gap-4 md:items-start group"
              >
                <div className="flex items-center gap-4 w-full md:w-32 shrink-0 md:justify-end">
                   <span className="text-sm font-semibold text-gray-400 group-hover:text-white transition-colors">{act.time}</span>
                   <div className="w-8 h-8 rounded-full bg-dark-700 border-2 border-dark-800 flex items-center justify-center z-10 text-sm ring-4 ring-dark-900">
                     {act.icon}
                   </div>
                </div>
                <div className="flex-1 bg-dark-700/30 border border-white/5 rounded-2xl p-4 transition-all hover:bg-dark-700/50 hover:border-white/10">
                   <h4 className="font-bold text-lg mb-1">{act.title}</h4>
                   <p className="text-gray-300 text-sm leading-relaxed">{act.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-gray-500">
            No activity has been logged yet today.
          </div>
        )}
      </div>
    </div>
  );
}
