import {
  Banknote,
  Bolt,
  Car,
  Clapperboard,
  HeartPulse,
  Landmark,
  Package,
  PiggyBank,
  ShoppingBag,
  Utensils,
} from "lucide-react";
import type { AppState, Budget, Category, Debt, Transaction, TransactionType } from "./types";

export const monthLabel = "Juni 2026";
export const workspaceName = "Tiga Awan Studio";

export const categories: Category[] = [
  { id: "transfer", name: "Transfer", kind: "income", color: "#0f9f61", softColor: "#e1f8ec", icon: Landmark },
  { id: "income", name: "Income", kind: "income", color: "#18a4a1", softColor: "#dff8f6", icon: Banknote },
  { id: "health", name: "Kesehatan", kind: "expense", color: "#e34650", softColor: "#ffe5e8", icon: Package, budget: 700000 },
  { id: "utilities", name: "Tagihan & Utilitas", kind: "expense", color: "#a745e7", softColor: "#f3ddff", icon: Bolt, budget: 500000 },
  { id: "food", name: "Makanan & Minuman", kind: "expense", color: "#f0a000", softColor: "#fff3da", icon: Utensils, budget: 450000 },
  { id: "entertainment", name: "Hiburan", kind: "expense", color: "#df3d8e", softColor: "#ffe3f0", icon: Clapperboard, budget: 250000 },
  { id: "transport", name: "Transportasi", kind: "expense", color: "#23bf73", softColor: "#def8ea", icon: Car, budget: 200000 },
  { id: "shopping", name: "Belanja", kind: "expense", color: "#64748b", softColor: "#eef2f7", icon: ShoppingBag, budget: 250000 },
  { id: "debt-payment", name: "Pembayaran Hutang", kind: "expense", color: "#c2185b", softColor: "#ffe2ee", icon: Landmark, budget: 0 },
  { id: "receivable", name: "Penerimaan Piutang", kind: "income", color: "#0f9f61", softColor: "#e1f8ec", icon: Banknote },
  { id: "fine", name: "Denda", kind: "expense", color: "#b45309", softColor: "#fff0d8", icon: Bolt, budget: 0 },
  { id: "other", name: "Lain-lain", kind: "both", color: "#5f6f82", softColor: "#eef2f4", icon: Package, budget: 150000 },
  { id: "saving", name: "Tabungan", kind: "both", color: "#0f9f61", softColor: "#e1f8ec", icon: PiggyBank, budget: 0 },
];

const tx = (
  id: number,
  date: string,
  title: string,
  type: TransactionType,
  amount: number,
  category: string,
  account = "dana",
  note = "",
): Transaction => ({
  id: `TX-${String(id).padStart(6, "0")}`,
  date,
  title,
  type,
  amount,
  category,
  account,
  note,
});

