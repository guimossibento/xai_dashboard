import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine, Cell, ResponsiveContainer, Tooltip,
  RadarChart as RChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { T } from './theme';

const NUTRI_COLORS = { a: '#287D3C', b: '#85BB2F', c: '#C8960C', d: '#EE8100', e: '#E63E11' };

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
  const LABELS = { fat: 'Low kcal', saturated_fat: 'Low sat. fat', sugars: 'Low sugar', salt: 'Low salt', fiber: 'Fiber', proteins: 'Protein' };
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
  const dimKeys = ['eco_packaging', 'eco_processing', 'eco_labels', 'eco_origins'];
  const data = dims.map((dim, di) => {
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
  const icon = positive ? '●' : '●';
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

export function ProductImage({ url, height = 100, rounded = 6, categories }) {
  const [err, setErr] = useState(false);
  if (!url || err) {
    const label = getCatLabel(categories);
    return (
      <div style={{ width: '100%', height, borderRadius: rounded, background: getCatGradient(label),
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: T.mono, fontSize: 10, color: '#fff', letterSpacing: 1.2, textTransform: 'uppercase',
          textShadow: '0 1px 3px rgba(0,0,0,.15)', fontWeight: 600 }}>{label}</span>
      </div>
    );
  }
  return <img src={url} alt="" onError={() => setErr(true)}
    style={{ width: '100%', height, objectFit: 'contain', borderRadius: rounded, background: T.panel2 }} />;
}
