/* ───────────────── DATA MODEL ───────────────── */
/* Icone: prefisso "ti:" = icona vettoriale curata; senza prefisso = emoji digitata dall'utente */
const DEFAULT_CATEGORIES = [
  { name: "Spesa", icon: "ti:shopping-cart", color: "#7C9473" },
  { name: "Bollette", icon: "ti:bolt", color: "#C99A3E" },
  { name: "Affitto/Mutuo", icon: "ti:home", color: "#7B93AE" },
  { name: "Ristoranti", icon: "ti:tools-kitchen-2", color: "#C1786F" },
  { name: "Trasporti", icon: "ti:car", color: "#9C8AA5" },
  { name: "Salute", icon: "ti:pill", color: "#BD6E7A" },
  { name: "Abbigliamento", icon: "ti:shirt", color: "#6FA08C" },
  { name: "Bimbo", icon: "ti:baby-carriage", color: "#D69A6B" },
  { name: "Svago", icon: "ti:movie", color: "#9089B8" },
  { name: "Altro", icon: "ti:package", color: "#B0A296" },
];
let EXPENSE_CATEGORIES = [...DEFAULT_CATEGORIES];
const CAT_PALETTE = ["#7C9473","#C99A3E","#7B93AE","#C1786F","#9C8AA5","#BD6E7A","#6FA08C","#D69A6B","#9089B8","#B0A296","#8C6E5E","#A8927E"];
const DEADLINE_CATEGORIES = [
  { name: "Assicurazione auto", icon: "ti:car", color: "#7B93AE" },
  { name: "Revisione auto", icon: "ti:tool", color: "#9C8AA5" },
  { name: "Bollo auto", icon: "ti:file-text", color: "#C99A3E" },
  { name: "Cambio gomme", icon: "ti:disc", color: "#B0A296" },
  { name: "Manutenzione casa", icon: "ti:home", color: "#C1786F" },
  { name: "Altro", icon: "ti:pin", color: "#8C6E5E" },
];
const ICON_INCOME = { icon: "ti:wallet", color: "#7C9473" };
const ICON_TRANSFER = { icon: "ti:arrows-exchange", color: "#7B93AE" };
const ICON_OTHER = { icon: "ti:package", color: "#B0A296" };
/* Renderizza un'icona: vettoriale se prefissata "ti:", altrimenti emoji testuale digitata dall'utente */
function catIconHtml(icon) {
  return icon && icon.startsWith("ti:") ? `<i class="ti ti-${icon.slice(3)}"></i>` : (icon || "🏷️");
}
/* Tinta chiara calcolata al volo da un colore esadecimale, per lo sfondo del cerchietto icona */
function tintOf(hex) {
  const h = (hex || "#B0A296").replace("#", "");
  const r = parseInt(h.substr(0, 2), 16), g = parseInt(h.substr(2, 2), 16), b = parseInt(h.substr(4, 2), 16);
  const mix = (c) => Math.round(c + (255 - c) * 0.82);
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
}
function iconWrap(icon, color) {
  const inner = icon && icon.startsWith("ti:")
    ? `<i class="ti ti-${icon.slice(3)}" style="color:${color}"></i>`
    : `<span style="font-size:15px">${icon || "🏷️"}</span>`;
  return `<span class="movement-icon-wrap" style="background:${tintOf(color)}">${inner}</span>`;
}
const INCOME_TYPES = ["Stipendio Pietro", "Stipendio Marianna", "Entrata secondaria"];
const USERS = ["Pietro", "Marianna", "Entrambi"];
let ACCOUNTS = ["Intesa", "BP", "Revolut", "BCC"];
const MONTHS = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];
function addMonthsISO(dateStr, months) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}
function daysUntil(dateStr) {
  const today = new Date(todayISO());
  const due = new Date(dateStr);
  return Math.round((due - today) / 86400000);
}


/* ═══════════════════════════════════════════════════════════════
   ACCESSI AUTORIZZATI — devono coincidere con le regole Firestore
   ═══════════════════════════════════════════════════════════════ */
const ALLOWED_EMAILS = ["pmirisola16@gmail.com", "mariannaguarnieri20@gmail.com"];

function eur(n) {
  n = Number(n || 0);
  const neg = n < 0;
  const fixed = Math.abs(n).toFixed(2);
  let [intPart, decPart] = fixed.split(".");
  intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return "€" + (neg ? "-" : "") + intPart + "," + decPart;
}
/* Interpreta un importo scritto in qualsiasi formato comune: "50", "50,00",
   "50,20", "50.20", con o senza simbolo €, con o senza spazi. Se compaiono
   sia virgola che punto, l'ultimo dei due è considerato separatore decimale. */
