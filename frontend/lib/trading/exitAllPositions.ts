import { portfolioApi } from "@/lib/api";
import { useActiveBookStore } from "@/lib/store/activeBook";
import { usePortfolioStore } from "@/lib/store/portfolio";
import { executePlaceOrder } from "@/lib/trading/placeOrder";
import { syncPortfolioFromCloud } from "@/lib/trading/cloudPortfolio";

/** Exit (sell) all open positions in the active book. */
export async function exitAllPositions(): Promise<{
  success: boolean;
  message: string;
  closed?: number;
}> {
  const book = useActiveBookStore.getState().activeBook;

  try {
    const res = await fetch("/api/portfolio/exit-all", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        portfolioId: book?.portfolioId,
        clientId: book?.clientId ?? undefined,
      }),
    });
    const data = (await res.json()) as {
      success: boolean;
      message: string;
      closed?: number;
    };
    if (data.success) await syncPortfolioFromCloud();
    return data;
  } catch {
    const state = usePortfolioStore.getState();
    const open = Object.values(state.positions).filter((p) => p.qty > 0.000001);
    if (open.length === 0) {
      return { success: true, message: "No positions to exit" };
    }

    let closed = 0;
    for (const pos of open) {
      const res = await executePlaceOrder({
        symbol: pos.symbol,
        name: pos.name,
        assetClass: pos.assetClass,
        side: "sell",
        qty: pos.qty,
        orderType: "market",
        currentPrice: pos.currentPrice,
      });
      if (res.success) closed += 1;
    }

    return {
      success: closed > 0,
      message: `Exited ${closed} position${closed !== 1 ? "s" : ""} locally`,
      closed,
    };
  }
}
