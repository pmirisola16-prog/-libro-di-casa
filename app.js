/* ───────────────── DATA MODEL ───────────────── */
const EXPENSE_CATEGORIES = [
  { name: "Spesa", icon: "🛒", color: "#7c9473" },
  { name: "Bollette", icon: "⚡", color: "#c9a13b" },
  { name: "Affitto/Mutuo", icon: "🏠", color: "#5b7a9d" },
  { name: "Ristoranti", icon: "🍽️", color: "#b6633f" },
  { name: "Trasporti", icon: "🚗", color: "#8a7ca8" },
  { name: "Salute", icon: "💊", color: "#a8506b" },
  { name: "Abbigliamento", icon: "👕", color: "#4f9d9d" },
  { name: "Bimbo", icon: "👶", color: "#d98c5f" },
  { name: "Svago", icon: "🎬", color: "#c47b3f" },
  { name: "Altro", icon: "📦", color: "#8a8a83" },
];
const INCOME_TYPES = ["Stipendio Pietro", "Stipendio Marianna", "Entrata secondaria"];
const USERS = ["Pietro", "Marianna", "Entrambi"];
let ACCOUNTS = ["Intesa", "BP", "Revolut", "BCC"];
const MONTHS = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];

function eur(n) { return "€" + Number(n || 0).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function monthKey(d) { const x = new Date(d); return `${x.getFullYear()}-${x.getMonth()}`; }
function monthLabel(k) { const [y, m] = k.split("-"); return `${MONTHS[parseInt(m)]} ${y}`; }
function todayISO() { return new Date().toISOString().slice(0, 10); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

/* ───────────────── STATE ───────────────── */
let expenses = [];
let incomes = [];
let transfers = [];
let balances = { Intesa: 0, BP: 0, Revolut: 0, BCC: 0 };
let db = null;
let firebaseReady = false;

/* ───────────────── FIREBASE INIT ───────────────── */
function initFirebase() {
  if (typeof firebaseConfig === "undefined" || !firebaseConfig.apiKey || firebaseConfig.apiKey.includes("INSERISCI")) {
    showError("Configura firebase-config.js con le chiavi del tuo progetto Firebase.");
    document.getElementById("loadingBox").style.display = "none";
    document.getElementById("page-dashboard").classList.add("active");
    return;
  }
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
  firebaseReady = true;

  db.collection("ledger").doc("expenses").onSnapshot((doc) => {
    expenses = doc.exists ? (doc.data().items || []) : [];
    render();
  }, (err) => showError("Errore lettura spese: " + err.message));

  db.collection("ledger").doc("incomes").onSnapshot((doc) => {
    incomes = doc.exists ? (doc.data().items || []) : [];
    render();
  }, (err) => showError("Errore lettura entrate: " + err.message));

  db.collection("ledger").doc("balances").onSnapshot((doc) => {
    if (doc.exists) balances = Object.assign({ Intesa: 0, BP: 0, Revolut: 0, BCC: 0 }, doc.data());
    render();
    document.getElementById("loadingBox").style.display = "none";
    document.getElementById("page-dashboard").classList.add("active");
  }, (err) => showError("Errore lettura conti: " + err.message));

  db.collection("ledger").doc("transfers").onSnapshot((doc) => {
    transfers = doc.exists ? (doc.data().items || []) : [];
    render();
  }, (err) => showError("Errore lettura giroconti: " + err.message));

  db.collection("ledger").doc("accounts").onSnapshot((doc) => {
    if (doc.exists && Array.isArray(doc.data().list) && doc.data().list.length) {
      ACCOUNTS = doc.data().list;
    } else {
      persist("accounts", { list: ACCOUNTS });
    }
    render();
  }, (err) => showError("Errore lettura conti: " + err.message));
}

function setSyncing(v) {
  const el = document.getElementById("syncStatus");
  el.innerHTML = v
    ? '<span class="dot" style="background:#b6633f"></span>salvo…'
    : '<span class="dot" style="background:#7c9473"></span>sincronizzato';
}
function showError(msg) {
  const box = document.getElementById("errBox");
  box.style.display = "block";
  box.textContent = "⚠ " + msg;
}
function clearError() {
  document.getElementById("errBox").style.display = "none";
}

async function persist(docName, payload) {
  if (!firebaseReady) { showError("Firebase non configurato: le modifiche non verranno salvate."); return; }
  setSyncing(true);
  try {
    await db.collection("ledger").doc(docName).set(payload);
    clearError();
  } catch (e) {
    showError("Salvataggio non riuscito: " + e.message);
  } finally {
    setSyncing(false);
  }
}

function addExpense(entry) {
  expenses = [{ ...entry, id: uid() }, ...expenses];
  persist("expenses", { items: expenses });
  render();
}
function addIncome(entry) {
  incomes = [{ ...entry, id: uid() }, ...incomes];
  persist("incomes", { items: incomes });
  render();
}
function deleteExpense(id) {
  expenses = expenses.filter((e) => e.id !== id);
  persist("expenses", { items: expenses });
  render();
}
function deleteIncome(id) {
  incomes = incomes.filter((e) => e.id !== id);
  persist("incomes", { items: incomes });
  render();
}
function updateBalance(acc, val) {
  balances = { ...balances, [acc]: val };
  persist("balances", balances);
  render();
}

function addAccount(name) {
  const clean = name.trim();
  if (!clean) { toast("Inserisci un nome per il conto"); return; }
  if (ACCOUNTS.some((a) => a.toLowerCase() === clean.toLowerCase())) { toast("Esiste già un conto con questo nome"); return; }
  ACCOUNTS = [...ACCOUNTS, clean];
  balances = { ...balances, [clean]: 0 };
  persist("accounts", { list: ACCOUNTS });
  persist("balances", balances);
  render();
  toast(`Conto "${clean}" aggiunto`);
}

function removeAccount(name) {
  const hasMovements = incomes.some((i) => i.account === name) || transfers.some((t) => t.from === name || t.to === name);
  const balance = Number(balances[name] || 0);
  if (hasMovements || balance !== 0) {
    if (!confirm(`"${name}" ha un saldo di ${eur(balance)} e/o movimenti collegati. Eliminarlo comunque? Lo storico resterà ma il conto sparirà dalle scelte future.`)) return;
  } else if (!confirm(`Eliminare il conto "${name}"?`)) return;
  ACCOUNTS = ACCOUNTS.filter((a) => a !== name);
  const newBalances = { ...balances };
  delete newBalances[name];
  balances = newBalances;
  persist("accounts", { list: ACCOUNTS });
  persist("balances", balances);
  render();
  toast(`Conto "${name}" eliminato`);
}

async function addTransfer(entry) {
  const newBalances = {
    ...balances,
    [entry.from]: Number(balances[entry.from] || 0) - entry.amount,
    [entry.to]: Number(balances[entry.to] || 0) + entry.amount,
  };
  const newTransfers = [{ ...entry, id: uid() }, ...transfers];
  balances = newBalances;
  transfers = newTransfers;
  render();
  if (!firebaseReady) { showError("Firebase non configurato: le modifiche non verranno salvate."); return; }
  setSyncing(true);
  try {
    const batch = db.batch();
    batch.set(db.collection("ledger").doc("balances"), newBalances);
    batch.set(db.collection("ledger").doc("transfers"), { items: newTransfers });
    await batch.commit();
    clearError();
  } catch (e) {
    showError("Salvataggio giroconto non riuscito: " + e.message);
  } finally {
    setSyncing(false);
  }
}

function deleteTransfer(id) {
  const t = transfers.find((x) => x.id === id);
  if (!t) return;
  transfers = transfers.filter((x) => x.id !== id);
  balances = {
    ...balances,
    [t.from]: Number(balances[t.from] || 0) + t.amount,
    [t.to]: Number(balances[t.to] || 0) - t.amount,
  };
  persist("transfers", { items: transfers });
  persist("balances", balances);
  render();
}

/* ───────────────── TOAST ───────────────── */
let toastTimer = null;
function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
}

/* ───────────────── NAVIGATION ───────────────── */
document.querySelectorAll(".nav button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav button").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("page-" + btn.dataset.page).classList.add("active");
    if (btn.dataset.page === "stats") renderStats();
    if (btn.dataset.page === "history") renderHistory();
  });
});

