import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine, Cell, ResponsiveContainer, Tooltip,
  RadarChart as RChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { T } from './theme';

const NUTRI_COLORS = { a: '#287D3C', b: '#85BB2F', c: '#C8960C', d: '#EE8100', e: '#E63E11' };
const PRICE_COLORS = { 1: '#287D3C', 2: '#C8960C', 3: '#E63E11' };
const PRICE_LABELS = { 1: '€', 2: '€€', 3: '€€€' };
const TASTE_COLORS = {
  Earthy: '#6D4C41', Nutty: '#8D6E63', Roasted: '#4E342E', Smoky: '#5D4037',
  Herbal: '#558B2F', Tangy: '#F9A825', Citrusy: '#F57F17', Sweet: '#E91E63',
  Rich: '#6A1B9A', Fresh: '#00897B', Fruity: '#7CB342', Spicy: '#D32F2F',
  Briny: '#0277BD', Savory: '#FF6F00', Mild: '#78909C', Creamy: '#AB47BC',
  Bitter: '#4E342E',
};

const CAT_GRADIENTS = {
  dairy: 'linear-gradient(135deg, #d4c89a 0%, #c4b87a 100%)',
  cereals: 'linear-gradient(135deg, #c8bc8a 0%, #b8a870 100%)',
  snacks: 'linear-gradient(135deg, #ccc494 0%, #b8b070 100%)',
  oils: 'linear-gradient(135deg, #b8bc80 0%, #a8ac68 100%)',
  beverages: 'linear-gradient(135deg, #9cb898 0%, #88a880 100%)',
  'plant-based': 'linear-gradient(135deg, #a0b880 0%, #8ca868 100%)',
  'fruits & vegetables': 'linear-gradient(135deg, #98c090 0%, #80b070 100%)',
  default: 'linear-gradient(135deg, #c8c4a8 0%, #b4b090 100%)',
};

function getCatLabel(categories) {
  if (!categories) return 'FOOD';
  const c = categories.toLowerCase();
  if (c.includes('dairy') || c.includes('lácteo') || c.includes('yogur') || c.includes('leche')) return 'DAIRY';
  if (c.includes('cereal') || c.includes('pan ') || c.includes('bread')) return 'CEREALS';
  if (c.includes('snack') || c.includes('patatas') || c.includes('galleta') || c.includes('chip')) return 'SNACKS';
  if (c.includes('oil') || c.includes('aceite') || c.includes('oliva')) return 'OILS';
  if (c.includes('beverage') || c.includes('drink') || c.includes('bebida') || c.includes('juice') || c.includes('zumo')) return 'BEVERAGES';
  if (c.includes('plant') || c.includes('tofu') || c.includes('seitán') || c.includes('vegan') || c.includes('soja')) return 'PLANT-BASED';
  if (c.includes('fruit') || c.includes('vegetable') || c.includes('fruta') || c.includes('verdura')) return 'FRUITS & VEG';
  if (c.includes('meat') || c.includes('carne') || c.includes('pollo') || c.includes('jamón')) return 'MEAT';
  if (c.includes('fish') || c.includes('pescado') || c.includes('atún') || c.includes('marisco')) return 'SEAFOOD';
  return 'FOOD';
}

function getCatGradient(label) {
  return CAT_GRADIENTS[label.toLowerCase()] || CAT_GRADIENTS.default;
}

export function PriceBadge({ tier, price }) {
  if (!tier && !price) return null;
  const color = PRICE_COLORS[tier] || PRICE_COLORS[2];
  const label = price ? `€${Number(price).toFixed(2)}` : (PRICE_LABELS[tier] || '€€');
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 999,
      background: `${color}14`, border: `1px solid ${color}40`,
      fontFamily: T.mono, fontSize: 11, fontWeight: 700, color, whiteSpace: 'nowrap',
    }}>{label}</span>
  );
}

