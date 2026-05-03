import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

export default function AuthScreen() {
  const { screen, setScreen, login, register, isLoading, error, clearError } = useAuthStore();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [localErr, setLocalErr] = useState('');

  useEffect(() => { clearError(); setLocalErr(''); }, [screen]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalErr('');
    await login(email, password);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalErr('');
    if (password !== confirm) { setLocalErr('Passwords do not match.'); return; }
    await register(username, email, password);
  };

  const displayError = localErr || error;

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'radial-gradient(ellipse at center, #0a1520 0%, #050a10 70%, #000 100%)' }}>
      {/* Animated grid bg */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="absolute border-white/[0.02]" style={{ left: `${(i % 5) * 20}%`, top: `${Math.floor(i / 5) * 25}%`, width: '20%', height: '25%', border: '1px solid rgba(255,255,255,0.025)' }} />
        ))}
      </div>

      {/* LOGO */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 flex flex-col items-center select-none">
        <div className="relative">
          <div className="text-7xl font-black tracking-[0.18em] text-white" style={{ textShadow: '0 0 60px rgba(255,70,70,0.45), 0 0 120px rgba(255,70,70,0.2)', fontFamily: 'Segoe UI, sans-serif' }}>
            SALVO
          </div>
          <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-70" />
        </div>
        <div className="text-red-400/80 text-xs tracking-[0.5em] mt-2 uppercase font-semibold">Tactical FPS — Elite Edition</div>
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md mt-32" style={{ filter: 'drop-shadow(0 0 40px rgba(255,70,70,0.08))' }}>
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(10,16,26,0.96)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
          {/* Tabs */}
          <div className="flex border-b border-white/[0.06]">
            <button onClick={() => setScreen('login')} className={`flex-1 py-4 text-sm font-bold tracking-widest uppercase transition-all ${screen === 'login' ? 'text-white border-b-2 border-red-500 bg-white/[0.02]' : 'text-white/40 hover:text-white/60'}`}>
              Sign In
            </button>
            <button onClick={() => setScreen('register')} className={`flex-1 py-4 text-sm font-bold tracking-widest uppercase transition-all ${screen === 'register' ? 'text-white border-b-2 border-red-500 bg-white/[0.02]' : 'text-white/40 hover:text-white/60'}`}>
              Create Account
            </button>
          </div>

          <div className="p-8">
            {/* Error */}
            {displayError && (
              <div className="mb-5 px-4 py-3 rounded-lg text-sm text-red-300 flex items-center gap-2" style={{ background: 'rgba(255,50,50,0.1)', border: '1px solid rgba(255,50,50,0.25)' }}>
                <span className="text-red-400">⚠</span> {displayError}
              </div>
            )}

            {screen === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-white/50 tracking-widest uppercase mb-2">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="agent@salvo.gg"
                    className="w-full px-4 py-3 rounded-lg text-sm text-white placeholder-white/20 outline-none transition-all"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/50 tracking-widest uppercase mb-2">Password</label>
                  <div className="relative">
                    <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••"
                      className="w-full px-4 py-3 pr-12 rounded-lg text-sm text-white placeholder-white/20 outline-none transition-all"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }} />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 text-xs">
                      {showPass ? 'HIDE' : 'SHOW'}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={isLoading} className="w-full py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase text-white transition-all mt-2"
                  style={{ background: isLoading ? 'rgba(100,30,30,0.6)' : 'linear-gradient(135deg, #cc2020, #ff4646)', boxShadow: isLoading ? 'none' : '0 0 25px rgba(255,50,50,0.25)' }}>
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Authenticating…</span>
                  ) : 'ENTER SALVO'}
                </button>
                <p className="text-center text-white/25 text-xs mt-3">
                  No account? <button type="button" onClick={() => setScreen('register')} className="text-red-400 hover:text-red-300 underline">Register now</button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-white/50 tracking-widest uppercase mb-2">Agent Name</label>
                  <input type="text" value={username} onChange={e => setUsername(e.target.value)} required placeholder="Agent_Nova" maxLength={16}
                    className="w-full px-4 py-3 rounded-lg text-sm text-white placeholder-white/20 outline-none"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }} />
                  <p className="text-white/25 text-xs mt-1">3–16 characters. This is your in-game name.</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/50 tracking-widest uppercase mb-2">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="agent@salvo.gg"
                    className="w-full px-4 py-3 rounded-lg text-sm text-white placeholder-white/20 outline-none"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-white/50 tracking-widest uppercase mb-2">Password</label>
                    <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••"
                      className="w-full px-4 py-3 rounded-lg text-sm text-white placeholder-white/20 outline-none"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/50 tracking-widest uppercase mb-2">Confirm</label>
                    <input type={showPass ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} required placeholder="••••••"
                      className="w-full px-4 py-3 rounded-lg text-sm text-white placeholder-white/20 outline-none"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }} />
                  </div>
                </div>
                <button onClick={() => setShowPass(!showPass)} type="button" className="text-xs text-white/30 hover:text-white/50">{showPass ? 'Hide' : 'Show'} passwords</button>
                <button type="submit" disabled={isLoading} className="w-full py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase text-white transition-all"
                  style={{ background: isLoading ? 'rgba(100,30,30,0.6)' : 'linear-gradient(135deg, #cc2020, #ff4646)', boxShadow: isLoading ? 'none' : '0 0 25px rgba(255,50,50,0.25)' }}>
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating Account…</span>
                  ) : 'JOIN SALVO'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Bottom badges */}
        <div className="flex justify-center gap-6 mt-5">
          {['Real-World Physics', 'Ranked Mode', 'Tactical Gameplay'].map(b => (
            <div key={b} className="flex items-center gap-1.5 text-white/25 text-xs">
              <span className="w-1 h-1 rounded-full bg-red-500/60" /> {b}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
