/* ============================================================================
   لوحة التحكم
   • نظرة عامة بالأرقام
   • بيانات الطلاب: بحث + تصدير PDF / CSV + حذف
   • الفيديوهات: رفع ملف أو إضافة رابط + حذف
   • الإعدادات: فتح/إغلاق الموقع + رسالة الإغلاق + رمز الدخول

   الدخول: في الوضع السحابي بحساب Supabase حقيقي (والصلاحيات محمية بـ RLS
   على مستوى قاعدة البيانات، لا بإخفاء الواجهة). في الوضع المحلي برمز داخل
   المتصفح — للتجربة فقط.
   ========================================================================== */

import { createPortal } from 'react-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  api, exportColumns, exportCsv, formatBytes, formatDate, formatDateTime, formatDuration,
  GENDER_LABEL, isCloud, MEASURE_FIELDS, printPdf, useAdminSession, useSettings,
  useSubmissions, useToasts, useVideos, type AdminSession, type Submission,
} from '../lib';
import {
  Badge, Button, EmptyState, Field, Icons, Modal, Spinner, Stat, Switch, TextArea, TextInput,
  Toasts, useConfirm, type IconName,
} from '../ui';

type Push = (text: string, tone?: 'ok' | 'error' | 'info') => void;

/** ينفّذ عملية ويعرض نتيجتها كتنبيه — كل أخطاء الخادم تظهر بالعربية */
const run = (task: Promise<unknown>, okMessage: string, push: Push): void => {
  void task
    .then(() => push(okMessage))
    .catch((err: unknown) => push(err instanceof Error ? err.message : 'حدث خطأ غير متوقع', 'error'));
};

type Tab = 'overview' | 'data' | 'videos' | 'settings';

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'overview', label: 'نظرة عامة', icon: 'grid' },
  { id: 'data', label: 'بيانات الطلاب', icon: 'users' },
  { id: 'videos', label: 'الفيديوهات', icon: 'video' },
  { id: 'settings', label: 'الإعدادات', icon: 'power' },
];

export default function Admin() {
  const session = useAdminSession();
  const [tab, setTab] = useState<Tab>('overview');
  const { toasts, push } = useToasts();

  if (!session.authed) return <Gate session={session} />;

  return (
    <div className="shell flex flex-col gap-6 py-8">
      <Toasts items={toasts} />

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl border border-gold/25 bg-gold/10 text-gold">
            <Icons.lock className="size-5" />
          </span>
          <div>
            <h1 className="text-xl">لوحة التحكم</h1>
            <p className="text-[13px] text-ink-faint">
              {session.email || 'إدارة القياسات والفيديوهات وحالة الموقع'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge tone={isCloud ? 'mint' : 'neutral'} icon={isCloud ? 'link' : 'lock'}>
            {isCloud ? 'مشترك' : 'محلي'}
          </Badge>
          <Button variant="ghost" size="sm" icon="logout" onClick={session.signOut}>خروج</Button>
        </div>
      </header>

      {/* التبويبات */}
      <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1" aria-label="أقسام لوحة التحكم">
        {TABS.map((t) => {
          const Icon = Icons[t.icon];
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-current={active ? 'page' : undefined}
              className={`flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl border px-4 text-sm transition-colors duration-200
                ${active
                  ? 'border-gold/40 bg-gold/10 font-semibold text-gold'
                  : 'border-line bg-surface/50 text-ink-dim hover:bg-surface-2 hover:text-ink'}`}
            >
              <Icon className="size-4" />
              {t.label}
            </button>
          );
        })}
      </nav>

      {tab === 'overview' && <Overview onGo={setTab} push={push} />}
      {tab === 'data' && <DataPanel push={push} />}
      {tab === 'videos' && <VideosPanel push={push} />}
      {tab === 'settings' && <SettingsPanel push={push} />}
    </div>
  );
}

/* ------------------------------ بوابة الدخول ---------------------------- */

