// Furniture: desks, chairs, seating, cabinets and shelves. Unit: voxel (1 tile = 8), front towards +z.
import { mix, darken, lighten } from '../palette';
import { Blocks } from '../voxel';
import { M, type Model } from './types';

/** Desk top height in voxels (equipment stands on it). */
export const DESK_TOP = 6;

export const desk: Model = {
  spot: 'floor',
  width: 1,
  depth: 1,
  build: (_p, w) => {
    const k = new Blocks();
    const top = w % 2 === 0 ? M.wood : M.white;
    const legs = w % 2 === 0 ? M.woodD : M.metalD;
    k.b(0, 5, 0.5, 8, 1, 5.5, top);
    k.b(0.5, 0, 1, 1, 5, 1, legs).b(6.5, 0, 1, 1, 5, 1, legs);
    k.b(0.5, 0, 4.5, 1, 5, 1, legs).b(6.5, 0, 4.5, 1, 5, 1, legs);
    // Drawer unit on the right.
    k.b(5, 1, 1, 2.5, 4, 4.5, darken(top, 0.08));
    k.b(5.6, 3.6, 5.5, 1.3, 0.4, 0.1, M.metalD).b(5.6, 1.8, 5.5, 1.3, 0.4, 0.1, M.metalD);
    return k.list;
  },
};

export const bigDesk: Model = {
  spot: 'floor',
  width: 2,
  depth: 1,
  build: (p) => {
    const k = new Blocks();
    const top = M.woodD;
    k.b(0, 5, 0.5, 16, 1, 6.5, top);
    k.b(0, 5.6, 0.5, 16, 0.4, 6.5, darken(top, 0.1));
    // Panelled front with an accent in the project color.
    k.b(0.5, 0, 6, 15, 5, 1, M.wood);
    k.b(1.5, 1, 6.9, 13, 0.6, 0.2, p.accent);
    k.b(0.5, 0, 0.5, 2, 5, 5.5, M.wood).b(13.5, 0, 0.5, 2, 5, 5.5, M.wood);
    // Desk lamp, folders, name plate.
    k.b(1.5, 6, 1.5, 1.5, 0.5, 1.5, M.gold).b(2, 6.5, 2, 0.5, 2.5, 0.5, M.goldD).b(1.2, 8.8, 1.2, 2.2, 1, 2.2, '#2f6e3a');
    k.b(11, 6, 3.5, 3, 0.6, 2.2, M.paper).b(11.3, 6.6, 3.7, 2.6, 0.5, 2, '#e9c46a');
    k.b(6.5, 6, 5.6, 3, 0.9, 0.5, M.gold);
    return k.list;
  },
};

export function chair(color: string): Model {
  return {
    spot: 'floor',
    width: 1,
    depth: 1,
    build: () => {
      const k = new Blocks();
      k.b(3.5, 0, 3.5, 1, 2.5, 1, M.metalD);
      k.b(2, 0, 3.5, 4, 0.5, 1, M.black).b(3.5, 0, 2, 1, 0.5, 4, M.black);
      k.b(2, 2.5, 2, 4, 1, 4, color);
      // Backrest at the front (+z): the seated figure faces −z, towards the desk.
      k.b(2, 3.5, 5.5, 4, 4, 1, color).b(2.5, 4, 5.4, 3, 3, 0.2, darken(color, 0.15));
      return k.list;
    },
  };
}

export const armchair: Model = {
  spot: 'floor',
  width: 1,
  depth: 1,
  build: (p) => {
    const k = new Blocks();
    const c = p.accent;
    k.b(1, 0, 1, 6, 1, 6, darken(c, 0.35));
    k.b(1, 1, 1.5, 6, 2.5, 5, c);
    k.b(1, 3.5, 0.5, 6, 4.5, 2, darken(c, 0.1));
    k.b(0.5, 1, 1, 1.5, 4.5, 6, darken(c, 0.15)).b(6, 1, 1, 1.5, 4.5, 6, darken(c, 0.15));
    k.b(2.5, 3.5, 3, 3, 1, 2.5, lighten(c, 0.25));
    return k.list;
  },
};

export const sofa: Model = {
  spot: 'floor',
  width: 2,
  depth: 1,
  build: (p) => {
    const k = new Blocks();
    const c = p.accent2;
    k.b(0.5, 0, 1, 15, 1, 6, M.woodD);
    k.b(0.5, 1, 1.5, 15, 2.5, 5.5, c);
    k.b(0.5, 3.5, 0.5, 15, 4, 2, darken(c, 0.12));
    k.b(0, 1, 1, 1.5, 4, 6.5, darken(c, 0.18)).b(14.5, 1, 1, 1.5, 4, 6.5, darken(c, 0.18));
    k.b(1.6, 3.5, 2.5, 6.2, 0.6, 4, lighten(c, 0.12)).b(8.2, 3.5, 2.5, 6.2, 0.6, 4, lighten(c, 0.12));
    k.b(2.5, 4.1, 2.4, 2.5, 2.5, 1, p.accent).b(11, 4.1, 2.4, 2.5, 2.5, 1, M.yellow);
    return k.list;
  },
};

