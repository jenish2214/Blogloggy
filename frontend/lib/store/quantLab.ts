"use client";

import { create } from "zustand";
import { loadSymbolSnapshot, isValidQuote } from "@/lib/finnhub";
import { loadYahooSymbolSnapshot, shouldUseYahooFirst } from "@/lib/market/yahooQuoteFallback";
import type { CompanyProfile, FinnhubQuote } from "@/types/finnhub";

export type QuantLabTabId =
  | "market-overview"
  | "predictions"
  | "options"
  | "monte-carlo"
  | "backtest"
  | "news-sentiment";

export type QuantLabMode = "beginner" | "pro";

interface QuantLabState {
  activeSymbol: string;
  activeTab: QuantLabTabId;
  quantLabMode: QuantLabMode;
  liveQuote: FinnhubQuote | null;
  companyProfile: CompanyProfile | null;
  isLiveDataLoading: boolean;
  liveDataError: string | null;
  engineOk: boolean | null;
  setActiveTab: (tab: QuantLabTabId) => void;
  setQuantLabMode: (mode: QuantLabMode) => void;
  setEngineOk: (ok: boolean | null) => void;
  setActiveSymbol: (symbol: string) => void;
  setLiveQuote: (quote: FinnhubQuote | null) => void;
  setCompanyProfile: (profile: CompanyProfile | null) => void;
  refreshLiveData: () => Promise<void>;
}

export const useQuantLabStore = create<QuantLabState>((set, get) => ({
  activeSymbol: "AAPL",
  activeTab: "market-overview",
  quantLabMode: "pro",
  liveQuote: null,
  companyProfile: null,
  isLiveDataLoading: false,
  liveDataError: null,
  engineOk: null,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setQuantLabMode: (mode) => set({ quantLabMode: mode }),
  setEngineOk: (ok) => set({ engineOk: ok }),
  setLiveQuote: (quote) => set({ liveQuote: quote }),
  setCompanyProfile: (profile) => set({ companyProfile: profile }),

  setActiveSymbol: (symbol) => {
    const s = symbol.trim().toUpperCase();
    if (!s) return;
    set({
      activeSymbol: s,
      liveQuote: null,
      companyProfile: null,
      isLiveDataLoading: true,
      liveDataError: null,
    });
    void get().refreshLiveData();
  },

  refreshLiveData: async () => {
    const symbol = get().activeSymbol;
    set({ isLiveDataLoading: true, liveDataError: null });
    try {
      let quote = null;
      let profile = null;

      if (shouldUseYahooFirst(symbol)) {
        const yahoo = await loadYahooSymbolSnapshot(symbol);
        quote = yahoo.quote;
        profile = yahoo.profile;
      } else {
        const finnhub = await loadSymbolSnapshot(symbol);
        quote = finnhub.quote;
        profile = finnhub.profile;
        if (!isValidQuote(quote)) {
          const yahoo = await loadYahooSymbolSnapshot(symbol);
          quote = yahoo.quote;
          profile = profile ?? yahoo.profile;
        }
      }

      if (!isValidQuote(quote)) {
        set({
          liveQuote: null,
          companyProfile: profile,
          isLiveDataLoading: false,
          liveDataError: "Could not load live quote. Check symbol and API keys.",
        });
        return;
      }
      set({
        liveQuote: quote,
        companyProfile: profile,
        isLiveDataLoading: false,
        liveDataError: null,
      });
    } catch {
      set({
        isLiveDataLoading: false,
        liveDataError: "Failed to load market data.",
      });
    }
  },
}));
