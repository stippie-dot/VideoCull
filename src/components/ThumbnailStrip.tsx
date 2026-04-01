import './ThumbnailStrip.css';

interface ThumbnailStripProps {
  thumbnails: string[];
  compact?: boolean;
}

export default function ThumbnailStrip({ thumbnails, compact = false }: ThumbnailStripProps) {
  if (!thumbnails || thumbnails.length === 0) {
    return (
      <div className={`thumb-strip thumb-strip-placeholder ${compact ? 'thumb-strip-compact' : ''}`}>
        <div className="thumb-placeholder-pulse" />
      </div>
    );
  }

  return (
    <div className={`thumb-strip ${compact ? 'thumb-strip-compact' : ''}`}>
      {thumbnails.map((thumb, i) => (
        <img
          key={i}
          className="thumb-img"
          src={`thumb:///${encodeURIComponent(thumb)}`}
          loading="lazy"
          alt={`Frame ${i + 1}`}
          draggable={false}
        />
      ))}
    </div>
  );
}
