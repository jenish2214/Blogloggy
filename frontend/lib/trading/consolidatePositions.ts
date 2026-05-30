/** Merge duplicate position rows (e.g. legacy portfolio_id null + book row) into one per symbol. */

export type RawPosition = Record<string, unknown>;

export function consolidateRawPositions(rows: RawPosition[]): RawPosition[] {
  const bySymbol = new Map<string, RawPosition>();

  for (const row of rows) {
    const symbol = String(row.symbol ?? "").toUpperCase();
    if (!symbol) continue;
    const qty = Number(row.qty) || 0;
    if (qty <= 0.000001) continue;

    const existing = bySymbol.get(symbol);
    if (!existing) {
      bySymbol.set(symbol, { ...row, symbol });
      continue;
    }

    const eq = Number(existing.qty) || 0;
    const ep = Number(existing.avg_price) || 0;
    const np = Number(row.avg_price) || 0;
    const newQty = eq + qty;
    const newAvg = newQty > 0 ? (eq * ep + qty * np) / newQty : np;

    const preferBook =
      row.portfolio_id != null &&
      (existing.portfolio_id == null || existing.portfolio_id === row.portfolio_id);

    bySymbol.set(symbol, {
      ...(preferBook ? row : existing),
      qty: newQty,
      avg_price: newAvg,
      current_price: Number(row.current_price) || Number(existing.current_price) || newAvg,
      name: row.name ?? existing.name,
      asset_class: row.asset_class ?? existing.asset_class,
      portfolio_id: row.portfolio_id ?? existing.portfolio_id,
    });
  }

  return Array.from(bySymbol.values());
}
