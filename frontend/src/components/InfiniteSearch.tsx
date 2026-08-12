"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import api from "@/lib/api";

export type OrderFilters = {
  q: string;
  status: string;
  paymentStatus: string;
  dateFrom: string;
  dateTo: string;
  amountMin: string;
  amountMax: string;
};

export const EMPTY_ORDER_FILTERS: OrderFilters = {
  q: "", status: "", paymentStatus: "", dateFrom: "", dateTo: "",
  amountMin: "", amountMax: "",
};

function toQuery(values: Record<string, string>, cursor?: number | null) {
  const query = new URLSearchParams({ limit: "20" });
  Object.entries(values).forEach(([key, value]) => value && query.set(key, value));
  if (cursor) query.set("cursor", String(cursor));
  return query.toString();
}

export function useInfiniteOrders(endpoint: string, enabled = true) {
  const [orders, setOrders] = useState<any[]>([]);
  const [filters, setFilters] = useState<OrderFilters>(EMPTY_ORDER_FILTERS);
  const [draft, setDraft] = useState<OrderFilters>(EMPTY_ORDER_FILTERS);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [total, setTotal] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const sentinelRef = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);

  const fetchPage = useCallback(async (active: OrderFilters, cursor?: number | null) => {
    const append = cursor != null;
    const id = ++requestId.current;
    append ? setLoadingMore(true) : setLoading(true);
    try {
      const { data } = await api.get(`${endpoint}?${toQuery(active, cursor)}`);
      if (id !== requestId.current) return;
      const incoming = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      setOrders((current) => append
        ? Array.from(new Map([...current, ...incoming].map((item) => [item.id, item])).values())
        : incoming,
      );
      setNextCursor(data?.pagination?.nextCursor ?? null);
      setHasNextPage(Boolean(data?.pagination?.hasNextPage));
      setTotal(Number(data?.pagination?.total ?? incoming.length));
      if (!append) setStatusCounts(data?.summary?.statusCounts ?? {});
    } catch (error: any) {
      if (id === requestId.current) toast.error(error.response?.data?.message || "خطا در بارگذاری سفارشات");
    } finally {
      if (id === requestId.current) append ? setLoadingMore(false) : setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    if (enabled) void fetchPage(filters);
    else requestId.current++;
  }, [enabled, filters, fetchPage]);

  const loadMore = useCallback(() => {
    if (enabled && hasNextPage && nextCursor && !loading && !loadingMore) {
      void fetchPage(filters, nextCursor);
    }
  }, [enabled, hasNextPage, nextCursor, loading, loadingMore, fetchPage, filters]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && loadMore(), { rootMargin: "300px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore]);

  return {
    orders, loading, loadingMore, hasNextPage, total, statusCounts, draft, setDraft, sentinelRef,
    apply: () => setFilters({ ...draft }),
    reset: () => { setDraft(EMPTY_ORDER_FILTERS); setFilters(EMPTY_ORDER_FILTERS); },
    refresh: () => fetchPage(filters),
  };
}

export function OrderSearch({ draft, setDraft, apply, reset, showPayment = true }: {
  draft: OrderFilters;
  setDraft: (value: OrderFilters) => void;
  apply: () => void;
  reset: () => void;
  showPayment?: boolean;
}) {
  const update = (key: keyof OrderFilters, value: string) => setDraft({ ...draft, [key]: value });
  const submit = (event: FormEvent) => { event.preventDefault(); apply(); };
  return (
    <form onSubmit={submit} className="mb-4 rounded-2xl border border-gray-100 bg-gray-50 p-3 sm:p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input className="input-field w-full lg:col-span-2" type="search" value={draft.q}
          onChange={(e) => update("q", e.target.value)} placeholder="شماره سفارش، نام، موبایل، کالا یا توضیحات" />
        <select className="input-field w-full" value={draft.status} onChange={(e) => update("status", e.target.value)}>
          <option value="">همه وضعیت‌ها</option><option value="PENDING">در انتظار</option>
          <option value="CONFIRMED">تأیید شده</option><option value="SHIPPED">ارسال شده</option>
          <option value="DELIVERED">تحویل شده</option><option value="CANCELLED">لغو شده</option>
        </select>
        {showPayment && <select className="input-field w-full" value={draft.paymentStatus} onChange={(e) => update("paymentStatus", e.target.value)}>
          <option value="">همه پرداخت‌ها</option><option value="UNPAID">پرداخت نشده</option>
          <option value="PARTIAL">پرداخت جزئی</option><option value="PAID">پرداخت کامل</option>
        </select>}
        <label className="text-xs font-bold text-gray-500">از تاریخ<input className="input-field mt-1 w-full" type="date" value={draft.dateFrom} onChange={(e) => update("dateFrom", e.target.value)} /></label>
        <label className="text-xs font-bold text-gray-500">تا تاریخ<input className="input-field mt-1 w-full" type="date" value={draft.dateTo.slice(0, 10)} onChange={(e) => update("dateTo", e.target.value ? `${e.target.value}T23:59:59.999Z` : "")} /></label>
        <input className="input-field w-full self-end" type="number" min="0" value={draft.amountMin} onChange={(e) => update("amountMin", e.target.value)} placeholder="حداقل مبلغ" />
        <input className="input-field w-full self-end" type="number" min="0" value={draft.amountMax} onChange={(e) => update("amountMax", e.target.value)} placeholder="حداکثر مبلغ" />
      </div>
      <div className="mt-3 flex gap-2"><button className="btn-primary" type="submit">جستجو</button><button className="btn-secondary" type="button" onClick={reset}>پاک کردن</button></div>
    </form>
  );
}

export type UserFilters = { q: string; role: string; dateFrom: string; dateTo: string };
export const EMPTY_USER_FILTERS: UserFilters = { q: "", role: "", dateFrom: "", dateTo: "" };

export function useInfiniteUsers(endpoint: string, enabled = true, initial: UserFilters = EMPTY_USER_FILTERS) {
  const [users, setUsers] = useState<any[]>([]);
  const [filters, setFilters] = useState<UserFilters>(initial);
  const [draft, setDraft] = useState<UserFilters>(initial);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pagination, setPagination] = useState({ nextCursor: null as number | null, hasNextPage: false, total: 0 });
  const sentinelRef = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);
  const fetchPage = useCallback(async (active: UserFilters, cursor?: number | null) => {
    const append = cursor != null; const id = ++requestId.current;
    append ? setLoadingMore(true) : setLoading(true);
    try {
      const { data } = await api.get(`${endpoint}?${toQuery(active, cursor)}`);
      if (id !== requestId.current) return;
      const incoming = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      setUsers((current) => append ? Array.from(new Map([...current, ...incoming].map((item) => [item.id, item])).values()) : incoming);
      setPagination({ nextCursor: data?.pagination?.nextCursor ?? null, hasNextPage: Boolean(data?.pagination?.hasNextPage), total: Number(data?.pagination?.total ?? incoming.length) });
    } catch (error: any) { if (id === requestId.current) toast.error(error.response?.data?.message || "خطا در بارگذاری کاربران"); }
    finally { if (id === requestId.current) append ? setLoadingMore(false) : setLoading(false); }
  }, [endpoint]);
  useEffect(() => { if (enabled) void fetchPage(filters); else requestId.current++; }, [enabled, filters, fetchPage]);
  const loadMore = useCallback(() => {
    if (enabled && pagination.hasNextPage && pagination.nextCursor && !loading && !loadingMore) void fetchPage(filters, pagination.nextCursor);
  }, [enabled, pagination, loading, loadingMore, fetchPage, filters]);
  useEffect(() => { const node = sentinelRef.current; if (!node) return; const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && loadMore(), { rootMargin: "300px" }); observer.observe(node); return () => observer.disconnect(); }, [loadMore]);
  const searchQ = useCallback((q: string) => {
    setDraft((current) => ({ ...current, q }));
    setFilters((current) => ({ ...current, q }));
  }, []);
  return { users, loading, loadingMore, total: pagination.total, draft, setDraft, sentinelRef,
    apply: () => setFilters({ ...draft }), reset: () => { setDraft(initial); setFilters(initial); }, refresh: () => fetchPage(filters), searchQ };
}

