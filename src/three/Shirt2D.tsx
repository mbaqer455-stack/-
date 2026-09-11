/* ============================================================================
   قالب التيشيرت — رسم فنّي مسطّح (technical flat) بـ React Three Fiber

   الفكرة: ظلّ واحد متّصل للقماش بمنحنيات حقيقية (رأس الكم، حفرة الإبط،
   خط الجنب)، وفوقه درزات رفيعة وياقة مضلّعة — تمامًا كمخطط المصنع.

   ملاحظات الأداء (سبب اختفاء التقطيع):
   • عدد الرؤوس ثابت مهما تغيّرت القياسات، فنُحدِّث إحداثياتها في مكانها
     بدل بناء هندسة جديدة كل إطار — صفر تخصيص ذاكرة أثناء السحب.
   • الياقة والدرزات أشرطة رباعية، فترتيب مثلثاتها يُحسب مرة واحدة فقط.
   • مثلثات الجسم تُرتَّب من جديد عند تغيّر الشكل بمقدار محسوس، لا كل إطار.
   • frameloop="demand": لا يُرسم إطار واحد ما لم تتحرّك القياسات فعلًا.

   وحدة العالم = سنتيمتر (انظر shirtMath.ts).
   ========================================================================== */

import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Gender } from '../lib';
import {
  armpit, cuffCorners, shirtOf, shoulderTip, sleeveAxis, VIEW_CM,
  type Measures, type Shirt,
} from './shirtMath';

const C = {
  cloth: '#dcdce0',    // القماش — رمادي فاتح
  seam: '#84848c',     // الدرزات
  collar: '#c4c4ca',   // الياقة المضلّعة
};

/* ------------------------------ أدوات المسار ---------------------------- */

const V = (x: number, y: number) => new THREE.Vector2(x, y);

/** نقاط منحنى تربيعي — العدد ثابت دائمًا ليبقى عدد الرؤوس ثابتًا */
const arc = (a: THREE.Vector2, c: THREE.Vector2, b: THREE.Vector2, n: number): THREE.Vector2[] =>
  new THREE.QuadraticBezierCurve(a, c, b).getPoints(n);

const mid = (a: THREE.Vector2, b: THREE.Vector2) => V((a.x + b.x) / 2, (a.y + b.y) / 2);

/* ------------------------- شبكات ثابتة عدد الرؤوس ----------------------- */

/**
 * مضلّع مغلق يتبدّل شكله دون أن يتبدّل عدد رؤوسه.
 * ترتيب المثلثات (earcut) هو الجزء المكلف، فنُعيده فقط عند انزياح محسوس.
 */
class Polygon {
  readonly geometry = new THREE.BufferGeometry();
  private readonly pos: Float32Array;
  private last: THREE.Vector2[] | null = null;

  constructor(private readonly count: number) {
    this.pos = new Float32Array(count * 3);
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geometry.setIndex([]);
  }

  /** @param drift كم سنتيمترًا يزيح أي رأس قبل أن نستحق إعادة الترتيب */
  update(points: THREE.Vector2[], drift = 4): void {
    for (let i = 0; i < this.count; i++) {
      this.pos[i * 3] = points[i].x;
      this.pos[i * 3 + 1] = points[i].y;
    }
    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;

    if (this.stale(points, drift)) {
      const faces = THREE.ShapeUtils.triangulateShape(points, []);
      const idx: number[] = [];
      for (const f of faces) idx.push(f[0], f[1], f[2]);
      this.geometry.setIndex(idx);
      this.last = points.map((p) => p.clone());
    }
  }

  private stale(points: THREE.Vector2[], drift: number): boolean {
    const prev = this.last;
    if (!prev) return true;
    for (let i = 0; i < this.count; i++) {
      if (Math.abs(prev[i].x - points[i].x) > drift) return true;
      if (Math.abs(prev[i].y - points[i].y) > drift) return true;
    }
    return false;
  }

  dispose(): void { this.geometry.dispose(); }
}

/**
 * شريط رباعي: صفّان متقابلان من النقاط. ترتيب مثلثاته ثابت أبدًا،
 * فلا يحتاج earcut إطلاقًا. عدّة أشرطة تسكن شبكة واحدة لتقليل رسمات الـ GPU.
 */
class Strip {
  readonly geometry = new THREE.BufferGeometry();
  private readonly pos: Float32Array;

  constructor(private readonly rows: number, segments = 1) {
    this.pos = new Float32Array(rows * 2 * 3 * segments);
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));

    const idx: number[] = [];
    for (let s = 0; s < segments; s++) {
      const base = s * rows * 2;
      for (let i = 0; i < rows - 1; i++) {
        const a = base + i * 2;
        idx.push(a, a + 1, a + 3, a, a + 3, a + 2);
      }
    }
    this.geometry.setIndex(idx);
  }

  writeSegment(seg: number, left: THREE.Vector2[], right: THREE.Vector2[]): void {
    let o = seg * this.rows * 6;
    for (let i = 0; i < this.rows; i++) {
      this.pos[o] = left[i].x;  this.pos[o + 1] = left[i].y;  o += 3;
      this.pos[o] = right[i].x; this.pos[o + 1] = right[i].y; o += 3;
    }
  }

  flush(): void {
    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  dispose(): void { this.geometry.dispose(); }
}

