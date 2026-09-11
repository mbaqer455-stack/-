/* ============================================================================
   الصفحة الرئيسية — تخطيط عمودي واحد:
   بطل ثلاثي الأبعاد ← خطوات ← القياسات المطلوبة ← أحدث الفيديوهات ← دعوة للبدء
   ========================================================================== */

import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { MEASURE_FIELDS, useInView, useReveal, useSettings, useSubmissions, useVideos } from '../lib';
import { Badge, Button, Icons, SectionHead } from '../ui';

const HeroScene = lazy(() =>
  import('../three/Scene').then((m) => ({ default: m.HeroScene })),
);

export default function Home() {
  const videos = useVideos();
  const submissions = useSubmissions();
  const settings = useSettings();

  return (
    <div className="flex flex-col">
      <Hero open={settings.siteOpen} count={submissions.length} />
      <Steps />
      <Measurements />
      <VideosTeaser count={videos.length} />
      <FinalCta />
    </div>
  );
}

/* --------------------------------- البطل -------------------------------- */

function Hero({ open, count }: { open: boolean; count: number }) {
  const { ref, inView } = useInView<HTMLDivElement>('200px');

  return (
    <section className="relative overflow-hidden pb-8 pt-10 sm:pt-16">
      <div className="glow-gold pointer-events-none absolute inset-x-0 top-0 h-[560px]" aria-hidden="true" />

      <div className="shell-narrow relative z-10 flex flex-col items-center gap-5 text-center">
        <Badge tone={open ? 'mint' : 'rose'} icon={open ? 'check' : 'power'}>
          {open ? 'الاستقبال مفتوح الآن' : 'الاستقبال مغلق مؤقتًا'}
        </Badge>

        <h1 className="text-balance text-[clamp(2rem,7vw,3.4rem)] leading-[1.15]">
          قياساتك بدقة،
          <br />
          <span className="bg-gradient-to-l from-gold-soft via-gold to-gold-deep bg-clip-text text-transparent">
            وبخطوة واحدة
          </span>
        </h1>

        <p className="max-w-xl text-pretty text-base text-ink-dim sm:text-lg">
          أدخل قياساتك مرة واحدة وشاهد المجسّم يتشكّل أمامك مباشرة، وتابع فيديوهات الشرح
          التي ترفعها الإدارة — كل شيء في مكان واحد.
        </p>

        <div className="mt-1 flex flex-wrap items-center justify-center gap-2.5">
          <Link to="/measure">
            <Button size="lg" icon="ruler">ابدأ إدخال القياس</Button>
          </Link>
          <Link to="/videos">
            <Button size="lg" variant="outline" icon="play">شاهد الفيديوهات</Button>
          </Link>
        </div>
      </div>

      {/* منصّة العرض ثلاثية الأبعاد */}
      <div
        ref={ref}
        className="relative mx-auto mt-6 h-[clamp(300px,48vh,520px)] w-full max-w-3xl"
      >
        <Suspense fallback={<StageFallback />}>
          {/* لا نركّب المشهد إطلاقًا قبل اقترابه من الشاشة */}
          <HeroScene active={inView} />
        </Suspense>

        {/* تلاشٍ سفلي ليندمج المشهد بالخلفية */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-bg to-transparent"
          aria-hidden="true"
        />
      </div>

      <div className="shell flex items-center justify-center gap-6 text-center">
        <MiniStat value={String(count)} label="قياس مُسجّل" />
        <span className="h-8 w-px bg-line" />
        <MiniStat value="٦" label="حقول قياس" />
        <span className="h-8 w-px bg-line" />
        <MiniStat value="3D" label="معاينة فورية" />
      </div>
    </section>
  );
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="tabular text-xl font-bold text-gold">{value}</span>
      <span className="text-xs text-ink-faint">{label}</span>
    </div>
  );
}

function StageFallback() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="size-40 animate-pulse rounded-full bg-gold/5 blur-2xl" />
    </div>
  );
}

/* -------------------------------- الخطوات ------------------------------- */

const STEPS = [
  { icon: 'users' as const, title: 'عرّف عن نفسك', desc: 'الاسم والرقم الجامعي والشعبة — لتصل القياسات للطالب الصحيح.' },
  { icon: 'ruler' as const, title: 'أدخل القياسات', desc: 'ستة حقول فقط، مع تحقق فوري من المدى الصحيح لكل قياس.' },
  { icon: 'check' as const, title: 'أرسل وانتهِ', desc: 'تصل القياسات للوحة التحكم مباشرة ويمكن تصديرها PDF.' },
];

