/* ============================================================================
   الاتصال بـ Supabase

   إذا كان الملف .env يحتوي على المفتاحين ← الموقع يعمل بالوضع "السحابي"
   والبيانات مشتركة بين الجميع.
   إذا كان فارغًا ← يعمل بالوضع "المحلي" داخل المتصفح (مفيد للتجربة السريعة).
   ========================================================================== */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** هل الموقع مربوط بقاعدة بيانات مشتركة؟ */
export const isCloud: boolean = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isCloud
  ? createClient(url as string, anonKey as string, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;

/** اسم مخزن الملفات (الفيديوهات والصور المصغّرة) */
export const MEDIA_BUCKET = 'media';

/** يرمي خطأً واضحًا بالعربية بدل رسالة Supabase الإنجليزية */
export function must(client: SupabaseClient | null): SupabaseClient {
  if (!client) throw new Error('الموقع غير مربوط بقاعدة البيانات — راجع ملف .env');
  return client;
}
