CREATE TABLE IF NOT EXISTS city_holidays (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  ibge_code INTEGER NOT NULL,
  city_name TEXT NOT NULL,
  state_code TEXT NOT NULL,
  date DATE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(ibge_code, date, name)
);

ALTER TABLE city_holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to city holidays" ON city_holidays
  FOR SELECT USING (true);
