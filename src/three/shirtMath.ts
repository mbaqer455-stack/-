/* ============================================================================
   رياضيات قالب التيشيرت

   وحدة العالم = سنتيمتر واحد. يعني الإحداثيات في المشهد هي القياسات نفسها،
   فأسهم الأبعاد المرسومة فوق اللوحة تنطبق على القماش بلا أي معايرة.

   النسب مأخوذة من مقاسات قميص بالغ حقيقي:
     عرض الرقبة ≈ 0.41 من نصف الكتف  ·  نزول الرقبة الأمامي ≈ 0.36
     ميل الكتف ≈ 0.19                ·  عمق الإبط ≈ 0.44 من طول الجسم
   ========================================================================== */

import { clamp, type Gender, type MeasureKey } from '../lib';

export type Measures = Record<MeasureKey, number>;

/** ارتفاع/عرض مجال الرؤية بالسنتيمتر — اللوحة مربّعة فالبعدان متساويان */
export const VIEW_CM = 155;

export interface Shirt {
  /** خط الكتف الأعلى (HPS) */
  topY: number;
  neckHalf: number;
  /** نزول فتحة الرقبة الأمامية تحت خط الكتف */
  neckDrop: number;
  shoulderHalf: number;
  shoulderSlope: number;
  /** زاوية الكم تحت الأفقي (راديان) — تزداد مع الطول فينزل الكم بجانب الجسم */
  sleeveAngle: number;
  sleeveLen: number;
  /** اتساع فتحة الكم عند طرفه */
  cuffW: number;
  armpitY: number;
  chestHalf: number;
  /** خط الخصر — نقطة تحكّم في انحناء الجنب فقط */
  waistY: number;
  waistHalf: number;
  /** الذيل — عند «طول الصدر» المُدخل تمامًا، فالسهم يغطّي القالب كاملًا */
  hemY: number;
  hemHalf: number;
  /** طول القميص المُدخل: من الكتف حتى الذيل */
  bodyLen: number;
}

/* ------------------------------ نقاط مشتقّة ----------------------------- */

/** طرف الكتف — منه يبدأ الكم وينتهي خط الكتف */
export const shoulderTip = (s: Shirt): [number, number] => [s.shoulderHalf, s.topY - s.shoulderSlope];

/** اتجاه محور الكم ومتعامده */
export function sleeveAxis(s: Shirt): { dx: number; dy: number; nx: number; ny: number } {
  return {
    dx: Math.cos(s.sleeveAngle), dy: -Math.sin(s.sleeveAngle),
    nx: Math.sin(s.sleeveAngle), ny: Math.cos(s.sleeveAngle),
  };
}

/** زاويتا فتحة الكم: الخارجية (امتداد خط الكتف) ثم الداخلية (بداية الإبط) */
export function cuffCorners(s: Shirt): { outer: [number, number]; inner: [number, number] } {
  const [sx, sy] = shoulderTip(s);
  const { dx, dy, nx, ny } = sleeveAxis(s);
  const outer: [number, number] = [sx + dx * s.sleeveLen, sy + dy * s.sleeveLen];
  const inner: [number, number] = [outer[0] - nx * s.cuffW, outer[1] - ny * s.cuffW];
  return { outer, inner };
}

export const armpit = (s: Shirt): [number, number] => [s.chestHalf, s.armpitY];

/* --------------------------- من القياسات للقالب ------------------------- */

export function toShirt(m: Measures, gender: Gender): Shirt {
  const f = gender === 'female';

  const height = clamp(m.height, 100, 220);
  const weight = clamp(m.weight, 25, 180);

  // الوزن يزيد اتساع الراحة — كتلة الجسم مقارنة بالطول
  const bmi = weight / Math.pow(height / 100, 2);
  const ease = clamp((bmi - 22) * 0.42, -3.5, 7);

  // «طول الصدر» = طول القميص كاملًا من الكتف حتى الذيل. الطول يمدّه قليلًا.
  const bodyLen = clamp(m.chestLength, 25, 90) + (height - 170) * 0.12;

  const shoulderHalf = (clamp(m.width, 25, 80) / 2) * (f ? 0.94 : 1);
  const chestHalf = clamp(m.chestWidth, 25, 80) / 2 + ease;

  const sleeveLen = clamp(m.sleeveLength, 20, 90);
  const sleeveFrac = (sleeveLen - 20) / 70;
  // كم قصير يخرج شبه أفقي، وكم طويل ينزل بجانب الجسم كما في اللقطة المسطّحة
  const sleeveAngle = (30 + sleeveFrac * 45) * (Math.PI / 180);

  const armholeDepth = clamp(bodyLen * 0.44, 16, 28);
  // فتحة الكم: واسعة عند العضد للكم القصير، ضيّقة عند الرسغ للطويل
  const cuffW = armholeDepth * 0.88 * (1 - sleeveFrac) + 9.5 * sleeveFrac;

  const topY = 0; // يُزاح لاحقًا لتوسيط الإطار
  return {
    topY,
    bodyLen,
    neckHalf: shoulderHalf * 0.41,
    neckDrop: shoulderHalf * (f ? 0.46 : 0.36),
    shoulderHalf,
    shoulderSlope: shoulderHalf * 0.19,
    sleeveAngle,
    sleeveLen,
    cuffW,
    armpitY: topY - armholeDepth,
    chestHalf,
    waistY: topY - bodyLen * 0.66,
    waistHalf: chestHalf * (f ? 0.9 : 0.975),
    hemY: topY - bodyLen,
    hemHalf: chestHalf * (f ? 1.0 : 0.99),
  };
}

/** يزيح القالب رأسيًا حتى يتوسّط الإطار. */
export function centered(s: Shirt): Shirt {
  const { inner } = cuffCorners(s);
  const bottom = Math.min(s.hemY, inner[1]);
  const dy = -(s.topY + bottom) / 2;
  return {
    ...s,
    topY: s.topY + dy,
    armpitY: s.armpitY + dy,
    waistY: s.waistY + dy,
    hemY: s.hemY + dy,
  };
}

export const shirtOf = (m: Measures, gender: Gender): Shirt => centered(toShirt(m, gender));

/* ------------------------- تحويل للإحداثيات المعروضة -------------------- */

/** SVG فوق اللوحة يستخدم نفس النظام مع قلب المحور الرأسي. */
export const svgViewBox = `${-VIEW_CM / 2} ${-VIEW_CM / 2} ${VIEW_CM} ${VIEW_CM}`;
export const Y = (v: number): number => -v;
