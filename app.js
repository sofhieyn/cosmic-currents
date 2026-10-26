/* =========================================================
   Cosmic Currents — all interactivity
   Data is saved in this browser (localStorage).
   Use Settings > Data to export a backup or an Excel file.
   ========================================================= */
(() => {
'use strict';

/* ---------------- Constants ---------------- */
const KEY = 'ocean-savings-v1';   // storage key kept from the first version so existing data loads
// Data that syncs between devices (everything else — privacy, animation, welcome message — stays per device)
const META_KEYS = ['v', 'name', 'period', 'sources', 'incomeTags', 'expenseTags', 'methods', 'pockets', 'schedules', 'tagsV'];
const CLOUD = window.CloudSync || {enabled: false, status: () => ({state: 'off'}), onChange() {}, start() {}, push: () => false, signIn() {}, signOut() {}};

// Welcome messages — one per visit, rotating; the name is always added at the end
const WELCOMES = [
  'Welcome back,',
  'Go make some waves today,',
  'A new star joins your constellation,',
  'The tide brought you back,',
  'Small drops make an ocean,'
];
const TIPS = [
  'Give every coin a constellation.',
  'A 3–6 month emergency fund is a calm harbour in any storm.',
  'Review your subscriptions monthly. Small leaks sink big ships.',
  'Pay yourself first, like the tide before the shore.',
  'Your galaxy grows one choice at a time.',
  'Name your goal, starts are easier to follow when they have names.'
];
const INCOME_TAGS = ['Emergency Fund', 'Life Saving', 'Retirement', 'Investment', 'Stocks & Mutual Funds', 'Gold', 'Deposit', 'Crypto',
  'Travel', 'Concert & Events', 'Hobby', 'Gadget', 'Vehicle', 'House / Down Payment', 'Renovation', 'Wedding', 'Education Fund',
  'Kids & Family', 'Health Fund', 'Insurance', 'Tax', 'Zakat & Charity', 'Holiday & Gifts', 'Business Capital', 'Debt Payoff', 'Others'];
const EXPENSE_TAGS = ['Bills & Utilities', 'Electricity & Water', 'Internet & Phone', 'Rent / Boarding', 'Subscription', 'Food & Drinks',
  'Groceries', 'Coffee & Snacks', 'Transport', 'Fuel & Parking', 'Shopping', 'Fashion', 'Beauty & Self-care', 'Health & Medicine',
  'Insurance', 'Education & Courses', 'Books', 'Entertainment', 'Hobby', 'Travel & Holiday', 'Household', 'Family', 'Social & Gifts',
  'Charity & Zakat', 'Debt / Installment', 'Credit Card Bill', 'Pets', 'Tax & Admin Fees', 'Others'];
const METHODS = ['Credit Card', 'Debit Card', 'Bank Transfer', 'Virtual Account', 'QRIS', 'GoPay', 'OVO', 'DANA', 'ShopeePay', 'LinkAja',
  'Google Play', 'App Store', 'PayPal', 'Auto-debit', 'Cash', 'Others'];
const COLORS = ['#1769aa', '#3a9bd5', '#0f3d66', '#5aa9d6', '#2b7a99', '#0a2540', '#6f9cc0', '#47607a'];
const COLOR_NAMES = ['Ocean Blue', 'Sky Blue', 'Deep Navy', 'Lagoon', 'Teal', 'Midnight', 'Mist', 'Slate'];
const CYCLES = {once: 'One-time', weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Every 3 months', yearly: 'Yearly'};
const RANGE_LABEL = {all: 'All time', day: 'Day', week: 'Week', month: 'Month', year: 'Year', period: 'Income period', custom: 'Custom dates'};
const TYPE_LABEL = {income: 'Income', expense: 'Expense', transfer: 'Transfer', withdraw: 'Withdraw'};

const IC = {
  income: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  expense: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
  records: '<path d="M5 4h14v16H5zM9 8h6M9 12h6M9 16h4"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  pocket: '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M8 6V4h8v2"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
  skip: '<path d="M6 5l8 7-8 7zM17 5v14"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  play: '<path d="M7 5l12 7-12 7z"/>'
};
const icon = (k, s = 15) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[k]}</svg>`;

/* ---------------- Helpers ---------------- */
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = s => new Date(s + 'T00:00:00');
const today = () => iso(new Date());
const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
const addMonths = (s, n) => {
  const d = parse(s), day = d.getDate();
  d.setDate(1); d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last)); return iso(d);
};
const monthStart = s => s.slice(0, 8) + '01';
const monthEnd = s => { const d = parse(s); return iso(new Date(d.getFullYear(), d.getMonth() + 1, 0)); };
const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
const fmtDate = s => s ? parse(s).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'}) : '—';
const fmtDM = s => s ? parse(s).toLocaleDateString('en-GB', {day: 'numeric', month: 'short'}) : '—';
const weekday = s => parse(s).toLocaleDateString('en-GB', {weekday: 'long'});
const rp = n => { const v = Math.round(n || 0); return (v < 0 ? '−' : '') + 'Rp ' + Math.abs(v).toLocaleString('id-ID'); };
const rpP = n => S.privacy ? 'Rp •••' : rp(n);
const amt = (n, cls = '') => `<span class="amt ${cls}">${rp(n)}</span>`;
const short = n => {
  const a = Math.abs(n), s = n < 0 ? '−' : '';
  if (a >= 1e9) return s + (a / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
  if (a >= 1e6) return s + (a / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (a >= 1e3) return s + Math.round(a / 1e3) + 'K';
  return s + Math.round(a);
};
const parseMoney = s => Number(String(s ?? '').replace(/[^\d]/g, '')) || 0;
const sum = (arr, f = x => x.amount) => arr.reduce((a, x) => a + (f(x) || 0), 0);
const sorted = arr => [...arr].sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0));
const opt = (v, l, sel) => `<option value="${esc(v)}" ${String(v) === String(sel ?? '') ? 'selected' : ''}>${esc(l)}</option>`;
const ordinal = n => { const v = n % 100; const s = ['th', 'st', 'nd', 'rd']; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
const dayText = d => d === 'last' ? 'last day of the month' : d ? `the ${ordinal(Number(d))}` : '';
const thisMonth = () => [monthStart(today()), monthEnd(today())];
const thisYear = () => [today().slice(0, 4) + '-01-01', today().slice(0, 4) + '-12-31'];

/* ---------------- State ---------------- */
function defaults() {
  const t = today();
  return {
    v: 2,
    name: 'Sofi',
    period: {start: monthStart(t), end: monthEnd(t), repeat: true},
    sources: [{id: uid(), name: 'Main Job'}, {id: uid(), name: 'Freelance'}, {id: uid(), name: 'Part-time'}],
    incomeTags: [...INCOME_TAGS],
    expenseTags: [...EXPENSE_TAGS],
    methods: [...METHODS],
    pockets: [],
    txns: [],
    schedules: [],
    welcomeIdx: -1,
    privacy: false,
    motion: true,
    tagsV: 2
  };
}
let S;
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    S = raw ? Object.assign(defaults(), JSON.parse(raw)) : defaults();
  } catch (e) { S = defaults(); }
  migrate();
}
// Upgrade data saved by older versions without losing anything
function migrate() {
  ['incomeTags', 'expenseTags', 'methods', 'pockets', 'txns', 'schedules', 'sources'].forEach(k => { if (!Array.isArray(S[k])) S[k] = []; });
  if (S.tagsV !== 2) {
    INCOME_TAGS.forEach(t => addToList(S.incomeTags, t));
    EXPENSE_TAGS.forEach(t => addToList(S.expenseTags, t));
    S.tagsV = 2;
  }
  ['incomeTags', 'expenseTags', 'methods'].forEach(k => othersLast(S[k]));
  delete S.bgUrl;
}
/* Remove sample data left over from the old "Load demo data" button (only when nothing else was added) */
function clearOldDemo() {
  const demoSources = ['PT Samudra Biru (Main Job)', 'Freelance Design', 'Weekend Barista (Part-time)'];
  const demoPockets = ['Emergency Fund', 'Japan Trip', 'Concert Fund', 'Tax Reserve', 'Bills & Utilities', 'Food & Drinks', 'Transport', 'Fun & Hobbies'];
  const isDemo = S.sources.length && S.sources.every(s => demoSources.includes(s.name)) &&
    S.pockets.length && S.pockets.every(p => demoPockets.includes(p.name));
  if (!isDemo) return false;
  const keep = {name: S.name, welcomeIdx: S.welcomeIdx, privacy: S.privacy, motion: S.motion};
  S = Object.assign(defaults(), keep);
  return true;
}
function saveLocal() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ } }
const hashStr = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) | 0; return String(h); };
function dataOf() {
  const meta = {};
  META_KEYS.forEach(k => { if (S[k] !== undefined) meta[k] = S[k]; });
  return {meta, txns: S.txns};
}
// Save on this device, and send the change to the cloud when signed in
function save() {
  if (CLOUD.enabled && S.syncUid) {
    const d = dataOf(), h = hashStr(JSON.stringify(d));
    if (CLOUD.push(d)) { S.cloudHash = h; S.unsynced = false; }
    else if (h !== S.cloudHash) S.unsynced = true;
  }
  saveLocal();
}

const ui = {
  home: {range: 'month', anchor: today(), pOff: 0},
  inc:  {range: 'all',   anchor: today(), pOff: 0, tag: '', source: '', pocket: ''},
  exp:  {range: 'month', anchor: today(), pOff: 0, tag: '', pocket: '', method: ''},
  pk:   {range: 'all',   anchor: today(), pOff: 0},
  rec:  {range: 'all',   anchor: today(), pOff: 0, q: '', type: ''},
  typedDone: false, lastRoute: ''
};

/* ---------------- Lists (tags, methods) ---------------- */
function othersLast(list) {
  const i = list.findIndex(x => String(x).toLowerCase() === 'others');
  const o = i > -1 ? list.splice(i, 1)[0] : 'Others';
  list.push(o);
}
function addToList(list, val) {
  val = String(val || '').trim();
  if (!val) return '';
  const ex = list.find(x => x.toLowerCase() === val.toLowerCase());
  if (ex) return ex;
  const i = list.findIndex(x => x.toLowerCase() === 'others');
  if (i > -1) list.splice(i, 0, val); else list.push(val);
  return val;
}
const tagList = kind => kind === 'income' ? S.incomeTags : S.expenseTags;
const ensureTag = (kind, tag) => addToList(tagList(kind), tag);
const ensureMethod = m => addToList(S.methods, m);

/* ---------------- Period ---------------- */
function shiftPeriod(p, n) {
  const endIsME = p.end === monthEnd(p.end);
  return {start: addMonths(p.start, n), end: endIsME ? monthEnd(addMonths(monthStart(p.end), n)) : addMonths(p.end, n), repeat: p.repeat};
}
function rollPeriod() {
  let guard = 0;
  while (S.period.repeat && today() > S.period.end && guard++ < 600) S.period = shiftPeriod(S.period, 1);
}

/* ---------------- Ledger logic ---------------- */
const P = id => S.pockets.find(p => p.id === id);
const activePockets = type => S.pockets.filter(p => !p.archived && (!type || p.type === type));
const isIncomeAcc = id => id === 'general' || P(id)?.type === 'income';
const isExpenseAcc = id => P(id)?.type === 'expense';
function bal(acc) {
  let b = 0;
  for (const t of S.txns) { if (t.to === acc) b += t.amount; if (t.from === acc) b -= t.amount; }
  return b;
}
const totalIncome = () => sum(S.txns.filter(t => t.type === 'income'));
const savingsBalance = () => bal('general') + sum(activePockets('income'), p => bal(p.id));
const expenseBalance = () => sum(activePockets('expense'), p => bal(p.id));
const spentIn = (id, r) => sum(S.txns.filter(t => t.type === 'expense' && t.from === id && inR(t.date, r)));
function netToExpense(r) {
  const into = sum(S.txns.filter(t => isExpenseAcc(t.to) && !isExpenseAcc(t.from) && inR(t.date, r)));
  const back = sum(S.txns.filter(t => t.type === 'transfer' && isExpenseAcc(t.from) && !isExpenseAcc(t.to) && inR(t.date, r)));
  return into - back;
}
function accName(id) {
  if (id === 'general') return 'General Balance';
  if (!id) return 'Cash out';
  const p = P(id);
  return p ? `${p.name}${p.archived ? ' (archived)' : ''}` : 'Deleted pocket';
}
function accLink(id) {
  const p = P(id);
  return p ? `<a href="#/pocket/${p.id}">${esc(accName(id))}</a>` : esc(accName(id));
}
const srcName = id => S.sources.find(s => s.id === id)?.name || 'Unspecified';
function txnTag(t) {
  if (t.category) return t.category;
  const p = P(t.type === 'expense' ? t.from : t.to);
  return p?.tag || 'Untagged';
}
function ensureSource(name) {
  name = (name || '').trim();
  if (!name) return '';
  let s = S.sources.find(x => x.name.toLowerCase() === name.toLowerCase());
  if (!s) { s = {id: uid(), name}; S.sources.push(s); }
  return s.id;
}
function groupBy(list, keyFn) {
  const m = new Map();
  list.forEach(t => { const k = keyFn(t) || '—'; m.set(k, (m.get(k) || 0) + t.amount); });
  return [...m].map(([label, value]) => ({label, value})).sort((a, b) => b.value - a.value);
}

/* Apply a change; refuse it if General Balance or an income pocket would go below zero */
function commit(mutate, msg) {
  const backup = JSON.stringify({t: S.txns, p: S.pockets, s: S.sources, c: S.schedules});
  mutate();
  const accounts = ['general', ...S.pockets.filter(p => p.type === 'income' && !p.archived).map(p => p.id)];
  const neg = accounts.find(a => bal(a) < -0.5);
  if (neg) {
    const o = JSON.parse(backup); S.txns = o.t; S.pockets = o.p; S.sources = o.s; S.schedules = o.c;
    toast(`Not enough balance in ${accName(neg)} for that change.`, 'err');
    return false;
  }
  save(); render(); if (msg) toast(msg);
  return true;
}

/* ---------------- Schedules (subscriptions, bills, paydays) ---------------- */
const SCH = id => S.schedules.find(s => s.id === id);
function setDay(dateInMonth, day) {
  const last = Number(monthEnd(dateInMonth).slice(8));
  const dd = day === 'last' ? last : Math.min(Number(day) || 1, last);
  return dateInMonth.slice(0, 8) + pad(dd);
}
function stepDate(d, cycle, day) {
  const dd = day || Number(d.slice(8));
  switch (cycle) {
    case 'weekly': return addDays(d, 7);
    case 'monthly': return setDay(addMonths(monthStart(d), 1), dd);
    case 'quarterly': return setDay(addMonths(monthStart(d), 3), dd);
    case 'yearly': return setDay(addMonths(monthStart(d), 12), dd);
    default: return '';
  }
}
const dayOf = d => (d === monthEnd(d) && Number(d.slice(8)) >= 29) ? 'last' : Number(d.slice(8));
function advanceSchedule(s) {
  s.lastPaid = s.nextDue;
  if (s.cycle === 'once') { s.nextDue = ''; s.active = false; return; }
  s.nextDue = stepDate(s.nextDue, s.cycle, s.day);
}
function dueInfo(s) {
  if (s.active === false) return {txt: s.nextDue ? 'Paused' : 'Done', cls: 'mid', d: Infinity};
  if (!s.nextDue) return {txt: 'Done', cls: 'mid', d: Infinity};
  const d = daysBetween(today(), s.nextDue);
  if (d < 0) return {txt: `Overdue ${-d} day${d < -1 ? 's' : ''}`, cls: 'over', d};
  if (d === 0) return {txt: 'Due today', cls: 'soon', d};
  if (d === 1) return {txt: 'Tomorrow', cls: 'soon', d};
  return {txt: `In ${d} days`, cls: d <= (s.remind ?? 3) ? 'soon' : 'mid', d};
}
const perMonth = s => s.active === false ? 0 : ({weekly: s.amount * 52 / 12, monthly: s.amount, quarterly: s.amount / 3, yearly: s.amount / 12}[s.cycle] || 0);
function cycleText(s) {
  switch (s.cycle) {
    case 'monthly': return `Monthly on ${dayText(s.day)}`;
    case 'quarterly': return `Every 3 months on ${dayText(s.day)}`;
    case 'weekly': return s.nextDue ? `Weekly on ${weekday(s.nextDue)}` : 'Weekly';
    case 'yearly': return s.nextDue ? `Yearly on ${fmtDM(s.nextDue)}` : 'Yearly';
    default: return 'One-time';
  }
}
const upcoming = (days = 30, kind) => S.schedules
  .filter(s => s.active !== false && s.nextDue && (!kind || s.kind === kind) && daysBetween(today(), s.nextDue) <= days)
  .sort((a, b) => a.nextDue.localeCompare(b.nextDue));

/* ---------------- Ranges & filters ---------------- */
function rangeOf(f) {
  const a = f.anchor || today();
  switch (f.range) {
    case 'day': return [a, a];
    case 'week': { const dow = (parse(a).getDay() + 6) % 7; const s = addDays(a, -dow); return [s, addDays(s, 6)]; }
    case 'month': return [monthStart(a), monthEnd(a)];
    case 'year': return [a.slice(0, 4) + '-01-01', a.slice(0, 4) + '-12-31'];
    case 'period': { const p = shiftPeriod(S.period, f.pOff || 0); return [p.start, p.end]; }
    case 'custom': return [f.from || '0000-01-01', f.to || '9999-12-31'];
    default: return null;
  }
}
const inR = (d, r) => !r || (d >= r[0] && d <= r[1]);
function rangeLabel(r) {
  if (!r) return 'All time';
  if (r[0] === r[1]) return fmtDate(r[0]);
  if (r[0].startsWith('0000') && r[1].startsWith('9999')) return 'All time';
  return `${fmtDate(r[0])} – ${fmtDate(r[1])}`;
}
function filterBar(key, extra = '') {
  const f = ui[key], r = rangeOf(f);
  const shiftable = ['day', 'week', 'month', 'year', 'period'].includes(f.range);
  let row = '';
  if (shiftable) {
    row += `<div class="stepper"><button class="btn btn-sm" data-action="shiftRange" data-key="${key}" data-dir="-1" aria-label="Previous">‹</button>
            <span class="range-label">${rangeLabel(r)}</span>
            <button class="btn btn-sm" data-action="shiftRange" data-key="${key}" data-dir="1" aria-label="Next">›</button></div>
            <button class="btn btn-sm btn-ghost" data-action="todayRange" data-key="${key}">Today</button>`;
    if (f.range !== 'period') row += `<input type="date" data-filter="${key}.anchor" value="${f.anchor}" title="Jump to date">`;
  } else if (f.range === 'custom') {
    row += `<input type="date" data-filter="${key}.from" value="${f.from || ''}"> <span class="muted">to</span> <input type="date" data-filter="${key}.to" value="${f.to || ''}">`;
  }
  return `<div class="card filters"><div class="filter-row">
    <select class="range-select" data-range-for="${key}" aria-label="Period">${Object.entries(RANGE_LABEL).map(([k, v]) => opt(k, v, f.range)).join('')}</select>
    ${row}${extra}</div></div>`;
}

/* ---------------- Small UI pieces ---------------- */
// Moon, Saturn and a small planet. They live in their own reserved box,
// so headings and buttons never overlap them on any screen size.
const skyArt = (size = '') => `<div class="sky-art ${size}" aria-hidden="true">
    <div class="moon"><i></i><i></i><i></i><i></i></div>
    <svg class="saturn" viewBox="0 0 160 100">
      <defs><radialGradient id="satBody${size}" cx="38%" cy="34%" r="70%"><stop offset="0" stop-color="#f7ead0"/><stop offset=".6" stop-color="#dcc08c"/><stop offset="1" stop-color="#9f7f4e"/></radialGradient></defs>
      <g transform="rotate(-16 80 50)">
        <path d="M12 50 A68 17 0 0 1 148 50" fill="none" stroke="#eadbb2" stroke-opacity=".6" stroke-width="6"/>
        <circle cx="80" cy="50" r="27" fill="url(#satBody${size})"/>
        <path d="M58 40 Q80 36 102 40" stroke="#b8975f" stroke-opacity=".5" stroke-width="3" fill="none"/>
        <path d="M54 54 Q80 58 106 54" stroke="#b8975f" stroke-opacity=".4" stroke-width="2.5" fill="none"/>
        <path d="M12 50 A68 17 0 0 0 148 50" fill="none" stroke="#f3e6c2" stroke-width="6"/>
        <path d="M22 50 A58 12 0 0 0 138 50" fill="none" stroke="#c8ad78" stroke-opacity=".7" stroke-width="2"/>
      </g>
    </svg>
    <div class="planet"></div>
  </div>`;
function pageHead(iconHtml, title, desc, actions = '', crumbs = '') {
  return `<header class="page-head">${crumbs ? `<div class="crumbs">${crumbs}</div>` : ''}
    <div class="ph-top"><div class="page-icon">${iconHtml}</div>${skyArt('sm')}</div><h1>${title}</h1>
    ${desc ? `<p class="page-desc">${desc}</p>` : ''}
    ${actions ? `<div class="page-actions">${actions}</div>` : ''}</header>`;
}
const stat = (label, value, sub = '', extra = '') =>
  `<div class="card stat"><div class="lbl">${label}</div><div class="val">${value}</div>${sub ? `<div class="sub">${sub}</div>` : ''}${extra}</div>`;
const sectionTitle = (t, right = '') => `<div class="section-title"><span>${t}</span>${right}</div>`;
const progress = (pct, label, over = false, lg = false) =>
  `<div class="progress ${over ? 'over' : ''} ${lg ? 'lg' : ''}"><div style="width:${Math.max(0, Math.min(100, pct))}%"></div></div>${label ? `<div class="muted sm">${label}</div>` : ''}`;
function pocketColor(p) { return p.color || (p.type === 'expense' ? COLORS[2] : COLORS[0]); }
function initials(name) {
  const w = String(name || '?').trim().split(/\s+/).filter(x => /^[\p{L}\p{N}]/u.test(x));
  return ((w[0] || '?')[0] + (w[1] ? w[1][0] : '')).toUpperCase();
}
const avatar = (p, size = '') => `<span class="av ${size}" style="background:${pocketColor(p)}">${esc(initials(p.name))}</span>`;
const schedBadge = s => `<span class="av" style="background:${s.kind === 'income' ? COLORS[0] : (s.tag === 'Subscription' ? COLORS[4] : COLORS[2])}">${esc(initials(s.title))}</span>`;

// Dropdown with an "Add new…" choice that reveals a text box
function selectOther(name, list, value, {empty = null, newLabel = 'Add new…', placeholder = 'Type a new one'} = {}) {
  const vals = list.map(x => Array.isArray(x) ? x[0] : x);
  const known = value === '' || value === undefined || value === null || vals.includes(value);
  const v = known ? (value ?? '') : '__new';
  return `<div class="sel-other"><select name="${name}" data-other>
      ${empty !== null ? opt('', empty, v) : ''}
      ${list.map(x => Array.isArray(x) ? opt(x[0], x[1], v) : opt(x, x, v)).join('')}
      <option value="__new" ${v === '__new' ? 'selected' : ''}>${esc(newLabel)}</option>
    </select><input name="${name}New" class="other-input" placeholder="${esc(placeholder)}" value="${v === '__new' ? esc(value) : ''}" ${v === '__new' ? '' : 'hidden'}></div>`;
}
const pickOther = (fd, name) => fd[name] === '__new' ? String(fd[name + 'New'] || '').trim() : String(fd[name] || '');
function dayOptions(value) {
  let h = opt('', 'No fixed day', value ?? '');
  for (let d = 1; d <= 31; d++) h += opt(d, `${ordinal(d)} of the month`, value);
  return h + opt('last', 'Last day of the month', value);
}

/* ---------------- Compact pickers ----------------
   Long native dropdowns scroll forever on phones. Any select with many
   options becomes a button that opens a compact picker: a calendar-style
   grid for days, wrapped chips (with search) for tags and methods.
   The real <select> stays in the form, so saving works the same. */
const PICK_MIN = 9;
let pickerEl = null;
const chevron = '<svg class="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
function enhanceSelects(root) {
  if (!root) return;
  root.querySelectorAll('select:not([data-enhanced])').forEach(sel => {
    if (sel.disabled || (sel.options.length < PICK_MIN && !sel.dataset.layout)) return;
    sel.dataset.enhanced = '1';
    sel.classList.add('pick-native');
    sel.tabIndex = -1;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pick-btn' + (sel.closest('.filter-row') ? ' in-filter' : '');
    btn.setAttribute('aria-haspopup', 'listbox');
    if (sel.getAttribute('aria-label')) btn.setAttribute('aria-label', sel.getAttribute('aria-label'));
    sel.before(btn);   // the button comes first so tapping the field label opens the picker
    const sync = () => { btn.innerHTML = `<span>${esc(sel.selectedOptions[0]?.text || 'Choose…')}</span>${chevron}`; };
    sel.addEventListener('change', sync); sync();
    btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); pickerEl && pickerEl.dataset.for === sel.name + btn.offsetTop ? closePicker() : openPicker(sel, btn); });
  });
}
function closePicker() { if (pickerEl) { pickerEl.remove(); pickerEl = null; document.body.classList.remove('picking'); } }
function openPicker(sel, btn) {
  closePicker();
  const days = sel.dataset.layout === 'days';
  const label = btn.getAttribute('aria-label') || sel.closest('.field')?.querySelector('.lbl')?.textContent || 'Choose';
  const optBtn = (o, text = o.text, cls = '') => `<button type="button" role="option" aria-selected="${o.selected}" class="pick-opt ${cls} ${o.selected ? 'on' : ''} ${o.value === '__new' ? 'new' : ''}" data-v="${esc(o.value)}">${esc(text)}</button>`;
  let body = '';
  if (days) {
    const opts = [...sel.options];
    body = `<div class="pick-days">${opts.filter(o => /^\d+$/.test(o.value)).map(o => optBtn(o, o.value)).join('')}</div>
      <div class="pick-grid two">${opts.filter(o => !/^\d+$/.test(o.value)).map(o => optBtn(o)).join('')}</div>`;
  } else {
    let buf = [];
    const flush = () => { if (buf.length) body += `<div class="pick-grid">${buf.join('')}</div>`; buf = []; };
    [...sel.children].forEach(ch => {
      if (ch.tagName === 'OPTGROUP') { flush(); body += `<div class="pick-group">${esc(ch.label)}</div><div class="pick-grid">${[...ch.children].map(o => optBtn(o)).join('')}</div>`; }
      else buf.push(optBtn(ch));
    });
    flush();
  }
  const search = !days && sel.options.length > 12;
  const pop = document.createElement('div');
  pop.className = 'pick-pop' + (days ? ' is-days' : '');
  pop.dataset.for = sel.name + btn.offsetTop;
  pop.setAttribute('role', 'listbox');
  pop.innerHTML = `<div class="pick-head"><span>${esc(label)}</span><button type="button" class="icon-btn" data-pick-close aria-label="Close">${icon('close')}</button></div>
    ${search ? `<input class="pick-search" type="search" placeholder="Search…" aria-label="Search options">` : ''}
    <div class="pick-body">${body}</div>`;
  document.body.appendChild(pop);
  pickerEl = pop;
  const phone = window.innerWidth < 640;
  if (phone) { document.body.classList.add('picking'); pop.classList.add('sheet'); }
  else {
    const r = btn.getBoundingClientRect();
    const w = Math.min(Math.max(r.width, days ? 300 : 320), window.innerWidth - 24);
    const left = Math.min(Math.max(12, r.left), window.innerWidth - w - 12);
    pop.style.width = w + 'px'; pop.style.left = left + 'px';
    const below = window.innerHeight - r.bottom - 12, h = Math.min(pop.offsetHeight, 360);
    if (below >= h || below >= r.top) { pop.style.top = (r.bottom + 6) + 'px'; pop.style.maxHeight = Math.max(180, below - 6) + 'px'; }
    else { pop.style.bottom = (window.innerHeight - r.top + 6) + 'px'; pop.style.maxHeight = Math.max(180, r.top - 18) + 'px'; }
  }
  pop.addEventListener('click', e => {
    e.stopPropagation();
    if (e.target.closest('[data-pick-close]')) { closePicker(); return; }
    const b = e.target.closest('.pick-opt'); if (!b) return;
    sel.value = b.dataset.v;
    sel.dispatchEvent(new Event('change', {bubbles: true}));
    closePicker();
  });
  const s = pop.querySelector('.pick-search');
  if (s) {
    s.addEventListener('input', () => {
      const q = s.value.trim().toLowerCase();
      pop.querySelectorAll('.pick-opt').forEach(b => { b.hidden = q && !b.textContent.toLowerCase().includes(q) && !b.classList.contains('new'); });
      pop.querySelectorAll('.pick-grid').forEach(g => { const any = [...g.children].some(b => !b.hidden); g.hidden = !any; if (g.previousElementSibling?.classList.contains('pick-group')) g.previousElementSibling.hidden = !any; });
    });
    if (!phone) setTimeout(() => s.focus(), 20);
  }
  pop.querySelector('.pick-opt.on')?.scrollIntoView({block: 'nearest'});
}

function hbars(items, emptyText = 'Nothing to show yet.') {
  if (!items.length) return `<div class="empty sm">${emptyText}</div>`;
  const max = Math.max(...items.map(i => Math.abs(i.value)), 1);
  return `<div class="hbars">${items.map(i => {
    const tag = i.href ? 'a' : 'div';
    return `<${tag} class="hbar" ${i.href ? `href="${i.href}"` : ''}>
      <div class="hbar-top"><span>${esc(i.label)}</span>${amt(i.value)}</div>
      <div class="hbar-track"><div class="hbar-fill ${i.cls || ''}" style="width:${Math.max(2, Math.abs(i.value) / max * 100)}%"></div></div>
    </${tag}>`;
  }).join('')}</div>`;
}
function barChart(labels, series, H = 200) {
  const W = 640, L = 46, B = 24, T = 10;
  const max = Math.max(1, ...series.flatMap(s => s.values));
  const n = labels.length, gw = (W - L) / n, bw = Math.min(26, (gw - 12) / series.length);
  let g = '';
  for (let k = 0; k <= 3; k++) {
    const y = T + (H - T - B) * (1 - k / 3);
    g += `<line x1="${L}" x2="${W}" y1="${y}" y2="${y}" class="gl"/><text x="${L - 6}" y="${y + 4}" text-anchor="end" class="ax ay">${short(max * k / 3)}</text>`;
  }
  labels.forEach((lb, i) => {
    const x0 = L + i * gw + (gw - bw * series.length) / 2;
    series.forEach((s, j) => {
      const v = s.values[i], h = (v / max) * (H - T - B);
      g += `<rect class="${s.cls}" x="${(x0 + j * bw).toFixed(1)}" y="${(H - B - h).toFixed(1)}" width="${Math.max(bw - 3, 2).toFixed(1)}" height="${Math.max(h, 0).toFixed(1)}" rx="2"><title>${esc(s.name)} · ${esc(lb)}: ${rpP(v)}</title></rect>`;
    });
    g += `<text x="${(L + i * gw + gw / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle" class="ax">${esc(lb)}</text>`;
  });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img">${g}</svg>`;
}
const legend = series => `<div class="legend">${series.map(s => `<span><i class="dot ${s.cls}"></i>${esc(s.name)}</span>`).join('')}</div>`;
function monthlyChart(series, n = 6) {
  const months = [];
  for (let i = n - 1; i >= 0; i--) months.push(addMonths(monthStart(today()), -i));
  const labels = months.map(m => parse(m).toLocaleDateString('en-GB', {month: 'short'}));
  const ser = series.map(s => ({...s, values: months.map(m => sum(S.txns.filter(t => s.pred(t) && t.date >= m && t.date <= monthEnd(m))))}));
  return barChart(labels, ser) + legend(ser);
}

function pocketCard(p) {
  const b = bal(p.id);
  let extra = '';
  if (p.type === 'income') {
    if (p.target) {
      const pct = b / p.target * 100;
      extra = progress(pct, `${Math.max(0, Math.round(pct))}% of ${amt(p.target)}`);
    } else extra = `<div class="muted sm mt-sm">No target set</div>`;
  } else {
    const spent = spentIn(p.id, thisMonth());
    if (p.budget) {
      const pct = spent / p.budget * 100;
      extra = progress(pct, `Spent ${amt(spent)} of ${amt(p.budget)} this month`, pct > 100);
    } else extra = `<div class="muted sm mt-sm">Spent this month: ${amt(spent)}</div>`;
  }
  const due = dueFor(p.id);
  if (due.list.length) extra += p.type === 'expense'
    ? `<div class="due-line ${due.short ? 'over' : ''}">${due.list.length} payment${due.list.length > 1 ? 's' : ''} · ${amt(due.total)} due in 30 days${due.short ? ' — not enough balance' : ''}</div>`
    : `<div class="due-line">Payday ${amt(due.total)} expected in 30 days</div>`;
  const last = sorted(S.txns.filter(t => t.to === p.id || t.from === p.id))[0];
  const usual = p.payDay ? `Usually on ${dayText(p.payDay)}` : '';
  return `<a class="pocket card" href="#/pocket/${p.id}">
    <div class="pocket-head">${avatar(p)}<span class="chip">${esc(p.tag || 'Untagged')}</span></div>
    <div class="pocket-name">${esc(p.name)}</div>
    <div class="pocket-bal ${b < 0 ? 'over' : ''}">${amt(b)}</div>
    ${extra}
    <div class="pocket-foot muted sm">${[usual, last ? 'Last activity ' + fmtDM(last.date) : 'No activity yet'].filter(Boolean).join(' · ')}</div>
  </a>`;
}

// Payments due (or paydays expected) for a pocket in the next 30 days
function dueFor(pid) {
  const list = upcoming(30).filter(s => (s.kind === 'expense' && s.pocket === pid) || (s.kind === 'income' && s.to === pid));
  const total = sum(list);
  const short = P(pid)?.type === 'expense' && list.length && bal(pid) < total;
  return {list, total, short};
}
function schedRow(s, compact = false) {
  const di = dueInfo(s);
  const where = s.kind === 'expense' ? (P(s.pocket) ? accName(s.pocket) : 'No pocket — edit to choose one') : accName(s.to || 'general');
  const canPay = s.active !== false && s.nextDue;
  return `<div class="sch-row ${s.active === false ? 'paused' : ''}">
    ${schedBadge(s)}
    <div class="sch-main">
      <div class="sch-title">${esc(s.title)} ${s.tag ? `<span class="chip">${esc(s.tag)}</span>` : ''}${s.autopay ? ' <span class="chip rep" title="Recorded automatically on the due date">Auto-pay</span>' : ''}</div>
      <div class="muted sm">${cycleText(s)}${s.method ? ` · ${esc(s.method)}` : ''} · ${esc(where)}</div>
    </div>
    <div class="sch-right">
      <div class="sch-amt ${s.kind === 'income' ? 'pos' : ''}">${s.kind === 'income' ? '+' : ''}${amt(s.amount)}</div>
      <div class="due ${di.cls}">${s.nextDue ? fmtDM(s.nextDue) + ' · ' : ''}${di.txt}</div>
    </div>
    <div class="sch-actions">
      ${canPay ? `<button class="btn btn-sm btn-primary" data-action="payNow" data-id="${s.id}">${s.kind === 'income' ? 'Received' : 'Mark paid'}</button>` : ''}
      ${compact ? '' : `
        ${canPay && s.cycle !== 'once' ? `<button class="icon-btn" title="Skip this time" data-action="skipSched" data-id="${s.id}">${icon('skip')}</button>` : ''}
        ${s.nextDue ? `<button class="icon-btn" title="${s.active === false ? 'Resume' : 'Pause'}" data-action="pauseSched" data-id="${s.id}">${icon(s.active === false ? 'play' : 'pause')}</button>` : ''}
        <button class="icon-btn" title="Edit" data-action="editSched" data-id="${s.id}">${icon('edit')}</button>
        <button class="icon-btn" title="Delete" data-action="delSched" data-id="${s.id}">${icon('trash')}</button>`}
    </div>
  </div>`;
}
const schedList = (list, empty, compact) => list.length ? `<div class="sch-list">${list.map(s => schedRow(s, compact)).join('')}</div>` : `<div class="empty sm">${empty}</div>`;

const defDesc = t => ({income: 'Income', expense: 'Expense', transfer: 'Transfer', withdraw: 'Withdrawal'}[t.type]);
function flowHtml(t) {
  const arrow = ' <span class="muted">→</span> ';
  switch (t.type) {
    case 'income': return esc(srcName(t.sourceId)) + arrow + accLink(t.to);
    case 'expense': return accLink(t.from) + arrow + esc(t.recipient || 'Spent');
    case 'withdraw': return accLink(t.from) + arrow + 'Cash out';
    default: return accLink(t.from) + arrow + accLink(t.to);
  }
}
function txTable(list, o = {}) {
  if (!list.length) return `<div class="empty">No records here yet.</div>`;
  const rows = list.map(t => {
    let sign = '', cls = 'mid';
    if (o.ctx) { const inn = t.to === o.ctx; sign = inn ? '+' : '−'; cls = inn ? 'pos' : 'neg'; }
    else if (o.side === 'income') {
      if (t.type === 'income' && isIncomeAcc(t.to)) { sign = '+'; cls = 'pos'; }
      else if (isIncomeAcc(t.from) && !isIncomeAcc(t.to)) { sign = '−'; cls = 'neg'; }
    } else if (o.side === 'expense') {
      if (t.type === 'expense' || t.type === 'withdraw') { sign = '−'; cls = 'neg'; }
      else if (isExpenseAcc(t.to) && !isExpenseAcc(t.from)) { sign = '+'; cls = 'pos'; }
      else if (isExpenseAcc(t.from) && !isExpenseAcc(t.to)) { sign = '−'; cls = 'neg'; }
    } else {
      if (t.type === 'income') { sign = '+'; cls = 'pos'; }
      else if (t.type === 'expense' || t.type === 'withdraw') { sign = '−'; cls = 'neg'; }
    }
    const meta = t.type === 'income' ? `<span class="chip">${esc(srcName(t.sourceId))}</span>`
      : t.type === 'expense' ? `<span class="chip">${esc(txnTag(t))}</span>` : '';
    return `<tr>
      <td class="nowrap">${fmtDate(t.date)}</td>
      <td><span class="chip type-${t.type}">${TYPE_LABEL[t.type]}</span></td>
      <td><div class="desc">${esc(t.activity || defDesc(t))}${t.scheduleId ? ' <span class="chip rep" title="From a schedule">Repeats</span>' : ''}</div>${t.note ? `<div class="note">${esc(t.note)}</div>` : ''}</td>
      <td class="flow">${flowHtml(t)}</td>
      <td>${meta}</td>
      <td class="muted sm">${esc(t.method || '')}</td>
      <td class="num ${cls}">${sign}${amt(t.amount)}</td>
      ${o.run ? `<td class="num muted">${amt(o.run[t.id])}</td>` : ''}
      <td class="row-actions"><button class="icon-btn" data-action="editTxn" data-id="${t.id}" title="Edit record">${icon('edit')}</button><button class="icon-btn" data-action="delTxn" data-id="${t.id}" title="Delete record">${icon('trash')}</button></td>
    </tr>`;
  }).join('');
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr>
    <th>Date</th><th>Type</th><th>Title</th><th>Flow</th><th>Source / Tag</th><th>Method</th><th class="num">Amount</th>${o.run ? '<th class="num">Balance</th>' : ''}<th></th>
  </tr></thead><tbody>${rows}</tbody></table></div>`;
}

/* =========================================================
   PAGES
   ========================================================= */
function pageHome() {
  const f = ui.home, r = rangeOf(f), T = S.txns;
  const inc = sum(T.filter(t => t.type === 'income' && inR(t.date, r)));
  const exp = sum(T.filter(t => t.type === 'expense' && inR(t.date, r)));
  const net = inc - exp, rate = inc ? Math.round(net / inc * 100) : 0;
  const savings = savingsBalance(), budget = expenseBalance();
  const now = new Date(), hr = now.getHours();
  const greet = hr < 11 ? 'Good morning' : hr < 15 ? 'Good afternoon' : hr < 19 ? 'Good evening' : 'Good night';
  const tip = TIPS[Math.max(0, S.welcomeIdx) % TIPS.length];

  let h = `<section class="card hero">
    <div class="hero-top"><span class="muted">${greet} · ${now.toLocaleDateString('en-GB', {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'})}</span>
      <button class="icon-btn" data-action="nextWelcome" title="Show another message">${icon('refresh')}</button></div>
    <div class="hero-body">${skyArt()}<div class="hero-text">
    <h1 class="welcome"><span id="wMsg"></span> <span id="wName" class="name"></span><span class="caret"></span></h1>
    <p class="muted" style="margin:0">${tip}</p>
    <div class="page-actions">
      <button class="btn btn-primary" data-action="addIncome">＋ Add income</button>
      <button class="btn" data-action="addExpense">＋ Add expense</button>
      <button class="btn" data-action="transfer">⇄ Transfer</button>
      <button class="btn btn-ghost" data-action="newPocket" data-type="income">＋ New pocket</button>
    </div>
  </div></div></section>`;

  if (!S.pockets.length && !T.length) {
    h += `<div class="card mt"><div class="card-title">Start here</div>
      <ol class="steps">
        <li><div><b>Name your fund sources</b> — your office, freelance clients, side jobs (Settings).</div></li>
        <li><div><b>Create pockets</b> — income pockets for savings goals, expense pockets for monthly budgets.</div></li>
        <li><div><b>Record income</b> after every payday, then allocate it from General Balance to pockets.</div></li>
        <li><div><b>Add your subscriptions and bills</b> in Bills &amp; Paydays so you never miss a due date.</div></li>
      </ol>
      <div class="page-actions" style="margin:0">
        <button class="btn btn-primary" data-action="newPocket" data-type="income">＋ Create first pocket</button>
        <a class="btn" href="#/settings">Set fund sources</a>
        <a class="btn btn-ghost" href="#/schedules">Add subscriptions</a>
      </div></div>`;
  }

  h += `<div class="grid g4 mt">
    ${stat('Net worth', amt(savings + budget), 'Savings + expense budget')}
    ${stat('Savings balance', amt(savings), `General ${amt(bal('general'))}`)}
    ${stat('Expense budget left', amt(budget), `${activePockets('expense').length} expense pockets`)}
    ${stat('Lifetime income', amt(totalIncome(), 'pos'), 'Limitless — keeps growing')}
  </div>`;

  // alerts
  const tm = thisMonth();
  const overdue = upcoming(-1);
  if (overdue.length) h += `<div class="callout warn"><span class="callout-dot"></span><div class="grow"><b>${overdue.length} payment${overdue.length > 1 ? 's are' : ' is'} overdue</b>: ${overdue.slice(0, 3).map(s => esc(s.title)).join(', ')}${overdue.length > 3 ? '…' : ''}.</div><a class="btn btn-sm" href="#/schedules">Review</a></div>`;
  activePockets('expense').filter(p => p.budget && spentIn(p.id, tm) > p.budget).forEach(p =>
    h += `<div class="callout warn"><span class="callout-dot"></span><div class="grow"><b>${esc(p.name)}</b> is over its monthly budget: ${amt(spentIn(p.id, tm))} of ${amt(p.budget)}.</div><a class="btn btn-sm" href="#/pocket/${p.id}">Open</a></div>`);
  activePockets('expense').filter(p => bal(p.id) >= 0 && dueFor(p.id).short).forEach(p => {
    const d = dueFor(p.id);
    h += `<div class="callout warn"><span class="callout-dot"></span><div class="grow"><b>${esc(p.name)}</b> has ${amt(bal(p.id))}, but ${amt(d.total)} is due in the next 30 days.</div><button class="btn btn-sm" data-action="transfer" data-from="general" data-to="${p.id}">Top up</button></div>`;
  });
  activePockets('expense').filter(p => bal(p.id) < 0).forEach(p =>
    h += `<div class="callout warn"><span class="callout-dot"></span><div class="grow"><b>${esc(p.name)}</b> balance is below zero (${amt(bal(p.id))}). Fund it from your income.</div><button class="btn btn-sm" data-action="transfer" data-from="general" data-to="${p.id}">Fund</button></div>`);
  if (bal('general') > 0 && activePockets().length) h += `<div class="callout"><span class="callout-dot"></span><div class="grow">You have ${amt(bal('general'))} unallocated in General Balance. Give it a job!</div><button class="btn btn-sm btn-primary" data-action="transfer" data-from="general">Allocate</button></div>`;

  const soon = upcoming(14).filter(s => daysBetween(today(), s.nextDue) >= 0).slice(0, 5);
  h += sectionTitle('Coming up · next 14 days', `<a class="link-light" href="#/schedules">All bills &amp; paydays →</a>`) +
    `<div class="card">${schedList(soon, 'Nothing due in the next two weeks. Add subscriptions and bills in Bills &amp; Paydays.', true)}</div>`;

  h += sectionTitle('Income vs expense') + filterBar('home');
  h += `<div class="grid g3 mt">
    ${stat('Income', amt(inc, 'pos'), rangeLabel(r))}
    ${stat('Expense', amt(exp), rangeLabel(r))}
    ${stat(net >= 0 ? 'Saved' : 'Overspent', amt(net, net >= 0 ? 'pos' : 'over'), inc ? `Savings rate ${rate}%` : 'No income in this range')}
  </div>`;
  const tot = inc + exp;
  h += `<div class="card mt"><div class="card-title"><span>Comparison</span><span class="muted sm">${tot ? Math.round(inc / tot * 100) : 0}% income · ${tot ? Math.round(exp / tot * 100) : 0}% expense</span></div>
    <div class="split"><div class="i" style="width:${tot ? inc / tot * 100 : 50}%"></div><div class="e" style="width:${tot ? exp / tot * 100 : 50}%"></div></div>
    ${legend([{name: 'Income', cls: 'bi'}, {name: 'Expense', cls: 'be'}])}</div>`;

  h += `<div class="grid g2 mt">
    <div class="card"><div class="card-title">Last 6 months</div>${monthlyChart([
      {name: 'Income', cls: 'bi', pred: t => t.type === 'income'},
      {name: 'Expense', cls: 'be', pred: t => t.type === 'expense'}])}</div>
    <div class="card"><div class="card-title"><span>Expense by tag</span><span class="muted sm">${rangeLabel(r)}</span></div>
      ${hbars(groupBy(T.filter(t => t.type === 'expense' && inR(t.date, r)), txnTag).slice(0, 7).map(x => ({...x, cls: 'alt'})), 'No expenses in this range.')}</div>
  </div>`;

  const byBal = activePockets().map(p => ({label: p.name, value: bal(p.id), href: `#/pocket/${p.id}`, cls: p.type === 'expense' ? 'alt' : ''}))
    .filter(x => x.value > 0).sort((a, b) => b.value - a.value).slice(0, 5);
  const saved = activePockets('income').map(p => ({label: p.name, value: sum(T.filter(t => t.to === p.id && inR(t.date, r))), href: `#/pocket/${p.id}`}))
    .filter(x => x.value > 0).sort((a, b) => b.value - a.value).slice(0, 5);
  const spend = activePockets('expense').map(p => ({label: p.name, value: spentIn(p.id, r), href: `#/pocket/${p.id}`, cls: 'alt'}))
    .filter(x => x.value > 0).sort((a, b) => b.value - a.value).slice(0, 5);
  h += sectionTitle('Pocket leaderboard') + `<div class="grid g3">
    <div class="card"><div class="card-title">Biggest balances</div>${hbars(byBal, 'No pocket balances yet.')}</div>
    <div class="card"><div class="card-title"><span>Most saved</span><span class="muted sm">${RANGE_LABEL[f.range]}</span></div>${hbars(saved, 'Nothing saved in this range.')}</div>
    <div class="card"><div class="card-title"><span>Biggest spending</span><span class="muted sm">${RANGE_LABEL[f.range]}</span></div>${hbars(spend, 'No spending in this range.')}</div>
  </div>`;

  h += sectionTitle('Recent activity', `<a class="link-light" href="#/records">View all →</a>`) + `<div class="card">${txTable(sorted(T).slice(0, 8))}</div>`;
  return h;
}

function pageIncome() {
  const f = ui.inc, r = rangeOf(f), per = S.period;
  const pockets = activePockets('income'), gen = bal('general');
  const perInc = sum(S.txns.filter(t => t.type === 'income' && inR(t.date, [per.start, per.end])));
  const daysLeft = Math.max(0, daysBetween(today(), per.end));

  let h = pageHead(icon('income', 22), 'Income',
    'Every wave of income washes ashore here first, then flows from your General Balance into the pockets where it belongs',
    `<button class="btn btn-primary" data-action="addIncome">＋ Add income</button>
     <button class="btn" data-action="transfer" data-from="general">⇄ Allocate from General</button>
     <button class="btn" data-action="newPocket" data-type="income">＋ New income pocket</button>
     <button class="btn btn-ghost light" data-action="newSched" data-kind="income">＋ Payday schedule</button>`);

  h += `<div class="grid g4">
    ${stat('Lifetime income', amt(totalIncome(), 'pos'), 'All-time, never resets')}
    ${stat('Savings balance', amt(savingsBalance()), 'General + income pockets')}
    ${stat('General balance', amt(gen), 'Not allocated yet', gen > 0 ? `<button class="btn btn-sm btn-primary mt-sm" data-action="transfer" data-from="general">Allocate →</button>` : '')}
    ${stat('Sent to expense', amt(netToExpense(null)), 'Net budget moved to expense')}
  </div>`;

  const pays = upcoming(45, 'income').slice(0, 3);
  h += `<div class="grid g2 mt">
    <div class="card period-card"><div>
      <div class="lbl">Income period</div>
      <div class="period-range">${fmtDate(per.start)} – ${fmtDate(per.end)} ${per.repeat ? '<span class="chip">Repeats monthly</span>' : ''}</div>
      <div class="muted sm">${daysLeft} days left · Income this period ${amt(perInc, 'pos')}</div>
    </div><button class="btn btn-sm" data-action="editPeriod">Edit period</button></div>
    <div class="card"><div class="card-title"><span>Next paydays</span><a class="sm" href="#/schedules">Manage</a></div>${schedList(pays, 'No payday scheduled yet. Add one to see when money is coming in.', true)}</div>
  </div>`;

  h += sectionTitle(`Income pockets · ${pockets.length}`) + `<div class="grid pockets-grid">${pockets.map(pocketCard).join('')}
    <button class="pocket card add-card" data-action="newPocket" data-type="income">＋ New income pocket</button></div>`;

  const tags = [...new Set(pockets.map(p => p.tag).filter(Boolean))];
  const extra = `<select data-filter="inc.tag" aria-label="Tag"><option value="">All tags</option>${tags.map(t => opt(t, t, f.tag)).join('')}</select>
    <select data-filter="inc.source" aria-label="Fund source"><option value="">All fund sources</option>${S.sources.map(s => opt(s.id, s.name, f.source)).join('')}</select>
    <select data-filter="inc.pocket" aria-label="Pocket"><option value="">All pockets</option>${opt('general', 'General Balance', f.pocket)}${pockets.map(p => opt(p.id, p.name, f.pocket)).join('')}</select>`;
  h += sectionTitle('Records & insights') + filterBar('inc', extra);

  const list = sorted(S.txns.filter(t => {
    if (!(t.type === 'income' || isIncomeAcc(t.to) || isIncomeAcc(t.from))) return false;
    if (!inR(t.date, r)) return false;
    if (f.source && t.sourceId !== f.source) return false;
    if (f.pocket && t.to !== f.pocket && t.from !== f.pocket) return false;
    if (f.tag && ![P(t.to)?.tag, P(t.from)?.tag].includes(f.tag)) return false;
    return true;
  }));
  const incList = list.filter(t => t.type === 'income');
  const alloc = list.filter(t => t.type === 'transfer' && t.from === 'general');
  h += `<div class="grid g3 mt">
    ${stat('Income in range', amt(sum(incList), 'pos'), rangeLabel(r))}
    ${stat('Allocated from General', amt(sum(alloc)), 'To income & expense pockets')}
    ${stat('Records', list.length, 'Matching your filters')}
  </div>
  <div class="grid g2 mt">
    <div class="card"><div class="card-title">By fund source</div>${hbars(groupBy(incList, t => srcName(t.sourceId)), 'No income in this range.')}</div>
    <div class="card"><div class="card-title">Saved by pocket tag</div>${hbars(groupBy(list.filter(t => P(t.to)?.type === 'income'), t => P(t.to).tag || 'Untagged'), 'Nothing saved to pockets yet.')}</div>
  </div>
  <div class="card mt">${txTable(list, {side: 'income'})}</div>`;
  return h;
}

function pageExpense() {
  const f = ui.exp, r = rangeOf(f);
  const pockets = activePockets('expense');
  const tm = thisMonth(), ty = thisYear();
  const pass = t => (!f.tag || txnTag(t) === f.tag) && (!f.pocket || t.from === f.pocket || t.to === f.pocket) && (!f.method || t.method === f.method);
  const exps = S.txns.filter(t => t.type === 'expense');
  const subsMonthly = sum(S.schedules.filter(s => s.kind === 'expense' && s.tag === 'Subscription'), perMonth);

  let h = pageHead(icon('expense', 22), 'Expense',
    'Fill your pockets from the tide of income, then chart every spend here so you always know where your money drifted',
    `<button class="btn btn-primary" data-action="addExpense">＋ Add expense</button>
     <button class="btn" data-action="transfer" data-from="general" data-kind="fund">⇄ Fund from income</button>
     <button class="btn" data-action="transfer" data-kind="expense">↔ Move between pockets</button>
     <button class="btn" data-action="newPocket" data-type="expense">＋ New expense pocket</button>`);

  h += `<div class="grid g4">
    ${stat('Expense balance', amt(expenseBalance()), 'Budget left in all pockets', `<button class="btn btn-sm mt-sm" data-action="expBreakdown">See where it is →</button>`)}
    ${stat('Spent this month', amt(sum(exps.filter(t => inR(t.date, tm)))), parse(tm[0]).toLocaleDateString('en-GB', {month: 'long', year: 'numeric'}))}
    ${stat('Spent this year', amt(sum(exps.filter(t => inR(t.date, ty)))), ty[0].slice(0, 4))}
    ${stat('Subscriptions', amt(subsMonthly), 'Per month, from your schedules')}
  </div>`;

  const bills = upcoming(30, 'expense').slice(0, 4);
  h += sectionTitle('Upcoming bills & subscriptions', `<a class="link-light" href="#/schedules">Manage →</a>`) +
    `<div class="card">${schedList(bills, 'No bills due in the next 30 days.', true)}</div>`;

  h += sectionTitle(`Expense pockets · ${pockets.length}`) + `<div class="grid pockets-grid">${pockets.map(pocketCard).join('')}
    <button class="pocket card add-card" data-action="newPocket" data-type="expense">＋ New expense pocket</button></div>`;

  const tags = [...new Set([...pockets.map(p => p.tag), ...exps.map(txnTag)].filter(Boolean))];
  const methods = [...new Set(exps.map(t => t.method).filter(Boolean))];
  const extra = `<select data-filter="exp.tag" aria-label="Tag"><option value="">All tags</option>${tags.map(c => opt(c, c, f.tag)).join('')}</select>
    <select data-filter="exp.pocket" aria-label="Pocket"><option value="">All pockets</option>${pockets.map(p => opt(p.id, p.name, f.pocket)).join('')}</select>
    <select data-filter="exp.method" aria-label="Payment method"><option value="">All payment methods</option>${methods.map(m => opt(m, m, f.method)).join('')}</select>`;
  h += sectionTitle('Spending & records') + filterBar('exp', extra);

  const spentList = exps.filter(t => inR(t.date, r) && pass(t));
  const spent = sum(spentList);
  const bounded = r && !r[0].startsWith('0000') && !r[1].startsWith('9999');
  const days = bounded ? Math.max(1, daysBetween(r[0], r[1]) + 1) : 0;
  h += `<div class="grid g4 mt">
    ${stat('Spent in range', amt(spent), rangeLabel(r))}
    ${stat('Funded from income', amt(netToExpense(r)), rangeLabel(r))}
    ${stat('Transactions', spentList.length, spentList.length ? `Avg ${amt(spent / spentList.length)} each` : '—')}
    ${stat('Daily average', bounded ? amt(spent / days) : '—', bounded ? `${days} day${days > 1 ? 's' : ''}` : 'Pick a day, week, month or year')}
  </div>
  <div class="grid g3 mt">
    <div class="card"><div class="card-title">By tag</div>${hbars(groupBy(spentList, txnTag).map(x => ({...x, cls: 'alt'})), 'No spending in this range.')}</div>
    <div class="card"><div class="card-title">By pocket</div>${hbars(groupBy(spentList, t => accName(t.from)).map(x => ({...x, cls: 'alt'})), 'No spending in this range.')}</div>
    <div class="card"><div class="card-title">By payment method</div>${hbars(groupBy(spentList, t => t.method || 'Not specified').map(x => ({...x, cls: 'alt'})), 'No spending in this range.')}</div>
  </div>
  <div class="card mt"><div class="card-title">Funded vs spent · last 6 months</div>${monthlyChart([
    {name: 'Funded', cls: 'bs', pred: t => isExpenseAcc(t.to) && !isExpenseAcc(t.from)},
    {name: 'Spent', cls: 'be', pred: t => t.type === 'expense'}])}</div>`;

  const list = sorted(S.txns.filter(t => (isExpenseAcc(t.to) || isExpenseAcc(t.from)) && inR(t.date, r) &&
    (t.type === 'expense' ? pass(t) : (!f.method && (!f.pocket || t.from === f.pocket || t.to === f.pocket) && (!f.tag || [P(t.to)?.tag, P(t.from)?.tag].includes(f.tag))))));
  h += `<div class="card mt">${txTable(list, {side: 'expense'})}</div>`;
  return h;
}

function pageSchedules() {
  const all = S.schedules;
  const subs = all.filter(s => s.kind === 'expense' && s.tag === 'Subscription');
  const bills = all.filter(s => s.kind === 'expense' && s.tag !== 'Subscription');
  const pays = all.filter(s => s.kind === 'income');
  const next7 = upcoming(7, 'expense');
  const overdue = upcoming(-1);
  const byDue = l => [...l].sort((a, b) => (a.nextDue || '9999').localeCompare(b.nextDue || '9999'));

  let h = pageHead(icon('calendar', 22), 'Bills & Paydays',
    'Watch your tides rise and fall as bills drift out and paydays wash back in, so every wave of your money stays in view. Turn on auto-pay and it records itself on the due date.',
    `<button class="btn btn-primary" data-action="newSched" data-kind="expense">＋ New payment</button>
     <button class="btn" data-action="newSched" data-kind="income">＋ New payday</button>`);

  h += `<div class="grid g4">
    ${stat('Due in 7 days', amt(sum(next7)), `${next7.length} payment${next7.length === 1 ? '' : 's'}`)}
    ${stat('Subscriptions', amt(sum(subs, perMonth)), `Per month · ${amt(sum(subs, perMonth) * 12)} a year`)}
    ${stat('Bills', amt(sum(bills, perMonth)), 'Per month, recurring')}
    ${stat('Overdue', overdue.length, overdue.length ? 'Needs attention' : 'All caught up', '')}
  </div>`;

  h += sectionTitle('Coming up · next 30 days') + `<div class="card">${schedList(upcoming(30), 'Nothing due in the next 30 days.')}</div>`;
  h += sectionTitle(`Subscriptions · ${subs.length}`) + `<div class="card">${schedList(byDue(subs), 'No subscriptions yet. Add Netflix, Spotify, iCloud, YouTube Premium and others with their billing date and payment method.')}</div>`;
  h += sectionTitle(`Bills & other payments · ${bills.length}`) + `<div class="card">${schedList(byDue(bills), 'No bills yet — electricity, internet, rent, insurance, installments.')}</div>`;
  h += sectionTitle(`Paydays & expected income · ${pays.length}`) + `<div class="card">${schedList(byDue(pays), 'No paydays yet. Add your salary date so you know when money arrives.')}</div>`;
  return h;
}

function pagePocket(id) {
  const p = P(id);
  if (!p) return pageHead(icon('pocket', 22), 'Pocket not found', 'It may have been deleted.', `<a class="btn" href="#/home">Back home</a>`);
  const isInc = p.type === 'income';
  const all = S.txns.filter(t => t.to === id || t.from === id);
  const b = bal(id), tin = sum(all.filter(t => t.to === id)), tout = sum(all.filter(t => t.from === id));
  const lastIn = sorted(all.filter(t => t.to === id))[0];
  const lastOut = sorted(all.filter(t => t.from === id))[0];
  const usual = p.payDay ? ` <span class="chip light">${isInc ? 'Usual top-up' : 'Usual payment'}: ${dayText(p.payDay)}</span>` : '';

  let h = pageHead(avatar(p, 'lg'), esc(p.name),
    `<span class="chip light">${esc(p.tag || 'Untagged')}</span> <span class="chip light">${isInc ? 'Income pocket' : 'Expense pocket'}</span>${usual}${p.desc ? ` &nbsp;${esc(p.desc)}` : ''}`,
    p.archived ? `<button class="btn btn-primary" data-action="restorePocket" data-id="${id}">Restore pocket</button>` :
    `<button class="btn btn-primary" data-action="transfer" data-from="${id}">⇄ Transfer / reduce</button>
     <button class="btn" data-action="editPocket" data-id="${id}">Edit pocket</button>
     ${isInc ? '' : `<button class="btn" data-action="newSched" data-kind="expense" data-pocket="${id}">＋ Payment for this pocket</button>`}
     <button class="btn btn-ghost light" data-action="deletePocket" data-id="${id}">Delete</button>`,
    `<a href="#/${isInc ? 'income' : 'expense'}">${isInc ? 'Income' : 'Expense'}</a> / ${esc(p.name)}`);

  if (p.archived) h += `<div class="callout warn" style="margin-bottom:14px"><span class="callout-dot"></span><div>This pocket is archived. Its history is kept for your records.</div></div>`;

  h += `<div class="grid g4">
    ${stat('Balance', amt(b, b < 0 ? 'over' : ''), isInc ? 'Saved in this pocket' : 'Budget left to spend')}
    ${stat('Total in', amt(tin, 'pos'), `${all.filter(t => t.to === id).length} records`)}
    ${stat(isInc ? 'Total out' : 'Total spent', amt(tout), `${all.filter(t => t.from === id).length} records`)}
    ${stat('Last money in', lastIn ? amt(lastIn.amount, 'pos') : '—', lastIn ? fmtDate(lastIn.date) : 'Nothing yet', lastOut ? `<div class="sub">Last out ${amt(lastOut.amount)} · ${fmtDate(lastOut.date)}</div>` : '')}
  </div>`;

  if (isInc) {
    if (p.target) {
      const pct = b / p.target * 100, remain = Math.max(0, p.target - b);
      let plan = '';
      if (p.end) {
        const d = daysBetween(today(), p.end);
        if (b >= p.target) plan = 'Goal reached';
        else if (d > 0) plan = `${d} days left · save about ${amt(remain / Math.max(1, d / 30.44))} per month to reach it`;
        else plan = 'Target date has passed — adjust the saving period?';
      }
      h += `<div class="card mt"><div class="card-title"><span>Savings goal</span><span class="muted sm">${p.start || p.end ? `Saving period ${fmtDate(p.start)} – ${fmtDate(p.end)}` : ''}</span></div>
        <div class="stat"><div class="val">${amt(b)} <span class="muted" style="font-size:14px;font-weight:500">of ${amt(p.target)}</span></div></div>
        ${progress(pct, `${Math.max(0, Math.round(pct))}% · ${amt(remain)} to go${plan ? ' · ' + plan : ''}`, false, true)}</div>`;
    } else {
      h += `<div class="callout"><span class="callout-dot"></span><div class="grow">Set a target and saving period to track progress for this pocket.</div><button class="btn btn-sm" data-action="editPocket" data-id="${id}">Set target</button></div>`;
    }
  } else {
    const tm = thisMonth(), ty = thisYear();
    const sm = spentIn(id, tm), sy = spentIn(id, ty), mIdx = new Date().getMonth() + 1;
    h += `<div class="grid g3 mt">
      <div class="card"><div class="lbl">This month</div><div class="stat"><div class="val">${amt(sm)}</div></div>
        ${p.budget ? progress(sm / p.budget * 100, `${Math.round(sm / p.budget * 100)}% of ${amt(p.budget)} budget`, sm > p.budget) : `<div class="muted sm">No monthly budget · <a href="#" data-action="editPocket" data-id="${id}">set one</a></div>`}</div>
      ${stat('This year', amt(sy), today().slice(0, 4))}
      ${stat('Monthly average', amt(sy / mIdx), `Across ${mIdx} months this year`)}
    </div>`;
  }

  const sch = S.schedules.filter(s => s.pocket === id || s.to === id);
  if (sch.length) h += sectionTitle(`Bills & schedules for this pocket · ${sch.length}`) + `<div class="card">${schedList(sch, '')}</div>`;

  h += `<div class="callout"><span class="callout-dot"></span><div class="grow">New money for this pocket is added from the <a href="#/${isInc ? 'income' : 'expense'}">${isInc ? 'Income' : 'Expense'} page</a>. Every record below can still be edited or deleted.</div></div>`;

  h += `<div class="card mt"><div class="card-title">Money in vs out · last 6 months</div>${monthlyChart([
    {name: 'In', cls: 'bi', pred: t => t.to === id},
    {name: isInc ? 'Out' : 'Spent', cls: 'be', pred: t => t.from === id}])}</div>`;

  const asc = [...all].sort((a, c) => a.date.localeCompare(c.date) || (a.createdAt || 0) - (c.createdAt || 0));
  let run = 0; const runMap = {};
  asc.forEach(t => { run += (t.to === id ? t.amount : 0) - (t.from === id ? t.amount : 0); runMap[t.id] = run; });
  const r = rangeOf(ui.pk);
  const list = sorted(all.filter(t => inR(t.date, r)));
  h += sectionTitle('Pocket records') + filterBar('pk') +
    `<div class="grid g2 mt">${stat('In (range)', amt(sum(list.filter(t => t.to === id)), 'pos'), rangeLabel(r))}${stat('Out (range)', amt(sum(list.filter(t => t.from === id))), rangeLabel(r))}</div>
     <div class="card mt">${txTable(list, {ctx: id, run: runMap})}</div>`;
  return h;
}

function pageRecords() {
  const f = ui.rec, r = rangeOf(f), q = f.q.trim().toLowerCase();
  const list = sorted(S.txns.filter(t => inR(t.date, r) && (!f.type || t.type === f.type) &&
    (!q || [t.activity, t.note, t.recipient, t.method, t.sourceId ? srcName(t.sourceId) : '', accName(t.from), t.to ? accName(t.to) : '', t.type === 'expense' ? txnTag(t) : '', String(t.amount)]
      .join(' ').toLowerCase().includes(q))));
  let h = pageHead(icon('records', 22), 'All Records', 'Every income, transfer, expense and withdrawal in one searchable ledger.',
    `<button class="btn btn-primary" data-action="exportExcel">Export to Excel</button><button class="btn" data-action="exportCSV">Export CSV</button>`);
  const extra = `<select data-filter="rec.type" aria-label="Type"><option value="">All types</option>${Object.entries(TYPE_LABEL).map(([k, v]) => opt(k, v, f.type)).join('')}</select>
    <input id="recSearch" type="search" placeholder="Search title, notes, recipient, method, pocket…" value="${esc(f.q)}">`;
  h += filterBar('rec', extra);
  h += `<div class="grid g3 mt">
    ${stat('Income', amt(sum(list.filter(t => t.type === 'income')), 'pos'), rangeLabel(r))}
    ${stat('Expense', amt(sum(list.filter(t => t.type === 'expense'))), rangeLabel(r))}
    ${stat('Records', list.length, 'Matching filters')}
  </div><div class="card mt">${txTable(list)}</div>`;
  return h;
}

function pageSettings() {
  const used = id => S.txns.filter(t => t.sourceId === id).length;
  const listCard = (key, title, hint, placeholder) => `<div class="card"><div class="card-title"><span>${title}</span><span class="muted sm">${S[key].length} options</span></div>
      <p class="muted sm" style="margin-top:0">${hint}</p>
      <div class="add-row"><select id="pick-${key}" aria-label="${title}">${S[key].map(x => opt(x, x, '')).join('')}</select><button class="btn btn-sm" data-action="delListItem" data-key="${key}">Remove</button></div>
      <div class="add-row"><input id="new-${key}" placeholder="${placeholder}" data-enter="addListItem" data-key="${key}"><button class="btn btn-sm btn-primary" data-action="addListItem" data-key="${key}">Add</button></div>
    </div>`;
  const archived = S.pockets.filter(p => p.archived);
  return pageHead(icon('settings', 22), 'Settings', 'Personalise your space, manage fund sources, tags and payment methods, and back up your data.') +
  `${cloudCard()}<div class="grid g2 mt">
    <div class="card"><div class="card-title">Profile</div>
      <label class="field"><span class="lbl">Your name (shown after the welcome message)</span><input data-setting="name" value="${esc(S.name)}"></label>
    </div>
    <div class="card"><div class="card-title">Income period</div>
      <div class="row2">
        <label class="field"><span class="lbl">Start</span><input type="date" data-setting="period.start" value="${S.period.start}"></label>
        <label class="field"><span class="lbl">End</span><input type="date" data-setting="period.end" value="${S.period.end}"></label>
      </div>
      <label class="field mt-sm"><span class="lbl">Repeat</span><select data-setting="period.repeat">${opt('1', 'Roll over automatically every month', S.period.repeat ? '1' : '0')}${opt('0', 'Keep these dates (no repeat)', S.period.repeat ? '1' : '0')}</select></label>
    </div>
  </div>

  <div class="card mt"><div class="card-title">Fund sources <span class="muted sm">Where your income comes from — rename anytime</span></div>
    ${S.sources.map(s => `<div class="list-row"><input data-source-rename="${s.id}" value="${esc(s.name)}"><span class="muted sm">${used(s.id)} records</span><button class="btn btn-sm btn-ghost" data-action="delSource" data-id="${s.id}">Remove</button></div>`).join('') || '<div class="muted">No sources yet.</div>'}
    <div class="add-row"><input id="newSource" placeholder="e.g. your office name, Freelance Design, Weekend Barista" data-enter="addSource"><button class="btn btn-primary" data-action="addSource">Add source</button></div>
  </div>

  <div class="grid g3 mt">
    ${listCard('incomeTags', 'Income pocket tags', 'Shown when you create or edit an income pocket. "Others" always stays last.', 'New income tag…')}
    ${listCard('expenseTags', 'Expense tags', 'Used for expense pockets, expenses and bills.', 'New expense tag…')}
    ${listCard('methods', 'Payment methods', 'Credit and debit cards, Play Store, e-wallets and more.', 'e.g. BCA Credit Card, Jenius')}
  </div>

  <div class="grid g2 mt">
    <div class="card"><div class="card-title">Appearance</div>
      <label class="field"><span class="lbl">Cosmic ocean animation</span><select data-setting="motion">${opt('1', 'On — stars, waves and sea creatures move', S.motion ? '1' : '0')}${opt('0', 'Off — keep the scene still', S.motion ? '1' : '0')}</select></label>
      <p class="muted sm" style="margin-bottom:0">Turn it off if your device feels slow. It also stays still when your system asks for reduced motion.</p>
    </div>
    <div class="card"><div class="card-title">Data</div>
      <p class="muted sm" style="margin-top:0">Your data lives in this browser only. Export a backup regularly.</p>
      <div class="chips">
        <button class="btn btn-sm btn-primary" data-action="exportExcel">Export to Excel</button>
        <button class="btn btn-sm" data-action="exportCSV">Export CSV</button>
        <button class="btn btn-sm" data-action="exportJSON">Backup (JSON)</button>
        <button class="btn btn-sm" data-action="importJSON">Import backup</button>
        <button class="btn btn-sm btn-danger" data-action="resetAll">Reset everything</button>
      </div>
    </div>
  </div>

  <div class="card mt"><div class="card-title">Archived pockets</div>
    ${archived.length ? archived.map(p => `<div class="list-row"><span style="flex:1">${esc(p.name)} <span class="chip">${p.type}</span></span>
      <a class="btn btn-sm btn-ghost" href="#/pocket/${p.id}">View</a>
      <button class="btn btn-sm" data-action="restorePocket" data-id="${p.id}">Restore</button>
      <button class="btn btn-sm btn-ghost" data-action="purgePocket" data-id="${p.id}">Delete forever</button></div>`).join('') : '<div class="muted sm">No archived pockets.</div>'}
  </div>`;
}

/* =========================================================
   MODALS
   ========================================================= */
function closeModal() { closePicker(); $('#modalRoot').innerHTML = ''; }
function modal({title, body, submit = 'Save', onSubmit, danger = false, wide = false, locked = false}) {
  const root = $('#modalRoot');
  root.innerHTML = `<div class="modal-back" ${locked ? '' : 'data-close'}>
    <form class="modal card ${wide ? 'wide' : ''} ${locked ? 'locked' : ''}" novalidate autocomplete="off">
      <div class="modal-head"><h3>${title}</h3>${locked ? '' : `<button type="button" class="icon-btn" data-close aria-label="Close">${icon('close')}</button>`}</div>
      <div class="modal-body">${body}</div>
      ${onSubmit ? `<div class="modal-foot">${locked ? '' : '<button type="button" class="btn btn-ghost" data-close>Cancel</button>'}<button type="button" data-submit class="btn ${danger ? 'btn-danger' : 'btn-primary'}">${submit}</button></div>` : ''}
    </form></div>`;
  const form = root.querySelector('form');
  // Saved via button click (not native form submit) so it also works in sandboxed previews
  const doSubmit = () => {
    if (!onSubmit) return;
    const fd = Object.fromEntries(new FormData(form));
    if (onSubmit(fd, form) !== false) closeModal();
  };
  form.addEventListener('submit', e => { e.preventDefault(); doSubmit(); });
  form.querySelector('[data-submit]')?.addEventListener('click', doSubmit);
  form.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); doSubmit(); }
  });
  root.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', e => { if (e.target === el || el.tagName === 'BUTTON') closeModal(); }));
  closePicker();
  enhanceSelects(form);
  setTimeout(() => form.querySelector('.modal-body input:not([type=hidden]):not([hidden]):not(.money), .modal-body textarea')?.focus(), 40);
  return form;
}
function confirmModal(title, html, label, onYes) {
  modal({title, body: `<div>${html}</div>`, submit: label, danger: true, onSubmit: () => { onYes(); }});
}
const field = (label, inner, hint = '', id = '') =>
  `<label class="field"><span class="lbl" ${id ? `id="${id}"` : ''}>${label}</span>${inner}${hint ? `<span class="hint">${hint}</span>` : ''}</label>`;
