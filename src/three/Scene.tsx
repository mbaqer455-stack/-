/* ============================================================================
   قياس — مشهد ثلاثي الأبعاد (React Three Fiber)
   مجسّم خياطة يتشكّل مباشرة حسب القياسات المُدخلة.

   ملاحظات الأداء (مهمة للسلاسة):
   • أشكال منخفضة المضلعات + إعادة بناء الهندسة فقط عند تغيّر فعلي للقياس.
   • بدون ظلال حقيقية — نستخدم ContactShadows فقط (أرخص بكثير).
   • إضاءة بيئية تُرسم مرة واحدة (frames={1}) بدقة 128.
   • يتوقف الرندر تمامًا عندما يخرج المشهد من الشاشة.
   • dpr محدود بـ 1.6 + AdaptiveDpr لخفض الدقة أثناء الحركة.
   ========================================================================== */

import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  AdaptiveDpr, ContactShadows, Environment, Float, Html, Lightformer, OrbitControls,
} from '@react-three/drei';
import * as THREE from 'three';
import { mapRange, type Gender, type MeasureKey } from '../lib';

export type Measures = Record<MeasureKey, number>;

/* ------------------------- تحويل القياسات إلى أبعاد --------------------- */

interface Dims {
  poleLen: number;
  torsoLen: number;
  widthScale: number;
  depthScale: number;
  chestScale: number;
  armLen: number;
}

function toDims(m: Measures): Dims {
  return {
    poleLen: mapRange(m.height, 100, 220, 0.3, 0.78),
    torsoLen: mapRange(m.chestLength, 25, 90, 0.44, 0.94),
    widthScale: mapRange(m.width, 25, 80, 0.74, 1.46),
    depthScale: mapRange(m.weight, 25, 180, 0.72, 1.5),
    chestScale: mapRange(m.chestWidth, 25, 80, 0.78, 1.42),
    armLen: mapRange(m.sleeveLength, 20, 90, 0.3, 0.95),
  };
}

/** ملف الجانب للمجسّم: نصف القطر عند كل ارتفاع (0 = الخصر السفلي، 1 = الرقبة) */
function buildProfile(chestScale: number, gender: Gender): THREE.Vector2[] {
  const hip = gender === 'female' ? 0.40 : 0.355;
  const waist = gender === 'female' ? 0.285 : 0.315;
  const chest = (gender === 'female' ? 0.385 : 0.40) * chestScale;

  const pts: [number, number][] = [
    [0.001, 0.00],
    [hip * 0.72, 0.02],
    [hip, 0.10],
    [hip * 0.92, 0.22],
    [waist, 0.36],
    [waist * 1.1, 0.46],
    [chest * 0.92, 0.58],
    [chest, 0.68],
    [chest * 0.93, 0.80],
    [chest * 0.74, 0.90],
    [chest * 0.42, 0.965],
    [chest * 0.3, 1.0],
  ];
  return pts.map(([r, y]) => new THREE.Vector2(r, y));
}

/* --------------------------- مواد مُعاد استخدامها ----------------------- */

const fabricMaterial = new THREE.MeshStandardMaterial({
  color: '#1a1f2a', roughness: 0.62, metalness: 0.12,
});
const goldMaterial = new THREE.MeshStandardMaterial({
  color: '#e0b15c', roughness: 0.22, metalness: 0.95,
});
const guideMaterial = new THREE.MeshStandardMaterial({
  color: '#e0b15c', roughness: 0.4, metalness: 0.3,
  transparent: true, opacity: 0.3, emissive: '#a97a2e', emissiveIntensity: 0.35,
});

/* ------------------------------- المجسّم -------------------------------- */

interface FormProps {
  measures: Measures;
  gender: Gender;
  /** يتحرك بنعومة نحو القياس الجديد بدل القفز */
  damp?: boolean;
  showArms?: boolean;
}

