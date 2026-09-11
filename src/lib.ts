/* ============================================================================
   قياس — طبقة البيانات (قالب)
   كل شيء هنا يعمل محليًا (localStorage + IndexedDB) حتى تربطه بالـ API.
   للربط بالخادم: استبدل أجسام الدوال في قسم "API" بنداءات fetch فقط،
   دون تغيير أي شيء في الواجهة.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

/* ----------------------------------- الأنواع ---------------------------- */

export type Gender = 'male' | 'female';

export interface Submission {
  id: string;
  createdAt: number;
  fullName: string;
  studentId: string;
  phone: string;
  section: string;
  gender: Gender;
  height: number;       // الطول (سم)
  weight: number;       // الوزن (كغم)
  width: number;        // العرض (سم)
  chestWidth: number;   // عرض الصدر (سم)
  chestLength: number;  // طول الصدر (سم)
  sleeveLength: number; // طول الكم (سم)
  notes: string;
}

export type MeasureKey = 'height' | 'weight' | 'width' | 'chestWidth' | 'chestLength' | 'sleeveLength';

export interface VideoItem {
  id: string;
  title: string;
  description: string;
  createdAt: number;
  kind: 'file' | 'link';
  /** رابط خارجي عندما kind = link */
  url: string;
  /** مفتاح الملف داخل IndexedDB عندما kind = file */
  blobKey: string;
  posterKey: string;
  size: number;
  mime: string;
  duration: number;
}

export interface Settings {
  siteOpen: boolean;
  closedTitle: string;
  closedMessage: string;
  /** قالب فقط — المصادقة الحقيقية تتم في الخادم */
  pin: string;
}

/* ------------------------------ حقول القياس ----------------------------- */

export interface FieldDef {
  key: MeasureKey;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  hint: string;
}

export const MEASURE_FIELDS: FieldDef[] = [
  { key: 'height',       label: 'الطول',      unit: 'سم',  min: 100, max: 220, step: 1,   hint: 'الطول الكلي واقفًا بدون حذاء' },
  { key: 'weight',       label: 'الوزن',      unit: 'كغم', min: 25,  max: 180, step: 0.5, hint: 'الوزن التقريبي بالكيلوغرام' },
  { key: 'width',        label: 'العرض',      unit: 'سم',  min: 25,  max: 80,  step: 0.5, hint: 'عرض الكتفين من طرف إلى طرف' },
  { key: 'chestWidth',   label: 'عرض الصدر',  unit: 'سم',  min: 25,  max: 80,  step: 0.5, hint: 'أعرض نقطة في الصدر' },
  { key: 'chestLength',  label: 'طول الصدر',  unit: 'سم',  min: 25,  max: 90,  step: 0.5, hint: 'من أعلى الكتف حتى الخصر' },
  { key: 'sleeveLength', label: 'طول الكم',   unit: 'سم',  min: 20,  max: 90,  step: 0.5, hint: 'من الكتف حتى الرسغ' },
];

export const GENDER_LABEL: Record<Gender, string> = { male: 'ذكر', female: 'أنثى' };

export const DEFAULT_MEASURES: Record<MeasureKey, number> = {
  height: 172, weight: 68, width: 44, chestWidth: 50, chestLength: 46, sleeveLength: 60,
};

/* -------------------------------- أدوات عامة ---------------------------- */

export const uid = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

/** خريطة خطية مع تحديد المدى */
export const mapRange = (v: number, a1: number, a2: number, b1: number, b2: number): number =>
  clamp(b1 + ((v - a1) / (a2 - a1)) * (b2 - b1), Math.min(b1, b2), Math.max(b1, b2));

export const formatDate = (ts: number): string =>
  new Date(ts).toLocaleDateString('ar-IQ-u-nu-latn', { year: 'numeric', month: '2-digit', day: '2-digit' });

export const formatDateTime = (ts: number): string =>
  `${formatDate(ts)} · ${new Date(ts).toLocaleTimeString('ar-IQ-u-nu-latn', { hour: '2-digit', minute: '2-digit' })}`;

