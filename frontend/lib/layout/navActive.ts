/** Nav active state — no iterators (Vercel/TS target safe). */

export function isNavActive(path: string, search: URLSearchParams, href: string): boolean {
  const [base, queryString] = href.split("?");
  const pathMatch = base === "/" ? path === "/" : path.startsWith(base!);
  if (!pathMatch) return false;
  if (!queryString) {
    if (base === "/desk" && search.has("section")) return false;
    return true;
  }
  const expected = new URLSearchParams(queryString);
  let match = true;
  expected.forEach((value, key) => {
    if (search.get(key) !== value) match = false;
  });
  return match;
}
