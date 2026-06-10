import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  Download,
  FileText,
  Home,
  Landmark,
  LayoutGrid,
  LogOut,
  MoreHorizontal,
  Pencil,
  Plus,
  ReceiptText,
  Scale,
  Search,
  Settings,
  Trash2,
  Wallet,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  categories,
  categoryTotals,
  compactCurrency,
  currency,
  dailyFlow,
  dateMonthDay,
  dateShort,
  getCategory,
  initialState,
  makeTransactionId,
  monthLabel,
  seedBudgets,
  transactionTotals,
  workspaceName,
} from "./data";
import { hasFirebaseConfig, logout, signInWithGoogle } from "./lib/firebase";
import type { AppState, AppUser, AppView, Budget, Debt, Transaction, TransactionType } from "./types";

type FormMode =
  | "expense"
  | "income"
  | "debt"
  | "debt_installment"
  | "payment";

type FormState = {
  mode: FormMode;
  title: string;
  amount: string;
  type: TransactionType;
  category: string;
  account: string;
  date: string;
  dueDate: string;
  note: string;
  debtId: string;
  installmentCount: string;
  monthlyAmount: string;
  dueDay: string;
  fineAmount: string;
  autoTransaction: boolean;
};

const today = () => new Date().toISOString().slice(0, 10);
const stateStorageKey = "money-tracker-state-v2";
const userStorageKey = "money-tracker-user-v1";

const loadInitialState = (): AppState => {
  try {
    const stored = window.localStorage.getItem(stateStorageKey);
    if (!stored) return initialState;
    const parsed = JSON.parse(stored) as AppState;
    if (!Array.isArray(parsed.transactions) || !Array.isArray(parsed.debts)) return initialState;
    return {
      ...parsed,
      budgets: Array.isArray(parsed.budgets) ? parsed.budgets : seedBudgets,
    };
  } catch {
    return initialState;
  }
};

const loadInitialUser = (): AppUser | null => {
  try {
    const stored = window.localStorage.getItem(userStorageKey);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as AppUser;
    return parsed.uid && parsed.name ? parsed : null;
  } catch {
    return null;
  }
};

const emptyForm = (): FormState => ({
  mode: "expense",
  title: "",
  amount: "",
  type: "expense",
  category: "food",
  account: "dana",
  date: today(),
  dueDate: today(),
  note: "",
  debtId: "",
  installmentCount: "1",
  monthlyAmount: "",
  dueDay: "12",
  fineAmount: "",
  autoTransaction: true,
});

const moneyValue = (value: string) => Number(value.replace(/[^\d]/g, ""));

const rupiahInput = (value: string | number) => {
  const amount = typeof value === "number" ? value : moneyValue(value);
  return amount > 0 ? currency(amount) : "";
};

const currencyInputChange =
  (update: (value: string) => void) =>
  (event: React.ChangeEvent<HTMLInputElement>) => {
    update(String(moneyValue(event.target.value)));
  };

const isValidDate = (value: string) => !Number.isNaN(new Date(`${value}T00:00:00`).getTime());

const isCategoryAllowed = (categoryId: string, type: TransactionType) => {
  const category = categories.find((item) => item.id === categoryId);
  if (!category) return false;
  return category.kind === type || category.kind === "both";
};

const validateForm = (form: FormState, debts: Debt[]) => {
  const errors: string[] = [];
  const amount = moneyValue(form.amount);
  const monthlyAmount = moneyValue(form.monthlyAmount);
  const installmentCount = Number(form.installmentCount);
  const dueDay = Number(form.dueDay);
  const activeDebts = debts.filter((debt) => debt.remainingAmount > 0);
  const selectedDebt = activeDebts.find((debt) => debt.id === form.debtId);

  if (form.mode === "expense" || form.mode === "income") {
    if (!form.title.trim()) errors.push("Judul wajib diisi.");
    if (amount <= 0) errors.push("Nominal wajib lebih dari 0.");
    if (!isValidDate(form.date)) errors.push("Tanggal wajib valid.");
    if (!form.account) errors.push("Akun wajib dipilih.");
    if (!form.category || !isCategoryAllowed(form.category, form.type)) errors.push("Kategori harus sesuai tipe transaksi.");
  }

  if (
    form.mode === "debt" ||
    form.mode === "debt_installment"
  ) {
    if (!form.title.trim()) errors.push("Nama hutang wajib diisi.");
    if (amount <= 0) errors.push("Total wajib lebih dari 0.");
    if (!isValidDate(form.date)) errors.push("Tanggal mulai wajib valid.");

    if (form.mode === "debt") {
      if (!isValidDate(form.dueDate)) errors.push("Tanggal jatuh tempo wajib valid.");
      if (isValidDate(form.date) && isValidDate(form.dueDate) && form.dueDate < form.date) {
        errors.push("Jatuh tempo tidak boleh sebelum tanggal mulai.");
      }
    } else {
      if (!Number.isInteger(installmentCount) || installmentCount <= 0) errors.push("Jumlah cicilan wajib minimal 1.");
      if (monthlyAmount <= 0) errors.push("Nominal cicilan wajib lebih dari 0.");
      if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) errors.push("Tanggal jatuh tempo cicilan harus 1-31.");
      if (monthlyAmount > 0 && installmentCount > 0 && monthlyAmount * installmentCount < amount) {
        errors.push("Total jadwal cicilan harus menutup total hutang.");
      }
    }
  }

  if (form.mode === "payment") {
    if (!activeDebts.length) errors.push("Belum ada hutang aktif untuk dibayar.");
    if (!form.debtId || !selectedDebt) errors.push("Pilih hutang yang akan dibayar.");
    if (amount <= 0) errors.push("Nominal bayar wajib lebih dari 0.");
    if (selectedDebt && amount > selectedDebt.remainingAmount) {
      errors.push("Nominal bayar tidak boleh melebihi sisa hutang.");
    }
    if (!isValidDate(form.date)) errors.push("Tanggal bayar wajib valid.");
    if (!form.account) errors.push("Akun wajib dipilih.");
  }

  return errors;
};

const makeDebtId = (debts: Debt[], name: string) => {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "debt";
  let id = base;
  let counter = 2;
  while (debts.some((debt) => debt.id === id)) {
    id = `${base}-${counter}`;
    counter += 1;
  }
  return id;
};

