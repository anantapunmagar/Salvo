import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { WEAPON_DB, UTILITY_DB, RANKS, getRankInfo, GAME_MODES, MAP_LAYOUTS } from '../game/constants';
import type { SimPlayer, GameSession } from '../game/GameEngine';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  onPlay: (mapIdx: number, simPlayers: SimPlayer[], session: GameSession) => void;
}

type Tab = 'home' | 'loadout' | 'profile' | 'settings' | 'leaderboard';

const SIM_NAMES = ['Viper_88', 'NightHawk', 'Zephyr', 'IceQueen', 'CryptoKnight', 'StormFox', 'Axel_X', 'Reaper99', 'Nova_Prime', 'Eclipse'];

function genSimPlayers(): SimPlayer[] {
  return SIM_NAMES.slice(0, 7 + Math.floor(Math.random() * 3)).map((name, i) => ({
    id: uuidv4(), username: name,
    avatar: ['#ff4646', '#ff8c00', '#ffd700', '#00cc66', '#00aaff', '#8855ff', '#ff55aa', '#00ffcc', '#ff6633', '#44ddff'][i % 10],
    x: 8 + Math.random() * 48, z: 8 + Math.random() * 48,
    yaw: Math.random() * Math.PI * 2,
    health: 100, alive: true,
    kills: Math.floor(Math.random() * 15), deaths: Math.floor(Math.random() * 8), score: Math.floor(Math.random() * 3000),
    team: i % 2 === 0 ? 'ct' : 't', rank: RANKS[Math.floor(Math.random() * RANKS.length)].name,
    ping: 18 + Math.floor(Math.random() * 60), state: 'alive',
  }));
}

