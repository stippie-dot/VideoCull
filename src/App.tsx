import { useEffect, useCallback } from 'react';
import useStore from './store';
import Sidebar from './components/Sidebar';
import GridMode from './components/GridMode';
import ReviewMode from './components/ReviewMode';
import EmptyState from './components/EmptyState';
import './App.css';

export default function App() {
  const directory = useStore((s) => s.directory);
  const videos = useStore((s) => s.videos);
  const reviewMode = useStore((s) => s.reviewMode);
  const isScanning = useStore((s) => s.isScanning);
  const setVideos = useStore((s) => s.setVideos);
  const setIsScanning = useStore((s) => s.setIsScanning);
  const setScanProgress = useStore((s) => s.setScanProgress);
  const setIsGenerating = useStore((s) => s.setIsGenerating);
  const setGenProgress = useStore((s) => s.setGenProgress);
  const updateVideoThumbnails = useStore((s) => s.updateVideoThumbnails);
  const includeSubfolders = useStore((s) => s.includeSubfolders);

  // Subscribe to IPC events
  useEffect(() => {
    if (!window.electronAPI) return;

    const unsub1 = window.electronAPI.onScanProgress((progress) => {
      setScanProgress(progress);
    });

    const unsub2 = window.electronAPI.onThumbProgress((progress) => {
      setGenProgress(progress);
    });

    const unsub3 = window.electronAPI.onThumbReady(({ videoId, thumbnails, durationSecs }) => {
      updateVideoThumbnails(videoId, thumbnails, durationSecs);
    });

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [setScanProgress, setGenProgress, updateVideoThumbnails]);

  // Scan directory when selected
  const handleScan = useCallback(async (dirPath: string) => {
    if (!window.electronAPI) return;

    setIsScanning(true);
    setScanProgress({ found: 0, currentFile: '' });

    try {
      const scannedVideos = await window.electronAPI.scanDirectory(dirPath, includeSubfolders);
      setVideos(scannedVideos);
      setIsScanning(false);

      const needThumbs = scannedVideos.filter((v) => !v.thumbnails || v.thumbnails.length === 0);
      if (needThumbs.length > 0) {
        setIsGenerating(true);
        setGenProgress({ current: 0, total: needThumbs.length });
        await window.electronAPI.generateThumbnails(scannedVideos, dirPath);
        setIsGenerating(false);
      }
    } catch (err) {
      console.error('Scan failed:', err);
      setIsScanning(false);
      setIsGenerating(false);
    }
  }, [includeSubfolders, setVideos, setIsScanning, setScanProgress, setIsGenerating, setGenProgress]);

  useEffect(() => {
    if (directory) {
      handleScan(directory);
    }
  }, [directory, handleScan]);

  return (
    <div className="app-layout">
      <Sidebar onRescan={() => directory && handleScan(directory)} />

      <main className="app-main">
        {!directory && !isScanning && videos.length === 0 && <EmptyState />}
        {directory && videos.length > 0 && !reviewMode && <GridMode />}
        {reviewMode && <ReviewMode />}

        {isScanning && videos.length === 0 && (
          <div className="scanning-overlay">
            <div className="scanning-spinner" />
            <p>Scanning for videos…</p>
          </div>
        )}
      </main>
    </div>
  );
}
