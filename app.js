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
/* Somma mesi a una data ISO tenendo il giorno del mese quando possibile:
   31 gennaio + 1 mese = 28/29 febbraio, non 3 marzo. */
function addMonthsISO(dateStr, months) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const t = new Date(y, m - 1 + months, 1);
  const lastDay = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
  t.setDate(Math.min(d, lastDay));
  const pad = (n) => String(n).padStart(2, "0");
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
}
const FREQUENCIES = [
  { key: "1m", label: "Mensile", months: 1 },
  { key: "2m", label: "Bimestrale", months: 2 },
  { key: "3m", label: "Trimestrale", months: 3 },
  { key: "6m", label: "Semestrale", months: 6 },
  { key: "12m", label: "Annuale", months: 12 },
];
function freqLabel(key) { const f = FREQUENCIES.find((x) => x.key === key); return f ? f.label.toLowerCase() : "mensile"; }
function freqMonths(key) { const f = FREQUENCIES.find((x) => x.key === key); return f ? f.months : 1; }
function daysUntil(dateStr) {
  const today = new Date(todayISO());
  const due = new Date(dateStr);
  return Math.round((due - today) / 86400000);
}


/* ═══════════════════════════════════════════════════════════════
   ACCESSI AUTORIZZATI — devono coincidere con le regole Firestore
   ═══════════════════════════════════════════════════════════════ */
const ALLOWED_EMAILS = ["pmirisola16@gmail.com", "mariannaguarnieri20@gmail.com"];

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

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
let recurrings = [];
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

  db.collection("ledger").doc("recurring").onSnapshot((doc) => {
    recurrings = doc.exists ? (doc.data().items || []) : [];
    render();
  }, (err) => showError("Errore lettura spese ricorrenti: " + err.message));

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

/* Rinomina una categoria (e/o cambia icona) aggiornando anche tutte le spese
   già registrate e le spese ricorrenti che la usano, in un'unica scrittura. */
async function renameCategory(oldName, newNameRaw, newIconRaw) {
  const newName = (newNameRaw || "").trim();
  if (!newName) { toast("Inserisci un nome per la categoria"); return false; }
  if (EXPENSE_CATEGORIES.some((c) => c.name !== oldName && c.name.toLowerCase() === newName.toLowerCase())) {
    toast("Esiste già una categoria con questo nome"); return false;
  }
  const old = EXPENSE_CATEGORIES.find((c) => c.name === oldName);
  if (!old) return false;
  const newIcon = (newIconRaw || "").trim() || old.icon;

  EXPENSE_CATEGORIES = EXPENSE_CATEGORIES.map((c) => (c.name === oldName ? { ...c, name: newName, icon: newIcon } : c));
  const touched = expenses.filter((e) => e.category === oldName).length;
  expenses = expenses.map((e) => (e.category === oldName ? { ...e, category: newName } : e));
  recurrings = recurrings.map((r) => (r.category === oldName ? { ...r, category: newName } : r));
  if (selCategory === oldName) selCategory = newName;
  if (selRecCategory === oldName) selRecCategory = newName;
  render();

  if (!firebaseReady) { showError("Firebase non configurato: le modifiche non verranno salvate."); return true; }
  setSyncing(true);
  try {
    const batch = db.batch();
    batch.set(db.collection("ledger").doc("categories"), { list: EXPENSE_CATEGORIES });
    batch.set(db.collection("ledger").doc("expenses"), { items: expenses });
    batch.set(db.collection("ledger").doc("recurring"), { items: recurrings });
    await batch.commit();
    clearError();
    toast(touched ? `Categoria aggiornata su ${touched} ${touched === 1 ? "spesa" : "spese"}` : "Categoria aggiornata");
  } catch (e) {
    showError("Modifica categoria non riuscita: " + e.message);
  } finally {
    setSyncing(false);
  }
  return true;
}

function closeCategoryEdit() {
  document.getElementById("accountOverlay").style.display = "none";
}

function openCategoryEdit(name) {
  const c = EXPENSE_CATEGORIES.find((x) => x.name === name);
  if (!c) return;
  const used = expenses.filter((e) => e.category === name).length;
  const isVector = c.icon && c.icon.startsWith("ti:");
  const card = document.getElementById("accountModalCard");
  card.innerHTML = `
    <div class="modal-title"><span style="display:flex;align-items:center;gap:9px">${iconWrap(c.icon, c.color)}Modifica categoria</span><button class="modal-close" id="catEditCloseBtn"><i class="ti ti-x"></i></button></div>
    <div class="field">
      <div class="field-label">Nome</div>
      <input class="input" id="catEditName" value="${c.name.replace(/"/g, "&quot;")}">
    </div>
    <div class="field">
      <div class="field-label">Icona (emoji — lascia vuoto per tenere quella attuale)</div>
      <input class="input" id="catEditIcon" style="width:80px;text-align:center" maxlength="4" value="${isVector ? "" : (c.icon || "")}" placeholder="${isVector ? "—" : "🏷️"}">
    </div>
    <div style="font-size:12px;color:#9C8F84;margin-bottom:14px">${used ? `Il nuovo nome verrà applicato anche alle <strong>${used}</strong> ${used === 1 ? "spesa già registrata" : "spese già registrate"} con questa categoria.` : "Nessuna spesa registrata con questa categoria."}</div>
    <button class="submit-btn" style="background:#3A332D" id="catEditSaveBtn">Salva modifiche</button>`;
  document.getElementById("accountOverlay").style.display = "flex";
  document.getElementById("catEditCloseBtn").onclick = closeCategoryEdit;
  document.getElementById("catEditSaveBtn").onclick = async () => {
    const ok = await renameCategory(name, document.getElementById("catEditName").value, document.getElementById("catEditIcon").value);
    if (ok) closeCategoryEdit();
  };
}

