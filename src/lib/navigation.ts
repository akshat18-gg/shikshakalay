/**
 * A full page load, used only when who-is-logged-in changes (login, consent, logout). The client router may still
 * hold pages it prefetched before the change (e.g. "/" → redirect to /login), so router.push() would show them.
 */
export function reloadTo(path: string): void {
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- deliberate full load, see above
  window.location.assign(path);
}
