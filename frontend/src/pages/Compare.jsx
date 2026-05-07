import { useState, useEffect } from 'react';
import { api } from '../api';
import { NSBadge, RadarChart, EcoBarsOverlay, EcoRadar, LeafGauge } from '../components';
import { T } from '../theme';
import { useNarrow } from '../useNarrow';

const COLORS = [T.health, T.eco, '#9b6bcc', T.warn];

export default function Compare({ weight, compareCodes = [], toggleCompare }) {
  const narrow = useNarrow();
  const [products, setProducts] = useState([]);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    if (!compareCodes.length) { setProducts([]); return; }
    api.compare(compareCodes).then(d => setProducts(d.products));
  }, [compareCodes.join(',')]);

  useEffect(() => {
    if (!searchQ || searchQ.length < 2) { setSearchResults([]); return; }
    const t = setTimeout(() => {
      api.products({ q: searchQ, page_size: 5 }).then(d => setSearchResults(d.results));
    }, 300);
    return () => clearTimeout(t);
  }, [searchQ]);

  const addProduct = (code) => {
    toggleCompare(code);
    setSearchQ('');
    setSearchResults([]);
  };

  const removeProduct = (code) => toggleCompare(code);
  const combined = (p) => Math.round(weight * p.eco_score + (1 - weight) * p.health_score);

  const summary = () => {
    if (products.length < 2) return null;
    const bestHealth = [...products].sort((a, b) => (b.health_score || 0) - (a.health_score || 0))[0];
    const bestEco = [...products].sort((a, b) => (b.eco_score || 0) - (a.eco_score || 0))[0];
    const bestProtein = [...products].sort((a, b) => (b.proteins_100g || 0) - (a.proteins_100g || 0))[0];
    const lowestNova = [...products].filter(p => p.nova_group).sort((a, b) => a.nova_group - b.nova_group)[0];
    const withLabels = products.filter(p => p.labels);
    const withoutLabels = products.filter(p => !p.labels);
    const novaLabels = { 1: 'unprocessed', 2: 'processed ingredients', 3: 'processed', 4: 'ultra-processed' };

    return (
      <div style={{ padding: '12px 14px', background: T.panel2, borderRadius: 8 }}>
        <div style={{ fontFamily: T.mono, fontSize: 10, color: T.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>Summary</div>
        <p style={{ fontSize: 12, color: T.text, lineHeight: 1.6, margin: 0 }}>
          <strong>{bestHealth.product_name}</strong> is the <span style={{ color: T.health }}>healthiest</span> by Nutri-Score.{' '}
          <strong>{bestEco.product_name}</strong> is the <span style={{ color: T.eco }}>most planet-friendly</span> by Eco-Score.{' '}
          <strong>{bestProtein.product_name}</strong> leads on protein density ({(bestProtein.proteins_100g || 0).toFixed(0)}g/100g).
        </p>
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.line}` }}>
          <div style={{ fontFamily: T.mono, fontSize: 10, color: T.eco, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>Eco highlights</div>
          <p style={{ fontSize: 11, color: T.text, lineHeight: 1.6, margin: 0 }}>
            {lowestNova && <>
              <strong>{lowestNova.product_name}</strong> has the least processing (NOVA {Math.round(lowestNova.nova_group)}, {novaLabels[Math.round(lowestNova.nova_group)] || '?'}).{' '}
            </>}
            {withLabels.length > 0 && <>
              {withLabels.length === products.length ? 'All products carry eco-certifications.' :
                <>{withLabels.map(p => <strong key={p.code}>{p.product_name}</strong>).reduce((a, b, i) => i === 0 ? [b] : [...a, ', ', b], [])} {withLabels.length === 1 ? 'carries' : 'carry'} eco-certifications.{' '}</>
              }
            </>}
            {withoutLabels.length > 0 && <>
              <span style={{ color: '#E63E11' }}>{withoutLabels.map(p => p.product_name).join(', ')}</span> {withoutLabels.length === 1 ? 'lacks' : 'lack'} eco-certifications, which penalizes {withoutLabels.length === 1 ? 'its' : 'their'} Labels score.
            </>}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: narrow ? '16px' : '20px 28px 40px', flex: 1 }}>
      <div style={{ fontFamily: T.mono, fontSize: 10, color: T.muted, letterSpacing: 1.5 }}>BENCH / {products.length} SUBJECTS</div>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '4px 0 18px', color: T.text }}>Side-by-side comparison</h1>

      <div style={{ marginBottom: 16, position: 'relative' }}>
        <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Add a product to compare..."
          style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${T.line}`, background: T.panel,
            fontSize: 13, fontFamily: T.sans, color: T.text, outline: 'none', boxSizing: 'border-box' }} />
        {searchResults.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: T.panel, border: `1px solid ${T.line}`,
            borderRadius: 8, marginTop: 4, zIndex: 10, boxShadow: '0 10px 30px rgba(28,28,25,.12)' }}>
            {searchResults.map(p => {
              const already = compareCodes.includes(p.code);
              return (
                <div key={p.code} onClick={() => !already && addProduct(p.code)}
                  style={{ padding: '8px 14px', cursor: already ? 'default' : 'pointer', fontSize: 13,
                    borderBottom: `1px solid ${T.line}`, opacity: already ? 0.5 : 1 }}
                  onMouseEnter={e => !already && (e.currentTarget.style.background = T.panel2)}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span style={{ fontWeight: 600 }}>{p.product_name}</span>
                  <span style={{ color: T.muted, marginLeft: 8, fontFamily: T.mono, fontSize: 11 }}>{p.brands}</span>
                  {already && <span style={{ color: T.eco, marginLeft: 8, fontFamily: T.mono, fontSize: 10 }}>✓ added</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {products.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: T.muted, fontFamily: T.mono, fontSize: 12 }}>
          Search and add 2-4 products to compare
        </div>
      )}

      {products.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : '1fr 360px', gap: 12 }}>
          <div style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 10, padding: 14, overflowX: narrow ? 'auto' : 'visible' }}>
            <div style={{ minWidth: narrow ? products.length * 120 + 80 : undefined }}>
            <div style={{ display: 'grid', gridTemplateColumns: `1fr repeat(${products.length}, 1fr)`, gap: 8, marginBottom: 14, paddingBottom: 12, borderBottom: `1px solid ${T.line}` }}>
              <div />
              {products.map((p, i) => (
                <div key={p.code}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: COLORS[i] }} />
                    <button onClick={() => removeProduct(p.code)} style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 10 }}>×</button>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.text, lineHeight: 1.2, marginTop: 4 }}>{p.product_name}</div>
                  <div style={{ fontFamily: T.mono, fontSize: 10, color: T.muted, marginTop: 3 }}>{p.brands}</div>
                </div>
              ))}
            </div>
            {[
              { l: 'Nutri-Score', render: p => <NSBadge grade={p.health_grade} size="sm" /> },
              { l: 'Eco-Score', render: p => <NSBadge grade={p.eco_grade} size="sm" kind="eco" /> },
              { l: 'Combined', render: p => <span style={{ fontFamily: T.mono, fontSize: 14, color: T.eco, fontWeight: 700 }}>{combined(p)}</span> },
              { l: 'kcal', render: p => <span style={{ fontFamily: T.mono, fontSize: 12, color: T.text }}>{Math.round(p.energy_kcal_100g || 0)}</span> },
              { l: 'sat fat', render: p => <span style={{ fontFamily: T.mono, fontSize: 12, color: T.text }}>{(p.saturated_fat_100g || 0).toFixed(1)}g</span> },
              { l: 'sugars', render: p => <span style={{ fontFamily: T.mono, fontSize: 12, color: T.text }}>{(p.sugars_100g || 0).toFixed(1)}g</span> },
              { l: 'salt', render: p => <span style={{ fontFamily: T.mono, fontSize: 12, color: T.text }}>{(p.salt_100g || 0).toFixed(1)}g</span> },
              { l: 'fiber', render: p => <span style={{ fontFamily: T.mono, fontSize: 12, color: T.text }}>{(p.fiber_100g || 0).toFixed(1)}g</span> },
              { l: 'protein', render: p => <span style={{ fontFamily: T.mono, fontSize: 12, color: T.text }}>{(p.proteins_100g || 0).toFixed(1)}g</span> },
              { l: 'NOVA', render: p => <span style={{ fontFamily: T.mono, fontSize: 12, color: p.nova_group <= 2 ? T.eco : p.nova_group >= 4 ? '#E63E11' : T.text }}>{p.nova_group ? Math.round(p.nova_group) : '-'}</span> },
              { l: 'packaging', render: p => <span style={{ fontFamily: T.mono, fontSize: 12, color: T.text }}>{p.packaging || '-'}</span> },
              { l: 'origin', render: p => <span style={{ fontFamily: T.mono, fontSize: 12, color: T.text }}>{p.origins || '-'}</span> },
              { l: 'eco labels', render: p => <span style={{ fontFamily: T.mono, fontSize: 11, color: T.text, wordBreak: 'break-word' }}>{p.labels?.split(',').slice(0,2).join(', ') || '-'}</span> },
            ].map(row => (
              <div key={row.l} style={{ display: 'grid', gridTemplateColumns: `1fr repeat(${products.length}, 1fr)`, gap: 8,
                padding: '8px 0', borderBottom: `1px solid ${T.line}`, alignItems: 'center' }}>
                <div style={{ fontFamily: T.mono, fontSize: 11, color: T.muted }}>{row.l}</div>
                {products.map(p => <div key={p.code}>{row.render(p)}</div>)}
              </div>
            ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignSelf: 'flex-start' }}>
            <div style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 10, padding: 14 }}>
              <div style={{ fontFamily: T.mono, fontSize: 10, color: T.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>
                Overlaid radar
              </div>
              {products[0]?.feature_attributions?.radar && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
                  <RadarChart
                    data={products[0].feature_attributions.radar}
                    size={280}
                    color={COLORS[0]}
                    overlays={products.slice(1).filter(p => p.feature_attributions?.radar).map((p, i) => ({
                      data: p.feature_attributions.radar,
                      color: COLORS[i + 1],
                    }))}
                  />
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {products.map((p, i) => (
                  <div key={p.code} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontFamily: T.mono, color: T.text }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: COLORS[i], flexShrink: 0 }} />
                    {p.product_name}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 10, padding: 14 }}>
              <div style={{ fontFamily: T.mono, fontSize: 10, color: T.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>
                Overlaid eco contributions
              </div>
              <EcoBarsOverlay products={products} colors={COLORS} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                {products.map((p, i) => (
                  <div key={p.code} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontFamily: T.mono, color: T.text }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: COLORS[i], flexShrink: 0 }} />
                    {p.product_name}
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 10, color: T.muted, fontFamily: T.mono, margin: '8px 0 0', lineHeight: 1.4 }}>
                Positive = planet-friendly · Negative = higher impact
              </p>
            </div>

            <div style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 10, padding: 14 }}>
              <div style={{ fontFamily: T.mono, fontSize: 10, color: T.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>
                Overlaid eco radar
              </div>
              {products[0]?.feature_attributions?.eco_breakdown && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0' }}>
                  <EcoRadar
                    data={products[0].feature_attributions.eco_breakdown}
                    size={260}
                    color={COLORS[0]}
                    overlays={products.slice(1).filter(p => p.feature_attributions?.eco_breakdown).map((p, i) => ({
                      data: p.feature_attributions.eco_breakdown,
                      color: COLORS[i + 1],
                    }))}
                  />
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {products.map((p, i) => (
                  <div key={p.code} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontFamily: T.mono, color: T.text }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: COLORS[i], flexShrink: 0 }} />
                    {p.product_name}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 10, padding: 14 }}>
              <div style={{ fontFamily: T.mono, fontSize: 10, color: T.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>
                Eco vitality
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
                {products.map((p, i) => (
                  <div key={p.code} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <LeafGauge score={p.eco_score || 0} grade={p.eco_grade} size={80} />
                    <span style={{ fontFamily: T.mono, fontSize: 9, color: COLORS[i], maxWidth: 80, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.product_name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 10, padding: 14 }}>
              <div style={{ fontFamily: T.mono, fontSize: 10, color: T.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>
                Eco factor guide
              </div>
              {[
                { dim: 'Packaging', icon: '📦', explain: (ps) => {
                  const types = [...new Set(ps.map(p => p.packaging).filter(Boolean))];
                  return types.length ? `Materials found: ${types.join(', ')}. Recyclable or minimal packaging scores positive; excessive or non-recyclable packaging scores negative.` : 'No packaging data available. Missing data defaults to a neutral score.';
                }},
                { dim: 'Processing', icon: '⚙️', explain: (ps) => {
                  const novas = ps.map(p => ({ name: p.product_name, nova: p.nova_group ? Math.round(p.nova_group) : null })).filter(p => p.nova);
                  const labels = { 1: 'unprocessed', 2: 'processed ingredients', 3: 'processed', 4: 'ultra-processed' };
                  return novas.map(p => `${p.name}: NOVA ${p.nova} (${labels[p.nova] || '?'})`).join('. ') + '. Lower NOVA = less energy in manufacturing = positive score.';
                }},
                { dim: 'Labels', icon: '🏷', explain: (ps) => {
                  const withLabels = ps.filter(p => p.labels);
                  const without = ps.filter(p => !p.labels);
                  let text = '';
                  if (withLabels.length) text += withLabels.map(p => `${p.product_name}: ${p.labels.split(',').slice(0,3).join(', ')}`).join('. ') + '. ';
                  if (without.length) text += `${without.map(p => p.product_name).join(', ')}: no eco-certifications — scores negative because absence of labels (e.g. Organic, Fair Trade) is penalized.`;
                  return text || 'No label data.';
                }},
                { dim: 'Origin', icon: '🌍', explain: (ps) => {
                  const origins = ps.map(p => ({ name: p.product_name, origin: p.origins })).filter(p => p.origin);
                  const noOrigin = ps.filter(p => !p.origins);
                  let text = '';
                  if (origins.length) text += origins.map(p => `${p.name}: ${p.origin}`).join('. ') + '. Local or low-transport origins score positive. ';
                  if (noOrigin.length) text += `${noOrigin.map(p => p.product_name).join(', ')}: origin unknown — defaults to neutral.`;
                  return text || 'No origin data.';
                }},
              ].map(({ dim, icon, explain }) => (
                <div key={dim} style={{ padding: '8px 0', borderBottom: `1px solid ${T.line}` }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 3 }}>{icon} {dim}</div>
                  <p style={{ fontSize: 11, color: T.muted, lineHeight: 1.5, margin: 0 }}>{explain(products)}</p>
                </div>
              ))}
            </div>

            {summary() && (
              <div style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 10, padding: 14 }}>
                {summary()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
