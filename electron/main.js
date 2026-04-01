const { app, BrowserWindow, ipcMain, dialog, shell, protocol, net } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const fs = require('fs/promises');
const { scanDirectory } = require('./scanner');
const { processVideos, cancelProcessing } = require('./processor');

const isDev = !app.isPackaged;
let mainWindow;
let currentScanDir = null;

// ── Window ──────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0a0a0f',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

// ── Custom Protocol for serving thumbnail images ────────────────────────
protocol.registerSchemesAsPrivileged([
  { scheme: 'thumb', privileges: { bypassCSP: true, stream: true, supportFetchAPI: true, isSecure: true, corsEnabled: true } },
]);

app.whenReady().then(() => {
  protocol.handle('thumb', async (request) => {
    // thumb:///D:/path/to/.video-cull-thumbs/id/thumb.jpg
    let filePath = decodeURIComponent(request.url.slice('thumb:///'.length));
    
    // Security: Only allow files ending in .jpg and located within a .video-cull-thumbs directory
    if (!filePath.toLowerCase().endsWith('.jpg') || !filePath.includes('.video-cull-thumbs')) {
      return new Response('Access Denied', { status: 403 });
    }

    // On Windows, ensure the path starts with drive letter
    if (process.platform === 'win32' && !filePath.match(/^[a-zA-Z]:/)) {
      filePath = filePath.replace(/^\//, '');
    }
    
    try {
      return net.fetch(pathToFileURL(filePath).toString());
    } catch (e) {
      return new Response('Not Found', { status: 404 });
    }
  });

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── Cache helpers ───────────────────────────────────────────────────────
const CACHE_FILE = '.video-cull-cache.json';
const THUMB_DIR = '.video-cull-thumbs';

async function loadCache(dirPath) {
  try {
    const raw = await fs.readFile(path.join(dirPath, CACHE_FILE), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function saveCache(dirPath, videos) {
  const cacheData = {
    lastScanned: new Date().toISOString(),
    videos: videos.map((v) => ({
      id: v.id,
      filename: v.filename,
      path: v.path,
      sizeBytes: v.sizeBytes,
      durationSecs: v.durationSecs,
      modifiedAt: v.modifiedAt,
      status: v.status,
      thumbnails: v.thumbnails,
      duplicateHash: v.duplicateHash || null,
    })),
  };
  await fs.writeFile(path.join(dirPath, CACHE_FILE), JSON.stringify(cacheData, null, 2));
}

// ── IPC Handlers ────────────────────────────────────────────────────────

// 1. Select directory via OS dialog
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

// 2. Scan directory for video files
ipcMain.handle('scan-directory', async (_event, dirPath, includeSubfolders) => {
  // Security: Validate dirPath
  try {
    const stats = await fs.stat(dirPath);
    if (!stats.isDirectory()) throw new Error('Not a directory');
  } catch (err) {
    throw new Error('Invalid directory path');
  }

  currentScanDir = dirPath;
  const cache = await loadCache(dirPath);
  const cachedMap = {};
  if (cache && cache.videos) {
    cache.videos.forEach((v) => {
      cachedMap[v.id] = v;
    });
  }

  const thumbDir = path.join(dirPath, THUMB_DIR);
  await fs.mkdir(thumbDir, { recursive: true });

  const videos = await scanDirectory(dirPath, includeSubfolders, (progress) => {
    mainWindow.webContents.send('scan-progress', progress);
  });

  // Merge with cache: preserve status & existing thumbnails
  const merged = videos.map((v) => {
    const cached = cachedMap[v.id];
    if (cached) {
      return {
        ...v,
        status: cached.status || 'pending',
        thumbnails: cached.thumbnails || [],
        duplicateHash: cached.duplicateHash || v.duplicateHash,
      };
    }
    return { ...v, status: 'pending', thumbnails: [] };
  });

  return merged;
});

// 3. Generate thumbnails for videos that don't have them
ipcMain.handle('generate-thumbnails', async (_event, videos, dirPath) => {
  const thumbDir = path.join(dirPath, THUMB_DIR);
  await fs.mkdir(thumbDir, { recursive: true });

  const needThumbs = videos.filter((v) => !v.thumbnails || v.thumbnails.length === 0);

  await processVideos(needThumbs, thumbDir, (progress) => {
    mainWindow.webContents.send('thumb-progress', progress);
  }, (videoId, thumbnails, durationSecs) => {
    mainWindow.webContents.send('thumb-ready', { videoId, thumbnails, durationSecs });
  });

  return true;
});

// 4. Cancel running thumbnail generation
ipcMain.handle('cancel-generation', async () => {
  cancelProcessing();
  return true;
});

// 5. Save cache
ipcMain.handle('save-cache', async (_event, dirPath, videos) => {
  await saveCache(dirPath, videos);
  return true;
});

// 6. Batch delete → OS Trash
ipcMain.handle('batch-delete', async (_event, filePaths) => {
  const results = [];
  for (const filePath of filePaths) {
    try {
      await shell.trashItem(filePath);
      results.push({ path: filePath, success: true });
    } catch (err) {
      results.push({ path: filePath, success: false, error: err.message });
    }
  }
  return results;
});

// 7. Open video in default system player
ipcMain.handle('open-video', async (_event, filePath) => {
  await shell.openPath(filePath);
});

// 8. Open a directory in explorer
ipcMain.handle('open-in-explorer', async (_event, filePath) => {
  shell.showItemInFolder(filePath);
});
