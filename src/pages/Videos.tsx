/* ============================================================================
   قسم الفيديوهات — يعرض ما يتم رفعه من لوحة التحكم.
   الصور المصغّرة تُقرأ من IndexedDB، والمشغّل يفتح في نافذة.
   ========================================================================== */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  formatDate, formatDuration, mediaUrl, useVideos, useVideoSource, type VideoItem,
} from '../lib';
import { Badge, Button, EmptyState, Icons, Modal, SectionHead, TextInput } from '../ui';

export default function Videos() {
  const videos = useVideos();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<VideoItem | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return videos;
    return videos.filter((v) => `${v.title} ${v.description}`.includes(q));
  }, [videos, query]);

  return (
    <div className="shell flex flex-col gap-8 py-10">
      <SectionHead
        eyebrow="مكتبة الفيديو"
        title="فيديوهات الشرح"
        desc="كل فيديو هنا تم تصويره ورفعه من لوحة التحكم — اضغط على أي بطاقة لتشغيلها."
      />

      {videos.length > 0 && (
        <div className="relative max-w-md">
          <TextInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث في الفيديوهات…"
            className="pr-11"
            aria-label="بحث في الفيديوهات"
          />
          <Icons.search className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
        </div>
      )}

      {videos.length === 0 ? (
        <EmptyState
          icon="video"
          title="لا توجد فيديوهات منشورة بعد"
          desc="ستظهر الفيديوهات هنا فور رفعها من لوحة التحكم."
          action={
            <Link to="/admin" className="mt-1">
              <Button variant="outline" size="sm" icon="upload">رفع فيديو من لوحة التحكم</Button>
            </Link>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon="search" title="لا نتائج مطابقة" desc={`لم نجد فيديو يطابق «${query}»`} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((v) => (
            <li key={v.id}>
              <VideoCard video={v} onOpen={() => setOpen(v)} />
            </li>
          ))}
        </ul>
      )}

      <PlayerModal video={open} onClose={() => setOpen(null)} />
    </div>
  );
}

/* -------------------------------- البطاقة ------------------------------- */

function VideoCard({ video, onOpen }: { video: VideoItem; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="card card-hover group w-full cursor-pointer overflow-hidden p-0 text-start"
      aria-label={`تشغيل: ${video.title}`}
    >
      <div className="relative aspect-video overflow-hidden bg-surface-2">
        <Poster posterKey={video.posterKey} />

        {/* زر التشغيل */}
        <span className="absolute inset-0 grid place-items-center bg-black/25 transition-colors duration-300 group-hover:bg-black/45">
          <span className="grid size-12 place-items-center rounded-full border border-gold/40 bg-black/60 text-gold backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
            <Icons.play className="size-5 translate-x-px" />
          </span>
        </span>

        {video.duration > 0 && (
          <span className="tabular absolute bottom-2 left-2 rounded-md bg-black/75 px-1.5 py-0.5 text-[11px] text-white">
            {formatDuration(video.duration)}
          </span>
        )}

        {video.kind === 'link' && (
          <span className="absolute top-2 right-2">
            <Badge tone="sky" icon="link">رابط</Badge>
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5 p-4">
        <h3 className="line-clamp-1 text-sm font-semibold">{video.title}</h3>
        {video.description && (
          <p className="line-clamp-2 text-[13px] leading-relaxed text-ink-dim">{video.description}</p>
        )}
        <span className="tabular mt-1 flex items-center gap-1.5 text-[11px] text-ink-faint">
          <Icons.clock className="size-3.5" />
          {formatDate(video.createdAt)}
        </span>
      </div>
    </button>
  );
}

function Poster({ posterKey }: { posterKey: string }) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let alive = true;
    if (!posterKey) return;
    void mediaUrl(posterKey).then((u) => { if (alive) setSrc(u); });
    return () => { alive = false; };
  }, [posterKey]);

  if (!src) {
    return (
      <div className="stripes grid h-full place-items-center text-ink-faint/60">
        <Icons.video className="size-8" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      className="size-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
    />
  );
}

/* -------------------------------- المشغّل ------------------------------- */

function PlayerModal({ video, onClose }: { video: VideoItem | null; onClose: () => void }) {
  const src = useVideoSource(video);

  return (
    <Modal open={Boolean(video)} onClose={onClose} title={video?.title ?? ''} wide>
      <div className="overflow-hidden rounded-xl border border-line bg-black">
        {src ? (
          <video
            key={src}
            src={src}
            controls
            autoPlay
            playsInline
            controlsList="nodownload"
            className="aspect-video w-full"
          />
        ) : (
          <div className="grid aspect-video place-items-center text-sm text-ink-faint">
            جارٍ تحضير الفيديو…
          </div>
        )}
      </div>

      {video?.description && (
        <p className="mt-4 text-pretty text-sm leading-relaxed text-ink-dim">{video.description}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-ink-faint">
        <Badge icon="clock">{video ? formatDate(video.createdAt) : ''}</Badge>
        {video && video.duration > 0 && <Badge icon="play">{formatDuration(video.duration)}</Badge>}
      </div>
    </Modal>
  );
}
