"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { pdf } from "@react-pdf/renderer";
import api from "@/lib/api";
import { getUser, logout } from "@/lib/auth";
import {
  STATUS_LABELS,
  STATUS_BADGE,
  formatDate,
  formatDateTime,
} from "@/lib/persian";

type Tab = "upload" | "products" | "orders" | "users";

// ── Search types ──────────────────────────────────────────────────────────────
type SortField = "name" | "price" | "quantityMain" | "categoryMain" | "id";
type SortOrder = "asc" | "desc";

interface SearchParams {
  name?: string;
  categoryMain?: string;
  categorySecond?: string;
  unitType?: string;
  priceMin?: string;
  priceMax?: string;
  quantityMin?: string;
  quantityMax?: string;
  sortBy: SortField;
  sortOrder: SortOrder;
}

const DEFAULT_SEARCH: SearchParams = {
  name: "",
  categoryMain: "",
  categorySecond: "",
  unitType: "",
  priceMin: "",
  priceMax: "",
  quantityMin: "",
  quantityMax: "",
  sortBy: "name",
  sortOrder: "asc",
};

export default function AdminDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("upload");
  const [user, setUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [newUser, setNewUser] = useState({
    name: "",
    phone: "",
    password: "",
    role: "VISITOR",
  });
  const [creatingUser, setCreatingUser] = useState(false);

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (tab === "users") loadUsers();
  }, [tab]);

  async function loadUsers() {
    try {
      const { data } = await api.get("/users");
      setUsers(data);
    } catch {
      toast.error("خطا در بارگذاری کاربران");
    }
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    if (!newUser.name || !newUser.phone || !newUser.password) {
      toast.error("لطفاً همه فیلدها را پر کنید");
      return;
    }
    if (newUser.password.length < 6) {
      toast.error("رمز عبور باید حداقل ۶ کاراکتر باشد");
      return;
    }
    setCreatingUser(true);
    try {
      await api.post("/users", newUser);
      toast.success("کاربر با موفقیت ایجاد شد");
      setNewUser({ name: "", phone: "", password: "", role: "VISITOR" });
      await loadUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "خطا در ایجاد کاربر");
    } finally {
      setCreatingUser(false);
    }
  }

  // ── Products + Infinite Scroll state ─────────────────────────────────────
  const [products, setProducts] = useState<any[]>([]);
  const [productsTotalCount, setProductsTotalCount] = useState<number>(0); // for stats
  const [searchParams, setSearchParams] =
    useState<SearchParams>(DEFAULT_SEARCH);
  const [draftSearch, setDraftSearch] = useState<SearchParams>(DEFAULT_SEARCH); // uncommitted form state
  const [showFilters, setShowFilters] = useState(false);
  const [cursor, setCursor] = useState<number | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // IntersectionObserver sentinel
  const sentinelRef = useRef<HTMLDivElement>(null);

  // ── Orders state ──────────────────────────────────────────────────────────
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [sellerSummary, setSellerSummary] = useState<any[]>([]);
  const [editingItem, setEditingItem] = useState<{
    orderId: number;
    itemId: number;
    quantity: number;
    unitPrice: number;
  } | null>(null);

  const generatePDF = async (order: any) => {
    try {
      const { OrderInvoicePDF } =
        await import("@/app/admin/components/OrderInvoicePDF");
      const blob = await pdf(<OrderInvoicePDF order={order} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `سفارش-${order.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("خطا در تولید PDF");
      console.error(err);
    }
  };

  const [passwordModalUser, setPasswordModalUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  async function handleChangePassword(userId: number) {
    if (!newPassword || newPassword.length < 6) {
      toast.error("رمز عبور باید حداقل ۶ کاراکتر باشد");
      return;
    }
    setChangingPassword(true);
    try {
      await api.patch(`/users/${userId}/password`, { newPassword });
      toast.success("رمز عبور تغییر کرد");
      setPasswordModalUser(null);
      setNewPassword("");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "خطا در تغییر رمز");
    } finally {
      setChangingPassword(false);
    }
  }

  // ── Auth / init ───────────────────────────────────────────────────────────
  useEffect(() => {
    const u = getUser();
    if (!u || u.role !== "ADMIN") {
      router.replace("/login");
      return;
    }
    setUser(u);
  }, []);

  useEffect(() => {
    if (tab === "products") {
      resetAndSearch(searchParams);
    }
    if (tab === "orders") {
      loadOrders();
      loadSellerSummary();
    }
  }, [tab]);

  // ── Search helpers ────────────────────────────────────────────────────────

  function buildQuery(params: SearchParams, cur?: number | null) {
    const q = new URLSearchParams();
    if (params.name) q.set("name", params.name);
    if (params.categoryMain) q.set("categoryMain", params.categoryMain);
    if (params.categorySecond) q.set("categorySecond", params.categorySecond);
    if (params.unitType) q.set("unitType", params.unitType);
    if (params.priceMin) q.set("priceMin", params.priceMin);
    if (params.priceMax) q.set("priceMax", params.priceMax);
    if (params.quantityMin) q.set("quantityMin", params.quantityMin);
    if (params.quantityMax) q.set("quantityMax", params.quantityMax);
    q.set("sortBy", params.sortBy);
    q.set("sortOrder", params.sortOrder);
    q.set("limit", "30");
    if (cur) q.set("cursor", String(cur));
    return q.toString();
  }

  /** Fresh search — resets list */
  async function resetAndSearch(params: SearchParams) {
    setLoadingProducts(true);
    setProducts([]);
    setCursor(null);
    setHasNextPage(false);
    try {
      const { data } = await api.get(`/products/search?${buildQuery(params)}`);
      setProducts(data.data);
      setHasNextPage(data.pagination.hasNextPage);
      setCursor(data.pagination.nextCursor);
      // also keep a rough total count using the latest batch for the stats bar
      if (!productsTotalCount) {
        const latest = await api.get("/products/latest");
        const arr =
          Array.isArray(latest.data) ?
            latest.data
          : latest.data?.products || [];
        setProductsTotalCount(arr.length);
      }
    } catch {
      toast.error("خطا در جستجوی محصولات");
    } finally {
      setLoadingProducts(false);
    }
  }

  /** Load next page and append */
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasNextPage || cursor === null) return;
    setLoadingMore(true);
    try {
      const { data } = await api.get(
        `/products/search?${buildQuery(searchParams, cursor)}`,
      );
      setProducts((prev) => [...prev, ...data.data]);
      setHasNextPage(data.pagination.hasNextPage);
      setCursor(data.pagination.nextCursor);
    } catch {
      toast.error("خطا در بارگذاری بیشتر");
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasNextPage, cursor, searchParams]);

  // Intersection Observer — fires loadMore when sentinel is visible
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSearchParams(draftSearch);
    resetAndSearch(draftSearch);
  }

  function handleResetFilters() {
    setDraftSearch(DEFAULT_SEARCH);
    setSearchParams(DEFAULT_SEARCH);
    resetAndSearch(DEFAULT_SEARCH);
  }

  // ── Orders ────────────────────────────────────────────────────────────────
  async function loadOrders() {
    setLoading(true);
    try {
      const { data } = await api.get("/orders");
      setOrders(data);
    } catch {
      toast.error("خطا در بارگذاری سفارشات");
    } finally {
      setLoading(false);
    }
  }

  async function loadSellerSummary() {
    try {
      const { data } = await api.get("/orders/seller-summary");
      setSellerSummary(data);
    } catch {
      toast.error("خطا در بارگذاری خلاصه فروشندگان");
    }
  }

  async function handleUpload() {
    if (!file) {
      toast.error("لطفاً یک فایل اکسل انتخاب کنید");
      return;
    }
    const confirmed = window.confirm(
      `آیا از بارگذاری فایل "${file.name}" مطمئن هستید؟`,
    );
    if (!confirmed) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const { data } = await api.post("/upload/excel", fd);
      toast.success(data.message);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      if (tab === "products") resetAndSearch(searchParams);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "خطا در بارگذاری فایل");
    } finally {
      setUploading(false);
    }
  }

  async function updateOrderStatus(orderId: number, status: string) {
    const label = STATUS_LABELS[status];
    const confirmed = window.confirm(`وضعیت سفارش به "${label}" تغییر کند؟`);
    if (!confirmed) return;
    try {
      await api.patch(`/orders/${orderId}/status`, { status });
      toast.success("وضعیت سفارش بروز شد");
      await loadOrders();
      await loadSellerSummary();
    } catch {
      toast.error("خطا در بروزرسانی وضعیت");
    }
  }

  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    categoryMain: "",
    categorySecond: "",
    imageBase64: "",
  });
  const [uploadingImage, setUploadingImage] = useState(false);

  async function updateProduct(productId: number) {
    try {
      await api.patch(`/products/${productId}`, {
        categoryMain: editForm.categoryMain,
        categorySecond: editForm.categorySecond || null,
        imageUrl: editForm.imageBase64 || null,
      });
      toast.success("محصول بروز شد");
      setEditingProduct(null);
      // Update product in-place without full reload
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId ?
            {
              ...p,
              categoryMain: editForm.categoryMain,
              categorySecond: editForm.categorySecond || null,
              imageUrl: editForm.imageBase64 || null,
            }
          : p,
        ),
      );
    } catch (err: any) {
      toast.error(err.response?.data?.message || "خطا در بروزرسانی");
    }
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploadingImage(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX = 800;
        let w = img.width,
          h = img.height;
        if (w > h) {
          if (w > MAX) {
            h *= MAX / w;
            w = MAX;
          }
        } else {
          if (h > MAX) {
            w *= MAX / h;
            h = MAX;
          }
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
        setEditForm({
          ...editForm,
          imageBase64: canvas.toDataURL("image/jpeg", 0.7),
        });
        setUploadingImage(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(f);
  }

  async function updateOrderItem(
    orderId: number,
    itemId: number,
    quantity: number,
    unitPrice: number,
  ) {
    try {
      await api.patch(`/orders/${orderId}/items/${itemId}`, {
        quantity,
        unitPrice,
      });
      toast.success("آیتم سفارش بروز شد");
      await loadOrders();
      await loadSellerSummary();
      setEditingItem(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "خطا در بروزرسانی آیتم");
    }
  }

  async function removeOrderItem(orderId: number, itemId: number) {
    if (!window.confirm("آیا از حذف این آیتم مطمئن هستید؟")) return;
    try {
      await api.delete(`/orders/${orderId}/items/${itemId}`);
      toast.success("آیتم حذف شد");
      await loadOrders();
      await loadSellerSummary();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "خطا در حذف آیتم");
    }
  }

  async function updatePayment(orderId: number, paidAmount: number) {
    try {
      await api.patch(`/orders/${orderId}/payment`, { paidAmount });
      toast.success("مبلغ پرداختی بروز شد");
      await loadOrders();
      await loadSellerSummary();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "خطا در بروزرسانی پرداخت");
    }
  }

  function handleLogout() {
    if (window.confirm("آیا می‌خواهید از سیستم خارج شوید؟")) {
      logout();
      router.push("/login");
    }
  }

  const tabs = [
    { key: "upload", label: "بارگذاری فایل", icon: "📤" },
    { key: "products", label: "محصولات", icon: "📦" },
    { key: "orders", label: "سفارشات", icon: "📋" },
    { key: "users", label: "کاربران", icon: "👥" },
  ];

  const hasActiveFilters =
    draftSearch.name ||
    draftSearch.categoryMain ||
    draftSearch.categorySecond ||
    draftSearch.unitType ||
    draftSearch.priceMin ||
    draftSearch.priceMax ||
    draftSearch.quantityMin ||
    draftSearch.quantityMax;

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-blue-800 text-white shadow-xl">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-3 py-4 sm:px-4 md:flex-row md:items-center md:justify-between lg:px-6 xl:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="shrink-0 text-3xl sm:text-4xl">🏪</span>
            <div className="min-w-0">
              <h1 className="text-xl font-bold sm:text-2xl">پنل مدیریت</h1>
              <p className="truncate text-xs text-blue-200 sm:text-sm">
                خوش آمدید، {user?.name}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold transition-colors hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-white/70 md:w-auto md:px-6 md:py-3 md:text-base"
          >
            خروج 🚪
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1600px] px-3 py-4 sm:px-4 sm:py-6 lg:px-6 xl:px-8">
        {/* Stats bar */}
        <div className="mb-4 grid grid-cols-2 gap-3 sm:mb-6 sm:gap-4">
          {[
            {
              label: "کل محصولات",
              value: productsTotalCount || products.length || "—",
              icon: "📦",
              color: "bg-green-500",
            },
            {
              label: "سفارشات",
              value: orders.length || "—",
              icon: "📋",
              color: "bg-orange-500",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="card flex min-w-0 items-center gap-3 p-3 sm:gap-4 sm:p-4"
            >
              <div
                className={`${s.color} shrink-0 rounded-xl p-2.5 text-xl text-white sm:rounded-2xl sm:p-3 sm:text-2xl`}
              >
                {s.icon}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xl font-bold text-gray-800 sm:text-2xl">
                  {s.value}
                </p>
                <p className="truncate text-xs text-gray-500 sm:text-sm">
                  {s.label}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl border border-gray-100 bg-white p-2 shadow-sm sm:mb-6 sm:grid-cols-4">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key as Tab)}
              className={`min-w-0 rounded-xl px-2 py-2.5 text-xs font-bold transition-all sm:px-4 sm:py-3 sm:text-sm lg:text-base ${
                tab === t.key
                  ? "bg-blue-700 text-white shadow"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span className="block truncate sm:inline">
                <span className="ml-1">{t.icon}</span>
                {t.label}
              </span>
            </button>
          ))}
        </div>

        {/* ---------- UPLOAD TAB ---------- */}
        {tab === "upload" && (
          <section className="mx-auto w-full max-w-4xl">
            <div className="card p-4 sm:p-6">
              <h2 className="mb-4 text-lg font-bold text-gray-800 sm:mb-6 sm:text-2xl">
                📤 بارگذاری فایل اکسل
              </h2>

              <button
                type="button"
                className="flex w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50 px-4 py-8 text-center transition-colors hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 sm:rounded-3xl sm:border-4 sm:p-10"
                onClick={() => fileRef.current?.click()}
              >
                <span className="mb-3 text-5xl sm:mb-4 sm:text-6xl">📊</span>
                <span className="mb-2 text-base font-bold text-gray-700 sm:text-xl">
                  فایل اکسل را اینجا انتخاب کنید
                </span>
                <span className="text-xs text-gray-500 sm:text-sm">
                  فرمت‌های قابل قبول: .xlsx و .xls
                </span>

                {file && (
                  <span className="mt-4 max-w-full break-all rounded-xl bg-green-100 px-3 py-2 text-xs font-bold text-green-800 sm:px-4 sm:text-sm">
                    ✅ {file.name}
                  </span>
                )}
              </button>

              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />

              <button
                type="button"
                onClick={handleUpload}
                disabled={!file || uploading}
                className="btn-primary mt-4 w-full"
              >
                {uploading ? (
                  <span className="flex items-center justify-center gap-3">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent sm:h-6 sm:w-6" />
                    در حال بارگذاری...
                  </span>
                ) : (
                  "📤 بارگذاری فایل"
                )}
              </button>
            </div>
          </section>
        )}

        {/* ---------- PRODUCTS TAB ---------- */}
        {tab === "products" && (
          <section className="space-y-4">
            {/* Search & filters */}
            <div className="card p-3 sm:p-5">
              <form onSubmit={handleSearchSubmit}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <div className="relative min-w-0 flex-1">
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-lg text-gray-400">
                      🔍
                    </span>
                    <input
                      type="text"
                      placeholder="جستجوی نام محصول..."
                      className="input-field w-full pr-10"
                      value={draftSearch.name}
                      onChange={(e) =>
                        setDraftSearch({ ...draftSearch, name: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:shrink-0">
                    <button type="submit" className="btn-primary whitespace-nowrap">
                      جستجو
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowFilters((value) => !value)}
                      className={`relative whitespace-nowrap rounded-xl border-2 px-3 py-2 font-bold transition-all sm:px-4 ${
                        showFilters
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      🎛️ فیلترها
                      {hasActiveFilters && (
                        <span className="absolute -left-1.5 -top-1.5 h-3 w-3 rounded-full bg-blue-600" />
                      )}
                    </button>

                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="col-span-2 rounded-xl px-3 py-2 text-sm font-bold text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 sm:col-span-1"
                      >
                        ✕ پاک کردن فیلترها
                      </button>
                    )}
                  </div>
                </div>

                {showFilters && (
                  <div className="mt-4 grid grid-cols-1 gap-4 border-t border-gray-100 pt-4 sm:grid-cols-2 xl:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-gray-500">
                        دسته اصلی
                      </label>
                      <input
                        type="text"
                        placeholder="مثلاً: لبنیات"
                        className="input-field w-full"
                        value={draftSearch.categoryMain}
                        onChange={(e) =>
                          setDraftSearch({
                            ...draftSearch,
                            categoryMain: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-gray-500">
                        دسته فرعی
                      </label>
                      <input
                        type="text"
                        placeholder="مثلاً: ماست"
                        className="input-field w-full"
                        value={draftSearch.categorySecond}
                        onChange={(e) =>
                          setDraftSearch({
                            ...draftSearch,
                            categorySecond: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-gray-500">
                        نوع واحد
                      </label>
                      <input
                        type="text"
                        placeholder="مثلاً: کارتن"
                        className="input-field w-full"
                        value={draftSearch.unitType}
                        onChange={(e) =>
                          setDraftSearch({
                            ...draftSearch,
                            unitType: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-gray-500">
                        بازه قیمت (تومان)
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          placeholder="از"
                          className="input-field min-w-0 w-full"
                          min={0}
                          value={draftSearch.priceMin}
                          onChange={(e) =>
                            setDraftSearch({
                              ...draftSearch,
                              priceMin: e.target.value,
                            })
                          }
                        />
                        <input
                          type="number"
                          placeholder="تا"
                          className="input-field min-w-0 w-full"
                          min={0}
                          value={draftSearch.priceMax}
                          onChange={(e) =>
                            setDraftSearch({
                              ...draftSearch,
                              priceMax: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-gray-500">
                        بازه موجودی
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          placeholder="از"
                          className="input-field min-w-0 w-full"
                          min={0}
                          value={draftSearch.quantityMin}
                          onChange={(e) =>
                            setDraftSearch({
                              ...draftSearch,
                              quantityMin: e.target.value,
                            })
                          }
                        />
                        <input
                          type="number"
                          placeholder="تا"
                          className="input-field min-w-0 w-full"
                          min={0}
                          value={draftSearch.quantityMax}
                          onChange={(e) =>
                            setDraftSearch({
                              ...draftSearch,
                              quantityMax: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-gray-500">
                        مرتب‌سازی
                      </label>
                      <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-2">
                        <select
                          className="input-field min-w-0 w-full"
                          value={draftSearch.sortBy}
                          onChange={(e) =>
                            setDraftSearch({
                              ...draftSearch,
                              sortBy: e.target.value as SortField,
                            })
                          }
                        >
                          <option value="name">نام</option>
                          <option value="price">قیمت</option>
                          <option value="quantityMain">موجودی</option>
                          <option value="categoryMain">دسته‌بندی</option>
                        </select>
                        <select
                          className="input-field min-w-0 w-full"
                          value={draftSearch.sortOrder}
                          onChange={(e) =>
                            setDraftSearch({
                              ...draftSearch,
                              sortOrder: e.target.value as SortOrder,
                            })
                          }
                        >
                          <option value="asc">صعودی</option>
                          <option value="desc">نزولی</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="btn-primary sm:col-span-2 xl:col-span-3"
                    >
                      اعمال جستجو و فیلترها
                    </button>
                  </div>
                )}
              </form>
            </div>

            {!loadingProducts && (
              <p className="px-1 text-xs text-gray-500 sm:text-sm">
                {products.length} محصول نمایش داده می‌شود
                {hasNextPage && " (برای مشاهده بیشتر به پایین بروید)"}
              </p>
            )}

            <div className="card overflow-hidden p-0">
              {loadingProducts ? (
                <LoadingSpinner />
              ) : products.length === 0 ? (
                <EmptyState text="محصولی یافت نشد" />
              ) : (
                <>
                  {/* Mobile and small tablet product cards */}
                  <div className="space-y-3 p-3 md:hidden">
                    {products.map((product: any) => (
                      <article
                        key={product.id}
                        className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm"
                      >
                        <div className="flex items-start gap-3">
                          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-2xl text-gray-300">
                                📦
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <h3 className="break-words text-sm font-bold text-gray-800 sm:text-base">
                              {product.name}
                            </h3>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs">
                              <span className="rounded-lg bg-gray-100 px-2 py-1 text-gray-600">
                                {product.categoryMain || "بدون دسته"}
                              </span>
                              <span
                                className={`rounded-lg px-2 py-1 font-bold ${
                                  product.quantityMain > 0
                                    ? "bg-green-50 text-green-700"
                                    : "bg-red-50 text-red-600"
                                }`}
                              >
                                موجودی: {product.quantity}
                              </span>
                            </div>
                          </div>
                        </div>

                        <dl className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-gray-50 p-3 text-xs">
                          <div>
                            <dt className="text-gray-400">واحد</dt>
                            <dd className="mt-1 break-words font-semibold text-gray-700">
                              {product.unitType} / {product.subUnitType}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-gray-400">تعداد واحد</dt>
                            <dd className="mt-1 font-semibold text-gray-700">
                              {product.quantityMain}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-gray-400">تکی</dt>
                            <dd className="mt-1 font-semibold text-gray-700">
                              {product.quantityBonus}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-gray-400">قیمت</dt>
                            <dd className="mt-1 font-bold text-blue-700">
                              {product.price?.toLocaleString("fa-IR")} تومان
                            </dd>
                          </div>
                        </dl>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingProduct(product);
                            setEditForm({
                              categoryMain: product.categoryMain || "",
                              categorySecond: product.categorySecond || "",
                              imageBase64: product.imageUrl || "",
                            });
                          }}
                          className="mt-3 w-full rounded-xl bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700 transition-colors hover:bg-blue-100"
                        >
                          ویرایش محصول
                        </button>
                      </article>
                    ))}
                  </div>

                  {/* Desktop product table */}
                  <div className="hidden overflow-x-auto md:block">
                    <table className="min-w-[1050px] w-full text-right">
                      <thead>
                        <tr className="border-b-2 border-gray-200 bg-gray-50">
                          {[
                            "نام محصول",
                            "واحد",
                            "تعداد واحد",
                            "تکی",
                            "دسته‌بندی",
                            "موجودی",
                            "قیمت",
                            "تصویر",
                            "عملیات",
                          ].map((heading) => (
                            <th
                              key={heading}
                              className="whitespace-nowrap px-4 py-3 text-sm font-bold text-gray-600"
                            >
                              {heading}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {products.map((product: any) => (
                          <tr
                            key={product.id}
                            className="border-b border-gray-100 transition-colors hover:bg-blue-50"
                          >
                            <td className="max-w-[260px] px-4 py-3 font-semibold">
                              <span className="line-clamp-2">{product.name}</span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                              {product.unitType} / {product.subUnitType}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {product.quantityMain}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {product.quantityBonus}
                            </td>
                            <td className="px-4 py-3">
                              <span className="whitespace-nowrap rounded-lg bg-gray-100 px-2 py-1 text-sm">
                                {product.categoryMain}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`font-bold ${
                                  product.quantityMain > 0
                                    ? "text-green-600"
                                    : "text-red-500"
                                }`}
                              >
                                {product.quantity}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm lg:text-base">
                              {product.price?.toLocaleString("fa-IR")}
                            </td>
                            <td className="px-4 py-3">
                              {product.imageUrl ? (
                                <img
                                  src={product.imageUrl}
                                  alt={product.name}
                                  className="h-12 w-12 rounded-lg object-cover"
                                />
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingProduct(product);
                                  setEditForm({
                                    categoryMain: product.categoryMain || "",
                                    categorySecond: product.categorySecond || "",
                                    imageBase64: product.imageUrl || "",
                                  });
                                }}
                                className="whitespace-nowrap text-sm font-bold text-blue-600 hover:text-blue-800"
                              >
                                ویرایش
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              <div ref={sentinelRef} className="flex justify-center px-3 py-4">
                {loadingMore && (
                  <div className="flex items-center gap-2 text-xs text-gray-400 sm:text-sm">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                    در حال بارگذاری...
                  </div>
                )}
                {!hasNextPage && products.length > 0 && !loadingProducts && (
                  <p className="text-xs text-gray-300 sm:text-sm">
                    همه محصولات نمایش داده شد
                  </p>
                )}
              </div>
            </div>

            {/* Edit Product Modal */}
            {editingProduct && (
              <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
                <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-4 shadow-2xl sm:max-w-lg sm:rounded-2xl sm:p-6">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <h3 className="min-w-0 break-words text-lg font-bold text-gray-800 sm:text-xl">
                      ویرایش محصول: {editingProduct.name}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditingProduct(null)}
                      className="shrink-0 rounded-full bg-gray-100 px-3 py-1.5 text-gray-500 hover:bg-gray-200"
                      aria-label="بستن"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block text-sm font-bold text-gray-700">
                        دسته‌بندی اصلی
                      </label>
                      <input
                        type="text"
                        className="input-field w-full"
                        value={editForm.categoryMain}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            categoryMain: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-bold text-gray-700">
                        دسته‌بندی فرعی (اختیاری)
                      </label>
                      <input
                        type="text"
                        className="input-field w-full"
                        value={editForm.categorySecond}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            categorySecond: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-bold text-gray-700">
                        تصویر محصول
                      </label>
                      {editForm.imageBase64 && (
                        <div className="mb-3 flex justify-center sm:justify-start">
                          <img
                            src={editForm.imageBase64}
                            alt="پیش‌نمایش محصول"
                            className="h-32 w-32 rounded-xl border object-cover"
                          />
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="block w-full text-xs text-gray-500 sm:text-sm"
                      />
                      {uploadingImage && (
                        <p className="mt-1 text-sm text-blue-600">
                          در حال آماده‌سازی تصویر...
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-3">
                      <button
                        type="button"
                        onClick={() => setEditingProduct(null)}
                        className="btn-secondary w-full"
                      >
                        انصراف
                      </button>
                      <button
                        type="button"
                        onClick={() => updateProduct(editingProduct.id)}
                        className="btn-primary w-full"
                      >
                        ذخیره تغییرات
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ---------- ORDERS TAB ---------- */}
        {tab === "orders" && (
          <section className="space-y-4 sm:space-y-6">
            <div className="card p-3 sm:p-5">
              <h3 className="mb-4 text-lg font-bold text-gray-800 sm:text-xl">
                📊 خلاصه مالی فروشندگان
              </h3>

              {sellerSummary.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-400">
                  هیچ داده مالی موجود نیست
                </p>
              ) : (
                <>
                  <div className="space-y-3 md:hidden">
                    {sellerSummary.map((summary) => (
                      <article
                        key={summary.id}
                        className="rounded-2xl border border-gray-100 bg-gray-50 p-3"
                      >
                        <h4 className="mb-3 break-words font-bold text-gray-800">
                          {summary.name}
                        </h4>
                        <dl className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
                          <div>
                            <dt className="text-gray-400">جمع کل</dt>
                            <dd className="mt-1 font-semibold text-gray-700">
                              {summary.totalAmount.toLocaleString()} تومان
                            </dd>
                          </div>
                          <div>
                            <dt className="text-gray-400">پرداختی</dt>
                            <dd className="mt-1 font-semibold text-gray-700">
                              {summary.totalPaid.toLocaleString()} تومان
                            </dd>
                          </div>
                          <div className="col-span-2 rounded-xl bg-white p-2">
                            <dt className="text-gray-400">مانده</dt>
                            <dd
                              className={`mt-1 font-bold ${
                                summary.outstanding > 0
                                  ? "text-red-600"
                                  : "text-green-600"
                              }`}
                            >
                              {summary.outstanding.toLocaleString()} تومان
                            </dd>
                          </div>
                        </dl>
                      </article>
                    ))}
                  </div>

                  <div className="hidden overflow-x-auto md:block">
                    <table className="min-w-[720px] w-full border-collapse text-right">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="p-3 font-bold text-gray-700">فروشنده</th>
                          <th className="p-3 font-bold text-gray-700">
                            جمع کل (تومان)
                          </th>
                          <th className="p-3 font-bold text-gray-700">
                            پرداختی (تومان)
                          </th>
                          <th className="p-3 font-bold text-gray-700">
                            مانده (تومان)
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sellerSummary.map((summary) => (
                          <tr
                            key={summary.id}
                            className="border-b border-gray-200"
                          >
                            <td className="p-3 font-semibold">{summary.name}</td>
                            <td className="p-3">
                              {summary.totalAmount.toLocaleString()}
                            </td>
                            <td className="p-3">
                              {summary.totalPaid.toLocaleString()}
                            </td>
                            <td
                              className={`p-3 font-bold ${
                                summary.outstanding > 0
                                  ? "text-red-600"
                                  : "text-green-600"
                              }`}
                            >
                              {summary.outstanding.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            <div className="card p-3 sm:p-5">
              <h2 className="mb-4 text-lg font-bold text-gray-800 sm:mb-6 sm:text-2xl">
                📋 مدیریت سفارشات
              </h2>

              {loading ? (
                <LoadingSpinner />
              ) : orders.length === 0 ? (
                <EmptyState text="هنوز سفارشی ثبت نشده است" />
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {orders.map((order: any) => {
                    const isExpanded = expandedOrderId === order.id;

                    return (
                      <article
                        key={order.id}
                        className="rounded-2xl border-2 border-gray-100 p-3 transition-colors hover:border-blue-200 sm:p-5"
                      >
                        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedOrderId(isExpanded ? null : order.id)
                            }
                            className="min-w-0 text-right"
                          >
                            <div className="mb-2 flex flex-wrap items-center gap-2 sm:gap-3">
                              <span className="text-base font-bold text-gray-800 sm:text-xl">
                                سفارش #{order.id}
                              </span>
                              <span className={STATUS_BADGE[order.status]}>
                                {STATUS_LABELS[order.status]}
                              </span>
                              <span className="text-xs text-gray-400 sm:text-sm">
                                {isExpanded ? "▲ بستن" : "▼ جزئیات"}
                              </span>
                            </div>

                            <div className="space-y-1 text-xs sm:text-sm">
                              <p className="break-words text-gray-600">
                                🏪 {order.seller?.name || order.shop?.name || "نامشخص"}
                              </p>
                              {order.user && (
                                <p className="break-words text-gray-500">
                                  👤 {order.user.name} — {order.user.phone}
                                </p>
                              )}
                              <p className="text-gray-400">
                                {formatDateTime(order.createdAt)}
                              </p>
                              {order.notes && (
                                <span className="mt-1 inline-block max-w-full break-words rounded-lg bg-yellow-50 px-2 py-1 text-gray-600">
                                  📝 {order.notes}
                                </span>
                              )}
                            </div>
                          </button>

                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:w-[320px]">
                            <select
                              value={order.status}
                              onChange={(e) =>
                                updateOrderStatus(order.id, e.target.value)
                              }
                              className="w-full rounded-xl border-2 border-gray-200 bg-white px-3 py-2 text-sm font-bold focus:border-blue-500 focus:outline-none"
                            >
                              {Object.entries(STATUS_LABELS).map(([key, value]) => (
                                <option key={key} value={key}>
                                  {value}
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              onClick={() => generatePDF(order)}
                              className="w-full rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-700"
                            >
                              📄 چاپ فاکتور
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="mt-4 border-t border-gray-200 pt-4 sm:mt-5">
                            <div className="mb-5">
                              <p className="mb-3 font-bold text-gray-700">
                                🛍️ اقلام سفارش
                              </p>

                              <div className="space-y-3">
                                {order.items?.map((item: any) => {
                                  const isEditing = editingItem?.itemId === item.id;

                                  return (
                                    <div
                                      key={item.id}
                                      className="rounded-xl bg-gray-50 p-3"
                                    >
                                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="min-w-0 flex-1">
                                          <p className="break-words font-semibold text-gray-800">
                                            {item.product?.name}
                                          </p>

                                          {isEditing ? (
                                            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[auto_9rem_auto_11rem_auto_auto] xl:items-center">
                                              <label className="text-sm font-semibold text-gray-600">
                                                تعداد
                                              </label>
                                              <input
                                                type="number"
                                                className="input-field w-full py-2"
                                                value={editingItem.quantity}
                                                onChange={(e) =>
                                                  setEditingItem((previous) =>
                                                    previous
                                                      ? {
                                                          ...previous,
                                                          quantity: Number(e.target.value),
                                                        }
                                                      : null,
                                                  )
                                                }
                                                min="1"
                                              />

                                              <label className="text-sm font-semibold text-gray-600">
                                                قیمت واحد
                                              </label>
                                              <input
                                                type="number"
                                                className="input-field w-full py-2"
                                                value={editingItem.unitPrice}
                                                onChange={(e) =>
                                                  setEditingItem((previous) =>
                                                    previous
                                                      ? {
                                                          ...previous,
                                                          unitPrice: Number(e.target.value),
                                                        }
                                                      : null,
                                                  )
                                                }
                                                min="0"
                                              />

                                              <button
                                                type="button"
                                                onClick={() =>
                                                  updateOrderItem(
                                                    order.id,
                                                    item.id,
                                                    editingItem.quantity,
                                                    editingItem.unitPrice,
                                                  )
                                                }
                                                className="btn-success w-full px-4 py-2 text-sm"
                                              >
                                                ذخیره
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setEditingItem(null)}
                                                className="btn-secondary w-full px-4 py-2 text-sm"
                                              >
                                                انصراف
                                              </button>
                                            </div>
                                          ) : (
                                            <div className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3 sm:text-sm">
                                              <span className="rounded-lg bg-white px-2 py-2">
                                                تعداد: {item.quantity}
                                              </span>
                                              <span className="rounded-lg bg-white px-2 py-2">
                                                قیمت واحد: {item.unitPrice?.toLocaleString()} تومان
                                              </span>
                                              <span className="rounded-lg bg-blue-50 px-2 py-2 font-bold text-blue-700">
                                                جمع: {(item.quantity * item.unitPrice).toLocaleString()} تومان
                                              </span>
                                            </div>
                                          )}
                                        </div>

                                        {!isEditing && (
                                          <div className="grid grid-cols-2 gap-2 lg:w-auto lg:shrink-0">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setEditingItem({
                                                  orderId: order.id,
                                                  itemId: item.id,
                                                  quantity: item.quantity,
                                                  unitPrice: item.unitPrice,
                                                })
                                              }
                                              className="rounded-lg px-3 py-2 text-sm font-bold text-blue-600 hover:bg-blue-50"
                                            >
                                              ویرایش
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                removeOrderItem(order.id, item.id)
                                              }
                                              className="rounded-lg px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50"
                                            >
                                              حذف
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="space-y-4 rounded-xl border bg-white p-3 sm:p-4">
                              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                <span className="font-bold text-gray-700">
                                  💰 جمع کل سفارش:
                                </span>
                                <span className="text-lg font-bold text-green-700 sm:text-xl">
                                  {order.totalAmount?.toLocaleString()} تومان
                                </span>
                              </div>

                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <label
                                  htmlFor={`paid-amount-${order.id}`}
                                  className="font-bold text-gray-700"
                                >
                                  💵 مبلغ پرداختی:
                                </label>
                                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:w-64">
                                  <input
                                    id={`paid-amount-${order.id}`}
                                    type="number"
                                    defaultValue={order.paidAmount}
                                    onBlur={(e) =>
                                      updatePayment(order.id, Number(e.target.value))
                                    }
                                    className="input-field min-w-0 w-full py-2 text-left"
                                    dir="ltr"
                                    min="0"
                                    step="1000"
                                  />
                                  <span className="text-sm">تومان</span>
                                </div>
                              </div>

                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <span className="font-bold text-gray-700">
                                  وضعیت پرداخت:
                                </span>
                                <span
                                  className={`w-fit rounded-full px-3 py-1 text-sm font-bold ${
                                    order.paymentStatus === "PAID"
                                      ? "bg-green-100 text-green-800"
                                      : order.paymentStatus === "PARTIAL"
                                        ? "bg-yellow-100 text-yellow-800"
                                        : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {order.paymentStatus === "PAID"
                                    ? "پرداخت کامل"
                                    : order.paymentStatus === "PARTIAL"
                                      ? "پرداخت جزئی"
                                      : "پرداخت نشده"}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ---------- USERS TAB ---------- */}
        {tab === "users" && (
          <section className="space-y-4 sm:space-y-6">
            <div className="card p-3 sm:p-5">
              <h3 className="mb-4 text-lg font-bold text-gray-800 sm:text-xl">
                ➕ افزودن کاربر جدید
              </h3>

              <form onSubmit={createUser} className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <input
                    type="text"
                    placeholder="نام کامل"
                    className="input-field w-full"
                    value={newUser.name}
                    onChange={(e) =>
                      setNewUser({ ...newUser, name: e.target.value })
                    }
                  />
                  <input
                    type="tel"
                    inputMode="tel"
                    placeholder="شماره موبایل"
                    className="input-field w-full"
                    value={newUser.phone}
                    onChange={(e) =>
                      setNewUser({ ...newUser, phone: e.target.value })
                    }
                  />
                  <input
                    type="password"
                    placeholder="رمز عبور (حداقل ۶ کاراکتر)"
                    className="input-field w-full"
                    value={newUser.password}
                    onChange={(e) =>
                      setNewUser({ ...newUser, password: e.target.value })
                    }
                  />
                  <select
                    className="input-field w-full"
                    value={newUser.role}
                    onChange={(e) =>
                      setNewUser({ ...newUser, role: e.target.value })
                    }
                  >
                    <option value="VISITOR">ویزیتور (خریدار)</option>
                    <option value="SHOP_OWNER">فروشنده</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={creatingUser}
                  className="btn-success w-full sm:w-auto"
                >
                  {creatingUser ? "در حال ایجاد..." : "➕ ایجاد کاربر"}
                </button>
              </form>
            </div>

            <div className="card overflow-hidden p-0">
              <h3 className="px-3 pb-3 pt-4 text-lg font-bold text-gray-800 sm:px-5 sm:pb-4 sm:pt-5 sm:text-xl">
                📋 لیست کاربران
              </h3>

              {users.length === 0 ? (
                <EmptyState text="هیچ کاربری یافت نشد" />
              ) : (
                <>
                  <div className="space-y-3 p-3 md:hidden">
                    {users.map((currentUser) => (
                      <article
                        key={currentUser.id}
                        className="rounded-2xl border border-gray-100 bg-gray-50 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="break-words font-bold text-gray-800">
                              {currentUser.name}
                            </h4>
                            <p className="mt-1 break-all text-sm text-gray-600" dir="ltr">
                              {currentUser.phone}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${
                              currentUser.role === "SHOP_OWNER"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {currentUser.role === "SHOP_OWNER" ? "فروشنده" : "ویزیتور"}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-col gap-2 border-t border-gray-200 pt-3 sm:flex-row sm:items-center sm:justify-between">
                          <span className="text-xs text-gray-500">
                            تاریخ ثبت: {formatDate(currentUser.createdAt)}
                          </span>
                          <button
                            type="button"
                            onClick={() => setPasswordModalUser(currentUser)}
                            className="w-full rounded-xl bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700 sm:w-auto"
                          >
                            تغییر رمز
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>

                  <div className="hidden overflow-x-auto md:block">
                    <table className="min-w-[760px] w-full text-right">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="p-3">نام</th>
                          <th className="p-3">موبایل</th>
                          <th className="p-3">نقش</th>
                          <th className="p-3">تاریخ ثبت</th>
                          <th className="p-3">عملیات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((currentUser) => (
                          <tr key={currentUser.id} className="border-b">
                            <td className="p-3 font-semibold">
                              {currentUser.name}
                            </td>
                            <td className="p-3" dir="ltr">
                              {currentUser.phone}
                            </td>
                            <td className="p-3">
                              <span
                                className={`rounded-full px-2 py-1 text-xs font-bold ${
                                  currentUser.role === "SHOP_OWNER"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {currentUser.role === "SHOP_OWNER"
                                  ? "فروشنده"
                                  : "ویزیتور"}
                              </span>
                            </td>
                            <td className="p-3 text-sm text-gray-500">
                              {formatDate(currentUser.createdAt)}
                            </td>
                            <td className="p-3">
                              <button
                                type="button"
                                onClick={() => setPasswordModalUser(currentUser)}
                                className="whitespace-nowrap text-sm font-bold text-blue-600 hover:text-blue-800"
                              >
                                تغییر رمز
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            {passwordModalUser && (
              <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
                <div className="w-full rounded-t-3xl bg-white p-4 shadow-2xl sm:max-w-md sm:rounded-2xl sm:p-6">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-lg font-bold sm:text-xl">
                        تغییر رمز عبور
                      </h3>
                      <p className="mt-1 break-words text-sm text-gray-600">
                        کاربر: {passwordModalUser.name}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPasswordModalUser(null);
                        setNewPassword("");
                      }}
                      className="shrink-0 rounded-full bg-gray-100 px-3 py-1.5 text-gray-500 hover:bg-gray-200"
                      aria-label="بستن"
                    >
                      ✕
                    </button>
                  </div>

                  <input
                    type="password"
                    placeholder="رمز عبور جدید (حداقل ۶ کاراکتر)"
                    className="input-field mb-4 w-full"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setPasswordModalUser(null);
                        setNewPassword("");
                      }}
                      className="btn-secondary w-full"
                    >
                      انصراف
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChangePassword(passwordModalUser.id)}
                      disabled={changingPassword}
                      className="btn-primary w-full"
                    >
                      {changingPassword ? "در حال تغییر..." : "تغییر رمز"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex justify-center px-4 py-10 sm:py-12">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-700 border-t-transparent sm:h-12 sm:w-12" />
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="px-4 py-10 text-center text-base text-gray-400 sm:py-12 sm:text-xl">
      {text}
    </p>
  );
}
