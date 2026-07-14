/* ====== ZOOM RENT A CAR — Sözleşme uygulaması ====== */
/* SURUM=v19 */
const API_BASE="api/";
const FALLBACK_USER="ayoup", FALLBACK_PASS="zoom2026*";
const DEFAULTS={ ad:"Ayoup Almousa", unvan:"ZOOM RENT A CAR",
  adres:"Cebeci, 2470. Sk. No:36, 34270 Sultangazi/İstanbul", tel:"", email:"", vergi:"1234567890",
  dailyKm:"150", excess:"15", court:"İstanbul", yer:"İstanbul", ownerSig:"", logo:"", cars:[] };
let SETTINGS={...DEFAULTS};

/* Varsayılan logo — dış dosya yerine gömülü (data-URI) ki PDF canvas'ı "kirlenmesin" */
const LOGO_SVG=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 320" width="760" height="320"><defs><linearGradient id="ch" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#3a3f47"/><stop offset="45%" stop-color="#0c0d10"/><stop offset="55%" stop-color="#0c0d10"/><stop offset="100%" stop-color="#6e757e"/></linearGradient></defs><g font-family="Arial Black, Arial, sans-serif" text-anchor="middle"><text x="380" y="165" font-size="175" font-weight="900" letter-spacing="4" fill="url(#ch)" stroke="#9aa2ad" stroke-width="2">ZOOM</text><text x="380" y="262" font-size="74" font-weight="900" letter-spacing="8" fill="url(#ch)" stroke="#9aa2ad" stroke-width="1.5">RENT A CAR</text></g></svg>`;
const LOGO_DEFAULT='data:image/svg+xml;base64,'+btoa(LOGO_SVG);
const logoSrc = () => (SETTINGS.logo&&SETTINGS.logo.indexOf('data:')===0) ? SETTINGS.logo : LOGO_DEFAULT;
const COUNTRIES=["Türkiye","Suriye","Irak","İran","Afganistan","Pakistan","Filistin","Ürdün","Lübnan","Mısır","Libya","Tunus","Fas","Cezayir","Sudan","Somali","Yemen","Suudi Arabistan","Katar","BAE","Kuveyt","Azerbaycan","Gürcistan","Ermenistan","Kazakistan","Özbekistan","Türkmenistan","Rusya","Ukrayna","Almanya","Fransa","İngiltere","Hollanda","Belçika","İtalya","İspanya","İsveç","Avusturya","İsviçre","ABD","Kanada","Çin","Hindistan","Bangladeş","Nijerya","Diğer"];

let stepIdx=0; const STEPS=4;
let sigPad=null, sig2Pad=null, ownerSigPad=null;
let lastPdf=null, CONTRACTS=[], editIdx=-1, editCtx=null, r2on=false;
const PHOTOS={a:[],b:[]};
const data={};

/* ====== GİRİŞ ====== */
async function checkAuth(){
  try{ const r=await fetch(API_BASE+'me.php',{credentials:'same-origin'}); if(r.ok){ const j=await r.json(); if(j.auth){ enterApp(); return; } } }catch(_){}
  document.getElementById('login').classList.remove('hidden');
}
async function doLogin(){
  const u=document.getElementById('lgUser').value.trim(), p=document.getElementById('lgPass').value, err=document.getElementById('lgErr'); err.textContent='';
  try{ const r=await fetch(API_BASE+'login.php',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({user:u,pass:p})});
    if(r.ok){ const j=await r.json(); if(j.ok){ enterApp(); return; } err.textContent='Kullanıcı adı veya şifre hatalı'; return; } throw 0;
  }catch(_){ if(u===FALLBACK_USER&&p===FALLBACK_PASS) enterApp(); else err.textContent='Kullanıcı adı veya şifre hatalı'; }
}
function enterApp(){
  document.getElementById('login').classList.add('hidden');
  document.getElementById('appRoot').classList.remove('hidden');
  document.getElementById('r1').innerHTML=renterForm('a');
  document.getElementById('r2').innerHTML=renterForm('b');
  initRenter('a'); initRenter('b');
  initDateTime(); renderProgress(); loadSettings().then(()=>{ initCars(); applyLogo(); });
}
function applyLogo(){ document.querySelectorAll('img.logo').forEach(i=>i.src=logoSrc()); }
async function doLogout(){ try{ await fetch(API_BASE+'logout.php',{credentials:'same-origin'}); }catch(_){} location.reload(); }

/* ====== SEKMELER ====== */
document.querySelectorAll('.tab').forEach(t=>{ t.onclick=()=>{
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
  t.classList.add('active'); document.getElementById('view-'+t.dataset.view).classList.add('active');
  if(t.dataset.view==='list') loadList();
  if(t.dataset.view==='settings') openSettings();
  if(t.dataset.view==='cars'){ renderCars(); }
};});

/* ====== ADIMLAR ====== */
function renderProgress(){ const p=document.getElementById('progress'); if(!p) return; p.innerHTML='';
  for(let i=0;i<STEPS;i++){ const s=document.createElement('span'); if(i<=stepIdx&&stepIdx<STEPS) s.classList.add('on'); p.appendChild(s); } }
function showStep(i){ stepIdx=i;
  document.querySelectorAll('.step').forEach(s=>s.classList.remove('active'));
  document.querySelector('.step[data-step="'+i+'"]').classList.add('active'); renderProgress(); window.scrollTo({top:0,behavior:'smooth'}); }
function next(){ if(validate(stepIdx)) showStep(stepIdx+1); }
function prev(){ showStep(stepIdx-1); }
const gv = id => { const e=document.getElementById(id); return e?e.value.trim():''; };

function validate(i){
  if(i===0){
    data.car={ plaka:gv('plaka'), model:gv('model'), yil:gv('yil') };
    data.teslimKm=gv('teslimKm'); data.alis=gv('alis'); data.iade=gv('iade'); data.yer=gv('yer')||SETTINGS.yer;
    if(!data.car.plaka||!data.car.model){ toast('Plaka ve model girin'); return false; }
    if(!data.alis||!data.iade){ toast('Alış ve iade tarihini girin'); return false; }
  }
  if(i===1){
    const a=gather('a'); if(!a) return false;
    data.renters=[a];
    if(r2on){ const b=gather('b'); if(!b) return false; data.renters.push(b); }
  }
  return true;
}
function gather(p){
  const tr=isTRr(p);
  const sel=gv(p+'_ulke'); const ulke = sel==='Diğer' ? (gv(p+'_ulkeManual')||'Diğer') : sel;
  const o={ ulke:ulke, ad:gv(p+'_ad'), soyad:gv(p+'_soyad'), dogum:gv(p+'_dogum'),
    kimlikTipi:tr?'TC':'Pasaport', kimlikNo:tr?gv(p+'_tc'):gv(p+'_pasaport'),
    baba:gv(p+'_baba'), anne:gv(p+'_anne'), tel:gv(p+'_tel'), email:gv(p+'_email'),
    photos:PHOTOS[p].slice(), sig:'' };
  if(!o.ad||!o.soyad){ toast((p==='b'?'2. Kiracı: ':'')+'Ad ve soyad girin'); return null; }
  if(!o.dogum){ toast((p==='b'?'2. Kiracı: ':'')+'Doğum tarihi girin'); return null; }
  if(tr){ if(!/^\d{11}$/.test(o.kimlikNo)){ toast((p==='b'?'2. Kiracı: ':'')+'Kimlik No 11 hane olmalı'); return null; } }
  else{ if(!o.kimlikNo){ toast((p==='b'?'2. Kiracı: ':'')+'Pasaport no girin'); return null; } }
  return o;
}

/* ====== KİRACI FORMU ====== */
function renterForm(p){
  return `
  <label>Uyruk / Ülke</label><select id="${p}_ulke" onchange="onCountry('${p}')"></select>
  <input id="${p}_ulkeManual" class="hidden" placeholder="Ülke adını yazın" style="margin-top:8px" oninput="noDigits(event)">
  <label>Belge Fotoğrafı <span class="opt">(en fazla 4 — birden fazla seçebilirsiniz)</span></label>
  <button class="btn btn-ghost btn-sm" style="margin-top:0" onclick="document.getElementById('${p}_file').click()">📷 Fotoğraf ekle</button>
  <input id="${p}_file" type="file" accept="image/*" multiple style="display:none" onchange="onPhoto('${p}',event)">
  <div class="photos" id="${p}_photos"></div>
  <div class="ocr-status" id="${p}_ocr"><div class="spinner"></div><span>Okunuyor…</span></div>
  <label>Adı</label><input id="${p}_ad" oninput="noDigits(event)">
  <label>Soyadı</label><input id="${p}_soyad" oninput="noDigits(event)">
  <label>Doğum Tarihi</label><input id="${p}_dogum" type="date">
  <div id="${p}_tcB"><label>T.C. / Kimlik No</label><input id="${p}_tc" inputmode="numeric" maxlength="11" oninput="onlyDigits(event,11)"></div>
  <div id="${p}_fB" class="hidden">
    <label>Pasaport No</label><input id="${p}_pasaport">
    <label>Baba Adı <span class="opt">(opsiyonel)</span></label><input id="${p}_baba" oninput="noDigits(event)">
    <label>Anne Adı <span class="opt">(opsiyonel)</span></label><input id="${p}_anne" oninput="noDigits(event)">
  </div>
  <label>Telefon</label><input id="${p}_tel" inputmode="tel" placeholder="05XX XXX XX XX" oninput="fmtPhone(event)">
  <label>E-posta <span class="opt">(opsiyonel)</span></label><input id="${p}_email" inputmode="email">`;
}
function initRenter(p){ const s=document.getElementById(p+'_ulke'); s.innerHTML='';
  COUNTRIES.forEach(c=>{ const o=document.createElement('option'); o.value=o.textContent=c; s.appendChild(o); });
  s.value='Türkiye'; onCountry(p); }
const isTRr = p => document.getElementById(p+'_ulke').value==='Türkiye';
function onCountry(p){ const v=document.getElementById(p+'_ulke').value, tr=v==='Türkiye';
  document.getElementById(p+'_tcB').classList.toggle('hidden',!tr);
  document.getElementById(p+'_fB').classList.toggle('hidden',tr);
  document.getElementById(p+'_ulkeManual').classList.toggle('hidden', v!=='Diğer'); }
function toggleR2(on){ r2on=on; document.getElementById('r2box').classList.toggle('hidden',!on);
  document.getElementById('addR2').classList.toggle('hidden',on); }

/* ====== FOTO ====== */
function compress(dataUrl,maxW){ return new Promise(res=>{ const im=new Image();
  im.onload=()=>{ const sc=Math.min(maxW/im.width,1); const w=Math.round(im.width*sc),h=Math.round(im.height*sc);
    const c=document.createElement('canvas'); c.width=w; c.height=h; c.getContext('2d').drawImage(im,0,0,w,h);
    res(c.toDataURL('image/jpeg',0.62)); }; im.onerror=()=>res(dataUrl); im.src=dataUrl; }); }
function readFile(f){ return new Promise(res=>{ const rd=new FileReader(); rd.onload=ev=>res(ev.target.result); rd.onerror=()=>res(null); rd.readAsDataURL(f); }); }
async function onPhotoMulti(p,files){
  for(const f of files){
    if(PHOTOS[p].length>=4){ toast('En fazla 4 fotoğraf'); break; }
    const full=await readFile(f); if(!full) continue; const small=await compress(full,950);
    PHOTOS[p].push(small); renderPhotos(p);
    if(isTRr(p) && PHOTOS[p].length===1) runOCR(full,p);
  }
}
function onPhoto(p,e){ const files=[...e.target.files]; if(!files.length) return;
  onPhotoMulti(p,files).then(()=>{ e.target.value=''; }); }
function removePhotoAt(p,idx){ PHOTOS[p].splice(idx,1); renderPhotos(p); }
function renderPhotos(p){ const box=document.getElementById(p+'_photos');
  box.innerHTML=PHOTOS[p].map((src,i)=>`<div class="ph"><img src="${src}"><div class="x" onclick="removePhotoAt('${p}',${i})">×</div></div>`).join(''); }

/* ====== OCR ====== */
function preprocess(dataUrl){ return new Promise(res=>{ const im=new Image();
  im.onload=()=>{ const sc=Math.min(1700/im.width,2.5); const w=Math.round(im.width*sc),h=Math.round(im.height*sc);
    const c=document.createElement('canvas'); c.width=w; c.height=h; const x=c.getContext('2d'); x.drawImage(im,0,0,w,h);
    try{ const d=x.getImageData(0,0,w,h),a=d.data; for(let i=0;i<a.length;i+=4){ let g=0.3*a[i]+0.59*a[i+1]+0.11*a[i+2]; g=(g-128)*1.35+128; g=g>165?255:(g<95?Math.max(0,g-20):g); a[i]=a[i+1]=a[i+2]=g; } x.putImageData(d,0,0); }catch(_){}
    res(c.toDataURL('image/png')); }; im.onerror=()=>res(dataUrl); im.src=dataUrl; }); }
async function runOCR(dataUrl,p){
  const st=document.getElementById(p+'_ocr'); st.style.display='flex'; st.querySelector('span').textContent='Okunuyor… (birkaç saniye)';
  try{ const proc=await preprocess(dataUrl);
    const r1=await Tesseract.recognize(proc,'tur+eng',{tessedit_pageseg_mode:6});
    let dg=''; try{ const r2=await Tesseract.recognize(proc,'eng',{tessedit_pageseg_mode:6,tessedit_char_whitelist:'0123456789 .'}); dg=r2.data.text; }catch(_){}
    fillFromOCR(r1.data.text,dg,p); st.querySelector('span').textContent='Okundu — kontrol edin'; setTimeout(()=>st.style.display='none',1800);
  }catch(_){ st.querySelector('span').textContent='Okunamadı, elle girin'; setTimeout(()=>st.style.display='none',1800); } }
function cleanName(s){ if(!s) return '';
  return s.replace(/[^A-Za-zÇĞİıÖŞÜçğöşü ]/g,' ').trim().split(/\s+/).filter(w=>w.length>=2).slice(0,2).map(w=>w[0].toUpperCase()+w.slice(1).toLowerCase()).join(' '); }
function fillFromOCR(text,digitsText,p){
  const raw=text||''; const setv=(id,v)=>{ const e=document.getElementById(id); if(e&&!e.value.trim()) e.value=v; };
  let tc=''; let m=(digitsText||'').replace(/\s/g,'').match(/(\d{11})/); if(m) tc=m[1];
  if(!tc){ m=raw.replace(/\s/g,'').match(/(\d{11})/); if(m) tc=m[1]; }
  if(tc) setv(p+'_tc',tc);
  const lines=raw.split('\n').map(l=>l.trim()).filter(Boolean);
  const NAME='([A-Za-zÇĞİıÖŞÜçğöşü]{2,}(?:\\s[A-Za-zÇĞİıÖŞÜçğöşü]{2,})?)';
  let soyad='',ad='';
  for(const l of lines){ let mm=l.match(new RegExp('(?:^|\\b)1[\\.\\,\\):\\s]+\\s*'+NAME)); if(mm&&!soyad) soyad=mm[1];
    mm=l.match(new RegExp('(?:^|\\b)2[\\.\\,\\):\\s]+\\s*'+NAME)); if(mm&&!ad) ad=mm[1]; }
  if(!soyad){ for(const l of lines){ const mm=l.match(new RegExp('soyad[ıi]?\\s*[:\\/]?\\s*(?:surname)?\\s*[:\\/]?\\s*'+NAME,'i')); if(mm){ soyad=mm[1]; break; } } }
  if(!ad){ for(const l of lines){ if(/soyad/i.test(l)) continue; const mm=l.match(new RegExp('ad[ıi]\\s*[:\\/]?\\s*(?:given names?|name)?\\s*[:\\/]?\\s*'+NAME,'i')); if(mm){ ad=mm[1]; break; } } }
  ad=cleanName(ad); soyad=cleanName(soyad); if(ad) setv(p+'_ad',ad); if(soyad) setv(p+'_soyad',soyad);
  const curY=new Date().getFullYear(); let births=[];
  for(const l of lines){ const f3=l.match(/(?:^|\b)3[\.\,\)\s]+.*?(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/); if(f3) births.unshift([+f3[3],+f3[2],+f3[1]]); }
  (raw.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/g)||[]).forEach(s=>{ const q=s.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/); const y=+q[3]; if(y>=1920&&y<=curY-15) births.push([y,+q[2],+q[1]]); });
  if(births.length){ births.sort((a,b)=>a[0]-b[0]); const b=births[0]; if(b[1]>=1&&b[1]<=12&&b[2]>=1&&b[2]<=31) setv(p+'_dogum',`${b[0]}-${pad2(b[1])}-${pad2(b[2])}`); }
}

/* ====== ARAÇ FİLOSU ====== */
function initCars(){ const s=document.getElementById('carSelect');
  if(s){ const cars=SETTINGS.cars||[]; const cur=s.value;
    s.innerHTML='<option value="">— Araç seçin / yeni plaka —</option>'+cars.map((c,i)=>`<option value="${i}">${esc(c.plaka)} — ${esc(c.model)}${c.yil?' ('+esc(c.yil)+')':''}</option>`).join('');
    if(cur) s.value=cur; }
  renderCars(); }
function onCarSelect(){ const s=document.getElementById('carSelect'); if(s.value===''){ return; }
  const c=(SETTINGS.cars||[])[+s.value]; if(c){ document.getElementById('plaka').value=c.plaka||''; document.getElementById('model').value=c.model||''; document.getElementById('yil').value=c.yil||''; } }
function renderCars(){ const box=document.getElementById('carList'); if(!box) return;
  const cars=SETTINGS.cars||[];
  box.innerHTML=cars.length?cars.map((c,i)=>`<div class="carrow"><b>${esc(c.plaka)} — ${esc(c.model)} (${esc(c.yil||'-')})</b><span class="x" onclick="removeCar(${i})">Sil</span></div>`).join(''):'<div class="empty" style="padding:20px">Henüz araç yok.</div>'; }
async function addCar(){ const plaka=gv('cPlaka').toUpperCase(), model=gv('cModel'), yil=gv('cYil');
  if(!plaka||!model){ toast('Plaka ve model girin'); return; }
  SETTINGS.cars=SETTINGS.cars||[]; const i=SETTINGS.cars.findIndex(c=>norm(c.plaka)===norm(plaka));
  if(i>=0) SETTINGS.cars[i]={plaka,model,yil}; else SETTINGS.cars.push({plaka,model,yil});
  await persistSettings(); document.getElementById('cPlaka').value=''; document.getElementById('cModel').value=''; document.getElementById('cYil').value='';
  initCars(); toast('Araç kaydedildi'); }
async function removeCar(i){ SETTINGS.cars.splice(i,1); await persistSettings(); initCars(); }
const norm = s => (s||'').replace(/\s/g,'').toUpperCase();
function onPlaka(){ const v=norm(gv('plaka')); const c=(SETTINGS.cars||[]).find(x=>norm(x.plaka)===v);
  if(c){ document.getElementById('model').value=c.model||''; document.getElementById('yil').value=c.yil||''; } }

/* ====== TARİH ====== */
function pad2(n){ return String(n).padStart(2,'0'); }
function nowLocal(off){ const d=new Date(Date.now()+(off||0)*864e5); return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`; }
function initDateTime(){
  if(!gv('alis')) document.getElementById('alis').value=nowLocal(0);
  if(!gv('iade')) document.getElementById('iade').value=nowLocal(1);
  if(!gv('yer')) document.getElementById('yer').value=SETTINGS.yer||'İstanbul';
}
function localDate(){ const d=new Date(); return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }
function localTime(){ const d=new Date(); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; }

