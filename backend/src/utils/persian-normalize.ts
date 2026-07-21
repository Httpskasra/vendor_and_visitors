/**
 * نرمال‌سازی متن فارسی/عربی برای جستجو و مقایسه.
 *
 * نمونه‌ها:
 * - علی === علي
 * - کیک === كيك
 * - پیت‌زا === پیت زا
 */
export function normalizePersian(input: unknown): string {
  if (typeof input !== 'string' || !input) return '';

  return input
    .normalize('NFKC')
    // ی و ک عربی/فارسی و شکل‌های مشابه
    .replace(/[يىۍې]/g, 'ی')
    .replace(/ك/g, 'ک')
    // حروف همزه‌دار رایج
    .replace(/[أإٱآ]/g, 'ا')
    .replace(/ئ/g, 'ی')
    .replace(/ؤ/g, 'و')
    .replace(/ة/g, 'ه')
    .replace(/ء/g, '')
    // حذف اعراب و کشیده
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/ـ/g, '')
    // نیم‌فاصله و فاصله‌های نامرئی به فاصله معمولی
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, ' ')
    // اعداد فارسی و عربی به لاتین
    .replace(/[۰-۹]/g, (char) => String(char.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (char) => String(char.charCodeAt(0) - 0x0660))
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** نسخه بدون فاصله برای عبارت‌هایی مثل «پیت زا» و «پیتزا». */
export function compactPersian(input: unknown): string {
  return normalizePersian(input).replace(/\s+/g, '');
}
