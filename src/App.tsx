import React, { useState, useEffect } from 'react';
import { 
  Layout, User, Shield, CheckCircle, XCircle, Clock, QrCode, LogOut, Plus, 
  Search, BarChart3, ChevronRight, Menu, X, Camera, ArrowLeftRight, FileText,
  Lock, UserPlus, LogIn, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import QrScanner from 'react-qr-scanner';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Role = 'student' | 'faculty' | 'warden' | 'security';
type Status = 'pending_faculty' | 'pending_warden' | 'approved' | 'rejected' | 'exited' | 'returned';

interface UserData {
  id: string;
  name: string;
  role: Role;
}

interface GatePass {
  id: string;
  studentId: string;
  studentName: string;
  reason: string;
  exitTime: string;
  expectedReturnTime: string;
  status: Status;
  requestDate: string;
  qrCode: string;
  remarks?: string;
  facultyRemarks?: string;
  wardenRemarks?: string;
}

export default function App() {
  const [user, setUser] = useState<UserData | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [passes, setPasses] = useState<GatePass[]>([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Auth Form State
  const [authForm, setAuthForm] = useState({ id: '', password: '', name: '', role: 'student' as Role });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) fetchPasses();
  }, [user, activeTab]);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (err) {}
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/signup';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm),
      });
      const data = await res.json();
      if (res.ok) {
        if (authMode === 'login') {
          setUser(data.user);
        } else {
          setAuthMode('login');
          setError('Account created! Please login.');
        }
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Connection failed');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setActiveTab('dashboard');
  };

  const fetchPasses = async () => {
    try {
      const res = await fetch('/api/passes');
      if (res.ok) setPasses(await res.json());
    } catch (err) {}
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-indigo-200">
              <Shield className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Campus GatePass Pro</h1>
            <p className="text-slate-500 text-sm mt-1">Secure Digital Exit Management</p>
          </div>

          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-8">
            <button onClick={() => setAuthMode('login')} className={cn("flex-1 py-2 text-sm font-bold rounded-lg transition-all", authMode === 'login' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500")}>Login</button>
            <button onClick={() => setAuthMode('signup')} className={cn("flex-1 py-2 text-sm font-bold rounded-lg transition-all", authMode === 'signup' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500")}>Sign Up</button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'signup' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input required type="text" value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none" placeholder="John Doe" />
                </div>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">{authMode === 'signup' ? 'Student / Staff ID' : 'ID Number'}</label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input required type="text" value={authForm.id} onChange={e => setAuthForm({...authForm, id: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none" placeholder="e.g. STU123" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input required type="password" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none" placeholder="••••••••" />
              </div>
            </div>
            {authMode === 'signup' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Role</label>
                <select value={authForm.role} onChange={e => setAuthForm({...authForm, role: e.target.value as Role})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none">
                  <option value="student">Student</option>
                  <option value="faculty">Faculty</option>
                  <option value="warden">Warden</option>
                  <option value="security">Security</option>
                </select>
              </div>
            )}
            {error && <div className="p-3 bg-rose-50 text-rose-600 text-xs font-bold rounded-lg flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</div>}
            <button disabled={loading} type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2">
              {loading ? "Processing..." : (authMode === 'login' ? <><LogIn className="w-5 h-5" /> Login</> : <><UserPlus className="w-5 h-5" /> Create Account</>)}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <aside className={cn("bg-white border-r border-slate-200 flex flex-col transition-all", isSidebarOpen ? "w-64" : "w-20")}>
        <div className="p-6 flex items-center justify-between">
          {isSidebarOpen && <div className="flex items-center gap-2 font-bold text-indigo-600"><Shield className="w-6 h-6" /> GatePass</div>}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1.5 rounded-lg hover:bg-slate-100"><Menu className="w-5 h-5 text-slate-500" /></button>
        </div>
        <nav className="flex-1 px-4 space-y-1">
          <NavItem icon={Layout} label="Dashboard" id="dashboard" active={activeTab === 'dashboard'} onClick={setActiveTab} open={isSidebarOpen} />
          {user.role === 'student' && <NavItem icon={Plus} label="New Request" id="request" active={activeTab === 'request'} onClick={setActiveTab} open={isSidebarOpen} />}
          {user.role === 'security' && <NavItem icon={QrCode} label="Scanner" id="scanner" active={activeTab === 'scanner'} onClick={setActiveTab} open={isSidebarOpen} />}
        </nav>
        <div className="p-4 border-t">
          <div className="flex items-center gap-3 p-2">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 font-bold">{user.name[0]}</div>
            {isSidebarOpen && <div className="flex-1 overflow-hidden"><p className="text-sm font-bold truncate">{user.name}</p><p className="text-[10px] uppercase text-slate-400">{user.role}</p></div>}
          </div>
          <button onClick={logout} className="w-full mt-2 flex items-center gap-2 p-2 text-rose-600 hover:bg-rose-50 rounded-lg text-sm font-bold transition-all"><LogOut className="w-4 h-4" /> {isSidebarOpen && "Logout"}</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8">
          <h2 className="font-bold text-slate-800 capitalize">{activeTab}</h2>
          <div className="text-xs font-bold text-slate-400">{format(new Date(), 'EEEE, MMM d')}</div>
        </header>
        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && <Dashboard user={user} passes={passes} onUpdate={fetchPasses} />}
            {activeTab === 'request' && <RequestForm onComplete={() => setActiveTab('dashboard')} />}
            {activeTab === 'scanner' && <Scanner />}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon: Icon, label, id, active, onClick, open }: any) {
  return (
    <button onClick={() => onClick(id)} className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all", active ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-50")}>
      <Icon className="w-5 h-5" /> {open && <span className="text-sm font-bold">{label}</span>}
    </button>
  );
}

function Dashboard({ user, passes, onUpdate }: any) {
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAction = async (id: string, status: 'approved' | 'rejected') => {
    setLoading(true);
    try {
      await fetch(`/api/passes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, remarks }),
      });
      onUpdate();
      setRemarks('');
    } catch (err) {} finally { setLoading(false); }
  };

  const getStatusBadge = (status: Status) => {
    const map: any = {
      pending_faculty: { label: 'Pending Faculty', color: 'bg-amber-100 text-amber-700' },
      pending_warden: { label: 'Pending Warden', color: 'bg-blue-100 text-blue-700' },
      approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700' },
      rejected: { label: 'Rejected', color: 'bg-rose-100 text-rose-700' },
      exited: { label: 'Outside', color: 'bg-slate-800 text-white' },
      returned: { label: 'Returned', color: 'bg-slate-100 text-slate-600' }
    };
    const s = map[status] || { label: status, color: 'bg-gray-100' };
    return <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider", s.color)}>{s.label}</span>;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Total Passes" value={passes.length} icon={FileText} color="indigo" />
        <StatCard label="Pending" value={passes.filter((p:any) => p.status.includes('pending')).length} icon={Clock} color="amber" />
        <StatCard label="Active Outside" value={passes.filter((p:any) => p.status === 'exited').length} icon={LogOut} color="blue" />
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b flex items-center justify-between">
          <h3 className="font-bold text-slate-800">Pass Management</h3>
          <button onClick={onUpdate} className="text-xs font-bold text-indigo-600">Refresh</button>
        </div>
        <div className="divide-y">
          {passes.map((pass: any) => (
            <div key={pass.id} className="p-6 hover:bg-slate-50 transition-all">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 font-bold">{pass.studentName[0]}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900">{pass.studentName}</h4>
                      {getStatusBadge(pass.status)}
                    </div>
                    <p className="text-sm text-slate-500 mt-1">{pass.reason}</p>
                    <div className="flex items-center gap-4 mt-2 text-[10px] font-bold text-slate-400 uppercase">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(new Date(pass.exitTime), 'MMM d, HH:mm')}</span>
                      <span className="flex items-center gap-1"><ArrowLeftRight className="w-3 h-3" /> {format(new Date(pass.expectedReturnTime), 'MMM d, HH:mm')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {user.role === 'student' && pass.qrCode && (
                    <div className="p-2 bg-white border rounded-xl shadow-sm"><QRCodeSVG value={pass.qrCode} size={64} /></div>
                  )}
                  {((user.role === 'faculty' && pass.status === 'pending_faculty') || (user.role === 'warden' && pass.status === 'pending_warden')) && (
                    <div className="flex flex-col gap-2">
                      <input type="text" placeholder="Add remarks..." value={remarks} onChange={e => setRemarks(e.target.value)} className="px-3 py-2 text-xs border rounded-lg outline-none focus:ring-1 ring-indigo-500" />
                      <div className="flex gap-2">
                        <button disabled={loading} onClick={() => handleAction(pass.id, 'rejected')} className="flex-1 py-2 bg-rose-50 text-rose-600 text-xs font-bold rounded-lg hover:bg-rose-100">Reject</button>
                        <button disabled={loading} onClick={() => handleAction(pass.id, 'approved')} className="flex-1 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700">Approve</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {passes.length === 0 && <div className="p-12 text-center text-slate-400 italic">No records found.</div>}
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  const colors: any = { indigo: 'bg-indigo-50 text-indigo-600', amber: 'bg-amber-50 text-amber-600', blue: 'bg-blue-50 text-blue-600' };
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", colors[color])}><Icon className="w-6 h-6" /></div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
    </div>
  );
}

function RequestForm({ onComplete }: any) {
  const [form, setForm] = useState({ reason: '', exitTime: '', expectedReturnTime: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/passes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) onComplete();
    } catch (err) {} finally { setLoading(false); }
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-xl mx-auto bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
      <h3 className="text-xl font-bold text-slate-900 mb-6">New Gate Pass Request</h3>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase">Reason for Exit</label>
          <textarea required value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none min-h-[100px]" placeholder="e.g. Medical checkup, Weekend visit home..." />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Exit Time</label>
            <input required type="datetime-local" value={form.exitTime} onChange={e => setForm({...form, exitTime: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Expected Return</label>
            <input required type="datetime-local" value={form.expectedReturnTime} onChange={e => setForm({...form, expectedReturnTime: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
          </div>
        </div>
        <button disabled={loading} type="submit" className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
          {loading ? "Submitting..." : "Submit Request"}
        </button>
      </form>
    </motion.div>
  );
}

function Scanner() {
  const [show, setShow] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleScan = async (data: any) => {
    if (data) {
      setShow(false);
      try {
        const res = await fetch('/api/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ qrCode: data.text }),
        });
        setResult(await res.json());
      } catch (err) { setResult({ success: false, message: 'Verification failed' }); }
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-md mx-auto text-center space-y-6">
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <h3 className="text-xl font-bold text-slate-900 mb-2">Gate Scanner</h3>
        <p className="text-sm text-slate-500 mb-8">Scan student QR code for entry/exit</p>
        
        <div className="aspect-square bg-slate-900 rounded-2xl overflow-hidden relative mb-6">
          {!show ? (
            <button onClick={() => setShow(true)} className="absolute inset-0 flex flex-col items-center justify-center text-white gap-4">
              <Camera className="w-12 h-12 text-indigo-400" />
              <span className="font-bold">Start Camera</span>
            </button>
          ) : (
            <QrScanner delay={300} onError={err => console.error(err)} onScan={handleScan} style={{ width: '100%' }} />
          )}
        </div>

        {result && (
          <div className={cn("p-4 rounded-2xl border text-left flex gap-3", result.success ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800")}>
            {result.success ? <CheckCircle className="w-6 h-6 shrink-0" /> : <XCircle className="w-6 h-6 shrink-0" />}
            <div><p className="font-bold">{result.success ? "Verified" : "Failed"}</p><p className="text-xs opacity-80">{result.message}</p></div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
