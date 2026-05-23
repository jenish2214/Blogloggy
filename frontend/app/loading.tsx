export default function Loading() {
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-mono)",
        color: "var(--text-muted)",
        fontSize: "0.78rem",
        letterSpacing: "0.1em",
      }}
    >
      LOADING...
    </div>
  );
}
