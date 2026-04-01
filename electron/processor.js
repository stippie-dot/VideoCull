const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs/promises');

const THUMB_COUNT = 6;
const THUMB_WIDTH = 320;
const MAX_CONCURRENT = 3;

let cancelled = false;

/**
 * Get video duration via ffprobe.
 */
function getVideoDuration(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata?.format?.duration || 0);
    });
  });
}

/**
 * Calculate N evenly-spaced timestamps, skipping black intros.
 */
function calculateTimestamps(duration, count = THUMB_COUNT) {
  if (duration <= 0) return [0];
  if (duration < 10) {
    // Very short video: just take the midpoint
    return [duration / 2];
  }

  const timestamps = [];
  // Start at 5% or 5 seconds (whichever is larger) to skip intros
  const start = Math.max(5, duration * 0.05);
  // End at 95%
  const end = duration * 0.95;
  const step = count > 1 ? (end - start) / (count - 1) : 0;

  for (let i = 0; i < count; i++) {
    timestamps.push(Math.round((start + step * i) * 100) / 100);
  }
  return timestamps;
}

/**
 * Extract a single frame from a video at a given timestamp.
 * Uses fast seeking (-ss before -i) via fluent-ffmpeg's seekInput().
 */
function extractFrame(videoPath, timestamp, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .seekInput(timestamp)
      .frames(1)
      .outputOptions(['-q:v', '5'])
      .videoFilters(`scale=${THUMB_WIDTH}:-1`)
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .run();
  });
}

/**
 * Generate all thumbnails for a single video.
 * Returns { thumbnails: string[], durationSecs: number }.
 */
async function generateThumbnailsForVideo(video, thumbDir) {
  const videoThumbDir = path.join(thumbDir, video.id);
  await fs.mkdir(videoThumbDir, { recursive: true });

  // Check if thumbnails already exist
  try {
    const existing = await fs.readdir(videoThumbDir);
    const jpgs = existing.filter((f) => f.endsWith('.jpg')).sort();
    if (jpgs.length >= THUMB_COUNT) {
      // Already done, just get duration
      let duration = video.durationSecs;
      if (!duration) {
        try {
          duration = await getVideoDuration(video.path);
        } catch { duration = 0; }
      }
      return {
        thumbnails: jpgs.map((f) => path.join(videoThumbDir, f)),
        durationSecs: duration,
      };
    }
  } catch {
    // Directory doesn't exist yet, will create
  }

  // Get duration
  let duration;
  try {
    duration = await getVideoDuration(video.path);
  } catch {
    duration = 0;
  }

  const timestamps = calculateTimestamps(duration, THUMB_COUNT);
  const thumbnails = [];

  for (let i = 0; i < timestamps.length; i++) {
    if (cancelled) throw new Error('Cancelled');
    const outputPath = path.join(videoThumbDir, `thumb_${String(i + 1).padStart(2, '0')}.jpg`);
    try {
      await extractFrame(video.path, timestamps[i], outputPath);
      thumbnails.push(outputPath);
    } catch {
      // If a single frame fails, skip it
    }
  }

  return { thumbnails, durationSecs: duration };
}

/**
 * Process a batch of videos with limited concurrency.
 * @param {Array} videos - Videos that need thumbnails.
 * @param {string} thumbDir - Path to .video-cull-thumbs directory.
 * @param {function} onProgress - Called with { current, total }.
 * @param {function} onVideoReady - Called with (videoId, thumbnails[], durationSecs) per completed video.
 */
async function processVideos(videos, thumbDir, onProgress, onVideoReady) {
  cancelled = false;
  const total = videos.length;
  let current = 0;

  // Simple concurrency limiter
  const queue = [...videos];
  const workers = [];

  for (let i = 0; i < MAX_CONCURRENT; i++) {
    workers.push(
      (async () => {
        while (queue.length > 0 && !cancelled) {
          const video = queue.shift();
          if (!video) break;
          try {
            const result = await generateThumbnailsForVideo(video, thumbDir);
            current++;
            if (onProgress) onProgress({ current, total });
            if (onVideoReady) onVideoReady(video.id, result.thumbnails, result.durationSecs);
          } catch (err) {
            if (err.message === 'Cancelled') break;
            current++;
            if (onProgress) onProgress({ current, total });
          }
        }
      })()
    );
  }

  await Promise.all(workers);
}

function cancelProcessing() {
  cancelled = true;
}

module.exports = { processVideos, cancelProcessing };