const moneyField = (name, val, label = 'Amount', hint = '') =>
  field(label, `<div class="money-wrap"><span>Rp</span><input class="money" name="${name}" inputmode="numeric" placeholder="0" value="${val ? Number(val).toLocaleString('id-ID') : ''}"></div>`, hint);
function accOptions(sel, {general = true, income = true, expense = true, out = false, includeId} = {}) {
  const show = p => !p.archived || p.id === includeId;
  let h = '';
  if (general) h += opt('general', `General Balance · ${rpP(bal('general'))}`, sel);
  const inc = S.pockets.filter(p => p.type === 'income' && show(p));
  const ex = S.pockets.filter(p => p.type === 'expense' && show(p));
  if (income && inc.length) h += `<optgroup label="Income pockets">${inc.map(p => opt(p.id, `${p.name} · ${rpP(bal(p.id))}`, sel)).join('')}</optgroup>`;
  if (expense && ex.length) h += `<optgroup label="Expense pockets (budget)">${ex.map(p => opt(p.id, `${p.name} · ${rpP(bal(p.id))}`, sel)).join('')}</optgroup>`;
  if (out) h += `<optgroup label="Leave tracking">${opt('__out', 'Withdraw / cash out', sel)}</optgroup>`;
  return h;
}
const sourceOptions = () => S.sources.map(s => [s.id, s.name]);
const cycleSelect = (value, allowOnce = true, label = 'One-time (no repeat)') =>
  `<select name="cycle" data-cycle>${Object.entries(CYCLES).filter(([k]) => allowOnce || k !== 'once').map(([k, v]) => opt(k, k === 'once' ? label : v, value)).join('')}</select>`;
