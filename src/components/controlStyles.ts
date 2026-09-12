// The settings panel holds three sets of controls that arrived from three places: the
// theme picker, the drill toggles, and the Import/Reset pair that used to sit on Home at
// page scale. Left alone they rendered at two different sizes with two different hover
// treatments inside one small popover. One scale for everything in the panel.
//
// Page-level buttons (Export, next to Home's heading) deliberately do NOT use these —
// they are not in the panel and read at the size of the page around them.
export const panelControl = 'rounded border px-2 py-1 text-xs';

const idle = 'border-zinc-300 text-zinc-500 hover:border-emerald-500 dark:border-zinc-700 dark:text-zinc-400';
const active = 'border-emerald-500 text-emerald-600 dark:text-emerald-400';

/** A control that carries an on/off state: the theme picker and the drill toggles. */
export const panelToggle = (on: boolean) => `${panelControl} ${on ? active : idle}`;

/** A control that just does something when pressed. */
export const panelButton = `${panelControl} ${idle}`;

// Destructive, so it keeps its red lettering rather than picking up the emerald hover
// every other control in the panel shares.
export const panelDangerButton = `${panelControl} border-zinc-300 text-red-600 hover:border-red-500 dark:border-zinc-700 dark:text-red-400`;
