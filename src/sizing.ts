/* ============================================================================
   قياس — تحديد المقاس القياسي تلقائيًا (للمصنع)

   الفكرة: محيط الصدر هو المقياس الذي تعتمده كل مصانع الملابس والمقاسات
   العالمية (ISO 8559) لتصنيف القمصان — لذلك نحسبه من حقل «عرض الصدر»
   (وهو نصف المحيط تقريبًا، كما تُبنى عليه هندسة القالب في shirtMath.ts)
   ثم نطابقه مع جدول مقاسات عالمي قياسي (XS…XXXL)، بحسب الجنس.

   أي قياس خارج الجدول (جسم صغير جدًا أو كبير جدًا) يُقرَّب لأقرب مقاس
   ويُعلَّم "outOfRange" حتى يعرف المصنع أنه يحتاج تفصيلًا خاصًا لا مقاسًا جاهزًا.

   الجدول من S إلى XXL. ما تحته أو فوقه يُقرَّب لأقرب طرف ويُعلَّم outOfRange،
   فيراه المشرف في لوحة التحكّم ويعرف أنه يحتاج تفصيلًا خاصًا.

   والاتجاه المعاكس هنا أيضًا: أزرار المقاس الجاهزة في صفحة القياس تُولَّد من
   CHART نفسه (انظر SIZE_PRESETS أدناه)، فلا يمكن أن يختار الزبون «XXL» ثم
   تكتب ورقة المصنع «XL» — الجدول واحد والاتجاهان ينامان عليه.
   ========================================================================== */

import type { Gender, MeasureKey, Submission } from './lib';

export type SizeLabel = 'S' | 'M' | 'L' | 'XL' | 'XXL';

export const SIZE_ORDER: SizeLabel[] = ['S', 'M', 'L', 'XL', 'XXL'];

interface SizeBracket { max: number; label: SizeLabel }

/** الحد الأعلى لمحيط الصدر (سم) لكل مقاس — جدول قمصان بالغين عالمي معتمد */
const CHART: Record<Gender, SizeBracket[]> = {
  male: [
    { max: 94, label: 'S' },
    { max: 102, label: 'M' },
    { max: 110, label: 'L' },
    { max: 118, label: 'XL' },
    { max: 126, label: 'XXL' },
  ],
  female: [
    { max: 88, label: 'S' },
    { max: 94, label: 'M' },
    { max: 102, label: 'L' },
    { max: 110, label: 'XL' },
    { max: 118, label: 'XXL' },
  ],
};

/** تحت هذا المحيط القياس غير واقعي لجسم بالغ — يُعامل كخارج الجدول */
const MIN_CHEST = 60;

export interface SizeResult {
  size: SizeLabel;
  /** محيط الصدر المحتسب بالسنتيمتر (عرض الصدر × 2) */
  chest: number;
  /** خارج جدول المقاسات القياسية — يحتاج تفصيلًا خاصًا بدل مقاس جاهز */
  outOfRange: boolean;
}

export function computeSize(s: Pick<Submission, 'chestWidth' | 'gender'>): SizeResult {
  const chest = Math.round(s.chestWidth * 2);
  const chart = CHART[s.gender];
  const bracket = chart.find((b) => chest <= b.max);
  return {
    size: bracket ? bracket.label : chart[chart.length - 1].label,
    chest,
    outOfRange: chest < MIN_CHEST || !bracket,
  };
}


/* --------------------------- المقاسات الجاهزة للإدخال -------------------- */

/** ما يخصّ القميص نفسه. الطول والوزن صفتا الزبون، فلا يمسّهما اختيار المقاس. */
export type GarmentKey = 'width' | 'chestWidth' | 'chestLength' | 'sleeveLength';

export const GARMENT_KEYS: GarmentKey[] = ['width', 'chestWidth', 'chestLength', 'sleeveLength'];

export interface SizePreset {
  name: SizeLabel;
  measures: Record<GarmentKey, number>;
}


/**
 * قياس القميص الأساسي للمشغل — يطابق DEFAULT_MEASURES في lib.ts.
 * (لا نستورده من هناك: lib.ts يستورد من هذا الملف، والاستيراد المتبادل
 * لقيمة — لا لنوع — يوقعنا في حلقة.)
 */
const BASE = { chestWidth: 51.5, width: 55.5, chestLength: 65, sleeveLength: 58 };

/** تدرّج المشغل لكل سنتيمتر من عرض الصدر */
const GRADE = { width: 0.6, chestLength: 0.8, sleeveLength: 0.6 };

const half = (v: number): number => Math.round(v * 2) / 2;

/**
 * عرض الصدر الممثّل لكل مقاس: منتصف شريحته في CHART مقسومًا على ٢. المنتصف
 * يقع داخل الشريحة دائمًا، فـ computeSize تُرجع المقاس نفسه — وهذا ما يضمن
 * أن الاتجاهين لا يتعارضان. الشريحة الأولى لا حدّ أدنى لها فنعطيها خطوة
 * الشريحة التي تليها.
 */
function presetsFor(gender: Gender): SizePreset[] {
  const chart = CHART[gender];
  return chart.map((b, i) => {
    const low = i === 0 ? b.max - (chart[1].max - b.max) : chart[i - 1].max;
    const chestWidth = half((low + b.max) / 4); // ((low+max)/2) محيطًا ÷ ٢ مسطّحًا
    const d = chestWidth - BASE.chestWidth;
    return {
      name: b.label,
      measures: {
        chestWidth,
        width: half(BASE.width + d * GRADE.width),
        chestLength: half(BASE.chestLength + d * GRADE.chestLength),
        sleeveLength: half(BASE.sleeveLength + d * GRADE.sleeveLength),
      },
    };
  });
}

export const SIZE_PRESETS: Record<Gender, SizePreset[]> = {
  male: presetsFor('male'),
  female: presetsFor('female'),
};

/** المقاس الذي تطابقه القياسات الحالية تمامًا، أو null إن عدّلها الزبون بنفسه */
export const matchPreset = (
  gender: Gender,
  m: Record<MeasureKey, number>,
): SizeLabel | null =>
  SIZE_PRESETS[gender].find((p) => GARMENT_KEYS.every((k) => p.measures[k] === m[k]))?.name ?? null;

export interface SizeCount { size: SizeLabel; count: number }

/** توزيع عدد كل مقاس — هذا ما يُرسَل للمصنع ليعرف كم قطعة يُنتج من كل مقاس */
export function summarizeSizes(rows: Pick<Submission, 'chestWidth' | 'gender'>[]): SizeCount[] {
  const counts = new Map<SizeLabel, number>(SIZE_ORDER.map((s) => [s, 0]));
  for (const r of rows) {
    const { size } = computeSize(r);
    counts.set(size, (counts.get(size) ?? 0) + 1);
  }
  return SIZE_ORDER.map((size) => ({ size, count: counts.get(size) ?? 0 }));
}

/** نص مختصر جاهز للمصنع: "10 S · 40 L · 6 XL" (يتجاهل المقاسات بعدد صفر) */
export function formatSizeSummary(rows: Pick<Submission, 'chestWidth' | 'gender'>[]): string {
  return summarizeSizes(rows)
    .filter((c) => c.count > 0)
    .map((c) => `${c.count} ${c.size}`)
    .join(' · ');
}
