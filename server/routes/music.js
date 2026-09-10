const express = require('express');
const router = express.Router();

// Helper to scrape YouTube search results for 100% full-length tracks
async function searchYouTube(q, limit = 15) {
  try {
    const res = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(6000),
    });
    const html = await res.text();
    const match = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/);
    if (!match) return [];
    const data = JSON.parse(match[1]);
    const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
    const results = [];

    for (const c of contents) {
      const items = c.itemSectionRenderer?.contents || [];
      for (const item of items) {
        const v = item.videoRenderer;
        if (v && v.videoId && v.lengthText?.simpleText) {
          const parts = v.lengthText.simpleText.split(':').map(Number);
          let sec = 0;
          if (parts.length === 2) sec = parts[0] * 60 + parts[1];
          else if (parts.length === 3) sec = parts[0] * 3600 + parts[1] * 60 + parts[2];

          results.push({
            id: `yt_${v.videoId}`,
            videoId: v.videoId,
            title: v.title?.runs?.[0]?.text || 'Untitled',
            artist: v.ownerText?.runs?.[0]?.text || 'YouTube Music',
            duration: sec,
            durationText: v.lengthText.simpleText,
            thumbnail: `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
            artwork: `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
            source: 'youtube',
            isFullLength: true,
          });

          if (results.length >= limit) break;
        }
      }
      if (results.length >= limit) break;
    }
    return results;
  } catch (err) {
    console.warn('YouTube search error:', err.message);
    return [];
  }
}

// Helper to search Audius for full-length songs
async function searchAudius(q, limit = 10) {
  try {
    const res = await fetch(`https://discoveryprovider.audius.co/v1/tracks/search?query=${encodeURIComponent(q)}&app_name=StudySync`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000),
    });
    const data = await res.json();
    return (data.data || []).slice(0, limit).map((item) => {
      const sec = Math.round(item.duration || 180);
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return {
        id: `audius_${item.id}`,
        title: item.title || 'Untitled',
        artist: item.user?.name || item.user?.handle || 'Audius Artist',
        album: item.genre || 'Electronic',
        duration: sec,
        durationText: `${m}:${s < 10 ? '0' : ''}${s}`,
        thumbnail: item.artwork?.['150x150'] || '',
        artwork: item.artwork?.['480x480'] || item.artwork?.['150x150'] || '',
        audioUrl: `https://discoveryprovider.audius.co/v1/tracks/${item.id}/stream?app_name=StudySync`,
        source: 'audius',
        isFullLength: true,
      };
    });
  } catch (err) {
    console.warn('Audius search error:', err.message);
    return [];
  }
}

// Search Endpoint (Full length songs from YouTube & Audius)
router.get('/search', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) {
      return res.json({ tracks: [] });
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit) || 15, 5), 30);

    // Search YouTube and Audius in parallel
    const [ytTracks, audiusTracks] = await Promise.all([
      searchYouTube(q, limit),
      searchAudius(q, 8),
    ]);

    // Combine results (prioritize YouTube for exact hits, then Audius)
    const combined = [...ytTracks, ...audiusTracks];

    res.json({
      tracks: combined,
      query: q,
      total: combined.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trending / Curated Playlists with full length songs
const CURATED_SEARCHES = {
  lofi: 'lofi hip hop radio beats to study to chill',
  chill: 'chillhop essentials study focus',
  classical: 'chopin nocturnes mozart study focus classical',
  pop: 'pop hits billboard study clean playlist',
  synthwave: 'synthwave chillwave retro focus',
  ghibli: 'studio ghibli piano collection chill',
};

router.get('/trending', async (req, res) => {
  try {
    const category = req.query.category || 'lofi';
    const query = CURATED_SEARCHES[category] || CURATED_SEARCHES.lofi;
    const limit = Math.min(parseInt(req.query.limit) || 15, 25);

    const tracks = await searchYouTube(query, limit);

    res.json({
      category,
      tracks,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
