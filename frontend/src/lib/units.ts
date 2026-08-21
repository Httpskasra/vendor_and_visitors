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


export function getRequestedTotalInPartialUnits(product: any, value: DualQuantity) {
  const countPerUnit = getCountPerUnit(product);
  return Math.max(0, Math.trunc(value.whole || 0)) * countPerUnit + Math.max(0, Math.trunc(value.partial || 0));
}

export function isDualQuantityWithinStock(product: any, value: DualQuantity) {
  return getRequestedTotalInPartialUnits(product, value) <= getTotalStockInPartialUnits(product);
}

export function clampDualQuantityToStock(product: any, value: DualQuantity): DualQuantity {
  const countPerUnit = getCountPerUnit(product);
  const requestedTotal = getRequestedTotalInPartialUnits(product, value);
  const allowedTotal = Math.min(requestedTotal, getTotalStockInPartialUnits(product));
  return {
    whole: Math.floor(allowedTotal / countPerUnit),
    partial: allowedTotal % countPerUnit,
  };
}

export function normalizeDualQuantity(whole: number, partial: number, countPerUnit: number): DualQuantity {
  const count = Math.max(1, countPerUnit);
  const total = Math.max(0, Math.trunc(whole)) * count + Math.max(0, Math.trunc(partial));
  return { whole: Math.floor(total / count), partial: total % count };
}

export function calculateDualPrice(product: any, value: DualQuantity) {
  // In the ordering screens `price` is the price of one partial/single unit.
  // A whole package (e.g. carton) therefore costs countPerUnit × single-unit price.
  // This prevents a carton from being calculated cheaper than one item.
  const singleUnitPrice = Number(product.price ?? product.unitPrice ?? 0) || 0;
  const countPerUnit = getCountPerUnit(product);
  const totalSingleUnits = Math.max(0, value.whole) * countPerUnit + Math.max(0, value.partial);
  return singleUnitPrice * totalSingleUnits;
}

export function orderItemTotal(item: any) {
  const whole = Number(item.wholeQuantity ?? item.quantity ?? 0) || 0;
  const partial = Number(item.partialQuantity ?? 0) || 0;
  const count = Math.max(1, Number(item.countPerUnit ?? 1) || 1);
  return Number(item.unitPrice ?? 0) * (whole + partial / count);
}