export function AnimalWelfareBadge({ score, labels }) {
  if (score === null || score === undefined) return null;
  if (score === -1) return (
    <span title="Plant-based or non-animal product" style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999,
      background: '#287D3C14', border: '1px solid #287D3C40', whiteSpace: 'nowrap',
    }}>
      <span style={{ fontSize: 12 }}>🌱</span>
      <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 600, color: '#287D3C' }}>Plant</span>
    </span>
  );
  if (score === 0) return (
    <span title="Conventional animal product — no welfare certifications found" style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999,
      background: '#9E9E9E14', border: '1px solid #9E9E9E40', whiteSpace: 'nowrap',
    }}>
      <span style={{ fontSize: 12 }}>🐾</span>
      <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 600, color: '#9E9E9E' }}>Standard</span>
    </span>
  );
  const levels = { 1: 'Basic', 2: 'Good', 3: 'High' };
  const colors = { 1: '#C8960C', 2: '#85BB2F', 3: '#287D3C' };
  const color = colors[score] || colors[1];
  return (
    <span title={labels || ''} style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999,
      background: `${color}14`, border: `1px solid ${color}40`, whiteSpace: 'nowrap',
    }}>
      <span style={{ fontSize: 12 }}>🐾</span>
      <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 600, color }}>{levels[score]}</span>
    </span>
  );
}

export function TasteTags({ tags }) {
  if (!tags) return null;
  const list = tags.split(',').filter(Boolean);
  if (!list.length) return null;
  return (
    <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
      {list.map(tag => (
        <span key={tag} style={{
          padding: '1px 7px', borderRadius: 999, fontSize: 9, fontFamily: T.mono, fontWeight: 600,
          background: `${TASTE_COLORS[tag] || '#666'}18`, color: TASTE_COLORS[tag] || '#666',
          border: `1px solid ${TASTE_COLORS[tag] || '#666'}30`,
        }}>{tag}</span>
      ))}
    </span>
  );
}

export function InfoTooltip({ text }) {
  const [show, setShow] = useState(false);
  const [style, setStyle] = useState({});
  const open = (el) => {
    setShow(true);
    const rect = el.getBoundingClientRect();
    const tipW = 260;
    let left = rect.left + rect.width / 2 - tipW / 2;
    if (left < 8) left = 8;
    if (left + tipW > window.innerWidth - 8) left = window.innerWidth - tipW - 8;
    const above = rect.top > 200;
    setStyle({
      position: 'fixed',
      left,
      [above ? 'bottom' : 'top']: above ? window.innerHeight - rect.top + 6 : rect.bottom + 6,
      width: tipW,
    });
  };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 4 }}>
      <span role="button" tabIndex={0} aria-label={text}
        onMouseEnter={e => open(e.currentTarget)} onMouseLeave={() => setShow(false)}
        onFocus={e => open(e.currentTarget)} onBlur={() => setShow(false)}
        style={{ width: 14, height: 14, borderRadius: '50%', background: `${T.muted}20`, color: T.muted,
          fontSize: 9, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'help' }}>ⓘ</span>
      {show && (
        <span role="tooltip" style={{
          ...style, padding: '8px 10px', borderRadius: 6, background: T.panel, border: `1px solid ${T.line}`,
          boxShadow: '0 4px 16px rgba(0,0,0,.12)', fontSize: 10, fontFamily: T.sans, color: T.text,
          lineHeight: 1.5, zIndex: 9999, pointerEvents: 'none',
        }}>{text}</span>
      )}
    </span>
  );
}

export function NSBadge({ grade, kind = 'nutri', size = 'md' }) {
  if (!grade) return null;
  const g = grade.toLowerCase();
  const color = NUTRI_COLORS[g] || '#888';
  const label = kind === 'eco' ? 'Eco' : 'Nutri';
  const circleSize = size === 'sm' ? 14 : 16;
  const fontSize = size === 'sm' ? 8 : 10;
  const labelSize = size === 'sm' ? 8 : 9;
  const pad = size === 'sm' ? '2px 6px' : '3px 8px';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: pad, borderRadius: 999,
      background: `${color}14`, border: `1px solid ${color}40`,
      whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: circleSize, height: circleSize, borderRadius: '50%',
        background: color, color: '#fff',
        fontSize, fontWeight: 800,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>{g.toUpperCase()}</span>
      <span style={{
        fontFamily: T.mono, fontSize: labelSize, color,
        fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
      }}>{label}</span>
    </span>
  );
}

