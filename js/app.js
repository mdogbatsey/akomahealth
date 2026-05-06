/**
 * AkomaHealth — Core App Logic
 * ─────────────────────────────────────────────────────
 * All 10 clinical and utility modules:
 *
 *  go(id)              Navigate between screens
 *  openSOS/closeSOS    Emergency SOS bottom sheet
 *  toggleVoice()       Web Speech API for symptom input
 *  claude(sys, msgs)   Anthropic API client
 *                      ↳ Works in claude.ai (no key needed)
 *                      ↳ Standalone: set API_KEY = 'sk-ant-...'
 *  checkMalaria()      Malaria risk assessment
 *  checkMaternal()     Maternal danger sign triage
 *  renderANC()         ANC passport — called by i18n.js on lang change
 *  openAncModal()      Open ANC visit log modal
 *  saveAncVisit()      Save ANC data to localStorage (or Supabase)
 *  checkGrowth()       WHO Z-score child growth calculator
 *  selDrug/calcDose()  Weight-based dosing calculator (4 drugs)
 *  chwTab/logVisit()   CHW visit logger
 *  printRef()          Generate printable referral PDF
 *  renderMap()         Malaria outbreak heatmap
 *  showRegion()        Region detail panel
 *  startChat/sendChat()Health Q&A AI chat
 *  showFac()           Health facility finder
 *  DOMContentLoaded    Initialisation
 *
 * DATA STORAGE:
 *  localStorage is used for ANC passport and CHW history by default.
 *  To persist across devices, wire up the Supabase backend:
 *  see /backend/server.js and /backend/api.js
 */

const API_KEY = ''; /* ← Add your Anthropic API key: 'sk-ant-...' */
let currentDrug = 'art';
let ancData = JSON.parse(localStorage.getItem('anc_data')||'{}');
let chwVisits = JSON.parse(localStorage.getItem('chw_visits')||'[]');
let currentAncVisit = null;



function openSOS(){document.getElementById('sos-ov').classList.add('open')}
function closeSOS(){document.getElementById('sos-ov').classList.remove('open')}
function tc(el){el.classList.toggle('on')}
function chips(cont){return[...cont.querySelectorAll('.chip.on')].map(c=>c.textContent.trim())}

/* ── VOICE INPUT ── */
let recog=null,isRec=false;
function toggleVoice(btnId,outId){
  if(!('webkitSpeechRecognition'in window||'SpeechRecognition'in window)){
    document.getElementById(outId).textContent='Voice not supported in this browser';return;
  }
  const btn=document.getElementById(btnId);
  if(isRec){recog&&recog.stop();isRec=false;btn.classList.remove('rec');btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg> Speak symptoms';return;}
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  recog=new SR();
  recog.continuous=false;recog.interimResults=false;
  recog.lang=appLang==='tw'?'ak-GH':appLang==='ha'?'ha-NE':'en-GH';
  recog.onresult=e=>{
    const txt=e.results[0][0].transcript.toLowerCase();
    document.getElementById(outId).textContent='Heard: "'+txt+'"';
    const symMap={'fever':0,'chill':1,'shiver':1,'headache':2,'muscle':3,'pain':3,'vomit':4,'nausea':4,'fatigue':5,'tired':5,'sweat':6,'appetite':7,'confusion':8,'confused':8,'yellow':9,'jaundice':9};
    const chips=document.querySelectorAll('#malaria .chip');
    Object.entries(symMap).forEach(([k,i])=>{if(txt.includes(k))chips[i].classList.add('on')});
  };
  recog.onend=()=>{isRec=false;btn.classList.remove('rec');btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg> Speak symptoms'};
  recog.start();isRec=true;btn.classList.add('rec');btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg> Listening...';
}

/* ── CLAUDE API ── */
async function claude(system,messages){
  /* API_KEY is optional — claude.ai widget injects auth at network level.
     For standalone use, paste your key: const API_KEY = 'sk-ant-...' */
  const headers = {'Content-Type':'application/json','anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'};
  if(API_KEY) headers['x-api-key'] = API_KEY;
  const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers,body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:800,system,messages})});
  if(!r.ok){
    const e=await r.json().catch(()=>({}));
    const msg=e?.error?.message||'API error '+r.status;
    if(r.status===401) throw new Error('auth-error: '+msg);
    throw new Error(msg);
  }
  const d=await r.json();return d.content?.[0]?.text||'';
}

