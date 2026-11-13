// Interactions: tooltip above a room, side panel with tasks, copying text for the terminal and the list
// view (keyboard, screen reader). All of it is an HTML overlay above the scene, not text in pixels.
import { roomAlarm, isAlarmTask } from '../alarm';
import { floorOrder } from '../layout';
import { TYPE_DESCRIPTIONS, type Office, type Room, type Task } from '../schema';
import {
  taskDays,
  taskLink,
  longestWaiting,
  waitingText,
  sortTasks,
  clipboardText,
  type SortKey,
} from '../tasks';
import { el, externalLink, button } from './dom';
import { copyToClipboard } from './clipboard';

/** A room with the name of its floor (the scene and the list view use the same key). */
export type RoomView = { room: Room; floor: string };

export function roomKey(r: RoomView): string {
  return `${r.floor}\u0000${r.room.name}`;
}

export type OverlayDeps = {
  /** Highlight a room on the scene (label) — undefined removes the highlight. */
  highlight(key: string | undefined): void;
  /** The list view replaces the scene (the scene is hidden from screen readers too). */
  hideScene(hidden: boolean): void;
};

const COPY_HINT = 'Copy a line for the terminal (conversation with the director)';

export class Overlay {
  private office: Office | undefined;
  private today = new Date();
  private sortKey: SortKey = 'days';
  private openKey: string | undefined;
  private hoverKey: string | undefined;
  private focusBeforePanel: HTMLElement | undefined;
  private listView = false;