/* ====== ÖNİZLEME / CTX ====== */
function goPreview(){ if(!validate(1)) return; data.tarih=localDate(); data.saat=localTime(); data.no=data.no||genNo(); buildDoc(); showStep(2); }
function genNo(){ const d=new Date(); return `ZM-${d.getFullYear()}${pad2(d.getMonth()+1)}${pad2(d.getDate())}-${Math.floor(1000+Math.random()*9000)}`; }
function curCtx(){ return { no:data.no, yer:data.yer, tarih:data.tarih, saat:data.saat, alis:data.alis, iade:data.iade,
  teslimKm:data.teslimKm, iadeKm:data.iadeKm||'', car:{...data.car}, renters:JSON.parse(JSON.stringify(data.renters||[])),
  company:{...SETTINGS}, cfg:{ dailyKm:SETTINGS.dailyKm, excess:SETTINGS.excess, court:SETTINGS.court } }; }
function buildDoc(){ document.getElementById('doc').innerHTML=buildDocTR(curCtx()); }
/* Önizleme + istemci yedeği: TAMAMEN TÜRKÇE (Arapça yok → hiç bozulmaz).
   Tam çift dilli sürüm sunucudaki mPDF'te üretilir. */
function buildDocTR(c){
  const co=c.company||{}, cfg=c.cfg||{}, renters=c.renters||[];
  const party = renters.map((r,i)=>`
    <p style="font-weight:bold;margin:6px 0 2px">Kiracı ${i+1}</p>
    <table>
      <tr><td class="k">Ad Soyad</td><td>${esc(r.ad)} ${esc(r.soyad)}</td></tr>
      <tr><td class="k">Uyruk</td><td>${esc(r.ulke)}</td></tr>
      <tr><td class="k">${r.kimlikTipi==='Pasaport'?'Pasaport No':'T.C. / Kimlik No'}</td><td>${esc(r.kimlikNo)}</td></tr>
      <tr><td class="k">Doğum Tarihi</td><td>${fmtDate(r.dogum)}</td></tr>
      ${r.baba?`<tr><td class="k">Baba Adı</td><td>${esc(r.baba)}</td></tr>`:''}
      ${r.anne?`<tr><td class="k">Anne Adı</td><td>${esc(r.anne)}</td></tr>`:''}
      <tr><td class="k">Telefon</td><td>${esc(r.tel)}</td></tr>
    </table>`).join('');
  const sig = `<div class="sigbox"><div class="sigline">${co.ownerSig?`<img src="${co.ownerSig}" style="max-height:50px">`:''}</div><span>KİRALAYAN<br>${esc(co.unvan)}</span></div>`+
    renters.map((r,i)=>`<div class="sigbox"><div class="sigline">${r.sig?`<img src="${r.sig}" style="max-height:50px">`:''}</div><span>KİRACI ${i+1}<br>${esc(r.ad)} ${esc(r.soyad)}</span></div>`).join('');
  return `
  <div class="hd"><img class="dlogo" src="${logoSrc()}"><small>${esc(co.unvan)}${co.tel?' • Tel: '+esc(co.tel):''}${co.email?' • '+esc(co.email):''}</small></div>
  <h1>ARAÇ KİRALAMA SÖZLEŞMESİ</h1>
  <table><tr><td class="k">Sözleşme Yeri</td><td>${esc(c.yer)}</td></tr><tr><td class="k">Sözleşme No</td><td>${esc(c.no)}</td></tr></table>
  <h3>1. TARAFLAR</h3>
  <p style="font-weight:bold;margin:4px 0 2px">Kiralayan</p>
  <table>
    <tr><td class="k">Ünvan</td><td>${esc(co.unvan)}</td></tr>
    <tr><td class="k">Yetkili</td><td>${esc(co.ad)}</td></tr>
    <tr><td class="k">Adres</td><td>${esc(co.adres)}</td></tr>
    <tr><td class="k">Telefon</td><td>${esc(co.tel)}</td></tr>
    <tr><td class="k">Vergi No</td><td>${esc(co.vergi)}</td></tr>
  </table>
  ${party}
  <h3>2. ARAÇ BİLGİLERİ</h3>
  <table>
    <tr><td class="k">Plaka</td><td>${esc(c.car.plaka)}</td></tr>
    <tr><td class="k">Marka-Model</td><td>${esc(c.car.model)}</td></tr>
    <tr><td class="k">Model Yılı</td><td>${esc(c.car.yil)}</td></tr>
    <tr><td class="k">Teslim KM</td><td>${esc(c.teslimKm)||'—'}</td></tr>
    <tr><td class="k">İade KM</td><td>${esc(c.iadeKm)||'—'}</td></tr>
  </table>
  <h3>3. KİRALAMA SÜRESİ</h3>
  <table><tr><td class="k">Başlangıç</td><td>${fmtDT(c.alis)}</td></tr><tr><td class="k">Bitiş</td><td>${fmtDT(c.iade)}</td></tr></table>
  <p>Kiracı, aracı belirtilen bitiş tarihinde ve saatinde eksiksiz, hasarsız ve teslim aldığı durumla aynı şekilde iade etmekle yükümlüdür.</p>
  <h3>4. ÖDEME VE DEPOZİTO</h3>
  <p>Kiracı, kira bedelini ve varsa ek ücretleri zamanında ödemeyi kabul eder. Depozito; hasar, ceza, eksik yakıt, fazla kilometre, geç teslim veya üçüncü kişi talepleri yoksa araç iade edildikten sonra iade edilir.</p>
  <h3>5. GÜNLÜK KİLOMETRE SINIRI</h3>
  <p>Günlük kullanım sınırı ${esc(cfg.dailyKm)} KM'dir. Aşan her kilometre için ${esc(cfg.excess)} TL ödenir. Kullanılmayan kilometreler devredilmez.</p>
  <h3>6. SİGORTA: KASKO YOKTUR</h3>
  <p>Araçta KASKO yoktur, yalnızca Zorunlu Trafik Sigortası vardır. Sigortanın karşılamadığı her türlü zarardan kiracı sorumludur.</p>
  <h3>7. KİRACININ SORUMLULUĞU</h3>
  <p>Kiracı; araç, anahtar, ruhsat ve ekipmandan ve araçla ilgili tüm hukuki, cezai, idari, mali sonuçlardan sorumludur (kazalar, hasar, cezalar, OGS/HGS, çekici, değer kaybı, rücu bedelleri, üçüncü kişi talepleri dahil).</p>
  <h3>8. YASAK KULLANIMLAR</h3>
  <p>Yasak madde/silah taşımak, suç işlemek, alkollü/ehliyetsiz kullanmak, yarış/off-road/ticari taşımacılık, izinsiz İstanbul dışına çıkarmak, üçüncü kişiye kullandırmak yasaktır; aksi halde tüm sorumluluk kiracıya aittir.</p>
  <h3>9. KAZA/HASAR BİLDİRİMİ</h3>
  <p>Kaza/hasar/hırsızlık/el koyma halinde kiracı derhal haber verir, olay yerinden ayrılmaz, tutanak düzenletir, belgeleri teslim eder; aksi halde zararlar kiracıya aittir.</p>
  <h3>10. TESLİM VE İADE</h3>
  <p>Araç teslim durumuyla, aynı yerde iade edilir. Eksik yakıt/ekipman, anahtar/ruhsat kaybı veya geç iade bedelleri kiracıdan tahsil edilir.</p>
  <h3>11. CEZA ŞARTI</h3>
  <p>Kiracı şartlara aykırı davranır veya aracı iade etmezse, zararlar saklı kalmak üzere cezai şart öder.</p>
  <h3>12. YETKİLİ MAHKEME</h3>
  <p>Uyuşmazlıklarda ${esc(cfg.court)} Mahkemeleri ve İcra Daireleri yetkilidir; Türk Hukuku uygulanır.</p>
  <p style="font-size:9px;color:#555">Not: Bu Türkçe özettir. Tam çift dilli (Türkçe + Arapça) sözleşme ve belge fotoğrafları sunucudaki resmi PDF'te yer alır.</p>
  <h3>İMZA</h3>
  <div class="sigwrap">${sig}</div>
  <div class="meta">No: ${esc(c.no)}</div>`;
}
function fmtDate(s){ if(!s) return '—'; const p=String(s).split('-'); return p.length===3?`${p[2]}.${p[1]}.${p[0]}`:s; }
function fmtDT(s){ if(!s) return '—'; if(String(s).includes('T')){ const [d,t]=s.split('T'); return fmtDate(d)+' '+t.slice(0,5);} return s; }
const esc = s => (s==null?'':String(s)).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const asciiTr = s => (s==null?'':String(s)).replace(/[çğıİöşüÇĞÖŞÜ]/g,c=>({'ç':'c','ğ':'g','ı':'i','İ':'I','ö':'o','ş':'s','ü':'u','Ç':'C','Ğ':'G','Ö':'O','Ş':'S','Ü':'U'}[c]||c));

