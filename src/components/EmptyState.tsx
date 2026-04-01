import useStore from '../store';
import { FolderOpen, Film } from 'lucide-react';
import './EmptyState.css';

export default function EmptyState() {
  const setDirectory = useStore((s) => s.setDirectory);

  const handleSelect = async () => {
    if (!window.electronAPI) return;
    const dir = await window.electronAPI.selectDirectory();
    if (dir) setDirectory(dir);
  };

  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Film size={56} strokeWidth={1.2} />
      </div>
      <h2 className="empty-title">Video Cull</h2>
      <p className="empty-desc">
        Select a folder to start reviewing your video collection.<br />
        Quickly sort, keep, or delete videos using thumbnails.
      </p>
      <button className="btn btn-primary empty-btn" onClick={handleSelect}>
        <FolderOpen size={18} />
        Select Folder
      </button>
      <div className="empty-shortcuts">
        <span><kbd>K</kbd> Keep</span>
        <span><kbd>D</kbd> Delete</span>
        <span><kbd>S</kbd> Skip</span>
        <span><kbd>Z</kbd> Undo</span>
      </div>
    </div>
  );
}
