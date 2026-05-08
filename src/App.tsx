import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  LayoutDashboard,
  ArrowRightLeft,
  Tags,
  Briefcase,
  Settings,
  DatabaseZap,
  BarChart3,
  Building2,
  MoonStar,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

type Business = "Marcenaria" | "Construção" | "Geral";
type EntryType = "Entrada" | "Saída";
type SyncMode = "automatic" | "manual";

type Category = {
  id: string;
  name: string;
  type: EntryType | "Ambos";
  scope: Business | "Geral";
  active: boolean;
};

type ClientProject = {
  id: string;
  name: string;
  type: "Cliente" | "Projeto" | "Ambos";
  notes: string;
  active: boolean;
};

type Transaction = {
  id: number;
  date: string;
  month: string;
  business: Business;
  bankAccount: string;
  holder: string;
  type: EntryType;
  category: string;
  clientProject: string;
  description: string;
  value: number;
  notes: string;
  origin: string;
};

const businesses: Business[] = ["Marcenaria", "Construção", "Geral"];
const bankAccounts = [
  "Sicoob PJ Construtora",
  "Sicoob PJ Marcenaria",
  "Sicoob PF Marcelo",
  "Santander PF Marcelo",
  "Santander PF Marcelinho",
  "Santander PF Raquel",
  "Nubank PF Marcelo",
  "Nubank PF Raquel",
  "Nubank PJ Marcenaria",
  "Nubank PJ Construtora",
  "Caixa PJ Marcenaria",
  "Caixa PF Raquel",
];

const holders = ["Marcelo", "Marcelinho", "Raquel", "Empresa"];