const installmentDueDate = (startDate: string, sequence: number, dueDay: number) => {
  const start = new Date(`${startDate}T00:00:00`);
  const target = new Date(start.getFullYear(), start.getMonth() + sequence - 1, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(Math.max(dueDay, 1), lastDay));
  return target.toISOString().slice(0, 10);
};

const makeDebtInstallments = (startDate: string, count: number, dueDay: number, monthlyAmount: number, totalAmount: number) =>
  Array.from({ length: count }, (_, index) => {
    const remainingBeforePayment = Math.max(0, totalAmount - monthlyAmount * index);
    const amount = index === count - 1 ? remainingBeforePayment : Math.min(monthlyAmount, remainingBeforePayment);
    return {
      id: String(index + 1),
      dueDate: installmentDueDate(startDate, index + 1, dueDay),
      amount,
      paid: false,
    };
  });

const navItems: { id: AppView; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Beranda", icon: Home },
  { id: "transactions", label: "Transaksi", icon: ReceiptText },
  { id: "budget", label: "Budget", icon: Wallet },
  { id: "reports", label: "Laporan", icon: BarChart3 },
  { id: "more", label: "Lainnya", icon: MoreHorizontal },
];

const viewTitle: Record<AppView, string> = {
  home: "Beranda",
  transactions: "Transaksi",
  budget: "Budget",
  reports: "Laporan",
  more: "Lainnya",
  debts: "Hutang",
};

