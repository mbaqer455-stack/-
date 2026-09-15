/* ============================================================================
   القسم ١ — القياس

   التخطيط (كما في المخطط):
     ┌──────────────────────────────────────────┐
     │   [ مربّع قالب التيشيرت ]  [ سلايدر ]     │
     │                           [ سلايدر ]     │
     │                           [   ...  ]     │
     │   [ ذكر ] [ أنثى ]        [ سلايدر ]     │
     └──────────────────────────────────────────┘
   القالب يسار، السلايدرات يمين، وأزرار الجنس تحت القالب.
   كل قياس يُكتب على القماش مع سهمه، ويُبرَز أثناء سحب شريطه.
   ========================================================================== */

import { Suspense, lazy, useState } from 'react';
import {
  DEFAULT_MEASURES, GENDER_LABEL, MEASURE_FIELDS, useInView, useToasts,
  type Gender, type MeasureKey,
} from '../lib';
import { LiquidSegment, LiquidSlider } from '../liquid';
import ShirtDims from '../three/ShirtDims';
import { Icons, Spinner, Toasts } from '../ui';
import CustomerForm from './CustomerForm';

const Shirt2D = lazy(() => import('../three/Shirt2D'));

export default function MeasureSection() {
  const [measures, setMeasures] = useState<Record<MeasureKey, number>>({ ...DEFAULT_MEASURES });
  const [gender, setGender] = useState<Gender>('male');
  const [active, setActive] = useState<string | null>(null);
  const { toasts, push } = useToasts();

  // الرندر يتوقف كليًا عندما يخرج المربّع من الشاشة
  const { ref: boxRef, inView } = useInView<HTMLDivElement>('200px');

  const set = (key: MeasureKey) => (v: number) => setMeasures((m) => ({ ...m, [key]: v }));

  return (
    <section className="shell py-10 sm:py-14" aria-labelledby="measure-title">
      {/* ترويسة القسم */}
      <div className="mb-8 flex flex-col gap-2">
        <span className="inline-flex w-fit items-center gap-2 rounded-pill border border-line
                         bg-surface-2 px-3 py-1 text-xs font-semibold text-ink-dim">
          <Icons.shirt className="size-3.5" />
          القسم الأول
        </span>
        <h1 id="measure-title" className="text-2xl sm:text-3xl">إدخال القياسات</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-8">

        {/* ----- عمود السلايدرات — أول في الـ DOM ⇒ يمين في RTL ----- */}
        <div className="card order-2 flex flex-col gap-5 p-5 sm:p-6 lg:order-1">
          {MEASURE_FIELDS.map((f) => (
            <div
              key={f.key}
              onPointerEnter={() => setActive(f.key)}
              onPointerLeave={() => setActive((a) => (a === f.key ? null : a))}
              onFocusCapture={() => setActive(f.key)}
              onBlurCapture={() => setActive((a) => (a === f.key ? null : a))}
            >
              <LiquidSlider
                label={f.label}
                unit={f.unit}
                min={f.min}
                max={f.max}
                step={f.step}
                value={measures[f.key]}
                onChange={set(f.key)}
              />
            </div>
          ))}
        </div>

        {/* ----- عمود القالب ----- */}
        <div className="order-1 flex flex-col gap-4 lg:order-2">
          <div ref={boxRef} className="card grid-paper relative aspect-square overflow-hidden">
            <div className="glow-brand pointer-events-none absolute inset-0" aria-hidden="true" />

            <Suspense fallback={<CanvasLoading />}>
              {inView && <Shirt2D measures={measures} gender={gender} />}
            </Suspense>

            {/* أسهم القياس وأرقامها — فوق القماش */}
            <ShirtDims measures={measures} gender={gender} active={active} />

            {/* الطول والوزن: يؤثّران على المقاس والراحة لا على بُعد مرسوم */}
            <div className="pointer-events-none absolute end-3 top-3 flex flex-col items-end gap-1.5">
              <Chip on={active === 'height'} label="الطول" value={measures.height} unit="سم" />
              <Chip on={active === 'weight'} label="الوزن" value={measures.weight} unit="كغم" />
            </div>
          </div>

          {/* أزرار الجنس — تحت القالب تمامًا كما في المخطط */}
          <LiquidSegment
            legend="الجنس"
            value={gender}
            onChange={setGender}
            options={[
              { value: 'male' as Gender, label: GENDER_LABEL.male },
              { value: 'female' as Gender, label: GENDER_LABEL.female },
            ]}
          />
        </div>
      </div>

      {/* ----- بيانات الزبون + الحفظ ----- */}
      <div className="mt-6">
        <CustomerForm
          measures={measures}
          gender={gender}
          onSaved={(name) => push(`تم حفظ قياس ${name}`)}
          onError={(msg) => push(msg, 'error')}
        />
      </div>

      <Toasts items={toasts} />
    </section>
  );
}

function Chip({ on, label, value, unit }: { on: boolean; label: string; value: number; unit: string }) {
  return (
    <span
      className={`rounded-pill border px-3 py-1 text-xs font-semibold backdrop-blur-md
        transition-all duration-200
        ${on
          ? 'border-brand bg-brand text-on-brand shadow-[0_6px_16px_-6px_rgb(10_10_11/0.45)]'
          : 'border-white/80 bg-white/75 text-ink-dim'}`}
    >
      {label} <span className="tabular">{value}</span> {unit}
    </span>
  );
}

function CanvasLoading() {
  return (
    <div className="flex items-center justify-center gap-2.5 text-sm text-ink-faint">
      <Spinner className="size-4" />
      جارٍ تجهيز القالب…
    </div>
  );
}