/** حافّتا خطٍّ مفتوح بعرض w — تُستعملان كصفّي شريط رباعي */
function edges(pts: THREE.Vector2[], w: number): [THREE.Vector2[], THREE.Vector2[]] {
  const h = w / 2;
  const a: THREE.Vector2[] = [];
  const b: THREE.Vector2[] = [];
  for (let i = 0; i < pts.length; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[Math.min(pts.length - 1, i + 1)];
    const dx = p1.x - p0.x, dy = p1.y - p0.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = (-dy / len) * h, ny = (dx / len) * h;
    a.push(V(pts[i].x + nx, pts[i].y + ny));
    b.push(V(pts[i].x - nx, pts[i].y - ny));
  }
  return [a, b];
}

/* --------------------------- بناء أجزاء القالب -------------------------- */

/* أعداد نقاط المنحنيات — ثابتة حتى يبقى عدد الرؤوس ثابتًا */
const N = { cap: 10, cuff: 5, underarm: 10, side1: 8, side2: 6, neck: 14, collar: 16 };
const HALF_COUNT = 2 + N.cap + N.cuff + N.underarm + N.side1 + N.side2;
const OUTLINE_COUNT = HALF_COUNT * 2 + (N.neck + 1 - 2);
const SEAM_ROWS = 13;
const SEAM_COUNT = 7;

/** النصف الأيمن من الظلّ الخارجي: من نقطة الرقبة نزولًا حتى الذيل. */
function rightEdge(s: Shirt): THREE.Vector2[] {
  const [spx, spy] = shoulderTip(s);
  const SP = V(spx, spy);
  const { dx, dy, nx, ny } = sleeveAxis(s);
  const { outer, inner } = cuffCorners(s);
  const CO = V(outer[0], outer[1]);
  const CI = V(inner[0], inner[1]);
  const AP = V(...armpit(s));

  const pts: THREE.Vector2[] = [V(s.neckHalf, s.topY), SP];

  // رأس الكم: ينتفخ قليلًا فوق محور الكم ثم يستقيم
  pts.push(...arc(SP,
    V(SP.x + dx * s.sleeveLen * 0.45 + nx * s.cuffW * 0.24,
      SP.y + dy * s.sleeveLen * 0.45 + ny * s.cuffW * 0.24),
    CO, N.cap).slice(1));

  // طرف الكم — مقوّس قليلًا للخارج
  const mc = mid(CO, CI);
  pts.push(...arc(CO, V(mc.x + dx * s.cuffW * 0.14, mc.y + dy * s.cuffW * 0.14), CI, N.cuff).slice(1));

  // درزة تحت الإبط — تنحني نحو الكم فيضمر وسطه قليلًا
  const ma = mid(CI, AP);
  pts.push(...arc(CI, V(ma.x + nx * 2.6, ma.y + ny * 2.6), AP, N.underarm).slice(1));

  // خط الجنب: إبط ← خصر ← ذيل
  const W = V(s.waistHalf, s.waistY);
  const H = V(s.hemHalf, s.hemY);
  pts.push(...arc(AP, V(s.chestHalf, (s.armpitY + s.waistY) / 2), W, N.side1).slice(1));
  pts.push(...arc(W, V(s.waistHalf, (s.waistY + s.hemY) / 2), H, N.side2).slice(1));

  return pts;
}

/** الظلّ الخارجي كاملًا: النصف الأيمن + مرآته + منحنى الرقبة. */
function outline(s: Shirt): THREE.Vector2[] {
  const R = rightEdge(s);
  const out: THREE.Vector2[] = R.slice();
  for (let i = R.length - 1; i >= 0; i--) out.push(V(-R[i].x, R[i].y));
  // منحنى الرقبة: نقطة التحكّم عند ضعف العمق ليبلغ المنتصف العمق المطلوب فعلًا
  const neck = arc(V(-s.neckHalf, s.topY), V(0, s.topY - s.neckDrop * 2), V(s.neckHalf, s.topY), N.neck);
  for (let i = 1; i < neck.length - 1; i++) out.push(neck[i]);
  return out;
}

/** الياقة: شريط بين فتحة الرقبة ومنحنى أوسع منها */
function collarEdges(s: Shirt): [THREE.Vector2[], THREE.Vector2[]] {
  const band = Math.max(1.9, s.neckHalf * 0.26);
  return [
    arc(V(-s.neckHalf, s.topY), V(0, s.topY - s.neckDrop * 2), V(s.neckHalf, s.topY), N.collar),
    arc(V(-s.neckHalf - band * 0.8, s.topY),
        V(0, s.topY - (s.neckDrop + band) * 2),
        V(s.neckHalf + band * 0.8, s.topY), N.collar),
  ];
}

