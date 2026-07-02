// ملاحظة: انسخ إعدادات Firebase الخاصة بمشروعك في المكان المشار إليه أسفل.
// وظيفة هذا الملف: التعامل مع Firestore لحفظ الأصوات، عرض قائمة المصوتين، وإظهار النتيجة بعد الإغلاق.

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, serverTimestamp, query, where, getDocs,
  onSnapshot, orderBy, getDoc, doc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// --- ضع هنا firebaseConfig الذي تحصل عليه من لوحة Firebase ---
const firebaseConfig = {
  // الصق هنا كائن firebaseConfig الخاص بك
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  // ... بقية الحقول
};
// ----------------------------------------------------------------

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const CLOSE_DOC = { collection: 'config', id: 'election' }; // مستند الإعداد الذي يحتوي على closeTime (Firestore Timestamp)

const voteForm = document.getElementById('voteForm');
const writeInInput = document.getElementById('writeIn');
const votersList = document.getElementById('votersList');
const resultsSection = document.getElementById('results-section');
const resultsSummary = document.getElementById('resultsSummary');
const submitBtn = document.getElementById('submitBtn');
const countdownEl = document.getElementById('countdown');
const downloadCsvBtn = document.getElementById('downloadCsv');
const shareWhatsappBtn = document.getElementById('shareWhatsapp');

const candidatesRadio = [...document.querySelectorAll('input[name="candidate"]')];
const writeinRadio = document.querySelector('input[value="__writein__"]');

function toggleWriteIn() {
  if (writeinRadio.checked) writeIn.style.display = 'block';
  else { writeIn.style.display = 'none'; writeIn.value = ''; }
}
candidatesRadio.forEach(r=> r.addEventListener('change', toggleWriteIn));

let closeTime = null; // سيملأ من Firestore (Timestamp)

async function loadCloseTime(){
  const cfgRef = doc(db, CLOSE_DOC.collection, CLOSE_DOC.id);
  const snap = await getDoc(cfgRef);
  if (!snap.exists()) {
    // لو لم يوجد المستند، انشئ توقيت الإغلاق الافتراضي (03-07-2026 15:00:00Z = 18:00 بتوقيت Yemen UTC+3)
    // اطلب من المسؤول أن ينشئه فعليًا في Firestore أو ألصق القيم في الكود
    closeTime = new Date(Date.UTC(2026,6,3,15,0,0)); // ملاحظة: شهور 0-indexed => 6 = يوليو
  } else {
    const data = snap.data();
    if (data.closeTime && data.closeTime.toDate) closeTime = data.closeTime.toDate();
    else closeTime = new Date(data.closeTime);
  }
  startCountdown();
  attachListeners();
}

function startCountdown(){
  function update(){
    const now = new Date();
    const diff = closeTime - now;
    if (diff <= 0) {
      countdownEl.textContent = 'التصويت مغلق';
      onClose();
      clearInterval(timer);
    } else {
      const h = Math.floor(diff/3600000);
      const m = Math.floor((diff%3600000)/60000);
      const s = Math.floor((diff%60000)/1000);
      countdownEl.textContent = `متبقي: ${h} س ${m} د ${s} ث`;
    }
  }
  update();
  const timer = setInterval(update, 1000);
}

// --- وظيفة منع التكرار: نبحث عن أي صوت بنفس الهاتف أو الإيميل ---
async function hasAlreadyVoted(phone, email){
  const votesRef = collection(db,'votes');
  const q1 = query(votesRef, where('phone','==',phone));
  const q2 = query(votesRef, where('email','==',email));
  const res1 = await getDocs(q1);
  if (!res1.empty) return true;
  const res2 = await getDocs(q2);
  if (!res2.empty) return true;
  return false;
}

voteForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  submitBtn.disabled = true;
  const name = document.getElementById('fullName').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const email = document.getElementById('email').value.trim();
  let candidate = document.querySelector('input[name="candidate"]:checked').value;
  if (candidate === '__writein__') {
    const w = writeInInput.value.trim();
    if (!w){ alert('ادخل اسم المرشح الآخر'); submitBtn.disabled = false; return; }
    candidate = w;
  }

  // تحقق من الإغلاق (عمليّة بسيطة: تقارن بالساعة المحلية)
  const now = new Date();
  if (closeTime && now >= closeTime) {
    alert('التصويت مغلق الآن.');
    submitBtn.disabled = false;
    return;
  }

  try {
    const already = await hasAlreadyVoted(phone, email);
    if (already) {
      alert('يبدو أنك قد صوّتت مسبقاً (رقم الهاتف أو الإيميل موجود). التصويت مسموح مرة واحدة فقط.');
      submitBtn.disabled = false;
      return;
    }

    await addDoc(collection(db,'votes'), {
      name, phone, email, candidate, timestamp: serverTimestamp()
    });

    alert('تم تسجيل صوتك. شكراً لمشاركتك.');
    submitBtn.disabled = true;
    voteForm.reset();
    toggleWriteIn();
  } catch (err) {
    console.error(err);
    alert('حدث خطأ أثناء إرسال التصويت. حاول مرة أخرى.');
    submitBtn.disabled = false;
  }
});