/* ───────────────── ADD TABS ───────────────── */
document.querySelectorAll("[data-addtab]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("[data-addtab]").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("add-spesa").style.display = btn.dataset.addtab === "spesa" ? "block" : "none";
    document.getElementById("add-entrata").style.display = btn.dataset.addtab === "entrata" ? "block" : "none";
    document.getElementById("add-giroconto").style.display = btn.dataset.addtab === "giroconto" ? "block" : "none";
    document.getElementById("add-conto").style.display = btn.dataset.addtab === "conto" ? "block" : "none";
  });
});

/* ───────────────── BUILD ADD FORM STATIC PARTS ───────────────── */
let selCategory = "Spesa", selUser = "Entrambi", selIncomeType = INCOME_TYPES[0], selIncomeAccount = ACCOUNTS[0];
let selTrfFrom = ACCOUNTS[0], selTrfTo = ACCOUNTS[1];

function buildAddForm() {
  const catGrid = document.getElementById("expCategoryGrid");
  catGrid.innerHTML = "";
  EXPENSE_CATEGORIES.forEach((c) => {
    const b = document.createElement("button");
    b.className = "chip" + (c.name === selCategory ? " active" : "");
    if (c.name === selCategory) { b.style.background = c.color; b.style.color = "#fff"; b.style.borderColor = c.color; }
    b.innerHTML = `<span class="ic">${c.icon}</span>${c.name}`;
    b.onclick = () => { selCategory = c.name; buildAddForm(); };
    catGrid.appendChild(b);
  });

  const userRow = document.getElementById("expUserRow");
  userRow.innerHTML = "";
  USERS.forEach((u) => {
    const b = document.createElement("button");
    b.className = u === selUser ? "active" : "";
    b.textContent = u;
    b.onclick = () => { selUser = u; buildAddForm(); };
    userRow.appendChild(b);
  });

  const incList = document.getElementById("incTypeList");
  incList.innerHTML = "";
  INCOME_TYPES.forEach((t) => {
    const b = document.createElement("button");
    b.className = t === selIncomeType ? "active" : "";
    b.textContent = t;
    b.onclick = () => { selIncomeType = t; buildAddForm(); };
    incList.appendChild(b);
  });

  const incAccGrid = document.getElementById("incAccountGrid");
  incAccGrid.innerHTML = "";
  ACCOUNTS.forEach((a) => {
    const b = document.createElement("button");
    b.className = a === selIncomeAccount ? "active" : "";
    b.textContent = a;
    b.onclick = () => { selIncomeAccount = a; buildAddForm(); };
    incAccGrid.appendChild(b);
  });

  const trfFromGrid = document.getElementById("trfFromGrid");
  trfFromGrid.innerHTML = "";
  ACCOUNTS.forEach((a) => {
    const b = document.createElement("button");
    b.className = a === selTrfFrom ? "active" : "";
    b.textContent = a;
    b.onclick = () => { selTrfFrom = a; buildAddForm(); };
    trfFromGrid.appendChild(b);
  });

  const trfToGrid = document.getElementById("trfToGrid");
  trfToGrid.innerHTML = "";
  ACCOUNTS.forEach((a) => {
    const b = document.createElement("button");
    b.className = a === selTrfTo ? "active" : "";
    b.textContent = a;
    b.onclick = () => { selTrfTo = a; buildAddForm(); };
    trfToGrid.appendChild(b);
  });

  const balForm = document.getElementById("add-conto");
  balForm.innerHTML = "";
  ACCOUNTS.forEach((acc) => {
    const wrap = document.createElement("div");
    wrap.className = "field";
    wrap.innerHTML = `
      <div class="field-label">${acc}</div>
      <div class="balance-save">
        <input class="input" style="flex:1" id="bal-${acc}" value="${balances[acc] ?? 0}">
        <button data-acc="${acc}" class="bal-save-btn">Salva</button>
        <button data-acc="${acc}" class="bal-del-btn" style="background:#fff;color:#a8506b;border:1px solid #ddd5c4;padding:0 12px;border-radius:10px">✕</button>
      </div>`;
    balForm.appendChild(wrap);
    wrap.querySelector(".bal-save-btn").onclick = () => {
      const val = parseFloat(document.getElementById(`bal-${acc}`).value.replace(",", ".")) || 0;
      updateBalance(acc, val);
      toast(`Saldo ${acc} aggiornato`);
    };
    wrap.querySelector(".bal-del-btn").onclick = () => removeAccount(acc);
  });

  const addAccWrap = document.createElement("div");
  addAccWrap.className = "field";
  addAccWrap.style.marginTop = "10px";
  addAccWrap.innerHTML = `
    <div class="field-label">Nuovo conto</div>
    <div class="balance-save">
      <input class="input" style="flex:1" id="newAccName" placeholder="es. Cassa, PayPal…">
      <button id="addAccBtn" style="background:#7c9473;color:#fff;padding:0 16px;border-radius:10px">Aggiungi</button>
    </div>`;
  balForm.appendChild(addAccWrap);
  addAccWrap.querySelector("#addAccBtn").onclick = () => {
    const val = document.getElementById("newAccName").value;
    addAccount(val);
    document.getElementById("newAccName").value = "";
  };
}

