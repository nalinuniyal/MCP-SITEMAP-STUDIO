-- Row Level Security tests. Run with: npm run test:db
-- Each block raises an exception (and aborts the run) on failure.
\set ON_ERROR_STOP 1
\o /dev/null

-- Users: alice owns a project, bob is a stranger, carol is a viewer, dave an editor.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@example.test', '{"display_name":"Alice"}'),
  ('00000000-0000-0000-0000-00000000000b', 'bob@example.test', '{}'),
  ('00000000-0000-0000-0000-00000000000c', 'carol@example.test', '{}'),
  ('00000000-0000-0000-0000-00000000000d', 'dave@example.test', '{}');

create or replace function pg_temp.act_as(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(uid, ''), false);
end $$;

-- profile trigger
do $$ begin
  if (select count(*) from public.profiles) <> 4 then raise exception 'profiles not created by trigger'; end if;
  if (select display_name from public.profiles where id = '00000000-0000-0000-0000-00000000000a') <> 'Alice' then
    raise exception 'display_name not copied from metadata';
  end if;
  raise notice 'ok: profile trigger';
end $$;

set role authenticated;

-- 1. Alice creates a project; owner_id is forced to her even if spoofed.
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
do $$
declare pid uuid; oid uuid;
begin
  insert into public.projects (name, platform, app_type, website_url, owner_id)
  values ('  Acme Storefront  ', 'shopify', 'spa', 'https://acme.example.com', '00000000-0000-0000-0000-00000000000b')
  returning id, owner_id into pid, oid;
  if oid <> '00000000-0000-0000-0000-00000000000a' then raise exception 'owner_id was not forced to caller'; end if;
  if (select name from public.projects where id = pid) <> 'Acme Storefront' then raise exception 'name not trimmed'; end if;
  if (select role from public.project_members where project_id = pid and user_id = oid) <> 'owner' then
    raise exception 'owner membership not created';
  end if;
  raise notice 'ok: project insert + owner membership';
end $$;

-- invalid URL rejected
do $$ begin
  begin
    insert into public.projects (name, platform, app_type, website_url) values ('Bad', 'other', 'mpa', 'javascript:alert(1)');
    raise exception 'javascript: URL accepted';
  exception when check_violation then raise notice 'ok: non-http URL rejected';
  end;
end $$;

-- Alice adds content
do $$
declare pid uuid := (select id from public.projects where name = 'Acme Storefront');
begin
  insert into public.sitemap_files (project_id, name, kind, content, created_by)
  values (pid, 'sitemap.js', 'js', 'SalesforceInteractions.init({});', '00000000-0000-0000-0000-00000000000b');
  if (select created_by from public.sitemap_files where name = 'sitemap.js') <> '00000000-0000-0000-0000-00000000000a' then
    raise exception 'created_by not stamped from session';
  end if;
  if (select size_bytes from public.sitemap_files where name = 'sitemap.js') <> 32 then raise exception 'size_bytes wrong'; end if;
  if (select length(content_sha256) from public.sitemap_files where name = 'sitemap.js') <> 64 then raise exception 'sha missing'; end if;
  insert into public.project_notes (project_id, body) values (pid, 'Client uses a custom router.');
  insert into public.project_versions (project_id, message, snapshot) values (pid, 'first', '[]');
  insert into public.project_versions (project_id, message, snapshot) values (pid, 'second', '[]');
  if (select max(version_number) from public.project_versions where project_id = pid) <> 2 then
    raise exception 'version numbers not sequential';
  end if;
  raise notice 'ok: owner writes content; actor stamped; versions numbered';
end $$;

-- invalid file name rejected (path traversal)
do $$ begin
  begin
    insert into public.sitemap_files (project_id, name, kind, content)
    values ((select id from public.projects limit 1), '../etc/passwd', 'txt', 'x');
    raise exception 'path traversal name accepted';
  exception when check_violation then raise notice 'ok: unsafe file name rejected';
  end;
end $$;

-- static findings can never be "confirmed"
do $$
declare pid uuid := (select id from public.projects where name = 'Acme Storefront'); rid uuid;
begin
  insert into public.validation_runs (project_id, status, completed_at) values (pid, 'completed', now()) returning id into rid;
  insert into public.validation_findings (run_id, project_id, severity, source, message) values (rid, pid, 'error', 'static', 'x');
  insert into public.validation_findings (run_id, project_id, severity, source, message) values (rid, pid, 'warning', 'static', 'y');
  begin
    insert into public.validation_findings (run_id, project_id, severity, source, confirmed, message)
    values (rid, pid, 'error', 'static', true, 'z');
    raise exception 'confirmed static finding accepted';
  exception when check_violation then raise notice 'ok: static finding cannot be confirmed';
  end;
end $$;

do $$
declare s record;
begin
  select * into s from public.dashboard_stats();
  if s.project_count <> 1 or s.sitemap_file_count <> 1 or s.open_error_count <> 1 or s.open_warning_count <> 1 then
    raise exception 'dashboard_stats wrong for owner: %', row_to_json(s);
  end if;
  raise notice 'ok: dashboard_stats for owner';
end $$;

