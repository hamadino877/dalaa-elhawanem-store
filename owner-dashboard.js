/* ===== لوحة صاحب المحل — دلع الهوانم ===== */
(function () {
'use strict';
/* الإيميل اللي هتنشئيه في Supabase → Authentication → Users (كلمة السر هي الرقم السري للوحة) */
const OWNER_EMAIL = 'owner@dalaa-elhawanem.com';
const DEPOSIT = 100, LOW = 2;
const EN = document.documentElement.lang === 'en';
const $ = id => document.getElementById(id);
const arr = v => Array.isArray(v) ? v : [];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => Math.round(Number(n) || 0).toLocaleString('en-US');
const sum = (a, k) => a.reduce((x, o) => x + (Number(o[k]) || 0), 0);
const db = () => _supabase;
let S = { bundle_on: true, bundle_per: 50, site_pct: 0, coupons: [] };
let coupon = null;

/* ================= حساب الخصم (يستخدمه الموقع) ================= */
const liveCoupon = () => coupon && arr(S.coupons).find(x => x.code === coupon.code && x.active);
window.calcTotals = function (c) {
    c = c || cart;
    const q = c.reduce((a, i) => a + i.qty, 0), sub = c.reduce((a, i) => a + parseFloat(i.price) * i.qty, 0);
    const bundle = S.bundle_on && q > 1 ? (q - 1) * (+S.bundle_per || 0) : 0;
    let rest = Math.max(0, sub - bundle);
    const site = Math.round(rest * (+S.site_pct || 0) / 100); rest -= site;
    let cp = 0; const k = liveCoupon();
    if (k && sub > 0) cp = Math.min(rest, k.type === 'pct' ? Math.round(rest * k.value / 100) : k.value);
    const disc = bundle + site + cp;
    return { sub, disc, bundle, site, coupon: cp, total: Math.max(0, sub - disc) };
};
async function loadSettings() {
    try { const { data } = await db().from('settings').select('value').eq('key', 'store').maybeSingle(); if (data && data.value) S = Object.assign(S, data.value); } catch (e) { }
    try { updateCartUI(); } catch (e) { }
}

/* ================= كود الخصم في السلة ================= */
function mountCoupon() {
    const row = $('cart-discount') && $('cart-discount').parentElement;
    if (!row || $('ow-cp')) return;
    row.insertAdjacentHTML('beforebegin', `<div id="ow-cp"><div class="flex gap-2"><input id="ow-cp-in" dir="ltr" placeholder="${EN ? 'Discount code' : 'كود خصم'}" class="flex-1 rounded-lg p-2 text-xs outline-none" style="border:1px solid var(--line);background:var(--surface);text-transform:uppercase"><button type="button" id="ow-cp-btn" class="btn-outline px-4 rounded-lg text-xs font-bold">${EN ? 'Apply' : 'تطبيق'}</button></div><p id="ow-cp-msg" class="text-[11px] font-bold mt-1 hidden" style="color:var(--rosewood-deep)"></p></div>`);
    $('ow-cp-btn').onclick = () => {
        const code = $('ow-cp-in').value.trim().toUpperCase(), k = arr(S.coupons).find(x => x.code === code && x.active), m = $('ow-cp-msg');
        coupon = k ? { code: k.code } : null; m.classList.remove('hidden');
        m.textContent = k ? (EN ? 'Code applied ✓' : 'تم تطبيق الكود ✓') : (EN ? 'Invalid code' : 'الكود غير صحيح أو منتهي');
        updateCartUI();
    };
}

/* ================= تسجيل الطلب عند الإرسال بالواتساب ================= */
const sendOrig = window.sendOrderWhatsApp;
window.sendOrderWhatsApp = function () {
    const snap = (typeof cart !== 'undefined' ? cart : []).map(i => ({ id: i.id, title: i.title, size: i.size || '', color: i.color || '', qty: i.qty, price: Number(i.price) }));
    const t = window.calcTotals(), kc = liveCoupon();
    const f = id => ($(id) && $(id).value.trim()) || '';
    const pay = (document.querySelector('input[name="payment-method"]:checked') || {}).value || 'cod';
    const ow = window.open; let sent = false;
    window.open = function (u) { if (String(u).includes('wa.me')) sent = true; return ow.apply(this, arguments); };
    try { sendOrig.apply(this, arguments); } finally { window.open = ow; }
    if (!sent || !snap.length) return;
    db().from('orders').insert([{
        customer_name: f('cust-name'), phone: f('cust-phone'), address: f('cust-address'), payment_method: pay,
        items: snap, subtotal: t.sub, discount: t.disc, total: t.total, deposit: pay === 'cod' ? Math.min(DEPOSIT, t.total) : 0,
        coupon_code: kc ? kc.code : null, status: 'pending'
    }]).then(r => { if (r.error) console.warn('تعذر تسجيل الطلب:', r.error.message); });
};

/* ================= واجهة اللوحة ================= */
const css = `
#ow-root{position:fixed;inset:0;z-index:300;display:none;overflow-y:auto;background:var(--paper);color:var(--ink);font-family:'Cairo',sans-serif;direction:rtl;text-align:right}
#ow-root *{box-sizing:border-box}
.ow-bar{position:sticky;top:0;z-index:5;background:var(--surface);border-bottom:1px solid var(--line);padding:calc(10px + env(safe-area-inset-top)) 16px 0}
.ow-top{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.ow-tabs{display:flex;gap:4px;overflow-x:auto;margin-top:8px}
.ow-tab{padding:9px 14px;font-size:13px;font-weight:800;color:var(--ink-muted);border-bottom:2px solid transparent;white-space:nowrap}
.ow-tab.on{color:var(--rosewood-deep);border-color:var(--rosewood)}
.ow-wrap{max-width:1100px;margin:0 auto;padding:18px 16px 60px}
.ow-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
@media(min-width:768px){.ow-grid.k{grid-template-columns:repeat(4,1fr)}.ow-grid.c2{grid-template-columns:repeat(2,1fr)}}
.ow-card{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:14px}
.ow-k small{display:block;font-size:11px;color:var(--ink-muted);font-weight:700}
.ow-k b{font-size:22px;font-weight:900;color:var(--rosewood-deep)}
.ow-h{font-size:14px;font-weight:900;margin:22px 0 10px}
.ow-btn{padding:8px 14px;border-radius:10px;font-size:12px;font-weight:800;background:var(--rosewood);color:#fff}
.ow-btn.o{background:transparent;color:var(--ink);border:1px solid var(--line)}
.ow-btn.r{background:transparent;color:#b3261e;border:1px solid #E8CFCB}
.ow-btn:disabled{opacity:.5}
.ow-in{border:1px solid var(--line);border-radius:10px;padding:8px 10px;font-size:12px;background:#fff;width:100%}
.ow-chip{padding:6px 12px;border-radius:9999px;font-size:11px;font-weight:800;border:1px solid var(--line);background:var(--surface)}
.ow-chip.on{background:var(--rosewood);color:#fff;border-color:var(--rosewood)}
.ow-badge{display:inline-block;padding:2px 10px;border-radius:9999px;font-size:10px;font-weight:800}
.ow-bars{display:flex;align-items:flex-end;gap:8px;height:130px}
.ow-bar-c{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;font-size:10px;color:var(--ink-muted)}
.ow-bar-c i{display:block;width:100%;max-width:38px;background:linear-gradient(var(--gold),var(--rosewood));border-radius:6px 6px 0 0;min-height:2px}
.ow-row{display:flex;justify-content:space-between;gap:10px;font-size:12px;padding:5px 0;border-bottom:1px dashed var(--line)}
.ow-row:last-child{border:0}
.ow-sz{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;margin:3px 0 3px 8px}
.ow-sz input{width:62px;text-align:center}
.ow-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--ink);color:#fff;padding:10px 18px;border-radius:12px;font-size:12px;font-weight:700;z-index:400}
`;
const root = document.createElement('div'); root.id = 'ow-root';
document.head.insertAdjacentHTML('beforeend', '<style>' + css + '</style>');
document.body.appendChild(root);

let tab = 'ov', per = '30', ofil = 'all', orders = [], ordErr = '';
const TABS = { ov: 'نظرة عامة', or: 'الطلبات', st: 'المخزون', di: 'الخصومات' };
const STAT = { pending: ['بانتظار التأكيد', '#FFF4D6', '#8A6100'], confirmed: ['مؤكد', '#E1F0E6', '#1F6B3A'], delivered: ['تم التسليم', '#DDE8F7', '#254A85'], cancelled: ['ملغي', '#F6DEDB', '#9B2C22'] };
const PAY = { cod: 'عند الاستلام + عربون', vodafone_cash: 'فودافون كاش', instapay: 'إنستاباي' };
const isSold = o => o.status === 'confirmed' || o.status === 'delivered';
const items = o => arr(typeof o.items === 'string' ? JSON.parse(o.items) : o.items);
const dstr = d => new Date(d).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });
function note(m) { const t = document.createElement('div'); t.className = 'ow-toast'; t.textContent = m; root.appendChild(t); setTimeout(() => t.remove(), 2400); }
function inPer(o) {
    if (per === 'all') return true;
    const t = new Date(o.created_at).getTime(), now = new Date();
    if (per === '0') return t >= new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return Date.now() - t <= (+per) * 864e5;
}
const stockMap = p => { let s = p.stock; if (typeof s === 'string') { try { s = JSON.parse(s); } catch (e) { s = null; } } return s && typeof s === 'object' ? s : null; };

