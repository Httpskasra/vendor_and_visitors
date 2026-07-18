"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { getUser, logout } from "@/lib/auth";
import { STATUS_LABELS, STATUS_BADGE, formatDateTime } from "@/lib/persian";

export default function BuyerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.replace("/login");
      return;
    }
    if (u.role !== "VISITOR") {
      router.replace("/");
      return;
    }
    setUser(u);
    loadOrders();
  }, []);

  async function loadOrders() {
    setLoading(true);
    try {
      const { data } = await api.get("/orders/my");
      setOrders(data);
    } catch {
      toast.error("خطا در بارگذاری سفارشات");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    if (window.confirm("آیا می‌خواهید از سیستم خارج شوید؟")) {
      logout();
      router.push("/login");
    }
  }

  const statusCounts = orders.reduce((acc: any, o: any) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50"
      dir="rtl">
      {/* Header */}
      <header className="bg-gradient-to-l from-blue-800 to-indigo-900 text-white shadow-xl">
        <div className="max-w-3xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-2xl p-2 text-3xl">👤</div>
            <div>
              <h1 className="text-2xl font-bold">{user?.name}</h1>
              <p className="text-blue-200 text-sm">{user?.phone}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="bg-white/10 hover:bg-white/20 px-5 py-3 rounded-2xl font-bold text-lg transition-colors">
            خروج 🚪
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="card text-center">
            <p className="text-4xl font-bold text-blue-700">{orders.length}</p>
            <p className="text-gray-500 mt-1 font-semibold">کل سفارشات</p>
          </div>
          <div className="card text-center">
            <p className="text-4xl font-bold text-yellow-600">
              {statusCounts["PENDING"] || 0}
            </p>
            <p className="text-gray-500 mt-1 font-semibold">در انتظار تأیید</p>
          </div>
          <div className="card text-center">
            <p className="text-4xl font-bold text-green-600">
              {statusCounts["DELIVERED"] || 0}
            </p>
            <p className="text-gray-500 mt-1 font-semibold">تحویل داده شده</p>
          </div>
          <div className="card text-center">
            <p className="text-4xl font-bold text-purple-600">
              {statusCounts["SHIPPED"] || 0}
            </p>
            <p className="text-gray-500 mt-1 font-semibold">ارسال شده</p>
          </div>
        </div>

        {/* Quick action */}
        <Link
          href="/visitor"
          className="btn-primary w-full block text-center text-xl py-5">
          🛒 ثبت سفارش جدید
        </Link>

        {/* Orders list */}
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            📋 سفارشات من
          </h2>

          {loading ?
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-14 w-14 border-4 border-blue-700 border-t-transparent" />
            </div>
          : orders.length === 0 ?
            <div className="card text-center py-16">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-xl text-gray-500 mb-6">هنوز سفارشی ندارید</p>
              <Link href="/visitor" className="btn-primary inline-block">
                اولین سفارش را ثبت کنید
              </Link>
            </div>
          : <div className="space-y-4">
              {orders.map((order: any) => (
                <div
                  key={order.id}
                  className="card hover:shadow-lg transition-shadow">
                  {/* Order Header */}
                  <button
                    className="w-full text-right"
                    onClick={() =>
                      setExpanded(expanded === order.id ? null : order.id)
                    }>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <span className="text-xl font-bold text-gray-800">
                            سفارش #{order.id}
                          </span>
                          <span className={STATUS_BADGE[order.status]}>
                            {STATUS_LABELS[order.status]}
                          </span>
                        </div>
                        <p className="text-gray-600 font-semibold">
                          🏪 {order.seller?.name}
                        </p>
                        <p className="text-gray-400 text-sm mt-1">
                          {formatDateTime(order.createdAt)}
                        </p>
                        <p className="text-blue-600 text-sm mt-1 font-semibold">
                          {order.items?.length} قلم کالا —{" "}
                          {order.items?.reduce(
                            (s: number, i: any) => s + i.quantity,
                            0,
                          )}{" "}
                          عدد
                        </p>
                      </div>
                      <span className="text-gray-400 text-2xl mt-1">
                        {expanded === order.id ? "▲" : "▼"}
                      </span>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {expanded === order.id && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      {/* Timeline */}
                      <div className="mb-4">
                        <p className="font-bold text-gray-600 mb-3 text-sm">
                          وضعیت سفارش:
                        </p>
                        <div className="flex items-center gap-1 flex-wrap">
                          {["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED"].map(
                            (s, i) => {
                              const steps = [
                                "PENDING",
                                "CONFIRMED",
                                "SHIPPED",
                                "DELIVERED",
                              ];
                              const currentIdx = steps.indexOf(order.status);
                              const isDone =
                                i <= currentIdx && order.status !== "CANCELLED";
                              const isCurrent = s === order.status;
                              return (
                                <div
                                  key={s}
                                  className="flex items-center gap-1">
                                  {i > 0 && (
                                    <div
                                      className={`h-1 w-6 rounded ${isDone ? "bg-green-400" : "bg-gray-200"}`}
                                    />
                                  )}
                                  <div className={`flex flex-col items-center`}>
                                    <div
                                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
                                        isCurrent ?
                                          "border-blue-500 bg-blue-100 text-blue-700"
                                        : isDone ?
                                          "border-green-500 bg-green-100 text-green-700"
                                        : "border-gray-200 bg-gray-100 text-gray-400"
                                      }`}>
                                      {isDone && !isCurrent ? "✓" : i + 1}
                                    </div>
                                    <span className="text-xs mt-1 text-gray-500 whitespace-nowrap">
                                      {STATUS_LABELS[s]}
                                    </span>
                                  </div>
                                </div>
                              );
                            },
                          )}
                        </div>
                        {order.status === "CANCELLED" && (
                          <p className="text-red-500 font-bold mt-2">
                            ❌ این سفارش لغو شده است
                          </p>
                        )}
                      </div>

                      {/* Items */}
                      <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                        <p className="font-bold text-gray-600 text-sm mb-3">
                          اقلام سفارش:
                        </p>
                        {order.items?.map((item: any) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between">
                            <span className="text-gray-700">
                              {item.product?.name}
                            </span>
                            <div className="flex items-center gap-2">
                              {item.note && (
                                <span className="text-gray-400 text-xs">
                                  ({item.note})
                                </span>
                              )}
                              <span className="bg-blue-100 text-blue-700 font-bold px-3 py-1 rounded-full text-sm">
                                {item.quantity} عدد
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {order.notes && (
                        <div className="mt-3 bg-yellow-50 rounded-xl px-4 py-3">
                          <p className="text-yellow-800 text-sm">
                            📝 <strong>توضیحات:</strong> {order.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          }
        </div>
      </div>
    </div>
  );
}
