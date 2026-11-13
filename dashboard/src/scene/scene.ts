// Renderer, isometric camera and animation loop.
//
// Pixel art: the scene is rendered without antialiasing (pixelRatio 1) and scaled in CSS by an integer
// factor with `image-rendering: pixelated`. `renderScale` (src/resolution.ts) picks the factor by zoom:
// 1 in the whole-building view (sharper), 2 in close-ups (chunky pixels).
// Orthographic camera 30° above the horizon, azimuth 45° (2:1 projection, typical for isometric pixel art).
import { roomAlarm } from '../alarm';
import {
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  Raycaster,
  Scene,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Object3D,
} from 'three';
import type { Office } from '../schema';
import { BUILDING_COLORS, buildBuilding, type BuildingMesh, type SceneRoom } from './building';
import { blockGeometry } from './geometry';
import { WALL_HEIGHT } from '../layout';
import { frameDue } from '../loop';
import { renderScale } from '../resolution';
import { TO_CAMERA, roomUnderRay, roomBox, slabBox, type Box } from '../picking';

const CAMERA_DIRECTION = new Vector3(TO_CAMERA.x, TO_CAMERA.y, TO_CAMERA.z);

export type SceneOptions = {
  /** Name of a room or a floor the camera should focus on (screenshots). */
  focus?: string;
  /** Zoom relative to the whole-building view (1 = the whole building). */
  zoom?: number;
  /** false = no animation (prefers-reduced-motion or ?animation=0). */
  animation: boolean;
  /** "Today" for date-dependent rules (default: the current date). */
  today: Date;
};

/** A scene element that knows its behaviour over time (figures, lamps). */
export type Animated = { update(t: number): void };

/** Extension of the scene with room interiors; the building shell works without it. */
export type Interior = (building: BuildingMesh, options: SceneOptions) => { objects: Object3D[]; animated: Animated[] };

type Label = { el: HTMLElement; point: Vector3; room?: SceneRoom };

/** Pointer events over rooms: tooltip on hover, panel on click. */
export type RoomHandlers = {
  hover(room: SceneRoom | undefined, x: number, y: number): void;
  click(room: SceneRoom): void;
};

/** Movement (px) above which pressing the pointer is a drag, not a click. */
const DRAG_THRESHOLD = 4;

export class OfficeScene {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
  private readonly labelLayer: HTMLElement;
  private building = new Group();
  private labels: Label[] = [];
  private animated: Animated[] = [];
  private options: SceneOptions = { animation: true, today: new Date() };
  private mesh: BuildingMesh | undefined;
  private centre = new Vector3();
  private halfView = 10;
  private zoom = 1;
  private pan = new Vector3();
  private dirty = true;
  private lastFrame = Number.NEGATIVE_INFINITY;
  private hidden = false;
  private scale = 0;
  private cssSize = { w: 0, h: 0 };
  private interior: Interior | undefined;
  private handlers: RoomHandlers | undefined;
  private roomBoxes: Box[] = [];
  private slabBoxes: Box[] = [];
  private readonly raycaster = new Raycaster();

  constructor(private readonly container: HTMLElement) {
    this.renderer = new WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = SRGBColorSpace;
    // Transparent background: the sky is a CSS gradient under the canvas (index.html).
    this.renderer.setClearColor(BUILDING_COLORS.sky, 0);
    this.renderer.domElement.className = 'scene';
    this.labelLayer = document.createElement('div');
    this.labelLayer.className = 'labels';
    container.append(this.renderer.domElement, this.labelLayer);
    this.scene.add(this.building);
    this.camera.up.set(0, 1, 0);
    this.attachControls();
    window.addEventListener('resize', () => this.fitCamera());
    this.fitCamera();
    this.resumeLoop();
  }

  private resumeLoop(): void {
    this.renderer.setAnimationLoop((t) => this.frame(t));
  }

  setInterior(i: Interior): void {
    this.interior = i;
  }

  setRoomHandlers(h: RoomHandlers): void {
    this.handlers = h;
  }

  /** The room under a screen point (clientX/clientY), or undefined. */
  roomAt(clientX: number, clientY: number): SceneRoom | undefined {
    const b = this.mesh;
    if (!b) return undefined;
    const r = this.renderer.domElement.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return undefined;
    const ndc = new Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const { origin, direction } = this.raycaster.ray;
    const i = roomUnderRay({ origin, direction }, this.roomBoxes, this.slabBoxes);
    return i === undefined ? undefined : b.rooms[i];
  }

  /** Highlights a room label (hover, open panel). */
  highlight(room: SceneRoom | undefined): void {
    for (const l of this.labels) {
      if (l.room) l.el.classList.toggle('highlighted', l.room === room);
    }
  }

