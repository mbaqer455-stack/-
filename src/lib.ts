/* ============================================================================
   قياس — طبقة البيانات

   تعمل بوضعين تلقائيًا:
   • سحابي (Supabase): عند وجود المفاتيح في .env — البيانات مشتركة بين الجميع،
     والتحديث يصل لحظيًا لكل من يفتح الموقع.
   • محلي (المتصفح): عند غياب المفاتيح — كل جهاز يحتفظ ببياناته وحده.
     مفيد لتجربة القالب بسرعة بدون إعداد.

   كل عمليات البيانات مجمّعة في كائن api في الأسفل.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { isCloud, MEDIA_BUCKET, must, supabase } from './supabase';
import { computeSize, SIZE_ORDER, summarizeSizes } from './sizing';

export { isCloud };
export { computeSize, formatSizeSummary, SIZE_ORDER, summarizeSizes, type SizeCount, type SizeLabel, type SizeResult } from './sizing';

/* ----------------------------------- الأنواع ---------------------------- */

export type Gender = 'male' | 'female';

export interface Submission {
  id: string;
  createdAt: number;
  fullName: string;
  phone: string;
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
  /** مسار الملف: داخل IndexedDB محليًا، أو داخل مخزن Supabase سحابيًا */
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
  /** يُستخدم في الوضع المحلي فقط — في السحابي الدخول بحساب حقيقي */
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
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

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

/* ========================================================================== */
/*                              المخازن التفاعلية                             */
/* ========================================================================== */

type Listener = () => void;

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(fallback) ? (parsed as T) : ({ ...fallback, ...(parsed as object) } as T);
  } catch {
    return fallback;
  }
}

function writeLocal(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ممتلئ أو محظور */ }
}

/* ------------------------------ مجموعة صفوف ----------------------------- */

interface Collection<T> {
  get: () => T[];
  subscribe: (cb: Listener) => () => void;
  reload: () => Promise<void>;
  /** الوضع المحلي فقط */
  setLocal: (next: (prev: T[]) => T[]) => void;
}

function createCollection<T extends { id: string }>(table: string, localKey: string): Collection<T> {
  let value: T[] = isCloud ? [] : readLocal<T[]>(localKey, []);
  const listeners = new Set<Listener>();
  let channel: RealtimeChannel | null = null;

  const emit = () => listeners.forEach((l) => l());

  const reload = async (): Promise<void> => {
    if (!isCloud || !supabase) return;
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('createdAt', { ascending: false });

    // خطأ الصلاحيات طبيعي للزائر (لا يقرأ بيانات الطلاب) — نتركها فارغة
    if (error) return;
    value = (data ?? []) as T[];
    emit();
  };

  // مزامنة بين تبويبات المتصفح في الوضع المحلي
  if (!isCloud && typeof window !== 'undefined') {
    window.addEventListener('storage', (ev) => {
      if (ev.key !== localKey || ev.newValue == null) return;
      try { value = JSON.parse(ev.newValue) as T[]; emit(); } catch { /* تجاهل */ }
    });
  }

  return {
    get: () => value,
    reload,
    setLocal: (next) => {
      value = next(value);
      writeLocal(localKey, value);
      emit();
    },
    subscribe: (cb) => {
      listeners.add(cb);

      // أول مشترك: نحمّل البيانات ونفتح قناة التحديث اللحظي
      if (listeners.size === 1 && isCloud && supabase) {
        void reload();
        channel = supabase
          .channel(`qias:${table}`)
          .on('postgres_changes', { event: '*', schema: 'public', table }, () => { void reload(); })
          .subscribe();
      }

      return () => {
        listeners.delete(cb);
        if (listeners.size === 0 && channel && supabase) {
          void supabase.removeChannel(channel);
          channel = null;
        }
      };
    },
  };
}

const submissions = createCollection<Submission>('submissions', 'qias.submissions');
const videos = createCollection<VideoItem>('videos', 'qias.videos');

/* -------------------------------- الإعدادات ----------------------------- */

const DEFAULT_SETTINGS: Settings = {
  siteOpen: true,
  closedTitle: 'الموقع مغلق مؤقتًا',
  closedMessage: 'تم إيقاف استقبال القياسات حاليًا. يرجى المحاولة لاحقًا أو مراجعة الإدارة.',
  pin: '1234',
};

const SETTINGS_KEY = 'qias.settings';

