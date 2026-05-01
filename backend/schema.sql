-- ═══════════════════════════════════════════════════════════════
-- AkomaHealth — Supabase Database Schema
-- Run this in your Supabase SQL Editor (supabase.com → SQL Editor)
-- ═══════════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────
-- PROFILES (extends Supabase auth.users)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT,
  phone         TEXT,
  region        TEXT,
  language      TEXT DEFAULT 'en',
  role          TEXT DEFAULT 'patient' CHECK (role IN ('patient','chw','clinician','admin')),
  chw_id        TEXT,                          -- CHW badge/ID number if applicable
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, phone)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.phone);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─────────────────────────────────────────
-- ANC PASSPORT (antenatal care visits)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS anc_visits (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  visit_key     TEXT NOT NULL,               -- v1 through v8
  visit_number  INT NOT NULL,
  visit_date    DATE,
  facility_name TEXT,
  health_worker TEXT,
  weight_kg     NUMERIC(5,2),
  bp_systolic   INT,
  bp_diastolic  INT,
  hb_level      NUMERIC(4,2),               -- haemoglobin g/dL
  notes         TEXT,
  completed     BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, visit_key)
);

-- ─────────────────────────────────────────
-- CHILD GROWTH RECORDS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS growth_records (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  child_name    TEXT NOT NULL,
  child_sex     CHAR(1) CHECK (child_sex IN ('M','F')),
  date_of_birth DATE,
  recorded_at   DATE NOT NULL DEFAULT CURRENT_DATE,
  age_months    INT NOT NULL,
  weight_kg     NUMERIC(5,2) NOT NULL,
  height_cm     NUMERIC(5,2) NOT NULL,
  waz_score     NUMERIC(5,3),               -- Weight-for-age Z-score (calculated)
  bmi           NUMERIC(5,2),               -- BMI (calculated)
  status        TEXT CHECK (status IN ('normal','moderate','severe')),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- CHW PATIENT VISITS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chw_visits (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chw_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  patient_name    TEXT NOT NULL,
  patient_age     TEXT,
  patient_sex     TEXT,
  village         TEXT,
  region          TEXT,
  visit_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  chief_complaint TEXT,
  findings        TEXT,
  action_taken    TEXT,
  referral_needed TEXT DEFAULT 'no' CHECK (referral_needed IN ('no','yes','urgent')),
  referral_facility TEXT,
  follow_up_date  DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- SYMPTOM REPORTS (anonymised for outbreak map)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS symptom_reports (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES profiles(id) ON DELETE SET NULL, -- nullable for anonymity
  region        TEXT NOT NULL,
  district      TEXT,
  symptoms      TEXT[],                     -- array of symptom strings
  module        TEXT NOT NULL,              -- 'malaria' | 'maternal'
  risk_level    TEXT CHECK (risk_level IN ('low','medium','high')),
  age_group     TEXT,
  pregnant      BOOLEAN DEFAULT FALSE,
  reported_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- OUTBREAK AGGREGATES (materialised view refreshed daily)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS outbreak_stats (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  region        TEXT NOT NULL UNIQUE,
  total_reports INT DEFAULT 0,
  high_risk     INT DEFAULT 0,
  medium_risk   INT DEFAULT 0,
  low_risk      INT DEFAULT 0,
  risk_level    TEXT DEFAULT 'low',          -- computed: 'low'|'medium'|'high'
  trend         TEXT DEFAULT '→',            -- '↑' | '↓' | '→'
  last_updated  TIMESTAMPTZ DEFAULT NOW()
);

-- Seed outbreak stats for all 16 regions
INSERT INTO outbreak_stats (region, total_reports, high_risk, medium_risk, low_risk, risk_level, trend)
VALUES
  ('Northern Region',      847, 612, 180, 55, 'high', '↑'),
  ('Upper East Region',    712, 534, 145, 33, 'high', '↑'),
  ('Upper West Region',    689, 498, 152, 39, 'high', '→'),
  ('Savannah Region',      534, 389, 112, 33, 'high', '↑'),
  ('North East Region',    312, 187,  98, 27, 'medium','→'),
  ('Oti Region',           287, 145, 108, 34, 'medium','↓'),
  ('Bono East Region',     256, 134,  90, 32, 'medium','→'),
  ('Bono Region',          234, 121,  85, 28, 'medium','↓'),
  ('Ahafo Region',         145,  52,  61, 32, 'low',   '↓'),
  ('Ashanti Region',       389, 201, 145, 43, 'medium','→'),
  ('Eastern Region',       167,  61,  72, 34, 'low',   '↓'),
  ('Greater Accra Region', 134,  44,  56, 34, 'low',   '↓'),
  ('Central Region',       189,  72,  82, 35, 'low',   '→'),
  ('Western Region',       223, 112,  81, 30, 'medium','→'),
  ('Western North Region', 245, 134,  79, 32, 'medium','↑'),
  ('Volta Region',         178,  65,  78, 35, 'low',   '↓')
ON CONFLICT (region) DO UPDATE SET
  total_reports = EXCLUDED.total_reports,
  high_risk = EXCLUDED.high_risk,
  risk_level = EXCLUDED.risk_level,
  trend = EXCLUDED.trend;

-- ─────────────────────────────────────────
-- HEALTH Q&A CHAT HISTORY
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_history (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id    UUID NOT NULL DEFAULT uuid_generate_v4(),
  role          TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content       TEXT NOT NULL,
  language      TEXT DEFAULT 'en',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- FACILITIES (can be updated from GHS data)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS facilities (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  facility_type TEXT NOT NULL,              -- 'Teaching Hospital'|'Regional Hospital'|'District Hospital'|'CHPS'|etc
  region        TEXT NOT NULL,
  district      TEXT,
  phone         TEXT,
  latitude      NUMERIC(10,7),
  longitude     NUMERIC(10,7),
  services      TEXT[],                     -- ['maternity','malaria','emergency']
  open_24hrs    BOOLEAN DEFAULT FALSE,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- Ensures users can only access their own data
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE anc_visits     ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE chw_visits     ENABLE ROW LEVEL SECURITY;
ALTER TABLE symptom_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history   ENABLE ROW LEVEL SECURITY;
ALTER TABLE facilities     ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbreak_stats ENABLE ROW LEVEL SECURITY;

-- Profiles: users see only their own
CREATE POLICY "profiles_own" ON profiles
  FOR ALL USING (auth.uid() = id);

-- ANC visits: users see only their own
CREATE POLICY "anc_own" ON anc_visits
  FOR ALL USING (auth.uid() = user_id);

-- Growth records: users see only their own
CREATE POLICY "growth_own" ON growth_records
  FOR ALL USING (auth.uid() = user_id);

-- CHW visits: CHW sees only their own logged visits
CREATE POLICY "chw_own" ON chw_visits
  FOR ALL USING (auth.uid() = chw_id);

-- Symptom reports: users can insert their own, cannot read others
CREATE POLICY "symptoms_insert" ON symptom_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "symptoms_own_read" ON symptom_reports
  FOR SELECT USING (auth.uid() = user_id);

-- Chat history: users see only their own
CREATE POLICY "chat_own" ON chat_history
  FOR ALL USING (auth.uid() = user_id);

-- Facilities: public read, admin write
CREATE POLICY "facilities_public_read" ON facilities
  FOR SELECT USING (true);

-- Outbreak stats: public read
CREATE POLICY "outbreak_public_read" ON outbreak_stats
  FOR SELECT USING (true);

-- ═══════════════════════════════════════════════════════════════
-- FUNCTIONS & TRIGGERS
-- ═══════════════════════════════════════════════════════════════

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER anc_updated_at BEFORE UPDATE ON anc_visits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER chw_updated_at BEFORE UPDATE ON chw_visits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Refresh outbreak stats from symptom_reports (call this daily via cron)
CREATE OR REPLACE FUNCTION refresh_outbreak_stats()
RETURNS VOID AS $$
BEGIN
  UPDATE outbreak_stats o
  SET
    total_reports = sub.total,
    high_risk     = sub.high,
    medium_risk   = sub.medium,
    low_risk      = sub.low_c,
    risk_level    = CASE
      WHEN sub.high::float / NULLIF(sub.total,0) > 0.5 THEN 'high'
      WHEN sub.high::float / NULLIF(sub.total,0) > 0.25 THEN 'medium'
      ELSE 'low' END,
    last_updated  = NOW()
  FROM (
    SELECT
      region,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE risk_level = 'high') as high,
      COUNT(*) FILTER (WHERE risk_level = 'medium') as medium,
      COUNT(*) FILTER (WHERE risk_level = 'low') as low_c
    FROM symptom_reports
    WHERE reported_at > NOW() - INTERVAL '30 days'
    GROUP BY region
  ) sub
  WHERE o.region = sub.region;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════
-- INDEXES (performance)
-- ═══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_anc_user     ON anc_visits (user_id);
CREATE INDEX IF NOT EXISTS idx_growth_user  ON growth_records (user_id);
CREATE INDEX IF NOT EXISTS idx_chw_chw_id   ON chw_visits (chw_id);
CREATE INDEX IF NOT EXISTS idx_chw_date     ON chw_visits (visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_symptoms_reg ON symptom_reports (region, reported_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_user    ON chat_history (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fac_region   ON facilities (region);

-- ═══════════════════════════════════════════════════════════════
-- DONE — your AkomaHealth database is ready!
-- Next: copy your Supabase URL and anon key into server.js
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- MAMA CIRCLE — Community peer support tables
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────
-- CIRCLES (groups — regional + topic channels)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mc_circles (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug          TEXT NOT NULL UNIQUE,          -- e.g. 'northern', 'pregnancy'
  name          TEXT NOT NULL,
  description   TEXT,
  circle_type   TEXT DEFAULT 'topic'
                CHECK (circle_type IN ('regional','topic')),
  region        TEXT,                          -- set for regional circles
  icon          TEXT DEFAULT '👩',
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Seed the 6 circles
INSERT INTO mc_circles (slug, name, description, circle_type, icon) VALUES
  ('northern',   'Northern Mamas Circle',    'Regional circle for mothers in the Northern Region', 'regional', '🌿'),
  ('pregnancy',  'Pregnancy Journey',        'All about pregnancy — trimesters, ANC, preparation', 'topic',    '🤰'),
  ('feeding',    'Feeding & Nutrition',      'Breastfeeding, weaning, and child nutrition',         'topic',    '🍼'),
  ('malaria',    'Malaria & Fever',          'Recognising and preventing malaria in families',      'topic',    '🦟'),
  ('mental',     'Mental Health & Wellbeing','Emotional support for pregnancy and motherhood',      'topic',    '💛'),
  ('milestones', 'Baby Milestones',          'Celebrate pregnancy and baby development wins',       'topic',    '🎉')
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────
-- CIRCLE MEMBERSHIPS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mc_members (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  circle_id     UUID NOT NULL REFERENCES mc_circles(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  anon_name     TEXT NOT NULL,                 -- e.g. "Abena Hibiscus #247"
  role          TEXT DEFAULT 'member'
                CHECK (role IN ('member','chw','moderator')),
  joined_at     TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (circle_id, user_id)
);

-- ─────────────────────────────────────────
-- MESSAGES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mc_messages (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  circle_id     UUID NOT NULL REFERENCES mc_circles(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  anon_name     TEXT NOT NULL,                 -- display name — never reveals user_id
  sender_role   TEXT DEFAULT 'member'
                CHECK (sender_role IN ('member','chw','moderator','ai')),
  topic         TEXT DEFAULT 'general',        -- pregnancy | feeding | malaria | mental | milestone | general
  message_type  TEXT DEFAULT 'text'
                CHECK (message_type IN ('text','milestone','ai_tip','system')),
  content       TEXT NOT NULL,
  milestone_data JSONB,                        -- {icon, title, msg, week} for milestone posts
  is_pinned     BOOLEAN DEFAULT FALSE,
  is_deleted    BOOLEAN DEFAULT FALSE,         -- soft delete
  pinned_by     UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- REACTIONS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mc_reactions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id    UUID NOT NULL REFERENCES mc_messages(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji         TEXT NOT NULL CHECK (emoji IN ('❤️','🙏','💪','🎉','😊','💛')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (message_id, user_id, emoji)          -- one reaction per emoji per user per message
);

-- ─────────────────────────────────────────
-- SAFETY REPORTS (flagged messages)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mc_safety_reports (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id    UUID REFERENCES mc_messages(id) ON DELETE SET NULL,
  circle_id     UUID NOT NULL REFERENCES mc_circles(id),
  reported_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  trigger_text  TEXT,                          -- the text that triggered the flag
  keywords_hit  TEXT[],                        -- which safety keywords matched
  resolved      BOOLEAN DEFAULT FALSE,
  resolved_by   UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- RLS for Mama Circle tables
-- ─────────────────────────────────────────
ALTER TABLE mc_circles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE mc_members        ENABLE ROW LEVEL SECURITY;
ALTER TABLE mc_messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE mc_reactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE mc_safety_reports ENABLE ROW LEVEL SECURITY;

-- Circles: public read
CREATE POLICY "mc_circles_public"   ON mc_circles  FOR SELECT USING (true);

-- Members: users manage their own memberships; can see others in same circle
CREATE POLICY "mc_members_own"      ON mc_members  FOR ALL    USING (auth.uid() = user_id);
CREATE POLICY "mc_members_view"     ON mc_members  FOR SELECT USING (true);

-- Messages: members read non-deleted messages; users insert/soft-delete their own
CREATE POLICY "mc_msgs_read"        ON mc_messages FOR SELECT USING (is_deleted = FALSE);
CREATE POLICY "mc_msgs_insert"      ON mc_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mc_msgs_own_update"  ON mc_messages FOR UPDATE USING (auth.uid() = user_id);

-- Reactions: anyone can read; users manage their own
CREATE POLICY "mc_react_read"       ON mc_reactions FOR SELECT USING (true);
CREATE POLICY "mc_react_own"        ON mc_reactions FOR ALL    USING (auth.uid() = user_id);

-- Safety reports: users can insert; only service role reads
CREATE POLICY "mc_safety_insert"    ON mc_safety_reports FOR INSERT WITH CHECK (true);

-- ─────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_mc_msgs_circle   ON mc_messages (circle_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mc_msgs_topic    ON mc_messages (circle_id, topic, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mc_msgs_pinned   ON mc_messages (circle_id, is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX IF NOT EXISTS idx_mc_reactions_msg ON mc_reactions (message_id);
CREATE INDEX IF NOT EXISTS idx_mc_members_circle ON mc_members  (circle_id);
CREATE INDEX IF NOT EXISTS idx_mc_members_user  ON mc_members  (user_id);

-- ─────────────────────────────────────────
-- HELPER FUNCTION: get message with reaction counts
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_circle_messages(
  p_circle_id UUID,
  p_topic     TEXT DEFAULT NULL,
  p_limit     INT  DEFAULT 50,
  p_before    TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  id            UUID,
  anon_name     TEXT,
  sender_role   TEXT,
  topic         TEXT,
  message_type  TEXT,
  content       TEXT,
  milestone_data JSONB,
  is_pinned     BOOLEAN,
  created_at    TIMESTAMPTZ,
  reactions     JSONB,
  reply_count   BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id, m.anon_name, m.sender_role, m.topic,
    m.message_type, m.content, m.milestone_data,
    m.is_pinned, m.created_at,
    COALESCE(
      jsonb_agg(
        jsonb_build_object('emoji', r.emoji, 'count', r.cnt)
      ) FILTER (WHERE r.emoji IS NOT NULL),
      '[]'::jsonb
    ) AS reactions,
    0::BIGINT AS reply_count
  FROM mc_messages m
  LEFT JOIN (
    SELECT message_id, emoji, COUNT(*) AS cnt
    FROM mc_reactions
    GROUP BY message_id, emoji
  ) r ON r.message_id = m.id
  WHERE m.circle_id = p_circle_id
    AND m.is_deleted = FALSE
    AND m.created_at < p_before
    AND (p_topic IS NULL OR m.topic = p_topic OR m.is_pinned = TRUE)
  GROUP BY m.id, m.anon_name, m.sender_role, m.topic,
           m.message_type, m.content, m.milestone_data,
           m.is_pinned, m.created_at
  ORDER BY m.is_pinned DESC, m.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ─────────────────────────────────────────
-- TRIGGER: update member last_seen_at on new message
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_member_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE mc_members
  SET last_seen_at = NOW()
  WHERE circle_id = NEW.circle_id AND user_id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mc_msg_update_seen
  AFTER INSERT ON mc_messages
  FOR EACH ROW EXECUTE FUNCTION update_member_last_seen();

-- ─────────────────────────────────────────
-- AUTO-UPDATED updated_at
-- ─────────────────────────────────────────
CREATE TRIGGER mc_msgs_updated_at BEFORE UPDATE ON mc_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- Mama Circle schema complete ✅
-- ═══════════════════════════════════════════════════════════════