// Show/hide the "next date" box when a repeat is chosen, with a sensible default
function wireRepeat(form) {
  const cyc = form.querySelector('[data-cycle]'), box = form.querySelector('[data-next]');
  if (!cyc || !box) return;
  const sync = () => {
    const on = cyc.value !== 'once';
    box.hidden = !on;
    const nd = form.querySelector('[name=nextDue]');
    if (on && nd && !nd.dataset.touched) nd.value = stepDate(form.date.value || today(), cyc.value);
  };
  cyc.addEventListener('change', sync);
  form.date?.addEventListener('change', sync);
  form.querySelector('[name=nextDue]')?.addEventListener('input', e => { e.target.dataset.touched = '1'; });
  sync();
}

/* ---- Add / edit income ---- */
function incomeModal(t, preset = {}) {
  const edit = !!t, s = preset.schedule;
  t = t || {date: today(), to: s?.to || 'general', sourceId: s?.sourceId || S.sources[0]?.id || '', activity: s?.title || '', amount: s?.amount};
  const linked = edit && t.scheduleId ? SCH(t.scheduleId) : null;
  const body = `
    ${s ? `<div class="callout" style="margin:0"><span class="callout-dot"></span><div class="grow">Recording <b>${esc(s.title)}</b>, expected ${fmtDate(s.nextDue)}. After saving, the next date becomes ${s.cycle === 'once' ? 'done' : fmtDate(stepDate(s.nextDue, s.cycle, s.day))}.</div></div>` : ''}
    ${field('Title', `<input name="activity" value="${esc(t.activity || '')}" placeholder="e.g. October salary, Logo project">`)}
    <div class="row2">${moneyField('amount', t.amount)}${field('Date received', `<input type="date" name="date" value="${t.date}">`)}</div>
    <div class="row2">
      ${field('Fund source', selectOther('source', sourceOptions(), t.sourceId, {newLabel: 'Add new source…', placeholder: 'e.g. your office name'}))}
      ${field('Send to', `<select name="to">${accOptions(t.to, {includeId: t.to})}</select>`)}
    </div>
    <div class="hint" style="margin-top:-6px">Keep it in General Balance and allocate later, or send it straight to a pocket.</div>
    ${!edit && !s ? `<div class="row2">${field('Repeats', cycleSelect('once', true, 'One-time (no payday schedule)'), 'Choose Monthly for a salary to get a payday reminder.')}<div data-next hidden>${field('Next payday', `<input type="date" name="nextDue">`)}</div></div>` : ''}
    ${linked ? `<div class="hint">Part of the schedule <b>${esc(linked.title)}</b>.</div>` : ''}
    ${field('Notes', `<textarea name="note" rows="2" placeholder="Optional">${esc(t.note || '')}</textarea>`)}`;
  const form = modal({
    title: edit ? 'Edit income' : 'Add income', body, submit: edit ? 'Save changes' : 'Add income',
    onSubmit: fd => {
      const amount = parseMoney(fd.amount);
      if (amount <= 0) { toast('Enter an amount above Rp 0', 'err'); return false; }
      if (fd.source === '__new' && !String(fd.sourceNew || '').trim()) { toast('Type the new source name', 'err'); return false; }
      const title = fd.activity.trim();
      const data = {type: 'income', amount, date: fd.date || today(), to: fd.to, from: undefined, activity: title, note: fd.note.trim()};
      return commit(() => {
        data.sourceId = fd.source === '__new' ? ensureSource(fd.sourceNew) : fd.source;
        let rec;
        if (edit) rec = Object.assign(S.txns.find(x => x.id === t.id), data);
        else { rec = {id: uid(), createdAt: Date.now(), ...data}; S.txns.push(rec); }
        if (s) { rec.scheduleId = s.id; advanceSchedule(SCH(s.id)); }
        if (!edit && !s && fd.cycle && fd.cycle !== 'once') {
          const nd = fd.nextDue || stepDate(data.date, fd.cycle);
          const sc = {id: uid(), createdAt: Date.now(), kind: 'income', title: title || 'Payday', amount, to: data.to, sourceId: data.sourceId,
            cycle: fd.cycle, nextDue: nd, day: dayOf(nd), remind: 3, active: true, note: ''};
          S.schedules.push(sc); rec.scheduleId = sc.id;
        }
      }, edit ? 'Income updated' : `${rp(amount)} added to ${accName(fd.to)}`);
    }
  });
  wireRepeat(form);
}

