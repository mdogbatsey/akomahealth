/**
 * AkomaHealth — Mama Circle Community Feature
 */

/* ══════════════════════════════════════════════
   MAMA CIRCLE — COMMUNITY FEATURES
══════════════════════════════════════════════ */

 /* ← Add your Anthropic API key */

/* ── Anonymous identity ── */
const FLOWER_NAMES = ['Abena','Akosua','Ama','Adwoa','Yaa','Efua','Afia','Akua','Awura','Afua','Esi','Araba','Akuvi','Mawusi','Sefakor','Akusika','Gifty','Abiba','Hawa','Fatima','Zainab','Aisha'];
const FLOWER_TYPES = ['Rose','Lily','Jasmine','Lotus','Orchid','Hibiscus','Bougainvillea','Sunflower','Daisy','Marigold','Azalea','Tulip'];

function getAnonName() {
  let name = localStorage.getItem('mc_anon_name');
  if (!name) {
    const fn = FLOWER_NAMES[Math.floor(Math.random()*FLOWER_NAMES.length)];
    const fl = FLOWER_TYPES[Math.floor(Math.random()*FLOWER_TYPES.length)];
    const num = Math.floor(Math.random()*900)+100;
    name = `${fn} ${fl} #${num}`;
    localStorage.setItem('mc_anon_name', name);
  }
  return name;
}
const MY_NAME = getAnonName();
/* anon name set in DOMContentLoaded below */

function showNameInfo() {
  alert(`Your anonymous name is:\n\n"${MY_NAME}"\n\nThis name is randomly generated and only visible to you. No one in the circle can identify who you are.`);
}

/* ── Screen navigation ── */
let currentCircle = 'northern';
let hasJoined = localStorage.getItem('mc_joined') === 'true';
let selectedTopic = 'all';
let selectedMilestone = null;

