-- Supabase grants table privileges to these roles by default; RLS does the rest.
grant usage on schema public, extensions to anon, authenticated;
grant all on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