function DressForm({ measures, gender, damp = true, showArms = true }: FormProps) {
  const target = useMemo(() => toDims(measures), [measures]);
  const current = useRef<Dims>({ ...target });

  const torsoRef = useRef<THREE.Group>(null);
  const poleRef = useRef<THREE.Mesh>(null);
  const armsRef = useRef<THREE.Group>(null);
  const tapeRef = useRef<THREE.Group>(null);
  const neckRef = useRef<THREE.Mesh>(null);

  /* نبني الهندسة فقط عند تغيّر عرض الصدر (مقرّب) أو الجنس */
  const bucket = Math.round(target.chestScale * 40);
  const torsoGeo = useMemo(
    () => new THREE.LatheGeometry(buildProfile(bucket / 40, gender), 40),
    [bucket, gender],
  );
  useEffect(() => () => torsoGeo.dispose(), [torsoGeo]);

  useFrame((_, delta) => {
    const c = current.current;
    const d = Math.min(delta, 0.1);
    const ease = (key: keyof Dims) => {
      c[key] = damp ? THREE.MathUtils.damp(c[key], target[key], 6, d) : target[key];
    };
    (Object.keys(target) as (keyof Dims)[]).forEach(ease);

    if (poleRef.current) {
      poleRef.current.scale.y = c.poleLen;
      poleRef.current.position.y = c.poleLen / 2;
    }
    if (torsoRef.current) {
      torsoRef.current.position.y = c.poleLen;
      torsoRef.current.scale.set(c.widthScale, c.torsoLen, c.depthScale);
    }
    // حلقة الرقبة تتبع اتساع الصدر حتى تبقى ملامسة للسطح دائمًا
    if (neckRef.current) neckRef.current.scale.setScalar(c.chestScale);

    if (armsRef.current) {
      armsRef.current.position.y = c.poleLen + c.torsoLen * 0.88;
      // كل ذراع تتدلّى من الكتف للأسفل بطول الكم
      armsRef.current.children.forEach((arm) => { arm.scale.y = c.armLen; });
    }
    if (tapeRef.current) {
      tapeRef.current.position.y = c.poleLen + c.torsoLen * 0.68;
      tapeRef.current.scale.set(c.widthScale * c.chestScale, 1, c.depthScale * c.chestScale);
      tapeRef.current.rotation.y += d * 0.25;
    }
  });

  return (
    <group>
      {/* القاعدة */}
      <mesh position={[0, 0.012, 0]} material={goldMaterial}>
        <cylinderGeometry args={[0.3, 0.34, 0.025, 40]} />
      </mesh>
      <mesh position={[0, 0.05, 0]} material={goldMaterial}>
        <cylinderGeometry args={[0.05, 0.09, 0.06, 20]} />
      </mesh>

      {/* العمود — الطول */}
      <mesh ref={poleRef} material={goldMaterial}>
        <cylinderGeometry args={[0.022, 0.028, 1, 16]} />
      </mesh>

      {/* الجذع */}
      <group ref={torsoRef}>
        <mesh geometry={torsoGeo} material={fabricMaterial} />
        {/* حزام الخصر الذهبي — نصف قطره أكبر قليلًا من الخصر فيبقى ظاهرًا */}
        <mesh position={[0, 0.37, 0]} rotation={[Math.PI / 2, 0, 0]} material={goldMaterial}>
          <torusGeometry args={[0.33, 0.012, 8, 44]} />
        </mesh>
        {/* حلقة الرقبة */}
        <mesh ref={neckRef} position={[0, 0.99, 0]} rotation={[Math.PI / 2, 0, 0]} material={goldMaterial}>
          <torusGeometry args={[0.135, 0.014, 8, 28]} />
        </mesh>
      </group>

      {/* أذرع إرشادية — طول الكم (تتدلّى من الكتف) */}
      {showArms && (
        <group ref={armsRef}>
          {[-1, 1].map((side) => (
            <group key={side} position={[side * 0.3, 0, 0]} rotation={[0, 0, side * 0.22]}>
              <mesh position={[0, -0.5, 0]} material={guideMaterial}>
                <cylinderGeometry args={[0.045, 0.028, 1, 12, 1, true]} />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {/* شريط القياس حول الصدر */}
      <group ref={tapeRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={goldMaterial}>
          <torusGeometry args={[0.43, 0.012, 8, 56]} />
        </mesh>
        <TapeTicks radius={0.43} />
      </group>
    </group>
  );
}

/** علامات شريط القياس — instanced لتكون بتكلفة رسم واحدة */
function TapeTicks({ radius, count = 40 }: { radius: number; count?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      dummy.position.set(Math.cos(a) * radius, 0, Math.sin(a) * radius);
      dummy.rotation.set(0, -a, 0);
      dummy.scale.setScalar(i % 5 === 0 ? 1.6 : 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [radius, count]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} material={goldMaterial}>
      <boxGeometry args={[0.006, 0.028, 0.02]} />
    </instancedMesh>
  );
}

/* ------------------------------- الإضاءة -------------------------------- */

function Lighting() {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 5, 3]} intensity={1.6} color="#fff4e0" />
      <directionalLight position={[-4, 2, -2]} intensity={0.8} color="#7aa2ff" />
      {/* بيئة تُرسم مرة واحدة — بدون تحميل ملفات خارجية */}
      <Environment resolution={128} frames={1}>
        <Lightformer intensity={2.6} color="#ffe6b8" position={[0, 4, 2]} scale={[8, 3, 1]} />
        <Lightformer intensity={1.2} color="#5b7cff" position={[-4, 1, -3]} scale={[5, 5, 1]} />
        <Lightformer intensity={0.9} color="#ffffff" position={[4, 0, 3]} scale={[4, 4, 1]} />
      </Environment>
    </>
  );
}

/* --------------------------- مشهد الواجهة الرئيسية ---------------------- */

const HERO_MEASURES: Measures = {
  height: 178, weight: 74, width: 47, chestWidth: 53, chestLength: 50, sleeveLength: 62,
};

export function HeroScene({ active = true }: { active?: boolean }) {
  const spin = useRef<THREE.Group>(null);
  const reduced = usePrefersReducedMotion();

  return (
    <Canvas
      dpr={[1, 1.6]}
      frameloop={active ? 'always' : 'demand'}
      gl={{ antialias: true, powerPreference: 'high-performance', alpha: true }}
      camera={{ position: [0.4, 1.35, 3.6], fov: 34 }}
      style={{ width: '100%', height: '100%' }}
    >
      <AdaptiveDpr pixelated={false} />
      <Lighting />

      <Float speed={reduced ? 0 : 1.1} rotationIntensity={0.12} floatIntensity={0.28}>
        <group ref={spin} position={[0, -0.72, 0]}>
          <SpinOnY targetRef={spin} speed={reduced ? 0 : 0.22} />
          <DressForm measures={HERO_MEASURES} gender="male" damp={false} />
        </group>
      </Float>

      <ContactShadows position={[0, -0.73, 0]} opacity={0.55} scale={4.5} blur={2.6} far={2.2} resolution={256} />
    </Canvas>
  );
}

function SpinOnY({ targetRef, speed }: { targetRef: React.RefObject<THREE.Group | null>; speed: number }) {
  useFrame((_, delta) => {
    if (targetRef.current) targetRef.current.rotation.y += delta * speed;
  });
  return null;
}

/* ------------------------ مشهد المعاينة أثناء الإدخال ------------------- */

interface FittingProps {
  measures: Measures;
  gender: Gender;
  active?: boolean;
  /** الحقل الذي يعدّله المستخدم الآن — يُبرز الملصق المقابل */
  focus?: MeasureKey | null;
}

export function FittingScene({ measures, gender, active = true, focus }: FittingProps) {
  const reduced = usePrefersReducedMotion();
  const dims = toDims(measures);

  return (
    <Canvas
      dpr={[1, 1.6]}
      frameloop={active ? 'always' : 'demand'}
      gl={{ antialias: true, powerPreference: 'high-performance', alpha: true }}
      camera={{ position: [0.2, 1.25, 3.3], fov: 36 }}
      style={{ width: '100%', height: '100%' }}
    >
      <AdaptiveDpr pixelated={false} />
      <Lighting />

      <group position={[0, -0.78, 0]}>
        <DressForm measures={measures} gender={gender} />

        {/* ملصقات القياس */}
        <Tag y={dims.poleLen + dims.torsoLen * 0.68} x={dims.widthScale * 0.62} active={focus === 'chestWidth'}>
          عرض الصدر {measures.chestWidth} سم
        </Tag>
        <Tag y={dims.poleLen + dims.torsoLen * 0.34} x={-dims.widthScale * 0.6} active={focus === 'chestLength'}>
          طول الصدر {measures.chestLength} سم
        </Tag>
        <Tag y={dims.poleLen + dims.torsoLen * 0.88 - dims.armLen * 0.9} x={dims.widthScale * 0.78} active={focus === 'sleeveLength'}>
          طول الكم {measures.sleeveLength} سم
        </Tag>
        <Tag y={dims.poleLen * 0.55} x={-0.5} active={focus === 'height'}>
          الطول {measures.height} سم
        </Tag>
      </group>

      <ContactShadows position={[0, -0.79, 0]} opacity={0.5} scale={4} blur={2.4} far={2} resolution={256} />

      <OrbitControls
        makeDefault
        enablePan={false}
        enableZoom={false}
        autoRotate={!reduced}
        autoRotateSpeed={0.5}
        minPolarAngle={Math.PI * 0.28}
        maxPolarAngle={Math.PI * 0.58}
        target={[0, 0.35, 0]}
      />
    </Canvas>
  );
}

function Tag({ x, y, active, children }: { x: number; y: number; active?: boolean; children: React.ReactNode }) {
  return (
    <Html position={[x, y, 0]} center distanceFactor={5} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
      <span
        className={`whitespace-nowrap rounded-pill border px-2.5 py-1 text-[11px] font-medium backdrop-blur-sm transition-colors duration-300
          ${active
            ? 'border-gold/70 bg-gold/20 text-gold-soft'
            : 'border-white/10 bg-black/55 text-ink-dim'}`}
      >
        {children}
      </span>
    </Html>
  );
}

/* -------------------------------- مساعد --------------------------------- */

function usePrefersReducedMotion(): boolean {
  return useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );
}
