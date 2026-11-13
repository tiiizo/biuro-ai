// Decorations: things on the wall (y in voxels from the floor, front towards +z, 1–2 voxels thick),
// plants, the rug, small items and theme props. A wall is 20 voxels high.
import { mix, darken, lighten } from '../palette';
import { Blocks } from '../voxel';
import { M, type Model } from './types';

const WALL_DECOR_BOTTOM = 11.5;

function frame(k: Blocks, x: number, y: number, w: number, h: number, color: string): void {
  k.b(x, y, 0, w, 0.5, 0.8, color).b(x, y + h - 0.5, 0, w, 0.5, 0.8, color);
  k.b(x, y, 0, 0.5, h, 0.8, color).b(x + w - 0.5, y, 0, 0.5, h, 0.8, color);
}

export const windowFrame: Model = {
  spot: 'wall',
  width: 1,
  depth: 1,
  build: (p) => {
    const k = new Blocks();
    const r = lighten(p.trim, 0.1);
    k.b(0.6, 7.6, 0, 6.8, 9.6, 0.15, '#a8e0f0');
    k.b(1, 12, 0.1, 2.5, 4, 0.1, '#d6f1f8');
    frame(k, 0.4, 7.4, 7.2, 10, r);
    k.b(3.75, 7.4, 0, 0.5, 10, 0.8, r);
    k.b(0.2, 7.2, 0, 7.6, 0.4, 1.6, mix(p.wall, '#ffffff', 0.5));
    return k.list;
  },
};

export const clock: Model = {
  spot: 'wall',
  width: 1,
  depth: 1,
  build: (p) => {
    const k = new Blocks();
    k.b(2.5, 14, 0, 3, 3, 0.6, p.dark);
    k.b(2.8, 14.3, 0.4, 2.4, 2.4, 0.3, M.white);
    k.b(3.9, 15.3, 0.7, 0.25, 1.1, 0.1, M.black).b(3.9, 15.3, 0.7, 0.9, 0.25, 0.1, M.red);
    return k.list;
  },
};

export const calendar: Model = {
  spot: 'wall',
  width: 1,
  depth: 1,
  build: (p) => {
    const k = new Blocks();
    k.b(2, 11.5, 0, 4, 5, 0.3, M.paper);
    k.b(2, 15.5, 0, 4, 1.4, 0.4, p.accent);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        const marked = r === 1 && c === 2;
        k.b(2.4 + c * 0.85, 12.1 + r * 1.1, 0.3, 0.6, 0.6, 0.05, marked ? M.red : '#c9c2b0');
      }
    }
    return k.list;
  },
};

export const poster: Model = {
  spot: 'wall',
  width: 1,
  depth: 1,
  build: (p, w) => {
    const k = new Blocks();
    k.b(1.5, WALL_DECOR_BOTTOM, 0, 5, 6.5, 0.3, p.light);
    k.b(1.8, WALL_DECOR_BOTTOM + 0.3, 0.3, 4.4, 5.9, 0.05, w % 2 === 0 ? p.accent : p.accent2);
    // A simple composition: a sun/circle and two stripes (the project's motivational poster).
    k.b(3.2, WALL_DECOR_BOTTOM + 3.3, 0.35, 1.6, 1.6, 0.05, M.yellow);
    k.b(2.2, WALL_DECOR_BOTTOM + 1.2, 0.35, 3.6, 0.5, 0.05, p.light).b(2.2, WALL_DECOR_BOTTOM + 2.0, 0.35, 2.4, 0.5, 0.05, p.light);
    frame(k, 1.3, WALL_DECOR_BOTTOM - 0.2, 5.4, 6.9, p.dark);
    return k.list;
  },
};

export const worldMap: Model = {
  spot: 'wall',
  width: 1,
  depth: 1,
  build: (p) => {
    const k = new Blocks();
    k.b(0.4, WALL_DECOR_BOTTOM, 0, 7.2, 5.6, 0.3, '#7ec4e3');
    const land = '#8bc37a';
    k.b(1.0, WALL_DECOR_BOTTOM + 2.8, 0.3, 1.6, 2.0, 0.05, land).b(1.6, WALL_DECOR_BOTTOM + 1.0, 0.3, 0.9, 1.8, 0.05, land);
    k.b(3.4, WALL_DECOR_BOTTOM + 3.0, 0.3, 1.0, 1.6, 0.05, land).b(3.6, WALL_DECOR_BOTTOM + 1.2, 0.3, 1.0, 1.8, 0.05, land);
    k.b(4.6, WALL_DECOR_BOTTOM + 2.6, 0.3, 2.2, 2.0, 0.05, land).b(5.9, WALL_DECOR_BOTTOM + 0.8, 0.3, 1.0, 0.8, 0.05, land);
    // Project pins.
    k.b(2.0, WALL_DECOR_BOTTOM + 3.6, 0.35, 0.5, 0.5, 0.2, M.red).b(4.0, WALL_DECOR_BOTTOM + 3.8, 0.35, 0.5, 0.5, 0.2, p.accent);
    k.b(5.6, WALL_DECOR_BOTTOM + 3.2, 0.35, 0.5, 0.5, 0.2, M.yellow);
    frame(k, 0.2, WALL_DECOR_BOTTOM - 0.2, 7.6, 6, M.woodD);
    return k.list;
  },
};

