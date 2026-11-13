// Library of voxel models generated in code.
// Every name from src/props.ts has a model (checked by the Record<Prop, Model> type and a coverage test);
// an unknown name gives the fallback model and one console warning, without an exception.
import type { Prop } from '../props';
import * as d from './decor';
import * as f from './furniture';
import * as t from './tech';
import type { Model } from './types';

export type { Spot, Model } from './types';
export { DESK_TOP, chair } from './furniture';

export const PROP_MODELS: Readonly<Record<Prop, Model>> = {
  'big-desk': f.bigDesk,
  desk: f.desk,
  armchair: f.armchair,
  sofa: f.sofa,
  rug: d.rug,
  lamp: d.lamp,
  window: d.windowFrame,
  clock: d.clock,
  calendar: d.calendar,
  plant: d.plant,
  cactus: d.cactus,
  bookshelf: f.bookshelf,
  'file-cabinet': f.fileCabinet,
  binders: f.binders,
  safe: f.safe,
  'cork-board': d.corkBoard,
  'kanban-board': d.kanbanBoard,
  monitor: t.monitor,
  'dual-monitors': t.dualMonitors,
  laptop: t.laptop,
  server: t.server,
  router: t.router,
  printer: t.printer,
  phone: t.phone,
  'coffee-machine': f.coffeeMachine,
  mug: d.mug,
  'world-map': d.worldMap,
  globe: d.globe,
  poster: d.poster,
  trophy: d.trophy,
  aquarium: d.aquarium,
  parcels: d.parcels,
  'shopping-cart': d.shoppingCart,
  toys: d.toys,
  robot: t.robot,
  mailbox: d.mailbox,
};

/** Internal models: they come from the room theme or fill free space (they are not in office.md). */
export const EXTRA_MODELS = {
  camera: t.camera,
  'cash-register': t.cashRegister,
  newspapers: d.newspapers,
  diploma: d.diploma,
  chalkboard: d.chalkboard,
  bin: f.bin,
} as const satisfies Record<string, Model>;

export type ExtraName = keyof typeof EXTRA_MODELS;

export const FALLBACK_MODEL: Model = d.unknown;

const MODELS: ReadonlyMap<string, Model> = new Map<string, Model>([
  ...Object.entries(PROP_MODELS),
  ...Object.entries(EXTRA_MODELS),
]);

const warned = new Set<string>();

/**
 * The model for a prop name. An unknown name → the fallback model + one warning per name
 * (the parser skips unknown props with a warning anyway; this is a second line of defence, e.g. after the
 * list changes).
 */
export function propModel(name: string, warn: (text: string) => void = console.warn): { model: Model; known: boolean } {
  const model = MODELS.get(name);
  if (model) return { model, known: true };
  if (!warned.has(name)) {
    warned.add(name);
    warn(`Unknown prop "${name}" — using the fallback model.`);
  }
  return { model: FALLBACK_MODEL, known: false };
}