export function PrioritySlider({ value, onChange }) {
  const healthPct = Math.round((1 - value) * 100);
  const planetPct = Math.round(value * 100);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontFamily: T.mono, marginBottom: 4 }}>
        <span style={{ color: T.health, fontWeight: 600 }}>Health {healthPct}%</span>
        <span style={{ color: T.eco, fontWeight: 600 }}>Planet {planetPct}%</span>
      </div>
      <div style={{ position: 'relative', height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 2 }}>
        <div style={{ position: 'absolute', inset: 0,
          background: `linear-gradient(to right, ${T.health}, ${T.health}40 ${healthPct}%, ${T.eco}40 ${healthPct}%, ${T.eco})`,
          borderRadius: 3,
        }} />
      </div>
      <input type="range" min="0" max="1" step="0.05" value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: T.eco, marginTop: -2 }} />
    </div>
  );
}

export function RadarChart({ data, size = 260, color = '#378ADD', overlays = [] }) {
  if (!data) return null;
  const LABELS = { fat: 'Low fat', saturated_fat: 'Low sat. fat', sugars: 'Low sugar', salt: 'Low salt', fiber: 'Fiber', proteins: 'Protein' };
  const keys = Object.keys(data);
  const chartData = keys.map(k => ({ axis: LABELS[k] || k.replace('_', ' '), main: data[k] || 0,
    ...overlays.reduce((acc, ov, i) => ({ ...acc, [`ov${i}`]: ov.data?.[k] || 0 }), {}),
  }));
  return (
    <ResponsiveContainer width="100%" height={size}>
      <RChart data={chartData} cx="50%" cy="50%" outerRadius="70%">
        <PolarGrid stroke={T.line} />
        <PolarAngleAxis dataKey="axis" tick={{ fontSize: 9, fill: T.muted, fontFamily: T.mono }} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Radar dataKey="main" stroke={color} fill={color} fillOpacity={0.15} strokeWidth={2} dot={{ r: 3, fill: color }} />
        {overlays.map((ov, i) => (
          <Radar key={i} dataKey={`ov${i}`} stroke={ov.color} fill={ov.color} fillOpacity={0.08} strokeWidth={1.5} dot={false} />
        ))}
      </RChart>
    </ResponsiveContainer>
  );
}

