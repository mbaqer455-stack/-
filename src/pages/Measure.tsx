/* ============================================================================
   صفحة إدخال القياسات — معاينة 3D حيّة فوق النموذج، بعمود واحد.
   ========================================================================== */

import { lazy, Suspense, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  api, DEFAULT_MEASURES, GENDER_LABEL, MEASURE_FIELDS, useInView, useToasts,
  validateSubmission, type FormErrors, type Gender, type MeasureKey, type Submission,
} from '../lib';
import {
  Badge, Button, ChoiceGroup, Field, Icons, SectionHead, TextArea, TextInput, Toasts,
} from '../ui';

const FittingScene = lazy(() =>
  import('../three/Scene').then((m) => ({ default: m.FittingScene })),
);

type Draft = Omit<Submission, 'id' | 'createdAt'>;

const EMPTY: Draft = {
  fullName: '', studentId: '', phone: '', section: '', gender: 'male',
  ...DEFAULT_MEASURES, notes: '',
};

export default function Measure() {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [focusKey, setFocusKey] = useState<MeasureKey | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<Submission | null>(null);
  const { toasts, push } = useToasts();
  const { ref: stageRef, inView } = useInView<HTMLDivElement>('160px');

  const measures = useMemo(
    () => ({
      height: draft.height, weight: draft.weight, width: draft.width,
      chestWidth: draft.chestWidth, chestLength: draft.chestLength, sleeveLength: draft.sleeveLength,
    }),
    [draft.height, draft.weight, draft.width, draft.chestWidth, draft.chestLength, draft.sleeveLength],
  );

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    if (touched[key]) {
      setErrors(validateSubmission({ ...draft, [key]: value }));
    }
  };

  const blur = (key: keyof Draft) => {
    setTouched((t) => ({ ...t, [key]: true }));
    setErrors(validateSubmission(draft));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = validateSubmission(draft);
    setErrors(found);
    setTouched(Object.fromEntries(Object.keys(draft).map((k) => [k, true])));

    if (Object.keys(found).length) {
      push('راجع الحقول المعلّمة بالأحمر', 'error');
      document.querySelector('[aria-invalid="true"]')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }

    setSaving(true);
    const row = await api.addSubmission(draft);
    setSaving(false);
    setDone(row);
  };

  if (done) return <SuccessView row={done} onAgain={() => { setDone(null); setDraft(EMPTY); setTouched({}); }} />;

  return (
    <div className="shell-narrow flex flex-col gap-8 py-10">
      <Toasts items={toasts} />

      <SectionHead
        eyebrow="نموذج القياس"
        title="أدخل قياساتك"
        desc="حرّك أي شريط وشاهد المجسّم يتغيّر مباشرة. الحقول المعلّمة بـ * إلزامية."
      />

      {/* المعاينة الحيّة */}
      <div ref={stageRef} className="card relative h-[clamp(280px,42vh,420px)] overflow-hidden">
        <div className="glow-gold pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <Suspense fallback={null}>
          <FittingScene measures={measures} gender={draft.gender} active={inView} focus={focusKey} />
        </Suspense>
        <span className="pointer-events-none absolute bottom-3 start-1/2 -translate-x-1/2 rounded-pill border border-line bg-bg/70 px-3 py-1 text-[11px] text-ink-faint backdrop-blur-sm">
          اسحب بإصبعك أو الفأرة لتدوير المجسّم
        </span>
      </div>

      <form onSubmit={submit} noValidate className="flex flex-col gap-8">
        {/* بيانات الطالب */}
        <fieldset className="card flex flex-col gap-5 p-5 sm:p-6">
          <legend className="flex items-center gap-2 px-2 text-sm font-semibold text-gold">
            <Icons.users className="size-4" />
            بيانات الطالب
          </legend>

          <Field label="الاسم الكامل" required error={touched.fullName ? errors.fullName : undefined}>
            {(id, invalid) => (
              <TextInput
                id={id} value={draft.fullName} invalid={invalid} autoComplete="name"
                placeholder="مثال: محمد باقر حسن"
                onChange={(e) => set('fullName', e.target.value)}
                onBlur={() => blur('fullName')}
              />
            )}
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="الرقم الجامعي" required error={touched.studentId ? errors.studentId : undefined}>
              {(id, invalid) => (
                <TextInput
                  id={id} value={draft.studentId} invalid={invalid} inputMode="numeric"
                  placeholder="20241100"
                  onChange={(e) => set('studentId', e.target.value)}
                  onBlur={() => blur('studentId')}
                />
              )}
            </Field>

            <Field label="المرحلة / الشعبة" hint="اختياري">
              {(id) => (
                <TextInput
                  id={id} value={draft.section} placeholder="المرحلة الأولى - أ"
                  onChange={(e) => set('section', e.target.value)}
                />
              )}
            </Field>
          </div>

          <Field label="رقم الهاتف" hint="اختياري — للتواصل عند الحاجة" error={touched.phone ? errors.phone : undefined}>
            {(id, invalid) => (
              <TextInput
                id={id} value={draft.phone} invalid={invalid} type="tel" inputMode="tel"
                placeholder="07700000000" dir="ltr" className="text-end"
                onChange={(e) => set('phone', e.target.value)}
                onBlur={() => blur('phone')}
              />
            )}
          </Field>

          <Field label="الجنس" required group error={touched.gender ? errors.gender : undefined}>
            {() => (
              <ChoiceGroup<Gender>
                name="الجنس"
                value={draft.gender}
                onChange={(v) => set('gender', v)}
                options={[
                  { value: 'male', label: GENDER_LABEL.male, icon: 'users' },
                  { value: 'female', label: GENDER_LABEL.female, icon: 'users' },
                ]}
              />
            )}
          </Field>
        </fieldset>

        {/* القياسات */}
        <fieldset className="card flex flex-col gap-6 p-5 sm:p-6">
          <legend className="flex items-center gap-2 px-2 text-sm font-semibold text-gold">
            <Icons.ruler className="size-4" />
            القياسات
          </legend>

          {MEASURE_FIELDS.map((f) => (
            <MeasureRow
              key={f.key}
              def={f}
              value={draft[f.key]}
              error={touched[f.key] ? errors[f.key] : undefined}
              onChange={(v) => set(f.key, v)}
              onFocus={() => setFocusKey(f.key)}
              onBlur={() => { setFocusKey(null); blur(f.key); }}
            />
          ))}
        </fieldset>

        {/* ملاحظات */}
        <fieldset className="card p-5 sm:p-6">
          <legend className="px-2 text-sm font-semibold text-gold">ملاحظات إضافية</legend>
          <Field label="ملاحظة" hint="أي تفصيل يخص القياس — اختياري">
            {(id) => (
              <TextArea
                id={id} value={draft.notes} placeholder="مثال: أفضّل الكم أطول قليلًا"
                onChange={(e) => set('notes', e.target.value)}
              />
            )}
          </Field>
        </fieldset>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button type="submit" size="lg" icon="check" loading={saving} className="w-full sm:w-auto">
            {saving ? 'جارٍ الإرسال…' : 'إرسال القياس'}
          </Button>
          <p className="text-xs text-ink-faint">
            بالإرسال أنت توافق على استخدام هذه البيانات لغرض تجهيز القياس فقط.
          </p>
        </div>
      </form>
    </div>
  );
}