function removeCategory(name) {
  const used = expenses.some((e) => e.category === name);
  const msg = used
    ? `"${name}" è usata in alcune spese già registrate. Se la elimini quelle spese restano nello storico ma non compariranno più nei grafici. Se vuoi solo cambiarle nome, usa la matita. Eliminarla comunque?`
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

/* ───────────────── SPESE RICORRENTI ───────────────── */
function addRecurring(entry) {
  recurrings = [{ ...entry, id: uid() }, ...recurrings];
  persist("recurring", { items: recurrings });
  render();
}

function deleteRecurring(id) {
  const r = recurrings.find((x) => x.id === id);
  if (!r) return;
  if (!confirm(`Eliminare la spesa ricorrente "${r.note || r.category}"? Le spese già registrate restano nello storico.`)) return;
  recurrings = recurrings.filter((x) => x.id !== id);
  persist("recurring", { items: recurrings });
  render();
  toast("Spesa ricorrente eliminata");
}

/* Registra la rata in scadenza come spesa vera e sposta avanti il prossimo addebito */
function confirmRecurring(id) {
  const r = recurrings.find((x) => x.id === id);
  if (!r) return;
  const dueDate = r.nextDate;
  recurrings = recurrings.map((x) => (x.id === id ? { ...x, nextDate: addMonthsISO(x.nextDate, freqMonths(x.frequency)) } : x));
  persist("recurring", { items: recurrings });
  addExpense({
    amount: Number(r.amount), category: r.category, user: r.user,
    account: r.account, note: r.note || "", date: dueDate,
  });
  toast(`${r.note || r.category} · ${eur(r.amount)} registrata`);
}

/* Salta questa rata senza registrarla (es. mese non pagato) */
function skipRecurring(id) {
  const r = recurrings.find((x) => x.id === id);
  if (!r) return;
  if (!confirm(`Saltare questa rata di "${r.note || r.category}" senza registrarla?`)) return;
  const next = addMonthsISO(r.nextDate, freqMonths(r.frequency));
  recurrings = recurrings.map((x) => (x.id === id ? { ...x, nextDate: next } : x));
  persist("recurring", { items: recurrings });
  render();
  toast(`Rinviata al ${new Date(next).toLocaleDateString("it-IT")}`);
}

/* ───────────────── RINVIO SCADENZE ───────────────── */
let postponeId = null;

function closePostpone() {
  document.getElementById("postponeOverlay").style.display = "none";
  postponeId = null;
}

function openPostpone(id) {
  const item = deadlines.find((d) => d.id === id);
  if (!item) return;
  postponeId = id;
  const card = document.getElementById("postponeModalCard");
  card.innerHTML = `
    <div class="modal-title">Rinvia scadenza<button class="modal-close" id="postCloseBtn"><i class="ti ti-x"></i></button></div>
    <div class="field">
      <div class="field-label">${item.title}</div>
      <div style="font-size:12px;color:#9C8F84;margin-bottom:12px">Attualmente prevista il ${new Date(item.dueDate).toLocaleDateString("it-IT")}</div>
    </div>
    <div class="field">
      <div class="field-label">Nuova data</div>
      <input class="input" type="date" id="postDate" value="${item.dueDate}">
    </div>
    <button class="submit-btn" style="background:#7B93AE" id="postSaveBtn">Sposta a questa data</button>`;
  document.getElementById("postponeOverlay").style.display = "flex";
  document.getElementById("postCloseBtn").onclick = closePostpone;
  document.getElementById("postSaveBtn").onclick = () => {
    const val = document.getElementById("postDate").value;
    if (!val) { toast("Scegli una data"); return; }
    deadlines = deadlines.map((d) => (d.id === postponeId ? { ...d, dueDate: val } : d));
    persist("deadlines", { items: deadlines });
    closePostpone();
    render();
    toast(`Rinviata al ${new Date(val).toLocaleDateString("it-IT")}`);
  };
}

document.getElementById("postponeOverlay").addEventListener("click", (ev) => {
  if (ev.target.id === "postponeOverlay") closePostpone();
});

/* ───────────────── GESTIONE CONTI (dalle card in Home) ───────────────── */
function closeAccountModal() {
  document.getElementById("accountOverlay").style.display = "none";
}

function openAccountModal(acc) {
  const card = document.getElementById("accountModalCard");
  card.innerHTML = `
    <div class="modal-title">${acc}<button class="modal-close" id="accCloseBtn"><i class="ti ti-x"></i></button></div>
    <div class="field">
      <div class="field-label">Saldo attuale (€)</div>
      <input class="input" id="accBalInput" type="text" inputmode="decimal" pattern="[0-9.,-]*" value="${balances[acc] ?? 0}">
      <div style="font-size:11px;color:#B0A296;margin-top:6px">Correggi qui il saldo se non coincide con quello della banca.</div>
    </div>
    <button class="submit-btn bal-save-btn" style="background:#3A332D" id="accSaveBtn">Salva saldo</button>
    <button class="delete-link-btn" id="accDeleteBtn">Elimina conto</button>`;
  document.getElementById("accountOverlay").style.display = "flex";
  document.getElementById("accCloseBtn").onclick = closeAccountModal;
  document.getElementById("accSaveBtn").onclick = () => {
    const val = parseAmount(document.getElementById("accBalInput").value) || 0;
    updateBalance(acc, val);
    closeAccountModal();
    toast(`Saldo ${acc} aggiornato`);
  };
  document.getElementById("accDeleteBtn").onclick = () => {
    closeAccountModal();
    removeAccount(acc);
  };
}

function openNewAccountModal() {
  const card = document.getElementById("accountModalCard");
  card.innerHTML = `
    <div class="modal-title">Nuovo conto<button class="modal-close" id="accCloseBtn"><i class="ti ti-x"></i></button></div>
    <div class="field">
      <div class="field-label">Nome</div>
      <input class="input" id="newAccName" placeholder="es. Cassa, PayPal…">
    </div>
    <div class="field">
      <div class="field-label">Saldo iniziale (€)</div>
      <input class="input" id="newAccBal" type="text" inputmode="decimal" pattern="[0-9.,-]*" value="0">
    </div>
    <button class="submit-btn" style="background:#7c9473" id="addAccBtn">Aggiungi conto</button>`;
  document.getElementById("accountOverlay").style.display = "flex";
  document.getElementById("accCloseBtn").onclick = closeAccountModal;
  document.getElementById("addAccBtn").onclick = () => {
    const name = document.getElementById("newAccName").value.trim();
    const bal = parseAmount(document.getElementById("newAccBal").value) || 0;
    if (!name) { toast("Inserisci un nome per il conto"); return; }
    if (ACCOUNTS.some((a) => a.toLowerCase() === name.toLowerCase())) { toast("Esiste già un conto con questo nome"); return; }
    closeAccountModal();
    addAccount(name);
    if (bal) updateBalance(name, bal);
  };
}

document.getElementById("accountOverlay").addEventListener("click", (ev) => {
  if (ev.target.id === "accountOverlay") closeAccountModal();
});

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

/* ───────────────── DETTAGLIO CATEGORIA (dai grafici) ───────────────── */
let catDetailName = null;

function closeCatDetail() {
  document.getElementById("catOverlay").style.display = "none";
  catDetailName = null;
}

function openCatDetail(name) {
  catDetailName = name;
  renderCatDetail();
  document.getElementById("catOverlay").style.display = "flex";
}

function renderCatDetail() {
  if (!catDetailName) return;
  const card = document.getElementById("catModalCard");
  const name = catDetailName;
  const cat = EXPENSE_CATEGORIES.find((c) => c.name === name);
  const color = cat ? cat.color : ICON_OTHER.color;
  const icon = cat ? cat.icon : ICON_OTHER.icon;

  const inPeriod = statsPeriod === "anno"
    ? (d) => String(new Date(d).getFullYear()) === statsYear
    : (d) => monthKey(d) === statsMonth;
  const periodLabel = statsPeriod === "anno" ? `Anno ${statsYear}` : monthLabel(statsMonth);

  const list = expenses
    .filter((e) => e.category === name && inPeriod(e.date))
    .sort((a, b) => new Date(b.date) - new Date(a.date) || String(b.id).localeCompare(String(a.id)));
  const total = list.reduce((s, e) => s + e.amount, 0);

  let html = `<div class="modal-title"><span style="display:flex;align-items:center;gap:9px">${iconWrap(icon, color)}${name}</span><button class="modal-close" id="catCloseBtn"><i class="ti ti-x"></i></button></div>`;
  html += `<div class="cat-detail-head">
      <div class="eyebrow" style="color:#9C8F84">${periodLabel} · ${list.length} ${list.length === 1 ? "movimento" : "movimenti"}</div>
      <div class="val" style="color:${color}">${eur(total)}</div>
    </div>`;

  if (list.length === 0) {
    html += `<div class="empty">Nessuna spesa di questa categoria nel periodo.</div><div style="height:16px"></div>`;
    card.innerHTML = html;
    document.getElementById("catCloseBtn").onclick = closeCatDetail;
    return;
  }

  html += `<div class="cat-detail-hint">Tocca una voce per modificarla o eliminarla.</div><div id="catDetailList"></div><div style="height:16px"></div>`;
  card.innerHTML = html;
  document.getElementById("catCloseBtn").onclick = closeCatDetail;

  const listEl = document.getElementById("catDetailList");
  list.forEach((item) => {
    const row = document.createElement("div");
    row.className = "movement";
    const meta = (item.account ? `${item.user} · ${item.account}` : item.user);
    row.innerHTML = `
      <div class="movement-left">
        ${iconWrap(icon, color)}
        <div>
          <div class="movement-cat">${item.note ? item.note : name}</div>
          <div class="movement-meta">${meta} · ${new Date(item.date).toLocaleDateString("it-IT")}</div>
        </div>
      </div>
      <div class="mono amount-out">${eur(item.amount)}</div>`;
    row.onclick = () => { closeCatDetail(); openEditModal("spesa", item.id); };
    listEl.appendChild(row);
  });
}

document.getElementById("catOverlay").addEventListener("click", (ev) => {
  if (ev.target.id === "catOverlay") closeCatDetail();
});

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

document.getElementById("fabAddExpense").addEventListener("click", () => {
  document.querySelectorAll(".nav button").forEach((b) => b.classList.remove("active"));
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
  document.querySelector('.nav button[data-page="add"]').classList.add("active");
  document.getElementById("page-add").classList.add("active");
  document.querySelector('[data-addtab="spesa"]').click();
  setTimeout(() => document.getElementById("expAmount").focus(), 50);
});

document.getElementById("seeAllMovements").addEventListener("click", () => {
  document.querySelectorAll(".nav button").forEach((b) => b.classList.remove("active"));
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
  document.querySelector('.nav button[data-page="history"]').classList.add("active");
  document.getElementById("page-history").classList.add("active");
  renderHistory();
});

/* ───────────────── ADD TABS ───────────────── */
document.querySelectorAll("[data-addtab]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("[data-addtab]").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("add-spesa").style.display = btn.dataset.addtab === "spesa" ? "block" : "none";
    document.getElementById("add-entrata").style.display = btn.dataset.addtab === "entrata" ? "block" : "none";
    document.getElementById("add-giroconto").style.display = btn.dataset.addtab === "giroconto" ? "block" : "none";
    document.getElementById("add-ricorrente").style.display = btn.dataset.addtab === "ricorrente" ? "block" : "none";
  });
});

