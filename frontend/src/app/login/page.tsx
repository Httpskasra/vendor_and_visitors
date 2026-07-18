"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { setAuth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ phone: "", password: "" });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.phone || !form.password) {
      toast.error("لطفاً همه فیلدها را پر کنید");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", form);
      setAuth(data.token, data.user);
      toast.success(`خوش آمدید، ${data.user.name}!`);
      if (data.user.role === "ADMIN") router.push("/admin");
      else if (data.user.role === "SHOP_OWNER") router.push("/seller");
      else router.push("/buyer");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "خطا در ورود");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-700 rounded-3xl mb-4 shadow-xl">
            <span className="text-4xl">🏪</span>
          </div>
          <h1 className="text-3xl font-bold text-blue-900">سیستم سفارشات</h1>
          <p className="text-gray-500 mt-2 text-lg">
            وارد حساب کاربری خود شوید
          </p>
        </div>

        <div className="card shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-2">
                شماره موبایل
              </label>
              <input
                type="tel"
                placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                className="input-field text-right"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-2">
                رمز عبور
              </label>
              <input
                type="password"
                placeholder="••••••••"
                className="input-field"
                value={form.password}
                onChange={(e) =>
                  setForm((f) => ({ ...f, password: e.target.value }))
                }
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-4">
              {loading ?
                <span className="flex items-center justify-center gap-3">
                  <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  در حال ورود...
                </span>
              : "🔑 ورود به سیستم"}
            </button>
          </form>

          {/* <div className="mt-6 pt-6 border-t border-gray-100 text-center space-y-3">
            <p className="text-gray-500 text-lg">حساب کاربری ندارید؟</p>
            <Link
              href="/register"
              className="btn-secondary w-full block text-center">
              ثبت‌نام
            </Link>
            <Link
              href="/visitor"
              className="block text-blue-600 hover:text-blue-800 text-lg font-medium py-2">
              مشاهده محصولات بدون ورود ←
            </Link>
          </div> */}
        </div>
      </div>
    </div>
  );
}