  /** Builds the scene from scratch (also called when office.md is reloaded). */
  show(office: Office, options: SceneOptions): SceneRoom[] {
    const first = this.mesh === undefined;
    this.options = options;
    this.dispose(this.building);
    this.scene.remove(this.building);
    this.building = new Group();
    this.scene.add(this.building);

    const mesh = buildBuilding(office);
    this.mesh = mesh;
    this.roomBoxes = mesh.rooms.map((r) => roomBox(r.layout, r.floor.y));
    this.slabBoxes = mesh.layout.floors.map((f) => slabBox(f.bounds, f.y));

    this.building.add(new Mesh(blockGeometry(mesh.solid.list), new MeshBasicMaterial({ vertexColors: true })));
    const glass = new Mesh(
      blockGeometry(mesh.glass.list),
      new MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.45, side: DoubleSide, depthWrite: false }),
    );
    glass.renderOrder = 1;
    this.building.add(glass);

    this.animated = [];
    if (this.interior) {
      const i = this.interior(mesh, options);
      for (const o of i.objects) this.building.add(o);
      this.animated = i.animated;
    }

    this.buildLabels(mesh);
    if (first) {
      this.zoom = options.zoom ?? 1;
      this.pan.set(0, 0, 0);
    }
    this.fitCamera();
    this.dirty = true;
    return mesh.rooms;
  }

  /**
   * A hidden scene (list view, office.md error) renders nothing: the rAF loop stops. Changes made meanwhile
   * (`dirty`: data, window size) are drawn in the first frame after it is shown again.
   */
  hide(hidden: boolean): void {
    this.renderer.domElement.style.visibility = hidden ? 'hidden' : 'visible';
    this.labelLayer.style.visibility = hidden ? 'hidden' : 'visible';
    if (hidden === this.hidden) return;
    this.hidden = hidden;
    if (hidden) {
      this.renderer.setAnimationLoop(null);
    } else {
      this.dirty = true;
      this.resumeLoop();
    }
  }

  private buildLabels(mesh: BuildingMesh): void {
    this.labelLayer.replaceChildren();
    this.labels = [];
    for (const r of mesh.rooms) {
      const el = document.createElement('div');
      // A room with an alarm: a red label with "!", so the alarm is visible without hovering.
      const alarm = roomAlarm(r.room.tasks, this.options.today).alarm;
      el.className = alarm ? 'label alarm' : 'label';
      el.textContent = alarm ? `! ${r.room.name}` : r.room.name;
      el.style.setProperty('--accent', r.palette.accent);
      this.labelLayer.append(el);
      const l = r.layout;
      // Below the front edge of the room floor: it does not cover the interior and is not confused with the floor above.
      this.labels.push({ el, point: new Vector3(l.x + l.w, r.floor.y, l.z + l.d), room: r });
    }
    for (const f of mesh.layout.floors) {
      const el = document.createElement('div');
      el.className = 'label floor';
      el.textContent = f.name;
      this.labelLayer.append(el);
      // Right corner of the slab: the label sticks out into the sky and does not cover rooms.
      this.labels.push({ el, point: new Vector3(f.bounds.x + f.bounds.w, f.y - 0.2, f.bounds.z) });
    }
  }

  /** Centre and size of the view: the whole building or the given room/floor. */
  private fitCamera(): void {
    const b = this.mesh;
    if (!b) return;
    const g = b.layout.bounds;
    let min = new Vector3(g.minX, -0.5, g.minZ);
    let max = new Vector3(g.maxX, g.height + 2.5, g.maxZ);
    const focus = this.options.focus?.toLowerCase();
    if (focus) {
      const floor = b.layout.floors.find((f) => f.name.toLowerCase() === focus);
      const room = b.rooms.find((r) => r.room.name.toLowerCase() === focus);
      if (floor) {
        min = new Vector3(floor.bounds.x, floor.y, floor.bounds.z);
        max = new Vector3(floor.bounds.x + floor.bounds.w, floor.y + WALL_HEIGHT + 1, floor.bounds.z + floor.bounds.d);
      } else if (room) {
        const l = room.layout;
        min = new Vector3(l.x - 1, room.floor.y, l.z - 1);
        max = new Vector3(l.x + l.w + 1, room.floor.y + WALL_HEIGHT + 1, l.z + l.d + 1);
      }
    }
    this.centre.copy(min).add(max).multiplyScalar(0.5);
    // Project the corners onto the camera screen axes.
    this.placeCamera(this.centre);
    this.camera.updateMatrixWorld();
    const right = new Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
    const up = new Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);
    let maxX = 0;
    let maxY = 0;
    for (const x of [min.x, max.x]) {
      for (const y of [min.y, max.y]) {
        for (const z of [min.z, max.z]) {
          const v = new Vector3(x, y, z).sub(this.centre);
          maxX = Math.max(maxX, Math.abs(v.dot(right)));
          maxY = Math.max(maxY, Math.abs(v.dot(up)));
        }
      }
    }
    const aspect = this.aspect();
    this.halfView = Math.max(maxY, maxX / aspect) * 1.06;
    this.updateProjection();
  }

  private placeCamera(target: Vector3): void {
    this.camera.position.copy(target).addScaledVector(CAMERA_DIRECTION, 200);
    this.camera.lookAt(target);
  }

  private cssDimensions(): { w: number; h: number } {
    return {
      w: Math.max(1, this.container.clientWidth || window.innerWidth),
      h: Math.max(1, this.container.clientHeight || window.innerHeight),
    };
  }

  private aspect(): number {
    const { w, h } = this.cssDimensions();
    return w / h;
  }

  private updateProjection(): void {
    const aspect = this.aspect();
    const h = this.halfView / this.zoom;
    this.camera.left = -h * aspect;
    this.camera.right = h * aspect;
    this.camera.top = h;
    this.camera.bottom = -h;
    this.camera.near = 1;
    this.camera.far = 600;
    const target = this.centre.clone().add(this.pan);
    this.camera.updateProjectionMatrix();
    this.placeCamera(target);
    this.camera.updateMatrixWorld();
    this.fitResolution(h);
    this.dirty = true;
  }

  /** Render buffer size by window and zoom; the canvas changes only when the scale or the window changes. */
  private fitResolution(halfHeight: number): void {
    const { w, h } = this.cssDimensions();
    const scale = renderScale({ width: w, height: h, pixelsPerTile: h / (2 * halfHeight) });
    if (scale === this.scale && w === this.cssSize.w && h === this.cssSize.h) return;
    this.scale = scale;
    this.cssSize = { w, h };
    const rw = Math.ceil(w / scale);
    const rh = Math.ceil(h / scale);
    this.renderer.setSize(rw, rh, false);
    const c = this.renderer.domElement;
    c.style.width = `${rw * scale}px`;
    c.style.height = `${rh * scale}px`;
  }

  private attachControls(): void {
    const c = this.renderer.domElement;
    c.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.zoom = Math.min(8, Math.max(0.6, this.zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
        this.updateProjection();
      },
      { passive: false },
    );
    let drag: { x: number; y: number } | undefined;
    // Start of a press: a click = release close to where it was pressed (otherwise the view is dragged).
    let press: { x: number; y: number; dragging: boolean } | undefined;
    const hover = (e: PointerEvent) => {
      const r = this.roomAt(e.clientX, e.clientY);
      c.classList.toggle('over-room', r !== undefined);
      this.handlers?.hover(r, e.clientX, e.clientY);
    };
    c.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      drag = { x: e.clientX, y: e.clientY };
      press = { x: e.clientX, y: e.clientY, dragging: false };
      c.setPointerCapture(e.pointerId);
    });
    c.addEventListener('pointermove', (e) => {
      if (!drag) {
        hover(e);
        return;
      }
      if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > DRAG_THRESHOLD) {
        press.dragging = true;
        this.handlers?.hover(undefined, e.clientX, e.clientY);
      }
      const unitsPerPixel = (this.camera.right - this.camera.left) / c.clientWidth;
      const right = new Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
      const up = new Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);
      this.pan
        .addScaledVector(right, -(e.clientX - drag.x) * unitsPerPixel)
        .addScaledVector(up, (e.clientY - drag.y) * unitsPerPixel);
      drag = { x: e.clientX, y: e.clientY };
      this.updateProjection();
    });
    c.addEventListener('pointerup', (e) => {
      const click = press && !press.dragging;
      drag = undefined;
      press = undefined;
      if (!click) return;
      const r = this.roomAt(e.clientX, e.clientY);
      if (r) this.handlers?.click(r);
    });
    c.addEventListener('pointercancel', () => {
      drag = undefined;
      press = undefined;
    });
    c.addEventListener('pointerleave', () => {
      c.classList.remove('over-room');
      if (!drag) this.handlers?.hover(undefined, 0, 0);
    });
    c.addEventListener('dblclick', () => {
      this.zoom = this.options.zoom ?? 1;
      this.pan.set(0, 0, 0);
      this.updateProjection();
    });
  }

  private frame(t: number): void {
    const animate = this.options.animation && this.animated.length > 0;
    // One FPS limit (src/loop.ts) for animation and for dirty frames (dragging, mouse wheel).
    if (!frameDue({ dirty: this.dirty, animate, t, last: this.lastFrame })) return;
    this.lastFrame = t;
    const s = t / 1000;
    for (const a of this.animated) a.update(this.options.animation ? s : 0);
    this.renderer.render(this.scene, this.camera);
    if (this.dirty) this.placeLabels();
    this.dirty = false;
  }

  private placeLabels(): void {
    const c = this.renderer.domElement;
    const v = new Vector3();
    for (const l of this.labels) {
      v.copy(l.point).project(this.camera);
      const x = Math.round(((v.x + 1) / 2) * c.clientWidth);
      const y = Math.round(((1 - v.y) / 2) * c.clientHeight);
      l.el.style.transform = `translate(${x}px, ${y}px)`;
    }
  }

  private dispose(o: Object3D): void {
    o.traverse((d) => {
      if (d instanceof Mesh) {
        d.geometry.dispose();
        const m = d.material as MeshBasicMaterial | MeshBasicMaterial[];
        for (const mat of Array.isArray(m) ? m : [m]) mat.dispose();
      }
    });
  }
}
