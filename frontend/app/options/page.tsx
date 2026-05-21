"use client";
import { Suspense, useState, useEffect } from "react";
import { tradingApi, type OptionsChain, type OptionsContract } from "@/lib/api";

function fmt(n: number | null | undefined, dec = 2) {
  if (n == null) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function OptionsRow({ contract, spot, type }: { contract: OptionsContract; spot: number; type: "call" | "put" }) {
  const itm = contract.inTheMoney;
  const midpoint = contract.midpoint ?? ((contract.bid + contract.ask) / 2);
  return (
    <tr style={{ background: itm ? (type === "call" ? "rgba(52,211,153,0.03)" : "rgba(248,113,113,0.03)") : undefined }}>
      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", fontWeight: itm ? 600 : 400, color: itm ? "var(--text-primary)" : "var(--text-secondary)" }}>
        ${contract.strike}
        {itm && <span style={{ marginLeft: 4, fontSize: "0.62rem", color: type === "call" ? "var(--up)" : "var(--down)" }}>ITM</span>}
      </td>
      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem" }}>{contract.lastPrice != null ? `$${fmt(contract.lastPrice)}` : "—"}</td>
      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--text-secondary)" }}>{contract.bid != null ? `$${fmt(contract.bid)}` : "—"}</td>
      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--text-secondary)" }}>{contract.ask != null ? `$${fmt(contract.ask)}` : "—"}</td>
      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--accent-2)" }}>{midpoint ? `$${fmt(midpoint)}` : "—"}</td>
      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: contract.impliedVolatility != null && contract.impliedVolatility > 50 ? "var(--warn)" : "var(--text-secondary)" }}>
        {contract.impliedVolatility != null ? `${fmt(contract.impliedVolatility)}%` : "—"}
      </td>
      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--text-muted)" }}>{contract.volume?.toLocaleString()}</td>
      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--text-muted)" }}>{contract.openInterest?.toLocaleString()}</td>
      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: (contract.percentChange ?? 0) >= 0 ? "var(--up)" : "var(--down)" }}>
        {contract.percentChange != null ? `${(contract.percentChange >= 0 ? "+" : "")}${fmt(contract.percentChange)}%` : "—"}
      </td>
    </tr>
  );
}

