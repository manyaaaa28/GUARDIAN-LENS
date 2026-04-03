import { useState, useEffect, useRef, useCallback } from 'react';
import { Shield, Users, Trash2, ScanFace, UserPlus, X, CheckCircle, AlertCircle, Camera, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

type Member = {
  id: number;
  name: string;
  role: string;
  age: number;
  condition: string;
  relation: string;
  avatar: string;
  face_scanned: number;
  face_image: string;
};

/* ═══════════════════════════════════════════
   FACE SCAN CAMERA MODAL
   ═══════════════════════════════════════════ */
function FaceScanModal({ member, onClose, onSuccess }: { member: Member; onClose: () => void; onSuccess: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [captured, setCaptured] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const startCamera = async () => {
      try {
        await axios.post('/api/camera/pause');
        await new Promise(r => setTimeout(r, 800));
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
        });
        if (!active) { s.getTracks().forEach(t => t.stop()); return; }
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.onloadedmetadata = () => setCameraReady(true);
        }
      } catch (e) {
        setError('Camera access denied. Please allow camera permission.');
      }
    };
    startCamera();
    return () => {
      active = false;
      stream?.getTracks().forEach(t => t.stop());
      axios.post('/api/camera/resume').catch(() => {});
    };
  }, []);

  const handleClose = useCallback(() => {
    stream?.getTracks().forEach(t => t.stop());
    axios.post('/api/camera/resume').catch(() => {});
    onClose();
  }, [stream, onClose]);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    const ovalW = canvas.width * 0.5;
    const ovalH = canvas.height * 0.75;
    const ovalX = (canvas.width - ovalW) / 2;
    const ovalY = (canvas.height - ovalH) / 2;
    const faceCanvas = document.createElement('canvas');
    faceCanvas.width = ovalW;
    faceCanvas.height = ovalH;
    const faceCtx = faceCanvas.getContext('2d');
    if (!faceCtx) return;
    faceCtx.beginPath();
    faceCtx.ellipse(ovalW / 2, ovalH / 2, ovalW / 2, ovalH / 2, 0, 0, 2 * Math.PI);
    faceCtx.clip();
    faceCtx.drawImage(canvas, ovalX, ovalY, ovalW, ovalH, 0, 0, ovalW, ovalH);
    setCaptured(faceCanvas.toDataURL('image/jpeg', 0.9));
  };

  const retake = () => setCaptured(null);

  const saveFace = async () => {
    if (!captured) return;
    setSaving(true);
    try {
      await axios.post(`/api/members/${member.id}/enroll-face`, { image: captured });
      stream?.getTracks().forEach(t => t.stop());
      await axios.post('/api/camera/resume').catch(() => {});
      onSuccess();
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to save face. Try again.');
      setSaving(false);
    }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50" onClick={handleClose} />
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="glass-card border-glow-pink p-6 w-full max-w-lg space-y-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-3" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              <ScanFace className="neon-pink" size={24} />
              <span><span className="neon-pink">FACE</span> SCAN</span>
            </h2>
            <button onClick={handleClose} className="text-gray-500 hover:text-white p-1"><X size={20} /></button>
          </div>
          <p className="text-sm text-gray-400">Enrolling face for <span className="neon-cyan font-bold">{member.name}</span>. Align face within the oval.</p>
          <div className="relative w-full aspect-[4/3] bg-black rounded-2xl overflow-hidden border border-white/10">
            {error ? (
              <div className="absolute inset-0 flex items-center justify-center text-center p-6">
                <div><AlertCircle size={48} className="text-red-400 mx-auto mb-3" /><p className="text-red-400 text-sm">{error}</p></div>
              </div>
            ) : captured ? (
              <img src={captured} alt="Captured" className="absolute inset-0 w-full h-full object-contain" />
            ) : (
              <>
                <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 640 480">
                  <defs><mask id="ovalMask"><rect width="640" height="480" fill="white" /><ellipse cx="320" cy="240" rx="160" ry="180" fill="black" /></mask></defs>
                  <rect width="640" height="480" fill="rgba(0,0,0,0.6)" mask="url(#ovalMask)" />
                  <ellipse cx="320" cy="240" rx="160" ry="180" fill="none" stroke="#FF1493" strokeWidth="3" strokeDasharray="8 4" className="animate-spin" style={{ animationDuration: '20s', transformOrigin: '320px 240px' }} />
                  <ellipse cx="320" cy="240" rx="160" ry="180" fill="none" stroke="rgba(255,20,147,0.3)" strokeWidth="1" />
                </svg>
                {cameraReady && (
                  <div className="absolute bottom-4 left-0 right-0 text-center">
                    <span className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full text-xs neon-pink font-bold tracking-wider" style={{ fontFamily: 'Orbitron' }}>ALIGN FACE IN OVAL</span>
                  </div>
                )}
                {!cameraReady && !error && (
                  <div className="absolute inset-0 flex items-center justify-center"><Camera size={48} className="text-gray-600 animate-pulse" /></div>
                )}
              </>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>
          <div className="flex gap-3">
            {captured ? (
              <>
                <button onClick={retake} className="btn-secondary flex-1 flex items-center justify-center gap-2 py-3"><RefreshCw size={16} /> RETAKE</button>
                <button onClick={saveFace} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2 py-3">{saving ? 'SAVING...' : <><CheckCircle size={16} /> CONFIRM</>}</button>
              </>
            ) : (
              <button onClick={capturePhoto} disabled={!cameraReady} className="btn-primary w-full flex items-center justify-center gap-2 py-3"><Camera size={16} /> CAPTURE</button>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}

/* ═══════════════════════════════════════════
   MEMBERS PAGE
   ═══════════════════════════════════════════ */
export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [scanMember, setScanMember] = useState<Member | null>(null);
  const [scanStatus, setScanStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [newMember, setNewMember] = useState({ name: '', role: 'family', age: 0, condition: '', avatar: '👤' });

  const fetchMembers = async () => {
    try {
      const res = await axios.get('/api/members');
      setMembers(res.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchMembers(); }, []);

  const addMember = async () => {
    if (!newMember.name.trim()) return;
    try {
      await axios.post('/api/members', newMember);
      setShowAddModal(false);
      setNewMember({ name: '', role: 'family', age: 0, condition: '', avatar: '👤' });
      fetchMembers();
    } catch (e) { console.error(e); }
  };

  const deleteMember = async (id: number) => {
    if (!confirm('Remove this member?')) return;
    try {
      await axios.delete(`/api/members/${id}`);
      fetchMembers();
    } catch (e) { console.error(e); }
  };

  const onFaceScanSuccess = () => {
    setScanMember(null);
    setScanStatus({ type: 'success', message: 'Face enrolled successfully! ✅' });
    fetchMembers();
    setTimeout(() => setScanStatus(null), 3000);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="neon-green" size={32} />
        <div>
          <h1 className="text-3xl font-bold tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            <span className="neon-green">FAMILY</span> MEMBERS
          </h1>
          <p className="text-gray-500 mt-1">Enrol and manage your household members.</p>
        </div>
      </div>

      <div className="glass-card border-glow-green p-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
          <h2 className="text-xl font-bold" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            <span className="neon-green">ENROLLED</span> MEMBERS
          </h2>
          <button onClick={() => setShowAddModal(true)} className="btn-primary text-xs py-2 flex items-center gap-2">
            <UserPlus size={14} /> ADD MEMBER
          </button>
        </div>

        <div className="space-y-4">
          {members.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-600">
              <Users size={48} className="mb-4 opacity-30" />
              <p>No members enrolled yet. Click "Add Member" to get started.</p>
            </div>
          )}

          {members.map((member) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-dark-900 border border-white/5 p-4 rounded-xl flex items-center justify-between group hover:border-neon-green/20 transition-all"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-14 h-16 rounded-[50%] flex items-center justify-center text-2xl border-2 transition-all cursor-pointer overflow-hidden ${
                    member.face_scanned
                      ? 'border-neon-green/50 bg-neon-green/5 shadow-[0_0_12px_rgba(57,255,20,0.15)]'
                      : 'border-dashed border-gray-600 hover:border-neon-pink/50 bg-dark-700/50'
                  }`}
                  onClick={() => !member.face_scanned && setScanMember(member)}
                  title={member.face_scanned ? 'Face enrolled ✓' : 'Click to scan face'}
                >
                  {member.face_image ? (
                    <img src={`data:image/jpeg;base64,${member.face_image}`} alt={member.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{member.avatar}</span>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-lg">{member.name}</h3>
                  <p className="text-gray-500 text-sm">
                    Role: {member.role}
                    {member.age > 0 && ` • Age: ${member.age}`}
                    {member.condition && ` • ${member.condition}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {member.face_scanned ? (
                  <div className="neon-green bg-neon-green/10 px-3 py-1 rounded-full text-xs font-bold border border-neon-green/20 flex items-center gap-1">
                    <CheckCircle size={12} /> FACE SCANNED
                  </div>
                ) : (
                  <button
                    onClick={() => setScanMember(member)}
                    className="neon-orange bg-neon-orange/10 px-3 py-1 rounded-full text-xs font-bold border border-neon-orange/20 hover:bg-neon-orange/20 transition-all flex items-center gap-1"
                  >
                    <ScanFace size={12} /> SCAN FACE
                  </button>
                )}
                <button
                  onClick={() => deleteMember(member.id)}
                  className="text-gray-600 hover:text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  title="Remove member"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </motion.div>
          ))}

          <AnimatePresence>
            {scanStatus && (
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                className={`p-4 rounded-xl border flex items-center gap-3 ${
                  scanStatus.type === 'success' ? 'bg-neon-green/10 border-neon-green/30 neon-green' : 'bg-red-500/10 border-red-500/30 text-red-400'
                }`}
              >
                {scanStatus.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                {scanStatus.message}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* FACE SCAN MODAL */}
      <AnimatePresence>
        {scanMember && (
          <FaceScanModal member={scanMember} onClose={() => setScanMember(null)} onSuccess={onFaceScanSuccess} />
        )}
      </AnimatePresence>

      {/* ADD MEMBER MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="glass-card border-glow-pink p-8 w-full max-w-md space-y-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    <span className="neon-pink">NEW</span> MEMBER
                  </h2>
                  <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-white p-1"><X size={20} /></button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs neon-green uppercase tracking-widest font-bold mb-1 block" style={{ fontFamily: 'Orbitron' }}>Name</label>
                    <input type="text" value={newMember.name} onChange={(e) => setNewMember({ ...newMember, name: e.target.value })} placeholder="E.g. Grandpa Joe" className="w-full bg-dark-900 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-neon-green/50 transition-colors" />
                  </div>
                  <div>
                    <label className="text-xs neon-green uppercase tracking-widest font-bold mb-1 block" style={{ fontFamily: 'Orbitron' }}>Role</label>
                    <select value={newMember.role} onChange={(e) => setNewMember({ ...newMember, role: e.target.value })} className="w-full bg-dark-900 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-neon-green/50">
                      <option value="elder">Elder (Monitored)</option>
                      <option value="caregiver">Primary Caregiver</option>
                      <option value="family">Family Member</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs neon-green uppercase tracking-widest font-bold mb-1 block" style={{ fontFamily: 'Orbitron' }}>Age</label>
                      <input type="number" value={newMember.age || ''} onChange={(e) => setNewMember({ ...newMember, age: parseInt(e.target.value) || 0 })} placeholder="72" className="w-full bg-dark-900 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-neon-green/50" />
                    </div>
                    <div>
                      <label className="text-xs neon-green uppercase tracking-widest font-bold mb-1 block" style={{ fontFamily: 'Orbitron' }}>Condition</label>
                      <input type="text" value={newMember.condition} onChange={(e) => setNewMember({ ...newMember, condition: e.target.value })} placeholder="Fall Risk: High" className="w-full bg-dark-900 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-neon-green/50" />
                    </div>
                  </div>
                </div>
                <button onClick={addMember} disabled={!newMember.name.trim()} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                  <UserPlus size={16} /> ENROLL MEMBER
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
