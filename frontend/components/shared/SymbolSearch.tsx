"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { marketApi } from "@/lib/api";
import { filterPopularByLetter, type PopularSymbol } from "@/lib/market/popularSymbols";
import styles from "./SymbolSearch.module.css";

const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export interface SymbolSearchResult {
  symbol: string;
  name: string;
  type: string;
}

interface SymbolSearchProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (item: SymbolSearchResult) => void;
  placeholder?: string;
  inputClassName?: string;
  showAlphaBar?: boolean;
  showPopular?: boolean;
  disabled?: boolean;
  id?: string;
}

export function SymbolSearch({
  value,
  onChange,
  onSelect,
  placeholder = "Search symbol or company (e.g. Google, Gold)…",
  inputClassName,
  showAlphaBar = true,
  showPopular = true,
  disabled,
  id,
}: SymbolSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SymbolSearchResult[]>([]);
  const [alpha, setAlpha] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery("");
  }, [value]);

  useEffect(() => {
    if (query.length < 1) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const { results: r } = await marketApi.search(query);
        setResults(r.slice(0, 10));
        setOpen(true);
      } catch {
        setResults([]);
      }
    }, 280);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const popularFiltered = useMemo(() => filterPopularByLetter(alpha), [alpha]);

  const pick = (item: SymbolSearchResult | PopularSymbol) => {
    onSelect({ symbol: item.symbol, name: item.name, type: "type" in item ? item.type : "stock" });
    onChange(item.symbol);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <input
        id={id}
        className={inputClassName ?? styles.input}
        value={open && query ? query : value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => {
          const v = e.target.value;
          setQuery(v);
          onChange(v.toUpperCase());
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
        spellCheck={false}
      />

      {open && (query.length > 0 ? results.length > 0 : showPopular) && (
        <div className={styles.dropdown} role="listbox">
          {query.length > 0 ? (
            results.map((r) => (
              <button
                key={r.symbol}
                type="button"
                className={styles.option}
                onClick={() => pick(r)}
              >
                <span className={styles.sym}>{r.symbol}</span>
                <span className={styles.name}>{r.name}</span>
                <span className={styles.type}>{r.type}</span>
              </button>
            ))
          ) : (
            <>
              {showAlphaBar && (
                <div className={styles.alphaBar}>
                  <button
                    type="button"
                    className={alpha === null ? styles.alphaOn : styles.alphaBtn}
                    onClick={() => setAlpha(null)}
                  >
                    All
                  </button>
                  {ALPHA.map((l) => (
                    <button
                      key={l}
                      type="button"
                      className={alpha === l ? styles.alphaOn : styles.alphaBtn}
                      onClick={() => setAlpha(l)}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              )}
              {popularFiltered.map((p) => (
                <button key={p.symbol} type="button" className={styles.option} onClick={() => pick(p)}>
                  <span className={styles.sym}>{p.symbol}</span>
                  <span className={styles.name}>{p.name}</span>
                  <span className={styles.type}>{p.type}</span>
                </button>
              ))}
              {popularFiltered.length === 0 && (
                <p className={styles.empty}>No symbols for &quot;{alpha}&quot;</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