export function EcoBars({ items }) {
  if (!items || !items.length) return null;
  const data = items.map(item => ({
    name: item.label.replace('Processing (NOVA)', 'Processing').replace('Eco labels', 'Labels'),
    value: Math.max(-40, Math.min(40, item.value)),
  }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid horizontal={false} stroke={T.line} />
        <XAxis type="number" domain={[-40, 40]} ticks={[-40, -20, 0, 20, 40]}
          tick={{ fontSize: 10, fontFamily: T.mono, fill: T.muted }}
          axisLine={{ stroke: T.line }} tickLine={{ stroke: '#666' }} />
        <YAxis type="category" dataKey="name" width={90}
          tick={{ fontSize: 12, fontFamily: T.sans, fill: T.text }}
          axisLine={{ stroke: T.line }} tickLine={{ stroke: '#666' }} />
        <ReferenceLine x={0} stroke={T.muted} />
        <Tooltip
          formatter={v => [`${v > 0 ? '+' : ''}${v}`, 'Score']}
          contentStyle={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 6, fontFamily: T.mono, fontSize: 11 }} />
        <Bar dataKey="value" radius={3} barSize={48}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.value >= 0 ? '#1D9E75' : '#E63E11'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function EcoBarsOverlay({ products, colors }) {
  if (!products?.length) return null;
  const dims = ['Packaging', 'Processing', 'Labels', 'Origin'];
  const data = dims.map((dim) => {
    const entry = { name: dim };
    products.forEach((p, pi) => {
      const raw = p.feature_attributions?.eco_breakdown?.find(b =>
        b.label.includes(dim === 'Processing' ? 'Processing' : dim === 'Labels' ? 'labels' : dim)
      );
      entry[`p${pi}`] = raw ? Math.max(-40, Math.min(40, raw.value)) : 0;
    });
    return entry;
  });
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid horizontal={false} stroke={T.line} />
        <XAxis type="number" domain={[-40, 40]} ticks={[-40, -20, 0, 20, 40]}
          tick={{ fontSize: 10, fontFamily: T.mono, fill: T.muted }}
          axisLine={{ stroke: T.line }} tickLine={{ stroke: '#666' }} />
        <YAxis type="category" dataKey="name" width={80}
          tick={{ fontSize: 11, fontFamily: T.sans, fill: T.text }}
          axisLine={{ stroke: T.line }} tickLine={{ stroke: '#666' }} />
        <ReferenceLine x={0} stroke={T.muted} />
        <Tooltip
          formatter={(v, name) => [`${v > 0 ? '+' : ''}${v}`, products[parseInt(name.slice(1))]?.product_name?.slice(0, 20) || name]}
          contentStyle={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 6, fontFamily: T.mono, fontSize: 11 }} />
        {products.map((_, i) => (
          <Bar key={i} dataKey={`p${i}`} fill={colors[i]} fillOpacity={0.75} barSize={12} radius={2} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function EcoFactorCard({ label, value, description }) {
  const positive = value >= 0;
  const icon = positive ? '▲' : '▼';
  return (
    <div style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: `1px solid ${T.line}` }}>
      <div style={{ width: 28, height: 28, borderRadius: 6, background: positive ? `${T.eco}18` : '#E63E1118',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 10, color: positive ? T.eco : '#E63E11' }}>{icon}</span>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{label}</span>
          <span style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 700, color: positive ? T.eco : '#E63E11' }}>
            {value > 0 ? '+' : ''}{value}
          </span>
        </div>
        <p style={{ fontSize: 11, color: T.muted, margin: '3px 0 0', lineHeight: 1.4 }}>{description}</p>
      </div>
    </div>
  );
}

export function EcoRadar({ data, size = 260, color = T.eco, overlays = [] }) {
  if (!data) return null;
  const DIMS = [
    { key: 'eco_packaging', label: 'Packaging' },
    { key: 'eco_processing', label: 'Processing' },
    { key: 'eco_labels', label: 'Labels' },
    { key: 'eco_origins', label: 'Origin' },
  ];
  const normalize = (breakdown) => {
    if (!breakdown) return {};
    const map = {};
    breakdown.forEach(b => {
      const k = b.label.includes('Packaging') ? 'eco_packaging' : b.label.includes('Processing') ? 'eco_processing' : b.label.includes('labels') ? 'eco_labels' : 'eco_origins';
      map[k] = Math.round(((b.value + 40) / 80) * 100);
    });
    return map;
  };
  const main = normalize(data);
  const chartData = DIMS.map(d => ({
    axis: d.label,
    main: main[d.key] || 50,
    ...overlays.reduce((acc, ov, i) => ({ ...acc, [`ov${i}`]: normalize(ov.data)[d.key] || 50 }), {}),
  }));
  return (
    <ResponsiveContainer width="100%" height={size}>
      <RChart data={chartData} cx="50%" cy="50%" outerRadius="70%">
        <PolarGrid stroke={T.line} />
        <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10, fill: T.muted, fontFamily: T.mono }} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Radar dataKey="main" stroke={color} fill={color} fillOpacity={0.18} strokeWidth={2} dot={{ r: 3, fill: color }} />
        {overlays.map((ov, i) => (
          <Radar key={i} dataKey={`ov${i}`} stroke={ov.color} fill={ov.color} fillOpacity={0.08} strokeWidth={1.5} dot={false} />
        ))}
      </RChart>
    </ResponsiveContainer>
  );
}