document.getElementById("expDate").value = todayISO();
document.getElementById("incDate").value = todayISO();
document.getElementById("trfDate").value = todayISO();

document.getElementById("expSubmit").onclick = () => {
  const raw = document.getElementById("expAmount").value;
  const val = parseFloat(raw.replace(",", "."));
  if (!val || val <= 0) { toast("Inserisci un importo valido"); return; }
  addExpense({
    amount: val, category: selCategory, user: selUser,
    note: document.getElementById("expNote").value, date: document.getElementById("expDate").value || todayISO(),
  });
  toast(`Spesa di ${eur(val)} registrata`);
  document.getElementById("expAmount").value = "";
  document.getElementById("expNote").value = "";
};

document.getElementById("incSubmit").onclick = () => {
  const raw = document.getElementById("incAmount").value;
  const val = parseFloat(raw.replace(",", "."));
  if (!val || val <= 0) { toast("Inserisci un importo valido"); return; }
  addIncome({
    amount: val, type: selIncomeType, account: selIncomeAccount,
    note: document.getElementById("incNote").value, date: document.getElementById("incDate").value || todayISO(),
  });
  toast(`Entrata di ${eur(val)} registrata`);
  document.getElementById("incAmount").value = "";
  document.getElementById("incNote").value = "";
};