export const seedTransactions: Transaction[] = [
  tx(42, "2026-06-05", "jajan", "expense", 10000, "food"),
  tx(41, "2026-06-05", "jajan", "expense", 16000, "food"),
  tx(40, "2026-06-05", "transport", "expense", 30000, "transport"),
  tx(39, "2026-06-05", "kopi team", "expense", 45000, "food"),
  tx(38, "2026-06-05", "yakult", "expense", 21500, "other"),
  tx(37, "2026-06-05", "yakult", "expense", 21500, "other"),
  tx(36, "2026-06-05", "jajan minum", "expense", 13000, "food"),
  tx(35, "2026-06-05", "domain wafin.id", "expense", 248049, "utilities", "bank", "renewal domain"),
  tx(34, "2026-06-04", "suntik", "expense", 265000, "health"),
  tx(33, "2026-06-04", "cabut gigi", "expense", 250000, "health"),
  tx(32, "2026-06-04", "obat", "expense", 81000, "health"),
  tx(31, "2026-06-04", "bioskop", "expense", 95000, "entertainment"),
  tx(30, "2026-06-04", "game pass", "expense", 60000, "entertainment"),
  tx(29, "2026-06-04", "makan siang", "expense", 52000, "food"),
  tx(28, "2026-06-04", "snack meeting", "expense", 41000, "food"),
  tx(27, "2026-06-04", "parkir", "expense", 12000, "transport"),
  tx(26, "2026-06-04", "bensin", "expense", 42000, "transport"),
  tx(25, "2026-06-04", "listrik", "expense", 100000, "utilities"),
  tx(24, "2026-06-04", "internet", "expense", 0, "utilities"),
  tx(23, "2026-06-03", "makan malam", "expense", 56000, "food"),
  tx(22, "2026-06-03", "air mineral", "expense", 9000, "food"),
  tx(21, "2026-06-03", "cloud storage", "expense", 0, "utilities"),
  tx(20, "2026-06-03", "template aset", "expense", 28000, "shopping"),
  tx(19, "2026-06-03", "tools design", "expense", 0, "utilities"),
  tx(18, "2026-06-03", "top up ewallet", "expense", 0, "other"),
  tx(17, "2026-06-03", "fee admin", "expense", 0, "other"),
  tx(16, "2026-06-03", "refund kecil", "income", 40000, "income"),
  tx(15, "2026-06-03", "transfer project", "income", 3500000, "transfer", "bank"),
  tx(14, "2026-06-03", "transfer project", "income", 5200000, "transfer", "bank"),
  tx(13, "2026-06-03", "transfer project", "income", 7000000, "transfer", "bank"),
  tx(12, "2026-06-03", "transfer project", "income", 9147000, "transfer", "bank"),
  tx(11, "2026-06-02", "uang masuk", "income", 5000000, "transfer", "bank"),
  tx(10, "2026-06-02", "donat", "expense", 22000, "food"),
  tx(9, "2026-06-02", "makan pagi", "expense", 20000, "food"),
  tx(8, "2026-06-01", "langganan app", "expense", 0, "utilities"),
  tx(7, "2026-06-01", "catatan lain", "expense", 0, "other"),
];

export const seedDebts: Debt[] = [
  {
    id: "debt-motor",
    name: "Motor",
    type: "debt",
    mode: "installment",
    originalAmount: 3079700,
    remainingAmount: 1740700,
    monthlyAmount: 133900,
    finePaid: 111000,
    installments: [
      { id: "1", dueDate: "2026-07-03", amount: 0, finePaid: 111000, paid: true },
      { id: "2", dueDate: "2026-06-12", amount: 133900, paid: false },
      { id: "3", dueDate: "2026-07-12", amount: 133900, paid: false },
      { id: "4", dueDate: "2026-08-12", amount: 133900, paid: false },
      { id: "5", dueDate: "2026-09-12", amount: 133900, paid: false },
      { id: "6", dueDate: "2026-10-12", amount: 133900, paid: false },
      { id: "7", dueDate: "2026-11-12", amount: 133900, paid: false },
      { id: "8", dueDate: "2026-12-12", amount: 133900, paid: false },
      { id: "9", dueDate: "2027-01-12", amount: 133900, paid: false },
      { id: "10", dueDate: "2027-02-12", amount: 133900, paid: false },
    ],
  },
];

export const seedBudgets: Budget[] = categories
  .filter((category) => category.kind === "expense" && category.budget !== undefined)
  .map((category) => ({ categoryId: category.id, amount: category.budget ?? 0 }));

export const initialState: AppState = {
  transactions: seedTransactions,
  debts: seedDebts,
  budgets: seedBudgets,
};

export const getCategory = (id: string) => categories.find((category) => category.id === id) ?? categories[categories.length - 1];

export const currency = (value: number, signed = false) => {
  const prefix = signed && value > 0 ? "+" : "";
  const minus = value < 0 ? "-" : "";
  const amount = Math.abs(Math.round(value)).toLocaleString("id-ID");
  return `${prefix}${minus}Rp${amount}`;
};

