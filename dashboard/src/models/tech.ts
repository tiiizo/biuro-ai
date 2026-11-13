// Equipment: monitors, laptop, server, router, printer, phone, robot, camera, cash register.
// Workstation equipment (`equipment`) and small desk items (`desk`) have y = 0 on the desk top.
import { darken } from '../palette';
import { Blocks } from '../voxel';
import { M, type Model } from './types';

function display(k: Blocks, x: number, z: number, width: number, screenColor: string, bezel: string): void {
  k.b(x + width / 2 - 0.5, 0, z, 1, 1.4, 0.8, bezel);
  k.b(x + width / 2 - 1.2, 0, z - 0.4, 2.4, 0.3, 1.6, bezel);
  k.b(x, 1.4, z, width, 3.4, 0.5, bezel);
  k.b(x + 0.3, 1.7, z + 0.5, width - 0.6, 2.8, 0.1, screenColor);
  // Lines of "code" on the screen.
  k.b(x + 0.7, 3.8, z + 0.55, width * 0.45, 0.3, 0.06, '#ffffff');
  k.b(x + 0.7, 3.0, z + 0.55, width * 0.6, 0.3, 0.06, darken(screenColor, 0.35));
  k.b(x + 0.7, 2.2, z + 0.55, width * 0.35, 0.3, 0.06, '#ffffff');
}

/** Monitor with a keyboard. The desk is 8 voxels deep, the seated figure is on the +z side. */
export const monitor: Model = {
  spot: 'equipment',
  width: 1,
  depth: 1,
  build: (p) => {
    const k = new Blocks();
    display(k, 1.5, 1.6, 5, M.display, M.black);
    k.b(2, 0, 4.4, 4, 0.3, 1.3, M.metalD).b(6.2, 0, 4.6, 0.8, 0.3, 1, p.dark);
    return k.list;
  },
};

export const dualMonitors: Model = {
  spot: 'equipment',
  width: 1,
  depth: 1,
  build: () => {
    const k = new Blocks();
    display(k, 0.2, 1.8, 3.8, M.display, M.black);
    display(k, 4.0, 1.8, 3.8, '#9be7a8', M.black);
    k.b(2, 0, 4.6, 4, 0.3, 1.2, M.metalD);
    return k.list;
  },
};

export const laptop: Model = {
  spot: 'equipment',
  width: 1,
  depth: 1,
  build: (p) => {
    const k = new Blocks();
    k.b(2, 0, 2.6, 4, 0.3, 2.6, M.metal);
    k.b(2, 0.3, 2.4, 4, 2.8, 0.3, M.metal);
    k.b(2.3, 0.6, 2.7, 3.4, 2.2, 0.08, M.display);
    k.b(2.6, 1.9, 2.8, 2, 0.25, 0.05, '#ffffff');
    // Notepad and pen next to it.
    k.b(6.3, 0, 3, 1.4, 0.2, 1.8, M.paper).b(6.5, 0.2, 3.2, 1, 0.1, 0.2, p.accent);
    return k.list;
  },
};

export const phone: Model = {
  spot: 'desk',
  width: 1,
  depth: 1,
  build: () => {
    const k = new Blocks();
    k.b(0, 0, 0, 1.8, 0.8, 1.5, M.black);
    k.b(0.1, 0.8, 0.1, 1.6, 0.5, 0.5, '#3d3a4b');
    k.b(0.3, 0.8, 0.8, 1.2, 0.1, 0.6, M.display);
    return k.list;
  },
};

export const router: Model = {
  spot: 'desk',
  width: 1,
  depth: 1,
  build: () => {
    const k = new Blocks();
    k.b(0, 0, 0, 2, 0.6, 1.4, M.white);
    k.b(0.2, 0.6, 0.2, 0.2, 1.8, 0.2, M.black).b(1.6, 0.6, 0.2, 0.2, 1.8, 0.2, M.black);
    k.b(0.4, 0.3, 1.4, 0.2, 0.15, 0.05, M.green).b(0.9, 0.3, 1.4, 0.2, 0.15, 0.05, M.green).b(1.4, 0.3, 1.4, 0.2, 0.15, 0.05, M.yellow);
    return k.list;
  },
};

