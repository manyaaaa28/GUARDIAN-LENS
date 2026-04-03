import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar as CalendarIcon, Clock, Plus, Trash2, CheckCircle, Circle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Calendar() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [newEvent, setNewEvent] = useState({ title: '', description: '', date: new Date().toISOString().split('T')[0], time: '12:00', type: 'medicine' });

  const fetchCalendar = async () => {
    try {
      const res = await axios.get('/api/calendar');
      setEvents(res.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchCalendar();
    const inv = setInterval(fetchCalendar, 10000);
    return () => clearInterval(inv);
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title) return;
    setLoading(true);
    try {
      await axios.post('/api/calendar', newEvent);
      setNewEvent({ ...newEvent, title: '', description: '' });
      await fetchCalendar();
    } catch(e) {}
    setLoading(false);
  };

  const handleToggle = async (id: number) => {
    try {
      await axios.patch(`/api/calendar/${id}/toggle`);
      fetchCalendar();
    } catch(e) {}
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`/api/calendar/${id}`);
      fetchCalendar();
    } catch(e) {}
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <CalendarIcon className="text-brand-primary" size={32} />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar & Reminders</h1>
          <p className="text-gray-400 mt-1">Manage schedules and automated voice alerts.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-semibold mb-4 border-b border-white/10 pb-2">Upcoming Schedule</h2>
            {events.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                   {events.map((evt, i) => (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} key={evt.id} className={`glass-card p-4 flex items-center justify-between border-l-4 ${evt.type === 'medicine' ? 'border-l-brand-warning' : 'border-l-brand-secondary'}`}>
                          <div className="flex items-center gap-4">
                             <button onClick={() => handleToggle(evt.id)} className="text-brand-primary hover:scale-110 transition-transform">
                                {evt.completed ? <CheckCircle size={24} /> : <Circle size={24} className="text-gray-500" />}
                             </button>
                             <div>
                                <h3 className={`font-bold text-lg ${evt.completed ? 'text-gray-500 line-through' : 'text-white'}`}>{evt.title}</h3>
                                <p className="text-gray-400 text-sm">{evt.description}</p>
                             </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                             <div className="flex items-center gap-2 text-brand-accent bg-brand-accent/10 px-3 py-1 rounded-full text-sm font-medium">
                                <Clock size={16} />
                                {evt.date} @ {evt.time}
                             </div>
                             <button onClick={() => handleDelete(evt.id)} className="text-gray-500 hover:text-brand-danger transition-colors p-1">
                                <Trash2 size={18} />
                             </button>
                          </div>
                      </motion.div>
                   ))}
                </div>
            ) : (
                <div className="glass-card p-12 flex flex-col items-center justify-center text-gray-500">
                    <CalendarIcon size={48} className="mb-4 opacity-20" />
                    <p>No upcoming events or reminders.</p>
                </div>
            )}
        </div>

        <div className="glass-card p-6 h-fit sticky top-6">
           <h2 className="text-lg font-semibold mb-4">Add Event</h2>
           <form onSubmit={handleAdd} className="space-y-4">
              <div>
                 <label className="block text-sm font-medium text-gray-400 mb-1">Title</label>
                 <input type="text" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} required className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-2 focus:border-brand-primary transition-colors focus:outline-none" placeholder="e.g. Heart Medication" />
              </div>
              <div>
                 <label className="block text-sm font-medium text-gray-400 mb-1">Type</label>
                 <select value={newEvent.type} onChange={e => setNewEvent({...newEvent, type: e.target.value})} className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-2 focus:border-brand-primary transition-colors focus:outline-none appearance-none">
                    <option value="medicine">💊 Medicine</option>
                    <option value="appointment">🏥 Doctor Appointment</option>
                    <option value="call">📞 Family Call</option>
                    <option value="other">📌 Other</option>
                 </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Date</label>
                    <input type="date" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} required className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-2 focus:border-brand-primary transition-colors focus:outline-none [color-scheme:dark]" />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Time</label>
                    <input type="time" value={newEvent.time} onChange={e => setNewEvent({...newEvent, time: e.target.value})} required className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-2 focus:border-brand-primary transition-colors focus:outline-none [color-scheme:dark]" />
                 </div>
              </div>
              <div>
                 <label className="block text-sm font-medium text-gray-400 mb-1">Description (Optional)</label>
                 <input type="text" value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})} className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-2 focus:border-brand-primary transition-colors focus:outline-none" placeholder="e.g. Take with food" />
              </div>
              <button type="submit" disabled={loading || !newEvent.title} className="w-full btn-primary flex items-center justify-center gap-2 mt-6">
                 <Plus size={18} /> Add Reminder
              </button>
           </form>
        </div>
      </div>
    </div>
  );
}
