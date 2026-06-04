import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { NSBadge, ProductImage, PriceBadge, TasteTags } from '../components';
import { T } from '../theme';
import { useNarrow } from '../useNarrow';

const CATEGORIES = [
  { label: 'All', q: '' },
  { label: 'Dairy', q: 'Dairies' },
  { label: 'Cereals', q: 'Cereals' },
  { label: 'Beverages', q: 'Beverages' },
  { label: 'Snacks', q: 'Snacks' },
  { label: 'Plant-based', q: 'Plant-based foods' },
  { label: 'Fruits & Vegetables', q: 'Fruits and vegetables' },
  { label: 'Oils', q: 'Oils' },
];

const OBJECTIVES = [
  { key: 'protein', label: 'Max protein', color: '#378ADD' },
  { key: 'fiber', label: 'High fiber', color: '#1D9E75' },
  { key: 'low_sugar', label: 'Low sugar', color: '#E91E63' },
  { key: 'low_sat_fat', label: 'Low sat fat', color: '#EE8100' },
  { key: 'low_salt', label: 'Low salt', color: '#0277BD' },
  { key: 'low_fat', label: 'Low fat', color: '#9b6bcc' },
];
const PACKAGING_OPTS = ['Any', 'Plastic', 'Glass', 'Cardboard', 'Metal', 'Paper', 'Tetra'];
const ORIGIN_OPTS = ['Any', 'Spain', 'France', 'Italy', 'Germany', 'Portugal', 'European Union'];
const NOVA_OPTS = [['Processing: any', ''], ['NOVA 1 — unprocessed', '1'], ['≤ NOVA 2', '2'], ['≤ NOVA 3', '3']];

