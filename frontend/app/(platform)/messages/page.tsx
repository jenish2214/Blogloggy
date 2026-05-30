"use client";
import { useEffect, useState } from "react";
import { messagesApi, type Message } from "@/lib/api";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";

const TYPE_ICONS: Record<string, string> = { trade: "⚡", alert: "🔔", system: "🖥", info: "ℹ" };
const TYPE_COLORS: Record<string, string> = { trade: "var(--accent-2)", alert: "var(--warn)", system: "var(--text-secondary)", info: "var(--text-secondary)" };

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const load = async () => {
    const { messages: msgs } = await messagesApi.getAll();
    setMessages(msgs);
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (!hasSupabaseEnv()) return;
    const supabase = createClient();
    if (!supabase) return;
    const channel = supabase.channel("messages_page").on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => load()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const markAllRead = async () => {
    await messagesApi.markRead();
    setMessages((prev) => prev.map((m) => ({ ...m, read: true })));
  };

  const markRead = async (id: string) => {
    await messagesApi.markRead(id);
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, read: true } : m));
  };

  const filtered = filter === "all" ? messages : messages.filter((m) => m.type === filter);
  const unread = messages.filter((m) => !m.read).length;

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>NOTIFICATIONS</div>
          <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "1.4rem", fontWeight: 600, color: "var(--text-primary)" }}>
            Messages
            {unread > 0 && <span className="badge badge-accent" style={{ marginLeft: 10, verticalAlign: "middle" }}>{unread} unread</span>}
          </h1>
        </div>
        {unread > 0 && <button className="btn btn-ghost btn-sm" onClick={markAllRead}>Mark all read</button>}
      </div>

      {/* Filter tabs */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        {["all", "trade", "alert", "system"].map((t) => (
          <button key={t} className={`tab-btn ${filter === t ? "active" : ""}`} onClick={() => setFilter(t)}>
            {t === "all" ? `All (${messages.length})` : `${TYPE_ICONS[t]} ${t.charAt(0).toUpperCase() + t.slice(1)}`}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 2 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}>
          <div style={{ fontSize: "2rem", marginBottom: 8 }}>📭</div>
          No messages yet. Start trading to see activity here.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 1, background: "var(--border)", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
          {filtered.map((msg) => (
            <div
              key={msg.id}
              onClick={() => !msg.read && markRead(msg.id)}
              style={{
                background: msg.read ? "var(--bg-surface)" : "var(--bg-surface-2)",
                padding: "14px 16px",
                cursor: msg.read ? "default" : "pointer",
                display: "flex",
                gap: 14,
                alignItems: "flex-start",
                borderLeft: `2px solid ${msg.read ? "transparent" : TYPE_COLORS[msg.type]}`,
                transition: "var(--t-fast)",
              }}
            >
              {/* Icon */}
              <div style={{ fontSize: "1.1rem", flexShrink: 0, marginTop: 1 }}>{TYPE_ICONS[msg.type] ?? "•"}</div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 3, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem", fontWeight: msg.read ? 400 : 600, color: "var(--text-primary)" }}>
                    {msg.title}
                  </span>
                  {!msg.read && <span style={{ width: 6, height: 6, borderRadius: "50%", background: TYPE_COLORS[msg.type], display: "inline-block", flexShrink: 0 }} />}
                </div>
                {msg.body && (
                  <div style={{ fontFamily: "var(--font-sans)", fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    {msg.body}
                  </div>
                )}
                {msg.metadata?.symbol != null && (
                  <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                    <span className="badge badge-neutral">{String(msg.metadata.symbol ?? "")}</span>
                    {msg.metadata.side != null && <span className={msg.metadata.side === "buy" ? "badge badge-up" : "badge badge-down"}>{String(msg.metadata.side).toUpperCase()}</span>}
                    {msg.metadata.qty != null && <span className="badge badge-neutral">{String(msg.metadata.qty)} shares</span>}
                    {msg.metadata.filledPrice != null && <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--text-muted)" }}>@ ${Number(msg.metadata.filledPrice).toFixed(2)}</span>}
                  </div>
                )}
              </div>

              {/* Time */}
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-muted)", flexShrink: 0 }}>
                {timeAgo(msg.created_at)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
