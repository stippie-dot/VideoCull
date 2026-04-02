import { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import useStore from '../store';
import ThumbnailStrip from './ThumbnailStrip';
import { formatSize, formatDuration, formatDate } from '../utils';
import {
  Check, Trash2, SkipForward, Undo2, X, Play,
  ChevronLeft, ChevronRight, HardDrive, Clock, Calendar
} from 'lucide-react';
import '@videojs/react/video/minimal-skin.css';
import { createPlayer, videoFeatures } from '@videojs/react';
import { MinimalVideoSkin, Video } from '@videojs/react/video';
import { isWebSupported } from '../utils';
import './ReviewMode.css';

const Player = createPlayer({ features: videoFeatures });

export default function ReviewMode() {
  const filteredVideos = useStore((s) => s.filteredVideos);
  const reviewIndex = useStore((s) => s.reviewIndex);
  const setReviewIndex = useStore((s) => s.setReviewIndex);
  const setReviewMode = useStore((s) => s.setReviewMode);
  const setVideoStatus = useStore((s) => s.setVideoStatus);
  const undo = useStore((s) => s.undo);
  const undoStack = useStore((s) => s.undoStack);
  const settings = useStore((s) => s.settings);

  const video = filteredVideos[reviewIndex] ?? null;
  const total = filteredVideos.length;

  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isSupported = useMemo(() => {
    if (!video) return false;
    return isWebSupported(video.path);
  }, [video]);

  // Reset playing state when video changes
  useEffect(() => {
    setIsPlaying(false);
  }, [video?.id]);

  const advance = useCallback(() => {
    if (reviewIndex < total - 1) {
      setReviewIndex(reviewIndex + 1);
    }
  }, [reviewIndex, total, setReviewIndex]);

  const goBack = useCallback(() => {
    if (reviewIndex > 0) {
      setReviewIndex(reviewIndex - 1);
    }
  }, [reviewIndex, setReviewIndex]);

  const markKeep = useCallback(() => {
    if (!video) return;
    setVideoStatus(video.id, 'keep');
    advance();
  }, [video, advance, setVideoStatus]);

  const markDelete = useCallback(() => {
    if (!video) return;
    setVideoStatus(video.id, 'delete');
    advance();
  }, [video, advance, setVideoStatus]);

  const skip = useCallback(() => {
    advance();
  }, [advance]);

  const handleUndo = useCallback(() => {
    undo();
  }, [undo]);

  const handlePlay = useCallback(() => {
    if (!video) return;
    if (isSupported) {
      setIsPlaying((prev) => !prev);
    } else if (window.electronAPI) {
      window.electronAPI.openVideo(video.path);
    }
  }, [video, isSupported]);

  const close = useCallback(() => {
    setReviewMode(false);
  }, [setReviewMode]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;

      const key = e.key.toLowerCase();
      const settings = useStore.getState().settings;

      // Handle standard mappings
      if (key === 'escape') {
        e.preventDefault();
        if (isPlaying) {
          setIsPlaying(false);
        } else {
          close();
        }
        return;
      }

      if (key === 'arrowleft') {
        e.preventDefault();
        if (isPlaying && videoRef.current) {
          videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
        } else {
          goBack();
        }
        return;
      }

      if (key === 'arrowright') {
        e.preventDefault();
        if (isPlaying && videoRef.current) {
          videoRef.current.currentTime += 5;
        } else {
          advance();
        }
        return;
      }

      if (key === 'enter') {
        e.preventDefault();
        if (e.ctrlKey && window.electronAPI) {
          window.electronAPI.openVideo(video.path);
        } else {
          handlePlay();
        }
        return;
      }

      // Handle Dynamic Config Mappings
      if (key === settings.keyKeep) {
        e.preventDefault();
        markKeep();
      } else if (key === settings.keyDelete || (settings.keyDelete === 'delete' && key === 'backspace')) {
        e.preventDefault();
        markDelete();
      } else if (key === settings.keySkip) {
        e.preventDefault();
        skip();
      } else if (key === settings.keyUndo) {
        e.preventDefault();
        handleUndo();
      } else if (key === settings.keyPlay || (settings.keyPlay === ' ' && key === 'space')) {
        e.preventDefault();
        handlePlay();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [markKeep, markDelete, skip, handleUndo, close, goBack, advance, handlePlay, isPlaying]);

  if (!video) {
    return (
      <div className="review-mode">
        <div className="review-finished">
          <h2>All done! 🎉</h2>
          <p>You've reviewed all videos in this filter.</p>
          <button className="btn btn-accent" onClick={close} style={{ marginTop: 16 }}>
            Back to Grid
          </button>
        </div>
      </div>
    );
  }

  const statusClass =
    video.status === 'keep' ? 'review-keep' :
    video.status === 'delete' ? 'review-delete' : '';

  return (
    <div className={`review-mode ${statusClass}`}>
      <button className="review-close" onClick={close} title="Close (Esc)">
        <X size={20} />
      </button>

      <div className="review-counter">
        {reviewIndex + 1} / {total}
      </div>

      <div className="review-content">
        <button
          className="review-nav review-nav-left"
          onClick={(e) => {
            e.currentTarget.blur();
            goBack();
          }}
          disabled={reviewIndex === 0}
        >
          <ChevronLeft size={28} />
        </button>

        <div className="review-center">
          <div className={`review-thumbs ${isPlaying ? 'playing' : ''}`}>
            {isPlaying ? (
              <Player.Provider>
                <MinimalVideoSkin>
                  <Video
                    ref={videoRef}
                    className="video-player"
                    src={`video:///${video.path.split('\\').join('/')}`}
                    autoPlay
                    playsInline
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                    }}
                  />
                </MinimalVideoSkin>
              </Player.Provider>
            ) : (
              <ThumbnailStrip thumbnails={video.thumbnails} osThumbnail={video.osThumbnail} />
            )}
          </div>

          <div className="review-filename">{video.filename}</div>

          <div className="review-meta-row">
            <span className="review-meta-item">
              <HardDrive size={13} />
              {formatSize(video.sizeBytes)}
            </span>
            <span className="review-meta-item">
              <Clock size={13} />
              {formatDuration(video.durationSecs)}
            </span>
            <span className="review-meta-item">
              <Calendar size={13} />
              {formatDate(video.metadataDate || video.date)}
            </span>
          </div>
        </div>

        <button
          className="review-nav review-nav-right"
          onClick={(e) => {
            e.currentTarget.blur();
            advance();
          }}
          disabled={reviewIndex >= total - 1}
        >
          <ChevronRight size={28} />
        </button>
      </div>

      <div className="review-actions">
        <button
          className="review-action-btn review-undo"
          onClick={handleUndo}
          disabled={undoStack.length === 0}
          title={`Undo (${settings.keyUndo.toUpperCase()})`}
        >
          <Undo2 size={18} />
          <span>Undo</span>
          <kbd>{settings.keyUndo.toUpperCase()}</kbd>
        </button>

        <button className="review-action-btn review-btn-delete" onClick={markDelete} title={`Delete (${settings.keyDelete.toUpperCase()})`}>
          <Trash2 size={20} />
          <span>Delete</span>
          <kbd>{settings.keyDelete.toUpperCase()}</kbd>
        </button>

        <button className="review-action-btn review-btn-play" onClick={handlePlay} title={`Play (${settings.keyPlay === ' ' ? 'Space' : settings.keyPlay.toUpperCase()})`}>
          <Play size={20} />
          <span>Play</span>
          <kbd>{settings.keyPlay === ' ' ? '␣' : settings.keyPlay.toUpperCase()}</kbd>
        </button>

        <button className="review-action-btn review-btn-skip" onClick={skip} title={`Skip (${settings.keySkip.toUpperCase()})`}>
          <SkipForward size={20} />
          <span>Skip</span>
          <kbd>{settings.keySkip.toUpperCase()}</kbd>
        </button>

        <button className="review-action-btn review-btn-keep" onClick={markKeep} title={`Keep (${settings.keyKeep.toUpperCase()})`}>
          <Check size={20} />
          <span>Keep</span>
          <kbd>{settings.keyKeep.toUpperCase()}</kbd>
        </button>
      </div>
    </div>
  );
}