function App() {
  const [user, setUser] = useState<AppUser | null>(loadInitialUser);
  const [view, setView] = useState<AppView>("home");
  const [state, setState] = useState<AppState>(loadInitialState);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [editingDebtId, setEditingDebtId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<"all" | TransactionType>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const totals = useMemo(() => transactionTotals(state.transactions), [state.transactions]);
  const expenseBreakdown = useMemo(() => categoryTotals(state.transactions, "expense"), [state.transactions]);
  const incomeBreakdown = useMemo(() => categoryTotals(state.transactions, "income"), [state.transactions]);
  const flow = useMemo(() => dailyFlow(state.transactions), [state.transactions]);

  useEffect(() => {
    window.localStorage.setItem(stateStorageKey, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (user) {
      window.localStorage.setItem(userStorageKey, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(userStorageKey);
    }
  }, [user]);

  const startSignIn = async () => {
    const signedInUser = await signInWithGoogle();
    setUser(signedInUser);
  };

  const startLogout = async () => {
    await logout();
    setUser(null);
  };

  const resetDemoData = () => {
    setState(initialState);
    setTypeFilter("all");
    setCategoryFilter("all");
    setView("home");
  };

  const openForm = (type: TransactionType = "expense") => {
    setFormErrors([]);
    setEditingTransactionId(null);
    setEditingDebtId(null);
    setForm({ ...emptyForm(), mode: type, type, category: type === "income" ? "income" : "food" });
    setShowForm(true);
  };

  const openDebtForm = () => {
    setFormErrors([]);
    setEditingTransactionId(null);
    setEditingDebtId(null);
    setForm({ ...emptyForm(), mode: "debt_installment" });
    setShowForm(true);
  };

  const openEditDebt = (debt: Debt) => {
    setFormErrors([]);
    setEditingTransactionId(null);
    setEditingDebtId(debt.id);
    setForm({
      ...emptyForm(),
      mode: debt.mode === "installment" ? "debt_installment" : "debt",
      title: debt.name,
      amount: String(debt.originalAmount),
      date: debt.startDate ?? today(),
      dueDate: debt.dueDate ?? today(),
      dueDay: String(debt.dueDay ?? new Date(`${debt.installments[0]?.dueDate ?? today()}T00:00:00`).getDate()),
      installmentCount: String(Math.max(1, debt.installments.length || 1)),
      monthlyAmount: String(debt.monthlyAmount || ""),
      fineAmount: String(debt.finePaid || ""),
      note: debt.note ?? "",
    });
    setShowForm(true);
  };

  const openEditTransaction = (transaction: Transaction) => {
    setFormErrors([]);
    setEditingTransactionId(transaction.id);
    setEditingDebtId(null);
    setForm({
      ...emptyForm(),
      mode: transaction.type,
      title: transaction.title,
      amount: String(transaction.amount),
      type: transaction.type,
      category: transaction.category,
      account: transaction.account,
      date: transaction.date,
      note: transaction.note ?? "",
    });
    setShowForm(true);
  };

  const openPaymentForm = (debtId: string) => {
    const debt = state.debts.find((item) => item.id === debtId);
    setFormErrors([]);
    setEditingDebtId(null);
    setForm({
      ...emptyForm(),
      mode: "payment",
      debtId,
      amount: String(debt?.monthlyAmount || debt?.remainingAmount || ""),
    });
    setShowForm(true);
  };

  const saveForm = (event: React.FormEvent) => {
    event.preventDefault();
    const validationErrors = validateForm(form, state.debts);
    if (validationErrors.length) {
      setFormErrors(validationErrors);
      return;
    }

    const amount = moneyValue(form.amount);
    const fineAmount = moneyValue(form.fineAmount);
    const title = form.title.trim();

    if (form.mode === "expense" || form.mode === "income") {
      if (!title || amount <= 0) return;
      const transaction: Transaction = {
        id: editingTransactionId ?? makeTransactionId(state.transactions),
        date: form.date,
        title,
        type: form.type,
        amount,
        category: form.category,
        account: form.account,
        note: form.note.trim() || undefined,
        source: "web",
      };
      setState((current) => ({
        ...current,
        transactions: editingTransactionId
          ? current.transactions.map((item) => (item.id === editingTransactionId ? transaction : item))
          : [transaction, ...current.transactions],
      }));
      setEditingTransactionId(null);
      setShowForm(false);
      return;
    }

    if (
      form.mode === "debt" ||
      form.mode === "debt_installment"
    ) {
      if (!title || amount <= 0) return;
      const isInstallment = form.mode.endsWith("installment");
      const installmentCount = Math.max(1, Number(form.installmentCount) || 1);
      const monthlyAmount = isInstallment ? moneyValue(form.monthlyAmount) || Math.ceil(amount / installmentCount) : 0;
      const dueDay = Math.min(31, Math.max(1, Number(form.dueDay) || new Date(`${form.date}T00:00:00`).getDate()));
      const existingDebt = state.debts.find((debt) => debt.id === editingDebtId);
      const paidAmount = existingDebt ? Math.max(0, existingDebt.originalAmount - existingDebt.remainingAmount) : 0;
      const debt: Debt = {
        id: editingDebtId ?? makeDebtId(state.debts, title),
        name: title,
        type: "debt",
        mode: isInstallment ? "installment" : "simple",
        originalAmount: amount,
        remainingAmount: Math.max(0, amount - paidAmount),
        monthlyAmount,
        finePaid: fineAmount || undefined,
        startDate: form.date,
        dueDate: isInstallment ? undefined : form.dueDate,
        dueDay: isInstallment ? dueDay : undefined,
        note: form.note.trim() || undefined,
        installments: isInstallment ? makeDebtInstallments(form.date, installmentCount, dueDay, monthlyAmount, amount) : [],
      };
      setState((current) => ({
        ...current,
        debts: editingDebtId
          ? current.debts.map((item) => (item.id === editingDebtId ? debt : item))
          : [debt, ...current.debts],
      }));
      setEditingTransactionId(null);
      setEditingDebtId(null);
      setView("debts");
      setShowForm(false);
      return;
    }

    if (form.mode === "payment") {
      if (!form.debtId || amount <= 0) return;
      setState((current) => {
        const selected = current.debts.find((debt) => debt.id === form.debtId);
        if (!selected) return current;
        const paymentAmount = Math.min(amount, selected.remainingAmount);
        const transactions: Transaction[] = [];

        if (form.autoTransaction && paymentAmount > 0) {
          transactions.push({
            id: makeTransactionId([...current.transactions, ...transactions]),
            date: form.date,
            title: `Bayar ${selected.name}`,
            type: "expense",
            amount: paymentAmount,
            category: "debt-payment",
            account: form.account,
            note: form.note.trim() || `Pembayaran ${selected.name}`,
            source: "web",
          });
        }

        if (form.autoTransaction && fineAmount > 0) {
          transactions.push({
            id: makeTransactionId([...current.transactions, ...transactions]),
            date: form.date,
            title: `Denda ${selected.name}`,
            type: "expense",
            amount: fineAmount,
            category: "fine",
            account: form.account,
            note: `Denda pembayaran ${selected.name}`,
            source: "web",
          });
        }

        const debts = current.debts.map((debt) => {
          if (debt.id !== form.debtId) return debt;
          let paidRemainder = paymentAmount;
          return {
            ...debt,
            remainingAmount: Math.max(0, debt.remainingAmount - paymentAmount),
            finePaid: (debt.finePaid ?? 0) + fineAmount,
            installments: debt.installments.map((installment) => {
              if (installment.paid || paidRemainder < installment.amount) return installment;
              paidRemainder -= installment.amount;
              return { ...installment, paid: true, finePaid: (installment.finePaid ?? 0) + fineAmount };
            }),
          };
        });

        return { ...current, debts, transactions: [...transactions, ...current.transactions] };
      });
      setView("debts");
      setEditingTransactionId(null);
      setEditingDebtId(null);
      setShowForm(false);
      return;
    }

    setShowForm(false);
  };

  const deleteTransaction = (id: string) => {
    setState((current) => ({ ...current, transactions: current.transactions.filter((item) => item.id !== id) }));
  };

  const deleteDebt = (id: string) => {
    setState((current) => ({ ...current, debts: current.debts.filter((debt) => debt.id !== id) }));
  };

  const updateBudget = (categoryId: string, amount: number) => {
    setState((current) => {
      const budgets = current.budgets.some((budget) => budget.categoryId === categoryId)
        ? current.budgets.map((budget) => (budget.categoryId === categoryId ? { ...budget, amount } : budget))
        : [...current.budgets, { categoryId, amount }];
      return { ...current, budgets };
    });
  };

  const exportCsv = () => {
    const rows = [
      ["code", "date", "title", "type", "amount", "category", "account", "source", "note"],
      ...state.transactions.map((item) => [
        item.id,
        item.date,
        item.title,
        item.type,
        String(item.amount),
        getCategory(item.category).name,
        item.account,
        item.source ?? "demo",
        item.note ?? "",
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "money-tracker-transaksi.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!user) {
    return <LoginScreen onLogin={startSignIn} />;
  }

  return (
    <div className="app-shell">
      <aside className="side-nav" aria-label="Navigasi utama">
        <BrandMark />
        <nav>
          {navItems.map((item) => (
            <NavButton key={item.id} item={item} active={view === item.id} onClick={() => setView(item.id)} />
          ))}
        </nav>
      </aside>

      <main className="app-main">
        <TopBar user={user} view={view} onAdd={() => openForm("expense")} onLogout={startLogout} />

        {view === "home" && (
          <HomeView
            transactions={state.transactions}
            totals={totals}
            expenseBreakdown={expenseBreakdown}
            onNavigate={setView}
          />
        )}
        {view === "transactions" && (
          <TransactionsView
            transactions={state.transactions}
            typeFilter={typeFilter}
            categoryFilter={categoryFilter}
            setTypeFilter={setTypeFilter}
            setCategoryFilter={setCategoryFilter}
            onAdd={() => openForm("expense")}
            onEdit={openEditTransaction}
            onDelete={deleteTransaction}
            onExport={exportCsv}
          />
        )}
        {view === "budget" && <BudgetView budgets={state.budgets} transactions={state.transactions} onUpdateBudget={updateBudget} />}
        {view === "reports" && (
          <ReportsView
            transactions={state.transactions}
            totals={totals}
            flow={flow}
            expenseBreakdown={expenseBreakdown}
            incomeBreakdown={incomeBreakdown}
          />
        )}
        {view === "debts" && (
          <DebtsView debts={state.debts} onAdd={openDebtForm} onDelete={deleteDebt} onEdit={openEditDebt} onPay={openPaymentForm} />
        )}
        {view === "more" && <MoreView user={user} onNavigate={setView} onLogout={startLogout} onResetData={resetDemoData} />}
      </main>

      <nav className="bottom-nav" aria-label="Navigasi bawah">
        {navItems.map((item) => (
          <NavButton key={item.id} item={item} active={view === item.id} onClick={() => setView(item.id)} />
        ))}
      </nav>

      {showForm && (
        <TransactionForm
          form={form}
          setForm={setForm}
          debts={state.debts}
          errors={formErrors}
          onClearErrors={() => setFormErrors([])}
          onClose={() => {
            setFormErrors([]);
            setEditingTransactionId(null);
            setEditingDebtId(null);
            setShowForm(false);
          }}
          onSubmit={saveForm}
        />
      )}
    </div>
  );
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  return (
    <main className="login-screen">
      <section className="login-panel">
        <BrandMark />
        <div>
          <p className="eyebrow">Money Tracker</p>
          <h1>Kelola arus kas Juni dengan cepat.</h1>
          <p className="muted">
            Mulai dari data kosong untuk transaksi, budget, laporan, dan hutang.
          </p>
        </div>
        <button className="primary-button large-button" type="button" onClick={onLogin}>
          <CircleDollarSign size={20} />
          {hasFirebaseConfig ? "Login Google" : "Masuk Mode Demo"}
        </button>
      </section>
    </main>
  );
}

function BrandMark() {
  return (
    <div className="brand-mark">
      <span className="brand-icon">
        <Wallet size={22} />
      </span>
      <div>
        <strong>Money Tracker</strong>
        <small>{workspaceName}</small>
      </div>
    </div>
  );
}

function TopBar({
  user,
  view,
  onAdd,
  onLogout,
}: {
  user: AppUser;
  view: AppView;
  onAdd: () => void;
  onLogout: () => void;
}) {
  if (view === "home" || view === "transactions") {
    return (
      <header className="top-bar home-top-bar">
        <div className="home-title-lockup">
          <span className="brand-icon">
            <Wallet size={20} />
          </span>
          <div>
            <h1>{viewTitle[view]}</h1>
            <p>{monthLabel} - {workspaceName}</p>
          </div>
        </div>
        <div className="top-actions">
          <button className="round-add-button" type="button" onClick={onAdd} aria-label="Catat transaksi">
            <Plus size={22} />
          </button>
          <button className="avatar-button" type="button" onClick={onLogout} title="Logout">
            {user.photoURL ? <img src={user.photoURL} alt={user.name} /> : user.name.slice(0, 1)}
          </button>
        </div>
      </header>
    );
  }

  return (
    <header className="top-bar">
      <div>
        <p className="eyebrow">{monthLabel}</p>
        <h1>{viewTitle[view]}</h1>
      </div>
      <div className="top-actions">
        <button className="icon-button desktop-only" type="button" aria-label="Cari">
          <Search size={18} />
        </button>
        <button className="primary-button" type="button" onClick={onAdd}>
          <Plus size={18} />
          <span>Catat</span>
        </button>
        <button className="avatar-button" type="button" onClick={onLogout} title="Logout">
          {user.photoURL ? <img src={user.photoURL} alt={user.name} /> : user.name.slice(0, 1)}
        </button>
      </div>
    </header>
  );
}

function NavButton({
  item,
  active,
  onClick,
}: {
  item: { id: AppView; label: string; icon: typeof Home };
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button className={`nav-button ${active ? "active" : ""}`} type="button" onClick={onClick} aria-label={item.label}>
      <Icon size={20} />
      <span>{item.label}</span>
    </button>
  );
}

function HomeView({
  transactions,
  totals,
  expenseBreakdown,
  onNavigate,
}: {
  transactions: Transaction[];
  totals: { income: number; expense: number; net: number };
  expenseBreakdown: ReturnType<typeof categoryTotals>;
  onNavigate: (view: AppView) => void;
}) {
  const recent = transactions.slice(0, 5);

  return (
    <section className="view-stack home-view">
      <section className="home-section">
        <SectionHeader title="Transaksi terbaru" action="Lihat semua" onAction={() => onNavigate("transactions")} />
        <TransactionList transactions={recent} compact variant="home" />
      </section>

      <section className="home-section">
        <SectionHeader title="Pengeluaran per kategori" action="Laporan" onAction={() => onNavigate("reports")} />
        <div className="home-category-card">
          <div className="home-category-total">
            <span>Total keluar</span>
            <strong>{currency(totals.expense)}</strong>
          </div>
          <CategoryBreakdown items={expenseBreakdown.slice(0, 6)} variant="home" />
        </div>
      </section>
    </section>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Home;
  label: string;
  value: string;
  tone?: "income" | "expense";
}) {
  return (
    <div className="metric">
      <span className={tone ?? ""}>
        <Icon size={18} />
      </span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function TransactionsView({
  transactions,
  typeFilter,
  categoryFilter,
  setTypeFilter,
  setCategoryFilter,
  onAdd,
  onEdit,
  onDelete,
  onExport,
}: {
  transactions: Transaction[];
  typeFilter: "all" | TransactionType;
  categoryFilter: string;
  setTypeFilter: (value: "all" | TransactionType) => void;
  setCategoryFilter: (value: string) => void;
  onAdd: () => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
  onExport: () => void;
}) {
  const filtered = transactions.filter(
    (item) =>
      (typeFilter === "all" || item.type === typeFilter) &&
      (categoryFilter === "all" || item.category === categoryFilter),
  );
  const totals = transactionTotals(filtered);
  const maxTotal = Math.max(totals.income, totals.expense, Math.abs(totals.net), 1);

  return (
    <section className="view-stack transactions-view">
      <section className="transactions-heading">
        <h2>Transaksi</h2>
        <p>{filtered.length} entri</p>
      </section>

      <div className="transactions-action-row">
        <span>Pilih</span>
        <button className="icon-text-button transaction-export-button" type="button" onClick={onExport}>
          <Download size={18} />
          Export CSV
        </button>
        <button className="primary-button transaction-add-button" type="button" onClick={onAdd}>
          <Plus size={18} />
          Tambah
        </button>
      </div>

      <section className="transaction-summary-card">
        <div className="transaction-summary-head">
          <div>
            <h3>Ringkasan Keuangan</h3>
            <p>{filtered.length} transaksi pada periode ini</p>
          </div>
          <button type="button">
            <CalendarDays size={18} />
            {monthLabel}
            <ChevronDown size={16} />
          </button>
        </div>
        <div className="transaction-summary-body">
          <TransactionSummaryItem
            icon={ArrowDownLeft}
            label="Masuk"
            value={currency(totals.income)}
            amount={totals.income}
            maxAmount={maxTotal}
            tone="income"
          />
          <TransactionSummaryItem
            icon={ArrowUpRight}
            label="Keluar"
            value={currency(totals.expense)}
            amount={totals.expense}
            maxAmount={maxTotal}
            tone="expense"
          />
          <TransactionSummaryItem
            icon={Scale}
            label="Neto"
            value={currency(totals.net, true)}
            amount={Math.abs(totals.net)}
            maxAmount={maxTotal}
            tone={totals.net < 0 ? "expense" : "income"}
          />
        </div>
      </section>

      <section className="panel transactions-list-panel">
        <div className="transactions-filter-row">
          <div className="segmented">
            <button className={typeFilter === "all" ? "active" : ""} type="button" onClick={() => setTypeFilter("all")}>
              Semua
            </button>
            <button
              className={typeFilter === "income" ? "active" : ""}
              type="button"
              onClick={() => setTypeFilter("income")}
            >
              Masuk
            </button>
            <button
              className={typeFilter === "expense" ? "active" : ""}
              type="button"
              onClick={() => setTypeFilter("expense")}
            >
              Keluar
            </button>
          </div>
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="all">Semua kategori</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <TransactionList transactions={filtered} onDelete={onDelete} onEdit={onEdit} />
      </section>
    </section>
  );
}

function TransactionSummaryItem({
  icon: Icon,
  label,
  value,
  amount,
  maxAmount,
  tone,
}: {
  icon: typeof Home;
  label: string;
  value: string;
  amount: number;
  maxAmount: number;
  tone: "income" | "expense";
}) {
  const percent = amount > 0 ? Math.max(6, Math.round((amount / maxAmount) * 100)) : 0;
  const trend = amount > 0 ? "100.0%" : "0.0%";

  return (
    <article className={`transaction-summary-item ${tone}`}>
      <div className="transaction-summary-icon">
        <Icon size={19} />
      </div>
      <div className="transaction-summary-copy">
        <strong>{label}</strong>
        <span>{value}</span>
        <small>{trend} vs Mei 2026</small>
      </div>
      <div className="transaction-summary-progress" aria-label={`${label} ${percent}%`}>
        <span style={{ width: `${percent}%` }} />
      </div>
    </article>
  );
}

function BudgetView({
  budgets,
  transactions,
  onUpdateBudget,
}: {
  budgets: Budget[];
  transactions: Transaction[];
  onUpdateBudget: (categoryId: string, amount: number) => void;
}) {
  const expenseTotals = categoryTotals(transactions, "expense");
  const budgetRows = categories
    .filter((item) => item.kind === "expense" && item.budget !== undefined)
    .map((category) => {
      const spent = expenseTotals.find((item) => item.id === category.id)?.amount ?? 0;
      const budget = budgets.find((item) => item.categoryId === category.id)?.amount ?? category.budget ?? 0;
      const used = budget ? Math.round((spent / budget) * 100) : 0;
      return { ...category, spent, used, remaining: budget - spent };
    });

  const totalBudget = budgetRows.reduce((sum, item) => sum + item.remaining + item.spent, 0);
  const totalSpent = budgetRows.reduce((sum, item) => sum + item.spent, 0);

  return (
    <section className="view-stack">
      <section className="panel budget-head">
        <Metric icon={Wallet} label="Total budget" value={currency(totalBudget)} />
        <Metric icon={ArrowUpRight} label="Terpakai" value={currency(totalSpent)} tone="expense" />
        <Metric icon={CircleDollarSign} label="Sisa" value={currency(totalBudget - totalSpent)} tone="income" />
      </section>
      <section className="panel list-panel">
        {budgetRows.map((item) => (
          <div className="budget-row" key={item.id}>
            <CategoryTitle categoryId={item.id} />
            <div className="budget-values">
              <strong>{currency(item.spent)}</strong>
              <label>
                Budget
                <input
                  inputMode="numeric"
                  value={rupiahInput(item.spent + item.remaining)}
                  onChange={currencyInputChange((value) => onUpdateBudget(item.id, moneyValue(value)))}
                />
              </label>
            </div>
            <ProgressBar percent={item.used} color={item.color} />
            <small className={item.used >= 100 ? "danger-text" : item.used >= 80 ? "warning-text" : "muted"}>
              {item.used >= 100 ? "Lewat budget" : item.used >= 80 ? "Waspada" : "Aman"} - {Math.min(item.used, 999)}%
            </small>
          </div>
        ))}
      </section>
    </section>
  );
}

function ReportsView({
  transactions,
  totals,
  flow,
  expenseBreakdown,
  incomeBreakdown,
}: {
  transactions: Transaction[];
  totals: { income: number; expense: number; net: number };
  flow: ReturnType<typeof dailyFlow>;
  expenseBreakdown: ReturnType<typeof categoryTotals>;
  incomeBreakdown: ReturnType<typeof categoryTotals>;
}) {
  const largestExpenses = transactions.filter((item) => item.type === "expense").sort((a, b) => b.amount - a.amount).slice(0, 5);
  const largestIncome = transactions.filter((item) => item.type === "income").sort((a, b) => b.amount - a.amount).slice(0, 3);

  return (
    <section className="view-stack">
      <div className="summary-grid flat">
        <Metric icon={ArrowDownLeft} label="Masuk" value={currency(totals.income)} tone="income" />
        <Metric icon={ArrowUpRight} label="Keluar" value={currency(totals.expense)} tone="expense" />
        <Metric icon={CircleDollarSign} label="Sisa" value={currency(totals.net)} />
      </div>
      <section className="panel chart-panel">
        <SectionHeader title="Arus harian" value={monthLabel} />
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={flow}>
            <CartesianGrid stroke="#edf1f5" vertical={false} />
            <XAxis dataKey="day" tickLine={false} axisLine={false} />
            <YAxis tickFormatter={compactCurrency} tickLine={false} axisLine={false} width={42} />
            <Tooltip formatter={(value) => currency(Number(value))} labelFormatter={(value) => `Tanggal ${value}`} />
            <Line type="monotone" dataKey="Masuk" stroke="#0f9f61" strokeWidth={3} dot={false} />
            <Line type="monotone" dataKey="Keluar" stroke="#e34650" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </section>
      <div className="content-grid">
        <section className="panel">
          <SectionHeader title="Kategori keluar" />
          <CategoryBreakdown items={expenseBreakdown} />
        </section>
        <section className="panel">
          <SectionHeader title="Kategori masuk" />
          <CategoryBreakdown items={incomeBreakdown} />
        </section>
      </div>
      <div className="content-grid">
        <section className="panel">
          <SectionHeader title="Terbesar keluar" />
          <TransactionList transactions={largestExpenses} compact />
        </section>
        <section className="panel">
          <SectionHeader title="Terbesar masuk" />
          <TransactionList transactions={largestIncome} compact />
        </section>
      </div>
    </section>
  );
}

function DebtsView({
  debts,
  onAdd,
  onDelete,
  onEdit,
  onPay,
}: {
  debts: Debt[];
  onAdd: () => void;
  onDelete: (id: string) => void;
  onEdit: (debt: Debt) => void;
  onPay: (id: string) => void;
}) {
  const debtRecords = debts.filter((item) => item.type === "debt");
  const todayDate = today();
  const sevenDaysFromNow = new Date(`${todayDate}T00:00:00`);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const dueLimit = sevenDaysFromNow.toISOString().slice(0, 10);
  const activeDebt = debtRecords.reduce((sum, item) => sum + item.remainingAmount, 0);
  const dueSoon = debtRecords.reduce((sum, debt) => {
    const installmentAmount = debt.installments
      .filter((installment) => !installment.paid && installment.dueDate >= todayDate && installment.dueDate <= dueLimit)
      .reduce((subtotal, installment) => subtotal + installment.amount, 0);
    const simpleDebtDue = debt.mode === "simple" && debt.dueDate && debt.dueDate >= todayDate && debt.dueDate <= dueLimit;
    return sum + installmentAmount + (simpleDebtDue ? debt.remainingAmount : 0);
  }, 0);

  return (
    <section className="view-stack debts-view">
      <div className="page-heading">
        <div>
          <h2>Hutang</h2>
          <p>Cicilan, denda & kewajiban bayar</p>
        </div>
        <button className="primary-button light-button" type="button" onClick={onAdd}>
          <Plus size={18} />
          Tambah hutang
        </button>
      </div>

      <section className="debt-summary-hero">
        <div className="debt-summary-main">
          <span className="debt-summary-icon">
            <Landmark size={24} />
          </span>
          <div>
            <small>Total hutang aktif</small>
            <strong>{currency(activeDebt)}</strong>
            <span>{debtRecords.filter((debt) => debt.remainingAmount > 0).length} akun aktif</span>
          </div>
        </div>
        <div className="debt-summary-grid">
          <div>
            <small>Terbayar</small>
            <strong>{currency(debtRecords.reduce((sum, debt) => sum + Math.max(0, debt.originalAmount - debt.remainingAmount), 0))}</strong>
          </div>
          <div>
            <small>7 hari</small>
            <strong>{currency(dueSoon)}</strong>
          </div>
        </div>
      </section>

      <section className="debt-list">
        {debtRecords.length ? (
          debtRecords.map((debt) => (
            <DebtCard
              key={debt.id}
              debt={debt}
              onDelete={() => onDelete(debt.id)}
              onEdit={() => onEdit(debt)}
              onPay={() => onPay(debt.id)}
            />
          ))
        ) : (
          <div className="empty-state">Belum ada hutang aktif.</div>
        )}
      </section>
    </section>
  );
}

function DebtCard({
  debt,
  onDelete,
  onEdit,
  onPay,
}: {
  debt: Debt;
  onDelete: () => void;
  onEdit: () => void;
  onPay: () => void;
}) {
  const paid = debt.originalAmount - debt.remainingAmount;
  const progress = Math.round((paid / debt.originalAmount) * 100);
  const next = debt.installments.find((item) => !item.paid);
  const dueLabel = next
    ? dateMonthDay(next.dueDate)
    : debt.dueDate
      ? dateMonthDay(debt.dueDate)
      : debt.remainingAmount > 0
        ? "-"
        : "Lunas";

  return (
    <article className="debt-card">
      <div className="debt-top">
        <div>
          <span className="category-icon debt-card-icon">
            <Landmark size={18} />
          </span>
        </div>
        <div className="debt-card-title">
          <h2>{debt.name}</h2>
          <span className="status-pill debt-pill">Hutang</span>
        </div>
        <div className="debt-card-balance">
          <strong>{currency(debt.remainingAmount)}</strong>
          <span>sisa</span>
        </div>
      </div>
      <p className="debt-next-due">Jatuh tempo berikutnya {next ? `#${next.id} · ${dateMonthDay(next.dueDate)}` : dueLabel}</p>
      <p className="debt-card-copy">
        Total hutang {currency(debt.originalAmount)}
        {debt.monthlyAmount ? ` - ${currency(debt.monthlyAmount)} per bulan` : ""}{" "}
        {debt.installments.length ? `- ${debt.installments.length} cicilan` : ""}
      </p>
      {(debt.finePaid ?? 0) > 0 && <p className="debt-fine">Denda terbayar {currency(debt.finePaid ?? 0)}</p>}
      <div className="debt-progress-head">
        <span>Progress pelunasan</span>
        <strong>{progress}%</strong>
      </div>
      <ProgressBar percent={progress} color="#0f9f61" />
      <div className="debt-actions">
        <button className="primary-button" type="button" onClick={onPay} disabled={debt.remainingAmount <= 0}>
          Bayar
        </button>
        <button className="icon-text-button" type="button" onClick={onEdit}>
          <Pencil size={17} />
          Edit
        </button>
        <button className="icon-button debt-toggle" type="button" aria-label="Tutup daftar cicilan">
          <ChevronUp size={17} />
        </button>
      </div>
      <button className="debt-delete-button" type="button" onClick={onDelete}>
        <Trash2 size={15} />
        Hapus catatan
      </button>
      <div className="installment-list">
        {debt.installments.slice(0, 6).map((item) => (
          <div className="installment-row" key={item.id}>
            <span>#{item.id}</span>
            <strong>{dateShort(item.dueDate)}</strong>
            <span>{currency(item.amount + (item.finePaid ?? 0))}</span>
            <small className={item.paid ? "paid" : "pending"}>{item.paid ? "Lunas" : "Belum"}</small>
          </div>
        ))}
      </div>
    </article>
  );
}

function MoreView({
  user,
  onNavigate,
  onLogout,
  onResetData,
}: {
  user: AppUser;
  onNavigate: (view: AppView) => void;
  onLogout: () => void;
  onResetData: () => void;
}) {
  const actions = [
    { label: "Hutang", icon: Landmark, view: "debts" as AppView },
    { label: "Kategori", icon: LayoutGrid, view: "more" as AppView },
    { label: "Workspace", icon: Settings, view: "more" as AppView },
    { label: "Export data", icon: FileText, view: "transactions" as AppView },
  ];

  return (
    <section className="view-stack">
      <section className="panel account-panel">
        <div className="avatar-large">{user.name.slice(0, 1)}</div>
        <div>
          <h2>{user.name}</h2>
          <p className="muted">{user.email}</p>
        </div>
      </section>
      <section className="panel more-grid">
        {actions.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.label} type="button" onClick={() => onNavigate(item.view)}>
              <Icon size={22} />
              <span>{item.label}</span>
            </button>
          );
        })}
        <button type="button" onClick={onLogout}>
          <LogOut size={22} />
          <span>Logout</span>
        </button>
        <button type="button" onClick={onResetData}>
          <Trash2 size={22} />
          <span>Kosongkan data</span>
        </button>
      </section>
    </section>
  );
}

function TransactionForm({
  form,
  setForm,
  debts,
  errors,
  onClearErrors,
  onClose,
  onSubmit,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  debts: Debt[];
  errors: string[];
  onClearErrors: () => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  const isCashTransaction = form.mode === "expense" || form.mode === "income";
  const isDebtCreation =
    form.mode === "debt" ||
    form.mode === "debt_installment";
  const isInstallmentCreation = form.mode === "debt_installment";
  const isPayment = form.mode === "payment";
  const availableCategories = categories.filter((item) => item.kind === form.type || item.kind === "both");
  const activeDebts = debts.filter((debt) => debt.type === "debt" && debt.remainingAmount > 0);
  const selectedDebt = activeDebts.find((debt) => debt.id === form.debtId) ?? activeDebts[0];
  const updateForm: React.Dispatch<React.SetStateAction<FormState>> = (value) => {
    onClearErrors();
    setForm(value);
  };

  const selectMode = (mode: FormMode) => {
    const next = emptyForm();
    if (mode === "income") {
      updateForm({ ...next, mode, type: "income", category: "income" });
      return;
    }
    if (mode === "payment") {
      updateForm({ ...next, mode, debtId: activeDebts[0]?.id ?? "", amount: String(activeDebts[0]?.monthlyAmount || "") });
      return;
    }
    updateForm({ ...next, mode });
  };

  const modeOptions: { id: FormMode; label: string; icon: typeof ReceiptText }[] = [
    { id: "expense", label: "Keluar", icon: ArrowUpRight },
    { id: "income", label: "Masuk", icon: ArrowDownLeft },
    { id: "debt", label: "Hutang", icon: Landmark },
    { id: "debt_installment", label: "Cicilan Hutang", icon: CalendarDays },
    { id: "payment", label: "Bayar", icon: Check },
  ];

  return (
    <div className="modal-backdrop">
      <form className="transaction-modal" noValidate onSubmit={onSubmit}>
        <div className="modal-head">
          <h2>Catat transaksi</h2>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Tutup">
            <ChevronDown size={20} />
          </button>
        </div>

        <div className="mode-grid">
          {modeOptions.map((mode) => {
            const Icon = mode.icon;
            return (
              <button
                className={form.mode === mode.id ? "active" : ""}
                key={mode.id}
                type="button"
                onClick={() => selectMode(mode.id)}
              >
                <Icon size={18} />
                <span>{mode.label}</span>
              </button>
            );
          })}
        </div>

        {errors.length > 0 && (
          <div className="form-errors" role="alert" aria-live="polite">
            {errors.map((error) => (
              <p key={error}>{error}</p>
            ))}
          </div>
        )}

        {isCashTransaction && (
          <>
            <label>
              Judul
              <input
                required
                value={form.title}
                onChange={(event) => updateForm((current) => ({ ...current, title: event.target.value }))}
              />
            </label>
            <label>
              Nominal
              <input
                inputMode="numeric"
                required
                value={rupiahInput(form.amount)}
                onChange={currencyInputChange((value) => updateForm((current) => ({ ...current, amount: value })))}
              />
            </label>
            <div className="form-grid">
              <FormDateField form={form} setForm={updateForm} label="Tanggal" />
              <AccountField form={form} setForm={updateForm} />
            </div>
            <label>
              Kategori
              <select
                required
                value={form.category}
                onChange={(event) => updateForm((current) => ({ ...current, category: event.target.value }))}
              >
                {availableCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}

        {isDebtCreation && (
          <>
            <label>
              Nama
              <input
                required
                value={form.title}
                onChange={(event) => updateForm((current) => ({ ...current, title: event.target.value }))}
              />
            </label>
            <label>
              Total
              <input
                inputMode="numeric"
                required
                value={rupiahInput(form.amount)}
                onChange={currencyInputChange((value) => updateForm((current) => ({ ...current, amount: value })))}
              />
            </label>
            <div className="form-grid">
              <FormDateField form={form} setForm={updateForm} label="Tanggal mulai" />
              {isInstallmentCreation ? (
                <label>
                  Jatuh tempo
                  <input
                    inputMode="numeric"
                    max={31}
                    min={1}
                    required
                    type="number"
                    value={form.dueDay}
                    onChange={(event) => updateForm((current) => ({ ...current, dueDay: event.target.value }))}
                  />
                </label>
              ) : (
                <label>
                  Jatuh tempo
                  <input
                    required
                    type="date"
                    value={form.dueDate}
                    onChange={(event) => updateForm((current) => ({ ...current, dueDate: event.target.value }))}
                  />
                </label>
              )}
            </div>
            {isInstallmentCreation && (
              <div className="form-grid">
                <label>
                  Cicilan
                  <input
                    inputMode="numeric"
                    required
                    value={rupiahInput(form.monthlyAmount)}
                    onChange={currencyInputChange((value) => updateForm((current) => ({ ...current, monthlyAmount: value })))}
                  />
                </label>
                <label>
                  Jumlah cicilan
                  <input
                    inputMode="numeric"
                    min={1}
                    required
                    type="number"
                    value={form.installmentCount}
                    onChange={(event) => updateForm((current) => ({ ...current, installmentCount: event.target.value }))}
                  />
                </label>
              </div>
            )}
            <label>
              Denda awal
              <input
                inputMode="numeric"
                value={rupiahInput(form.fineAmount)}
                onChange={currencyInputChange((value) => updateForm((current) => ({ ...current, fineAmount: value })))}
              />
            </label>
          </>
        )}

        {isPayment && (
          <>
            {activeDebts.length ? (
              <>
                <label>
                  Hutang
                  <select
                    required
                    value={form.debtId || selectedDebt?.id || ""}
                    onChange={(event) => {
                      const debt = activeDebts.find((item) => item.id === event.target.value);
                      updateForm((current) => ({
                        ...current,
                        debtId: event.target.value,
                        amount: String(debt?.monthlyAmount || ""),
                      }));
                    }}
                  >
                    {activeDebts.map((debt) => (
                      <option key={debt.id} value={debt.id}>
                        {debt.name} - {currency(debt.remainingAmount)}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="form-grid">
                  <label>
                    Nominal bayar
                    <input
                      inputMode="numeric"
                      required
                      value={rupiahInput(form.amount)}
                      onChange={currencyInputChange((value) => updateForm((current) => ({ ...current, amount: value })))}
                    />
                  </label>
                  <label>
                    Denda
                    <input
                      inputMode="numeric"
                      value={rupiahInput(form.fineAmount)}
                      onChange={currencyInputChange((value) => updateForm((current) => ({ ...current, fineAmount: value })))}
                    />
                  </label>
                </div>
                <div className="form-grid">
                  <FormDateField form={form} setForm={updateForm} label="Tanggal bayar" />
                  <AccountField form={form} setForm={updateForm} />
                </div>
                <label className="checkbox-field">
                  <input
                    checked={form.autoTransaction}
                    type="checkbox"
                    onChange={(event) => updateForm((current) => ({ ...current, autoTransaction: event.target.checked }))}
                  />
                  <span>Buat transaksi otomatis</span>
                </label>
              </>
            ) : (
              <div className="empty-state">Belum ada hutang aktif.</div>
            )}
          </>
        )}

        <label>
          Catatan
          <textarea value={form.note} onChange={(event) => updateForm((current) => ({ ...current, note: event.target.value }))} />
        </label>
        <button className="primary-button large-button" type="submit">
          <Check size={18} />
          Simpan
        </button>
      </form>
    </div>
  );
}

function FormDateField({
  form,
  setForm,
  label,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  label: string;
}) {
  return (
    <label>
      {label}
      <input
        required
        type="date"
        value={form.date}
        onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
      />
    </label>
  );
}

function AccountField({
  form,
  setForm,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  return (
    <label>
      Akun
      <select required value={form.account} onChange={(event) => setForm((current) => ({ ...current, account: event.target.value }))}>
        {["cash", "bank", "dana", "gopay", "ovo"].map((account) => (
          <option key={account} value={account}>
            {account}
          </option>
        ))}
      </select>
    </label>
  );
}

function SectionHeader({
  title,
  value,
  action,
  onAction,
}: {
  title: string;
  value?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="section-header">
      <div>
        <h2>{title}</h2>
        {value && <p>{value}</p>}
      </div>
      {action && (
        <button type="button" onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  );
}

function TransactionList({
  transactions,
  compact,
  variant,
  onEdit,
  onDelete,
}: {
  transactions: Transaction[];
  compact?: boolean;
  variant?: "home";
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (id: string) => void;
}) {
  if (!transactions.length) {
    return <div className="empty-state">Belum ada transaksi.</div>;
  }

  return (
    <div className={`transaction-list ${compact ? "compact" : ""} ${variant ? `transaction-list-${variant}` : ""}`}>
      {transactions.map((transaction) => (
        <article className="transaction-row" key={transaction.id}>
          <CategoryIcon categoryId={transaction.category} />
          <div className="transaction-copy">
            <strong>{transaction.title}</strong>
            <span>
              {transaction.id} - {getCategory(transaction.category).name} - {dateShort(transaction.date)}
            </span>
          </div>
          <strong className={transaction.type === "income" ? "amount-income" : "amount-expense"}>
            {transaction.type === "income" ? "+" : "-"}
            {currency(transaction.amount)}
          </strong>
          {onEdit && (
            <button className="icon-button" type="button" onClick={() => onEdit(transaction)} aria-label="Edit">
              <Pencil size={17} />
            </button>
          )}
          {onDelete && (
            <button className="icon-button" type="button" onClick={() => onDelete(transaction.id)} aria-label="Hapus">
              <Trash2 size={17} />
            </button>
          )}
        </article>
      ))}
    </div>
  );
}

function CategoryBreakdown({ items, variant }: { items: ReturnType<typeof categoryTotals>; variant?: "home" }) {
  if (!items.length) return <div className="empty-state">Belum ada data kategori.</div>;

  return (
    <div className={`breakdown-list ${variant ? `breakdown-list-${variant}` : ""}`}>
      {items.map((item) => (
        <div className="breakdown-row" key={item.id}>
          <div className="breakdown-head">
            <CategoryTitle categoryId={item.id} />
            <strong>{currency(item.amount)}</strong>
          </div>
          <ProgressBar percent={item.percent} color={item.color} />
          <small>{item.percent}%</small>
        </div>
      ))}
    </div>
  );
}

function CategoryTitle({ categoryId }: { categoryId: string }) {
  const category = getCategory(categoryId);
  return (
    <div className="category-title">
      <CategoryIcon categoryId={categoryId} />
      <span>{category.name}</span>
    </div>
  );
}

function CategoryIcon({ categoryId }: { categoryId: string }) {
  const category = getCategory(categoryId);
  const Icon = category.icon;
  return (
    <span className="category-icon" style={{ color: category.color, background: category.softColor }}>
      <Icon size={18} />
    </span>
  );
}

function ProgressBar({ percent, color }: { percent: number; color: string }) {
  return (
    <div className="progress-bar">
      <span style={{ width: `${Math.min(percent, 100)}%`, background: color }} />
    </div>
  );
}

export default App;