function buildDocHTML(c){
  const co=c.company||{}, cfg=c.cfg||{};
  const renters=c.renters||[];
  const partyRows = renters.map((r,i)=>`
    <p style="margin:6px 0 2px;color:#22304a">Kiracı ${i+1} / المستأجر ${i+1}</p>
    <table>
      <tr><td class="k">Ad Soyad / الاسم</td><td>${esc(r.ad)} ${esc(r.soyad)}</td></tr>
      <tr><td class="k">Uyruk / الجنسية</td><td>${esc(r.ulke)}</td></tr>
      <tr><td class="k">${r.kimlikTipi==='Pasaport'?'Pasaport No / جواز':'T.C./Kimlik No / الهوية'}</td><td>${esc(r.kimlikNo)}</td></tr>
      <tr><td class="k">Doğum / الميلاد</td><td>${fmtDate(r.dogum)}</td></tr>
      ${r.baba?`<tr><td class="k">Baba Adı / اسم الأب</td><td>${esc(r.baba)}</td></tr>`:''}
      ${r.anne?`<tr><td class="k">Anne Adı / اسم الأم</td><td>${esc(r.anne)}</td></tr>`:''}
      <tr><td class="k">Telefon / الهاتف</td><td>${esc(r.tel)}</td></tr>
    </table>`).join('');
  const sigBoxes = `
    <div class="sigbox"><div class="sigline">${co.ownerSig?`<img src="${co.ownerSig}" style="max-height:50px">`:''}</div><span>KİRALAYAN / المؤجّر<br>${esc(co.unvan)}</span></div>`+
    renters.map((r,i)=>`<div class="sigbox"><div class="sigline">${r.sig?`<img src="${r.sig}" style="max-height:50px">`:''}</div><span>KİRACI ${i+1} / المستأجر<br>${esc(r.ad)} ${esc(r.soyad)}</span></div>`).join('');
  return `
  <div class="hd"><img class="dlogo" src="${logoSrc()}">
    <small>${esc(co.unvan)}${co.tel?' • Tel: '+esc(co.tel):''}${co.email?' • '+esc(co.email):''}</small></div>
  <h1>ARAÇ KİRALAMA SÖZLEŞMESİ</h1><div class="ar">عقد إيجار سيارة</div>
  <table>
    <tr><td class="k">Sözleşme Yeri / المكان</td><td>${esc(c.yer)}</td></tr>
    <tr><td class="k">Sözleşme No</td><td>${esc(c.no)}</td></tr>
  </table>
  <h3>1. TARAFLAR / الأطراف</h3>
  <p style="margin:4px 0 2px;color:#22304a">Kiralayan / المؤجّر</p>
  <table>
    <tr><td class="k">Ünvan / الشركة</td><td>${esc(co.unvan)}</td></tr>
    <tr><td class="k">Yetkili / المسؤول</td><td>${esc(co.ad)}</td></tr>
    <tr><td class="k">Adres / العنوان</td><td>${esc(co.adres)}</td></tr>
    <tr><td class="k">Telefon / الهاتف</td><td>${esc(co.tel)}</td></tr>
    <tr><td class="k">Vergi No / الرقم الضريبي</td><td>${esc(co.vergi)}</td></tr>
  </table>
  ${partyRows}
  <h3>2. ARAÇ BİLGİLERİ / معلومات السيارة</h3>
  <table>
    <tr><td class="k">Plaka / اللوحة</td><td>${esc(c.car.plaka)}</td></tr>
    <tr><td class="k">Marka-Model / الموديل</td><td>${esc(c.car.model)}</td></tr>
    <tr><td class="k">Model Yılı / سنة الصنع</td><td>${esc(c.car.yil)}</td></tr>
    <tr><td class="k">Teslim KM / عداد التسليم</td><td>${esc(c.teslimKm)||'—'}</td></tr>
    <tr><td class="k">İade KM / عداد الإعادة</td><td>${esc(c.iadeKm)||'—'}</td></tr>
  </table>
  <h3>3. KİRALAMA SÜRESİ / مدة الإيجار</h3>
  <table>
    <tr><td class="k">Başlangıç / البداية</td><td>${fmtDT(c.alis)}</td></tr>
    <tr><td class="k">Bitiş / النهاية</td><td>${fmtDT(c.iade)}</td></tr>
  </table>
  <p>Kiracı, aracı belirtilen bitiş tarihinde ve saatinde eksiksiz, hasarsız ve teslim aldığı durumla aynı şekilde iade etmekle yükümlüdür.</p>
  <p class="arp">يلتزم المستأجر بإعادة السيارة في تاريخ ووقت انتهاء الإيجار كاملة وبدون أضرار وبنفس الحالة التي استلمها بها.</p>
  <h3>4. ÖDEME VE DEPOZİTO / الدفع والتأمين</h3>
  <p>Kiracı, kira bedelini ve varsa ek ücretleri zamanında ödemeyi kabul eder. Depozito; hasar, ceza, eksik yakıt, fazla kilometre, geç teslim veya üçüncü kişi talepleri yoksa araç iade edildikten sonra iade edilir.</p>
  <p class="arp">يُعاد مبلغ التأمين بعد إعادة السيارة إذا لم توجد أضرار أو مخالفات أو نقص وقود أو كيلومترات زائدة أو تأخير أو مطالبات من الغير.</p>
  <h3>5. GÜNLÜK KİLOMETRE SINIRI / الحد اليومي للكيلومترات</h3>
  <p>Günlük kullanım sınırı ${esc(cfg.dailyKm)} KM'dir. Kiracı bu sınırı aşarsa, aşan her kilometre için ${esc(cfg.excess)} TL ödemeyi kabul eder. Kullanılmayan kilometreler sonraki günlere devredilmez.</p>
  <p class="arp">الحد المسموح للاستخدام اليومي هو ${esc(cfg.dailyKm)} كم. في حال التجاوز يلتزم المستأجر بدفع ${esc(cfg.excess)} ليرة عن كل كيلومتر زائد. الكيلومترات غير المستخدمة لا تُرحّل.</p>
  <h3>6. SİGORTA: KASKO YOKTUR / لا يوجد كاسكو</h3>
  <p>Taraflar araçta KASKO sigortası bulunmadığını, yalnızca Zorunlu Trafik Sigortası bulunduğunu kabul eder. Sigorta kapsamı kanun ve poliçe ile sınırlıdır; aracın kendi hasarını, değer kaybını, gelir kaybını, tamir/çekici/otopark masraflarını karşılamayabilir. Sigortanın karşılamadığı her türlü zarardan kiracı sorumludur.</p>
  <p class="arp">يقرّ الطرفان بعدم وجود تأمين كاسكو، ووجود تأمين المرور الإجباري فقط، وأن المستأجر مسؤول عن كل ضرر لا يغطيه التأمين.</p>
  <h3>7. KİRACININ SORUMLULUĞU / مسؤولية المستأجر</h3>
  <p>Kiracı; teslim aldığı andan iade ettiği ana kadar araç, anahtar, ruhsat ve ekipmandan ve araçla ilgili tüm hukuki, cezai, idari, mali sonuçlardan sorumludur. Özellikle: trafik kazaları, hasar, çizik, cam, lastik, jant, motor, şanzıman, mekanik/elektronik hasarlar; trafik cezaları, OGS/HGS, köprü/otoyol, otopark; çekici, ekspertiz, değer kaybı, gelir kaybı; sigortanın rücu bedelleri; üçüncü kişi/kurum/mahkeme talepleri.</p>
  <p class="arp">المستأجر مسؤول عن السيارة والمفاتيح والرخصة والمعدات وجميع النتائج القانونية والمالية، بما في ذلك الحوادث والأضرار والمخالفات ورسوم الطرق والمواقف والسحب ونقصان القيمة ومطالبات الغير.</p>
  <h3>8. YASAK KULLANIMLAR / الاستعمالات الممنوعة</h3>
  <p>Kiracı aracı şu şekilde kullanamaz/kullandıramaz: uyuşturucu, kaçak, yasak madde/eşya, silah, patlayıcı taşımak; suç işlemek veya araçla suça yardım; alkollü/uyuşturucu etkisinde veya ehliyetsiz kullanmak; yarış, drift, off-road, ağır yük, çekme, ticari yolcu/taksi/kurye; kiralayanın yazılı izni olmadan İstanbul dışına çıkarmak; üçüncü kişiye vermek/alt kiralamak veya sözleşmede adı olmayan kişiye kullandırmak. Aykırılık halinde tüm sorumluluk kiracıya aittir.</p>
  <p class="arp">يُمنع استعمال السيارة في نقل المواد الممنوعة أو الأسلحة، أو في أي فعل جرمي، أو القيادة تحت تأثير الكحول/المخدرات أو بدون رخصة، أو السباق والطرق الوعرة والنقل التجاري، أو إخراجها خارج اسطنبول بدون إذن خطي، أو تسليمها لغير المذكور في العقد.</p>
  <h3>9. KAZA/HASAR BİLDİRİMİ / التبليغ عند الحادث</h3>
  <p>Kaza, hasar, arıza, hırsızlık, polis/jandarma işlemi veya araca el konulması halinde kiracı derhal kiralayana haber verir; olay yerinden ayrılmaz, tutanak düzenletir, gerekli testlerden kaçınmaz, fotoğraf çeker ve belgeleri teslim eder. Aksi halde doğan tüm zararlar kiracıya aittir.</p>
  <p class="arp">عند وقوع حادث أو ضرر أو حجز، يبلّغ المستأجر المؤجّر فوراً، ولا يغادر مكان الحادث، وينظّم التقرير ويسلّم الوثائق، وإلا تحمّل كامل الأضرار.</p>
  <h3>10. TESLİM VE İADE / التسليم والإعادة</h3>
  <p>Araç; teslim formundaki kilometre, yakıt, ekipman ve hasar durumu ile teslim edilmiştir ve aynı durumda, aynı yerde iade edilecektir. Eksik yakıt/ekipman, anahtar/ruhsat kaybı veya geç iade bedelleri kiracıdan tahsil edilir.</p>
  <p class="arp">تُسلّم السيارة بحالتها المذكورة وتُعاد بنفس الحالة وفي المكان المتفق عليه، ويتحمل المستأجر تكاليف النقص أو الفقدان أو التأخير.</p>
  <h3>11. CEZA ŞARTI / الشرط الجزائي</h3>
  <p>Kiracı; aracı yasak amaçla kullanır, üçüncü kişiye kullandırır, kazayı gizler, sahte beyanda bulunur veya aracı iade etmezse, kiralayanın zararları saklı kalmak üzere zarara göre cezai şart ödemeyi kabul eder.</p>
  <p class="arp">إذا خالف المستأجر الشروط أو لم يُعد السيارة، يلتزم بدفع شرط جزائي حسب الضرر مع حفظ حق المؤجّر بالمطالبة بالأضرار الإضافية.</p>
  <h3>12. EKLER / المرفقات</h3>
  <p>Kiracının kimlik/ikamet ve ehliyet fotokopisi, araç ruhsatı, trafik sigortası poliçesi, teslim-tesellüm formu ve teslim anı fotoğrafları bu sözleşmenin ekidir. (Belge fotoğrafları sözleşmenin sonuna eklenmiştir.)</p>
  <p class="arp">تُرفق صور هوية ورخصة المستأجر ورخصة السيارة وبوليصة التأمين ومحضر التسليم وصور السيارة. (صور الوثائق مرفقة في نهاية العقد.)</p>
  <h3>13. YETKİLİ MAHKEME / المحكمة المختصة</h3>
  <p>İşbu sözleşmeden doğacak uyuşmazlıklarda ${esc(cfg.court)} Mahkemeleri ve İcra Daireleri yetkilidir; Türk Hukuku uygulanır.</p>
  <p class="arp">تختص محاكم ${esc(cfg.court)} ودوائر تنفيذها بأي نزاع، ويُطبّق القانون التركي.</p>
  <h3>14. DİL / اللغة</h3>
  <p>Bu sözleşme Türkçe ve Arapça düzenlenmiştir. Yorum farkında Türkçe metin esastır. Taraflar her iki metni okuyup anladıklarını kabul eder.</p>
  <p class="arp">حُرّر العقد بالتركية والعربية، ويُعتمد النص التركي عند الاختلاف، ويقرّ الطرفان بقراءتهما وفهمهما للنصين.</p>
  <h3>15. İMZA / التوقيع</h3>
  <p>Taraflar sözleşmeyi okuyarak serbest iradeleriyle imzalamıştır.</p>
  <div class="sigwrap">${sigBoxes}</div>
  <div class="meta">No: ${esc(c.no)}</div>`;
}