/* ------------------------- صف قياس: رقم + شريط -------------------------- */

interface RowProps {
  def: (typeof MEASURE_FIELDS)[number];
  value: number;
  error?: string;
  onChange: (v: number) => void;
  onFocus: () => void;
  onBlur: () => void;
}

function MeasureRow({ def, value, error, onChange, onFocus, onBlur }: RowProps) {
  const pct = ((value - def.min) / (def.max - def.min)) * 100;

  return (
    <Field label={def.label} hint={def.hint} error={error} required suffix={def.unit}>
      {(id, invalid) => (
        <div className="flex flex-col gap-3">
          <TextInput
            id={id}
            type="number"
            value={Number.isNaN(value) ? '' : value}
            min={def.min}
            max={def.max}
            step={def.step}
            invalid={invalid}
            inputMode="decimal"
            className="pl-14 text-lg font-semibold"
            onChange={(e) => onChange(e.target.value === '' ? NaN : Number(e.target.value))}
            onFocus={onFocus}
            onBlur={onBlur}
          />

          <input
            type="range"
            aria-label={`${def.label} — شريط التحكم`}
            min={def.min}
            max={def.max}
            step={def.step}
            value={Number.isNaN(value) ? def.min : value}
            onChange={(e) => onChange(Number(e.target.value))}
            onPointerDown={onFocus}
            onPointerUp={onBlur}
            className="h-6 w-full cursor-pointer appearance-none bg-transparent
              [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-pill
              [&::-webkit-slider-thumb]:mt-[-7px] [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2
              [&::-webkit-slider-thumb]:border-bg [&::-webkit-slider-thumb]:bg-gold
              [&::-webkit-slider-thumb]:shadow-[0_2px_10px_-2px_rgb(224_177_92/0.8)]
              [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2
              [&::-moz-range-thumb]:border-bg [&::-moz-range-thumb]:bg-gold
              [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-pill [&::-moz-range-track]:bg-transparent"
            style={{
              // التعبئة تتبع الاتجاه من اليمين لليسار
              background: `linear-gradient(to left, var(--color-gold) ${pct}%, var(--color-line) ${pct}%)`,
              backgroundSize: '100% 6px',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              borderRadius: '999px',
            }}
          />

          <div className="tabular flex justify-between text-[11px] text-ink-faint">
            <span>{def.min} {def.unit}</span>
            <span>{def.max} {def.unit}</span>
          </div>
        </div>
      )}
    </Field>
  );
}

/* ------------------------------ شاشة النجاح ----------------------------- */

function SuccessView({ row, onAgain }: { row: Submission; onAgain: () => void }) {
  return (
    <div className="shell-narrow flex flex-col items-center gap-6 py-16 text-center">
      <span className="grid size-16 place-items-center rounded-3xl border border-mint/25 bg-mint/10 text-mint">
        <Icons.check className="size-8" />
      </span>

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl">تم استلام قياسك</h1>
        <p className="text-ink-dim">
          شكرًا {row.fullName} — وصلت بياناتك إلى الإدارة بنجاح.
        </p>
      </div>

      <div className="card w-full max-w-md p-5 text-start">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold">ملخص القياس</span>
          <Badge tone="mint" icon="check">مُسجّل</Badge>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
          <Row label="الرقم الجامعي" value={row.studentId} />
          <Row label="الجنس" value={GENDER_LABEL[row.gender]} />
          {MEASURE_FIELDS.map((f) => (
            <Row key={f.key} label={f.label} value={`${row[f.key]} ${f.unit}`} />
          ))}
        </dl>
      </div>

      <div className="flex flex-wrap justify-center gap-2.5">
        <Button variant="outline" icon="plus" onClick={onAgain}>إدخال قياس آخر</Button>
        <Link to="/videos"><Button variant="ghost" icon="play">شاهد الفيديوهات</Button></Link>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-ink-faint">{label}</dt>
      <dd className="tabular text-end font-medium text-ink">{value}</dd>
    </>
  );
}