function Steps() {
  const ref = useReveal<HTMLElement>();
  return (
    <section ref={ref} className="reveal shell-narrow mt-16 flex flex-col gap-8 sm:mt-24">
      <SectionHead
        center
        eyebrow="كيف تعمل"
        title="ثلاث خطوات لا أكثر"
        desc="صُمّمت العملية لتكتمل في أقل من دقيقة من الهاتف أو الحاسبة."
      />

      <ol className="relative flex flex-col gap-4">
        {/* الخط الواصل */}
        <span
          className="absolute inset-y-6 start-[23px] w-px bg-gradient-to-b from-gold/40 via-line to-transparent"
          aria-hidden="true"
        />
        {STEPS.map((step, i) => {
          const Icon = Icons[step.icon];
          return (
            <li key={step.title} className="card card-hover relative flex items-start gap-4 p-5">
              <span className="relative z-10 grid size-12 shrink-0 place-items-center rounded-2xl border border-gold/25 bg-gold/10 text-gold">
                <Icon className="size-5" />
              </span>
              <div className="min-w-0 pt-0.5">
                <div className="flex items-center gap-2">
                  <span className="tabular text-xs font-bold text-gold/70">0{i + 1}</span>
                  <h3 className="text-base font-semibold">{step.title}</h3>
                </div>
                <p className="mt-1 text-sm text-ink-dim">{step.desc}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/* --------------------------- القياسات المطلوبة -------------------------- */

function Measurements() {
  const ref = useReveal<HTMLElement>();
  return (
    <section ref={ref} className="reveal shell-narrow mt-16 flex flex-col gap-8 sm:mt-24">
      <SectionHead
        center
        eyebrow="الحقول"
        title="القياسات التي نطلبها"
        desc="كل حقل مرتبط مباشرة بجزء من المجسّم — تغيّره فيتغيّر الشكل أمامك."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {MEASURE_FIELDS.map((f) => (
          <div key={f.key} className="card card-hover flex flex-col gap-1.5 p-4">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Icons.ruler className="size-4 shrink-0 text-gold" />
              {f.label}
            </span>
            <span className="text-xs leading-relaxed text-ink-faint">{f.hint}</span>
            <span className="tabular mt-auto pt-1.5 text-[11px] text-ink-faint/80">
              {f.min}–{f.max} {f.unit}
            </span>
          </div>
        ))}

        <div className="card card-hover col-span-2 flex flex-col gap-1.5 p-4 sm:col-span-3">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Icons.users className="size-4 shrink-0 text-gold" />
            الجنس
          </span>
          <span className="text-xs text-ink-faint">
            يُستخدم لضبط انحناءات المجسّم (الكتف والخصر) حتى تكون المعاينة أقرب للواقع.
          </span>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------- تشويق الفيديوهات -------------------------- */

function VideosTeaser({ count }: { count: number }) {
  const ref = useReveal<HTMLElement>();
  return (
    <section ref={ref} className="reveal shell-narrow mt-16 sm:mt-24">
      <div className="card relative overflow-hidden p-6 sm:p-8">
        <div className="stripes pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="relative z-10 flex flex-col items-start gap-4">
          <Badge tone="gold" icon="video">قسم الفيديوهات</Badge>
          <h2 className="text-balance text-2xl">
            {count > 0 ? `${count} فيديو منشور الآن` : 'فيديوهات الشرح تُنشر هنا'}
          </h2>
          <p className="max-w-lg text-pretty text-sm text-ink-dim">
            كل فيديو يتم تصويره ورفعه من لوحة التحكم يظهر مباشرة في هذا القسم —
            بصورة مصغّرة ومدّة ووصف، وبمشغّل يفتح بملء الشاشة.
          </p>
          <Link to="/videos">
            <Button variant="outline" icon="play">فتح قسم الفيديوهات</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------- دعوة أخيرة ------------------------------- */

function FinalCta() {
  const ref = useReveal<HTMLElement>();
  return (
    <section ref={ref} className="reveal shell-narrow mt-16 sm:mt-24">
      <div className="relative flex flex-col items-center gap-4 overflow-hidden rounded-card border border-gold/20 bg-gradient-to-b from-gold/8 to-transparent px-6 py-12 text-center">
        <Icons.shirt className="size-8 text-gold" />
        <h2 className="text-balance text-2xl sm:text-3xl">جاهز لإدخال قياسك؟</h2>
        <p className="max-w-md text-pretty text-sm text-ink-dim">
          لن تستغرق أكثر من دقيقة، ويمكنك تعديلها لاحقًا بمراجعة الإدارة.
        </p>
        <Link to="/measure" className="mt-1">
          <Button size="lg" icon="ruler">ابدأ الآن</Button>
        </Link>
      </div>
    </section>
  );
}