export const bookshelf: Model = {
  spot: 'floor',
  width: 1,
  depth: 1,
  build: (p, w) => {
    const k = new Blocks();
    const body = M.wood;
    k.b(0.5, 0, 0.5, 7, 17, 0.6, M.woodD);
    k.b(0.5, 0, 0.5, 0.8, 17, 4, body).b(6.7, 0, 0.5, 0.8, 17, 4, body);
    k.b(0.5, 16.2, 0.5, 7, 0.8, 4, body);
    const colors = [p.accent, p.accent2, M.red, M.green, M.white, M.blue, M.yellow, p.dark];
    for (let shelf = 0; shelf < 4; shelf++) {
      const y = shelf * 4;
      k.b(0.5, y, 0.5, 7, 0.6, 4, body);
      let x = 1.3;
      let n = shelf * 3 + w;
      while (x < 6.4) {
        const sz = 0.6 + ((n * 7) % 3) * 0.2;
        const height = 2.4 + ((n * 5) % 4) * 0.3;
        if ((n + shelf) % 7 !== 3) k.b(x, y + 0.6, 1.2, Math.min(sz, 6.7 - x), height, 3, colors[n % colors.length]!);
        x += sz + 0.1;
        n++;
      }
    }
    return k.list;
  },
};

export const fileCabinet: Model = {
  spot: 'floor',
  width: 1,
  depth: 1,
  build: () => {
    const k = new Blocks();
    k.b(1.5, 0, 1, 5, 12, 5, M.metal);
    for (let i = 0; i < 4; i++) {
      const y = 0.5 + i * 2.9;
      k.b(1.8, y, 5.9, 4.4, 2.5, 0.2, lighten(M.metal, 0.15));
      k.b(3.3, y + 1.6, 6.05, 1.4, 0.4, 0.3, M.metalD);
      k.b(3.6, y + 0.6, 6.05, 0.8, 0.6, 0.15, M.paper);
    }
    k.b(2.2, 12, 2, 2.5, 1.2, 2, '#e9c46a');
    return k.list;
  },
};

export const binders: Model = {
  spot: 'floor',
  width: 1,
  depth: 1,
  build: (p) => {
    const k = new Blocks();
    // Open cabinet: back, sides, shelves (the binders are visible from the front).
    k.b(0.5, 0, 1, 7, 8, 0.6, darken(M.woodL, 0.25));
    k.b(0.5, 0, 1, 0.6, 8, 4.5, M.woodL).b(6.9, 0, 1, 0.6, 8, 4.5, M.woodL);
    k.b(0.5, 0, 1, 7, 0.5, 4.5, M.woodL).b(0.5, 3.9, 1, 7, 0.4, 4.5, M.woodL).b(0.5, 7.6, 1, 7, 0.4, 4.5, M.woodL);
    const colors = [p.accent, M.blue, M.red, p.accent2, M.green, M.yellow];
    for (let r = 0; r < 2; r++) {
      for (let i = 0; i < 6; i++) {
        const c = colors[(i + r * 2) % colors.length]!;
        k.b(1.2 + i * 0.95, 0.5 + r * 3.8, 1.6, 0.85, 3.2, 3.6, c);
        k.b(1.4 + i * 0.95, 1.6 + r * 3.8, 5.2, 0.45, 0.8, 0.1, M.white);
      }
    }
    return k.list;
  },
};

export const safe: Model = {
  spot: 'floor',
  width: 1,
  depth: 1,
  build: () => {
    const k = new Blocks();
    k.b(1.5, 0, 1.5, 5, 6, 5, '#4a4e69');
    k.b(1.9, 0.4, 6.4, 4.2, 5.2, 0.2, '#5c6185');
    k.b(3.4, 2.4, 6.6, 1.2, 1.2, 0.4, M.gold);
    k.b(4.8, 1.8, 6.6, 0.4, 2.4, 0.3, M.metal);
    return k.list;
  },
};

export const coffeeMachine: Model = {
  spot: 'floor',
  width: 1,
  depth: 1,
  build: (p) => {
    const k = new Blocks();
    // Kitchen cabinet with a worktop.
    k.b(0.5, 0, 1, 7, 6, 5.5, mix(p.accent2, M.white, 0.5));
    k.b(0.3, 6, 0.8, 7.4, 0.6, 6, M.woodL);
    k.b(3.9, 0.6, 6.5, 0.2, 5, 0.1, darken(p.accent2, 0.3));
    // Coffee machine.
    k.b(1.2, 6.6, 1.4, 3.2, 4.5, 3.2, M.black);
    k.b(1.5, 7.2, 4.5, 2.6, 1.5, 0.4, M.metal);
    k.b(2.2, 7.1, 3.6, 1.2, 1.2, 1.2, M.white);
    k.b(1.6, 10.2, 4.6, 0.8, 0.5, 0.1, M.green);
    // Mugs.
    k.b(5.4, 6.6, 2.5, 1, 1.2, 1, M.red).b(5.8, 6.6, 4.2, 1, 1.2, 1, p.accent);
    return k.list;
  },
};

export const bin: Model = {
  spot: 'floor',
  width: 1,
  depth: 1,
  build: (p) =>
    new Blocks()
      .b(2.8, 0, 2.8, 2.4, 2.8, 2.4, mix(p.accent2, M.white, 0.3))
      .b(3.0, 2.7, 3.0, 2.0, 0.15, 2.0, darken(p.accent2, 0.3))
      .b(3.2, 2.85, 3.3, 0.9, 0.8, 0.9, M.paper)
      .b(4.1, 2.85, 3.6, 0.7, 0.6, 0.7, '#e9e2cf').list,
};
