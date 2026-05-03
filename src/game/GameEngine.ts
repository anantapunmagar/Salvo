import { PHYSICS, WEAPON_DB, UTILITY_DB, MAP_W, RENDER_DIST, WeaponDef } from './constants';
import { MapData, gMap, gHeight, gColor, castRay, generateMap } from './mapGen';
import { PlayerProfile } from '../store/authStore';

export interface PlayerState {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  yaw: number; pitch: number;
  height: number; eyeH: number;
  onGround: boolean; crouching: boolean; sprinting: boolean;
  stamina: number;
  health: number; maxHealth: number; armor: number; helmet: boolean;
  money: number;
  inventory: { primary: string | null; secondary: string | null; melee: string; utilities: string[] };
  currentSlot: number; prevSlot: number;
  ammo: Record<string, number>; reserveAmmo: Record<string, number>;
  reloading: boolean; reloadTimer: number;
  fireTimer: number;
  recoilPitch: number; recoilYaw: number; recoilPattern: number;
  weaponBob: number;
  weaponSway: { x: number; y: number };
  headBob: number;
  score: number; kills: number; deaths: number; assists: number;
  dmgFlash: number; dmgDir: number;
  flashAmount: number;
  scoped: boolean;
  inspecting: boolean; inspectTimer: number;
  alive: boolean;
  killFeed: { name: string; time: number; headshot: boolean; weapon: string }[];
  hitmarkerTimer: number; headshotHit: boolean;
  landingShock: number;
  velocitySmooth: number;
  _lmd: boolean;
  totalDamage: number; totalShots: number; totalHits: number;
  xpGained: number;
}

export interface Bullet {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  wKey: string; damage: number;
  mass: number; diam: number; area: number;
  dragCd: number; pen: number; hsMul: number;
  alive: boolean; life: number; maxLife: number;
  owner: string;
  trail: { x: number; y: number; z: number }[];
}

export interface Particle {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  color: { r: number; g: number; b: number };
  life: number; maxLife: number; size: number;
}

export interface EnemyState {
  x: number; y: number; z: number;
  vx: number; vz: number; yaw: number;
  type: string; health: number; maxHealth: number; armor: number;
  speed: number; state: string;
  alertTimer: number; attackTimer: number;
  attackRate: number; weapon: string; accuracy: number;
  detRange: number; atkRange: number;
  patrolTarget: { x: number; z: number }; patrolTimer: number;
  lastSeen: { x: number; z: number } | null;
  alive: boolean; radius: number; height: number;
  painTimer: number; deathTimer: number;
  strafeDir: number; strafeTimer: number;
  color: { r: number; g: number; b: number };
  id: number;
}

export interface Pickup {
  x: number; z: number; type: string; amount: number; id: number;
}

export interface GrenadeObj {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  type: string; fuse: number; duration: number;
  radius: number; damage: number;
  alive: boolean; active: boolean; activeTimer: number;
}

export interface SmokeZone { x: number; z: number; radius: number; timer: number; }
export interface FireZone { x: number; z: number; radius: number; timer: number; dps: number; }

export interface Decal { x: number; y: number; z: number; life: number; }

export interface SimPlayer {
  id: string; username: string; avatar: string;
  x: number; z: number; yaw: number;
  health: number; alive: boolean;
  kills: number; deaths: number; score: number;
  team: string; rank: string;
  ping: number; state: string;
}

export interface GameSession {
  id: string; map: string; mode: string;
  players: SimPlayer[];
  timeLeft: number; roundPhase: string;
  scoreT: number; scoreCT: number;
  maxRounds: number;
}

let _enemyId = 0;
let _pickupId = 0;

function lerpAngle(from: number, to: number, t: number): number {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return from + d * Math.min(t, 1);
}