// Black-Scholes Calculator
function BSCalculator() {
  const [inputs, setInputs] = useState({ S: 150, K: 150, T: 0.25, r: 0.05, sigma: 0.25, type: "call" as "call" | "put" });
  const [result, setResult] = useState<{ price: number; delta: number; gamma: number; theta: number; vega: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const calculate = async () => {
    setLoading(true);
    try {
      const { result: r } = await tradingApi.priceOption(inputs);
      setResult(r);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { calculate(); }, []);

  const set = (k: string, v: string | number) => setInputs((prev) => ({ ...prev, [k]: typeof v === "string" && k !== "type" ? parseFloat(v) || 0 : v }));

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>BLACK-SCHOLES CALCULATOR</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 14 }}>
        {([
          { key: "S", label: "Spot Price (S)", placeholder: "150" },
          { key: "K", label: "Strike (K)", placeholder: "150" },
          { key: "T", label: "Time (years)", placeholder: "0.25" },
          { key: "r", label: "Risk-free Rate", placeholder: "0.05" },
          { key: "sigma", label: "Volatility (σ)", placeholder: "0.25" },
        ] as const).map(({ key, label, placeholder }) => (
          <div key={key}>
            <label style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-muted)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</label>
            <input className="input" type="number" step="0.01" placeholder={placeholder} value={(inputs as unknown as Record<string, number>)[key]} onChange={(e) => set(key, e.target.value)} />
          </div>
        ))}
        <div>
          <label style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-muted)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Type</label>
          <select className="input" value={inputs.type} onChange={(e) => set("type", e.target.value as "call" | "put")}>
            <option value="call">Call</option>
            <option value="put">Put</option>
          </select>
        </div>
      </div>
      <button className="btn btn-primary" onClick={calculate} disabled={loading}>
        {loading ? "Calculating..." : "Calculate Greeks"}
      </button>
      {result && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 1, background: "var(--border)", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden", marginTop: 16 }}>
          {[
            { label: "Option Price", value: `$${result.price.toFixed(4)}`, accent: true },
            { label: "Delta (Δ)", value: result.delta.toFixed(4), desc: "Price sensitivity" },
            { label: "Gamma (Γ)", value: result.gamma.toFixed(6), desc: "Delta rate of change" },
            { label: "Theta (Θ)", value: `${result.theta.toFixed(4)}/day`, desc: "Time decay" },
            { label: "Vega (ν)", value: `${result.vega.toFixed(4)}/1%`, desc: "Vol sensitivity" },
          ].map(({ label, value, accent, desc }) => (
            <div key={label} style={{ background: "var(--bg-surface)", padding: "10px 14px" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>{label}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: accent ? "1rem" : "0.88rem", fontWeight: accent ? 600 : 400, color: accent ? "var(--accent-2)" : "var(--text-primary)" }}>{value}</div>
              {desc && <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--text-muted)", marginTop: 2 }}>{desc}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OptionsPage() {
  const [symbol, setSymbol] = useState("AAPL");
  const [inputSym, setInputSym] = useState("AAPL");
  const [chain, setChain] = useState<OptionsChain | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"calls" | "puts">("calls");
  const [selectedExpiry, setSelectedExpiry] = useState<number | null>(null);

  const loadChain = async (sym: string, expiry?: number) => {
    setLoading(true);
    setError("");
    try {
      const data = await tradingApi.getOptionsChain(sym, expiry?.toString());
      setChain(data);
      if (!expiry && data.expirations?.[0]) setSelectedExpiry(data.expirations[0]);
    } catch (e) {
      setError("Failed to load options chain. Try AAPL, TSLA, MSFT, NVDA.");
    }
    setLoading(false);
  };

  useEffect(() => { loadChain("AAPL"); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const sym = inputSym.trim().toUpperCase();
    setSymbol(sym);
    loadChain(sym);
  };

  const contracts = tab === "calls" ? (chain?.calls ?? []) : (chain?.puts ?? []);

  return (
    <div className="page">
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>OPTIONS CHAIN</div>
        <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "1.4rem", fontWeight: 600, color: "var(--text-primary)" }}>Options Terminal</h1>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <input className="input" style={{ maxWidth: 200 }} value={inputSym} onChange={(e) => setInputSym(e.target.value.toUpperCase())} placeholder="Symbol (AAPL, TSLA...)" />
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Loading..." : "Load Chain"}
        </button>
      </form>

      {/* B-S Calculator */}
      <div style={{ marginBottom: 20 }}>
        <BSCalculator />
      </div>

      {error && (
        <div style={{ padding: "10px 14px", background: "var(--down-soft)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: "var(--radius-sm)", marginBottom: 16, fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--down)" }}>
          {error}
        </div>
      )}

      {chain && (
        <div className="card">
          {/* Chain header */}
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)" }}>{chain.symbol}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem", color: "var(--text-muted)", marginLeft: 10 }}>
                Spot: <strong style={{ color: "var(--text-primary)" }}>${fmt(chain.spotPrice)}</strong>
              </span>
            </div>
            {/* Expiry selector */}
            <select
              className="input"
              style={{ width: 180 }}
              value={selectedExpiry ?? ""}
              onChange={(e) => {
                const exp = Number(e.target.value);
                setSelectedExpiry(exp);
                loadChain(chain.symbol, exp);
              }}
            >
              {(chain.expirations ?? []).map((exp) => (
                <option key={exp} value={exp}>
                  {new Date(exp * 1000).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                </option>
              ))}
            </select>
          </div>

          {/* Call / Put tabs */}
          <div className="tabs" style={{ padding: "0 16px" }}>
            <button className={`tab-btn ${tab === "calls" ? "active" : ""}`} onClick={() => setTab("calls")}>Calls</button>
            <button className={`tab-btn ${tab === "puts" ? "active" : ""}`} onClick={() => setTab("puts")}>Puts</button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  {["Strike", "Last", "Bid", "Ask", "Mid", "IV %", "Volume", "OI", "Change %"].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contracts.slice(0, 40).map((c) => (
                  <OptionsRow key={c.contractSymbol} contract={c} spot={chain.spotPrice} type={tab === "calls" ? "call" : "put"} />
                ))}
                {contracts.length === 0 && (
                  <tr><td colSpan={9} style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>No contracts available for this expiry</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