/* ---- Add / edit expense ---- */
function expenseModal(t, preset = {}) {
  const edit = !!t, s = preset.schedule;
  const pockets = activePockets('expense');
  if (!edit && !pockets.length) {
    modal({title: 'No expense pockets yet', body: `<p style="margin:0">Create an expense pocket first (for example Bills &amp; Utilities or Subscriptions), fund it from your income, then record expenses here.</p>
      <div><button type="button" class="btn btn-primary" data-action="newPocket" data-type="expense">＋ New expense pocket</button></div>`});
    return;
  }
  const okPocket = id => id && P(id) && P(id).type === 'expense' && !P(id).archived;
  t = t || {date: today(), from: okPocket(s?.pocket) ? s.pocket : okPocket(preset.from) ? preset.from : pockets[0].id,
    activity: s?.title || '', amount: s?.amount, category: s?.tag || '', method: s?.method || '', recipient: s?.recipient || ''};
  const linked = edit && t.scheduleId ? SCH(t.scheduleId) : null;
  const body = `
    ${s ? `<div class="callout" style="margin:0"><span class="callout-dot"></span><div class="grow">Paying <b>${esc(s.title)}</b>, due ${fmtDate(s.nextDue)}. After saving, the next due date becomes ${s.cycle === 'once' ? 'done' : fmtDate(stepDate(s.nextDue, s.cycle, s.day))}.</div></div>` : ''}
    ${field('Title', `<input name="activity" value="${esc(t.activity || '')}" placeholder="e.g. Netflix, Electricity token, Lunch with team">`, 'For a subscription, use the app or service name.')}
    <div class="row2">${moneyField('amount', t.amount)}${field('Date', `<input type="date" name="date" value="${t.date}">`)}</div>
    <div class="row2">
      ${field('Pay from pocket', `<select name="from">${accOptions(t.from, {general: false, income: false, includeId: t.from})}</select>`)}
      ${field('Tag', selectOther('category', S.expenseTags, t.category, {empty: 'Same as the pocket tag', newLabel: 'Add new tag…', placeholder: 'New tag name'}))}
    </div>
    <div class="hint" id="expHint" style="margin-top:-6px"></div>
    <div class="row2">
      ${field('Payment method', selectOther('method', S.methods, t.method, {empty: 'Not specified', newLabel: 'Add new method…', placeholder: 'e.g. BCA Credit Card'}))}
      ${field('Paid to', `<input name="recipient" value="${esc(t.recipient || '')}" placeholder="e.g. Netflix, PLN, Gojek, Mom">`)}
    </div>
    ${!edit && !s ? `<div class="row2">${field('Repeats', cycleSelect('once'), 'Pick Monthly for subscriptions and bills to get reminders.')}<div data-next hidden>${field('Next payment date', `<input type="date" name="nextDue">`)}</div></div>` : ''}
    ${linked ? `<div class="hint">Part of the schedule <b>${esc(linked.title)}</b>.</div>` : ''}
    ${field('Notes', `<textarea name="note" rows="2" placeholder="Optional">${esc(t.note || '')}</textarea>`)}`;
  const form = modal({
    title: edit ? 'Edit expense' : (s ? 'Mark as paid' : 'Add expense'), body, wide: true, submit: edit ? 'Save changes' : (s ? 'Record payment' : 'Add expense'),
    onSubmit: fd => {
      const amount = parseMoney(fd.amount);
      const title = fd.activity.trim();
      if (!title) { toast('Give the expense a title', 'err'); return false; }
      if (amount <= 0) { toast('Enter an amount above Rp 0', 'err'); return false; }
      const avail = bal(fd.from) + (edit && t.from === fd.from ? t.amount : 0);
      const tag = pickOther(fd, 'category'), method = pickOther(fd, 'method');
      const data = {type: 'expense', amount, date: fd.date || today(), from: fd.from, to: undefined,
        activity: title, recipient: fd.recipient.trim(), note: fd.note.trim()};
      const ok = commit(() => {
        data.category = ensureTag('expense', tag);
        data.method = ensureMethod(method);
        let rec;
        if (edit) rec = Object.assign(S.txns.find(x => x.id === t.id), data);
        else { rec = {id: uid(), createdAt: Date.now(), ...data}; S.txns.push(rec); }
        if (s) { rec.scheduleId = s.id; const live = SCH(s.id); if (!live.pocket) live.pocket = data.from; advanceSchedule(live); }
        if (!edit && !s && fd.cycle && fd.cycle !== 'once') {
          const nd = fd.nextDue || stepDate(data.date, fd.cycle);
          const sc = {id: uid(), createdAt: Date.now(), kind: 'expense', title, amount, pocket: data.from, tag: data.category || P(data.from)?.tag || '',
            method: data.method, recipient: data.recipient, cycle: fd.cycle, nextDue: nd, day: dayOf(nd), remind: 3, active: true, note: ''};
          S.schedules.push(sc); rec.scheduleId = sc.id;
        }
      }, edit ? 'Expense updated' : `${rp(amount)} recorded in ${accName(fd.from)}`);
      if (ok && amount > avail) setTimeout(() => toast(`Heads up: ${accName(fd.from)} is now overspent.`, 'err'), 300);
      return ok;
    }
  });
  const upd = () => {
    const id = form.from.value, a = bal(id) + (edit && t.from === id ? t.amount : 0);
    $('#expHint').innerHTML = `Available in this pocket: <b>${rpP(a)}</b> · pocket tag: ${esc(P(id)?.tag || 'none')}${a <= 0 ? ` · <a href="#" data-action="transfer" data-from="general" data-to="${id}">Fund it first</a>` : ''}`;
  };
  form.from.addEventListener('change', upd); upd();
  // Picking the Subscription tag suggests a monthly repeat
  form.category.addEventListener('change', () => {
    const cyc = form.querySelector('[data-cycle]');
    if (cyc && form.category.value === 'Subscription' && cyc.value === 'once') { cyc.value = 'monthly'; cyc.dispatchEvent(new Event('change')); }
  });
  wireRepeat(form);
}

