import styles from "./PnlStatementPanel.module.css";

function fmt(n: number, dec = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

export interface PnlStatementPanelProps {
  openingBalance: number;
  totalBuyVolume: number;
  totalSellVolume: number;
  realizedPnl: number;
  unrealizedPnl: number;
  costBasis?: number;
  cash: number;
  investedValue: number;
  totalValue: number;
  totalPnl: number;
  totalPnlPct: number;
  buyCount: number;
  sellCount: number;
  live?: boolean;
  compact?: boolean;
}

function pnlClass(n: number) {
  return n >= 0 ? styles.up : styles.down;
}

export function PnlStatementPanel({
  openingBalance,
  totalBuyVolume,
  totalSellVolume,
  realizedPnl,
  unrealizedPnl,
  costBasis,
  cash,
  investedValue,
  totalValue,
  totalPnl,
  totalPnlPct,
  buyCount,
  sellCount,
  live = false,
  compact = false,
}: PnlStatementPanelProps) {
  const fmtPnl = (n: number) => `${n >= 0 ? "+" : "−"}$${fmt(Math.abs(n))}`;

  return (
    <div className={styles.wrap}>
      {!compact && (
        <div className={styles.header}>
          <h3 className={styles.title}>P&amp;L Statement</h3>
          <p className={styles.sub}>
            {live
              ? "Live market prices on open holdings · realized P&L from your filled sell orders"
              : "From your buy & sell order history on this book"}
          </p>
        </div>
      )}
      <table className={styles.table}>
        <tbody>
          <tr>
            <td className={styles.label}>Starting capital (this book)</td>
            <td className={styles.value}>${fmt(openingBalance)}</td>
          </tr>
          <tr>
            <td className={styles.label}>Buy orders ({buyCount})</td>
            <td className={styles.valueMuted}>${fmt(totalBuyVolume)}</td>
          </tr>
          <tr>
            <td className={styles.label}>Sell orders ({sellCount})</td>
            <td className={styles.valueMuted}>${fmt(totalSellVolume)}</td>
          </tr>
          <tr>
            <td className={styles.label}>Realized P&L (closed sells)</td>
            <td className={`${styles.value} ${pnlClass(realizedPnl)}`}>{fmtPnl(realizedPnl)}</td>
          </tr>
          <tr>
            <td className={styles.label}>Unrealized P&amp;L (open positions)</td>
            <td className={`${styles.value} ${pnlClass(unrealizedPnl)}`}>
              {fmtPnl(unrealizedPnl)}
              {live ? <span className={styles.liveTag}> live</span> : null}
            </td>
          </tr>
          {costBasis != null && costBasis > 0 && (
            <tr>
              <td className={styles.label}>Cost basis (open holdings)</td>
              <td className={styles.valueMuted}>${fmt(costBasis)}</td>
            </tr>
          )}
          <tr>
            <td className={styles.label}>Cash wallet</td>
            <td className={styles.value}>${fmt(cash)}</td>
          </tr>
          <tr>
            <td className={styles.label}>Invested (market value)</td>
            <td className={styles.value}>${fmt(investedValue)}</td>
          </tr>
          <tr>
            <td className={styles.label}>Net portfolio value</td>
            <td className={styles.value}>${fmt(totalValue)}</td>
          </tr>
          <tr className={styles.totalRow}>
            <td className={styles.label}>Total P&L vs start</td>
            <td className={`${styles.value} ${pnlClass(totalPnl)}`}>
              {fmtPnl(totalPnl)} ({totalPnl >= 0 ? "+" : ""}{fmt(totalPnlPct)}%)
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
