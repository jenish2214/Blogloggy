/** Shown while client-only login/signup forms load. */
export function AuthFormFallback() {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "48px 28px",
        textAlign: "center",
        boxShadow: "var(--shadow-lg)",
      }}
      aria-busy="true"
      aria-label="Loading"
    >
      <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", fontWeight: 500 }}>
        Loading…
      </div>
    </div>
  );
}