/* ====== İMZA ====== */
function goSign(){ showStep(3);
  document.getElementById('sig2block').classList.toggle('hidden', !(data.renters&&data.renters.length>1));
  setTimeout(()=>{ sigPad=setupPad('sig','sigHint'); if(data.renters&&data.renters.length>1) sig2Pad=setupPad('sig2','sig2Hint'); },90); }
function setupPad(cid,hid){ const cv=document.getElementById(cid); const r=Math.max(window.devicePixelRatio||1,1);
  cv.width=cv.offsetWidth*r; cv.height=cv.offsetHeight*r; cv.getContext('2d').scale(r,r);
  const pad=new SignaturePad(cv,{penColor:'#0a1230',backgroundColor:'rgba(255,255,255,0)',minWidth:1.3,maxWidth:2.9});
  const h=document.getElementById(hid); pad.addEventListener('beginStroke',()=>{ if(h) h.style.display='none'; }); return pad; }
function clearSig(){ if(sigPad){ sigPad.clear(); document.getElementById('sigHint').style.display='flex'; } }
function clearSig2(){ if(sig2Pad){ sig2Pad.clear(); document.getElementById('sig2Hint').style.display='flex'; } }
/* İmzayı çevresindeki boşluktan kırp; {url, ratio} döndür (oran korunur) */
function trimSig(dataUrl){ return new Promise(res=>{ const im=new Image();
  im.onload=()=>{ const w=im.width,h=im.height; const c=document.createElement('canvas'); c.width=w; c.height=h;
    const x=c.getContext('2d'); x.drawImage(im,0,0); let d;
    try{ d=x.getImageData(0,0,w,h).data; }catch(_){ return res({url:dataUrl,ratio:w/h||3}); }
    let minX=w,minY=h,maxX=0,maxY=0,found=false;
    for(let yy=0;yy<h;yy++){ for(let xx=0;xx<w;xx++){ if(d[(yy*w+xx)*4+3]>24){ found=true; if(xx<minX)minX=xx; if(xx>maxX)maxX=xx; if(yy<minY)minY=yy; if(yy>maxY)maxY=yy; } } }
    if(!found) return res({url:dataUrl,ratio:w/h||3});
    const pad=10; minX=Math.max(0,minX-pad); minY=Math.max(0,minY-pad); maxX=Math.min(w-1,maxX+pad); maxY=Math.min(h-1,maxY+pad);
    const cw=maxX-minX+1, ch=maxY-minY+1; const o=document.createElement('canvas'); o.width=cw; o.height=ch;
    o.getContext('2d').drawImage(c,minX,minY,cw,ch,0,0,cw,ch);
    res({url:o.toDataURL('image/png'), ratio:cw/ch}); };
  im.onerror=()=>res({url:dataUrl,ratio:3}); im.src=dataUrl; }); }