const settingsStore = (() => {
  let value: Settings = isCloud ? DEFAULT_SETTINGS : readLocal(SETTINGS_KEY, DEFAULT_SETTINGS);
  let ready = !isCloud;
  const listeners = new Set<Listener>();
  let channel: RealtimeChannel | null = null;

  const emit = () => listeners.forEach((l) => l());

  const reload = async (): Promise<void> => {
    if (!isCloud || !supabase) return;
    const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single();
    if (!error && data) {
      value = {
        siteOpen: Boolean(data.siteOpen),
        closedTitle: String(data.closedTitle ?? DEFAULT_SETTINGS.closedTitle),
        closedMessage: String(data.closedMessage ?? DEFAULT_SETTINGS.closedMessage),
        pin: '',
      };
    }
    ready = true;
    emit();
  };

  if (!isCloud && typeof window !== 'undefined') {
    window.addEventListener('storage', (ev) => {
      if (ev.key !== SETTINGS_KEY || ev.newValue == null) return;
      try { value = JSON.parse(ev.newValue) as Settings; emit(); } catch { /* تجاهل */ }
    });
  }

  return {
    get: () => value,
    isReady: () => ready,
    reload,
    setLocal: (patch: Partial<Settings>) => {
      value = { ...value, ...patch };
      writeLocal(SETTINGS_KEY, value);
      emit();
    },
    /** تحديث متفائل: نعرض التغيير فورًا ثم نرسله للخادم */
    setOptimistic: (patch: Partial<Settings>) => {
      value = { ...value, ...patch };
      emit();
    },
    subscribe: (cb: Listener) => {
      listeners.add(cb);
      if (listeners.size === 1 && isCloud && supabase) {
        void reload();
        channel = supabase
          .channel('qias:settings')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => { void reload(); })
          .subscribe();
      }
      return () => {
        listeners.delete(cb);
        if (listeners.size === 0 && channel && supabase) {
          void supabase.removeChannel(channel);
          channel = null;
        }
      };
    },
  };
})();

/* ------------------------------- الـ hooks ------------------------------ */

export const useSubmissions = (): Submission[] =>
  useSyncExternalStore(submissions.subscribe, submissions.get, submissions.get);

export const useVideos = (): VideoItem[] =>
  useSyncExternalStore(videos.subscribe, videos.get, videos.get);

export const useSettings = (): Settings =>
  useSyncExternalStore(settingsStore.subscribe, settingsStore.get, settingsStore.get);

/** هل وصلت الإعدادات من الخادم؟ نتجنب وميض «الموقع مفتوح» قبل معرفة الحقيقة */
export const useSettingsReady = (): boolean =>
  useSyncExternalStore(settingsStore.subscribe, settingsStore.isReady, settingsStore.isReady);

/* ========================================================================== */
/*                        تخزين الملفات (فيديو + صورة)                        */
/* ========================================================================== */

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

/** روابط blob المحلية — تُنشأ مرة واحدة لكل مفتاح */
const objectUrls = new Map<string, string>();

