/**
 * Shared Finnhub WebSocket — one connection per tab (free tier friendly).
 * Handles reconnect, ping/pong, and React Strict Mode mount/unmount races.
 */

import { buildFinnhubSymbolMap, toFinnhubSymbol } from "@/lib/market/finnhubSymbols";

type PriceListener = (prices: Record<string, number>) => void;
type StateListener = (connected: boolean, error: string | null) => void;

const MAX_RETRIES = 6;
const BASE_RETRY_MS = 2_000;

class FinnhubWsManager {
  private ws: WebSocket | null = null;
  private symbols = new Set<string>();
  private subscribed = new Set<string>();
  private priceListeners = new Set<PriceListener>();
  private stateListeners = new Set<StateListener>();
  private finnhubToPortfolio: Record<string, string> = {};
  private retryCount = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private disabled = false;
  private connectTimer: ReturnType<typeof setTimeout> | null = null;
  private generation = 0;

  subscribe(symbols: string[], onPrices: PriceListener, onState: StateListener): () => void {
    for (const sym of symbols) {
      if (sym) this.symbols.add(sym.toUpperCase());
    }
    this.priceListeners.add(onPrices);
    this.stateListeners.add(onState);
    this.syncSymbolMap();
    this.scheduleConnect();

    onState(this.ws?.readyState === WebSocket.OPEN, null);

    return () => {
      this.priceListeners.delete(onPrices);
      this.stateListeners.delete(onState);
      if (this.priceListeners.size === 0) {
        this.teardown();
      } else {
        this.resubscribeIfOpen();
      }
    };
  }

  private syncSymbolMap() {
    const { finnhubToPortfolio } = buildFinnhubSymbolMap(Array.from(this.symbols));
    this.finnhubToPortfolio = finnhubToPortfolio;
  }

  private scheduleConnect() {
    if (this.disabled || this.priceListeners.size === 0) return;
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
      return;
    }
    if (this.connectTimer) return;

    this.connectTimer = setTimeout(() => {
      this.connectTimer = null;
      this.openSocket();
    }, 50);
  }

  private openSocket() {
    /* Browser WebSocket disabled — Finnhub API key must not ship to the client. */
  }

  private subscribeAll(ws: WebSocket) {
    Array.from(this.symbols).forEach((ps) => {
      const fh = toFinnhubSymbol(ps);
      if (!fh || this.subscribed.has(fh)) return;
      ws.send(JSON.stringify({ type: "subscribe", symbol: fh }));
      this.subscribed.add(fh);
    });
  }

  private resubscribeIfOpen() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.syncSymbolMap();
      this.subscribeAll(this.ws);
    }
  }

  private scheduleRetry() {
    if (this.disabled || this.priceListeners.size === 0) return;
    if (this.retryTimer) return;

    if (this.retryCount >= MAX_RETRIES) {
      this.disabled = true;
      this.emitState(false, null);
      return;
    }

    const delay = BASE_RETRY_MS * Math.pow(1.5, this.retryCount);
    this.retryCount += 1;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.openSocket();
    }, delay);
  }

  private emitState(connected: boolean, error: string | null) {
    Array.from(this.stateListeners).forEach((listener) => listener(connected, error));
  }

  private teardown() {
    this.generation += 1;
    if (this.connectTimer) {
      clearTimeout(this.connectTimer);
      this.connectTimer = null;
    }
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    const ws = this.ws;
    this.ws = null;
    this.subscribed.clear();
    this.symbols.clear();
    this.retryCount = 0;
    this.disabled = false;

    if (!ws) return;

    if (ws.readyState === WebSocket.CONNECTING) {
      ws.onopen = () => ws.close();
      ws.onerror = null;
      ws.onclose = null;
      ws.onmessage = null;
      return;
    }

    if (ws.readyState === WebSocket.OPEN) {
      for (const fh of Array.from(this.subscribed)) {
        try {
          ws.send(JSON.stringify({ type: "unsubscribe", symbol: fh }));
        } catch {
          /* closing */
        }
      }
    }
    ws.close();
  }
}

export const finnhubWsManager = new FinnhubWsManager();