export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  map!: MapData;
  player!: PlayerState;
  bullets: Bullet[] = [];
  particles: Particle[] = [];
  enemies: EnemyState[] = [];
  pickups: Pickup[] = [];
  grenades: GrenadeObj[] = [];
  smokeZones: SmokeZone[] = [];
  fireZones: FireZone[] = [];
  decals: Decal[] = [];
  simPlayers: SimPlayer[] = [];
  session: GameSession | null = null;
  keys: Record<string, boolean> = {};
  mouseDown = false; mouse2Down = false;
  mouseDX = 0; mouseDY = 0;
  ptrLocked = false;
  lastTime = 0; dt = 0;
  fps = 0; _frameCount = 0; _fpsTime = 0;
  gameActive = false;
  zBuffer!: Float32Array;
  settings: { sensitivity: number; fov: number; showFps: boolean; crosshairColor: string; crosshairSize: number; crosshairThickness: number; crosshairGap: number; showDot: boolean; invertY: boolean } = {
    sensitivity: 2.0, fov: 90, showFps: true,
    crosshairColor: '#00ff88', crosshairSize: 6,
    crosshairThickness: 1.5, crosshairGap: 5, showDot: true, invertY: false,
  };
  userProfile: PlayerProfile | null = null;
  onKill?: (data: { name: string; weapon: string; headshot: boolean }) => void;
  onDeath?: () => void;
  onRoundEnd?: (stats: Partial<PlayerProfile>) => void;
  _respawnClock = 0;
  _simUpdateClock = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  init(profile: PlayerProfile, mapIdx = 0, simPlayers: SimPlayer[] = [], session: GameSession | null = null) {
    this.userProfile = profile;
    this.map = generateMap(mapIdx);
    this.simPlayers = simPlayers;
    this.session = session;
    this.applySettings(profile.settings);
    this.initPlayer(profile);
    this.initAmmo();
    this.spawnEnemies();
    this.spawnPickups();
    this.setupInput();
    this.gameActive = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop.bind(this));
  }

  applySettings(s: PlayerProfile['settings']) {
    this.settings = {
      sensitivity: s.sensitivity,
      fov: s.fov,
      showFps: s.showFps,
      crosshairColor: s.crosshairColor,
      crosshairSize: s.crosshairSize,
      crosshairThickness: s.crosshairThickness,
      crosshairGap: s.crosshairGap,
      showDot: s.showDot,
      invertY: s.invertY,
    };
  }

  initPlayer(profile: PlayerProfile) {
    const spawn = this.map.spawnsCT[0];
    this.player = {
      x: spawn.x, y: 0, z: spawn.z,
      vx: 0, vy: 0, vz: 0,
      yaw: 0, pitch: 0,
      height: PHYSICS.playerHeight,
      eyeH: PHYSICS.playerHeight * PHYSICS.eyeRatio,
      onGround: false, crouching: false, sprinting: false,
      stamina: PHYSICS.staminaMax,
      health: 100, maxHealth: 100, armor: 0, helmet: false,
      money: 800,
      inventory: {
        primary: profile.loadout.primary || null,
        secondary: profile.loadout.secondary || 'glock',
        melee: 'knife',
        utilities: [profile.loadout.utility1, profile.loadout.utility2].filter(Boolean) as string[],
      },
      currentSlot: 1, prevSlot: 1,
      ammo: {}, reserveAmmo: {},
      reloading: false, reloadTimer: 0,
      fireTimer: 0,
      recoilPitch: 0, recoilYaw: 0, recoilPattern: 0,
      weaponBob: 0,
      weaponSway: { x: 0, y: 0 },
      headBob: 0,
      score: 0, kills: 0, deaths: 0, assists: 0,
      dmgFlash: 0, dmgDir: 0,
      flashAmount: 0,
      scoped: false,
      inspecting: false, inspectTimer: 0,
      alive: true,
      killFeed: [],
      hitmarkerTimer: 0, headshotHit: false,
      landingShock: 0,
      velocitySmooth: 0,
      _lmd: false,
      totalDamage: 0, totalShots: 0, totalHits: 0,
      xpGained: 0,
    };
  }

  initAmmo() {
    for (const [k, w] of Object.entries(WEAPON_DB)) {
      if (w.magSize) {
        this.player.ammo[k] = w.magSize;
        this.player.reserveAmmo[k] = w.maxAmmo;
      }
    }
  }

  spawnEnemies() {
    _enemyId = 0;
    this.enemies = [];
    for (const sp of this.map.enemySpawns) {
      if (gMap(this.map.walls, Math.floor(sp.x), Math.floor(sp.z)) === 0)
        this.enemies.push(this.makeEnemy(sp.x, sp.z, sp.type));
    }
  }

  makeEnemy(x: number, z: number, type: string): EnemyState {
    const isHeavy = type === 'heavy';
    const isRifle = type === 'rifle';
    return {
      x, y: 0, z, vx: 0, vz: 0,
      yaw: Math.random() * Math.PI * 2,
      type,
      health: isHeavy ? 160 : 100,
      maxHealth: isHeavy ? 160 : 100,
      armor: isHeavy ? 100 : (Math.random() < 0.5 ? 50 : 0),
      speed: isHeavy ? 2.4 : (isRifle ? 3.6 : 4.0),
      state: 'patrol',
      alertTimer: 0, attackTimer: 0,
      attackRate: isRifle ? 0.11 : (isHeavy ? 0.7 : 0.22),
      weapon: isRifle ? 'ak47' : (isHeavy ? 'nova' : 'glock'),
      accuracy: isRifle ? 0.075 : (isHeavy ? 0.08 : 0.14),
      detRange: isRifle ? 30 : 22,
      atkRange: isHeavy ? 12 : (isRifle ? 28 : 20),
      patrolTarget: { x: x + (Math.random() - 0.5) * 14, z: z + (Math.random() - 0.5) * 14 },
      patrolTimer: Math.random() * 3,
      lastSeen: null,
      alive: true,
      radius: 0.42, height: 1.8,
      painTimer: 0, deathTimer: 0,
      strafeDir: Math.random() > 0.5 ? 1 : -1, strafeTimer: 1 + Math.random() * 2,
      color: isRifle ? { r: 70, g: 95, b: 70 } : isHeavy ? { r: 110, g: 65, b: 65 } : { r: 80, g: 80, b: 92 },
      id: _enemyId++,
    };
  }

  spawnPickups() {
    _pickupId = 0;
    this.pickups = [];
    for (const sp of this.map.pickupSpawns) {
      if (gMap(this.map.walls, Math.floor(sp.x), Math.floor(sp.z)) === 0) {
        this.pickups.push({ x: sp.x, z: sp.z, type: Math.random() < 0.6 ? 'health' : 'ammo', amount: 25, id: _pickupId++ });
      }
    }
  }

  setupInput() {
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onWheel = this.onWheel.bind(this);
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('mouseup', this.onMouseUp);
    document.addEventListener('wheel', this.onWheel, { passive: true });
    document.addEventListener('contextmenu', e => e.preventDefault());
  }

  destroy() {
    this.gameActive = false;
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mousedown', this.onMouseDown);
    document.removeEventListener('mouseup', this.onMouseUp);
    document.removeEventListener('wheel', this.onWheel);
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
  }

  onKeyDown(e: KeyboardEvent) {
    this.keys[e.code] = true;
    if (!this.player.alive) { if (e.code === 'KeyR') this.respawnPlayer(); return; }
    if (e.code === 'Digit1') this.switchSlot(0);
    if (e.code === 'Digit2') this.switchSlot(1);
    if (e.code === 'Digit3') this.switchSlot(2);
    if (e.code === 'Digit4') this.throwCurrentGrenade();
    if (e.code === 'KeyR') this.startReload();
    if (e.code === 'KeyQ') {
      const t = this.player.currentSlot;
      this.player.currentSlot = this.player.prevSlot;
      this.player.prevSlot = t;
      this.player.reloading = false;
    }
    if (e.code === 'KeyF') { this.player.inspecting = !this.player.inspecting; this.player.inspectTimer = 0; }
    if (e.code === 'KeyG') this.dropWeapon();
    if (e.code === 'KeyR') this.startReload();
    e.preventDefault();
  }

  onKeyUp(e: KeyboardEvent) { this.keys[e.code] = false; }

  onMouseMove(e: MouseEvent) {
    if (this.ptrLocked) {
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;
    }
  }

  onMouseDown(e: MouseEvent) {
    if (e.button === 0) this.mouseDown = true;
    if (e.button === 2) this.mouse2Down = true;
  }

  onMouseUp(e: MouseEvent) {
    if (e.button === 0) this.mouseDown = false;
    if (e.button === 2) this.mouse2Down = false;
  }

  onWheel(e: WheelEvent) {
    const dir = e.deltaY > 0 ? 1 : -1;
    this.player.currentSlot = (this.player.currentSlot + dir + 3) % 3;
    this.player.reloading = false;
  }

  switchSlot(slot: number) {
    this.player.prevSlot = this.player.currentSlot;
    this.player.currentSlot = slot;
    this.player.reloading = false;
    this.player.inspecting = false;
  }

  lockPointer() { this.canvas.requestPointerLock(); }

  getWeaponKey(): string | null {
    const { inventory, currentSlot } = this.player;
    const slots = ['primary', 'secondary', 'melee'] as const;
    if (currentSlot <= 2) return inventory[slots[currentSlot]];
    return null;
  }

  getWeapon(): WeaponDef | null {
    const k = this.getWeaponKey();
    return k ? WEAPON_DB[k] : null;
  }

  loop(timestamp: number) {
    if (!this.gameActive) return;
    this.dt = Math.min((timestamp - this.lastTime) / 1000, 0.035);
    this.lastTime = timestamp;
    this._frameCount++;
    this._fpsTime += this.dt;
    if (this._fpsTime >= 1) { this.fps = this._frameCount; this._frameCount = 0; this._fpsTime = 0; }
    this.update(this.dt);
    this.render();
    requestAnimationFrame(this.loop.bind(this));
  }

  update(dt: number) {
    if (this.player.alive) this.updatePlayer(dt);
    this.updateBullets(dt);
    this.updateEnemies(dt);
    this.updateGrenades(dt);
    this.updateParticles(dt);
    this.updateZones(dt);
    this.updateSimPlayers(dt);
    this._respawnClock += dt;
    if (this._respawnClock > 14) { this._respawnClock = 0; this.respawnEnemies(); }
    if (this.player.fireTimer > 0) this.player.fireTimer = Math.max(0, this.player.fireTimer - dt);
    this.player.recoilPattern = Math.max(0, this.player.recoilPattern - dt * 7);
  }

  updatePlayer(dt: number) {
    const p = this.player;
    const w = this.getWeapon();
    const wKey = this.getWeaponKey();

    // Timers
    p.dmgFlash = Math.max(0, p.dmgFlash - dt * 3.5);
    p.hitmarkerTimer = Math.max(0, p.hitmarkerTimer - dt);
    p.flashAmount = Math.max(0, p.flashAmount - dt * 0.75);
    p.landingShock = Math.max(0, p.landingShock - dt * 5.5);

    // Reload
    if (p.reloading && w && w.magSize && wKey) {
      p.reloadTimer -= dt;
      if (p.reloadTimer <= 0) {
        if (w.reloadPerShell) {
          if (p.ammo[wKey] < w.magSize && p.reserveAmmo[wKey] > 0) {
            p.ammo[wKey]++; p.reserveAmmo[wKey]--;
            if (p.ammo[wKey] < w.magSize && p.reserveAmmo[wKey] > 0) p.reloadTimer = w.reloadTime!;
            else p.reloading = false;
          } else p.reloading = false;
        } else {
          const needed = w.magSize - p.ammo[wKey]; const avail = Math.min(needed, p.reserveAmmo[wKey]);
          p.ammo[wKey] += avail; p.reserveAmmo[wKey] -= avail; p.reloading = false;
        }
      }
    }

    // Look
    const sens = this.settings.sensitivity * 0.0009;
    p.yaw += this.mouseDX * sens;
    const pitchDir = this.settings.invertY ? 1 : -1;
    p.pitch += this.mouseDY * sens * pitchDir;
    p.pitch = Math.max(-1.38, Math.min(1.38, p.pitch));
    this.mouseDX = 0; this.mouseDY = 0;

    // Recoil recovery
    if (w) {
      const rec = w.recoilRecovery;
      p.recoilPitch *= (1 - rec);
      p.recoilYaw *= (1 - rec);
    }

    // Scope
    p.scoped = !!(w && w.scoped && this.mouse2Down);
    if (p.scoped) p.sprinting = false;

    // Crouch
    p.crouching = !!(this.keys['KeyC'] || this.keys['ControlLeft']);
    p.height = p.crouching ? PHYSICS.playerCrouchHeight : PHYSICS.playerHeight;
    p.eyeH = p.height * PHYSICS.eyeRatio;

    // Sprint & stamina
    const isMoving = !!(this.keys['KeyW'] || this.keys['KeyS'] || this.keys['KeyA'] || this.keys['KeyD']);
    p.sprinting = !!(this.keys['ShiftLeft'] && !p.crouching && p.stamina > 0 && p.onGround && isMoving && !p.scoped);
    if (p.sprinting) { p.stamina = Math.max(0, p.stamina - PHYSICS.staminaDrain * dt); if (p.stamina <= 0) p.sprinting = false; }
    else p.stamina = Math.min(PHYSICS.staminaMax, p.stamina + PHYSICS.staminaRegen * dt);

    // Speed
    let maxSpd = p.crouching ? PHYSICS.maxCrouchSpeed : p.sprinting ? PHYSICS.maxSprintSpeed : PHYSICS.maxWalkSpeed;
    if (w) maxSpd *= Math.max(0.72, 1 - w.weight * 0.022);
    if (p.scoped) maxSpd *= 0.35;

    // Move direction
    let mx = 0, mz = 0;
    if (this.keys['KeyW']) { mx += Math.cos(p.yaw); mz += Math.sin(p.yaw); }
    if (this.keys['KeyS']) { mx -= Math.cos(p.yaw); mz -= Math.sin(p.yaw); }
    if (this.keys['KeyA']) { mx += Math.cos(p.yaw - Math.PI / 2); mz += Math.sin(p.yaw - Math.PI / 2); }
    if (this.keys['KeyD']) { mx += Math.cos(p.yaw + Math.PI / 2); mz += Math.sin(p.yaw + Math.PI / 2); }
    const mm = Math.sqrt(mx * mx + mz * mz);
    if (mm > 0) { mx /= mm; mz /= mm; }

    const accel = p.onGround ? (p.sprinting ? PHYSICS.sprintAccel : p.crouching ? PHYSICS.crouchAccel : PHYSICS.walkAccel) : 9;
    p.vx += mx * accel * dt; p.vz += mz * accel * dt;

    const fric = Math.pow(1 - (p.onGround ? PHYSICS.frictionGround : PHYSICS.frictionAir), dt * 60);
    p.vx *= fric; p.vz *= fric;

    const hSpd = Math.sqrt(p.vx ** 2 + p.vz ** 2);
    if (hSpd > maxSpd) { p.vx = (p.vx / hSpd) * maxSpd; p.vz = (p.vz / hSpd) * maxSpd; }
    p.velocitySmooth += (hSpd - p.velocitySmooth) * dt * 10;

    // Jump
    if (this.keys['Space'] && p.onGround) { p.vy = PHYSICS.jumpImpulse; p.onGround = false; }

    // Gravity
    if (!p.onGround) p.vy -= PHYSICS.gravity * dt;

    // Collision
    const nx = p.x + p.vx * dt, nz = p.z + p.vz * dt, ny = p.y + p.vy * dt;
    if (!this.pCollides(nx, p.z)) p.x = nx; else p.vx = 0;
    if (!this.pCollides(p.x, nz)) p.z = nz; else p.vz = 0;
    if (ny <= 0) {
      if (!p.onGround && p.vy < -3.5) p.landingShock = Math.min(1, Math.abs(p.vy) / 9);
      p.y = 0; p.vy = 0; p.onGround = true;
    } else { p.y = ny; p.onGround = false; }

    p.x = Math.max(1.5, Math.min(MAP_W - 1.5, p.x));
    p.z = Math.max(1.5, Math.min(MAP_W - 1.5, p.z));

    // Bob
    if (hSpd > 0.5 && p.onGround) p.weaponBob += hSpd * dt * (p.sprinting ? 13 : 8.5);
    else p.weaponBob += dt * 1.8;
    p.headBob = (hSpd > 0.5 && p.onGround) ? Math.sin(p.weaponBob) * 0.013 * (p.sprinting ? 2.5 : 1) : p.headBob * 0.92;
    p.weaponSway.x += (Math.sin(performance.now() * 0.00075) * 2.2 - p.weaponSway.x) * dt * 3;
    p.weaponSway.y += (Math.cos(performance.now() * 0.0011) * 1.6 - p.weaponSway.y) * dt * 3;

    // Inspect timer
    if (p.inspecting) { p.inspectTimer += dt; if (p.inspectTimer > 3.2) { p.inspecting = false; p.inspectTimer = 0; } }

    // Shoot
    if (this.mouseDown && p.fireTimer <= 0 && !p.reloading && w && w.type !== 'melee' && wKey) {
      if (p.ammo[wKey] > 0) {
        if (w.automatic || !p._lmd) { this.fireWeapon(w, wKey); p._lmd = true; }
      } else this.startReload();
    }
    if (this.mouseDown && w && w.type === 'melee' && p.fireTimer <= 0) {
      this.meleeAttack(w); p.fireTimer = w.attackRate || 0.5; p._lmd = true;
    }
    if (!this.mouseDown) p._lmd = false;

    // Pickups
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pk = this.pickups[i];
      if ((p.x - pk.x) ** 2 + (p.z - pk.z) ** 2 < 1.8) {
        if (pk.type === 'health' && p.health < p.maxHealth) { p.health = Math.min(p.maxHealth, p.health + pk.amount); this.pickups.splice(i, 1); }
        else if (pk.type === 'ammo' && wKey && WEAPON_DB[wKey]?.magSize) { p.reserveAmmo[wKey] = Math.min(WEAPON_DB[wKey].maxAmmo, (p.reserveAmmo[wKey] || 0) + pk.amount); this.pickups.splice(i, 1); }
      }
    }

    // Fire damage
    for (const fz of this.fireZones) {
      if (Math.sqrt((p.x - fz.x) ** 2 + (p.z - fz.z) ** 2) < fz.radius)
        this.damagePlayer(fz.dps * dt, Math.atan2(fz.z - p.z, fz.x - p.x));
    }

    // Kill feed cleanup
    for (let i = p.killFeed.length - 1; i >= 0; i--) {
      p.killFeed[i].time -= dt;
      if (p.killFeed[i].time <= 0) p.killFeed.splice(i, 1);
    }
  }

  pCollides(x: number, z: number): boolean {
    const mx = Math.floor(x), mz = Math.floor(z);
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      const cx = mx + dx, cz = mz + dz;
      if (gMap(this.map.walls, cx, cz) > 0 && this.player.y < gHeight(this.map.heights, cx, cz)) {
        const clx = Math.max(cx, Math.min(cx + 1, x));
        const clz = Math.max(cz, Math.min(cz + 1, z));
        if ((x - clx) ** 2 + (z - clz) ** 2 < PHYSICS.playerRadius ** 2) return true;
      }
    }
    return false;
  }

  fireWeapon(w: WeaponDef, wKey: string) {
    const p = this.player;
    p.ammo[wKey]--; p.fireTimer = w.fireRate; p.inspecting = false;
    p.totalShots++;
    let spread = w.spread;
    const hSpd = Math.sqrt(p.vx ** 2 + p.vz ** 2);
    if (p.sprinting) spread *= w.sprintSpreadMul;
    else if (hSpd > 1.2) spread *= w.moveSpreadMul;
    if (!p.onGround) spread *= 2.8;
    if (p.crouching) spread *= 0.6;
    if (p.scoped) spread *= 0.12;
    p.recoilPattern++;
    const patMod = Math.min(p.recoilPattern * 0.075, 1.6);
    const pellets = w.pellets || 1;
    for (let i = 0; i < pellets; i++) {
      const sx = (Math.random() - 0.5) * spread + p.recoilYaw;
      const sy = (Math.random() - 0.5) * spread + p.recoilPitch;
      const pt = p.pitch + sy, yw = p.yaw + sx;
      const dx = Math.cos(yw) * Math.cos(pt), dy = Math.sin(pt), dz = Math.sin(yw) * Math.cos(pt);
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      this.spawnBullet(
        p.x + Math.cos(p.yaw) * 0.3, p.y + p.eyeH - 0.1, p.z + Math.sin(p.yaw) * 0.3,
        dx / len, dy / len, dz / len, wKey, 'player'
      );
    }
    const rv = w.recoilV * (0.75 + Math.random() * 0.5) * (1 + patMod * 0.28);
    p.recoilPitch += rv; p.recoilYaw += (Math.random() - 0.5) * w.recoilH * (1 + patMod * 0.22);
    p.pitch += rv * 0.35;
    // Alert enemies
    const alertR = w.silenced ? 12 : 38;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const ed = Math.sqrt((e.x - p.x) ** 2 + (e.z - p.z) ** 2);
      if (ed < alertR) { if (e.state === 'patrol') { e.state = 'alert'; e.alertTimer = 0.15; } e.lastSeen = { x: p.x, z: p.z }; }
    }
    this.spawnParticle(p.x + Math.cos(p.yaw) * 0.8, p.y + p.eyeH - 0.1, p.z + Math.sin(p.yaw) * 0.8, { r: 255, g: 210, b: 80 }, 0.045, 0);
  }

  meleeAttack(w: WeaponDef) {
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dx = e.x - this.player.x, dz = e.z - this.player.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < (w.range || 2.5)) {
        const facingDiff = lerpAngle(e.yaw, Math.atan2(dz, dx), 1) - e.yaw;
        const backstab = Math.abs(facingDiff) < Math.PI / 3.5;
        const dmg = backstab ? (w.backstabDmg || 150) : w.damage;
        this.enemyTakeDamage(e, dmg, 0);
        this.player.hitmarkerTimer = 0.18; this.player.headshotHit = backstab;
      }
    }
  }

  spawnBullet(x: number, y: number, z: number, dx: number, dy: number, dz: number, wKey: string, owner: string) {
    const w = WEAPON_DB[wKey];
    if (!w || !w.bulletSpeed) return;
    const spd = w.bulletSpeed;
    this.bullets.push({
      x, y, z, vx: dx * spd, vy: dy * spd, vz: dz * spd,
      wKey, damage: w.damage, mass: w.bulletMass,
      diam: w.bulletDiam, area: Math.PI * (w.bulletDiam / 2) ** 2,
      dragCd: w.dragCoeff, pen: w.penetration, hsMul: w.headshotMul,
      alive: true, life: 0, maxLife: 3.5, owner, trail: [],
    });
  }

  updateBullets(dt: number) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      if (!b.alive) { this.bullets.splice(i, 1); continue; }
      b.life += dt;
      if (b.life > b.maxLife) { b.alive = false; this.bullets.splice(i, 1); continue; }

      const speed = Math.sqrt(b.vx ** 2 + b.vy ** 2 + b.vz ** 2);
      if (speed < 8) { b.alive = false; this.bullets.splice(i, 1); continue; }

      const dragF = 0.5 * 1.225 * speed * speed * b.dragCd * b.area;
      const dragA = dragF / b.mass;
      b.vx -= (b.vx / speed) * dragA * dt;
      b.vy -= (b.vy / speed) * dragA * dt;
      b.vz -= (b.vz / speed) * dragA * dt;
      b.vy -= PHYSICS.gravity * dt;

      const subSteps = Math.max(1, Math.ceil(speed * dt / 0.35));
      const subDt = dt / subSteps;
      let hit = false;

      for (let s = 0; s < subSteps && !hit; s++) {
        const nx = b.x + b.vx * subDt, ny = b.y + b.vy * subDt, nz = b.z + b.vz * subDt;
        const imx = Math.floor(nx), imz = Math.floor(nz);
        if (imx < 0 || imx >= MAP_W || imz < 0 || imz >= MAP_W) { b.alive = false; hit = true; break; }
        if (gMap(this.map.walls, imx, imz) > 0 && ny <= gHeight(this.map.heights, imx, imz) && ny >= 0) {
          b.alive = false; hit = true;
          this.spawnImpact(nx, ny, nz, gMap(this.map.walls, imx, imz));
          break;
        }
        if (ny <= 0) { b.alive = false; hit = true; this.spawnImpact(nx, 0.02, nz, 0); break; }

        if (b.owner === 'player') {
          for (const e of this.enemies) {
            if (!e.alive) continue;
            const edx = nx - e.x, edz = nz - e.z;
            if (Math.sqrt(edx * edx + edz * edz) < e.radius && ny >= 0 && ny <= e.height) {
              const curSpd = Math.sqrt(b.vx ** 2 + b.vy ** 2 + b.vz ** 2);
              const eRatio = (curSpd / WEAPON_DB[b.wKey].bulletSpeed) ** 2;
              const hs = ny > e.height * 0.80;
              let dmg = b.damage * eRatio * (hs ? b.hsMul : 1);
              if (e.armor > 0) { const abs = Math.min(dmg * 0.5, e.armor); e.armor -= abs; dmg -= abs * 0.65; }
              this.enemyTakeDamage(e, Math.max(1, dmg), Math.atan2(b.vz, b.vx));
              this.player.hitmarkerTimer = 0.16; this.player.headshotHit = hs;
              this.player.totalHits++; this.player.totalDamage += dmg;
              if (hs) this.player.score += 25;
              for (let pi = 0; pi < 5; pi++) this.spawnParticle(nx, ny, nz, { r: 210, g: 25, b: 25 }, 0.42, 2.8);
              b.alive = false; hit = true; break;
            }
          }
        } else {
          const pdx = nx - this.player.x, pdz = nz - this.player.z;
          if (Math.sqrt(pdx * pdx + pdz * pdz) < PHYSICS.playerRadius && ny >= this.player.y && ny <= this.player.y + this.player.height) {
            const curSpd = Math.sqrt(b.vx ** 2 + b.vy ** 2 + b.vz ** 2);
            const eRatio = (curSpd / WEAPON_DB[b.wKey].bulletSpeed) ** 2;
            const hs = ny > this.player.y + this.player.height * 0.80;
            let dmg = b.damage * eRatio * (hs ? b.hsMul : 1);
            if (hs && this.player.helmet) dmg *= 0.48;
            if (this.player.armor > 0) { const abs = Math.min(dmg * 0.55, this.player.armor); this.player.armor -= abs; dmg -= abs * 0.62; }
            this.damagePlayer(Math.max(1, dmg), Math.atan2(b.vz, b.vx));
            b.alive = false; hit = true;
          }
        }
        if (!hit) { b.x = nx; b.y = ny; b.z = nz; }
      }
      if (b.trail.length < 6 && !hit) b.trail.push({ x: b.x, y: b.y, z: b.z });
      if (b.trail.length > 6) b.trail.shift();
      if (!b.alive) this.bullets.splice(i, 1);
    }
  }

  spawnImpact(x: number, y: number, z: number, wt: number) {
    const cols: Record<number, { r: number; g: number; b: number }> = {
      0: { r: 145, g: 125, b: 95 }, 1: { r: 188, g: 188, b: 192 },
      2: { r: 172, g: 100, b: 72 }, 3: { r: 188, g: 192, b: 208 }, 4: { r: 152, g: 112, b: 58 },
    };
    const col = cols[wt] || cols[0];
    for (let i = 0; i < 4; i++) this.spawnParticle(x, y, z, col, 0.28 + Math.random() * 0.35, 2.2);
  }

  spawnParticle(x: number, y: number, z: number, color: { r: number; g: number; b: number }, life: number, speed: number) {
    if (this.particles.length > 450) return;
    this.particles.push({
      x, y, z,
      vx: (Math.random() - 0.5) * speed, vy: Math.random() * speed * 0.6 + 0.4, vz: (Math.random() - 0.5) * speed,
      color, life, maxLife: life, size: 1.5 + Math.random() * 2.2,
    });
  }

  updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.vy -= PHYSICS.gravity * dt; p.vx *= 0.97; p.vz *= 0.97;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.y < 0) { p.y = 0; p.vy = 0; p.vx *= 0.4; p.vz *= 0.4; }
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  enemyTakeDamage(e: EnemyState, amount: number, fromAngle: number) {
    e.health -= amount; e.painTimer = 0.22;
    if (e.state === 'patrol') { e.state = 'alert'; e.alertTimer = 0.12; }
    if (e.health <= 0) {
      e.alive = false; e.deathTimer = 0;
      this.player.kills++; this.player.score += 300; this.player.money = Math.min(this.player.money + 300, 16000);
      this.player.xpGained += 120;
      const wKey = this.getWeaponKey() || 'glock';
      this.player.killFeed.unshift({ name: e.type.toUpperCase(), time: 4.5, headshot: amount > e.maxHealth * 0.55, weapon: wKey });
      if (this.player.killFeed.length > 5) this.player.killFeed.pop();
      this.onKill?.({ name: e.type.toUpperCase(), weapon: wKey, headshot: amount > e.maxHealth * 0.55 });
      for (let i = 0; i < 12; i++) this.spawnParticle(e.x, e.height * 0.5, e.z, { r: 180, g: 25, b: 25 }, 0.65, 3.2);
      if (Math.random() < 0.38) this.pickups.push({ x: e.x, z: e.z, type: Math.random() < 0.42 ? 'health' : 'ammo', amount: 28, id: _pickupId++ });
    }
  }

  damagePlayer(amount: number, fromAngle: number) {
    this.player.health = Math.max(0, this.player.health - amount);
    this.player.dmgFlash = 1; this.player.dmgDir = fromAngle;
    if (this.player.health <= 0) {
      this.player.alive = false; this.player.deaths++;
      this.onDeath?.();
    }
  }

  updateEnemies(dt: number) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (!e.alive) { e.deathTimer += dt; if (e.deathTimer > 14) this.enemies.splice(i, 1); continue; }
      e.painTimer = Math.max(0, e.painTimer - dt);
      e.attackTimer = Math.max(0, e.attackTimer - dt);
      e.strafeTimer -= dt;
      if (e.strafeTimer <= 0) { e.strafeDir *= -1; e.strafeTimer = 1.2 + Math.random() * 2.5; }

      const dx = this.player.x - e.x, dz = this.player.z - e.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const atp = Math.atan2(dz, dx);
      const canSee = this.losCheck(e, dist, atp) && this.player.alive;

      switch (e.state) {
        case 'patrol': {
          e.patrolTimer -= dt;
          if (e.patrolTimer <= 0) {
            e.patrolTarget = { x: Math.max(2, Math.min(MAP_W - 2, e.x + (Math.random() - 0.5) * 16)), z: Math.max(2, Math.min(MAP_W - 2, e.z + (Math.random() - 0.5) * 16)) };
            e.patrolTimer = 3.5 + Math.random() * 4.5;
          }
          const pdx = e.patrolTarget.x - e.x, pdz = e.patrolTarget.z - e.z;
          const pd = Math.sqrt(pdx * pdx + pdz * pdz);
          if (pd > 0.6) { e.yaw = lerpAngle(e.yaw, Math.atan2(pdz, pdx), 2 * dt); this.enemyMove(e, e.patrolTarget.x, e.patrolTarget.z, dt, 0.45); }
          if (canSee && dist < e.detRange) { e.state = 'alert'; e.alertTimer = 0.28 + Math.random() * 0.3; }
          break;
        }
        case 'alert':
          e.alertTimer -= dt; e.yaw = lerpAngle(e.yaw, atp, 4.5 * dt);
          if (e.alertTimer <= 0) e.state = 'chase';
          break;
        case 'chase':
          if (canSee) {
            e.lastSeen = { x: this.player.x, z: this.player.z };
            e.yaw = lerpAngle(e.yaw, atp, 6.5 * dt);
            if (dist < e.atkRange) e.state = 'attack'; else this.enemyMove(e, this.player.x, this.player.z, dt);
          } else if (e.lastSeen) {
            this.enemyMove(e, e.lastSeen.x, e.lastSeen.z, dt);
            if (Math.sqrt((e.x - e.lastSeen.x) ** 2 + (e.z - e.lastSeen.z) ** 2) < 1.6) { e.lastSeen = null; e.state = 'patrol'; }
          } else e.state = 'patrol';
          break;
        case 'attack':
          if (!canSee || !this.player.alive) { e.state = 'chase'; break; }
          e.yaw = lerpAngle(e.yaw, atp, 9 * dt);
          if (dist > e.atkRange * 1.35) { e.state = 'chase'; break; }
          this.enemyMoveDir(e, atp + Math.PI / 2 * e.strafeDir, e.speed * 0.38, dt);
          if (e.attackTimer <= 0) { this.enemyShoot(e, dist, atp); e.attackTimer = e.attackRate + Math.random() * 0.08; }
          break;
      }
      e.vx *= 0.86; e.vz *= 0.86;
      const enx = e.x + e.vx * dt, enz = e.z + e.vz * dt;
      if (!this.enemyCollides(e, enx, e.z)) e.x = enx;
      if (!this.enemyCollides(e, e.x, enz)) e.z = enz;
    }
  }

  losCheck(e: EnemyState, dist: number, angle: number): boolean {
    const r = castRay(this.map.walls, this.map.heights, e.x, e.z, angle);
    return r.dist >= dist - 0.6;
  }

  enemyMove(e: EnemyState, tx: number, tz: number, dt: number, mul = 1) {
    const dx = tx - e.x, dz = tz - e.z, d = Math.sqrt(dx * dx + dz * dz);
    if (d > 0.12) { e.vx += (dx / d) * e.speed * mul * dt * 13; e.vz += (dz / d) * e.speed * mul * dt * 13; }
    const s = Math.sqrt(e.vx ** 2 + e.vz ** 2);
    const ms = e.speed * mul;
    if (s > ms) { e.vx = (e.vx / s) * ms; e.vz = (e.vz / s) * ms; }
  }

  enemyMoveDir(e: EnemyState, angle: number, spd: number, dt: number) {
    e.vx += Math.cos(angle) * spd * dt * 13; e.vz += Math.sin(angle) * spd * dt * 13;
    const s = Math.sqrt(e.vx ** 2 + e.vz ** 2);
    if (s > spd) { e.vx = (e.vx / s) * spd; e.vz = (e.vz / s) * spd; }
  }

  enemyCollides(e: EnemyState, x: number, z: number): boolean {
    const mx = Math.floor(x), mz = Math.floor(z);
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      const cx = mx + dx, cz = mz + dz;
      if (gMap(this.map.walls, cx, cz) > 0) {
        const clx = Math.max(cx, Math.min(cx + 1, x)), clz = Math.max(cz, Math.min(cz + 1, z));
        if ((x - clx) ** 2 + (z - clz) ** 2 < e.radius ** 2) return true;
      }
    }
    return false;
  }

  enemyShoot(e: EnemyState, dist: number, angle: number) {
    const spread = e.accuracy * (1 + dist / e.atkRange * 0.28);
    const dy = (this.player.y + this.player.height * 0.58 - e.height * 0.7) / dist;
    const bx = e.x + Math.cos(e.yaw) * 0.5, bz = e.z + Math.sin(e.yaw) * 0.5, by = e.height * 0.7;
    const a = angle + (Math.random() - 0.5) * spread;
    const sdx = Math.cos(a), sdz = Math.sin(a), sdy = dy + (Math.random() - 0.5) * spread * 0.45;
    const len = Math.sqrt(sdx * sdx + sdy * sdy + sdz * sdz);
    this.spawnBullet(bx, by, bz, sdx / len, sdy / len, sdz / len, e.weapon, 'enemy');
    this.spawnParticle(bx, by, bz, { r: 255, g: 205, b: 55 }, 0.055, 0);
  }

  updateGrenades(dt: number) {
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const g = this.grenades[i];
      if (!g.alive) { this.grenades.splice(i, 1); continue; }
      if (!g.active) {
        g.vy -= PHYSICS.gravity * dt; g.vx *= 0.995; g.vz *= 0.995;
        g.x += g.vx * dt; g.y += g.vy * dt; g.z += g.vz * dt;
        if (g.y <= 0.14) { g.y = 0.14; g.vy = -g.vy * 0.38; g.vx *= 0.68; g.vz *= 0.68; if (Math.abs(g.vy) < 0.4) g.vy = 0; }
        if (gMap(this.map.walls, Math.floor(g.x), Math.floor(g.z)) > 0) { g.vx = -g.vx * 0.38; g.vz = -g.vz * 0.38; }
        g.fuse -= dt;
        if (g.fuse <= 0) { g.active = true; this.activateGrenade(g); }
      } else {
        g.activeTimer += dt;
        if (g.type !== 'molotov' && g.type !== 'smoke') g.alive = false;
        else if (g.activeTimer >= g.duration) g.alive = false;
      }
    }
  }

  activateGrenade(g: GrenadeObj) {
    if (g.type === 'frag') {
      for (const e of this.enemies) { if (!e.alive) continue; const d = Math.sqrt((e.x - g.x) ** 2 + (e.z - g.z) ** 2); if (d < g.radius) this.enemyTakeDamage(e, g.damage * (1 - d / g.radius), 0); }
      const pd = Math.sqrt((this.player.x - g.x) ** 2 + (this.player.z - g.z) ** 2);
      if (pd < g.radius) this.damagePlayer(g.damage * (1 - pd / g.radius) * 0.72, 0);
      for (let i = 0; i < 28; i++) this.spawnParticle(g.x, 0.5, g.z, { r: 255, g: 140 + Math.floor(Math.random() * 100), b: 25 }, 0.5 + Math.random(), 5.5);
    } else if (g.type === 'flash') {
      const pd = Math.sqrt((this.player.x - g.x) ** 2 + (this.player.z - g.z) ** 2);
      if (pd < g.radius) { const a = Math.atan2(g.z - this.player.z, g.x - this.player.x); const fd = Math.abs(lerpAngle(this.player.yaw, a, 1) - this.player.yaw); this.player.flashAmount = fd < Math.PI / 2 ? Math.min(3, 3 * (1 - pd / g.radius)) : Math.min(1.5, 1.5 * (1 - pd / g.radius)); }
      for (let i = 0; i < 12; i++) this.spawnParticle(g.x, 1, g.z, { r: 255, g: 255, b: 255 }, 0.28, 4);
    } else if (g.type === 'smoke') {
      this.smokeZones.push({ x: g.x, z: g.z, radius: g.radius, timer: g.duration });
    } else if (g.type === 'molotov') {
      this.fireZones.push({ x: g.x, z: g.z, radius: g.radius, timer: g.duration, dps: g.damage });
    }
  }

  throwCurrentGrenade() {
    const p = this.player;
    if (p.inventory.utilities.length === 0) return;
    const type = p.inventory.utilities[0];
    const u = UTILITY_DB[type]; if (!u) return;
    const eyeY = p.y + p.eyeH;
    const dx = Math.cos(p.yaw) * Math.cos(p.pitch), dy = Math.sin(p.pitch), dz = Math.sin(p.yaw) * Math.cos(p.pitch);
    this.grenades.push({ x: p.x + dx * 0.5, y: eyeY - 0.2, z: p.z + dz * 0.5, vx: dx * u.throwSpeed + p.vx, vy: dy * u.throwSpeed + 2.5, vz: dz * u.throwSpeed + p.vz, type, fuse: u.fuseTime, duration: u.duration, radius: u.radius, damage: u.damage || 0, alive: true, active: false, activeTimer: 0 });
    p.inventory.utilities.splice(0, 1);
  }

  updateZones(dt: number) {
    for (let i = this.smokeZones.length - 1; i >= 0; i--) { this.smokeZones[i].timer -= dt; if (this.smokeZones[i].timer <= 0) this.smokeZones.splice(i, 1); }
    for (let i = this.fireZones.length - 1; i >= 0; i--) {
      this.fireZones[i].timer -= dt;
      for (const e of this.enemies) { if (!e.alive) continue; if (Math.sqrt((e.x - this.fireZones[i].x) ** 2 + (e.z - this.fireZones[i].z) ** 2) < this.fireZones[i].radius) this.enemyTakeDamage(e, this.fireZones[i].dps * dt, 0); }
      if (this.fireZones[i].timer <= 0) this.fireZones.splice(i, 1);
    }
  }

  updateSimPlayers(dt: number) {
    this._simUpdateClock += dt;
    if (this._simUpdateClock < 0.08) return;
    this._simUpdateClock = 0;
    for (const sp of this.simPlayers) {
      if (!sp.alive) continue;
      sp.x += (Math.random() - 0.5) * 0.3;
      sp.z += (Math.random() - 0.5) * 0.3;
      sp.x = Math.max(2, Math.min(MAP_W - 2, sp.x));
      sp.z = Math.max(2, Math.min(MAP_W - 2, sp.z));
      sp.yaw += (Math.random() - 0.5) * 0.1;
    }
  }

  startReload() {
    const wKey = this.getWeaponKey(), w = this.getWeapon();
    if (!w || !w.magSize || this.player.reloading || !wKey) return;
    if (this.player.ammo[wKey] >= w.magSize || (this.player.reserveAmmo[wKey] || 0) <= 0) return;
    this.player.reloading = true; this.player.reloadTimer = w.reloadTime!; this.player.recoilPattern = 0;
  }

  dropWeapon() {
    const p = this.player;
    const slots = ['primary', 'secondary', 'melee'] as const;
    if (p.currentSlot <= 1) { const slot = slots[p.currentSlot]; if (p.inventory[slot] && slot !== 'melee' && p.currentSlot !== 2) { p.inventory[slot] = null; if (p.currentSlot === 0) p.currentSlot = 1; } }
  }

  respawnPlayer() {
    const p = this.player;
    const spawn = this.map.spawnsCT[Math.floor(Math.random() * this.map.spawnsCT.length)];
    p.x = spawn.x; p.y = 0; p.z = spawn.z; p.vx = 0; p.vy = 0; p.vz = 0;
    p.alive = true; p.health = p.maxHealth; p.armor = 0; p.helmet = false;
    p.reloading = false; p.flashAmount = 0; p.recoilPitch = 0; p.recoilYaw = 0;
  }

  respawnEnemies() {
    const alive = this.enemies.filter(e => e.alive).length;
    if (alive < 10) {
      for (let i = 0; i < 5; i++) {
        const x = 6 + Math.random() * (MAP_W - 12), z = 6 + Math.random() * (MAP_W - 12);
        if (gMap(this.map.walls, Math.floor(x), Math.floor(z)) === 0 && Math.sqrt((x - this.player.x) ** 2 + (z - this.player.z) ** 2) > 20)
          this.enemies.push(this.makeEnemy(x, z, ['pistol', 'rifle', 'rifle', 'heavy'][Math.floor(Math.random() * 4)]));
      }
    }
  }

  buyItem(item: string) {
    const p = this.player;
    if (item === 'kevlar') { if (p.money >= 650 && p.armor < 100) { p.money -= 650; p.armor = 100; } }
    else if (item === 'kevhelm') { if (p.money >= 1000) { p.money -= 1000; p.armor = 100; p.helmet = true; } }
    else if (UTILITY_DB[item]) { const u = UTILITY_DB[item]; const ct = p.inventory.utilities.filter(x => x === item).length; if (ct < u.maxStack && p.money >= u.price) { p.money -= u.price; p.inventory.utilities.push(item); } }
    else if (WEAPON_DB[item]) { const w = WEAPON_DB[item]; if (p.money >= w.price) { p.money -= w.price; if (w.type === 'pistol') p.inventory.secondary = item; else p.inventory.primary = item; p.ammo[item] = w.magSize; p.reserveAmmo[item] = w.maxAmmo; } }
  }

  // ============================================================
  // RENDER
  // ============================================================
  render() {
    const W = this.canvas.width, H = this.canvas.height;
    const p = this.player;
    const fov = (p.scoped ? this.settings.fov / (this.getWeapon()?.scopeZoom || 1) : this.settings.fov) * Math.PI / 180;
    const projScale = H / (2 * Math.tan(fov / 2));
    const eyeY = p.y + p.eyeH + p.headBob;
    this.zBuffer = new Float32Array(W);

    // Sky
    const skyG = this.ctx.createLinearGradient(0, 0, 0, H * 0.5);
    skyG.addColorStop(0, '#0a1520'); skyG.addColorStop(0.4, '#152030'); skyG.addColorStop(0.75, '#254558'); skyG.addColorStop(1, '#3a6878');
    this.ctx.fillStyle = skyG; this.ctx.fillRect(0, 0, W, H * 0.55);

    // Sun disc
    const sunX = W * 0.72, sunY = H * 0.12;
    const sunG = this.ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 55);
    sunG.addColorStop(0, 'rgba(255,235,160,0.9)'); sunG.addColorStop(0.4, 'rgba(255,200,80,0.4)'); sunG.addColorStop(1, 'rgba(255,140,20,0)');
    this.ctx.fillStyle = sunG; this.ctx.beginPath(); this.ctx.arc(sunX, sunY, 55, 0, Math.PI * 2); this.ctx.fill();

    // Clouds
    const t = performance.now();
    for (let i = 0; i < 9; i++) {
      const cx = ((i * 283 + t * 0.0028) % (W + 180)) - 90;
      const cy = 22 + (i * 41) % 70;
      const cw = 80 + (i % 3) * 45, ch = 14 + (i % 2) * 9;
      this.ctx.fillStyle = `rgba(180,200,225,0.05)`;
      this.ctx.beginPath(); this.ctx.ellipse(cx, cy, cw, ch, 0, 0, Math.PI * 2); this.ctx.fill();
    }

    // Floor
    const flG = this.ctx.createLinearGradient(0, H * 0.5, 0, H);
    flG.addColorStop(0, '#5a5242'); flG.addColorStop(0.3, '#46402e'); flG.addColorStop(1, '#1e1c12');
    this.ctx.fillStyle = flG; this.ctx.fillRect(0, H * 0.5, W, H * 0.5);

    // Raycasting
    const rayStep = Math.max(1, Math.floor(W / 1200));
    for (let col = 0; col < W; col += rayStep) {
      const sx = (2 * col / W) - 1;
      const ra = p.yaw + Math.atan(sx * Math.tan(fov / 2));
      const ray = castRay(this.map.walls, this.map.heights, p.x, p.z, ra);
      const perpD = ray.dist * Math.cos(ra - p.yaw);
      for (let ri = 0; ri < rayStep && col + ri < W; ri++) this.zBuffer[col + ri] = perpD;

      if (ray.wt > 0 && perpD < RENDER_DIST) {
        const wh = ray.wh;
        const topW = wh - eyeY, botW = 0 - eyeY;
        const pitchOffset = p.pitch * projScale;
        const topS = H / 2 - (topW / perpD) * projScale - pitchOffset;
        const botS = H / 2 - (botW / perpD) * projScale - pitchOffset;
        const wallH = botS - topS;
        const shade = Math.max(0.06, Math.min(1, 1 - perpD / RENDER_DIST));
        const sideShade = ray.side === 1 ? 0.68 : 1.0;
        const fs = shade * sideShade;
        const col2 = gColor(this.map.colors, ray.mx, ray.mz);

        // Texture
        const tx = ray.hx;
        const brickMod = wallH > 12 ? ((Math.floor(tx * 8) + Math.floor(eyeY)) % 2 === 0 ? 0.95 : 1.0) : 1.0;
        const edgeMod = (tx < 0.025 || tx > 0.975) ? 0.82 : 1.0;

        const r = Math.floor(col2.r * fs * brickMod * edgeMod);
        const g = Math.floor(col2.g * fs * brickMod * edgeMod);
        const b2 = Math.floor(col2.b * fs * brickMod * edgeMod);

        this.ctx.fillStyle = `rgb(${r},${g},${b2})`;
        this.ctx.fillRect(col, Math.floor(topS), rayStep, Math.ceil(wallH) + 1);

        // Top highlight
        if (wallH > 5) { this.ctx.fillStyle = `rgba(255,255,255,${fs * 0.07})`; this.ctx.fillRect(col, Math.floor(topS), rayStep, 2); }

        // Floor stripe (cheap)
        for (let y = Math.max(Math.floor(botS), Math.floor(H / 2)); y < H; y += 5) {
          const rd = (eyeY * projScale) / Math.max(0.01, y - H / 2 + p.pitch * projScale);
          if (rd > 0 && rd < RENDER_DIST * 0.55) {
            const fsh = Math.max(0.03, 1 - rd / (RENDER_DIST * 0.48)) * 0.52;
            const fx = p.x + Math.cos(ra) * rd, fz2 = p.z + Math.sin(ra) * rd;
            const ck = (Math.floor(fx * 2) + Math.floor(fz2 * 2)) % 2;
            const fv = ck ? 0.54 : 0.40;
            this.ctx.fillStyle = `rgb(${Math.floor(80 * fv * fsh)},${Math.floor(76 * fv * fsh)},${Math.floor(60 * fv * fsh)})`;
            this.ctx.fillRect(col, y, rayStep, 5);
          }
        }
      }
    }

    this.renderSmoke(W, H, projScale, eyeY, fov, p);
    this.renderFire(W, H, projScale, eyeY, fov, p);
    this.renderSprites(W, H, projScale, eyeY, fov, p);
    this.renderBullets(W, H, projScale, eyeY, fov, p);
    this.renderParticles(W, H, projScale, eyeY, fov, p);
    this.renderFirstPersonWeapon(W, H);
    this.renderHUD(W, H);
    this.renderEffects(W, H);
  }

  renderSmoke(W: number, H: number, projScale: number, eyeY: number, fov: number, p: PlayerState) {
    for (const sz of this.smokeZones) {
      const dx = sz.x - p.x, dz = sz.z - p.z, dist = Math.sqrt(dx * dx + dz * dz);
      if (dist >= RENDER_DIST) continue;
      let angle = Math.atan2(dz, dx) - p.yaw;
      while (angle > Math.PI) angle -= Math.PI * 2; while (angle < -Math.PI) angle += Math.PI * 2;
      if (Math.abs(angle) >= fov / 2 + 0.5) continue;
      const perpD = dist * Math.cos(angle); if (perpD <= 0.5) continue;
      const scX = W / 2 + Math.tan(angle) * projScale;
      const size = (sz.radius * 2 / perpD) * projScale;
      const alpha = Math.min(0.72, (1 - dist / RENDER_DIST) * 0.85);
      const t = performance.now() * 0.0004;
      const sg = this.ctx.createRadialGradient(scX + Math.sin(t) * 5, H / 2 + Math.cos(t * 0.7) * 3, 0, scX, H / 2, size);
      sg.addColorStop(0, `rgba(210,220,230,${alpha})`); sg.addColorStop(0.55, `rgba(190,200,215,${alpha * 0.55})`); sg.addColorStop(1, 'rgba(170,180,195,0)');
      this.ctx.fillStyle = sg; this.ctx.fillRect(scX - size, H / 2 - size, size * 2, size * 2);
    }
  }

  renderFire(W: number, H: number, projScale: number, eyeY: number, fov: number, p: PlayerState) {
    const t = performance.now();
    for (const fz of this.fireZones) {
      const dx = fz.x - p.x, dz = fz.z - p.z, dist = Math.sqrt(dx * dx + dz * dz);
      if (dist >= RENDER_DIST) continue;
      let angle = Math.atan2(dz, dx) - p.yaw;
      while (angle > Math.PI) angle -= Math.PI * 2; while (angle < -Math.PI) angle += Math.PI * 2;
      if (Math.abs(angle) >= fov / 2 + 0.5) continue;
      const perpD = dist * Math.cos(angle); if (perpD <= 0.5) continue;
      const scX = W / 2 + Math.tan(angle) * projScale;
      const size = (fz.radius * 2 / perpD) * projScale;
      const flicker = 0.72 + Math.sin(t * 0.012) * 0.28;
      const fg = this.ctx.createRadialGradient(scX, H / 2 + size * 0.28, 0, scX, H / 2, size);
      fg.addColorStop(0, `rgba(255,130,22,${0.52 * flicker})`); fg.addColorStop(0.5, `rgba(255,75,8,${0.3 * flicker})`); fg.addColorStop(1, 'rgba(200,35,0,0)');
      this.ctx.fillStyle = fg; this.ctx.fillRect(scX - size, H / 2 - size * 0.45, size * 2, size * 1.4);
    }
  }

  renderSprites(W: number, H: number, projScale: number, eyeY: number, fov: number, p: PlayerState) {
    type Sprite = { type: string; obj: EnemyState | Pickup | GrenadeObj | SimPlayer; dist: number; angle: number };
    const sprites: Sprite[] = [];

    for (const e of this.enemies) {
      const dx = e.x - p.x, dz = e.z - p.z, dist = Math.sqrt(dx * dx + dz * dz);
      if (dist >= RENDER_DIST || dist < 0.3) continue;
      let angle = Math.atan2(dz, dx) - p.yaw;
      while (angle > Math.PI) angle -= Math.PI * 2; while (angle < -Math.PI) angle += Math.PI * 2;
      if (Math.abs(angle) < fov / 2 + 0.5) sprites.push({ type: 'enemy', obj: e, dist, angle });
    }
    for (const pk of this.pickups) {
      const dx = pk.x - p.x, dz = pk.z - p.z, dist = Math.sqrt(dx * dx + dz * dz);
      if (dist >= RENDER_DIST || dist < 0.3) continue;
      let angle = Math.atan2(dz, dx) - p.yaw;
      while (angle > Math.PI) angle -= Math.PI * 2; while (angle < -Math.PI) angle += Math.PI * 2;
      if (Math.abs(angle) < fov / 2 + 0.4) sprites.push({ type: 'pickup', obj: pk, dist, angle });
    }
    for (const g of this.grenades) {
      if (!g.alive) continue;
      const dx = g.x - p.x, dz = g.z - p.z, dist = Math.sqrt(dx * dx + dz * dz);
      if (dist >= RENDER_DIST || dist < 0.3) continue;
      let angle = Math.atan2(dz, dx) - p.yaw;
      while (angle > Math.PI) angle -= Math.PI * 2; while (angle < -Math.PI) angle += Math.PI * 2;
      if (Math.abs(angle) < fov / 2 + 0.3) sprites.push({ type: 'grenade', obj: g as GrenadeObj, dist, angle });
    }
    for (const sp of this.simPlayers) {
      const dx = sp.x - p.x, dz = sp.z - p.z, dist = Math.sqrt(dx * dx + dz * dz);
      if (dist >= RENDER_DIST || dist < 0.3) continue;
      let angle = Math.atan2(dz, dx) - p.yaw;
      while (angle > Math.PI) angle -= Math.PI * 2; while (angle < -Math.PI) angle += Math.PI * 2;
      if (Math.abs(angle) < fov / 2 + 0.4) sprites.push({ type: 'simplayer', obj: sp, dist, angle });
    }

    sprites.sort((a, b) => b.dist - a.dist);

    for (const sp of sprites) {
      const perpD = sp.dist * Math.cos(sp.angle);
      if (perpD <= 0.1) continue;
      const scX = W / 2 + Math.tan(sp.angle) * projScale;
      const cc = Math.floor(scX);
      if (cc < 0 || cc >= W) continue;
      const zbIdx = Math.max(0, Math.min(W - 1, cc));

      if (sp.type === 'enemy') {
        const e = sp.obj as EnemyState;
        if (!e.alive && e.deathTimer > 10) continue;
        if (perpD >= this.zBuffer[zbIdx]) continue;
        const shade = Math.max(0.1, 1 - sp.dist / RENDER_DIST);
        const sh = e.alive ? e.height : 0.3;
        const topY = (sh - eyeY) / perpD * projScale;
        const botY = (0 - eyeY) / perpD * projScale;
        const pitchOff = p.pitch * projScale;
        const sTop = H / 2 - topY - pitchOff, sBot = H / 2 - botY - pitchOff;
        const sH = sBot - sTop, sW = (e.radius * 2.2 / perpD) * projScale;
        if (e.alive) {
          const pain = e.painTimer > 0;
          // Shadow
          this.ctx.fillStyle = `rgba(0,0,0,${shade * 0.28})`; this.ctx.beginPath(); this.ctx.ellipse(scX, sBot + 2, sW * 0.45, sW * 0.1, 0, 0, Math.PI * 2); this.ctx.fill();
          // Legs
          this.ctx.fillStyle = `rgb(${Math.floor(48 * shade)},${Math.floor(50 * shade)},${Math.floor(58 * shade)})`;
          this.ctx.fillRect(scX - sW * 0.25, sTop + sH * 0.68, sW * 0.22, sH * 0.32);
          this.ctx.fillRect(scX + sW * 0.04, sTop + sH * 0.68, sW * 0.22, sH * 0.32);
          // Body
          const bc = pain ? { r: Math.min(255, e.color.r + 160), g: Math.floor(e.color.g * 0.25), b: Math.floor(e.color.b * 0.25) } : e.color;
          this.ctx.fillStyle = `rgb(${Math.floor(bc.r * shade)},${Math.floor(bc.g * shade)},${Math.floor(bc.b * shade)})`;
          this.ctx.fillRect(scX - sW * 0.35, sTop + sH * 0.22, sW * 0.7, sH * 0.48);
          // Detail stripe
          this.ctx.fillStyle = `rgba(0,0,0,${shade * 0.18})`; this.ctx.fillRect(scX - sW * 0.2, sTop + sH * 0.26, sW * 0.4, sH * 0.12);
          // Arms
          this.ctx.fillStyle = `rgb(${Math.floor(bc.r * shade * 0.88)},${Math.floor(bc.g * shade * 0.88)},${Math.floor(bc.b * shade * 0.88)})`;
          this.ctx.fillRect(scX - sW * 0.5, sTop + sH * 0.24, sW * 0.16, sH * 0.3);
          this.ctx.fillRect(scX + sW * 0.34, sTop + sH * 0.24, sW * 0.16, sH * 0.3);
          // Head
          const headR = sW * 0.17;
          this.ctx.fillStyle = `rgb(${Math.floor(192 * shade)},${Math.floor(162 * shade)},${Math.floor(130 * shade)})`;
          this.ctx.beginPath(); this.ctx.arc(scX, sTop + sH * 0.12, headR, 0, Math.PI * 2); this.ctx.fill();
          // Helmet
          this.ctx.fillStyle = `rgb(${Math.floor(65 * shade)},${Math.floor(72 * shade)},${Math.floor(65 * shade)})`;
          this.ctx.beginPath(); this.ctx.arc(scX, sTop + sH * 0.10, headR * 1.12, -Math.PI, 0); this.ctx.fill();
          // Eyes
          this.ctx.fillStyle = `rgba(18,18,18,${shade})`;
          this.ctx.fillRect(scX - headR * 0.45, sTop + sH * 0.11, headR * 0.18, headR * 0.14);
          this.ctx.fillRect(scX + headR * 0.2, sTop + sH * 0.11, headR * 0.18, headR * 0.14);
          // Gun barrel
          this.ctx.fillStyle = `rgb(${Math.floor(32 * shade)},${Math.floor(32 * shade)},${Math.floor(36 * shade)})`;
          this.ctx.fillRect(scX + sW * 0.32, sTop + sH * 0.35, sW * 0.45, sH * 0.045);
          // HP bar
          if (e.health < e.maxHealth) {
            const bw = sW * 0.82, bx = scX - bw / 2, by = sTop - 9;
            this.ctx.fillStyle = 'rgba(0,0,0,0.62)'; this.ctx.fillRect(bx - 1, by - 1, bw + 2, 5);
            const hp = e.health / e.maxHealth;
            this.ctx.fillStyle = hp > 0.6 ? '#4fff4f' : hp > 0.3 ? '#ffcc00' : '#ff3333';
            this.ctx.fillRect(bx, by, bw * hp, 3);
          }
          // Heavy indicator
          if (e.type === 'heavy') { this.ctx.fillStyle = `rgba(255,72,72,${shade * 0.62})`; this.ctx.beginPath(); this.ctx.arc(scX, sTop - 14, 3.5, 0, Math.PI * 2); this.ctx.fill(); }
        } else {
          const alpha = shade * Math.max(0, 1 - e.deathTimer / 10);
          this.ctx.fillStyle = `rgba(${e.color.r},${e.color.g},${e.color.b},${alpha})`;
          this.ctx.fillRect(scX - sW * 0.6, sBot - sH * 0.1, sW * 1.2, sH * 0.1);
        }
      } else if (sp.type === 'pickup') {
        const pk = sp.obj as Pickup;
        if (perpD >= this.zBuffer[zbIdx]) continue;
        const size = (0.38 / perpD) * projScale;
        const bob = Math.sin(performance.now() * 0.004) * 0.12;
        const py = (0.5 + bob - eyeY) / perpD * projScale;
        const scY = H / 2 - py - p.pitch * projScale;
        const shade2 = Math.max(0.28, 1 - sp.dist / RENDER_DIST);
        const glowCol = pk.type === 'health' ? 'rgba(0,255,60,0.1)' : 'rgba(255,200,0,0.1)';
        const itemCol = pk.type === 'health' ? `rgba(48,255,80,${shade2 * 0.88})` : `rgba(255,215,48,${shade2 * 0.88})`;
        this.ctx.fillStyle = glowCol; this.ctx.beginPath(); this.ctx.arc(scX, scY, size * 2.8, 0, Math.PI * 2); this.ctx.fill();
        this.ctx.fillStyle = itemCol; this.ctx.beginPath(); this.ctx.arc(scX, scY, size, 0, Math.PI * 2); this.ctx.fill();
        this.ctx.fillStyle = '#fff'; this.ctx.font = `${Math.max(9, size * 0.9)}px Arial`; this.ctx.textAlign = 'center';
        this.ctx.fillText(pk.type === 'health' ? '+' : '⬟', scX, scY + size * 0.35);
      } else if (sp.type === 'grenade') {
        const g = sp.obj as GrenadeObj;
        if (perpD >= this.zBuffer[zbIdx]) continue;
        const size = (0.14 / perpD) * projScale;
        const py = (g.y - eyeY) / perpD * projScale;
        const scY = H / 2 - py - p.pitch * projScale;
        const gCol = g.type === 'frag' ? '#556' : g.type === 'smoke' ? '#8a8' : g.type === 'flash' ? '#dde' : '#c42';
        this.ctx.fillStyle = gCol; this.ctx.beginPath(); this.ctx.arc(scX, scY, Math.max(2, size), 0, Math.PI * 2); this.ctx.fill();
      } else if (sp.type === 'simplayer') {
        const simP = sp.obj as SimPlayer;
        if (perpD >= this.zBuffer[zbIdx]) continue;
        if (!simP.alive) continue;
        const shade = Math.max(0.1, 1 - sp.dist / RENDER_DIST);
        const sH2 = (1.8 / perpD) * projScale;
        const topY2 = (1.8 - eyeY) / perpD * projScale;
        const sTop2 = H / 2 - topY2 - p.pitch * projScale;
        const sW2 = (0.8 / perpD) * projScale;
        // Ally indicator
        this.ctx.fillStyle = `rgba(60,120,255,${shade * 0.85})`;
        this.ctx.fillRect(scX - sW2 * 0.35, sTop2 + sH2 * 0.2, sW2 * 0.7, sH2 * 0.6);
        this.ctx.fillRect(scX - sW2 * 0.15, sTop2, sW2 * 0.3, sH2 * 0.22);
        // Name tag
        this.ctx.fillStyle = `rgba(0,0,0,0.55)`; this.ctx.fillRect(scX - 22, sTop2 - 18, 44, 15);
        this.ctx.fillStyle = '#4a9fff'; this.ctx.font = `${Math.max(7, sW2 * 0.25)}px Arial`; this.ctx.textAlign = 'center';
        this.ctx.fillText(simP.username, scX, sTop2 - 7);
      }
    }
  }

  renderBullets(W: number, H: number, projScale: number, eyeY: number, fov: number, p: PlayerState) {
    for (const b of this.bullets) {
      if (!b.alive) continue;
      const dx = b.x - p.x, dz = b.z - p.z, dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > RENDER_DIST || dist < 0.5) continue;
      let angle = Math.atan2(dz, dx) - p.yaw;
      while (angle > Math.PI) angle -= Math.PI * 2; while (angle < -Math.PI) angle += Math.PI * 2;
      if (Math.abs(angle) >= fov / 2 + 0.12) continue;
      const perpD = dist * Math.cos(angle); if (perpD <= 0.1) continue;
      const bsX = W / 2 + Math.tan(angle) * projScale;
      const bsY = H / 2 - ((b.y - eyeY) / perpD) * projScale - p.pitch * projScale;
      const size = Math.max(1, 2.2 / perpD);
      this.ctx.fillStyle = 'rgba(255,245,175,0.82)'; this.ctx.beginPath(); this.ctx.arc(bsX, bsY, size, 0, Math.PI * 2); this.ctx.fill();
    }
  }

  renderParticles(W: number, H: number, projScale: number, eyeY: number, fov: number, p: PlayerState) {
    for (const pt of this.particles) {
      const dx = pt.x - p.x, dz = pt.z - p.z, dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > RENDER_DIST || dist < 0.3) continue;
      let angle = Math.atan2(dz, dx) - p.yaw;
      while (angle > Math.PI) angle -= Math.PI * 2; while (angle < -Math.PI) angle += Math.PI * 2;
      if (Math.abs(angle) >= fov / 2 + 0.12) continue;
      const perpD = dist * Math.cos(angle); if (perpD <= 0.1) continue;
      const psX = W / 2 + Math.tan(angle) * projScale;
      const psY = H / 2 - ((pt.y - eyeY) / perpD) * projScale - p.pitch * projScale;
      const alpha = pt.life / pt.maxLife;
      const size = Math.max(0.5, pt.size / perpD);
      this.ctx.fillStyle = `rgba(${pt.color.r},${pt.color.g},${pt.color.b},${alpha})`;
      this.ctx.beginPath(); this.ctx.arc(psX, psY, size, 0, Math.PI * 2); this.ctx.fill();
    }
  }

  renderFirstPersonWeapon(W: number, H: number) {
    const p = this.player;
    const w = this.getWeapon();
    if (!w || p.scoped) return;

    const bobX = Math.sin(p.weaponBob) * 5.5 * (p.sprinting ? 3 : 1);
    const bobY = Math.abs(Math.cos(p.weaponBob)) * 3.8 * (p.sprinting ? 3 : 1);
    const reloadOff = p.reloading && w.reloadTime ? Math.sin((1 - p.reloadTimer / w.reloadTime) * Math.PI) * 68 : 0;
    const sprintTilt = p.sprinting ? Math.sin(p.weaponBob * 0.5) * 14 : 0;
    const inspectAngle = p.inspecting ? Math.sin(p.inspectTimer * 2) * 28 : 0;
    const inspectOffX = p.inspecting ? Math.sin(p.inspectTimer * 2) * 48 : 0;

    const baseX = W * 0.62 + bobX + p.weaponSway.x + p.recoilYaw * 85 + inspectOffX;
    const baseY = H * 0.62 + bobY + p.weaponSway.y + p.recoilPitch * 175 + reloadOff + p.landingShock * 28;

    this.ctx.save();
    this.ctx.translate(baseX, baseY);
    this.ctx.rotate((sprintTilt + inspectAngle) * Math.PI / 180);

    const skinR = 195, skinG = 162, skinB = 128;

    if (w.type === 'melee') {
      this.ctx.fillStyle = `rgb(${skinR - 18},${skinG - 14},${skinB - 10})`; this.ctx.fillRect(-28, -18, 52, 78);
      this.ctx.fillStyle = '#3a3a3a'; this.ctx.fillRect(-28, 42, 52, 24);
      this.ctx.fillStyle = '#b0b6c2'; this.ctx.beginPath(); this.ctx.moveTo(-9, -78); this.ctx.lineTo(5, -78); this.ctx.lineTo(10, -18); this.ctx.lineTo(-14, -18); this.ctx.closePath(); this.ctx.fill();
      this.ctx.fillStyle = '#282012'; this.ctx.fillRect(-12, -20, 25, 34);
      this.ctx.fillStyle = 'rgba(255,255,255,0.28)'; this.ctx.fillRect(-8, -73, 2, 52);
      this.ctx.fillStyle = '#888'; this.ctx.fillRect(-12, -20, 2, 34);
    } else {
      // Right arm
      this.ctx.fillStyle = '#303030'; this.ctx.fillRect(0, 14, 34, 58);
      this.ctx.fillStyle = `rgb(${skinR},${skinG},${skinB})`; this.ctx.fillRect(2, -4, 30, 22);
      this.ctx.fillStyle = `rgb(${skinR - 12},${skinG - 10},${skinB - 7})`;
      for (let f = 0; f < 4; f++) this.ctx.fillRect(5 + f * 7, -11, 5, 9);
      // Left arm (primary/smg/rifle/sniper/shotgun)
      if (w.type !== 'pistol') {
        this.ctx.fillStyle = '#303030'; this.ctx.fillRect(-82, 5, 42, 44);
        this.ctx.fillStyle = `rgb(${skinR},${skinG},${skinB})`; this.ctx.fillRect(-78, -7, 32, 17);
        this.ctx.fillStyle = `rgb(${skinR - 12},${skinG - 10},${skinB - 7})`;
        for (let f = 0; f < 4; f++) this.ctx.fillRect(-75 + f * 7, -14, 5, 9);
      }

      // Weapon geometry
      this.drawWeaponModel(w, this.getWeaponKey() || '');

      // Muzzle flash
      if (p.fireTimer > (w.fireRate || 0.5) * 0.72) {
        const fX = w.type === 'pistol' ? -5 : -96, fY = w.type === 'pistol' ? -56 : -19;
        const fs2 = 17 + Math.random() * 14;
        const fg = this.ctx.createRadialGradient(fX, fY, 0, fX, fY, fs2);
        fg.addColorStop(0, 'rgba(255,255,215,0.95)'); fg.addColorStop(0.22, 'rgba(255,195,75,0.68)'); fg.addColorStop(0.55, 'rgba(255,115,18,0.3)'); fg.addColorStop(1, 'rgba(255,55,0,0)');
        this.ctx.fillStyle = fg; this.ctx.beginPath(); this.ctx.arc(fX, fY, fs2, 0, Math.PI * 2); this.ctx.fill();
        this.ctx.fillStyle = 'rgba(255,195,95,0.13)'; this.ctx.fillRect(-30, -32, 82, 82);
      }
    }
    this.ctx.restore();
  }

  drawWeaponModel(w: WeaponDef, wKey: string) {
    const c = this.ctx;
    switch (w.type) {
      case 'pistol':
        c.fillStyle = '#232323'; c.fillRect(-8, -54, 27, 11); // barrel
        c.fillStyle = '#383838'; c.fillRect(-10, -44, 31, 27); // slide
        c.fillStyle = 'rgba(0,0,0,0.18)'; for (let s = 0; s < 5; s++) c.fillRect(-7 + s * 5, -42, 2, 20); // serrations
        c.fillStyle = '#2d2d2e'; c.fillRect(-6, -18, 24, 12); // frame
        c.fillStyle = wKey === 'deagle' ? '#362828' : '#23200e'; c.fillRect(-3, -6, 20, 42); // grip
        c.fillStyle = 'rgba(0,0,0,0.13)'; for (let g = 0; g < 6; g++) c.fillRect(0, g * 7, 14, 1); // grip texture
        c.fillStyle = '#1a1a1a'; c.fillRect(4, -59, 4, 8); // rear sight
        c.fillStyle = '#0f0'; c.fillRect(5, -58, 2, 2); // green dot
        break;
      case 'smg':
        c.fillStyle = '#2a2a2c'; c.fillRect(24, -10, 52, 9); // stock
        c.fillStyle = '#323235'; c.fillRect(-36, -21, 68, 18); // receiver
        c.fillStyle = '#282828'; c.fillRect(-80, -17, 47, 7); // barrel
        if (w.silenced) { c.fillStyle = '#262626'; c.fillRect(-96, -21, 20, 15); } // suppressor
        c.fillStyle = '#2e2e33'; c.fillRect(-55, -21, 24, 13); // handguard
        c.fillStyle = '#222222'; c.fillRect(-5, -2, 14, 34); // mag
        c.fillStyle = '#22200e'; c.fillRect(15, -2, 15, 28); // grip
        c.fillStyle = '#1a1a1a'; c.fillRect(-24, -29, 22, 6); // top rail
        break;
      case 'rifle':
        c.fillStyle = wKey === 'ak47' ? '#382610' : '#282828'; c.fillRect(28, -17, 58, 20); // stock
        c.fillStyle = wKey === 'ak47' ? '#3e3e3e' : '#323236'; c.fillRect(-30, -24, 66, 19); // receiver
        c.fillStyle = '#2c2c2c'; c.fillRect(-88, -21, 62, 8); // barrel
        if (w.silenced) { c.fillStyle = '#242424'; c.fillRect(-108, -24, 24, 14); } else { c.fillStyle = '#323232'; c.fillRect(-95, -23, 10, 11); }
        c.fillStyle = wKey === 'ak47' ? '#382610' : '#2e2e33'; c.fillRect(-62, -24, 36, 14); // handguard
        if (wKey === 'ak47') { c.fillStyle = '#505050'; c.fillRect(-57, -29, 32, 4); } // gas tube
        c.fillStyle = wKey === 'ak47' ? '#444' : '#242428'; c.fillRect(-10, -2, 14, 36); // mag
        c.fillStyle = wKey === 'ak47' ? '#281808' : '#221e0e'; c.fillRect(12, -2, 16, 28); // grip
        c.fillStyle = '#2a2a2d'; c.fillRect(-22, -34, 34, 6); // top rail
        c.fillStyle = '#1a1a1a'; c.fillRect(-16, -39, 3, 7); c.fillRect(8, -37, 3, 6);
        c.fillStyle = '#0f0'; c.fillRect(-15, -39, 1, 3);
        break;
      case 'sniper':
        c.fillStyle = '#262628'; c.fillRect(18, -18, 72, 24); // stock
        c.fillStyle = '#222225'; c.fillRect(70, -14, 16, 17);
        c.fillStyle = '#323236'; c.fillRect(-42, -26, 68, 21); // receiver
        c.fillStyle = '#262626'; c.fillRect(-124, -22, 86, 9); // barrel
        c.fillStyle = '#363636'; c.fillRect(-132, -25, 12, 15); // muzzle
        c.fillStyle = '#1e1e22'; c.fillRect(-28, -46, 48, 13); // scope tube
        c.fillStyle = '#14141e'; c.beginPath(); c.arc(-28, -40, 7, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.arc(20, -40, 6, 0, Math.PI * 2); c.fill();
        c.fillStyle = 'rgba(90,140,255,0.32)'; c.beginPath(); c.arc(-28, -40, 5, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#232428'; c.fillRect(-10, -4, 17, 28); // mag
        c.fillStyle = '#221e0e'; c.fillRect(8, -4, 18, 28); // grip
        c.fillStyle = '#303030'; c.fillRect(-52, -4, 3, 18); // bipod
        break;
      case 'shotgun':
        c.fillStyle = '#4a3018'; c.fillRect(18, -17, 65, 22); // stock
        c.fillStyle = '#323232'; c.fillRect(-36, -20, 58, 17); // receiver
        c.fillStyle = '#2a2a2a'; c.fillRect(-88, -20, 56, 13); // barrel
        c.fillStyle = '#343434'; c.fillRect(-84, -7, 52, 7); // mag tube
        c.fillStyle = '#382610'; c.fillRect(-52, -22, 22, 20); // forend
        c.fillStyle = '#281808'; c.fillRect(8, -2, 15, 33); // grip
        c.fillStyle = '#ffd700'; c.beginPath(); c.arc(-86, -22, 2, 0, Math.PI * 2); c.fill(); // bead
        break;
    }
  }

  renderHUD(W: number, H: number) {
    const p = this.player;
    const w = this.getWeapon();
    const wKey = this.getWeaponKey();

    // === CROSSHAIR ===
    if (p.alive && !p.scoped) {
      const hSpd = p.velocitySmooth;
      let cSize = this.settings.crosshairSize;
      if (hSpd > 1.2) cSize += hSpd * 2.2;
      if (p.sprinting) cSize += 11;
      if (!p.onGround) cSize += 16;
      cSize += Math.abs(p.recoilPitch) * 75;
      if (p.crouching) cSize *= 0.68;
      const cx = W / 2, cy = H / 2;
      const gap = this.settings.crosshairGap + cSize * 0.5;
      const len = 5.5 + this.settings.crosshairSize * 0.4;
      const thick = this.settings.crosshairThickness;
      this.ctx.strokeStyle = 'rgba(0,0,0,0.48)'; this.ctx.lineWidth = thick + 1.5;
      this.drawCrosshairLines(cx, cy, gap, len);
      this.ctx.strokeStyle = this.settings.crosshairColor; this.ctx.lineWidth = thick;
      this.drawCrosshairLines(cx, cy, gap, len);
      if (this.settings.showDot) { this.ctx.fillStyle = this.settings.crosshairColor; this.ctx.beginPath(); this.ctx.arc(cx, cy, 1.1, 0, Math.PI * 2); this.ctx.fill(); }
    }

    // Hitmarker
    if (p.hitmarkerTimer > 0) {
      const a = p.hitmarkerTimer / 0.16;
      this.ctx.strokeStyle = p.headshotHit ? `rgba(255,48,48,${a})` : `rgba(255,255,255,${a})`;
      this.ctx.lineWidth = 2;
      const hms = 9, cx = W / 2, cy = H / 2;
      this.ctx.beginPath();
      this.ctx.moveTo(cx - hms, cy - hms); this.ctx.lineTo(cx - hms / 2, cy - hms / 2);
      this.ctx.moveTo(cx + hms, cy - hms); this.ctx.lineTo(cx + hms / 2, cy - hms / 2);
      this.ctx.moveTo(cx - hms, cy + hms); this.ctx.lineTo(cx - hms / 2, cy + hms / 2);
      this.ctx.moveTo(cx + hms, cy + hms); this.ctx.lineTo(cx + hms / 2, cy + hms / 2);
      this.ctx.stroke();
    }

    // === BOTTOM PANEL ===
    const panelH = 85;
    this.ctx.fillStyle = 'rgba(0,0,0,0.42)'; this.ctx.fillRect(0, H - panelH, W, panelH);
    this.ctx.fillStyle = 'rgba(255,255,255,0.04)'; this.ctx.fillRect(0, H - panelH, W, 1);

    // HP bar
    const hpY = H - 62; const hpW = 185;
    this.ctx.fillStyle = 'rgba(0,0,0,0.45)'; this.ctx.fillRect(22, hpY, hpW, 13);
    const hpPct = p.health / p.maxHealth;
    const hpCol = hpPct > 0.6 ? '#4fff4f' : hpPct > 0.3 ? '#ffcc00' : '#ff3232';
    this.ctx.fillStyle = hpCol; this.ctx.fillRect(22, hpY, hpW * hpPct, 13);
    this.ctx.fillStyle = '#fff'; this.ctx.font = 'bold 13px Segoe UI'; this.ctx.textAlign = 'left';
    this.ctx.fillText(`${Math.ceil(p.health)}`, 27, hpY + 11);
    this.ctx.fillStyle = hpCol; this.ctx.font = '10px Segoe UI'; this.ctx.fillText('HP', 22, hpY - 4);

    // Armor
    const arY = hpY + 20;
    this.ctx.fillStyle = 'rgba(0,0,0,0.4)'; this.ctx.fillRect(22, arY, hpW, 9);
    this.ctx.fillStyle = '#4488ff'; this.ctx.fillRect(22, arY, hpW * (p.armor / 100), 9);
    this.ctx.fillStyle = '#88aaff'; this.ctx.font = '10px Segoe UI'; this.ctx.fillText(`ARMOR ${Math.ceil(p.armor)}${p.helmet ? ' ⬡' : ''}`, 22, arY - 3);

    // Stamina
    this.ctx.fillStyle = 'rgba(0,0,0,0.3)'; this.ctx.fillRect(22, arY + 14, hpW, 3);
    this.ctx.fillStyle = p.stamina > 25 ? '#ccbb00' : '#ff8800'; this.ctx.fillRect(22, arY + 14, hpW * (p.stamina / 100), 3);

    // Money
    this.ctx.fillStyle = '#5dff5d'; this.ctx.font = 'bold 17px Segoe UI'; this.ctx.fillText(`$${p.money}`, 22, H - 68);

    // Score / K/D
    this.ctx.fillStyle = '#fff'; this.ctx.font = 'bold 14px Segoe UI'; this.ctx.fillText(`Score: ${p.score}`, 22, 28);
    this.ctx.fillStyle = '#ccc'; this.ctx.font = '12px Segoe UI'; this.ctx.fillText(`K: ${p.kills}  D: ${p.deaths}  A: ${p.assists}`, 22, 46);
    const aliveE = this.enemies.filter(e => e.alive).length;
    this.ctx.fillStyle = '#f44'; this.ctx.fillText(`Enemies: ${aliveE}`, 22, 63);
    if (this.simPlayers.length > 0) { this.ctx.fillStyle = '#4af'; this.ctx.fillText(`Players online: ${this.simPlayers.filter(s => s.alive).length + 1}`, 22, 80); }

    // Ammo
    if (w && w.magSize && wKey) {
      this.ctx.textAlign = 'right';
      this.ctx.font = 'bold 36px Segoe UI';
      const ammoLow = (p.ammo[wKey] || 0) <= Math.floor(w.magSize * 0.2);
      this.ctx.fillStyle = ammoLow ? '#ff3232' : '#ffffff';
      this.ctx.fillText(`${p.ammo[wKey] || 0}`, W - 88, H - 34);
      this.ctx.font = '18px Segoe UI'; this.ctx.fillStyle = '#888';
      this.ctx.fillText(`/ ${p.reserveAmmo[wKey] || 0}`, W - 22, H - 34);
      this.ctx.font = '12px Segoe UI'; this.ctx.fillStyle = '#aaa';
      this.ctx.fillText(w.name, W - 22, H - 64);
      this.ctx.font = '9px Segoe UI'; this.ctx.fillStyle = '#666';
      this.ctx.fillText(w.automatic ? 'AUTO' : 'SEMI', W - 22, H - 53);
    } else if (w) {
      this.ctx.textAlign = 'right'; this.ctx.font = '12px Segoe UI'; this.ctx.fillStyle = '#aaa';
      this.ctx.fillText(w.name, W - 22, H - 46);
    }

    // Reload bar
    if (p.reloading && w?.reloadTime) {
      const rw = 130, rh = 13, rx = W / 2 - rw / 2, ry = H / 2 + 62;
      this.ctx.fillStyle = 'rgba(0,0,0,0.62)'; this.ctx.fillRect(rx - 1, ry - 1, rw + 2, rh + 2);
      const rPct = 1 - (p.reloadTimer / w.reloadTime);
      const rg = this.ctx.createLinearGradient(rx, 0, rx + rw, 0);
      rg.addColorStop(0, '#ff8800'); rg.addColorStop(1, '#ffcc00');
      this.ctx.fillStyle = rg; this.ctx.fillRect(rx, ry, rw * rPct, rh);
      this.ctx.fillStyle = '#fff'; this.ctx.font = 'bold 10px Segoe UI'; this.ctx.textAlign = 'center';
      this.ctx.fillText('RELOADING', W / 2, ry - 5);
    }

    // Weapon slots
    const slotNames = ['primary', 'secondary', 'melee'] as const;
    this.ctx.textAlign = 'center';
    for (let i = 0; i < 3; i++) {
      const slX = W / 2 - 120 + i * 85, slY = H - 14;
      const active = i === p.currentSlot, hasW = p.inventory[slotNames[i]] != null;
      this.ctx.fillStyle = active ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.22)'; this.ctx.fillRect(slX - 36, slY - 11, 72, 20);
      this.ctx.strokeStyle = active ? `${this.settings.crosshairColor}88` : 'rgba(255,255,255,0.07)'; this.ctx.lineWidth = active ? 1.5 : 0.5;
      this.ctx.strokeRect(slX - 36, slY - 11, 72, 20);
      this.ctx.fillStyle = active ? '#fff' : hasW ? '#888' : '#444'; this.ctx.font = '9px Segoe UI';
      const wn2 = hasW ? WEAPON_DB[p.inventory[slotNames[i]]!]?.name.split(' ')[0] || '-' : '-';
      this.ctx.fillText(`${i + 1} ${wn2}`, slX, slY + 4);
    }
    // Utility
    if (p.inventory.utilities.length > 0) {
      const uX = W / 2 + 148;
      this.ctx.fillStyle = 'rgba(0,0,0,0.22)'; this.ctx.fillRect(uX - 36, H - 25, 72, 20);
      this.ctx.strokeStyle = 'rgba(255,255,255,0.07)'; this.ctx.lineWidth = 0.5; this.ctx.strokeRect(uX - 36, H - 25, 72, 20);
      this.ctx.fillStyle = '#aa8'; this.ctx.font = '9px Segoe UI';
      this.ctx.fillText(`4 ${UTILITY_DB[p.inventory.utilities[0]]?.name.split(' ')[0] || ''}`, uX, H - 10);
    }

    // Kill feed
    for (let i = 0; i < p.killFeed.length; i++) {
      const kf = p.killFeed[i];
      const kfY = 30 + i * 22;
      const kfAlpha = Math.min(1, kf.time);
      this.ctx.fillStyle = `rgba(0,0,0,${0.48 * kfAlpha})`; this.ctx.fillRect(W - 238, kfY - 13, 218, 18);
      this.ctx.font = '11px Segoe UI'; this.ctx.textAlign = 'right'; this.ctx.fillStyle = `rgba(255,255,255,${kfAlpha})`;
      this.ctx.fillText(`${kf.headshot ? '⊕' : '⬟'} ${kf.name}`, W - 22, kfY + 2);
    }

    // FPS
    if (this.settings.showFps) { this.ctx.textAlign = 'right'; this.ctx.font = '11px Segoe UI'; this.ctx.fillStyle = this.fps < 30 ? '#f44' : '#555'; this.ctx.fillText(`${this.fps} FPS`, W - 18, H - 92); }

    // Minimap
    this.renderMinimap(W, H, p);

    // Session info
    if (this.session) {
      this.ctx.textAlign = 'center'; this.ctx.font = 'bold 13px Segoe UI'; this.ctx.fillStyle = 'rgba(255,255,255,0.9)';
      this.ctx.fillStyle = 'rgba(0,0,0,0.4)'; this.ctx.fillRect(W / 2 - 80, 8, 160, 22);
      this.ctx.fillStyle = '#fff'; this.ctx.fillText(`${this.session.mode} — ${this.session.map}`, W / 2, 24);
    }
  }

  drawCrosshairLines(cx: number, cy: number, gap: number, len: number) {
    this.ctx.beginPath();
    this.ctx.moveTo(cx - gap - len, cy); this.ctx.lineTo(cx - gap, cy);
    this.ctx.moveTo(cx + gap, cy); this.ctx.lineTo(cx + gap + len, cy);
    this.ctx.moveTo(cx, cy - gap - len); this.ctx.lineTo(cx, cy - gap);
    this.ctx.moveTo(cx, cy + gap); this.ctx.lineTo(cx, cy + gap + len);
    this.ctx.stroke();
  }

  renderMinimap(W: number, H: number, p: PlayerState) {
    const mmS = 145, mmX = W - mmS - 14;
    const feedOffset = p.killFeed.length * 22 + 42;
    const mmY = feedOffset;
    this.ctx.fillStyle = 'rgba(0,0,0,0.52)'; this.ctx.fillRect(mmX - 2, mmY - 2, mmS + 4, mmS + 4);
    this.ctx.strokeStyle = 'rgba(255,255,255,0.08)'; this.ctx.strokeRect(mmX - 2, mmY - 2, mmS + 4, mmS + 4);
    const sc = mmS / MAP_W;
    for (let x = 0; x < MAP_W; x++) for (let z = 0; z < MAP_W; z++) {
      if (gMap(this.map.walls, x, z) > 0) {
        const col2 = gColor(this.map.colors, x, z);
        this.ctx.fillStyle = `rgb(${Math.floor(col2.r * 0.38)},${Math.floor(col2.g * 0.38)},${Math.floor(col2.b * 0.38)})`;
        this.ctx.fillRect(mmX + x * sc, mmY + z * sc, Math.ceil(sc), Math.ceil(sc));
      }
    }
    // Bombsites
    const bsA = this.map.bombsiteA, bsB = this.map.bombsiteB;
    this.ctx.strokeStyle = 'rgba(255,100,100,0.4)'; this.ctx.lineWidth = 1;
    this.ctx.strokeRect(mmX + bsA.x * sc, mmY + bsA.z * sc, bsA.w * sc, bsA.h * sc);
    this.ctx.strokeRect(mmX + bsB.x * sc, mmY + bsB.z * sc, bsB.w * sc, bsB.h * sc);
    this.ctx.fillStyle = 'rgba(255,80,80,0.5)'; this.ctx.font = '7px Arial'; this.ctx.textAlign = 'center';
    this.ctx.fillText('A', mmX + (bsA.x + bsA.w / 2) * sc, mmY + (bsA.z + bsA.h / 2) * sc);
    this.ctx.fillText('B', mmX + (bsB.x + bsB.w / 2) * sc, mmY + (bsB.z + bsB.h / 2) * sc);
    // Player
    this.ctx.fillStyle = '#4fff4f'; this.ctx.beginPath(); this.ctx.arc(mmX + p.x * sc, mmY + p.z * sc, 3, 0, Math.PI * 2); this.ctx.fill();
    this.ctx.strokeStyle = '#4fff4f'; this.ctx.lineWidth = 1.5;
    this.ctx.beginPath(); this.ctx.moveTo(mmX + p.x * sc, mmY + p.z * sc); this.ctx.lineTo(mmX + (p.x + Math.cos(p.yaw) * 3.5) * sc, mmY + (p.z + Math.sin(p.yaw) * 3.5) * sc); this.ctx.stroke();
    // Enemies
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const ed = Math.sqrt((e.x - p.x) ** 2 + (e.z - p.z) ** 2);
      if (ed < 28) { this.ctx.fillStyle = e.state === 'patrol' ? '#ffcc00' : '#ff3333'; this.ctx.beginPath(); this.ctx.arc(mmX + e.x * sc, mmY + e.z * sc, 2, 0, Math.PI * 2); this.ctx.fill(); }
    }
    // Sim players
    for (const sp of this.simPlayers) {
      this.ctx.fillStyle = '#4a9fff'; this.ctx.beginPath(); this.ctx.arc(mmX + sp.x * sc, mmY + sp.z * sc, 2, 0, Math.PI * 2); this.ctx.fill();
    }
    // Pickups
    for (const pk of this.pickups) { this.ctx.fillStyle = pk.type === 'health' ? '#0f0' : '#ff0'; this.ctx.fillRect(mmX + pk.x * sc - 1.5, mmY + pk.z * sc - 1.5, 3, 3); }
    for (const sz of this.smokeZones) { this.ctx.fillStyle = 'rgba(200,200,200,0.28)'; this.ctx.beginPath(); this.ctx.arc(mmX + sz.x * sc, mmY + sz.z * sc, sz.radius * sc, 0, Math.PI * 2); this.ctx.fill(); }
    for (const fz of this.fireZones) { this.ctx.fillStyle = 'rgba(255,100,0,0.28)'; this.ctx.beginPath(); this.ctx.arc(mmX + fz.x * sc, mmY + fz.z * sc, fz.radius * sc, 0, Math.PI * 2); this.ctx.fill(); }
  }

  renderEffects(W: number, H: number) {
    const p = this.player;
    // Damage flash
    if (p.dmgFlash > 0) {
      this.ctx.fillStyle = `rgba(255,18,0,${p.dmgFlash * 0.22})`; this.ctx.fillRect(0, 0, W, H);
      const da = p.dmgDir - p.yaw;
      const ix = W / 2 + Math.cos(da) * 185, iy = H / 2 + Math.sin(da) * 185;
      const dg = this.ctx.createRadialGradient(ix, iy, 0, ix, iy, 65);
      dg.addColorStop(0, `rgba(255,0,0,${p.dmgFlash * 0.48})`); dg.addColorStop(1, 'rgba(255,0,0,0)');
      this.ctx.fillStyle = dg; this.ctx.beginPath(); this.ctx.arc(ix, iy, 65, 0, Math.PI * 2); this.ctx.fill();
    }
    // Flash
    if (p.flashAmount > 0) { this.ctx.fillStyle = `rgba(255,255,255,${Math.min(1, p.flashAmount)})`; this.ctx.fillRect(0, 0, W, H); }
    // Landing
    if (p.landingShock > 0) { this.ctx.fillStyle = `rgba(0,0,0,${p.landingShock * 0.14})`; this.ctx.fillRect(0, H - H * p.landingShock * 0.08, W, H * p.landingShock * 0.08); }
    // Scope overlay
    if (p.scoped) {
      const scopeR = Math.min(W, H) * 0.44;
      this.ctx.fillStyle = '#000'; this.ctx.beginPath(); this.ctx.rect(0, 0, W, H); this.ctx.arc(W / 2, H / 2, scopeR, 0, Math.PI * 2, true); this.ctx.fill();
      this.ctx.strokeStyle = 'rgba(0,0,0,0.85)'; this.ctx.lineWidth = 1;
      this.ctx.beginPath(); this.ctx.moveTo(W / 2, 0); this.ctx.lineTo(W / 2, H); this.ctx.moveTo(0, H / 2); this.ctx.lineTo(W, H / 2); this.ctx.stroke();
      for (let i = 1; i <= 4; i++) {
        const md = scopeR * i / 5;
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(W / 2 + md - 1, H / 2 - 4, 2, 8); this.ctx.fillRect(W / 2 - md - 1, H / 2 - 4, 2, 8);
        this.ctx.fillRect(W / 2 - 4, H / 2 + md - 1, 8, 2); this.ctx.fillRect(W / 2 - 4, H / 2 - md - 1, 8, 2);
      }
    }
    // Death screen
    if (!p.alive) {
      this.ctx.fillStyle = 'rgba(80,0,0,0.72)'; this.ctx.fillRect(0, 0, W, H);
      this.ctx.fillStyle = '#ffffff'; this.ctx.font = 'bold 52px Segoe UI'; this.ctx.textAlign = 'center';
      this.ctx.fillText('ELIMINATED', W / 2, H / 2 - 22);
      this.ctx.font = '17px Segoe UI'; this.ctx.fillStyle = '#ccc';
      this.ctx.fillText(`Score: ${p.score}  |  K/D: ${p.kills}/${p.deaths}`, W / 2, H / 2 + 18);
      this.ctx.font = '14px Segoe UI'; this.ctx.fillStyle = '#aaa';
      this.ctx.fillText('Press R to respawn', W / 2, H / 2 + 50);
    }
    // Vignette
    const vg = this.ctx.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.72);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.28)');
    this.ctx.fillStyle = vg; this.ctx.fillRect(0, 0, W, H);
  }
}