/** يحوّل مفتاح ملف إلى رابط قابل للتشغيل (سحابي أو محلي) */
export async function mediaUrl(key: string): Promise<string> {
  if (!key) return '';

  if (isCloud && supabase) {
    return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(key).data.publicUrl;
  }

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

/** hook: رابط تشغيل جاهز لأي فيديو (ملف مرفوع أو رابط خارجي) */
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

/* ========================================================================== */
/*                                    API                                     */
/* ========================================================================== */

/** يحوّل خطأ Supabase إلى رسالة عربية مفهومة */
function fail(action: string, error: { message: string } | null): never {
  const detail = error?.message ?? '';
  if (/row-level security|permission/i.test(detail)) {
    throw new Error(`${action}: ليس لديك صلاحية — سجّل الدخول أولًا`);
  }
  if (/Failed to fetch|NetworkError/i.test(detail)) {
    throw new Error(`${action}: تعذّر الاتصال بالخادم — تحقق من الإنترنت`);
  }
  throw new Error(`${action}: ${detail || 'خطأ غير متوقع'}`);
}

export const api = {
  /* ------------------------------ القياسات ------------------------------ */

  async addSubmission(data: Omit<Submission, 'id' | 'createdAt'>): Promise<Submission> {
    const row: Submission = { ...data, id: uid(), createdAt: Date.now() };

    if (isCloud) {
      const { error } = await must(supabase).from('submissions').insert(row);
      if (error) fail('تعذّر إرسال القياس', error);
    } else {
      submissions.setLocal((prev) => [row, ...prev]);
    }
    return row;
  },

  async deleteSubmission(id: string): Promise<void> {
    if (isCloud) {
      const { error } = await must(supabase).from('submissions').delete().eq('id', id);
      if (error) fail('تعذّر حذف السجل', error);
      await submissions.reload();
    } else {
      submissions.setLocal((prev) => prev.filter((s) => s.id !== id));
    }
  },

  async clearSubmissions(): Promise<void> {
    if (isCloud) {
      const { error } = await must(supabase).from('submissions').delete().neq('id', '');
      if (error) fail('تعذّر حذف السجلات', error);
      await submissions.reload();
    } else {
      submissions.setLocal(() => []);
    }
  },

  /* ----------------------------- الفيديوهات ----------------------------- */

  async addVideoFile(file: File, meta: { title: string; description: string }): Promise<VideoItem> {
    const id = uid();
    const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4';
    const blobKey = `videos/${id}.${ext}`;
    let posterKey = '';
    let duration = 0;

    // لقطة مصغّرة من الفيديو نفسه (اختيارية — لا توقف الرفع إن فشلت)
    let poster: Blob | null = null;
    try {
      const shot = await captureFrame(file);
      duration = shot.duration;
      poster = shot.poster;
      if (poster) posterKey = `posters/${id}.jpg`;
    } catch { /* نكمل بدون صورة */ }

    if (isCloud) {
      const client = must(supabase);
      const up = await client.storage.from(MEDIA_BUCKET)
        .upload(blobKey, file, { contentType: file.type || 'video/mp4', upsert: false });
      if (up.error) fail('تعذّر رفع الفيديو', up.error);

      if (poster && posterKey) {
        const shot = await client.storage.from(MEDIA_BUCKET)
          .upload(posterKey, poster, { contentType: 'image/jpeg', upsert: false });
        if (shot.error) posterKey = '';
      }
    } else {
      await idbPut(blobKey, file);
      if (poster && posterKey) await idbPut(posterKey, poster);
    }

    const row: VideoItem = {
      id, createdAt: Date.now(), kind: 'file', url: '',
      title: meta.title.trim() || file.name,
      description: meta.description.trim(),
      blobKey, posterKey, size: file.size, mime: file.type, duration,
    };

    if (isCloud) {
      const { error } = await must(supabase).from('videos').insert(row);
      if (error) fail('تعذّر حفظ بيانات الفيديو', error);
      await videos.reload();
    } else {
      videos.setLocal((prev) => [row, ...prev]);
    }
    return row;
  },

  async addVideoLink(meta: { title: string; description: string; url: string }): Promise<VideoItem> {
    const row: VideoItem = {
      id: uid(), createdAt: Date.now(), kind: 'link',
      url: meta.url.trim(), title: meta.title.trim(), description: meta.description.trim(),
      blobKey: '', posterKey: '', size: 0, mime: '', duration: 0,
    };

    if (isCloud) {
      const { error } = await must(supabase).from('videos').insert(row);
      if (error) fail('تعذّر إضافة الرابط', error);
      await videos.reload();
    } else {
      videos.setLocal((prev) => [row, ...prev]);
    }
    return row;
  },

  async deleteVideo(id: string): Promise<void> {
    const item = videos.get().find((v) => v.id === id);
    const keys = [item?.blobKey, item?.posterKey].filter(Boolean) as string[];

    if (isCloud) {
      const client = must(supabase);
      if (keys.length) await client.storage.from(MEDIA_BUCKET).remove(keys);
      const { error } = await client.from('videos').delete().eq('id', id);
      if (error) fail('تعذّر حذف الفيديو', error);
      await videos.reload();
    } else {
      for (const k of keys) { revokeMedia(k); await idbDelete(k); }
      videos.setLocal((prev) => prev.filter((v) => v.id !== id));
    }
  },

  /* ------------------------------ الإعدادات ----------------------------- */

  async updateSettings(patch: Partial<Settings>): Promise<void> {
    if (isCloud) {
      // pin غير موجود في قاعدة البيانات — الدخول بحساب حقيقي
      const { pin: _pin, ...remote } = patch;
      if (Object.keys(remote).length === 0) return;

      settingsStore.setOptimistic(remote);
      const { error } = await must(supabase).from('settings').update(remote).eq('id', 1);
      if (error) {
        await settingsStore.reload(); // نتراجع عن التحديث المتفائل
        fail('تعذّر حفظ الإعداد', error);
      }
    } else {
      settingsStore.setLocal(patch);
    }
  },

  getSettings(): Settings {
    return settingsStore.get();
  },

  /* ------------------------- بيانات تجريبية ----------------------------- */

  async seedDemo(): Promise<void> {
    const names = [
      'محمد باقر حسن', 'زينب علي كريم', 'أحمد صباح جاسم', 'فاطمة نور الدين',
      'يوسف عبد الرزاق', 'مريم حيدر عباس', 'عمر ياسين محمود', 'رقية سعد الله',
    ];
    const jitter = (n: number, s: number) => Math.round((n + (Math.random() - 0.5) * s) * 2) / 2;

    const rows: Submission[] = names.map((fullName, i) => {
      const gender: Gender = i % 3 === 1 ? 'female' : 'male';
      const base = gender === 'male' ? 1 : 0.93;
      return {
        id: uid(),
        createdAt: Date.now() - i * 36e5 * 7,
        fullName,
        phone: `0770${Math.floor(1000000 + Math.random() * 8999999)}`,
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

    if (isCloud) {
      const { error } = await must(supabase).from('submissions').insert(rows);
      if (error) fail('تعذّر إضافة البيانات التجريبية', error);
      await submissions.reload();
    } else {
      submissions.setLocal((prev) => [...rows, ...prev]);
    }
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

    const fail2 = (err: unknown) => { URL.revokeObjectURL(url); reject(err); };
    const timer = setTimeout(() => fail2(new Error('timeout')), 8000);

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
    video.onerror = () => { clearTimeout(timer); fail2(new Error('video decode failed')); };
  });
}

/* ------------------------------ التصدير --------------------------------- */

const EXPORT_COLUMNS: { label: string; get: (s: Submission) => string }[] = [
  { label: 'التاريخ', get: (s) => formatDate(s.createdAt) },
  { label: 'الاسم', get: (s) => s.fullName },
  { label: 'الجنس', get: (s) => GENDER_LABEL[s.gender] },
  { label: 'المقاس', get: (s) => computeSize(s).size },
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
 * تصدير مبسّط للمصنع: الاسم والجنس والمقاس فقط، مرتّب حسب المقاس ثم الاسم،
 * مع صفوف توزيع العدد لكل مقاس في الأعلى — هذا ما يحتاجه المصنع فعليًا للإنتاج.
 */
export function exportFactoryCsv(rows: Submission[]): void {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const sorted = [...rows].sort((a, b) => {
    const ai = SIZE_ORDER.indexOf(computeSize(a).size);
    const bi = SIZE_ORDER.indexOf(computeSize(b).size);
    return ai - bi || a.fullName.localeCompare(b.fullName, 'ar');
  });

  const summaryLines = summarizeSizes(rows)
    .filter((c) => c.count > 0)
    .map((c) => [esc('توزيع المقاسات'), esc(c.size), esc(String(c.count))].join(','));

  const csv = [
    ...summaryLines,
    '',
    ['الاسم', 'الجنس', 'المقاس'].map(esc).join(','),
    ...sorted.map((r) => [r.fullName, GENDER_LABEL[r.gender], computeSize(r).size].map(esc).join(',')),
  ].join('\r\n');

  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `qias-factory-order-${new Date().toISOString().slice(0, 10)}.csv`;
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
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);
  return { toasts, push };
}

/* ------------------------------ جلسة المشرف ----------------------------- */

const LOCAL_SESSION_KEY = 'qias.admin';

export interface AdminSession {
  authed: boolean;
  /** أثناء التحقق من الجلسة المحفوظة عند فتح الصفحة */
  checking: boolean;
  /** بريد المشرف الحالي في الوضع السحابي */
  email: string;
  /** الوضع السحابي: دخول ببريد وكلمة مرور. يرجع رسالة الخطأ أو null عند النجاح */
  signIn: (email: string, password: string) => Promise<string | null>;
  /** الوضع المحلي: دخول برمز */
  signInPin: (pin: string) => boolean;
  signOut: () => void;
}

export function useAdminSession(): AdminSession {
  const [authed, setAuthed] = useState(() =>
    isCloud ? false : sessionStorage.getItem(LOCAL_SESSION_KEY) === '1');
  const [checking, setChecking] = useState(isCloud);
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (!isCloud || !supabase) return;
    let alive = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setAuthed(Boolean(data.session));
      setEmail(data.session?.user.email ?? '');
      setChecking(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(Boolean(session));
      setEmail(session?.user.email ?? '');
      setChecking(false);
    });

    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  const signIn = useCallback(async (mail: string, password: string): Promise<string | null> => {
    if (!supabase) return 'الموقع غير مربوط بقاعدة البيانات';
    const { error } = await supabase.auth.signInWithPassword({ email: mail.trim(), password });
    if (!error) return null;
    if (/Invalid login credentials/i.test(error.message)) return 'البريد أو كلمة المرور غير صحيحة';
    if (/Email not confirmed/i.test(error.message)) return 'الحساب غير مفعّل — فعّله من لوحة Supabase';
    if (/Failed to fetch/i.test(error.message)) return 'تعذّر الاتصال — تحقق من الإنترنت';
    return error.message;
  }, []);

  const signInPin = useCallback((pin: string): boolean => {
    if (pin !== settingsStore.get().pin) return false;
    sessionStorage.setItem(LOCAL_SESSION_KEY, '1');
    setAuthed(true);
    return true;
  }, []);

  const signOut = useCallback(() => {
    if (isCloud && supabase) {
      void supabase.auth.signOut();
    } else {
      sessionStorage.removeItem(LOCAL_SESSION_KEY);
    }
    setAuthed(false);
    setEmail('');
  }, []);

  return { authed, checking, email, signIn, signInPin, signOut };
}
