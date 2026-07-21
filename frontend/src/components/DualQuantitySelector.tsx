"use client";

import type { DualQuantity } from "@/lib/units";
import {
  getCountPerUnit,
  getPartialStock,
  getTotalStockInPartialUnits,
  getWholeStock,
} from "@/lib/units";

export default function DualQuantitySelector({ product, value, onChange, accent = "blue" }: { product: any; value: DualQuantity; onChange: (value: DualQuantity) => void; accent?: "blue" | "amber" }) {
  const wholeStock = getWholeStock(product);
  const partialStock = getPartialStock(product);
  const countPerUnit = getCountPerUnit(product);
  const totalStock = getTotalStockInPartialUnits(product);
  const wholeLabel = product.unitType || "واحد کلی";
  const partialLabel = product.subUnitType || "واحد جزئی";
  const ring = accent === "amber" ? "border-amber-200 bg-amber-50" : "border-blue-200 bg-blue-50";

  const maxWhole = Math.max(0, Math.floor((totalStock - value.partial) / countPerUnit));
  const remainingAfterWhole = Math.max(0, totalStock - value.whole * countPerUnit);
  // مقدار جزئی را canonical نگه می‌داریم؛ هر countPerUnit واحد جزئی برابر یک واحد کلی است.
  const maxPartial = Math.min(countPerUnit - 1, remainingAfterWhole);

  const setWhole = (nextWhole: number) => {
    const whole = Math.max(0, Math.min(maxWhole, Math.trunc(nextWhole || 0)));
    const allowedPartial = Math.min(value.partial, Math.min(countPerUnit - 1, Math.max(0, totalStock - whole * countPerUnit)));
    onChange({ whole, partial: allowedPartial });
  };

  const setPartial = (nextPartial: number) => {
    const partial = Math.max(0, Math.min(maxPartial, Math.trunc(nextPartial || 0)));
    onChange({ ...value, partial });
  };

  const field = (kind: "whole" | "partial", label: string, current: number, max: number, setter: (value: number) => void, stockText: string) => (
    <div className={`rounded-xl border p-2 ${ring}`}>
      <div className="mb-2 flex items-center justify-between gap-2 text-xs">
        <span className="font-bold text-gray-700">{label}</span>
        <span className="text-left text-gray-500">{stockText}</span>
      </div>
      <div className="flex h-10 items-center overflow-hidden rounded-lg bg-white">
        <button type="button" className="h-full w-11 text-xl font-bold text-red-600" onClick={() => setter(current - 1)}>−</button>
        <input type="number" min={0} max={max} value={current} onChange={(e) => setter(Number(e.target.value) || 0)} className="h-full min-w-0 flex-1 border-0 bg-transparent text-center font-black outline-none" />
        <button type="button" disabled={current >= max} className="h-full w-11 text-xl font-bold text-green-700 disabled:opacity-30" onClick={() => setter(current + 1)}>＋</button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {field("whole", wholeLabel, value.whole, maxWhole, setWhole, `موجودی: ${wholeStock.toLocaleString("fa-IR")}`)}
        {field("partial", partialLabel, value.partial, maxPartial, setPartial, `قابل خرید تا ${maxPartial.toLocaleString("fa-IR")}`)}
      </div>
      <p className="mt-1 text-[11px] text-gray-500">
        موجودی کل: {wholeStock.toLocaleString("fa-IR")} {wholeLabel} + {partialStock.toLocaleString("fa-IR")} {partialLabel}؛ هر {countPerUnit.toLocaleString("fa-IR")} {partialLabel} برابر یک {wholeLabel} است.
      </p>
    </div>
  );
}
