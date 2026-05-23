"use client";
import { createContext, useContext, type ReactNode } from "react";
import { useLivePriceFeed, type LivePriceFeedOptions } from "@/lib/hooks/useLivePriceFeed";

type LivePriceContextValue = ReturnType<typeof useLivePriceFeed>;

const LivePriceContext = createContext<LivePriceContextValue | null>(null);

export function LivePriceProvider({
  symbols,
  children,
  options,
}: {
  symbols: string[];
  children: ReactNode;
  options?: LivePriceFeedOptions;
}) {
  const feed = useLivePriceFeed(symbols, options);
  return <LivePriceContext.Provider value={feed}>{children}</LivePriceContext.Provider>;
}

export function useLivePrices() {
  const ctx = useContext(LivePriceContext);
  if (!ctx) throw new Error("useLivePrices must be used within LivePriceProvider");
  return ctx;
}

export function useLivePricesOptional() {
  return useContext(LivePriceContext);
}