/* ====== BİTİR + PDF ====== */
async function finish(){
  if(!sigPad||sigPad.isEmpty()){ toast('Kiracı 1 imzalamalı'); return; }
  if(data.renters.length>1 && (!sig2Pad||sig2Pad.isEmpty())){ toast('Kiracı 2 imzalamalı'); return; }
  showOverlay('Sözleşme hazırlanıyor…');
  try{
    const t1=await trimSig(sigPad.toDataURL('image/png')); data.renters[0].sig=t1.url; data.renters[0].sigRatio=t1.ratio;
    if(data.renters.length>1){ const t2=await trimSig(sig2Pad.toDataURL('image/png')); data.renters[1].sig=t2.url; data.renters[1].sigRatio=t2.ratio; }
    const ctx=curCtx();
    const r0=ctx.renters[0]; const fname=sanitize(`${r0.kimlikNo}_${r0.ad}_${r0.soyad}`)+'.pdf';
    const payload=JSON.stringify(ctx);
    let pdfDataUrl=null, cloud=false, mailed=false, srvErr='';
    // HER ZAMAN sunucudaki mPDF — 4 deneme. Bozuk istemci yedeği YOK.
    for(let attempt=0; attempt<4 && !pdfDataUrl; attempt++){
      try{ const res=await fetch(API_BASE+'generate_pdf.php',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({payload,filename:fname})});
        if(res.ok){ const j=await res.json(); if(j.pdf_base64){ pdfDataUrl='data:application/pdf;base64,'+j.pdf_base64; cloud=!!j.ok; mailed=!!j.mailed; if(!j.ok) srvErr=j.error||''; } else srvErr=j.error||''; } else srvErr='HTTP '+res.status; }
      catch(e){ srvErr=e.message; }
      if(!pdfDataUrl && attempt<3){ showOverlay('Sunucu yoğun, tekrar deneniyor… ('+(attempt+2)+'/4)'); await new Promise(r=>setTimeout(r,1500)); }
    }
    if(!pdfDataUrl){ hideOverlay(); toast('Sunucu şu an PDF üretemedi. Lütfen "Kaydet ve Bitir"e tekrar basın.'+(srvErr?' ('+srvErr+')':'')); return; }
    lastPdf={filename:fname,dataUrl:pdfDataUrl};
    saveLocal(ctx,fname,cloud,pdfDataUrl);
    hideOverlay(); showDone(ctx,cloud,mailed);   // PDF otomatik AÇILMAZ; kullanıcı 'PDF'i Aç' der
  }catch(err){ hideOverlay(); toast('Hata: '+err.message); }
}
function waitImages(node){ const imgs=[...node.querySelectorAll('img')];
  return Promise.all(imgs.map(im=> im.complete&&im.naturalWidth ? Promise.resolve() : new Promise(r=>{ im.onload=r; im.onerror=r; setTimeout(r,2500); }))); }
