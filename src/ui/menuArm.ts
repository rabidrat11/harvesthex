// A menu that has only just opened ignores Enter and pad A for a moment, so a
// key mashed in the fight (or a double click) never picks something unseen.
// Kept free of imports: the input layer and the interface both use it.

export const MENU_ARM_MS = 300;

export function menuArmed(root: Element | null | undefined): boolean {
  const t = Number((root as HTMLElement | null | undefined)?.dataset?.opened ?? 0);
  return !t || performance.now() - t >= MENU_ARM_MS;
}
