import { LoadingIndicator } from "@/components/shared/LoadingIndicator";

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
      <LoadingIndicator label="Loading…" />
    </div>
  );
}
