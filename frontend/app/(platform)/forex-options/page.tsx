"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";

const ForexPanel = dynamic(() => import("@/components/markets/ForexPanel"), {
  loading: () => <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Loading forex…</p>,
});

const OptionsPanel = dynamic(() => import("@/components/markets/OptionsPanel"), {
  loading: () => <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Loading options…</p>,
});

function ForexOptionsContent() {
  const searchParams = useSearchParams();
  const section = searchParams.get("section");
  const [openForex, setOpenForex] = useState(true);
  const [openOptions, setOpenOptions] = useState(false);

  useEffect(() => {
    if (section === "options") {
      setOpenOptions(true);
      setOpenForex(false);
    } else if (section === "forex") {
      setOpenForex(true);
    }
  }, [section]);

  return (
    <div className="page">
      <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: 800, margin: "0 0 20px", letterSpacing: "-0.03em" }}>
        Forex & Options
      </h1>

      <CollapsibleSection
        id="forex"
        title="Forex"
        defaultOpen
        open={openForex}
        onOpenChange={setOpenForex}
      >
        <ForexPanel embedded />
      </CollapsibleSection>

      <CollapsibleSection
        id="options"
        title="Options"
        open={openOptions}
        onOpenChange={setOpenOptions}
      >
        <OptionsPanel embedded />
      </CollapsibleSection>
    </div>
  );
}

export default function ForexOptionsPage() {
  return (
    <Suspense fallback={<div className="page"><div className="skeleton" style={{ height: 48 }} /></div>}>
      <ForexOptionsContent />
    </Suspense>
  );
}
