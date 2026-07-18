'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUser } from '@/lib/auth';

export default function HomePage() {
  const router = useRouter();
  useEffect(() => {
    const user = getUser();
    if (!user) {
      router.replace('/login');
    } else if (user.role === 'ADMIN') {
      router.replace('/admin');
    } else if (user.role === 'SHOP_OWNER') {
      router.replace('/seller');
    } else {
      router.replace('/buyer');
    }
  }, [router]);
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-700 border-t-transparent mx-auto mb-4" />
        <p className="text-xl text-gray-600">در حال بارگذاری...</p>
      </div>
    </div>
  );
}