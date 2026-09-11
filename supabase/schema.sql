-- ============================================================================
-- قياس — مخطط قاعدة البيانات (Supabase / PostgreSQL)
--
-- طريقة التشغيل:
--   افتح مشروعك في supabase.com ← SQL Editor ← New query
--   الصق هذا الملف كاملًا ← Run
--   (آمن للتشغيل أكثر من مرة)
--
-- نموذج الصلاحيات:
--   • الطالب (زائر بدون حساب): يُدخل قياسه فقط + يقرأ الفيديوهات وحالة الموقع
--   • المشرف (حساب مسجّل): يقرأ ويحذف القياسات، يرفع الفيديوهات، يفتح/يغلق الموقع
--   يعني: لا أحد يستطيع قراءة بيانات الطلاب إلا أنت وشريكك بعد تسجيل الدخول.
-- ============================================================================

-- ------------------------------- القياسات -----------------------------------

create table if not exists public.submissions (
  id             text primary key,
  "createdAt"    bigint      not null,
  "fullName"     text        not null,
  phone          text        not null default '',
  gender         text        not null check (gender in ('male', 'female')),
  height         numeric     not null,
  weight         numeric     not null,
  width          numeric     not null,
  "chestWidth"   numeric     not null,
  "chestLength"  numeric     not null,
  "sleeveLength" numeric     not null,
  notes          text        not null default ''
);

-- حقول أُزيلت من النموذج (الرقم الجامعي/المرحلة/الشعبة).
-- لا نحذف الأعمدة حتى لا تضيع بيانات قديمة — نُرخي قيد NOT NULL فقط
-- كي تنجح الإضافات الجديدة على قاعدة أُنشئت قبل الإزالة.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'submissions' and column_name = 'studentId'
  ) then
    execute 'alter table public.submissions alter column "studentId" drop not null';
    execute 'alter table public.submissions alter column "studentId" set default ''''';
  end if;
end $$;

create index if not exists submissions_created_idx on public.submissions ("createdAt" desc);

alter table public.submissions enable row level security;

drop policy if exists "students can submit" on public.submissions;
create policy "students can submit"
  on public.submissions for insert
  to anon, authenticated
  with check (true);

drop policy if exists "admins can read" on public.submissions;
create policy "admins can read"
  on public.submissions for select
  to authenticated
  using (true);

drop policy if exists "admins can delete" on public.submissions;
create policy "admins can delete"
  on public.submissions for delete
  to authenticated
  using (true);

-- ------------------------------ الفيديوهات ----------------------------------

create table if not exists public.videos (
  id            text primary key,
  "createdAt"   bigint  not null,
  title         text    not null,
  description   text    not null default '',
  kind          text    not null default 'file' check (kind in ('file', 'link')),
  url           text    not null default '',
  "blobKey"     text    not null default '',   -- مسار الملف داخل مخزن media
  "posterKey"   text    not null default '',   -- مسار الصورة المصغّرة
  size          bigint  not null default 0,
  mime          text    not null default '',
  duration      numeric not null default 0
);

create index if not exists videos_created_idx on public.videos ("createdAt" desc);

alter table public.videos enable row level security;

drop policy if exists "everyone can watch" on public.videos;
create policy "everyone can watch"
  on public.videos for select
  to anon, authenticated
  using (true);

drop policy if exists "admins manage videos" on public.videos;
create policy "admins manage videos"
  on public.videos for all
  to authenticated
  using (true)
  with check (true);

-- ------------------------------- الإعدادات ----------------------------------

create table if not exists public.settings (
  id              int primary key default 1 check (id = 1),
  "siteOpen"      boolean not null default true,
  "closedTitle"   text    not null default 'الموقع مغلق مؤقتًا',
  "closedMessage" text    not null default 'تم إيقاف استقبال القياسات حاليًا. يرجى المحاولة لاحقًا أو مراجعة الإدارة.'
);

insert into public.settings (id) values (1) on conflict (id) do nothing;

alter table public.settings enable row level security;

drop policy if exists "everyone reads settings" on public.settings;
create policy "everyone reads settings"
  on public.settings for select
  to anon, authenticated
  using (true);

drop policy if exists "admins update settings" on public.settings;
create policy "admins update settings"
  on public.settings for update
  to authenticated
  using (true)
  with check (true);

-- ------------------------- التحديث اللحظي (Realtime) ------------------------
-- حتى يظهر أي تغيير عند شريكك مباشرة بدون تحديث الصفحة

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'submissions'
  ) then
    alter publication supabase_realtime add table public.submissions;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'videos'
  ) then
    alter publication supabase_realtime add table public.videos;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'settings'
  ) then
    alter publication supabase_realtime add table public.settings;
  end if;
end $$;

-- ------------------------ مخزن الملفات (Storage) ----------------------------
-- مخزن عام للقراءة (حتى تعمل الفيديوهات للزوار) والرفع للمشرفين فقط

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

drop policy if exists "public can read media" on storage.objects;
create policy "public can read media"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'media');

drop policy if exists "admins upload media" on storage.objects;
create policy "admins upload media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'media');

drop policy if exists "admins delete media" on storage.objects;
create policy "admins delete media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'media');

-- ============================================================================
-- الخطوة الأخيرة (من الواجهة وليس هنا):
--   Authentication ← Users ← Add user
--   أنشئ حسابًا لك وحسابًا لشريكك (بريد + كلمة مرور)، وفعّل Auto Confirm.
--   هذان الحسابان هما المشرفان — لا يوجد تسجيل ذاتي.
-- ============================================================================
