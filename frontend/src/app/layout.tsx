import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'سیستم مدیریت سفارشات',
  description: 'پلتفرم خرید و فروش محصولات',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <Toaster
          position="top-center"
          toastOptions={{
            style: { fontFamily: 'Vazirmatn', fontSize: '16px', direction: 'rtl' },
            duration: 4000,
          }}
        />
        {children}
      </body>
    </html>
  );
}
