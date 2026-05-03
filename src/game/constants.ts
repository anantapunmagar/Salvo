export const PHYSICS = {
  gravity: 9.807,
  airDensity: 1.225,
  terminalVelocity: 55,
  frictionGround: 0.72,
  frictionAir: 0.015,
  playerMass: 80,
  jumpImpulse: 5.0,
  walkAccel: 48,
  sprintAccel: 72,
  crouchAccel: 22,
  maxWalkSpeed: 4.5,
  maxSprintSpeed: 7.5,
  maxCrouchSpeed: 2.2,
  playerHeight: 1.78,
  playerCrouchHeight: 1.1,
  eyeRatio: 0.91,
  playerRadius: 0.38,
  staminaMax: 100,
  staminaDrain: 20,
  staminaRegen: 14,
};

export const MAP_W = 64;
export const MAP_H = 64;
export const RENDER_DIST = 130;

export const WEAPON_DB: Record<string, WeaponDef> = {
  knife: {
    name: 'Combat Knife', type: 'melee', slot: 2,
    damage: 45, backstabDmg: 175, range: 2.2,
    attackRate: 0.48, price: 0, weight: 0.3,
    magSize: 0, maxAmmo: 0, fireRate: 0.48,
    bulletSpeed: 0, bulletMass: 0, bulletDiam: 0,
    dragCoeff: 0, recoilV: 0, recoilH: 0,
    recoilRecovery: 0, spread: 0, sprintSpreadMul: 0,
    moveSpreadMul: 0, automatic: false, penetration: 0,
    headshotMul: 1, sound: 'melee',
    description: 'Silent, lethal. Backstab for massive damage.',
    category: 'MELEE',
  },
  glock: {
    name: 'Glock-18', type: 'pistol', slot: 1,
    damage: 28, fireRate: 0.13, reloadTime: 2.2,
    magSize: 20, maxAmmo: 120, price: 200,
    bulletSpeed: 375, bulletMass: 0.008, bulletDiam: 0.009,
    dragCoeff: 0.295, recoilV: 0.025, recoilH: 0.008,
    recoilRecovery: 0.13, spread: 0.007, sprintSpreadMul: 3.0,
    moveSpreadMul: 1.5, automatic: false, penetration: 0.15,
    headshotMul: 4.0, weight: 0.63, sound: 'pistol',
    description: 'Fast-firing starter pistol. High mag capacity.',
    category: 'PISTOLS',
  },
  usp: {
    name: 'USP-S', type: 'pistol', slot: 1,
    damage: 32, fireRate: 0.16, reloadTime: 2.1,
    magSize: 12, maxAmmo: 48, price: 200,
    bulletSpeed: 360, bulletMass: 0.008, bulletDiam: 0.009,
    dragCoeff: 0.28, recoilV: 0.020, recoilH: 0.005,
    recoilRecovery: 0.15, spread: 0.004, sprintSpreadMul: 2.5,
    moveSpreadMul: 1.3, automatic: false, penetration: 0.15,
    headshotMul: 4.2, weight: 0.77, sound: 'pistol_s', silenced: true,
    description: 'Silenced precision pistol. Low recoil, accurate.',
    category: 'PISTOLS',
  },
  deagle: {
    name: 'Desert Eagle', type: 'pistol', slot: 1,
    damage: 63, fireRate: 0.38, reloadTime: 2.2,
    magSize: 7, maxAmmo: 35, price: 700,
    bulletSpeed: 470, bulletMass: 0.0195, bulletDiam: 0.0127,
    dragCoeff: 0.35, recoilV: 0.09, recoilH: 0.028,
    recoilRecovery: 0.055, spread: 0.011, sprintSpreadMul: 4.2,
    moveSpreadMul: 2.6, automatic: false, penetration: 0.4,
    headshotMul: 2.8, weight: 1.99, sound: 'deagle',
    description: 'Magnum pistol. High damage, high recoil. Skill check.',
    category: 'PISTOLS',
  },
  mp5: {
    name: 'MP5-SD', type: 'smg', slot: 0,
    damage: 24, fireRate: 0.072, reloadTime: 2.4,
    magSize: 30, maxAmmo: 120, price: 1500,
    bulletSpeed: 285, bulletMass: 0.008, bulletDiam: 0.009,
    dragCoeff: 0.29, recoilV: 0.017, recoilH: 0.006,
    recoilRecovery: 0.16, spread: 0.009, sprintSpreadMul: 2.4,
    moveSpreadMul: 1.2, automatic: true, penetration: 0.12,
    headshotMul: 3.5, weight: 2.54, sound: 'smg_s', silenced: true,
    description: 'Silenced SMG. Great for rushing, quiet and controllable.',
    category: 'SMGS',
  },
  p90: {
    name: 'P90', type: 'smg', slot: 0,
    damage: 25, fireRate: 0.063, reloadTime: 3.2,
    magSize: 50, maxAmmo: 100, price: 2350,
    bulletSpeed: 715, bulletMass: 0.0023, bulletDiam: 0.0057,
    dragCoeff: 0.22, recoilV: 0.015, recoilH: 0.007,
    recoilRecovery: 0.14, spread: 0.011, sprintSpreadMul: 2.0,
    moveSpreadMul: 1.1, automatic: true, penetration: 0.18,
    headshotMul: 3.5, weight: 2.54, sound: 'smg',
    description: '50-round mag beast. Spray and pray specialist.',
    category: 'SMGS',
  },
  m4a1: {
    name: 'M4A1-S', type: 'rifle', slot: 0,
    damage: 35, fireRate: 0.085, reloadTime: 3.0,
    magSize: 25, maxAmmo: 75, price: 2900,
    bulletSpeed: 910, bulletMass: 0.004, bulletDiam: 0.00556,
    dragCoeff: 0.24, recoilV: 0.020, recoilH: 0.004,
    recoilRecovery: 0.11, spread: 0.0035, sprintSpreadMul: 4.2,
    moveSpreadMul: 2.1, automatic: true, penetration: 0.48,
    headshotMul: 4.0, weight: 2.88, sound: 'rifle_s', silenced: true,
    description: 'Precision silenced rifle. Low recoil, high accuracy.',
    category: 'RIFLES',
  },
  ak47: {
    name: 'AK-47', type: 'rifle', slot: 0,
    damage: 38, fireRate: 0.098, reloadTime: 2.4,
    magSize: 30, maxAmmo: 90, price: 2700,
    bulletSpeed: 715, bulletMass: 0.008, bulletDiam: 0.00762,
    dragCoeff: 0.3, recoilV: 0.038, recoilH: 0.013,
    recoilRecovery: 0.075, spread: 0.006, sprintSpreadMul: 4.6,
    moveSpreadMul: 2.5, automatic: true, penetration: 0.52,
    headshotMul: 3.8, weight: 3.47, sound: 'rifle',
    description: 'Raw power. One-tap headshot machine. Master the spray.',
    category: 'RIFLES',
  },
  awp: {
    name: 'AWP', type: 'sniper', slot: 0,
    damage: 115, fireRate: 1.4, reloadTime: 3.6,
    magSize: 5, maxAmmo: 30, price: 4750,
    bulletSpeed: 936, bulletMass: 0.0116, bulletDiam: 0.00762,
    dragCoeff: 0.22, recoilV: 0.13, recoilH: 0.022,
    recoilRecovery: 0.028, spread: 0.0008, sprintSpreadMul: 9.0,
    moveSpreadMul: 5.5, automatic: false, penetration: 0.75,
    headshotMul: 2.8, scoped: true, scopeZoom: 4.2,
    weight: 6.5, sound: 'sniper',
    description: 'One-shot kill to body/head. God rifle. No running.',
    category: 'SNIPERS',
  },
  nova: {
    name: 'Nova', type: 'shotgun', slot: 0,
    damage: 19, fireRate: 0.82, reloadTime: 0.5,
    magSize: 8, maxAmmo: 32, price: 1050,
    bulletSpeed: 400, bulletMass: 0.0036, bulletDiam: 0.0085,
    dragCoeff: 0.4, recoilV: 0.065, recoilH: 0.022,
    recoilRecovery: 0.048, spread: 0.058, sprintSpreadMul: 1.5,
    moveSpreadMul: 1.2, automatic: false, pellets: 9,
    penetration: 0.05, headshotMul: 3.0, reloadPerShell: true,
    weight: 3.52, sound: 'shotgun',
    description: 'Pump-action close range destroyer.',
    category: 'SHOTGUNS',
  },
  mag7: {
    name: 'MAG-7', type: 'shotgun', slot: 0,
    damage: 26, fireRate: 0.62, reloadTime: 2.4,
    magSize: 5, maxAmmo: 20, price: 1300,
    bulletSpeed: 380, bulletMass: 0.0048, bulletDiam: 0.009,
    dragCoeff: 0.42, recoilV: 0.072, recoilH: 0.026,
    recoilRecovery: 0.038, spread: 0.046, sprintSpreadMul: 1.8,
    moveSpreadMul: 1.3, automatic: false, pellets: 8,
    penetration: 0.08, headshotMul: 3.0, weight: 3.1, sound: 'shotgun',
    description: 'Magazine-fed shotgun. Better rate, fewer shells.',
    category: 'SHOTGUNS',
  },
};