function parseAmount(raw) {
  if (raw === null || raw === undefined) return NaN;
  let s = String(raw).trim();
  if (!s) return NaN;
  s = s.replace(/[^0-9.,-]/g, "");
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (lastComma > -1) {
    s = s.replace(",", ".");
  }
  return parseFloat(s);
}
function monthKey(d) { const x = new Date(d); return `${x.getFullYear()}-${x.getMonth()}`; }
function monthLabel(k) { const [y, m] = k.split("-"); return `${MONTHS[parseInt(m)]} ${y}`; }
function todayISO() { return new Date().toISOString().slice(0, 10); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

/* ───────────────── STATE ───────────────── */
let expenses = [];
let incomes = [];
let transfers = [];
let deadlines = [];
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

  firebase.auth().onAuthStateChanged((user) => {
    if (!user) { showLogin(); return; }
    if (!ALLOWED_EMAILS.includes((user.email || "").toLowerCase())) {
      firebase.auth().signOut();
      showLogin("L'account " + (user.email || "") + " non e' autorizzato per questo libro.");
      return;
    }
    hideLogin();
    document.getElementById("userBadge").textContent = (user.displayName || user.email || "").split(" ")[0];
    if (firebaseReady) return;
    firebaseReady = true;
    attachListeners();
  });

  firebase.auth().getRedirectResult().catch((err) => {
    showLogin("Accesso non riuscito: " + err.message);
  });
}

/* ───────────────── LOGIN GOOGLE ───────────────── */
function showLogin(msg) {
  document.getElementById("loadingBox").style.display = "none";
  document.getElementById("loginOverlay").style.display = "flex";
  const box = document.getElementById("loginMsg");
  if (msg) { box.textContent = msg; box.style.display = "block"; }
  else { box.style.display = "none"; }
}

function hideLogin() {
  document.getElementById("loginOverlay").style.display = "none";
}

function doGoogleLogin() {
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  document.getElementById("loginMsg").style.display = "none";
  firebase.auth().signInWithPopup(provider).catch((err) => {
    // Alcuni browser (Safari in PWA, popup bloccati) rifiutano la finestra:
    // in quel caso si ripiega sul redirect a pagina intera.
    if (["auth/popup-blocked", "auth/popup-closed-by-user", "auth/cancelled-popup-request", "auth/operation-not-supported-in-this-environment"].includes(err.code)) {
      firebase.auth().signInWithRedirect(provider).catch((e2) => showLogin("Accesso non riuscito: " + e2.message));
    } else {
      showLogin("Accesso non riuscito: " + err.message);
    }
  });
}

function doLogout() {
  if (!confirm("Uscire dal libro di casa su questo dispositivo?")) return;
  firebase.auth().signOut().then(() => location.reload());
}