let leafId = 0;
export function LeafGauge({ score, grade, size = 120 }) {
  const [id] = useState(() => `leaf${leafId++}`);
  const pct = Math.min(100, Math.max(0, score || 0)) / 100;
  const green = '#1D9E75';
  const brown = '#8B6914';
  const color = pct > 0.6 ? green : pct > 0.3 ? T.warn : brown;
  const fillH = Math.round(pct * 80);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg width={size} height={size * 1.25} viewBox="0 0 80 100" style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,.08))' }}>
        <defs>
          <clipPath id={`${id}Clip`}>
            <path d="M40 8 C15 20, 5 45, 12 70 C18 88, 35 95, 40 96 C45 95, 62 88, 68 70 C75 45, 65 20, 40 8Z" />
          </clipPath>
          <linearGradient id={`${id}Fill`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={color} stopOpacity="0.5" />
            <stop offset="100%" stopColor={color} stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <path d="M40 8 C15 20, 5 45, 12 70 C18 88, 35 95, 40 96 C45 95, 62 88, 68 70 C75 45, 65 20, 40 8Z"
          fill={`${color}10`} stroke={`${color}50`} strokeWidth="1.5" />
        <rect x="0" y={100 - fillH} width="80" height={fillH} fill={`url(#${id}Fill)`} clipPath={`url(#${id}Clip)`} />
        <path d="M40 96 L40 30" stroke={`${color}40`} strokeWidth="1" strokeDasharray="2 3" />
        <path d="M40 55 C30 48, 20 52, 15 60" stroke={`${color}30`} strokeWidth="0.8" fill="none" />
        <path d="M40 42 C50 36, 58 40, 63 50" stroke={`${color}30`} strokeWidth="0.8" fill="none" />
        {grade && (
          <text x="40" y="68" textAnchor="middle" fontSize="18" fontWeight="800" fontFamily="monospace" fill={color}>{grade.toUpperCase()}</text>
        )}
        <text x="40" y="82" textAnchor="middle" fontSize="9" fontFamily="monospace" fill={`${color}90`}>{Math.round(score)}/100</text>
      </svg>
      <div style={{ fontFamily: T.mono, fontSize: 9, color: T.muted, letterSpacing: 1, textTransform: 'uppercase' }}>Eco vitality</div>
    </div>
  );
}

const PIPELINE_ICONS = [
  { key: 'Packaging', icon: '📦', label: 'Packaging' },
  { key: 'Processing (NOVA)', icon: '🏭', label: 'Processing' },
  { key: 'Eco labels', icon: '🏷', label: 'Labels' },
  { key: 'Origin', icon: '🌍', label: 'Origin' },
];

export function EcoPipeline({ breakdown, packaging, nova, labels, origins }) {
  if (!breakdown?.length) return null;
  const valMap = {};
  breakdown.forEach(b => { valMap[b.label] = b.value; });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, justifyContent: 'center', flexWrap: 'wrap' }}>
      {PIPELINE_ICONS.map((step, i) => {
        const val = valMap[step.key] || 0;
        const positive = val >= 0;
        const color = positive ? '#1D9E75' : '#E63E11';
        const detail = step.key === 'Packaging' ? packaging
          : step.key === 'Processing (NOVA)' ? (nova ? `NOVA ${Math.round(nova)}` : null)
          : step.key === 'Eco labels' ? (labels ? labels.split(',')[0].trim() : null)
          : origins || null;

        return (
          <div key={step.key} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              padding: '10px 14px', borderRadius: 10,
              background: `${color}08`, border: `1.5px solid ${color}30`,
              minWidth: 72, position: 'relative',
            }}>
              <span style={{ fontSize: 22 }}>{step.icon}</span>
              <span style={{ fontFamily: T.mono, fontSize: 9, color: T.muted, letterSpacing: 0.5 }}>{step.label}</span>
              <span style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 700, color }}>
                {val > 0 ? '+' : ''}{val}
              </span>
              {detail && (
                <span style={{ fontFamily: T.mono, fontSize: 8, color: T.muted, textAlign: 'center', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {detail}
                </span>
              )}
            </div>
            {i < PIPELINE_ICONS.length - 1 && (
              <svg width="20" height="12" viewBox="0 0 20 12" style={{ flexShrink: 0 }}>
                <path d="M2 6 L14 6 M11 2 L15 6 L11 10" stroke={T.muted} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        );
      })}
    </div>
  );
}