export const UTILITY_DB: Record<string, UtilityDef> = {
  smoke: {
    name: 'Smoke Grenade', price: 300, maxStack: 1,
    throwSpeed: 15, fuseTime: 1.6, duration: 18, radius: 4.2,
    weight: 0.39, type: 'smoke',
    description: 'Blocks vision for 18 seconds. Tactical must-have.',
  },
  flash: {
    name: 'Flashbang', price: 200, maxStack: 2,
    throwSpeed: 18, fuseTime: 1.6, duration: 0, radius: 10,
    weight: 0.26, type: 'flash',
    description: 'Blinds enemies. Pop flash around corners.',
  },
  frag: {
    name: 'HE Grenade', price: 300, maxStack: 1,
    throwSpeed: 16, fuseTime: 1.75, duration: 0, radius: 6.5,
    damage: 98, weight: 0.4, type: 'frag',
    description: 'High explosive. Chip enemies off angles.',
  },
  molotov: {
    name: 'Molotov', price: 400, maxStack: 1,
    throwSpeed: 13, fuseTime: 0.1, duration: 7.5, radius: 3.8,
    damage: 9, weight: 0.75, type: 'molotov',
    description: 'Fire zone. Denies areas and flushes campers.',
  },
};

export interface WeaponDef {
  name: string;
  type: string;
  slot: number;
  damage: number;
  fireRate: number;
  reloadTime?: number;
  magSize: number;
  maxAmmo: number;
  price: number;
  bulletSpeed: number;
  bulletMass: number;
  bulletDiam: number;
  dragCoeff: number;
  recoilV: number;
  recoilH: number;
  recoilRecovery: number;
  spread: number;
  sprintSpreadMul: number;
  moveSpreadMul: number;
  automatic: boolean;
  penetration: number;
  headshotMul: number;
  weight: number;
  sound: string;
  silenced?: boolean;
  scoped?: boolean;
  scopeZoom?: number;
  pellets?: number;
  reloadPerShell?: boolean;
  backstabDmg?: number;
  range?: number;
  attackRate?: number;
  description?: string;
  category?: string;
}

