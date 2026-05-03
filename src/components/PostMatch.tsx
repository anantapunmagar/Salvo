import React from 'react';
import { useAuthStore } from '../store/authStore';
import { getRankInfo } from '../game/constants';

interface Props {
  stats: Record<string, number>;
  onContinue: () => void;
}

export default function PostMatch({ stats, onContinue }: Props) {
  const { user } = useAuthStore();
  if (!user) return null;

  const kd = stats.deaths > 0 ? (stats.kills / stats.deaths).toFixed(2) : stats.kills.toFixed(1);
  const acc = stats.totalShots > 0 ? ((stats.totalHits / stats.totalShots) * 100).toFixed(1) : '0.0';
  const xp = stats.xpGained || 0;
  const rp = Math.floor(stats.kills * 12 + stats.score * 0.08);
  const rankInfo = getRankInfo(user.rankPoints);
  const newRankInfo = getRankInfo(user.rankPoints + rp);
  const promoted = newRankInfo.name !== rankInfo.name;

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'radial-gradient(ellipse at center, #0a1520 0%, #050a10 70%, #000 100%)' }}>
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl font-black text-white tracking-widest mb-2" style={{ textShadow: '0 0 40px rgba(255,70,70,0.4)' }}>
            MATCH COMPLETE
          </div>
          {promoted && (
            <div className="text-xl font-bold mb-1" style={{ color: newRankInfo.color }}>
              🎉 RANK UP! {rankInfo.name} → {newRankInfo.name}
            </div>
          )}
          <div className="text-white/40 text-sm">+{xp} XP gained this match</div>
        </div>

        {/* Stats card */}
        <div className="rounded-2xl overflow-hidden mb-6" style={{ background: 'rgba(10,16,26,0.96)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {/* Performance banner */}
          <div className="px-8 py-5 flex items-center gap-4" style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center font-black text-xl text-white" style={{ background: user.avatar }}>
              {user.username[0]}
            </div>
            <div>
              <div className="text-white font-bold text-lg">{user.username}</div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold" style={{ color: rankInfo.color }}>{rankInfo.name}</span>
                <span className="text-white/30">•</span>
                <span className="text-white/40 text-sm">Level {user.level}</span>
              </div>
            </div>
            <div className="ml-auto text-right">
              <div className="text-3xl font-black text-white">{stats.score?.toLocaleString() || 0}</div>
              <div className="text-white/40 text-xs uppercase tracking-wider">Final Score</div>
            </div>
          </div>

          {/* Main stats */}
          <div className="grid grid-cols-4 divide-x divide-white/[0.04]">
            {[
              { label: 'Kills', value: stats.kills || 0, color: '#ff4646', icon: '☠' },
              { label: 'Deaths', value: stats.deaths || 0, color: '#ff8888', icon: '💀' },
              { label: 'K/D Ratio', value: kd, color: '#ffcc00', icon: '⚡' },
              { label: 'Accuracy', value: `${acc}%`, color: '#4488ff', icon: '🎯' },
            ].map(s => (
              <div key={s.label} className="px-6 py-5 text-center">
                <div className="text-xl mb-1">{s.icon}</div>
                <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
                <div className="text-white/35 text-xs uppercase tracking-wider mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Secondary stats */}
          <div className="grid grid-cols-3 gap-0 border-t border-white/[0.04] divide-x divide-white/[0.04]">
            {[
              { label: 'Damage Dealt', value: Math.floor(stats.totalDamage || 0).toLocaleString() },
              { label: 'XP Earned', value: `+${xp}` },
              { label: 'Rank Points', value: `+${rp}` },
            ].map(s => (
              <div key={s.label} className="px-5 py-4 text-center">
                <div className="text-lg font-bold text-white">{s.value}</div>
                <div className="text-white/30 text-xs uppercase tracking-wider mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* XP bar */}
          <div className="px-8 py-5 border-t border-white/[0.04]">
            <div className="flex justify-between text-xs text-white/40 mb-2">
              <span>Level {user.level}</span>
              <span>{Math.min(user.xp + xp, user.xpToNext)} / {user.xpToNext} XP</span>
              <span>Level {user.level + (user.xp + xp >= user.xpToNext ? 1 : 0)}</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, ((user.xp + xp) / user.xpToNext) * 100)}%`, background: 'linear-gradient(90deg, #ff4646, #ff8800)' }} />
            </div>
          </div>
        </div>

        {/* Achievements this match */}
        {stats.kills >= 5 && (
          <div className="flex gap-3 mb-6 justify-center">
            {stats.kills >= 5 && <div className="flex items-center gap-2 px-4 py-2 rounded-full text-sm" style={{ background: 'rgba(255,200,0,0.1)', border: '1px solid rgba(255,200,0,0.25)', color: '#ffd700' }}>
              <span>🎖</span> <span className="font-semibold">5+ Kill Game</span>
            </div>}
            {(stats.kills / Math.max(stats.deaths, 1)) >= 3 && <div className="flex items-center gap-2 px-4 py-2 rounded-full text-sm" style={{ background: 'rgba(255,70,70,0.1)', border: '1px solid rgba(255,70,70,0.25)', color: '#ff4646' }}>
              <span>🔥</span> <span className="font-semibold">3.0+ K/D</span>
            </div>}
          </div>
        )}

        {/* Continue button */}
        <div className="text-center">
          <button onClick={onContinue}
            className="px-16 py-4 rounded-2xl font-black text-lg tracking-widest uppercase text-white transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #cc2020, #ff4646)', boxShadow: '0 0 40px rgba(255,50,50,0.25)' }}>
            CONTINUE
          </button>
        </div>
      </div>
    </div>
  );
}