function loadImg(src){ return new Promise(res=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=()=>res(i); i.src=src; }); }
function sigBox(ratio){ let w=32,h=w/(ratio||3); if(h>10){ h=10; w=h*(ratio||3); } return {w,h}; }
function stampFooter(pdf,ctx){
  const pw=pdf.internal.pageSize.getWidth(), ph=pdf.internal.pageSize.getHeight();
  pdf.setFillColor(255,255,255); pdf.rect(0,ph-16,pw,16,'F');
  pdf.setDrawColor(205); pdf.line(6,ph-16,pw-6,ph-16);
  pdf.setFontSize(6); pdf.setTextColor(95);
  const co=ctx.company||{}; const slots=[{x:8}]; (ctx.renters||[]).forEach((_,i)=>slots.push({x:8+66*(i+1)}));
  // Kiralayan
  if(co.ownerSig){ const b=sigBox(co.ownerSigRatio); try{ pdf.addImage(co.ownerSig,'PNG',8,ph-14,b.w,b.h); }catch(_){} }
  pdf.text(asciiTr('Kiralayan: '+(co.unvan||'')).slice(0,30),8,ph-2.2);
  // Kiracılar
  (ctx.renters||[]).forEach((r,i)=>{ const x=8+66*(i+1);
    if(r.sig){ const b=sigBox(r.sigRatio); try{ pdf.addImage(r.sig,'PNG',x,ph-14,b.w,b.h);}catch(_){} }
    pdf.text(asciiTr('Kiraci '+(i+1)+': '+(r.ad||'')+' '+(r.soyad||'')).slice(0,30),x,ph-2.2); });
}
async function makePdf(ctx){
  const { jsPDF }=window.jspdf;
  const wrap=document.createElement('div'); wrap.className='doc';
  wrap.style.cssText='position:fixed;left:-10000px;top:0;width:720px;box-sizing:border-box;z-index:-1';
  wrap.innerHTML=buildDocTR(ctx); document.body.appendChild(wrap);
  await waitImages(wrap); await new Promise(r=>setTimeout(r,90));
  const canvas=await html2canvas(wrap,{scale:2,backgroundColor:'#ffffff',useCORS:true,logging:false});
  // Güvenli kesim noktaları: her üst-öğenin alt kenarı (sayfa kırılımında satır ortadan kesilmesin)
  const f=canvas.width/(wrap.offsetWidth||720);
  const brk=[0]; [...wrap.children].forEach(el=>{ const b=Math.round((el.offsetTop+el.offsetHeight)*f); if(b>0&&b<canvas.height) brk.push(b); });
  brk.push(canvas.height); const breaks=[...new Set(brk)].sort((a,b)=>a-b);
  document.body.removeChild(wrap);
  if(!canvas.width||!canvas.height) throw new Error('Belge oluşturulamadı');
  const pdf=new jsPDF('p','mm','a4');
  const pw=pdf.internal.pageSize.getWidth(), ph=pdf.internal.pageSize.getHeight();
  const footer=16, usable=ph-footer, mmPerPx=pw/canvas.width, pageHpx=Math.floor(usable/mmPerPx);
  let start=0, first=true;
  while(start<canvas.height-2){
    const limit=start+pageHpx;
    const cands=breaks.filter(b=>b>start+40 && b<=limit);
    let cut=cands.length?Math.max(...cands):Math.min(canvas.height,limit);
    if(cut<=start) cut=Math.min(canvas.height,limit);
    const sh=cut-start, last=cut>=canvas.height;
    const t=document.createElement('canvas'); t.width=canvas.width; t.height=sh;
    t.getContext('2d').drawImage(canvas,0,start,canvas.width,sh,0,0,canvas.width,sh);
    if(!first) pdf.addPage();
    pdf.addImage(t.toDataURL('image/jpeg',0.92),'JPEG',0,0,pw,sh*mmPerPx);
    if(!last) stampFooter(pdf,ctx);   // son sözleşme sayfasında zaten İMZA bloğu var
    first=false; start=cut;
  }
  // belge fotoğrafları en sona
  for(let i=0;i<(ctx.renters||[]).length;i++){
    const ph2=ctx.renters[i].photos||[];
    for(let k=0;k<ph2.length;k++){
      pdf.addPage(); pdf.setFontSize(10); pdf.setTextColor(20);
      pdf.text(asciiTr('Belge - Kiraci '+(i+1)+' ('+(k+1)+'/'+ph2.length+')'),pw/2,12,{align:'center'});
      const im=await loadImg(ph2[k]); const maxW=pw-20, maxH=usable-20;
      let w=maxW, h=im.height?w*im.height/im.width:maxH; if(h>maxH){ h=maxH; w=im.width?h*im.width/im.height:maxW; }
      try{ pdf.addImage(ph2[k],'JPEG',(pw-w)/2,18,w,h); }catch(_){}
      stampFooter(pdf,ctx);
    }
  }
  const dataUrl=pdf.output('datauristring');
  return { dataUrl, base64:dataUrl.split(',')[1] };
}
function showDone(ctx,cloud,mailed){ const r0=ctx.renters[0];
  document.getElementById('doneMsg').textContent=`${r0.ad} ${r0.soyad} • ${ctx.no}`;
  document.getElementById('doneBadges').innerHTML=`<span class="badge ok">Telefona indirildi</span>`+
    (cloud?`<span class="badge ok">Buluta kaydedildi</span>`:`<span class="badge warn">Bulut: bağlı değil</span>`)+
    (r0.email?(mailed?`<span class="badge ok">E-posta gönderildi</span>`:`<span class="badge warn">E-posta gönderilemedi</span>`):'');
  showStep(4); }
function dataURLtoBlob(d){ const a=d.split(','); const m=(a[0].match(/:(.*?);/)||[])[1]||'application/pdf'; const b=atob(a[1]); const n=b.length; const u=new Uint8Array(n); for(let i=0;i<n;i++) u[i]=b.charCodeAt(i); return new Blob([u],{type:m}); }
function downloadPdf(name,dataUrl){ const a=document.createElement('a'); a.href=dataUrl; a.download=name; document.body.appendChild(a); a.click(); a.remove(); }
/* Safari uyumlu: hem yeni sekmede aç hem indir (kullanıcı dokunuşuyla) */
function openAndDownload(name,dataUrl){
  try{ const url=URL.createObjectURL(dataURLtoBlob(dataUrl));
    window.open(url,'_blank');
    const a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000);
  }catch(e){ downloadPdf(name,dataUrl); } }
function downloadAgain(){ if(lastPdf) openAndDownload(lastPdf.filename,lastPdf.dataUrl); }

/* ====== YEREL YEDEK ====== */
function liteCtx(ctx){ const c=JSON.parse(JSON.stringify(ctx)); (c.renters||[]).forEach(r=>{ r.photos=[]; }); return c; }
function trySaveList(list){ try{ localStorage.setItem('zoom_contracts',JSON.stringify(list)); return true; }catch(e){ return false; } }
function saveLocal(ctx,fname,cloud,pdfUrl){ const r0=ctx.renters[0];
  const entry={ no:ctx.no, ad:r0.ad, soyad:r0.soyad, plaka:ctx.car.plaka, tarih:ctx.tarih, saat:ctx.saat,
    alis:ctx.alis, iade:ctx.iade, iadeKm:ctx.iadeKm, filename:fname, cloud, ts:Date.now(), pdf:pdfUrl, payload:JSON.stringify(liteCtx(ctx)) };
  const list=JSON.parse(localStorage.getItem('zoom_contracts')||'[]'); list.unshift(entry);
  if(trySaveList(list)) return;                 // tam
  entry.pdf=null; if(trySaveList(list)) return; // pdf'siz
  while(list.length>1){ list.pop(); if(trySaveList(list)) return; } // eskileri at
}
function updateLocal(no,ctx,fname,pdfUrl){ const list=JSON.parse(localStorage.getItem('zoom_contracts')||'[]');
  const i=list.findIndex(x=>x.no===no);
  if(i>=0){ list[i].alis=ctx.alis; list[i].iade=ctx.iade; list[i].iadeKm=ctx.iadeKm; list[i].filename=fname; if(pdfUrl) list[i].pdf=pdfUrl; list[i].payload=JSON.stringify(liteCtx(ctx)); }
  if(!trySaveList(list)){ if(i>=0) list[i].pdf=null; trySaveList(list); } }