export default function MainMenu({ onPlay }: Props) {
  const { user, logout, updateSettings, updateLoadout } = useAuthStore();
  const [tab, setTab] = useState<Tab>('home');
  const [selectedMode, setSelectedMode] = useState(0);
  const [selectedMap, setSelectedMap] = useState(0);
  const [matchmaking, setMatchmaking] = useState(false);
  const [matchTimer, setMatchTimer] = useState(0);

  if (!user) return null;

  const rankInfo = getRankInfo(user.rankPoints);
  const kd = user.deaths > 0 ? (user.kills / user.deaths).toFixed(2) : user.kills.toFixed(1);
  const hsPct = user.shots > 0 ? ((user.headshots / user.shots) * 100).toFixed(1) : '0.0';
  const xpPct = (user.xp / user.xpToNext) * 100;

  const startMatchmaking = () => {
    setMatchmaking(true);
    let t = 0;
    const iv = setInterval(() => {
      t += 0.1;
      setMatchTimer(t);
      if (t >= 3.2) {
        clearInterval(iv);
        setMatchmaking(false);
        setMatchTimer(0);
        const simPlayers = genSimPlayers();
        const session: GameSession = {
          id: uuidv4(), map: MAP_LAYOUTS[selectedMap] || 'DUST_COMPOUND', mode: GAME_MODES[selectedMode] || 'Deathmatch',
          players: simPlayers, timeLeft: selectedMode === 0 ? 600 : 115, roundPhase: 'play',
          scoreT: 0, scoreCT: 0, maxRounds: selectedMode <= 1 ? 1 : 30,
        };
        onPlay(selectedMap, simPlayers, session);
      }
    }, 100);
  };

  const tabs: { id: Tab; icon: string; label: string }[] = [
    { id: 'home', icon: '⬡', label: 'Play' },
    { id: 'loadout', icon: '⚙', label: 'Loadout' },
    { id: 'profile', icon: '◈', label: 'Profile' },
    { id: 'leaderboard', icon: '◉', label: 'Rankings' },
    { id: 'settings', icon: '◈', label: 'Settings' },
  ];

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: 'radial-gradient(ellipse at 30% 20%, #0d1e30 0%, #060c14 60%, #000 100%)', fontFamily: 'Segoe UI, sans-serif' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/[0.05]" style={{ background: 'rgba(0,0,0,0.6)' }}>
        <div className="flex items-center gap-3">
          <div className="text-2xl font-black text-white tracking-widest" style={{ textShadow: '0 0 30px rgba(255,70,70,0.4)' }}>SALVO</div>
          <div className="text-red-500/60 text-xs tracking-widest">ELITE EDITION</div>
        </div>
        {/* User info */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm" style={{ background: user.avatar }}>
              {user.username[0].toUpperCase()}
            </div>
            <div>
              <div className="text-white text-sm font-semibold">{user.username}</div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold" style={{ color: rankInfo.color }}>{rankInfo.name}</span>
                <span className="text-white/30 text-xs">Lv.{user.level}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center">
              <div className="text-xs text-white/40">XP</div>
              <div className="w-24 h-1.5 bg-white/10 rounded-full mt-0.5">
                <div className="h-full rounded-full" style={{ width: `${xpPct}%`, background: 'linear-gradient(90deg, #ff4646, #ff8800)' }} />
              </div>
            </div>
            <button onClick={logout} className="text-xs text-white/30 hover:text-white/60 transition-colors px-3 py-1.5 rounded border border-white/[0.08] hover:border-white/20">
              LOGOUT
            </button>
          </div>
        </div>
      </div>

      {/* Nav tabs */}
      <div className="flex border-b border-white/[0.04]" style={{ background: 'rgba(0,0,0,0.4)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 px-6 py-3.5 text-xs font-bold tracking-widest uppercase transition-all ${tab === t.id ? 'text-white border-b-2 border-red-500' : 'text-white/35 hover:text-white/55'}`}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {tab === 'home' && (
          <div className="flex h-full">
            {/* Left panel — game mode */}
            <div className="w-80 border-r border-white/[0.05] p-6 flex flex-col gap-4" style={{ background: 'rgba(0,0,0,0.3)' }}>
              <div className="text-xs font-bold text-white/40 tracking-widest uppercase mb-1">Game Mode</div>
              {GAME_MODES.map((mode, i) => (
                <button key={mode} onClick={() => setSelectedMode(i)}
                  className={`text-left px-4 py-3.5 rounded-xl transition-all ${selectedMode === i ? 'text-white' : 'text-white/45 hover:text-white/65'}`}
                  style={{ background: selectedMode === i ? 'rgba(255,70,70,0.12)' : 'rgba(255,255,255,0.025)', border: `1px solid ${selectedMode === i ? 'rgba(255,70,70,0.3)' : 'rgba(255,255,255,0.05)'}` }}>
                  <div className="font-semibold text-sm">{mode}</div>
                  <div className="text-xs text-white/30 mt-0.5">
                    {['Free-for-all chaos. 10 min kills', 'Team-based elimination. Coordinate', 'Plant/defuse the bomb. CT vs T', 'Competitive ranked match'][i]}
                  </div>
                </button>
              ))}
              <div className="text-xs font-bold text-white/40 tracking-widest uppercase mt-3 mb-1">Map</div>
              {['Dust Compound', 'Frost Basin', 'Neon District'].map((map, i) => (
                <button key={map} onClick={() => setSelectedMap(i)}
                  className={`text-left px-4 py-3 rounded-xl transition-all ${selectedMap === i ? 'text-white' : 'text-white/45 hover:text-white/65'} ${i > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  style={{ background: selectedMap === i ? 'rgba(255,70,70,0.1)' : 'rgba(255,255,255,0.02)', border: `1px solid ${selectedMap === i ? 'rgba(255,70,70,0.25)' : 'rgba(255,255,255,0.04)'}` }}
                  disabled={i > 0}>
                  <div className="font-semibold text-sm">{map}</div>
                  {i > 0 && <div className="text-xs text-white/25 mt-0.5">Coming Soon</div>}
                </button>
              ))}
            </div>

            {/* Center — main play area */}
            <div className="flex-1 flex flex-col items-center justify-center gap-8 px-12">
              {/* Map preview */}
              <div className="w-full max-w-lg aspect-video rounded-2xl overflow-hidden relative" style={{ background: 'rgba(10,18,28,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <MapPreview />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-3xl font-black text-white tracking-wider mb-1">DUST COMPOUND</div>
                  <div className="text-white/40 text-sm">Desert Tactical — Competitive</div>
                  <div className="flex gap-4 mt-3">
                    <span className="text-xs text-white/50">🎯 2 Bombsites</span>
                    <span className="text-xs text-white/50">🏙 Medium</span>
                    <span className="text-xs text-white/50">⚡ All modes</span>
                  </div>
                </div>
              </div>

              {/* Matchmaking button */}
              {!matchmaking ? (
                <button onClick={startMatchmaking}
                  className="px-20 py-5 rounded-2xl font-black text-xl tracking-widest uppercase text-white transition-all hover:scale-105"
                  style={{ background: 'linear-gradient(135deg, #cc2020 0%, #ff4646 50%, #ff6060 100%)', boxShadow: '0 0 60px rgba(255,50,50,0.3), 0 0 120px rgba(255,50,50,0.1)' }}>
                  FIND MATCH
                </button>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center gap-3 text-white">
                    <div className="w-6 h-6 border-2 border-red-500/40 border-t-red-500 rounded-full animate-spin" />
                    <span className="font-bold tracking-widest">FINDING MATCH… {matchTimer.toFixed(1)}s</span>
                  </div>
                  <div className="w-48 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${(matchTimer / 3.2) * 100}%` }} />
                  </div>
                  <div className="text-white/30 text-xs">Players found: {Math.min(10, Math.floor(matchTimer * 3.5))} / 10</div>
                </div>
              )}

              {/* Quick stats */}
              <div className="flex gap-8">
                {[
                  { label: 'K/D Ratio', value: kd },
                  { label: 'HS%', value: `${hsPct}%` },
                  { label: 'Wins', value: user.wins },
                  { label: 'Rank Points', value: user.rankPoints },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <div className="text-white font-bold text-xl">{s.value}</div>
                    <div className="text-white/35 text-xs uppercase tracking-wider">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right panel — controls */}
            <div className="w-64 border-l border-white/[0.05] p-5" style={{ background: 'rgba(0,0,0,0.3)' }}>
              <div className="text-xs font-bold text-white/40 tracking-widest uppercase mb-4">Controls</div>
              {[
                ['WASD', 'Movement'], ['SHIFT', 'Sprint'], ['SPACE', 'Jump'], ['C / CTRL', 'Crouch'],
                ['MOUSE', 'Aim & Shoot'], ['R', 'Reload'], ['1-3', 'Switch Weapon'], ['B', 'Buy Menu'],
                ['4', 'Throw Utility'], ['Q', 'Quick Switch'], ['F', 'Inspect'], ['G', 'Drop Weapon'],
                ['ESC', 'Exit / Unlock mouse'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between items-center py-1.5 border-b border-white/[0.04]">
                  <span className="text-xs font-bold text-red-400">{k}</span>
                  <span className="text-xs text-white/40">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'loadout' && <LoadoutTab />}
        {tab === 'profile' && <ProfileTab />}
        {tab === 'leaderboard' && <LeaderboardTab />}
        {tab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
}

function MapPreview() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 100 60" preserveAspectRatio="xMidYMid slice" style={{ opacity: 0.12 }}>
      <rect width="100" height="60" fill="#1a2030" />
      {/* Simplified map outline */}
      <rect x="4" y="4" width="14" height="10" fill="none" stroke="#8899bb" strokeWidth="0.5" />
      <rect x="6" y="38" width="22" height="18" fill="none" stroke="#ff6644" strokeWidth="0.8" />
      <rect x="60" y="18" width="20" height="22" fill="none" stroke="#4466ff" strokeWidth="0.8" />
      <line x1="18" y1="4" x2="35" y2="4" stroke="#8899bb" strokeWidth="0.3" />
      <line x1="35" y1="4" x2="35" y2="60" stroke="#8899bb" strokeWidth="0.3" />
      <line x1="6" y1="42" x2="6" y2="56" stroke="#8899bb" strokeWidth="0.3" />
      <line x1="42" y1="27" x2="60" y2="27" stroke="#8899bb" strokeWidth="0.3" />
      <text x="17" y="50" fontSize="3" fill="#ff6644" fontWeight="bold">A</text>
      <text x="70" y="30" fontSize="3" fill="#4466ff" fontWeight="bold">B</text>
      <circle cx="8" cy="8" r="2" fill="#00ff88" opacity="0.6" />
      <circle cx="86" cy="52" r="2" fill="#ff4444" opacity="0.6" />
    </svg>
  );
}

function LoadoutTab() {
  const { user, updateLoadout } = useAuthStore();
  const [primarySearch, setPrimarySearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('RIFLES');
  if (!user) return null;

  const cats = ['PISTOLS', 'SMGS', 'RIFLES', 'SNIPERS', 'SHOTGUNS'];
  const weaponsInCat = Object.entries(WEAPON_DB).filter(([, w]) => w.category === selectedCategory && (primarySearch === '' || w.name.toLowerCase().includes(primarySearch.toLowerCase())));
  const utilities = Object.entries(UTILITY_DB);

  return (
    <div className="p-6 flex gap-6">
      {/* Current loadout preview */}
      <div className="w-72 flex flex-col gap-4">
        <div className="text-xs font-bold text-white/40 tracking-widest uppercase">Current Loadout</div>
        {[
          { label: 'Primary', key: 'primary', value: user.loadout.primary },
          { label: 'Secondary', key: 'secondary', value: user.loadout.secondary },
          { label: 'Melee', key: 'melee', value: user.loadout.melee },
        ].map(slot => {
          const w = slot.value ? WEAPON_DB[slot.value] : null;
          return (
            <div key={slot.key} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="text-xs text-white/35 uppercase tracking-wider mb-2">{slot.label}</div>
              {w ? (
                <div>
                  <div className="text-white font-semibold text-sm">{w.name}</div>
                  {w.magSize ? (
                    <div className="flex gap-3 mt-1.5 text-xs text-white/40">
                      <span>DMG {w.damage}</span>
                      <span>RPM {Math.round(60 / w.fireRate)}</span>
                      <span>MAG {w.magSize}</span>
                    </div>
                  ) : null}
                  <div className="text-xs text-white/25 mt-1">{w.description}</div>
                </div>
              ) : <div className="text-white/25 text-sm">None</div>}
            </div>
          );
        })}
        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="text-xs text-white/35 uppercase tracking-wider mb-2">Utilities</div>
          <div className="flex gap-2 flex-wrap">
            {[user.loadout.utility1, user.loadout.utility2].filter(Boolean).map((u, i) => {
              const ud = UTILITY_DB[u || ''];
              return ud ? <span key={i} className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}>{ud.name}</span> : null;
            })}
          </div>
        </div>
      </div>

      {/* Weapon picker */}
      <div className="flex-1">
        <div className="flex gap-2 mb-4">
          {cats.map(c => (
            <button key={c} onClick={() => setSelectedCategory(c)} className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wider transition-all ${selectedCategory === c ? 'text-white' : 'text-white/35 hover:text-white/55'}`}
              style={{ background: selectedCategory === c ? 'rgba(255,70,70,0.15)' : 'rgba(255,255,255,0.02)', border: `1px solid ${selectedCategory === c ? 'rgba(255,70,70,0.3)' : 'rgba(255,255,255,0.05)'}` }}>
              {c}
            </button>
          ))}
        </div>
        <input value={primarySearch} onChange={e => setPrimarySearch(e.target.value)} placeholder="Search weapons…" className="w-full px-4 py-2 rounded-lg text-sm text-white mb-4"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
        <div className="grid grid-cols-2 gap-3">
          {weaponsInCat.map(([key, w]) => {
            const owned = user.loadout.primary === key || user.loadout.secondary === key;
            return (
              <div key={key} className="rounded-xl p-4 cursor-pointer transition-all hover:scale-[1.01]"
                style={{ background: owned ? 'rgba(255,70,70,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${owned ? 'rgba(255,70,70,0.3)' : 'rgba(255,255,255,0.06)'}` }}
                onClick={() => { if (w.type === 'pistol') updateLoadout({ secondary: key }); else updateLoadout({ primary: key }); }}>
                <div className="flex justify-between items-start mb-2">
                  <div className="text-white font-semibold text-sm">{w.name}</div>
                  <div className="text-yellow-400 text-xs font-bold">${w.price}</div>
                </div>
                {w.magSize ? (
                  <div className="flex gap-2 text-xs text-white/40 mb-2">
                    <span>DMG {w.damage}</span>
                    <span>•</span>
                    <span>{Math.round(60 / w.fireRate)} RPM</span>
                    <span>•</span>
                    <span>MAG {w.magSize}</span>
                  </div>
                ) : null}
                <div className="text-xs text-white/25">{w.description}</div>
                {w.silenced && <span className="inline-block mt-1 text-xs text-green-400/70 bg-green-400/10 px-1.5 py-0.5 rounded">Silenced</span>}
                {w.scoped && <span className="inline-block mt-1 text-xs text-blue-400/70 bg-blue-400/10 px-1.5 py-0.5 rounded">Scoped</span>}
              </div>
            );
          })}
        </div>

        {/* Utilities */}
        <div className="mt-5">
          <div className="text-xs font-bold text-white/40 tracking-widest uppercase mb-3">Utilities</div>
          <div className="grid grid-cols-4 gap-3">
            {utilities.map(([key, u]) => {
              const sel1 = user.loadout.utility1 === key, sel2 = user.loadout.utility2 === key;
              return (
                <div key={key} className="rounded-xl p-3 cursor-pointer transition-all"
                  style={{ background: (sel1 || sel2) ? 'rgba(255,70,70,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${(sel1 || sel2) ? 'rgba(255,70,70,0.3)' : 'rgba(255,255,255,0.06)'}` }}
                  onClick={() => { if (!sel1) updateLoadout({ utility1: key }); else updateLoadout({ utility2: key }); }}>
                  <div className="text-white text-xs font-semibold">{u.name}</div>
                  <div className="text-yellow-400 text-xs">${u.price}</div>
                  <div className="text-white/30 text-xs mt-0.5">{u.description}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileTab() {
  const { user } = useAuthStore();
  if (!user) return null;
  const rankInfo = getRankInfo(user.rankPoints);
  const kd = user.deaths > 0 ? (user.kills / user.deaths).toFixed(2) : user.kills.toFixed(1);
  const hsPct = user.shots > 0 ? ((user.headshots / user.shots) * 100).toFixed(1) : '0.0';
  const winRate = (user.wins + user.losses) > 0 ? ((user.wins / (user.wins + user.losses)) * 100).toFixed(0) : '0';
  const xpPct = (user.xp / user.xpToNext) * 100;

  const achievements = [
    { id: 'first_blood', name: 'First Blood', desc: 'Get your first kill', icon: '🩸', earned: user.kills >= 1 },
    { id: 'sharpshooter', name: 'Sharpshooter', desc: 'Get 10 headshots', icon: '🎯', earned: user.headshots >= 10 },
    { id: 'survivor', name: 'Survivor', desc: 'Win 5 rounds', icon: '🏆', earned: user.wins >= 5 },
    { id: 'veteran', name: 'Veteran', desc: 'Reach level 10', icon: '⭐', earned: user.level >= 10 },
    { id: 'gold_rush', name: 'Gold Rush', desc: 'Reach Gold rank', icon: '🥇', earned: user.rankPoints >= 500 },
    { id: 'centurion', name: 'Centurion', desc: 'Get 100 kills', icon: '💀', earned: user.kills >= 100 },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Profile header */}
      <div className="flex items-center gap-6 mb-8 p-6 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black text-white" style={{ background: user.avatar, boxShadow: `0 0 30px ${user.avatar}44` }}>
          {user.username[0].toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="text-2xl font-black text-white">{user.username}</div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm font-bold" style={{ color: rankInfo.color }}>{rankInfo.name}</span>
            <span className="text-white/30 text-sm">•</span>
            <span className="text-white/50 text-sm">Level {user.level}</span>
            <span className="text-white/30 text-sm">•</span>
            <span className="text-white/40 text-xs">{new Date(user.createdAt).toLocaleDateString()}</span>
          </div>
          {/* XP bar */}
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${xpPct}%`, background: 'linear-gradient(90deg, #ff4646, #ff8800)' }} />
            </div>
            <span className="text-xs text-white/40">{user.xp} / {user.xpToNext} XP</span>
          </div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-black" style={{ color: rankInfo.color }}>{user.rankPoints}</div>
          <div className="text-white/40 text-xs uppercase tracking-wider">Rank Points</div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Kills', value: user.kills, color: '#ff4646' },
          { label: 'K/D Ratio', value: kd, color: '#ffcc00' },
          { label: 'Headshots', value: user.headshots, color: '#ff8800' },
          { label: 'HS Rate', value: `${hsPct}%`, color: '#ff5500' },
          { label: 'Wins', value: user.wins, color: '#00ff88' },
          { label: 'Win Rate', value: `${winRate}%`, color: '#00cc66' },
          { label: 'Playtime', value: `${user.playtime}m`, color: '#4488ff' },
          { label: 'Damage', value: user.damageDealt.toLocaleString(), color: '#cc44ff' },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
            <div className="text-white/40 text-xs uppercase tracking-wider mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Achievements */}
      <div>
        <div className="text-sm font-bold text-white/50 uppercase tracking-widest mb-4">Achievements</div>
        <div className="grid grid-cols-3 gap-3">
          {achievements.map(a => (
            <div key={a.id} className="flex items-center gap-3 p-4 rounded-xl" style={{ background: a.earned ? 'rgba(255,200,0,0.07)' : 'rgba(255,255,255,0.02)', border: `1px solid ${a.earned ? 'rgba(255,200,0,0.2)' : 'rgba(255,255,255,0.05)'}`, opacity: a.earned ? 1 : 0.4 }}>
              <div className="text-2xl">{a.icon}</div>
              <div>
                <div className="text-white text-sm font-semibold">{a.name}</div>
                <div className="text-white/35 text-xs">{a.desc}</div>
              </div>
              {a.earned && <div className="ml-auto text-yellow-400 text-xs">✓</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LeaderboardTab() {
  const { user } = useAuthStore();
  const mockPlayers = [
    { username: 'Radiant_1', rankPoints: 4200, kills: 8820, rank: 'Radiant', avatar: '#ff6d00' },
    { username: 'GrandM_X', rankPoints: 3150, kills: 6540, rank: 'Grandmaster', avatar: '#f50057' },
    { username: 'Master88', rankPoints: 2820, kills: 5200, rank: 'Master', avatar: '#ff1744' },
    { username: 'Diam_II', rankPoints: 2100, kills: 4100, rank: 'Diamond II', avatar: '#651fff' },
    { username: 'Diam_I', rankPoints: 1750, kills: 3200, rank: 'Diamond I', avatar: '#7c4dff' },
    { username: 'Plat_II', rankPoints: 1380, kills: 2800, rank: 'Platinum II', avatar: '#29b6f6' },
    { username: 'Plat_I', rankPoints: 1080, kills: 2200, rank: 'Platinum I', avatar: '#4fc3f7' },
    { username: 'GoldElite', rankPoints: 880, kills: 1800, rank: 'Gold Elite', avatar: '#ffbb00' },
    ...(user ? [{ username: user.username + ' (You)', rankPoints: user.rankPoints, kills: user.kills, rank: getRankInfo(user.rankPoints).name, avatar: user.avatar }] : []),
  ].sort((a, b) => b.rankPoints - a.rankPoints);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="text-sm font-bold text-white/40 uppercase tracking-widest mb-5">Global Leaderboard</div>
      <div className="space-y-2">
        {mockPlayers.map((p, i) => {
          const isMe = p.username.includes('(You)');
          return (
            <div key={i} className="flex items-center gap-4 p-4 rounded-xl transition-all"
              style={{ background: isMe ? 'rgba(255,70,70,0.1)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isMe ? 'rgba(255,70,70,0.25)' : 'rgba(255,255,255,0.05)'}` }}>
              <div className="w-8 text-center font-black text-sm" style={{ color: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#ffffff55' }}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
              </div>
              <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs" style={{ background: p.avatar }}>
                {p.username[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="text-white text-sm font-semibold">{p.username}</div>
                <div className="text-xs" style={{ color: getRankInfo(p.rankPoints).color }}>{p.rank}</div>
              </div>
              <div className="text-right">
                <div className="text-white font-bold">{p.rankPoints} RP</div>
                <div className="text-white/35 text-xs">{p.kills.toLocaleString()} kills</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SettingsTab() {
  const { user, updateSettings } = useAuthStore();
  if (!user) return null;
  const s = user.settings;

  const row = (label: string, children: React.ReactNode) => (
    <div className="flex items-center justify-between py-3.5 border-b border-white/[0.04]">
      <span className="text-sm text-white/60">{label}</span>
      <div className="flex items-center gap-3">{children}</div>
    </div>
  );

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Mouse */}
      <div className="mb-6">
        <div className="text-xs font-bold text-white/40 tracking-widest uppercase mb-3">Mouse & Camera</div>
        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          {row('Sensitivity',
            <><input type="range" min="0.3" max="10" step="0.1" value={s.sensitivity} onChange={e => updateSettings({ sensitivity: +e.target.value })} className="w-28 accent-red-500" />
              <span className="text-white/60 text-sm w-8 text-right">{s.sensitivity.toFixed(1)}</span></>)}
          {row('FOV',
            <><input type="range" min="60" max="110" step="1" value={s.fov} onChange={e => updateSettings({ fov: +e.target.value })} className="w-28 accent-red-500" />
              <span className="text-white/60 text-sm w-8 text-right">{s.fov}°</span></>)}
          {row('Invert Y-Axis',
            <button onClick={() => updateSettings({ invertY: !s.invertY })} className={`w-12 h-6 rounded-full transition-all relative ${s.invertY ? 'bg-red-500' : 'bg-white/15'}`}>
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${s.invertY ? 'left-6' : 'left-0.5'}`} />
            </button>)}
        </div>
      </div>

      {/* Crosshair */}
      <div className="mb-6">
        <div className="text-xs font-bold text-white/40 tracking-widest uppercase mb-3">Crosshair</div>
        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          {row('Color', <><input type="color" value={s.crosshairColor} onChange={e => updateSettings({ crosshairColor: e.target.value })} className="w-8 h-8 rounded cursor-pointer" />
            <span className="text-white/40 text-xs">{s.crosshairColor}</span></>)}
          {row('Size', <><input type="range" min="2" max="18" step="0.5" value={s.crosshairSize} onChange={e => updateSettings({ crosshairSize: +e.target.value })} className="w-28 accent-red-500" />
            <span className="text-white/60 text-sm w-6 text-right">{s.crosshairSize}</span></>)}
          {row('Thickness', <><input type="range" min="0.5" max="4" step="0.25" value={s.crosshairThickness} onChange={e => updateSettings({ crosshairThickness: +e.target.value })} className="w-28 accent-red-500" />
            <span className="text-white/60 text-sm w-6 text-right">{s.crosshairThickness}</span></>)}
          {row('Gap', <><input type="range" min="0" max="16" step="1" value={s.crosshairGap} onChange={e => updateSettings({ crosshairGap: +e.target.value })} className="w-28 accent-red-500" />
            <span className="text-white/60 text-sm w-6 text-right">{s.crosshairGap}</span></>)}
          {row('Center Dot', <button onClick={() => updateSettings({ showDot: !s.showDot })} className={`w-12 h-6 rounded-full transition-all relative ${s.showDot ? 'bg-red-500' : 'bg-white/15'}`}>
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${s.showDot ? 'left-6' : 'left-0.5'}`} />
          </button>)}
          {/* Preview */}
          <div className="mt-4 flex items-center justify-center" style={{ height: 80, background: 'rgba(0,0,0,0.3)', borderRadius: 8 }}>
            <div className="relative flex items-center justify-center" style={{ width: 80, height: 80 }}>
              {[[-1, 0], [1, 0], [0, -1], [0, 1]].map(([dx, dy], i) => (
                <div key={i} className="absolute" style={{ width: s.crosshairThickness * 4, height: s.crosshairSize * 2.5, background: s.crosshairColor, transform: `rotate(${i < 2 ? 90 : 0}deg) translate(${dx * (s.crosshairGap + s.crosshairSize) * 0.8}px, ${dy * (s.crosshairGap + s.crosshairSize) * 0.8}px)` }} />
              ))}
              {s.showDot && <div className="absolute w-1.5 h-1.5 rounded-full" style={{ background: s.crosshairColor }} />}
            </div>
          </div>
        </div>
      </div>

      {/* HUD */}
      <div className="mb-6">
        <div className="text-xs font-bold text-white/40 tracking-widest uppercase mb-3">HUD</div>
        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          {row('Show FPS', <button onClick={() => updateSettings({ showFps: !s.showFps })} className={`w-12 h-6 rounded-full transition-all relative ${s.showFps ? 'bg-red-500' : 'bg-white/15'}`}>
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${s.showFps ? 'left-6' : 'left-0.5'}`} />
          </button>)}
        </div>
      </div>
    </div>
  );
}