export const corkBoard: Model = {
  spot: 'wall',
  width: 1,
  depth: 1,
  build: (p) => {
    const k = new Blocks();
    k.b(0.6, WALL_DECOR_BOTTOM, 0, 6.8, 5.4, 0.4, '#c8955c');
    frame(k, 0.4, WALL_DECOR_BOTTOM - 0.2, 7.2, 5.8, M.woodD);
    const notes: Array<[number, number, string]> = [
      [1.2, 2.8, M.paper], [3.0, 3.2, M.yellow], [5.0, 2.6, M.pink], [1.6, 0.6, p.accent], [3.6, 0.8, M.paper], [5.4, 0.5, M.green],
    ];
    for (const [x, y, c] of notes) {
      k.b(x, WALL_DECOR_BOTTOM + y, 0.4, 1.5, 1.7, 0.08, c);
      k.b(x + 0.6, WALL_DECOR_BOTTOM + y + 1.4, 0.45, 0.3, 0.3, 0.2, M.red);
    }
    return k.list;
  },
};

export const trophy: Model = {
  spot: 'wall',
  width: 1,
  depth: 1,
  build: () => {
    const k = new Blocks();
    k.b(0.8, 12, 0, 6.4, 0.6, 2.2, M.woodD);
    k.b(1.5, 12.6, 0.5, 2, 0.5, 1.2, M.goldD).b(2.1, 13.1, 0.8, 0.8, 1, 0.6, M.gold).b(1.4, 14.1, 0.4, 2.2, 1.8, 1.4, M.gold);
    k.b(1.0, 14.6, 0.8, 0.4, 1, 0.5, M.goldD).b(3.6, 14.6, 0.8, 0.4, 1, 0.5, M.goldD);
    k.b(4.6, 12.6, 0.6, 1.6, 2.2, 1, M.metal).b(4.9, 13.2, 1.6, 1, 1, 0.1, M.gold);
    return k.list;
  },
};

export const diploma: Model = {
  spot: 'wall',
  width: 1,
  depth: 1,
  build: (p) => {
    const k = new Blocks();
    k.b(1.5, 12, 0, 5, 4, 0.5, M.goldD);
    k.b(1.9, 12.4, 0.4, 4.2, 3.2, 0.1, M.paper);
    k.b(2.4, 15, 0.5, 3.2, 0.3, 0.05, p.dark).b(2.8, 14.2, 0.5, 2.4, 0.25, 0.05, '#9e9a8e');
    k.b(4.8, 12.6, 0.5, 0.8, 0.8, 0.1, M.red);
    return k.list;
  },
};

/** School chalkboard with a simple sum (theme: classroom, school, lesson). */
export const chalkboard: Model = {
  spot: 'wall',
  width: 1,
  depth: 1,
  build: () => {
    const k = new Blocks();
    k.b(0.4, 10.5, 0, 7.2, 6.4, 0.4, '#2d5a3d');
    frame(k, 0.2, 10.3, 7.6, 6.8, M.wood);
    k.b(0.2, 10.1, 0, 7.6, 0.4, 1.4, M.wood);
    // "1+2=3" in chalk, in pixels.
    const chalk = '#f1f1e6';
    const y = 13.4;
    k.b(1.6, y, 0.4, 0.3, 1.9, 0.05, chalk).b(1.3, y + 1.4, 0.4, 0.3, 0.3, 0.05, chalk);
    k.b(2.4, y + 0.5, 0.4, 0.8, 0.3, 0.05, '#ffd166').b(2.65, y + 0.25, 0.4, 0.3, 0.8, 0.05, '#ffd166');
    k.b(3.5, y + 1.6, 0.4, 1.0, 0.3, 0.05, chalk).b(4.2, y + 0.8, 0.4, 0.3, 0.8, 0.05, chalk);
    k.b(3.5, y + 0.8, 0.4, 1.0, 0.3, 0.05, chalk).b(3.5, y, 0.4, 0.3, 0.8, 0.05, chalk).b(3.5, y, 0.4, 1.0, 0.3, 0.05, chalk);
    k.b(4.9, y + 0.9, 0.4, 0.8, 0.25, 0.05, chalk).b(4.9, y + 0.4, 0.4, 0.8, 0.25, 0.05, chalk);
    k.b(6.0, y + 1.6, 0.4, 1.0, 0.3, 0.05, chalk).b(6.2, y + 0.8, 0.4, 0.8, 0.3, 0.05, chalk);
    k.b(6.0, y, 0.4, 1.0, 0.3, 0.05, chalk).b(6.7, y, 0.4, 0.3, 1.9, 0.05, chalk);
    k.b(1.0, 11.4, 0.4, 5.6, 0.25, 0.05, '#8fbf9f');
    k.b(1.0, 12.2, 0.4, 3.2, 0.25, 0.05, '#8fbf9f');
    return k.list;
  },
};

