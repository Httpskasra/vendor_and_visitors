export type DualQuantity = { whole: number; partial: number };

export function getWholeStock(product: any) {
  return Math.max(0, Number(product.quantityMain ?? 0) || 0);
}

export function getPartialStock(product: any) {
  return Math.max(0, Number(product.quantityPartial ?? product.quantityBonus ?? 0) || 0);
}

export function getCountPerUnit(product: any) {
  return Math.max(1, Number(product.countPerUnit ?? 1) || 1);
}

export function getTotalStockInPartialUnits(product: any) {
  return getWholeStock(product) * getCountPerUnit(product) + getPartialStock(product);
}

export function normalizeDualQuantity(whole: number, partial: number, countPerUnit: number): DualQuantity {
  const count = Math.max(1, countPerUnit);
  const total = Math.max(0, Math.trunc(whole)) * count + Math.max(0, Math.trunc(partial));
  return { whole: Math.floor(total / count), partial: total % count };
}

export function calculateDualPrice(product: any, value: DualQuantity) {
  const price = Number(product.price ?? product.unitPrice ?? 0) || 0;
  return price * (value.whole + value.partial / getCountPerUnit(product));
}

export function orderItemTotal(item: any) {
  const whole = Number(item.wholeQuantity ?? item.quantity ?? 0) || 0;
  const partial = Number(item.partialQuantity ?? 0) || 0;
  const count = Math.max(1, Number(item.countPerUnit ?? 1) || 1);
  return Number(item.unitPrice ?? 0) * (whole + partial / count);
}