-- 2. Bob (stranger) sees and changes nothing.
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
do $$
declare n int; s record;
begin
  if (select count(*) from public.projects) <> 0 then raise exception 'stranger sees projects'; end if;
  if (select count(*) from public.sitemap_files) <> 0 then raise exception 'stranger sees files'; end if;
  if (select count(*) from public.project_notes) <> 0 then raise exception 'stranger sees notes'; end if;
  if (select count(*) from public.project_versions) <> 0 then raise exception 'stranger sees versions'; end if;
  if (select count(*) from public.validation_findings) <> 0 then raise exception 'stranger sees findings'; end if;
  if (select count(*) from public.project_members) <> 0 then raise exception 'stranger sees members'; end if;
  if (select count(*) from public.profiles) <> 1 then raise exception 'stranger sees other profiles'; end if;
  select * into s from public.dashboard_stats();
  if s.project_count <> 0 or s.open_error_count <> 0 then raise exception 'stranger dashboard leaks'; end if;

  update public.projects set name = 'pwned';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'stranger updated a project'; end if;
  delete from public.sitemap_files;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'stranger deleted files'; end if;
  raise notice 'ok: stranger isolation (read/update/delete)';
end $$;

-- Bob cannot insert into Alice's project even if he knows its id.
reset role;
select set_config('test.pid', (select id::text from public.projects where name = 'Acme Storefront'), false);
set role authenticated;
do $$ begin
  begin
    insert into public.sitemap_files (project_id, name, kind, content)
    values (current_setting('test.pid')::uuid, 'evil.js', 'js', 'x');
    raise exception 'stranger inserted file with known project id';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.project_members (project_id, user_id, role)
    values (current_setting('test.pid')::uuid, '00000000-0000-0000-0000-00000000000b', 'owner');
    raise exception 'stranger added himself as member';
  exception when insufficient_privilege then null;
  end;
  raise notice 'ok: stranger cannot write with a known project id';
end $$;

-- 3. Alice adds carol (viewer) and dave (editor). Owners cannot mint more owners.
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
do $$ begin
  insert into public.project_members (project_id, user_id, role) values
    (current_setting('test.pid')::uuid, '00000000-0000-0000-0000-00000000000c', 'viewer'),
    (current_setting('test.pid')::uuid, '00000000-0000-0000-0000-00000000000d', 'editor');
  begin
    insert into public.project_members (project_id, user_id, role)
    values (current_setting('test.pid')::uuid, '00000000-0000-0000-0000-00000000000b', 'owner');
    raise exception 'second owner created';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.projects set owner_id = '00000000-0000-0000-0000-00000000000d' where id = current_setting('test.pid')::uuid;
    raise exception 'ownership changed via update';
  exception when insufficient_privilege then null;
  end;
  raise notice 'ok: membership management + ownership protected';
end $$;

-- 4. Carol (viewer) reads but cannot write.
select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
do $$
declare n int;
begin
  if (select count(*) from public.projects) <> 1 then raise exception 'viewer cannot see project'; end if;
  if (select count(*) from public.sitemap_files) <> 1 then raise exception 'viewer cannot see files'; end if;
  if (select count(*) from public.profiles) <> 3 then raise exception 'viewer should see exactly the co-member profiles'; end if;
  update public.sitemap_files set content = 'x';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'viewer updated file'; end if;
  update public.projects set name = 'x';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'viewer updated project'; end if;
  begin
    insert into public.project_notes (project_id, body) values (current_setting('test.pid')::uuid, 'hi');
    raise exception 'viewer inserted note';
  exception when insufficient_privilege then null;
  end;
  raise notice 'ok: viewer is read-only';
end $$;

-- 5. Dave (editor) writes content but cannot change settings, delete the project or edit others' notes.
select pg_temp.act_as('00000000-0000-0000-0000-00000000000d');
do $$
declare n int;
begin
  insert into public.sitemap_files (project_id, name, kind, content) values (current_setting('test.pid')::uuid, 'notes.txt', 'txt', 'hello');
  update public.projects set name = 'renamed';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'editor changed project settings'; end if;
  delete from public.projects;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'editor deleted project'; end if;
  update public.project_notes set body = 'overwritten';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'editor edited another user''s note'; end if;
  raise notice 'ok: editor permissions';
end $$;

-- 6. Owner deletes the project; everything cascades.
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
do $$
declare n int;
begin
  delete from public.projects where id = current_setting('test.pid')::uuid;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'owner could not delete project'; end if;
  raise notice 'ok: owner deletes project';
end $$;

reset role;
do $$ begin
  if (select count(*) from public.sitemap_files) + (select count(*) from public.project_notes)
     + (select count(*) from public.project_members) + (select count(*) from public.validation_findings) <> 0 then
    raise exception 'cascade delete incomplete';
  end if;
  raise notice 'ok: cascade delete';
end $$;

-- 7. Anonymous role sees nothing.
set role anon;
do $$ begin
  begin
    perform count(*) from public.projects;
    raise exception 'anon can read projects';
  exception when insufficient_privilege then raise notice 'ok: anon has no access';
  end;
end $$;
reset role;

\echo 'ALL RLS TESTS PASSED'
