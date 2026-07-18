// app/seller/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

import api from "@/lib/api";
import { getUser, logout } from "@/lib/auth";
import {
  STATUS_LABELS,
  STATUS_BADGE,
  formatDateTime,
} from "@/lib/persian";

export default function SellerDashboard() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);

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
    void loadOrders();
  }, [router]);

  async function loadOrders() {
    setLoading(true);

    try {
      const { data } = await api.get("/orders/my-shop-orders");
      setOrders(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || "خطا در بارگذاری سفارشات",
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    const confirmed = window.confirm(
      "آیا از خروج از سیستم مطمئن هستید؟",
    );

    if (!confirmed) return;

    logout();
    router.push("/login");
  }

  const stats = {
    total: orders.length,
    pending: orders.filter((order) => order.status === "PENDING").length,
    confirmed: orders.filter((order) => order.status === "CONFIRMED").length,
    delivered: orders.filter((order) => order.status === "DELIVERED").length,
  };

  const statCards = [
    {
      title: "کل سفارشات",
      value: stats.total,
      icon: "📦",
      valueClassName: "text-amber-700",
      iconClassName: "bg-amber-100",
    },
    {
      title: "در انتظار تأیید",
      value: stats.pending,
      icon: "⏳",
      valueClassName: "text-yellow-600",
      iconClassName: "bg-yellow-100",
    },
    {
      title: "تأیید شده",
      value: stats.confirmed,
      icon: "✅",
      valueClassName: "text-blue-600",
      iconClassName: "bg-blue-100",
    },
    {
      title: "تحویل داده شده",
      value: stats.delivered,
      icon: "🚚",
      valueClassName: "text-green-600",
      iconClassName: "bg-green-100",
    },
  ];

  return (
    <div
      className="min-h-screen overflow-x-hidden bg-gradient-to-br from-amber-50 to-orange-100"
      dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-amber-800 text-white shadow-xl">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-3 py-4 sm:px-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20 text-2xl sm:h-14 sm:w-14 sm:text-3xl">
              🏪
            </div>

            <div className="min-w-0">
              <h1 className="text-xl font-bold sm:text-2xl">
                پنل فروشنده
              </h1>

              <div className="mt-1 flex flex-col text-xs text-amber-200 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2 sm:text-sm">
                <span className="truncate font-medium">
                  {user?.name || "فروشنده"}
                </span>

                {user?.phone && (
                  <>
                    <span className="hidden sm:inline">|</span>
                    <span
                      className="break-all text-left sm:break-normal"
                      dir="ltr">
                      {user.phone}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-xl bg-amber-700 px-5 py-3 font-bold transition-colors hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-white/70 md:w-auto">
            خروج 🚪
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-5 px-3 py-5 sm:px-4 sm:py-8 md:space-y-6">
        {/* Stats */}
        <section
          className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4"
          aria-label="آمار سفارشات">
          {statCards.map((stat) => (
            <article
              key={stat.title}
              className="rounded-2xl border border-white/80 bg-white p-3 shadow-sm transition-shadow hover:shadow-md sm:p-4">
              <div className="flex flex-col items-center text-center sm:flex-row sm:text-right md:flex-col md:text-center lg:flex-row lg:text-right">
                <div
                  className={`mb-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl sm:mb-0 sm:ml-3 md:mb-2 md:ml-0 lg:mb-0 lg:ml-3 ${stat.iconClassName}`}>
                  {stat.icon}
                </div>

                <div className="min-w-0">
                  <p
                    className={`text-2xl font-extrabold sm:text-3xl ${stat.valueClassName}`}>
                    {stat.value.toLocaleString("fa-IR")}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-gray-500 sm:text-sm">
                    {stat.title}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </section>

        {/* Quick action */}
        <Link
          href="/visitor"
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-700 px-4 py-4 text-center text-base font-bold text-white shadow-md transition-all hover:bg-blue-800 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-200 sm:text-lg md:text-xl">
          <span className="text-xl sm:text-2xl">🛒</span>
          <span>ثبت سفارش جدید</span>
          <span className="hidden text-sm font-normal text-blue-100 sm:inline">
            (به عنوان خریدار)
          </span>
        </Link>

        {/* Orders */}
        <section>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="flex items-center gap-2 text-xl font-bold text-gray-800 sm:text-2xl">
              <span>📋</span>
              <span>سفارشات دریافتی</span>
            </h2>

            {!loading && orders.length > 0 && (
              <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-500 shadow-sm sm:text-sm">
                {orders.length.toLocaleString("fa-IR")} سفارش
              </span>
            )}
          </div>

          {loading ? (
            <LoadingState />
          ) : orders.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-4 sm:space-y-5">
              {orders.map((order) => {
                const isExpanded = expandedOrder === order.id;

                const totalItemQuantity =
                  order.items?.reduce(
                    (sum: number, item: any) =>
                      sum + Number(item.quantity || 0),
                    0,
                  ) || 0;

                return (
                  <article
                    key={order.id}
                    className="overflow-hidden rounded-2xl border border-white/90 bg-white shadow-sm transition-shadow hover:shadow-lg">
                    {/* Order summary */}
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedOrder(isExpanded ? null : order.id)
                      }
                      className="w-full p-4 text-right focus:outline-none focus:ring-4 focus:ring-inset focus:ring-amber-100 sm:p-5"
                      aria-expanded={isExpanded}>
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex flex-wrap items-center gap-2 sm:gap-3">
                            <span className="text-lg font-bold text-gray-800 sm:text-xl">
                              سفارش #{order.id}
                            </span>

                            <span
                              className={`${STATUS_BADGE[order.status] || "rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700"} max-w-full`}>
                              {STATUS_LABELS[order.status] || order.status}
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            <p className="break-words text-sm leading-6 text-gray-600 sm:text-base">
                              <span className="font-semibold">👤 خریدار:</span>{" "}
                              {order.user?.name || "نامشخص"}
                            </p>

                            {order.user?.phone && (
                              <p
                                className="break-all text-sm text-gray-500 sm:break-normal"
                                dir="ltr">
                                {order.user.phone}
                              </p>
                            )}

                            <p className="text-xs text-gray-400 sm:text-sm">
                              {formatDateTime(order.createdAt)}
                            </p>

                            <div className="flex flex-wrap items-center gap-2 text-xs text-amber-700 sm:text-sm">
                              <span className="rounded-lg bg-amber-50 px-2.5 py-1">
                                {order.items?.length || 0} قلم کالا
                              </span>
                              <span className="rounded-lg bg-amber-50 px-2.5 py-1">
                                {totalItemQuantity.toLocaleString("fa-IR")} عدد
                              </span>
                            </div>
                          </div>
                        </div>

                        <span
                          className="mt-1 shrink-0 text-xl text-gray-400 transition-transform sm:text-2xl"
                          aria-hidden="true">
                          {isExpanded ? "▲" : "▼"}
                        </span>
                      </div>
                    </button>

                    {/* Order details */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 bg-white px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
                        <div className="space-y-4">
                          {order.notes && (
                            <div className="break-words rounded-xl border border-yellow-100 bg-yellow-50 p-3 text-sm leading-7 text-yellow-900 sm:p-4 sm:text-base">
                              <strong>📝 توضیحات:</strong>{" "}
                              {order.notes}
                            </div>
                          )}

                          <div className="rounded-xl bg-gray-50 p-3 sm:p-4">
                            <p className="mb-3 font-bold text-gray-700">
                              اقلام سفارش:
                            </p>

                            {!order.items?.length ? (
                              <p className="py-4 text-center text-sm text-gray-400">
                                آیتمی برای این سفارش ثبت نشده است.
                              </p>
                            ) : (
                              <div className="divide-y divide-gray-200">
                                {order.items.map((item: any) => (
                                  <div
                                    key={item.id}
                                    className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="min-w-0 flex-1">
                                      <p className="break-words font-medium leading-6 text-gray-800">
                                        {item.productName ||
                                          item.product?.name ||
                                          "محصول نامشخص"}
                                      </p>

                                      {item.note && (
                                        <p className="mt-1 break-words text-xs leading-5 text-gray-400 sm:text-sm">
                                          یادداشت: {item.note}
                                        </p>
                                      )}
                                    </div>

                                    <span className="w-fit shrink-0 rounded-full bg-amber-100 px-3 py-1.5 text-sm font-bold text-amber-800">
                                      {Number(
                                        item.quantity || 0,
                                      ).toLocaleString("fa-IR")}{" "}
                                      عدد
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col gap-1 rounded-xl border border-gray-100 bg-gray-50/50 px-3 py-2 text-xs text-gray-400 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                            <span>
                              شناسه سفارش:{" "}
                              <span dir="ltr">{order.id}</span>
                            </span>
                            <span>
                              وضعیت:{" "}
                              {STATUS_LABELS[order.status] ||
                                order.status}
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
        </section>
      </main>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl bg-white py-16 shadow-sm">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-amber-700 border-t-transparent" />
      <p className="mt-4 text-sm text-gray-400">
        در حال بارگذاری سفارشات...
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl bg-white px-4 py-12 text-center shadow-sm sm:py-16">
      <div className="mb-4 text-5xl sm:text-6xl">📭</div>
      <p className="text-lg font-bold text-gray-600 sm:text-xl">
        هیچ سفارشی برای شما ثبت نشده است.
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-400 sm:text-base">
        به‌زودی ویزیتورها یا خودتان می‌توانید برای این فروشگاه سفارش
        ثبت کنید.
      </p>
    </div>
  );
}