/** Kanban board on a stand — the target of the figures' walks. */
export const kanbanBoard: Model = {
  spot: 'floor',
  width: 1,
  depth: 1,
  build: (p) => {
    const k = new Blocks();
    k.b(0.6, 0, 2.5, 0.5, 6, 0.5, M.metalD).b(6.9, 0, 2.5, 0.5, 6, 0.5, M.metalD);
    k.b(0.2, 0, 1.6, 1.3, 0.4, 2.4, M.metalD).b(6.5, 0, 1.6, 1.3, 0.4, 2.4, M.metalD);
    k.b(0.3, 5.5, 2.4, 7.4, 8, 0.6, M.metal);
    k.b(0.6, 5.8, 3.0, 6.8, 7.4, 0.1, M.white);
    k.b(2.8, 6, 3.1, 0.12, 7, 0.05, '#c7c7c7').b(5.0, 6, 3.1, 0.12, 7, 0.05, '#c7c7c7');
    const tints = [M.yellow, M.pink, p.accent, '#9be7a8'];
    const stickies: Array<[number, number]> = [[0.9, 11.4], [0.9, 9.6], [1.6, 7.8], [3.1, 11.4], [3.1, 9.6], [5.3, 11.4], [0.9, 6.3]];
    stickies.forEach(([x, y], i) => k.b(x, y, 3.1, 1.4, 1.3, 0.1, tints[i % tints.length]!));
    k.b(0.6, 13.2, 3.1, 6.8, 0.25, 0.05, p.dark);
    k.b(1.5, 5.2, 3.2, 3, 0.3, 0.6, M.red);
    return k.list;
  },
};

export const plant: Model = {
  spot: 'floor',
  width: 1,
  depth: 1,
  build: (_p, w) => {
    const k = new Blocks();
    const pot = w % 2 === 0 ? M.pot : '#e9e4d8';
    k.b(2.5, 0, 2.5, 3, 3, 3, pot).b(2.3, 2.6, 2.3, 3.4, 0.6, 3.4, darken(pot, 0.12));
    k.b(3.6, 3, 3.6, 0.8, 3, 0.8, M.leavesD);
    k.b(1.6, 5, 2.2, 3, 2.4, 3, M.leaves).b(3.6, 6.2, 3.4, 3, 2.6, 3, M.leavesL);
    k.b(2.6, 8.2, 2.4, 2.6, 2.2, 2.6, M.leaves).b(1.2, 4, 4, 1.8, 1.4, 1.8, M.leavesL);
    k.b(5, 4.6, 2, 1.6, 1.6, 1.8, M.leavesD);
    return k.list;
  },
};

export const cactus: Model = {
  spot: 'desk',
  width: 1,
  depth: 1,
  build: () => {
    const k = new Blocks();
    k.b(0, 0, 0, 1.6, 1.2, 1.6, M.pot);
    k.b(0.4, 1.2, 0.4, 0.8, 2.4, 0.8, '#5aa469').b(-0.2, 2, 0.5, 0.6, 0.4, 0.6, '#5aa469').b(-0.2, 2.4, 0.5, 0.4, 0.8, 0.5, '#5aa469');
    k.b(0.55, 3.6, 0.55, 0.5, 0.4, 0.5, M.pink);
    return k.list;
  },
};

export const mug: Model = {
  spot: 'desk',
  width: 1,
  depth: 1,
  build: (p) => {
    const k = new Blocks();
    k.b(0, 0, 0, 1, 1.3, 1, p.accent).b(1, 0.3, 0.35, 0.3, 0.7, 0.3, p.accent).b(0.15, 1.2, 0.15, 0.7, 0.05, 0.7, '#6f4e37');
    return k.list;
  },
};