document.getElementById("trfSubmit").onclick = () => {
  const raw = document.getElementById("trfAmount").value;
  const val = parseFloat(raw.replace(",", "."));
  if (!val || val <= 0) { toast("Inserisci un importo valido"); return; }
  if (selTrfFrom === selTrfTo) { toast("Scegli due conti diversi"); return; }
  addTransfer({
    amount: val, from: selTrfFrom, to: selTrfTo,
    note: document.getElementById("trfNote").value, date: document.getElementById("trfDate").value || todayISO(),
  });
  toast(`Giroconto di ${eur(val)} da ${selTrfFrom} a ${selTrfTo} registrato`);
  document.getElementById("trfAmount").value = "";
  document.getElementById("trfNote").value = "";
};

/* ───────────────── HISTORY ───────────────── */
let histTab = "spese", histMonth = monthKey(todayISO());

document.querySelectorAll("[data-histtab]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("[data-histtab]").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    histTab = btn.dataset.histtab;
    renderHistory();
  });
});

function renderHistory() {
  const all = [...expenses.map((e) => e.date), ...incomes.map((i) => i.date), ...transfers.map((t) => t.date)];
  let months = Array.from(new Set(all.map(monthKey))).sort().reverse();
  if (months.length === 0) months = [monthKey(todayISO())];
  if (!months.includes(histMonth)) histMonth = months[0];

  const chipRow = document.getElementById("monthChipRow");
  chipRow.innerHTML = "";
  months.forEach((m) => {
    const b = document.createElement("button");
    b.className = m === histMonth ? "active" : "";
    b.textContent = monthLabel(m);
    b.onclick = () => { histMonth = m; renderHistory(); };
    chipRow.appendChild(b);
  });

  const list = histTab === "spese" ? expenses.filter((e) => monthKey(e.date) === histMonth)
    : histTab === "entrate" ? incomes.filter((i) => monthKey(i.date) === histMonth)
    : transfers.filter((t) => monthKey(t.date) === histMonth);
  const total = list.reduce((s, e) => s + e.amount, 0);
  document.getElementById("histTotalLine").innerHTML = histTab === "giroconti"
    ? `Totale spostato: <strong style="color:#2c2a26">${eur(total)}</strong>`
    : `Totale ${histTab}: <strong style="color:#2c2a26">${eur(total)}</strong>`;

  const listEl = document.getElementById("histList");
  listEl.innerHTML = "";
  if (list.length === 0) {
    listEl.innerHTML = `<div class="empty">Nessun movimento in questo mese.</div>`;
    return;
  }
  list.forEach((item) => {
    const cat = EXPENSE_CATEGORIES.find((c) => c.name === item.category);
    const row = document.createElement("div");
    row.className = "movement";
    const icon = histTab === "spese" ? (cat ? cat.icon : "📦") : histTab === "entrate" ? "💶" : "🔁";
    const catLabel = histTab === "spese" ? item.category : histTab === "entrate" ? item.type : `${item.from} → ${item.to}`;
    const metaLabel = histTab === "spese" ? item.user : histTab === "entrate" ? item.account : "";
    const amountClass = histTab === "spese" ? "amount-out" : histTab === "entrate" ? "amount-in" : "";
    row.innerHTML = `
      <div class="movement-left">
        <span class="movement-icon">${icon}</span>
        <div>
          <div class="movement-cat">${catLabel}</div>
          <div class="movement-meta">${metaLabel ? metaLabel + " · " : ""}${new Date(item.date).toLocaleDateString("it-IT")}${item.note ? " · " + item.note : ""}</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <div class="mono ${amountClass}" style="${histTab === "giroconti" ? "color:#5b7a9d;font-weight:600" : ""}">${eur(item.amount)}</div>
        <button class="del-btn" data-id="${item.id}">✕</button>
      </div>`;
    row.querySelector(".del-btn").onclick = () => {
      if (histTab === "spese") deleteExpense(item.id);
      else if (histTab === "entrate") deleteIncome(item.id);
      else deleteTransfer(item.id);
      toast("Movimento eliminato");
      renderHistory();
    };
    listEl.appendChild(row);
  });
}

