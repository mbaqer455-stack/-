/* ============================================================================
   قياس — عناصر الواجهة المشتركة
   أزرار، حقول، نوافذ، أيقونات SVG (بدون إيموجي)، تنبيهات.
   ========================================================================== */

import {
  useEffect, useId, useRef, useState,
  type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode,
  type SelectHTMLAttributes, type TextareaHTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';
import type { Toast } from './lib';

/* ------------------------------- الأيقونات ------------------------------ */

type IconProps = { className?: string };

const svg = (path: ReactNode, extra?: Record<string, string>) =>
  function Icon({ className = 'size-5' }: IconProps) {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...extra}
      >
        {path}
      </svg>
    );
  };

export const Icons = {
  ruler: svg(<>
    <path d="M3.5 8.5h17a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-17a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1Z" />
    <path d="M7 8.5v3M11 8.5v4.5M15 8.5v3M19 8.5v4.5" />
  </>),
  video: svg(<>
    <rect x="2.5" y="5.5" width="13" height="13" rx="2.5" />
    <path d="M15.5 10.5l5-3v9l-5-3" />
  </>),
  grid: svg(<>
    <rect x="3" y="3" width="7.5" height="7.5" rx="1.6" />
    <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6" />
    <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6" />
    <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6" />
  </>),
  users: svg(<>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 19.5a6 6 0 0 1 12 0" />
    <path d="M16 5.3a3.2 3.2 0 0 1 0 5.4M17.5 14.2a6 6 0 0 1 3.5 5.3" />
  </>),
  upload: svg(<>
    <path d="M12 16V4.5M8 8l4-3.5L16 8" />
    <path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15" />
  </>),
  download: svg(<>
    <path d="M12 4.5V16M8 12.5l4 3.5 4-3.5" />
    <path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15" />
  </>),
  printer: svg(<>
    <path d="M7 9V3.5h10V9" />
    <path d="M5 9h14a2 2 0 0 1 2 2v5h-4v4.5H7V16H3v-5a2 2 0 0 1 2-2Z" />
    <path d="M7 16h10" />
  </>),
  power: svg(<>
    <path d="M12 3.5v8" />
    <path d="M17.5 6.8a7.5 7.5 0 1 1-11 0" />
  </>),
  lock: svg(<>
    <rect x="4.5" y="10" width="15" height="10.5" rx="2.2" />
    <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
  </>),
  logout: svg(<>
    <path d="M14 4.5H6.5A1.5 1.5 0 0 0 5 6v12a1.5 1.5 0 0 0 1.5 1.5H14" />
    <path d="M17 8.5l3.5 3.5L17 15.5M20 12h-9" />
  </>),
  check: svg(<path d="M4.5 12.5l5 5 10-11" />),
  x: svg(<path d="M6 6l12 12M18 6L6 18" />),
  alert: svg(<>
    <path d="M12 3.8 21 19.5H3L12 3.8Z" />
    <path d="M12 10v4M12 16.8v.2" />
  </>),
  trash: svg(<>
    <path d="M4 7h16M9.5 7V4.8h5V7" />
    <path d="M6.5 7l.8 12.2A1.5 1.5 0 0 0 8.8 20.5h6.4a1.5 1.5 0 0 0 1.5-1.3L17.5 7" />
    <path d="M10.5 11v6M13.5 11v6" />
  </>),
  play: svg(<path d="M7.5 4.8 19 12 7.5 19.2V4.8Z" />),
  plus: svg(<path d="M12 5v14M5 12h14" />),
  search: svg(<>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="M15.5 15.5 21 21" />
  </>),
  menu: svg(<path d="M4 7h16M4 12h16M4 17h16" />),
  chevron: svg(<path d="M15 6l-6 6 6 6" />),
  link: svg(<>
    <path d="M10.5 13.5a4 4 0 0 0 5.7 0l2.6-2.6a4 4 0 1 0-5.7-5.7l-1.3 1.3" />
    <path d="M13.5 10.5a4 4 0 0 0-5.7 0l-2.6 2.6a4 4 0 1 0 5.7 5.7l1.3-1.3" />
  </>),
  sparkle: svg(<>
    <path d="M12 3.5 13.8 9 19.5 10.8 13.8 12.6 12 18.2 10.2 12.6 4.5 10.8 10.2 9 12 3.5Z" />
  </>),
  shirt: svg(<>
    <path d="M8.5 3.5 12 6l3.5-2.5 4.5 2.6-2 4-2 -.9v8.3a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 8 17.5V9.2l-2 .9-2-4 4.5-2.6Z" />
  </>),
  clock: svg(<>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </>),
  arrowLeft: svg(<path d="M19 12H5M11 6l-6 6 6 6" />),
};