export const formatBytes = (bytes: number): string => {
  if (!bytes) return '—';
  const units = ['بايت', 'كيلوبايت', 'ميغابايت', 'غيغابايت'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${units[i]}`;
};

export const formatDuration = (sec: number): string => {
  if (!sec || !isFinite(sec)) return '—';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

/* ------------------------------- التحقق --------------------------------- */

export type FormErrors = Partial<Record<keyof Submission, string>>;

export function validateSubmission(v: Partial<Submission>): FormErrors {
  const e: FormErrors = {};

  if (!v.fullName || v.fullName.trim().length < 3) e.fullName = 'اكتب الاسم الثلاثي (3 أحرف على الأقل)';
  if (!v.studentId || !v.studentId.trim()) e.studentId = 'الرقم الجامعي / رقم الطالب مطلوب';
  if (v.phone && !/^[0-9+\s-]{7,15}$/.test(v.phone.trim())) e.phone = 'رقم هاتف غير صالح';
  if (!v.gender) e.gender = 'اختر الجنس';

  for (const f of MEASURE_FIELDS) {
    const n = v[f.key];
    if (n === undefined || n === null || Number.isNaN(n)) {
      e[f.key] = `${f.label} مطلوب`;
    } else if (n < f.min || n > f.max) {
      e[f.key] = `${f.label} يجب أن يكون بين ${f.min} و ${f.max} ${f.unit}`;
    }
  }
  return e;
}

/* ------------------------- مخزن تفاعلي بسيط ----------------------------- */

interface Store<T> {
  get: () => T;
  set: (next: T | ((prev: T) => T)) => void;
  subscribe: (cb: () => void) => () => void;
}

function createStore<T>(key: string, initial: T): Store<T> {
  let value: T = initial;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      value = Array.isArray(initial) ? (parsed as T) : ({ ...initial, ...(parsed as object) } as T);
    }
  } catch {
    /* تخزين غير متاح — نكمل بالقيم الافتراضية */
  }

  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());

  // مزامنة بين تبويبات المتصفح
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (ev) => {
      if (ev.key !== key || ev.newValue == null) return;
      try {
        value = JSON.parse(ev.newValue) as T;
        emit();
      } catch { /* تجاهل */ }
    });
  }

  return {
    get: () => value,
    set: (next) => {
      value = typeof next === 'function' ? (next as (p: T) => T)(value) : next;
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ممتلئ */ }
      emit();
    },
    subscribe: (cb) => {
      listeners.add(cb);
      return () => { listeners.delete(cb); };
    },
  };
}

const submissionsStore = createStore<Submission[]>('qias.submissions', []);
const videosStore = createStore<VideoItem[]>('qias.videos', []);
const settingsStore = createStore<Settings>('qias.settings', {
  siteOpen: true,
  closedTitle: 'الموقع مغلق مؤقتًا',
  closedMessage: 'تم إيقاف استقبال القياسات حاليًا. يرجى المحاولة لاحقًا أو مراجعة الإدارة.',
  pin: '1234',
});

function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

export const useSubmissions = (): Submission[] => useStore(submissionsStore);
export const useVideos = (): VideoItem[] => useStore(videosStore);
export const useSettings = (): Settings => useStore(settingsStore);

/* ------------------------- IndexedDB لملفات الفيديو --------------------- */

const DB_NAME = 'qias-media';
const DB_STORE = 'files';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(DB_STORE)) req.result.createObjectStore(DB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(key: string, blob: Blob): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).put(blob, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function idbGet(key: string): Promise<Blob | undefined> {
  const db = await openDB();
  const blob = await new Promise<Blob | undefined>((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readonly');
    const req = tx.objectStore(DB_STORE).get(key);
    req.onsuccess = () => resolve(req.result as Blob | undefined);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return blob;
}

async function idbDelete(key: string): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/** روابط blob مؤقتة — تُنشأ مرة واحدة لكل مفتاح وتُحرَّر عند الحذف */
const objectUrls = new Map<string, string>();

export async function mediaUrl(key: string): Promise<string> {
  if (!key) return '';
  const cached = objectUrls.get(key);
  if (cached) return cached;
  const blob = await idbGet(key);
  if (!blob) return '';
  const url = URL.createObjectURL(blob);
  objectUrls.set(key, url);
  return url;
}

function revokeMedia(key: string): void {
  const url = objectUrls.get(key);
  if (url) {
    URL.revokeObjectURL(url);
    objectUrls.delete(key);
  }
}

/** hook: يعطي رابط تشغيل جاهز لأي فيديو (ملف محلي أو رابط خارجي) */
export function useVideoSource(video: VideoItem | null): string {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let alive = true;
    if (!video) { setSrc(''); return; }
    if (video.kind === 'link') { setSrc(video.url); return; }
    void mediaUrl(video.blobKey).then((u) => { if (alive) setSrc(u); });
    return () => { alive = false; };
  }, [video]);
  return src;
}

/* ---------------------------------- API --------------------------------- */
/* استبدل محتوى هذه الدوال بنداءات الخادم عند الربط الحقيقي */

export const api = {
  /* --- القياسات --- */
  async addSubmission(data: Omit<Submission, 'id' | 'createdAt'>): Promise<Submission> {
    const row: Submission = { ...data, id: uid(), createdAt: Date.now() };
    submissionsStore.set((prev) => [row, ...prev]);
    return row;
  },

  async deleteSubmission(id: string): Promise<void> {
    submissionsStore.set((prev) => prev.filter((s) => s.id !== id));
  },

  async clearSubmissions(): Promise<void> {
    submissionsStore.set([]);
  },

  /* --- الفيديوهات --- */
  async addVideoFile(file: File, meta: { title: string; description: string }): Promise<VideoItem> {
    const blobKey = `v_${uid()}`;
    await idbPut(blobKey, file);

    let duration = 0;
    let posterKey = '';
    try {
      const shot = await captureFrame(file);
      duration = shot.duration;
      if (shot.poster) {
        posterKey = `p_${uid()}`;
        await idbPut(posterKey, shot.poster);
      }
    } catch { /* الصورة المصغّرة اختيارية */ }

    const row: VideoItem = {
      id: uid(), createdAt: Date.now(), kind: 'file', url: '',
      title: meta.title.trim() || file.name,
      description: meta.description.trim(),
      blobKey, posterKey, size: file.size, mime: file.type, duration,
    };
    videosStore.set((prev) => [row, ...prev]);
    return row;
  },

  async addVideoLink(meta: { title: string; description: string; url: string }): Promise<VideoItem> {
    const row: VideoItem = {
      id: uid(), createdAt: Date.now(), kind: 'link',
      url: meta.url.trim(), title: meta.title.trim(), description: meta.description.trim(),
      blobKey: '', posterKey: '', size: 0, mime: '', duration: 0,
    };
    videosStore.set((prev) => [row, ...prev]);
    return row;
  },

  async deleteVideo(id: string): Promise<void> {
    const item = videosStore.get().find((v) => v.id === id);
    if (item?.blobKey) { revokeMedia(item.blobKey); await idbDelete(item.blobKey); }
    if (item?.posterKey) { revokeMedia(item.posterKey); await idbDelete(item.posterKey); }
    videosStore.set((prev) => prev.filter((v) => v.id !== id));
  },

  /* --- الإعدادات --- */
  async updateSettings(patch: Partial<Settings>): Promise<void> {
    settingsStore.set((prev) => ({ ...prev, ...patch }));
  },

  getSettings(): Settings {
    return settingsStore.get();
  },

  /* --- بيانات تجريبية للمعاينة --- */
  async seedDemo(): Promise<void> {
    const names = [
      'محمد باقر حسن', 'زينب علي كريم', 'أحمد صباح جاسم', 'فاطمة نور الدين',
      'يوسف عبد الرزاق', 'مريم حيدر عباس', 'عمر ياسين محمود', 'رقية سعد الله',
    ];
    const sections = ['المرحلة الأولى - أ', 'المرحلة الأولى - ب', 'المرحلة الثانية - أ', 'المرحلة الثالثة'];
    const jitter = (n: number, s: number) => Math.round((n + (Math.random() - 0.5) * s) * 2) / 2;

    const rows: Submission[] = names.map((fullName, i) => {
      const gender: Gender = i % 3 === 1 ? 'female' : 'male';
      const base = gender === 'male' ? 1 : 0.93;
      return {
        id: uid(),
        createdAt: Date.now() - i * 36e5 * 7,
        fullName,
        studentId: `2024${String(1100 + i * 7).padStart(4, '0')}`,
        phone: `0770${Math.floor(1000000 + Math.random() * 8999999)}`,
        section: sections[i % sections.length],
        gender,
        height: Math.round(jitter(172 * base, 12)),
        weight: jitter(70 * base, 18),
        width: jitter(45 * base, 5),
        chestWidth: jitter(51 * base, 7),
        chestLength: jitter(46 * base, 5),
        sleeveLength: jitter(60 * base, 6),
        notes: i % 4 === 0 ? 'يفضّل قياسًا أوسع قليلًا عند الكتف' : '',
      };
    });
    submissionsStore.set((prev) => [...rows, ...prev]);
  },
};

/* -------------------- التقاط صورة مصغّرة من الفيديو --------------------- */

function captureFrame(file: File): Promise<{ poster: Blob | null; duration: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    const fail = (err: unknown) => { URL.revokeObjectURL(url); reject(err); };
    const timer = setTimeout(() => fail(new Error('timeout')), 8000);

    video.onloadedmetadata = () => { video.currentTime = Math.min(1, (video.duration || 0) * 0.1); };
    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 640 / (video.videoWidth || 640));
      canvas.width = Math.round((video.videoWidth || 640) * scale);
      canvas.height = Math.round((video.videoHeight || 360) * scale);
      canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((poster) => {
        clearTimeout(timer);
        const duration = video.duration;
        URL.revokeObjectURL(url);
        resolve({ poster, duration });
      }, 'image/jpeg', 0.72);
    };
    video.onerror = () => { clearTimeout(timer); fail(new Error('video decode failed')); };
  });
}

/* ------------------------------ التصدير --------------------------------- */

const EXPORT_COLUMNS: { label: string; get: (s: Submission) => string }[] = [
  { label: 'التاريخ', get: (s) => formatDate(s.createdAt) },
  { label: 'الاسم', get: (s) => s.fullName },
  { label: 'الرقم الجامعي', get: (s) => s.studentId },
  { label: 'المرحلة/الشعبة', get: (s) => s.section || '—' },
  { label: 'الجنس', get: (s) => GENDER_LABEL[s.gender] },
  ...MEASURE_FIELDS.map((f) => ({
    label: `${f.label} (${f.unit})`,
    get: (s: Submission) => String(s[f.key]),
  })),
  { label: 'الهاتف', get: (s) => s.phone || '—' },
  { label: 'ملاحظات', get: (s) => s.notes || '—' },
];

export const exportColumns = EXPORT_COLUMNS;

/** علامة ترتيب البايت — تجعل Excel يقرأ العربية بشكل صحيح */
const BOM = '﻿';

/** CSV بترميز UTF-8 + BOM ليفتح بالعربية في Excel مباشرة */
export function exportCsv(rows: Submission[]): void {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = [
    EXPORT_COLUMNS.map((c) => esc(c.label)).join(','),
    ...rows.map((r) => EXPORT_COLUMNS.map((c) => esc(c.get(r))).join(',')),
  ].join('\r\n');

  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `qias-measurements-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/**
 * تصدير PDF عبر نافذة الطباعة في المتصفح (احفظ كـ PDF).
 * هذه أدق طريقة للعربية لأنها تستخدم خطوط النظام وتشكيل RTL الصحيح
 * دون الحاجة لتضمين خطوط داخل مكتبة PDF.
 */
export function printPdf(): void {
  document.body.classList.add('is-printing');
  const cleanup = () => {
    document.body.classList.remove('is-printing');
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  // مهلة قصيرة حتى يُرسم تقرير الطباعة قبل فتح النافذة
  setTimeout(() => { window.print(); setTimeout(cleanup, 800); }, 120);
}

/* ------------------------------ hooks مساعدة ---------------------------- */

/** ظهور تدريجي عند دخول العنصر للشاشة (خفيف، بدون مكتبات) */
export function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.classList.add('is-in');
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

/** هل العنصر ظاهر على الشاشة؟ — نوقف رندر الـ 3D عندما يختفي */
export function useInView<T extends HTMLElement = HTMLDivElement>(margin = '120px') {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [margin]);
  return { ref, inView };
}

/** تنبيهات قصيرة */
export interface Toast { id: string; text: string; tone: 'ok' | 'error' | 'info' }

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: Toast['tone'] = 'ok') => {
    const id = uid();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3400);
  }, []);
  return { toasts, push };
}

/** جلسة لوحة التحكم (قالب — تُستبدل بتوكن حقيقي من الخادم) */
const SESSION_KEY = 'qias.admin';

export function useAdminSession() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(SESSION_KEY) === '1');
  const login = useCallback((pin: string) => {
    if (pin === api.getSettings().pin) {
      sessionStorage.setItem(SESSION_KEY, '1');
      setAuthed(true);
      return true;
    }
    return false;
  }, []);
  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setAuthed(false);
  }, []);
  return { authed, login, logout };
}