export const server: Model = {
  spot: 'floor',
  width: 1,
  depth: 1,
  build: (p) => {
    const k = new Blocks();
    k.b(1, 0, 0.8, 6, 16, 6, '#2b2d42');
    k.b(1, 16, 0.8, 6, 0.5, 6, p.accent);
    for (let i = 0; i < 6; i++) {
      const y = 1 + i * 2.5;
      k.b(1.4, y, 6.8, 5.2, 2, 0.2, '#3d405b');
      k.b(1.8, y + 0.8, 7, 0.4, 0.4, 0.1, i % 3 === 0 ? M.yellow : M.green);
      k.b(2.6, y + 0.8, 7, 0.4, 0.4, 0.1, M.green);
      k.b(3.4, y + 0.8, 7, 0.4, 0.4, 0.1, i % 2 === 0 ? M.blue : M.green);
      k.b(4.4, y + 0.7, 7, 1.8, 0.6, 0.08, '#8d99ae');
    }
    return k.list;
  },
};

export const printer: Model = {
  spot: 'floor',
  width: 1,
  depth: 1,
  build: () => {
    const k = new Blocks();
    k.b(1, 0, 1, 6, 5, 5.5, M.metalD);
    k.b(1.4, 0.5, 6.5, 5.2, 4, 0.1, '#6c778d');
    k.b(0.8, 5, 0.8, 6.4, 2.8, 5.5, M.white);
    k.b(1.6, 7.8, 1.2, 4.8, 0.4, 3.5, '#d9d6cf');
    k.b(2.2, 6.5, 6.2, 3.6, 0.4, 1.4, M.paper);
    k.b(5.6, 7.8, 4.4, 1.2, 0.2, 1.4, M.black).b(6.0, 8.0, 5.2, 0.4, 0.1, 0.4, M.green);
    return k.list;
  },
};

export const robot: Model = {
  spot: 'floor',
  width: 1,
  depth: 1,
  build: (p) => {
    const k = new Blocks();
    const casing = '#cfd6e0';
    k.b(2, 0, 2.5, 1.4, 3, 1.6, M.metalD).b(4.6, 0, 2.5, 1.4, 3, 1.6, M.metalD);
    k.b(1.5, 3, 2, 5, 4.5, 3.5, casing);
    k.b(2.5, 4, 5.5, 3, 2, 0.2, p.accent);
    k.b(0.6, 3.6, 2.8, 0.9, 3.2, 1.6, M.metalD).b(6.5, 3.6, 2.8, 0.9, 3.2, 1.6, M.metalD);
    k.b(2.3, 7.5, 2.4, 3.4, 3, 3, casing);
    k.b(2.8, 8.6, 5.4, 0.9, 0.9, 0.1, '#ff4d6d').b(4.3, 8.6, 5.4, 0.9, 0.9, 0.1, '#ff4d6d');
    k.b(3.8, 10.5, 3.8, 0.4, 1.4, 0.4, M.metalD).b(3.6, 11.9, 3.6, 0.8, 0.8, 0.8, M.red);
    return k.list;
  },
};

/** Camera on a tripod (theme: photography). */
export const camera: Model = {
  spot: 'floor',
  width: 1,
  depth: 1,
  build: () => {
    const k = new Blocks();
    k.b(3.6, 0, 1.5, 0.4, 9, 0.4, M.black).b(1.6, 0, 5.4, 0.4, 9, 0.4, M.black).b(5.8, 0, 5.4, 0.4, 9, 0.4, M.black);
    k.b(2.2, 8.5, 2.5, 3.6, 0.6, 3, M.black);
    k.b(2, 9.1, 2.6, 4, 2.6, 2.4, '#3d3a4b');
    k.b(3.2, 9.6, 5, 1.6, 1.6, 1.4, M.black).b(3.5, 9.9, 6.4, 1, 1, 0.1, M.screenD);
    k.b(2.3, 11.7, 3, 1, 0.5, 1, M.metal);
    // Reflector/softbox next to it.
    k.b(6.6, 0, 1, 0.3, 11, 0.3, M.metalD).b(5.6, 10, 0.4, 2.4, 2.6, 1.2, M.white);
    return k.list;
  },
};

/** Cash register on a counter (theme: shop). */
export const cashRegister: Model = {
  spot: 'floor',
  width: 1,
  depth: 1,
  build: (p) => {
    const k = new Blocks();
    k.b(0.5, 0, 1, 7, 7, 5.5, M.woodL);
    k.b(0.5, 2, 6.5, 7, 1, 0.1, p.accent);
    k.b(0.3, 7, 0.8, 7.4, 0.6, 6, M.wood);
    k.b(1.5, 7.6, 1.5, 4, 1.4, 3.5, M.black);
    k.b(1.8, 9, 1.6, 3.4, 2, 1, '#3d3a4b').b(2.1, 9.3, 2.6, 2.8, 1.3, 0.1, M.green);
    k.b(2, 9, 3.2, 3, 0.3, 1.6, M.metal);
    k.b(5.8, 7.6, 2.5, 1.4, 1, 2, M.paper);
    return k.list;
  },
};
