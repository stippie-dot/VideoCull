# Video-Cull 🎬

A high-performance desktop application for rapidly culling and managing massive video collections (4TB+). 

Video-Cull is designed for speed. Instead of opening each video file in an external heavy media player, it generates a strip of thumbnails for every video in a folder allowing you to quickly decide what to keep and what to delete using intuitive keyboard shortcuts. 

For deeper reviews, Video-Cull implements a Hybrid Playback system. It combines low-level Chromium range streaming with the elegant **Video.js** user interface, giving you a lightning-fast, premium native player to preview and scrub through massive video files flawlessly.

---

## ✨ Key Features

- **Multi-Thumbnail Previews:** Automatically generates 6 thumbnails per video, strategically spread across the duration, to give you a full visual overview at a glance.
- **Hybrid In-App Player (Video.js):** Uses a custom `video://` IPC protocol to allow local backend byte-range streaming via Node's `fs`, piped directly into the `@videojs/react` frontend. This enables hardware-accelerated scrubbing of massive videos without locking up your RAM.
- **Grid Mode (Overview):** Group massive batches of clips by folders. Use `Ctrl+Click` for an instant external playback, or click the overlay play button for a rapid **Inline Preview Modal** across supported formats.
- **Review Mode:** A focused, fullscreen "Tinder-style" interface with dynamic CSS Theater Mode for rapid decision-making. Play, scrub, and judge sequentially.
- **Keyboard-First Workflow:** Never touch your mouse. Use `K` (Keep), `D` (Delete), `S` / `Space` (Play/Skip), and `Z` (Undo).
- **External Format Fallbacks:** Web formats (like `.mp4`, `.webm`) play natively in-app. Heavy or proprietary codecs (like `.avi`) intelligently fallback and automatically pop open in your OS's default external player (e.g. VLC).
- **Smart Caching:** Stores generated thumbnails and statuses locally in a `.video-cull-cache.json` file inside the media directory, meaning your progress moves with your external drives!
- **Trash Integration & Batch Deletion:** You have the final say. Uses the system Recycle Bin for safety—nothing is permanently deleted until you mass complete the culling process.

---

## ⌨️ Keyboard Shortcuts & Global App Menu

| Key | Action |
|-----|--------|
| `K` | Mark as **Keep** |
| `D` | Mark as **Delete** |
| `Space` | **Play/Pause** video player |
| `←` / `→` | **Scrub (15s)** backward or forward |
| `Z` | **Undo** last action |
| `Esc`| Exit Review Mode / Exit Inline Preview |
| `Enter` | Open video for deep review |
| `Ctrl + Enter` (Review Mode)| Force open in External OS Player |
| `Ctrl + Click` (Grid Mode)| Force open in External OS Player |
| `Ctrl + Backspace`| Batch Delete all marked items to Recycle Bin |
| `Ctrl + Shift + R`| Clear local JSON thumbnail cache |
| `Ctrl + E`| Reveal file in system File Explorer |

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)
- [FFmpeg](https://ffmpeg.org/) installed and added to your system PATH.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/stippie-dot/videocurl.git
   cd videocurl
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the application in development mode:
   ```bash
   npm run dev
   ```

---

## 🛠️ Built With

- **Electron**: System bridging and internal custom playback protocols (`protocol.handle`).
- **React**: Component layout & routing.
- **Video.js (v10)**: The `@videojs/react` library forms the core of our aesthetic and responsive native speler layers (`DefaultVideoSkin` & `MinimalVideoSkin`).
- **Zustand**: Fast and functional global state management (for views, caches, and global event routing).
- **TypeScript**: Robust application-scale type safety.
- **FFmpeg**: Backend process spawning for high-speed thumbnail generation.
- **Lucide**: Clean standardized iconography.

## 📄 License

This project is licensed under the GNU General Public License v3.0.