// --- عرض قائمة المصوتين فورياً (الاسم + المرشح) ---
function attachListeners(){
  const votesRef = collection(db,'votes');
  const q = query(votesRef, orderBy('timestamp'));
  onSnapshot(q, snap=>{
    votersList.innerHTML = '';
    if (snap.empty){ votersList.innerHTML = '<li>لا توجد أصوات حتى الآن</li>'; return; }
    snap.forEach(doc=>{
      const d = doc.data();
      const li = document.createElement('li');
      const name = d.name || '—';
      const cand = d.candidate || '—';
      const time = d.timestamp && d.timestamp.toDate ? formatDate(d.timestamp.toDate()) : '';
      li.textContent = `${name} — ${cand} ${time ? ' • ' + time : ''}`;
      votersList.appendChild(li);
    });
  });
}

// --- بعد الإغلاق: إظهار النتيجة النهائية (النسب والفائز) ---
async function onClose(){
  // قراءة كل الأصوات
  const votesRef = collection(db,'votes');
  const all = await getDocs(votesRef);
  const counts = {};
  let total = 0;
  all.forEach(doc=>{
    const d = doc.data();
    let cand = (d.candidate || 'غير معروف').trim();
    const key = cand.toLowerCase();
    counts[key] = counts[key] || {name: cand, count:0};
    counts[key].count += 1;
    total += 1;
  });

  // تحويل إلى مصفوفة وترتيب
  const arr = Object.values(counts).sort((a,b)=> b.count - a.count);

  // إظهار النتيجة
  resultsSummary.innerHTML = '';
  arr.forEach(row=>{
    const percent = total ? Math.round((row.count/total)*10000)/100 : 0;
    const container = document.createElement('div');
    container.className = 'result-row';
    container.innerHTML = `
      <div>
        <div style="font-weight:800">${row.name}</div>
        <div class="muted" style="color:#6b7280;font-size:0.9rem">${row.count} صوت / ${percent}%</div>
      </div>
      <div style="min-width:180px">
        <div class="progress"><div class="progress-bar" style="width:${percent}%;"></div></div>
      </div>
    `;
    resultsSummary.appendChild(container);
  });

  resultsSection.style.display = 'block';
}

// تنزيل CSV (Excel)
downloadCsvBtn.addEventListener('click', async ()=>{
  downloadCsvBtn.disabled = true;
  const votesRef = collection(db,'votes');
  const snap = await getDocs(votesRef);
  if (snap.empty){ alert('لا توجد بيانات للتصدير'); downloadCsvBtn.disabled = false; return; }
  const rows = [['الاسم الرباعي','الهاتف','البريد الإلكتروني','المرشح','الطابع الزمني (UTC)']];
  snap.forEach(doc=>{
    const d = doc.data();
    const ts = d.timestamp && d.timestamp.toDate ? d.timestamp.toDate().toISOString() : '';
    rows.push([d.name || '', d.phone || '', d.email || '', d.candidate || '', ts]);
  });
  const csvContent = rows.map(r => r.map(cell => `"${(cell+'').replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csvContent], {type: 'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'votes_export.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  downloadCsvBtn.disabled = false;
});

// مشاركة عبر واتساب بعد الإغلاق
shareWhatsappBtn.addEventListener('click', async ()=>{
  // بناء نص موجز للنتيجة
  const votesRef = collection(db,'votes');
  const snap = await getDocs(votesRef);
  const counts = {};
  let total = 0;
  snap.forEach(doc=>{
    const d = doc.data();
    const cand = (d.candidate||'غير معروف').trim();
    const key = cand.toLowerCase();
    counts[key] = counts[key] || {name:cand,count:0};
    counts[key].count += 1;
    total += 1;
  });
  const arr = Object.values(counts).sort((a,b)=> b.count - a.count);
  let winner = arr[0] ? `${arr[0].name} (${Math.round((arr[0].count/total)*10000)/100}%)` : 'لا يوجد';
  let msg = `نتيجة تصويت مدير عام مكتب الصحة - محافظة الضالع\n\nالفائز: ${winner}\n\nتفاصيل:\n`;
  arr.forEach(r=>{
    const pct = total ? Math.round((r.count/total)*10000)/100 : 0;
    msg += `• ${r.name}: ${r.count} صوت (${pct}%)\n`;
  });
  msg += `\nتم إغلاق التصويت في ${closeTime.toUTCString()}\n`;
  const pageUrl = window.location.href;
  const wa = `https://wa.me/?text=${encodeURIComponent(msg + "\n" + pageUrl)}`;
  window.open(wa, '_blank');
});

// مساعدة: تنسيق تاريخ (عرض محلي بسيط)
function formatDate(d){
  try {
    return new Date(d).toLocaleString('ar-EG', { dateStyle:'short', timeStyle:'short' });
  } catch(e){ return ''; }
}

// تحميل الإغلاق ثم المتابعة
loadCloseTime();
