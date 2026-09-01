const express = require('express');
const router = express.Router();

const GIPHY_API_KEY = process.env.GIPHY_API_KEY || 'l6075tbdJztfdVVDCxdGD4AE0lnxe7DU';
const GIPHY_SEARCH_URL = 'https://api.giphy.com/v1/gifs/search';
const GIPHY_TRENDING_URL = 'https://api.giphy.com/v1/gifs/trending';

function mapGif(g) {
  return {
    id: g.id,
    title: g.title || '',
    url: g.images?.fixed_height?.url || g.images?.original?.url || '',
    preview: g.images?.fixed_height_small?.url || g.images?.fixed_height?.url || '',
    width: g.images?.fixed_height?.width ? Number(g.images.fixed_height.width) : 0,
    height: g.images?.fixed_height?.height ? Number(g.images.fixed_height.height) : 0,
  };
}

async function fetchGiphy(endpoint, params) {
  const url = new URL(endpoint);
  url.searchParams.set('api_key', GIPHY_API_KEY);
  url.searchParams.set('limit', String(params.limit || 24));
  url.searchParams.set('rating', 'g');
  if (params.q) url.searchParams.set('q', params.q);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Giphy request failed (${response.status})`);
  }
  const data = await response.json();
  return (data.data || []).map(mapGif);
}

router.get('/search', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const limit = Math.min(Number(req.query.limit) || 24, 50);

  try {
    const gifs = q
      ? await fetchGiphy(GIPHY_SEARCH_URL, { q, limit })
      : await fetchGiphy(GIPHY_TRENDING_URL, { limit });
    res.json({ gifs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;