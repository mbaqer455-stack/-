/* ============================================================================
   القسم ٢ — الفيديوهات

   التخطيط (كما في المخطط):
     ┌──────────────────────────────────────────┐
     │        ┌──────────────────────┐          │
     │        │      المشغّل          │          │
     │        └──────────────────────┘          │
     │            [ السابق ]  [ التالي ]         │
     └──────────────────────────────────────────┘

   يعرض ما يُرفع من لوحة التحكم. الفيديو المعروض واحد، والزرّان يتنقّلان
   بين المقاطع — أخفّ من شبكة مصغّرات تُحمَّل كلها دفعة واحدة.
   ========================================================================== */

import { useEffect, useState } from 'react';
import { formatDate, formatDuration, mediaUrl, useVideoSource, useVideos, type VideoItem } from '../lib';
import { Button, EmptyState, Icons } from '../ui';

export default function VideosSection() {
  const videos = useVideos();
  const [index, setIndex] = useState(0);

  // إذا حُذف فيديو من لوحة التحكم قد يصير المؤشّر خارج القائمة
  useEffect(() => {
    if (index > videos.length - 1) setIndex(Math.max(0, videos.length - 1));
  }, [videos.length, index]);

  const current: VideoItem | null = videos[index] ?? null;

  return (
    <section className="shell pb-16 sm:pb-20" aria-labelledby="videos-title">
      <div className="mb-8 flex flex-col gap-2">
        <span className="inline-flex w-fit items-center gap-2 rounded-pill border border-line
                         bg-surface-2 px-3 py-1 text-xs font-semibold text-ink-dim">
          <Icons.video className="size-3.5" />
          القسم الثاني
        </span>
        <h2 id="videos-title" className="text-2xl sm:text-3xl">الفيديوهات</h2>
      </div>

      <div className="card flex flex-col items-center gap-5 p-5 sm:p-7">
        {current ? (
          <>
            <Player key={current.id} video={current} />

            <div className="flex w-full flex-col items-center gap-1 text-center">
              <h3 className="text-lg">{current.title}</h3>
              {current.description && (
                <p className="max-w-prose text-pretty text-sm text-ink-dim">{current.description}</p>
              )}
              <p className="flex items-center gap-2 text-xs text-ink-faint">
                <span className="tabular">{formatDate(current.createdAt)}</span>
                {current.duration > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="tabular">{formatDuration(current.duration)}</span>
                  </>
                )}
              </p>
            </div>

            {/* الزرّان تحت المشغّل — كما في المخطط */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setIndex((i) => i - 1)}
                disabled={index === 0}
              >
                <Icons.chevron className="size-4 rotate-180" />
                السابق
              </Button>

              <span className="tabular px-2 text-sm text-ink-faint">
                {index + 1} / {videos.length}
              </span>

              <Button
                variant="outline"
                onClick={() => setIndex((i) => i + 1)}
                disabled={index >= videos.length - 1}
              >
                التالي
                <Icons.chevron className="size-4" />
              </Button>
            </div>
          </>
        ) : (
          <EmptyState
            icon="video"
            title="لا توجد فيديوهات بعد"
            desc="تُضاف الفيديوهات من لوحة التحكم، وتظهر هنا مباشرة."
          />
        )}
      </div>
    </section>
  );
}

/* -------------------------------- المشغّل ------------------------------- */

function Player({ video }: { video: VideoItem }) {
  const src = useVideoSource(video);
  const [poster, setPoster] = useState('');

  useEffect(() => {
    let alive = true;
    if (!video.posterKey) { setPoster(''); return; }
    void mediaUrl(video.posterKey).then((u) => { if (alive) setPoster(u); });
    return () => { alive = false; };
  }, [video.posterKey]);

  // الروابط الخارجية (يوتيوب وأمثالها) لا تعمل في <video> — تُفتح بإطار
  if (video.kind === 'link') {
    const embed = toEmbed(video.url);
    return embed ? (
      <iframe
        src={embed}
        title={video.title}
        className="aspect-video w-full max-w-3xl rounded-2xl border border-line bg-surface-2"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    ) : (
      <a
        href={video.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex aspect-video w-full max-w-3xl items-center justify-center gap-2.5
                   rounded-2xl border border-line bg-surface-2 text-sm font-semibold text-ink-dim
                   transition-colors hover:text-ink"
      >
        <Icons.link className="size-5" />
        افتح الفيديو في تبويب جديد
      </a>
    );
  }

  return (
    <video
      src={src}
      poster={poster || undefined}
      controls
      preload="metadata"
      playsInline
      className="aspect-video w-full max-w-3xl rounded-2xl border border-line bg-black object-contain"
    />
  );
}

/** يحوّل روابط يوتيوب/فيميو لصيغة التضمين؛ يرجع '' لما عداها */
function toEmbed(url: string): string {
  try {
    const u = new URL(url);
    if (/(^|\.)youtube\.com$/.test(u.hostname)) {
      const id = u.searchParams.get('v') ?? u.pathname.split('/').pop();
      return id ? `https://www.youtube.com/embed/${id}` : '';
    }
    if (u.hostname === 'youtu.be') {
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    }
    if (/(^|\.)vimeo\.com$/.test(u.hostname)) {
      return `https://player.vimeo.com/video/${u.pathname.split('/').pop()}`;
    }
  } catch { /* رابط غير صالح */ }
  return '';
}
