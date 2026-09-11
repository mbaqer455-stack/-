/* ============================================================================
   عناصر الزجاج السائل — بأسلوب iOS

   • LiquidSlider  : مضمار رفيع ومقبض أبيض — بلا أي حركة
   • LiquidSegment : مفتاح اختيار تنزلق فيه الحبّة بارتداد زنبركي

   كلاهما يبني على <input> أصلي تحته ⇒ الكيبورد وقارئ الشاشة يشتغلان كما يجب،
   والتحريك كله على transform وopacity فقط.
   ========================================================================== */

import { useId, useLayoutEffect, useRef, useState } from 'react';

/* ------------------------------ السلايدر -------------------------------- */

export interface LiquidSliderProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  hint?: string;
}

export function LiquidSlider({
  label, value, onChange, min, max, step = 1, unit, hint,
}: LiquidSliderProps) {
  const id = useId();
  const frac = (value - min) / (max - min);   // 0..1 — منه يُحسب موضع المقبض والتعبئة

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <label htmlFor={id} className="text-sm font-semibold text-ink">
          {label}
        </label>
        <span className="tabular text-sm font-bold text-brand">
          {Number.isInteger(value) ? value : value.toFixed(1)}
          {unit && <span className="ms-1 text-xs font-medium text-ink-faint">{unit}</span>}
        </span>
      </div>

      <div className="slider" style={{ '--p': frac } as React.CSSProperties}>
        <div className="slider__track" aria-hidden="true" />
        <div className="slider__fill" aria-hidden="true" />
        <input
          id={id}
          className="slider__input"
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-describedby={hint ? `${id}-hint` : undefined}
          aria-valuetext={`${value}${unit ? ' ' + unit : ''}`}
        />
        <div className="slider__thumb" aria-hidden="true" />
      </div>

      {hint && (
        <p id={`${id}-hint`} className="px-1 text-xs text-ink-faint">
          {hint}
        </p>
      )}
    </div>
  );
}

/* --------------------------- مفتاح الاختيار ----------------------------- */

export interface LiquidSegmentProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  legend: string;
}

export function LiquidSegment<T extends string>({
  value, onChange, options, legend,
}: LiquidSegmentProps<T>) {
  const name = useId();
  const wrap = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);

  // موضع الحبّة يُقاس من الزر المفعّل نفسه — يبقى صحيحًا مع أي عدد خيارات أو RTL
  const index = options.findIndex((o) => o.value === value);
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const measure = () => {
      const btn = el.querySelectorAll<HTMLElement>('[data-seg]')[index];
      if (!btn) return;
      setPill({ left: btn.offsetLeft, width: btn.offsetWidth });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [index, options.length]);

  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="sr-only">{legend}</legend>
      <div ref={wrap} className="liquid-segment glass">
        {pill && (
          <span
            className="liquid-segment__pill"
            style={{ left: pill.left, width: pill.width }}
            aria-hidden="true"
          />
        )}

        {options.map((o) => {
          const active = o.value === value;
          return (
            <label
              key={o.value}
              data-seg=""
              className={`liquid relative z-10 flex h-11 cursor-pointer select-none items-center
                justify-center rounded-pill px-5 text-sm font-semibold
                transition-colors duration-300
                ${active ? 'text-on-brand' : 'text-ink-dim hover:text-brand'}`}
            >
              <input
                type="radio"
                name={name}
                className="sr-only"
                checked={active}
                onChange={() => onChange(o.value)}
              />
              {o.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