/* ───────────────── BUILD ADD FORM STATIC PARTS ───────────────── */
let selCategory = "Spesa", selUser = "Entrambi", selIncomeType = INCOME_TYPES[0], selIncomeAccount = ACCOUNTS[0];
let selExpAccount = ACCOUNTS[0];
let selTrfFrom = ACCOUNTS[0], selTrfTo = ACCOUNTS[1];
let selRecCategory = "Affitto/Mutuo", selRecUser = "Entrambi", selRecAccount = ACCOUNTS[0], selRecFreq = "1m";

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
    row.innerHTML = `<span>${catIconHtml(c.icon)} ${c.name}</span><span style="display:flex;gap:4px"><button class="cat-edit-btn" style="color:#9C8F84;font-size:15px;padding:0 6px"><i class="ti ti-pencil"></i></button><button class="cat-del-btn" style="color:#B65C6B;font-size:15px;padding:0 6px"><i class="ti ti-x"></i></button></span>`;
    row.querySelector(".cat-edit-btn").onclick = () => openCategoryEdit(c.name);
    row.querySelector(".cat-del-btn").onclick = () => removeCategory(c.name);
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

  /* — pannello spese ricorrenti — */
  const recCatGrid = document.getElementById("recCategoryGrid");
  recCatGrid.innerHTML = "";
  if (!EXPENSE_CATEGORIES.some((c) => c.name === selRecCategory)) selRecCategory = EXPENSE_CATEGORIES[0] ? EXPENSE_CATEGORIES[0].name : "";
  EXPENSE_CATEGORIES.forEach((c) => {
    const b = document.createElement("button");
    b.className = "chip" + (c.name === selRecCategory ? " active" : "");
    if (c.name === selRecCategory) { b.style.background = c.color; b.style.color = "#fff"; b.style.borderColor = c.color; }
    b.innerHTML = `<span class="ic">${catIconHtml(c.icon)}</span>${c.name}`;
    b.onclick = () => { selRecCategory = c.name; buildAddForm(); };
    recCatGrid.appendChild(b);
  });

  const recAccGrid = document.getElementById("recAccountGrid");
  recAccGrid.innerHTML = "";
  ACCOUNTS.forEach((a) => {
    const b = document.createElement("button");
    b.className = a === selRecAccount ? "active" : "";
    b.textContent = a;
    b.onclick = () => { selRecAccount = a; buildAddForm(); };
    recAccGrid.appendChild(b);
  });

  const recUserRow = document.getElementById("recUserRow");
  recUserRow.innerHTML = "";
  USERS.forEach((u) => {
    const b = document.createElement("button");
    b.className = u === selRecUser ? "active" : "";
    b.textContent = u;
    b.onclick = () => { selRecUser = u; buildAddForm(); };
    recUserRow.appendChild(b);
  });

  const recFreqGrid = document.getElementById("recFreqGrid");
  recFreqGrid.innerHTML = "";
  FREQUENCIES.forEach((f) => {
    const b = document.createElement("button");
    b.className = f.key === selRecFreq ? "active" : "";
    b.textContent = f.label;
    b.onclick = () => { selRecFreq = f.key; buildAddForm(); };
    recFreqGrid.appendChild(b);
  });

  const recListEl = document.getElementById("recList");
  recListEl.innerHTML = "";
  if (recurrings.length === 0) {
    recListEl.innerHTML = `<div class="empty">Nessuna spesa ricorrente — aggiungine una qui sotto.</div>`;
  } else {
    [...recurrings].sort((a, b) => a.nextDate.localeCompare(b.nextDate)).forEach((r) => {
      const cat = EXPENSE_CATEGORIES.find((c) => c.name === r.category);
      const row = document.createElement("div");
      row.className = "movement";
      row.style.cursor = "default";
      row.innerHTML = `
        <div class="movement-left">
          ${iconWrap(cat ? cat.icon : ICON_OTHER.icon, cat ? cat.color : ICON_OTHER.color)}
          <div>
            <div class="movement-cat">${r.note || r.category}</div>
            <div class="movement-meta">${freqLabel(r.frequency)} · ${r.account} · prossima ${new Date(r.nextDate).toLocaleDateString("it-IT")}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <div class="mono amount-out">${eur(r.amount)}</div>
          <button class="del-btn"><i class="ti ti-x"></i></button>
        </div>`;
      row.querySelector(".del-btn").onclick = () => deleteRecurring(r.id);
      recListEl.appendChild(row);
    });
  }

}