/* ---- Transfer / withdraw ---- */
function transferModal(t, preset = {}) {
  const edit = !!t;
  let from = t ? t.from : preset.from;
  let to = t ? (t.type === 'withdraw' ? '__out' : t.to) : preset.to;
  if (!from) {
    if (preset.kind === 'expense') { const ex = activePockets('expense'); from = ex[0]?.id; to = to || ex[1]?.id; }
    else from = 'general';
  }
  if (!from) { toast('Create at least two expense pockets first', 'err'); return; }
  if (!to) {
    const pool = preset.kind === 'fund' ? activePockets('expense') : [...activePockets('income'), ...activePockets('expense')];
    to = (pool.find(p => p.id !== from) || {}).id || (from === 'general' ? '' : 'general');
  }
  const body = `${moneyField('amount', t?.amount)}
    <div class="row2">
      ${field('From', `<select name="from">${accOptions(from, {includeId: from})}</select>`)}
      ${field('To', `<select name="to">${accOptions(to, {out: true, includeId: to})}</select>`)}
    </div>
    <div class="hint" id="trHint" style="margin-top:-6px"></div>
    <div class="row2">
      ${field('Date', `<input type="date" name="date" value="${t?.date || today()}">`)}
      ${field('Title', `<input name="activity" value="${esc(t?.activity || '')}" placeholder="e.g. Payday allocation">`)}
    </div>
    ${field('Notes', `<textarea name="note" rows="2" placeholder="Optional">${esc(t?.note || '')}</textarea>`)}`;
  const form = modal({
    title: edit ? 'Edit transfer' : 'Transfer money', body, submit: edit ? 'Save changes' : 'Transfer',
    onSubmit: fd => {
      const amount = parseMoney(fd.amount);
      if (amount <= 0) { toast('Enter an amount above Rp 0', 'err'); return false; }
      if (!fd.to) { toast('Choose where the money goes', 'err'); return false; }
      if (fd.from === fd.to) { toast('Pick two different places', 'err'); return false; }
      const avail = bal(fd.from) + (edit && t.from === fd.from ? t.amount : 0);
      if (amount > avail) { toast(`Not enough in ${accName(fd.from)} (available ${rp(avail)})`, 'err'); return false; }
      const data = fd.to === '__out' ? {type: 'withdraw', from: fd.from, to: null} : {type: 'transfer', from: fd.from, to: fd.to};
      Object.assign(data, {amount, date: fd.date || today(), activity: fd.activity.trim(), note: fd.note.trim()});
      return commit(() => {
        if (edit) Object.assign(S.txns.find(x => x.id === t.id), data);
        else S.txns.push({id: uid(), createdAt: Date.now(), ...data});
      }, edit ? 'Transfer updated' : (data.type === 'withdraw' ? `${rp(amount)} withdrawn` : `${rp(amount)} moved to ${accName(fd.to)}`));
    }
  });
  const upd = () => {
    const id = form.from.value, a = bal(id) + (edit && t.from === id ? t.amount : 0);
    $('#trHint').innerHTML = `Available in ${esc(accName(id))}: <b>${rpP(a)}</b>`;
  };
  form.from.addEventListener('change', upd); upd();
}