export interface UtilityDef {
  name: string;
  price: number;
  maxStack: number;
  throwSpeed: number;
  fuseTime: number;
  duration: number;
  radius: number;
  weight: number;
  type: string;
  damage?: number;
  description?: string;
}

export const RANKS = [
  { name: 'Iron I', min: 0, color: '#888' },
  { name: 'Iron II', min: 50, color: '#999' },
  { name: 'Bronze I', min: 100, color: '#cd7f32' },
  { name: 'Bronze II', min: 150, color: '#b87333' },
  { name: 'Silver I', min: 200, color: '#c0c0c0' },
  { name: 'Silver II', min: 300, color: '#d0d0d0' },
  { name: 'Silver Elite', min: 400, color: '#e0e0e0' },
  { name: 'Gold I', min: 500, color: '#ffd700' },
  { name: 'Gold II', min: 650, color: '#ffcc00' },
  { name: 'Gold Elite', min: 800, color: '#ffbb00' },
  { name: 'Platinum I', min: 1000, color: '#4fc3f7' },
  { name: 'Platinum II', min: 1250, color: '#29b6f6' },
  { name: 'Diamond I', min: 1500, color: '#7c4dff' },
  { name: 'Diamond II', min: 1800, color: '#651fff' },
  { name: 'Master', min: 2200, color: '#ff1744' },
  { name: 'Grandmaster', min: 2700, color: '#f50057' },
  { name: 'Radiant', min: 3500, color: '#ff6d00' },
];

export function getRankInfo(rp: number) {
  let rank = RANKS[0];
  for (const r of RANKS) { if (rp >= r.min) rank = r; else break; }
  return rank;
}

export const MAP_LAYOUTS = ['DUST_COMPOUND', 'FROST_BASIN', 'NEON_DISTRICT'];
export const GAME_MODES = ['Deathmatch', 'Team Deathmatch', 'Defuse', 'Ranked'];