document.getElementById("editOverlay").addEventListener("click", (ev) => {
  if (ev.target.id === "editOverlay") closeEditModal();
});

document.getElementById("expDate").value = todayISO();
document.getElementById("incDate").value = todayISO();
document.getElementById("trfDate").value = todayISO();
document.getElementById("dlDate").value = todayISO();
document.getElementById("recDate").value = todayISO();

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
wireAmountHint("recAmount", "recAmountHint");

document.getElementById("recSubmit").onclick = () => {
  const val = parseAmount(document.getElementById("recAmount").value);
  if (!val || val <= 0) { toast("Inserisci un importo valido"); return; }
  const dateVal = document.getElementById("recDate").value || todayISO();
  addRecurring({
    amount: val, category: selRecCategory, user: selRecUser, account: selRecAccount,
    note: document.getElementById("recNote").value.trim(), frequency: selRecFreq, nextDate: dateVal,
  });
  toast("Spesa ricorrente aggiunta");
  document.getElementById("recAmount").value = "";
  const rh = document.getElementById("recAmountHint"); if (rh) { rh.textContent = ""; rh.className = "amount-hint"; }
  document.getElementById("recNote").value = "";
};

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
let histTab = "spese", histPeriod = "mese", histMonth = monthKey(todayISO()), histYear = String(new Date().getFullYear());

