import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { NSBadge, ProductImage, PriceBadge } from '../components';
import { T } from '../theme';
import { useNarrow } from '../useNarrow';

export default function Landing({ weight }) {
  const nav = useNavigate();
  const narrow = useNarrow();
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState(null);
  const [cats, setCats] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.products({ sort: 'combined', health_weight: 1 - weight, page_size: 10 }).then(d => { setProducts(d.results); setError(null); }).catch(() => setError('Failed to load products'));
    api.stats().then(setStats).catch(() => {});
    api.categories().then(c => setCats(c.slice(0, 12))).catch(() => {});
  }, [weight]);

  const combined = (p) => Math.round(weight * p.eco_score + (1 - weight) * p.health_score);

  if (error) return <div style={{ padding: 40, color: T.warn, fontFamily: T.mono, fontSize: 13 }}>{error}</div>;

  return (
    <div style={{ padding: narrow ? '16px' : '20px 28px 40px', flex: 1, overflow: 'auto' }}>
      <div style={{ fontFamily: T.mono, fontSize: 10, color: T.muted, letterSpacing: 1.5 }}>DASHBOARD / DISCOVER</div>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: '4px 0 18px', letterSpacing: -0.6, color: T.text }}>
        What should I eat today?
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: narrow ? 'repeat(2, 1fr)' : '2fr 1fr 1fr 1fr', gap: 12, marginBottom: 18 }}>
        <form onSubmit={e => { e.preventDefault(); nav(`/results?q=${encodeURIComponent(query)}`); }} style={{ background: T.panel, borderRadius: 10, padding: 14, border: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <input value={query} onChange={e => setQuery(e.target.value)}
            aria-label="Search products"
            placeholder={`search ${stats ? stats.total_products.toLocaleString() : ''} products…`}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: T.text, fontSize: 14, fontFamily: T.sans }} />
          <span style={{ fontFamily: T.mono, fontSize: 10, color: T.muted, padding: '2px 6px', border: `1px solid ${T.line}`, borderRadius: 4 }}>⏎</span>
        </form>
        {[
          { l: 'Avg Health', v: stats ? stats.avg_health_score.toFixed(0) : '—', c: T.health },
          { l: 'Avg Eco', v: stats ? stats.avg_eco_score.toFixed(0) : '—', c: T.eco },
          { l: 'Mix', v: `${Math.round((1 - weight) * 100)}/${Math.round(weight * 100)}`, c: T.warn },
        ].map(s => (
          <div key={s.l} style={{ background: T.panel, borderRadius: 10, padding: '10px 14px', border: `1px solid ${T.line}` }}>
            <div style={{ fontFamily: T.mono, fontSize: 9, color: T.muted, letterSpacing: 1.2, textTransform: 'uppercase' }}>{s.l}</div>
            <div style={{ fontFamily: T.mono, fontSize: 22, color: s.c, fontWeight: 600, marginTop: 2 }}>{s.v}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {cats.map(c => (
          <button key={c.name} aria-label={`Browse category ${c.name.split(',').pop().trim()}`} onClick={() => nav(`/results?category=${encodeURIComponent(c.name)}`)}
            style={{ padding: '5px 10px', borderRadius: 999, background: T.panel, border: `1px solid ${T.line}`,
              color: T.muted, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: T.sans }}>
            {c.name.split(',').pop().trim()} ({c.count})
          </button>
        ))}
      </div>

      <div style={{ background: T.panel, borderRadius: 10, border: `1px solid ${T.line}`, overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', borderBottom: `1px solid ${T.line}` }}>
          <div style={{ fontFamily: T.mono, fontSize: 10, color: T.muted, letterSpacing: 1.2, textTransform: 'uppercase' }}>
            Top picks · sorted by combined score
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: narrow ? '30px 1.5fr 70px 70px 40px 50px' : '40px 50px 1.5fr 1fr 80px 80px 50px 70px', gap: 10, padding: '8px 14px',
          fontFamily: T.mono, fontSize: 9, color: T.muted, letterSpacing: 1.2, textTransform: 'uppercase', borderBottom: `1px solid ${T.line}`, background: T.panel2 }}>
          <div>#</div>{!narrow && <div></div>}<div>Product</div>{!narrow && <div>Brand</div>}<div>Nutri</div><div>Eco</div><div>Price</div><div>Score</div>
        </div>
        {products.map((p, i) => (
          <div key={p.code} onClick={() => nav(`/product/${p.code}`)}
            style={{ display: 'grid', gridTemplateColumns: narrow ? '30px 1.5fr 70px 70px 40px 50px' : '40px 50px 1.5fr 1fr 80px 80px 50px 70px', gap: 10, padding: '10px 14px',
              alignItems: 'center', borderBottom: `1px solid ${T.line}`, cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = T.panel2}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <div style={{ fontFamily: T.mono, fontSize: 11, color: T.muted }}>{String(i + 1).padStart(2, '0')}</div>
            {!narrow && <ProductImage url={p.image_url} height={40} rounded={6} categories={p.categories} name={p.product_name} />}
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.product_name}</div>
            {!narrow && <div style={{ fontSize: 11, color: T.muted, fontFamily: T.mono, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.brands}</div>}
            <NSBadge grade={p.health_grade} size="sm" />
            <NSBadge grade={p.eco_grade} size="sm" kind="eco" />
            <PriceBadge tier={p.price_tier} price={p.estimated_price} />
            <div style={{ fontFamily: T.mono, fontSize: 16, fontWeight: 700, color: combined(p) >= 70 ? T.eco : combined(p) >= 50 ? T.health : T.warn }}>
              {combined(p)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