const IMPORTANCE_CONFIGS = {
  eco: {
    groupLabels: {
      processing: { icon: '🏭', name: 'Processing (NOVA)' },
      labels: { icon: '🏷', name: 'Eco Labels' },
      packaging: { icon: '📦', name: 'Packaging' },
      origins: { icon: '🌍', name: 'Origin' },
    },
    featLabels: {
      f_nova: 'NOVA group', f_nova_missing: 'NOVA missing', f_pkg_score: 'Packaging recyclability',
      f_pkg_has_plastic: 'Has plastic', f_pkg_has_glass: 'Has glass', f_pkg_has_cardboard: 'Has cardboard',
      f_pkg_has_metal: 'Has metal', f_pkg_missing: 'Packaging missing',
      f_eco_labels_count: 'Eco-cert count', f_diet_labels_count: 'Diet labels', f_quality_labels_count: 'Quality labels',
      f_has_organic: 'Organic', f_has_fairtrade: 'Fair Trade', f_has_fsc: 'FSC certified',
      f_labels_missing: 'Labels missing', f_total_labels: 'Total labels',
      f_origin_score: 'Proximity score', f_origin_missing: 'Origin missing', f_origin_local: 'Local (Spain)', f_origin_eu: 'EU origin',
    },
    groupColors: { processing: '#E67E22', labels: '#27AE60', packaging: '#3498DB', origins: '#9B59B6' },
    groupsKey: 'eco_group_importances', featsKey: 'eco_feature_importances', groupDefsKey: 'eco_feature_groups', r2Key: 'eco_cv_r2',
    fallbackColor: T.eco,
  },
  health: {
    groupLabels: {
      negative_nutrients: { icon: '⚠️', name: 'To limit' },
      positive_nutrients: { icon: '✅', name: 'Beneficial' },
    },
    featLabels: {
      energy_kcal_100g: 'Energy (kcal)', fat_100g: 'Fat', saturated_fat_100g: 'Saturated fat',
      sugars_100g: 'Sugars', salt_100g: 'Salt', fiber_100g: 'Fiber', proteins_100g: 'Proteins',
    },
    groupColors: { negative_nutrients: '#E74C3C', positive_nutrients: '#27AE60' },
    groupsKey: 'health_group_importances', featsKey: 'health_feature_importances', groupDefsKey: 'health_feature_groups', r2Key: 'health_cv_r2',
    fallbackColor: T.health,
  },
};

