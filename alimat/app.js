(function () {
const WB = window.WB, SUBMIT = window.SUBMIT || [];
const L = ['الف', 'ب', 'ج', 'د'];
const KEY = 'nmd-wb-alimat';
let st = {};
try { st = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { st = {}; }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]).replace(/\x22/g, '&quot;').replace(/'/g, '&#39;');
const fmt = s => esc(s).replace(/«([^»]*[ً-ْ][^»]*)»/g, '«<span class=ar>$1</span>»');
const $ = id => document.getElementById(id);
[['nm', 'name'], ['inst', 'inst'], ['ph', 'phone']].forEach(([id, k]) => {
  const el = $(id); el.value = st[k] || '';
  el.addEventListener('input', () => { st[k] = el.value; save(); });
});

function stats(i) {
  let total = 0, answered = 0, right = 0, mcq = 0;
  WB[i].items.forEach((it, k) => {
    const v = (st[i] || {})[k];
    if (it.t === 'mcq') { total++; mcq++; if (v !== undefined) { answered++; if (v === it.a) right++; } }
    if (it.t === 'para') { total++; if (v && v.trim()) answered++; }
  });
  return { total, answered, right, mcq };
}
function tabs(cur) {
  $('tabs').innerHTML = WB.map((s, i) =>
    `<a href='#s${i + 1}' class='${i === cur ? 'on' : ''}'>${esc(s.short)}${st['sent' + i] ? ' <span class=d>✓</span>' : ''}</a>`).join('');
}
function render(i) {
  const s = WB[i]; st[i] = st[i] || {};
  let n = 0;
  let h = `<section class='band unit'><p>${esc(s.kick || s.short.split(' · ')[0])}</p><h2>${esc(s.title)}</h2></section>`;
  s.items.forEach((it, k) => {
    if (it.t === 'h') { h += `<h3 class='part'>${esc(it.title)}</h3>` + (it.d ? `<p class='hint'>${fmt(it.d)}</p>` : ''); return; }
    if (it.t === 'case') { h += `<h3 class='part'>${esc(it.title)}</h3><div class='band case'>${fmt(it.d)}</div>`; return; }
    n++;
    const v = st[i][k];
    if (it.t === 'mcq') {
      const done = v !== undefined;
      h += `<div class='q'><p class='t'><span class='n'>${n}</span>${fmt(it.q)}</p><div class='opts'>` +
        it.o.map((o, j) => {
          let c = 'opt';
          if (done && j === it.a) c += ' right'; else if (done && j === v) c += ' wrong';
          return `<button class='${c}' data-k='${k}' data-j='${j}' ${done ? 'disabled' : ''}>${L[j]}) ${fmt(o)}</button>`;
        }).join('') + '</div>' +
        (done ? `<p class='fb'><b>${v === it.a ? 'درست ✓' : 'درست جواب: ' + L[it.a]}</b> · ${fmt(it.fb)}</p>` : '') + '</div>';
      return;
    }
    const cls = it.t === 'private' ? ' private' : it.t === 'task' ? ' task' : '';
    const tag = it.t === 'task' ? `<span class='tag'>اختیاری</span>` : '';
    h += `<div class='q${cls}'><p class='t'><span class='n'>${n}</span>${fmt(it.q)}${tag}</p>` +
      (it.h ? `<p class='hint'>${fmt(it.h)}</p>` : '') +
      `<textarea data-k='${k}' aria-label='جواب'>${esc(v || '')}</textarea>`;
    if (it.t === 'para') h += st[i]['show' + k] ? `<p class='fb'><b>نمونہ جواب:</b> ${fmt(it.fb)}</p>` : `<button class='btn' data-show='${k}'>نمونہ جواب دیکھیں</button>`;
    h += '</div>';
  });
  const x = stats(i);
  if (x.mcq) h += `<section class='band score'><span class='big'>${x.right}/${x.mcq}</span><span>کثیر الانتخابی سوالوں میں درست جوابات<br><span class='done'>مکمل: ${x.answered} از ${x.total}</span></span></section>`;
  h += `<div class='band'><p style='margin:0'>سب لازمی سوال حل ہو جائیں تو جوابات جمع کرائیں۔ یہ سیدھے تربیت کار کے پاس پہنچ جائیں گے۔ «اپنا جائزہ» والا جواب جمع نہیں ہوگا۔</p>
  <button class='btn fill' id='send'>جوابات جمع کرائیں</button> <button class='btn' id='cp'>جوابات کاپی کریں</button>
  <p class='done' id='msg' role='status'>${st['sent' + i] ? 'یہ حصہ ایک بار جمع ہو چکا ہے۔ دوبارہ جمع کرانے سے نیا جواب الگ درج ہوگا۔' : ''}</p></div>`;
  $('main').innerHTML = h;
  tabs(i);
}
function message(i) {
  const s = WB[i], x = stats(i), a = st[i] || {};
  let m = `*نبوی منہج دعوت · عالمات · ${s.short}*\nنام: ${st.name || '—'}\nادارہ: ${st.inst || '—'}\n` + (x.mcq ? `کثیر الانتخابی: ${x.right}/${x.mcq}\n` : '');
  let n = 0;
  s.items.forEach((it, k) => {
    if (it.t === 'h' || it.t === 'case') return; n++;
    if (it.t === 'para' || it.t === 'task') m += `\n${n}۔ ${it.q}\n${(a[k] || '—').trim()}\n`;
  });
  return m;
}
async function send(i) {
  const msg = $('msg'), s = WB[i], sub = SUBMIT[i], a = st[i] || {};
  const missing = [];
  if (!(st.name || '').trim()) missing.push('نام');
  let n = 0;
  s.items.forEach((it, k) => {
    if (it.t === 'h' || it.t === 'case') return; n++;
    if (it.t === 'mcq' && a[k] === undefined) missing.push('سوال ' + n);
    if (it.t === 'para' && !(a[k] || '').trim()) missing.push('سوال ' + n);
  });
  if (missing.length) { msg.textContent = 'ابھی یہ باقی ہیں: ' + missing.join('، '); return; }
  if (!sub) { msg.textContent = 'جمع کرانے کا نظام ابھی تیار نہیں؛ فی الحال «جوابات کاپی کریں» سے بھیج دیں۔'; return; }
  const body = new URLSearchParams();
  body.append('entry.' + sub.e[0], st.name.trim());
  body.append('entry.' + sub.e[1], (st.inst || '').trim());
  body.append('entry.' + sub.e[2], (st.phone || '').trim());
  let j = 3;
  s.items.forEach((it, k) => {
    if (it.t === 'mcq') body.append('entry.' + sub.e[j++], it.o[a[k]]);
    else if (it.t === 'para' || it.t === 'task') body.append('entry.' + sub.e[j++], (a[k] || '').trim());
  });
  const b = $('send'); b.disabled = true; msg.textContent = 'بھیجا جا رہا ہے…';
  try {
    await fetch('https://docs.google.com/forms/d/e/' + sub.id + '/formResponse', { method: 'POST', mode: 'no-cors', body });
    st['sent' + i] = 1; save();
    msg.textContent = 'جزاکم اللہ خیرا۔ آپ کے جوابات جمع ہو گئے۔';
    tabs(i);
  } catch (e) {
    msg.textContent = 'انٹرنیٹ کا مسئلہ ہے؛ تھوڑی دیر بعد دوبارہ کوشش کریں۔';
  }
  b.disabled = false;
}
let cur = 0;
function route() {
  const m = /^#s([1-9])$/.exec(location.hash);
  cur = m && +m[1] <= WB.length ? +m[1] - 1 : 0;
  render(cur); window.scrollTo(0, 0);
}
const keep = f => { const y = window.scrollY; f(); window.scrollTo(0, y); };
$('main').addEventListener('click', e => {
  const b = e.target.closest('.opt');
  if (b) { st[cur][b.dataset.k] = +b.dataset.j; save(); keep(() => render(cur)); return; }
  const sh = e.target.closest('[data-show]');
  if (sh) { st[cur]['show' + sh.dataset.show] = 1; save(); keep(() => render(cur)); return; }
  if (e.target.id === 'send') { send(cur); return; }
  if (e.target.id === 'cp') navigator.clipboard.writeText(message(cur)).then(() => { $('msg').textContent = 'کاپی ہو گیا'; }, () => { $('msg').textContent = 'کاپی نہیں ہو سکا'; });
});
$('main').addEventListener('input', e => { if (e.target.tagName === 'TEXTAREA') { st[cur][e.target.dataset.k] = e.target.value; save(); } });
window.addEventListener('hashchange', route);
route();
})();
