-- Create translations table
CREATE TABLE translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_text TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  source_lang VARCHAR(10) NOT NULL,
  target_lang VARCHAR(10) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for better query performance
CREATE INDEX idx_translations_created_at ON translations(created_at DESC);
CREATE INDEX idx_translations_langs ON translations(source_lang, target_lang);

-- Enable Row Level Security (RLS)
ALTER TABLE translations ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust based on your auth needs)
CREATE POLICY "Allow all operations" ON translations
  FOR ALL
  USING (true)
  WITH CHECK (true);
