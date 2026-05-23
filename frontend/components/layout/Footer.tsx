export function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--border)",
        padding: "20px 24px",
        background: "var(--bg-surface)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "0.8rem", color: "var(--text-primary)" }}>
          QUANT<span style={{ color: "var(--accent)" }}>DESK</span>
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.65rem",
            color: "var(--text-secondary)",
            background: "var(--bg-surface-2)",
            border: "1px solid var(--border)",
            padding: "1px 6px",
            borderRadius: 2,
          }}
        >
          PAPER TRADING ONLY — NOT REAL MONEY
        </span>
      </div>
      <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
        {["Markets", "Trade", "Portfolio", "Research"].map((item) => (
          <a
            key={item}
            href={`/${item.toLowerCase()}`}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.7rem",
              color: "var(--text-muted)",
              textDecoration: "none",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {item}
          </a>
        ))}
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-muted)" }}>
        Built by BSJ Infotech · Prices via Yahoo Finance &amp; CoinGecko · {new Date().getFullYear()}
      </div>
    </footer>
  );
}
