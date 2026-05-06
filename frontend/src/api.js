const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function fetchJSON(path, params = {}) {
  const url = new URL(`${BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  products: (params) => fetchJSON('/api/products', params),
  product: (code) => fetchJSON(`/api/products/${code}`),
  alternatives: (code) => fetchJSON(`/api/products/${code}/alternatives`),
  compare: (codes) => fetchJSON('/api/compare', { codes: codes.join(',') }),
  categories: () => fetchJSON('/api/categories'),
  stats: () => fetchJSON('/api/stats'),
};
