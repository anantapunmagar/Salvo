import React, { useEffect, useState } from 'react';
import { useAuthStore } from './store/authStore';
import AuthScreen from './components/AuthScreen';
import MainMenu from './components/MainMenu';
import GameView from './components/GameView';
import PostMatch from './components/PostMatch';
import type { SimPlayer, GameSession } from './game/GameEngine';

type AppState = 'auth' | 'menu' | 'game' | 'postmatch';

export default function App() {
  const { isLoggedIn, autoLogin, updateStats, user } = useAuthStore();
  const [appState, setAppState] = useState<AppState>('auth');
  const [gameConfig, setGameConfig] = useState<{ mapIdx: number; simPlayers: SimPlayer[]; session: GameSession } | null>(null);
  const [matchStats, setMatchStats] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    autoLogin();
  }, []);

  useEffect(() => {
    if (isLoggedIn && appState === 'auth') setAppState('menu');
    else if (!isLoggedIn) setAppState('auth');
  }, [isLoggedIn]);

  const handlePlay = (mapIdx: number, simPlayers: SimPlayer[], session: GameSession) => {
    setGameConfig({ mapIdx, simPlayers, session });
    setAppState('game');
  };

  const handleGameExit = (stats: Record<string, number>) => {
    setMatchStats(stats);
    setAppState('postmatch');

    // Update persistent stats
    if (user) {
      const xpGained = stats.xpGained || 0;
      const rp = Math.floor((stats.kills || 0) * 12 + (stats.score || 0) * 0.08);
      updateStats({
        kills: user.kills + (stats.kills || 0),
        deaths: user.deaths + (stats.deaths || 0),
        headshots: user.headshots + Math.floor((stats.kills || 0) * 0.35),
        shots: user.shots + (stats.totalShots || 0),
        damageDealt: user.damageDealt + Math.floor(stats.totalDamage || 0),
        wins: user.wins + (stats.kills > stats.deaths ? 1 : 0),
        losses: user.losses + (stats.kills <= stats.deaths ? 1 : 0),
        xp: user.xp + xpGained,
        rankPoints: user.rankPoints + rp,
        playtime: user.playtime + Math.floor((Date.now() - Date.now()) / 60000) + 5, // ~5 min per match min
        lastLogin: new Date().toISOString(),
      });
    }
  };

  const handlePostMatchContinue = () => {
    setMatchStats(null);
    setGameConfig(null);
    setAppState('menu');
  };

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#000' }}>
      {appState === 'auth' && <AuthScreen />}
      {appState === 'menu' && <MainMenu onPlay={handlePlay} />}
      {appState === 'game' && gameConfig && (
        <GameView
          mapIdx={gameConfig.mapIdx}
          simPlayers={gameConfig.simPlayers}
          session={gameConfig.session}
          onExit={handleGameExit}
        />
      )}
      {appState === 'postmatch' && matchStats && (
        <PostMatch stats={matchStats} onContinue={handlePostMatchContinue} />
      )}
    </div>
  );
}
