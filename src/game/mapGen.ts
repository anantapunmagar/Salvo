import { MAP_W, MAP_H } from './constants';

export interface MapData {
  walls: Uint8Array;
  heights: Float32Array;
  colors: { r: number; g: number; b: number }[];
  spawnsCT: { x: number; z: number }[];
  spawnsT: { x: number; z: number }[];
  bombsiteA: { x: number; z: number; w: number; h: number };
  bombsiteB: { x: number; z: number; w: number; h: number };
  pickupSpawns: { x: number; z: number }[];
  enemySpawns: { x: number; z: number; type: string }[];
  name: string;
  theme: 'desert' | 'urban' | 'industrial';
}

function c(r: number, g: number, b: number) { return { r, g, b }; }

export function generateMap(layout: number = 0): MapData {
  const walls = new Uint8Array(MAP_W * MAP_H);
  const heights = new Float32Array(MAP_W * MAP_H);
  const colors: { r: number; g: number; b: number }[] = Array(MAP_W * MAP_H).fill(null).map(() => c(120, 120, 120));
  heights.fill(3.2);

  const setWall = (x: number, z: number, type: number, h: number, color: { r: number; g: number; b: number }) => {
    if (x < 0 || x >= MAP_W || z < 0 || z >= MAP_H) return;
    const i = z * MAP_W + x;
    walls[i] = type;
    heights[i] = h;
    colors[i] = color;
  };

  const clearWall = (x: number, z: number) => {
    if (x < 0 || x >= MAP_W || z < 0 || z >= MAP_H) return;
    walls[z * MAP_W + x] = 0;
  };

  const buildBox = (x: number, z: number, w: number, h: number, type: number, wh: number, col: { r: number; g: number; b: number }) => {
    for (let ix = x; ix < x + w; ix++) {
      for (let iz = z; iz < z + h; iz++) {
        if (ix === x || ix === x + w - 1 || iz === z || iz === z + h - 1)
          setWall(ix, iz, type, wh, col);
      }
    }
  };

  const fillBox = (x: number, z: number, w: number, h: number, type: number, wh: number, col: { r: number; g: number; b: number }) => {
    for (let ix = x; ix < x + w; ix++)
      for (let iz = z; iz < z + h; iz++)
        setWall(ix, iz, type, wh, col);
  };

  const buildLine = (x1: number, z1: number, x2: number, z2: number, type: number, wh: number, col: { r: number; g: number; b: number }) => {
    if (x1 === x2) { for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) setWall(x1, z, type, wh, col); }
    else { for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) setWall(x, z1, type, wh, col); }
  };

  if (layout === 0) {
    // === DUST COMPOUND — Desert tactical map ===
    const wC = c(155, 130, 95); // warm stone
    const bkC = c(170, 145, 110); // lighter blocks
    const dkC = c(130, 105, 75); // dark wall
    const accC = c(190, 165, 125); // accent

    // Outer perimeter
    for (let x = 0; x < MAP_W; x++) for (let z = 0; z < MAP_H; z++) {
      if (x === 0 || x === MAP_W - 1 || z === 0 || z === MAP_H - 1)
        setWall(x, z, 1, 5.5, c(100, 85, 60));
    }

    // CT Spawn — bottom left compound
    buildBox(2, 2, 10, 8, 1, 4, wC);
    clearWall(8, 2); clearWall(9, 2);
    clearWall(2, 6); clearWall(2, 7);
    clearWall(11, 5); clearWall(11, 6);
    // Spawn cover
    setWall(5, 4, 4, 1.4, bkC); setWall(6, 4, 4, 1.4, bkC);
    setWall(4, 6, 4, 1.6, dkC);

    // T Spawn — top right compound
    buildBox(52, 54, 10, 8, 2, 4, c(165, 135, 100));
    clearWall(52, 57); clearWall(52, 58);
    clearWall(58, 55); clearWall(59, 55);
    clearWall(55, 54); clearWall(56, 54);
    setWall(55, 58, 2, 1.3, c(145, 115, 80));
    setWall(56, 58, 2, 1.3, c(145, 115, 80));

    // === BOMBSITE A — top-left open square ===
    buildBox(3, 38, 16, 16, 1, 4.5, c(165, 140, 105));
    clearWall(8, 38); clearWall(9, 38); // entry from long
    clearWall(3, 48); clearWall(3, 49); // CT push
    clearWall(18, 44); clearWall(18, 45); // short entry
    // A site internal structure
    buildBox(7, 41, 6, 6, 1, 3.2, c(155, 130, 95));
    clearWall(7, 43); clearWall(7, 44); clearWall(12, 43); clearWall(12, 44);
    setWall(9, 43, 1, 1.5, bkC); setWall(10, 43, 1, 1.5, bkC);
    // A-site boxes
    setWall(5, 39, 4, 1.3, bkC); setWall(6, 39, 4, 1.3, bkC);
    setWall(14, 40, 4, 1.6, dkC); setWall(15, 40, 4, 1.6, dkC);
    setWall(5, 51, 4, 1.2, bkC);
    setWall(13, 50, 4, 1.8, dkC); setWall(14, 50, 4, 1.0, bkC);

    // === BOMBSITE B — right-center ===
    buildBox(40, 24, 14, 14, 3, 4.2, c(140, 155, 170));
    clearWall(40, 30); clearWall(40, 31); // CT entry
    clearWall(46, 24); clearWall(47, 24); // main entry
    clearWall(53, 30); clearWall(53, 31); // T entry
    clearWall(46, 37); clearWall(47, 37); // lower entry
    // B platform cover
    buildBox(44, 27, 6, 6, 3, 3.5, c(125, 140, 155));
    clearWall(44, 29); clearWall(44, 30); clearWall(49, 29); clearWall(49, 30);
    setWall(46, 29, 3, 1.2, c(110, 120, 130));
    setWall(42, 33, 3, 1.4, c(115, 125, 140));
    setWall(43, 33, 3, 1.4, c(115, 125, 140));
    setWall(49, 33, 3, 1.3, c(110, 120, 130));

    // === MID CORRIDOR — center spine ===
    buildBox(23, 14, 4, 34, 1, 4.8, c(145, 145, 148));
    clearWall(25, 14); clearWall(25, 15);
    clearWall(25, 46); clearWall(25, 47);
    // Mid windows
    clearWall(23, 28); clearWall(23, 29);
    clearWall(26, 28); clearWall(26, 29);
    // Mid door
    buildBox(23, 30, 4, 3, 4, 3.2, c(110, 80, 50));
    clearWall(24, 30); clearWall(25, 30);
    clearWall(24, 31); clearWall(25, 31);

    // === A LONG ===
    buildBox(3, 26, 20, 3, 1, 3.8, c(148, 140, 125));
    buildBox(3, 32, 20, 3, 1, 3.8, c(148, 140, 125));
    clearWall(3, 26); clearWall(3, 27); clearWall(3, 28);
    clearWall(22, 27); clearWall(22, 28);
    clearWall(3, 32); clearWall(3, 33); clearWall(3, 34);
    clearWall(22, 33); clearWall(22, 34);
    // Long A covers
    setWall(8, 27, 4, 1.5, bkC); setWall(9, 27, 4, 1.5, bkC);
    setWall(8, 33, 4, 1.5, bkC); setWall(9, 33, 4, 1.5, bkC);
    setWall(14, 27, 4, 1.3, dkC); setWall(15, 28, 4, 1.1, dkC);
    setWall(14, 33, 4, 1.3, dkC); setWall(15, 34, 4, 1.1, dkC);
    setWall(18, 27, 4, 1.6, accC);

    // A Short
    buildBox(18, 34, 6, 5, 1, 3.2, c(155, 148, 130));
    clearWall(19, 34); clearWall(20, 34);
    clearWall(23, 36); clearWall(23, 37);
    setWall(20, 37, 1, 1.2, bkC); setWall(21, 37, 1, 1.2, bkC);

    // === B CONNECTOR TUNNELS ===
    buildBox(29, 16, 3, 20, 1, 3.4, c(138, 120, 98));
    buildBox(34, 16, 3, 20, 1, 3.4, c(138, 120, 98));
    clearWall(30, 16); clearWall(31, 16); clearWall(32, 16); clearWall(33, 16);
    clearWall(30, 35); clearWall(31, 35); clearWall(32, 35); clearWall(33, 35);
    clearWall(36, 25); clearWall(36, 26);
    setWall(30, 24, 1, 1.4, c(120, 105, 82)); setWall(33, 24, 1, 1.4, c(120, 105, 82));

    // === CONNECTOR BUILDINGS ===
    // CT to A connector
    buildBox(12, 10, 10, 7, 2, 4, c(158, 135, 102));
    clearWall(14, 10); clearWall(15, 10); clearWall(16, 10);
    clearWall(12, 14); clearWall(13, 14); clearWall(21, 13); clearWall(21, 14);
    setWall(16, 12, 2, 1.5, bkC); setWall(17, 12, 2, 1.5, bkC);

    // T to B connector
    buildBox(42, 42, 10, 10, 2, 3.8, c(150, 128, 102));
    clearWall(44, 42); clearWall(45, 42); clearWall(46, 42);
    clearWall(42, 47); clearWall(42, 48); clearWall(51, 46); clearWall(51, 47);
    setWall(46, 47, 2, 1.4, c(130, 108, 82));

    // Mid buildings
    buildBox(27, 20, 7, 5, 1, 4, c(138, 142, 150));
    clearWall(29, 20); clearWall(30, 20);
    clearWall(27, 23); clearWall(28, 23); clearWall(33, 22); clearWall(33, 23);
    buildBox(27, 32, 7, 5, 1, 4, c(138, 142, 150));
    clearWall(29, 32); clearWall(30, 32);
    clearWall(27, 35); clearWall(28, 35); clearWall(33, 34); clearWall(33, 35);

    // Tower mid
    fillBox(18, 18, 5, 5, 1, 6.5, c(130, 130, 138));
    buildBox(17, 17, 7, 7, 1, 6.5, c(128, 128, 136));
    clearWall(20, 17); clearWall(21, 17);
    clearWall(17, 20); clearWall(17, 21); clearWall(23, 20); clearWall(23, 21);

    // === SCATTER COVER ===
    const coverPositions: [number, number, number, number, number, number][] = [
      [13, 22, 4, 1.4, 130, 108], [14, 22, 4, 1.4, 130, 108],
      [20, 18, 4, 1.3, 125, 105], [20, 39, 4, 1.5, 135, 112],
      [35, 28, 4, 1.6, 118, 130], [36, 28, 4, 1.6, 118, 130],
      [30, 42, 4, 1.3, 125, 105], [31, 42, 4, 1.3, 125, 105],
      [16, 50, 4, 1.2, 130, 112], [39, 18, 4, 1.5, 120, 132],
      [40, 18, 4, 1.5, 120, 132], [26, 47, 4, 1.4, 130, 105],
      [35, 46, 4, 1.6, 122, 108], [46, 42, 4, 1.3, 112, 122],
      [8, 15, 4, 1.2, 140, 118], [10, 55, 4, 1.3, 138, 115],
      [38, 56, 4, 1.4, 135, 112], [50, 18, 4, 1.2, 118, 130],
    ];
    for (const [cx, cz, type, ch, r, g] of coverPositions) {
      if (cx > 1 && cx < MAP_W - 2 && cz > 1 && cz < MAP_H - 2 && walls[cz * MAP_W + cx] === 0)
        setWall(cx, cz, type, ch, c(r, g, 70 + Math.floor(Math.random() * 20)));
    }

    return {
      walls, heights, colors,
      spawnsCT: [
        { x: 4, z: 4 }, { x: 5, z: 5 }, { x: 6, z: 4 }, { x: 4, z: 6 }, { x: 7, z: 5 },
      ],
      spawnsT: [
        { x: 56, z: 56 }, { x: 57, z: 57 }, { x: 55, z: 57 }, { x: 57, z: 55 }, { x: 56, z: 58 },
      ],
      bombsiteA: { x: 3, z: 38, w: 16, h: 16 },
      bombsiteB: { x: 40, z: 24, w: 14, h: 14 },
      pickupSpawns: [
        { x: 6, z: 20 }, { x: 16, z: 30 }, { x: 25, z: 25 }, { x: 34, z: 20 },
        { x: 44, z: 30 }, { x: 20, z: 50 }, { x: 30, z: 50 }, { x: 50, z: 40 },
        { x: 12, z: 44 }, { x: 38, z: 42 }, { x: 48, z: 22 },
      ],
      enemySpawns: [
        { x: 55, z: 56, type: 'rifle' }, { x: 57, z: 55, type: 'rifle' },
        { x: 54, z: 58, type: 'heavy' }, { x: 58, z: 56, type: 'pistol' },
        { x: 44, z: 44, type: 'rifle' }, { x: 46, z: 46, type: 'rifle' },
        { x: 42, z: 48, type: 'pistol' }, { x: 47, z: 42, type: 'heavy' },
        { x: 33, z: 30, type: 'rifle' }, { x: 31, z: 28, type: 'rifle' },
        { x: 35, z: 32, type: 'pistol' }, { x: 29, z: 25, type: 'heavy' },
        { x: 40, z: 32, type: 'rifle' }, { x: 38, z: 30, type: 'rifle' },
        { x: 50, z: 26, type: 'rifle' }, { x: 48, z: 28, type: 'pistol' },
        { x: 24, z: 46, type: 'rifle' }, { x: 12, z: 46, type: 'rifle' },
        { x: 8, z: 44, type: 'heavy' }, { x: 32, z: 17, type: 'rifle' },
        { x: 27, z: 16, type: 'pistol' }, { x: 52, z: 20, type: 'rifle' },
      ],
      name: 'DUST COMPOUND',
      theme: 'desert',
    };
  }

  // Default fallback
  for (let x = 0; x < MAP_W; x++) for (let z = 0; z < MAP_H; z++) {
    if (x === 0 || x === MAP_W - 1 || z === 0 || z === MAP_H - 1)
      setWall(x, z, 1, 5, c(100, 100, 100));
  }

  return {
    walls, heights, colors,
    spawnsCT: [{ x: 4, z: 4 }],
    spawnsT: [{ x: MAP_W - 5, z: MAP_H - 5 }],
    bombsiteA: { x: 4, z: MAP_H - 20, w: 12, h: 12 },
    bombsiteB: { x: MAP_W - 20, z: 10, w: 12, h: 12 },
    pickupSpawns: [{ x: MAP_W / 2, z: MAP_H / 2 }],
    enemySpawns: [],
    name: 'FALLBACK',
    theme: 'urban',
  };
}

