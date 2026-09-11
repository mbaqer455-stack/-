/* ============================================================================
   لوحة التحكم — /admin

   سرّية: لا يوجد أي رابط يدلّ عليها في الموقع، والدخول برمز.
     • الوضع المحلي  : رمز واحد (الافتراضي 1234، يُغيَّر من تبويب الإعدادات)
     • الوضع السحابي : بريد وكلمة مرور لحساب Supabase حقيقي،
                       وسياسات RLS ترفض قراءة بيانات الطلاب بدون تسجيل دخول
                       حتى لو تجاوز أحدهم الواجهة.

   ثلاثة تبويبات: بيانات الطلاب · الفيديوهات · الإعدادات.
   ========================================================================== */

import { useMemo, useState } from 'react';
import {
  api, exportCsv, formatBytes, formatDate, formatDuration, GENDER_LABEL,
  isCloud, MEASURE_FIELDS, printPdf, useAdminSession, useSettings, useSubmissions,
  useToasts, useVideos, type Submission, type VideoItem,
} from '../lib';
import {
  Badge, Button, EmptyState, Field, Icons, Spinner, Stat, Switch,
  TextArea, TextInput, Toasts, useConfirm,
} from '../ui';

type Tab = 'data' | 'videos' | 'settings';

export default function Admin() {
  const session = useAdminSession();

  if (session.checking) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner className="size-6 text-ink-faint" />
      </div>
    );
  }

  return session.authed ? <Panel session={session} /> : <Gate session={session} />;
}

/* ============================== بوابة الدخول ============================= */

function Gate({ session }: { session: ReturnType<typeof useAdminSession> }) {
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isCloud) {
      if (!session.signInPin(pin)) setError('الرمز غير صحيح');
      return;
    }

    setBusy(true);
    const message = await session.signIn(email, password);
    setBusy(false);
    if (message) setError(message);
  };

  return (
    <div className="flex min-h-dvh items-center justify-center px-5 py-16">
      <form onSubmit={submit} className="card flex w-full max-w-sm flex-col gap-5 p-7">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="grid size-14 place-items-center rounded-2xl border border-line bg-surface-2 text-ink-dim">
            <Icons.lock className="size-7" />
          </span>
          <h1 className="text-xl">لوحة التحكم</h1>
          <p className="text-sm text-ink-faint">
            {isCloud ? 'سجّل الدخول بحساب المشرف' : 'أدخل الرمز للمتابعة'}
          </p>
        </div>

        {isCloud ? (
          <>
            <Field label="البريد الإلكتروني">
              {(id) => (
                <TextInput
                  id={id} type="email" value={email} dir="ltr" autoComplete="username"
                  onChange={(e) => setEmail(e.target.value)}
                />
              )}
            </Field>
            <Field label="كلمة المرور">
              {(id) => (
                <TextInput
                  id={id} type="password" value={password} dir="ltr" autoComplete="current-password"
                  onChange={(e) => setPassword(e.target.value)}
                />
              )}
            </Field>
          </>
        ) : (
          <Field label="الرمز">
            {(id) => (
              <TextInput
                id={id}
                type="password"
                inputMode="numeric"
                autoComplete="off"
                autoFocus
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="text-center tracking-[0.4em]"
              />
            )}
          </Field>
        )}

        {error && (
          <p className="flex items-center gap-1.5 text-[13px] text-rose" role="alert">
            <Icons.alert className="size-3.5 shrink-0" />
            {error}
          </p>
        )}

        <Button type="submit" size="lg" icon="lock" loading={busy}>دخول</Button>
      </form>
    </div>
  );
}

/* =============================== اللوحة ================================= */

const TABS: { key: Tab; label: string; icon: 'users' | 'video' | 'grid' }[] = [
  { key: 'data', label: 'بيانات الطلاب', icon: 'users' },
  { key: 'videos', label: 'الفيديوهات', icon: 'video' },
  { key: 'settings', label: 'الإعدادات', icon: 'grid' },
];

