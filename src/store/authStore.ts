import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export interface PlayerProfile {
  id: string;
  username: string;
  email: string;
  avatar: string; // color hex
  rank: string;
  rankPoints: number;
  level: number;
  xp: number;
  xpToNext: number;
  kills: number;
  deaths: number;
  wins: number;
  losses: number;
  headshots: number;
  shots: number;
  damageDealt: number;
  playtime: number; // minutes
  createdAt: string;
  lastLogin: string;
  settings: PlayerSettings;
  loadout: Loadout;
  achievements: string[];
  friends: string[];
}

export interface PlayerSettings {
  sensitivity: number;
  fov: number;
  volume: number;
  showFps: boolean;
  crosshairColor: string;
  crosshairSize: number;
  crosshairThickness: number;
  crosshairGap: number;
  showDot: boolean;
  colorblindMode: string;
  invertY: boolean;
}

export interface Loadout {
  primary: string;
  secondary: string;
  melee: string;
  utility1: string;
  utility2: string;
  skin: string;
}

interface AuthStore {
  user: PlayerProfile | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  error: string | null;
  screen: 'login' | 'register' | 'main';
  login: (email: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  setScreen: (screen: 'login' | 'register' | 'main') => void;
  updateSettings: (settings: Partial<PlayerSettings>) => void;
  updateLoadout: (loadout: Partial<Loadout>) => void;
  updateStats: (stats: Partial<PlayerProfile>) => void;
  clearError: () => void;
  autoLogin: () => void;
}

const DEFAULT_SETTINGS: PlayerSettings = {
  sensitivity: 2.0,
  fov: 90,
  volume: 80,
  showFps: true,
  crosshairColor: '#00ff88',
  crosshairSize: 6,
  crosshairThickness: 1.5,
  crosshairGap: 5,
  showDot: true,
  colorblindMode: 'none',
  invertY: false,
};

const DEFAULT_LOADOUT: Loadout = {
  primary: 'm4a1',
  secondary: 'glock',
  melee: 'knife',
  utility1: 'smoke',
  utility2: 'flash',
  skin: 'default',
};

const RANKS = [
  'Silver I', 'Silver II', 'Silver III', 'Silver Elite',
  'Gold I', 'Gold II', 'Gold III', 'Gold Elite',
  'Platinum I', 'Platinum II', 'Platinum III',
  'Diamond I', 'Diamond II',
  'Master', 'Grandmaster', 'Radiant'
];

function getRank(rp: number): string {
  const idx = Math.min(Math.floor(rp / 100), RANKS.length - 1);
  return RANKS[idx];
}

function getXpToNext(level: number): number {
  return Math.floor(1000 * Math.pow(1.15, level - 1));
}

const STORAGE_KEY = 'salvo_accounts';
const SESSION_KEY = 'salvo_session';

function loadAccounts(): Record<string, { profile: PlayerProfile; password: string }> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveAccounts(accounts: Record<string, { profile: PlayerProfile; password: string }>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

function hashPassword(password: string): string {
  // Simple deterministic hash for demo (NOT production safe)
  let h = 0;
  for (let i = 0; i < password.length; i++) {
    h = ((h << 5) - h + password.charCodeAt(i)) | 0;
  }
  return h.toString(16);
}

const AVATAR_COLORS = [
  '#ff4646', '#ff8c00', '#ffd700', '#00cc66', '#00aaff',
  '#8855ff', '#ff55aa', '#00ffcc', '#ff6633', '#44ddff'
];

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isLoggedIn: false,
  isLoading: false,
  error: null,
  screen: 'login',

  autoLogin: () => {
    try {
      const sessionId = localStorage.getItem(SESSION_KEY);
      if (!sessionId) return;
      const accounts = loadAccounts();
      const entry = accounts[sessionId];
      if (entry) {
        entry.profile.lastLogin = new Date().toISOString();
        saveAccounts(accounts);
        set({ user: entry.profile, isLoggedIn: true, screen: 'main' });
      }
    } catch { /* silent */ }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    await new Promise(r => setTimeout(r, 600));
    const accounts = loadAccounts();
    const key = email.toLowerCase().trim();
    const entry = accounts[key];
    if (!entry) {
      set({ isLoading: false, error: 'Account not found. Please register.' });
      return false;
    }
    if (entry.password !== hashPassword(password)) {
      set({ isLoading: false, error: 'Incorrect password.' });
      return false;
    }
    entry.profile.lastLogin = new Date().toISOString();
    saveAccounts(accounts);
    localStorage.setItem(SESSION_KEY, key);
    set({ user: entry.profile, isLoggedIn: true, isLoading: false, screen: 'main' });
    return true;
  },

  register: async (username, email, password) => {
    set({ isLoading: true, error: null });
    await new Promise(r => setTimeout(r, 800));
    if (username.length < 3 || username.length > 16) {
      set({ isLoading: false, error: 'Username must be 3–16 characters.' });
      return false;
    }
    if (!email.includes('@')) {
      set({ isLoading: false, error: 'Invalid email address.' });
      return false;
    }
    if (password.length < 6) {
      set({ isLoading: false, error: 'Password must be at least 6 characters.' });
      return false;
    }
    const accounts = loadAccounts();
    const key = email.toLowerCase().trim();
    if (accounts[key]) {
      set({ isLoading: false, error: 'Email already registered.' });
      return false;
    }
    // Check username uniqueness
    const usernameTaken = Object.values(accounts).some(
      a => a.profile.username.toLowerCase() === username.toLowerCase()
    );
    if (usernameTaken) {
      set({ isLoading: false, error: 'Username already taken.' });
      return false;
    }
    const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    const profile: PlayerProfile = {
      id: uuidv4(),
      username,
      email: key,
      avatar: avatarColor,
      rank: 'Silver I',
      rankPoints: 0,
      level: 1,
      xp: 0,
      xpToNext: getXpToNext(1),
      kills: 0,
      deaths: 0,
      wins: 0,
      losses: 0,
      headshots: 0,
      shots: 0,
      damageDealt: 0,
      playtime: 0,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      settings: { ...DEFAULT_SETTINGS },
      loadout: { ...DEFAULT_LOADOUT },
      achievements: [],
      friends: [],
    };
    accounts[key] = { profile, password: hashPassword(password) };
    saveAccounts(accounts);
    localStorage.setItem(SESSION_KEY, key);
    set({ user: profile, isLoggedIn: true, isLoading: false, screen: 'main' });
    return true;
  },

  logout: () => {
    localStorage.removeItem(SESSION_KEY);
    set({ user: null, isLoggedIn: false, screen: 'login' });
  },

  setScreen: (screen) => set({ screen }),

  updateSettings: (settings) => {
    const user = get().user;
    if (!user) return;
    const updated = { ...user, settings: { ...user.settings, ...settings } };
    const accounts = loadAccounts();
    if (accounts[user.email]) {
      accounts[user.email].profile = updated;
      saveAccounts(accounts);
    }
    set({ user: updated });
  },

  updateLoadout: (loadout) => {
    const user = get().user;
    if (!user) return;
    const updated = { ...user, loadout: { ...user.loadout, ...loadout } };
    const accounts = loadAccounts();
    if (accounts[user.email]) {
      accounts[user.email].profile = updated;
      saveAccounts(accounts);
    }
    set({ user: updated });
  },

  updateStats: (stats) => {
    const user = get().user;
    if (!user) return;
    const updated = { ...user, ...stats };
    // Level up logic
    while (updated.xp >= updated.xpToNext) {
      updated.xp -= updated.xpToNext;
      updated.level++;
      updated.xpToNext = getXpToNext(updated.level);
    }
    updated.rank = getRank(updated.rankPoints);
    const accounts = loadAccounts();
    if (accounts[user.email]) {
      accounts[user.email].profile = updated;
      saveAccounts(accounts);
    }
    set({ user: updated });
  },

  clearError: () => set({ error: null }),
}));
