/**
 * AkomaHealth — i18n Functions
 * Requires: translations.js to be loaded first
 *
 * applyLang(lang)   — updates all data-i18n elements on screen switch
 * obLang(l, btn)    — onboarding language picker
 * beginApp()        — called when Get Started is clicked
 * switchLang(l,btn) — home screen language toggle
 * renderANC()       — re-renders ANC passport in active language
 */

let appLang = 'en';

function applyLang(lang) {
  appLang = lang;
  const Tl = TRANSLATIONS[lang] || TRANSLATIONS.en;

  /* 1. Text content */
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (!Tl[key]) return;
    if (el.getAttribute('data-i18n-html') === '1') {
      el.innerHTML = Tl[key];
    } else if (el.tagName === 'OPTION') {
      el.textContent = Tl[key];
    } else {
      /* preserve child elements (e.g. <strong>, <span>) — only update first text node */
      let didUpdate = false;
      for (const node of el.childNodes) {
        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
          node.textContent = Tl[key];
          didUpdate = true;
          break;
        }
      }
      if (!didUpdate) el.textContent = Tl[key];
    }
  });

  /* 2. Placeholders */
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const k = el.getAttribute('data-i18n-placeholder');
    if (Tl[k]) el.placeholder = Tl[k];
  });

  /* 3. Lang button state */
  document.querySelectorAll('.lb').forEach(b => b.classList.remove('on'));
  document.querySelectorAll('.lb').forEach(b => {
    if (b.getAttribute('onclick') && b.getAttribute('onclick').indexOf("'" + lang + "'") !== -1) {
      b.classList.add('on');
    }
  });

  /* 4. Chat welcome */
  const cw = document.getElementById('chat-welcome');
  if (cw && Tl.chat_welcome) cw.textContent = Tl.chat_welcome;

  /* 5. Chat input placeholder */
  const ci = document.getElementById('chat-in');
  if (ci && Tl.chat_placeholder) ci.placeholder = Tl.chat_placeholder;

  /* 6. Voice button label */
  const vb = document.getElementById('m-voice-btn');
  if (vb && !vb.classList.contains('rec') && Tl.mal_voice) {
    const svg = (vb.innerHTML.match(/<svg[\s\S]*?<\/svg>/) || [''])[0];
    vb.innerHTML = svg + ' ' + Tl.mal_voice;
  }

  /* 7. CHW empty-state message */
  const hl = document.getElementById('chw-history-list');
  if (hl && Tl.chw_no_visits && hl.innerHTML.includes('No visits')) {
    hl.innerHTML = '<div style="font-size:13px;color:#999;text-align:center;padding:2rem;font-weight:500">'
      + Tl.chw_no_visits.replace('\n','<br/>') + '</div>';
  }

  /* 8. Re-render ANC (uses appLang for button labels) */
  if (document.getElementById('anc-timeline') &&
      document.getElementById('anc').classList.contains('active')) {
    renderANC();
  }
}

function obLang(l, btn) {
  appLang = l;
  document.querySelectorAll('.lang-opt').forEach(b => b.classList.remove('sel'));
  btn.classList.add('sel');
}

function beginApp() {
  applyLang(appLang);
  go('home');
}

function switchLang(l, btn) {
  applyLang(l);
}

/* i18n-aware ANC renderer */
function renderANC() {
  const Tl  = TRANSLATIONS[appLang] || TRANSLATIONS.en;
  const tl  = document.getElementById('anc-timeline');
  if (!tl) return;
  tl.innerHTML = ANC_VISITS.map((v, i) => {
    const d         = ancData[v.key] || {};
    const done      = !!d.date;
    const dueApprox = !done && i === Object.keys(ancData).length;
    const sc        = done ? 'done-c' : dueApprox ? 'due-c' : '';
    const ss        = done ? 'done-s' : dueApprox ? 'due-s' : 'up-s';
    const sl        = done       ? (Tl.anc_done_badge || '✓ Done')
                    : dueApprox ? (Tl.anc_due_badge   || 'Due next')
                    :              (Tl.anc_up_badge    || 'Upcoming');
    const dc        = done ? 'done' : '';
    const btnLbl    = done ? (Tl.anc_edit || 'Edit record')
                           : (Tl.anc_log  || 'Log this visit');
    return `<div class="anc-visit">
      <div class="anc-dot ${dc}"></div>
      <div class="anc-card ${sc}" onclick="openAncModal('${v.key}',${i})">
        <div class="anc-vtop">
          <span class="anc-vt">${v.n}</span>
          <span class="anc-st ${ss}">${sl}</span>
        </div>
        <div class="anc-wk">${v.wk}</div>
        <div class="anc-tests">${v.tests}</div>
        ${done ? `<div style="margin-top:5px;font-size:11px;color:#52B788;font-weight:700">✓ ${d.date}${d.facility?' · '+d.facility:''}</div>` : ''}
        <button class="anc-log-btn">${btnLbl}</button>
      </div>
    </div>`;
  }).join('');
}
