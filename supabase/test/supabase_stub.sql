-- Minimal stand-ins for Supabase auth/storage so schema.sql loads on plain Postgres (tests only).
create role authenticated; create role anon;
create schema auth; create schema storage;
create table auth.users (id uuid primary key, raw_user_meta_data jsonb);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
create table storage.buckets (id text primary key, name text, public bool);
create table storage.objects (id serial, bucket_id text, name text);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name, '/') $$;
grant usage on schema auth, storage to authenticated; grant execute on function auth.uid() to authenticated;