document.getElementById("exportBtn").onclick = () => {
  const lines = ["Tipo,Data,Categoria,Importo,Chi/Conto,Nota"];
  expenses.forEach((e) => lines.push(`Spesa,${e.date},${e.category},${e.amount},${e.user},"${e.note || ""}"`));
  incomes.forEach((i) => lines.push(`Entrata,${i.date},${i.type},${i.amount},${i.account},"${i.note || ""}"`));
  transfers.forEach((t) => lines.push(`Giroconto,${t.date},"${t.from} -> ${t.to}",${t.amount},,"${t.note || ""}"`));
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "libro-di-casa.csv"; a.click();
  URL.revokeObjectURL(url);
  toast("CSV esportato");
};

/* ───────────────── DASHBOARD ───────────────── */
function renderDashboard() {
  const thisMonth = monthKey(todayISO());
  document.getElementById("dashMonthLabel").textContent = "Saldo di " + monthLabel(thisMonth);

  const monthExpenses = expenses.filter((e) => monthKey(e.date) === thisMonth);
  const monthIncomes = incomes.filter((i) => monthKey(i.date) === thisMonth);
  const totalOut = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const totalIn = monthIncomes.reduce((s, i) => s + i.amount, 0);
  const net = totalIn - totalOut;

  const netEl = document.getElementById("dashNet");
  netEl.textContent = (net >= 0 ? "+" : "") + eur(net);
  netEl.style.color = net >= 0 ? "#8bb082" : "#d9755f";
  document.getElementById("dashIn").textContent = eur(totalIn);
  document.getElementById("dashOut").textContent = eur(totalOut);

  const totalLiquid = Object.values(balances).reduce((s, v) => s + Number(v || 0), 0);
  document.getElementById("dashLiquidLabel").textContent = "Conti correnti · liquidità " + eur(totalLiquid);

  const grid = document.getElementById("accountsGrid");
  grid.innerHTML = "";
  ACCOUNTS.forEach((acc) => {
    const el = document.createElement("div");
    el.className = "account-card";
    el.innerHTML = `<div class="name">${acc}</div><div class="val">${eur(balances[acc])}</div>`;
    grid.appendChild(el);
  });

  const recent = [
    ...expenses,
    ...incomes.map((i) => ({ ...i, category: i.type, isIncome: true })),
    ...transfers.map((t) => ({ ...t, category: `${t.from} → ${t.to}`, isTransfer: true })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);
  const recentEl = document.getElementById("recentList");
  recentEl.innerHTML = "";
  if (recent.length === 0) {
    recentEl.innerHTML = `<div class="empty">Nessun movimento ancora — aggiungine uno dal tab "+".</div>`;
  }
  recent.forEach((r) => {
    const cat = EXPENSE_CATEGORIES.find((c) => c.name === r.category);
    const row = document.createElement("div");
    row.className = "movement";
    const icon = r.isTransfer ? "🔁" : r.isIncome ? "💶" : (cat ? cat.icon : "📦");
    const meta = r.isTransfer ? "" : (r.isIncome ? r.account : r.user) + " · ";
    const amountHtml = r.isTransfer
      ? `<span class="mono" style="color:#5b7a9d;font-weight:600">${eur(r.amount)}</span>`
      : `<span class="mono ${r.isIncome ? "amount-in" : "amount-out"}">${r.isIncome ? "+" : "−"}${eur(r.amount)}</span>`;
    row.innerHTML = `
      <div class="movement-left">
        <span class="movement-icon">${icon}</span>
        <div>
          <div class="movement-cat">${r.category}</div>
          <div class="movement-meta">${meta}${new Date(r.date).toLocaleDateString("it-IT")}</div>
        </div>
      </div>
      ${amountHtml}`;
    recentEl.appendChild(row);
  });
}

/* ───────────────── STATS ───────────────── */
let pieChart = null, barChart = null;
function renderStats() {
  const thisMonth = monthKey(todayISO());
  const monthExpenses = expenses.filter((e) => monthKey(e.date) === thisMonth);
  const content = document.getElementById("statsContent");

  if (monthExpenses.length === 0) {
    content.innerHTML = `<div class="empty" style="padding:40px 0;text-align:center">Nessuna spesa questo mese: i grafici appariranno appena aggiungi qualcosa.</div>`;
    return;
  }

  const byCategory = EXPENSE_CATEGORIES.map((c) => ({
    name: c.name, value: monthExpenses.filter((e) => e.category === c.name).reduce((s, e) => s + e.amount, 0), color: c.color,
  })).filter((c) => c.value > 0);

  const byUser = { Pietro: 0, Marianna: 0 };
  monthExpenses.forEach((e) => {
    if (e.user === "Entrambi") { byUser.Pietro += e.amount / 2; byUser.Marianna += e.amount / 2; }
    else if (byUser[e.user] !== undefined) byUser[e.user] += e.amount;
  });

  const allKeys = Array.from(new Set([...expenses.map((e) => e.date), ...incomes.map((i) => i.date)].map(monthKey))).sort().slice(-6);
  const trendLabels = allKeys.map((k) => monthLabel(k).split(" ")[0]);
  const trendIn = allKeys.map((k) => incomes.filter((i) => monthKey(i.date) === k).reduce((s, i) => s + i.amount, 0));
  const trendOut = allKeys.map((k) => expenses.filter((e) => monthKey(e.date) === k).reduce((s, e) => s + e.amount, 0));

  content.innerHTML = `
    <div class="section-title">Ripartizione per categoria — ${monthLabel(thisMonth)}</div>
    <div class="chart-wrap"><canvas id="pieCanvas"></canvas></div>
    <div class="legend">${byCategory.map((c) => `<div class="legend-item"><span class="legend-dot" style="background:${c.color}"></span>${c.name} ${eur(c.value)}</div>`).join("")}</div>
    <div class="section-title">Pietro vs Marianna (quota 50/50)</div>
    <div class="stats-cards">
      <div class="stats-card"><div class="name">Pietro</div><div class="val">${eur(byUser.Pietro)}</div></div>
      <div class="stats-card"><div class="name">Marianna</div><div class="val">${eur(byUser.Marianna)}</div></div>
    </div>
    <div class="section-title">Andamento entrate / uscite</div>
    <div class="chart-wrap2"><canvas id="barCanvas"></canvas></div>
  `;

  if (pieChart) pieChart.destroy();
  if (barChart) barChart.destroy();

  pieChart = new Chart(document.getElementById("pieCanvas"), {
    type: "doughnut",
    data: { labels: byCategory.map((c) => c.name), datasets: [{ data: byCategory.map((c) => c.value), backgroundColor: byCategory.map((c) => c.color), borderWidth: 0 }] },
    options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => eur(ctx.parsed) } } }, cutout: "60%" },
  });

  barChart = new Chart(document.getElementById("barCanvas"), {
    type: "bar",
    data: { labels: trendLabels, datasets: [
      { label: "Entrate", data: trendIn, backgroundColor: "#7c9473", borderRadius: 4 },
      { label: "Uscite", data: trendOut, backgroundColor: "#b6633f", borderRadius: 4 },
    ]},
    options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ctx.dataset.label + ": " + eur(ctx.parsed.y) } } }, scales: { x: { grid: { display: false } }, y: { grid: { color: "#ddd5c4" } } } },
  });
}

/* ───────────────── MAIN RENDER ───────────────── */
function render() {
  buildAddForm();
  renderDashboard();
  if (document.getElementById("page-history").classList.contains("active")) renderHistory();
  if (document.getElementById("page-stats").classList.contains("active")) renderStats();
}

/* ───────────────── BOOT ───────────────── */
buildAddForm();
initFirebase();

/* Register service worker for offline/installable support */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}
