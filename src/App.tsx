import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BadgePlus,
  BarChart3,
  Bot,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  Download,
  FileText,
  Home,
  Landmark,
  LayoutGrid,
  LogOut,
  Menu,
  MessageCircle,
  MoreHorizontal,
  PieChart,
  Plus,
  ReceiptText,
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
  parseTelegramCommand,
  transactionTotals,
  workspaceName,
} from "./data";
import { hasFirebaseConfig, logout, signInWithGoogle } from "./lib/firebase";
import type { AppState, AppUser, AppView, Debt, Transaction, TransactionType } from "./types";

type FormState = {
  title: string;
  amount: string;
  type: TransactionType;
  category: string;
  account: string;
  date: string;
  note: string;
};

const today = () => new Date().toISOString().slice(0, 10);
const stateStorageKey = "money-tracker-state-v1";
const userStorageKey = "money-tracker-user-v1";

const loadInitialState = (): AppState => {
  try {
    const stored = window.localStorage.getItem(stateStorageKey);
    if (!stored) return initialState;
    const parsed = JSON.parse(stored) as AppState;
    if (!Array.isArray(parsed.transactions) || !Array.isArray(parsed.debts)) return initialState;
    return parsed;
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
  title: "",
  amount: "",
  type: "expense",
  category: "food",
  account: "dana",
  date: today(),
  note: "",
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
  telegram: "Telegram",
};

function App() {
  const [user, setUser] = useState<AppUser | null>(loadInitialUser);
  const [view, setView] = useState<AppView>("home");
  const [state, setState] = useState<AppState>(loadInitialState);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [telegramText, setTelegramText] = useState("jajan 10rb");
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

  const openForm = (type: TransactionType = "expense") => {
    setForm({ ...emptyForm(), type, category: type === "income" ? "income" : "food" });
    setShowForm(true);
  };

  const addTransaction = (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(form.amount.replace(/[^\d]/g, ""));
    if (!form.title.trim() || amount <= 0) return;
    const transaction: Transaction = {
      id: makeTransactionId(state.transactions),
      date: form.date,
      title: form.title.trim(),
      type: form.type,
      amount,
      category: form.category,
      account: form.account,
      note: form.note.trim() || undefined,
      source: "web",
    };
    setState((current) => ({ ...current, transactions: [transaction, ...current.transactions] }));
    setShowForm(false);
  };

  const deleteTransaction = (id: string) => {
    setState((current) => ({ ...current, transactions: current.transactions.filter((item) => item.id !== id) }));
  };

  const addTelegramTransaction = () => {
    const parsed = parseTelegramCommand(telegramText, state.transactions);
    if (!parsed) return;
    setState((current) => ({ ...current, transactions: [parsed, ...current.transactions] }));
    setTelegramText("");
  };

  const payNextInstallment = (debtId: string) => {
    setState((current) => {
      let createdTransaction: Transaction | null = null;
      const debts = current.debts.map((debt) => {
        if (debt.id !== debtId) return debt;
        const nextInstallment = debt.installments.find((item) => !item.paid);
        if (!nextInstallment) return debt;

        const paymentAmount = Math.min(nextInstallment.amount, debt.remainingAmount);
        createdTransaction = {
          id: makeTransactionId(current.transactions),
          date: today(),
          title: `Bayar ${debt.name}`,
          type: debt.type === "debt" ? "expense" : "income",
          amount: paymentAmount,
          category: debt.type === "debt" ? "debt-payment" : "receivable",
          account: "bank",
          source: "web",
          note: `Pembayaran cicilan ${debt.name}`,
        };

        const remainingAmount = Math.max(0, debt.remainingAmount - paymentAmount);
        return {
          ...debt,
          remainingAmount,
          installments: debt.installments.map((item) =>
            item.id === nextInstallment.id ? { ...item, paid: true } : item,
          ),
        };
      });

      return {
        debts,
        transactions: createdTransaction ? [createdTransaction, ...current.transactions] : current.transactions,
      };
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
            onAdd={openForm}
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
            onDelete={deleteTransaction}
            onExport={exportCsv}
          />
        )}
        {view === "budget" && <BudgetView transactions={state.transactions} />}
        {view === "reports" && (
          <ReportsView
            transactions={state.transactions}
            totals={totals}
            flow={flow}
            expenseBreakdown={expenseBreakdown}
            incomeBreakdown={incomeBreakdown}
          />
        )}
        {view === "debts" && <DebtsView debts={state.debts} onPay={payNextInstallment} />}
        {view === "telegram" && (
          <TelegramView
            telegramText={telegramText}
            setTelegramText={setTelegramText}
            parsed={parseTelegramCommand(telegramText, state.transactions)}
            onAdd={addTelegramTransaction}
          />
        )}
        {view === "more" && <MoreView user={user} onNavigate={setView} onLogout={startLogout} />}
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
          onClose={() => setShowForm(false)}
          onSubmit={addTransaction}
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
            Demo data sudah siap untuk transaksi, budget, laporan, hutang, dan preview input Telegram.
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
    <button className={`nav-button ${active ? "active" : ""}`} type="button" onClick={onClick}>
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
  onAdd,
}: {
  transactions: Transaction[];
  totals: { income: number; expense: number; net: number };
  expenseBreakdown: ReturnType<typeof categoryTotals>;
  onNavigate: (view: AppView) => void;
  onAdd: (type: TransactionType) => void;
}) {
  const totalFlow = totals.income + totals.expense;
  const incomePercent = totalFlow ? Math.round((totals.income / totalFlow) * 100) : 0;
  const recent = transactions.slice(0, 7);

  return (
    <section className="view-stack">
      <section className={`summary-hero ${totals.net < 0 ? "danger" : ""}`}>
        <div className="summary-main">
          <span className="status-pill">{totals.net >= 0 ? "SURPLUS" : "DEFISIT"}</span>
          <h2>{currency(totals.net)}</h2>
          <p>{totals.net >= 0 ? "Surplus bulan ini" : "Defisit bulan ini"}</p>
        </div>
        <div className="summary-meter" aria-label="Rasio masuk keluar">
          <span style={{ width: `${incomePercent}%` }} />
        </div>
        <div className="summary-grid">
          <Metric icon={ArrowDownLeft} label="Masuk" value={currency(totals.income)} tone="income" />
          <Metric icon={ArrowUpRight} label="Keluar" value={currency(totals.expense)} tone="expense" />
          <Metric icon={ReceiptText} label="Transaksi" value={`${transactions.length}`} />
        </div>
      </section>

      <div className="shortcut-row">
        <button type="button" onClick={() => onAdd("expense")}>
          <BadgePlus size={20} />
          <span>Catat</span>
        </button>
        <button type="button" onClick={() => onNavigate("budget")}>
          <Wallet size={20} />
          <span>Budget</span>
        </button>
        <button type="button" onClick={() => onNavigate("reports")}>
          <PieChart size={20} />
          <span>Laporan</span>
        </button>
      </div>

      <button className="telegram-banner" type="button" onClick={() => onNavigate("telegram")}>
        <MessageCircle size={24} />
        <span>Catat lewat Telegram</span>
        <ChevronDown size={18} />
      </button>

      <div className="content-grid">
        <section className="panel">
          <SectionHeader title="Transaksi terbaru" action="Lihat semua" onAction={() => onNavigate("transactions")} />
          <TransactionList transactions={recent} compact />
        </section>
        <section className="panel">
          <SectionHeader title="Pengeluaran per kategori" value={currency(totals.expense)} />
          <CategoryBreakdown items={expenseBreakdown.slice(0, 6)} />
        </section>
      </div>
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
  onDelete,
  onExport,
}: {
  transactions: Transaction[];
  typeFilter: "all" | TransactionType;
  categoryFilter: string;
  setTypeFilter: (value: "all" | TransactionType) => void;
  setCategoryFilter: (value: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onExport: () => void;
}) {
  const filtered = transactions.filter(
    (item) =>
      (typeFilter === "all" || item.type === typeFilter) &&
      (categoryFilter === "all" || item.category === categoryFilter),
  );
  const totals = transactionTotals(filtered);

  return (
    <section className="view-stack">
      <div className="toolbar">
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
        <button className="icon-text-button" type="button" onClick={onExport}>
          <Download size={18} />
          CSV
        </button>
        <button className="primary-button" type="button" onClick={onAdd}>
          <Plus size={18} />
          Tambah
        </button>
      </div>

      <div className="summary-grid flat">
        <Metric icon={ReceiptText} label="Entri" value={`${filtered.length}`} />
        <Metric icon={ArrowDownLeft} label="Masuk" value={currency(totals.income)} tone="income" />
        <Metric icon={ArrowUpRight} label="Keluar" value={currency(totals.expense)} tone="expense" />
        <Metric icon={CircleDollarSign} label="Netto" value={currency(totals.net)} />
      </div>

      <section className="panel">
        <TransactionList transactions={filtered} onDelete={onDelete} />
      </section>
    </section>
  );
}

function BudgetView({ transactions }: { transactions: Transaction[] }) {
  const expenseTotals = categoryTotals(transactions, "expense");
  const budgetRows = categories
    .filter((item) => item.kind === "expense" && item.budget !== undefined)
    .map((category) => {
      const spent = expenseTotals.find((item) => item.id === category.id)?.amount ?? 0;
      const budget = category.budget ?? 0;
      const used = budget ? Math.round((spent / budget) * 100) : 0;
      return { ...category, spent, used, remaining: budget - spent };
    });

  const totalBudget = budgetRows.reduce((sum, item) => sum + (item.budget ?? 0), 0);
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
              <span>{currency(item.budget ?? 0)}</span>
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

function DebtsView({ debts, onPay }: { debts: Debt[]; onPay: (id: string) => void }) {
  const activeDebt = debts.filter((item) => item.type === "debt").reduce((sum, item) => sum + item.remainingAmount, 0);
  const activeReceivable = debts.filter((item) => item.type === "receivable").reduce((sum, item) => sum + item.remainingAmount, 0);
  const dueSoon = debts.flatMap((item) => item.installments.filter((installment) => !installment.paid)).length;

  return (
    <section className="view-stack">
      <div className="summary-grid flat">
        <Metric icon={Landmark} label="Hutang aktif" value={currency(activeDebt)} tone="expense" />
        <Metric icon={ArrowDownLeft} label="Piutang aktif" value={currency(activeReceivable)} tone="income" />
        <Metric icon={CalendarDays} label="Cicilan terbuka" value={`${dueSoon}`} />
      </div>
      <section className="debt-list">
        {debts.map((debt) => (
          <DebtCard key={debt.id} debt={debt} onPay={() => onPay(debt.id)} />
        ))}
      </section>
    </section>
  );
}

function DebtCard({ debt, onPay }: { debt: Debt; onPay: () => void }) {
  const paid = debt.originalAmount - debt.remainingAmount;
  const progress = Math.round((paid / debt.originalAmount) * 100);
  const next = debt.installments.find((item) => !item.paid);

  return (
    <article className="debt-card">
      <div className="debt-top">
        <div>
          <span className={`status-pill ${debt.type === "receivable" ? "income-pill" : ""}`}>
            {debt.type === "debt" ? "Hutang" : "Piutang"}
          </span>
          <h2>{debt.name}</h2>
        </div>
        <button className="primary-button" type="button" onClick={onPay} disabled={!next}>
          <Check size={18} />
          Bayar
        </button>
      </div>
      <div className="debt-stats">
        <Metric icon={CircleDollarSign} label="Total awal" value={currency(debt.originalAmount)} />
        <Metric icon={ArrowUpRight} label="Sisa" value={currency(debt.remainingAmount)} tone="expense" />
        <Metric icon={CalendarDays} label="Jatuh tempo" value={next ? dateMonthDay(next.dueDate) : "Lunas"} />
      </div>
      <ProgressBar percent={progress} color="#0f9f61" />
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

function TelegramView({
  telegramText,
  setTelegramText,
  parsed,
  onAdd,
}: {
  telegramText: string;
  setTelegramText: (value: string) => void;
  parsed: Transaction | null;
  onAdd: () => void;
}) {
  return (
    <section className="view-stack">
      <section className="panel telegram-panel">
        <div className="telegram-orb">
          <Bot size={32} />
        </div>
        <div>
          <p className="eyebrow">Preview parser</p>
          <h2>Input cepat Telegram</h2>
        </div>
        <div className="chat-box">
          <textarea value={telegramText} onChange={(event) => setTelegramText(event.target.value)} />
          <button className="primary-button" type="button" onClick={onAdd} disabled={!parsed}>
            <Plus size={18} />
            Catat
          </button>
        </div>
        <div className="bot-reply">
          {parsed ? (
            <>
              <strong>Tercatat:</strong>
              <span>{parsed.type === "income" ? "Masuk" : "Keluar"} - {parsed.title}</span>
              <span>{currency(parsed.amount)}</span>
              <small>Kategori: {getCategory(parsed.category).name}</small>
            </>
          ) : (
            <span>Nominal belum terbaca.</span>
          )}
        </div>
      </section>
      <section className="panel guide-list">
        {["jajan 10rb", "keluar bensin 42rb transport", "masuk transfer project 5jt", "domain wafin.id 248.049 tagihan"].map(
          (example) => (
            <button key={example} type="button" onClick={() => setTelegramText(example)}>
              <MessageCircle size={18} />
              {example}
            </button>
          ),
        )}
      </section>
    </section>
  );
}

function MoreView({
  user,
  onNavigate,
  onLogout,
}: {
  user: AppUser;
  onNavigate: (view: AppView) => void;
  onLogout: () => void;
}) {
  const actions = [
    { label: "Hutang/Piutang", icon: Landmark, view: "debts" as AppView },
    { label: "Telegram", icon: Bot, view: "telegram" as AppView },
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
      </section>
    </section>
  );
}

function TransactionForm({
  form,
  setForm,
  onClose,
  onSubmit,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  const availableCategories = categories.filter((item) => item.kind === form.type || item.kind === "both");

  return (
    <div className="modal-backdrop">
      <form className="transaction-modal" onSubmit={onSubmit}>
        <div className="modal-head">
          <h2>Catat transaksi</h2>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Tutup">
            <ChevronDown size={20} />
          </button>
        </div>
        <div className="segmented full">
          <button
            className={form.type === "expense" ? "active" : ""}
            type="button"
            onClick={() => setForm((current) => ({ ...current, type: "expense", category: "food" }))}
          >
            Keluar
          </button>
          <button
            className={form.type === "income" ? "active" : ""}
            type="button"
            onClick={() => setForm((current) => ({ ...current, type: "income", category: "income" }))}
          >
            Masuk
          </button>
        </div>
        <label>
          Judul
          <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
        </label>
        <label>
          Nominal
          <input
            inputMode="numeric"
            value={form.amount}
            onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
          />
        </label>
        <div className="form-grid">
          <label>
            Tanggal
            <input
              type="date"
              value={form.date}
              onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
            />
          </label>
          <label>
            Akun
            <select value={form.account} onChange={(event) => setForm((current) => ({ ...current, account: event.target.value }))}>
              {["cash", "bank", "dana", "gopay", "ovo", "telegram"].map((account) => (
                <option key={account} value={account}>
                  {account}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Kategori
          <select
            value={form.category}
            onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
          >
            {availableCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Catatan
          <textarea value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} />
        </label>
        <button className="primary-button large-button" type="submit">
          <Check size={18} />
          Simpan
        </button>
      </form>
    </div>
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
  onDelete,
}: {
  transactions: Transaction[];
  compact?: boolean;
  onDelete?: (id: string) => void;
}) {
  if (!transactions.length) {
    return <div className="empty-state">Belum ada transaksi.</div>;
  }

  return (
    <div className={`transaction-list ${compact ? "compact" : ""}`}>
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

function CategoryBreakdown({ items }: { items: ReturnType<typeof categoryTotals> }) {
  if (!items.length) return <div className="empty-state">Belum ada data kategori.</div>;

  return (
    <div className="breakdown-list">
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
