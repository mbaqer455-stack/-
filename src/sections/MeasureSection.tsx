/* ============================================================================
   القسم ١ — القياس

   التخطيط:
     ┌──────────────────────────────────────────┐
     │   [ سلايدر ]        [ سلايدر ]            │
     │   [ سلايدر ]        [ سلايدر ]            │
     │   [ سلايدر ]        [ سلايدر ]            │
     │   ───────────────────────────             │
     │   [ ذكر ] [ أنثى ]                        │
     └──────────────────────────────────────────┘
   السلايدرات في عمودين على الشاشة الواسعة وعمود واحد على الهاتف،
   وتحتها أزرار الجنس، ثم نموذج بيانات الزبون والحفظ.
   ========================================================================== */

import { useState } from 'react';
import {
  DEFAULT_MEASURES, GENDER_LABEL, MEASURE_FIELDS, useToasts,
  type Gender, type MeasureKey,
} from '../lib';
import { LiquidSegment, LiquidSlider } from '../liquid';
import { Icons, Toasts } from '../ui';
import CustomerForm from './CustomerForm';

export default function MeasureSection() {
  const [measures, setMeasures] = useState<Record<MeasureKey, number>>({ ...DEFAULT_MEASURES });
  const [gender, setGender] = useState<Gender>('male');
  const { toasts, push } = useToasts();

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

      <div className="card flex flex-col gap-6 p-5 sm:p-6">
        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {MEASURE_FIELDS.map((f) => (
            <LiquidSlider
              key={f.key}
              label={f.label}
              unit={f.unit}
              min={f.min}
              max={f.max}
              step={f.step}
              value={measures[f.key]}
              onChange={set(f.key)}
            />
          ))}
        </div>

        <div className="divider-x" aria-hidden="true" />

        {/* خياران اثنان لا يستحقّان عرض البطاقة كاملًا */}
        <div className="w-full sm:max-w-sm">
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
