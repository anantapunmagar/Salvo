import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from '../game/GameEngine';
import { useAuthStore } from '../store/authStore';
import { WEAPON_DB, UTILITY_DB } from '../game/constants';
import type { SimPlayer, GameSession } from '../game/GameEngine';

interface Props {
  mapIdx: number;
  simPlayers: SimPlayer[];
  session: GameSession;
  onExit: (stats: Record<string, number>) => void;
}

type UIState = 'playing' | 'buy' | 'paused' | 'scoreboard';

export default function GameView({ mapIdx, simPlayers, session, onExit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const { user } = useAuthStore();
  const [uiState, setUiState] = useState<UIState>('playing');
  const [ptrLocked, setPtrLocked] = useState(false);
  const [playerStats, setPlayerStats] = useState({ health: 100, armor: 0, helmet: false, money: 800, ammo: 0, reserveAmmo: 0, kills: 0, deaths: 0, score: 0, stamina: 100, alive: true });
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);

  const statsRef = useRef(playerStats);
  statsRef.current = playerStats;

  useEffect(() => {
    if (!canvasRef.current || !user) return;
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const engine = new GameEngine(canvas);
    engineRef.current = engine;

    engine.onKill = () => {
      setPlayerStats(prev => ({ ...prev, kills: prev.kills + 1, score: prev.score + 300 }));
    };

    engine.init(user, mapIdx, simPlayers, session);

    // Poll player stats
    const statInterval = setInterval(() => {
      if (!engine.player) return;
      const p = engine.player;
      const wKey = engine.getWeaponKey();
      setPlayerStats({
        health: Math.ceil(p.health), armor: Math.ceil(p.armor), helmet: p.helmet,
        money: p.money, ammo: wKey ? (p.ammo[wKey] || 0) : 0,
        reserveAmmo: wKey ? (p.reserveAmmo[wKey] || 0) : 0,
        kills: p.kills, deaths: p.deaths, score: p.score, stamina: Math.ceil(p.stamina), alive: p.alive,
      });
    }, 100);

    const sessionInterval = setInterval(() => setSessionTime(t => t + 1), 1000);

    const handleResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener('resize', handleResize);

    const handleLockChange = () => {
      const locked = document.pointerLockElement === canvas;
      setPtrLocked(locked);
      engine.ptrLocked = locked;
      if (!locked && uiState === 'playing') setUiState('paused');
    };
    document.addEventListener('pointerlockchange', handleLockChange);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyB') { setUiState(u => u === 'buy' ? 'playing' : 'buy'); e.preventDefault(); }
      if (e.code === 'Escape') {
        if (uiState === 'buy') { setUiState('playing'); return; }
        if (document.pointerLockElement) document.exitPointerLock();
      }
      if (e.code === 'Tab') { setUiState(u => u === 'scoreboard' ? 'playing' : 'scoreboard'); e.preventDefault(); }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      engine.destroy();
      clearInterval(statInterval);
      clearInterval(sessionInterval);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('pointerlockchange', handleLockChange);
      document.removeEventListener('keydown', handleKeyDown);
      if (document.pointerLockElement === canvas) document.exitPointerLock();
    };
  }, []);

  const handleCanvasClick = () => {
    if (!ptrLocked && uiState !== 'buy' && uiState !== 'scoreboard') {
      canvasRef.current?.requestPointerLock();
      setUiState('playing');
    }
  };

  const handleBuyItem = (item: string) => {
    engineRef.current?.buyItem(item);
  };

  const handleExit = () => {
    const p = engineRef.current?.player;
    onExit({
      kills: p?.kills || 0, deaths: p?.deaths || 0, score: p?.score || 0,
      totalDamage: p?.totalDamage || 0, totalShots: p?.totalShots || 0,
      totalHits: p?.totalHits || 0, xpGained: p?.xpGained || 0,
    });
  };

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0">
      <canvas ref={canvasRef} onClick={handleCanvasClick} style={{ cursor: 'none', display: 'block', width: '100%', height: '100%' }} />

      {/* Unlock overlay */}
      {!ptrLocked && uiState === 'paused' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(4px)' }}>
          <div className="text-4xl font-black text-white tracking-widest mb-2">PAUSED</div>
          <div className="text-white/50 text-sm mb-8">Game paused — click to resume</div>
          <div className="flex flex-col gap-3 w-56">
            <button onClick={() => { canvasRef.current?.requestPointerLock(); setUiState('playing'); }}
              className="py-3.5 rounded-xl font-bold text-sm tracking-widest uppercase text-white transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #cc2020, #ff4646)' }}>
              RESUME
            </button>
            <button onClick={() => setUiState('scoreboard')}
              className="py-3 rounded-xl font-bold text-xs tracking-widest uppercase text-white/60 transition-all hover:text-white"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
              SCOREBOARD [TAB]
            </button>
            <button onClick={() => setShowExitConfirm(true)}
              className="py-3 rounded-xl font-bold text-xs tracking-widest uppercase text-red-400/60 hover:text-red-400 transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              EXIT MATCH
            </button>
          </div>
          {/* Session info */}
          <div className="mt-8 flex gap-6 text-xs text-white/30">
            <span>Time: {formatTime(sessionTime)}</span>
            <span>K: {playerStats.kills} / D: {playerStats.deaths}</span>
            <span>Score: {playerStats.score}</span>
          </div>
        </div>
      )}

      {/* Buy Menu */}
      {uiState === 'buy' && (
        <BuyMenu onClose={() => { setUiState('playing'); canvasRef.current?.requestPointerLock(); }} onBuy={handleBuyItem} money={playerStats.money} />
      )}

      {/* Scoreboard */}
      {uiState === 'scoreboard' && (
        <Scoreboard session={session} simPlayers={simPlayers} playerStats={playerStats} userName={user?.username || 'You'} onClose={() => setUiState('playing')} />
      )}

      {/* Exit confirm */}
      {showExitConfirm && (
        <div className="absolute inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="rounded-2xl p-8 text-center" style={{ background: 'rgba(10,16,26,0.96)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="text-white font-black text-xl mb-2">Exit Match?</div>
            <div className="text-white/45 text-sm mb-6">Your progress will be saved but the match will end.</div>
            <div className="flex gap-4">
              <button onClick={() => setShowExitConfirm(false)} className="flex-1 py-3 rounded-xl text-sm font-bold text-white/60" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>CANCEL</button>
              <button onClick={handleExit} className="flex-1 py-3 rounded-xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #aa1818, #cc2828)' }}>EXIT</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BuyMenu({ onClose, onBuy, money }: { onClose: () => void; onBuy: (item: string) => void; money: number }) {
  const [tab, setTab] = useState<string>('RIFLES');
  const categories = ['PISTOLS', 'SMGS', 'RIFLES', 'SNIPERS', 'SHOTGUNS', 'GEAR', 'UTILITY'];

  const weaponsInCat = Object.entries(WEAPON_DB).filter(([, w]) => w.category === tab);
  const utilsInCat = Object.entries(UTILITY_DB);

  return (
    <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}>
      <div className="w-[780px] max-h-[85vh] overflow-hidden rounded-2xl flex flex-col" style={{ background: 'rgba(8,14,24,0.98)', border: '1px solid rgba(255,255,255,0.1)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div className="text-white font-black text-lg tracking-widest">BUY MENU</div>
          <div className="flex items-center gap-4">
            <div className="text-yellow-400 font-black text-xl">${money.toLocaleString()}</div>
            <button onClick={onClose} className="text-white/40 hover:text-white text-xs tracking-widest">[B] CLOSE</button>
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex border-b border-white/[0.05] overflow-x-auto">
          {categories.map(c => (
            <button key={c} onClick={() => setTab(c)} className={`px-5 py-3 text-xs font-bold tracking-widest whitespace-nowrap transition-all ${tab === c ? 'text-white border-b-2 border-red-500' : 'text-white/35 hover:text-white/55'}`}>
              {c}
            </button>
          ))}
        </div>

        {/* Items */}
        <div className="overflow-y-auto flex-1 p-4">
          {tab === 'GEAR' ? (
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'kevlar', name: 'Kevlar Vest', price: 650, desc: 'Reduces damage by ~50%. 100 armor.' },
                { id: 'kevhelm', name: 'Kevlar + Helmet', price: 1000, desc: 'Full protection. Reduces HS damage.' },
              ].map(g => (
                <div key={g.id} onClick={() => { if (money >= g.price) onBuy(g.id); }}
                  className={`rounded-xl p-4 transition-all ${money >= g.price ? 'cursor-pointer hover:scale-[1.01]' : 'opacity-40 cursor-not-allowed'}`}
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex justify-between mb-2">
                    <div className="text-white font-semibold text-sm">{g.name}</div>
                    <div className="text-yellow-400 font-bold text-sm">${g.price}</div>
                  </div>
                  <div className="text-white/35 text-xs">{g.desc}</div>
                </div>
              ))}
            </div>
          ) : tab === 'UTILITY' ? (
            <div className="grid grid-cols-2 gap-3">
              {utilsInCat.map(([key, u]) => (
                <div key={key} onClick={() => { if (money >= u.price) onBuy(key); }}
                  className={`rounded-xl p-4 transition-all ${money >= u.price ? 'cursor-pointer hover:scale-[1.01]' : 'opacity-40 cursor-not-allowed'}`}
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex justify-between mb-1">
                    <div className="text-white font-semibold text-sm">{u.name}</div>
                    <div className="text-yellow-400 font-bold text-sm">${u.price}</div>
                  </div>
                  <div className="text-white/35 text-xs">{u.description}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {weaponsInCat.map(([key, w]) => (
                <div key={key} onClick={() => { if (money >= w.price) onBuy(key); }}
                  className={`rounded-xl p-4 transition-all ${money >= w.price ? 'cursor-pointer hover:scale-[1.01]' : 'opacity-40 cursor-not-allowed'}`}
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex justify-between mb-2">
                    <div className="text-white font-semibold text-sm">{w.name}</div>
                    <div className="text-yellow-400 font-bold">${w.price}</div>
                  </div>
                  {w.magSize ? (
                    <div className="flex gap-3 text-xs text-white/40 mb-1.5">
                      <span>DMG {w.damage}</span>
                      <span>{Math.round(60 / w.fireRate)} RPM</span>
                      <span>MAG {w.magSize}</span>
                      <span>PEN {Math.round(w.penetration * 100)}%</span>
                    </div>
                  ) : null}
                  <div className="text-white/25 text-xs">{w.description}</div>
                  <div className="flex gap-1.5 mt-1.5">
                    {w.silenced && <span className="text-xs text-green-400/70 bg-green-400/10 px-1.5 py-0.5 rounded">Silenced</span>}
                    {w.scoped && <span className="text-xs text-blue-400/70 bg-blue-400/10 px-1.5 py-0.5 rounded">Scoped</span>}
                    {w.automatic && <span className="text-xs text-orange-400/70 bg-orange-400/10 px-1.5 py-0.5 rounded">Auto</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ScoreboardPlayerStats { kills: number; deaths: number; score: number; alive: boolean; }

function Scoreboard({ session, simPlayers, playerStats, userName, onClose }: {
  session: GameSession; simPlayers: SimPlayer[]; playerStats: ScoreboardPlayerStats; userName: string; onClose: () => void;
}) {
  const allPlayers = [
    { id: 'local', username: userName, kills: playerStats.kills, deaths: playerStats.deaths, score: playerStats.score, team: 'ct', avatar: '#ff4646', rank: 'You', ping: 0, alive: playerStats.alive },
    ...simPlayers,
  ].sort((a, b) => b.score - a.score);

  const ct = allPlayers.filter(p => p.team === 'ct');
  const t = allPlayers.filter(p => p.team === 't');

  return (
    <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(4px)' }}>
      <div className="w-[820px] rounded-2xl overflow-hidden" style={{ background: 'rgba(8,14,24,0.97)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div>
            <div className="text-white font-black text-lg">{session.mode} — {session.map}</div>
            <div className="flex gap-4 mt-0.5">
              <span className="text-blue-400 text-sm font-bold">CT: {session.scoreCT}</span>
              <span className="text-white/30">vs</span>
              <span className="text-red-400 text-sm font-bold">T: {session.scoreT}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xs tracking-widest">[TAB] CLOSE</button>
        </div>
        <div className="p-5 grid grid-cols-2 gap-4">
          {[{ label: 'COUNTER-TERRORIST', players: ct, color: '#4488ff' }, { label: 'TERRORIST', players: t, color: '#ff4444' }].map(side => (
            <div key={side.label}>
              <div className="text-xs font-bold tracking-widest mb-3" style={{ color: side.color }}>{side.label}</div>
              <div className="space-y-1.5">
                <div className="flex text-xs text-white/30 px-3">
                  <span className="flex-1">Player</span>
                  <span className="w-8 text-center">K</span>
                  <span className="w-8 text-center">D</span>
                  <span className="w-14 text-right">Score</span>
                  <span className="w-12 text-right">Ping</span>
                </div>
                {side.players.map(p => (
                  <div key={p.id} className="flex items-center px-3 py-2 rounded-lg" style={{ background: p.username === userName ? 'rgba(255,70,70,0.08)' : 'rgba(255,255,255,0.02)', border: p.username === userName ? '1px solid rgba(255,70,70,0.2)' : '1px solid transparent' }}>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white mr-2" style={{ background: p.avatar }}>{p.username[0]}</div>
                    <div className="flex-1 flex items-center gap-1.5">
                      <span className="text-sm text-white">{p.username}</span>
                      {!p.alive && <span className="text-xs text-red-400/60">☠</span>}
                    </div>
                    <span className="w-8 text-center text-sm text-white font-semibold">{p.kills}</span>
                    <span className="w-8 text-center text-sm text-white/50">{p.deaths}</span>
                    <span className="w-14 text-right text-sm text-yellow-400">{p.score.toLocaleString()}</span>
                    <span className="w-12 text-right text-xs" style={{ color: p.ping < 40 ? '#4fff4f' : p.ping < 80 ? '#ffcc00' : '#ff4444' }}>
                      {p.id === 'local' ? '—' : `${p.ping}ms`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
