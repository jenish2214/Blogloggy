/** Auth pages use Supabase at runtime; skip static prerender so builds succeed without env at compile time. */
export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "var(--bg-base)",
        position: "relative",
      }}
    >
      {/* Subtle dot grid — gray only, no gradient glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "radial-gradient(circle, #E5E5E5 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          pointerEvents: "none",
          opacity: 0.6,
        }}
      />
      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 620 }}>
        {children}
      </div>
    </div>
  );
}
