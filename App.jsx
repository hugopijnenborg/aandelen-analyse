import { useState } from 'react'
import ReactMarkdown from 'react-markdown'

const WEBHOOK = 'https://hugop123.app.n8n.cloud/webhook/aandelen-analyse'

const METRICS = [
  { key: 'pe_ratio',                label: 'P/E Ratio',       suffix: 'x',  desc: 'Koers / winst' },
  { key: 'eps',                     label: 'EPS',             suffix: '',   desc: 'Winst per aandeel' },
  { key: 'debt_to_equity',          label: 'Debt / Equity',   suffix: 'x',  desc: 'Schuld verhouding' },
  { key: 'roe_percent',             label: 'ROE',             suffix: '%',  desc: 'Rendement eigen vermogen' },
  { key: 'profit_margin_percent',   label: 'Profit Margin',   suffix: '%',  desc: 'Netto winstmarge' },
  { key: 'revenue_growth_percent',  label: 'Revenue Growth',  suffix: '%',  desc: 'Omzetgroei' },
  { key: 'free_cash_flow_per_share',label: 'FCF / Aandeel',   suffix: '',   desc: 'Vrije kasstroom' },
]

function scoreColor(key, value) {
  if (value === null) return '#6b6b80'
  if (key === 'pe_ratio') return value < 20 ? '#22c55e' : value < 35 ? '#eab308' : '#ef4444'
  if (key === 'debt_to_equity') return value < 0.5 ? '#22c55e' : value < 1.0 ? '#eab308' : '#ef4444'
  if (key === 'roe_percent') return value > 20 ? '#22c55e' : value > 10 ? '#eab308' : '#ef4444'
  if (key === 'profit_margin_percent') return value > 15 ? '#22c55e' : value > 5 ? '#eab308' : '#ef4444'
  if (key === 'revenue_growth_percent') return value > 10 ? '#22c55e' : value > 3 ? '#eab308' : '#ef4444'
  if (key === 'eps') return value > 3 ? '#22c55e' : value > 0 ? '#eab308' : '#ef4444'
  if (key === 'free_cash_flow_per_share') return value > 3 ? '#22c55e' : value > 0 ? '#eab308' : '#ef4444'
  return '#6b6b80'
}

