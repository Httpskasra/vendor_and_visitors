// app/visitor/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

import api from "@/lib/api";
import { getUser, logout } from "@/lib/auth";

type Step = "select-seller" | "select-products" | "confirm";
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

const STEP_ITEMS: Array<{
  key: Step;
  number: string;
  label: string;
}> = [
  { key: "select-seller", number: "۱", label: "فروشنده" },
  { key: "select-products", number: "۲", label: "محصولات" },
  { key: "confirm", number: "۳", label: "تأیید" },
];

export default function VisitorOrderPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [step, setStep] = useState<Step>("select-seller");

  const [sellers, setSellers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeller, setSelectedSeller] = useState<any>(null);
  const [loadingSellers, setLoadingSellers] = useState(false);

  const [showSellerModal, setShowSellerModal] = useState(false);
  const [newSeller, setNewSeller] = useState({
    name: "",
    phone: "",
    password: "",
  });
  const [creatingSeller, setCreatingSeller] = useState(false);

  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [searchParams, setSearchParams] =
    useState<SearchParams>(DEFAULT_SEARCH);
  const [draftSearch, setDraftSearch] =
    useState<SearchParams>(DEFAULT_SEARCH);
  const [showFilters, setShowFilters] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    const currentUser = getUser();

    if (!currentUser) {
      router.replace("/login");
      return;
    }

    if (currentUser.role === "SHOP_OWNER") {
      router.replace("/seller/order");
      return;
    }

    if (currentUser.role !== "VISITOR") {
      router.replace("/");
      return;
    }

    setUser(currentUser);
  }, [router]);

  useEffect(() => {
    if (step === "select-seller") {
      void loadSellers();
    }
  }, [step]);

  useEffect(() => {
    if (step === "select-products") {
      void searchProducts(searchParams);
    }
  }, [step]);

  async function loadSellers() {
    setLoadingSellers(true);

    try {
      const { data } = await api.get("/users/sellers");
      setSellers(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("خطا در بارگذاری فروشندگان");
      console.error(err);
    } finally {
      setLoadingSellers(false);
    }
  }

  async function searchProducts(params: SearchParams) {
    setLoadingProducts(true);

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
        toast("محصولی با این شرایط یافت نشد", {
          icon: "🔍",
        });
      }
    } catch (err) {
      toast.error("خطا در جستجوی محصولات");
      console.error(err);
    } finally {
      setLoadingProducts(false);
    }
  }

  async function createSeller() {
    if (
      !newSeller.name.trim() ||
      !newSeller.phone.trim() ||
      !newSeller.password
    ) {
      toast.error("لطفاً همه فیلدها را پر کنید");
      return;
    }

    if (newSeller.password.length < 6) {
      toast.error("رمز عبور باید حداقل ۶ کاراکتر باشد");
      return;
    }

    setCreatingSeller(true);

    try {
      const { data } = await api.post("/users/sellers", {
        name: newSeller.name.trim(),
        phone: newSeller.phone.trim(),
        password: newSeller.password,
      });

      toast.success("فروشنده جدید با موفقیت ایجاد شد");
      setShowSellerModal(false);
      setNewSeller({ name: "", phone: "", password: "" });
      await loadSellers();

      if (data?.id) {
        setSelectedSeller(data);
        setStep("select-products");
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || "خطا در ایجاد فروشنده",
      );
    } finally {
      setCreatingSeller(false);
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
    if (!selectedSeller) {
      toast.error("لطفاً فروشنده را انتخاب کنید");
      setStep("select-seller");
      return;
    }

    if (selectedProductsCount === 0) {
      toast.error("لطفاً حداقل یک محصول انتخاب کنید");
      setStep("select-products");
      return;
    }

    const confirmed = window.confirm(
      `آیا از ثبت سفارش برای فروشنده "${selectedSeller.name}" مطمئن هستید؟\n` +
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
        sellerId: selectedSeller.id,
        notes: notes.trim() || undefined,
        items,
      });

      toast.success("سفارش با موفقیت ثبت شد!");
      setCart({});
      setNotes("");
      setSelectedSeller(null);
      setDraftSearch(DEFAULT_SEARCH);
      setSearchParams(DEFAULT_SEARCH);
      setProducts([]);
      setStep("select-seller");
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

  function goToSellerStep() {
    setCart({});
    setNotes("");
    setStep("select-seller");
  }

  const normalizedSellerQuery = searchQuery.trim().toLowerCase();

  const filteredSellers = sellers.filter((seller) => {
    if (!normalizedSellerQuery) return true;

    const sellerName = String(seller.name || "").toLowerCase();
    const sellerPhone = String(seller.phone || "");

    return (
      sellerName.includes(normalizedSellerQuery) ||
      sellerPhone.includes(searchQuery.trim())
    );
  });

  const selectedCartProducts = Object.entries(cart)
    .map(([productId, quantity]) => {
      const product = products.find(
        (item) => item.id === Number(productId),
      );

      if (!product) return null;

      return {
        product,
        quantity,
        lineTotal: Number(product.price || 0) * quantity,
      };
    })
    .filter(Boolean) as Array<{
    product: any;
    quantity: number;
    lineTotal: number;
  }>;

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

  if (!user) return null;

  return (
    <div
      className="min-h-screen overflow-x-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-indigo-100 pb-28"
      dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-blue-100 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-3 py-3 sm:px-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/buyer"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl text-blue-700 transition-colors hover:bg-blue-100"
              aria-label="بازگشت به داشبورد">
              →
            </Link>

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-2xl text-white">
              🛒
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold text-blue-900 sm:text-xl">
                ثبت سفارش جدید
              </h1>
              <p className="mt-0.5 truncate text-xs text-gray-500 sm:text-sm">
                {user.name} — ویزیتور
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <Link
              href="/buyer"
              className="flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 transition-colors hover:bg-blue-100">
              <span>→</span>
              بازگشت
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 transition-colors hover:bg-red-100">
              خروج 🚪
            </button>
          </div>
        </div>

        {/* Steps */}
        <div className="border-t border-blue-50 bg-blue-50/70">
          <div className="mx-auto grid max-w-3xl grid-cols-3 px-3 py-3 sm:px-4">
            {STEP_ITEMS.map((item, index) => {
              const currentStepIndex = STEP_ITEMS.findIndex(
                (stepItem) => stepItem.key === step,
              );
              const isActive = item.key === step;
              const isComplete = index < currentStepIndex;

              return (
                <div
                  key={item.key}
                  className="relative flex flex-col items-center">
                  {index < STEP_ITEMS.length - 1 && (
                    <div
                      className={`absolute right-1/2 top-4 h-0.5 w-full ${
                        isComplete ? "bg-blue-600" : "bg-blue-200"
                      }`}
                    />
                  )}

                  <div
                    className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                      isActive
                        ? "bg-blue-700 text-white ring-4 ring-blue-100"
                        : isComplete
                          ? "bg-green-600 text-white"
                          : "bg-white text-gray-400 ring-1 ring-blue-200"
                    }`}>
                    {isComplete ? "✓" : item.number}
                  </div>

                  <span
                    className={`mt-2 text-center text-[11px] font-bold sm:text-sm ${
                      isActive
                        ? "text-blue-700"
                        : isComplete
                          ? "text-green-700"
                          : "text-gray-400"
                    }`}>
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-3 py-5 sm:px-4 sm:py-7">
        {/* Step 1 */}
        {step === "select-seller" && (
          <section className="mx-auto max-w-4xl space-y-5">
            <div className="rounded-3xl bg-gradient-to-l from-blue-700 to-indigo-700 p-5 text-white shadow-lg sm:p-7">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-4xl">
                  🤝
                </div>
                <h2 className="mt-4 text-2xl font-black sm:text-3xl">
                  انتخاب فروشنده
                </h2>
                <p className="mt-2 max-w-lg text-sm leading-7 text-blue-100 sm:text-base">
                  فروشنده موردنظر را با نام یا شماره موبایل پیدا
                  کنید یا یک فروشنده جدید بسازید.
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
              <div className="relative">
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  🔍
                </span>
                <input
                  type="search"
                  placeholder="نام فروشنده یا شماره موبایل..."
                  className="input-field w-full pr-10"
                  value={searchQuery}
                  onChange={(event) =>
                    setSearchQuery(event.target.value)
                  }
                />
              </div>

              <button
                type="button"
                onClick={() => setShowSellerModal(true)}
                className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-green-600 px-5 py-3 font-bold text-white transition-colors hover:bg-green-700">
                <span className="text-xl">＋</span>
                افزودن فروشنده جدید
              </button>
            </div>

            {loadingSellers ? (
              <LoadingState text="در حال بارگذاری فروشندگان..." />
            ) : filteredSellers.length === 0 ? (
              <div className="rounded-3xl bg-white px-4 py-12 text-center shadow-sm">
                <div className="mb-3 text-5xl">🏪</div>
                <p className="text-lg font-bold text-gray-600">
                  هیچ فروشنده‌ای یافت نشد
                </p>
                <p className="mt-2 text-sm text-gray-400">
                  نام یا شماره موبایل دیگری جستجو کنید.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {filteredSellers.map((seller) => (
                  <button
                    key={seller.id}
                    type="button"
                    onClick={() => {
                      setSelectedSeller(seller);
                      setStep("select-products");
                    }}
                    className="group flex min-w-0 items-center gap-4 rounded-3xl border border-gray-100 bg-white p-4 text-right shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-100 sm:p-5">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-2xl transition-colors group-hover:bg-blue-700 group-hover:text-white">
                      🏪
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="break-words text-lg font-extrabold text-gray-800">
                        {seller.name}
                      </p>
                      <p
                        className="mt-1 break-all text-sm text-gray-500 sm:break-normal"
                        dir="ltr">
                        {seller.phone}
                      </p>
                    </div>

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-50 text-blue-600 transition-colors group-hover:bg-blue-100">
                      ←
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="text-center">
              <Link
                href="/buyer"
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 font-bold text-blue-700 transition-colors hover:bg-blue-100">
                <span>→</span>
                بازگشت به داشبورد
              </Link>
            </div>
          </section>
        )}

        {/* Step 2 */}
        {step === "select-products" && selectedSeller && (
          <section className="space-y-4">
            <div className="rounded-3xl bg-gradient-to-l from-blue-700 to-indigo-700 p-4 text-white shadow-lg sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl">
                    🏪
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-blue-200">
                      فروشنده انتخاب‌شده
                    </p>
                    <p className="mt-1 break-words text-lg font-black sm:text-xl">
                      {selectedSeller.name}
                    </p>
                    <p
                      className="mt-1 break-all text-sm text-blue-200 sm:break-normal"
                      dir="ltr">
                      {selectedSeller.phone}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={goToSellerStep}
                  className="w-full rounded-xl bg-white/15 px-4 py-2.5 text-sm font-bold transition-colors hover:bg-white/25 sm:w-auto">
                  تغییر فروشنده
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-100 bg-white p-3 shadow-sm sm:p-4">
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
                    disabled={loadingProducts}
                    className="btn-primary min-h-11 whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-60">
                    {loadingProducts ? "در حال جستجو..." : "جستجو"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setShowFilters((current) => !current)
                    }
                    className={`relative min-h-11 rounded-xl border-2 px-4 py-2 font-bold transition-all ${
                      showFilters
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}>
                    🎛️ فیلترها
                    {hasActiveFilters && (
                      <span className="absolute -left-1 -top-1 h-3 w-3 rounded-full bg-blue-600 ring-2 ring-white" />
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
                              sortBy:
                                event.target.value as SortField,
                            })
                          }>
                          <option value="name">نام</option>
                          <option value="price">قیمت</option>
                          <option value="quantityMain">موجودی</option>
                          <option value="categoryMain">
                            دسته‌بندی
                          </option>
                        </select>

                        <select
                          className="input-field min-w-0"
                          value={draftSearch.sortOrder}
                          onChange={(event) =>
                            setDraftSearch({
                              ...draftSearch,
                              sortOrder:
                                event.target.value as SortOrder,
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
            </div>

            {!loadingProducts && products.length > 0 && (
              <div className="flex flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-bold text-gray-800 sm:text-xl">
                  محصولات موجود
                </h2>

                <div className="flex flex-wrap gap-2 text-xs font-bold">
                  <span className="rounded-full bg-white px-3 py-1.5 text-gray-500 shadow-sm">
                    {products.length.toLocaleString("fa-IR")} محصول
                  </span>

                  {selectedProductsCount > 0 && (
                    <span className="rounded-full bg-blue-100 px-3 py-1.5 text-blue-700">
                      {selectedProductsCount.toLocaleString("fa-IR")} انتخاب‌شده
                    </span>
                  )}
                </div>
              </div>
            )}

            {loadingProducts ? (
              <LoadingState text="در حال بارگذاری محصولات..." />
            ) : products.length === 0 ? (
              <div className="rounded-3xl bg-white px-4 py-14 text-center shadow-sm">
                <div className="mb-4 text-6xl">📦</div>
                <p className="text-xl font-bold text-gray-600">
                  محصولی با این شرایط یافت نشد
                </p>
                <p className="mt-2 text-sm text-gray-400">
                  عبارت جستجو یا فیلترها را تغییر دهید.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {products.map((product) => {
                  const quantity = cart[product.id] || 0;
                  const stock = getProductStock(product);
                  const inStock = stock > 0;
                  const isSelected = quantity > 0;
                  const hasReachedLimit = quantity >= stock;

                  return (
                    <article
                      key={product.id}
                      className={`group relative flex min-w-0 flex-col overflow-hidden rounded-3xl border bg-white shadow-sm transition-all ${
                        isSelected
                          ? "border-blue-500 ring-2 ring-blue-200"
                          : "border-gray-100 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg"
                      } ${!inStock ? "opacity-70" : ""}`}>
                      {isSelected && (
                        <div className="absolute right-3 top-3 z-10 rounded-full bg-blue-700 px-3 py-1 text-xs font-bold text-white shadow">
                          ✓ انتخاب شده
                        </div>
                      )}

                      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center text-gray-300">
                            <span className="text-5xl">📦</span>
                            <span className="mt-2 text-xs">
                              بدون تصویر
                            </span>
                          </div>
                        )}

                        <span
                          className={`absolute bottom-3 left-3 rounded-full px-3 py-1.5 text-xs font-bold shadow-sm ${
                            inStock
                              ? "bg-green-100/95 text-green-800"
                              : "bg-red-100/95 text-red-700"
                          }`}>
                          {inStock
                            ? `موجودی ${stock.toLocaleString("fa-IR")}`
                            : "ناموجود"}
                        </span>
                      </div>

                      <div className="flex flex-1 flex-col p-4">
                        <div className="flex-1">
                          <h3 className="break-words text-base font-extrabold leading-7 text-gray-800">
                            {product.name}
                          </h3>

                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {product.categoryMain && (
                              <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                                {product.categoryMain}
                              </span>
                            )}

                            {product.categorySecond && (
                              <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
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
                              <p className="mt-1 text-lg font-black text-blue-700">
                                {Number(
                                  product.price || 0,
                                ).toLocaleString("fa-IR")}
                                <span className="mr-1 text-xs font-medium text-gray-500">
                                  تومان
                                </span>
                              </p>
                            </div>

                            {quantity > 0 && (
                              <div className="text-left">
                                <p className="text-xs text-gray-400">
                                  جمع
                                </p>
                                <p className="mt-1 text-sm font-bold text-gray-700">
                                  {(
                                    Number(product.price || 0) *
                                    quantity
                                  ).toLocaleString("fa-IR")}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

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
                              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-700 font-bold text-white transition-colors hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200">
                              <span className="text-xl">＋</span>
                              افزودن به سفارش
                            </button>
                          ) : (
                            <div className="flex h-12 items-center overflow-hidden rounded-2xl border-2 border-blue-200 bg-blue-50">
                              <button
                                type="button"
                                onClick={() =>
                                  updateCart(
                                    product.id,
                                    quantity - 1,
                                    stock,
                                  )
                                }
                                className="flex h-full w-14 items-center justify-center text-2xl font-bold text-red-600 transition-colors hover:bg-red-100">
                                −
                              </button>

                              <div className="flex min-w-0 flex-1 flex-col items-center justify-center">
                                <span className="text-lg font-black text-gray-800">
                                  {quantity.toLocaleString("fa-IR")}
                                </span>
                                <span className="text-[10px] text-gray-500">
                                  عدد انتخاب‌شده
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
                                className="flex h-full w-14 items-center justify-center text-2xl font-bold text-green-700 transition-colors hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-30">
                                ＋
                              </button>
                            </div>
                          )}

                          {hasReachedLimit && inStock && (
                            <p className="mt-2 text-center text-xs font-medium text-blue-700">
                              حداکثر موجودی انتخاب شده است
                            </p>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            <div className="pb-4 text-center">
              <button
                type="button"
                onClick={goToSellerStep}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 font-bold text-blue-700 transition-colors hover:bg-blue-100">
                <span>→</span>
                بازگشت به انتخاب فروشنده
              </button>
            </div>
          </section>
        )}

        {/* Step 3 */}
        {step === "confirm" && selectedSeller && (
          <section className="mx-auto max-w-4xl space-y-5">
            <button
              type="button"
              onClick={() => setStep("select-products")}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 font-bold text-blue-700 transition-colors hover:bg-blue-100">
              <span>→</span>
              بازگشت به محصولات
            </button>

            <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-lg sm:p-6">
              <div className="mb-6 flex flex-col gap-4 border-b border-gray-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">
                    مرحله نهایی
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-gray-800">
                    تأیید سفارش
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    اطلاعات سفارش را بررسی و سپس ثبت کنید.
                  </p>
                </div>

                <div className="flex w-fit gap-2 text-xs font-bold">
                  <span className="rounded-full bg-blue-100 px-3 py-1.5 text-blue-700">
                    {selectedProductsCount.toLocaleString("fa-IR")} قلم
                  </span>
                  <span className="rounded-full bg-green-100 px-3 py-1.5 text-green-700">
                    {cartTotalItems.toLocaleString("fa-IR")} عدد
                  </span>
                </div>
              </div>

              <div className="mb-5 rounded-2xl bg-gradient-to-l from-blue-700 to-indigo-700 p-4 text-white sm:p-5">
                <p className="text-xs text-blue-200">
                  فروشنده دریافت‌کننده سفارش
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 text-xl">
                    🏪
                  </div>
                  <div className="min-w-0">
                    <p className="break-words text-lg font-black">
                      {selectedSeller.name}
                    </p>
                    <p
                      className="mt-1 break-all text-sm text-blue-200 sm:break-normal"
                      dir="ltr">
                      {selectedSeller.phone}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {selectedCartProducts.map(
                  ({ product, quantity, lineTotal }) => (
                    <div
                      key={product.id}
                      className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-2xl text-gray-300">
                              📦
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="break-words font-bold text-gray-800">
                            {product.name}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {Number(
                              product.price || 0,
                            ).toLocaleString("fa-IR")}{" "}
                            تومان ×{" "}
                            {quantity.toLocaleString("fa-IR")}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-700">
                          {quantity.toLocaleString("fa-IR")} عدد
                        </span>
                        <span className="text-sm font-black text-gray-700">
                          {lineTotal.toLocaleString("fa-IR")} تومان
                        </span>
                      </div>
                    </div>
                  ),
                )}
              </div>

              <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold text-gray-700">
                    مبلغ تقریبی کل
                  </span>
                  <span className="text-lg font-black text-blue-700 sm:text-xl">
                    {estimatedTotal.toLocaleString("fa-IR")} تومان
                  </span>
                </div>
              </div>

              <div className="mt-6">
                <label
                  htmlFor="visitor-order-notes"
                  className="block font-bold text-gray-700">
                  توضیحات اضافه
                  <span className="mr-1 text-xs font-normal text-gray-400">
                    (اختیاری)
                  </span>
                </label>
                <textarea
                  id="visitor-order-notes"
                  rows={4}
                  placeholder="هر نکته‌ای که لازم است فروشنده بداند..."
                  className="input-field mt-3 w-full resize-y leading-7"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </div>

              <button
                type="button"
                onClick={submitOrder}
                disabled={submitting}
                className="btn-success mt-6 min-h-14 w-full text-lg disabled:cursor-not-allowed disabled:opacity-60">
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    در حال ثبت سفارش...
                  </span>
                ) : (
                  "🛒 ثبت نهایی سفارش"
                )}
              </button>
            </div>
          </section>
        )}
      </main>

      {/* Sticky cart bar */}
      {step === "select-products" &&
        selectedProductsCount > 0 && (
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 p-3 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] backdrop-blur sm:p-4">
            <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-xl">
                  🛒
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-800">
                    {selectedProductsCount.toLocaleString("fa-IR")} قلم،
                    {" "}
                    {cartTotalItems.toLocaleString("fa-IR")} عدد
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    مبلغ تقریبی:{" "}
                    <span className="font-bold text-blue-700">
                      {estimatedTotal.toLocaleString("fa-IR")} تومان
                    </span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep("confirm")}
                className="btn-primary min-h-12 w-full px-6 text-base sm:w-auto sm:min-w-64">
                مشاهده و تأیید سفارش
              </button>
            </div>
          </div>
        )}

      {/* Add seller modal */}
      {showSellerModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowSellerModal(false);
            }
          }}>
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-3xl sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-gray-800 sm:text-2xl">
                  افزودن فروشنده جدید
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  اطلاعات فروشنده را وارد کنید.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowSellerModal(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200">
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-bold text-gray-700">
                  نام فروشنده
                </label>
                <input
                  type="text"
                  placeholder="نام و نام خانوادگی"
                  className="input-field w-full"
                  value={newSeller.name}
                  onChange={(event) =>
                    setNewSeller({
                      ...newSeller,
                      name: event.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-gray-700">
                  شماره موبایل
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  placeholder="09123456789"
                  className="input-field w-full text-left"
                  dir="ltr"
                  value={newSeller.phone}
                  onChange={(event) =>
                    setNewSeller({
                      ...newSeller,
                      phone: event.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-gray-700">
                  رمز عبور
                </label>
                <input
                  type="password"
                  placeholder="حداقل ۶ کاراکتر"
                  className="input-field w-full"
                  value={newSeller.password}
                  onChange={(event) =>
                    setNewSeller({
                      ...newSeller,
                      password: event.target.value,
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSellerModal(false)}
                  className="btn-secondary min-h-12">
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={createSeller}
                  disabled={creatingSeller}
                  className="btn-primary min-h-12 disabled:cursor-not-allowed disabled:opacity-60">
                  {creatingSeller
                    ? "در حال ایجاد..."
                    : "ثبت فروشنده"}
                </button>
              </div>
            </div>
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

function LoadingState({ text }: { text: string }) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-3xl bg-white shadow-sm">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-700 border-t-transparent" />
      <p className="mt-4 text-sm text-gray-400">{text}</p>
    </div>
  );
}