/* ---- Create / edit pocket ---- */
function pocketModal(p, presetType = 'income') {
  const edit = !!p;
  p = p || {type: presetType, color: presetType === 'income' ? COLORS[0] : COLORS[2], name: '', tag: '', desc: '', payDay: ''};
  const hasTx = edit && S.txns.some(t => t.to === p.id || t.from === p.id);
  const tagSel = (type, val) => selectOther('tag', tagList(type), val, {empty: 'Choose a tag', newLabel: 'Add new tag…', placeholder: 'New tag name'});
  const body = `
    <div class="row2">
      ${field('Pocket type', `<select name="type" ${hasTx ? 'disabled' : ''}>${opt('income', 'Income / savings', p.type)}${opt('expense', 'Expense / budget', p.type)}</select>`,
        hasTx ? 'Locked because this pocket already has records.' : '')}
      ${field('Color', `<div class="color-pick"><span class="swatch-prev" style="background:${pocketColor(p)}"></span><select name="color">${COLORS.map((c, i) => opt(c, COLOR_NAMES[i], pocketColor(p))).join('')}</select></div>`)}
    </div>
    ${field('Pocket name', `<input name="name" value="${esc(p.name)}" placeholder="e.g. Japan Trip 2027, Monthly Bills, Subscriptions">`)}
    <div class="row2">
      ${field('Tag', `<div id="tagWrap">${tagSel(p.type, p.tag)}</div>`)}
      ${field(p.type === 'income' ? 'Usual top-up day' : 'Usual payment day', `<select name="payDay" data-layout="days">${dayOptions(p.payDay)}</select>`, '', 'payDayLbl')}
    </div>
    <div data-for="income" class="row2">
      ${moneyField('target', p.target, 'Savings target (optional)')}
      <div></div>
      ${field('Saving period start', `<input type="date" name="start" value="${p.start || ''}">`)}
      ${field('Saving period end / deadline', `<input type="date" name="end" value="${p.end || ''}">`)}
    </div>
    <div data-for="expense">${moneyField('budget', p.budget, 'Monthly budget (optional)', 'How much you plan to set aside for this pocket every month.')}</div>
    ${field('Description', `<textarea name="desc" rows="2" placeholder="Optional">${esc(p.desc || '')}</textarea>`)}`;
  const form = modal({
    title: edit ? 'Edit pocket' : 'New pocket', body, wide: true, submit: edit ? 'Save pocket' : 'Create pocket',
    onSubmit: fd => {
      const type = hasTx ? p.type : (fd.type || 'income');
      if (!fd.name.trim()) { toast('Give your pocket a name', 'err'); return false; }
      const tag = pickOther(fd, 'tag');
      const data = {
        type, name: fd.name.trim(), color: fd.color || pocketColor(p), tag: ensureTag(type, tag), desc: fd.desc.trim(),
        payDay: fd.payDay === 'last' ? 'last' : (fd.payDay ? Number(fd.payDay) : ''),
        target: type === 'income' ? parseMoney(fd.target) || 0 : 0,
        start: type === 'income' ? fd.start || '' : '', end: type === 'income' ? fd.end || '' : '',
        budget: type === 'expense' ? parseMoney(fd.budget) || 0 : 0
      };
      if (data.start && data.end && data.end < data.start) { toast('End date must be after start date', 'err'); return false; }
      if (edit) Object.assign(P(p.id), data);
      else S.pockets.push({id: uid(), createdAt: Date.now(), ...data});
      save(); render(); toast(edit ? 'Pocket saved' : `${data.name} created`);
    }
  });
  const sync = () => {
    const type = hasTx ? p.type : form.type.value;
    form.querySelectorAll('[data-for]').forEach(el => el.style.display = el.dataset.for === type ? '' : 'none');
    $('#payDayLbl').textContent = type === 'income' ? 'Usual top-up day' : 'Usual payment day';
  };
  form.type.addEventListener('change', () => {
    const cur = form.tag.value === '__new' ? '' : form.tag.value;
    $('#tagWrap').innerHTML = tagSel(form.type.value, tagList(form.type.value).includes(cur) ? cur : '');
    enhanceSelects(form);
    sync();
  });
  form.color.addEventListener('change', () => { form.querySelector('.swatch-prev').style.background = form.color.value; });
  sync();
}

function deletePocketModal(id) {
  const p = P(id); if (!p) return;
  const b = bal(id), n = S.txns.filter(t => t.to === id || t.from === id).length;
  const form = modal({
    title: `Delete ${esc(p.name)}?`, submit: 'Confirm', danger: true,
    body: `${field('What should happen?', `<select name="mode">${opt('archive', 'Archive (recommended) — keep history, restore anytime', 'archive')}${opt('purge', `Delete the pocket and all ${n} records`, 'archive')}</select>`)}
      <div class="hint" id="delHint"></div>`,
    onSubmit: fd => {
      const back = p.type === 'income' ? '#/income' : '#/expense';
      let ok;
      if (fd.mode === 'purge') {
        ok = commit(() => {
          S.txns = S.txns.filter(t => t.to !== id && t.from !== id);
          S.pockets = S.pockets.filter(x => x.id !== id);
          S.schedules.forEach(s => { if (s.pocket === id) s.pocket = ''; if (s.to === id) s.to = 'general'; });
        }, 'Pocket deleted');
      } else {
        ok = commit(() => {
          if (b > 0) S.txns.push({id: uid(), createdAt: Date.now(), type: 'transfer', from: id, to: 'general', amount: b, date: today(), activity: `Closed pocket: ${p.name}`, note: ''});
          P(id).archived = true;
        }, 'Pocket archived');
      }
      if (ok) go(back);
      return ok;
    }
  });
  const hint = () => {
    $('#delHint').textContent = form.mode.value === 'archive'
      ? `${b > 0 ? `The remaining ${rpP(b)} goes back to General Balance. ` : ''}The pocket is hidden and its ${n} records stay in your history.`
      : `Balances everywhere are recalculated as if these ${n} records never happened. This can't be undone.`;
  };
  form.mode.addEventListener('change', hint); hint();
}

/* ---- Bills, subscriptions & paydays ---- */
function scheduleModal(s, preset = {}) {
  const edit = !!s;
  const exPockets = activePockets('expense');
  if ((s ? s.kind : (preset.kind || 'expense')) === 'expense' && !exPockets.length) {
    modal({title: 'Create an expense pocket first', body: `<p style="margin:0">Every payment is paid from an expense pocket, so its balance always stays correct. Create one first — for example "Subscriptions" or "Bills &amp; Utilities".</p>
      <div><button type="button" class="btn btn-primary" data-action="newPocket" data-type="expense">＋ New expense pocket</button></div>`});
    return;
  }
  s = s || {kind: preset.kind || 'expense', title: '', amount: 0, tag: preset.tag || '', method: '', recipient: '',
    pocket: preset.pocket || exPockets.find(p => p.tag === preset.tag)?.id || exPockets[0]?.id || '', to: 'general', sourceId: S.sources[0]?.id || '',
    cycle: 'monthly', nextDue: today(), remind: 3, active: true, autopay: false, note: ''};
  const pocketId = P(s.pocket) && !P(s.pocket).archived ? s.pocket : exPockets[0]?.id || '';
  const body = `
    <div class="row2">
      ${field('Type', `<select name="kind">${opt('expense', 'Bill or subscription (money out)', s.kind)}${opt('income', 'Payday or expected income (money in)', s.kind)}</select>`)}
      ${field('Repeats', cycleSelect(s.cycle, true, 'One-time'))}
    </div>
    ${field('Title', `<input name="title" value="${esc(s.title)}" placeholder="e.g. Netflix, Spotify, iCloud, Electricity, Salary">`, 'For a subscription, use the app or service name.')}
    <div class="row2">
      ${moneyField('amount', s.amount)}
      ${field('Next due date', `<input type="date" name="nextDue" value="${s.nextDue || today()}">`, 'Later dates follow the same day of the month.')}
    </div>
    <div data-k="expense">
      <div class="row2">
        ${field('Payment method', selectOther('method', S.methods, s.method, {empty: 'Not specified', newLabel: 'Add new method…', placeholder: 'e.g. BCA Credit Card'}))}
        ${field('Tag', selectOther('tag', S.expenseTags, s.tag, {empty: 'Same as the pocket tag', newLabel: 'Add new tag…', placeholder: 'New tag name'}))}
      </div>
      <div class="row2 mt-row">
        ${field('Pay from pocket', `<select name="pocket">${exPockets.map(p => opt(p.id, `${p.name} · ${rpP(bal(p.id))}`, pocketId)).join('')}</select>`)}
        ${field('Paid to', `<input name="recipient" value="${esc(s.recipient || '')}" placeholder="e.g. Netflix, PLN">`)}
      </div>
    </div>
    <div data-k="income" class="row2">
      ${field('Fund source', selectOther('source', sourceOptions(), s.sourceId, {newLabel: 'Add new source…', placeholder: 'e.g. your office name'}))}
      ${field('Send to', `<select name="to">${accOptions(s.to || 'general', {expense: true, includeId: s.to})}</select>`)}
    </div>
    ${field('When it is due', `<select name="autopay">${opt('0', 'Remind me — I press Mark paid myself', s.autopay ? '1' : '0')}${opt('1', 'Auto-pay — record it automatically on the due date', s.autopay ? '1' : '0')}</select>`,
      'Auto-pay records the payment in the pocket on the due date, even if you open the app later.')}
    <div class="row2">
      ${field('Highlight it', `<select name="remind">${[[0, 'On the due date'], [1, '1 day before'], [3, '3 days before'], [7, '7 days before']].map(([v, l]) => opt(v, l, s.remind ?? 3)).join('')}</select>`)}
      ${edit ? field('Status', `<select name="active">${opt('1', 'Active', s.active === false ? '0' : '1')}${opt('0', 'Paused', s.active === false ? '0' : '1')}</select>`) : '<div></div>'}
    </div>
    ${field('Notes', `<textarea name="note" rows="2" placeholder="Optional — e.g. family plan, renews automatically">${esc(s.note || '')}</textarea>`)}`;
  const form = modal({
    title: edit ? 'Edit schedule' : (s.kind === 'income' ? 'New payday' : 'New payment'),
    body, wide: true, submit: edit ? 'Save' : 'Add schedule',
    onSubmit: fd => {
      const title = fd.title.trim(), amount = parseMoney(fd.amount);
      if (!title) { toast('Give it a title, e.g. the app name', 'err'); return false; }
      if (amount <= 0) { toast('Enter an amount above Rp 0', 'err'); return false; }
      if (!fd.nextDue) { toast('Choose the next due date', 'err'); return false; }
      if (fd.kind === 'expense' && !P(fd.pocket)) { toast('Choose the pocket this is paid from', 'err'); return false; }
      const data = {kind: fd.kind, title, amount, cycle: fd.cycle, nextDue: fd.nextDue, day: dayOf(fd.nextDue), autopay: fd.autopay === '1',
        remind: Number(fd.remind), note: fd.note.trim(), active: edit ? fd.active !== '0' : true};
      if (fd.kind === 'expense') Object.assign(data, {method: ensureMethod(pickOther(fd, 'method')), tag: ensureTag('expense', pickOther(fd, 'tag')) || P(fd.pocket)?.tag || '',
        pocket: fd.pocket, recipient: fd.recipient.trim()});
      else Object.assign(data, {to: fd.to, sourceId: fd.source === '__new' ? ensureSource(fd.sourceNew) : fd.source});
      if (edit) Object.assign(SCH(s.id), data);
      else S.schedules.push({id: uid(), createdAt: Date.now(), ...data});
      save();
      runAutopay();
      render(); toast(edit ? 'Schedule saved' : `${title} added — next on ${fmtDate(data.nextDue)}`);
    }
  });
  const sync = () => {
    form.querySelectorAll('[data-k]').forEach(el => el.style.display = el.dataset.k === form.kind.value ? '' : 'none');
    if (!edit) $('#modalRoot .modal-head h3').textContent = form.kind.value === 'income' ? 'New payday' : 'New payment';
  };
  form.kind.addEventListener('change', sync); sync();
}

function periodModal() {
  modal({
    title: 'Income period', submit: 'Save period',
    body: `<div class="row2">${field('Start', `<input type="date" name="start" value="${S.period.start}">`)}${field('End', `<input type="date" name="end" value="${S.period.end}">`)}</div>
      ${field('Repeat', `<select name="repeat">${opt('1', 'Roll over to the next period every month', S.period.repeat ? '1' : '0')}${opt('0', 'Keep these dates (no repeat)', S.period.repeat ? '1' : '0')}</select>`)}
      <div class="hint">Tip: if you get paid on the 25th, set 25 Oct – 24 Nov.</div>`,
    onSubmit: fd => {
      if (!fd.start || !fd.end || fd.end < fd.start) { toast('Please choose a valid period', 'err'); return false; }
      S.period = {start: fd.start, end: fd.end, repeat: fd.repeat === '1'};
      rollPeriod(); save(); render(); toast('Income period saved');
    }
  });
}

function expBreakdownModal() {
  const tm = thisMonth();
  const pockets = activePockets('expense');
  const fundings = sorted(S.txns.filter(t => isExpenseAcc(t.to) && !isExpenseAcc(t.from))).slice(0, 6);
  modal({
    title: `Expense balance · ${rpP(expenseBalance())}`, wide: true,
    body: `<div>${pockets.length ? pockets.map(p => {
        const funded = sum(S.txns.filter(t => t.to === p.id && inR(t.date, tm)));
        return `<div class="brk-row">${avatar(p)}
          <div class="grow"><b>${esc(p.name)}</b><div class="muted sm">Funded this month ${amt(funded)} · spent ${amt(spentIn(p.id, tm))}</div></div>
          <b>${amt(bal(p.id), bal(p.id) < 0 ? 'over' : '')}</b>
          <a class="btn btn-sm" href="#/pocket/${p.id}">Open →</a></div>`;
      }).join('') : '<div class="empty">No expense pockets yet.</div>'}</div>
      <div><div class="lbl" style="margin-bottom:6px">Latest money in from income</div>
      ${fundings.length ? fundings.map(t => `<div class="brk-row"><div class="grow sm">${fmtDate(t.date)} · ${t.from ? esc(accName(t.from)) : esc(srcName(t.sourceId))} → <b>${esc(accName(t.to))}</b></div>${amt(t.amount, 'pos')}</div>`).join('') : '<div class="muted sm">No funding yet.</div>'}</div>`
  });
}

