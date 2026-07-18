import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: { vazir: ['Vazirmatn', 'sans-serif'] },
      colors: {
        primary: { DEFAULT: '#1e40af', light: '#3b82f6', dark: '#1e3a8a' },
        success: '#16a34a', warning: '#d97706', danger: '#dc2626',
      },
    },
  },
  plugins: [],
};
export default config;
