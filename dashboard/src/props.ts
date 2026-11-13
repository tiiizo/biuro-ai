/**
 * Allowed room props (kebab-case). A name outside this list in `office.md` gives a warning and is
 * skipped. Every name has a voxel model in src/models (coverage test: test/models.test.ts).
 */
export const PROPS = [
  'big-desk',
  'desk',
  'armchair',
  'sofa',
  'rug',
  'lamp',
  'window',
  'clock',
  'calendar',
  'plant',
  'cactus',
  'bookshelf',
  'file-cabinet',
  'binders',
  'safe',
  'cork-board',
  'kanban-board',
  'monitor',
  'dual-monitors',
  'laptop',
  'server',
  'router',
  'printer',
  'phone',
  'coffee-machine',
  'mug',
  'world-map',
  'globe',
  'poster',
  'trophy',
  'aquarium',
  'parcels',
  'shopping-cart',
  'toys',
  'robot',
  'mailbox',
] as const;

export type Prop = (typeof PROPS)[number];

const SET = new Set<string>(PROPS);

export function isProp(name: string): name is Prop {
  return SET.has(name);
}
