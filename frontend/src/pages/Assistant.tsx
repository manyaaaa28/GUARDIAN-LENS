import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, Bot, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Assistant() {
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get('/api/chat/history');
        if (res.data.length > 0) {
            setMessages(res.data);
        } else {
            setMessages([{ role: 'assistant', message: "Hi! I'm your GuardianLens AI. I continuously monitor the edge state and SQLite database. Ask me for a status report, if he took his medication, or if any falls occurred today.", time: 'Now' }]);
        }
      } catch (e) { console.error(e); }
    };
    fetchHistory();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMsg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;
    
    const userMessage = { role: 'user', message: inputMsg, time: 'Now' };
    setMessages(prev => [...prev, userMessage]);
    setInputMsg('');
    setLoading(true);

    try {
      const res = await axios.post('/api/chat', { message: userMessage.message });
      setMessages(prev => [...prev, { role: 'assistant', message: res.data.response, time: res.data.time }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', message: "Sorry, I am having trouble connecting to the AI models.", time: 'Now' }]);
    }
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto h-[90vh] flex flex-col pt-8">
      <div className="flex items-center gap-3 mb-6 shrink-0">
        <Bot className="text-brand-accent p-2 bg-brand-accent/20 rounded-xl" size={48} />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Assistant</h1>
          <p className="text-gray-400 text-sm">Context-aware agent combining LLMs with local telemetry.</p>
        </div>
      </div>

      <div className="glass-card flex-1 flex flex-col overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
            <AnimatePresence initial={false}>
                {messages.map((msg, i) => (
                    <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        key={i} 
                        className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-brand-secondary text-white' : 'bg-brand-accent text-white'}`}>
                            {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                        </div>
                        <div className={`flex flex-col max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className={`p-4 rounded-2xl ${
                                msg.role === 'user' 
                                  ? 'bg-brand-secondary/20 border border-brand-secondary/30 rounded-tr-sm text-white' 
                                  : 'bg-dark-700/80 border border-white/5 rounded-tl-sm text-gray-200 shadow-lg'
                            }`}>
                                <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                            </div>
                            <span className="text-xs text-gray-500 mt-2 mx-1 font-medium">{msg.time}</span>
                        </div>
                    </motion.div>
                ))}
                {loading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-brand-accent text-white">
                            <Bot size={20} />
                        </div>
                        <div className="p-4 rounded-2xl bg-dark-700/80 border border-white/5 rounded-tl-sm">
                           <div className="flex gap-1 items-center h-4">
                              <span className="w-2 h-2 rounded-full bg-brand-accent animate-bounce" style={{ animationDelay: '0ms' }}></span>
                              <span className="w-2 h-2 rounded-full bg-brand-accent animate-bounce" style={{ animationDelay: '150ms' }}></span>
                              <span className="w-2 h-2 rounded-full bg-brand-accent animate-bounce" style={{ animationDelay: '300ms' }}></span>
                           </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>

        <form onSubmit={sendMsg} className="p-4 bg-dark-800/80 border-t border-white/5 flex gap-3">
             <input 
                type="text" 
                value={inputMsg}
                onChange={e => setInputMsg(e.target.value)}
                placeholder="Ask about medications, falls, or get a summary..."
                className="flex-1 bg-dark-900 border border-white/10 rounded-xl px-4 py-3 placeholder:text-gray-500 focus:outline-none focus:border-brand-accent/50 focus:ring-1 focus:ring-brand-accent/50 transition-all font-medium"
             />
             <button type="submit" disabled={!inputMsg.trim() || loading} className="bg-brand-accent hover:bg-purple-500 disabled:opacity-50 text-white p-3 rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center w-14">
                 <Send size={20} className={inputMsg.trim() ? "translate-x-0" : "-translate-x-1"} />
             </button>
        </form>
      </div>
    </div>
  );
}