function go(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function mcEnterCircle(type) {
  currentCircle = type;
  if (!hasJoined) { go('mc-rules'); return; }
  loadChat(type);
  go('mc-chat');
}

function mcJoinCircle() {
  hasJoined = true;
  localStorage.setItem('mc_joined', 'true');
  loadChat(currentCircle);
  go('mc-chat');
}

/* ── Circle config ── */
const CIRCLES = {
  northern:   { name: 'Northern Mamas Circle', sub: '247 members · 12 online', online: 12 },
  pregnancy:  { name: '🤰 Pregnancy Journey', sub: '1,024 members · 28 online', online: 28 },
  feeding:    { name: '🍼 Feeding & Nutrition', sub: '876 members · 8 online', online: 8 },
  malaria:    { name: '🦟 Malaria & Fever', sub: '654 members · 15 online', online: 15 },
  mental:     { name: '💛 Mental Health', sub: '432 members · 6 online', online: 6 },
  milestones: { name: '🎉 Baby Milestones', sub: '1,247 members · 24 online', online: 24 },
};

/* ── Avatar colours ── */
const AVATAR_COLORS = [
  ['#EDE7F6','#7B1FA2'],['#FCE4EC','#C2185B'],['#E8F5E9','#2E7D32'],
  ['#E3F2FD','#185FA5'],['#FFF8E7','#E65100'],['#F3E5F5','#6A1B9A'],
];
function avatarColor(name) {
  const i = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[i];
}
function initials(name) { return name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase(); }

/* ── Message store ── */
const MSG_STORE = {};

/* ── Seed messages per circle ── */
const SEED_MSGS = {
  northern: [
    { id:1, sender:'Akosua Hibiscus #312', role:'member', topic:'pregnancy', time:'9:14am', text:'Good morning mamas! I am 28 weeks today and feeling so grateful. My ANC visit went well yesterday — my BP was normal and the baby is a good size.', reactions:[{e:'❤️',n:8,me:false},{e:'🙏',n:5,me:false}] },
    { id:2, sender:'CHW Abena (Tolon CHPS)', role:'chw', topic:'pregnancy', time:'9:22am', text:'Good morning Akosua! 28 weeks is a great milestone. Remember to keep counting those kicks — 10 kicks in 2 hours is what we look for. Also make sure you collect your next IPTp-SP dose at your next visit.', reactions:[{e:'❤️',n:12,me:false},{e:'💪',n:4,me:false}] },
    { id:3, sender:'Gifty Orchid #089', role:'member', topic:'malaria', time:'10:05am', text:'Hello mamas — my 18-month-old has had fever since yesterday. I used the AkomaHealth malaria checker and it said medium risk. I went to CHPS this morning, the RDT was positive. She is now on treatment. Please do not ignore fever, especially in this season.', reactions:[{e:'🙏',n:15,me:false},{e:'💪',n:7,me:false}] },
    { id:4, sender:'AkomaHealth AI', role:'ai', topic:'malaria', time:'10:08am', text:'Thank you for sharing this, Gifty. You did exactly the right thing. For all mamas: during the rainy season, malaria risk goes up significantly. If your child has fever above 37.5°C, please use the AkomaHealth malaria checker and visit your CHPS compound for a rapid test. Early treatment saves lives.', reactions:[{e:'❤️',n:6,me:false}] },
    { id:5, sender:'Efua Lotus #441', role:'member', topic:'milestone', time:'11:30am', text:'', isMilestone:true, milestone:{ icon:'🎂', title:'Baby turned 1 year old!', msg:'My little girl Abena is 1 today! I cannot believe how fast this year went. From struggling to breastfeed at the beginning to now eating fufu and soup with us!', week:'1 year old milestone' }, reactions:[{e:'🎉',n:23,me:false},{e:'❤️',n:18,me:false}] },
    { id:6, sender:'Yaa Sunflower #203', role:'member', topic:'mental', time:'2:15pm', text:'Can I be honest mamas? Some days pregnancy feels so hard. My husband travels for work, I have two children at home already and I am 34 weeks. I love this baby but I am so tired.', reactions:[{e:'❤️',n:19,me:false},{e:'🙏',n:11,me:false}] },
    { id:7, sender:'AkomaHealth AI', role:'ai', topic:'mental', time:'2:18pm', text:'Yaa, thank you for trusting this circle with your honest feelings. What you are describing — exhaustion, loneliness, feeling overwhelmed — is very real and very common. You are carrying so much, and that takes strength.\n\nPlease know: you are not a bad mama for feeling this way. If these feelings become very heavy or you feel hopeless, please speak with your CHW or call the GHS line at 0800 111 222. You deserve support too.', reactions:[{e:'❤️',n:31,me:false},{e:'🙏',n:17,me:false}] },
    { id:8, sender:'Akosua Hibiscus #312', role:'member', topic:'mental', time:'2:25pm', text:'Yaa we see you. We are here. 34 weeks — you are so close. One more visit and you will hold your baby. We are praying for you.', reactions:[{e:'🙏',n:14,me:false},{e:'❤️',n:9,me:false}] },
  ],
  pregnancy:[
    { id:1, sender:'Ama Jasmine #567', role:'member', topic:'pregnancy', time:'8:30am', text:'Good morning! I am 20 weeks and just had my scan. The radiographer showed me the baby moving and I cried! She said everything looks healthy. First-time mama here and I was so nervous.', reactions:[{e:'❤️',n:24,me:false},{e:'🎉',n:11,me:false}] },
    { id:2, sender:'AkomaHealth AI', role:'ai', topic:'pregnancy', time:'8:35am', text:'Congratulations Ama! The 20-week scan is such a special moment. At 20 weeks, your baby can hear sounds and may even respond to your voice. Talk to your baby — she knows you already!\n\n💡 Health tip: This is also a great time to discuss birth preparedness with your health worker — plan which facility you will deliver at and how you will get there.', reactions:[{e:'❤️',n:15,me:false}] },
    { id:3, sender:'Adwoa Rose #129', role:'member', topic:'pregnancy', time:'9:45am', text:'I am 36 weeks and I have had so much back pain this week. Is this normal? I am worried.', reactions:[] },
    { id:4, sender:'CHW Abena (Tolon CHPS)', role:'chw', topic:'pregnancy', time:'9:52am', text:'Adwoa — some back pain at 36 weeks is very normal as baby is growing and pressing on your back. However, please go to your nearest health facility TODAY if the pain is very severe, comes in waves, or is accompanied by bleeding, water breaking, or strong cramps. At 36 weeks these could be signs of early labour.', reactions:[{e:'❤️',n:8,me:false},{e:'🙏',n:6,me:false}] },
  ],
  feeding:[
    { id:1, sender:'Afua Daisy #334', role:'member', topic:'feeding', time:'10:00am', text:'My baby is 4 months and I am struggling with breastfeeding. My supply feels low. Has anyone experienced this?', reactions:[{e:'❤️',n:11,me:false}] },
    { id:2, sender:'AkomaHealth AI', role:'ai', topic:'feeding', time:'10:05am', text:'Low milk supply is one of the most common worries for breastfeeding mamas, but true low supply is actually rare. Most often, it is a perception issue. A few things that really help:\n\n1. Feed on demand — the more baby feeds, the more milk you make\n2. Make sure baby has a deep latch — a shallow latch means less milk is removed\n3. Drink plenty of water and eat enough — your body needs the energy\n4. Rest when you can — stress and tiredness reduce supply\n\nIf you are truly concerned, your CHW or nearest clinic can assess baby\'s weight gain to confirm if supply is sufficient.', reactions:[{e:'❤️',n:18,me:false},{e:'💪',n:9,me:false}] },
  ],
  malaria:[
    { id:1, sender:'Hawa Marigold #551', role:'member', topic:'malaria', time:'7:45am', text:'Mamas please use your bednets EVERY night. My 3-year-old slept without his one night last week and now he has malaria. He is on treatment but it has been a very hard few days. Please do not take chances.', reactions:[{e:'🙏',n:28,me:false},{e:'💪',n:12,me:false}] },
    { id:2, sender:'AkomaHealth AI', role:'ai', topic:'malaria', time:'7:50am', text:'Thank you for this important reminder, Hawa. We are praying for your son\'s quick recovery.\n\n🦟 For all mamas in the Northern and Upper regions — we are in peak malaria season. Please:\n• Sleep every night under an insecticide-treated net (ITN)\n• Remove any standing water near your home\n• Visit CHPS immediately if anyone has fever\n\nPregnant women: do not miss your IPTp-SP dose at your next ANC visit.', reactions:[{e:'❤️',n:22,me:false}] },
  ],
  mental:[
    { id:1, sender:'Zainab Bougainvillea #778', role:'member', topic:'mental', time:'11:00am', text:'Mama Circle — can we talk about postpartum? My baby is 6 weeks old and I cry every day. I love her but I feel empty. Is something wrong with me?', reactions:[{e:'❤️',n:35,me:false},{e:'🙏',n:20,me:false}] },
    { id:2, sender:'AkomaHealth AI', role:'ai', topic:'mental', time:'11:03am', text:'Zainab, nothing is wrong with you. What you are describing sounds like postpartum blues or possibly postpartum depression — both are real medical conditions, not weakness, not bad mothering.\n\nYou were brave to share this here. Please:\n\n1. Tell your CHW or clinic nurse about these feelings at your postnatal check\n2. Ask someone you trust to sit with you today\n3. If you feel like harming yourself or your baby, call 112 immediately\n\nYou brought a life into the world. You deserve care too. 💛', reactions:[{e:'❤️',n:41,me:false},{e:'🙏',n:27,me:false}] },
    { id:3, sender:'CHW Abena (Tolon CHPS)', role:'chw', topic:'mental', time:'11:10am', text:'Zainab — I am pinning this to the top of the group. Please reach out to me directly. Postpartum depression is a medical condition and you can be helped. You are not alone in this circle or in Ghana.', reactions:[{e:'❤️',n:33,me:false}], pinned:true },
  ],
  milestones:[
    { id:1, sender:'Efua Lotus #441', role:'member', topic:'milestone', time:'8:00am', text:'', isMilestone:true, milestone:{ icon:'🎂', title:'Baby turned 1 year old!', msg:'My little Abena took her first independent steps this morning! I was making breakfast and turned around and there she was — walking to me!', week:'12 months' }, reactions:[{e:'🎉',n:45,me:false},{e:'❤️',n:38,me:false}] },
    { id:2, sender:'Akua Azalea #223', role:'member', topic:'milestone', time:'9:30am', text:'', isMilestone:true, milestone:{ icon:'🤰', title:'Week 36 reached!', msg:'Just 4 more weeks to meet my baby. I started packing my hospital bag today as the CHW advised. Feeling ready and scared at the same time!', week:'Week 36' }, reactions:[{e:'💪',n:29,me:false},{e:'🙏',n:14,me:false}] },
    { id:3, sender:'Araba Tulip #602', role:'member', topic:'milestone', time:'2:00pm', text:'', isMilestone:true, milestone:{ icon:'💉', title:'All vaccinations up to date!', msg:'Took baby Kofi for his 6-month vaccinations today. He cried for 2 minutes then smiled at the nurse! Mama was the one who needed to be comforted 😂', week:'6 months' }, reactions:[{e:'❤️',n:22,me:false},{e:'🎉',n:17,me:false}] },
  ],
};

/* ── MEMBERS per circle ── */
const MEMBERS_DATA = [
  { name:'CHW Abena Mensah', role:'Community Health Worker · Tolon CHPS', badge:'chw', color:['#E3F2FD','#185FA5'] },
  { name:'Nurse Fatima Alhassan', role:'Moderator · Tamale Central Hospital', badge:'mod', color:['#FFF3E0','#E65100'] },
  { name:'Akosua Hibiscus #312', role:'Member since March 2025', badge:null, color:['#EDE7F6','#7B1FA2'] },
  { name:'Gifty Orchid #089', role:'Member · Pregnant, 24 weeks', badge:null, color:['#FCE4EC','#C2185B'] },
  { name:'Efua Lotus #441', role:'Member · Baby: 12 months', badge:null, color:['#E8F5E9','#2E7D32'] },
  { name:'Yaa Sunflower #203', role:'Member · Pregnant, 34 weeks', badge:null, color:['#FFF8E7','#E65100'] },
  { name:'Adwoa Rose #129', role:'Member · Pregnant, 36 weeks', badge:null, color:['#F3E5F5','#6A1B9A'] },
  { name:MY_NAME, role:'You · Active member', badge:null, color:['#FCE4EC','#C2185B'] },
  { name:'Hawa Marigold #551', role:'Member · Baby: 3 years', badge:null, color:['#E0F2F1','#00695C'] },
  { name:'Zainab Bougainvillea #778', role:'Member · Postpartum, 6 weeks', badge:null, color:['#E3F2FD','#0D47A1'] },
];

/* ── MILESTONES ── */
const MILESTONES = [
  { icon:'🤰', label:'Pregnancy week', prompt:'Share which week you reached' },
  { icon:'🏥', label:'ANC visit done', prompt:'Which visit did you complete?' },
  { icon:'👶', label:'Baby arrived!', prompt:'Share your baby\'s arrival' },
  { icon:'🍼', label:'Breastfeeding win', prompt:'Share your feeding milestone' },
  { icon:'💉', label:'Vaccinations done', prompt:'Which vaccines did baby get?' },
  { icon:'👣', label:'First steps!', prompt:'Baby is walking!' },
  { icon:'🎂', label:'Birthday!', prompt:'How old is baby?' },
  { icon:'🏋️', label:'Healthy weight', prompt:'Baby\'s weight milestone' },
  { icon:'💪', label:'Mama\'s strength', prompt:'Something you overcame' },
];

function buildMilestoneGrid() {
  document.getElementById('ms-grid').innerHTML = MILESTONES.map((m,i) =>
    `<div class="ms-opt" onclick="selectMilestone(${i},this)">
      <span class="ms-opt-icon">${m.icon}</span>
      <div class="ms-opt-lbl">${m.label}</div>
    </div>`
  ).join('');
}
/* buildMilestoneGrid called in DOMContentLoaded below */

function selectMilestone(i, el) {
  document.querySelectorAll('.ms-opt').forEach(e => e.classList.remove('sel'));
  el.classList.add('sel');
  selectedMilestone = MILESTONES[i];
}

function openMilestone() { document.getElementById('ms-modal').classList.add('open'); }
function closeMilestone() { document.getElementById('ms-modal').classList.remove('open'); selectedMilestone = null; document.querySelectorAll('.ms-opt').forEach(e => e.classList.remove('sel')); }

function postMilestone() {
  if (!selectedMilestone) { alert('Please select a milestone type.'); return; }
  const inp = document.getElementById('chat-in');
  const note = inp.value.trim();
  addMessage({
    id: Date.now(), sender: MY_NAME, role:'member', topic:'milestone', time: now(),
    isMilestone:true,
    milestone:{ icon:selectedMilestone.icon, title:selectedMilestone.label, msg: note||selectedMilestone.prompt, week:'' },
    reactions:[]
  });
  inp.value='';
  closeMilestone();
}

/* ── Load chat ── */
function loadChat(type) {
  const c = CIRCLES[type] || CIRCLES.northern;
  document.getElementById('chat-title').textContent = c.name;
  document.getElementById('chat-sub').textContent = c.sub;
  document.getElementById('online-count').textContent = c.online;
  if (!MSG_STORE[type]) MSG_STORE[type] = [...(SEED_MSGS[type]||SEED_MSGS.northern)];
  renderMessages(type);
}

/* ── Render messages ── */
function renderMessages(type) {
  const msgs = document.getElementById('chat-msgs');
  const data = (MSG_STORE[type]||[]).filter(m => selectedTopic==='all'||m.topic===selectedTopic||m.isMilestone);
  msgs.innerHTML = '';
  if (!data.length) { msgs.innerHTML = '<div style="text-align:center;padding:2rem;font-size:13px;color:#bbb;font-weight:500">No messages in this topic yet.<br/>Be the first to share!</div>'; return; }
  data.forEach(m => msgs.appendChild(buildMsgEl(m)));
  msgs.scrollTop = msgs.scrollHeight;
}

function buildMsgEl(m) {
  const isMe = m.sender === MY_NAME;
  const wrapper = document.createElement('div');

  if (m.isMilestone) {
    wrapper.innerHTML = `
      <div style="margin:6px 0">
        <div class="bubble milestone-b">
          <span class="milestone-icon">${m.milestone.icon}</span>
          <div class="milestone-title">${m.milestone.title}</div>
          <div class="milestone-msg">${m.milestone.msg}</div>
          ${m.milestone.week?`<div class="milestone-week">${m.milestone.week}</div>`:''}
          <div style="font-size:10.5px;color:#9C27B0;margin-top:6px;font-weight:600">${m.sender} · ${m.time}</div>
        </div>
        ${buildReactions(m)}
      </div>`;
    return wrapper;
  }

  if (m.role==='ai'||m.role==='chw'||m.role==='alert') {
    const bCls = m.role==='ai'?'ai-b':m.role==='chw'?'chw-b':'alert-b';
    const nCls = m.role==='ai'?'ai-name':m.role==='chw'?'chw-name':'';
    const nameLbl = m.role==='ai'?'AkomaHealth AI 🤖':m.sender;
    if (m.isAlert) {
      wrapper.innerHTML=`<div class="bubble alert-b" style="margin:6px 0">
        <span class="alert-icon">⚠️</span>
        <div class="alert-title">We're here for you</div>
        <div class="alert-msg">It sounds like you may need support. Emergency help is available.</div>
        <a href="tel:112"><button class="alert-call-btn"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8 19.79 19.79 0 01.21 1.18 2 2 0 012.22 0H5.18a2 2 0 012 1.72c.13 1 .37 1.97.71 2.91a2 2 0 01-.45 2.11L6.18 7.96a16 16 0 006.86 6.86l1.22-1.22a2 2 0 012.11-.45c.94.34 1.91.58 2.91.71A2 2 0 0122 16.92z"/></svg>Call 112</button></a>
      </div>`;
      return wrapper;
    }
    const [bg,fg] = m.role==='ai'?['#C8E6C9','#1B5E20']:['#BBDEFB','#0D47A1'];
    wrapper.innerHTML=`<div style="display:flex;align-items:flex-start;gap:7px;margin:4px 0">
      <div class="avatar" style="background:${bg};color:${fg}">${m.role==='ai'?'AI':'CHW'}</div>
      <div style="flex:1;max-width:82%">
        ${m.pinned?'<div style="font-size:10px;font-weight:700;color:#E65100;margin-bottom:2px">📌 Pinned by moderator</div>':''}
        <div class="sender-name ${nCls}">${nameLbl}</div>
        <div class="bubble ${bCls}">
          <div class="msg-txt" style="white-space:pre-wrap">${m.text}</div>
          <div class="msg-time dark">${m.time}</div>
        </div>
        ${buildReactions(m)}
      </div>
    </div>`;
    return wrapper;
  }

  if (isMe) {
    wrapper.innerHTML=`<div class="msg-row me" style="margin:4px 0">
      <div>
        <div class="bubble">
          <div class="msg-txt">${m.text}</div>
          <div class="msg-time">${m.time}</div>
        </div>
        ${buildReactions(m)}
      </div>
    </div>`;
    return wrapper;
  }

  const [bg,fg] = avatarColor(m.sender);
  wrapper.innerHTML=`<div class="msg-row other" style="margin:4px 0">
    <div class="avatar" style="background:${bg};color:${fg}">${initials(m.sender)}</div>
    <div style="max-width:78%">
      <div class="sender-name">${m.sender}</div>
      <div class="bubble other-b">
        <div class="msg-txt">${m.text}</div>
        <div class="msg-time dark">${m.time}</div>
      </div>
      ${buildReactions(m)}
    </div>
  </div>`;
  return wrapper;
}

function buildReactions(m) {
  if (!m.reactions?.length) return '<div class="reactions-row" style="margin-top:4px"><button class="add-react" onclick="addReaction('+m.id+')">+</button></div>';
  const btns = m.reactions.map(r =>
    `<button class="react-btn ${r.me?'reacted':''}" onclick="toggleReact(${m.id},'${r.e}')">${r.e} ${r.n}</button>`
  ).join('');
  return `<div class="reactions-row" style="margin-top:4px">${btns}<button class="add-react" onclick="addReaction(${m.id})">+</button></div>`;
}

function toggleReact(id, emoji) {
  const msgs = MSG_STORE[currentCircle];
  const msg = msgs.find(m=>m.id===id);
  if (!msg) return;
  const r = msg.reactions.find(r=>r.e===emoji);
  if (r) { r.me=!r.me; r.n+=r.me?1:-1; }
  renderMessages(currentCircle);
}

function addReaction(id) {
  const emojis=['❤️','🙏','💪','🎉','😊','💛'];
  const e = emojis[Math.floor(Math.random()*emojis.length)];
  const msg = MSG_STORE[currentCircle].find(m=>m.id===id);
  if (!msg) return;
  const existing = msg.reactions.find(r=>r.e===e);
  if (existing) { existing.n++; existing.me=true; }
  else msg.reactions.push({e,n:1,me:true});
  renderMessages(currentCircle);
}

/* ── Filter by topic ── */
function filterTopic(topic, btn) {
  selectedTopic = topic;
  document.querySelectorAll('.topic-chip').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const labels = {all:'All topics',pregnancy:'Pregnancy',feeding:'Feeding & Nutrition',malaria:'Malaria & Fever',mental:'Wellbeing',milestone:'Milestones'};
  document.getElementById('current-topic-lbl').textContent = labels[topic]||'All topics';
  renderMessages(currentCircle);
}

/* ── Members panel ── */
function openMembers() {
  document.getElementById('members-list').innerHTML = MEMBERS_DATA.map(m=>{
    const [bg,fg] = m.color;
    return `<div class="member-row">
      <div class="avatar" style="background:${bg};color:${fg};width:36px;height:36px;font-size:12px">${initials(m.name)}</div>
      <div class="member-info">
        <div class="member-name">${m.name===''+MY_NAME?MY_NAME+' (You)':m.name}</div>
        <div class="member-role">${m.role}</div>
      </div>
      ${m.badge?`<span class="member-badge ${m.badge}">${m.badge==='chw'?'CHW':'MOD'}</span>`:''}
    </div>`;
  }).join('');
  document.getElementById('members-panel').classList.add('open');
  document.getElementById('overlay').classList.add('open');
}
function closeMembers() {
  document.getElementById('members-panel').classList.remove('open');
  document.getElementById('overlay').classList.remove('open');
}

/* ── Safety detection keywords ── */
const SAFETY_KEYWORDS = ['kill myself','end my life','want to die','cannot go on','suicidal','harm myself','bleeding heavily','convulsing','unconscious','not breathing','baby not moving'];
function checkSafety(text) {
  const t = text.toLowerCase();
  return SAFETY_KEYWORDS.some(k => t.includes(k));
}
function closeSafety() { document.getElementById('safety-modal').classList.remove('open'); }

/* ── Send message ── */
async function mcSendMessage() {
  const inp = document.getElementById('chat-in');
  const text = inp.value.trim();
  if (!text) return;

  if (checkSafety(text)) {
    document.getElementById('safety-modal').classList.add('open');
    return;
  }

  const topic = selectedTopic==='all'?'general':selectedTopic;
  const msg = { id:Date.now(), sender:MY_NAME, role:'member', topic, time:now(), text, reactions:[] };
  MSG_STORE[currentCircle].push(msg);
  inp.value=''; updateCharCount(inp);
  renderMessages(currentCircle);
  scrollToBottom();

  // AI moderation — occasionally inject a health tip
  if (Math.random() < 0.6 || text.length > 30) {
    await getAIResponse(text, topic);
  }
}

async function getAIResponse(userText, topic) {
  const msgs = document.getElementById('chat-msgs');
  const loadEl = document.createElement('div');
  loadEl.style.cssText='display:flex;align-items:flex-start;gap:7px;margin:4px 0';
  loadEl.innerHTML=`<div class="avatar" style="background:#C8E6C9;color:#1B5E20">AI</div><div class="bubble ai-b"><div class="ldots"><div class="ld"></div><div class="ld"></div><div class="ld"></div></div></div>`;
  msgs.appendChild(loadEl);
  scrollToBottom();

  const TOPICS_CTX={pregnancy:'pregnancy and antenatal care',feeding:'infant feeding and breastfeeding',malaria:'malaria prevention and treatment',mental:'maternal mental health and emotional wellbeing',milestone:'baby milestones and development',general:'maternal and child health'};
  const system=`You are AkomaHealth AI, a compassionate health moderator in a peer support group called "Mama Circle" for pregnant women and mothers in Ghana. The group topic is: ${TOPICS_CTX[topic]||'maternal health'}. Your role is to: 1) Validate and affirm the mama's experience warmly, 2) Add ONE practical Ghana-specific health tip or fact relevant to what she shared, 3) Encourage her to visit her CHW or CHPS compound for clinical matters. Keep responses under 120 words. Be warm, culturally sensitive, and supportive. If the message describes a medical emergency (bleeding, convulsions, no fetal movement), immediately advise calling 112. Never diagnose. Do NOT use markdown, asterisks, bold, or bullet symbols. Plain text only.`;

  try {
    if (!API_KEY) throw new Error('no-key');
    const res = await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:Object.assign({'Content-Type':'application/json','anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},API_KEY?{'x-api-key':API_KEY}:{}),body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:400,system,messages:[{role:'user',content:userText}]})})
    const data = await res.json();
    const reply = data.content?.[0]?.text||'';
    loadEl.remove();
    if (reply) {
      const aiMsg = { id:Date.now()+1, sender:'AkomaHealth AI', role:'ai', topic, time:now(), text:reply, reactions:[] };
      MSG_STORE[currentCircle].push(aiMsg);
      renderMessages(currentCircle);
    }
  } catch(e) {
    loadEl.remove();
    if (e.message !== 'no-key') {
      const aiMsg = { id:Date.now()+1, sender:'AkomaHealth AI', role:'ai', topic, time:now(), text:'Thank you for sharing with the circle. Remember your CHW and CHPS compound are here to support you whenever you need clinical advice.', reactions:[] };
      MSG_STORE[currentCircle].push(aiMsg);
      renderMessages(currentCircle);
    }
  }
}

function now() {
  const d=new Date();
  let h=d.getHours(),m=d.getMinutes(),s=h>=12?'pm':'am';
  h=h%12||12;
  return `${h}:${String(m).padStart(2,'0')}${s}`;
}

function scrollToBottom() {
  const msgs=document.getElementById('chat-msgs');
  setTimeout(()=>msgs.scrollTop=msgs.scrollHeight,50);
}

function updateCharCount(inp) {
  document.getElementById('char-count').textContent=`${inp.value.length} / 500`;
}

/* ── Keyboard ── */
/* MC chat keydown merged into DOMContentLoaded below */


/* Show notification badge on home */
function showMCNotif() {
  const el = document.getElementById('mc-notif');
  if (el) el.style.display = 'inline';
}
setTimeout(function(){ if(typeof showMCNotif==='function') showMCNotif(); }, 1500);
