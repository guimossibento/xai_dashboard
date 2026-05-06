import { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { PrioritySlider } from './components';
import { useNarrow } from './useNarrow';
import { T } from './theme';
import Landing from './pages/Landing';
import Results from './pages/Results';
import Detail from './pages/Detail';
import Compare from './pages/Compare';

const NAV = [
  { path: '/', label: 'Discover', icon: '⌂' },
  { path: '/results', label: 'Catalog', icon: '≡' },
  { path: '/compare', label: 'Compare', icon: '⇄' },
];

function Layout() {
  const [weight, setWeight] = useState(0.5);
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [compareCodes, setCompareCodes] = useState([]);
  const narrow = useNarrow();

  const toggleCompare = (code) => {
    setCompareCodes(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : prev.length < 4 ? [...prev, code] : prev
    );
  };

  const compareProps = { compareCodes, toggleCompare };

  const Logo = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 26, height: 26, borderRadius: 6, background: 'linear-gradient(135deg, #1D9E75, #378ADD)' }} />
      <div style={{ fontWeight: 800, fontSize: 14, color: T.text, letterSpacing: -0.3 }}>GreenFind</div>
      <div style={{ fontFamily: T.mono, fontSize: 9, color: T.muted, letterSpacing: 1 }}>PRO</div>
    </div>
  );

  const NavItem = ({ n }) => (
    <NavLink key={n.path} to={n.path} end={n.path === '/'} onClick={() => setMenuOpen(false)}
      style={({ isActive }) => ({
        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 6,
        border: 'none', background: isActive ? T.panel2 : 'transparent',
        color: isActive ? T.text : T.muted, textDecoration: 'none',
        fontSize: 13, fontWeight: 600, fontFamily: T.sans, marginBottom: 2,
      })}>
      <span style={{ fontFamily: T.mono, fontSize: 13 }}>{n.icon}</span>
      {n.label}
      {n.path === '/compare' && compareCodes.length > 0 && (
        <span style={{ marginLeft: 'auto', background: T.eco, color: '#fff', borderRadius: 10,
          padding: '1px 6px', fontSize: 10, fontFamily: T.mono, fontWeight: 700 }}>
          {compareCodes.length}
        </span>
      )}
    </NavLink>
  );

  const routes = (
    <Routes>
      <Route path="/" element={<Landing weight={weight} />} />
      <Route path="/results" element={<Results weight={weight} {...compareProps} />} />
      <Route path="/product/:code" element={<Detail weight={weight} {...compareProps} />} />
      <Route path="/compare" element={<Compare weight={weight} {...compareProps} />} />
    </Routes>
  );

  if (narrow) {
    return (
      <div style={{ background: T.bg, minHeight: '100vh', color: T.text, fontFamily: T.sans, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
          background: T.panel, borderBottom: `1px solid ${T.line}`, position: 'sticky', top: 0, zIndex: 5 }}>
          <button onClick={() => setMenuOpen(v => !v)}
            style={{ background: T.panel2, border: `1px solid ${T.line}`, width: 34, height: 34, borderRadius: 8,
              color: T.text, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {menuOpen ? '×' : '≡'}
          </button>
          <Logo />
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8,
            background: T.panel2, border: `1px solid ${T.line}`, borderRadius: 8, padding: '6px 10px' }}>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="search…"
              onKeyDown={e => { if (e.key === 'Enter') { navigate(`/results?q=${query}`); setMenuOpen(false); } }}
              style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none',
                color: T.text, fontSize: 13, fontFamily: T.sans }} />
          </div>
        </div>

        {menuOpen && (
          <div style={{ position: 'absolute', top: 58, left: 8, right: 8, zIndex: 10,
            background: T.panel, border: `1px solid ${T.line}`, borderRadius: 10,
            padding: 12, boxShadow: '0 10px 30px rgba(28,28,25,.12)' }}>
            {NAV.map(n => <NavItem key={n.path} n={n} />)}
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.line}`,
              fontFamily: T.mono, fontSize: 9, color: T.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>
              Priority mix
            </div>
            <PrioritySlider value={weight} onChange={setWeight} />
          </div>
        )}

        <main style={{ minWidth: 0 }}>{routes}</main>
      </div>
    );
  }

  return (
    <div style={{ background: T.bg, minHeight: '100vh', color: T.text, fontFamily: T.sans, display: 'flex' }}>
      <aside style={{
        width: 200, flex: '0 0 200px', background: T.panel, borderRight: `1px solid ${T.line}`,
        display: 'flex', flexDirection: 'column', padding: '20px 14px', position: 'sticky', top: 0, height: '100vh',
      }}>
        <div style={{ marginBottom: 24 }}><Logo /></div>

        <div style={{ fontFamily: T.mono, fontSize: 9, color: T.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>Workspace</div>
        {NAV.map(n => <NavItem key={n.path} n={n} />)}

        <div style={{ marginTop: 24, fontFamily: T.mono, fontSize: 9, color: T.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>
          Priority mix
        </div>
        <PrioritySlider value={weight} onChange={setWeight} />

        <div style={{ marginTop: 20 }}>
          <div style={{ fontFamily: T.mono, fontSize: 9, color: T.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>Quick search</div>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="search…"
            onKeyDown={e => e.key === 'Enter' && navigate(`/results?q=${query}`)}
            style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: `1px solid ${T.line}`, background: T.panel2,
              fontSize: 11, fontFamily: T.sans, color: T.text, outline: 'none', boxSizing: 'border-box' }} />
        </div>

        <div style={{ flex: 1 }} />
        <div style={{ padding: '10px 12px', background: T.panel2, borderRadius: 8, fontFamily: T.mono, fontSize: 10, color: T.muted, lineHeight: 1.6 }}>
          <div>DATASET · 84,645</div>
          <div>SCHEMA · OFF v2</div>
          <div style={{ color: T.eco }}>● live</div>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0 }}>{routes}</main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}