function Gate({ session }: { session: AdminSession }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isCloud) {
      if (!session.signInPin(pin)) { setError('رمز الدخول غير صحيح'); setPin(''); }
      return;
    }

    setBusy(true);
    const message = await session.signIn(email, password);
    setBusy(false);
    if (message) { setError(message); setPassword(''); }
  };

  // بانتظار التحقق من الجلسة المحفوظة
  if (session.checking) {
    return (
      <div className="flex min-h-[70dvh] items-center justify-center gap-3 text-ink-faint">
        <Spinner className="size-5" />
        <span className="text-sm">جارٍ التحقق…</span>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[70dvh] items-center justify-center px-5">
      <div className="glow-gold pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />

      <form onSubmit={submit} className="card relative z-10 flex w-full max-w-sm flex-col gap-5 p-7">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="grid size-14 place-items-center rounded-2xl border border-gold/25 bg-gold/10 text-gold">
            <Icons.lock className="size-6" />
          </span>
          <h1 className="text-xl">لوحة التحكم</h1>
          <p className="text-[13px] text-ink-dim">
            {isCloud ? 'سجّل الدخول بحساب المشرف' : 'أدخل رمز الدخول للمتابعة'}
          </p>
        </div>

        {isCloud ? (
          <>
            <Field label="البريد الإلكتروني">
              {(id) => (
                <TextInput
                  id={id} type="email" autoComplete="email" autoFocus required
                  value={email} dir="ltr" placeholder="you@example.com"
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                />
              )}
            </Field>

            <Field label="كلمة المرور" error={error}>
              {(id, invalid) => (
                <TextInput
                  id={id} type="password" autoComplete="current-password" required
                  value={password} invalid={invalid} dir="ltr" placeholder="••••••••"
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                />
              )}
            </Field>
          </>
        ) : (
          <Field label="رمز الدخول" error={error} hint="الرمز الافتراضي في الوضع المحلي: 1234">
            {(id, invalid) => (
              <TextInput
                id={id} type="password" inputMode="numeric" autoFocus
                value={pin} invalid={invalid} placeholder="••••" dir="ltr"
                className="text-center text-lg tracking-[0.4em]"
                onChange={(e) => { setPin(e.target.value); setError(''); }}
              />
            )}
          </Field>
        )}

        <Button type="submit" icon="check" loading={busy} className="w-full">
          {busy ? 'جارٍ الدخول…' : 'دخول'}
        </Button>

        {isCloud && (
          <p className="text-center text-[11px] leading-relaxed text-ink-faint">
            الحسابات تُنشأ من لوحة Supabase ← Authentication ← Users.
            لا يوجد تسجيل ذاتي.
          </p>
        )}
      </form>
    </div>
  );
}

/* ------------------------------- نظرة عامة ------------------------------ */

