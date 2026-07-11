
CREATE TABLE public.wh_kv (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.wh_kv TO service_role;
ALTER TABLE public.wh_kv ENABLE ROW LEVEL SECURITY;

-- Allow public read, insert, update and delete on wh_kv so that the static site can communicate directly with Supabase client-side.
CREATE POLICY "Allow public read and write on wh_kv" ON public.wh_kv
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE INDEX wh_kv_key_prefix_idx ON public.wh_kv (key text_pattern_ops);
