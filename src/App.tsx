/* ============================================================================
   قياس — الهيكل العام: المسارات وحالة إغلاق الموقع.

   لا ترويسة ولا تذييل — الصفحة محتوى خالص.
   لوحة التحكم على /admin بلا أي رابط يدلّ عليها، ومحميّة برمز.

   نبني الموقع قسمًا قسمًا. كل قسم جديد:
     ١. أضف ملفه في src/sections
     ٢. أضف سطره في src/pages/Home.tsx
   ========================================================================== */

import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { useSettings, useSettingsReady } from './lib';
import { Icons, Spinner } from './ui';
import Home from './pages/Home';

// لوحة التحكم في حزمة منفصلة — الزوار لا يحمّلونها أبدًا
const Admin = lazy(() => import('./pages/Admin'));

export default function App() {
  const settings = useSettings();
  const settingsReady = useSettingsReady();
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith('/admin');
  const locked = settingsReady && !settings.siteOpen && !isAdmin;

  // العودة لأعلى الصفحة عند تغيير المسار
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }); }, [pathname]);

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex-1">
        {!settingsReady ? (
          <PageLoader />
        ) : locked ? (
          <ClosedScreen title={settings.closedTitle} message={settings.closedMessage} />
        ) : (
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="*" element={<Home />} />
            </Routes>
          </Suspense>
        )}
      </main>
    </div>
  );
}

/* --------------------------- شاشة إغلاق الموقع -------------------------- */

function ClosedScreen({ title, message }: { title: string; message: string }) {
  return (
    <div className="relative flex min-h-[72dvh] items-center justify-center overflow-hidden px-5">
      <div className="glow-brand pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
      <div className="card relative z-10 flex max-w-md flex-col items-center gap-4 p-8 text-center">
        <span className="grid size-14 place-items-center rounded-2xl border border-rose/25 bg-rose/10 text-rose">
          <Icons.power className="size-7" />
        </span>
        <h1 className="text-2xl">{title}</h1>
        <p className="text-pretty text-ink-dim">{message}</p>
      </div>
    </div>
  );
}

/* ------------------------------ شاشة التحميل ---------------------------- */

function PageLoader() {
  return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <div className="flex items-center gap-3 text-ink-faint">
        <Spinner className="size-5" />
        <span className="text-sm">جارٍ التحميل…</span>
      </div>
    </div>
  );
}