export default function Results({ weight, compareCodes = [], toggleCompare }) {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const narrow = useNarrow();
  const [query, setQuery] = useState(params.get('q') || '');
  const [category, setCategory] = useState(params.get('category') || '');
  const [sort, setSort] = useState('combined');
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState(null);
  const [objectives, setObjectives] = useState([]);
  const [packaging, setPackaging] = useState('');
  const [origin, setOrigin] = useState('');
  const [organic, setOrganic] = useState(false);
  const [maxNova, setMaxNova] = useState('');
  const objKey = objectives.join(',');

  useEffect(() => {
    api.products({ q: query, category, sort, health_weight: 1 - weight, page, page_size: 20,
      objectives: objKey, packaging, origin, organic: organic || undefined, max_nova: maxNova })
      .then(d => { setProducts(d.results); setTotal(d.total); setError(null); })
      .catch(() => setError('Failed to load products'));
  }, [query, category, sort, weight, page, objKey, packaging, origin, organic, maxNova]);

  const combined = (p) => Math.round(weight * p.eco_score + (1 - weight) * p.health_score);
  const toggleObjective = (key) => { setObjectives(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]); setPage(1); };
  const lbl = { fontFamily: T.mono, fontSize: 9, color: T.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 };
  const selStyle = { width: '100%', padding: '6px 8px', borderRadius: 6, border: `1px solid ${T.line}`, background: T.panel, fontSize: 12, fontFamily: T.sans, color: T.text, cursor: 'pointer', marginBottom: 10 };

  if (error) return <div style={{ padding: 40, color: T.warn, fontFamily: T.mono, fontSize: 13 }}>{error}</div>;

  return (
    <div style={{ padding: narrow ? '16px' : '20px 28px 40px', flex: 1 }}>
      <div style={{ fontFamily: T.mono, fontSize: 10, color: T.muted, letterSpacing: 1.5 }}>CATALOG / FILTER</div>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '4px 0 18px', color: T.text }}>
        {total.toLocaleString()} products
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : '220px 1fr', gap: 20 }}>
        <div style={{ display: narrow ? 'flex' : 'block', flexDirection: narrow ? 'column' : undefined, gap: narrow ? 16 : undefined }}>
          <form onSubmit={e => e.preventDefault()} style={{ flex: narrow ? 1 : undefined }}>
            <div style={{ fontFamily: T.mono, fontSize: 9, color: T.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>Search</div>
            <input value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} placeholder="name or brand..." aria-label="Search products by name or brand"
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${T.line}`, background: T.panel,
                fontSize: 13, fontFamily: T.sans, color: T.text, outline: 'none', boxSizing: 'border-box', marginBottom: 16 }} />
          </form>

          <div style={{ flex: narrow ? 2 : undefined }}>
            <div style={{ fontFamily: T.mono, fontSize: 9, color: T.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>Category</div>
            <div style={{ display: narrow ? 'flex' : 'block', gap: narrow ? 8 : undefined, flexWrap: narrow ? 'wrap' : undefined, overflowX: narrow ? 'auto' : undefined }}>
              {CATEGORIES.map(c => {
                const active = category === c.q || (c.q === '' && !category);
                return (
                <button key={c.label} onClick={() => { setCategory(c.q); setPage(1); }}
                  style={{ display: narrow ? 'inline-flex' : 'block', width: narrow ? 'auto' : '100%', textAlign: 'left', padding: narrow ? '6px 12px' : '6px 8px', borderRadius: narrow ? 16 : 4,
                    border: 'none', background: active ? T.panel2 : 'transparent',
                    color: active ? T.text : T.muted,
                    fontSize: 13, fontFamily: T.sans, cursor: 'pointer', marginBottom: narrow ? 0 : 2, whiteSpace: 'nowrap' }}>
                  {c.label}
                </button>
                );
              })}
            </div>
          </div>

          <div style={{ flex: narrow ? 1 : undefined }}>
            <div style={{ ...lbl, marginTop: narrow ? 0 : 20 }}>Optimize for</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {OBJECTIVES.map(o => {
                const on = objectives.includes(o.key);
                return (
                  <button key={o.key} aria-pressed={on} onClick={() => toggleObjective(o.key)}
                    style={{ padding: '4px 9px', borderRadius: 999, fontSize: 11, fontFamily: T.sans, fontWeight: 600, cursor: 'pointer',
                      border: `1px solid ${on ? o.color : T.line}`, background: on ? `${o.color}14` : T.panel, color: on ? o.color : T.muted }}>
                    {on ? '✓ ' : ''}{o.label}
                  </button>
                );
              })}
            </div>
            {objectives.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden' }}>
                  {objectives.map(k => { const o = OBJECTIVES.find(x => x.key === k); return <div key={k} style={{ flex: 1, background: o.color }} title={o.label} />; })}
                </div>
                <div style={{ fontFamily: T.mono, fontSize: 9, color: T.muted, marginTop: 4, lineHeight: 1.4 }}>
                  Ranking by {objectives.map(k => OBJECTIVES.find(x => x.key === k).label).join(' + ')}
                </div>
              </div>
            )}
          </div>

          <div style={{ flex: narrow ? 1 : undefined }}>
            <div style={{ ...lbl, marginTop: narrow ? 0 : 20 }}>Attributes</div>
            <select value={packaging} onChange={e => { setPackaging(e.target.value); setPage(1); }} aria-label="Filter by packaging material" style={selStyle}>
              {PACKAGING_OPTS.map(p => <option key={p} value={p === 'Any' ? '' : p}>{p === 'Any' ? 'Packaging: any' : p}</option>)}
            </select>
            <select value={origin} onChange={e => { setOrigin(e.target.value); setPage(1); }} aria-label="Filter by origin" style={selStyle}>
              {ORIGIN_OPTS.map(o => <option key={o} value={o === 'Any' ? '' : o}>{o === 'Any' ? 'Origin: any' : o}</option>)}
            </select>
            <select value={maxNova} onChange={e => { setMaxNova(e.target.value); setPage(1); }} aria-label="Filter by maximum NOVA processing group" style={selStyle}>
              {NOVA_OPTS.map(([l, v]) => <option key={l} value={v}>{l}</option>)}
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontFamily: T.sans, color: T.text, cursor: 'pointer' }}>
              <input type="checkbox" checked={organic} onChange={e => { setOrganic(e.target.checked); setPage(1); }} style={{ accentColor: T.eco, cursor: 'pointer' }} />
              Organic / eco-certified only
            </label>
          </div>

          <div style={{ flex: narrow ? 1 : undefined }}>
            <div style={{ ...lbl, marginTop: narrow ? 0 : 20 }}>Sort</div>
            <select value={sort} disabled={objectives.length > 0} onChange={e => { setSort(e.target.value); setPage(1); }}
              style={{ ...selStyle, marginBottom: 0, opacity: objectives.length > 0 ? 0.5 : 1, cursor: objectives.length > 0 ? 'not-allowed' : 'pointer' }}>
              <option value="combined">Best match</option>
              <option value="health">Health score</option>
              <option value="eco">Eco score</option>
              <option value="name">Name A–Z</option>
            </select>
            {objectives.length > 0 && <div style={{ fontFamily: T.mono, fontSize: 9, color: T.warn, marginTop: 6 }}>Overridden by optimization above</div>}
          </div>
        </div>

        <div>
          <div style={{ display: 'grid', gridTemplateColumns: narrow ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {products.map(p => {
              const inCompare = compareCodes.includes(p.code);
              return (
                <div key={p.code} style={{ background: T.panel, borderRadius: 10, border: `1px solid ${inCompare ? T.eco : T.line}`,
                  padding: 12, display: 'flex', flexDirection: 'column', gap: 8, transition: 'box-shadow 0.15s', position: 'relative' }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 20px rgba(28,28,25,.08)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                  <button aria-label={inCompare ? `Remove ${p.product_name} from compare` : `Add ${p.product_name} to compare`} onClick={e => { e.stopPropagation(); toggleCompare(p.code); }}
                    style={{ position: 'absolute', top: 8, right: 8, zIndex: 2, width: 24, height: 24, borderRadius: 6,
                      border: `1px solid ${inCompare ? T.eco : T.line}`, background: inCompare ? T.eco : T.panel,
                      color: inCompare ? '#fff' : T.muted, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                    {inCompare ? '✓' : '+'}
                  </button>
                  <div onClick={() => nav(`/product/${p.code}`)} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                    <ProductImage url={p.image_url} height={100} rounded={6} categories={p.categories} name={p.product_name} />
                    <div style={{ fontSize: 11, color: T.muted, fontFamily: T.mono }}>{p.brands}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text, lineHeight: 1.25 }}>{p.product_name}</div>
                    <TasteTags tags={p.taste_tags} />
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 'auto', flexWrap: 'wrap' }}>
                      <NSBadge grade={p.health_grade} size="sm" />
                      <NSBadge grade={p.eco_grade} size="sm" kind="eco" />
                      <PriceBadge tier={p.price_tier} price={p.estimated_price} />
                      <div style={{ flex: 1 }} />
                      <div style={{ fontFamily: T.mono, fontSize: 14, fontWeight: 700, color: T.eco }}>{combined(p)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {total > 20 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
              {page > 1 && (
                <button aria-label="Previous page" onClick={() => setPage(p => Math.max(1, p - 1))}
                  style={{ padding: '6px 14px', borderRadius: 6, border: `1px solid ${T.line}`, background: T.panel, cursor: 'pointer', fontFamily: T.mono, fontSize: 12 }}>prev</button>
              )}
              <span style={{ fontFamily: T.mono, fontSize: 12, color: T.muted, padding: '6px 10px' }}>page {page}</span>
              {page * 20 < total && (
                <button aria-label="Next page" onClick={() => setPage(p => p + 1)}
                  style={{ padding: '6px 14px', borderRadius: 6, border: `1px solid ${T.line}`, background: T.panel, cursor: 'pointer', fontFamily: T.mono, fontSize: 12 }}>next</button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
