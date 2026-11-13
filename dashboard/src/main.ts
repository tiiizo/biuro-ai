// Office dashboard: the isometric scene from ../office.md, rebuilt without a restart after every change of the file.
// A parser error = a readable message on the page instead of an empty scene.
// Content from office.md reaches the DOM only through textContent (no innerHTML).
// Interactions (tooltip, panel, copying and list view): src/ui/overlay.ts.
import officeMd, { example as officeIsExample } from 'virtual:office-md';
import { formatMessage, parseOffice } from './parse';
import type { SceneRoom } from './scene/building';
import { OfficeScene, type SceneOptions } from './scene/scene';
import { interior } from './scene/interior';
import { el } from './ui/dom';
import { Overlay, roomKey, type RoomView } from './ui/overlay';
import { furnishingWarnings } from './furnishing';
import { linkWarnings } from './tasks';
import { EXAMPLE_NOTE } from './office-file';

/** Options from the address: ?focus=Clients&zoom=2&animation=0&today=2026-11-13 (e.g. for screenshots). */
function optionsFromUrl(): SceneOptions {
  const q = new URLSearchParams(window.location.search);
  const zoom = Number(q.get('zoom'));
  const today = q.get('today');
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const focus = q.get('focus');
  return {
    ...(focus ? { focus } : {}),
    ...(Number.isFinite(zoom) && zoom > 0 ? { zoom } : {}),
    animation: q.get('animation') !== '0' && !reducedMotion,
    today: today && /^\d{4}-\d{2}-\d{2}$/.test(today) ? new Date(`${today}T12:00:00Z`) : new Date(),
  };
}

const container = document.getElementById('scene')!;
const header = document.getElementById('header')!;
const errorPanel = document.getElementById('error')!;
const scene = new OfficeScene(container);
scene.setInterior(interior);

const view = (r: SceneRoom): RoomView => ({ room: r.room, floor: r.floor.name });
let sceneRooms: SceneRoom[] = [];
let hiddenByError = false;
let hiddenByList = false;
const refreshVisibility = () => {
  scene.hide(hiddenByError || hiddenByList);
  container.setAttribute('aria-hidden', String(hiddenByList));
};
const overlay = new Overlay(
  document.getElementById('tooltip')!,
  document.getElementById('panel')!,
  document.getElementById('list')!,
  document.getElementById('toggle') as HTMLButtonElement,
  document.getElementById('toast')!,
  document.getElementById('announcer')!,
  {
    highlight: (key) => scene.highlight(sceneRooms.find((r) => roomKey(view(r)) === key)),
    hideScene: (hidden) => {
      hiddenByList = hidden;
      refreshVisibility();
    },
  },
);
scene.setRoomHandlers({
  hover: (r, x, y) => overlay.showTooltip(r ? view(r) : undefined, x, y),
  click: (r) => overlay.openPanel(view(r)),
});

function hideScene(hidden: boolean): void {
  hiddenByError = hidden;
  refreshVisibility();
}

function load(text: string, example: boolean): void {
  const result = parseOffice(text);
  header.replaceChildren(el('strong', 'AI office'));
  if (example) header.append(el('span', EXAMPLE_NOTE, 'example-note'));
  // Warnings from the parser, links outside GitHub and furnishing (props or agents that did not fit in a room).
  const warnings = result.warnings.map(formatMessage);
  if (result.ok) {
    warnings.push(...linkWarnings(result.office));
    try {
      warnings.push(...furnishingWarnings(result.office));
    } catch (e) {
      warnings.push(`could not check the furnishing: ${String(e)}`);
    }
  }
  if (warnings.length > 0) {
    const details = el('details', undefined, 'warnings');
    details.append(el('summary', `warnings: ${warnings.length}`));
    for (const w of warnings) details.append(el('div', w));
    header.append(details);
  }
  if (!result.ok) {
    errorPanel.replaceChildren(
      el('h2', `${example ? 'office.example.md' : 'office.md'} has errors`),
      el('pre', result.errors.map(formatMessage).join('\n')),
      el('p', 'Fix the file — the scene reloads by itself once it is saved.'),
    );
    errorPanel.hidden = false;
    hideScene(true);
    overlay.setData(undefined, new Date());
    return;
  }
  const { office } = result;
  header.append(el('span', `updated ${office.updated.date} ${office.updated.time} UTC · ${office.updated.author}`));
  errorPanel.hidden = true;
  hideScene(false);
  const options = optionsFromUrl();
  try {
    sceneRooms = scene.show(office, options);
  } catch (e) {
    sceneRooms = [];
    errorPanel.replaceChildren(el('h2', 'Could not build the scene'), el('pre', String(e)));
    errorPanel.hidden = false;
    hideScene(true);
  }
  // The list view works even when the scene could not be built (the data is valid).
  overlay.setData(office, options.today);
}

load(officeMd, officeIsExample);

// Vite watches ../office.md and ../office.example.md (the officeMd plugin in vite.config.ts) and swaps the
// module without a page reload, also when office.md appears after the first update.
if (import.meta.hot) {
  import.meta.hot.accept('virtual:office-md', (mod) => {
    if (mod) {
      const m = mod as unknown as { default: string; example: boolean };
      load(m.default, m.example);
    }
  });
}