function rlevel(t){const l=t.toLowerCase();if(l.includes('high risk')||l.includes('emergency')||l.includes('call 112'))return'high';if(l.includes('medium risk')||l.includes('moderate'))return'medium';return'low'}
function rico(r){const c={'high':'<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>','medium':'<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>','low':'<polyline points="20 6 9 17 4 12"/>'};return`<svg style="width:12px;height:12px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">${c[r]}</svg>`}
function rhtml(r,label,text){return`<div class="rbox ${r}"><div class="rlbl">${rico(r)}${label}</div><div class="rtxt">${text}</div></div>`}
function errHtml(msg){return`<div class="rbox err"><div class="rtxt">⚠️ ${msg}</div></div>`}


function stripMd(text) {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')   /* **bold** → plain */
    .replace(/\*([^*]+)\*/g,   '$1')       /* *italic* → plain */
    .replace(/^---+$/gm,         '')          /* --- dividers → removed */
    .replace(/^#{1,6}\s+/gm,    '')          /* ## headings → plain */
    .replace(/`([^`]+)`/g,       '$1')        /* `code` → plain */
    .replace(/\n{3,}/g,         '\n\n')      /* collapse excess blank lines */
    .trim();
}

const langInstr={en:'Respond in English.',tw:'Respond in Twi (Akan language of Ghana).',ha:'Respond in Hausa.'};

/* ── MALARIA ── */
async function checkMalaria(){
  const age=document.getElementById('m-age').value,preg=document.getElementById('m-preg').value,dur=document.getElementById('m-dur').value,reg=document.getElementById('m-region').value;
  const syms=chips(document.querySelector('#malaria .sg'));
  if(!age||!dur||syms.length===0){alert('Please select age group, duration, and at least one symptom.');return}
  /* Age/pregnancy mismatch — warn inline but still proceed with assessment */
  const agePregnancyWarn = (age==='Under 5 years'||age==='5–17 years')&&preg==='Yes';
  const btn=document.getElementById('m-btn');btn.disabled=true;
  document.getElementById('m-load').style.display='block';
  /* Show inline age/pregnancy warning if applicable */
  document.getElementById('m-result').innerHTML = agePregnancyWarn
    ? '<div class="rbox err" style="margin-bottom:8px"><div class="rtxt">⚠️ Note: a child under 17 is unlikely to be pregnant. Please double-check these details before submitting.</div></div>'
    : '';
  const sys=`You are AkomaHealth, an AI health assistant for Ghana following WHO and GHS protocols. Assess malaria risk. First line must be exactly HIGH RISK, MEDIUM RISK, or LOW RISK. Then a plain-text explanation (2-3 sentences). Then numbered next steps (3-4). Extra caution for pregnant women and under-5s. Do NOT use markdown, asterisks, bold, italics, or horizontal lines. Plain text only. Max 200 words. ${langInstr[appLang]}`;
  try{
    const res=await claude(sys,[{role:'user',content:`Age:${age}\nPregnant:${preg}\nRegion:${reg}\nDuration:${dur}\nSymptoms:${syms.join(', ')}`}]);
    const cleaned=stripMd(res);
    const r=rlevel(cleaned);
    document.getElementById('m-result').innerHTML=rhtml(r,r==='high'?'High Risk':r==='medium'?'Medium Risk':'Low Risk',cleaned);
  }catch(e){
    let eMsg;
    if(e.message.includes('auth-error')||e.message.includes('401'))
      eMsg='API authentication failed. Add your Anthropic API key to the file, or open this app inside claude.ai.';
    else if(e.message.includes('Failed to fetch')||e.message.includes('NetworkError'))
      eMsg='Unable to connect. Check your internet connection and try again.';
    else
      eMsg='Something went wrong: '+e.message+'. Please try again.';
    document.getElementById('m-result').innerHTML=errHtml(eMsg);
  }
  btn.disabled=false;
  document.getElementById('m-load').style.display='none';
}

/* ── MATERNAL ── */
async function checkMaternal(){
  const who=document.getElementById('mat-who').value,stage=document.getElementById('mat-stage').value,concern=document.getElementById('mat-concern').value;
  const signs=chips(document.querySelector('#maternal .sg'));
  if(!who){alert('Please select who this is for.');return}
  const btn=document.getElementById('mat-btn');btn.disabled=true;
  document.getElementById('mat-load').style.display='block';
  document.getElementById('mat-result').innerHTML='';
  const sys=`You are AkomaHealth, a maternal health AI for Ghana using WHO and GHS protocols. First line must be exactly HIGH RISK, MEDIUM RISK, or LOW RISK. Brief compassionate plain-text explanation (2-3 sentences). Numbered next steps (3-4). If emergency signs present (bleeding, convulsions, no fetal movement, breathing difficulty), classify HIGH RISK and include "Call 112". Do NOT use markdown, asterisks, bold, or horizontal lines. Plain text only. Max 200 words. ${langInstr[appLang]}`;
  try{
    const res=await claude(sys,[{role:'user',content:`For:${who}\nStage:${stage||'not specified'}\nSigns:${signs.join(', ')||'None'}\nConcern:${concern||'None'}`}]);
    const cleaned2=stripMd(res);
    const r=rlevel(cleaned2);
    const lbl=r==='high'?'Emergency — Act Now':r==='medium'?'See a Clinician Soon':'Routine Care';
    document.getElementById('mat-result').innerHTML=rhtml(r,lbl,cleaned2);
  }catch(e){
    let eMsg2;
    if(e.message.includes('auth-error')||e.message.includes('401'))
      eMsg2='API authentication failed. Add your Anthropic API key to the file, or open this app inside claude.ai.';
    else if(e.message.includes('Failed to fetch')||e.message.includes('NetworkError'))
      eMsg2='Unable to connect. Check your internet connection and try again.';
    else
      eMsg2='Something went wrong: '+e.message+'. Please try again.';
    document.getElementById('mat-result').innerHTML=errHtml(eMsg2);
  }
  btn.disabled=false;document.getElementById('mat-load').style.display='none';
}

/* ── ANC PASSPORT ── */
const ANC_VISITS=[
  {n:'Visit 1',wk:'Before 12 weeks',tests:'Blood group, Hb, HIV, syphilis, urine dipstick, BP, weight, height',key:'v1'},
  {n:'Visit 2',wk:'16 weeks',tests:'BP, weight, urine, fetal growth, IPTp-SP dose 1',key:'v2'},
  {n:'Visit 3',wk:'20 weeks',tests:'Ultrasound scan, BP, urine, fetal movements, anaemia check',key:'v3'},
  {n:'Visit 4',wk:'24–26 weeks',tests:'BP, weight, urine, fundal height, IPTp-SP dose 2',key:'v4'},
  {n:'Visit 5',wk:'28 weeks',tests:'Hb check, BP, weight, fetal presentation, anti-D if Rh negative',key:'v5'},
  {n:'Visit 6',wk:'32 weeks',tests:'BP, weight, urine, fetal growth, IPTp-SP dose 3, birth plan discussion',key:'v6'},
  {n:'Visit 7',wk:'36 weeks',tests:'BP, weight, fetal presentation, birth readiness, facility confirmation',key:'v7'},
  {n:'Visit 8',wk:'40 weeks',tests:'Final BP check, fetal position, delivery planning, signs of labour',key:'v8'},
];
function openAncModal(key,idx){
  currentAncVisit=key;
  const d=ancData[key]||{};
  document.getElementById('anc-modal-title').textContent='Log — '+ANC_VISITS[idx].n+' ('+ANC_VISITS[idx].wk+')';
  document.getElementById('anc-date').value=d.date||'';
  document.getElementById('anc-facility').value=d.facility||'';
  document.getElementById('anc-notes').value=d.notes||'';
  document.getElementById('anc-weight').value=d.weight||'';
  document.getElementById('anc-modal').classList.add('open');
}
function closeAncModal(){document.getElementById('anc-modal').classList.remove('open')}
function saveAncVisit(){
  if(!currentAncVisit)return;
  ancData[currentAncVisit]={date:document.getElementById('anc-date').value,facility:document.getElementById('anc-facility').value,notes:document.getElementById('anc-notes').value,weight:document.getElementById('anc-weight').value};
  localStorage.setItem('anc_data',JSON.stringify(ancData));
  closeAncModal();renderANC();
}

/* ── GROWTH TRACKER ── */
const WHO={
  M:{med:[3.3,4.5,5.6,6.4,7.0,7.5,7.9,8.3,8.6,8.9,9.2,9.4,9.6,9.9,10.1,10.3,10.5,10.7,10.9,11.1,11.3,11.5,11.8,12.0,12.2,12.4,12.6,12.9,13.1,13.3,13.5,13.7,13.9,14.1,14.3,14.5,14.7,14.9,15.1,15.3,15.4,15.6,15.8,16.0,16.2,16.4,16.6,16.8,17.0,17.2,17.4,17.6,17.8,18.0,18.2,18.4,19.0,19.2,19.5,19.7,20.0],sd:[0.45,0.57,0.64,0.68,0.70,0.72,0.73,0.74,0.75,0.76,0.77,0.78,0.79,0.80,0.81,0.82,0.84,0.85,0.86,0.87,0.88,0.89,0.90,0.91,0.92,0.93,0.94,0.95,0.96,0.97,0.98,0.99,1.00,1.01,1.02,1.03,1.04,1.05,1.06,1.07,1.08,1.09,1.10,1.11,1.12,1.13,1.14,1.15,1.16,1.17,1.18,1.19,1.20,1.21,1.22,1.23,1.30,1.32,1.34,1.36,1.38]},
  F:{med:[3.2,4.2,5.1,5.8,6.4,6.9,7.3,7.6,7.9,8.2,8.5,8.7,8.9,9.2,9.4,9.6,9.8,10.0,10.2,10.4,10.6,10.9,11.1,11.3,11.5,11.7,11.9,12.1,12.3,12.5,12.7,12.9,13.1,13.3,13.5,13.7,13.9,14.1,14.2,14.4,14.6,14.8,15.0,15.2,15.4,15.6,15.8,16.0,16.2,16.4,16.6,16.8,17.0,17.2,17.4,17.6,18.0,18.2,18.4,18.6,18.8],sd:[0.40,0.50,0.57,0.61,0.64,0.65,0.66,0.67,0.68,0.69,0.70,0.71,0.72,0.73,0.74,0.75,0.77,0.78,0.79,0.80,0.81,0.82,0.83,0.84,0.85,0.86,0.87,0.88,0.89,0.90,0.91,0.92,0.93,0.94,0.95,0.96,0.97,0.98,0.99,1.00,1.01,1.02,1.03,1.04,1.05,1.06,1.07,1.08,1.09,1.10,1.11,1.12,1.13,1.14,1.15,1.16,1.22,1.24,1.26,1.28,1.30]}
};
function checkGrowth(){
  const sex=document.getElementById('g-sex').value,am=parseInt(document.getElementById('g-age').value),wt=parseFloat(document.getElementById('g-weight').value),ht=parseFloat(document.getElementById('g-height').value);
  if(!sex||isNaN(am)||isNaN(wt)||isNaN(ht)){alert('Please fill in all fields.');return}
  if(am<0||am>60){alert('Age must be 0–60 months.');return}
  const med=WHO[sex].med[am],sd=WHO[sex].sd[am],waz=(wt-med)/sd;
  const bmi=wt/((ht/100)**2);
  let st='normal',advice='';
  if(waz<-3||bmi<13){st='severe';advice='Refer to nearest health facility immediately for therapeutic feeding and clinical assessment. Do not delay.'}
  else if(waz<-2||bmi<15){st='moderate';advice='Visit your nearest CHPS compound for a MUAC measurement and nutrition counselling. Review diet and feeding practices.'}
  else{advice='Growth is within the healthy range. Continue monthly weighing at your CHPS compound and maintain a balanced diet.'}
  document.getElementById('g-result').innerHTML=`<div class="rbox ${st}"><div class="rlbl">${rico(st==='severe'?'high':st==='moderate'?'medium':'low')}${st==='severe'?'Severe Concern':st==='moderate'?'Moderate Concern':'Normal Range'}</div><div class="gmet"><div class="gmc"><div class="gmv">${waz.toFixed(1)}</div><div class="gml">Weight-for-Age Z</div></div><div class="gmc"><div class="gmv">${bmi.toFixed(1)}</div><div class="gml">BMI (kg/m²)</div></div></div><div style="margin-top:9px;font-size:12.5px;color:#333;line-height:1.7;font-weight:500">${advice}</div></div>`;
}

/* ── DOSING CALCULATOR ── */
const DRUGS={
  art:{name:'Artemether-Lumefantrine (Coartem)',unit:'tablets',note:'Give with food. 3-day course: 6 doses total (0h, 8h, then twice daily days 2–3).',maxNote:'Do not exceed adult dose of 4 tablets per dose.',calc:(w)=>{if(w<5)return null;if(w<15)return{dose:'1 tablet',freq:'Twice daily × 3 days',detail:'5–14 kg: 1 tab per dose (20/120mg)'};if(w<25)return{dose:'2 tablets',freq:'Twice daily × 3 days',detail:'15–24 kg: 2 tabs per dose'};if(w<35)return{dose:'3 tablets',freq:'Twice daily × 3 days',detail:'25–34 kg: 3 tabs per dose'};return{dose:'4 tablets',freq:'Twice daily × 3 days',detail:'≥35 kg: 4 tabs per dose (adult dose)'}}},
  para:{name:'Paracetamol (Acetaminophen)',unit:'mg',note:'Dose: 10–15 mg/kg every 4–6 hours as needed. Max 4 doses per 24 hours.',maxNote:'Do not exceed 60 mg/kg/day or 4,000 mg/day in adults.',calc:(w)=>{const lo=Math.round(w*10),hi=Math.round(w*15);return{dose:`${lo}–${hi} mg`,freq:'Every 4–6 hours as needed',detail:`Based on ${w} kg: 10 mg/kg = ${lo}mg, 15 mg/kg = ${hi}mg`}}},
  amox:{name:'Amoxicillin',unit:'mg',note:'Dose: 25 mg/kg/day in 2 divided doses (12 hourly) for 5–7 days.',maxNote:'Do not exceed 500 mg per dose in children.',calc:(w)=>{const total=Math.round(w*25),dose=Math.round(w*25/2);return{dose:`${dose} mg`,freq:'Every 12 hours × 5–7 days',detail:`Total daily dose: ${total} mg (${w} kg × 25 mg/kg)`}}},
  cot:{name:'Co-trimoxazole (Septrin)',unit:'mg',note:'Dose: 4 mg/kg trimethoprim component twice daily for 5 days.',maxNote:'Contraindicated in severe renal impairment and first trimester pregnancy.',calc:(w)=>{const dose=Math.round(w*4);return{dose:`${dose} mg TMP`,freq:'Twice daily × 5 days',detail:`Trimethoprim component: ${w} kg × 4 mg/kg = ${dose} mg`}}}
};
function selDrug(d,btn){currentDrug=d;document.querySelectorAll('.dt').forEach(b=>b.classList.remove('on'));btn.classList.add('on');calcDose()}
function calcDose(){
  const w=parseFloat(document.getElementById('d-weight').value);
  const out=document.getElementById('dose-out');
  if(!w||w<3){out.innerHTML='';return}
  const drug=DRUGS[currentDrug],res=drug.calc(w);
  if(!res){out.innerHTML='<div class="dose-max">⚠️ Weight too low for standard dosing. Refer to a health facility.</div>';return}
  out.innerHTML=`<div class="dose-res"><div class="dose-main">${res.dose} <span style="font-size:13px;color:#555;font-weight:500">per dose</span></div><div class="dose-det"><strong>${drug.name}</strong><br/>${res.freq}<br/>${res.detail}</div></div><div class="dose-warn">ℹ️ ${drug.note}</div><div class="dose-max">⚠️ ${drug.maxNote}</div>`;
}

/* ── CHW VISIT LOG ── */
function chwTab(t,btn){document.querySelectorAll('.cwt').forEach(b=>b.classList.remove('on'));btn.classList.add('on');document.querySelectorAll('.cwpanel').forEach(p=>p.classList.remove('on'));document.getElementById('cwp-'+t).classList.add('on')}
function logVisit(){
  const nm=document.getElementById('chw-name').value.trim();
  if(!nm){alert('Please enter the patient name.');return}
  const visit={id:Date.now(),name:nm,age:document.getElementById('chw-age').value,village:document.getElementById('chw-village').value,complaint:document.getElementById('chw-complaint').value,findings:document.getElementById('chw-findings').value,ref:document.getElementById('chw-ref').value,refFac:document.getElementById('chw-ref-fac').value,date:new Date().toLocaleDateString('en-GB')};
  chwVisits.unshift(visit);localStorage.setItem('chw_visits',JSON.stringify(chwVisits));
  ['chw-name','chw-age','chw-village','chw-complaint','chw-findings','chw-ref-fac'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('chw-ref').value='no';
  alert('Visit saved! View in Visit History.');
}
function renderHistory(){
  const el=document.getElementById('chw-history-list');
  if(!chwVisits.length){el.innerHTML='<div style="font-size:13px;color:#999;text-align:center;padding:2rem;font-weight:500">No visits logged yet.<br/>Log your first visit using the form.</div>';return}
  el.innerHTML=chwVisits.map(v=>`<div class="vc"><div class="vc-nm">${v.name}</div><div class="vc-meta">${v.age||'Age not recorded'} · ${v.village||'Location not recorded'} · ${v.date}</div><div class="vc-sum"><strong>Complaint:</strong> ${v.complaint||'—'}<br/><strong>Findings:</strong> ${v.findings||'—'}</div>${v.ref!=='no'?`<div class="ref-badge">${v.ref==='urgent'?'🚨 URGENT':'📋'} Referral: ${v.refFac||'Nearest facility'}</div><button class="pref-btn" onclick="printRef(${v.id})">Print Referral Note</button>`:''}</div>`).join('');
}
function printRef(id){
  const v=chwVisits.find(x=>x.id===id);if(!v)return;
  const w=window.open('','_blank','width=600,height=700');
  w.document.write(`<!DOCTYPE html><html><head><title>Referral Note</title><style>body{font-family:Arial,sans-serif;padding:30px;max-width:500px}h1{color:#E65100;font-size:18px;border-bottom:2px solid #E65100;padding-bottom:8px}h2{color:#333;font-size:14px;margin-top:16px}p{font-size:13px;color:#444;line-height:1.6;margin:4px 0}.urgent{background:#FFEBEE;border:2px solid #C62828;padding:10px;border-radius:8px;color:#C62828;font-weight:bold;margin-bottom:16px}.footer{margin-top:24px;font-size:11px;color:#999;border-top:1px solid #ddd;padding-top:10px}</style></head><body>${v.ref==='urgent'?'<div class="urgent">🚨 URGENT REFERRAL — Please see this patient immediately</div>':''}<h1>AkomaHealth Referral Note</h1><h2>Patient Information</h2><p><strong>Name:</strong> ${v.name}</p><p><strong>Age/Sex:</strong> ${v.age||'Not recorded'}</p><p><strong>Community:</strong> ${v.village||'Not recorded'}</p><p><strong>Date:</strong> ${v.date}</p><h2>Clinical Information</h2><p><strong>Chief Complaint:</strong> ${v.complaint||'—'}</p><p><strong>Findings &amp; Action Taken:</strong> ${v.findings||'—'}</p><h2>Referral</h2><p><strong>Refer to:</strong> ${v.refFac||'Nearest appropriate health facility'}</p><p><strong>Referral type:</strong> ${v.ref==='urgent'?'URGENT — same day':'Routine referral'}</p><div class="footer">Generated by AkomaHealth · Ghana Health Service aligned · Not a substitute for clinical assessment</div></body></html>`);
  w.document.close();w.print();
}

/* ── GHANA OUTBREAK MAP ── */
const REGIONS=[
  {n:'Northern',r:'H',cases:847,trend:'↑',advice:'High transmission season. Ensure bednet use and seek RDT immediately if fever develops.'},
  {n:'Upper East',r:'H',cases:712,trend:'↑',advice:'High risk. IPTp-SP uptake at ANC critical for pregnant women. Early treatment essential.'},
  {n:'Upper West',r:'H',cases:689,trend:'→',advice:'Sustained high risk. IRS campaign ongoing. All children should sleep under ITN.'},
  {n:'Savannah',r:'H',cases:534,trend:'↑',advice:'Rising cases. CHPS compounds have RDTs available. Do not delay treatment.'},
  {n:'N. East',r:'M',cases:312,trend:'→',advice:'Moderate risk. Peak season approaching. Preventive measures essential now.'},
  {n:'Oti',r:'M',cases:287,trend:'↓',advice:'Improving but remain cautious. Continue bednet use and seek care early.'},
  {n:'Bono East',r:'M',cases:256,trend:'→',advice:'Moderate transmission. IPTp-SP available at all CHPS compounds.'},
  {n:'Bono',r:'M',cases:234,trend:'↓',advice:'Declining trend. Maintain preventive measures to sustain progress.'},
  {n:'Ahafo',r:'L',cases:145,trend:'↓',advice:'Low risk currently. Continue ITN use and report any fever promptly.'},
  {n:'Ashanti',r:'M',cases:389,trend:'→',advice:'Urban-rural variation. Kumasi peri-urban areas have higher risk. Seek early diagnosis.'},
  {n:'Eastern',r:'L',cases:167,trend:'↓',advice:'Low risk. Maintain surveillance. Travellers from high-risk areas should seek testing.'},
  {n:'Gt. Accra',r:'L',cases:134,trend:'↓',advice:'Low urban risk. Migrants from north should maintain vigilance.'},
  {n:'Central',r:'L',cases:189,trend:'→',advice:'Low-moderate risk in coastal areas. Seek diagnosis promptly if fever develops.'},
  {n:'Western',r:'M',cases:223,trend:'→',advice:'Moderate risk in forest areas. Miners and farmers at higher risk. Use protection.'},
  {n:'W. North',r:'M',cases:245,trend:'↑',advice:'Increasing risk. Forest zone. Bednet use critical, especially for children.'},
  {n:'Volta',r:'L',cases:178,trend:'↓',advice:'Low risk. Lake Volta area requires caution. Monitor for any fever.'},
];
function renderMap(){
  document.getElementById('ghana-map').innerHTML=REGIONS.map((r,i)=>`<div class="rc ${r.r}" onclick="showRegion(${i})"><div class="rn">${r.n}</div><div class="rl">${r.r==='H'?'High':r.r==='M'?'Medium':'Low'} ${r.trend}</div></div>`).join('');
}
function showRegion(i){
  const r=REGIONS[i],d=document.getElementById('map-detail');
  d.className='map-detail open';
  d.innerHTML=`<div class="md-title">${r.n} Region — ${r.r==='H'?'HIGH RISK':r.r==='M'?'MEDIUM RISK':'LOW RISK'} ${r.trend}</div><div class="md-body">📊 Reported cases this month: <strong>${r.cases.toLocaleString()}</strong><br/><br/>📋 <strong>Public health advice:</strong> ${r.advice}</div>`;
}

/* ── HEALTH CHAT ── */
let chatHist=[];
const CHAT_SYS=`You are AkomaHealth, a compassionate AI health assistant for Ghana. Follow WHO guidelines and GHS protocols. Give practical, actionable advice relevant to Ghana's context and health system. Mention CHPS compounds or clinics when relevant. For emergencies, advise calling 112. Keep responses under 150 words. Be warm and reassuring. Do NOT use markdown, asterisks, bold, bullet points, or horizontal lines. Write in plain conversational sentences only. If asked a question in Twi or Hausa, respond in the same language.`;
function startChat(el){document.getElementById('chat-starters').style.display='none';document.getElementById('chat-in').value=el.textContent;sendChat()}
async function sendChat(){
  const inp=document.getElementById('chat-in'),txt=inp.value.trim();
  if(!txt)return;inp.value='';
  document.getElementById('chat-starters').style.display='none';
  const msgs=document.getElementById('chat-msgs');
  msgs.innerHTML+=`<div class="msg u">${txt}</div><div class="msg t" id="typing">Thinking...</div>`;
  msgs.scrollTop=msgs.scrollHeight;
  const sb=document.getElementById('chat-sb');sb.disabled=true;
  chatHist.push({role:'user',content:`[User language preference: ${appLang}] ${txt}`});
  try{
    const rep=await claude(CHAT_SYS,chatHist);
    chatHist.push({role:'assistant',content:rep});
    document.getElementById('typing').remove();
    msgs.innerHTML+=`<div class="msg a">${stripMd(rep)}</div>`;
  }catch(e){
    document.getElementById('typing').remove();
    msgs.innerHTML+=`<div class="msg a" style="color:#999">⚠️ ${e.message.includes('no-key')?'Add your API key to enable chat.':'Connection error. Try again.'}</div>`;
  }
  sb.disabled=false;msgs.scrollTop=msgs.scrollHeight;
}

/* ── FACILITY DATABASE ── */
const FACS={
  'northern':[{n:'Tamale Teaching Hospital',t:'Teaching Hospital',p:'037 202 2425',i:'24hr emergency · trauma · maternal care'},{n:'Tamale Central Hospital',t:'Regional Hospital',p:'037 202 0401',i:'Malaria · maternal & child health'},{n:'Yendi Municipal Hospital',t:'Municipal Hospital',p:'037 209 2001',i:'General & maternity'},{n:'Tolon District Hospital',t:'District Hospital',p:'037 209 5010',i:'All primary care services'}],
  'upper-east':[{n:'Bolgatanga Regional Hospital',t:'Regional Hospital',p:'038 202 1065',i:'24hr emergency · all specialties'},{n:'Bawku Presbyterian Hospital',t:'Mission Hospital',p:'038 202 2350',i:'Maternal & child health'},{n:'Navrongo War Memorial Hospital',t:'District Hospital',p:'038 209 2072',i:'General & maternity'}],
  'upper-west':[{n:'Wa Regional Hospital',t:'Regional Hospital',p:'039 202 0543',i:'24hr emergency · all specialties'},{n:'Jirapa District Hospital',t:'District Hospital',p:'039 209 2010',i:'General & maternity'},{n:'Lawra District Hospital',t:'District Hospital',p:'039 209 2050',i:'General care'}],
  'savannah':[{n:'Damongo District Hospital',t:'District Hospital',p:'037 209 7001',i:'General & malaria care'},{n:'Bole District Hospital',t:'District Hospital',p:'037 209 7020',i:'Primary & maternity care'}],
  'north-east':[{n:'Nalerigu Government Hospital',t:'District Hospital',p:'037 209 8010',i:'General & emergency care'},{n:'Gambaga Government Hospital',t:'District Hospital',p:'037 209 8050',i:'Primary care'}],
  'oti':[{n:'Dambai District Hospital',t:'District Hospital',p:'037 209 9001',i:'General & maternity'},{n:'Nkwanta South District Hospital',t:'District Hospital',p:'037 209 9020',i:'Primary care'}],
  'bono-east':[{n:'Techiman Holy Family Hospital',t:'Mission Hospital',p:'035 209 2001',i:'Maternal & child health specialty'},{n:'Kintampo Municipal Hospital',t:'Municipal Hospital',p:'035 209 2050',i:'General & malaria care'}],
  'bono':[{n:'Sunyani Regional Hospital',t:'Regional Hospital',p:'035 202 2001',i:'24hr emergency · all specialties'},{n:'Wenchi Methodist Hospital',t:'Mission Hospital',p:'035 209 4001',i:'Maternal & child health'}],
  'ahafo':[{n:'Goaso Government Hospital',t:'District Hospital',p:'035 209 6001',i:'General & emergency care'},{n:'Bechem Government Hospital',t:'District Hospital',p:'035 209 6050',i:'Primary care'}],
  'ashanti':[{n:'Komfo Anokye Teaching Hospital',t:'Teaching Hospital',p:'051 202 2301',i:'Largest in Ashanti · all specialties'},{n:'Manhyia District Hospital',t:'District Hospital',p:'051 202 2050',i:'General & maternity'},{n:'Okomfo Anokye Rural Hospital',t:'District Hospital',p:'051 209 3001',i:'Rural primary care'}],
  'eastern':[{n:'Eastern Regional Hospital',t:'Regional Hospital',p:'034 202 2001',i:'24hr emergency · all specialties'},{n:'St. Joseph Hospital Koforidua',t:'Mission Hospital',p:'034 202 2150',i:'Maternal & child health'},{n:'Atibie Government Hospital',t:'District Hospital',p:'034 209 5001',i:'Primary care'}],
  'accra':[{n:'Korle Bu Teaching Hospital',t:'Teaching Hospital',p:'030 268 4570',i:'Largest hospital in Ghana'},{n:'37 Military Hospital',t:'Military Hospital',p:'030 277 6111',i:'Open to civilians · 24hr emergency'},{n:'Ridge Hospital',t:'Regional Hospital',p:'030 226 3271',i:'Maternal & child health'},{n:'Tema General Hospital',t:'Municipal Hospital',p:'030 320 2001',i:'All services · east Accra'}],
  'central':[{n:'Cape Coast Teaching Hospital',t:'Teaching Hospital',p:'033 202 3321',i:'24hr emergency · all specialties'},{n:'Saltpond Municipal Hospital',t:'Municipal Hospital',p:'033 209 2001',i:'General & maternity'}],
  'western':[{n:'Effia-Nkwanta Regional Hospital',t:'Regional Hospital',p:'031 202 2021',i:'24hr emergency · all specialties'},{n:'Takoradi Hospital',t:'Municipal Hospital',p:'031 202 2200',i:'General & maternity care'}],
  'western-north':[{n:'Bibiani Government Hospital',t:'District Hospital',p:'031 209 5001',i:'General & emergency care'},{n:'Sefwi Wiawso Government Hospital',t:'District Hospital',p:'031 209 6001',i:'Primary care'}],
  'volta':[{n:'Ho Teaching Hospital',t:'Teaching Hospital',p:'036 202 2001',i:'24hr emergency · all specialties'},{n:'Ketu South Municipal Hospital',t:'Municipal Hospital',p:'036 209 5001',i:'General & maternity'},{n:'Hohoe Municipal Hospital',t:'Municipal Hospital',p:'036 209 2001',i:'All services'}]
};
const phoneico=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8 19.79 19.79 0 01.21 1.18 2 2 0 012.22 0H5.18a2 2 0 012 1.72c.13 1 .37 1.97.71 2.91a2 2 0 01-.45 2.11L6.18 7.96a16 16 0 006.86 6.86l1.22-1.22a2 2 0 012.11-.45c.94.34 1.91.58 2.91.71A2 2 0 0122 16.92z"/></svg>`;
const infoico=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
function showFac(r){
  const el=document.getElementById('fac-list');if(!r){el.innerHTML='';return}
  el.innerHTML=(FACS[r]||[]).map(f=>`<div class="fc"><div class="fc-type">${f.t}</div><div class="fc-name">${f.n}</div><div class="fc-meta"><span>${phoneico}${f.p}</span><span>${infoico}${f.i}</span></div></div>`).join('');
}

/* ── INIT ── */
document.addEventListener('DOMContentLoaded',()=>{
  /* v5 chat input */
  const ci=document.getElementById('chat-in');
  if(ci){
    ci.addEventListener('keydown',e=>{
      if(e.key==='Enter'&&!e.shiftKey){
        e.preventDefault();
        /* Route to correct chat handler based on active screen */
        const mcChat = document.getElementById('mc-chat');
        if(mcChat && mcChat.classList.contains('active')) mcSendMessage();
        else sendChat();
      }
    });
  }
  /* Initialize dosing calculator */
  calcDose();
  /* Initialize Mama Circle milestone grid */
  buildMilestoneGrid();
  /* Null-safe anon name */
  const mnEl = document.getElementById('my-anon-name');
  if(mnEl) mnEl.textContent = 'You are: ' + MY_NAME;
});