/* ---------- الدخول ---------- */
function showLogin() {
    root.style.display = 'block'; document.body.style.overflow = 'hidden';
    root.innerHTML = `<div style="min-height:100%;display:flex;align-items:center;justify-content:center;padding:20px"><div class="ow-card" style="width:100%;max-width:360px;padding:26px;text-align:center">
        <div class="monogram" style="margin:0 auto 12px">د</div><h2 class="font-display" style="font-size:20px;font-weight:800">لوحة صاحب المحل</h2>
        <p style="font-size:12px;color:var(--ink-muted);margin:4px 0 16px">أدخلي الرقم السري للدخول</p>
        <input id="ow-pw" type="password" class="ow-in" placeholder="الرقم السري" style="text-align:center;margin-bottom:8px">
        <p id="ow-err" style="color:#b3261e;font-size:11px;font-weight:700;min-height:16px"></p>
        <button data-a="login" class="ow-btn" style="width:100%;padding:11px">دخول</button>
        <button data-a="close" class="ow-btn o" style="width:100%;margin-top:8px">إلغاء</button></div></div>`;
    $('ow-pw').focus(); $('ow-pw').onkeydown = e => { if (e.key === 'Enter') doLogin(); };
}
async function doLogin() {
    const b = root.querySelector('[data-a="login"]'); b.disabled = true;
    const { error } = await db().auth.signInWithPassword({ email: OWNER_EMAIL, password: $('ow-pw').value });
    if (error) { $('ow-err').textContent = 'الرقم السري غير صحيح'; b.disabled = false; return; }
    await loadAll(); render();
}
async function logout() {
    try { await db().auth.signOut(); } catch (e) { }
    root.style.display = 'none'; root.innerHTML = ''; document.body.style.overflow = '';
    if (location.hash === '#owner') history.replaceState(null, '', location.pathname + location.search);
}
async function loadAll() {
    const [o] = await Promise.all([db().from('orders').select('*').order('created_at', { ascending: false }).limit(3000), fetchProducts().catch(() => { }), loadSettings()]);
    ordErr = o.error ? o.error.message : ''; orders = o.error ? [] : (o.data || []);
}
async function refresh() { await loadAll(); render(); note('تم التحديث'); }

