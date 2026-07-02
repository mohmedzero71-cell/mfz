// صفحة الإغلاق: تعرض النتائج المحلية المحفوظة في هذا المتصفح
const VOTES_KEY = 'mfz_votes';

const resultsSummary = document.getElementById('resultsSummary');
const downloadCsvBtn = document.getElementById('downloadCsv');
const exportInstructionsBtn = document.getElementById('exportInstructions');

function loadLocalVotes(){
  try{ const raw = localStorage.getItem(VOTES_KEY); return raw ? JSON.parse(raw) : []; } catch(e){ return []; }
}

function renderLocalResults(){
  const arr = loadLocalVotes();
  if (!arr.length){ resultsSummary.innerHTML = '<div>لا توجد أصوات محلية محفوظة على هذا المتصفح.</div>'; return; }
  const counts = {};
  arr.forEach(v=>{ const key = v.candidate.trim(); counts[key] = (counts[key]||0) + 1; });
  const rows = Object.keys(counts).map(k=>({name:k,count:counts[k]})).sort((a,b)=>b.count-a.count);
  const total = arr.length;
  resultsSummary.innerHTML = '';
  rows.forEach(r=>{
    const percent = total ? Math.round((r.count/total)*10000)/100 : 0;
    const container = document.createElement('div');
    container.className = 'result-row';
    container.innerHTML = `
      <div>
        <div style="font-weight:800">${r.name}</div>
        <div class="muted" style="color:#6b7280;font-size:0.9rem">${r.count} صوت • ${percent}%</div>
      </div>
      <div style="min-width:180px">
        <div class="progress"><div class="progress-bar" style="width:${percent}%;"></div></div>
      </div>
    `;
    resultsSummary.appendChild(container);
  });
}

downloadCsvBtn.addEventListener('click', ()=>{
  const arr = loadLocalVotes();
  if (!arr.length){ alert('لا توجد بيانات محلية للتصدير.'); return; }
  const rows = [['الاسم الرباعي','الهاتف','البريد الإلكتروني','المرشح','الطابع الزمني (ISO)']];
  arr.forEach(v=> rows.push([v.name,v.phone,v.email,v.candidate,v.timestamp]));
  const csv = rows.map(r=> r.map(c=> '"'+(c+'').replace(/"/g,'""')+'"').join(',')).join('\n');
  const blob = new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='votes_local_export.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
});

exportInstructionsBtn.addEventListener('click', ()=>{
  alert('لتجميع السجلات من بريد Gmail إلى CSV: افتح Gmail → في مربع البحث انسخ: subject:"تصويت - مدير عام مكتب الصحة - الضالع" ثم اختر Select all → اضغط الثلاث نقاط → اختر Download message -> ...\nإذا تريد أقدّم لك سكربت Google Sheets آلي يقوم بجلب الرسائل وتحويلها لصفحة. اكتب "CSV" للمتابعة.');
});

// تنفيذ العرض
renderLocalResults();