document.querySelectorAll("[data-histtab]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("[data-histtab]").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    histTab = btn.dataset.histtab;
    renderHistory();
  });
});

document.querySelectorAll("[data-histperiod]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("[data-histperiod]").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    histPeriod = btn.dataset.histperiod;
    renderHistory();
  });
});

function histInPeriod(dateStr) {
  return histPeriod === "anno" ? String(new Date(dateStr).getFullYear()) === histYear : monthKey(dateStr) === histMonth;
}

function renderHistory() {
  const allDates = [...expenses.map((e) => e.date), ...incomes.map((i) => i.date), ...transfers.map((t) => t.date)];

  let months = Array.from(new Set(allDates.map(monthKey))).sort().reverse();
  if (months.length === 0) months = [monthKey(todayISO())];
  if (!months.includes(histMonth)) histMonth = months[0];

  let years = Array.from(new Set(allDates.map((d) => String(new Date(d).getFullYear())))).sort().reverse();
  if (years.length === 0) years = [String(new Date().getFullYear())];
  if (!years.includes(histYear)) histYear = years[0];

  const chipRow = document.getElementById("monthChipRow");
  chipRow.innerHTML = "";
  if (histPeriod === "anno") {
    years.forEach((y) => {
      const b = document.createElement("button");
      b.className = y === histYear ? "active" : "";
      b.textContent = y;
      b.onclick = () => { histYear = y; renderHistory(); };
      chipRow.appendChild(b);
    });
  } else {
    months.forEach((m) => {
      const b = document.createElement("button");
      b.className = m === histMonth ? "active" : "";
      b.textContent = monthLabel(m);
      b.onclick = () => { histMonth = m; renderHistory(); };
      chipRow.appendChild(b);
    });
  }

  const periodLabel = histPeriod === "anno" ? `anno ${histYear}` : monthLabel(histMonth);
  const list = (histTab === "spese" ? expenses : histTab === "entrate" ? incomes : transfers)
    .filter((item) => histInPeriod(item.date))
    .sort((a, b) => new Date(b.date) - new Date(a.date) || String(b.id).localeCompare(String(a.id)));
  const total = list.reduce((s, e) => s + e.amount, 0);
  document.getElementById("histTotalLine").innerHTML = histTab === "giroconti"
    ? `Totale spostato — ${periodLabel}: <strong style="color:#3A332D">${eur(total)}</strong>`
    : `Totale ${histTab} — ${periodLabel}: <strong style="color:#3A332D">${eur(total)}</strong>`;

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

function buildStatementRows(periodFilter) {
  const rows = [];
  expenses.filter((e) => periodFilter(e.date)).forEach((e) => rows.push({
    date: e.date, tipo: "Spesa",
    desc: e.category + (e.note ? " · " + e.note : ""),
    chi: e.account ? `${e.user} · ${e.account}` : e.user,
    entrata: null, uscita: e.amount, giroconto: null,
  }));
  incomes.filter((i) => periodFilter(i.date)).forEach((i) => rows.push({
    date: i.date, tipo: "Entrata",
    desc: i.type + (i.note ? " · " + i.note : ""),
    chi: i.account,
    entrata: i.amount, uscita: null, giroconto: null,
  }));
  transfers.filter((t) => periodFilter(t.date)).forEach((t) => rows.push({
    date: t.date, tipo: "Giroconto",
    desc: `${t.from} → ${t.to}` + (t.note ? " · " + t.note : ""),
    chi: "",
    entrata: null, uscita: null, giroconto: t.amount,
  }));
  rows.sort((a, b) => new Date(a.date) - new Date(b.date) || a.tipo.localeCompare(b.tipo));
  return rows;
}

function exportStatementPdf(periodFilter, periodLabel, filenameSuffix) {
  const rows = buildStatementRows(periodFilter);
  if (rows.length === 0) { toast("Nessun movimento nel periodo selezionato"); return; }
  if (typeof window.jspdf === "undefined") { toast("Libreria PDF non caricata: controlla la connessione"); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const totalIn = rows.reduce((s, r) => s + (r.entrata || 0), 0);
  const totalOut = rows.reduce((s, r) => s + (r.uscita || 0), 0);
  const totalTrf = rows.reduce((s, r) => s + (r.giroconto || 0), 0);

  doc.setFont("helvetica", "bold"); doc.setFontSize(16);
  doc.text("Libro di Casa — Pietro & Marianna", 40, 44);
  doc.setFont("helvetica", "normal"); doc.setFontSize(11);
  doc.text(`Estratto conto · ${periodLabel}`, 40, 62);
  doc.setFontSize(9); doc.setTextColor(140, 130, 115);
  doc.text(`Generato il ${new Date().toLocaleDateString("it-IT")}`, 40, 76);
  doc.setTextColor(58, 51, 45);

  const body = rows.map((r) => [
    new Date(r.date).toLocaleDateString("it-IT"),
    r.tipo,
    r.desc,
    r.chi || "",
    r.entrata ? eur(r.entrata) : "",
    r.uscita ? eur(r.uscita) : "",
    r.giroconto ? eur(r.giroconto) : "",
  ]);

  doc.autoTable({
    startY: 90,
    head: [["Data", "Tipo", "Descrizione", "Chi/Conto", "Entrata", "Uscita", "Giroconto"]],
    body,
    styles: { font: "helvetica", fontSize: 8.5, cellPadding: 5, textColor: [58, 51, 45] },
    headStyles: { fillColor: [58, 51, 45], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [251, 243, 236] },
    columnStyles: {
      4: { halign: "right", textColor: [124, 148, 115] },
      5: { halign: "right", textColor: [193, 120, 111] },
      6: { halign: "right", textColor: [123, 147, 174] },
    },
    margin: { left: 40, right: 40 },
  });

  let y = doc.lastAutoTable.finalY + 26;
  doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text(`Totale entrate: ${eur(totalIn)}`, 40, y);
  doc.text(`Totale uscite: ${eur(totalOut)}`, 40, y + 16);
  doc.text(`Saldo netto del periodo: ${eur(totalIn - totalOut)}`, 40, y + 32);
  y += totalTrf ? 48 : 32;
  if (totalTrf) { doc.text(`Totale girocontato: ${eur(totalTrf)}`, 40, y); y += 16; }

  y += 12;
  doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text("Saldi conti (istantanea attuale):", 40, y);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  ACCOUNTS.forEach((acc, i) => doc.text(`${acc}: ${eur(balances[acc])}`, 40, y + 16 * (i + 1)));

  doc.save(`estratto-conto-libro-di-casa-${filenameSuffix}.pdf`);
  toast("PDF generato");
}

document.getElementById("pdfBtn").onclick = () => {
  const periodFilter = histPeriod === "anno"
    ? (d) => String(new Date(d).getFullYear()) === histYear
    : (d) => monthKey(d) === histMonth;
  const periodLabel = histPeriod === "anno" ? `Anno ${histYear}` : monthLabel(histMonth);
  const suffix = histPeriod === "anno" ? histYear : histMonth;
  exportStatementPdf(periodFilter, periodLabel, suffix);
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

  /* Promemoria spese ricorrenti scadute o in scadenza oggi */
  const today = todayISO();
  const duePending = recurrings
    .filter((r) => r.nextDate <= today)
    .sort((a, b) => a.nextDate.localeCompare(b.nextDate));
  const recWrap = document.getElementById("dashRecurringWrap");
  const recEl = document.getElementById("dashRecurring");
  if (duePending.length === 0) {
    recWrap.style.display = "none";
  } else {
    recWrap.style.display = "block";
    recEl.innerHTML = "";
    duePending.forEach((r) => {
      const cat = EXPENSE_CATEGORIES.find((c) => c.name === r.category);
      const late = daysUntil(r.nextDate);
      const row = document.createElement("div");
      row.className = "dash-deadline";
      row.innerHTML = `
        <div class="movement-left">
          ${iconWrap(cat ? cat.icon : ICON_OTHER.icon, cat ? cat.color : ICON_OTHER.color)}
          <div>
            <div class="movement-cat">${r.note || r.category}</div>
            <div class="movement-meta">${eur(r.amount)} · ${r.account} · ${late === 0 ? "oggi" : `da ${Math.abs(late)} giorni`}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          <button class="rec-do"><i class="ti ti-check"></i>Registra</button>
          <button class="rec-skip"><i class="ti ti-player-skip-forward"></i></button>
        </div>`;
      row.querySelector(".rec-do").onclick = () => confirmRecurring(r.id);
      row.querySelector(".rec-skip").onclick = () => skipRecurring(r.id);
      recEl.appendChild(row);
    });
  }

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
    el.innerHTML = `<div class="name">${acc}<span class="edit-hint"><i class="ti ti-pencil"></i></span></div><div class="val">${eur(balances[acc])}</div>`;
    el.onclick = () => openAccountModal(acc);
    grid.appendChild(el);
  });
  const addCard = document.createElement("div");
  addCard.className = "account-card add";
  addCard.innerHTML = `<i class="ti ti-plus" style="font-size:15px"></i>Nuovo conto`;
  addCard.onclick = openNewAccountModal;
  grid.appendChild(addCard);

  const recent = [
    ...expenses,
    ...incomes.map((i) => ({ ...i, category: i.type, isIncome: true })),
    ...transfers.map((t) => ({ ...t, category: `${t.from} → ${t.to}`, isTransfer: true })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 2);
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
          <div class="movement-meta"><span style="color:${dlColor(days)};font-weight:600">${dlLabel(days)}</span> · ${new Date(item.dueDate).toLocaleDateString("it-IT")}${item.note ? " · " + item.note : ""}${item.recurrence !== "none" ? " · si ripete" : ""}</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:6px">
        <button class="dl-done" title="Rinvia"><i class="ti ti-calendar-event"></i></button>
        <button class="dl-done"><i class="ti ti-check"></i></button>
        <button class="del-btn" data-id="${item.id}"><i class="ti ti-x"></i></button>
      </div>`;
    const btns = row.querySelectorAll(".dl-done");
    btns[0].onclick = () => openPostpone(item.id);
    btns[1].onclick = () => completeDeadline(item.id);
    row.querySelector(".del-btn").onclick = () => deleteDeadline(item.id);
    listEl.appendChild(row);
  });
}

/* ───────────────── STATS ───────────────── */
let pieChart = null, barChart = null;
let statsPeriod = "mese", statsMonth = monthKey(todayISO()), statsYear = String(new Date().getFullYear());

function renderStats() {
  const allDates = [...expenses.map((e) => e.date), ...incomes.map((i) => i.date)];

  let months = Array.from(new Set(allDates.map(monthKey))).sort().reverse();
  if (months.length === 0) months = [monthKey(todayISO())];
  if (!months.includes(statsMonth)) statsMonth = months[0];

  let years = Array.from(new Set(allDates.map((d) => String(new Date(d).getFullYear())))).sort().reverse();
  if (years.length === 0) years = [String(new Date().getFullYear())];
  if (!years.includes(statsYear)) statsYear = years[0];

  const periodExpenses = statsPeriod === "anno"
    ? expenses.filter((e) => String(new Date(e.date).getFullYear()) === statsYear)
    : expenses.filter((e) => monthKey(e.date) === statsMonth);
  const periodLabel = statsPeriod === "anno" ? `anno ${statsYear}` : monthLabel(statsMonth);

  const content = document.getElementById("statsContent");
  const pdfBtn = document.getElementById("statsPdfBtn");

  const toggleHtml = `
    <div class="row-btns" id="statsPeriodRow" style="margin-bottom:12px">
      <button id="statsModeMese" class="${statsPeriod === "mese" ? "active" : ""}">Mese</button>
      <button id="statsModeAnno" class="${statsPeriod === "anno" ? "active" : ""}">Anno</button>
    </div>
    <div class="chip-row" id="statsChipRow"></div>`;

  function wireControls() {
    document.getElementById("statsModeMese").onclick = () => { statsPeriod = "mese"; renderStats(); };
    document.getElementById("statsModeAnno").onclick = () => { statsPeriod = "anno"; renderStats(); };
    const chipRow = document.getElementById("statsChipRow");
    chipRow.innerHTML = "";
    if (statsPeriod === "anno") {
      years.forEach((y) => {
        const b = document.createElement("button");
        b.className = y === statsYear ? "active" : "";
        b.textContent = y;
        b.onclick = () => { statsYear = y; renderStats(); };
        chipRow.appendChild(b);
      });
    } else {
      months.forEach((m) => {
        const b = document.createElement("button");
        b.className = m === statsMonth ? "active" : "";
        b.textContent = monthLabel(m);
        b.onclick = () => { statsMonth = m; renderStats(); };
        chipRow.appendChild(b);
      });
    }
  }

  if (periodExpenses.length === 0) {
    content.innerHTML = toggleHtml + `<div class="empty" style="padding:40px 0;text-align:center">Nessuna spesa in questo periodo: i grafici appariranno appena aggiungi qualcosa.</div>`;
    wireControls();
    pdfBtn.style.display = "none";
    return;
  }
  pdfBtn.style.display = "block";

  const byCategory = EXPENSE_CATEGORIES.map((c) => ({
    name: c.name, value: periodExpenses.filter((e) => e.category === c.name).reduce((s, e) => s + e.amount, 0), color: c.color,
  })).filter((c) => c.value > 0);

  const byUser = { Pietro: 0, Marianna: 0 };
  periodExpenses.forEach((e) => {
    if (e.user === "Entrambi") { byUser.Pietro += e.amount / 2; byUser.Marianna += e.amount / 2; }
    else if (byUser[e.user] !== undefined) byUser[e.user] += e.amount;
  });

  let trendLabels, trendIn, trendOut;
  if (statsPeriod === "anno") {
    const keys = MONTHS.map((_, idx) => `${statsYear}-${idx}`);
    trendLabels = MONTHS;
    trendIn = keys.map((k) => incomes.filter((i) => monthKey(i.date) === k).reduce((s, i) => s + i.amount, 0));
    trendOut = keys.map((k) => expenses.filter((e) => monthKey(e.date) === k).reduce((s, e) => s + e.amount, 0));
  } else {
    const allKeys = Array.from(new Set(allDates.map(monthKey))).sort().slice(-6);
    trendLabels = allKeys.map((k) => monthLabel(k).split(" ")[0]);
    trendIn = allKeys.map((k) => incomes.filter((i) => monthKey(i.date) === k).reduce((s, i) => s + i.amount, 0));
    trendOut = allKeys.map((k) => expenses.filter((e) => monthKey(e.date) === k).reduce((s, e) => s + e.amount, 0));
  }

  content.innerHTML = toggleHtml + `
    <div class="section-title">Ripartizione per categoria — ${periodLabel}</div>
    <div class="chart-wrap"><canvas id="pieCanvas"></canvas></div>
    <div class="legend">${byCategory.map((c) => `<div class="legend-item" data-cat="${c.name.replace(/"/g, "&quot;")}"><span class="legend-dot" style="background:${c.color}"></span>${c.name} ${eur(c.value)}<i class="ti ti-chevron-right" style="font-size:12px;color:#C7B9AC"></i></div>`).join("")}</div>
    <div class="section-title">Pietro vs Marianna (quota 50/50) — ${periodLabel}</div>
    <div class="stats-cards">
      <div class="stats-card"><div class="name">Pietro</div><div class="val">${eur(byUser.Pietro)}</div></div>
      <div class="stats-card"><div class="name">Marianna</div><div class="val">${eur(byUser.Marianna)}</div></div>
    </div>
    <div class="section-title">Andamento entrate / uscite${statsPeriod === "anno" ? " — " + statsYear : ""}</div>
    <div class="chart-wrap2"><canvas id="barCanvas"></canvas></div>
  `;
  wireControls();

  document.querySelectorAll("#statsContent .legend-item").forEach((el) => {
    el.onclick = () => openCatDetail(el.dataset.cat);
  });

  if (pieChart) pieChart.destroy();
  if (barChart) barChart.destroy();

  pieChart = new Chart(document.getElementById("pieCanvas"), {
    type: "doughnut",
    data: { labels: byCategory.map((c) => c.name), datasets: [{ data: byCategory.map((c) => c.value), backgroundColor: byCategory.map((c) => c.color), borderWidth: 0 }] },
    options: {
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => eur(ctx.parsed) } } },
      cutout: "60%",
      onClick: (evt, elements) => {
        if (elements && elements.length) openCatDetail(byCategory[elements[0].index].name);
      },
      onHover: (evt, elements) => {
        evt.native.target.style.cursor = elements && elements.length ? "pointer" : "default";
      },
    },
  });

  barChart = new Chart(document.getElementById("barCanvas"), {
    type: "bar",
    data: { labels: trendLabels, datasets: [
      { label: "Entrate", data: trendIn, backgroundColor: "#7c9473", borderRadius: 4 },
      { label: "Uscite", data: trendOut, backgroundColor: "#C1786F", borderRadius: 4 },
    ]},
    options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ctx.dataset.label + ": " + eur(ctx.parsed.y) } } }, scales: { x: { grid: { display: false } }, y: { grid: { color: "#EFE3D8" } } } },
  });

  pdfBtn.onclick = () => {
    if (typeof window.jspdf === "undefined") { toast("Libreria PDF non caricata: controlla la connessione"); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    doc.setFont("helvetica", "bold"); doc.setFontSize(16);
    doc.text("Libro di Casa — Pietro & Marianna", 40, 44);
    doc.setFont("helvetica", "normal"); doc.setFontSize(11);
    doc.text(`Riepilogo grafici · ${periodLabel}`, 40, 62);
    doc.setFontSize(9); doc.setTextColor(140, 130, 115);
    doc.text(`Generato il ${new Date().toLocaleDateString("it-IT")}`, 40, 76);
    doc.setTextColor(58, 51, 45);

    const pieImg = document.getElementById("pieCanvas").toDataURL("image/png", 1.0);
    doc.addImage(pieImg, "PNG", 40, 96, 220, 220);

    doc.setFontSize(11); doc.setFont("helvetica", "bold");
    doc.text("Per categoria:", 300, 106);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
    byCategory.forEach((c, i) => {
      const rowY = 122 + i * 16;
      const [r, g, b] = hexToRgb(c.color);
      doc.setFillColor(r, g, b);
      doc.rect(300, rowY - 7, 8, 8, "F");
      doc.setTextColor(58, 51, 45);
      doc.text(`${c.name}: ${eur(c.value)}`, 313, rowY);
    });

    let y2 = 96 + 220 + 30;
    doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    doc.text("Pietro vs Marianna (quota 50/50):", 40, y2);
    doc.setFont("helvetica", "normal");
    doc.text(`Pietro: ${eur(byUser.Pietro)}    Marianna: ${eur(byUser.Marianna)}`, 40, y2 + 16);

    const barImg = document.getElementById("barCanvas").toDataURL("image/png", 1.0);
    doc.addImage(barImg, "PNG", 40, y2 + 34, 500, 180);

    doc.save(`riepilogo-grafici-libro-di-casa-${statsPeriod === "anno" ? statsYear : statsMonth}.pdf`);
    toast("PDF generato");
  };
}

/* ───────────────── MAIN RENDER ───────────────── */
function render() {
  buildAddForm();
  renderDashboard();
  if (document.getElementById("page-history").classList.contains("active")) renderHistory();
  if (document.getElementById("page-stats").classList.contains("active")) renderStats();
  if (document.getElementById("page-scadenze").classList.contains("active")) renderDeadlines();
  if (catDetailName) renderCatDetail();
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

/* ───────────────── CHIUSURA TASTIERA ───────────────── */
/* Il tasto "invio"/"fine" della tastierina chiude la tastiera invece di non fare nulla. */
document.addEventListener("keydown", (e) => {
  const t = e.target;
  if (e.key !== "Enter" || !t || t.tagName !== "INPUT" || t.type === "date") return;
  e.preventDefault();
  t.blur();
});

/* Dopo aver registrato un movimento la tastiera si chiude da sola. */
document.addEventListener("click", (e) => {
  if (!e.target.closest(".submit-btn, .bal-save-btn, #addAccBtn, #addCatBtn")) return;
  const active = document.activeElement;
  if (active && active.tagName === "INPUT") active.blur();
}, true);

/* Mostra "Fine" al posto di "Invio" sulla tastiera del telefono. */
document.addEventListener("focusin", (e) => {
  const t = e.target;
  if (t && t.tagName === "INPUT" && t.type !== "date") t.setAttribute("enterkeyhint", "done");
});