/* ---------- الهيكل ---------- */
function render() {
    const body = { ov: ovHTML, or: orHTML, st: stHTML, di: diHTML }[tab]();
    root.innerHTML = `<div class="ow-bar"><div class="ow-top"><div style="display:flex;align-items:center;gap:10px"><div class="monogram" style="width:38px;height:38px;font-size:17px">د</div><b class="font-display" style="font-size:17px">لوحة صاحب المحل</b></div>
        <div style="display:flex;gap:6px"><button data-a="refresh" class="ow-btn o"><i class="fa-solid fa-rotate"></i> تحديث</button><button data-a="close" class="ow-btn r">خروج</button></div></div>
        <div class="ow-tabs">${Object.entries(TABS).map(([k, v]) => `<button data-a="tab" data-v="${k}" class="ow-tab ${tab === k ? 'on' : ''}">${v}${k === 'or' && orders.some(o => o.status === 'pending') ? ` <span class="ow-badge" style="background:var(--rosewood);color:#fff">${orders.filter(o => o.status === 'pending').length}</span>` : ''}</button>`).join('')}</div></div>
        <div class="ow-wrap">${ordErr ? `<div class="ow-card" style="border-color:#E8CFCB;color:#9B2C22;font-size:12px;margin-bottom:12px">تعذر تحميل الطلبات: ${esc(ordErr)} — تأكدي من تشغيل ملف owner-setup.sql في Supabase.</div>` : ''}${body}</div>`;
}
const perSel = () => `<select data-f="per" class="ow-in" style="width:auto">${[['0', 'اليوم'], ['7', 'آخر 7 أيام'], ['30', 'آخر 30 يوم'], ['all', 'كل الفترات']].map(([v, l]) => `<option value="${v}" ${per === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`;

/* ---------- نظرة عامة ---------- */
function ovHTML() {
    const os = orders.filter(inPer), sold = os.filter(isSold), pend = os.filter(o => o.status === 'pending');
    const pieces = sold.reduce((a, o) => a + items(o).reduce((x, i) => x + i.qty, 0), 0);
    let left = 0, val = 0; const low = [];
    productsList.forEach(p => arr(p.sizes).forEach(s => { const v = stockOf(p, s); if (v !== Infinity) { left += v; val += v * Number(p.price); if (v <= LOW) low.push([p.title, s, v]); } }));
    const days = [...Array(7)].map((_, k) => { const d = new Date(); d.setDate(d.getDate() - (6 - k)); return d; });
    const dv = days.map(d => sum(orders.filter(o => isSold(o) && new Date(o.created_at).toDateString() === d.toDateString()), 'total')), mx = Math.max(...dv, 1);
    const top = {}; sold.forEach(o => items(o).forEach(i => { const t = top[i.title] || (top[i.title] = { q: 0, r: 0 }); t.q += i.qty; t.r += i.qty * i.price; }));
    const tl = Object.entries(top).sort((a, b) => b[1].q - a[1].q).slice(0, 5);
    const K = (l, v, s) => `<div class="ow-card ow-k"><small>${l}</small><b>${v}</b>${s ? `<small style="margin-top:2px">${s}</small>` : ''}</div>`;
    return `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><b>ملخص الأداء</b>${perSel()}</div>
    <div class="ow-grid k">${K('إجمالي المبيعات', fmt(sum(sold, 'total')) + ' ج.م', 'من الطلبات المؤكدة والمسلّمة')}${K('عدد الطلبات المؤكدة', fmt(sold.length), pend.length + ' بانتظار التأكيد')}${K('القطع المباعة', fmt(pieces))}${K('إجمالي الخصومات', fmt(sum(sold, 'discount')) + ' ج.م')}
    ${K('متوسط قيمة الطلب', fmt(sold.length ? sum(sold, 'total') / sold.length : 0) + ' ج.م')}${K('العربون المستلم', fmt(sum(sold.filter(o => o.payment_method === 'cod'), 'deposit')) + ' ج.م')}${K('القطع المتبقية بالمخزون', fmt(left), 'للمنتجات اللي ليها كمية محددة')}${K('قيمة المخزون المتبقي', fmt(val) + ' ج.م')}</div>
    <div class="ow-h">المبيعات آخر 7 أيام</div><div class="ow-card"><div class="ow-bars">${dv.map((v, k) => `<div class="ow-bar-c"><span>${v ? fmt(v) : ''}</span><i style="height:${Math.max(2, v / mx * 90)}%"></i><span style="margin-top:4px">${days[k].toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}</span></div>`).join('')}</div></div>
    <div class="ow-grid c2" style="grid-template-columns:1fr"><div><div class="ow-h">الأكثر مبيعاً</div><div class="ow-card">${tl.length ? tl.map(([t, x]) => `<div class="ow-row"><span>${esc(t)}</span><b>${x.q} قطعة • ${fmt(x.r)} ج.م</b></div>`).join('') : '<p style="font-size:12px;color:var(--ink-muted)">لا توجد مبيعات مؤكدة في هذه الفترة.</p>'}</div></div>
    <div><div class="ow-h">تنبيهات المخزون (${LOW} قطع أو أقل)</div><div class="ow-card">${low.length ? low.map(([t, s, v]) => `<div class="ow-row"><span>${esc(t)} — مقاس ${esc(s)}</span><b style="color:${v ? '#8A6100' : '#b3261e'}">${v ? 'باقي ' + v : 'نفذ'}</b></div>`).join('') : '<p style="font-size:12px;color:var(--ink-muted)">لا توجد أصناف قاربت على النفاد 👌</p>'}</div></div></div>`;
}

/* ---------- الطلبات ---------- */
function orHTML() {
    const list = orders.filter(o => ofil === 'all' || o.status === ofil);
    const chips = [['all', 'الكل'], ...Object.entries(STAT).map(([k, v]) => [k, v[0]])];
    return `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">${chips.map(([k, l]) => `<button data-a="ofil" data-v="${k}" class="ow-chip ${ofil === k ? 'on' : ''}">${l} (${k === 'all' ? orders.length : orders.filter(o => o.status === k).length})</button>`).join('')}</div>
    ${list.length ? list.map(o => { const s = STAT[o.status] || STAT.pending, id = esc(o.id), ph = esc(o.phone).replace(/\D/g, '');
        return `<div class="ow-card" style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><div><b style="font-size:14px">${esc(o.customer_name)}</b> <span class="ow-badge" style="background:${s[1]};color:${s[2]}">${s[0]}</span><div style="font-size:11px;color:var(--ink-muted);margin-top:2px">${dstr(o.created_at)} • ${esc(PAY[o.payment_method] || o.payment_method)}</div></div>
        <div style="display:flex;gap:6px"><a class="ow-btn o" href="tel:${ph}"><i class="fa-solid fa-phone"></i></a><a class="ow-btn o" target="_blank" rel="noopener" href="https://wa.me/${ph.replace(/^0/, '20')}"><i class="fa-brands fa-whatsapp"></i></a></div></div>
        <div style="font-size:11px;color:var(--ink-muted);margin:6px 0">${esc(o.phone)} • ${esc(o.address)}</div>
        ${items(o).map(i => `<div class="ow-row"><span>${esc(i.title)}${i.size ? ' • ' + esc(i.size) : ''}${i.color ? ' • ' + esc(i.color) : ''} × ${i.qty}</span><span>${fmt(i.price * i.qty)} ج.م</span></div>`).join('')}
        <div class="ow-row"><span>المجموع</span><span>${fmt(o.subtotal)} ج.م</span></div>
        <div class="ow-row"><span>الخصم${o.coupon_code ? ' (كود ' + esc(o.coupon_code) + ')' : ''}</span><span style="color:#1F6B3A">- ${fmt(o.discount)} ج.م</span></div>
        <div class="ow-row"><b>الإجمالي النهائي</b><b style="color:var(--rosewood-deep)">${fmt(o.total)} ج.م</b></div>
        ${o.payment_method === 'cod' ? `<div class="ow-row"><span>العربون / المتبقي عند الاستلام</span><span>${fmt(o.deposit)} / ${fmt(Math.max(0, o.total - o.deposit))} ج.م</span></div>` : ''}
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">
        ${o.status === 'pending' ? `<button class="ow-btn" data-a="status" data-id="${id}" data-v="confirmed">تأكيد وخصم من المخزون</button>` : ''}
        ${o.status === 'confirmed' ? `<button class="ow-btn" data-a="status" data-id="${id}" data-v="delivered">تم التسليم</button>` : ''}
        ${o.status === 'cancelled' ? `<button class="ow-btn o" data-a="status" data-id="${id}" data-v="pending">إعادة فتح</button>` : `<button class="ow-btn o" data-a="xdisc" data-id="${id}">خصم إضافي</button><button class="ow-btn r" data-a="status" data-id="${id}" data-v="cancelled">إلغاء</button>`}</div></div>`; }).join('') : '<div class="ow-card" style="text-align:center;font-size:12px;color:var(--ink-muted)">لا توجد طلبات.</div>'}`;
}
function adjustStock(o, dir) {
    const by = {};
    items(o).forEach(i => { if (i.size) (by[i.id] = by[i.id] || []).push(i); });
    return Promise.all(Object.entries(by).map(async ([pid, its]) => {
        const p = productsList.find(x => String(x.id) === String(pid)); const st = p && stockMap(p); if (!st) return;
        const ns = Object.assign({}, st); let ch = false;
        its.forEach(i => { if (ns[i.size] !== undefined && ns[i.size] !== '' && ns[i.size] !== null) { ns[i.size] = Math.max(0, Number(ns[i.size]) + dir * i.qty); ch = true; } });
        if (!ch) return;
        const { error } = await db().from('products').update({ stock: ns }).eq('id', p.id);
        if (error) throw error; p.stock = ns;
    }));
}
async function setStatus(id, st) {
    const o = orders.find(x => String(x.id) === id); if (!o) return;
    const apply = (st === 'confirmed' || st === 'delivered') && !o.stock_applied, restore = (st === 'cancelled' || st === 'pending') && o.stock_applied;
    try {
        if (apply) await adjustStock(o, -1); else if (restore) await adjustStock(o, 1);
        const upd = { status: st, stock_applied: apply ? true : restore ? false : !!o.stock_applied };
        const { error } = await db().from('orders').update(upd).eq('id', o.id); if (error) throw error;
        Object.assign(o, upd); note(apply ? 'تم التأكيد وخصم الكمية من المخزون' : restore ? 'تم الإلغاء وإرجاع الكمية للمخزون' : 'تم تحديث الحالة');
    } catch (e) { note('حدث خطأ: ' + (e.message || e)); }
    render();
}
async function extraDisc(id) {
    const o = orders.find(x => String(x.id) === id); if (!o) return;
    const v = prompt('قيمة الخصم الإضافي (بالجنيه) على هذا الطلب:', '0'); if (v === null) return;
    const d = Math.max(0, Math.min(Number(v) || 0, o.total)); if (!d) return;
    const upd = { discount: Number(o.discount) + d, total: Number(o.total) - d, owner_discount: Number(o.owner_discount || 0) + d };
    const { error } = await db().from('orders').update(upd).eq('id', o.id);
    if (error) return note('تعذر الحفظ: ' + error.message);
    Object.assign(o, upd); note('تم تطبيق الخصم'); render();
}

/* ---------- المخزون ---------- */
function stHTML() {
    const sold = {}; orders.filter(isSold).forEach(o => items(o).forEach(i => { const k = i.id + '|' + i.size; sold[k] = (sold[k] || 0) + i.qty; }));
    return `<p style="font-size:12px;color:var(--ink-muted);margin-bottom:10px">عدّلي الكمية المتبقية لكل مقاس ثم احفظي. اتركي الخانة فاضية = غير محدود، 0 = نفذ.</p>` + productsList.map(p => {
        const sz = arr(p.sizes), pid = esc(p.id);
        return `<div class="ow-card" style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><b style="font-size:13px">${esc(p.title)}</b><span style="font-size:11px;color:var(--ink-muted)">${fmt(p.price)} ج.م</span></div>
        ${sz.length ? `<div style="margin-top:6px">${sz.map(s => { const v = stockOf(p, s); return `<label class="ow-sz">${esc(s)}<input class="ow-in" type="number" min="0" inputmode="numeric" data-stk="${pid}" data-size="${esc(s)}" value="${v === Infinity ? '' : v}" placeholder="∞"><small style="color:var(--ink-muted)">(بيع ${sold[p.id + '|' + s] || 0})</small></label>`; }).join('')}</div>
        <button class="ow-btn" style="margin-top:8px" data-a="savestock" data-id="${pid}">حفظ المخزون</button>`
            : `<p style="font-size:11px;color:var(--ink-muted);margin:6px 0">منتج بدون مقاسات — الحالة: <b>${p.status === 'out' ? 'نفد' : 'متاح'}</b></p><button class="ow-btn o" data-a="togstatus" data-id="${pid}">${p.status === 'out' ? 'تحويل إلى متاح' : 'تحويل إلى نفد'}</button>`}</div>`;
    }).join('');
}
async function saveStock(id) {
    const p = productsList.find(x => String(x.id) === id), ns = {};
    root.querySelectorAll(`[data-stk="${id}"]`).forEach(i => { if (i.value.trim() !== '') ns[i.dataset.size] = Math.max(0, parseInt(i.value, 10) || 0); });
    const { error } = await db().from('products').update({ stock: ns }).eq('id', p.id);
    if (error) return note('تعذر الحفظ: ' + error.message);
    p.stock = ns; note('تم حفظ المخزون'); render();
}
async function togStatus(id) {
    const p = productsList.find(x => String(x.id) === id), st = p.status === 'out' ? 'available' : 'out';
    const { error } = await db().from('products').update({ status: st }).eq('id', p.id);
    if (error) return note('تعذر الحفظ: ' + error.message); p.status = st; render();
}

/* ---------- الخصومات ---------- */
function diHTML() {
    const disc = productsList.filter(p => Number(p.old_price) > Number(p.price));
    return `<div class="ow-h" style="margin-top:0">قواعد الخصم على السلة</div><div class="ow-card" style="display:grid;gap:10px">
    <label style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700"><input type="checkbox" id="ow-b-on" ${S.bundle_on ? 'checked' : ''}> خصم على كل قطعة إضافية في الطلب</label>
    <label style="font-size:12px;font-weight:700">قيمة الخصم لكل قطعة إضافية (ج.م)<input id="ow-b-per" type="number" min="0" class="ow-in" value="${+S.bundle_per || 0}"></label>
    <label style="font-size:12px;font-weight:700">خصم عام على كل الطلبات (%) — 0 لإيقافه<input id="ow-s-pct" type="number" min="0" max="90" class="ow-in" value="${+S.site_pct || 0}"></label></div>
    <div class="ow-h">أكواد الخصم</div><div class="ow-card">
    ${arr(S.coupons).map((c, k) => `<div class="ow-row" style="align-items:center"><span><b dir="ltr">${esc(c.code)}</b> — ${c.type === 'pct' ? c.value + '%' : c.value + ' ج.م'}</span><span style="display:flex;gap:6px"><button class="ow-btn o" data-a="cptog" data-id="${k}">${c.active ? 'إيقاف' : 'تفعيل'}</button><button class="ow-btn r" data-a="cpdel" data-id="${k}">حذف</button></span></div>`).join('') || '<p style="font-size:12px;color:var(--ink-muted)">لا توجد أكواد.</p>'}
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:6px;margin-top:10px"><input id="ow-c-code" dir="ltr" placeholder="الكود" class="ow-in" style="text-transform:uppercase"><select id="ow-c-type" class="ow-in"><option value="pct">نسبة %</option><option value="fix">مبلغ ج.م</option></select><input id="ow-c-val" type="number" min="1" placeholder="القيمة" class="ow-in"><button class="ow-btn" data-a="cpadd">إضافة</button></div></div>
    <button class="ow-btn" style="width:100%;margin-top:12px;padding:12px" data-a="savesettings">حفظ قواعد الخصم</button>
    <div class="ow-h">خصم سريع على منتج</div><div class="ow-card"><div style="display:grid;grid-template-columns:2fr 1fr auto;gap:6px"><select id="ow-p-sel" class="ow-in">${productsList.map(p => `<option value="${esc(p.id)}">${esc(p.title)} — ${fmt(p.old_price > p.price ? p.old_price : p.price)} ج.م</option>`).join('')}</select><input id="ow-p-pct" type="number" min="1" max="90" placeholder="%" class="ow-in"><button class="ow-btn" data-a="pdisc">تطبيق</button></div>
    ${disc.length ? '<div style="margin-top:10px">' + disc.map(p => `<div class="ow-row" style="align-items:center"><span>${esc(p.title)}<br><small style="color:var(--ink-muted)">${fmt(p.old_price)} ← ${fmt(p.price)} ج.م (${Math.round((1 - p.price / p.old_price) * 100)}%)</small></span><button class="ow-btn r" data-a="pundo" data-id="${esc(p.id)}">إلغاء الخصم</button></div>`).join('') + '</div>' : ''}</div>`;
}
function readDisc() {
    if (!$('ow-b-on')) return;
    S.bundle_on = $('ow-b-on').checked; S.bundle_per = Math.max(0, +$('ow-b-per').value || 0); S.site_pct = Math.min(90, Math.max(0, +$('ow-s-pct').value || 0));
}
async function saveSettings(msg = true) {
    readDisc();
    const { error } = await db().from('settings').upsert({ key: 'store', value: S, updated_at: new Date().toISOString() });
    if (error) return note('تعذر الحفظ: ' + error.message);
    if (msg) note('تم حفظ قواعد الخصم وتطبيقها على الموقع'); try { updateCartUI(); } catch (e) { }
}
async function productDisc(id, pct) {
    const p = productsList.find(x => String(x.id) === id); if (!p) return;
    const base = Number(p.old_price) > Number(p.price) ? Number(p.old_price) : Number(p.price);
    const upd = pct ? { price: Math.round(base * (1 - pct / 100)), old_price: base } : { price: base, old_price: null };
    const { error } = await db().from('products').update(upd).eq('id', p.id);
    if (error) return note('تعذر الحفظ: ' + error.message);
    Object.assign(p, upd); note(pct ? 'تم تطبيق الخصم على المنتج' : 'تم إلغاء الخصم'); try { renderProducts(); } catch (e) { } render();
}

/* ---------- الأحداث ---------- */
root.addEventListener('change', e => {
    const f = e.target.dataset.f; if (f === 'per') { per = e.target.value; render(); }
});
root.addEventListener('click', e => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    const a = b.dataset.a, id = b.dataset.id, v = b.dataset.v;
    if (a === 'tab') { readDisc(); tab = v; render(); }
    else if (a === 'close') logout();
    else if (a === 'login') doLogin();
    else if (a === 'refresh') refresh();
    else if (a === 'ofil') { ofil = v; render(); }
    else if (a === 'status') setStatus(id, v);
    else if (a === 'xdisc') extraDisc(id);
    else if (a === 'savestock') saveStock(id);
    else if (a === 'togstatus') togStatus(id);
    else if (a === 'savesettings') saveSettings();
    else if (a === 'cptog') { readDisc(); S.coupons[+id].active = !S.coupons[+id].active; render(); }
    else if (a === 'cpdel') { readDisc(); S.coupons.splice(+id, 1); render(); }
    else if (a === 'cpadd') {
        readDisc(); const code = $('ow-c-code').value.trim().toUpperCase(), val = +$('ow-c-val').value, type = $('ow-c-type').value;
        if (!code || !(val > 0) || (type === 'pct' && val > 90)) return note('أدخلي كود وقيمة صحيحة');
        if (arr(S.coupons).some(c => c.code === code)) return note('الكود موجود بالفعل');
        S.coupons = arr(S.coupons).concat([{ code, type, value: val, active: true }]); render();
    }
    else if (a === 'pdisc') { const p = +$('ow-p-pct').value; if (!(p > 0 && p <= 90)) return note('أدخلي نسبة من 1 إلى 90'); productDisc($('ow-p-sel').value, p); }
    else if (a === 'pundo') productDisc(id, 0);
});

/* ---------- نقطة الدخول: #owner أو Ctrl+Shift+O ---------- */
const openOwner = () => { if (root.style.display !== 'block') showLogin(); };
if (location.hash === '#owner') openOwner();
window.addEventListener('hashchange', () => { if (location.hash === '#owner') openOwner(); });
document.addEventListener('keydown', e => { if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'o') { e.preventDefault(); openOwner(); } });

mountCoupon(); loadSettings();
})();