function Panel({ session }: { session: ReturnType<typeof useAdminSession> }) {
  const [tab, setTab] = useState<Tab>('data');
  const { toasts, push } = useToasts();

  return (
    <div className="shell py-8 sm:py-12">
      <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl border border-line bg-surface-2 text-ink-dim">
            <Icons.lock className="size-5" />
          </span>
          <div>
            <h1 className="text-xl">لوحة التحكم</h1>
            <p className="text-xs text-ink-faint">
              {isCloud ? session.email || 'مشترك سحابي' : 'وضع محلي — بيانات هذا الجهاز'}
            </p>
          </div>
        </div>

        <Button variant="ghost" icon="logout" onClick={session.signOut}>خروج</Button>
      </header>

      <nav className="mb-6 flex gap-1 overflow-x-auto rounded-pill border border-line bg-surface p-1">
        {TABS.map((t) => {
          const Icon = Icons[t.icon];
          const on = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              aria-current={on ? 'page' : undefined}
              className={`flex h-10 flex-1 cursor-pointer items-center justify-center gap-2
                whitespace-nowrap rounded-pill px-4 text-sm transition-colors duration-200
                ${on ? 'bg-brand font-semibold text-on-brand' : 'text-ink-dim hover:bg-surface-2'}`}
            >
              <Icon className="size-4" />
              {t.label}
            </button>
          );
        })}
      </nav>

      {tab === 'data' && <DataTab push={push} />}
      {tab === 'videos' && <VideosTab push={push} />}
      {tab === 'settings' && <SettingsTab push={push} />}

      <Toasts items={toasts} />
    </div>
  );
}

type Push = (text: string, tone?: 'ok' | 'error' | 'info') => void;

/* ---------------------------- بيانات الطلاب ---------------------------- */

