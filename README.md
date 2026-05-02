# AkomaHealth 🇬🇭

**AI-powered health assistant for Ghana** — malaria checker, maternal health triage, digital ANC passport, child growth tracker, CHW visit log, outbreak map, and Mama Circle peer community.

---

## Project Structure

```
akomahealth/
├── index.html              ← App shell — all HTML screens
├── css/
│   └── styles.css          ← All styles (single file, ~30KB)
├── js/
│   ├── i18n.js             ← Translations: English, Twi, Hausa + applyLang()
│   ├── app.js              ← Core clinical modules (malaria, ANC, growth, CHW…)
│   └── mama-circle.js      ← Mama Circle community feature
├── backend/
│   ├── server.js           ← Node.js/Express API server (Supabase + Anthropic)
│   ├── schema.sql          ← Supabase database schema (run once in SQL Editor)
│   ├── api.js              ← Frontend API client (connects app to backend)
│   ├── package.json        ← Backend dependencies
│   └── .env.example        ← Environment variable template
├── .gitignore
└── README.md
```

---

## Running the App

### Option A — Frontend only (no backend needed for UI review)

Just open `index.html` in any browser. All screens, navigation, facility finder, prevention tips, growth calculator, and dosing calculator work without a backend.

AI features (malaria checker, maternal triage, health Q&A) need an Anthropic API key — see Configuration below.

### Option B — With backend (full AI + persistent data)

```bash
# 1. Set up Supabase
#    - Create a project at supabase.com
#    - Run backend/schema.sql in the Supabase SQL Editor

# 2. Configure environment
cd backend
cp .env.example .env
# Edit .env with your keys

# 3. Install and run
npm install
npm start

# 4. Open index.html (use Live Server or: npx serve .)
```

---

## Configuration

### API Key (for standalone AI features)

Open `js/app.js` and find:
```js
const API_KEY = '';
```
Paste your [Anthropic API key](https://console.anthropic.com) between the quotes.

> **Leave empty** when running inside claude.ai — authentication is automatic.

### Backend Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in:

```
ANTHROPIC_API_KEY=sk-ant-your-key-here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## App Modules

| Module | File | Description |
|--------|------|-------------|
| Malaria Checker | `js/app.js` | AI risk assessment + voice input |
| Maternal & Child | `js/app.js` | Danger sign triage → emergency escalation |
| ANC Passport | `js/app.js` | Digital tracker for all 8 WHO visits |
| Growth Tracker | `js/app.js` | WHO Z-score with sex-specific reference data |
| Dosing Calculator | `js/app.js` | Weight-based doses (Artemether, Paracetamol, Amoxicillin, Co-trimoxazole) |
| CHW Visit Log | `js/app.js` | Patient visits + printable referral PDF |
| Outbreak Map | `js/app.js` | Malaria risk by region — all 16 Ghana regions |
| Health Q&A | `js/app.js` | Free-text AI chat in English, Twi, Hausa |
| Facility Finder | `js/app.js` | 30+ real CHPS compounds, clinics, hospitals |
| Prevention Tips | `index.html` | Evidence-based GHS + WHO guidance |
| **Mama Circle** | `js/mama-circle.js` | Anonymous peer support community |

---

## Languages

| Language | Code | Coverage |
|----------|------|----------|
| English | `en` | 100% (205 strings) |
| Twi (Akan) | `tw` | 100% (205 strings) |
| Hausa | `ha` | 100% (205 strings) |

To add a language, see the instructions at the top of `js/i18n.js`.

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes in the relevant file:
   - UI changes → `index.html`
   - Styles → `css/styles.css`
   - New language → `js/i18n.js`
   - Clinical logic → `js/app.js`
   - Community features → `js/mama-circle.js`
   - Backend → `backend/server.js` + `backend/schema.sql`
4. Test by opening `index.html` in your browser
5. Submit a pull request with a clear description

---

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JS (no framework — intentional for simplicity and offline capability)
- **AI**: Anthropic Claude API (`claude-sonnet-4-20250514`)
- **Backend**: Node.js + Express
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase JWT

---

## Clinical Alignment

- Ghana Health Service (GHS) protocols
- WHO Malaria Treatment Guidelines 2023
- WHO Child Growth Standards (Multicentre Growth Reference Study)
- WHO ANC Model — 8 contact schedule
- GHS CHPS Programme protocols

---

*AkomaHealth is a health information and screening tool. It does not replace diagnosis or treatment by a qualified health professional. In an emergency, call 112.*