export function gMap(walls: Uint8Array, x: number, z: number): number {
  if (x < 0 || x >= MAP_W || z < 0 || z >= MAP_H) return 1;
  return walls[z * MAP_W + x];
}

export function gHeight(heights: Float32Array, x: number, z: number): number {
  if (x < 0 || x >= MAP_W || z < 0 || z >= MAP_H) return 5;
  return heights[z * MAP_W + x];
}

export function gColor(colors: { r: number; g: number; b: number }[], x: number, z: number) {
  if (x < 0 || x >= MAP_W || z < 0 || z >= MAP_H) return { r: 90, g: 90, b: 90 };
  return colors[z * MAP_W + x];
}

export function castRay(walls: Uint8Array, heights: Float32Array, ox: number, oz: number, angle: number) {
  const ca = Math.cos(angle) || 1e-10;
  const sa = Math.sin(angle) || 1e-10;
  let mx = Math.floor(ox), mz = Math.floor(oz);
  const ddx = Math.abs(1 / ca), ddz = Math.abs(1 / sa);
  let sdx = ca < 0 ? (ox - mx) * ddx : (mx + 1 - ox) * ddx;
  let sdz = sa < 0 ? (oz - mz) * ddz : (mz + 1 - oz) * ddz;
  const sx = ca < 0 ? -1 : 1, sz = sa < 0 ? -1 : 1;
  let side = 0;

  for (let i = 0; i < 128; i++) {
    let dist: number;
    if (sdx < sdz) { sdx += ddx; mx += sx; side = 0; dist = sdx - ddx; }
    else { sdz += ddz; mz += sz; side = 1; dist = sdz - ddz; }

    if (mx < 0 || mx >= MAP_W || mz < 0 || mz >= MAP_H)
      return { dist: 999, side: 0, mx: 0, mz: 0, wt: 0, wh: 5, hx: 0 };

    const wt = walls[mz * MAP_W + mx];
    if (wt > 0) {
      let hx = side === 0 ? oz + dist * sa : ox + dist * ca;
      hx -= Math.floor(hx);
      return { dist, side, mx, mz, wt, wh: heights[mz * MAP_W + mx], hx };
    }
  }
  return { dist: 999, side: 0, mx: 0, mz: 0, wt: 0, wh: 3, hx: 0 };
}