  constructor(
    private readonly tooltip: HTMLElement,
    private readonly panel: HTMLElement,
    private readonly list: HTMLElement,
    private readonly toggle: HTMLButtonElement,
    /** Visible message (hidden from screen readers; they get `announcer`). */
    private readonly toast: HTMLElement,
    /** aria-live region (always in the accessibility tree), announces the copy result. */
    private readonly announcer: HTMLElement,
    private readonly deps: OverlayDeps,
  ) {
    toggle.addEventListener('click', () => this.setListView(!this.listView));
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      this.showTooltip(undefined, 0, 0);
      if (this.openKey !== undefined) {
        e.preventDefault();
        this.closePanel();
      }
    });
    this.setListView(false);
  }

  /** New data (first load or office.md reload); an open panel stays if the room still exists. */
  setData(office: Office | undefined, today: Date): void {
    this.office = office;
    this.today = today;
    this.toggle.disabled = office === undefined;
    this.buildList();
    const open = this.openKey !== undefined ? this.find(this.openKey) : undefined;
    if (open) this.fillPanel(open, false);
    else if (this.openKey !== undefined) this.closePanel();
    this.showTooltip(undefined, 0, 0);
  }

  // --- tooltip ---

  showTooltip(r: RoomView | undefined, x: number, y: number): void {
    const key = r ? roomKey(r) : undefined;
    if (key !== this.hoverKey) {
      this.hoverKey = key;
      this.deps.highlight(key ?? this.openKey);
      if (r) this.fillTooltip(r);
    }
    this.tooltip.hidden = r === undefined;
    if (!r) return;
    const margin = 8;
    const w = this.tooltip.offsetWidth;
    const h = this.tooltip.offsetHeight;
    const left = x + 16 + w + margin > window.innerWidth ? x - 16 - w : x + 16;
    const top = Math.min(y + 16, window.innerHeight - h - margin);
    this.tooltip.style.transform = `translate(${Math.max(margin, left)}px, ${Math.max(margin, top)}px)`;
  }

  private fillTooltip({ room, floor }: RoomView): void {
    const alarm = roomAlarm(room.tasks, this.today).alarm;
    const title = el('div', undefined, 'tooltip-title');
    title.append(el('strong', alarm ? `! ${room.name}` : room.name), el('span', ` · ${floor}`, 'muted'));
    const open = el('div', `open: ${room.open}`, 'tooltip-open');
    const ul = el('ul', undefined, 'tooltip-tasks');
    for (const t of longestWaiting(room.tasks, this.today)) {
      const li = el('li');
      li.append(el('span', t.types.map((x) => `[${x}]`).join(''), 'types'), ` ${t.number !== undefined ? `#${t.number} ` : ''}${t.title}`);
      const days = taskDays(t, this.today);
      if (days !== undefined) li.append(el('span', ` — ${waitingText(days)}`, isAlarmTask(t, this.today) ? 'waiting alarm' : 'waiting'));
      ul.append(li);
    }
    const footer = el(
      'div',
      room.tasks.length > 0 ? `click: all tasks (${room.tasks.length})` : 'no key tasks in office.md',
      'tooltip-footer',
    );
    this.tooltip.replaceChildren(title, open, ...(room.tasks.length > 0 ? [ul] : []), footer);
  }

  // --- panel ---

  openPanel(r: RoomView): void {
    this.tooltip.hidden = true;
    if (this.openKey === undefined) {
      // A click on the scene does not move focus (the canvas does not take it) — then on close focus returns
      // to the view toggle, not to the start of the page.
      const a = document.activeElement;
      this.focusBeforePanel = a instanceof HTMLElement && a !== document.body ? a : this.toggle;
    }
    this.fillPanel(r, true);
  }

  closePanel(): void {
    if (this.openKey === undefined) return;
    this.openKey = undefined;
    this.panel.hidden = true;
    this.panel.replaceChildren();
    this.deps.highlight(this.hoverKey);
    const f = this.focusBeforePanel;
    this.focusBeforePanel = undefined;
    (f && f.isConnected ? f : this.toggle).focus();
  }

  private fillPanel(r: RoomView, focus: boolean): void {
    const { room, floor } = r;
    this.openKey = roomKey(r);
    this.deps.highlight(this.openKey);
    const header = el('div', undefined, 'panel-header');
    const h2 = el('h2', room.name);
    h2.id = 'panel-title';
    h2.tabIndex = -1;
    const close = button('×', 'close', 'Close panel (Esc)');
    close.addEventListener('click', () => this.closePanel());
    header.append(h2, close);

    const meta = el('p', undefined, 'panel-meta');
    meta.append(`${floor} · open: ${room.open}`);
    if (room.repo) {
      meta.append(' · ');
      meta.append(externalLink(`https://github.com/${room.repo}`, `${room.repo} on GitHub`));
    }
    const items: HTMLElement[] = [header, meta];
    if (room.theme) items.push(el('p', room.theme, 'panel-theme'));

    if (room.tasks.length > 0) {
      const sort = el('div', undefined, 'sorting');
      sort.setAttribute('role', 'group');
      sort.setAttribute('aria-label', 'Sort tasks');
      sort.append(el('span', 'sort by: ', 'muted'));
      for (const [k, label] of [['days', 'days waiting'], ['type', 'type']] as const) {
        const b = button(label, 'sort');
        b.setAttribute('aria-pressed', String(this.sortKey === k));
        b.addEventListener('click', () => {
          this.sortKey = k;
          this.fillPanel(r, false);
          this.panel.querySelector<HTMLButtonElement>(`button.sort[data-key="${k}"]`)?.focus();
        });
        b.dataset.key = k;
        sort.append(b);
      }
      items.push(sort, this.taskList(room, sortTasks(room.tasks, this.today, this.sortKey)));
    } else {
      items.push(el('p', 'No key tasks in office.md.', 'muted'));
    }
    this.panel.replaceChildren(...items);
    this.panel.hidden = false;
    if (focus) h2.focus();
  }

  // --- tasks (panel and list view) ---

  private taskList(room: Room, tasks: readonly Task[]): HTMLUListElement {
    const ul = el('ul', undefined, 'tasks');
    for (const t of tasks) ul.append(this.task(room, t));
    return ul;
  }

  private task(room: Room, t: Task): HTMLLIElement {
    const li = el('li', undefined, 'task');
    const row = el('div', undefined, 'task-row');
    const types = el('span', undefined, 'types');
    for (const x of t.types) {
      const s = el('abbr', `[${x}]`, `type type-${x === '?' ? 'q' : x === '..' ? 'wip' : x}`);
      s.title = TYPE_DESCRIPTIONS[x];
      types.append(s);
    }
    const name = `${t.number !== undefined ? `#${t.number} ` : ''}${t.title}`;
    const link = taskLink(room, t);
    row.append(types, link ? externalLink(link, name, 'title') : el('span', name, 'title'));
    const days = taskDays(t, this.today);
    if (days !== undefined) row.append(el('span', waitingText(days), isAlarmTask(t, this.today) ? 'waiting alarm' : 'waiting'));
    const copy = button('Copy', 'copy', `Copy to clipboard: ${name}`);
    copy.title = COPY_HINT;
    copy.addEventListener('click', () => void this.copy(copy, clipboardText(room, t, this.today)));
    row.append(copy);
    li.append(row);
    if (t.context) li.append(el('p', t.context, 'context'));
    return li;
  }

  private async copy(b: HTMLButtonElement, text: string): Promise<void> {
    const ok = await copyToClipboard(text);
    this.toast.textContent = ok ? `Copied: ${text}` : `Could not copy. Text: ${text}`;
    this.announce(ok ? 'Text copied to the clipboard.' : `Could not copy. Text: ${text}`);
    this.toast.classList.toggle('error', !ok);
    this.toast.hidden = false;
    b.textContent = ok ? 'Copied' : 'Failed';
    window.setTimeout(() => {
      b.textContent = 'Copy';
    }, 1500);
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      this.toast.hidden = true;
    }, ok ? 4000 : 15000);
  }

  private toastTimer = 0;
  private announceTimer = 0;

  /**
   * A message for screen readers. The aria-live region is cleared first and the text appears a moment later:
   * VoiceOver and other readers do not announce a region again if its content did not change, so without
   * this a second copy in a row would be silent. 100 ms rather than one frame, because some readers miss
   * changes shorter than a few dozen ms.
   */
  private announce(text: string): void {
    window.clearTimeout(this.announceTimer);
    this.announcer.textContent = '';
    this.announceTimer = window.setTimeout(() => {
      this.announcer.textContent = text;
    }, 100);
  }

  // --- list view ---

  setListView(on: boolean): void {
    this.listView = on;
    this.list.hidden = !on;
    this.toggle.setAttribute('aria-pressed', String(on));
    this.toggle.textContent = on ? 'Building view' : 'List view';
    this.deps.hideScene(on);
    if (on) this.showTooltip(undefined, 0, 0);
  }

  private roomsInOrder(): RoomView[] {
    if (!this.office) return [];
    // The same order as in the building: Headquarters at the bottom = first in the list.
    return floorOrder(this.office.floors).flatMap(({ floor }) => floor.rooms.map((room) => ({ room, floor: floor.name })));
  }

  private find(key: string): RoomView | undefined {
    return this.roomsInOrder().find((r) => roomKey(r) === key);
  }

  private buildList(): void {
    const h1 = el('h1', 'AI office — list view');
    const items: HTMLElement[] = [h1];
    if (!this.office) {
      items.push(el('p', 'office.md has errors — the list will be available once they are fixed.'));
      this.list.replaceChildren(...items);
      return;
    }
    items.push(
      el('p', 'Tasks in every room, longest waiting first. "Copy" copies a line for the conversation with the director in the terminal.', 'muted'),
    );
    for (const { floor } of floorOrder(this.office.floors)) {
      const section = el('section', undefined, 'list-floor');
      const h2 = el('h2', `Floor: ${floor.name}`);
      section.append(h2);
      for (const room of floor.rooms) {
        const r: RoomView = { room, floor: floor.name };
        const art = el('article', undefined, 'list-room');
        const alarm = roomAlarm(room.tasks, this.today);
        const h3 = el('h3', room.name);
        if (alarm.alarm) h3.append(el('span', ` — alarm ([B]/[?] tasks waiting more than 7 days: ${alarm.tasks})`, 'alarm'));
        const meta = el('p', `open: ${room.open}`, 'panel-meta');
        if (room.repo) {
          meta.append(' · ');
          meta.append(externalLink(`https://github.com/${room.repo}`, `${room.repo} on GitHub`));
        }
        const details = button('Open panel', 'open-panel', `Open the panel of room ${room.name}`);
        details.addEventListener('click', () => this.openPanel(r));
        meta.append(' · ', details);
        art.append(h3, meta);
        if (room.tasks.length > 0) art.append(this.taskList(room, sortTasks(room.tasks, this.today, 'days')));
        else art.append(el('p', 'No key tasks.', 'muted'));
        section.append(art);
      }
      items.push(section);
    }
    this.list.replaceChildren(...items);
  }
}
