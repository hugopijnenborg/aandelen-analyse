import { useState } from 'react'
import ReactMarkdown from 'react-markdown'

const WEBHOOK = 'https://hugop123.app.n8n.cloud/webhook/aandelen-analyse'

const METRICS = [
  { key: 'pe_ratio', label: 'P/E Ratio', suffix: 'x', desc: 'Koers / winst per aandeel',
    range: [-20, 60], zones: [0, 15, 25, 35], lager_is_beter: true,
    bandLabels: ['Verlies', '< 15', '15–25', '25–35', '> 35'],
    score: v => v === null ? null : v < 0 ? 5 : v < 15 ? 90 : v < 25 ? 70 : v < 35 ? 50 : v < 50 ? 30 : 15,
    format: v => v === null ? null : v < 0 ? `${v}x (verlies)` : `${v}x` },
  { key: 'peg_ratio', label: 'PEG Ratio', suffix: 'x', desc: 'P/E gedeeld door groeipercentage',
    range: [0, 4], zones: [0.5, 1, 1.5, 2], lager_is_beter: true,
    bandLabels: ['< 0.5', '0.5–1', '1–1.5', '1.5–2', '> 2'],
    score: v => v === null ? null : v < 0 ? 5 : v < 1 ? 90 : v < 1.5 ? 75 : v < 2 ? 55 : v < 3 ? 35 : 15 },
  { key: 'price_to_book', label: 'Price/Book', suffix: 'x', desc: 'Koers / boekwaarde per aandeel',
    range: [0, 15], zones: [1, 3, 6, 10], lager_is_beter: true,
    bandLabels: ['< 1', '1–3', '3–6', '6–10', '> 10'],
    score: v => v === null ? null : v < 1 ? 90 : v < 3 ? 75 : v < 6 ? 55 : v < 10 ? 30 : 15 },
  { key: 'eps', label: 'EPS', suffix: '', desc: 'Winst per aandeel (TTM)',
    range: [-10, 30], zones: [0, 2, 5, 10], lager_is_beter: false,
    bandLabels: ['Negatief', '0–2', '2–5', '5–10', '> 10'],
    score: v => v === null ? null : v > 20 ? 90 : v > 5 ? 75 : v > 0 ? 55 : v > -5 ? 30 : 10 },
  { key: 'debt_to_equity', label: 'Debt / Equity', suffix: 'x', desc: 'Verhouding schuld tot eigen vermogen',
    range: [0, 6], zones: [0.5, 1, 2, 4], lager_is_beter: true,
    bandLabels: ['< 0.5', '0.5–1', '1–2', '2–4', '> 4'],
    score: v => v === null ? null : v < 0.5 ? 90 : v < 1 ? 70 : v < 2 ? 45 : v < 4 ? 25 : 10 },
  { key: 'current_ratio', label: 'Current Ratio', suffix: 'x', desc: 'Vlottende activa / kortlopende schulden',
    range: [0, 4], zones: [0.8, 1, 1.5, 2], lager_is_beter: false,
    bandLabels: ['< 0.8', '0.8–1', '1–1.5', '1.5–2', '> 2'],
    score: v => v === null ? null : v > 2 ? 90 : v > 1.5 ? 75 : v > 1 ? 55 : v > 0.8 ? 30 : 10 },
  { key: 'roe_percent', label: 'ROE', suffix: '%', desc: 'Rendement op eigen vermogen',
    range: [-20, 80], zones: [0, 10, 20, 40], lager_is_beter: false,
    bandLabels: ['Negatief', '0–10%', '10–20%', '20–40%', '> 40%'],
    score: v => v === null ? null : v > 40 ? 90 : v > 20 ? 75 : v > 10 ? 55 : v > 0 ? 35 : 10 },
  { key: 'gross_margin_percent', label: 'Brutomarge', suffix: '%', desc: 'Brutowinstmarge (TTM)',
    range: [0, 90], zones: [10, 25, 40, 60], lager_is_beter: false,
    bandLabels: ['< 10%', '10–25%', '25–40%', '40–60%', '> 60%'],
    score: v => v === null ? null : v > 60 ? 90 : v > 40 ? 75 : v > 25 ? 55 : v > 10 ? 35 : 10 },
  { key: 'profit_margin_percent', label: 'Nettomarge', suffix: '%', desc: 'Netto winstmarge (TTM)',
    range: [-20, 50], zones: [0, 8, 15, 25], lager_is_beter: false,
    bandLabels: ['Negatief', '0–8%', '8–15%', '15–25%', '> 25%'],
    score: v => v === null ? null : v > 25 ? 90 : v > 15 ? 75 : v > 8 ? 55 : v > 0 ? 35 : 10 },
  { key: 'revenue_growth_percent', label: 'Omzetgroei', suffix: '%', desc: 'Jaar-op-jaar omzetgroei',
    range: [-10, 50], zones: [0, 5, 10, 20], lager_is_beter: false,
    bandLabels: ['Negatief', '0–5%', '5–10%', '10–20%', '> 20%'],
    score: v => v === null ? null : v > 20 ? 90 : v > 10 ? 75 : v > 5 ? 55 : v > 0 ? 35 : 10 },
  { key: 'free_cash_flow_billions', label: 'Free Cash Flow', suffix: 'B', desc: 'Vrije kasstroom (TTM, miljarden USD)',
    range: [-10, 40], zones: [0, 1, 5, 20], lager_is_beter: false,
    bandLabels: ['Negatief', '0–1B', '1–5B', '5–20B', '> 20B'],
    score: v => v === null ? null : v > 20 ? 90 : v > 5 ? 75 : v > 0 ? 55 : v > -5 ? 30 : 10 },
]