const initialCategories: Category[] = [];
const initialClients: ClientProject[] = [];
const initialTransactions: Transaction[] = [];
const DEFAULT_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbyM7ivSuztGFBBNE4bwH6dvlP4alyBfB3F0loLCPC6TJtLPmPIoIBePPKSLYdEROPJL/exec"
;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function toMonthYear(date: string) {
  if (!date) return "";
  const [year, month] = date.split("-");
  return `${month}/${year}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

function formatDateBR(date: string) {
  if (!date) return "";
  if (date.includes("-")) {
    const [y, m, d] = date.split("-");
    return `${d}/${m}/${y}`;
  }
  return date;
}

function parseCurrencyInput(input: string) {
  const cleaned = input.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const value = Number(cleaned);
  return Number.isNaN(value) ? 0 : value;
}
export default function App() {
  const [page, setPage] = useState("dashboard");
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [clients, setClients] = useState<ClientProject[]>(initialClients);
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);

const [, setIsMobile] = useState(window.innerWidth <= 900);
  const [message, setMessage] = useState("");
  const [syncing, setSyncing] = useState(false);

  const [transactionFilter, setTransactionFilter] = useState("Todas");
  const [dashboardFilter, setDashboardFilter] = useState("Todas");

  const [openTransactionModal, setOpenTransactionModal] = useState(false);
  const [openClientModal, setOpenClientModal] = useState(false);
  const [openCategoryModal, setOpenCategoryModal] = useState(false);

  const [googleSheetsConfig, setGoogleSheetsConfig] = useState({
  webhookUrl: DEFAULT_WEBHOOK_URL,
  syncMode: "automatic" as SyncMode,
  lastSync: "",
});

  const [transactionForm, setTransactionForm] = useState({
    date: todayISO(),
    business: "Marcenaria" as Business,
    bankAccount: "",
    holder: "",
    type: "Entrada" as EntryType,
    value: "",
    category: "",
    clientProject: "",
    description: "",
    notes: "",
  });

  const [clientForm, setClientForm] = useState({
    name: "",
    type: "Cliente" as "Cliente" | "Projeto" | "Ambos",
    notes: "",
  });

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    type: "Ambos" as EntryType | "Ambos",
    scope: "Geral" as Business | "Geral",
  });

  // RESPONSIVIDADE
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);


  // CARREGAR DADOS DA PLANILHA AUTOMATICAMENTE AO ABRIR O APP
useEffect(() => {
  if (!googleSheetsConfig.webhookUrl) return;

 loadDataFromGoogleSheets(true);
}, [googleSheetsConfig.webhookUrl]);

  // SALVAR LOCAL STORAGE
  useEffect(() => {
    localStorage.setItem(
      "fluxo-inteligente-prado-data",
      JSON.stringify({
        categories,
        clients,
        transactions,
      })
    );
  }, [categories, clients, transactions]);

// CONFIG GOOGLE SHEETS
useEffect(() => {
  const savedConfig = localStorage.getItem("fluxo-inteligente-prado-config");

  if (savedConfig) {
    try {
      const parsed = JSON.parse(savedConfig);
      setGoogleSheetsConfig((prev) => ({
        ...prev,
        ...parsed,
        webhookUrl: parsed.webhookUrl || DEFAULT_WEBHOOK_URL,
      }));
    } catch {
      setGoogleSheetsConfig((prev) => ({
        ...prev,
        webhookUrl: DEFAULT_WEBHOOK_URL,
      }));
    }
  } else {
    setGoogleSheetsConfig((prev) => ({
      ...prev,
      webhookUrl: DEFAULT_WEBHOOK_URL,
    }));
  }
}, []);

// CARREGAR DADOS DA PLANILHA AO ABRIR
useEffect(() => {
  const timer = setTimeout(() => {
    if (googleSheetsConfig.webhookUrl) {
      loadDataFromGoogleSheets(true);
    }
  }, 500);

  return () => clearTimeout(timer);
}, [googleSheetsConfig.webhookUrl]);

  useEffect(() => {
    localStorage.setItem(
      "fluxo-inteligente-prado-config",
      JSON.stringify(googleSheetsConfig)
    );
  }, [googleSheetsConfig]);

  const summary = useMemo(() => {
    const calculate = (scope: string) => {
      const base =
        scope === "Todas"
          ? transactions
          : transactions.filter((t) => t.business === scope);

      const entradas = base
        .filter((t) => t.value > 0)
        .reduce((acc, t) => acc + t.value, 0);

      const saidas = Math.abs(
        base.filter((t) => t.value < 0).reduce((acc, t) => acc + t.value, 0)
      );

      return {
        entradas,
        saidas,
        saldo: entradas - saidas,
      };
    };

    return {
      geral: calculate("Todas"),
      marcenaria: calculate("Marcenaria"),
      construcao: calculate("Construção"),
      operacional: calculate("Geral"),
    };
  }, [transactions]);

  const filteredCategories = categories.filter(
    (c) =>
      c.active &&
      (c.type === "Ambos" || c.type === transactionForm.type) &&
      (c.scope === "Geral" || c.scope === transactionForm.business)
  );

  const visibleTransactions =
    transactionFilter === "Todas"
      ? transactions
      : transactions.filter((t) => t.business === transactionFilter);

  const dashboardBase =
    dashboardFilter === "Todas"
      ? transactions
      : transactions.filter((t) => t.business === dashboardFilter);

  const monthlyChartData = useMemo(() => {
    const grouped = dashboardBase.reduce<Record<string, { month: string; entradas: number; saidas: number }>>(
      (acc, item) => {
        if (!acc[item.month]) {
          acc[item.month] = { month: item.month, entradas: 0, saidas: 0 };
        }
        if (item.value >= 0) {
          acc[item.month].entradas += item.value;
        } else {
          acc[item.month].saidas += Math.abs(item.value);
        }
        return acc;
      },
      {}
    );

    return Object.values(grouped);
  }, [dashboardBase]);

  const categoryChartData = useMemo(() => {
    const grouped = dashboardBase
      .filter((item) => item.value < 0)
      .reduce<Record<string, number>>((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + Math.abs(item.value);
        return acc;
      }, {});

    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }, [dashboardBase]);

  function resetTransactionForm() {
    setTransactionForm({
      date: todayISO(),
      business: "Marcenaria",
      bankAccount: "",
      holder: "",
      type: "Entrada",
      value: "",
      category: "",
      clientProject: "",
      description: "",
      notes: "",
    });
  }

  async function syncTransactionToGoogleSheets(transaction: Transaction) {
    if (!googleSheetsConfig.webhookUrl) {
      setMessage("Configure a URL do Google Sheets em Configurações.");
      return false;
    }

    try {
      setSyncing(true);

      const payload = {
        action: "append",
        transaction_id: `manual-${transaction.id}`,
        data: String(transaction.date || todayISO()),
        empresa: String(transaction.business || "Marcenaria"),
        banco_conta: String(transaction.bankAccount || ""),
        titular: String(transaction.holder || ""),
        tipo: String(transaction.type || "Entrada"),
        categoria: String(transaction.category || ""),
        projeto_cliente: String(transaction.clientProject || ""),
        descricao: String(transaction.description || ""),
        valor: Number(Math.abs(transaction.value || 0)),
        observacao: String(transaction.notes || ""),
        origem: String(transaction.origin || "App"),
        atualizado_em: new Date().toISOString(),
      };

      const response = await fetch(googleSheetsConfig.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || (result as any).status === "erro") {
        throw new Error((result as any).mensagem || "Falha ao enviar dados para o Google Sheets.");
      }

      setGoogleSheetsConfig((prev) => ({
        ...prev,
        lastSync: new Date().toLocaleString("pt-BR"),
      }));

      setMessage("Lançamento enviado para Importação com sucesso.");
      return true;
    } catch (error: any) {
      setMessage(error.message || "Erro ao sincronizar com Google Sheets.");
      return false;
    } finally {
      setSyncing(false);
    }
  }
async function loadDataFromGoogleSheets(showMessage = false) {
  if (!googleSheetsConfig.webhookUrl) return false;

  try {
    setSyncing(true);

    const response = await fetch(googleSheetsConfig.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "list" }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || result.status === "erro") {
      throw new Error(result.mensagem || "Falha ao carregar dados da planilha.");
    }

    const remoteTransactions = Array.isArray(result.transactions)
      ? result.transactions
      : [];
    const remoteCategories = Array.isArray(result.categories)
      ? result.categories
      : [];
    const remoteClients = Array.isArray(result.clients)
      ? result.clients
      : [];

    setTransactions(remoteTransactions);
    setCategories(remoteCategories);
    setClients(remoteClients);

    setGoogleSheetsConfig((prev) => ({
      ...prev,
      lastSync: new Date().toLocaleString("pt-BR"),
    }));

    if (showMessage) {
      setMessage("Dados atualizados da planilha com sucesso.");
    }

    return true;
  } catch (error: any) {
    if (showMessage) {
      setMessage(error.message || "Erro ao carregar dados da planilha.");
    }
    return false;
  } finally {
    setSyncing(false);
  }
}

  async function triggerImportOnGoogleSheets() {
    if (!googleSheetsConfig.webhookUrl) {
      setMessage("Configure a URL do Google Sheets em Configurações.");
      return false;
    }

    try {
      setSyncing(true);

      const response = await fetch(googleSheetsConfig.webhookUrl, {
        method: "POST",
       headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "import" }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || (result as any).status === "erro") {
        throw new Error((result as any).mensagem || "Falha ao importar lançamentos.");
      }

      setGoogleSheetsConfig((prev) => ({
        ...prev,
        lastSync: new Date().toLocaleString("pt-BR"),
      }));

      setMessage(
        (result as any).importados > 0
          ? `Importação executada com sucesso. ${(result as any).importados} lançamento(s) importado(s).`
          : "Importação executada, mas não havia lançamentos pendentes."
      );

      return true;
    } catch (error: any) {
      setMessage(error.message || "Erro ao importar lançamentos.");
      return false;
    } finally {
      setSyncing(false);
    }
  }

  async function saveTransaction() {
    if (!transactionForm.date || !transactionForm.type || !transactionForm.value || !transactionForm.category) {
      setMessage("Preencha data, tipo, valor e categoria.");
      return;
    }

    const rawValue = parseCurrencyInput(transactionForm.value);

    if (Number.isNaN(rawValue) || rawValue <= 0) {
      setMessage("Informe um valor válido.");
      return;
    }

    const signedValue =
      transactionForm.type === "Saída" ? -Math.abs(rawValue) : Math.abs(rawValue);

    const newTransaction: Transaction = {
      id: transactions.length ? Math.max(...transactions.map((t) => t.id)) + 1 : 1,
      date: transactionForm.date,
      month: toMonthYear(transactionForm.date),
      business: transactionForm.business,
      bankAccount: transactionForm.bankAccount,
      holder: transactionForm.holder,
      type: transactionForm.type,
      category: transactionForm.category,
      clientProject: transactionForm.clientProject,
      description: transactionForm.description,
      value: signedValue,
      notes: transactionForm.notes,
      origin: "App",
    };

    setTransactions((prev) => [newTransaction, ...prev]);

    if (googleSheetsConfig.syncMode === "automatic") {
      await syncTransactionToGoogleSheets(newTransaction);
    } else {
      setMessage("Lançamento salvo com sucesso.");
    }

    setOpenTransactionModal(false);
    resetTransactionForm();
  }

  function saveClientProject() {
    const name = clientForm.name.trim();
    if (!name) {
      setMessage("Informe o nome do cliente/projeto.");
      return;
    }

    const exists = clients.some((c) => c.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      setMessage("Esse cliente/projeto já existe.");
      return;
    }

    const newItem: ClientProject = {
      id: `cli-${Date.now()}`,
      name,
      type: clientForm.type,
      notes: clientForm.notes,
      active: true,
    };

    setClients((prev) => [...prev, newItem]);
    setTransactionForm((prev) => ({ ...prev, clientProject: name }));
    setClientForm({ name: "", type: "Cliente", notes: "" });
    setOpenClientModal(false);
    setMessage("Cliente/projeto criado e selecionado.");
  }

  function saveCategory() {
    const name = categoryForm.name.trim();
    if (!name) {
      setMessage("Informe o nome da categoria.");
      return;
    }

    const exists = categories.some((c) => c.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      setMessage("Essa categoria já existe.");
      return;
    }

    const newCategory: Category = {
      id: `cat-${Date.now()}`,
      name,
      type: categoryForm.type,
      scope: categoryForm.scope,
      active: true,
    };

    setCategories((prev) => [...prev, newCategory]);
    setTransactionForm((prev) => ({ ...prev, category: name }));
    setCategoryForm({ name: "", type: "Ambos", scope: "Geral" });
    setOpenCategoryModal(false);
    setMessage("Categoria criada e selecionada.");
  }

  const menuItems = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "transactions", label: "Lançamentos", icon: ArrowRightLeft },
    { key: "categories", label: "Categorias", icon: Tags },
    { key: "clients", label: "Clientes / Projetos", icon: Briefcase },
    { key: "import", label: "Importação", icon: DatabaseZap },
    { key: "settings", label: "Configurações", icon: Settings },
  ];

  return (
    <div style={styles.app}>
      <aside style={styles.sidebar}>
        <div style={styles.brandBox}>
          <div style={styles.brandIcon}>
            <MoonStar size={20} />
          </div>
          <div>
            <h1 style={styles.logoTitle}>Fluxo Inteligente Prado</h1>
            <p style={styles.brandSubtitle}>Controle financeiro premium</p>
          </div>
        </div>

        <div style={styles.sectionTag}>Navegação</div>

        <nav style={{ display: "grid", gap: 10 }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = page === item.key;

            return (
              <button
                key={item.key}
                onClick={() => setPage(item.key)}
                style={{
                  ...styles.navButton,
                  ...(active ? styles.navButtonActive : {}),
                }}
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div style={styles.sidebarFooter}>
          <div style={styles.sidebarFooterBadge}>
            <Building2 size={16} />
            Gestão Financeira
          </div>
        </div>
      </aside>

      <main style={styles.main}>
        {message && <div style={styles.alert}>{message}</div>}

        {page === "dashboard" && (
          <div style={styles.pageWrap}>
            <div style={styles.headerRow}>
              <div>
                <h2 style={styles.pageTitle}>Dashboard</h2>
                <p style={styles.muted}>Visão consolidada das operações financeiras.</p>
              </div>

              <div style={styles.headerActions}>
                <select
                  value={dashboardFilter}
                  onChange={(e) => setDashboardFilter(e.target.value)}
                  style={styles.select}
                >
                  <option value="Todas">Todas as empresas</option>
                  {businesses.map((business) => (
                    <option key={business} value={business}>
                      {business}
                    </option>
                  ))}
                </select>

                <button style={styles.primaryButton} onClick={() => setOpenTransactionModal(true)}>
                  <Plus size={16} />
                  Novo lançamento
                </button>
              </div>
            </div>

            <div style={styles.grid3}>
              <MetricCard title="Entradas gerais" value={formatCurrency(summary.geral.entradas)} tone="green" />
              <MetricCard title="Saídas gerais" value={formatCurrency(summary.geral.saidas)} tone="red" />
              <MetricCard title="Saldo geral" value={formatCurrency(summary.geral.saldo)} tone="blue" />
            </div>

            <div style={styles.grid3}>
              <MetricCard title="Saldo Marcenaria" value={formatCurrency(summary.marcenaria.saldo)} tone="amber" />
              <MetricCard title="Saldo Construção" value={formatCurrency(summary.construcao.saldo)} tone="purple" />
              <MetricCard title="Saldo Geral" value={formatCurrency(summary.operacional.saldo)} tone="cyan" />
            </div>

            <div style={styles.grid6}>
              <MiniMetricCard title="Entradas Marc." value={formatCurrency(summary.marcenaria.entradas)} positive />
              <MiniMetricCard title="Saídas Marc." value={formatCurrency(summary.marcenaria.saidas)} />
              <MiniMetricCard title="Entradas Const." value={formatCurrency(summary.construcao.entradas)} positive />
              <MiniMetricCard title="Saídas Const." value={formatCurrency(summary.construcao.saidas)} />
              <MiniMetricCard title="Entradas Geral" value={formatCurrency(summary.operacional.entradas)} positive />
              <MiniMetricCard title="Saídas Geral" value={formatCurrency(summary.operacional.saidas)} />
            </div>

            <div style={styles.grid2}>
              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <h3 style={styles.cardTitle}>
                    <BarChart3 size={18} />
                    Fluxo mensal
                  </h3>
                </div>
                <div style={{ height: 320 }}>
                  {monthlyChartData.length === 0 ? (
                    <div style={styles.emptyCenter}>
                      Ainda não há lançamentos para exibir no gráfico mensal.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#273248" />
                        <XAxis dataKey="month" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip
                          contentStyle={{
                            background: "#0b1220",
                            border: "1px solid #263043",
                            borderRadius: 14,
                            color: "#fff",
                          }}
                        />
                        <Bar dataKey="entradas" fill="#10b981" radius={[10, 10, 0, 0]} />
                        <Bar dataKey="saidas" fill="#ef4444" radius={[10, 10, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <h3 style={styles.cardTitle}>Despesas por categoria</h3>
                </div>
                <div style={{ height: 320 }}>
                  {categoryChartData.length === 0 ? (
                    <div style={styles.emptyCenter}>
                      Sem despesas para exibir no filtro atual.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryChartData}
                          dataKey="value"
                          nameKey="name"
                          outerRadius={110}
                          label
                        >
                          {categoryChartData.map((_, index) => (
                            <Cell
                              key={index}
                              fill={
                                ["#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#38bdf8", "#22c55e"][
                                  index % 6
                                ]
                              }
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: "#0b1220",
                            border: "1px solid #263043",
                            borderRadius: 14,
                            color: "#fff",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>Últimos lançamentos</h3>
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                {transactions.length === 0 ? (
                  <div style={styles.emptyBox}>
                    Nenhum lançamento cadastrado ainda. Use o botão "Novo lançamento" para começar.
                  </div>
                ) : (
                  transactions.slice(0, 6).map((item) => (
                    <div key={item.id} style={styles.rowCard}>
                      <div>
                        <div style={styles.rowTitle}>
                          {item.description || item.category}
                        </div>
                        <div style={styles.smallMuted}>
                          {item.clientProject || "Sem cliente/projeto"}
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={styles.badge}>{item.type}</div>
                        <div
                          style={{
                            color: item.value >= 0 ? "#4ade80" : "#fb7185",
                            marginTop: 8,
                            fontWeight: 800,
                          }}
                        >
                          {formatCurrency(item.value)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {page === "transactions" && (
          <div style={styles.pageWrap}>
            <div style={styles.headerRow}>
              <div>
                <h2 style={styles.pageTitle}>Lançamentos</h2>
                <p style={styles.muted}>Registre entradas e saídas com clareza e velocidade.</p>
              </div>

              <div style={styles.headerActions}>
                <button
                  style={styles.secondaryButton}
                  onClick={async () => {
                    const ok = await triggerImportOnGoogleSheets();
                    if (ok) {
                      alert("Importação executada com sucesso.");
                    }
                  }}
                  disabled={syncing}
                >
                  {syncing ? "Importando..." : "Importar agora"}
                </button>

                <select
                  value={transactionFilter}
                  onChange={(e) => setTransactionFilter(e.target.value)}
                  style={styles.select}
                >
                  <option value="Todas">Todas as empresas</option>
                  {businesses.map((business) => (
                    <option key={business} value={business}>
                      {business}
                    </option>
                  ))}
                </select>

                <button style={styles.primaryButton} onClick={() => setOpenTransactionModal(true)}>
                  <Plus size={16} />
                  Novo lançamento
                </button>
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <h3 style={styles.cardTitle}>Histórico</h3>
                  <p style={styles.smallMuted}>Filtro atual: {transactionFilter}</p>
                </div>
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                {visibleTransactions.length === 0 ? (
                  <div style={styles.emptyBox}>
                    Nenhum lançamento encontrado para este filtro.
                  </div>
                ) : (
                  visibleTransactions.map((item) => (
                    <div key={item.id} style={styles.tableRow}>
                      <CellBlock label="Data" value={formatDateBR(item.date)} />
                      <CellBlock label="Empresa" value={item.business} />
                      <CellBlock label="Tipo" value={item.type} />
                      <CellBlock label="Categoria" value={item.category} />
                      <CellBlock label="Cliente / Projeto" value={item.clientProject || "-"} />
                      <CellBlock label="Descrição" value={item.description || "-"} />
                      <div
                        style={{
                          textAlign: "right",
                          fontWeight: 800,
                          color: item.value >= 0 ? "#4ade80" : "#fb7185",
                        }}
                      >
                        {formatCurrency(item.value)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {page === "categories" && (
          <SimpleListPage
            title="Categorias"
            subtitle="Cadastre e organize categorias de operação."
            buttonLabel="Nova categoria"
            onAdd={() => setOpenCategoryModal(true)}
            items={categories.map((c) => ({
              title: c.name,
              subtitle: `${c.type} • ${c.scope}`,
            }))}
          />
        )}

        {page === "clients" && (
          <SimpleListPage
            title="Clientes / Projetos"
            subtitle="Gerencie clientes e projetos com estrutura."
            buttonLabel="Novo cliente/projeto"
            onAdd={() => setOpenClientModal(true)}
            items={clients.map((c) => ({
              title: c.name,
              subtitle: c.type,
            }))}
          />
        )}

        {page === "import" && (
          <SimpleListPage
            title="Importação"
            subtitle="Controle a passagem de dados da aba Importação para Lançamentos."
            buttonLabel="Importar para lançamentos"
            onAdd={async () => {
              const ok = await triggerImportOnGoogleSheets();
              if (ok) {
                alert("Importação executada.");
              }
            }}
            items={[
              {
                title: "Integração ativa",
                subtitle: "O script está conectado e pronto para processar os lançamentos pendentes.",
              },
            ]}
          />
        )}

        {page === "settings" && (
          <div style={styles.pageWrap}>
            <div>
              <h2 style={styles.pageTitle}>Configurações</h2>
              <p style={styles.muted}>Conecte e monitore a integração com o Google Sheets.</p>
            </div>

            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>Integração Google Sheets</h3>
              </div>

              <div style={{ display: "grid", gap: 18 }}>
                <div>
                  <label style={styles.label}>URL do Webhook Apps Script</label>
                  <input
                    style={styles.input}
                    placeholder="Cole aqui a URL /exec do Apps Script"
                    value={googleSheetsConfig.webhookUrl}
                    onChange={(e) =>
                      setGoogleSheetsConfig((prev) => ({
                        ...prev,
                        webhookUrl: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <label style={styles.label}>Modo de sincronização</label>
                  <select
                    value={googleSheetsConfig.syncMode}
                    onChange={(e) =>
                      setGoogleSheetsConfig((prev) => ({
                        ...prev,
                        syncMode: e.target.value as SyncMode,
                      }))
                    }
                    style={styles.select}
                  >
                    <option value="automatic">Automática ao salvar lançamento</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>

                <div style={styles.statusBox}>
                  <div style={styles.statusTitle}>Status da conexão</div>
                  <div>Última sincronização: {googleSheetsConfig.lastSync || "Ainda não sincronizado"}</div>
                  <div>Modo: {googleSheetsConfig.syncMode === "automatic" ? "Automático" : "Manual"}</div>
                </div>

                <div style={styles.headerActions}>
                  <button
                    style={styles.primaryButton}
                    onClick={async () => {
                      const ok = await triggerImportOnGoogleSheets();
                      if (ok) {
                        alert("Importação executada com sucesso.");
                      }
                    }}
                    disabled={syncing}
                  >
                    {syncing ? "Importando..." : "Importar agora"}
                  </button>

                  <button
                    style={styles.secondaryButton}
                    onClick={async () => {
                      try {
                        const response = await fetch(googleSheetsConfig.webhookUrl, {
                          method: "POST",
                          headers: { "Content-Type": "text/plain;charset=utf-8" },
                          body: JSON.stringify({
                            action: "append",
                            transaction_id: "teste-fixo-empresa",
                            data: "2026-04-14",
                            empresa: "Marcenaria",
                            tipo: "Entrada",
                            categoria: "Vendas Marcenaria",
                            projeto_cliente: "Cliente Teste",
                            descricao: "Teste fixo",
                            valor: 100,
                            observacao: "Teste direto",
                            origem: "App",
                          }),
                        });

                        const result = await response.json();
                        alert("RETORNO DO SCRIPT:\n\n" + JSON.stringify(result, null, 2));
                      } catch (err) {
                        alert("Erro ao testar: " + err);
                      }
                    }}
                  >
                    Teste fixo
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {openTransactionModal && (
        <Modal title="Novo lançamento" onClose={() => setOpenTransactionModal(false)}>
          <div style={styles.modalGrid}>
            <Field label="Empresa / Unidade *">
              <select
                style={styles.select}
                value={transactionForm.business}
                onChange={(e) =>
                  setTransactionForm((p) => ({
                    ...p,
                    business: e.target.value as Business,
                    category: "",
                  }))
                }
              >
                {businesses.map((business) => (
                  <option key={business} value={business}>
                    {business}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Banco / Conta">
              <select
                style={styles.select}
                value={transactionForm.bankAccount}
                onChange={(e) => setTransactionForm((p) => ({ ...p, bankAccount: e.target.value }))}
              >
                <option value="">Selecione...</option>
                {bankAccounts.map((account) => (
                  <option key={account} value={account}>
                    {account}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Titular">
              <select
                style={styles.select}
                value={transactionForm.holder}
                onChange={(e) => setTransactionForm((p) => ({ ...p, holder: e.target.value }))}
              >
                <option value="">Selecione...</option>
                {holders.map((holder) => (
                  <option key={holder} value={holder}>
                    {holder}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Data *">
              <input
                style={styles.input}
                type="date"
                value={transactionForm.date}
                onChange={(e) => setTransactionForm((p) => ({ ...p, date: e.target.value }))}
              />
            </Field>

            <Field label="Tipo *">
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  style={{
                    ...styles.typeButton,
                    ...(transactionForm.type === "Entrada" ? styles.typeButtonActive : {}),
                  }}
                  onClick={() => setTransactionForm((p) => ({ ...p, type: "Entrada", category: "" }))}
                >
                  Entrada
                </button>
                <button
                  type="button"
                  style={{
                    ...styles.typeButton,
                    ...(transactionForm.type === "Saída" ? styles.typeButtonDangerActive : {}),
                  }}
                  onClick={() => setTransactionForm((p) => ({ ...p, type: "Saída", category: "" }))}
                >
                  Saída
                </button>
              </div>
            </Field>

            <Field label="Valor (R$) *">
              <input
                style={styles.input}
                placeholder="0,00"
                value={transactionForm.value}
                onChange={(e) => setTransactionForm((p) => ({ ...p, value: e.target.value }))}
              />
            </Field>

            <Field
              label="Categoria *"
              action={
                <button type="button" style={styles.linkButton} onClick={() => setOpenCategoryModal(true)}>
                  + Nova categoria
                </button>
              }
            >
              <select
                style={styles.select}
                value={transactionForm.category}
                onChange={(e) => setTransactionForm((p) => ({ ...p, category: e.target.value }))}
              >
                <option value="">Selecione...</option>
                {filteredCategories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Cliente / Projeto"
              full
              action={
                <button type="button" style={styles.linkButton} onClick={() => setOpenClientModal(true)}>
                  + Novo cliente/projeto
                </button>
              }
            >
              <select
                style={styles.select}
                value={transactionForm.clientProject || ""}
                onChange={(e) => setTransactionForm((p) => ({ ...p, clientProject: e.target.value }))}
              >
                <option value="">Nenhum</option>
                {clients
                  .filter((c) => c.active)
                  .map((client) => (
                    <option key={client.id} value={client.name}>
                      {client.name}
                    </option>
                  ))}
              </select>
            </Field>

            <Field label="Descrição" full>
              <input
                style={styles.input}
                placeholder="Ex.: pagamento fornecedor"
                value={transactionForm.description}
                onChange={(e) => setTransactionForm((p) => ({ ...p, description: e.target.value }))}
              />
            </Field>

            <Field label="Observação" full>
              <textarea
                style={{ ...styles.input, minHeight: 90, resize: "vertical" as const }}
                placeholder="Detalhes adicionais"
                value={transactionForm.notes}
                onChange={(e) => setTransactionForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </Field>
          </div>

          <div style={styles.modalFooter}>
            <button style={styles.secondaryButton} onClick={() => setOpenTransactionModal(false)}>
              Cancelar
            </button>
            <button style={styles.primaryButton} onClick={saveTransaction} disabled={syncing}>
              {syncing ? "Salvando..." : "Salvar lançamento"}
            </button>
          </div>
        </Modal>
      )}

      {openClientModal && (
        <Modal title="Novo cliente / projeto" onClose={() => setOpenClientModal(false)}>
          <div style={{ display: "grid", gap: 16 }}>
            <Field label="Nome *">
              <input
                style={styles.input}
                value={clientForm.name}
                onChange={(e) => setClientForm((p) => ({ ...p, name: e.target.value }))}
              />
            </Field>

            <Field label="Tipo">
              <select
                style={styles.select}
                value={clientForm.type}
                onChange={(e) =>
                  setClientForm((p) => ({
                    ...p,
                    type: e.target.value as "Cliente" | "Projeto" | "Ambos",
                  }))
                }
              >
                <option value="Cliente">Cliente</option>
                <option value="Projeto">Projeto</option>
                <option value="Ambos">Ambos</option>
              </select>
            </Field>

            <Field label="Observação">
              <textarea
                style={{ ...styles.input, minHeight: 90, resize: "vertical" as const }}
                value={clientForm.notes}
                onChange={(e) => setClientForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </Field>
          </div>

          <div style={styles.modalFooter}>
            <button style={styles.secondaryButton} onClick={() => setOpenClientModal(false)}>
              Cancelar
            </button>
            <button style={styles.primaryButton} onClick={saveClientProject}>
              Salvar
            </button>
          </div>
        </Modal>
      )}

      {openCategoryModal && (
        <Modal title="Nova categoria" onClose={() => setOpenCategoryModal(false)}>
          <div style={{ display: "grid", gap: 16 }}>
            <Field label="Nome *">
              <input
                style={styles.input}
                value={categoryForm.name}
                onChange={(e) => setCategoryForm((p) => ({ ...p, name: e.target.value }))}
              />
            </Field>

            <Field label="Tipo">
              <select
                style={styles.select}
                value={categoryForm.type}
                onChange={(e) =>
                  setCategoryForm((p) => ({
                    ...p,
                    type: e.target.value as EntryType | "Ambos",
                  }))
                }
              >
                <option value="Entrada">Entrada</option>
                <option value="Saída">Saída</option>
                <option value="Ambos">Ambos</option>
              </select>
            </Field>

            <Field label="Empresa / Escopo">
              <select
                style={styles.select}
                value={categoryForm.scope}
                onChange={(e) =>
                  setCategoryForm((p) => ({
                    ...p,
                    scope: e.target.value as Business | "Geral",
                  }))
                }
              >
                <option value="Marcenaria">Marcenaria</option>
                <option value="Construção">Construção</option>
                <option value="Geral">Geral</option>
              </select>
            </Field>
          </div>

          <div style={styles.modalFooter}>
            <button style={styles.secondaryButton} onClick={() => setOpenCategoryModal(false)}>
              Cancelar
            </button>
            <button style={styles.primaryButton} onClick={saveCategory}>
              Salvar
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function MetricCard({
  title,
  value,
  tone,
}: {
  title: string;
  value: string;
  tone: "green" | "red" | "blue" | "amber" | "purple" | "cyan";
}) {
  const toneMap: Record<string, React.CSSProperties> = {
    green: {
      border: "1px solid rgba(16,185,129,.25)",
      background: "linear-gradient(180deg, rgba(16,185,129,.12), rgba(16,185,129,.04))",
      color: "#86efac",
      boxShadow: "0 12px 30px rgba(16,185,129,.10)",
    },
    red: {
      border: "1px solid rgba(239,68,68,.25)",
      background: "linear-gradient(180deg, rgba(239,68,68,.12), rgba(239,68,68,.04))",
      color: "#fda4af",
      boxShadow: "0 12px 30px rgba(239,68,68,.10)",
    },
    blue: {
      border: "1px solid rgba(59,130,246,.25)",
      background: "linear-gradient(180deg, rgba(59,130,246,.12), rgba(59,130,246,.04))",
      color: "#93c5fd",
      boxShadow: "0 12px 30px rgba(59,130,246,.10)",
    },
    amber: {
      border: "1px solid rgba(245,158,11,.25)",
      background: "linear-gradient(180deg, rgba(245,158,11,.12), rgba(245,158,11,.04))",
      color: "#fde68a",
      boxShadow: "0 12px 30px rgba(245,158,11,.10)",
    },
    purple: {
      border: "1px solid rgba(139,92,246,.25)",
      background: "linear-gradient(180deg, rgba(139,92,246,.12), rgba(139,92,246,.04))",
      color: "#c4b5fd",
      boxShadow: "0 12px 30px rgba(139,92,246,.10)",
    },
    cyan: {
      border: "1px solid rgba(34,211,238,.25)",
      background: "linear-gradient(180deg, rgba(34,211,238,.12), rgba(34,211,238,.04))",
      color: "#a5f3fc",
      boxShadow: "0 12px 30px rgba(34,211,238,.10)",
    },
  };

  return (
    <div style={{ ...styles.metricCard, ...toneMap[tone] }}>
      <div style={{ opacity: 0.9, fontSize: 13, lineHeight: 1.35 }}>{title}</div>
      <div
        style={{
          marginTop: 12,
          fontSize: 30,
          fontWeight: 900,
          lineHeight: 1.15,
          wordBreak: "break-word",
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function MiniMetricCard({
  title,
  value,
  positive,
}: {
  title: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div
      style={{
        ...styles.miniMetricCard,
        border: positive ? "1px solid rgba(16,185,129,.18)" : "1px solid rgba(244,114,182,.16)",
        background: positive
          ? "linear-gradient(180deg, rgba(16,185,129,.08), rgba(16,185,129,.03))"
          : "linear-gradient(180deg, rgba(244,114,182,.07), rgba(244,114,182,.03))",
      }}
    >
      <div style={{ fontSize: 13, color: "#a7b4c7", lineHeight: 1.35 }}>{title}</div>
      <div
        style={{
          marginTop: 10,
          fontSize: 22,
          fontWeight: 800,
          color: positive ? "#86efac" : "#fda4af",
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function SimpleListPage({
  title,
  subtitle,
  buttonLabel,
  onAdd,
  items,
}: {
  title: string;
  subtitle: string;
  buttonLabel: string;
  onAdd: () => void | Promise<void>;
  items: { title: string; subtitle: string }[];
}) {
  return (
    <div style={styles.pageWrap}>
      <div style={styles.headerRow}>
        <div>
          <h2 style={styles.pageTitle}>{title}</h2>
          <p style={styles.muted}>{subtitle}</p>
        </div>

        <button style={styles.primaryButton} onClick={onAdd}>
          <Plus size={16} />
          {buttonLabel}
        </button>
      </div>

      <div style={styles.card}>
        <div style={{ display: "grid", gap: 12 }}>
          {items.length === 0 ? (
            <div style={styles.emptyBox}>Nenhum item cadastrado ainda.</div>
          ) : (
            items.map((item, index) => (
              <div key={index} style={styles.rowCard}>
                <div>
                  <div style={styles.rowTitle}>{item.title}</div>
                  <div style={styles.smallMuted}>{item.subtitle}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div style={styles.modalBackdrop}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <h3 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>{title}</h3>
          <button style={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  action,
  full,
}: {
  label: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div style={{ display: "grid", gap: 8, gridColumn: full ? "1 / -1" : undefined }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <label style={styles.label}>{label}</label>
        {action}
      </div>
      {children}
    </div>
  );
}

function CellBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={styles.tableLabel}>{label}</div>
      <div style={{ color: "#e5edf8" }}>{value}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top left, rgba(59,130,246,.10), transparent 30%), radial-gradient(circle at top right, rgba(16,185,129,.08), transparent 25%), #071018",
    color: "#f8fafc",
    display: "grid",
    gridTemplateColumns: "290px 1fr",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  sidebar: {
    borderRight: "1px solid rgba(255,255,255,.06)",
    background: "linear-gradient(180deg, rgba(8,15,27,.95), rgba(7,12,22,.98))",
    padding: 24,
    display: "flex",
    flexDirection: "column",
  },
  brandBox: {
    display: "flex",
    gap: 14,
    alignItems: "center",
    marginBottom: 26,
    padding: 18,
    borderRadius: 24,
    border: "1px solid rgba(255,255,255,.06)",
    background: "linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.02))",
    boxShadow: "0 20px 40px rgba(0,0,0,.25)",
  },
  brandIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(135deg, #0ea5e9, #22c55e)",
    color: "#fff",
    boxShadow: "0 12px 30px rgba(34,197,94,.25)",
    flexShrink: 0,
  },
  logoTitle: {
    margin: 0,
    fontSize: 24,
    fontWeight: 900,
    lineHeight: 1.05,
    letterSpacing: "-0.03em",
  },
  brandSubtitle: {
    margin: "4px 0 0",
    color: "#8ea2bf",
    fontSize: 13,
  },
  sectionTag: {
    color: "#6f819b",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: ".12em",
    marginBottom: 12,
    fontWeight: 700,
  },
  sidebarFooter: {
    marginTop: "auto",
    paddingTop: 22,
  },
  sidebarFooterBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    padding: "10px 14px",
    border: "1px solid rgba(255,255,255,.08)",
    background: "rgba(255,255,255,.03)",
    color: "#b8c7da",
    fontSize: 13,
  },
  navButton: {
    background: "transparent",
    color: "#bdd0e6",
    border: "1px solid transparent",
    borderRadius: 18,
    padding: "14px 16px",
    display: "flex",
    gap: 12,
    alignItems: "center",
    cursor: "pointer",
    width: "100%",
    fontSize: 15,
    fontWeight: 600,
    transition: "all .2s ease",
  },
  navButtonActive: {
    background: "linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.04))",
    color: "#fff",
    border: "1px solid rgba(255,255,255,.08)",
    boxShadow: "0 10px 24px rgba(0,0,0,.18)",
  },
  main: {
    padding: 28,
    color: "#f8fafc",
  },
  alert: {
    marginBottom: 18,
    border: "1px solid rgba(16,185,129,.25)",
    background: "linear-gradient(180deg, rgba(16,185,129,.10), rgba(16,185,129,.04))",
    color: "#bbf7d0",
    padding: "14px 16px",
    borderRadius: 18,
    boxShadow: "0 12px 24px rgba(0,0,0,.15)",
  },
  pageWrap: {
    display: "grid",
    gap: 20,
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
  },
  headerActions: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
  },
  pageTitle: {
    margin: 0,
    fontSize: 42,
    fontWeight: 900,
    letterSpacing: "-0.04em",
    color: "#f8fafc",
    textShadow: "0 2px 10px rgba(0,0,0,.35)",
  },
  muted: {
    color: "#90a4c2",
    margin: "6px 0 0",
    fontSize: 15,
  },
  smallMuted: {
    color: "#90a4c2",
    fontSize: 14,
  },
  primaryButton: {
    background: "linear-gradient(135deg, #10b981, #0ea5e9)",
    color: "#fff",
    border: "none",
    borderRadius: 16,
    padding: "12px 18px",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontWeight: 800,
    boxShadow: "0 16px 34px rgba(14,165,233,.22)",
  },
  secondaryButton: {
    background: "rgba(255,255,255,.03)",
    color: "#fff",
    border: "1px solid rgba(255,255,255,.10)",
    borderRadius: 16,
    padding: "12px 18px",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontWeight: 700,
    backdropFilter: "blur(8px)",
  },
  select: {
    background: "#0d1827",
    color: "#fff",
    border: "1px solid rgba(255,255,255,.10)",
    borderRadius: 14,
    padding: "12px 14px",
    minWidth: 220,
    outline: "none",
  },
  input: {
    width: "100%",
    background: "#0d1827",
    color: "#fff",
    border: "1px solid rgba(255,255,255,.10)",
    borderRadius: 14,
    padding: "12px 14px",
    boxSizing: "border-box",
    outline: "none",
  },
  label: {
    fontSize: 14,
    fontWeight: 700,
    color: "#dce7f5",
  },
  linkButton: {
    background: "transparent",
    border: "none",
    color: "#67e8f9",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 800,
  },
  card: {
    background: "linear-gradient(180deg, rgba(13,24,39,.92), rgba(10,18,30,.96))",
    border: "1px solid rgba(255,255,255,.07)",
    borderRadius: 26,
    padding: 22,
    boxShadow: "0 24px 50px rgba(0,0,0,.22)",
    backdropFilter: "blur(8px)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  cardTitle: {
    margin: 0,
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 20,
    fontWeight: 800,
  },
  metricCard: {
    borderRadius: 26,
    padding: 22,
    minHeight: 130,
  },
  miniMetricCard: {
    borderRadius: 22,
    padding: 18,
    minHeight: 110,
    boxShadow: "0 14px 32px rgba(0,0,0,.14)",
  },
  rowCard: {
    border: "1px solid rgba(255,255,255,.07)",
    borderRadius: 18,
    padding: 16,
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "center",
    background: "rgba(255,255,255,.02)",
  },
  rowTitle: {
    fontWeight: 700,
    color: "#f5f9ff",
  },
  badge: {
    display: "inline-block",
    border: "1px solid rgba(255,255,255,.10)",
    color: "#d1deee",
    borderRadius: 999,
    padding: "4px 10px",
    fontSize: 12,
    background: "rgba(255,255,255,.03)",
  },
  tableRow: {
    border: "1px solid rgba(255,255,255,.07)",
    borderRadius: 18,
    padding: 16,
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
    gap: 12,
    alignItems: "center",
    background: "rgba(255,255,255,.02)",
  },
  tableLabel: {
    color: "#7286a4",
    fontSize: 12,
    marginBottom: 4,
  },
  statusBox: {
    border: "1px solid rgba(255,255,255,.08)",
    borderRadius: 18,
    padding: 16,
    color: "#d2def0",
    background: "rgba(255,255,255,.02)",
  },
  statusTitle: {
    fontWeight: 800,
    marginBottom: 8,
  },
  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(2,6,14,.76)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    zIndex: 999,
  },
  modal: {
    width: "min(940px, 100%)",
    background: "linear-gradient(180deg, #091321, #07111d)",
    border: "1px solid rgba(255,255,255,.08)",
    borderRadius: 28,
    padding: 24,
    boxSizing: "border-box",
    boxShadow: "0 30px 80px rgba(0,0,0,.40)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  closeButton: {
    background: "transparent",
    color: "#fff",
    border: "none",
    fontSize: 30,
    cursor: "pointer",
    lineHeight: 1,
  },
  modalGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 16,
  },
  modalFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 24,
    flexWrap: "wrap",
  },
  typeButton: {
    flex: 1,
    background: "#0d1827",
    color: "#fff",
    border: "1px solid rgba(255,255,255,.08)",
    borderRadius: 14,
    padding: "12px 14px",
    cursor: "pointer",
    fontWeight: 800,
  },
  typeButtonActive: {
    background: "linear-gradient(135deg, #10b981, #22c55e)",
    borderColor: "transparent",
  },
  typeButtonDangerActive: {
    background: "linear-gradient(135deg, #ef4444, #f97316)",
    borderColor: "transparent",
  },
  emptyCenter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    color: "#94a3b8",
    textAlign: "center",
    padding: 20,
  },
  emptyBox: {
    border: "1px dashed rgba(255,255,255,.12)",
    borderRadius: 18,
    padding: 22,
    color: "#9fb1c9",
    background: "rgba(255,255,255,.02)",
    textAlign: "center",
  },
  grid2: {
    display: "grid",
    gap: 18,
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  },
  grid3: {
    display: "grid",
    gap: 18,
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  },
  grid6: {
    display: "grid",
    gap: 18,
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  },
};