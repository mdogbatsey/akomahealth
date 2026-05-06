# Contributing to AkomaHealth 🇬🇭

Welcome, and thank you for contributing to AkomaHealth — Ghana's AI-powered health assistant. This guide will get you from zero to submitting your first pull request in under 15 minutes.

---

## Table of Contents

1. [Who owns what](#who-owns-what)
2. [Setting up locally](#setting-up-locally)
3. [How to submit a contribution](#how-to-submit-a-contribution)
4. [File guide — what to edit and where](#file-guide)
5. [Adding a new language](#adding-a-new-language)
6. [Adding a new clinical module](#adding-a-new-clinical-module)
7. [Testing your changes](#testing-your-changes)
8. [Code style](#code-style)
9. [Asking for help](#asking-for-help)

---

## Who owns what

Each contributor works in a clearly defined area to avoid conflicts.

| Area | File(s) | Who |
|------|---------|-----|
| HTML structure & screens | `index.html` | UI/design lead |
| Styling & layout | `css/styles.css` | UI/design lead |
| Translations (En/Twi/Hausa) | `js/i18n.js` | Language lead |
| Clinical modules (malaria, ANC, growth…) | `js/app.js` | Clinical logic lead |
| Mama Circle community feature | `js/mama-circle.js` | Community lead |
| Backend API & routes | `backend/server.js` | Backend lead |
| Database schema | `backend/schema.sql` | Backend lead |
| Frontend API client | `backend/api.js` | Backend lead |

> **Rule:** Only edit files in your assigned area. If you need to change something outside your area, discuss it first by opening a GitHub Issue.

---

## Setting up locally

### What you need

- A computer with a browser (Chrome or Firefox recommended)
- [Git](https://git-scm.com/downloads) installed
- [VS Code](https://code.visualstudio.com/) recommended (free)
- [Node.js 18+](https://nodejs.org) — only needed if you work on the backend

### Step 1 — Fork the repository

1. Go to `https://github.com/YOURUSERNAME/akomahealth`
2. Click **Fork** (top right) → **Create fork**
3. This creates your own copy at `https://github.com/YOUR-USERNAME/akomahealth`

### Step 2 — Clone your fork to your computer

Open a terminal and run:

```bash
git clone https://github.com/YOUR-USERNAME/akomahealth.git
cd akomahealth
```

### Step 3 — Open in VS Code

```bash
code .
```

Install the **Live Server** extension in VS Code (search "Live Server" in the Extensions panel). This lets you open the app in your browser with one click.

### Step 4 — Run the app

Right-click `index.html` in VS Code → **Open with Live Server**.

Your browser opens at `http://localhost:5500` and the full app loads. All screens, navigation, facility finder, prevention tips, growth calculator, and dosing calculator work immediately — no backend or API key needed for reviewing the UI.

### Step 5 (optional) — Enable AI features

Open `js/app.js` and find this line near the top:

```js
const API_KEY = '';
```

Paste your [Anthropic API key](https://console.anthropic.com) between the quotes:

```js
const API_KEY = 'sk-ant-your-key-here';
```

Save the file — the malaria checker, maternal triage, and health Q&A chat will now work.

> ⚠️ Never commit a file with your API key in it. The `.gitignore` does not protect JS files — remove the key before committing.

### Step 6 (backend only) — Set up the backend server

Only needed if you work on `backend/server.js` or `backend/schema.sql`.

```bash
cd backend
cp .env.example .env
# Open .env and fill in your Supabase and Anthropic keys

npm install
npm start
# Server runs at http://localhost:3001
```

---

## How to submit a contribution

### The golden rule
**Never commit directly to `main`.** Always work on a branch.

### Step-by-step

**1. Make sure your fork is up to date**

```bash
# Add the original repo as "upstream" (only needed once)
git remote add upstream https://github.com/YOURUSERNAME/akomahealth.git

# Pull the latest changes before you start working
git fetch upstream
git checkout main
git merge upstream/main
```

**2. Create a branch for your work**

Name your branch descriptively:

```bash
# Examples
git checkout -b add-ga-language
git checkout -b fix-malaria-validation
git checkout -b add-vaccination-tracker
git checkout -b update-northern-facilities
```

**3. Make your changes**

Edit the files in your assigned area. Save frequently. Check the app in your browser as you go.

**4. Test your changes** (see [Testing](#testing-your-changes) below)

**5. Commit your changes**

```bash
git add .
git commit -m "Add Ga language translations (205 strings)"
```

Write commit messages that describe *what* changed, not *how*:
- ✅ `Add dosing guide for Co-trimoxazole paediatric suspension`
- ✅ `Fix malaria checker validation for under-5 age group`
- ✅ `Translate all Mama Circle screens to Hausa`
- ❌ `Updated stuff`
- ❌ `Fixed bug`

**6. Push to your fork**

```bash
git push origin your-branch-name
```

**7. Open a Pull Request**

1. Go to your fork on GitHub
2. Click the **Compare & pull request** button that appears
3. Fill in the PR template:
   - **What changed** — brief description
   - **Why** — motivation or issue it fixes
   - **How to test** — what should the reviewer click/check
   - **Screenshots** — attach a screenshot if you changed the UI
4. Click **Create pull request**
5. Tag the project lead (`@kwofie`) for review

---

## File guide

### `index.html` — HTML structure

Contains all 11 app screens as `<div class="screen" id="...">` blocks. Each screen has a unique ID:

| Screen ID | Module |
|-----------|--------|
| `onboarding` | Welcome + language picker |
| `home` | Main menu |
| `malaria` | Malaria checker |
| `maternal` | Maternal health |
| `anc` | ANC Passport |
| `growth` | Child growth tracker |
| `dosing` | Dosing calculator |
| `chw` | CHW visit log |
| `map` | Outbreak map |
| `chat` | Health Q&A |
| `facility` | Facility finder |
| `prevention` | Prevention tips |
| `mc-home` | Mama Circle home |
| `mc-rules` | Mama Circle rules |
| `mc-chat` | Mama Circle chat |

**Adding a new screen:**
1. Add a `<div class="screen" id="your-screen">...</div>` block
2. Add a module card button on the home screen
3. Add a `go('your-screen')` call to the button
4. Add any new JS logic to `js/app.js`

**Translatable elements** use `data-i18n="key"` attributes:
```html
<label class="fl" data-i18n="your_new_key">Default text</label>
```
Then add the key to all 3 languages in `js/i18n.js`.

---

### `css/styles.css` — Styles

Sections are marked with comments — use Ctrl+F to jump to a section:

```
/* ── EMERGENCY BAR ── */
/* ── ONBOARDING ── */
/* ── HOME ── */
/* ── SCREEN HEADERS ── */
/* ── FORMS ── */
/* ── RESULTS ── */
/* ── FACILITY ── */
/* ── PREVENTION ── */
/* ── GROWTH ── */
/* ── ANC PASSPORT ── */
/* ── DOSING CALCULATOR ── */
/* ── CHW VISIT LOG ── */
/* ── GHANA MAP ── */
/* ── CHAT ── */
/* ── SOS ── */
/* ── MAMA CIRCLE ── */
```

**Colour palette** (do not change these without team discussion):

| Colour | Hex | Used for |
|--------|-----|----------|
| Forest green | `#1B4332` | Primary brand, headers |
| Bright green | `#52B788` | Success, ANC |
| Gold | `#F9A825` | Malaria, warnings |
| Deep red | `#C62828` | High risk, SOS |
| Pink | `#C2185B` | ANC, maternal |
| Purple | `#7B1FA2` | Mama Circle |

---

### `js/i18n.js` — Translations

Contains the `TRANSLATIONS` object and the `applyLang()` function.

**Structure:**
```js
const TRANSLATIONS = {
  en: { key: "English text", ... },
  tw: { key: "Twi text", ... },
  ha: { key: "Hausa text", ... },
};
```

**Adding a new string:**
1. Add the key to all three language blocks
2. Add `data-i18n="your_key"` to the HTML element
3. For input placeholders: add `data-i18n-placeholder="your_key"` to the element

---

### `js/app.js` — Clinical logic

Sections (search to navigate):

```
/* ── Navigation ── */
/* ── SOS ── */
/* ── Voice Input ── */
/* ── Claude API ── */
/* ── MALARIA ── */
/* ── MATERNAL ── */
/* ── ANC PASSPORT ── */
/* ── GROWTH TRACKER ── */
/* ── DOSING CALCULATOR ── */
/* ── CHW VISIT LOG ── */
/* ── GHANA OUTBREAK MAP ── */
/* ── HEALTH CHAT ── */
/* ── FACILITY DATABASE ── */
```

**Adding a new drug to the dosing calculator:**

Find the `DRUGS` object and add a new entry:

```js
const DRUGS = {
  // existing drugs ...
  mebendazole: {
    name: 'Mebendazole',
    unit: 'mg',
    note: 'Give with food for best absorption.',
    maxNote: 'Do not exceed 500mg per dose.',
    calc: (w) => {
      return { dose: '100 mg', freq: 'Twice daily × 3 days', detail: 'Standard dose regardless of weight' };
    }
  }
};
```

Then add a tab button in `index.html`:
```html
<button class="dt" onclick="selDrug('mebendazole',this)">Mebendazole</button>
```

**Adding a new region to the facility finder:**

Find the `FACS` object in `js/app.js` and add an entry:
```js
'your-region': [
  { n: 'Hospital Name', t: 'Hospital Type', p: 'Phone number', i: 'Brief note' },
]
```

Then add the option to the select in `index.html`.

---

### `js/mama-circle.js` — Mama Circle

**Adding a new community circle:**

1. Add to the `CIRCLES` object:
```js
const CIRCLES = {
  // existing...
  nutrition: { name: '🥗 Nutrition & Food', sub: '340 members · 5 online', online: 5 },
};
```

2. Add seed messages to `SEED_MSGS`:
```js
const SEED_MSGS = {
  // existing...
  nutrition: [
    { id: 1, sender: 'AkomaHealth AI', role: 'ai', topic: 'nutrition',
      time: '9:00am', text: 'Good food during pregnancy matters...', reactions: [] },
  ],
};
```

3. Add a card to the `mc-home` screen in `index.html`

4. Add a topic chip to the `mc-chat` screen filter row

---

## Adding a new language

1. Open `js/i18n.js`
2. Find the `const TRANSLATIONS = {` block
3. After the `ha` block, add your new language:

```js
  ga: {
    app_name: "AkomaHealth",
    app_sub: "Ghana health yεhεε",
    home_greet: "Ogekoo! Aba lε yε bo wu?",
    // ... translate all 205 keys
  }
```

4. In `index.html`, find the language buttons in the onboarding and home screens and add:

```html
<!-- Onboarding -->
<button class="lang-opt" onclick="obLang('ga',this)">
  <span class="flag">🇬🇭</span>
  <span class="lname">Ga</span>
</button>

<!-- Home -->
<button class="lb" onclick="switchLang('ga',this)">Ga</button>
```

5. Test by opening the app and clicking your new language button — every screen should update.

---

## Adding a new clinical module

1. **Add the screen HTML** to `index.html`:
```html
<div class="screen" id="vaccination">
  <div class="hdr" style="background:#0D47A1">
    <button class="bk" onclick="go('home')">‹</button>
    <div><div class="ht" data-i18n="vac_title">Vaccination Tracker</div>
         <div class="hs" data-i18n="vac_sub">Ghana immunisation schedule</div></div>
  </div>
  <div class="fb">
    <!-- your form here -->
  </div>
</div>
```

2. **Add a module card** on the home screen grid in `index.html`

3. **Add JS logic** to `js/app.js`:
```js
/* ── VACCINATION TRACKER ── */
function checkVaccination() {
  // your logic here
}
```

4. **Add translation keys** to all 3 languages in `js/i18n.js`:
```js
en: { vac_title: "Vaccination Tracker", vac_sub: "Ghana immunisation schedule", ... }
tw: { vac_title: "Tumi Nhyehyɛeɛ", vac_sub: "Ghana tumi nhyehyɛeɛ", ... }
ha: { vac_title: "Jadawalin Allurar", vac_sub: "Jadawalin Ghana", ... }
```

5. **Tag your HTML** with `data-i18n` attributes so the language switcher updates it

---

## Testing your changes

Before submitting a pull request, go through this checklist:

### UI changes
- [ ] All 11 modules still open and close correctly
- [ ] Back button works on every screen
- [ ] SOS button appears on non-home screens
- [ ] App looks correct on a narrow mobile screen (375px width)
- [ ] No broken layouts or overflowing text

### Language changes
- [ ] Switch to Twi — all text on your changed screen updates
- [ ] Switch to Hausa — same
- [ ] Switch back to English — all text returns correctly
- [ ] No `undefined` values appear anywhere

### Clinical logic changes
- [ ] The feature works end-to-end (fill in form → get result)
- [ ] Empty form submission shows a clear error message
- [ ] Result renders correctly (no raw `**asterisks**` or `##headings`)
- [ ] Error states render correctly (disconnect from internet → try again)

### Backend changes
- [ ] `node --check backend/server.js` passes with no errors
- [ ] All existing endpoints still return correct responses
- [ ] New endpoints return sensible error messages for bad inputs

---

## Code style

Keep these consistent with the existing codebase:

**JavaScript**
- Use `const` and `let` — never `var`
- Keep functions short and single-purpose
- Add a `/* ── Section name ── */` comment above each logical group
- No external libraries — vanilla JS only for the frontend

**HTML**
- Use existing CSS classes before writing new ones
- Every translatable string needs a `data-i18n` attribute
- IDs must be unique across the whole file

**CSS**
- Add new rules at the bottom of the relevant section
- Use the existing colour palette variables
- Mobile-first — the app is designed for 430px wide

**Commit messages**
- Present tense: `Add`, `Fix`, `Update`, `Remove` — not `Added`, `Fixed`
- Be specific: `Fix malaria chip selection on iOS Safari`
- Reference issues: `Fix #12 — ANC modal not saving on Android`

---

## Asking for help

- **GitHub Issues** — for bugs, feature requests, questions about the codebase
- **Pull Request comments** — for feedback on specific lines of code
- **Email** — theophiluskwofie67@gmail.com — for urgent clinical or research questions

When filing an issue, include:
1. What you were trying to do
2. What happened instead
3. Your browser and operating system
4. A screenshot if relevant

---

*AkomaHealth is built for the people of Ghana. Every contribution — however small — makes a difference. Thank you for being part of this.*

— Dr. Theophilus Kwofie, Innovator