export const lamp: Model = {
  spot: 'floor',
  width: 1,
  depth: 1,
  build: (p) => {
    const k = new Blocks();
    k.b(2.8, 0, 2.8, 2.4, 0.5, 2.4, M.black);
    k.b(3.75, 0.5, 3.75, 0.5, 11, 0.5, M.black);
    k.b(2.2, 11, 2.2, 3.6, 2.6, 3.6, mix(p.light, '#ffe8a3', 0.6));
    k.b(2.6, 10.8, 2.6, 2.8, 0.3, 2.8, '#fff3c4');
    return k.list;
  },
};

/** Rug, 2×1 tiles, flat (figures can walk on it). */
export const rug: Model = {
  spot: 'rug',
  width: 2,
  depth: 1,
  build: (p) => {
    const k = new Blocks();
    k.b(0.5, 0, 0.5, 15, 0.3, 7, p.accent);
    k.b(1.5, 0.05, 1.5, 13, 0.3, 5, mix(p.accent, p.light, 0.45));
    k.b(3, 0.1, 3, 10, 0.3, 2, p.accent2);
    return k.list;
  },
};

export const globe: Model = {
  spot: 'floor',
  width: 1,
  depth: 1,
  build: () => {
    const k = new Blocks();
    k.b(2.5, 0, 2.5, 3, 0.6, 3, M.woodD).b(3.6, 0.6, 3.6, 0.8, 4.5, 0.8, M.woodD);
    k.b(2.2, 5, 2.2, 3.6, 3.6, 3.6, '#5ab1d6');
    k.b(2.6, 6.6, 5.7, 1.4, 1.4, 0.15, '#8bc37a').b(4.4, 5.6, 5.7, 1, 1.2, 0.15, '#8bc37a').b(5.7, 6.2, 3, 0.15, 1.6, 1.4, '#8bc37a');
    k.b(1.8, 4.6, 3.75, 0.4, 4.4, 0.5, M.gold).b(5.8, 4.6, 3.75, 0.4, 4.4, 0.5, M.gold);
    return k.list;
  },
};

export const aquarium: Model = {
  spot: 'floor',
  width: 1,
  depth: 1,
  build: () => {
    const k = new Blocks();
    k.b(0.5, 0, 1, 7, 5, 5.5, M.woodD);
    k.b(0.6, 5, 1.1, 6.8, 5, 5.3, M.water);
    k.b(0.6, 5, 1.1, 6.8, 0.8, 5.3, '#e6d3a3');
    k.b(1.4, 5.8, 2, 0.6, 2.6, 0.6, M.leavesL).b(5.6, 5.8, 3, 0.6, 3.4, 0.6, M.leaves);
    k.b(2.8, 8, 6.4, 1.4, 0.8, 0.1, '#ff8c42').b(4.4, 6.8, 6.4, 1.2, 0.7, 0.1, M.yellow);
    k.b(0.4, 10, 1, 7.2, 0.6, 5.5, M.black);
    return k.list;
  },
};

export const parcels: Model = {
  spot: 'floor',
  width: 1,
  depth: 1,
  build: () => {
    const k = new Blocks();
    const box = (x: number, y: number, z: number, w: number, h: number, d: number) => {
      k.b(x, y, z, w, h, d, M.cardboard);
      k.b(x + w / 2 - 0.3, y + h, z, 0.6, 0.05, d, '#e9d8a6');
      k.b(x + 0.4, y + h * 0.4, z + d, w * 0.4, h * 0.3, 0.05, M.paper);
    };
    box(0.5, 0, 0.8, 4, 3.5, 3.6);
    box(4.6, 0, 1.2, 3, 2.8, 3);
    box(1.2, 3.55, 1.2, 3, 2.6, 3);
    box(1.8, 0, 4.6, 3.6, 2.2, 2.8);
    return k.list;
  },
};