export function FeatureImportancePanel({ modelInfo, kind = 'eco' }) {
  const [expanded, setExpanded] = useState(null);
  if (!modelInfo) return null;
  const cfg = IMPORTANCE_CONFIGS[kind];
  const groups = modelInfo[cfg.groupsKey] || {};
  const featureImps = modelInfo[cfg.featsKey] || {};
  const featureGroups = modelInfo[cfg.groupDefsKey] || {};
  const sorted = Object.entries(groups).sort((a, b) => b[1] - a[1]);
  const maxVal = Math.max(...sorted.map(([, v]) => v));

  return (
    <div style={{ background: T.panel2, borderRadius: 8, padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontFamily: T.mono, fontSize: 10, color: T.muted, letterSpacing: 1.2, textTransform: 'uppercase' }}>
          Model Feature Importance
        </span>
        <InfoTooltip text="Feature importance is computed using a Gradient Boosted Regression model (Friedman, 2001). The bars show how much each factor contributes to the model's predictions. CV R² indicates cross-validated predictive accuracy." />
        <span style={{ fontFamily: T.mono, fontSize: 9, color: T.muted }}>
          GBR · CV R²={modelInfo[cfg.r2Key]?.toFixed(2)}
        </span>
      </div>
      {sorted.map(([group, imp]) => {
        const pct = (imp * 100).toFixed(1);
        const barW = `${(imp / maxVal) * 100}%`;
        const color = cfg.groupColors[group] || cfg.fallbackColor;
        const meta = cfg.groupLabels[group] || { icon: '?', name: group };
        const isOpen = expanded === group;
        const groupFeats = (featureGroups[group] || [])
          .filter(f => (featureImps[f] || 0) > 0)
          .sort((a, b) => (featureImps[b] || 0) - (featureImps[a] || 0));
        return (
          <div key={group} style={{ marginBottom: 6 }}>
            <div onClick={() => setExpanded(isOpen ? null : group)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '3px 0' }}
              role="button" tabIndex={0} aria-expanded={isOpen} aria-label={`${meta.name} importance ${pct}%`}>
              <span style={{ fontSize: 14, width: 20, textAlign: 'center' }}>{meta.icon}</span>
              <span style={{ fontFamily: T.mono, fontSize: 11, color: T.text, width: 120, flexShrink: 0 }}>{meta.name}</span>
              <div style={{ flex: 1, height: 16, background: T.panel, borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: barW, height: '100%', background: `${color}cc`, borderRadius: 4,
                  transition: 'width 0.6s ease' }} />
              </div>
              <span style={{ fontFamily: T.mono, fontSize: 11, color, fontWeight: 600, width: 48, textAlign: 'right' }}>{pct}%</span>
              <span style={{ fontFamily: T.mono, fontSize: 10, color: T.muted, width: 12 }}>{isOpen ? '▾' : '▸'}</span>
            </div>
            {isOpen && groupFeats.length > 0 && (
              <div style={{ marginLeft: 26, marginTop: 4, marginBottom: 4, paddingLeft: 10, borderLeft: `2px solid ${color}30` }}>
                {groupFeats.map(f => {
                  const fImp = featureImps[f] || 0;
                  const fPct = (fImp * 100).toFixed(1);
                  const fBar = `${(fImp / maxVal) * 100}%`;
                  return (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' }}>
                      <span style={{ fontFamily: T.mono, fontSize: 10, color: T.muted, width: 120, flexShrink: 0 }}>
                        {cfg.featLabels[f] || f}
                      </span>
                      <div style={{ flex: 1, height: 10, background: T.panel, borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: fBar, height: '100%', background: `${color}80`, borderRadius: 3 }} />
                      </div>
                      <span style={{ fontFamily: T.mono, fontSize: 10, color: T.muted, width: 40, textAlign: 'right' }}>{fPct}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ProductImage({ url, height = 100, rounded = 6, categories, name = '' }) {
  const [err, setErr] = useState(false);
  if (!url || err) {
    const label = getCatLabel(categories);
    return (
      <div role="img" aria-label={name || label} style={{ width: '100%', height, borderRadius: rounded, background: getCatGradient(label),
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: T.mono, fontSize: 10, color: '#fff', letterSpacing: 1.2, textTransform: 'uppercase',
          textShadow: '0 1px 3px rgba(0,0,0,.15)', fontWeight: 600 }}>{label}</span>
      </div>
    );
  }
  return <img src={url} alt={name || 'Product image'} onError={() => setErr(true)}
    style={{ width: '100%', height, objectFit: 'contain', borderRadius: rounded, background: T.panel2 }} />;
}
