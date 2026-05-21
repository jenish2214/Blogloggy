"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AssetClass = "stock" | "crypto" | "option";
export type Side = "buy" | "sell";
export type OrderType = "market" | "limit";
export type OrderStatus = "filled" | "pending" | "cancelled";

export interface Position {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  qty: number;
  avgPrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
}

export interface Order {
  id: string;
  symbol: string;
  assetClass: AssetClass;
  side: Side;
  qty: number;
  orderType: OrderType;
  limitPrice?: number;
  filledPrice: number;
  status: OrderStatus;
  createdAt: string;
  filledAt?: string;
}

interface PortfolioState {
  cash: number;
  positions: Record<string, Position>;
  orders: Order[];
  totalValue: number;
  totalPnl: number;
  totalPnlPct: number;

  placeOrder: (params: {
    symbol: string;
    name: string;
    assetClass: AssetClass;
    side: Side;
    qty: number;
    orderType: OrderType;
    currentPrice: number;
    limitPrice?: number;
  }) => { success: boolean; message: string };

  updatePrices: (prices: Record<string, number>) => void;
  resetPortfolio: () => void;
}

const INITIAL_CASH = 100_000;

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set, get) => ({
      cash: INITIAL_CASH,
      positions: {},
      orders: [],
      totalValue: INITIAL_CASH,
      totalPnl: 0,
      totalPnlPct: 0,

      placeOrder({ symbol, name, assetClass, side, qty, orderType, currentPrice, limitPrice }) {
        if (qty <= 0) return { success: false, message: "Quantity must be positive" };
        const fillPrice = orderType === "limit" && limitPrice ? limitPrice : currentPrice;
        const totalCost = fillPrice * qty;
        const state = get();

        if (side === "buy") {
          if (totalCost > state.cash) {
            return { success: false, message: `Insufficient cash. Need $${totalCost.toFixed(2)}, have $${state.cash.toFixed(2)}` };
          }
          const existing = state.positions[symbol];
          const newQty = (existing?.qty ?? 0) + qty;
          const newAvgPrice = existing
            ? (existing.avgPrice * existing.qty + fillPrice * qty) / newQty
            : fillPrice;

          const newPosition: Position = {
            symbol,
            name,
            assetClass,
            qty: newQty,
            avgPrice: newAvgPrice,
            currentPrice: fillPrice,
            marketValue: newQty * fillPrice,
            unrealizedPnl: (fillPrice - newAvgPrice) * newQty,
            unrealizedPnlPct: ((fillPrice - newAvgPrice) / newAvgPrice) * 100,
          };

          const order: Order = {
            id: `ord-${Date.now()}`,
            symbol,
            assetClass,
            side,
            qty,
            orderType,
            limitPrice,
            filledPrice: fillPrice,
            status: "filled",
            createdAt: new Date().toISOString(),
            filledAt: new Date().toISOString(),
          };

          const newPositions = { ...state.positions, [symbol]: newPosition };
          const newCash = state.cash - totalCost;
          const newOrders = [order, ...state.orders];
          const { totalValue, totalPnl, totalPnlPct } = calcTotals(newPositions, newCash);

          set({ cash: newCash, positions: newPositions, orders: newOrders, totalValue, totalPnl, totalPnlPct });
          return { success: true, message: `Bought ${qty} ${symbol} @ $${fillPrice.toFixed(2)}` };
        }

        // SELL
        const pos = state.positions[symbol];
        if (!pos) return { success: false, message: `No position in ${symbol}` };
        if (qty > pos.qty) return { success: false, message: `Can only sell up to ${pos.qty} shares` };

        const proceeds = fillPrice * qty;
        const order: Order = {
          id: `ord-${Date.now()}`,
          symbol,
          assetClass,
          side,
          qty,
          orderType,
          limitPrice,
          filledPrice: fillPrice,
          status: "filled",
          createdAt: new Date().toISOString(),
          filledAt: new Date().toISOString(),
        };

        const newPositions = { ...state.positions };
        if (qty === pos.qty) {
          delete newPositions[symbol];
        } else {
          const remaining = pos.qty - qty;
          newPositions[symbol] = {
            ...pos,
            qty: remaining,
            marketValue: remaining * fillPrice,
            unrealizedPnl: (fillPrice - pos.avgPrice) * remaining,
            unrealizedPnlPct: ((fillPrice - pos.avgPrice) / pos.avgPrice) * 100,
          };
        }

        const newCash = state.cash + proceeds;
        const newOrders = [order, ...state.orders];
        const { totalValue, totalPnl, totalPnlPct } = calcTotals(newPositions, newCash);
        set({ cash: newCash, positions: newPositions, orders: newOrders, totalValue, totalPnl, totalPnlPct });
        return { success: true, message: `Sold ${qty} ${symbol} @ $${fillPrice.toFixed(2)}` };
      },

      updatePrices(prices) {
        const state = get();
        const updated: Record<string, Position> = {};
        for (const [sym, pos] of Object.entries(state.positions)) {
          const p = prices[sym] ?? pos.currentPrice;
          updated[sym] = {
            ...pos,
            currentPrice: p,
            marketValue: p * pos.qty,
            unrealizedPnl: (p - pos.avgPrice) * pos.qty,
            unrealizedPnlPct: ((p - pos.avgPrice) / pos.avgPrice) * 100,
          };
        }
        const { totalValue, totalPnl, totalPnlPct } = calcTotals(updated, state.cash);
        set({ positions: updated, totalValue, totalPnl, totalPnlPct });
      },

      resetPortfolio() {
        set({ cash: INITIAL_CASH, positions: {}, orders: [], totalValue: INITIAL_CASH, totalPnl: 0, totalPnlPct: 0 });
      },
    }),
    { name: "quantdesk-portfolio-v1" }
  )
);

function calcTotals(positions: Record<string, Position>, cash: number) {
  const posValue = Object.values(positions).reduce((s, p) => s + p.marketValue, 0);
  const totalValue = cash + posValue;
  const totalPnl = totalValue - INITIAL_CASH;
  const totalPnlPct = (totalPnl / INITIAL_CASH) * 100;
  return { totalValue, totalPnl, totalPnlPct };
}