/* ====== LİSTE ====== */
async function loadList(){ CONTRACTS=[];
  try{ const res=await fetch(API_BASE+'list_contracts.php',{credentials:'same-origin'}); if(res.ok){ const j=await res.json(); if(Array.isArray(j.items)) CONTRACTS=j.items; } }catch(_){}
  if(!CONTRACTS.length) CONTRACTS=JSON.parse(localStorage.getItem('zoom_contracts')||'[]'); renderList(); }
function clearFilter(){ document.getElementById('fStart').value=''; document.getElementById('fEnd').value=''; document.getElementById('searchInput').value=''; renderList(); }
function setQuick(k){ const d=new Date(),y=d.getFullYear(),m=d.getMonth(); const f=dt=>`${dt.getFullYear()}-${pad2(dt.getMonth()+1)}-${pad2(dt.getDate())}`;
  let s,e; if(k==='today'){ s=e=f(d); } else if(k==='month'){ s=f(new Date(y,m,1)); e=f(new Date(y,m+1,0)); } else { s=`${y}-01-01`; e=`${y}-12-31`; }
  document.getElementById('fStart').value=s; document.getElementById('fEnd').value=e; renderList(); }
function filtered(){ const q=(document.getElementById('searchInput').value||'').toLowerCase().trim();
  const s=document.getElementById('fStart').value, e=document.getElementById('fEnd').value;
  return CONTRACTS.map((it,idx)=>({it,idx})).filter(o=>{ const it=o.it;
    if(q && !((it.ad||'')+' '+(it.soyad||'')+' '+(it.plaka||'')).toLowerCase().includes(q)) return false;
    if(s && (it.tarih||'')<s) return false; if(e && (it.tarih||'')>e) return false; return true; }); }
function renderList(){ const box=document.getElementById('listBox'); const items=filtered();
  if(!items.length){ box.innerHTML='<div class="empty">Sonuç yok.</div>'; return; }
  box.innerHTML=items.map(o=>{ const it=o.it, d=fmtDate(it.tarih), ini=((it.ad||'?')[0]||'')+((it.soyad||'')[0]||''); const url=it.url||it.pdf||null;
    const fat = it.fatura==1||it.fatura===true||it.fatura==='1';
    return `<div class="item${fat?' fatura':''}"><div class="av">${esc(ini.toUpperCase())}</div>
      <div class="info"><b>${esc(it.ad)} ${esc(it.soyad)}</b>
        <small><span class="kimlik">Kimlik: ${esc(it.kimlik||'—')}</span> • ${esc(it.plaka||'')}<br>${esc(d)} ${esc(it.saat||'')} • Alış: ${fmtDT(it.alis)} → İade: ${fmtDT(it.iade)}</small></div>
      <div class="act">
      <button class="ibtn fat${fat?' on':''}" onclick="toggleInvoice(${o.idx})">${fat?'✓ Faturalı':'Fatura'}</button>
      <button class="ibtn" onclick="openEdit(${o.idx})">Düzenle</button>
      ${url ? (String(url).startsWith('data:')
        ? `<button class="ibtn" onclick="openPdf('${url}','${esc(it.filename||'sozlesme.pdf')}')">PDF</button>`
        : `<a class="ibtn" href="${url}" target="_blank" rel="noopener" style="text-decoration:none;text-align:center;display:inline-block">PDF</a>`) : ''}
      <button class="ibtn" style="background:rgba(255,80,80,.15);border-color:rgba(255,80,80,.4);color:#ff8a8a" onclick="deleteContract(${o.idx})">Sil</button></div></div>`; }).join(''); }
async function toggleInvoice(idx){ const it=CONTRACTS[idx]; if(!it) return;
  const cur=(it.fatura==1||it.fatura===true||it.fatura==='1'); const nv=cur?0:1;
  it.fatura=nv;                                   // anında güncelle
  renderList();
  if(it.id){ try{ await fetch(API_BASE+'mark_invoice.php',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:it.id,fatura:nv})}); }catch(_){} }
  try{ const list=JSON.parse(localStorage.getItem('zoom_contracts')||'[]'); const j=list.findIndex(x=>x.no===it.no); if(j>=0){ list[j].fatura=nv; localStorage.setItem('zoom_contracts',JSON.stringify(list)); } }catch(_){}
  toast(nv?'Faturalı olarak işaretlendi':'Fatura işareti kaldırıldı'); }
function openPdf(url,name){ if(url.startsWith('data:')) openAndDownload(name,url); else window.open(url,'_blank'); }
async function deleteContract(idx){ const it=CONTRACTS[idx]; if(!it) return;
  if(!confirm(`${it.ad||''} ${it.soyad||''} sözleşmesi silinsin mi? Bu işlem geri alınamaz.`)) return;
  showOverlay('Siliniyor…');
  try{ if(it.id){ try{ await fetch(API_BASE+'delete_contract.php',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:it.id})}); }catch(_){} }
    // yerelden de sil
    const list=JSON.parse(localStorage.getItem('zoom_contracts')||'[]').filter(x=>x.no!==it.no);
    try{ localStorage.setItem('zoom_contracts',JSON.stringify(list)); }catch(_){}
    hideOverlay(); toast('Silindi'); loadList();
  }catch(err){ hideOverlay(); toast('Silinemedi: '+err.message); } }

/* ====== ZIP ====== */
async function downloadZip(){
  const items=filtered(); if(!items.length){ toast('İndirilecek sözleşme yok'); return; }
  const s=document.getElementById('fStart').value, e=document.getElementById('fEnd').value;
  if(items[0].it.id){ // sunucu
    let u=API_BASE+'download_zip.php?'; if(s) u+='start='+s+'&'; if(e) u+='end='+e+'&';
    window.open(u,'_blank'); return;
  }
  // yerel: JSZip
  showOverlay('ZIP hazırlanıyor…');
  try{ const zip=new JSZip(); let n=0;
    items.forEach(o=>{ const it=o.it; if(it.pdf&&it.pdf.startsWith('data:')){ zip.file(it.filename||('sozlesme_'+(++n)+'.pdf'), it.pdf.split(',')[1], {base64:true}); } });
    const blob=await zip.generateAsync({type:'blob'}); const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download='sozlesmeler.zip'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    hideOverlay();
  }catch(err){ hideOverlay(); toast('ZIP hatası: '+err.message); }
}

/* ====== DÜZENLE ====== */
async function openEdit(idx){ const it=CONTRACTS[idx]; editIdx=idx; editCtx=null; showOverlay('Yükleniyor…');
  try{ let payload=it.payload;
    if(!payload && it.id){ const r=await fetch(API_BASE+'get_contract.php?id='+it.id,{credentials:'same-origin'}); if(r.ok){ const j=await r.json(); if(j.ok&&j.payload) payload=j.payload; } }
    if(payload) editCtx=typeof payload==='string'?JSON.parse(payload):payload;
    if(!editCtx){ hideOverlay(); toast('Bu kayıt düzenlenemiyor (eski kayıt)'); return; }
    hideOverlay();
    const r0=editCtx.renters[0]||{};
    document.getElementById('editWho').textContent=`${r0.ad} ${r0.soyad} • ${editCtx.no}`;
    document.getElementById('eAd').value=r0.ad||''; document.getElementById('eSoyad').value=r0.soyad||''; document.getElementById('eKimlik').value=r0.kimlikNo||'';
    document.getElementById('eAlis').value=editCtx.alis||''; document.getElementById('eIade').value=editCtx.iade||'';
    document.getElementById('eIadeKm').value=editCtx.iadeKm||'';
    document.getElementById('editModal').classList.add('show');
  }catch(err){ hideOverlay(); toast('Yüklenemedi: '+err.message); } }
function closeEdit(){ document.getElementById('editModal').classList.remove('show'); editIdx=-1; editCtx=null; }
async function saveEdit(){ if(!editCtx) return;
  const na=document.getElementById('eAlis').value, ni=document.getElementById('eIade').value, km=document.getElementById('eIadeKm').value.trim();
  const ead=document.getElementById('eAd').value.trim(), eso=document.getElementById('eSoyad').value.trim(), eki=document.getElementById('eKimlik').value.trim();
  if(!na||!ni){ toast('Tarihleri girin'); return; }
  if(!ead||!eso){ toast('Ad ve soyad boş olamaz'); return; }
  showOverlay('PDF güncelleniyor…');
  try{ editCtx.alis=na; editCtx.iade=ni; editCtx.iadeKm=km;
    const r0=editCtx.renters[0]; r0.ad=ead; r0.soyad=eso; r0.kimlikNo=eki;
    const fname=sanitize(`${r0.kimlikNo}_${r0.ad}_${r0.soyad}`)+'.pdf';
    const payload=JSON.stringify(editCtx); const it=CONTRACTS[editIdx]; let ok=false, pdfDataUrl=null;
    if(!it.id){ hideOverlay(); toast('Bu kayıt sunucuda değil, düzenlenemiyor'); return; }
    for(let attempt=0; attempt<4 && !pdfDataUrl; attempt++){
      try{ const r=await fetch(API_BASE+'generate_pdf.php',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({id:it.id, payload, filename:fname})}); if(r.ok){ const j=await r.json(); if(j.pdf_base64){ ok=!!j.ok; pdfDataUrl='data:application/pdf;base64,'+j.pdf_base64; } } }catch(_){}
      if(!pdfDataUrl && attempt<3){ showOverlay('Sunucu yoğun, tekrar deneniyor… ('+(attempt+2)+'/4)'); await new Promise(r=>setTimeout(r,1500)); }
    }
    if(!pdfDataUrl){ hideOverlay(); toast('Sunucu şu an güncelleyemedi. Lütfen tekrar deneyin.'); return; }
    updateLocal(editCtx.no,editCtx,fname,pdfDataUrl); lastPdf={filename:fname,dataUrl:pdfDataUrl};
    hideOverlay(); closeEdit(); toast('Güncellendi ✓'); loadList();
  }catch(err){ hideOverlay(); toast('Hata: '+err.message); } }

