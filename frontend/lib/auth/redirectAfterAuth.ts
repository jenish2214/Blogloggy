/** Full navigation so middleware receives freshly written Supabase auth cookies. */
export function redirectAfterAuth(path: string) {
  const target = path.startsWith("/") ? path : `/${path}`;
  window.location.assign(target);
}
