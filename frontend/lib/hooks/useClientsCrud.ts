"use client";

import { useCallback, useEffect, useState } from "react";
import {
  wealthApi,
  type ClientDetailResponse,
  type ClientFormPayload,
  type WealthClient,
} from "@/lib/api";

export type ClientFormMode = "create" | "read" | "update" | null;

const EMPTY_FORM: ClientFormPayload = {
  displayName: "",
  clientCode: "",
  email: "",
  tier: "private",
  riskProfile: "moderate",
  status: "active",
  initialCapital: 500_000,
  notes: "",
};

export function clientToForm(c: WealthClient): ClientFormPayload {
  return {
    displayName: c.display_name,
    clientCode: c.client_code,
    email: c.email ?? "",
    tier: c.tier,
    riskProfile: c.risk_profile,
    status: c.status,
    initialCapital: Number(c.initial_capital),
    notes: c.notes ?? "",
  };
}

export function useClientsCrud(onBooksRefresh?: () => void) {
  const [clients, setClients] = useState<WealthClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ClientFormMode>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<ClientFormPayload>(EMPTY_FORM);
  const [detail, setDetail] = useState<ClientDetailResponse | null>(null);
  const [search, setSearch] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { clients: list } = await wealthApi.getClients();
      setClients(list);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load clients");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const loadDetail = useCallback(async (id: string) => {
    try {
      const data = await wealthApi.getClient(id);
      setDetail(data);
      setForm(clientToForm(data.client));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load client");
    }
  }, []);

  const openCreate = useCallback(() => {
    setMode("create");
    setSelectedId(null);
    setDetail(null);
    setForm({ ...EMPTY_FORM });
  }, []);

  const openRead = useCallback(
    async (id: string) => {
      setMode("read");
      setSelectedId(id);
      await loadDetail(id);
    },
    [loadDetail]
  );

  const openUpdate = useCallback(
    async (id: string) => {
      setMode("update");
      setSelectedId(id);
      await loadDetail(id);
    },
    [loadDetail]
  );

  const closePanel = useCallback(() => {
    setMode(null);
    setSelectedId(null);
    setDetail(null);
    setForm({ ...EMPTY_FORM });
  }, []);

  const create = useCallback(async () => {
    setSaving(true);
    try {
      await wealthApi.createClient({
        ...form,
        email: form.email || undefined,
        notes: form.notes || undefined,
      });
      await refresh();
      onBooksRefresh?.();
      closePanel();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
      throw e;
    } finally {
      setSaving(false);
    }
  }, [form, refresh, onBooksRefresh, closePanel]);

  const update = useCallback(async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      await wealthApi.updateClient(selectedId, {
        ...form,
        email: form.email || undefined,
        notes: form.notes || undefined,
      });
      await refresh();
      onBooksRefresh?.();
      await loadDetail(selectedId);
      setMode("read");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
      throw e;
    } finally {
      setSaving(false);
    }
  }, [selectedId, form, refresh, onBooksRefresh, loadDetail]);

  const remove = useCallback(
    async (id: string) => {
      setSaving(true);
      try {
        await wealthApi.deleteClient(id);
        if (selectedId === id) closePanel();
        await refresh();
        onBooksRefresh?.();
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Delete failed");
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [selectedId, refresh, onBooksRefresh, closePanel]
  );

  const filtered = clients.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      c.display_name.toLowerCase().includes(q) ||
      c.client_code.toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q)
    );
  });

  return {
    clients: filtered,
    allCount: clients.length,
    loading,
    saving,
    error,
    setError,
    search,
    setSearch,
    mode,
    selectedId,
    form,
    setForm,
    detail,
    refresh,
    openCreate,
    openRead,
    openUpdate,
    closePanel,
    create,
    update,
    remove,
  };
}