function attachListeners() {
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

  db.collection("ledger").doc("deadlines").onSnapshot((doc) => {
    deadlines = doc.exists ? (doc.data().items || []) : [];
    render();
  }, (err) => showError("Errore lettura scadenze: " + err.message));

  db.collection("ledger").doc("categories").onSnapshot((doc) => {
    if (doc.exists && Array.isArray(doc.data().list) && doc.data().list.length) {
      EXPENSE_CATEGORIES = doc.data().list;
    } else {
      persist("categories", { list: EXPENSE_CATEGORIES });
    }
    render();
  }, (err) => showError("Errore lettura categorie: " + err.message));

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
    ? '<span class="dot" style="background:#C1786F"></span>salvo…'
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

/* Salva insieme un elenco di movimenti e i saldi aggiornati, in un'unica operazione */
async function persistWithBalances(docName, items, newBalances) {
  if (!firebaseReady) { showError("Firebase non configurato: le modifiche non verranno salvate."); return; }
  setSyncing(true);
  try {
    const batch = db.batch();
    batch.set(db.collection("ledger").doc(docName), { items });
    batch.set(db.collection("ledger").doc("balances"), newBalances);
    await batch.commit();
    clearError();
  } catch (e) {
    showError("Salvataggio non riuscito: " + e.message);
  } finally {
    setSyncing(false);
  }
}

function addExpense(entry) {
  const newBalances = { ...balances };
  if (entry.account) newBalances[entry.account] = Number(newBalances[entry.account] || 0) - entry.amount;
  expenses = [{ ...entry, id: uid() }, ...expenses];
  balances = newBalances;
  render();
  persistWithBalances("expenses", expenses, newBalances);
}

function addIncome(entry) {
  const newBalances = { ...balances };
  if (entry.account) newBalances[entry.account] = Number(newBalances[entry.account] || 0) + entry.amount;
  incomes = [{ ...entry, id: uid() }, ...incomes];
  balances = newBalances;
  render();
  persistWithBalances("incomes", incomes, newBalances);
}

function deleteExpense(id) {
  const e = expenses.find((x) => x.id === id);
  if (!e) return;
  const newBalances = { ...balances };
  if (e.account) newBalances[e.account] = Number(newBalances[e.account] || 0) + e.amount;
  expenses = expenses.filter((x) => x.id !== id);
  balances = newBalances;
  render();
  persistWithBalances("expenses", expenses, newBalances);
}

function deleteIncome(id) {
  const i = incomes.find((x) => x.id === id);
  if (!i) return;
  const newBalances = { ...balances };
  if (i.account) newBalances[i.account] = Number(newBalances[i.account] || 0) - i.amount;
  incomes = incomes.filter((x) => x.id !== id);
  balances = newBalances;
  render();
  persistWithBalances("incomes", incomes, newBalances);
}
function updateExpense(id, entry) {
  const old = expenses.find((x) => x.id === id);
  if (!old) return;
  const newBalances = { ...balances };
  if (old.account) newBalances[old.account] = Number(newBalances[old.account] || 0) + old.amount;
  if (entry.account) newBalances[entry.account] = Number(newBalances[entry.account] || 0) - entry.amount;
  expenses = expenses.map((x) => (x.id === id ? { ...entry, id } : x));
  balances = newBalances;
  render();
  persistWithBalances("expenses", expenses, newBalances);
}

function updateIncome(id, entry) {
  const old = incomes.find((x) => x.id === id);
  if (!old) return;
  const newBalances = { ...balances };
  if (old.account) newBalances[old.account] = Number(newBalances[old.account] || 0) - old.amount;
  if (entry.account) newBalances[entry.account] = Number(newBalances[entry.account] || 0) + entry.amount;
  incomes = incomes.map((x) => (x.id === id ? { ...entry, id } : x));
  balances = newBalances;
  render();
  persistWithBalances("incomes", incomes, newBalances);
}

async function updateTransfer(id, entry) {
  const old = transfers.find((x) => x.id === id);
  if (!old) return;
  const newBalances = { ...balances };
  newBalances[old.from] = Number(newBalances[old.from] || 0) + old.amount;
  newBalances[old.to] = Number(newBalances[old.to] || 0) - old.amount;
  newBalances[entry.from] = Number(newBalances[entry.from] || 0) - entry.amount;
  newBalances[entry.to] = Number(newBalances[entry.to] || 0) + entry.amount;
  const newTransfers = transfers.map((x) => (x.id === id ? { ...entry, id } : x));
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
    showError("Salvataggio modifica non riuscito: " + e.message);
  } finally {
    setSyncing(false);
  }
}

function updateBalance(acc, val) {
  balances = { ...balances, [acc]: val };
  persist("balances", balances);
  render();
}

function addCategory(name, icon) {
  const clean = name.trim();
  if (!clean) { toast("Inserisci un nome per la categoria"); return; }
  if (EXPENSE_CATEGORIES.some((c) => c.name.toLowerCase() === clean.toLowerCase())) { toast("Esiste già una categoria con questo nome"); return; }
  const color = CAT_PALETTE[EXPENSE_CATEGORIES.length % CAT_PALETTE.length];
  EXPENSE_CATEGORIES = [...EXPENSE_CATEGORIES, { name: clean, icon: (icon || "").trim() || "🏷️", color }];
  persist("categories", { list: EXPENSE_CATEGORIES });
  render();
  toast(`Categoria "${clean}" aggiunta`);
}

