/* ============================================================================
   الصفحة الرئيسية — الأقسام بالترتيب.
     ١ القياس      — قالب التيشيرت + السلايدرات + بيانات الطالب والحفظ
     ٢ الفيديوهات  — ما يُرفع من لوحة التحكم
   لوحة التحكم منفصلة على /admin ولا يوجد رابط يدلّ عليها.
   ========================================================================== */

import MeasureSection from '../sections/MeasureSection';
import VideosSection from '../sections/VideosSection';

export default function Home() {
  return (
    <>
      <MeasureSection />
      <VideosSection />
    </>
  );
}
