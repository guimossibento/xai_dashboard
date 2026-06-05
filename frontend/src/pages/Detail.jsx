import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { NSBadge, RadarChart, EcoFactorCard, EcoRadar, LeafGauge, EcoPipeline, FeatureImportancePanel, ProductImage, PriceBadge, AnimalWelfareBadge, TasteTags, InfoTooltip } from '../components';
import { T } from '../theme';
import { useNarrow } from '../useNarrow';

export default function Detail({ weight, compareCodes = [], toggleCompare }) {
  const { code } = useParams();
  const nav = useNavigate();
  const narrow = useNarrow();
  const [product, setProduct] = useState(null);
  const [alts, setAlts] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [error, setError] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    api.product(code).then(d => { setProduct(d); setError(null); }).catch(() => setError('Failed to load product details'));
    api.alternatives(code).then(setAlts).catch(() => {});
    api.modelInfo().then(setModelInfo).catch(() => {});
  }, [code]);

  const productCode = product?.code || code;
  const inCompare = compareCodes.includes(productCode);

  if (error) return <div style={{ padding: 40, color: T.warn, fontFamily: T.mono, fontSize: 13 }}>{error}</div>;
  if (!product) return <div style={{ padding: 40, color: T.muted }}>Loading...</div>;

  const combined = Math.round(weight * product.eco_score + (1 - weight) * product.health_score);
  const healthScore = Math.round(product.health_score || 0);
  const ecoScore = Math.round(product.eco_score || 0);

  return (
    <div style={{ padding: narrow ? '16px' : '20px 28px 40px', flex: 1, overflow: 'auto' }}>
      <div style={{ fontFamily: T.mono, fontSize: 10, color: T.muted, letterSpacing: 1.5 }}>
        INSPECT / {product.product_name?.toUpperCase()?.slice(0, 30)}
      </div>
      <div style={{ display: 'flex', flexDirection: narrow ? 'column' : 'row', alignItems: narrow ? 'flex-start' : 'center', gap: narrow ? 4 : 16, margin: '4px 0 16px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: T.text }}>{product.product_name}</h1>
        <div style={{ fontFamily: T.mono, fontSize: 12, color: T.muted }}>{product.brands} · {product.categories?.split(',').pop().trim()}</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <PriceBadge tier={product.price_tier} price={product.estimated_price} />
          <InfoTooltip text="Estimated price based on product category and brand tier (budget/standard/premium). Actual retail prices may vary by store and region." />
          <AnimalWelfareBadge score={product.animal_welfare_score} labels={product.animal_welfare_labels} />
          <TasteTags tags={product.taste_tags} />
        </div>
        <div style={{ flex: narrow ? undefined : 1 }} />
        <button aria-label={inCompare ? 'Remove from compare' : 'Add to compare'} onClick={() => toggleCompare(productCode)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8,
            border: `1px solid ${inCompare ? T.eco : T.line}`, background: inCompare ? `${T.eco}14` : T.panel,
            color: inCompare ? T.eco : T.muted, fontSize: 12, fontFamily: T.mono, fontWeight: 600,
            cursor: 'pointer', whiteSpace: 'nowrap' }}>
          {inCompare ? '✓ In compare' : '+ Add to compare'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : '280px 1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 10, padding: 14 }}>
          <ProductImage url={product.image_url} height={180} rounded={6} categories={product.categories} name={product.product_name} />
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 12 }}>
            {[product.nova_group && `NOVA ${Math.round(product.nova_group)}`, product.packaging, product.origins,
              ...(product.labels ? product.labels.split(',').slice(0, 3) : [])].filter(Boolean).map(t => (
              <span key={t} style={{ fontFamily: T.mono, fontSize: 10, padding: '2px 8px', borderRadius: 4, background: T.panel2, color: T.muted }}>
                {t.trim()}
              </span>
            ))}
          </div>
        </div>

        <div style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 10, padding: 14 }}>
          <div style={{ fontFamily: T.mono, fontSize: 10, color: T.muted, letterSpacing: 1.2, textTransform: 'uppercase', display: 'flex', alignItems: 'center' }}>
            Scores
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 12 }}>
            {[
              { k: 'Health', v: healthScore, g: product.health_grade, c: T.health },
              { k: 'Planet', v: ecoScore, g: product.eco_grade, c: T.eco },
              { k: 'Combined', v: combined, c: T.warn },
            ].map(s => (
              <div key={s.k} style={{ flex: 1, padding: 10, background: T.panel2, borderRadius: 8 }}>
                <div style={{ fontFamily: T.mono, fontSize: 9, color: T.muted, letterSpacing: 1.2, textTransform: 'uppercase' }}>{s.k}</div>
                <div style={{ fontFamily: T.mono, fontSize: 32, color: s.c, fontWeight: 600, lineHeight: 1, marginTop: 6 }}>
                  {s.g ? s.g.toUpperCase() : s.v}
                </div>
                <div style={{ fontFamily: T.mono, fontSize: 12, color: T.muted, marginTop: 4 }}>{s.v}/100</div>
                {s.g && <div style={{ marginTop: 6 }}><NSBadge grade={s.g} size="sm" kind={s.k === 'Planet' ? 'eco' : 'nutri'} /></div>}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, fontFamily: T.mono, fontSize: 11, color: T.muted, lineHeight: 1.6, background: T.panel2, padding: 10, borderRadius: 6 }}>
            <span style={{ color: T.text }}>combined</span> = health({healthScore})·{Math.round((1 - weight) * 100)}% + eco({ecoScore})·{Math.round(weight * 100)}%
            {' '}= <span style={{ color: T.eco, fontWeight: 700 }}>{combined}</span>
          </div>
        </div>

        <div style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 10, padding: 14 }}>
          <div style={{ fontFamily: T.mono, fontSize: 10, color: T.muted, letterSpacing: 1.2, textTransform: 'uppercase' }}>Plain-language</div>
          <p style={{ fontSize: 13, color: T.text, lineHeight: 1.55, margin: '10px 0 0' }}>{product.explanation}</p>
          {product.ingredients_text && (
            <>
              <div style={{ fontFamily: T.mono, fontSize: 10, color: T.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 16 }}>Ingredients</div>
              <p style={{ fontSize: 11, color: T.muted, lineHeight: 1.5, margin: '6px 0 0' }}>{product.ingredients_text}</p>
            </>
          )}
        </div>
      </div>

      <div style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 10, padding: 14, marginBottom: 12, borderTop: `2px solid ${T.eco}` }}>
        <div style={{ fontFamily: T.mono, fontSize: 10, color: T.eco, letterSpacing: 1.2, textTransform: 'uppercase', display: 'flex', alignItems: 'center' }}>
          Environmental impact · why this Eco-Score
          <InfoTooltip text="The Eco-Score evaluates environmental impact using lifecycle assessment data including carbon footprint, water use, and biodiversity impact. Methodology by ADEME and INRAE (2021)." />
        </div>

        <div style={{ marginTop: 14, marginBottom: 16 }}>
          <EcoPipeline
            breakdown={product.feature_attributions?.eco_breakdown}
            packaging={product.packaging}
            nova={product.nova_group}
            labels={product.labels}
            origins={product.origins}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : 'auto 1fr 1fr', gap: 16, marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <LeafGauge score={ecoScore} grade={product.eco_grade} size={narrow ? 100 : 110} />
          </div>
          <div>
            <EcoRadar data={product.feature_attributions?.eco_breakdown} size={220} />
            <p style={{ fontSize: 10, color: T.muted, fontFamily: T.mono, margin: '4px 0 0', lineHeight: 1.4, textAlign: 'center' }}>
              Center = high impact · Edge = planet-friendly
            </p>
          </div>
          <div>
            {(product.feature_attributions?.eco_breakdown || []).map(item => {
              const descs = {
                'Packaging': item.value >= 0
                  ? `Packaging (${product.packaging || 'unknown'}) has relatively low environmental impact. Recyclable or minimal materials contribute positively.`
                  : (!product.packaging)
                    ? `Packaging data is missing — penalized because without packaging information, recyclability and material impact cannot be assessed.`
                    : `Packaging (${product.packaging}) contributes negatively. Non-recyclable or excessive packaging increases environmental footprint.`,
                'Processing (NOVA)': item.value >= 0
                  ? `NOVA group ${product.nova_group ? Math.round(product.nova_group) : '?'} indicates lower processing, which typically means less energy use in manufacturing.`
                  : `NOVA group ${product.nova_group ? Math.round(product.nova_group) : '?'} indicates higher processing, meaning more energy and resources used in manufacturing.`,
                'Eco labels': item.value >= 0
                  ? `This product carries eco-certifications${product.labels ? ` (${product.labels.split(',').slice(0,2).join(', ').trim()})` : ''} that verify sustainable practices.`
                  : `Limited or no eco-certifications detected. Products with labels like organic, fair trade, or rainforest alliance score higher here.`,
                'Origin': item.value >= 0
                  ? `Origin${product.origins ? ` (${product.origins})` : ''} contributes positively — shorter transport distance or sustainable sourcing region.`
                  : (!product.origins || product.origins.toLowerCase() === 'unspecified')
                    ? `Origin is unknown or unspecified — penalized because without origin data, transport distance and sourcing sustainability cannot be verified.`
                    : `Origin (${product.origins}) contributes negatively — longer transportation distances increase carbon footprint.`,
              };
              return <EcoFactorCard key={item.label} label={item.label} value={item.value} description={descs[item.label] || ''} />;
            })}
          </div>
        </div>
        {(product.packaging || product.origins || product.labels) && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 14, paddingTop: 12, borderTop: `1px solid ${T.line}` }}>
            {product.packaging && (
              <span style={{ fontFamily: T.mono, fontSize: 10, padding: '3px 10px', borderRadius: 4, background: `${T.eco}12`, color: T.eco, border: `1px solid ${T.eco}30` }}>
                📦 {product.packaging}
              </span>
            )}
            {product.origins && (
              <span style={{ fontFamily: T.mono, fontSize: 10, padding: '3px 10px', borderRadius: 4, background: `${T.eco}12`, color: T.eco, border: `1px solid ${T.eco}30` }}>
                🌍 {product.origins}
              </span>
            )}
            {product.labels && product.labels.split(',').slice(0, 4).map(l => (
              <span key={l} style={{ fontFamily: T.mono, fontSize: 10, padding: '3px 10px', borderRadius: 4, background: `${T.eco}12`, color: T.eco, border: `1px solid ${T.eco}30` }}>
                🏷 {l.trim()}
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 10, padding: 14 }}>
          <div style={{ fontFamily: T.mono, fontSize: 10, color: T.muted, letterSpacing: 1.2, textTransform: 'uppercase', display: 'flex', alignItems: 'center' }}>
            Nutritional radar · why this Nutri-Score
            <InfoTooltip text="Nutri-Score is a front-of-pack nutrition label developed by Santé publique France. It grades products A (best) to E (worst) based on energy, sugars, saturated fat, sodium, fiber, protein, and fruit/vegetable content (Julia & Hercberg, 2017)." />
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', padding: 8 }}>
            <RadarChart data={product.feature_attributions?.radar} size={260} color={T.health} />
          </div>
          <p style={{ fontSize: 11, color: T.muted, lineHeight: 1.5, margin: '8px 0 0', fontFamily: T.mono }}>
            Each axis is normalized 0–100; further from center = better.
          </p>
        </div>
        <div style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 10, padding: 14 }}>
          <div style={{ fontFamily: T.mono, fontSize: 10, color: T.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center' }}>
            Nutrition per 100g
            <InfoTooltip text="NOVA classifies foods by degree of processing: Group 1 (unprocessed), Group 2 (processed culinary ingredients), Group 3 (processed foods), Group 4 (ultra-processed). Monteiro et al., Food Science and Nutrition, 2019." />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            {[
              ['Energy', `${Math.round(product.energy_kcal_100g || 0)} kcal`],
              ['Fat', `${(product.fat_100g || 0).toFixed(1)}g`],
              ['Saturated', `${(product.saturated_fat_100g || 0).toFixed(1)}g`],
              ['Carbs', `${(product.carbohydrates_100g || 0).toFixed(1)}g`],
              ['Sugars', `${(product.sugars_100g || 0).toFixed(1)}g`],
              ['Fiber', `${(product.fiber_100g || 0).toFixed(1)}g`],
              ['Protein', `${(product.proteins_100g || 0).toFixed(1)}g`],
              ['Salt', `${(product.salt_100g || 0).toFixed(1)}g`],
            ].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: `1px solid ${T.line}`, fontSize: 11, fontFamily: T.mono }}>
                <span style={{ color: T.muted }}>{label}</span>
                <span style={{ color: T.text }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 10, marginBottom: 12, overflow: 'hidden' }}>
        <button onClick={() => setShowAdvanced(!showAdvanced)} style={{
          width: '100%', padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontFamily: T.mono, fontSize: 10, color: T.muted, letterSpacing: 1.2, textTransform: 'uppercase',
        }}>
          <span>🔬 Advanced metrics · model feature importance</span>
          <span style={{ fontSize: 14, transition: 'transform 0.2s', transform: showAdvanced ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
        </button>
        {showAdvanced && (
          <div style={{ padding: '0 14px 14px', display: 'grid', gridTemplateColumns: narrow ? '1fr' : '1fr 1fr', gap: 12 }}>
            <FeatureImportancePanel modelInfo={modelInfo?.eco} kind="eco" />
            <FeatureImportancePanel modelInfo={modelInfo?.health} kind="health" />
          </div>
        )}
      </div>

      {alts && (
        <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : '1fr 1fr', gap: 12 }}>
          {[
            { kind: 'health', label: 'Healthier alternative', items: alts.better_for_you, c: T.health },
            { kind: 'eco', label: 'Greener alternative', items: alts.better_for_planet, c: T.eco },
          ].map(({ kind, label, items, c }) => (
            <div key={kind} style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 10, padding: 14, borderTop: `2px solid ${c}` }}>
              <div style={{ fontFamily: T.mono, fontSize: 10, color: c, letterSpacing: 1.2, textTransform: 'uppercase' }}>{label}</div>
              {items?.slice(0, 1).map(alt => (
                <div key={alt.product.code}>
                  <div onClick={() => nav(`/product/${alt.product.code}`)}
                    style={{ display: 'flex', gap: 12, marginTop: 10, cursor: 'pointer' }}>
                    <div style={{ width: 70, flexShrink: 0 }}>
                      <ProductImage url={alt.product.image_url} height={70} rounded={6} categories={alt.product.categories} name={alt.product.product_name} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{alt.product.product_name}</div>
                      <div style={{ fontFamily: T.mono, fontSize: 11, color: T.muted, marginTop: 4 }}>{alt.product.brands}</div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                        <NSBadge grade={kind === 'health' ? alt.product.health_grade : alt.product.eco_grade} size="sm" kind={kind === 'health' ? 'nutri' : 'eco'} />
                      </div>
                    </div>
                  </div>
                  {alt.comparison && (
                    <div style={{ marginTop: 12, fontFamily: T.mono, fontSize: 11, color: T.muted, lineHeight: 1.7 }}>
                      {kind === 'health' ? (
                        <>
                          <div>sat fat · <span style={{ color: alt.comparison.sat_fat_diff > 0 ? T.eco : T.warn }}>{Math.abs(alt.comparison.sat_fat_diff).toFixed(1)}g {alt.comparison.sat_fat_diff > 0 ? 'less' : 'more'}</span></div>
                          <div>sugars · <span style={{ color: alt.comparison.sugars_diff > 0 ? T.eco : T.warn }}>{Math.abs(alt.comparison.sugars_diff).toFixed(1)}g {alt.comparison.sugars_diff > 0 ? 'less' : 'more'}</span></div>
                          <div>protein · <span style={{ color: alt.comparison.protein_diff > 0 ? T.eco : T.warn }}>{Math.abs(alt.comparison.protein_diff).toFixed(1)}g {alt.comparison.protein_diff > 0 ? 'more' : 'less'}</span></div>
                        </>
                      ) : (
                        <>
                          <div>packaging · <span style={{ color: T.text }}>{alt.comparison.packaging}</span> (was {alt.comparison.packaging_was})
                            {alt.comparison.pkg_diff !== 0 && <span style={{ color: alt.comparison.pkg_diff > 0 ? T.eco : '#E63E11', marginLeft: 6 }}>{alt.comparison.pkg_diff > 0 ? '+' : ''}{alt.comparison.pkg_diff}</span>}
                          </div>
                          <div>processing · NOVA <span style={{ color: alt.comparison.nova < alt.comparison.nova_was ? T.eco : '#E63E11' }}>{Math.round(alt.comparison.nova)}</span> (was {Math.round(alt.comparison.nova_was)})
                            {alt.comparison.proc_diff !== 0 && <span style={{ color: alt.comparison.proc_diff > 0 ? T.eco : '#E63E11', marginLeft: 6 }}>{alt.comparison.proc_diff > 0 ? '+' : ''}{alt.comparison.proc_diff}</span>}
                          </div>
                          <div>eco labels · <span style={{ color: T.text }}>{alt.comparison.labels || '—'}</span>
                            {alt.comparison.lbl_diff !== 0 && <span style={{ color: alt.comparison.lbl_diff > 0 ? T.eco : '#E63E11', marginLeft: 6 }}>{alt.comparison.lbl_diff > 0 ? '+' : ''}{alt.comparison.lbl_diff}</span>}
                          </div>
                          <div>origin · <span style={{ color: T.text }}>{alt.comparison.origins || '—'}</span>
                            {alt.comparison.orig_diff !== 0 && <span style={{ color: alt.comparison.orig_diff > 0 ? T.eco : '#E63E11', marginLeft: 6 }}>{alt.comparison.orig_diff > 0 ? '+' : ''}{alt.comparison.orig_diff}</span>}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {(!items || items.length === 0) && (
                <div style={{ padding: '20px 0', color: T.muted, fontFamily: T.mono, fontSize: 11 }}>No alternatives found</div>
              )}
            </div>
          ))}
        </div>
      )}

      {alts && alts.cheaper?.length > 0 && (
        <div style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 10, padding: 14, marginTop: 12, borderTop: '2px solid #287D3C' }}>
          <div style={{ fontFamily: T.mono, fontSize: 10, color: '#287D3C', letterSpacing: 1.2, textTransform: 'uppercase' }}>Cheaper alternative</div>
          {alts.cheaper.slice(0, 1).map(alt => (
            <div key={alt.product.code}>
              <div onClick={() => nav(`/product/${alt.product.code}`)}
                style={{ display: 'flex', gap: 12, marginTop: 10, cursor: 'pointer' }}>
                <div style={{ width: 70, flexShrink: 0 }}>
                  <ProductImage url={alt.product.image_url} height={70} rounded={6} categories={alt.product.categories} name={alt.product.product_name} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{alt.product.product_name}</div>
                  <div style={{ fontFamily: T.mono, fontSize: 11, color: T.muted, marginTop: 4 }}>{alt.product.brands}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <PriceBadge tier={alt.product.price_tier} price={alt.product.estimated_price} />
                    <NSBadge grade={alt.product.health_grade} size="sm" />
                  </div>
                </div>
              </div>
              {alt.comparison && (
                <div style={{ marginTop: 12, fontFamily: T.mono, fontSize: 11, color: T.muted, lineHeight: 1.7 }}>
                  <div>price · <span style={{ color: '#287D3C' }}>€{alt.comparison.estimated_price?.toFixed(2)}</span> (was €{alt.comparison.estimated_price_was?.toFixed(2)}) — <span style={{ color: '#287D3C', fontWeight: 700 }}>save €{alt.comparison.saving?.toFixed(2)}</span></div>
                  <div>health · <span style={{ color: alt.comparison.health_diff >= 0 ? T.eco : T.warn }}>{alt.comparison.health_diff >= 0 ? '+' : ''}{alt.comparison.health_diff?.toFixed(1)}</span></div>
                  <div>eco · <span style={{ color: alt.comparison.eco_diff >= 0 ? T.eco : T.warn }}>{alt.comparison.eco_diff >= 0 ? '+' : ''}{alt.comparison.eco_diff?.toFixed(1)}</span></div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {alts && alts.better_for_you?.[0] && (
        <div style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 10, padding: 14, marginTop: 12, borderTop: `2px solid ${T.warn}` }}>
          <div style={{ fontFamily: T.mono, fontSize: 10, color: T.warn, letterSpacing: 1.2, textTransform: 'uppercase' }}>
            What-If Simulation · 30 servings/month
          </div>
          <p style={{ fontSize: 11, color: T.muted, margin: '8px 0 12px', lineHeight: 1.5 }}>
            If you replaced <strong style={{ color: T.text }}>{product.product_name}</strong> with <strong style={{ color: T.text }}>{alts.better_for_you[0].product.product_name}</strong> for 30 servings/month (100g each):
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: narrow ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 8 }}>
            {[
              { l: 'Sat. fat saved/mo', v: ((alts.better_for_you[0].comparison?.sat_fat_diff || 0) * 30), u: 'g', good: true },
              { l: 'Sugar saved/mo', v: ((alts.better_for_you[0].comparison?.sugars_diff || 0) * 30), u: 'g', good: true },
              { l: 'Protein Δ/mo', v: ((alts.better_for_you[0].comparison?.protein_diff || 0) * 30), u: 'g', good: true },
              { l: 'Health score Δ', v: (alts.better_for_you[0].score_diff), u: ' pts', good: true },
            ].map(item => (
              <div key={item.l} style={{ padding: 10, background: T.panel2, borderRadius: 8 }}>
                <div style={{ fontFamily: T.mono, fontSize: 9, color: T.muted, letterSpacing: 0.5, textTransform: 'uppercase' }}>{item.l}</div>
                <div style={{ fontFamily: T.mono, fontSize: 18, fontWeight: 700, color: item.v > 0 ? T.eco : item.v < 0 ? T.warn : T.muted, marginTop: 4 }}>
                  {item.v > 0 ? '+' : ''}{item.v.toFixed(0)}{item.u}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