function DataTab({ push }: { push: Push }) {
  const rows = useSubmissions();
  const [q, setQ] = useState('');
  const { confirm, dialog } = useConfirm();

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) =>
      [r.fullName, r.phone].join(' ').toLowerCase().includes(needle));
  }, [rows, q]);

  const remove = (r: Submission) => {
    confirm(`حذف قياس ${r.fullName}؟ لا يمكن التراجع.`, () => {
      api.deleteSubmission(r.id)
        .then(() => push('حُذف السجل'))
        .catch((e: unknown) => push(e instanceof Error ? e.message : 'تعذّر الحذف', 'error'));
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat icon="users" label="عدد القياسات" value={String(rows.length)} />
        <Stat icon="shirt" label="ذكور" value={String(rows.filter((r) => r.gender === 'male').length)} />
        <Stat icon="shirt" label="إناث" value={String(rows.filter((r) => r.gender === 'female').length)} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <TextInput
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث بالاسم أو الهاتف…"
            className="pr-10"
          />
          <Icons.search className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
        </div>

        <Button variant="outline" icon="printer" onClick={printPdf} disabled={!filtered.length}>
          استخراج PDF
        </Button>
        <Button variant="outline" icon="download" onClick={() => exportCsv(filtered)} disabled={!filtered.length}>
          تصدير CSV
        </Button>
      </div>

      {filtered.length ? (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-200 text-sm">
            <thead className="border-b border-line text-xs text-ink-faint">
              <tr>
                {['التاريخ', 'الاسم', 'الهاتف', 'الجنس',
                  ...MEASURE_FIELDS.map((f) => f.label), ''].map((h, i) => (
                  <th key={i} className="whitespace-nowrap px-3 py-3 text-start font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-line-soft last:border-0 hover:bg-surface-2/60">
                  <td className="tabular whitespace-nowrap px-3 py-2.5 text-ink-faint">{formatDate(r.createdAt)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-medium text-ink">{r.fullName}</td>
                  <td className="tabular whitespace-nowrap px-3 py-2.5">{r.phone || '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2.5">{GENDER_LABEL[r.gender]}</td>
                  {MEASURE_FIELDS.map((f) => (
                    <td key={f.key} className="tabular whitespace-nowrap px-3 py-2.5">{r[f.key]}</td>
                  ))}
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => remove(r)}
                      aria-label={`حذف قياس ${r.fullName}`}
                      className="grid size-8 cursor-pointer place-items-center rounded-lg text-ink-faint
                                 transition-colors hover:bg-rose/10 hover:text-rose"
                    >
                      <Icons.trash className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon="users"
          title={rows.length ? 'لا نتائج للبحث' : 'لا توجد قياسات بعد'}
          desc={rows.length ? 'جرّب كلمة أخرى.' : 'ستظهر هنا فور حفظ أول قياس من الصفحة الرئيسية.'}
        />
      )}

      {/* نسخة الطباعة — تظهر فقط عند استخراج PDF */}
      <PrintSheet rows={filtered} />
      {dialog}
    </div>
  );
}

function PrintSheet({ rows }: { rows: Submission[] }) {
  return (
    <div className="print-root" aria-hidden="true">
      <h1 style={{ textAlign: 'center', marginBottom: 12 }}>قياسات الطلاب</h1>
      <table>
        <thead>
          <tr>
            <th>الاسم</th><th>الهاتف</th><th>الجنس</th>
            {MEASURE_FIELDS.map((f) => <th key={f.key}>{f.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.fullName}</td><td>{r.phone}</td><td>{GENDER_LABEL[r.gender]}</td>
              {MEASURE_FIELDS.map((f) => <td key={f.key}>{r[f.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------ الفيديوهات ----------------------------- */

function VideosTab({ push }: { push: Push }) {
  const videos = useVideos();
  const [mode, setMode] = useState<'file' | 'link'>('file');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const { confirm, dialog } = useConfirm();

  const reset = () => { setTitle(''); setDesc(''); setUrl(''); setFile(null); };

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === 'file') {
        if (!file) { push('اختر ملف فيديو أولًا', 'error'); return; }
        await api.addVideoFile(file, { title, description: desc });
      } else {
        if (!url.trim()) { push('الصق رابط الفيديو', 'error'); return; }
        if (!title.trim()) { push('اكتب عنوانًا للفيديو', 'error'); return; }
        await api.addVideoLink({ title, description: desc, url });
      }
      reset();
      push('أُضيف الفيديو');
    } catch (err) {
      push(err instanceof Error ? err.message : 'تعذّر رفع الفيديو', 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = (v: VideoItem) => {
    confirm(`حذف «${v.title}»؟ سيختفي من الصفحة الرئيسية فورًا.`, () => {
      api.deleteVideo(v.id)
        .then(() => push('حُذف الفيديو'))
        .catch((e: unknown) => push(e instanceof Error ? e.message : 'تعذّر الحذف', 'error'));
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={upload} className="card flex flex-col gap-4 p-5 sm:p-6">
        <h2 className="text-lg">إضافة فيديو</h2>

        <div className="flex gap-1 rounded-pill border border-line bg-surface-2 p-1">
          {(['file', 'link'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`h-9 flex-1 cursor-pointer rounded-pill text-sm transition-colors duration-200
                ${mode === m ? 'bg-brand font-semibold text-on-brand' : 'text-ink-dim hover:text-ink'}`}
            >
              {m === 'file' ? 'رفع ملف' : 'رابط خارجي'}
            </button>
          ))}
        </div>

        {mode === 'file' ? (
          <Field label="ملف الفيديو" hint={file ? `${file.name} · ${formatBytes(file.size)}` : 'MP4 أو WebM'}>
            {(id) => (
              <input
                id={id}
                type="file"
                accept="video/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full cursor-pointer rounded-xl border border-line bg-surface-2/70 p-2.5 text-sm
                           file:me-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-brand
                           file:px-3 file:py-1.5 file:text-sm file:text-on-brand"
              />
            )}
          </Field>
        ) : (
          <Field label="رابط الفيديو" hint="يوتيوب، فيميو، أو أي رابط مباشر">
            {(id) => (
              <TextInput
                id={id} value={url} dir="ltr" placeholder="https://youtu.be/…"
                onChange={(e) => setUrl(e.target.value)}
              />
            )}
          </Field>
        )}

        <Field label="العنوان" hint={mode === 'file' ? 'يُترك فارغًا ⇒ اسم الملف' : undefined}>
          {(id) => <TextInput id={id} value={title} onChange={(e) => setTitle(e.target.value)} />}
        </Field>

        <Field label="الوصف" hint="اختياري">
          {(id) => <TextArea id={id} value={desc} onChange={(e) => setDesc(e.target.value)} />}
        </Field>

        <Button type="submit" icon="upload" loading={busy} className="self-start">
          {busy ? 'جارٍ الرفع…' : 'إضافة'}
        </Button>
      </form>

      {videos.length ? (
        <div className="flex flex-col gap-2.5">
          {videos.map((v) => (
            <div key={v.id} className="card flex items-center gap-4 p-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-line bg-surface-2 text-ink-dim">
                <Icons.video className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-ink">{v.title}</div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-ink-faint">
                  <span className="tabular">{formatDate(v.createdAt)}</span>
                  {v.duration > 0 && <span className="tabular">{formatDuration(v.duration)}</span>}
                  {v.size > 0 && <span className="tabular">{formatBytes(v.size)}</span>}
                  <Badge tone="neutral">{v.kind === 'link' ? 'رابط' : 'ملف'}</Badge>
                </div>
              </div>
              <button
                onClick={() => remove(v)}
                aria-label={`حذف ${v.title}`}
                className="grid size-9 cursor-pointer place-items-center rounded-lg text-ink-faint
                           transition-colors hover:bg-rose/10 hover:text-rose"
              >
                <Icons.trash className="size-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon="video" title="لا توجد فيديوهات" desc="ارفع أول فيديو من النموذج أعلاه." />
      )}

      {dialog}
    </div>
  );
}

/* ------------------------------- الإعدادات ----------------------------- */

function SettingsTab({ push }: { push: Push }) {
  const settings = useSettings();
  const [title, setTitle] = useState(settings.closedTitle);
  const [message, setMessage] = useState(settings.closedMessage);
  const [pin, setPin] = useState('');

  const save = async (patch: Parameters<typeof api.updateSettings>[0], ok: string) => {
    try {
      await api.updateSettings(patch);
      push(ok);
    } catch (e) {
      push(e instanceof Error ? e.message : 'تعذّر الحفظ', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="card flex flex-col gap-4 p-5 sm:p-6">
        <h2 className="text-lg">حالة الموقع</h2>

        <Switch
          checked={settings.siteOpen}
          onChange={(v) => void save({ siteOpen: v }, v ? 'فُتح الموقع' : 'أُغلق الموقع')}
          label={settings.siteOpen ? 'الموقع مفتوح' : 'الموقع مغلق'}
          description="عند الإغلاق يرى الزوار رسالتك، وتبقى لوحة التحكم متاحة لك على /admin"
        />

        <div className="divider-x" />

        <Field label="عنوان شاشة الإغلاق">
          {(id) => <TextInput id={id} value={title} onChange={(e) => setTitle(e.target.value)} />}
        </Field>

        <Field label="نص شاشة الإغلاق">
          {(id) => <TextArea id={id} value={message} onChange={(e) => setMessage(e.target.value)} />}
        </Field>

        <Button
          icon="check"
          className="self-start"
          onClick={() => void save({ closedTitle: title, closedMessage: message }, 'حُفظت الرسالة')}
        >
          حفظ الرسالة
        </Button>
      </div>

      {!isCloud && (
        <div className="card flex flex-col gap-4 p-5 sm:p-6">
          <h2 className="text-lg">رمز الدخول</h2>
          <p className="text-sm text-ink-dim">
            الرمز محفوظ في هذا المتصفح فقط. لمشاركة البيانات ورمز موحّد بين أجهزة متعددة،
            اربط الموقع بـ Supabase (الخطوات في README).
          </p>

          <Field label="رمز جديد" hint="4 أرقام على الأقل">
            {(id) => (
              <TextInput
                id={id} type="password" inputMode="numeric" value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="max-w-40 text-center tracking-[0.4em]"
              />
            )}
          </Field>

          <Button
            icon="lock"
            className="self-start"
            disabled={pin.trim().length < 4}
            onClick={() => { void save({ pin: pin.trim() }, 'تغيّر الرمز'); setPin(''); }}
          >
            تغيير الرمز
          </Button>
        </div>
      )}
    </div>
  );
}
