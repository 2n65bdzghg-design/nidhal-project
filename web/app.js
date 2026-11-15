/* Nidhal Wallet – Oman money tracker. Everything runs in the browser; data is stored locally per user. */
(function () {
  'use strict';
  const O = window.Oman;
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { toast('Could not save – browser storage is full or blocked'); return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const MS = MONTHS.map((m) => m.slice(0, 3));
  const fmt = (n) => (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  const omr = (n) => 'OMR ' + fmt(n);
  const pct = (a, b) => (b > 0 ? (a / b) * 100 : 0);
  const p0 = (x) => Math.round(x) + '%';
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const dstr = (iso) => { const d = new Date(iso); return d.getDate() + ' ' + MS[d.getMonth()] + ' ' + d.getFullYear(); };
  const toInputDate = (iso) => { const d = new Date(iso); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const cat = O.catById;

  /* ---------------- state ---------------- */
  let user = store.get('nw.session', null);
  let D = null; // current user's data
  let view = 'dashboard';
  const now0 = new Date();
  let ym = { y: now0.getFullYear(), m: now0.getMonth() };
  let histYear = now0.getFullYear();
  let hf = { month: 'all', cat: 'all', type: 'all', q: '', limit: 60 };
  let pending = []; let pendingInfo = '';
  let authMode = 'in'; let authErr = ''; let authUser = '';

  const defaults = () => ({ txs: [], reminders: [], settings: { income: 0, split: { op: 70, inv: 20, sav: 10 }, rules: {}, autosave: true, captureKey: '' } });
  function loadData() { D = store.get('nw.data.' + user, null) || defaults(); D.settings = Object.assign(defaults().settings, D.settings); D.settings.split = Object.assign({ op: 70, inv: 20, sav: 10 }, D.settings.split); if (!D.settings.captureKey) { D.settings.captureKey = uid() + uid(); save(); } }
  function save() { store.set('nw.data.' + user, D); }

  /* ---------------- auth (local) ---------------- */
  const b64 = (buf) => btoa(String.fromCharCode.apply(null, new Uint8Array(buf)));
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  async function hashPw(pw, saltB64) {
    const enc = new TextEncoder();
    if (window.crypto && crypto.subtle) {
      const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
      const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: unb64(saltB64), iterations: 150000, hash: 'SHA-256' }, key, 256);
      return b64(bits);
    }
    let h = 5381; const s = saltB64 + pw; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return 'weak' + h; // fallback only if WebCrypto is unavailable
  }
  function newSalt() { const a = new Uint8Array(16); (window.crypto || { getRandomValues: (x) => x.fill(7) }).getRandomValues(a); return b64(a); }
  async function doAuth(form) {
    const name = form.u.value.trim().toLowerCase(), pw = form.p.value;
    const users = store.get('nw.users', {});
    authErr = ''; authUser = form.u.value.trim();
    if (!/^[a-z0-9._-]{3,30}$/.test(name)) authErr = 'Username: 3–30 letters, numbers, . _ -';
    else if (authMode === 'up') {
      if (pw.length < 6) authErr = 'Password must be at least 6 characters.';
      else if (pw !== form.p2.value) authErr = 'Passwords do not match.';
      else if (users[name]) authErr = 'That username is already taken on this device.';
      else { const salt = newSalt(); users[name] = { salt, hash: await hashPw(pw, salt), created: Date.now(), display: form.u.value.trim() }; store.set('nw.users', users); }
    } else {
      const u = users[name];
      if (!u || (await hashPw(pw, u.salt)) !== u.hash) authErr = 'Wrong username or password.';
    }
    if (authErr) return render();
    user = name; store.set('nw.session', user); loadData(); view = 'dashboard'; render(); handleIncoming();
    if (!D.txs.length) toast('Welcome! Add your first bank messages in the “Add messages” tab.');
  }
  function signOut() { user = null; D = null; store.del('nw.session'); pending = []; render(); }

  /* ---------------- calculations ---------------- */
  const inMonth = (t, y, m) => { const d = new Date(t.date); return d.getFullYear() === y && d.getMonth() === m; };
  function monthStats(y, m) {
    const s = { income: 0, op: 0, inv: 0, cats: {}, merchants: {}, n: 0 };
    D.txs.forEach((t) => {
      if (!inMonth(t, y, m)) return; s.n++;
      if (t.type === 'income') { s.income += t.amount; return; }
      const c = cat(t.category);
      if (c.bucket === 'investment') s.inv += t.amount; else s.op += t.amount;
      s.cats[t.category] = (s.cats[t.category] || 0) + t.amount;
      const k = t.merchant; s.merchants[k] = (s.merchants[k] || { v: 0, n: 0, cat: t.category }); s.merchants[k].v += t.amount; s.merchants[k].n++;
    });
    s.spent = s.op + s.inv; s.net = s.income - s.spent; return s;
  }
  function shiftMonth(y, m, d) { const t = new Date(y, m + d, 1); return { y: t.getFullYear(), m: t.getMonth() }; }
  function basisFor(y, m, st) {
    if (D.settings.income > 0) return { v: D.settings.income, how: 'your fixed monthly income' };
    if (st.income > 0) return { v: st.income, how: 'income received this month' };
    let sum = 0, n = 0; for (let i = 1; i <= 3; i++) { const p = shiftMonth(y, m, -i); const ps = monthStats(p.y, p.m); if (ps.income > 0) { sum += ps.income; n++; } }
    return n ? { v: sum / n, how: 'average income of previous months' } : { v: 0, how: '' };
  }
  function budgets(y, m) {
    const st = monthStats(y, m), b = basisFor(y, m, st), sp = D.settings.split;
    const lim = { op: b.v * sp.op / 100, inv: b.v * sp.inv / 100, sav: b.v * sp.sav / 100 };
    const saved = Math.max(0, st.income - st.spent);
    return { st, basis: b, lim, saved, sp };
  }
  const level = (used, lim) => (lim <= 0 ? '' : used > lim ? 'b' : used >= lim * 0.8 ? 'w' : '');

  /* ---------------- advice engine ---------------- */
  function adviceFor(y, m) {
    const B = budgets(y, m), st = B.st, A = [];
    const add = (icon, lv, title, text) => A.push({ icon, lv, title, text });
    if (!D.txs.length) { add('📥', 'i', 'Start by adding your bank messages', 'Paste your Bank Muscat, NBO, Sohar International, BankDhofar (or other) SMS in the “Add messages” tab so I can analyse your spending.'); return A; }
    if (!st.n) add('🗓️', 'i', 'No transactions in ' + MONTHS[m] + ' ' + y, 'Pick another month, or add this month’s messages to get advice.');
    if (B.basis.v <= 0) add('💵', 'w', 'Tell me your monthly income', 'Without an income figure I can’t size your budgets. Set it in Budgets, or add your salary message.');
    const inc = B.basis.v;
    if (inc > 0 && st.n) {
      const rate = pct(Math.max(0, inc - st.spent), inc);
      if (st.spent > inc) add('🚨', 'b', 'You spent more than you earn', `Spending is ${omr(st.spent)} against ${omr(inc)} of income (${p0(pct(st.spent, inc))}). Cut the “want” categories first (dining, shopping, entertainment) and avoid using credit to cover the gap.`);
      else if (rate < 10) add('⚠️', 'w', 'Savings rate is low: ' + p0(rate), 'Aim for at least 20% of income. Try the 50/30/20 rule: 50% needs, 30% wants, 20% savings & investments.');
      else if (rate >= 20) add('✅', 'g', 'Great savings rate: ' + p0(rate), `You kept ${omr(inc - st.spent)} this month. Move the surplus into your investment budget before it gets spent.`);
      else add('👍', 'i', 'Savings rate ' + p0(rate), 'Decent. Pushing it towards 20% gives you a stronger safety net.');
      if (st.op > B.lim.op) add('📊', 'b', 'Operating budget exceeded by ' + omr(st.op - B.lim.op), `You planned ${omr(B.lim.op)} (${B.sp.op}% of income) and used ${p0(pct(st.op, B.lim.op))}. Review the biggest categories on the dashboard.`);
      else if (st.op >= B.lim.op * 0.8) add('📊', 'w', 'Operating budget almost used (' + p0(pct(st.op, B.lim.op)) + ')', `${omr(B.lim.op - st.op)} left for the rest of the month.`);
      if (B.lim.inv > 0 && st.inv < B.lim.inv * 0.5 && st.n) add('📈', 'w', 'Investment budget is under-used', `You set ${omr(B.lim.inv)} for investing and only ${omr(st.inv)} went there. Automate a transfer on salary day so investing happens first.`);
      else if (B.lim.inv > 0 && st.inv >= B.lim.inv) add('📈', 'g', 'Investment target reached', `${omr(st.inv)} invested this month – nicely done.`);
      const wants = Object.keys(st.cats).filter((k) => cat(k).kind === 'want').reduce((a, k) => a + st.cats[k], 0);
      if (pct(wants, inc) > 30) add('🛍️', 'w', 'Wants take ' + p0(pct(wants, inc)) + ' of income', 'Dining out, shopping, entertainment and travel are above the 30% guideline. Set a weekly limit for these.');
      const food = st.cats.food || 0; if (pct(food, inc) > 12) add('🍽️', 'w', 'Dining & cafés: ' + p0(pct(food, inc)) + ' of income', `${omr(food)} on restaurants, cafés and delivery. Cooking a few more meals at home could save about ${omr(food * 0.25)} a month.`);
      const cash = st.cats.cash || 0; if (st.spent > 0 && pct(cash, st.spent) > 10) add('🏧', 'w', 'Lots of cash withdrawals', `${omr(cash)} (${p0(pct(cash, st.spent))} of spending) left as cash can’t be tracked. Pay by card where possible.`);
      const fuel = st.cats.fuel || 0; if (pct(fuel, inc) > 8) add('⛽', 'i', 'Fuel is ' + p0(pct(fuel, inc)) + ' of income', 'Consider combining trips or carpooling to trim fuel costs.');
    }
    // trend vs previous 3 months
    const prev = [1, 2, 3].map((i) => { const p = shiftMonth(y, m, -i); return monthStats(p.y, p.m); }).filter((s) => s.n);
    if (prev.length && st.n) {
      const avg = prev.reduce((a, s) => a + s.spent, 0) / prev.length;
      if (avg > 0 && st.spent > avg * 1.2) add('📈', 'w', 'Spending is ' + p0(pct(st.spent - avg, avg)) + ' above your recent average', `This month ${omr(st.spent)} vs ${omr(avg)} average over the previous ${prev.length} month(s).`);
      else if (avg > 0 && st.spent < avg * 0.85) add('📉', 'g', 'Spending is down ' + p0(pct(avg - st.spent, avg)) + ' vs your average', 'Keep it up.');
      const op = prev.reduce((a, s) => a + s.op, 0) / prev.length;
      if (op > 0) { const ef = op * 3; add('🛟', 'i', 'Emergency fund target: ' + omr(ef), `Keep about 3–6 months of operating costs (${omr(op * 3)} – ${omr(op * 6)}) in an easy-access savings account before taking investment risk.`); }
      // recurring subscriptions
      const subs = Object.entries(st.merchants).filter(([k, v]) => cat(v.cat).id === 'entertain' && prev[0].merchants[k]);
      if (subs.length) add('🔄', 'i', 'Recurring subscriptions', subs.map(([k, v]) => `${esc(k)} (${omr(v.v)})`).join(', ') + '. Cancel the ones you don’t use.');
    }
    const other = st.cats.other || 0; if (st.spent > 0 && pct(other, st.spent) > 15) add('🏷️', 'i', 'Many uncategorised payments', `${omr(other)} sits in “Other”. Open History and set a category – the app remembers it for next time.`);
    const top = Object.entries(st.merchants).sort((a, b) => b[1].v - a[1].v)[0];
    if (top && st.spent > 0 && pct(top[1].v, st.spent) > 25) add('🔎', 'i', 'Biggest spend: ' + esc(top[0]), `${omr(top[1].v)} – ${p0(pct(top[1].v, st.spent))} of this month’s spending.`);
    if (inc > 0) add('💡', 'i', 'Ideas for your investment budget in Oman', 'Common options: term deposits and Islamic savings accounts, government development bonds/sukuk, mutual funds and shares on the Muscat Stock Exchange (MSX) via a licensed broker, and physical gold. Spread money across them and invest only what you won’t need soon.');
    return A;
  }

  /* ---------------- reminders ---------------- */
  function nextDue(r, from) {
    const d = new Date(from.getFullYear(), from.getMonth(), 1);
    for (let i = 0; i < 3; i++) {
      const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      const due = new Date(d.getFullYear(), d.getMonth(), Math.min(r.day, last));
      const key = due.getFullYear() * 12 + due.getMonth();
      const paid = r.paid === key;
      const t0 = new Date(from.getFullYear(), from.getMonth(), from.getDate());
      if (due >= t0 || (!paid && due < t0 && i === 0)) { if (paid) { d.setMonth(d.getMonth() + 1); continue; } return { due, key, overdue: due < t0, days: Math.round((due - t0) / 864e5) }; }
      d.setMonth(d.getMonth() + 1);
    }
    return null;
  }
  function reminderList() { const n = new Date(); return D.reminders.map((r) => Object.assign({ r }, nextDue(r, n))).filter((x) => x.due).sort((a, b) => a.days - b.days); }

  /* ---------------- charts ---------------- */
  function donut(slices, total, label) {
    const R = 70, C = 2 * Math.PI * R; let off = 0;
    const arcs = slices.filter((s) => s.v > 0).map((s) => { const len = (s.v / total) * C; const a = `<circle cx="100" cy="100" r="${R}" fill="none" stroke="${s.color}" stroke-width="30" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 100 100)"><title>${esc(s.name)}: ${omr(s.v)} (${p0(pct(s.v, total))})</title></circle>`; off += len; return a; }).join('');
    return `<svg viewBox="0 0 200 200" width="200" height="200" role="img" aria-label="Spending by category"><circle cx="100" cy="100" r="${R}" fill="none" stroke="var(--soft)" stroke-width="30"/>${arcs}<text x="100" y="96" text-anchor="middle" font-size="11" fill="var(--mute)">${esc(label)}</text><text x="100" y="116" text-anchor="middle" font-size="17" font-weight="700" fill="var(--ink)">${fmt(total).replace(/\.\d+$/, '')}</text></svg>`;
  }
  function bars(items) { // items: [{label, a, b}] income (a) vs spent (b)
    const W = 640, H = 210, pl = 6, pb = 24, pt = 8; const max = Math.max(1, ...items.map((i) => Math.max(i.a, i.b)));
    const bw = (W - pl) / items.length; let out = '';
    items.forEach((it, i) => {
      const x = pl + i * bw, h1 = (it.a / max) * (H - pb - pt), h2 = (it.b / max) * (H - pb - pt), w = Math.min(22, bw * 0.34);
      out += `<g><title>${esc(it.label)} – income ${omr(it.a)}, spent ${omr(it.b)}</title><rect x="${x + bw / 2 - w - 1}" y="${H - pb - h1}" width="${w}" height="${Math.max(h1, 0)}" rx="3" fill="var(--good)" opacity=".85"/><rect x="${x + bw / 2 + 1}" y="${H - pb - h2}" width="${w}" height="${Math.max(h2, 0)}" rx="3" fill="var(--bad)" opacity=".85"/><text x="${x + bw / 2}" y="${H - 7}" text-anchor="middle" font-size="11" fill="var(--mute)">${esc(it.label)}</text></g>`;
    });
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Income and spending by month"><line x1="0" x2="${W}" y1="${H - pb}" y2="${H - pb}" stroke="var(--line)"/>${out}</svg><div class="row small mute"><span class="row"><span class="dot" style="background:var(--good)"></span>Income</span><span class="row"><span class="dot" style="background:var(--bad)"></span>Spent</span></div>`;
  }
  const meter = (title, used, lim, note, good) => {
    const p = lim > 0 ? pct(used, lim) : 0, lv = good ? '' : level(used, lim);
    return `<div class="meter"><div class="top"><span>${esc(title)}</span><span class="num">${lim > 0 ? p0(p) : '–'}</span></div><div class="track" role="progressbar" aria-valuenow="${Math.round(p)}" aria-valuemin="0" aria-valuemax="100" aria-label="${esc(title)}"><div class="fill ${lv}" style="width:${Math.min(100, p).toFixed(1)}%"></div></div><div class="small mute num">${omr(used)} of ${omr(lim)} ${note ? '· ' + esc(note) : ''}</div></div>`;
  };

  /* ---------------- views ---------------- */
  function monthBar(withLabel) {
    return `<div class="monthbar"><button class="btn sm" data-act="mprev" aria-label="Previous month">‹</button><h1>${MONTHS[ym.m]} ${ym.y}</h1><button class="btn sm" data-act="mnext" aria-label="Next month">›</button><button class="btn sm" data-act="mnow">This month</button></div>`;
  }
  function txRow(t, actions) {
    const c = cat(t.category);
    return `<div class="tx"><div class="ico" style="background:${c.color}22">${c.icon}</div><div style="min-width:0"><div class="m">${esc(t.merchant)}</div><div class="small mute">${dstr(t.date)} · ${esc(c.name)}${t.bank ? ' · ' + esc(t.bank) : ''}${t.last4 ? ' ••' + esc(t.last4) : ''}${t.currency && t.currency !== 'OMR' ? ' · ' + fmt(t.origAmount) + ' ' + t.currency : ''}</div></div><div class="a num ${t.type === 'income' ? 'pos' : ''}">${t.type === 'income' ? '+' : '−'}${fmt(t.amount)}${actions ? `<div class="acts"><button class="linkbtn" data-act="edit" data-id="${t.id}">Edit</button><button class="linkbtn d" data-act="del" data-id="${t.id}">Delete</button></div>` : ''}</div></div>`;
  }

  function vDashboard() {
    const B = budgets(ym.y, ym.m), st = B.st;
    const spendTotal = st.spent;
    const slices = Object.keys(st.cats).map((k) => ({ id: k, name: cat(k).name, color: cat(k).color, v: st.cats[k], icon: cat(k).icon })).sort((a, b) => b.v - a.v);
    const rem = reminderList().filter((x) => x.overdue || x.days <= 7).slice(0, 4);
    const al = [];
    if (B.lim.op > 0) { const lv = level(st.op, B.lim.op); if (lv) al.push([lv, `Operating budget ${lv === 'b' ? 'exceeded' : 'at ' + p0(pct(st.op, B.lim.op))}`]); }
    if (B.lim.inv > 0 && st.inv > B.lim.inv) al.push(['w', 'Investment spending above its budget']);
    const adv = adviceFor(ym.y, ym.m).filter((a) => a.lv !== 'i').slice(0, 3);
    const hist = []; for (let i = 5; i >= 0; i--) { const p = shiftMonth(ym.y, ym.m, -i), s = monthStats(p.y, p.m); hist.push({ label: MS[p.m], a: s.income, b: s.spent }); }
    const topM = Object.entries(st.merchants).sort((a, b) => b[1].v - a[1].v).slice(0, 5);
    const recent = D.txs.filter((t) => inMonth(t, ym.y, ym.m)).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);
    const rate = B.basis.v > 0 ? pct(st.income - st.spent, st.income || B.basis.v) : 0;
    return `${monthBar()}
    ${!D.txs.length ? `<div class="card" style="margin-bottom:14px"><h2>👋 Welcome</h2><p>Your dashboard is empty. Paste your bank SMS messages to see where your money goes.</p><button class="btn pri" data-act="go" data-v="import">Add messages</button> <button class="btn" data-act="sample">Try with sample data</button></div>` : ''}
    <div class="grid g4" style="margin-bottom:14px">
      <div class="card kpi"><div class="label">Income</div><div class="val num pos">${fmt(st.income)}</div><div class="sub">OMR received</div></div>
      <div class="card kpi"><div class="label">Spent</div><div class="val num neg">${fmt(st.spent)}</div><div class="sub">${st.income > 0 ? p0(pct(st.spent, st.income)) + ' of income' : 'OMR spent'}</div></div>
      <div class="card kpi"><div class="label">Left over</div><div class="val num ${st.net >= 0 ? 'pos' : 'neg'}">${fmt(st.net)}</div><div class="sub">${st.income > 0 ? 'Savings rate ' + p0(rate) : 'Net this month'}</div></div>
      <div class="card kpi"><div class="label">Transactions</div><div class="val num">${st.n}</div><div class="sub">in ${MONTHS[ym.m]}</div></div>
    </div>
    ${al.map(([lv, t]) => `<div class="alert ${lv}">🔔 <b>${esc(t)}</b></div>`).join('')}
    <div class="grid g2" style="margin-bottom:14px">
      <div class="card"><h2>Budget overview <span class="sp"></span><button class="btn sm" data-act="go" data-v="budget">Edit</button></h2>
        ${B.basis.v > 0 ? `<div class="small mute">Based on ${omr(B.basis.v)} (${esc(B.basis.how)}) · ${B.sp.op}/${B.sp.inv}/${B.sp.sav} split</div>` : `<div class="alert w">Set your monthly income in <a href="#" data-act="go" data-v="budget">Budgets</a> to see percentages.</div>`}
        ${meter('Operating budget', st.op, B.lim.op, B.sp.op + '% of income')}
        ${meter('Investment budget', st.inv, B.lim.inv, B.sp.inv + '% of income')}
        ${meter('Savings goal', B.saved, B.lim.sav, B.sp.sav + '% of income', true)}
      </div>
      <div class="card"><h2>Where your money went</h2>
        ${slices.length ? `<div class="donutrow">${donut(slices, spendTotal, 'OMR spent')}<ul class="legend">${slices.slice(0, 8).map((s) => `<li><span class="dot" style="background:${s.color}"></span><span class="nm">${s.icon} ${esc(s.name)}</span><b class="num">${p0(pct(s.v, spendTotal))}</b><span class="mute num small">${fmt(s.v)}</span></li>`).join('')}</ul></div>` : '<div class="empty">No spending recorded this month.</div>'}
      </div>
    </div>
    <div class="grid g2" style="margin-bottom:14px">
      <div class="card"><h2>Last 6 months</h2>${bars(hist)}</div>
      <div class="card"><h2>Top places you paid</h2>${topM.length ? `<div>${topM.map(([k, v]) => `<div class="tx" style="grid-template-columns:38px 1fr auto"><div class="ico" style="background:${cat(v.cat).color}22">${cat(v.cat).icon}</div><div class="m">${esc(k)}<div class="small mute">${v.n} payment${v.n > 1 ? 's' : ''}</div></div><div class="a num">${fmt(v.v)}<div class="small mute">${p0(pct(v.v, spendTotal))}</div></div></div>`).join('')}</div>` : '<div class="empty">Nothing yet.</div>'}</div>
    </div>
    <div class="grid g3">
      <div class="card"><h2>Recent <span class="sp"></span><button class="btn sm" data-act="go" data-v="history">All</button></h2>${recent.length ? recent.map((t) => txRow(t)).join('') : '<div class="empty">No transactions.</div>'}</div>
      <div class="card"><h2>Upcoming reminders <span class="sp"></span><button class="btn sm" data-act="go" data-v="reminders">Manage</button></h2>${rem.length ? rem.map(remRow).join('') : '<div class="empty">Nothing due in the next 7 days.</div>'}</div>
      <div class="card"><h2>Advice <span class="sp"></span><button class="btn sm" data-act="go" data-v="advice">More</button></h2>${adv.length ? adv.map(advRow).join('') : '<div class="empty">You’re on track. 🎉</div>'}</div>
    </div>`;
  }
  const advRow = (a) => `<div class="advice"><div class="ai">${a.icon}</div><div><b>${esc(a.title).replace(/&amp;#39;/g, "'")}</b><span class="small mute">${a.text.includes('<') ? a.text : esc(a.text)}</span></div></div>`;
  const remRow = (x) => `<div class="rem"><div class="d"><b>${x.due.getDate()}</b><span>${MS[x.due.getMonth()]}</span></div><div style="flex:1;min-width:0"><b>${esc(x.r.title)}</b><div class="small ${x.overdue ? 'neg' : 'mute'}">${x.overdue ? 'Overdue' : x.days === 0 ? 'Due today' : 'In ' + x.days + ' day' + (x.days > 1 ? 's' : '')}${x.r.amount ? ' · ' + omr(x.r.amount) : ''} · ${x.r.bucket === 'investment' ? 'Investment' : 'Operating'}</div></div><button class="btn sm" data-act="rpaid" data-id="${x.r.id}">Paid</button></div>`;

  function vImport() {
    const rows = pending.map((p, i) => {
      const c = cat(p.category);
      const isDup = p.dup;
      return `<div class="preview"><div class="row wrapf"><label class="row" style="margin:0"><input type="checkbox" style="width:auto" data-bind="sel" data-i="${i}" ${p.sel ? 'checked' : ''}> <b>${p.type === 'income' ? '+' : '−'}${fmt(p.amount)} ${p.currency !== 'OMR' ? '<span class="chip w">' + esc(p.currency) + ' ≈ OMR</span>' : 'OMR'}</b></label>${isDup ? '<span class="chip w">already imported</span>' : ''}${!p.known ? '<span class="chip w">please check category</span>' : '<span class="chip g">recognised</span>'}<span class="sp"></span><span class="small mute">${dstr(p.date)}${p.bank ? ' · ' + esc(p.bank) : ''}${p.last4 ? ' ••' + esc(p.last4) : ''}</span></div>
      <div class="form2"><div><label>Paid to / from</label><input data-bind="merchant" data-i="${i}" value="${esc(p.merchant)}"></div><div><label>Category</label><select data-bind="category" data-i="${i}">${O.CATEGORIES.filter((x) => !!x.income === (p.type === 'income')).map((x) => `<option value="${x.id}" ${x.id === p.category ? 'selected' : ''}>${x.icon} ${esc(x.name)}</option>`).join('')}</select></div></div>
      <details class="small mute" style="margin-top:6px"><summary>Original message</summary>${esc(p.raw)}</details></div>`;
    }).join('');
    const nsel = pending.filter((p) => p.sel).length;
    return `${captureCard()}<div class="grid g2">
      <div class="card"><h2>Add bank messages</h2>
        <p class="small mute" style="margin-top:0">Paste one or many bank SMS / app notifications (separate with a blank line, or one per line). English and Arabic messages from Bank Muscat, NBO, Sohar International, BankDhofar, Oman Arab Bank, Ahli, Bank Nizwa, Alizz, HSBC and others are understood. OTP and promo messages are ignored.</p>
        <textarea id="smsText" placeholder="Your Debit Card ending 1234 was used for OMR 5.500 at LULU HYPERMARKET on 10/11/2026 12:30. Avl Bal OMR 120.500"></textarea>
        <div class="row wrapf" style="margin-top:10px"><button class="btn pri" data-act="analyse">Analyse messages</button><label class="btn" style="margin:0;font-size:15px">Upload file<input id="smsFile" type="file" accept=".txt,.csv,.xml,.log,text/*" hidden></label><button class="btn" data-act="manual">+ Add manually</button><span class="sp"></span><button class="btn sm" data-act="sample">Load sample data</button></div>
        ${pendingInfo ? `<p class="small" style="margin-bottom:0">${esc(pendingInfo)}</p>` : ''}
      </div>
      <div class="card"><h2>How to get your messages in</h2>
        <ol class="small" style="padding-left:18px;margin:0;display:grid;gap:6px">
          <li><b>Bank app / SMS:</b> long-press the message → Copy, then paste it here.</li>
          <li><b>Many at once (Android):</b> export with “SMS Backup &amp; Restore” and upload the <code>.xml</code> file – messages from banks are picked out automatically.</li>
          <li><b>iPhone:</b> select the bank conversation, copy, paste.</li>
        </ol>
        <p class="small mute">A website can’t read your phone’s inbox by itself (browsers don’t allow it), so the messages come in by paste/upload. Everything is analysed on your device – nothing is sent anywhere.</p>
        <p class="small mute" style="margin-bottom:0">${O.MERCHANTS.length} Omani shops, restaurants, fuel stations, telecoms, utilities, hospitals and more are built in. Fix a category once and the app remembers it.</p>
      </div>
    </div>
    ${pending.length ? `<div class="card" style="margin-top:14px"><h2>Review (${pending.length}) <span class="sp"></span><button class="btn pri" data-act="savepending" ${nsel ? '' : 'disabled'}>Save ${nsel} selected</button></h2>${rows}</div>` : ''}`;
  }

  function filteredTx() {
    const q = hf.q.trim().toLowerCase();
    return D.txs.filter((t) => {
      const d = new Date(t.date); if (d.getFullYear() !== histYear) return false;
      if (hf.month !== 'all' && d.getMonth() !== +hf.month) return false;
      if (hf.cat !== 'all' && t.category !== hf.cat) return false;
      if (hf.type !== 'all' && t.type !== hf.type) return false;
      if (q && !(t.merchant + ' ' + (t.note || '')).toLowerCase().includes(q)) return false;
      return true;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }
  function vHistory() {
    const years = [...new Set(D.txs.map((t) => new Date(t.date).getFullYear()).concat([now0.getFullYear(), histYear]))].sort((a, b) => b - a);
    const rows = []; let TI = 0, TS = 0, TV = 0;
    for (let m = 0; m < 12; m++) { const s = monthStats(histYear, m); TI += s.income; TS += s.op; TV += s.inv; rows.push({ m, s }); }
    const list = filteredTx();
    const sumI = list.filter((t) => t.type === 'income').reduce((a, t) => a + t.amount, 0), sumE = list.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
    return `<div class="row wrapf" style="margin-bottom:14px"><h1 style="font-size:21px">History</h1><select style="width:auto" data-bind="hyear" aria-label="Year">${years.map((y) => `<option ${y === histYear ? 'selected' : ''}>${y}</option>`).join('')}</select><span class="sp"></span><button class="btn sm" data-act="csv">Export CSV</button><button class="btn sm pri" data-act="manual">+ Add</button></div>
    <div class="card" style="margin-bottom:14px"><h2>${histYear} at a glance</h2>
      <div class="grid g4" style="margin-bottom:10px"><div class="kpi"><div class="label">Income</div><div class="val num pos">${fmt(TI)}</div></div><div class="kpi"><div class="label">Operating spend</div><div class="val num neg">${fmt(TS)}</div><div class="sub">${p0(pct(TS, TI))} of income</div></div><div class="kpi"><div class="label">Invested</div><div class="val num">${fmt(TV)}</div><div class="sub">${p0(pct(TV, TI))} of income</div></div><div class="kpi"><div class="label">Net saved</div><div class="val num ${TI - TS - TV >= 0 ? 'pos' : 'neg'}">${fmt(TI - TS - TV)}</div><div class="sub">${p0(pct(TI - TS - TV, TI))} of income</div></div></div>
      ${bars(rows.map((r) => ({ label: MS[r.m], a: r.s.income, b: r.s.spent })))}
      <div class="scroll"><table><thead><tr><th>Month</th><th class="r">Income</th><th class="r">Operating</th><th class="r">Invested</th><th class="r">Net</th><th class="r">Saved %</th></tr></thead><tbody>${rows.map((r) => `<tr class="${r.s.n ? '' : 'mute'}"><td><button class="linkbtn" data-act="hmonth" data-m="${r.m}">${MONTHS[r.m]}</button></td><td class="r num">${fmt(r.s.income)}</td><td class="r num">${fmt(r.s.op)}</td><td class="r num">${fmt(r.s.inv)}</td><td class="r num ${r.s.net >= 0 ? 'pos' : 'neg'}">${fmt(r.s.net)}</td><td class="r num">${r.s.income > 0 ? p0(pct(r.s.net, r.s.income)) : '–'}</td></tr>`).join('')}</tbody></table></div></div>
    <div class="card"><h2>Transactions <span class="chip">${list.length}</span><span class="sp"></span><span class="small mute num">In ${fmt(sumI)} · Out ${fmt(sumE)}</span></h2>
      <div class="filters"><select data-bind="hmonth" aria-label="Month"><option value="all">All months</option>${MONTHS.map((n, i) => `<option value="${i}" ${String(hf.month) === String(i) ? 'selected' : ''}>${n}</option>`).join('')}</select><select data-bind="hcat" aria-label="Category"><option value="all">All categories</option>${O.CATEGORIES.map((c) => `<option value="${c.id}" ${hf.cat === c.id ? 'selected' : ''}>${c.icon} ${esc(c.name)}</option>`).join('')}</select><select data-bind="htype" aria-label="Type"><option value="all">In &amp; out</option><option value="expense" ${hf.type === 'expense' ? 'selected' : ''}>Spending</option><option value="income" ${hf.type === 'income' ? 'selected' : ''}>Income</option></select><input type="search" placeholder="Search shop…" value="${esc(hf.q)}" data-bind="hq" aria-label="Search"></div>
      ${list.length ? list.slice(0, hf.limit).map((t) => txRow(t, true)).join('') + (list.length > hf.limit ? `<div style="text-align:center;padding-top:10px"><button class="btn" data-act="more">Show more</button></div>` : '') : '<div class="empty">No transactions match.</div>'}</div>`;
  }

  function vBudget() {
    const B = budgets(ym.y, ym.m), st = B.st, sp = B.sp;
    const opCats = Object.keys(st.cats).filter((k) => cat(k).bucket === 'operating').sort((a, b) => st.cats[b] - st.cats[a]);
    const hist = []; for (let i = 5; i >= 0; i--) { const p = shiftMonth(ym.y, ym.m, -i), s = monthStats(p.y, p.m); hist.push({ label: MS[p.m], a: s.op, b: s.inv }); }
    return `${monthBar()}
    <div class="grid g2">
      <div class="card"><h2>Your budgets</h2>
        <label for="inc">Monthly income (OMR) <span class="mute small">– leave 0 to use income detected from messages</span></label>
        <input id="inc" type="number" step="0.001" min="0" value="${D.settings.income || ''}" placeholder="e.g. 900.000" data-bind="income">
        <label>Split of income (%)</label>
        <div class="split"><div><span class="small mute">Operating</span><input type="number" min="0" max="100" value="${sp.op}" data-bind="sp_op" aria-label="Operating percent"></div><div><span class="small mute">Investment</span><input type="number" min="0" max="100" value="${sp.inv}" data-bind="sp_inv" aria-label="Investment percent"></div><div><span class="small mute">Savings (auto)</span><input type="number" value="${sp.sav}" disabled aria-label="Savings percent"></div></div>
        <p class="small mute"><b>Operating</b> = everyday costs (groceries, bills, fuel, dining…). <b>Investment</b> = money you put into stocks, funds, gold or savings plans. Savings = what stays unspent. A common start is 70 / 20 / 10.</p>
        <div class="row"><button class="btn" data-act="preset" data-p="50,20">50 / 20 / 30</button><button class="btn" data-act="preset" data-p="70,20">70 / 20 / 10</button><button class="btn" data-act="preset" data-p="60,15">60 / 15 / 25</button></div>
      </div>
      <div class="card"><h2>${MONTHS[ym.m]} progress</h2>
        ${B.basis.v > 0 ? `<div class="small mute">Budget base: ${omr(B.basis.v)} (${esc(B.basis.how)})</div>` : '<div class="alert w">Enter your income to calculate the limits.</div>'}
        ${meter('Operating budget', st.op, B.lim.op, 'left ' + omr(Math.max(0, B.lim.op - st.op)))}
        ${meter('Investment budget', st.inv, B.lim.inv, 'left ' + omr(Math.max(0, B.lim.inv - st.inv)))}
        ${meter('Savings goal', B.saved, B.lim.sav, '', true)}
      </div>
    </div>
    <div class="grid g2" style="margin-top:14px">
      <div class="card"><h2>Operating spend by category</h2>${opCats.length ? `<ul class="legend">${opCats.map((k) => `<li><span class="dot" style="background:${cat(k).color}"></span><span class="nm">${cat(k).icon} ${esc(cat(k).name)}</span><b class="num">${B.lim.op > 0 ? p0(pct(st.cats[k], B.lim.op)) + ' of budget' : ''}</b><span class="num mute small">${fmt(st.cats[k])}</span></li>`).join('')}</ul>` : '<div class="empty">No operating spend this month.</div>'}</div>
      <div class="card"><h2>Operating vs invested – 6 months</h2>${bars(hist).replace('Income', 'Operating').replace('>Spent<', '>Invested<')}</div>
    </div>`;
  }

  function vReminders() {
    const list = reminderList();
    const B = budgets(ym.y, ym.m), al = [];
    if (B.lim.op > 0) { const l = level(B.st.op, B.lim.op); al.push([l || 'g', l === 'b' ? 'Operating budget exceeded' : l === 'w' ? 'Operating budget at ' + p0(pct(B.st.op, B.lim.op)) : 'Operating budget on track (' + p0(pct(B.st.op, B.lim.op)) + ')']); }
    if (B.lim.inv > 0) al.push([B.st.inv >= B.lim.inv ? 'g' : 'w', B.st.inv >= B.lim.inv ? 'Investment target reached' : `Invest ${omr(B.lim.inv - B.st.inv)} more to hit this month’s investment budget`]);
    const canNotify = 'Notification' in window;
    return `<div class="grid g2"><div class="card"><h2>Bills &amp; budget reminders <span class="sp"></span><button class="btn pri sm" data-act="radd">+ New reminder</button></h2>
      ${list.length ? list.map(remRow).join('') : '<div class="empty">No reminders yet. Add rent, phone bills, or a monthly investment top-up.</div>'}
      ${list.length ? '<div class="small mute" style="margin-top:8px">Reminders repeat every month.</div>' : ''}
      ${canNotify ? `<div style="margin-top:10px"><button class="btn sm" data-act="notif">${Notification.permission === 'granted' ? '🔔 Browser alerts on' : 'Turn on browser alerts'}</button></div>` : ''}
    </div><div class="card"><h2>Budget alerts – ${MONTHS[ym.m]}</h2>${al.length ? al.map(([l, t]) => `<div class="alert ${l === 'g' ? '' : l}">${l === 'b' ? '🚨' : l === 'w' ? '⚠️' : '✅'} ${esc(t)}</div>`).join('') : '<div class="empty">Set your income in Budgets to get alerts at 80% and 100% of each budget.</div>'}
    <p class="small mute">You’ll be warned on the dashboard when a budget passes 80% and 100%.</p></div></div>`;
  }

  function vAdvice() {
    const a = adviceFor(ym.y, ym.m);
    return `${monthBar()}<div class="card"><h2>Financial advice for ${MONTHS[ym.m]} ${ym.y}</h2>${a.map(advRow).join('')}<p class="small mute" style="margin-bottom:0">General guidance generated from your own numbers – not regulated financial advice. For big investment decisions talk to a licensed adviser in Oman.</p></div>`;
  }

  function vSettings() {
    const rules = Object.entries(D.settings.rules);
    const theme = store.get('nw.theme', 'auto');
    return `<div class="grid g2"><div class="card"><h2>Account</h2><p>Signed in as <b>${esc(user)}</b>.</p><div class="row wrapf"><button class="btn" data-act="signout">Sign out</button></div>
      <h3 style="margin-top:18px">Appearance</h3><div class="row"><select data-bind="theme" style="width:auto"><option value="auto" ${theme === 'auto' ? 'selected' : ''}>Match device</option><option value="light" ${theme === 'light' ? 'selected' : ''}>Light</option><option value="dark" ${theme === 'dark' ? 'selected' : ''}>Dark</option></select></div>
      <h3 style="margin-top:18px">Your data</h3><p class="small mute">Stored only in this browser. Back it up regularly.</p><div class="row wrapf"><button class="btn" data-act="backup">Download backup</button><label class="btn" style="margin:0;font-size:15px">Restore backup<input id="restoreFile" type="file" accept=".json,application/json" hidden></label><button class="btn danger" data-act="wipe">Delete all my data</button></div></div>
      <div class="card"><h2>Remembered shops</h2><p class="small mute" style="margin-top:0">Categories you corrected. They’re used for future messages.</p>${rules.length ? rules.map(([k, v]) => `<div class="rem"><div style="flex:1"><b>${esc(k)}</b><div class="small mute">${cat(v).icon} ${esc(cat(v).name)}</div></div><button class="linkbtn d" data-act="rdel" data-k="${esc(k)}">Forget</button></div>`).join('') : '<div class="empty">None yet.</div>'}</div></div>`;
  }

  /* ---------------- shell ---------------- */
  const TABS = [['dashboard', 'Dashboard'], ['import', 'Add messages'], ['history', 'History'], ['budget', 'Budgets'], ['reminders', 'Reminders'], ['advice', 'Advice'], ['settings', 'Settings']];
  const VIEWS = { dashboard: vDashboard, import: vImport, history: vHistory, budget: vBudget, reminders: vReminders, advice: vAdvice, settings: vSettings };
  const SIG = '<div class="sig">NIDHAL AL AZKAWI</div>';

  function render() {
    const app = $('#app');
    if (!user) {
      app.innerHTML = `<div class="auth"><div><div class="card authbox"><div class="logo"><i>N</i> Nidhal Wallet</div><p class="mute" style="text-align:center;margin:0">Know where every rial goes.</p>
        <div class="seg" role="group"><button data-act="amode" data-m="in" aria-pressed="${authMode === 'in'}">Sign in</button><button data-act="amode" data-m="up" aria-pressed="${authMode === 'up'}">Create account</button></div>
        <form id="authForm" autocomplete="on"><label for="u">Username</label><input id="u" name="u" autocomplete="username" required value="${esc(authUser)}"><label for="p">Password</label><input id="p" name="p" type="password" autocomplete="${authMode === 'up' ? 'new-password' : 'current-password'}" required>${authMode === 'up' ? '<label for="p2">Repeat password</label><input id="p2" name="p2" type="password" autocomplete="new-password" required>' : ''}<div class="err" role="alert">${esc(authErr)}</div><button class="btn pri" style="width:100%;margin-top:6px">${authMode === 'up' ? 'Create account' : 'Sign in'}</button></form>
        <p class="small mute" style="margin:14px 0 0;text-align:center">Your account and data stay on this device.</p></div>${SIG}</div></div>`;
      return;
    }
    const scrollY = window.scrollY, ae = document.activeElement && document.activeElement.getAttribute && document.activeElement.getAttribute('data-bind');
    app.innerHTML = `<header class="top"><div class="wrap"><div class="bar"><div class="logo"><i>N</i> Nidhal Wallet</div><span class="sp"></span><div class="user"><span class="name small">${esc(user)}</span><button class="btn sm" data-act="signout">Sign out</button></div></div><nav class="tabs" aria-label="Sections">${TABS.map(([k, n]) => `<button data-act="go" data-v="${k}" ${view === k ? 'aria-current="page"' : ''}>${n}</button>`).join('')}</nav></div></header><main class="wrap" id="main">${VIEWS[view]()}</main>${SIG}`;
    window.scrollTo(0, scrollY);
    if (ae === 'hq') { const el = $('[data-bind=hq]'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }
  }

  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 3200); }
  const dlg = $('#dlg');
  function openDlg(html) { dlg.innerHTML = html; if (!dlg.open) dlg.showModal(); }
  function closeDlg() { if (dlg.open) dlg.close(); }

  /* ---------------- tx helpers ---------------- */
  const hashOf = (t) => [t.date.slice(0, 16), t.amount.toFixed(3), t.type, t.last4 || '', String(t.merchant).toLowerCase()].join('|');
  function toTx(p) { return { id: uid(), date: p.date, type: p.type, amount: p.amountOMR != null ? p.amountOMR : p.amount, origAmount: p.amount, currency: p.currency || 'OMR', merchant: p.merchant || 'Unknown', category: p.category, bank: p.bank || '', last4: p.last4 || '', note: p.note || '', src: p.src || 'sms' }; }
  function addTxs(list) {
    const have = new Set(D.txs.map(hashOf)); let added = 0;
    list.forEach((p) => { const t = toTx(p); const h = hashOf(t); if (have.has(h)) return; have.add(h); D.txs.push(t); added++; });
    save(); return added;
  }
  function rememberRule(merchant, category) { const k = O.key(merchant).trim(); if (k && k.length > 2) D.settings.rules[k] = category; }

  function parseInput(text) {
    const rules = D.settings.rules;
    let msgs = [];
    if (/<sms\s/i.test(text)) { // SMS Backup & Restore XML
      const dec = (s) => s.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#10;/g, '\n').replace(/&amp;/g, '&');
      const re = /<sms\b[^>]*>/gi; let m;
      while ((m = re.exec(text))) { const tag = m[0]; const b = tag.match(/\bbody="([^"]*)"/i), d = tag.match(/\bdate="(\d+)"/i); if (b) msgs.push({ t: dec(b[1]), d: d ? new Date(+d[1]) : new Date() }); }
    } else msgs = [{ t: text, d: new Date() }];
    let parsed = [], skipped = 0;
    msgs.forEach((x) => { const r = O.parseMany(x.t, x.d, rules); r.parsed.forEach((p) => parsed.push(p)); skipped += r.skipped; });
    const have = new Set(D.txs.map(hashOf));
    parsed.forEach((p) => { const t = toTx(p); p.dup = have.has(hashOf(t)); p.sel = !p.dup; p.autoCat = p.category; });
    return { parsed, skipped };
  }


  /* ---------------- automatic capture (link / share / clipboard) ---------------- */
  function readIncomingFromUrl() {
    try {
      const u = new URL(location.href), sp = u.searchParams, hp = new URLSearchParams(u.hash.replace(/^#/, ''));
      const g = (k) => sp.get(k) || hp.get(k);
      const text = g('sms') || g('body') || g('text') || g('title');
      if (!text) return;
      store.set('nw.incoming', { text: String(text).slice(0, 6000), key: g('k') || '', t: Date.now() });
      history.replaceState(null, '', location.pathname); // remove the message from the address bar
    } catch (e) {}
  }
  function processText(text, trusted) {
    const r = parseInput(text);
    if (!r.parsed.length) { toast('No transaction found in that message.'); return; }
    const fresh = r.parsed.filter((p) => !p.dup);
    if (!fresh.length) { toast('That message was already noted.'); return; }
    if (trusted && D.settings.autosave) {
      const n = addTxs(fresh); const unk = fresh.filter((p) => !p.known).length;
      const d = new Date(fresh[0].date); ym = { y: d.getFullYear(), m: d.getMonth() }; view = 'dashboard'; render();
      toast(`Noted ${n} transaction${n === 1 ? '' : 's'}: ${fresh.map((p) => (p.type === 'income' ? '+' : '−') + fmt(p.amount) + ' ' + p.merchant).join(', ').slice(0, 90)}${unk ? ' – check category in History' : ''}`);
    } else { pending = r.parsed; pendingInfo = `Found ${fresh.length} new transaction${fresh.length === 1 ? '' : 's'}. Review and save.`; view = 'import'; render(); }
  }
  function handleIncoming() {
    if (!user || !D) return;
    const inc = store.get('nw.incoming', null); if (!inc) return; store.del('nw.incoming');
    if (Date.now() - inc.t > 10 * 60 * 1000) return;
    processText(inc.text, inc.key && inc.key === D.settings.captureKey); // only a link carrying your private key saves without review
  }
  function captureLink() { return location.origin + location.pathname.replace(/index\.html$/, '') + '?k=' + D.settings.captureKey + '&sms='; }
  function captureCard() {
    const link = captureLink(), web = location.protocol.startsWith('http');
    return `<div class="card" style="margin-bottom:14px"><h2>⚡ Note messages automatically</h2>
      <p class="small mute" style="margin-top:0">Browsers can’t read your inbox, so these routes send each bank message to the app for you – no copying.</p>
      <div class="row wrapf"><button class="btn pri" data-act="clip">📋 Import from clipboard</button><label class="row small" style="margin:0;font-weight:500"><input type="checkbox" style="width:auto" data-bind="autosave" ${D.settings.autosave ? 'checked' : ''}> Save automatically (no review) when a message arrives through my private link</label></div>
      <details style="margin-top:12px"><summary><b>iPhone – Shortcuts automation (fully automatic)</b></summary><ol class="small" style="padding-left:18px;display:grid;gap:5px">
        <li>Shortcuts → Automation → New → <b>Message</b> → Sender: your bank (e.g. BankMuscat) → Run Immediately.</li>
        <li>Add action <b>URL Encode</b> on <i>Shortcut Input</i> (the message).</li>
        <li>Add action <b>Open URLs</b> with: <code>${esc(link)}</code> followed by the encoded text.</li></ol></details>
      <details style="margin-top:8px"><summary><b>Android – MacroDroid / Tasker / Automate (fully automatic)</b></summary><ol class="small" style="padding-left:18px;display:grid;gap:5px">
        <li>Trigger: <b>SMS received</b> from your bank’s sender name.</li>
        <li>Action: <b>Open website / Launch URL</b> = <code>${esc(link)}</code> + URL-encoded message text (MacroDroid: <code>{sms_message}</code>, Tasker: <code>%SMSRB</code>).</li></ol></details>
      <details style="margin-top:8px"><summary><b>Android – Share to the app (one tap)</b></summary><p class="small">Open this site in Chrome → menu → <b>Install app</b>. Then in Messages long-press a bank SMS → Share → <b>Nidhal Wallet</b>. It opens and reviews the message.</p></details>
      <p class="small mute" style="margin-bottom:0">Your private link: <input readonly value="${esc(link)}" onfocus="this.select()" aria-label="Private capture link" style="font-size:12px;margin-top:4px">${web ? '' : '<span class="neg">Open the app from its web address (https://…) for these links to work; a local file can’t be called by your phone.</span>'}</p></div>`;
  }

  /* ---------------- sample data ---------------- */
  function sampleData() {
    let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const pick = (a) => a[Math.floor(rnd() * a.length)];
    const msgs = []; const today = new Date();
    const f3 = (n) => n.toFixed(3);
    const stamp = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(8 + Math.floor(rnd() * 12)).padStart(2, '0')}:${String(Math.floor(rnd() * 60)).padStart(2, '0')}`;
    const buy = (d, amt, shop) => msgs.push({ d, t: `Bank Muscat: Your Debit Card ending 4821 was used for OMR ${f3(amt)} at ${shop} on ${stamp(d)}. Avl Bal OMR ${f3(300 + rnd() * 600)}` });
    for (let i = 11; i >= 0; i--) {
      const base = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const day = (n) => new Date(base.getFullYear(), base.getMonth(), n);
      const lastDay = i === 0 ? today.getDate() : 28;
      const ok = (n) => n <= lastDay;
      if (ok(2)) msgs.push({ d: day(2), t: `OMR 1,150.000 has been credited to your a/c XXXX4821 - SALARY ${MS[base.getMonth()].toUpperCase()}. Available balance OMR ${f3(1200 + rnd() * 300)} on ${stamp(day(2))}` });
      if (ok(1)) msgs.push({ d: day(1), t: `OMR 280.000 paid to LANDLORD RENT via Mobile Payment on ${stamp(day(1))}` });
      if (ok(5)) buy(day(5), 12 + rnd() * 6, 'NAMA ELECTRICITY');
      if (ok(6)) msgs.push({ d: day(6), t: `Ooredoo bill payment of OMR ${f3(8 + rnd() * 5)} on ${stamp(day(6))} successful. Card ending 4821` });
      if (ok(10) && rnd() > .2) buy(day(10), 150, 'MUSCAT SECURITIES INVESTMENT');
      [3, 9, 15, 21, 27].forEach((n) => { if (ok(n)) buy(day(n), 18 + rnd() * 30, pick(['LULU HYPERMARKET', 'CARREFOUR', 'THE SULTAN CENTER', 'NESTO HYPERMARKET'])); });
      [4, 12, 19, 26].forEach((n) => { if (ok(n)) buy(day(n), 8 + rnd() * 10, pick(['SHELL SEEB', 'OOMCO QURUM', 'AL MAHA PETROLEUM'])); });
      for (let k = 0; k < 8; k++) { const n = 2 + Math.floor(rnd() * 26); if (ok(n)) buy(day(n), 1.5 + rnd() * 9, pick(['STARBUCKS QURUM', 'KFC SEEB', 'TALABAT', 'MCDONALDS MUSCAT', 'COSTA COFFEE', 'KARGEEN CAFE'])); }
      if (ok(8)) buy(day(8), 4.2, 'NETFLIX.COM');
      if (ok(14) && rnd() > .4) buy(day(14), 10 + rnd() * 45, pick(['CITY CENTRE MUSCAT', 'H&M', 'ZARA', 'AMAZON']));
      if (ok(17) && rnd() > .6) msgs.push({ d: day(17), t: `OMR 40.000 withdrawn at ATM RUWI on ${stamp(day(17))}` });
      if (ok(22) && rnd() > .6) buy(day(22), 6 + rnd() * 20, pick(['MUSCAT PHARMACY', 'ASTER PHARMACY']));
    }
    const out = []; const rules = D.settings.rules;
    msgs.forEach((x) => { const p = O.parseMessage(x.t, x.d, rules); if (p) { p.src = 'sample'; out.push(p); } });
    return out;
  }

  /* ---------------- dialogs ---------------- */
  function txDialog(t) {
    const edit = !!t; t = t || { type: 'expense', category: 'other', date: new Date().toISOString(), amount: '', merchant: '', note: '' };
    const income = t.type === 'income';
    openDlg(`<form id="txForm" data-id="${edit ? t.id : ''}"><h2>${edit ? 'Edit' : 'Add'} transaction</h2>
      <div class="seg" role="group"><button type="button" data-act="ttype" data-t="expense" aria-pressed="${!income}">Spending</button><button type="button" data-act="ttype" data-t="income" aria-pressed="${income}">Income</button></div><input type="hidden" name="type" value="${income ? 'income' : 'expense'}">
      <div class="form2"><div><label>Amount (OMR)</label><input name="amount" type="number" step="0.001" min="0.001" required value="${t.amount !== '' ? Number(t.amount).toFixed(3) : ''}"></div><div><label>Date</label><input name="date" type="date" required value="${toInputDate(t.date)}"></div></div>
      <label>Paid to / received from</label><input name="merchant" required value="${esc(t.merchant)}" list="mlist" autocomplete="off"><datalist id="mlist">${O.MERCHANTS.slice(0, 400).map((m) => `<option value="${esc(m.name)}">`).join('')}</datalist>
      <label>Category</label><select name="category">${O.CATEGORIES.map((c) => `<option value="${c.id}" ${c.id === t.category ? 'selected' : ''}>${c.icon} ${esc(c.name)}${c.income ? ' (income)' : ''}</option>`).join('')}</select>
      <label>Note</label><input name="note" value="${esc(t.note || '')}">
      <label class="row" style="font-weight:500"><input type="checkbox" name="rule" style="width:auto" ${edit ? 'checked' : ''}> Remember this category for this shop${edit ? ' and update past payments' : ''}</label>
      <div class="row" style="margin-top:14px;justify-content:flex-end"><button type="button" class="btn" data-act="closedlg">Cancel</button><button class="btn pri">Save</button></div></form>`);
  }
  function reminderDialog() {
    openDlg(`<form id="remForm"><h2>New reminder</h2><label>What for?</label><input name="title" required placeholder="Rent, Omantel bill, invest in MSX…"><div class="form2"><div><label>Amount (OMR, optional)</label><input name="amount" type="number" step="0.001" min="0"></div><div><label>Day of month</label><input name="day" type="number" min="1" max="31" value="1" required></div></div><label>Counts against</label><select name="bucket"><option value="operating">Operating budget</option><option value="investment">Investment budget</option></select><div class="row" style="margin-top:14px;justify-content:flex-end"><button type="button" class="btn" data-act="closedlg">Cancel</button><button class="btn pri">Add</button></div></form>`);
  }
  function confirmDlg(msg, act, extra) {
    openDlg(`<h2>Are you sure?</h2><p>${esc(msg)}</p><div class="row" style="justify-content:flex-end"><button class="btn" data-act="closedlg">Cancel</button><button class="btn danger" data-act="${act}" ${extra || ''}>Yes, continue</button></div>`);
  }

  /* ---------------- events ---------------- */
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const a = el.dataset.act; if (el.tagName === 'A') e.preventDefault();
    switch (a) {
      case 'amode': authMode = el.dataset.m; authErr = ''; render(); break;
      case 'signout': signOut(); break;
      case 'go': view = el.dataset.v; render(); window.scrollTo(0, 0); break;
      case 'mprev': ym = shiftMonth(ym.y, ym.m, -1); render(); break;
      case 'mnext': ym = shiftMonth(ym.y, ym.m, 1); render(); break;
      case 'mnow': ym = { y: now0.getFullYear(), m: now0.getMonth() }; render(); break;
      case 'closedlg': closeDlg(); break;
      case 'analyse': {
        const text = $('#smsText').value; if (!text.trim()) { toast('Paste at least one message first.'); break; }
        const r = parseInput(text); pending = r.parsed;
        pendingInfo = r.parsed.length ? `Found ${r.parsed.length} transaction${r.parsed.length > 1 ? 's' : ''}${r.skipped ? `; ignored ${r.skipped} other message${r.skipped > 1 ? 's' : ''} (OTP, promos or no amount)` : ''}.` : 'No transactions found. Make sure the message includes an amount like “OMR 5.500”.';
        render(); break;
      }
      case 'savepending': {
        const sel = pending.filter((p) => p.sel); sel.forEach((p) => { if (p.category !== p.autoCat || p.edited) rememberRule(p.merchant, p.category); });
        const n = addTxs(sel); pending = []; pendingInfo = `Saved ${n} transaction${n === 1 ? '' : 's'}.`; toast(pendingInfo); view = 'dashboard';
        if (sel.length) { const d = new Date(sel.sort((x, y) => new Date(y.date) - new Date(x.date))[0].date); ym = { y: d.getFullYear(), m: d.getMonth() }; }
        render(); break;
      }
      case 'sample': { const n = addTxs(sampleData()); toast(`Loaded ${n} sample transactions. Delete them any time in Settings.`); view = 'dashboard'; ym = { y: now0.getFullYear(), m: now0.getMonth() }; render(); break; }
      case 'clip': (navigator.clipboard && navigator.clipboard.readText ? navigator.clipboard.readText() : Promise.reject()).then((t) => { if (!t || !t.trim()) return toast('Clipboard is empty – copy a bank message first.'); processText(t, true); }).catch(() => toast('Can’t read the clipboard here – paste into the box below instead.')); break;
      case 'manual': txDialog(null); break;
      case 'edit': txDialog(D.txs.find((t) => t.id === el.dataset.id)); break;
      case 'del': confirmDlg('Delete this transaction?', 'delok', `data-id="${el.dataset.id}"`); break;
      case 'delok': D.txs = D.txs.filter((t) => t.id !== el.dataset.id); save(); closeDlg(); render(); break;
      case 'ttype': { const f = $('#txForm'); f.type.value = el.dataset.t; f.querySelectorAll('.seg button').forEach((b) => b.setAttribute('aria-pressed', b === el)); const inc = el.dataset.t === 'income'; const cur = f.category.value; if (!!cat(cur).income !== inc) f.category.value = inc ? 'salary' : 'other'; break; }
      case 'hmonth': hf.month = el.dataset.m; hf.limit = 60; render(); setTimeout(() => $('.filters') && $('.filters').scrollIntoView({ behavior: 'smooth', block: 'center' }), 30); break;
      case 'more': hf.limit += 100; render(); break;
      case 'csv': exportCsv(); break;
      case 'preset': { const [op, inv] = el.dataset.p.split(',').map(Number); D.settings.split = { op, inv, sav: 100 - op - inv }; save(); render(); break; }
      case 'radd': reminderDialog(); break;
      case 'rpaid': { const r = D.reminders.find((x) => x.id === el.dataset.id); const n = nextDue(r, new Date()); if (n) { r.paid = n.key; save(); render(); toast('Marked as paid – it will come back next month.'); } break; }
      case 'rdel': delete D.settings.rules[el.dataset.k]; save(); render(); break;
      case 'notif': if ('Notification' in window) Notification.requestPermission().then(() => { render(); notifyDue(); }); break;
      case 'backup': { const blob = new Blob([JSON.stringify({ app: 'nidhal-wallet', version: 1, data: D }, null, 1)], { type: 'application/json' }); download(blob, 'nidhal-wallet-backup.json'); break; }
      case 'wipe': confirmDlg('This permanently deletes every transaction, reminder and setting of your account on this device.', 'wipeok'); break;
      case 'wipeok': D = defaults(); save(); closeDlg(); pending = []; render(); toast('All data deleted.'); break;
    }
  });
  function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
  function exportCsv() {
    const q = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""').replace(/^[=+\-@]/, "'$&") + '"';
    const rows = [['Date', 'Type', 'Amount OMR', 'Merchant', 'Category', 'Bank', 'Card', 'Note']].concat(filteredTx().map((t) => [toInputDate(t.date), t.type, t.amount.toFixed(3), t.merchant, cat(t.category).name, t.bank, t.last4, t.note]));
    download(new Blob(['﻿' + rows.map((r) => r.map(q).join(',')).join('\n')], { type: 'text/csv' }), `nidhal-wallet-${histYear}.csv`);
  }

  document.addEventListener('submit', async (e) => {
    const f = e.target; e.preventDefault();
    if (f.id === 'authForm') return doAuth(f);
    if (f.id === 'txForm') {
      const v = f; const type = v.type.value; const merchant = v.merchant.value.trim();
      const d = new Date(v.date.value + 'T12:00:00');
      const patch = { type, amount: Math.round(parseFloat(v.amount.value) * 1000) / 1000, date: d.toISOString(), merchant, category: v.category.value, note: v.note.value.trim() };
      if (f.dataset.id) {
        const t = D.txs.find((x) => x.id === f.dataset.id); const keepDate = toInputDate(t.date) === v.date.value ? t.date : patch.date; Object.assign(t, patch, { origAmount: patch.amount, currency: 'OMR', date: keepDate });
        if (v.rule.checked) { rememberRule(merchant, patch.category); D.txs.forEach((x) => { if (O.key(x.merchant) === O.key(merchant) && x.type === type) x.category = patch.category; }); }
      } else { D.txs.push(toTx(Object.assign({ src: 'manual' }, patch))); if (v.rule.checked) rememberRule(merchant, patch.category); }
      save(); closeDlg(); render(); toast('Saved.');
    }
    if (f.id === 'remForm') {
      D.reminders.push({ id: uid(), title: f.title.value.trim(), amount: parseFloat(f.amount.value) || 0, day: Math.min(31, Math.max(1, +f.day.value)), bucket: f.bucket.value });
      save(); closeDlg(); render(); toast('Reminder added.');
    }
  });

  document.addEventListener('input', (e) => {
    const el = e.target; const b = el.dataset && el.dataset.bind; if (!b) return;
    if (b === 'hq') { hf.q = el.value; hf.limit = 60; render(); }
    if (b === 'merchant') { pending[+el.dataset.i].merchant = el.value; pending[+el.dataset.i].edited = true; }
    if (b === 'income') { D.settings.income = Math.max(0, parseFloat(el.value) || 0); save(); }
  });
  document.addEventListener('change', (e) => {
    const el = e.target; if (el.id === 'smsFile') return readFile(el.files[0], (txt) => { $('#smsText').value = txt.length > 400000 ? txt.slice(0, 400000) : txt; const r = parseInput(txt); pending = r.parsed; pendingInfo = `Read ${el.files[0].name}: found ${r.parsed.length} transaction${r.parsed.length === 1 ? '' : 's'}, ignored ${r.skipped} other message${r.skipped === 1 ? '' : 's'}.`; render(); });
    if (el.id === 'restoreFile') return readFile(el.files[0], (txt) => { try { const j = JSON.parse(txt); if (!j.data || !Array.isArray(j.data.txs)) throw 0; D = Object.assign(defaults(), j.data); D.settings = Object.assign(defaults().settings, D.settings); save(); render(); toast('Backup restored.'); } catch (x) { toast('That file is not a valid backup.'); } });
    const b = el.dataset && el.dataset.bind; if (!b) return;
    if (b === 'sel') pending[+el.dataset.i].sel = el.checked, render();
    else if (b === 'category') { pending[+el.dataset.i].category = el.value; pending[+el.dataset.i].known = true; render(); }
    else if (b === 'autosave') { D.settings.autosave = el.checked; save(); }
    else if (b === 'hyear') { histYear = +el.value; render(); }
    else if (b === 'hmonth') { hf.month = el.value; hf.limit = 60; render(); }
    else if (b === 'hcat') { hf.cat = el.value; hf.limit = 60; render(); }
    else if (b === 'htype') { hf.type = el.value; hf.limit = 60; render(); }
    else if (b === 'income') { D.settings.income = Math.max(0, parseFloat(el.value) || 0); save(); render(); }
    else if (b === 'sp_op' || b === 'sp_inv') {
      let op = D.settings.split.op, inv = D.settings.split.inv; const v = Math.max(0, Math.min(100, Math.round(+el.value || 0)));
      if (b === 'sp_op') { op = v; if (op + inv > 100) inv = 100 - op; } else { inv = v; if (op + inv > 100) op = 100 - inv; }
      D.settings.split = { op, inv, sav: 100 - op - inv }; save(); render();
    } else if (b === 'theme') { store.set('nw.theme', el.value); applyTheme(); }
  });
  function readFile(file, cb) { if (!file) return; if (file.size > 25e6) return toast('File is too large.'); const r = new FileReader(); r.onload = () => cb(String(r.result)); r.readAsText(file); }
  function applyTheme() { const t = store.get('nw.theme', 'auto'); if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t); }
  function notifyDue() {
    if (!('Notification' in window) || Notification.permission !== 'granted' || !D) return;
    reminderList().filter((x) => x.overdue || x.days <= 1).forEach((x) => { try { new Notification('Nidhal Wallet – ' + x.r.title, { body: (x.overdue ? 'Overdue' : x.days === 0 ? 'Due today' : 'Due tomorrow') + (x.r.amount ? ' · ' + omr(x.r.amount) : '') }); } catch (e) {} });
  }

  applyTheme();
  if (user && !store.get('nw.users', {})[user]) user = null;
  if (user) { loadData(); setTimeout(notifyDue, 1500); }
  render();
  readIncomingFromUrl();
  handleIncoming();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
