/* ============================================================================
   قياس — الهيكل العام: الترويسة، التذييل، المسارات، وحالة إغلاق الموقع.
   تخطيط عمودي واحد (single column) في كل الصفحات.
   ========================================================================== */

import { lazy, Suspense, useEffect, useState } from 'react';
import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { useSettings } from './lib';
import { Button, Icons, Spinner, type IconName } from './ui';
import Home from './pages/Home';

/* الصفحات الثقيلة تُحمّل عند الطلب فقط — أسرع إقلاع أول */
const Measure = lazy(() => import('./pages/Measure'));
const Videos = lazy(() => import('./pages/Videos'));
const Admin = lazy(() => import('./pages/Admin'));

const NAV: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'الرئيسية', icon: 'sparkle' },
  { to: '/measure', label: 'إدخال القياس', icon: 'ruler' },
  { to: '/videos', label: 'الفيديوهات', icon: 'video' },
];

export default function App() {
  const settings = useSettings();
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith('/admin');
  const locked = !settings.siteOpen && !isAdmin;

  // العودة لأعلى الصفحة عند تغيير المسار
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }); }, [pathname]);

  return (
    <div className="flex min-h-dvh flex-col">
      <Header isAdmin={isAdmin} siteOpen={settings.siteOpen} />

      <main className="flex-1">
        {locked ? (
          <ClosedScreen title={settings.closedTitle} message={settings.closedMessage} />
        ) : (
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/measure" element={<Measure />} />
              <Route path="/videos" element={<Videos />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="*" element={<Home />} />
            </Routes>
          </Suspense>
        )}
      </main>

      <Footer />
    </div>
  );
}

/* ------------------------------- الترويسة ------------------------------- */

function Header({ isAdmin, siteOpen }: { isAdmin: boolean; siteOpen: boolean }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 h-(--header-h) border-b transition-colors duration-300
        ${scrolled ? 'border-line bg-bg/85 backdrop-blur-xl' : 'border-transparent bg-transparent'}`}
    >
      <div className="shell flex h-full items-center gap-3">
        <NavLink to="/" className="group flex shrink-0 items-center gap-2.5" aria-label="قياس — الصفحة الرئيسية">
          <span className="grid size-9 place-items-center rounded-xl border border-gold/30 bg-gold/10 text-gold transition-colors group-hover:bg-gold/20">
            <Icons.ruler className="size-5" />
          </span>
          <span className="font-display text-lg font-extrabold tracking-tight">قياس</span>
        </NavLink>

        <nav className="mx-auto flex items-center gap-0.5 sm:gap-1" aria-label="التنقل الرئيسي">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex h-10 items-center gap-1.5 rounded-lg px-2.5 text-[13px] transition-colors duration-200 sm:px-3.5 sm:text-sm
                 ${isActive && !isAdmin ? 'bg-surface-2 font-semibold text-gold' : 'text-ink-dim hover:bg-surface-2/60 hover:text-ink'}`
              }
            >
              {({ isActive }) => {
                const Icon = Icons[item.icon];
                return (
                  <>
                    <Icon className="size-4 shrink-0" />
                    <span className={isActive ? '' : 'hidden sm:inline'}>{item.label}</span>
                  </>
                );
              }}
            </NavLink>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          {!siteOpen && (
            <span className="hidden items-center gap-1.5 rounded-pill border border-rose/30 bg-rose/10 px-2.5 py-1 text-xs text-rose sm:inline-flex">
              <Icons.power className="size-3.5" />
              مغلق
            </span>
          )}
          <NavLink to="/admin">
            <Button size="sm" variant={isAdmin ? 'primary' : 'outline'} icon="lock">
              <span className="hidden sm:inline">لوحة التحكم</span>
            </Button>
          </NavLink>
        </div>
      </div>
    </header>
  );
}

/* -------------------------------- التذييل ------------------------------- */

function Footer() {
  return (
    <footer className="mt-24 border-t border-line/70">
      <div className="shell flex flex-col items-center gap-4 py-8 text-center sm:flex-row sm:justify-between sm:text-start">
        <div className="flex items-center gap-2.5 text-sm text-ink-faint">
          <Icons.ruler className="size-4 text-gold/70" />
          <span>قياس — منصة القياسات والفيديوهات</span>
        </div>
        <p className="text-xs text-ink-faint">
          قالب واجهة جاهز للربط بالخادم · {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}

/* --------------------------- شاشة إغلاق الموقع -------------------------- */

function ClosedScreen({ title, message }: { title: string; message: string }) {
  return (
    <div className="relative flex min-h-[72dvh] items-center justify-center overflow-hidden px-5">
      <div className="glow-gold pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
      <div className="card relative z-10 flex max-w-md flex-col items-center gap-4 p-8 text-center">
        <span className="grid size-14 place-items-center rounded-2xl border border-rose/25 bg-rose/10 text-rose">
          <Icons.power className="size-7" />
        </span>
        <h1 className="text-2xl">{title}</h1>
        <p className="text-pretty text-ink-dim">{message}</p>
        <div className="divider-x my-1 w-full" />
        <p className="text-xs text-ink-faint">
          إذا كنت مسؤول الموقع، يمكنك إعادة الفتح من لوحة التحكم.
        </p>
        <NavLink to="/admin">
          <Button variant="outline" icon="lock" size="sm">الدخول للوحة التحكم</Button>
        </NavLink>
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