/* ====== AYARLAR ====== */
async function loadSettings(){
  try{ const r=await fetch(API_BASE+'settings.php',{credentials:'same-origin'}); if(r.ok){ const j=await r.json(); if(j&&j.ok&&j.settings) SETTINGS={...DEFAULTS,...j.settings}; } }catch(_){}
  const ls=localStorage.getItem('zoom_settings'); if(ls && SETTINGS.ad===DEFAULTS.ad && !SETTINGS.ownerSig){ try{ SETTINGS={...DEFAULTS,...JSON.parse(ls)}; }catch(_){} }
  if(!Array.isArray(SETTINGS.cars)) SETTINGS.cars=[];
}
function openSettings(){
  setVal('setAd',SETTINGS.ad); setVal('setUnvan',SETTINGS.unvan); setVal('setAdres',SETTINGS.adres);
  setVal('setTel',SETTINGS.tel); setVal('setEmail',SETTINGS.email); setVal('setVergi',SETTINGS.vergi);
  setVal('setKm',SETTINGS.dailyKm); setVal('setExcess',SETTINGS.excess); setVal('setCourt',SETTINGS.court); setVal('setYer',SETTINGS.yer);
  const lp=document.getElementById('logoPrev'), ld=document.getElementById('logoDel');
  if(SETTINGS.logo){ document.getElementById('logoPrevImg').src=SETTINGS.logo; lp.classList.remove('hidden'); ld.classList.remove('hidden'); }
  else{ lp.classList.add('hidden'); ld.classList.add('hidden'); }
  const sw=document.getElementById('savedSigWrap'), pw=document.getElementById('ownerSigWrap'), rb=document.getElementById('reSignBtn');
  if(SETTINGS.ownerSig){ document.getElementById('savedSigImg').src=SETTINGS.ownerSig; sw.classList.remove('hidden'); pw.classList.add('hidden'); rb.classList.remove('hidden'); ownerSigPad=null; }
  else{ sw.classList.add('hidden'); pw.classList.remove('hidden'); rb.classList.add('hidden'); setTimeout(()=>{ ownerSigPad=setupPad('ownerSig','ownerHint'); },80); }
}
const setVal=(id,v)=>{ const e=document.getElementById(id); if(e) e.value=v||''; };
function reSignOwner(){ document.getElementById('savedSigWrap').classList.add('hidden'); document.getElementById('ownerSigWrap').classList.remove('hidden');
  document.getElementById('reSignBtn').classList.add('hidden'); document.getElementById('ownerHint').style.display='flex'; setTimeout(()=>{ ownerSigPad=setupPad('ownerSig','ownerHint'); },80); }
function clearOwnerSig(){ if(ownerSigPad){ ownerSigPad.clear(); document.getElementById('ownerHint').style.display='flex'; } }
function compressPng(dataUrl,maxW){ return new Promise(res=>{ const im=new Image();
  im.onload=()=>{ const sc=Math.min(maxW/im.width,1); const w=Math.round(im.width*sc),h=Math.round(im.height*sc);
    const c=document.createElement('canvas'); c.width=w; c.height=h; c.getContext('2d').drawImage(im,0,0,w,h); res(c.toDataURL('image/png')); };
  im.onerror=()=>res(dataUrl); im.src=dataUrl; }); }
function onLogo(e){ const f=e.target.files[0]; if(!f) return; const rd=new FileReader();
  rd.onload=async ev=>{ SETTINGS.logo=await compressPng(ev.target.result,600); e.target.value='';
    document.getElementById('logoPrevImg').src=SETTINGS.logo; document.getElementById('logoPrev').classList.remove('hidden');
    document.getElementById('logoDel').classList.remove('hidden'); applyLogo(); toast('Logo seçildi — Kaydet\'e basın'); };
  rd.readAsDataURL(f); }
function removeLogo(){ SETTINGS.logo=''; document.getElementById('logoPrev').classList.add('hidden'); document.getElementById('logoDel').classList.add('hidden'); applyLogo(); }
async function persistSettings(){ try{ localStorage.setItem('zoom_settings',JSON.stringify(SETTINGS)); }catch(e){}
  try{ const r=await fetch(API_BASE+'settings.php',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(SETTINGS)}); if(r.ok){ const j=await r.json(); return !!j.ok; } }catch(_){} return false; }
async function saveSettings(){
  SETTINGS.ad=gv('setAd')||DEFAULTS.ad; SETTINGS.unvan=gv('setUnvan')||DEFAULTS.unvan; SETTINGS.adres=gv('setAdres')||DEFAULTS.adres;
  SETTINGS.tel=gv('setTel'); SETTINGS.email=gv('setEmail'); SETTINGS.vergi=gv('setVergi')||DEFAULTS.vergi;
  SETTINGS.dailyKm=gv('setKm')||'150'; SETTINGS.excess=gv('setExcess')||'15'; SETTINGS.court=gv('setCourt')||'İstanbul'; SETTINGS.yer=gv('setYer')||'İstanbul';
  if(ownerSigPad && !ownerSigPad.isEmpty()){ const t=await trimSig(ownerSigPad.toDataURL('image/png')); SETTINGS.ownerSig=t.url; SETTINGS.ownerSigRatio=t.ratio; }
  const ok=await persistSettings(); toast(ok?'Ayarlar kaydedildi (bulut)':'Ayarlar kaydedildi (bu cihaz)'); openSettings(); }
async function changeCreds(){
  const nu=gv('setUser'), np=document.getElementById('setPass').value, cp=document.getElementById('setCurPass').value;
  if(!cp){ toast('Mevcut şifreyi girin'); return; }
  if(!nu){ toast('Yeni kullanıcı adı girin'); return; }
  if(np.length<4){ toast('Yeni şifre en az 4 karakter olmalı'); return; }
  try{ const r=await fetch(API_BASE+'change_credentials.php',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({curPass:cp,newUser:nu,newPass:np})});
    const j=await r.json(); if(j&&j.ok){ toast('Giriş bilgileri güncellendi'); document.getElementById('setPass').value=''; document.getElementById('setCurPass').value=''; }
    else toast((j&&j.error)||'Güncellenemedi');
  }catch(e){ toast('Sunucuya ulaşılamadı'); } }

/* ====== YARDIMCI ====== */
function sanitize(s){ const map={'ç':'c','ğ':'g','ı':'i','İ':'I','ö':'o','ş':'s','ü':'u','Ç':'C','Ğ':'G','Ö':'O','Ş':'S','Ü':'U'};
  return (s||'').replace(/[çğıİöşüÇĞÖŞÜ]/g,c=>map[c]||c).replace(/[^a-zA-Z0-9_]+/g,'_').replace(/_+/g,'_'); }
function noDigits(e){ const s=e.target.selectionStart; e.target.value=e.target.value.replace(/[0-9]/g,''); try{e.target.setSelectionRange(s-0,s-0);}catch(_){ } }
function onlyDigits(e,max){ let v=e.target.value.replace(/\D/g,''); if(max) v=v.slice(0,max); e.target.value=v; }
function fmtPhone(e){ let v=e.target.value.replace(/\D/g,''); if(v && v[0]!=='0') v='0'+v; e.target.value=v.slice(0,11); }
function resetAll(){
  ['plaka','model','yil','teslimKm'].forEach(id=>{ const e=document.getElementById(id); if(e) e.value=''; });
  ['a','b'].forEach(p=>{ PHOTOS[p]=[]; renderPhotos(p); ['_ad','_soyad','_dogum','_tc','_pasaport','_baba','_anne','_tel','_email'].forEach(s=>{ const e=document.getElementById(p+s); if(e) e.value=''; }); const u=document.getElementById(p+'_ulke'); if(u){ u.value='Türkiye'; onCountry(p);} });
  toggleR2(false); lastPdf=null; for(const k in data) delete data[k];
  if(sigPad) clearSig(); if(sig2Pad) clearSig2(); initDateTime(); showStep(0);
}
function toast(m){ const t=document.getElementById('toast'); t.textContent=m; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2300); }
function showOverlay(m){ document.getElementById('overlayMsg').textContent=m; document.getElementById('overlay').classList.add('show'); }
function hideOverlay(){ document.getElementById('overlay').classList.remove('show'); }

checkAuth();
