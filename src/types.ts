import type { LucideIcon } from "lucide-react";

export type TransactionType = "income" | "expense";
export type DebtMode = "simple" | "installment";
export type DebtType = "debt";

export type Transaction = {
  id: string;
  date: string;
  title: string;
  type: TransactionType;
  amount: number;
  category: string;
  account: string;
  note?: string;
  source?: "web" | "telegram" | "demo";
};

export type Category = {
  id: string;
  name: string;
  kind: TransactionType | "both";
  color: string;
  softColor: string;
  icon: LucideIcon;
  budget?: number;
};

export type Budget = {
  categoryId: string;
  amount: number;
};

export type DebtInstallment = {
  id: string;
  dueDate: string;
  amount: number;
  finePaid?: number;
  paid: boolean;
};

export type Debt = {
  id: string;
  name: string;
  type: DebtType;
  mode: DebtMode;
  originalAmount: number;
  remainingAmount: number;
  monthlyAmount: number;
  finePaid?: number;
  startDate?: string;
  dueDate?: string;
  dueDay?: number;
  note?: string;
  installments: DebtInstallment[];
};

export type AppUser = {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  demo?: boolean;
};

export type AppView = "home" | "transactions" | "budget" | "reports" | "more" | "debts";

export type AppState = {
  transactions: Transaction[];
  debts: Debt[];
  budgets: Budget[];
};