function removeCategory(name) {
  const used = expenses.some((e) => e.category === name);
  const msg = used
    ? `"${name}" è usata in alcune spese già registrate. Eliminarla comunque? Lo storico resterà invariato, ma la categoria sparirà dalle scelte future.`
    : `Eliminare la categoria "${name}"?`;
  if (!confirm(msg)) return;
  EXPENSE_CATEGORIES = EXPENSE_CATEGORIES.filter((c) => c.name !== name);
  if (selCategory === name) selCategory = EXPENSE_CATEGORIES[0] ? EXPENSE_CATEGORIES[0].name : "";
  persist("categories", { list: EXPENSE_CATEGORIES });
  render();
  toast(`Categoria "${name}" eliminata`);
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

function addDeadline(entry) {
  deadlines = [{ ...entry, id: uid() }, ...deadlines];
  persist("deadlines", { items: deadlines });
  render();
}
function deleteDeadline(id) {
  deadlines = deadlines.filter((d) => d.id !== id);
  persist("deadlines", { items: deadlines });
  render();
  toast("Scadenza eliminata");
}
function completeDeadline(id) {
  const item = deadlines.find((d) => d.id === id);
  if (!item) return;
  if (item.recurrence && item.recurrence !== "none") {
    const months = item.recurrence === "6m" ? 6 : 12;
    const newDate = addMonthsISO(item.dueDate, months);
    deadlines = deadlines.map((d) => (d.id === id ? { ...d, dueDate: newDate } : d));
    toast(`Rinnovata al ${new Date(newDate).toLocaleDateString("it-IT")}`);
  } else {
    deadlines = deadlines.filter((d) => d.id !== id);
    toast("Scadenza completata");
  }
  persist("deadlines", { items: deadlines });
  render();
}

/* ───────────────── EDIT MODAL ───────────────── */
let editState = null; // { kind: 'spesa'|'entrata'|'giroconto', id, data }

function closeEditModal() {
  document.getElementById("editOverlay").style.display = "none";
  editState = null;
}

function openEditModal(kind, id) {
  let item;
  if (kind === "spesa") item = expenses.find((e) => e.id === id);
  else if (kind === "entrata") item = incomes.find((i) => i.id === id);
  else item = transfers.find((t) => t.id === id);
  if (!item) return;
  editState = { kind, id, data: { ...item } };
  renderEditModal();
  document.getElementById("editOverlay").style.display = "flex";
}

function syncEditInputs() {
  if (!editState) return;
  const amt = document.getElementById("editAmount");
  const note = document.getElementById("editNote");
  const date = document.getElementById("editDate");
  if (amt) editState.data.amount = amt.value;
  if (note) editState.data.note = note.value;
  if (date) editState.data.date = date.value;
}

function renderEditModal() {
  const card = document.getElementById("editModalCard");
  const { kind, data } = editState;
  const title = kind === "spesa" ? "Modifica spesa" : kind === "entrata" ? "Modifica entrata" : "Modifica giroconto";

  let html = `<div class="modal-title">${title}<button class="modal-close" id="editCloseBtn"><i class="ti ti-x"></i></button></div>`;
  html += `<div class="field"><div class="field-label">Importo (€)</div><input class="input" id="editAmount" inputmode="decimal" value="${String(data.amount).replace(".", ",")}"></div>`;

  if (kind === "spesa") {
    html += `<div class="field"><div class="field-label">Categoria</div><div class="chip-grid" id="editCategoryGrid"></div></div>`;
    html += `<div class="field"><div class="field-label">Pagato con</div><div class="acc-grid4" id="editAccountGrid"></div></div>`;
    html += `<div class="field"><div class="field-label">Chi paga</div><div class="row-btns" id="editUserRow"></div></div>`;
  } else if (kind === "entrata") {
    html += `<div class="field"><div class="field-label">Tipo di entrata</div><div class="income-list" id="editIncTypeList"></div></div>`;
    html += `<div class="field"><div class="field-label">Accreditato su</div><div class="acc-grid4" id="editAccountGrid"></div></div>`;
  } else {
    html += `<div class="field"><div class="field-label">Da conto</div><div class="acc-grid4" id="editFromGrid"></div></div>`;
    html += `<div class="field"><div class="field-label">A conto</div><div class="acc-grid4" id="editToGrid"></div></div>`;
  }

  html += `<div class="field"><div class="field-label">Nota (opzionale)</div><input class="input" id="editNote" value="${(data.note || "").replace(/"/g, "&quot;")}"></div>`;
  html += `<div class="field"><div class="field-label">Data</div><input class="input" type="date" id="editDate" value="${data.date}"></div>`;
  html += `<button class="submit-btn" style="background:#3A332D" id="editSaveBtn">Salva modifiche</button>`;
  html += `<button class="delete-link-btn" id="editDeleteBtn">Elimina movimento</button>`;

  card.innerHTML = html;
  document.getElementById("editCloseBtn").onclick = closeEditModal;

  if (kind === "spesa") {
    const catGrid = document.getElementById("editCategoryGrid");
    EXPENSE_CATEGORIES.forEach((c) => {
      const b = document.createElement("button");
      b.className = "chip" + (c.name === data.category ? " active" : "");
      if (c.name === data.category) { b.style.background = c.color; b.style.color = "#fff"; b.style.borderColor = c.color; }
      b.innerHTML = `<span class="ic">${catIconHtml(c.icon)}</span>${c.name}`;
      b.onclick = () => { syncEditInputs(); editState.data.category = c.name; renderEditModal(); };
      catGrid.appendChild(b);
    });
    const accGrid = document.getElementById("editAccountGrid");
    ACCOUNTS.forEach((a) => {
      const b = document.createElement("button");
      b.className = a === data.account ? "active" : "";
      b.textContent = a;
      b.onclick = () => { syncEditInputs(); editState.data.account = a; renderEditModal(); };
      accGrid.appendChild(b);
    });
    const userRow = document.getElementById("editUserRow");
    USERS.forEach((u) => {
      const b = document.createElement("button");
      b.className = u === data.user ? "active" : "";
      b.textContent = u;
      b.onclick = () => { syncEditInputs(); editState.data.user = u; renderEditModal(); };
      userRow.appendChild(b);
    });
  } else if (kind === "entrata") {
    const incList = document.getElementById("editIncTypeList");
    INCOME_TYPES.forEach((t) => {
      const b = document.createElement("button");
      b.className = t === data.type ? "active" : "";
      b.textContent = t;
      b.onclick = () => { syncEditInputs(); editState.data.type = t; renderEditModal(); };
      incList.appendChild(b);
    });
    const accGrid = document.getElementById("editAccountGrid");
    ACCOUNTS.forEach((a) => {
      const b = document.createElement("button");
      b.className = a === data.account ? "active" : "";
      b.textContent = a;
      b.onclick = () => { syncEditInputs(); editState.data.account = a; renderEditModal(); };
      accGrid.appendChild(b);
    });
  } else {
    const fromGrid = document.getElementById("editFromGrid");
    ACCOUNTS.forEach((a) => {
      const b = document.createElement("button");
      b.className = a === data.from ? "active" : "";
      b.textContent = a;
      b.onclick = () => { syncEditInputs(); editState.data.from = a; renderEditModal(); };
      fromGrid.appendChild(b);
    });
    const toGrid = document.getElementById("editToGrid");
    ACCOUNTS.forEach((a) => {
      const b = document.createElement("button");
      b.className = a === data.to ? "active" : "";
      b.textContent = a;
      b.onclick = () => { syncEditInputs(); editState.data.to = a; renderEditModal(); };
      toGrid.appendChild(b);
    });
  }

  document.getElementById("editSaveBtn").onclick = () => {
    syncEditInputs();
    const val = parseAmount(editState.data.amount);
    if (!val || val <= 0) { toast("Inserisci un importo valido"); return; }
    const date = editState.data.date || todayISO();
    const note = editState.data.note || "";
    if (editState.kind === "spesa") {
      updateExpense(editState.id, { amount: val, category: editState.data.category, user: editState.data.user, account: editState.data.account, note, date });
    } else if (editState.kind === "entrata") {
      updateIncome(editState.id, { amount: val, type: editState.data.type, account: editState.data.account, note, date });
    } else {
      if (editState.data.from === editState.data.to) { toast("Scegli due conti diversi"); return; }
      updateTransfer(editState.id, { amount: val, from: editState.data.from, to: editState.data.to, note, date });
    }
    toast("Movimento aggiornato");
    closeEditModal();
  };

  document.getElementById("editDeleteBtn").onclick = () => {
    const kindNow = editState.kind, idNow = editState.id;
    closeEditModal();
    if (kindNow === "spesa") deleteExpense(idNow);
    else if (kindNow === "entrata") deleteIncome(idNow);
    else deleteTransfer(idNow);
    toast("Movimento eliminato");
  };
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
    if (btn.dataset.page === "scadenze") renderDeadlines();
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
let selExpAccount = ACCOUNTS[0];
let selTrfFrom = ACCOUNTS[0], selTrfTo = ACCOUNTS[1];

function buildAddForm() {
  const catGrid = document.getElementById("expCategoryGrid");
  catGrid.innerHTML = "";
  EXPENSE_CATEGORIES.forEach((c) => {
    const b = document.createElement("button");
    b.className = "chip" + (c.name === selCategory ? " active" : "");
    if (c.name === selCategory) { b.style.background = c.color; b.style.color = "#fff"; b.style.borderColor = c.color; }
    b.innerHTML = `<span class="ic">${catIconHtml(c.icon)}</span>${c.name}`;
    b.onclick = () => { selCategory = c.name; buildAddForm(); };
    catGrid.appendChild(b);
  });

  const expAccGrid = document.getElementById("expAccountGrid");
  expAccGrid.innerHTML = "";
  ACCOUNTS.forEach((a) => {
    const b = document.createElement("button");
    b.className = a === selExpAccount ? "active" : "";
    b.textContent = a;
    b.onclick = () => { selExpAccount = a; buildAddForm(); };
    expAccGrid.appendChild(b);
  });

  const catDelList = document.getElementById("catDeleteList");
  catDelList.innerHTML = "";
  EXPENSE_CATEGORIES.forEach((c) => {
    const row = document.createElement("div");
    row.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #EFE3D8;font-size:13px";
    row.innerHTML = `<span>${catIconHtml(c.icon)} ${c.name}</span><button style="color:#B65C6B;font-size:15px;padding:0 6px"><i class="ti ti-x"></i></button>`;
    row.querySelector("button").onclick = () => removeCategory(c.name);
    catDelList.appendChild(row);
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
        <input class="input" style="flex:1" id="bal-${acc}" type="text" inputmode="decimal" pattern="[0-9.,-]*" value="${balances[acc] ?? 0}">
        <button data-acc="${acc}" class="bal-save-btn">Salva</button>
        <button data-acc="${acc}" class="bal-del-btn" style="background:#fff;color:#B65C6B;border:1px solid #EFE3D8;padding:0 12px;border-radius:10px"><i class="ti ti-x"></i></button>
      </div>`;
    balForm.appendChild(wrap);
    wrap.querySelector(".bal-save-btn").onclick = () => {
      const val = parseAmount(document.getElementById(`bal-${acc}`).value) || 0;
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

document.getElementById("editOverlay").addEventListener("click", (ev) => {
  if (ev.target.id === "editOverlay") closeEditModal();
});

document.getElementById("expDate").value = todayISO();
document.getElementById("incDate").value = todayISO();
document.getElementById("trfDate").value = todayISO();
document.getElementById("dlDate").value = todayISO();

let selDlCategory = DEADLINE_CATEGORIES[0].name;
let selDlRecurrence = "none";
const RECURRENCE_OPTIONS = [
  { key: "none", label: "Mai" },
  { key: "6m", label: "6 mesi" },
  { key: "12m", label: "1 anno" },
];

function buildDeadlineForm() {
  const catGrid = document.getElementById("dlCategoryGrid");
  catGrid.innerHTML = "";
  DEADLINE_CATEGORIES.forEach((c) => {
    const b = document.createElement("button");
    b.className = "chip" + (c.name === selDlCategory ? " active" : "");
    if (c.name === selDlCategory) { b.style.background = c.color; b.style.color = "#fff"; b.style.borderColor = c.color; }
    b.innerHTML = `<span class="ic">${catIconHtml(c.icon)}</span>${c.name}`;
    b.onclick = () => { selDlCategory = c.name; buildDeadlineForm(); };
    catGrid.appendChild(b);
  });

  const recRow = document.getElementById("dlRecurrenceRow");
  recRow.innerHTML = "";
  RECURRENCE_OPTIONS.forEach((r) => {
    const b = document.createElement("button");
    b.className = r.key === selDlRecurrence ? "active" : "";
    b.textContent = r.label;
    b.onclick = () => { selDlRecurrence = r.key; buildDeadlineForm(); };
    recRow.appendChild(b);
  });
}

document.getElementById("dlSubmit").onclick = () => {
  const dateVal = document.getElementById("dlDate").value;
  if (!dateVal) { toast("Scegli una data di scadenza"); return; }
  const customTitle = document.getElementById("dlTitle").value.trim();
  const title = selDlCategory === "Altro" && customTitle ? customTitle : (customTitle || selDlCategory);
  addDeadline({
    title, category: selDlCategory, dueDate: dateVal,
    recurrence: selDlRecurrence, note: document.getElementById("dlNote").value,
  });
  toast(`Scadenza "${title}" aggiunta`);
  document.getElementById("dlTitle").value = "";
  document.getElementById("dlNote").value = "";
};

document.getElementById("toggleCatEdit").onclick = () => {
  const box = document.getElementById("catEditBox");
  box.style.display = box.style.display === "none" ? "block" : "none";
};

document.getElementById("addCatBtn").onclick = () => {
  addCategory(document.getElementById("newCatName").value, document.getElementById("newCatIcon").value);
  document.getElementById("newCatName").value = "";
  document.getElementById("newCatIcon").value = "";
};

/* ───────────────── ANTEPRIMA IMPORTO IN TEMPO REALE ───────────────── */
function wireAmountHint(inputId, hintId) {
  const input = document.getElementById(inputId);
  const hint = document.getElementById(hintId);
  if (!input || !hint) return;
  input.addEventListener("input", () => {
    const raw = input.value.trim();
    if (!raw) { hint.textContent = ""; hint.className = "amount-hint"; return; }
    const val = parseAmount(raw);
    if (!val || val <= 0 || isNaN(val)) {
      hint.textContent = "Importo non riconosciuto";
      hint.className = "amount-hint bad";
    } else {
      hint.textContent = "= " + eur(val);
      hint.className = "amount-hint ok";
    }
  });
}
wireAmountHint("expAmount", "expAmountHint");
wireAmountHint("incAmount", "incAmountHint");
wireAmountHint("trfAmount", "trfAmountHint");

document.getElementById("expSubmit").onclick = () => {
  const raw = document.getElementById("expAmount").value;
  const val = parseAmount(raw);
  if (!val || val <= 0) { toast("Inserisci un importo valido"); return; }
  addExpense({
    amount: val, category: selCategory, user: selUser, account: selExpAccount,
    note: document.getElementById("expNote").value, date: document.getElementById("expDate").value || todayISO(),
  });
  toast(`Spesa di ${eur(val)} scalata da ${selExpAccount}`);
  document.getElementById("expAmount").value = "";
  const eh = document.getElementById("expAmountHint"); if (eh) eh.textContent = "";
  document.getElementById("expNote").value = "";
};

document.getElementById("incSubmit").onclick = () => {
  const raw = document.getElementById("incAmount").value;
  const val = parseAmount(raw);
  if (!val || val <= 0) { toast("Inserisci un importo valido"); return; }
  addIncome({
    amount: val, type: selIncomeType, account: selIncomeAccount,
    note: document.getElementById("incNote").value, date: document.getElementById("incDate").value || todayISO(),
  });
  toast(`Entrata di ${eur(val)} registrata`);
  document.getElementById("incAmount").value = "";
  const ih = document.getElementById("incAmountHint"); if (ih) ih.textContent = "";
  document.getElementById("incNote").value = "";
};

document.getElementById("trfSubmit").onclick = () => {
  const raw = document.getElementById("trfAmount").value;
  const val = parseAmount(raw);
  if (!val || val <= 0) { toast("Inserisci un importo valido"); return; }
  if (selTrfFrom === selTrfTo) { toast("Scegli due conti diversi"); return; }
  addTransfer({
    amount: val, from: selTrfFrom, to: selTrfTo,
    note: document.getElementById("trfNote").value, date: document.getElementById("trfDate").value || todayISO(),
  });
  toast(`Giroconto di ${eur(val)} da ${selTrfFrom} a ${selTrfTo} registrato`);
  document.getElementById("trfAmount").value = "";
  const th = document.getElementById("trfAmountHint"); if (th) th.textContent = "";
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
    ? `Totale spostato: <strong style="color:#3A332D">${eur(total)}</strong>`
    : `Totale ${histTab}: <strong style="color:#3A332D">${eur(total)}</strong>`;

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
    const iconHtml = histTab === "spese" ? iconWrap(cat ? cat.icon : ICON_OTHER.icon, cat ? cat.color : ICON_OTHER.color)
      : histTab === "entrate" ? iconWrap(ICON_INCOME.icon, ICON_INCOME.color)
      : iconWrap(ICON_TRANSFER.icon, ICON_TRANSFER.color);
    const catLabel = histTab === "spese" ? item.category : histTab === "entrate" ? item.type : `${item.from} → ${item.to}`;
    const metaLabel = histTab === "spese" ? (item.account ? `${item.user} · ${item.account}` : item.user) : histTab === "entrate" ? item.account : "";
    const amountClass = histTab === "spese" ? "amount-out" : histTab === "entrate" ? "amount-in" : "";
    row.innerHTML = `
      <div class="movement-left">
        ${iconHtml}
        <div>
          <div class="movement-cat">${catLabel}</div>
          <div class="movement-meta">${metaLabel ? metaLabel + " · " : ""}${new Date(item.date).toLocaleDateString("it-IT")}${item.note ? " · " + item.note : ""}</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <div class="mono ${amountClass}" style="${histTab === "giroconti" ? "color:#7B93AE;font-weight:600" : ""}">${eur(item.amount)}</div>
        <button class="del-btn" data-id="${item.id}"><i class="ti ti-x"></i></button>
      </div>`;
    row.querySelector(".del-btn").onclick = (ev) => {
      ev.stopPropagation();
      if (histTab === "spese") deleteExpense(item.id);
      else if (histTab === "entrate") deleteIncome(item.id);
      else deleteTransfer(item.id);
      toast("Movimento eliminato");
      renderHistory();
    };
    row.onclick = () => {
      const kind = histTab === "spese" ? "spesa" : histTab === "entrate" ? "entrata" : "giroconto";
      openEditModal(kind, item.id);
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
  netEl.style.color = net >= 0 ? "#7C9473" : "#C1786F";
  document.getElementById("dashIn").textContent = eur(totalIn);
  document.getElementById("dashOut").textContent = eur(totalOut);

  const totalLiquid = ACCOUNTS.reduce((s, a) => s + Number(balances[a] || 0), 0);
  document.getElementById("dashTotalLiquid").textContent = eur(totalLiquid);
  document.getElementById("dashLiquidLabel").textContent = "Dettaglio conti";

  const urgent = deadlines
    .map((d) => ({ ...d, days: daysUntil(d.dueDate) }))
    .filter((d) => d.days <= 30)
    .sort((a, b) => a.days - b.days)
    .slice(0, 3);
  const dashDlWrap = document.getElementById("dashDeadlinesWrap");
  const dashDlEl = document.getElementById("dashDeadlines");
  if (urgent.length === 0) {
    dashDlWrap.style.display = "none";
  } else {
    dashDlWrap.style.display = "block";
    dashDlEl.innerHTML = "";
    urgent.forEach((d) => {
      const cat = DEADLINE_CATEGORIES.find((c) => c.name === d.category);
      const row = document.createElement("div");
      row.className = "dash-deadline";
      row.innerHTML = `
        <div class="movement-left">
          ${iconWrap(cat ? cat.icon : ICON_OTHER.icon, cat ? cat.color : ICON_OTHER.color)}
          <div class="movement-cat">${d.title}</div>
        </div>
        <span class="dl-days mono" style="color:${dlColor(d.days)}">${dlLabel(d.days)}</span>`;
      dashDlEl.appendChild(row);
    });
  }

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
    const iconHtml = r.isTransfer ? iconWrap(ICON_TRANSFER.icon, ICON_TRANSFER.color)
      : r.isIncome ? iconWrap(ICON_INCOME.icon, ICON_INCOME.color)
      : iconWrap(cat ? cat.icon : ICON_OTHER.icon, cat ? cat.color : ICON_OTHER.color);
    const meta = r.isTransfer ? "" : (r.isIncome ? r.account : r.user) + " · ";
    const amountHtml = r.isTransfer
      ? `<span class="mono" style="color:#7B93AE;font-weight:600">${eur(r.amount)}</span>`
      : `<span class="mono ${r.isIncome ? "amount-in" : "amount-out"}">${r.isIncome ? "+" : "−"}${eur(r.amount)}</span>`;
    row.innerHTML = `
      <div class="movement-left">
        ${iconHtml}
        <div>
          <div class="movement-cat">${r.category}</div>
          <div class="movement-meta">${meta}${new Date(r.date).toLocaleDateString("it-IT")}</div>
        </div>
      </div>
      ${amountHtml}`;
    row.onclick = () => {
      const kind = r.isTransfer ? "giroconto" : r.isIncome ? "entrata" : "spesa";
      openEditModal(kind, r.id);
    };
    recentEl.appendChild(row);
  });
}

/* ───────────────── SCADENZE ───────────────── */
function dlColor(days) {
  if (days < 0) return "#B65C6B";
  if (days <= 30) return "#C99A3E";
  return "#7C9473";
}
function dlLabel(days) {
  if (days < 0) return `Scaduta da ${Math.abs(days)} giorni`;
  if (days === 0) return "Scade oggi";
  return `Tra ${days} giorni`;
}
function renderDeadlines() {
  buildDeadlineForm();
  const sorted = [...deadlines].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  const listEl = document.getElementById("deadlinesList");
  listEl.innerHTML = "";
  if (sorted.length === 0) {
    listEl.innerHTML = `<div class="empty">Nessuna scadenza salvata — aggiungine una qui sotto.</div>`;
    return;
  }
  sorted.forEach((item) => {
    const cat = DEADLINE_CATEGORIES.find((c) => c.name === item.category);
    const days = daysUntil(item.dueDate);
    const row = document.createElement("div");
    row.className = "movement";
    row.innerHTML = `
      <div class="movement-left">
        ${iconWrap(cat ? cat.icon : ICON_OTHER.icon, cat ? cat.color : ICON_OTHER.color)}
        <div>
          <div class="movement-cat">${item.title}</div>
          <div class="movement-meta">${new Date(item.dueDate).toLocaleDateString("it-IT")}${item.note ? " · " + item.note : ""}${item.recurrence !== "none" ? " · si ripete" : ""}</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span class="dl-days mono" style="color:${dlColor(days)}">${dlLabel(days)}</span>
        <button class="dl-done" data-id="${item.id}"><i class="ti ti-check"></i></button>
        <button class="del-btn" data-id="${item.id}"><i class="ti ti-x"></i></button>
      </div>`;
    row.querySelector(".dl-done").onclick = () => completeDeadline(item.id);
    row.querySelector(".del-btn").onclick = () => deleteDeadline(item.id);
    listEl.appendChild(row);
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
      { label: "Uscite", data: trendOut, backgroundColor: "#C1786F", borderRadius: 4 },
    ]},
    options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ctx.dataset.label + ": " + eur(ctx.parsed.y) } } }, scales: { x: { grid: { display: false } }, y: { grid: { color: "#EFE3D8" } } } },
  });
}

/* ───────────────── MAIN RENDER ───────────────── */
function render() {
  buildAddForm();
  renderDashboard();
  if (document.getElementById("page-history").classList.contains("active")) renderHistory();
  if (document.getElementById("page-stats").classList.contains("active")) renderStats();
  if (document.getElementById("page-scadenze").classList.contains("active")) renderDeadlines();
}

/* ───────────────── BOOT ───────────────── */
document.getElementById("loginBtn").onclick = doGoogleLogin;
document.getElementById("logoutBtn").onclick = doLogout;
buildAddForm();
buildDeadlineForm();
initFirebase();

/* Register service worker for offline/installable support */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}
