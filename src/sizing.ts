/* ============================================================================
   قياس — تحديد المقاس القياسي تلقائيًا (للمصنع)

   الفكرة: محيط الصدر هو المقياس الذي تعتمده كل مصانع الملابس والمقاسات
   العالمية (ISO 8559) لتصنيف القمصان — لذلك نحسبه من حقل «عرض الصدر»
   (وهو نصف المحيط تقريبًا، كما تُبنى عليه هندسة القالب في shirtMath.ts)
   ثم نطابقه مع جدول مقاسات عالمي قياسي (XS…XXXL)، بحسب الجنس.

   أي قياس خارج الجدول (جسم صغير جدًا أو كبير جدًا) يُقرَّب لأقرب مقاس
   ويُعلَّم "outOfRange" حتى يعرف المصنع أنه يحتاج تفصيلًا خاصًا لا مقاسًا جاهزًا.
   ========================================================================== */

import type { Gender, Submission } from './lib';

export type SizeLabel = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL';

export const SIZE_ORDER: SizeLabel[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

interface SizeBracket { max: number; label: SizeLabel }

/** الحد الأعلى لمحيط الصدر (سم) لكل مقاس — جدول قمصان بالغين عالمي معتمد */
const CHART: Record<Gender, SizeBracket[]> = {
  male: [
    { max: 86, label: 'XS' },
    { max: 94, label: 'S' },
    { max: 102, label: 'M' },
    { max: 110, label: 'L' },
    { max: 118, label: 'XL' },
    { max: 126, label: 'XXL' },
    { max: 134, label: 'XXXL' },
  ],
  female: [
    { max: 82, label: 'XS' },
    { max: 88, label: 'S' },
    { max: 94, label: 'M' },
    { max: 102, label: 'L' },
    { max: 110, label: 'XL' },
    { max: 118, label: 'XXL' },
    { max: 126, label: 'XXXL' },
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