/* ---------------- Toast ---------------- */
function toast(msg, kind = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + kind; el.textContent = msg;
  $('#toastRoot').appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; }, 2600);
  setTimeout(() => el.remove(), 3000);
}

/* ---------------- Data import / export ---------------- */
function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], {type}));
  let ok = true;
  try { const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
  catch (e) { ok = false; toast('Downloads are blocked in this preview — open the file in your browser', 'err'); }
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return ok;
}
const recFrom = t => t.type === 'income' ? srcName(t.sourceId) : accName(t.from);
const recTo = t => t.type === 'expense' ? (t.recipient || '') : t.type === 'withdraw' ? 'Cash out' : accName(t.to);
function toCSV() {
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['Date', 'Type', 'Title', 'From', 'To / Paid to', 'Tag', 'Payment method', 'Amount (IDR)', 'Notes'];
  const rows = sorted(S.txns).map(t => [t.date, TYPE_LABEL[t.type], t.activity, recFrom(t), recTo(t),
    t.type === 'expense' ? txnTag(t) : (P(t.to)?.tag || ''), t.method || '', t.amount, t.note || ''].map(q).join(','));
  return '﻿' + [head.map(q).join(','), ...rows].join('\n');
}
function exportExcel() {
  if (!window.XLSXLite) { toast('Excel export is not available', 'err'); return; }
  const tm = thisMonth(), ty = thisYear();
  const exps = S.txns.filter(t => t.type === 'expense');
  const summary = [
    [{t: `Cosmic Currents — ${S.name}`}],
    ['Exported on', {d: today()}],
    [],
    [{h: 'Overview'}, {h: 'Amount'}],
    ['Lifetime income', {m: totalIncome()}],
    ['Savings balance (General + income pockets)', {m: savingsBalance()}],
    ['General Balance (unallocated)', {m: bal('general')}],
    ['Expense budget left', {m: expenseBalance()}],
    [{b: 'Net worth'}, {mb: savingsBalance() + expenseBalance()}],
    ['Spent this month', {m: sum(exps.filter(t => inR(t.date, tm)))}],
    ['Spent this year', {m: sum(exps.filter(t => inR(t.date, ty)))}],
    ['Subscriptions per month', {m: sum(S.schedules.filter(s => s.kind === 'expense' && s.tag === 'Subscription'), perMonth)}],
    ['Income period', `${fmtDate(S.period.start)} – ${fmtDate(S.period.end)}`]
  ];
  const records = [[{h: 'Date'}, {h: 'Type'}, {h: 'Title'}, {h: 'From'}, {h: 'To / Paid to'}, {h: 'Fund source'}, {h: 'Tag'}, {h: 'Payment method'}, {h: 'Amount'}, {h: 'Notes'}],
    ...sorted(S.txns).map(t => [{d: t.date}, TYPE_LABEL[t.type], t.activity || defDesc(t), recFrom(t), recTo(t),
      t.type === 'income' ? srcName(t.sourceId) : '', t.type === 'expense' ? txnTag(t) : (P(t.to)?.tag || ''), t.method || '', {m: t.amount}, t.note || ''])];
  const pockets = [[{h: 'Pocket'}, {h: 'Type'}, {h: 'Tag'}, {h: 'Balance'}, {h: 'Total in'}, {h: 'Total out'}, {h: 'Target'}, {h: 'Monthly budget'}, {h: 'Usual day'}, {h: 'Status'}],
    ...S.pockets.map(p => [p.name, p.type === 'income' ? 'Income' : 'Expense', p.tag || '', {m: bal(p.id)},
      {m: sum(S.txns.filter(t => t.to === p.id))}, {m: sum(S.txns.filter(t => t.from === p.id))},
      p.target ? {m: p.target} : '', p.budget ? {m: p.budget} : '', p.payDay ? dayText(p.payDay) : '', p.archived ? 'Archived' : 'Active'])];
  const schedules = [[{h: 'Title'}, {h: 'Type'}, {h: 'Amount'}, {h: 'Repeats'}, {h: 'Next due'}, {h: 'Per month'}, {h: 'Payment method'}, {h: 'Pocket / Send to'}, {h: 'Tag'}, {h: 'Status'}],
    ...S.schedules.map(s => [s.title, s.kind === 'income' ? 'Payday / income' : (s.tag === 'Subscription' ? 'Subscription' : 'Bill'), {m: s.amount}, cycleText(s),
      s.nextDue ? {d: s.nextDue} : '', {m: perMonth(s)}, s.method || '', s.kind === 'income' ? accName(s.to || 'general') : (s.pocket ? accName(s.pocket) : ''),
      s.tag || '', s.active === false ? (s.nextDue ? 'Paused' : 'Done') : 'Active'])];
  const bytes = XLSXLite.build([
    {name: 'Summary', cols: [44, 22], rows: summary},
    {name: 'Records', cols: [13, 11, 30, 24, 24, 22, 20, 18, 16, 30], rows: records, freeze: true, filter: true},
    {name: 'Pockets', cols: [26, 10, 22, 16, 16, 16, 16, 16, 22, 10], rows: pockets, freeze: true, filter: true},
    {name: 'Bills & Paydays', cols: [26, 16, 16, 30, 13, 15, 18, 24, 20, 10], rows: schedules, freeze: true, filter: true}
  ]);
  if (download(`cosmic-currents-${today()}.xlsx`, bytes, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) toast('Excel file downloaded');
}

/* =========================================================
   CLOUD SYNC (email & password accounts) — see sync.js
   ========================================================= */
const hasContent = () => S.txns.length || S.pockets.length || S.schedules.length;
// Combine two copies: everything from both is kept; the cloud wins when the same item differs
function mergeData(local, cloud) {
  const cm = cloud.meta || {};
  const byId = (a = [], b = []) => { const m = new Map(a.map(x => [x.id, x])); b.forEach(x => m.set(x.id, x)); return [...m.values()]; };
  // Same source name on both devices = same source
  const srcMap = {};
  const sources = [...(cm.sources || [])];
  (local.meta.sources || []).forEach(s => {
    const same = sources.find(x => x.name.toLowerCase() === s.name.toLowerCase());
    if (same) { if (same.id !== s.id) srcMap[s.id] = same.id; } else sources.push(s);
  });
  const fix = t => (t.sourceId && srcMap[t.sourceId]) ? {...t, sourceId: srcMap[t.sourceId]} : t;
  const list = k => { const out = [...(cm[k] || [])]; (local.meta[k] || []).forEach(x => addToList(out, x)); return out; };
  const meta = {...local.meta, ...cm, sources,
    pockets: byId(local.meta.pockets, cm.pockets), schedules: byId(local.meta.schedules, cm.schedules),
    incomeTags: list('incomeTags'), expenseTags: list('expenseTags'), methods: list('methods')};
  meta.schedules = meta.schedules.map(s => fix(s));
  return {meta, txns: byId(local.txns.map(fix), cloud.txns)};
}
function askHowToSync() {
  return new Promise(res => {
    modal({
      title: 'Sync this device', locked: true, submit: 'Continue',
      body: `<p style="margin:0">Your account already has data in the cloud, and this device also has its own data. What should happen?</p>
        ${field('Choose', `<select name="mode">
          ${opt('merge', 'Combine both (recommended) — nothing is lost', 'merge')}
          ${opt('cloud', 'Use the cloud data only — replace this device', 'merge')}
          ${opt('local', 'Use this device only — replace the cloud', 'merge')}</select>`)}
        <div class="hint">A copy of this device's data is kept as a safety backup either way.</div>`,
      onSubmit: fd => { res(fd.mode || 'merge'); }
    });
  });
}
const cloudHooks = {
  async resolve(cloud, uid) {
    const local = dataOf();
    const cloudEmpty = !cloud.meta && !cloud.txns.length;
    if (cloudEmpty) return local;                          // first device: upload
    if (!hasContent()) return cloud;                       // empty device: download
    if (S.syncUid === uid) return S.unsynced ? mergeData(local, cloud) : cloud;
    const mode = await askHowToSync();
    return mode === 'cloud' ? cloud : mode === 'local' ? local : mergeData(local, cloud);
  },
  apply(data, uid) {
    const before = JSON.stringify(dataOf());
    if (hasContent() && before !== JSON.stringify(data)) {
      try { localStorage.setItem(KEY + '-before-sync', JSON.stringify(S)); } catch (e) { /* ignore */ }
    }
    const device = {welcomeIdx: S.welcomeIdx, privacy: S.privacy, motion: S.motion};
    S = Object.assign(defaults(), data.meta || {}, {txns: data.txns || []}, device, {syncUid: uid, unsynced: false});
    migrate();
    S.cloudHash = hashStr(JSON.stringify(dataOf()));
    saveLocal(); render();
    toast('Signed in — this device is now synced');
    runAutopayOnce();
  },
  applyRemote(data) {
    const canon = d => JSON.stringify({meta: d.meta, txns: [...d.txns].sort((a, b) => a.id < b.id ? -1 : 1)});
    const incoming = JSON.stringify(data);
    if (canon(data) === canon(dataOf())) return;
    const device = {welcomeIdx: S.welcomeIdx, privacy: S.privacy, motion: S.motion, syncUid: S.syncUid};
    S = Object.assign(defaults(), data.meta || {}, {txns: data.txns || []}, device, {unsynced: false});
    migrate();
    S.cloudHash = hashStr(incoming);
    saveLocal();
    if (!$('#modalRoot').innerHTML) render(); else renderNav(route());
  },
  signedOut() { renderAuth(); }
};
function syncLabel(st) {
  switch (st.state) {
    case 'loading': return ['busy', 'Connecting…'];
    case 'signedout': return ['off', 'Signed out'];
    case 'syncing': return ['busy', 'Syncing…'];
    case 'offline': return ['warn', 'Offline — saved on device'];
    case 'synced': return ['ok', 'Synced'];
    case 'error': return ['warn', 'Sync problem'];
    default: return ['', ''];
  }
}
function updateSyncPill() {
  const el = $('#syncPill'); if (!el) return;
  const st = CLOUD.status();
  if (!CLOUD.enabled) { el.hidden = true; return; }
  const [cls, txt] = syncLabel(st);
  el.hidden = false;
  el.className = 'sync-pill ' + cls;
  el.innerHTML = `<i></i><span>${esc(txt)}</span>`;
}
function cloudCard() {
  const st = CLOUD.status();
  if (!CLOUD.enabled) return `<div class="card"><div class="card-title">Account &amp; sync</div>
    <p class="muted sm" style="margin-top:0">Accounts and sync are not set up yet. Follow section 10 of the manual: create a free Firebase project, then paste its settings into <b>firebase-config.js</b>. Until then, your data stays on this device only.</p></div>`;
  const time = st.lastSync ? new Date(st.lastSync).toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit'}) : '';
  const [cls, txt] = syncLabel(st);
  const body = st.uid
    ? `<p class="sm" style="margin-top:0">Signed in as <b>${esc(st.email)}</b></p>
       <p class="muted sm">${esc(txt)}${time && st.state === 'synced' ? ` · last update ${time}` : ''}</p>
       <div class="chips"><button class="btn btn-sm" data-action="changePassword">Change password</button><button class="btn btn-sm" data-action="signOut">Sign out</button></div>`
    : `<p class="muted sm" style="margin-top:0">You are using an offline copy on this device. Changes made now are combined with your account when you sign in again.</p>
       <button class="btn btn-sm btn-primary" data-action="showLogin">Go to sign in</button>`;
  return `<div class="card"><div class="card-title"><span>Account &amp; sync</span><span class="sync-pill ${cls}"><i></i><span>${esc(txt)}</span></span></div>
    ${body}${st.error && st.uid ? `<div class="callout warn" style="margin-top:10px"><span class="callout-dot"></span><div class="grow sm">${esc(st.error)}</div></div>` : ''}</div>`;
}

/* ---------------- Login page ----------------
   Shown when accounts are set up and nobody is signed in on this device.
   Accounts are email + password, stored safely by Firebase. */
const authVisible = () => {
  if (!CLOUD.enabled || ui.offline) return false;
  const st = CLOUD.status();
  return st.state === 'loading' || st.state === 'signedout' || (st.state === 'error' && !st.uid);
};
function authHTML(st) {
  const mode = ui.authMode || 'in';
  const brand = `<div class="auth-brand"><span class="brand-logo"><svg class="ic" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12c2.5-3 5-3 7.5 0s5 3 7.5 0 3.5-2 5-1M2 17c2.5-3 5-3 7.5 0s5 3 7.5 0 3.5-2 5-1M2 7c2.5-3 5-3 7.5 0s5 3 7.5 0 3.5-2 5-1"/></svg></span>
    <div><div class="auth-title">Cosmic Currents</div><div class="muted sm">Dedicated for Sofi</div></div></div>`;
  if (st.state === 'loading') return `${brand}<div class="auth-loading"><span class="spinner"></span>Connecting…</div>`;
  if (st.state === 'error' && st.sdkFailed) return `${brand}
    <div class="callout warn" style="margin:0"><span class="callout-dot"></span><div class="grow sm">${esc(st.error)}</div></div>
    <div class="auth-actions"><button class="btn btn-primary" data-auth="retry">Try again</button><button class="btn" data-auth="offline">Open offline copy</button></div>
    <p class="muted sm">The offline copy uses what is saved on this device. It syncs again once you sign in.</p>`;
  const email = esc(ui.authEmail || '');
  const tabs = `<div class="auth-tabs" role="tablist">
      <button type="button" class="${mode === 'in' ? 'on' : ''}" data-auth-mode="in">Sign in</button>
      <button type="button" class="${mode === 'up' ? 'on' : ''}" data-auth-mode="up">Create account</button></div>`;
  const pw = (name, label, ac) => `<label class="field"><span class="lbl">${label}</span><div class="pw-wrap"><input type="password" name="${name}" autocomplete="${ac}" placeholder="At least 6 characters"><button type="button" class="pw-toggle" data-pw-toggle>Show</button></div></label>`;
  if (mode === 'reset') return `${brand}
    <form class="auth-form" id="authForm" novalidate>
      <h2 class="auth-h">Reset your password</h2>
      <p class="muted sm" style="margin:0">Enter your account email and we'll send you a link to choose a new password.</p>
      <label class="field"><span class="lbl">Email</span><input type="email" name="email" autocomplete="email" value="${email}" placeholder="you@example.com"></label>
      <div class="auth-msg" id="authMsg" role="alert"></div>
      <button type="submit" class="btn btn-primary auth-submit">Send reset link</button>
      <button type="button" class="link-btn" data-auth-mode="in">Back to sign in</button>
    </form>`;
  return `${brand}${tabs}
    <form class="auth-form" id="authForm" novalidate>
      <label class="field"><span class="lbl">Email</span><input type="email" name="email" autocomplete="email" value="${email}" placeholder="you@example.com"></label>
      ${pw('pw', 'Password', mode === 'up' ? 'new-password' : 'current-password')}
      ${mode === 'up' ? pw('pw2', 'Confirm password', 'new-password') : ''}
      <div class="auth-msg" id="authMsg" role="alert">${st.state === 'error' && st.error ? esc(st.error) : ''}</div>
      <button type="submit" class="btn btn-primary auth-submit">${mode === 'up' ? 'Create account' : 'Sign in'}</button>
      ${mode === 'in' ? '<button type="button" class="link-btn" data-auth-mode="reset">Forgot password?</button>' : ''}
    </form>
    <p class="muted sm auth-note">${mode === 'up' ? 'Use any email you own. Your data is saved to this account and syncs between your phone and laptop.' : 'Now penning your every currents to your constellation.'}</p>`;
}
function renderAuth() {
  const root = $('#authRoot'); if (!root) return;
  const show = authVisible();
  document.body.classList.toggle('locked', show);
  if (!show) { root.innerHTML = ''; root.dataset.key = ''; return; }
  const st = CLOUD.status();
  const key = `${st.state}|${ui.authMode || 'in'}|${st.sdkFailed ? 1 : 0}`;
  if (root.dataset.key === key && root.innerHTML) return;   // don't redraw while typing
  root.dataset.key = key;
  root.innerHTML = `<div class="auth">${skyArt('auth-art')}<div class="auth-card card">${authHTML(st)}</div></div>`;
  const form = $('#authForm');
  if (!form) return;
  setTimeout(() => (form.email.value ? (form.pw || form.email) : form.email).focus(), 60);
  form.email.addEventListener('input', () => { ui.authEmail = form.email.value; });
  const btn = form.querySelector('.auth-submit');
  const msg = (t, ok = false) => { const m = $('#authMsg'); m.textContent = t; m.classList.toggle('ok', ok); };
  const submit = async () => {
    const mode = ui.authMode || 'in', email = form.email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg('Enter a valid email address.'); return; }
    if (mode !== 'reset') {
      const pw = form.pw.value;
      if (pw.length < 6) { msg('Password needs at least 6 characters.'); return; }
      if (mode === 'up' && pw !== form.pw2.value) { msg('The two passwords don\'t match.'); return; }
    }
    const label = btn.textContent;
    btn.disabled = true; btn.textContent = mode === 'up' ? 'Creating account…' : mode === 'reset' ? 'Sending…' : 'Signing in…';
    const res = mode === 'up' ? await CLOUD.signUpEmail(email, form.pw.value)
      : mode === 'reset' ? await CLOUD.resetPassword(email) : await CLOUD.signInEmail(email, form.pw.value);
    if (!$('#authForm')) return;   // signed in: the page already moved on
    btn.disabled = false; btn.textContent = label;
    if (!res.ok) { msg(res.error); return; }
    if (mode === 'reset') msg('If an account exists for this email, a reset link is on its way. Check your inbox and spam folder.', true);
    if (mode === 'up') toast('Account created — welcome!');
  };
  form.addEventListener('submit', e => { e.preventDefault(); submit(); });
  btn.addEventListener('click', e => { e.preventDefault(); submit(); });
  form.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); submit(); } });
}
document.addEventListener('click', e => {
  const m = e.target.closest('[data-auth-mode]');
  if (m) { e.preventDefault(); ui.authMode = m.dataset.authMode; renderAuth(); return; }
  const t = e.target.closest('[data-pw-toggle]');
  if (t) { const i = t.parentElement.querySelector('input'); const show = i.type === 'password'; i.type = show ? 'text' : 'password'; t.textContent = show ? 'Hide' : 'Show'; return; }
  const a = e.target.closest('[data-auth]');
  if (a) {
    if (a.dataset.auth === 'retry') location.reload();
    if (a.dataset.auth === 'offline') { ui.offline = true; renderAuth(); render(); runAutopayOnce(); }
  }
});