export function UserSearch({ draft, setDraft, apply, reset, roles = true }: {
  draft: UserFilters; setDraft: (value: UserFilters) => void; apply: () => void; reset: () => void; roles?: boolean;
}) {
  const update = (key: keyof UserFilters, value: string) => setDraft({ ...draft, [key]: value });
  return <form onSubmit={(e) => { e.preventDefault(); apply(); }} className="mx-3 mb-4 rounded-2xl bg-gray-50 p-3 sm:mx-5">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <input className="input-field w-full" type="search" value={draft.q} onChange={(e) => update("q", e.target.value)} placeholder="نام، موبایل یا شناسه" />
      {roles && <select className="input-field w-full" value={draft.role} onChange={(e) => update("role", e.target.value)}><option value="">همه نقش‌ها</option><option value="VISITOR">ویزیتور</option><option value="SHOP_OWNER">فروشنده</option></select>}
      <input className="input-field w-full" type="date" value={draft.dateFrom} onChange={(e) => update("dateFrom", e.target.value)} aria-label="از تاریخ" />
      <input className="input-field w-full" type="date" value={draft.dateTo.slice(0, 10)} onChange={(e) => update("dateTo", e.target.value ? `${e.target.value}T23:59:59.999Z` : "")} aria-label="تا تاریخ" />
    </div><div className="mt-3 flex gap-2"><button className="btn-primary" type="submit">جستجو</button><button className="btn-secondary" type="button" onClick={reset}>پاک کردن</button></div>
  </form>;
}