function Overview({ onGo, push }: { onGo: (t: Tab) => void; push: Push }) {
  const rows = useSubmissions();
  const videos = useVideos();
  const settings = useSettings();

  const males = rows.filter((r) => r.gender === 'male').length;
  const avgHeight = rows.length
    ? Math.round(rows.reduce((s, r) => s + r.height, 0) / rows.length)
    : 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon="users" label="إجمالي القياسات" value={String(rows.length)} sub={`${males} ذكر · ${rows.length - males} أنثى`} />
        <Stat icon="video" label="الفيديوهات المنشورة" value={String(videos.length)} tone="sky" />
        <Stat icon="ruler" label="متوسط الطول" value={avgHeight ? `${avgHeight} سم` : '—'} tone="mint" />
        <Stat
          icon="power"
          label="حالة الموقع"
          value={settings.siteOpen ? 'مفتوح' : 'مغلق'}
          tone={settings.siteOpen ? 'mint' : 'rose'}
        />
      </div>

      {/* إجراءات سريعة */}
      <div className="card flex flex-col gap-4 p-5">
        <h2 className="text-base font-semibold">إجراءات سريعة</h2>
        <div className="flex flex-wrap gap-2.5">
          <Button icon="printer" onClick={() => { onGo('data'); setTimeout(printPdf, 350); }}>
            استخراج PDF لبيانات الطلاب
          </Button>
          <Button variant="outline" icon="upload" onClick={() => onGo('videos')}>رفع فيديو جديد</Button>
          <Button variant="outline" icon="power" onClick={() => onGo('settings')}>فتح / إغلاق الموقع</Button>
          {rows.length === 0 && (
            <Button
              variant="ghost"
              icon="plus"
              onClick={() => { run(api.seedDemo(), 'تمت إضافة بيانات تجريبية', push); }}
            >
              إضافة بيانات تجريبية
            </Button>
          )}
        </div>
      </div>

      {/* آخر القياسات */}
      <div className="card flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">آخر القياسات</h2>
          <button onClick={() => onGo('data')} className="cursor-pointer text-[13px] text-gold hover:underline">
            عرض الكل
          </button>
        </div>

        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-faint">لا توجد قياسات بعد.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {rows.slice(0, 5).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.fullName}</p>
                  <p className="tabular truncate text-xs text-ink-faint">
                    {r.studentId} · {r.section || '—'}
                  </p>
                </div>
                <span className="tabular shrink-0 text-xs text-ink-faint">{formatDate(r.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* --------------------------- بيانات الطلاب ------------------------------ */

function DataPanel({ push }: { push: Push }) {
  const rows = useSubmissions();
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState<Submission | null>(null);
  const { confirm, dialog } = useConfirm();

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return rows;
    return rows.filter((r) => `${r.fullName} ${r.studentId} ${r.section}`.includes(q));
  }, [rows, query]);

  return (
    <div className="flex flex-col gap-4">
      {dialog}

      {/* أدوات */}
      <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <TextInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="بحث بالاسم أو الرقم الجامعي…"
            className="pr-11"
            aria-label="بحث في القياسات"
          />
          <Icons.search className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            icon="printer"
            onClick={() => {
              if (!filtered.length) return push('لا توجد بيانات للتصدير', 'error');
              printPdf();
            }}
          >
            استخراج PDF
          </Button>
          <Button
            variant="outline"
            icon="download"
            onClick={() => {
              if (!filtered.length) return push('لا توجد بيانات للتصدير', 'error');
              exportCsv(filtered);
              push('تم تنزيل ملف CSV');
            }}
          >
            CSV
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon="users"
          title="لا توجد قياسات مُسجّلة"
          desc="ستظهر هنا فور إرسال الطلاب لقياساتهم."
          action={
            <Button
              size="sm"
              variant="outline"
              icon="plus"
              onClick={() => { run(api.seedDemo(), 'تمت إضافة بيانات تجريبية', push); }}
            >
              إضافة بيانات تجريبية
            </Button>
          }
        />
      ) : (
        <>
          <p className="text-[13px] text-ink-faint">
            {filtered.length} من {rows.length} سجل — التصدير يشمل النتائج المعروضة.
          </p>

          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line bg-surface-2/60 text-[13px] text-ink-dim">
                    <Th>الاسم</Th>
                    <Th>الرقم الجامعي</Th>
                    <Th>الجنس</Th>
                    {MEASURE_FIELDS.map((f) => <Th key={f.key}>{f.label}</Th>)}
                    <Th>التاريخ</Th>
                    <Th> </Th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr
                      key={r.id}
                      className="cursor-pointer border-b border-line/60 transition-colors last:border-0 hover:bg-surface-2/50"
                      onClick={() => setDetail(r)}
                    >
                      <Td className="font-medium">{r.fullName}</Td>
                      <Td className="tabular">{r.studentId}</Td>
                      <Td>
                        <Badge tone={r.gender === 'male' ? 'sky' : 'gold'}>{GENDER_LABEL[r.gender]}</Badge>
                      </Td>
                      {MEASURE_FIELDS.map((f) => (
                        <Td key={f.key} className="tabular text-ink-dim">{r[f.key]}</Td>
                      ))}
                      <Td className="tabular whitespace-nowrap text-xs text-ink-faint">{formatDate(r.createdAt)}</Td>
                      <Td>
                        <button
                          aria-label={`حذف سجل ${r.fullName}`}
                          className="cursor-pointer rounded-lg p-2 text-ink-faint transition-colors hover:bg-rose/10 hover:text-rose"
                          onClick={(e) => {
                            e.stopPropagation();
                            confirm(`سيتم حذف سجل «${r.fullName}» نهائيًا.`, () => {
                              run(api.deleteSubmission(r.id), 'تم حذف السجل', push);
                            });
                          }}
                        >
                          <Icons.trash className="size-4" />
                        </button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <DetailModal row={detail} onClose={() => setDetail(null)} />

      {/* تقرير الطباعة — مخفي على الشاشة، يظهر عند التصدير فقط */}
      <PrintReport rows={filtered} />
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="whitespace-nowrap px-3 py-2.5 text-start font-medium">{children}</th>;
}

function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2.5 text-start ${className}`}>{children}</td>;
}

function DetailModal({ row, onClose }: { row: Submission | null; onClose: () => void }) {
  return (
    <Modal open={Boolean(row)} onClose={onClose} title={row?.fullName ?? ''}>
      {row && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <Badge icon="users">{GENDER_LABEL[row.gender]}</Badge>
            <Badge icon="clock">{formatDateTime(row.createdAt)}</Badge>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
            <Pair label="الرقم الجامعي" value={row.studentId} />
            <Pair label="المرحلة/الشعبة" value={row.section || '—'} />
            <Pair label="الهاتف" value={row.phone || '—'} />
            {MEASURE_FIELDS.map((f) => (
              <Pair key={f.key} label={f.label} value={`${row[f.key]} ${f.unit}`} />
            ))}
          </dl>

          {row.notes && (
            <div className="rounded-xl border border-line bg-surface-2/50 p-3 text-sm text-ink-dim">
              <span className="mb-1 block text-xs text-ink-faint">ملاحظات</span>
              {row.notes}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function Pair({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-ink-faint">{label}</dt>
      <dd className="tabular text-end font-medium">{value}</dd>
    </>
  );
}

/* ------------------------- تقرير الطباعة (PDF) -------------------------- */

function PrintReport({ rows }: { rows: Submission[] }) {
  return createPortal(
    <div className="print-root" dir="rtl">
      <div style={{ marginBottom: '10mm' }}>
        <h1 style={{ fontSize: '16pt', margin: 0 }}>تقرير قياسات الطلاب</h1>
        <p style={{ fontSize: '10pt', margin: '4px 0 0', color: '#444' }}>
          عدد السجلات: {rows.length} · تاريخ الاستخراج: {formatDateTime(Date.now())}
        </p>
      </div>

      <table>
        <thead>
          <tr>
            <th style={{ width: '8mm' }}>#</th>
            {exportColumns.map((c) => <th key={c.label}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id}>
              <td>{i + 1}</td>
              {exportColumns.map((c) => <td key={c.label}>{c.get(r)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{ fontSize: '9pt', color: '#666', marginTop: '8mm' }}>
        منصة قياس — تقرير آلي.
      </p>
    </div>,
    document.body,
  );
}

/* ----------------------------- الفيديوهات ------------------------------- */

function VideosPanel({ push }: { push: Push }) {
  const videos = useVideos();
  const [mode, setMode] = useState<'file' | 'link'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { confirm, dialog } = useConfirm();

  const pick = (f: File | null | undefined) => {
    if (!f) return;
    if (!f.type.startsWith('video/')) return push('اختر ملف فيديو صالح', 'error');
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''));
  };

  const reset = () => { setFile(null); setTitle(''); setDesc(''); setUrl(''); };

  const upload = async () => {
    setBusy(true);
    try {
      if (mode === 'file') {
        if (!file) { push('اختر ملف الفيديو أولًا', 'error'); return; }
        await api.addVideoFile(file, { title, description: desc });
      } else {
        if (!/^https?:\/\//i.test(url.trim())) { push('أدخل رابطًا صالحًا يبدأ بـ http', 'error'); return; }
        if (!title.trim()) { push('أضف عنوانًا للفيديو', 'error'); return; }
        await api.addVideoLink({ title, description: desc, url });
      }
      reset();
      push('تم نشر الفيديو في الموقع');
    } catch (err) {
      push(err instanceof Error ? err.message : 'تعذّر حفظ الفيديو', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {dialog}

      {/* الرفع */}
      <section className="card flex flex-col gap-5 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Icons.upload className="size-4 text-gold" />
            رفع فيديو جديد
          </h2>
          <div className="flex rounded-xl border border-line p-1">
            {([['file', 'ملف'], ['link', 'رابط']] as const).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setMode(id)}
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-[13px] transition-colors
                  ${mode === id ? 'bg-gold/15 font-semibold text-gold' : 'text-ink-dim hover:text-ink'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {mode === 'file' ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files?.[0]); }}
            onClick={() => inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center gap-2 rounded-card border-2 border-dashed px-6 py-10 text-center transition-colors duration-200
              ${dragging ? 'border-gold/60 bg-gold/5' : 'border-line hover:border-gold/35 hover:bg-surface-2/40'}`}
          >
            <span className="grid size-12 place-items-center rounded-2xl border border-line bg-surface-2 text-gold">
              <Icons.upload className="size-5" />
            </span>
            {file ? (
              <>
                <p className="text-sm font-medium">{file.name}</p>
                <p className="tabular text-xs text-ink-faint">{formatBytes(file.size)}</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium">اسحب الفيديو هنا أو اضغط للاختيار</p>
                <p className="text-xs text-ink-faint">MP4 / WebM / MOV — يُحفظ داخل المتصفح في هذا القالب</p>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="video/*"
              hidden
              onChange={(e) => pick(e.target.files?.[0])}
            />
          </div>
        ) : (
          <Field label="رابط الفيديو" hint="رابط مباشر لملف mp4/webm">
            {(id) => (
              <TextInput
                id={id} value={url} dir="ltr" placeholder="https://example.com/video.mp4"
                onChange={(e) => setUrl(e.target.value)}
              />
            )}
          </Field>
        )}

        <Field label="عنوان الفيديو" required>
          {(id) => (
            <TextInput id={id} value={title} placeholder="مثال: طريقة أخذ قياس الصدر"
              onChange={(e) => setTitle(e.target.value)} />
          )}
        </Field>

        <Field label="وصف مختصر" hint="اختياري — يظهر تحت العنوان في الموقع">
          {(id) => (
            <TextArea id={id} value={desc} placeholder="شرح خطوة بخطوة…"
              onChange={(e) => setDesc(e.target.value)} />
          )}
        </Field>

        <div className="flex flex-wrap gap-2.5">
          <Button icon="upload" loading={busy} onClick={() => void upload()}>
            {busy ? 'جارٍ المعالجة…' : 'نشر الفيديو'}
          </Button>
          {(file || title || desc || url) && (
            <Button variant="ghost" onClick={reset}>مسح الحقول</Button>
          )}
        </div>
      </section>

      {/* القائمة */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">الفيديوهات المنشورة ({videos.length})</h2>

        {videos.length === 0 ? (
          <EmptyState icon="video" title="لم تُنشر أي فيديوهات" desc="ارفع أول فيديو من الأعلى ليظهر في الموقع." />
        ) : (
          <ul className="flex flex-col gap-2.5">
            {videos.map((v) => (
              <li key={v.id} className="card flex items-center gap-3 p-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-line bg-surface-2 text-ink-faint">
                  <Icons.video className="size-5" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{v.title}</p>
                  <p className="tabular truncate text-xs text-ink-faint">
                    {formatDate(v.createdAt)}
                    {v.duration > 0 && ` · ${formatDuration(v.duration)}`}
                    {v.size > 0 && ` · ${formatBytes(v.size)}`}
                    {v.kind === 'link' && ' · رابط خارجي'}
                  </p>
                </div>

                <button
                  aria-label={`حذف ${v.title}`}
                  className="cursor-pointer rounded-lg p-2.5 text-ink-faint transition-colors hover:bg-rose/10 hover:text-rose"
                  onClick={() =>
                    confirm(`سيتم حذف «${v.title}» من الموقع نهائيًا.`, () => {
                      run(api.deleteVideo(v.id), 'تم حذف الفيديو', push);
                    })
                  }
                >
                  <Icons.trash className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ------------------------------- الإعدادات ------------------------------ */


function SettingsPanel({ push }: { push: Push }) {
  const settings = useSettings();
  const rows = useSubmissions();
  const { confirm, dialog } = useConfirm();
  const [pin, setPin] = useState(settings.pin);

  // نسخة محلية من نصوص الإغلاق — تُحفظ عند مغادرة الحقل لا مع كل حرف
  const [title, setTitle] = useState(settings.closedTitle);
  const [message, setMessage] = useState(settings.closedMessage);

  useEffect(() => { setTitle(settings.closedTitle); }, [settings.closedTitle]);
  useEffect(() => { setMessage(settings.closedMessage); }, [settings.closedMessage]);

  const saveText = (patch: { closedTitle?: string; closedMessage?: string }, current: string) => {
    const next = patch.closedTitle ?? patch.closedMessage ?? '';
    if (next.trim() === current.trim()) return;
    run(api.updateSettings(patch), 'تم حفظ النص', push);
  };

  return (
    <div className="flex flex-col gap-5">
      {dialog}

      {/* حالة الموقع */}
      <section className={`card flex flex-col gap-4 p-5 ${settings.siteOpen ? '' : 'border-rose/30'}`}>
        <div className="flex items-start justify-between gap-4">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Icons.power className="size-4 text-gold" />
            حالة الموقع
          </h2>
          <Badge tone={settings.siteOpen ? 'mint' : 'rose'}>
            {settings.siteOpen ? 'مفتوح للزوار' : 'مغلق'}
          </Badge>
        </div>

        <Switch
          checked={settings.siteOpen}
          label={settings.siteOpen ? 'الموقع مفتوح — الطلاب يستطيعون الإدخال' : 'الموقع مغلق — تظهر رسالة الإغلاق'}
          description={isCloud
            ? 'يطبَّق على كل الأجهزة فورًا. لوحة التحكم تبقى متاحة لكم.'
            : 'لوحة التحكم تبقى متاحة لك في الحالتين.'}
          onChange={(v) => {
            const apply = () =>
              run(api.updateSettings({ siteOpen: v }), v ? 'تم فتح الموقع' : 'تم إغلاق الموقع', push);
            if (!v) confirm('سيتم منع الطلاب من إدخال القياسات حتى تعيد الفتح.', apply);
            else apply();
          }}
        />

        <div className="divider-x" />

        <Field label="عنوان رسالة الإغلاق" hint="يُحفظ عند الخروج من الحقل">
          {(id) => (
            <TextInput
              id={id}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => saveText({ closedTitle: title }, settings.closedTitle)}
            />
          )}
        </Field>

        <Field label="نص رسالة الإغلاق" hint="يظهر للزوار عندما يكون الموقع مغلقًا">
          {(id) => (
            <TextArea
              id={id}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onBlur={() => saveText({ closedMessage: message }, settings.closedMessage)}
            />
          )}
        </Field>
      </section>

      {/* الحساب / رمز الدخول */}
      {isCloud ? (
        <section className="card flex flex-col gap-3 p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Icons.users className="size-4 text-gold" />
            حسابات المشرفين
          </h2>
          <p className="text-[13px] leading-relaxed text-ink-dim">
            الدخول هنا بحساب حقيقي محمي من الخادم، وليس برمز داخل المتصفح.
            لإضافة شريك أو تغيير كلمة مرور:
          </p>
          <ol className="flex list-inside list-decimal flex-col gap-1.5 text-[13px] text-ink-dim">
            <li>افتح لوحة Supabase ← <span className="text-ink">Authentication</span> ← <span className="text-ink">Users</span></li>
            <li>اضغط <span className="text-ink">Add user</span> وأدخل البريد وكلمة المرور</li>
            <li>فعّل <span className="text-ink">Auto Confirm User</span> حتى يدخل مباشرة</li>
          </ol>
          <p className="text-[13px] text-ink-faint">
            كل من له حساب يرى نفس البيانات ويستطيع إدارتها.
          </p>
        </section>
      ) : (
        <section className="card flex flex-col gap-4 p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Icons.lock className="size-4 text-gold" />
            رمز الدخول
          </h2>

          <Field label="الرمز الحالي" hint="الوضع المحلي فقط — يُحفظ داخل هذا المتصفح.">
            {(id) => (
              <div className="flex gap-2">
                <TextInput
                  id={id} value={pin} dir="ltr" className="text-center tracking-[0.3em]"
                  onChange={(e) => setPin(e.target.value)}
                />
                <Button
                  variant="outline"
                  icon="check"
                  onClick={() => {
                    if (pin.trim().length < 4) return push('الرمز يجب أن يكون 4 خانات على الأقل', 'error');
                    run(api.updateSettings({ pin: pin.trim() }), 'تم تحديث رمز الدخول', push);
                  }}
                >
                  حفظ
                </Button>
              </div>
            )}
          </Field>
        </section>
      )}

      {/* منطقة خطرة */}
      <section className="card flex flex-col gap-4 border-rose/25 p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-rose">
          <Icons.alert className="size-4" />
          منطقة الحذف
        </h2>
        <p className="text-[13px] text-ink-dim">
          حذف جميع قياسات الطلاب ({rows.length} سجل){isCloud ? ' من قاعدة البيانات المشتركة' : ''}. لا يمكن التراجع.
        </p>
        <Button
          variant="danger"
          icon="trash"
          className="w-fit"
          onClick={() =>
            confirm('سيتم حذف كل سجلات القياسات نهائيًا. هل أنت متأكد؟', () => {
              run(api.clearSubmissions(), 'تم حذف جميع السجلات', push);
            })
          }
        >
          حذف كل القياسات
        </Button>
      </section>
    </div>
  );
}