export const shoppingCart: Model = {
  spot: 'floor',
  width: 1,
  depth: 1,
  build: (p) => {
    const k = new Blocks();
    const c = p.accent;
    k.b(1, 0.5, 1.5, 6, 0.5, 5, darken(c, 0.2));
    k.b(1, 1, 1.5, 6, 3.5, 0.4, c).b(1, 1, 6.1, 6, 3.5, 0.4, c);
    k.b(1, 1, 1.5, 0.4, 3.5, 5, c).b(6.6, 1, 1.5, 0.4, 3.5, 5, c);
    k.b(1.4, 2.4, 1.9, 5.2, 0.3, 4.2, darken(c, 0.1));
    k.b(1.6, 1, 2.2, 1.6, 3.6, 1.6, M.yellow).b(3.6, 1, 2.6, 2, 4.2, 1.4, M.pink).b(4.6, 1, 4.4, 1.6, 3.2, 1.4, M.green);
    k.b(3.6, 4.5, 3.5, 0.6, 3, 0.6, M.metalD).b(1.6, 7.3, 3.5, 4.6, 0.6, 0.6, M.metalD);
    return k.list;
  },
};

export const toys: Model = {
  spot: 'floor',
  width: 1,
  depth: 1,
  build: () => {
    const k = new Blocks();
    k.b(0.5, 0, 0.6, 3.8, 4.8, 3, '#ffd6a5');
    k.b(0.5, 4.8, 0.6, 3.8, 0.4, 3, M.red);
    // Letter blocks.
    k.b(5, 0, 1, 2, 2, 2, M.red).b(5.6, 2, 1.4, 1.6, 1.6, 1.6, M.blue).b(4.8, 0, 3.6, 1.8, 1.8, 1.8, M.yellow);
    // Teddy bear.
    k.b(1.2, 0, 4.4, 2.6, 2.4, 2, '#b07d4f').b(1.6, 2.4, 4.6, 1.8, 1.8, 1.6, '#c58f5c');
    k.b(1.4, 4.1, 4.8, 0.6, 0.6, 0.4, '#8a5a3b').b(3.0, 4.1, 4.8, 0.6, 0.6, 0.4, '#8a5a3b').b(2.2, 2.9, 6.2, 0.6, 0.5, 0.1, M.black);
    // Ball.
    k.b(5.4, 0, 5.2, 2.2, 2.2, 2.2, M.pink).b(5.4, 0.9, 7.4, 2.2, 0.5, 0.05, M.white);
    return k.list;
  },
};

export const mailbox: Model = {
  spot: 'floor',
  width: 1,
  depth: 1,
  build: (p) => {
    const k = new Blocks();
    k.b(3.5, 0, 3.5, 1, 6, 1, M.woodD);
    k.b(2, 6, 1.5, 4, 3, 5, p.accent);
    k.b(2, 9, 2, 4, 0.6, 4, darken(p.accent, 0.15));
    k.b(2.6, 7.2, 6.5, 2.8, 0.5, 0.1, M.black);
    k.b(6, 7.6, 3, 0.3, 2.6, 0.4, M.red).b(6, 9.8, 3, 0.3, 0.8, 1.4, M.red);
    k.b(3.4, 8.6, 6.3, 1.4, 1.2, 0.5, M.paper);
    return k.list;
  },
};

/** A pile of newspapers on a side table (theme: newsroom). */
export const newspapers: Model = {
  spot: 'floor',
  width: 1,
  depth: 1,
  build: (p) => {
    const k = new Blocks();
    k.b(1, 0, 1.5, 6, 4.5, 5, M.woodL).b(1.4, 0.4, 6.5, 5.2, 3.6, 0.1, darken(M.woodL, 0.2));
    for (let i = 0; i < 5; i++) {
      k.b(1.4 + (i % 2) * 0.4, 4.5 + i * 0.5, 2 + (i % 3) * 0.2, 4.8, 0.45, 3.6, i % 2 === 0 ? M.paper : '#ece6d6');
    }
    k.b(1.8, 7.05, 2.6, 2, 0.05, 0.8, p.dark).b(1.8, 7.05, 3.8, 3.2, 0.05, 0.3, '#9e9a8e').b(4.2, 7.05, 2.6, 1.6, 0.05, 1.2, p.accent);
    return k.list;
  },
};

/** Fallback model for an unknown name: a box with a question mark. */
export const unknown: Model = {
  spot: 'floor',
  width: 1,
  depth: 1,
  build: () => {
    const k = new Blocks();
    k.b(1.5, 0, 1.5, 5, 5, 5, M.cardboard);
    k.b(1.5, 5, 1.5, 5, 0.3, 5, M.cardboardD);
    k.b(3.4, 3.4, 6.5, 1.4, 0.5, 0.1, M.black).b(4.4, 2.6, 6.5, 0.5, 0.9, 0.1, M.black).b(3.7, 2.2, 6.5, 0.8, 0.5, 0.1, M.black);
    k.b(3.7, 0.9, 6.5, 0.6, 0.6, 0.1, M.black);
    return k.list;
  },
};