export const compactCurrency = (value: number) => {
  if (value >= 1000000) return `${Math.round(value / 1000000)}jt`;
  if (value >= 1000) return `${Math.round(value / 1000)}rb`;
  return String(value);
};

export const dateShort = (date: string) =>
  new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(date));

export const dateMonthDay = (date: string) =>
  new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short" }).format(new Date(date)).replace(".", "");

export const transactionTotals = (transactions: Transaction[]) => {
  const income = transactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const expense = transactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
  return { income, expense, net: income - expense };
};

export const categoryTotals = (transactions: Transaction[], type: TransactionType) => {
  const total = transactions.filter((item) => item.type === type).reduce((sum, item) => sum + item.amount, 0);
  return categories
    .filter((category) => category.kind === type || category.kind === "both")
    .map((category) => {
      const amount = transactions
        .filter((item) => item.type === type && item.category === category.id)
        .reduce((sum, item) => sum + item.amount, 0);
      return { ...category, amount, percent: total ? Math.round((amount / total) * 100) : 0 };
    })
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);
};

export const dailyFlow = (transactions: Transaction[]) => {
  return Array.from({ length: 30 }, (_, index) => {
    const day = index + 1;
    const date = `2026-06-${String(day).padStart(2, "0")}`;
    return {
      day,
      Masuk: transactions.filter((item) => item.date === date && item.type === "income").reduce((sum, item) => sum + item.amount, 0),
      Keluar: transactions.filter((item) => item.date === date && item.type === "expense").reduce((sum, item) => sum + item.amount, 0),
    };
  });
};

export const makeTransactionId = (transactions: Transaction[]) => {
  const next =
    transactions
      .map((item) => Number(item.id.replace("TX-", "")))
      .filter(Boolean)
      .sort((a, b) => b - a)[0] + 1 || 1;
  return `TX-${String(next).padStart(6, "0")}`;
};

const parseAmountValue = (rawAmount: string, suffix = "") => {
  const normalized = rawAmount.trim();
  const hasDecimalUnit = /jt|juta|rb|ribu|k/i.test(suffix) && /^\d+[,.]\d{1,2}$/.test(normalized);
  const base = hasDecimalUnit ? Number(normalized.replace(",", ".")) : Number(normalized.replace(/[.,]/g, ""));
  const multiplier = /jt|juta/i.test(suffix) ? 1000000 : /rb|ribu|k/i.test(suffix) ? 1000 : 1;
  return Math.round(base * multiplier);
};

export const parseTelegramCommand = (input: string, transactions: Transaction[]): Transaction | null => {
  const text = input.trim();
  const type = /\b(masuk|income|terima|gaji)\b/i.test(text) ? "income" : "expense";
  const amountMatch = text.match(/(?:rp\s*)?(\d[\d.,]*)\s*(rb|ribu|jt|juta|k)?/i);
  if (!amountMatch) return null;

  const amount = parseAmountValue(amountMatch[1], amountMatch[2] ?? "");
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const lower = text.toLowerCase();
  const category =
    categories.find((item) => lower.includes(item.name.toLowerCase()))?.id ??
    (/(makan|jajan|kopi|minum|sarapan|siang|malam)/i.test(text)
      ? "food"
      : /(listrik|domain|internet|tagihan|wifi|pulsa)/i.test(text)
        ? "utilities"
        : /(bensin|parkir|gojek|grab|transport)/i.test(text)
          ? "transport"
          : /(obat|dokter|gigi|suntik|sehat)/i.test(text)
            ? "health"
            : type === "income"
              ? "income"
              : "other");

  const title = text
    .replace(amountMatch[0], "")
    .replace(/\b(keluar|masuk|expense|income|catat|terima)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return {
    id: makeTransactionId(transactions),
    date: new Date().toISOString().slice(0, 10),
    title: title || (type === "income" ? "uang masuk" : "pengeluaran"),
    type,
    amount,
    category,
    account: "telegram",
    note: `Dibuat dari Telegram: ${text}`,
    source: "telegram",
  };
};