/* ---------------- Auto-pay ----------------
   Schedules with auto-pay on are recorded by themselves on the due date.
   Each automatic record has a fixed id (schedule + date), so two devices
   can never record the same payment twice. */
let autopayDone = false;
function runAutopayOnce() { if (autopayDone) return; autopayDone = true; runAutopay(); }
function runAutopay() {
  const t0 = today(), done = [];
  S.schedules.forEach(s => {
    if (!s.autopay || s.active === false) return;
    let guard = 0;
    while (s.nextDue && s.nextDue <= t0 && s.active !== false && guard++ < 60) {
      const id = `ap-${s.id}-${s.nextDue}`;
      if (!S.txns.some(t => t.id === id)) {
        if (s.kind === 'expense') {
          if (!P(s.pocket)) break;
          S.txns.push({id, createdAt: Date.now(), type: 'expense', amount: s.amount, date: s.nextDue, from: s.pocket, activity: s.title,
            recipient: s.recipient || '', method: s.method || '', category: s.tag || '', note: 'Auto-paid', scheduleId: s.id, auto: true});
        } else {
          const to = s.to === 'general' || P(s.to) ? s.to : 'general';
          S.txns.push({id, createdAt: Date.now(), type: 'income', amount: s.amount, date: s.nextDue, to, sourceId: s.sourceId || '',
            activity: s.title, note: 'Auto-recorded', scheduleId: s.id, auto: true});
        }
        done.push(s.title);
      }
      advanceSchedule(s);
    }
  });
  if (done.length) {
    save(); render();
    const names = [...new Set(done)];
    toast(`Auto-recorded ${done.length} payment${done.length > 1 ? 's' : ''}: ${names.slice(0, 3).join(', ')}${names.length > 3 ? '…' : ''}`);
  }
}

/* =========================================================
   ACTIONS (every button)
   ========================================================= */
const A = {
  addIncome: () => incomeModal(null),
  addExpense: d => expenseModal(null, {from: d.from}),
  transfer: d => transferModal(null, {from: d.from, to: d.to, kind: d.kind}),
  newPocket: d => pocketModal(null, d.type || 'income'),
  editPocket: d => pocketModal(P(d.id)),
  deletePocket: d => deletePocketModal(d.id),
  restorePocket: d => { const p = P(d.id); if (p) { p.archived = false; save(); render(); toast(`${p.name} restored`); } },
  purgePocket: d => { const p = P(d.id); if (!p) return; confirmModal('Delete forever?', `<b>${esc(p.name)}</b> and all its records will be removed permanently.`, 'Delete forever',
    () => commit(() => { S.txns = S.txns.filter(t => t.to !== d.id && t.from !== d.id); S.pockets = S.pockets.filter(x => x.id !== d.id); }, 'Pocket deleted')); },
  editTxn: d => { const t = S.txns.find(x => x.id === d.id); if (!t) return; ({income: incomeModal, expense: expenseModal, transfer: transferModal, withdraw: transferModal})[t.type](t); },
  delTxn: d => { const t = S.txns.find(x => x.id === d.id); if (!t) return;
    confirmModal('Delete this record?', `${TYPE_LABEL[t.type]} · <b>${esc(t.activity || defDesc(t))}</b> · ${amt(t.amount)} on ${fmtDate(t.date)}.<br><span class="muted sm">Balances will be recalculated.</span>`, 'Delete',
      () => commit(() => { S.txns = S.txns.filter(x => x.id !== d.id); }, 'Record deleted')); },
  newSched: d => scheduleModal(null, {kind: d.kind, tag: d.tag, pocket: d.pocket}),
  editSched: d => { const s = SCH(d.id); if (s) scheduleModal(s); },
  delSched: d => { const s = SCH(d.id); if (!s) return;
    confirmModal('Delete this schedule?', `<b>${esc(s.title)}</b> will stop reminding you. Payments you already recorded stay in your records.`, 'Delete',
      () => { S.schedules = S.schedules.filter(x => x.id !== d.id); save(); render(); toast('Schedule deleted'); }); },
  payNow: d => { const s = SCH(d.id); if (!s) return; s.kind === 'income' ? incomeModal(null, {schedule: s}) : expenseModal(null, {schedule: s}); },
  skipSched: d => { const s = SCH(d.id); if (!s) return; const was = s.nextDue; advanceSchedule(s); save(); render(); toast(`Skipped ${fmtDM(was)} — next on ${fmtDate(s.nextDue)}`); },
  pauseSched: d => { const s = SCH(d.id); if (!s) return; s.active = s.active === false; save(); render(); toast(s.active ? `${s.title} resumed` : `${s.title} paused`); },
  editPeriod: () => periodModal(),
  expBreakdown: () => expBreakdownModal(),
  shiftRange: d => {
    const f = ui[d.key], n = Number(d.dir);
    if (f.range === 'day') f.anchor = addDays(f.anchor, n);
    else if (f.range === 'week') f.anchor = addDays(f.anchor, 7 * n);
    else if (f.range === 'month') f.anchor = addMonths(f.anchor, n);
    else if (f.range === 'year') f.anchor = addMonths(f.anchor, 12 * n);
    else if (f.range === 'period') f.pOff = (f.pOff || 0) + n;
    render();
  },
  todayRange: d => { ui[d.key].anchor = today(); ui[d.key].pOff = 0; render(); },
  togglePrivacy: () => { S.privacy = !S.privacy; saveLocal(); applyPrivacy(); render(); },
  toggleSidebar: () => document.body.classList.toggle('nav-open'),
  nextWelcome: () => { S.welcomeIdx = (S.welcomeIdx + 1) % WELCOMES.length; saveLocal(); ui.typedDone = false; render(); },
  addSource: () => { const i = $('#newSource'); const v = i?.value.trim(); if (!v) return; ensureSource(v); save(); render(); toast('Fund source added'); },
  delSource: d => { const s = S.sources.find(x => x.id === d.id); if (!s) return;
    confirmModal('Remove fund source?', `<b>${esc(s.name)}</b> will be removed. Existing income records will show "Unspecified" as their source.`, 'Remove',
      () => { S.sources = S.sources.filter(x => x.id !== d.id); save(); render(); toast('Source removed'); }); },
  addListItem: d => { const i = $(`#new-${d.key}`); const v = i?.value.trim(); if (!v) return; addToList(S[d.key], v); save(); render(); toast(`"${v}" added`); },
  delListItem: d => {
    const sel = $(`#pick-${d.key}`); const v = sel?.value; if (!v) return;
    if (v.toLowerCase() === 'others') { toast('"Others" stays as a fallback option', 'err'); return; }
    S[d.key] = S[d.key].filter(x => x !== v); save(); render(); toast(`"${v}" removed`);
  },
  exportExcel: () => exportExcel(),
  showLogin: () => { ui.offline = false; ui.authMode = 'in'; renderAuth(); },
  changePassword: async () => {
    const st = CLOUD.status();
    const res = await CLOUD.resetPassword(st.email);
    toast(res.ok ? `A link to change your password was sent to ${st.email}` : res.error, res.ok ? '' : 'err');
  },
  signOut: () => {
    const pending = CLOUD.hasPending && CLOUD.hasPending();
    confirmModal('Sign out?', `Your data stays safe in your account. For privacy, this device's copy is removed and the login page appears — sign in again anytime to get everything back.${pending ? '<br><br><b>Some changes haven\'t reached the cloud yet</b> (no internet). Connect first, or they will be lost.' : ''}`, 'Sign out', async () => {
      toast('Signing out…');
      await CLOUD.signOut();
      const device = {welcomeIdx: S.welcomeIdx, privacy: S.privacy, motion: S.motion};
      S = Object.assign(defaults(), device);
      saveLocal();
      try { localStorage.removeItem(KEY + '-before-sync'); } catch (e) { /* ignore */ }
      ui.authMode = 'in'; ui.offline = false;
      go('#/home'); renderAuth();
    });
  },
  exportJSON: () => { if (download(`cosmic-currents-backup-${today()}.json`, JSON.stringify(S, null, 2), 'application/json')) toast('Backup downloaded'); },
  exportCSV: () => { if (download(`cosmic-currents-records-${today()}.csv`, toCSV(), 'text/csv')) toast('CSV downloaded'); },
  importJSON: () => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json,.json';
    inp.onchange = () => {
      const file = inp.files[0]; if (!file) return;
      const rd = new FileReader();
      rd.onload = () => {
        try {
          const data = JSON.parse(rd.result);
          if (!Array.isArray(data.pockets) || !Array.isArray(data.txns)) throw new Error('bad');
          S = Object.assign(defaults(), data); migrate(); rollPeriod(); save(); applyMotion(); applyPrivacy(); render(); toast('Backup imported');
        } catch (e) { toast('That file is not a valid backup', 'err'); }
      };
      rd.readAsText(file);
    };
    inp.click();
  },
  resetAll: () => confirmModal('Reset everything?', 'All pockets, records, schedules, sources and settings will be erased from this browser.', 'Reset',
    () => { const n = S.name; S = defaults(); S.name = n; save(); applyMotion(); applyPrivacy(); go('#/home'); toast('Everything is fresh again'); })
};

/* =========================================================
   RENDER & EVENTS
   ========================================================= */
function currentHash() {
  if (ui.route) return ui.route;
  try { return location.hash; } catch (e) { return ''; }
}
function go(hash) {
  ui.route = hash;
  try { if (location.hash !== hash) location.hash = hash; } catch (e) { /* sandboxed preview: keep internal route */ }
  closeModal(); render();
}
function route() {
  const h = currentHash().replace(/^#\/?/, '');
  const [page, arg] = h.split('/');
  return {page: page || 'home', arg};
}
function renderNav(r) {
  const curPocket = r.page === 'pocket' ? P(r.arg) : null;
  document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('active',
    a.dataset.nav === r.page || (curPocket && a.dataset.nav === curPocket.type)));
  const due = upcoming(3).length;
  const badge = $('#navDue'); if (badge) { badge.textContent = due; badge.hidden = !due; }
  const group = (label, type) => {
    const ps = activePockets(type);
    return `<div class="nav-section">${label}</div><div class="nav-pockets">${ps.length ? ps.map(p =>
      `<a href="#/pocket/${p.id}" class="${curPocket?.id === p.id ? 'active' : ''}">${avatar(p, 'sm')}<span class="np-name">${esc(p.name)}</span><span class="np-bal amt">${short(bal(p.id))}</span></a>`).join('')
      : `<div class="nav-empty">No pockets yet</div>`}</div>`;
  };
  $('#navPockets').innerHTML = group('Income pockets', 'income') + group('Expense pockets', 'expense');
  $('#brandSub').textContent = `${S.name}'s money space`;
  $('#privacyBtn').textContent = S.privacy ? 'Show amounts' : 'Hide amounts';
}
function typeWelcome() {
  const m = $('#wMsg'), n = $('#wName');
  if (!m) return;
  const msg = WELCOMES[Math.max(0, S.welcomeIdx) % WELCOMES.length], name = S.name || 'Sofi';
  const total = msg.length + 1 + name.length;
  const paint = i => { m.textContent = msg.slice(0, Math.min(i, msg.length)); n.textContent = i > msg.length ? name.slice(0, i - msg.length - 1) : ''; };
  clearTimeout(ui.typer);
  if (ui.typedDone) { paint(total); return; }
  let i = 0;
  const tick = () => { paint(++i); if (i < total) ui.typer = setTimeout(tick, 36); else ui.typedDone = true; };
  tick();
}
function render() {
  const r = route(), key = r.page + '/' + (r.arg || '');
  const changed = key !== ui.lastRoute; ui.lastRoute = key;
  const pages = {income: pageIncome, expense: pageExpense, schedules: pageSchedules, records: pageRecords, settings: pageSettings};
  const html = r.page === 'pocket' ? pagePocket(r.arg) : (pages[r.page] || pageHome)();
  const v = $('#view');
  v.innerHTML = html;
  if (changed) { v.style.animation = 'none'; void v.offsetWidth; v.style.animation = ''; window.scrollTo(0, 0); document.body.classList.remove('nav-open'); }
  renderNav(r);
  enhanceSelects(v);
  typeWelcome();
}
function applyMotion() { document.body.classList.toggle('still', S.motion === false); }
function applyPrivacy() { document.body.classList.toggle('privacy', !!S.privacy); }

// Tap outside a picker to close it
document.addEventListener('click', e => { if (pickerEl && !pickerEl.contains(e.target)) { closePicker(); e.stopPropagation(); e.preventDefault(); } }, true);
window.addEventListener('resize', () => { if (pickerEl && !pickerEl.classList.contains('sheet')) closePicker(); });
document.addEventListener('click', e => {
  const link = e.target.closest('a[href^="#/"]');
  if (link && !link.dataset.action) { e.preventDefault(); go(link.getAttribute('href')); return; }
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const fn = A[el.dataset.action];
  if (fn) { e.preventDefault(); fn(el.dataset, el); }
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.matches('select[data-other]')) {
    const box = el.parentElement.querySelector('.other-input');
    if (box) { box.hidden = el.value !== '__new'; if (!box.hidden) box.focus(); }
    return;
  }
  if (el.dataset.rangeFor) {
    const f = ui[el.dataset.rangeFor]; f.range = el.value; f.pOff = 0; render(); return;
  }
  if (el.dataset.filter) {
    const [k, prop] = el.dataset.filter.split('.');
    ui[k][prop] = el.value || (prop === 'anchor' ? today() : '');
    render(); return;
  }
  if (el.dataset.setting) {
    const k = el.dataset.setting, v = el.value;
    if (k === 'name') { S.name = String(v).trim() || 'Sofi'; ui.typedDone = false; }
    else if (k === 'motion') { S.motion = v === '1'; applyMotion(); }
    else if (k === 'period.repeat') { S.period.repeat = v === '1'; rollPeriod(); }
    else if (k.startsWith('period.')) {
      const np = {...S.period, [k.slice(7)]: v};
      if (np.end < np.start) { toast('End date must be after start date', 'err'); render(); return; }
      S.period = np; rollPeriod();
    }
    save(); render(); toast('Saved'); return;
  }
  if (el.dataset.sourceRename) {
    const s = S.sources.find(x => x.id === el.dataset.sourceRename);
    if (s && el.value.trim()) { s.name = el.value.trim(); save(); renderNav(route()); toast('Source renamed'); }
  }
});
document.addEventListener('input', e => {
  const el = e.target;
  if (el.classList.contains('money')) {
    const d = el.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
    el.value = d ? Number(d).toLocaleString('id-ID') : '';
  }
  if (el.id === 'recSearch') {
    ui.rec.q = el.value;
    clearTimeout(ui.searchT);
    ui.searchT = setTimeout(() => {
      render();
      const s = $('#recSearch'); if (s) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
    }, 250);
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && pickerEl) { closePicker(); return; }
  if (e.key === 'Escape' && $('#modalRoot').innerHTML && !$('#modalRoot .locked')) closeModal();
  if (e.key === 'Enter' && e.target.dataset.enter) { e.preventDefault(); A[e.target.dataset.enter](e.target.dataset); }
});
window.addEventListener('hashchange', () => { let h = ''; try { h = location.hash; } catch (e) {} if (h && h !== ui.route) { ui.route = h; closeModal(); render(); } });

/* ---------------- Boot ---------------- */
load();
const demoCleared = clearOldDemo();
rollPeriod();
S.welcomeIdx = (S.welcomeIdx + 1) % WELCOMES.length;   // a new welcome message on every visit
saveLocal();
applyMotion();
applyPrivacy();
try { ui.route = location.hash || '#/home'; } catch (e) { ui.route = '#/home'; }
render();
if (demoCleared) toast('Sample data removed — your space is blank and ready.');
CLOUD.onChange(() => {
  updateSyncPill();
  renderAuth();
  if (route().page === 'settings' && !$('#modalRoot').innerHTML && !authVisible()) render();
});
CLOUD.start(cloudHooks);
updateSyncPill();
renderAuth();
if (!CLOUD.enabled) runAutopayOnce();
})();