export type IconName = keyof typeof Icons;

/* --------------------------------- الأزرار ------------------------------ */

type Variant = 'primary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-gold text-on-gold hover:bg-gold-soft shadow-[0_10px_30px_-12px_rgb(224_177_92/0.7)] font-semibold',
  outline:
    'border border-line bg-surface/60 text-ink hover:border-gold/50 hover:bg-surface-2',
  ghost:
    'text-ink-dim hover:text-ink hover:bg-surface-2',
  danger:
    'border border-rose/35 bg-rose/10 text-rose hover:bg-rose/20',
};

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[13px] gap-1.5 rounded-lg',
  md: 'h-11 px-5 text-sm gap-2 rounded-xl',
  lg: 'h-13 px-7 text-base gap-2.5 rounded-xl',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  loading?: boolean;
}

export function Button({
  variant = 'primary', size = 'md', icon, loading, children, className = '', disabled, ...rest
}: ButtonProps) {
  const Icon = icon ? Icons[icon] : null;
  return (
    <button
      className={`inline-flex cursor-pointer select-none items-center justify-center whitespace-nowrap
        transition-[transform,background-color,border-color,color,box-shadow] duration-200
        active:scale-[0.975] disabled:pointer-events-none disabled:opacity-50
        ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Spinner /> : Icon ? <Icon className="size-[1.15em] shrink-0" /> : null}
      {children}
    </button>
  );
}

export function Spinner({ className = 'size-[1.15em]' }: IconProps) {
  return (
    <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* --------------------------------- الحقول ------------------------------- */

interface FieldShellProps {
  label: string;
  hint?: string;
  error?: string;
  suffix?: string;
  required?: boolean;
  /** للمجموعات (أزرار اختيار مثلًا) — يُستخدم نص بدل <label> لأنها ليست حقل إدخال واحد */
  group?: boolean;
  children: (id: string, invalid: boolean) => ReactNode;
}

export function Field({ label, hint, error, suffix, required, group, children }: FieldShellProps) {
  const id = useId();
  const invalid = Boolean(error);
  const Label = group ? 'span' : 'label';
  return (
    <div className="flex flex-col gap-1.5">
      <Label
        {...(group ? {} : { htmlFor: id })}
        className="flex items-center gap-1.5 text-sm font-medium text-ink"
      >
        {label}
        {required && <span className="text-gold" aria-hidden="true">*</span>}
      </Label>

      <div className="relative">
        {children(id, invalid)}
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs text-ink-faint">
            {suffix}
          </span>
        )}
      </div>

      {error ? (
        <p className="flex items-center gap-1.5 text-[13px] text-rose" role="alert">
          <Icons.alert className="size-3.5 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p className="text-[13px] text-ink-faint">{hint}</p>
      ) : null}
    </div>
  );
}

const inputBase = `w-full rounded-xl border bg-surface-2/70 px-3.5 text-ink placeholder:text-ink-faint/70
  transition-colors duration-200 outline-none
  focus:border-gold/70 focus:bg-surface-2 focus:ring-2 focus:ring-gold/20`;

export function TextInput({
  invalid, className = '', ...rest
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      className={`${inputBase} h-11 ${invalid ? 'border-rose/70' : 'border-line'} ${className}`}
      aria-invalid={invalid}
      {...rest}
    />
  );
}

export function TextArea({
  invalid, className = '', ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      className={`${inputBase} min-h-24 resize-y py-2.5 ${invalid ? 'border-rose/70' : 'border-line'} ${className}`}
      aria-invalid={invalid}
      {...rest}
    />
  );
}

export function Select({
  invalid, className = '', children, ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <div className="relative">
      <select
        className={`${inputBase} h-11 cursor-pointer appearance-none pl-10 ${invalid ? 'border-rose/70' : 'border-line'} ${className}`}
        aria-invalid={invalid}
        {...rest}
      >
        {children}
      </select>
      <Icons.chevron className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 -rotate-90 text-ink-faint" />
    </div>
  );
}

/* اختيار مرئي (الجنس) — أكبر من 44px للمس */
interface ChoiceProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon?: IconName }[];
  name: string;
}

export function ChoiceGroup<T extends string>({ value, onChange, options, name }: ChoiceProps<T>) {
  return (
    <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label={name}>
      {options.map((opt) => {
        const active = value === opt.value;
        const Icon = opt.icon ? Icons[opt.icon] : null;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={`flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border text-sm
              transition-all duration-200
              ${active
                ? 'border-gold/70 bg-gold/12 font-semibold text-gold'
                : 'border-line bg-surface-2/60 text-ink-dim hover:border-line hover:bg-surface-2 hover:text-ink'}`}
          >
            {Icon && <Icon className="size-4" />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------- مفتاح تبديل ---------------------------- */

interface SwitchProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}

export function Switch({ checked, onChange, label, description }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full cursor-pointer items-center gap-4 rounded-xl p-1 text-start transition-colors"
    >
      <span
        className={`relative h-7 w-12 shrink-0 rounded-pill transition-colors duration-300
          ${checked ? 'bg-mint/85' : 'bg-line'}`}
      >
        <span
          className={`absolute top-1 size-5 rounded-full bg-white shadow transition-[inset-inline-start] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
            ${checked ? 'start-6' : 'start-1'}`}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && <span className="block text-[13px] leading-snug text-ink-faint">{description}</span>}
      </span>
    </button>
  );
}

/* --------------------------------- شارات -------------------------------- */

export function Badge({
  children, tone = 'neutral', icon,
}: { children: ReactNode; tone?: 'neutral' | 'gold' | 'mint' | 'rose' | 'sky'; icon?: IconName }) {
  const tones = {
    neutral: 'border-line bg-surface-2 text-ink-dim',
    gold: 'border-gold/30 bg-gold/10 text-gold',
    mint: 'border-mint/30 bg-mint/10 text-mint',
    rose: 'border-rose/30 bg-rose/10 text-rose',
    sky: 'border-sky/30 bg-sky/10 text-sky',
  };
  const Icon = icon ? Icons[icon] : null;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>
      {Icon && <Icon className="size-3.5" />}
      {children}
    </span>
  );
}

/* -------------------------------- النوافذ ------------------------------- */

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}

export function Modal({ open, onClose, title, children, wide }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-100 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ animation: 'fade-in 200ms ease-out' }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`card max-h-[92dvh] w-full overflow-y-auto rounded-b-none p-5 outline-none sm:rounded-card sm:p-6
          ${wide ? 'max-w-4xl' : 'max-w-lg'}`}
        style={{ animation: 'pop-in 280ms cubic-bezier(0.16,1,0.3,1)' }}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h3 className="text-lg font-bold">{title}</h3>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="-m-1 cursor-pointer rounded-lg p-2 text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <Icons.x className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------- التنبيهات ------------------------------ */

export function Toasts({ items }: { items: Toast[] }) {
  if (!items.length) return null;
  const tones = {
    ok: 'border-mint/35 text-mint',
    error: 'border-rose/35 text-rose',
    info: 'border-sky/35 text-sky',
  };
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-200 flex flex-col items-center gap-2 px-4">
      {items.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`card pointer-events-auto flex items-center gap-2.5 border px-4 py-2.5 text-sm ${tones[t.tone]}`}
          style={{ animation: 'pop-in 260ms cubic-bezier(0.16,1,0.3,1)' }}
        >
          {t.tone === 'ok' ? <Icons.check className="size-4" /> : <Icons.alert className="size-4" />}
          <span className="text-ink">{t.text}</span>
        </div>
      ))}
    </div>,
    document.body,
  );
}

/* ------------------------------ قطع تخطيطية ----------------------------- */

export function SectionHead({
  eyebrow, title, desc, center,
}: { eyebrow?: string; title: string; desc?: string; center?: boolean }) {
  return (
    <div className={`flex flex-col gap-3 ${center ? 'items-center text-center' : ''}`}>
      {eyebrow && (
        <span className="inline-flex w-fit items-center gap-2 rounded-pill border border-gold/25 bg-gold/8 px-3 py-1 text-xs font-medium tracking-wide text-gold">
          <Icons.sparkle className="size-3.5" />
          {eyebrow}
        </span>
      )}
      <h2 className="text-2xl text-balance sm:text-3xl">{title}</h2>
      {desc && <p className="max-w-2xl text-pretty text-ink-dim">{desc}</p>}
    </div>
  );
}

export function EmptyState({
  icon = 'grid', title, desc, action,
}: { icon?: IconName; title: string; desc?: string; action?: ReactNode }) {
  const Icon = Icons[icon];
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-line px-6 py-14 text-center">
      <span className="grid size-12 place-items-center rounded-2xl border border-line bg-surface-2 text-ink-faint">
        <Icon className="size-6" />
      </span>
      <h4 className="text-base font-semibold text-ink">{title}</h4>
      {desc && <p className="max-w-sm text-sm text-ink-dim">{desc}</p>}
      {action}
    </div>
  );
}

export function Stat({
  icon, label, value, sub, tone = 'gold',
}: { icon: IconName; label: string; value: string; sub?: string; tone?: 'gold' | 'mint' | 'sky' | 'rose' }) {
  const Icon = Icons[icon];
  const tones = {
    gold: 'text-gold bg-gold/10 border-gold/20',
    mint: 'text-mint bg-mint/10 border-mint/20',
    sky: 'text-sky bg-sky/10 border-sky/20',
    rose: 'text-rose bg-rose/10 border-rose/20',
  };
  return (
    <div className="card card-hover flex items-center gap-4 p-4">
      <span className={`grid size-11 shrink-0 place-items-center rounded-xl border ${tones[tone]}`}>
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <div className="text-xl font-bold tabular text-ink">{value}</div>
        <div className="truncate text-[13px] text-ink-dim">{label}</div>
        {sub && <div className="truncate text-xs text-ink-faint">{sub}</div>}
      </div>
    </div>
  );
}

/* --------------------- تأكيد الإجراءات الخطرة --------------------------- */

export function useConfirm() {
  const [state, setState] = useState<{ text: string; onYes: () => void } | null>(null);

  const confirm = (text: string, onYes: () => void) => setState({ text, onYes });

  const dialog = (
    <Modal open={Boolean(state)} onClose={() => setState(null)} title="تأكيد الإجراء">
      <p className="text-sm text-ink-dim">{state?.text}</p>
      <div className="mt-5 flex gap-2.5">
        <Button
          variant="danger"
          onClick={() => { state?.onYes(); setState(null); }}
          icon="check"
        >
          نعم، تأكيد
        </Button>
        <Button variant="ghost" onClick={() => setState(null)}>إلغاء</Button>
      </div>
    </Modal>
  );

  return { confirm, dialog };
}
