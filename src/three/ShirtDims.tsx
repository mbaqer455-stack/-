/* ============================================================================
   أرقام القياس فوق القالب

   تُرسم بـ SVG فوق اللوحة بنفس نظام إحداثيات المشهد (سنتيمتر)، فتنطبق على
   القماش تمامًا. السبب أن النص عربي: الـ SVG يستعمل خط النظام مع تشكيل RTL
   صحيح، بينما النص داخل WebGL يحتاج تضمين خط وتشكيلًا يدويًا.

   يُعرض الرقم وحده على المخطط — اسم القياس مكتوب على شريطه في اليمين،
   والسهم يتوهّج عند لمس شريطه فيربط الاثنين بلا زحمة نصوص فوق القماش.
   ========================================================================== */

import {
  armpit, cuffCorners, shirtOf, shoulderTip, sleeveAxis, svgViewBox, Y,
  type Measures,
} from './shirtMath';
import type { Gender } from '../lib';

interface Props {
  measures: Measures;
  gender: Gender;
  /** المفتاح الذي يجري سحبه الآن — يُبرز سهمه ويخفت الباقي */
  active: string | null;
}

const LINE = '#63636b';     // خطوط الأبعاد
const OFF = '#4a4a51';      // رقم خارج القماش
const ON = '#44444b';       // رقم فوق القماش (القماش رمادي فاتح)

export default function ShirtDims({ measures, gender, active }: Props) {
  const s = shirtOf(measures, gender);
  const { outer } = cuffCorners(s);
  const [tipX, tipY] = shoulderTip(s);
  const [apX, apY] = armpit(s);
  const { nx, ny } = sleeveAxis(s);

  // رقم الكم: خارج حافة الكم العليا حتى لا يتجاوز عرضه القماش الضيّق
  const armMidX = (tipX + outer[0]) / 2;
  const armMidY = (tipY + outer[1]) / 2;
  const off = s.cuffW * 0.5 + 3.5;

  // خط طول القميص: داخل الجسم، والرقم قرب الذيل حتى لا يصادم رقم الصدر
  const lenX = s.chestHalf * 0.78;

  return (
    <svg viewBox={svgViewBox} className="pointer-events-none absolute inset-0 size-full" aria-hidden="true">
      <defs>
        <marker id="qa" viewBox="0 0 10 10" refX="9" refY="5"
                markerUnits="userSpaceOnUse"
                markerWidth="4.4" markerHeight="4.4" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill={LINE} />
        </marker>
      </defs>

      {/* ---------- العرض (الكتف) — فوق خط الكتف ---------- */}
      <Dim
        on={active === 'width'}
        x1={-s.shoulderHalf} y1={s.topY + 7} x2={s.shoulderHalf} y2={s.topY + 7}
        ext={[[-s.shoulderHalf, tipY], [s.shoulderHalf, tipY]]}
        value={measures.width} lx={0} ly={s.topY + 13}
      />

      {/* ---------- عرض الصدر — على القماش عند خط الإبط ---------- */}
      <Dim
        on={active === 'chestWidth'}
        x1={-apX} y1={apY} x2={apX} y2={apY}
        value={measures.chestWidth} lx={0} ly={apY - 7} onCloth
      />

      {/* ---------- طول القميص — من الكتف حتى الذيل، القالب كاملًا ---------- */}
      <Dim
        on={active === 'chestLength'}
        x1={lenX} y1={s.topY} x2={lenX} y2={s.hemY}
        ext={[[s.neckHalf, s.topY], [s.hemHalf, s.hemY]]}
        value={measures.chestLength} lx={s.chestHalf * 0.26} ly={s.hemY + 9} onCloth
      />

      {/* ---------- طول الكم — على محور الكم ---------- */}
      <Dim
        on={active === 'sleeveLength'}
        x1={tipX} y1={tipY} x2={outer[0]} y2={outer[1]}
        value={measures.sleeveLength}
        lx={armMidX + nx * off} ly={armMidY + ny * off}
      />
    </svg>
  );
}

/* ------------------------------- سهم واحد ------------------------------- */

interface DimProps {
  x1: number; y1: number; x2: number; y2: number;
  value: number;
  lx: number; ly: number;
  /** خطوط امتداد رفيعة تصل السهم بحافة القماش */
  ext?: [number, number][];
  /** الرقم فوق القماش ⇒ هالة بيضاء بدل رمادية */
  onCloth?: boolean;
  on: boolean;
}

function Dim({ x1, y1, x2, y2, value, lx, ly, ext, onCloth, on }: DimProps) {
  return (
    <g opacity={on ? 1 : 0.6} style={{ transition: 'opacity 200ms' }}>
      {ext?.map(([ex, ey], i) => (
        <line
          key={i}
          x1={ex} y1={Y(ey)} x2={i === 0 ? x1 : x2} y2={Y(i === 0 ? y1 : y2)}
          stroke={LINE} strokeWidth={1} strokeDasharray="3 3" opacity={0.45}
          vectorEffect="non-scaling-stroke"
        />
      ))}

      <line
        x1={x1} y1={Y(y1)} x2={x2} y2={Y(y2)}
        stroke={LINE} strokeWidth={on ? 2.2 : 1.4}
        markerStart="url(#qa)" markerEnd="url(#qa)"
        vectorEffect="non-scaling-stroke"
        style={{ transition: 'stroke-width 200ms' }}
      />

      <text
        x={lx} y={Y(ly)}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={on ? 8.4 : 7.2}
        fontWeight={700}
        fill={onCloth ? ON : OFF}
        stroke={onCloth ? '#dcdce0' : '#f6f6f7'}
        strokeWidth={1.8}
        paintOrder="stroke"
        strokeLinejoin="round"
        style={{ transition: 'font-size 200ms' }}
        direction="rtl"
      >
        {Math.round(value * 10) / 10} سم
      </text>
    </g>
  );
}
