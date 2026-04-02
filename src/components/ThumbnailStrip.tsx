import './ThumbnailStrip.css';

interface ThumbnailStripProps {
  thumbnails: string[];
  osThumbnail?: string | null;
  compact?: boolean;
}

export default function ThumbnailStrip({ thumbnails, osThumbnail, compact = false }: ThumbnailStripProps) {
  if (!thumbnails || thumbnails.length === 0) {
    if (osThumbnail) {
      return (
        <div className={`thumb-strip ${compact ? 'thumb-strip-compact' : ''}`}>
          <img
            className="thumb-img thumb-img-os"
            src={osThumbnail}
            draggable={false}
            alt="OS Preview"
            style={{ gridColumn: 'span 3', gridRow: 'span 2', objectFit: 'cover' }}
          />
        </div>
      );
    }
    return (
      <div className={`thumb-strip thumb-strip-placeholder ${compact ? 'thumb-strip-compact' : ''}`}>
        <div className="thumb-placeholder-pulse" />
      </div>
    );
  }

  // Calculate optimal layout for dynamic thumbnail counts
  let cols = 3, rows = 2;
  const len = thumbnails.length;
  if (len === 1) { cols = 1; rows = 1; }
  else if (len === 2) { cols = 2; rows = 1; }
  else if (len === 4) { cols = 2; rows = 2; }
  else if (len === 6) { cols = 3; rows = 2; }
  else if (len === 9) { cols = 3; rows = 3; }
  // Provide a safe fallback if somehow an unknown number drops in
  else {
    cols = Math.ceil(Math.sqrt(len));
    rows = Math.ceil(len / cols);
  }

  return (
    <div 
      className={`thumb-strip ${compact ? 'thumb-strip-compact' : ''}`}
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}
    >
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
