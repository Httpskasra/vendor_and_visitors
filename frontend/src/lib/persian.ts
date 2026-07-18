export const STATUS_LABELS: Record<string, string> = {
  PENDING:   'در انتظار تأیید',
  CONFIRMED: 'تأیید شده',
  SHIPPED:   'ارسال شده',
  DELIVERED: 'تحویل داده شده',
  CANCELLED: 'لغو شده',
};
export const STATUS_BADGE: Record<string, string> = {
  PENDING:   'badge-pending',
  CONFIRMED: 'badge-confirmed',
  SHIPPED:   'badge-shipped',
  DELIVERED: 'badge-delivered',
  CANCELLED: 'badge-cancelled',
};
export function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });
}
export function formatDateTime(d: string) {
  return new Date(d).toLocaleString('fa-IR');
}
