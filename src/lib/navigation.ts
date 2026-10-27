/**
 * A full page load, used only when who-is-logged-in changes (login, consent, logout). The client router may still
 * hold pages it prefetched before the change (e.g. "/" → redirect to /login), so router.push() would show them.
 */
export function reloadTo(path: string): void {
  window.location.assign(path);
}