/** مسارات الدرزات السبع — كلها بنفس عدد النقاط ليتوحّد ترتيب المثلثات */
function seamPaths(s: Shirt): THREE.Vector2[][] {
  const line = (a: THREE.Vector2, b: THREE.Vector2) => {
    const out: THREE.Vector2[] = [];
    for (let i = 0; i < SEAM_ROWS; i++) {
      const t = i / (SEAM_ROWS - 1);
      out.push(V(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t));
    }
    return out;
  };
  const flip = (pts: THREE.Vector2[]) => pts.map((p) => V(-p.x, p.y));

  const SP = V(...shoulderTip(s));
  const AP = V(...armpit(s));
  const m = mid(SP, AP);
  const band = Math.max(1.9, s.neckHalf * 0.26);
  const { dx, dy } = sleeveAxis(s);
  const { outer, inner } = cuffCorners(s);
  const back = Math.min(3.4, s.sleeveLen * 0.12);

  const armhole = arc(SP, V(m.x - 3.4, m.y), AP, SEAM_ROWS - 1);
  const cuffA = V(outer[0] - dx * back, outer[1] - dy * back);
  const cuffB = V(inner[0] - dx * back, inner[1] - dy * back);
  const shoulderA = V(s.neckHalf + band * 0.75, s.topY - 0.5);
  const hemY = s.hemY + 3.4;

  return [
    armhole, flip(armhole),
    line(shoulderA, SP), line(V(-shoulderA.x, shoulderA.y), V(-SP.x, SP.y)),
    line(cuffA, cuffB), line(V(-cuffA.x, cuffA.y), V(-cuffB.x, cuffB.y)),
    line(V(-s.hemHalf * 0.985, hemY), V(s.hemHalf * 0.985, hemY)),
  ];
}

/* ---------------------------------- القماش ------------------------------ */

const KEYS = [
  'topY', 'neckHalf', 'neckDrop', 'shoulderHalf', 'shoulderSlope',
  'sleeveAngle', 'sleeveLen', 'cuffW', 'armpitY', 'chestHalf',
  'waistY', 'waistHalf', 'hemY', 'hemHalf', 'bodyLen',
] as const;

const SEAM_W = 0.75;
const SETTLED = 0.02;

function Cloth({ measures, gender }: { measures: Measures; gender: Gender }) {
  const target = useMemo(() => shirtOf(measures, gender), [measures, gender]);
  const cur = useRef<Shirt>({ ...target });
  const invalidate = useThree((s) => s.invalidate);

  const parts = useMemo(() => ({
    body: new Polygon(OUTLINE_COUNT),
    collar: new Strip(N.collar + 1),
    seams: new Strip(SEAM_ROWS, SEAM_COUNT),
  }), []);

  useEffect(
    () => () => { parts.body.dispose(); parts.collar.dispose(); parts.seams.dispose(); },
    [parts],
  );

  // كل تغيّر في القياسات يوقظ حلقة الرسم — ثم تنام وحدها عند الاستقرار
  useEffect(() => { invalidate(); }, [target, invalidate]);

  useFrame((_, delta) => {
    const k = 1 - Math.exp(-14 * Math.min(delta, 0.1));
    const c = cur.current;

    let moved = 0;
    for (const key of KEYS) {
      const d = target[key] - c[key];
      c[key] += d * k;
      moved = Math.max(moved, Math.abs(d));
    }
    if (moved < SETTLED) Object.assign(c, target);

    parts.body.update(outline(c));

    const [ci, co] = collarEdges(c);
    parts.collar.writeSegment(0, ci, co);
    parts.collar.flush();

    const paths = seamPaths(c);
    for (let i = 0; i < paths.length; i++) {
      const [a, b] = edges(paths[i], SEAM_W);
      parts.seams.writeSegment(i, a, b);
    }
    parts.seams.flush();

    // ما زال يتحرّك ⇒ اطلب إطارًا آخر، وإلا يتوقّف الرسم تمامًا
    if (moved >= SETTLED) invalidate();
  });

  return (
    <group>
      <mesh geometry={parts.body.geometry} frustumCulled={false} position-z={0}>
        <meshBasicMaterial color={C.cloth} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={parts.seams.geometry} frustumCulled={false} position-z={0.02}>
        <meshBasicMaterial color={C.seam} toneMapped={false} side={THREE.DoubleSide} transparent opacity={0.55} />
      </mesh>
      <mesh geometry={parts.collar.geometry} frustumCulled={false} position-z={0.03}>
        <meshBasicMaterial color={C.collar} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/** يثبّت مجال الرؤية بالسنتيمتر مهما تغيّر حجم اللوحة بالبكسل. */
function FitCamera() {
  const height = useThree((s) => s.size.height);
  const camera = useThree((s) => s.camera) as THREE.OrthographicCamera;
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    camera.zoom = height / VIEW_CM;
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, height, invalidate]);
  return null;
}

/* --------------------------------- المشهد ------------------------------- */

export default function Shirt2D({ measures, gender }: { measures: Measures; gender: Gender }) {
  return (
    <Canvas
      orthographic
      frameloop="demand"
      camera={{ position: [0, 0, 10], near: 0.1, far: 100 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true }}
      style={{ width: '100%', height: '100%' }}
    >
      <FitCamera />
      <Cloth measures={measures} gender={gender} />
    </Canvas>
  );
}
