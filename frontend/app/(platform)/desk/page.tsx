"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AccountProfileSection } from "@/components/account/AccountProfileSection";
import { wealthApi } from "@/lib/api";
import { ClientsMasterDetail } from "@/components/wealth/ClientsMasterDetail";
import { WalletPanel } from "@/components/wealth/WalletPanel";
import { useClientsCrud } from "@/lib/hooks/useClientsCrud";
import { useActiveBookStore } from "@/lib/store/activeBook";
import { PageLoading } from "@/components/shared/PageLoading";
import styles from "./desk.module.css";

export interface BrokerProfile {
  id: string;
  firm_name: string;
  rep_name: string | null;
  license_id: string | null;
  desk_code: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
}

type DeskSection = "broker" | "clients" | "wallet" | "profile";

const SECTIONS: DeskSection[] = ["broker", "clients", "wallet", "profile"];

function parseSection(raw: string | null): DeskSection {
  if (raw && SECTIONS.includes(raw as DeskSection)) return raw as DeskSection;
  return "broker";
}

async function fetchBroker(): Promise<BrokerProfile | null> {
  const res = await fetch("/api/wealth/broker", { credentials: "same-origin" });
  if (!res.ok) return null;
  const json = await res.json();
  return json.broker ?? null;
}

async function saveBroker(body: Record<string, string>) {
  const res = await fetch("/api/wealth/broker", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Save failed");
  return res.json();
}

function DeskPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeBook = useActiveBookStore((s) => s.activeBook);

  const [section, setSection] = useState<DeskSection>(() =>
    parseSection(searchParams.get("section"))
  );
  const [broker, setBroker] = useState<BrokerProfile | null>(null);
  const [brokerForm, setBrokerForm] = useState({
    firmName: "QuantDesk Securities",
    repName: "",
    licenseId: "",
    deskCode: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  });
  const [brokerSaving, setBrokerSaving] = useState(false);
  const [brokerMsg, setBrokerMsg] = useState("");

  const crud = useClientsCrud();

  useEffect(() => {
    setSection(parseSection(searchParams.get("section")));
  }, [searchParams]);

  const goSection = (next: DeskSection) => {
    setSection(next);
    router.replace(`/desk?section=${next}`, { scroll: false });
  };

  const loadBroker = useCallback(async () => {
    const b = await fetchBroker();
    if (b) {
      setBroker(b);
      setBrokerForm({
        firmName: b.firm_name,
        repName: b.rep_name ?? "",
        licenseId: b.license_id ?? "",
        deskCode: b.desk_code ?? "",
        email: b.email ?? "",
        phone: b.phone ?? "",
        address: b.address ?? "",
        notes: b.notes ?? "",
      });
    }
  }, []);

  useEffect(() => {
    void loadBroker();
  }, [loadBroker]);

  const saveBrokerProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setBrokerSaving(true);
    setBrokerMsg("");
    try {
      const { broker: saved } = await saveBroker({
        firmName: brokerForm.firmName,
        repName: brokerForm.repName,
        licenseId: brokerForm.licenseId,
        deskCode: brokerForm.deskCode,
        email: brokerForm.email,
        phone: brokerForm.phone,
        address: brokerForm.address,
        notes: brokerForm.notes,
      });
      setBroker(saved);
      setBrokerMsg("Broker profile saved to Supabase.");
    } catch {
      setBrokerMsg("Could not save broker profile.");
    } finally {
      setBrokerSaving(false);
    }
  };

  const handleDeleteClient = async (id: string) => {
    const c = crud.clients.find((x) => x.id === id);
    if (!window.confirm(`Delete client ${c?.display_name ?? ""}?`)) return;
    await crud.remove(id);
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Broker &amp; Client Desk</h1>
          <p className={styles.sub}>
            Broker identity, client registry, per-client wallet (+/−), and your account profile — Supabase.
          </p>
        </div>
        <Link href="/wealth" className="btn btn-ghost btn-sm">
          Books &amp; AUM →
        </Link>
      </header>

      <div className={styles.sectionTabs}>
        <button
          type="button"
          className={`${styles.sectionTab} ${section === "broker" ? styles.sectionActive : ""}`}
          onClick={() => goSection("broker")}
        >
          Broker profile
        </button>
        <button
          type="button"
          className={`${styles.sectionTab} ${section === "clients" ? styles.sectionActive : ""}`}
          onClick={() => goSection("clients")}
        >
          Client management ({crud.allCount})
        </button>
        <button
          type="button"
          className={`${styles.sectionTab} ${section === "wallet" ? styles.sectionActive : ""}`}
          onClick={() => goSection("wallet")}
        >
          Client wallet
        </button>
        <button
          type="button"
          className={`${styles.sectionTab} ${section === "profile" ? styles.sectionActive : ""}`}
          onClick={() => goSection("profile")}
        >
          Account profile
        </button>
      </div>

      {section === "broker" && (
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Your broker / advisor details</h2>
          <form id="broker-form" onSubmit={saveBrokerProfile} className={styles.formGrid}>
            <div className={styles.field}>
              <label>Firm name</label>
              <input className="input" required value={brokerForm.firmName} onChange={(e) => setBrokerForm({ ...brokerForm, firmName: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label>Representative name</label>
              <input className="input" value={brokerForm.repName} onChange={(e) => setBrokerForm({ ...brokerForm, repName: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label>License / CRD ID</label>
              <input className="input" value={brokerForm.licenseId} onChange={(e) => setBrokerForm({ ...brokerForm, licenseId: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label>Desk code</label>
              <input className="input" value={brokerForm.deskCode} onChange={(e) => setBrokerForm({ ...brokerForm, deskCode: e.target.value })} placeholder="JP-Desk-01" />
            </div>
            <div className={styles.field}>
              <label>Email</label>
              <input className="input" type="email" value={brokerForm.email} onChange={(e) => setBrokerForm({ ...brokerForm, email: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label>Phone</label>
              <input className="input" value={brokerForm.phone} onChange={(e) => setBrokerForm({ ...brokerForm, phone: e.target.value })} />
            </div>
            <div className={`${styles.field} ${styles.full}`}>
              <label>Address</label>
              <input className="input" value={brokerForm.address} onChange={(e) => setBrokerForm({ ...brokerForm, address: e.target.value })} />
            </div>
            <div className={`${styles.field} ${styles.full}`}>
              <label>Notes</label>
              <textarea className="input" rows={3} value={brokerForm.notes} onChange={(e) => setBrokerForm({ ...brokerForm, notes: e.target.value })} />
            </div>
          </form>
          <div className={styles.formActions}>
            <button type="submit" form="broker-form" className="btn btn-primary btn-sm" disabled={brokerSaving}>
              {brokerSaving ? "Saving…" : broker ? "Update broker" : "Save broker"}
            </button>
            {brokerMsg && <span className={styles.msg}>{brokerMsg}</span>}
          </div>
        </section>
      )}

      {section === "clients" && (
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Client management</h2>
          <p className={styles.walletHint} style={{ marginBottom: 16 }}>
            Click a client on the left to view details. Use the desk bar above to switch their book,
            then open{" "}
            <button type="button" className={styles.inlineLink} onClick={() => goSection("wallet")}>
              Client wallet
            </button>{" "}
            for deposits and withdrawals.
          </p>
          <ClientsMasterDetail
            crud={crud}
            onDelete={handleDeleteClient}
            onWallet={() => goSection("wallet")}
          />
        </section>
      )}

      {section === "wallet" && (
        <section className={styles.panel}>
          <div className={styles.panelHeadRow}>
            <h2 className={styles.panelTitle}>Client wallet · deposits &amp; withdrawals</h2>
            {activeBook && <span className={styles.bookTag}>{activeBook.label}</span>}
          </div>
          <p className={styles.walletHint}>
            Select the active client book in the desk bar above, then record + deposits or − withdrawals.
            Order history lives on{" "}
            <Link href="/trade" style={{ color: "var(--text-primary)", fontWeight: 600 }}>
              Trade
            </Link>
            .
          </p>
          <WalletPanel nested />
        </section>
      )}

      {section === "profile" && (
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Account profile</h2>
          <p className={styles.walletHint} style={{ marginBottom: 16 }}>
            Sign-in identity and preferences. Client cash is managed under{" "}
            <button type="button" className={styles.inlineLink} onClick={() => goSection("wallet")}>
              Client wallet
            </button>
            .
          </p>
          <AccountProfileSection />
        </section>
      )}

    </div>
  );
}

export default function DeskPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.page}>
          <PageLoading label="Loading desk…" rows={4} layout="inline" />
        </div>
      }
    >
      <DeskPageContent />
    </Suspense>
  );
}
