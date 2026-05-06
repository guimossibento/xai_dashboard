import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { NSBadge, ProductImage } from '../components';
import { T } from '../theme';
import { useNarrow } from '../useNarrow';

const CATEGORIES = ['All', 'Dairy', 'Cereals', 'Beverages', 'Snacks', 'Plant-based proteins', 'Fruits & Vegetables', 'Oils'];

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

  useEffect(() => {
    api.products({ q: query, category: category === 'All' ? '' : category, sort, health_weight: 1 - weight, page, page_size: 20 })
      .then(d => { setProducts(d.results); setTotal(d.total); });
  }, [query, category, sort, weight, page]);

  const combined = (p) => Math.round(weight * p.eco_score + (1 - weight) * p.health_score);

  return (
    <div style={{ padding: narrow ? '16px' : '20px 28px 40px', flex: 1 }}>
      <div style={{ fontFamily: T.mono, fontSize: 10, color: T.muted, letterSpacing: 1.5 }}>CATALOG / FILTER</div>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '4px 0 18px', color: T.text }}>
        {total.toLocaleString()} products
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : '220px 1fr', gap: 20 }}>
        <div style={{ display: narrow ? 'flex' : 'block', flexDirection: narrow ? 'column' : undefined, gap: narrow ? 16 : undefined }}>
          <div style={{ flex: narrow ? 1 : undefined }}>
            <div style={{ fontFamily: T.mono, fontSize: 9, color: T.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>Search</div>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="name or brand..."
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${T.line}`, background: T.panel,
                fontSize: 13, fontFamily: T.sans, color: T.text, outline: 'none', boxSizing: 'border-box', marginBottom: 16 }} />
          </div>

          <div style={{ flex: narrow ? 2 : undefined }}>
            <div style={{ fontFamily: T.mono, fontSize: 9, color: T.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>Category</div>
            <div style={{ display: narrow ? 'flex' : 'block', gap: narrow ? 8 : undefined, flexWrap: narrow ? 'wrap' : undefined, overflowX: narrow ? 'auto' : undefined }}>
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => { setCategory(c === 'All' ? '' : c); setPage(1); }}
                  style={{ display: narrow ? 'inline-flex' : 'block', width: narrow ? 'auto' : '100%', textAlign: 'left', padding: narrow ? '6px 12px' : '6px 8px', borderRadius: narrow ? 16 : 4,
                    border: 'none', background: (category === c || (c === 'All' && !category)) ? T.panel2 : 'transparent',
                    color: (category === c || (c === 'All' && !category)) ? T.text : T.muted,
                    fontSize: 13, fontFamily: T.sans, cursor: 'pointer', marginBottom: narrow ? 0 : 2, whiteSpace: 'nowrap' }}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: narrow ? 1 : undefined }}>
            <div style={{ fontFamily: T.mono, fontSize: 9, color: T.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: narrow ? 0 : 20, marginBottom: 6 }}>Sort</div>
            <select value={sort} onChange={e => setSort(e.target.value)}
              style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: `1px solid ${T.line}`,
                background: T.panel, fontSize: 12, fontFamily: T.sans, color: T.text, cursor: 'pointer' }}>
              <option value="combined">Best match</option>
              <option value="health">Health score</option>
              <option value="eco">Eco score</option>
              <option value="name">Name A–Z</option>
            </select>
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
                  <button onClick={e => { e.stopPropagation(); toggleCompare(p.code); }}
                    style={{ position: 'absolute', top: 8, right: 8, zIndex: 2, width: 24, height: 24, borderRadius: 6,
                      border: `1px solid ${inCompare ? T.eco : T.line}`, background: inCompare ? T.eco : T.panel,
                      color: inCompare ? '#fff' : T.muted, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                    {inCompare ? '✓' : '+'}
                  </button>
                  <div onClick={() => nav(`/product/${p.code}`)} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                    <ProductImage url={p.image_url} height={100} rounded={6} categories={p.categories} />
                    <div style={{ fontSize: 11, color: T.muted, fontFamily: T.mono }}>{p.brands}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text, lineHeight: 1.25 }}>{p.product_name}</div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 'auto', flexWrap: 'wrap' }}>
                      <NSBadge grade={p.health_grade} size="sm" />
                      <NSBadge grade={p.eco_grade} size="sm" kind="eco" />
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
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '6px 14px', borderRadius: 6, border: `1px solid ${T.line}`, background: T.panel, cursor: 'pointer', fontFamily: T.mono, fontSize: 12 }}>prev</button>
              <span style={{ fontFamily: T.mono, fontSize: 12, color: T.muted, padding: '6px 10px' }}>page {page}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={products.length < 20}
                style={{ padding: '6px 14px', borderRadius: 6, border: `1px solid ${T.line}`, background: T.panel, cursor: 'pointer', fontFamily: T.mono, fontSize: 12 }}>next</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