export default function App() {
  const [ticker, setTicker] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  async function analyseer() {
    if (!ticker.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch(WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: ticker.trim().toUpperCase() }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setResult(data)
    } catch (e) {
      setError('Er ging iets mis. Controleer de ticker en probeer opnieuw.')
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setResult(null)
    setTicker('')
    setError(null)
  }

  if (result) return <ResultPage result={result} onReset={reset} />

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <div style={styles.badge}>AI-Powered</div>
        <h1 style={styles.title}>Aandelen<span style={{ color: '#f97316' }}>Analyse</span></h1>
        <p style={styles.sub}>Voer een ticker in en krijg direct een volledige fundamentele analyse op basis van 7 financiële metrics.</p>

        <div style={styles.searchBox}>
          <input
            style={styles.input}
            type="text"
            placeholder="Bijv. AAPL, MSFT, ADSK..."
            value={ticker}
            onChange={e => setTicker(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && analyseer()}
            disabled={loading}
            autoFocus
          />
          <button style={styles.btn} onClick={analyseer} disabled={loading || !ticker.trim()}>
            {loading ? <Spinner /> : 'Analyseer'}
          </button>
        </div>

        {error && <p style={styles.error}>{error}</p>}

        {loading && (
          <div style={styles.loadingBox}>
            <Spinner large />
            <p style={{ color: '#6b6b80', marginTop: 12 }}>Data ophalen en analyseren...</p>
          </div>
        )}

        <div style={styles.metricLabels}>
          {METRICS.map(m => (
            <span key={m.key} style={styles.metricLabel}>{m.label}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

function ResultPage({ result, onReset }) {
  const { ticker, analyse, raw_data } = result

  return (
    <div style={styles.resultPage}>
      <header style={styles.header}>
        <div>
          <div style={styles.badge}>Analyse resultaat</div>
          <h2 style={styles.tickerTitle}>{ticker}</h2>
        </div>
        <button style={styles.backBtn} onClick={onReset}>← Nieuw aandeel</button>
      </header>

      <div style={styles.grid}>
        {METRICS.map(m => {
          const val = raw_data?.[m.key]
          const color = scoreColor(m.key, val)
          return (
            <div key={m.key} style={{ ...styles.card, borderTopColor: color }}>
              <div style={styles.cardLabel}>{m.label}</div>
              <div style={{ ...styles.cardValue, color }}>
                {val !== null && val !== undefined ? `${val}${m.suffix}` : '—'}
              </div>
              <div style={styles.cardDesc}>{m.desc}</div>
            </div>
          )
        })}
      </div>

      <div style={styles.analyseBox}>
        <div style={styles.analyseHeader}>AI Beoordeling</div>
        <div style={styles.markdown}>
          <ReactMarkdown>{analyse}</ReactMarkdown>
        </div>
      </div>
    </div>
  )
}

function Spinner({ large }) {
  return (
    <div style={{
      width: large ? 32 : 18,
      height: large ? 32 : 18,
      border: `2px solid #333`,
      borderTop: `2px solid #f97316`,
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
      display: 'inline-block',
    }} />
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    background: 'radial-gradient(ellipse at 50% 0%, #1a0f00 0%, #0a0a0f 60%)',
  },
  hero: {
    maxWidth: 600,
    width: '100%',
    textAlign: 'center',
  },
  badge: {
    display: 'inline-block',
    background: '#1a1010',
    border: '1px solid #3a1a00',
    color: '#f97316',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    padding: '4px 12px',
    borderRadius: 20,
    marginBottom: 20,
  },
  title: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 'clamp(2rem, 6vw, 3.5rem)',
    fontWeight: 700,
    letterSpacing: '-0.02em',
    lineHeight: 1.1,
    marginBottom: 16,
    color: '#e8e8f0',
  },
  sub: {
    color: '#6b6b80',
    fontSize: 16,
    lineHeight: 1.6,
    marginBottom: 36,
    maxWidth: 480,
    margin: '0 auto 36px',
  },
  searchBox: {
    display: 'flex',
    gap: 10,
    background: '#111118',
    border: '1px solid #1e1e2e',
    borderRadius: 12,
    padding: 8,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#e8e8f0',
    fontSize: 18,
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 600,
    letterSpacing: '0.05em',
    padding: '8px 12px',
  },
  btn: {
    background: '#f97316',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '10px 24px',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    whiteSpace: 'nowrap',
  },
  error: {
    color: '#ef4444',
    fontSize: 14,
    marginTop: 8,
  },
  loadingBox: {
    marginTop: 32,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  metricLabels: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginTop: 40,
  },
  metricLabel: {
    background: '#111118',
    border: '1px solid #1e1e2e',
    color: '#6b6b80',
    fontSize: 11,
    padding: '4px 10px',
    borderRadius: 6,
  },
  resultPage: {
    maxWidth: 900,
    margin: '0 auto',
    padding: '2rem',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 32,
    paddingBottom: 24,
    borderBottom: '1px solid #1e1e2e',
  },
  tickerTitle: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
    fontWeight: 700,
    color: '#e8e8f0',
    marginTop: 8,
  },
  backBtn: {
    background: 'transparent',
    border: '1px solid #1e1e2e',
    color: '#6b6b80',
    padding: '8px 16px',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
    transition: 'border-color 0.2s, color 0.2s',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: 12,
    marginBottom: 32,
  },
  card: {
    background: '#111118',
    border: '1px solid #1e1e2e',
    borderTop: '3px solid',
    borderRadius: 10,
    padding: '16px 18px',
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#6b6b80',
    marginBottom: 8,
  },
  cardValue: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 11,
    color: '#6b6b80',
  },
  analyseBox: {
    background: '#111118',
    border: '1px solid #1e1e2e',
    borderRadius: 12,
    padding: '28px 32px',
  },
  analyseHeader: {
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: '#f97316',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottom: '1px solid #1e1e2e',
  },
  markdown: {
    color: '#c8c8d8',
    fontSize: 15,
    lineHeight: 1.8,
  },
}

// Spinner keyframe via style tag
const styleEl = document.createElement('style')
styleEl.textContent = `
  @keyframes spin { to { transform: rotate(360deg); } }
  .markdown h1, .markdown h2, .markdown h3 { color: #e8e8f0; margin: 1.2em 0 0.4em; font-family: 'Space Grotesk', sans-serif; }
  .markdown p { margin-bottom: 0.8em; }
  .markdown strong { color: #e8e8f0; }
  .markdown hr { border: none; border-top: 1px solid #1e1e2e; margin: 1.5em 0; }
  .markdown ul, .markdown ol { padding-left: 1.4em; margin-bottom: 0.8em; }
  button:hover { opacity: 0.85; }
`
document.head.appendChild(styleEl)
