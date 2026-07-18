// app/seller/order/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

import api from "@/lib/api";
import { getUser, logout } from "@/lib/auth";

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

export default function SellerOrderPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const [searchParams, setSearchParams] =
    useState<SearchParams>(DEFAULT_SEARCH);
  const [draftSearch, setDraftSearch] =
    useState<SearchParams>(DEFAULT_SEARCH);
  const [showFilters, setShowFilters] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const currentUser = getUser();

    if (!currentUser) {
      router.replace("/login");
      return;
    }

    if (currentUser.role !== "SHOP_OWNER") {
      router.replace("/");
      return;
    }

    setUser(currentUser);
    void searchProducts(DEFAULT_SEARCH);
  }, [router]);

  async function searchProducts(params: SearchParams) {
    setSearching(true);

    try {
      const query = new URLSearchParams();

      if (params.name) query.set("name", params.name);
      if (params.categoryMain) {
        query.set("categoryMain", params.categoryMain);
      }
      if (params.categorySecond) {
        query.set("categorySecond", params.categorySecond);
      }
      if (params.unitType) query.set("unitType", params.unitType);
      if (params.priceMin) query.set("priceMin", params.priceMin);
      if (params.priceMax) query.set("priceMax", params.priceMax);
      if (params.quantityMin) {
        query.set("quantityMin", params.quantityMin);
      }
      if (params.quantityMax) {
        query.set("quantityMax", params.quantityMax);
      }

      query.set("sortBy", params.sortBy);
      query.set("sortOrder", params.sortOrder);
      query.set("limit", "50");

      const { data } = await api.get(
        `/products/search?${query.toString()}`,
      );

      const result = Array.isArray(data?.data) ? data.data : [];
      setProducts(result);

      if (result.length === 0) {
        toast("هیچ محصولی با این شرایط یافت نشد", {
          icon: "🔍",
        });
      }
    } catch (err) {
      toast.error("خطا در جستجوی محصولات");
      console.error(err);
    } finally {
      setSearching(false);
      setLoading(false);
    }
  }

  function getProductStock(product: any) {
    const stock = Number(
      product.quantity ?? product.quantityMain ?? 0,
    );

    return Number.isFinite(stock) && stock > 0 ? stock : 0;
  }

  function updateCart(
    productId: number,
    requestedQuantity: number,
    maxQuantity: number,
  ) {
    const nextQuantity = Math.max(
      0,
      Math.min(requestedQuantity, maxQuantity),
    );

    setCart((currentCart) => {
      const nextCart = { ...currentCart };

      if (nextQuantity === 0) {
        delete nextCart[productId];
      } else {
        nextCart[productId] = nextQuantity;
      }

      return nextCart;
    });
  }

  const cartTotalItems = useMemo(
    () =>
      Object.values(cart).reduce(
        (sum, quantity) => sum + quantity,
        0,
      ),
    [cart],
  );

  const selectedProductsCount = Object.keys(cart).length;

  const estimatedTotal = useMemo(
    () =>
      products.reduce((sum, product) => {
        const quantity = cart[product.id] || 0;
        return sum + quantity * Number(product.price || 0);
      }, 0),
    [cart, products],
  );

  async function submitOrder() {
    if (selectedProductsCount === 0) {
      toast.error("لطفاً حداقل یک محصول انتخاب کنید");
      return;
    }

    const confirmed = window.confirm(
      `آیا از ثبت سفارش برای خودتان (${user?.name}) مطمئن هستید؟\n` +
        `تعداد اقلام: ${selectedProductsCount} - مجموع تعداد: ${cartTotalItems} عدد`,
    );

    if (!confirmed) return;

    setSubmitting(true);

    try {
      const items = Object.entries(cart).map(
        ([productId, quantity]) => ({
          productId: Number(productId),
          quantity,
        }),
      );

      await api.post("/orders", {
        sellerId: user.id,
        notes: notes.trim() || undefined,
        items,
      });

      toast.success("سفارش با موفقیت ثبت شد!");
      setCart({});
      setNotes("");
      router.push("/seller");
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || "خطا در ثبت سفارش",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function resetFilters() {
    setDraftSearch(DEFAULT_SEARCH);
    setSearchParams(DEFAULT_SEARCH);
    void searchProducts(DEFAULT_SEARCH);
  }

  function handleLogout() {
    const confirmed = window.confirm(
      "آیا از خروج از سیستم مطمئن هستید؟",
    );

    if (!confirmed) return;

    logout();
    router.push("/login");
  }

  if (!user) return null;

  const hasActiveFilters = Boolean(
    draftSearch.name ||
      draftSearch.categoryMain ||
      draftSearch.categorySecond ||
      draftSearch.unitType ||
      draftSearch.priceMin ||
      draftSearch.priceMax ||
      draftSearch.quantityMin ||
      draftSearch.quantityMax,
  );

  return (
    <div
      className="min-h-screen overflow-x-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-orange-100 pb-28"
      dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-amber-700/40 bg-amber-800 text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-3 py-3 sm:px-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/seller"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 text-xl transition-colors hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="بازگشت به پنل فروشنده">
              <span aria-hidden="true">→</span>
            </Link>

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 text-2xl">
              🛒
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold sm:text-xl">
                ثبت سفارش جدید
              </h1>
              <p className="mt-0.5 truncate text-xs text-amber-200 sm:text-sm">
                انتخاب محصولات برای فروشگاه {user.name}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <Link
              href="/seller"
              className="flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-bold transition-colors hover:bg-white/20">
              <span>→</span>
              <span>بازگشت به پنل</span>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl bg-amber-700 px-4 py-2.5 text-sm font-bold transition-colors hover:bg-amber-600">
              خروج 🚪
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-4 px-3 py-5 sm:px-4 sm:py-7">
        {/* Intro */}
        <section className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-gray-800">
                محصولات موردنیاز را انتخاب کنید
              </h2>
              <p className="mt-1 text-sm leading-6 text-gray-500">
                تعداد هر محصول را مشخص کنید و سپس سفارش را از نوار
                پایین صفحه ثبت کنید.
              </p>
            </div>

            {selectedProductsCount > 0 && (
              <div className="flex w-fit flex-wrap gap-2">
                <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800">
                  {selectedProductsCount.toLocaleString("fa-IR")} قلم
                </span>
                <span className="rounded-full bg-blue-100 px-3 py-1.5 text-xs font-bold text-blue-800">
                  {cartTotalItems.toLocaleString("fa-IR")} عدد
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Search and filters */}
        <section className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm sm:p-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setSearchParams(draftSearch);
              void searchProducts(draftSearch);
            }}>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:gap-3">
              <div className="relative min-w-0">
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  🔍
                </span>
                <input
                  type="search"
                  placeholder="جستجوی نام محصول..."
                  className="input-field w-full pr-10"
                  value={draftSearch.name}
                  onChange={(event) =>
                    setDraftSearch({
                      ...draftSearch,
                      name: event.target.value,
                    })
                  }
                />
              </div>

              <button
                type="submit"
                disabled={searching}
                className="btn-primary min-h-11 whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-60">
                {searching ? "در حال جستجو..." : "جستجو"}
              </button>

              <button
                type="button"
                onClick={() =>
                  setShowFilters((current) => !current)
                }
                className={`relative min-h-11 whitespace-nowrap rounded-xl border-2 px-4 py-2 font-bold transition-all ${
                  showFilters
                    ? "border-amber-600 bg-amber-50 text-amber-700"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                }`}>
                🎛️ فیلترها
                {hasActiveFilters && (
                  <span className="absolute -left-1 -top-1 h-3 w-3 rounded-full bg-amber-600 ring-2 ring-white" />
                )}
              </button>
            </div>

            {hasActiveFilters && (
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-sm font-bold text-gray-400 transition-colors hover:text-red-500">
                  ✕ پاک‌کردن همه فیلترها
                </button>
              </div>
            )}

            {showFilters && (
              <div className="mt-4 grid grid-cols-1 gap-4 border-t border-gray-100 pt-4 sm:grid-cols-2 xl:grid-cols-3">
                <FilterInput
                  label="دسته اصلی"
                  placeholder="مثلاً: لبنیات"
                  value={draftSearch.categoryMain || ""}
                  onChange={(value) =>
                    setDraftSearch({
                      ...draftSearch,
                      categoryMain: value,
                    })
                  }
                />

                <FilterInput
                  label="دسته فرعی"
                  placeholder="مثلاً: ماست"
                  value={draftSearch.categorySecond || ""}
                  onChange={(value) =>
                    setDraftSearch({
                      ...draftSearch,
                      categorySecond: value,
                    })
                  }
                />

                <FilterInput
                  label="نوع واحد"
                  placeholder="مثلاً: کارتن"
                  value={draftSearch.unitType || ""}
                  onChange={(value) =>
                    setDraftSearch({
                      ...draftSearch,
                      unitType: value,
                    })
                  }
                />

                <RangeFilter
                  label="بازه قیمت (تومان)"
                  minValue={draftSearch.priceMin || ""}
                  maxValue={draftSearch.priceMax || ""}
                  onMinChange={(value) =>
                    setDraftSearch({
                      ...draftSearch,
                      priceMin: value,
                    })
                  }
                  onMaxChange={(value) =>
                    setDraftSearch({
                      ...draftSearch,
                      priceMax: value,
                    })
                  }
                />

                <RangeFilter
                  label="بازه موجودی"
                  minValue={draftSearch.quantityMin || ""}
                  maxValue={draftSearch.quantityMax || ""}
                  onMinChange={(value) =>
                    setDraftSearch({
                      ...draftSearch,
                      quantityMin: value,
                    })
                  }
                  onMaxChange={(value) =>
                    setDraftSearch({
                      ...draftSearch,
                      quantityMax: value,
                    })
                  }
                />

                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-500">
                    مرتب‌سازی
                  </label>
                  <div className="grid grid-cols-[minmax(0,1fr)_100px] gap-2">
                    <select
                      className="input-field min-w-0"
                      value={draftSearch.sortBy}
                      onChange={(event) =>
                        setDraftSearch({
                          ...draftSearch,
                          sortBy: event.target.value as SortField,
                        })
                      }>
                      <option value="name">نام</option>
                      <option value="price">قیمت</option>
                      <option value="quantityMain">موجودی</option>
                      <option value="categoryMain">دسته‌بندی</option>
                    </select>

                    <select
                      className="input-field min-w-0"
                      value={draftSearch.sortOrder}
                      onChange={(event) =>
                        setDraftSearch({
                          ...draftSearch,
                          sortOrder: event.target.value as SortOrder,
                        })
                      }>
                      <option value="asc">صعودی</option>
                      <option value="desc">نزولی</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </form>
        </section>

        {/* Results heading */}
        {!loading && !searching && products.length > 0 && (
          <div className="flex flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-bold text-gray-800 sm:text-xl">
              محصولات
            </h2>
            <p className="text-sm text-gray-500">
              {products.length.toLocaleString("fa-IR")} محصول نمایش
              داده می‌شود
            </p>
          </div>
        )}

        {/* Products */}
        {loading || searching ? (
          <LoadingState />
        ) : products.length === 0 ? (
          <EmptyState />
        ) : (
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => {
              const quantity = cart[product.id] || 0;
              const stock = getProductStock(product);
              const inStock = stock > 0;
              const isSelected = quantity > 0;
              const hasReachedLimit = quantity >= stock;

              return (
                <article
                  key={product.id}
                  className={`group relative flex min-w-0 flex-col overflow-hidden rounded-3xl border bg-white shadow-sm transition-all duration-200 ${
                    isSelected
                      ? "border-amber-500 ring-2 ring-amber-200"
                      : "border-gray-100 hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-lg"
                  } ${!inStock ? "opacity-70" : ""}`}>
                  {isSelected && (
                    <div className="absolute right-3 top-3 z-10 rounded-full bg-amber-600 px-3 py-1 text-xs font-bold text-white shadow">
                      ✓ انتخاب شده
                    </div>
                  )}

                  {/* Product image */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center text-gray-300">
                        <span className="text-5xl">📦</span>
                        <span className="mt-2 text-xs">
                          بدون تصویر
                        </span>
                      </div>
                    )}

                    <div className="absolute bottom-3 left-3">
                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-bold shadow-sm ${
                          inStock
                            ? "bg-green-100/95 text-green-800"
                            : "bg-red-100/95 text-red-700"
                        }`}>
                        {inStock
                          ? `موجودی ${stock.toLocaleString("fa-IR")}`
                          : "ناموجود"}
                      </span>
                    </div>
                  </div>

                  {/* Product information */}
                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex-1">
                      <h3
                        className="break-words text-base font-extrabold leading-7 text-gray-800"
                        title={product.name}>
                        {product.name}
                      </h3>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {product.categoryMain && (
                          <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                            {product.categoryMain}
                          </span>
                        )}

                        {product.categorySecond && (
                          <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                            {product.categorySecond}
                          </span>
                        )}

                        {product.unitType && (
                          <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                            واحد: {product.unitType}
                          </span>
                        )}
                      </div>

                      <div className="mt-4 flex items-end justify-between gap-3 border-t border-gray-100 pt-4">
                        <div>
                          <p className="text-xs text-gray-400">
                            قیمت واحد
                          </p>
                          <p className="mt-1 text-lg font-black text-amber-700">
                            {Number(product.price || 0).toLocaleString(
                              "fa-IR",
                            )}
                            <span className="mr-1 text-xs font-medium text-gray-500">
                              تومان
                            </span>
                          </p>
                        </div>

                        {quantity > 0 && (
                          <div className="text-left">
                            <p className="text-xs text-gray-400">
                              جمع محصول
                            </p>
                            <p className="mt-1 text-sm font-bold text-gray-700">
                              {(
                                Number(product.price || 0) * quantity
                              ).toLocaleString("fa-IR")}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quantity selector */}
                    <div className="mt-4">
                      {!inStock ? (
                        <button
                          type="button"
                          disabled
                          className="h-12 w-full cursor-not-allowed rounded-2xl bg-gray-100 font-bold text-gray-400">
                          این محصول موجود نیست
                        </button>
                      ) : quantity === 0 ? (
                        <button
                          type="button"
                          onClick={() =>
                            updateCart(product.id, 1, stock)
                          }
                          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-amber-600 font-bold text-white transition-colors hover:bg-amber-700 focus:outline-none focus:ring-4 focus:ring-amber-200">
                          <span className="text-xl">＋</span>
                          افزودن به سفارش
                        </button>
                      ) : (
                        <div className="flex h-12 items-center overflow-hidden rounded-2xl border-2 border-amber-200 bg-amber-50">
                          <button
                            type="button"
                            onClick={() =>
                              updateCart(
                                product.id,
                                quantity - 1,
                                stock,
                              )
                            }
                            className="flex h-full w-14 shrink-0 items-center justify-center text-2xl font-bold text-red-600 transition-colors hover:bg-red-100"
                            aria-label={`کاهش تعداد ${product.name}`}>
                            −
                          </button>

                          <div className="flex min-w-0 flex-1 flex-col items-center justify-center">
                            <span className="text-lg font-black text-gray-800">
                              {quantity.toLocaleString("fa-IR")}
                            </span>
                            <span className="text-[10px] text-gray-500">
                              عدد انتخاب شده
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              updateCart(
                                product.id,
                                quantity + 1,
                                stock,
                              )
                            }
                            disabled={hasReachedLimit}
                            className="flex h-full w-14 shrink-0 items-center justify-center text-2xl font-bold text-green-700 transition-colors hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-30"
                            aria-label={`افزایش تعداد ${product.name}`}>
                            ＋
                          </button>
                        </div>
                      )}

                      {hasReachedLimit && inStock && (
                        <p className="mt-2 text-center text-xs font-medium text-amber-700">
                          حداکثر موجودی این محصول انتخاب شده است
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        {/* Order notes */}
        {selectedProductsCount > 0 && (
          <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
            <label
              htmlFor="order-notes"
              className="block font-bold text-gray-700">
              توضیحات سفارش
              <span className="mr-1 text-xs font-normal text-gray-400">
                (اختیاری)
              </span>
            </label>

            <textarea
              id="order-notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="توضیحات موردنیاز درباره سفارش را وارد کنید..."
              className="input-field mt-3 w-full resize-y leading-7"
            />
          </section>
        )}

        <div className="pb-4 text-center">
          <Link
            href="/seller"
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 font-bold text-amber-700 transition-colors hover:bg-amber-100">
            <span>→</span>
            بازگشت به داشبورد فروشنده
          </Link>
        </div>
      </main>

      {/* Sticky cart bar */}
      {selectedProductsCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 p-3 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] backdrop-blur sm:p-4">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center justify-between gap-3 sm:justify-start">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-xl">
                🛒
              </div>

              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-800">
                  {selectedProductsCount.toLocaleString("fa-IR")} قلم،
                  {" "}
                  {cartTotalItems.toLocaleString("fa-IR")} عدد
                </p>

                {estimatedTotal > 0 && (
                  <p className="mt-0.5 text-xs text-gray-500">
                    مبلغ تقریبی:{" "}
                    <span className="font-bold text-amber-700">
                      {estimatedTotal.toLocaleString("fa-IR")} تومان
                    </span>
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={submitOrder}
              disabled={submitting}
              className="btn-primary min-h-12 w-full px-6 text-base sm:w-auto sm:min-w-64 disabled:cursor-not-allowed disabled:opacity-60">
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  در حال ثبت سفارش...
                </span>
              ) : (
                "ثبت نهایی سفارش"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterInput({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold text-gray-500">
        {label}
      </label>
      <input
        type="text"
        placeholder={placeholder}
        className="input-field w-full"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function RangeFilter({
  label,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
}: {
  label: string;
  minValue: string;
  maxValue: string;
  onMinChange: (value: string) => void;
  onMaxChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold text-gray-500">
        {label}
      </label>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          placeholder="از"
          min={0}
          className="input-field min-w-0 w-full"
          value={minValue}
          onChange={(event) => onMinChange(event.target.value)}
        />
        <input
          type="number"
          placeholder="تا"
          min={0}
          className="input-field min-w-0 w-full"
          value={maxValue}
          onChange={(event) => onMaxChange(event.target.value)}
        />
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-3xl bg-white shadow-sm">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-amber-700 border-t-transparent" />
      <p className="mt-4 text-sm text-gray-400">
        در حال بارگذاری محصولات...
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl bg-white px-4 py-14 text-center shadow-sm">
      <div className="mb-4 text-6xl">📦</div>
      <p className="text-xl font-bold text-gray-600">
        محصولی با این شرایط یافت نشد
      </p>
      <p className="mt-2 text-sm text-gray-400">
        عبارت جستجو یا فیلترها را تغییر دهید.
      </p>
    </div>
  );
}
