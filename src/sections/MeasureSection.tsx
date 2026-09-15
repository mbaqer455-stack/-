/* ============================================================================
   القسم ١ — القياس

   التخطيط:
     ┌──────────────────────────────────────────┐
     │   [ سلايدر ]        [ سلايدر ]            │
     │   [ سلايدر ]        [ سلايدر ]            │
     │   [ سلايدر ]        [ سلايدر ]            │
     │   ───────────────────────────             │
     │   [ ذكر ] [ أنثى ]      [S][M][L][XL]…    │
     └──────────────────────────────────────────┘
   السلايدرات في عمودين على الشاشة الواسعة وعمود واحد على الهاتف، وتحتها
   أزرار الجنس يمينًا والمقاسات الجاهزة يسارًا، ثم بيانات الزبون والحفظ.
   ========================================================================== */

import { useState } from 'react';
import {
  DEFAULT_MEASURES, GENDER_LABEL, MEASURE_FIELDS, SIZE_PRESETS, matchPreset, useToasts,
  type Gender, type MeasureKey, type SizePreset,
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

        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
          {/* خياران اثنان لا يستحقّان عرض البطاقة كاملًا.
              العنوان مرئيّ ليحاذي عنوان المقاسات — و aria-hidden لأن
              <legend> داخل LiquidSegment يقوله لقارئ الشاشة أصلًا. */}
          <div className="flex w-full flex-col gap-2 sm:max-w-xs">
            <span aria-hidden="true" className="text-sm font-medium text-ink">الجنس</span>
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

          <SizePicker
            presets={SIZE_PRESETS[gender]}
            active={matchPreset(gender, measures)}
            onPick={(p) => setMeasures((m) => ({ ...m, ...p.measures }))}
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

/* ---------------------------- المقاسات الجاهزة -------------------------- */

/**
 * يملأ قياسات القميص دفعةً واحدة. لا يمسّ الطول والوزن لأنهما صفتا الزبون
 * لا صفتا القميص — فاختيار XL لا يغيّر طول من يلبسه.
 * المقاس المُبرَز محسوب من القياسات نفسها، فأي تحريك لشريط يُلغي الإبراز
 * تلقائيًا ويصير القياس مخصّصًا بلا حالة إضافية نتابعها.
 * والجداول تختلف بين ذكر وأنثى، فالأزرار تتبع الجنس المختار.
 */
function SizePicker({
  presets, active, onPick,
}: { presets: SizePreset[]; active: string | null; onPick: (p: SizePreset) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <span id="size-label" className="text-sm font-medium text-ink">مقاس جاهز</span>

      {/* على الهاتف شبكة ٣×٢ لا صفّ يلتفّ ٥+١ */}
      <div
        role="radiogroup"
        aria-labelledby="size-label"
        className="grid grid-cols-4 gap-2 sm:flex sm:flex-wrap"
      >
        {presets.map((p) => {
          const on = active === p.name;
          return (
            <button
              key={p.name}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onPick(p)}
              className={`tabular h-9 min-w-12 cursor-pointer rounded-pill border px-3 text-[13px] font-semibold
                transition-colors duration-200
                ${on
                  ? 'border-brand bg-brand text-on-brand'
                  : 'border-line bg-surface text-ink-dim hover:border-brand-soft hover:text-ink'}`}
            >
              {p.name}
            </button>
          );
        })}
      </div>

      <span className="text-[13px] text-ink-faint">يضبط قياسات القميص — الطول والوزن تبقى كما هي</span>
    </div>
  );
}
