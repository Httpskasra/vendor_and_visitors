"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// =========================
// FONT REGISTER
// =========================

Font.register({
  family: "Vazir",
  fonts: [
    {
      src: "/fonts/Vazir.ttf",
      fontWeight: "normal",
    },
    {
      src: "/fonts/Vazir-Bold.ttf",
      fontWeight: "bold",
    },
  ],
});

// =========================
// STYLES
// =========================

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Vazir",
    direction: "rtl",
    textAlign: "right",
    fontSize: 11,
    backgroundColor: "#ffffff",
  },

  // =========================
  // HEADER
  // =========================

  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    paddingBottom: 10,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1e3a8a",
    marginBottom: 5,
    textAlign: "right",
  },

  orderId: {
    fontSize: 11,
    color: "#6b7280",
    textAlign: "right",
  },

  // =========================
  // SECTIONS
  // =========================

  section: {
    marginBottom: 18,
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 10,
    backgroundColor: "#f3f4f6",
    padding: 8,
    borderRadius: 4,
    textAlign: "right",
  },

  row: {
    flexDirection: "row-reverse",
    marginBottom: 8,
    alignItems: "center",
  },

  label: {
    width: 120,
    fontSize: 10,
    fontWeight: "bold",
    color: "#374151",
    textAlign: "right",
  },

  value: {
    flex: 1,
    fontSize: 10,
    color: "#111827",
    textAlign: "right",
  },

  // =========================
  // TABLE
  // =========================

  table: {
    marginTop: 10,
    marginBottom: 20,
  },

  tableHeader: {
    flexDirection: "row-reverse",
    backgroundColor: "#e5e7eb",
    paddingVertical: 8,
    paddingHorizontal: 5,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    fontWeight: "bold",
  },

  tableRow: {
    flexDirection: "row-reverse",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingVertical: 8,
    paddingHorizontal: 5,
    alignItems: "center",
  },

  colProduct: {
    width: "40%",
    textAlign: "right",
    fontSize: 10,
  },

  colQty: {
    width: "15%",
    textAlign: "center",
    fontSize: 10,
  },

  colPrice: {
    width: "20%",
    textAlign: "center",
    fontSize: 10,
  },

  colTotal: {
    width: "25%",
    textAlign: "left",
    fontSize: 10,
  },

  // =========================
  // TOTALS
  // =========================

  totalsContainer: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#d1d5db",
    paddingTop: 10,
  },

  totalRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  totalLabel: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#374151",
    textAlign: "right",
  },

  totalValue: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#16a34a",
    textAlign: "left",
  },

  dangerText: {
    color: "#dc2626",
  },

  // =========================
  // FOOTER
  // =========================

  footer: {
    position: "absolute",
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: "center",
    fontSize: 8,
    color: "#9ca3af",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 10,
  },
});

// =========================
// TYPES
// =========================

interface OrderInvoiceProps {
  order: any;
}

// =========================
// HELPERS
// =========================

const formatPrice = (value: number) =>
  new Intl.NumberFormat("fa-IR").format(value || 0);

const rtlText = (text: string) => `${text}`;

// =========================
// COMPONENT
// =========================

export function OrderInvoicePDF({ order }: OrderInvoiceProps) {
  const orderTotal = order.totalAmount || 0;
  const paidAmount = order.paidAmount || 0;
  const remaining = orderTotal - paidAmount;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* =========================
            HEADER
        ========================= */}

        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{rtlText("فاکتور سفارش")}</Text>

            <Text style={styles.orderId}>
              {rtlText(`شماره سفارش: #${order.id}`)}
            </Text>
          </View>

          <Text style={styles.orderId}>
            {rtlText(new Date(order.createdAt).toLocaleDateString("fa-IR"))}
          </Text>
        </View>

        {/* =========================
            CUSTOMER INFO
        ========================= */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {rtlText("اطلاعات فروشنده و خریدار")}
          </Text>

          <View style={styles.row}>
            <Text style={styles.label}>{rtlText("فروشنده:")}</Text>

            <Text style={styles.value}>
              {rtlText(order.seller?.name || order.shop?.name || "نامشخص")}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>{rtlText("خریدار:")}</Text>

            <Text style={styles.value}>
              {rtlText(
                `${order.user?.name || "ناشناس"} - ${order.user?.phone || ""}`,
              )}
            </Text>
          </View>

          {order.notes && (
            <View style={styles.row}>
              <Text style={styles.label}>{rtlText("توضیحات:")}</Text>

              <Text style={styles.value}>{rtlText(order.notes)}</Text>
            </View>
          )}
        </View>

        {/* =========================
            TABLE
        ========================= */}

        <View style={styles.table}>
          <Text style={styles.sectionTitle}>{rtlText("اقلام سفارش")}</Text>

          <View style={styles.tableHeader}>
            <Text style={styles.colProduct}>{rtlText("محصول")}</Text>

            <Text style={styles.colQty}>{rtlText("تعداد")}</Text>

            <Text style={styles.colPrice}>{rtlText("قیمت واحد")}</Text>

            <Text style={styles.colTotal}>{rtlText("جمع")}</Text>
          </View>

          {order.items?.map((item: any, idx: number) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={styles.colProduct}>
                {rtlText(item.productName || item.product?.name || "-")}
              </Text>

              <Text style={styles.colQty}>
                {rtlText(String(item.quantity))}
              </Text>

              <Text style={styles.colPrice}>
                {rtlText(`${formatPrice(item.unitPrice)} ریال`)}
              </Text>

              <Text style={styles.colTotal}>
                {rtlText(`${formatPrice(item.quantity * item.unitPrice)} ریال`)}
              </Text>
            </View>
          ))}
        </View>

        {/* =========================
            TOTALS
        ========================= */}

        <View style={styles.totalsContainer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{rtlText("جمع کل سفارش")}</Text>

            <Text style={styles.totalValue}>
              {rtlText(`${formatPrice(orderTotal)} ریال`)}
            </Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{rtlText("مبلغ پرداختی")}</Text>

            <Text style={styles.totalValue}>
              {rtlText(`${formatPrice(paidAmount)} ریال`)}
            </Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{rtlText("مانده")}</Text>

            <Text
              style={[
                styles.totalValue,
                remaining > 0 ? styles.dangerText : {},
              ]}>
              {rtlText(`${formatPrice(remaining)} ریال`)}
            </Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{rtlText("وضعیت پرداخت")}</Text>

            <Text style={styles.totalValue}>
              {rtlText(
                order.paymentStatus === "PAID" ? "پرداخت کامل"
                : order.paymentStatus === "PARTIAL" ? "پرداخت جزئی"
                : "پرداخت نشده",
              )}
            </Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{rtlText("وضعیت سفارش")}</Text>

            <Text style={styles.totalValue}>
              {rtlText(
                order.status === "PENDING" ? "در انتظار تأیید"
                : order.status === "CONFIRMED" ? "تأیید شده"
                : order.status === "SHIPPED" ? "ارسال شده"
                : order.status === "DELIVERED" ? "تحویل داده شده"
                : "لغو شده",
              )}
            </Text>
          </View>
        </View>

        {/* =========================
            FOOTER
        ========================= */}

        <Text style={styles.footer} fixed>
          {rtlText("این فاکتور توسط سیستم مدیریت سفارشات صادر شده است.")}
        </Text>
      </Page>
    </Document>
  );
}