const ZONE_COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e']

function scoreToLabel(s) {
  if (s === null) return { label: 'N/B', color: '#555566' }
  if (s >= 80) return { label: 'STERK', color: '#22c55e' }
  if (s >= 60) return { label: 'GOED', color: '#84cc16' }
  if (s >= 40) return { label: 'NEUTRAAL', color: '#eab308' }
  if (s >= 20) return { label: 'ZWAK', color: '#f97316' }
  return { label: 'SLECHT', color: '#ef4444' }
}

function valueToPosition(value, range) {
  const [min, max] = range
  const clamped = Math.max(min, Math.min(max, value))
  return ((clamped - min) / (max - min)) * 100
}

function zoneToPercent(zoneVal, range) {
  const [min, max] = range
  return ((zoneVal - min) / (max - min)) * 100
}

const styleEl = document.createElement('style')
styleEl.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Inter:wght@400;500;600&display=swap');
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
  @keyframes markerIn { from { opacity:0; transform:translateX(-50%) scaleY(0) } to { opacity:1; transform:translateX(-50%) scaleY(1) } }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #080b0f; color: #d4d8e0; font-family: 'Inter', sans-serif; }

  .result-page { max-width: 960px; margin: 0 auto; padding: 2rem 1.5rem 4rem; animation: fadeUp 0.4s ease; }
  .result-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; padding-bottom: 1.5rem; border-bottom: 1px solid #1a1f2e; }
  .ticker-eyebrow { font-size: 11px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; color: #f97316; margin-bottom: 6px; }
  .ticker-name { font-family: 'JetBrains Mono', monospace; font-size: clamp(2.4rem, 6vw, 3.8rem); font-weight: 700; color: #fff; letter-spacing: -0.02em; line-height: 1; }
  .back-btn { background: transparent; border: 1px solid #1a1f2e; color: #555566; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; font-family: 'Inter', sans-serif; transition: all 0.15s; white-space: nowrap; }
  .back-btn:hover { border-color: #f97316; color: #f97316; }
  .data-warning { background: #1a0f00; border: 1px solid #f97316; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; color: #f97316; font-size: 13px; line-height: 1.5; }

  /* Markt sectie */
  .market-section { margin-bottom: 2rem; }
  .section-title { font-size: 10px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; color: #555566; margin-bottom: 12px; }
  .market-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: #1a1f2e; border: 1px solid #1a1f2e; border-radius: 10px; overflow: hidden; }
  .market-cell { background: #0d1117; padding: 14px 16px; }
  .market-label { font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #555566; margin-bottom: 6px; }
  .market-value { font-family: 'JetBrains Mono', monospace; font-size: 1.2rem; font-weight: 700; color: #e8eaf0; }
  .market-sub { font-size: 11px; color: #555566; margin-top: 3px; }
  .positive { color: #22c55e; }
  .negative { color: #ef4444; }

  /* 52-week balk */
  .week52-bar { margin-top: 8px; position: relative; }
  .week52-track { height: 6px; background: linear-gradient(to right, #ef4444, #eab308, #22c55e); border-radius: 3px; }
  .week52-marker { position: absolute; top: -3px; transform: translateX(-50%); width: 3px; height: 12px; background: #fff; border-radius: 2px; box-shadow: 0 0 6px rgba(255,255,255,0.5); }

  /* Metrics grid */
  .metrics-section { margin-bottom: 2rem; }
  .metrics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: #1a1f2e; border: 1px solid #1a1f2e; border-radius: 10px; overflow: hidden; }
  .metric-cell { background: #0d1117; padding: 18px 20px 22px; }
  .metric-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
  .metric-label { font-size: 10px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #555566; }
  .metric-badge { font-size: 9px; font-weight: 700; letter-spacing: 0.1em; padding: 2px 7px; border-radius: 3px; text-transform: uppercase; }
  .metric-value { font-family: 'JetBrains Mono', monospace; font-size: 1.7rem; font-weight: 700; line-height: 1; margin-bottom: 4px; word-break: break-word; }
  .metric-desc { font-size: 11px; color: #444455; margin-bottom: 16px; }

  .band-container { position: relative; margin-bottom: 6px; }
  .band-track { display: flex; height: 8px; border-radius: 4px; overflow: hidden; gap: 1px; }
  .band-zone { flex: 1; border-radius: 2px; opacity: 0.35; }
  .band-zone.active { opacity: 1; }
  .band-marker-wrap { position: absolute; top: -3px; transform: translateX(-50%); animation: markerIn 0.4s ease 0.3s both; pointer-events: none; }
  .band-marker { width: 3px; height: 14px; border-radius: 2px; background: #fff; box-shadow: 0 0 6px rgba(255,255,255,0.6); }
  .band-labels { display: flex; justify-content: space-between; margin-top: 5px; }
  .band-label { font-size: 9px; color: #333344; font-family: 'JetBrains Mono', monospace; }
  .band-label.active { color: #888899; }

  .analyse-section { background: #0d1117; border: 1px solid #1a1f2e; border-radius: 10px; overflow: hidden; }
  .analyse-header { padding: 16px 24px; border-bottom: 1px solid #1a1f2e; display: flex; align-items: center; gap: 10px; }
  .analyse-dot { width: 8px; height: 8px; background: #f97316; border-radius: 50%; }
  .analyse-title { font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #f97316; }
  .analyse-body { padding: 28px 24px; }
  .analyse-body h1, .analyse-body h2, .analyse-body h3 { font-weight: 600; color: #e8eaf0; margin: 1.4em 0 0.5em; font-size: 1rem; }
  .analyse-body h1:first-child, .analyse-body h2:first-child { margin-top: 0; font-size: 1.1rem; }
  .analyse-body p { color: #8892a4; font-size: 14px; line-height: 1.75; margin-bottom: 0.8em; }
  .analyse-body strong { color: #c8d0e0; }
  .analyse-body ul, .analyse-body ol { padding-left: 1.4em; margin-bottom: 0.8em; }
  .analyse-body li { color: #8892a4; font-size: 14px; line-height: 1.75; }
  .analyse-body hr { border: none; border-top: 1px solid #1a1f2e; margin: 1.5em 0; }

  .search-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 2rem; background: radial-gradient(ellipse 80% 60% at 50% -10%, #1a0d00 0%, #080b0f 55%); }
  .search-inner { max-width: 540px; width: 100%; text-align: center; }
  .search-eyebrow { display: inline-block; font-size: 10px; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; color: #f97316; border: 1px solid #3a1a00; background: #110900; padding: 4px 12px; border-radius: 20px; margin-bottom: 24px; }
  .search-title { font-family: 'JetBrains Mono', monospace; font-size: clamp(2rem, 6vw, 3rem); font-weight: 700; color: #fff; letter-spacing: -0.03em; line-height: 1.1; margin-bottom: 14px; }
  .search-title span { color: #f97316; }
  .search-sub { font-size: 15px; color: #555566; line-height: 1.6; margin-bottom: 36px; }
  .search-row { display: flex; gap: 8px; background: #0d1117; border: 1px solid #1a1f2e; border-radius: 10px; padding: 7px; margin-bottom: 12px; transition: border-color 0.2s; }
  .search-row:focus-within { border-color: #f97316; }
  .search-input { flex: 1; background: transparent; border: none; outline: none; color: #fff; font-family: 'JetBrains Mono', monospace; font-size: 1.3rem; font-weight: 600; letter-spacing: 0.04em; padding: 8px 12px; }
  .search-input::placeholder { color: #2a2f3e; }
  .search-btn { background: #f97316; color: #fff; border: none; border-radius: 7px; padding: 10px 24px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; transition: background 0.15s; white-space: nowrap; display: flex; align-items: center; gap: 8px; }
  .search-btn:hover { background: #ea6c0a; }
  .search-btn:disabled { opacity: 0.5; cursor: default; }
  .search-error { color: #ef4444; font-size: 13px; margin-top: 8px; }
  .loading-state { margin-top: 32px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
  .loading-text { color: #555566; font-size: 13px; font-family: 'JetBrains Mono', monospace; }
  .tag-row { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 40px; }
  .tag { font-size: 11px; color: #333344; background: #0d1117; border: 1px solid #1a1f2e; padding: 4px 10px; border-radius: 4px; font-family: 'JetBrains Mono', monospace; }
  .spinner { width: 24px; height: 24px; border: 2px solid #1a1f2e; border-top-color: #f97316; border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block; }
  .spinner-sm { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.2); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block; }

  @media (max-width: 600px) { .metrics-grid { grid-template-columns: 1fr; } .market-grid { grid-template-columns: 1fr 1fr; } }
`
document.head.appendChild(styleEl)

function BandBar({ metric, value }) {
  if (value === null || value === undefined) {
    return (
      <div className="band-container">
        <div className="band-track">
          {ZONE_COLORS.map((c, i) => <div key={i} className="band-zone" style={{ background: c }} />)}
        </div>
        <div className="band-labels">
          {metric.bandLabels.map((l, i) => <span key={i} className="band-label">{l}</span>)}
        </div>
      </div>
    )
  }
  const pos = valueToPosition(value, metric.range)
  const zoneBoundaries = metric.zones.map(z => zoneToPercent(z, metric.range))
  const zoneWidths = [
    zoneBoundaries[0],
    zoneBoundaries[1] - zoneBoundaries[0],
    zoneBoundaries[2] - zoneBoundaries[1],
    zoneBoundaries[3] - zoneBoundaries[2],
    100 - zoneBoundaries[3],
  ]
  const activeZone = metric.lager_is_beter
    ? (value < metric.zones[0] ? 4 : value < metric.zones[1] ? 3 : value < metric.zones[2] ? 2 : value < metric.zones[3] ? 1 : 0)
    : (value > metric.zones[3] ? 4 : value > metric.zones[2] ? 3 : value > metric.zones[1] ? 2 : value > metric.zones[0] ? 1 : 0)
  const colors = metric.lager_is_beter ? [...ZONE_COLORS].reverse() : ZONE_COLORS
  return (
    <div className="band-container">
      <div className="band-track">
        {zoneWidths.map((w, i) => (
          <div key={i} className={`band-zone${i === activeZone ? ' active' : ''}`}
            style={{ flex: `0 0 ${w}%`, background: colors[i] }} />
        ))}
      </div>
      <div className="band-marker-wrap" style={{ left: `${pos}%` }}>
        <div className="band-marker" style={{ background: colors[activeZone] }} />
      </div>
      <div className="band-labels">
        {metric.bandLabels.map((l, i) => (
          <span key={i} className={`band-label${i === activeZone ? ' active' : ''}`}>{l}</span>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const [ticker, setTicker] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  async function analyseer() {
    if (!ticker.trim()) return
    setLoading(true); setError(null); setResult(null)
    try {
      const res = await fetch(WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: ticker.trim().toUpperCase() }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setResult(await res.json())
    } catch { setError('Ophalen mislukt. Controleer de ticker en probeer opnieuw.') }
    finally { setLoading(false) }
  }

  if (result) return <ResultPage result={result} onReset={() => { setResult(null); setTicker('') }} />

  return (
    <div className="search-page">
      <div className="search-inner">
        <span className="search-eyebrow">AI Fundamentele Analyse</span>
        <h1 className="search-title">Aandelen<span>Analyse</span></h1>
        <p className="search-sub">Voer een ticker in voor een directe fundamentele analyse op basis van 15 financiële metrics.</p>
        <div className="search-row">
          <input className="search-input" type="text" placeholder="AAPL, MSFT, ADSK..."
            value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && analyseer()} disabled={loading} autoFocus />
          <button className="search-btn" onClick={analyseer} disabled={loading || !ticker.trim()}>
            {loading ? <span className="spinner-sm" /> : null}
            {loading ? 'Laden...' : 'Analyseer →'}
          </button>
        </div>
        {error && <p className="search-error">{error}</p>}
        {loading && <div className="loading-state"><span className="spinner" /><span className="loading-text">Data ophalen · Analyse via Claude...</span></div>}
        <div className="tag-row">
          {['P/E', 'PEG', 'P/B', 'EPS', 'D/E', 'Current Ratio', 'ROE', 'Brutomarge', 'Nettomarge', 'Omzetgroei', 'FCF', '52W Range', 'YTD', 'Dividend'].map(t => (
            <span key={t} className="tag">{t}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

function ResultPage({ result, onReset }) {
  const { ticker, analyse, raw_data: d } = result
  const values = [d?.pe_ratio, d?.eps, d?.debt_to_equity, d?.roe_percent, d?.profit_margin_percent, d?.revenue_growth_percent, d?.free_cash_flow_billions, d?.peg_ratio, d?.gross_margin_percent, d?.current_ratio]
  const isDataPoor = values.filter(v => v === null || v === undefined).length >= 5

  const ytdColor = d?.ytd_return_percent > 0 ? '#22c55e' : d?.ytd_return_percent < 0 ? '#ef4444' : '#555566'

  return (
    <div className="result-page">
      {isDataPoor && <div className="data-warning">⚠️ Beperkte data — mogelijk verlieslatend of recent beursgenoteerd. Traditionele metrics niet volledig toepasbaar.</div>}
      <header className="result-header">
        <div>
          <div className="ticker-eyebrow">Fundamentele Analyse</div>
          <div className="ticker-name">{ticker}</div>
        </div>
        <button className="back-btn" onClick={onReset}>← Nieuw aandeel</button>
      </header>

      {/* Markt & timing sectie */}
      <div className="market-section">
        <div className="section-title">Markt & Timing</div>
        <div className="market-grid">
          <div className="market-cell">
            <div className="market-label">Huidige Koers</div>
            <div className="market-value">${d?.current_price ?? '—'}</div>
            <div className="market-sub">Live prijs</div>
          </div>
          <div className="market-cell">
            <div className="market-label">YTD Rendement</div>
            <div className="market-value" style={{ color: ytdColor }}>
              {d?.ytd_return_percent != null ? `${d.ytd_return_percent}%` : '—'}
            </div>
            <div className="market-sub">Dit kalenderjaar</div>
          </div>
          <div className="market-cell">
            <div className="market-label">Dividendrendement</div>
            <div className="market-value" style={{ color: d?.dividend_yield_percent > 0 ? '#22c55e' : '#555566' }}>
              {d?.dividend_yield_percent > 0 ? `${d.dividend_yield_percent}%` : 'Geen dividend'}
            </div>
            <div className="market-sub">Indicated annual yield</div>
          </div>
        </div>

        {/* 52-week balk */}
        {d?.week52_high && d?.week52_low && (
          <div style={{ background: '#0d1117', border: '1px solid #1a1f2e', borderRadius: 10, padding: '16px 20px', marginTop: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555566' }}>52-Week Range</span>
              {d?.week52_position != null && (
                <span style={{ fontSize: 11, color: '#888899', fontFamily: 'JetBrains Mono, monospace' }}>
                  {d.week52_position}% van laagste naar hoogste
                </span>
              )}
            </div>
            <div className="week52-bar">
              <div className="week52-track" />
              {d?.week52_position != null && (
                <div className="week52-marker" style={{ left: `${d.week52_position}%` }} />
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <span style={{ fontSize: 11, color: '#ef4444', fontFamily: 'JetBrains Mono, monospace' }}>${d.week52_low}</span>
              <span style={{ fontSize: 11, color: '#22c55e', fontFamily: 'JetBrains Mono, monospace' }}>${d.week52_high}</span>
            </div>
          </div>
        )}
      </div>

      {/* Fundamentele metrics */}
      <div className="metrics-section">
        <div className="section-title">Fundamentele Metrics</div>
        <div className="metrics-grid">
          {METRICS.map(m => {
            const val = d?.[m.key]
            const s = m.score(val)
            const { label, color } = scoreToLabel(s)
            const displayVal = val !== null && val !== undefined
              ? (m.format ? m.format(val) : `${val}${m.suffix}`)
              : '—'
            return (
              <div key={m.key} className="metric-cell">
                <div className="metric-top">
                  <span className="metric-label">{m.label}</span>
                  <span className="metric-badge" style={{ background: color + '22', color }}>{label}</span>
                </div>
                <div className="metric-value" style={{ color: s !== null ? color : '#555566' }}>{displayVal}</div>
                <div className="metric-desc">{m.desc}</div>
                <BandBar metric={m} value={val} />
              </div>
            )
          })}
        </div>
      </div>

      <div className="analyse-section">
        <div className="analyse-header">
          <span className="analyse-dot" />
          <span className="analyse-title">AI Beoordeling — {ticker}</span>
        </div>
        <div className="analyse-body">
          <ReactMarkdown>{analyse}</ReactMarkdown>
        </div>
      </div>
    </div>
  )
}
