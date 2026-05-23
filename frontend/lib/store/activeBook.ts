"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AccountType = "personal" | "client";

export interface ActiveBook {
  portfolioId: string;
  clientId: string | null;
  accountType: AccountType;
  label: string;
  clientCode?: string;
}

interface ActiveBookState {
  activeBook: ActiveBook | null;
  setActiveBook: (book: ActiveBook) => void;
  clearActiveBook: () => void;
}

export const useActiveBookStore = create<ActiveBookState>()(
  persist(
    (set) => ({
      activeBook: null,
      setActiveBook: (book) => set({ activeBook: book }),
      clearActiveBook: () => set({ activeBook: null }),
    }),
    { name: "quantdesk-active-book-v1" }
  )
);
