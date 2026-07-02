import { useState } from 'react'

const WEBHOOK = 'https://hugop123.app.n8n.cloud/webhook/aandelen-analyse'

const METRICS = [
  { key: 'pe_ratio', label: 'P/E Ratio', suffix: 'x', desc: 'Koers / winst per aandeel',
    range: [-20, 60], zones: [0, 15, 25, 35], lager_is_beter: true,
    bandLabels: ['Verlies', '< 15', '15–25', '25–35', '> 35'],
    score: v => v == null ? null : v < 0 ? 5 : v < 15 ? 90 : v < 25 ? 70 : v < 35 ? 50 : v < 50 ? 30 : 15,
    format: v => v == null ? null : v < 0 ? `${v}x (verlies)` : `${v}x` },
  { key: 'peg_ratio', label: 'PEG Ratio', suffix: 'x', desc: 'P/E gedeeld door groeipercentage',
    range: [0, 4], zones: [0.5, 1, 1.5, 2], lager_is_beter: true,
    bandLabels: ['< 0.5', '0.5–1', '1–1.5', '1.5–2', '> 2'],
    score: v => v == null ? null : v < 0 ? 5 : v < 1 ? 90 : v < 1.5 ? 75 : v < 2 ? 55 : v < 3 ? 35 : 15 },
  { key: 'price_to_book', label: 'Price / Book', suffix: 'x', desc: 'Koers / boekwaarde per aandeel',
    range: [0, 15], zones: [1, 3, 6, 10], lager_is_beter: true,
    bandLabels: ['< 1', '1–3', '3–6', '6–10', '> 10'],
    score: v => v == null ? null : v < 1 ? 90 : v < 3 ? 75 : v < 6 ? 55 : v < 10 ? 30 : 15 },
  { key: 'eps', label: 'EPS', suffix: '', desc: 'Winst per aandeel (TTM)',
    range: [-10, 30], zones: [0, 2, 5, 10], lager_is_beter: false,
    bandLabels: ['Negatief', '0–2', '2–5', '5–10', '> 10'],
    score: v => v == null ? null : v > 20 ? 90 : v > 5 ? 75 : v > 0 ? 55 : v > -5 ? 30 : 10 },
  { key: 'debt_to_equity', label: 'Debt / Equity', suffix: 'x', desc: 'Verhouding schuld tot eigen vermogen',
    range: [0, 6], zones: [0.5, 1, 2, 4], lager_is_beter: true,
    bandLabels: ['< 0.5', '0.5–1', '1–2', '2–4', '> 4'],
    score: v => v == null ? null : v < 0.5 ? 90 : v < 1 ? 70 : v < 2 ? 45 : v < 4 ? 25 : 10 },
  { key: 'current_ratio', label: 'Current Ratio', suffix: 'x', desc: 'Vlottende activa / kortlopende schulden',
    range: [0, 4], zones: [0.8, 1, 1.5, 2], lager_is_beter: false,
    bandLabels: ['< 0.8', '0.8–1', '1–1.5', '1.5–2', '> 2'],
    score: v => v == null ? null : v > 2 ? 90 : v > 1.5 ? 75 : v > 1 ? 55 : v > 0.8 ? 30 : 10 },
  { key: 'roe_percent', label: 'ROE', suffix: '%', desc: 'Rendement op eigen vermogen',
    range: [-20, 80], zones: [0, 10, 20, 40], lager_is_beter: false,
    bandLabels: ['Negatief', '0–10%', '10–20%', '20–40%', '> 40%'],
    score: v => v == null ? null : v > 40 ? 90 : v > 20 ? 75 : v > 10 ? 55 : v > 0 ? 35 : 10 },
  { key: 'gross_margin_percent', label: 'Brutomarge', suffix: '%', desc: 'Brutowinstmarge (TTM)',
    range: [0, 90], zones: [10, 25, 40, 60], lager_is_beter: false,
    bandLabels: ['< 10%', '10–25%', '25–40%', '40–60%', '> 60%'],
    score: v => v == null ? null : v > 60 ? 90 : v > 40 ? 75 : v > 25 ? 55 : v > 10 ? 35 : 10 },
  { key: 'profit_margin_percent', label: 'Nettomarge', suffix: '%', desc: 'Netto winstmarge (TTM)',
    range: [-20, 50], zones: [0, 8, 15, 25], lager_is_beter: false,
    bandLabels: ['Negatief', '0–8%', '8–15%', '15–25%', '> 25%'],
    score: v => v == null ? null : v > 25 ? 90 : v > 15 ? 75 : v > 8 ? 55 : v > 0 ? 35 : 10 },
  { key: 'revenue_growth_percent', label: 'Omzetgroei', suffix: '%', desc: 'Jaar-op-jaar omzetgroei',
    range: [-10, 50], zones: [0, 5, 10, 20], lager_is_beter: false,
    bandLabels: ['Negatief', '0–5%', '5–10%', '10–20%', '> 20%'],
    score: v => v == null ? null : v > 20 ? 90 : v > 10 ? 75 : v > 5 ? 55 : v > 0 ? 35 : 10 },
  { key: 'free_cash_flow_billions', label: 'Free Cash Flow', suffix: 'B', desc: 'Vrije kasstroom (TTM, miljarden USD)',
    range: [-10, 40], zones: [0, 1, 5, 20], lager_is_beter: false,
    bandLabels: ['Negatief', '0–1B', '1–5B', '5–20B', '> 20B'],
    score: v => v == null ? null : v > 20 ? 90 : v > 5 ? 75 : v > 0 ? 55 : v > -5 ? 30 : 10 },
]

const SECTOR_PE_RANGES = {
  'SaaS':              { zones: [10, 20, 35, 50], labels: ['< 10', '10–20', '20–35', '35–50', '> 50'] },
  'AI Software':       { zones: [12, 25, 40, 60], labels: ['< 12', '12–25', '25–40', '40–60', '> 60'] },
  'AI Infrastructuur': { zones: [10, 20, 35, 45], labels: ['< 10', '10–20', '20–35', '35–45', '> 45'] },
  'Semiconductors':    { zones: [8,  18, 30, 40],  labels: ['< 8',  '8–18',  '18–30', '30–40', '> 40'] },
  'Cybersecurity':     { zones: [12, 25, 40, 55], labels: ['< 12', '12–25', '25–40', '40–55', '> 55'] },
  'Cloud':             { zones: [10, 20, 35, 45], labels: ['< 10', '10–20', '20–35', '35–45', '> 45'] },
  'Datacenters':       { zones: [10, 20, 30, 40], labels: ['< 10', '10–20', '20–30', '30–40', '> 40'] },
  'Financials':        { zones: [5,  10, 18, 25],  labels: ['< 5',  '5–10',  '10–18', '18–25', '> 25'] },
  'Industrials':       { zones: [8,  15, 25, 35],  labels: ['< 8',  '8–15',  '15–25', '25–35', '> 35'] },
  'Energy':            { zones: [5,  8,  15, 20],  labels: ['< 5',  '5–8',   '8–15',  '15–20', '> 20'] },
  'Utilities':         { zones: [8,  12, 20, 28],  labels: ['< 8',  '8–12',  '12–20', '20–28', '> 28'] },
  'Consumer':          { zones: [8,  15, 25, 35],  labels: ['< 8',  '8–15',  '15–25', '25–35', '> 35'] },
  'Healthcare':        { zones: [8,  12, 25, 35],  labels: ['< 8',  '8–12',  '12–25', '25–35', '> 35'] },
  'Pharma':            { zones: [6,  12, 20, 30],  labels: ['< 6',  '6–12',  '12–20', '20–30', '> 30'] },
  'Biotech':           { zones: [0,  15, 25, 35],  labels: ['Verlies', '< 15', '15–25', '25–35', '> 35'] },
}

function getPeConfig(sector) {
  if (!sector) return null
  for (const [key, config] of Object.entries(SECTOR_PE_RANGES)) {
    if (sector.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(sector.toLowerCase())) {
      return config
    }
  }
  return null
}

const ZONE_COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e']

const OORDEEL = {
  'STERK KOOPMOMENT':       { color: '#22c55e', bg: 'linear-gradient(135deg,#021508,#031209)', border: '#14532d', icon: '🚀' },
  'KOOPMOMENT':             { color: '#84cc16', bg: 'linear-gradient(135deg,#081800,#0a1c02)', border: '#1e3a05', icon: '✅' },
  'NEUTRAAL':               { color: '#eab308', bg: 'linear-gradient(135deg,#161000,#141200)', border: '#302800', icon: '⚖️' },
  'WACHT OP BETERE INSTAP': { color: '#f97316', bg: 'linear-gradient(135deg,#160600,#180800)', border: '#321400', icon: '⏳' },
  'VERMIJD':                { color: '#ef4444', bg: 'linear-gradient(135deg,#160101,#180202)', border: '#300606', icon: '⛔' },
}

function scoreToLabel(s) {
  if (s == null) return { label: 'N/B', color: '#3a3f52' }
  if (s >= 80) return { label: 'STERK',   color: '#22c55e' }
  if (s >= 60) return { label: 'GOED',    color: '#84cc16' }
  if (s >= 40) return { label: 'NEUTRAAL',color: '#eab308' }
  if (s >= 20) return { label: 'ZWAK',    color: '#f97316' }
  return             { label: 'SLECHT',   color: '#ef4444' }
}

function scoreColor(s) {
  if (s >= 8) return '#22c55e'
  if (s >= 6) return '#84cc16'
  if (s >= 4) return '#eab308'
  if (s >= 2) return '#f97316'
  return '#ef4444'
}

function vtp(val, range) {
  return ((Math.max(range[0], Math.min(range[1], val)) - range[0]) / (range[1] - range[0])) * 100
}
function ztp(z, range) {
  return ((z - range[0]) / (range[1] - range[0])) * 100
}

const S = document.createElement('style')
S.textContent = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Inter:wght@400;500;600&display=swap');
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes up{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes mkr{from{opacity:0;transform:translateX(-50%) scaleY(0)}to{opacity:1;transform:translateX(-50%) scaleY(1)}}
@keyframes ring{from{opacity:0;transform:scale(.7)}to{opacity:1;transform:scale(1)}}
*{box-sizing:border-box;margin:0;padding:0}
body{background:#080b0f;color:#d4d8e0;font-family:'Inter',sans-serif}

/* Page */
.page{max-width:960px;margin:0 auto;padding:2rem 1.5rem 5rem;animation:up .4s ease}
.hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:2rem;padding-bottom:1.5rem;border-bottom:1px solid #151c2a}
.eyebrow{font-size:10px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:#f97316;margin-bottom:6px}
.ticker{font-family:'JetBrains Mono',monospace;font-size:clamp(2.2rem,6vw,3.6rem);font-weight:700;color:#fff;letter-spacing:-.02em;line-height:1}
.back{background:transparent;border:1px solid #1a1f2e;color:#444;padding:8px 16px;border-radius:6px;cursor:pointer;font-size:13px;font-family:'Inter',sans-serif;transition:all .15s;white-space:nowrap}
.back:hover{border-color:#f97316;color:#f97316}
.stitle{font-size:10px;font-weight:600;letter-spacing:.15em;text-transform:uppercase;color:#333d52;margin-bottom:12px}

/* Markt */
.mkt{margin-bottom:2rem}
.mktgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#151c2a;border:1px solid #151c2a;border-radius:10px;overflow:hidden}
.mktcell{background:#0a0e16;padding:14px 16px}
.mktlbl{font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#333d52;margin-bottom:5px}
.mktval{font-family:'JetBrains Mono',monospace;font-size:1.15rem;font-weight:700;color:#e8eaf0}
.mktsub{font-size:11px;color:#333d52;margin-top:3px}
.w52{background:#0a0e16;border:1px solid #151c2a;border-radius:10px;padding:16px 20px;margin-top:1px}
.w52bar{position:relative;margin:8px 0 4px}
.w52track{height:5px;background:linear-gradient(to right,#ef4444,#eab308,#22c55e);border-radius:3px}
.w52pin{position:absolute;top:-4px;transform:translateX(-50%);width:2px;height:13px;background:#fff;border-radius:2px;box-shadow:0 0 8px rgba(255,255,255,.5)}

/* Metrics */
.msec{margin-bottom:2rem}
.mgrid{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:#151c2a;border:1px solid #151c2a;border-radius:10px;overflow:hidden}
.mcell{background:#0a0e16;padding:18px 20px 22px}
.mtop{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:9px}
.mlbl{font-size:10px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#333d52}
.mbadge{font-size:9px;font-weight:700;letter-spacing:.1em;padding:2px 7px;border-radius:3px;text-transform:uppercase}
.mval{font-family:'JetBrains Mono',monospace;font-size:1.65rem;font-weight:700;line-height:1;margin-bottom:4px;word-break:break-word}
.mdesc{font-size:11px;color:#2a3044;margin-bottom:15px}
.bcon{position:relative;margin-bottom:5px}
.btrack{display:flex;height:7px;border-radius:4px;overflow:hidden;gap:1px}
.bzone{flex:1;border-radius:2px;opacity:.3}
.bzone.on{opacity:1}
.bpin{position:absolute;top:-3px;transform:translateX(-50%);animation:mkr .4s ease .2s both;pointer-events:none}
.bpinbar{width:2px;height:13px;border-radius:2px;background:#fff;box-shadow:0 0 6px rgba(255,255,255,.55)}
.blbls{display:flex;justify-content:space-between;margin-top:4px}
.blbl{font-size:9px;color:#252d40;font-family:'JetBrains Mono',monospace}
.blbl.on{color:#666f88}

/* AI sectie */
.ai{border-radius:12px;overflow:hidden;border:1px solid #151c2a}
.aihdr{padding:13px 24px;background:#0a0e16;border-bottom:1px solid #151c2a;display:flex;align-items:center;gap:9px}
.aidot{width:6px;height:6px;background:#f97316;border-radius:50%}
.aititle{font-size:10px;font-weight:600;letter-spacing:.15em;text-transform:uppercase;color:#f97316}

/* Eindoordeel banner */
.eobanner{padding:26px 28px;display:flex;align-items:center;gap:22px}
.eoicon{font-size:2.2rem;line-height:1;flex-shrink:0}
.eoright{flex:1}
.eosub{font-size:9px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;opacity:.5;margin-bottom:5px}
.eoverdict{font-family:'JetBrains Mono',monospace;font-size:clamp(1.4rem,4vw,2rem);font-weight:700;letter-spacing:-.02em;line-height:1}

/* Score ring */
.ring-wrap{flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:3px;animation:ring .5s ease .15s both}
.ring{position:relative;width:70px;height:70px}
.ring svg{transform:rotate(-90deg)}
.ring-num{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:1.25rem;font-weight:700}
.ring-lbl{font-size:9px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#333d52}

/* Samenvatting */
.sam{padding:22px 28px;border-top:1px solid #101520;border-bottom:1px solid #101520;background:#0a0e16}
.sam p{color:#7a8399;font-size:14px;line-height:1.85}

/* Punten */
.punten{display:grid;grid-template-columns:1fr 1fr;background:#101520}
.pblok{background:#0a0e16;padding:20px 22px}
.pblok:first-child{border-right:1px solid #101520}
.phdr{display:flex;align-items:center;gap:7px;margin-bottom:12px}
.phdr-icon{font-size:.95rem}
.phdr-title{font-size:10px;font-weight:700;letter-spacing:.13em;text-transform:uppercase}
.plist{list-style:none;display:flex;flex-direction:column;gap:7px}
.pitem{display:flex;gap:9px;align-items:flex-start}
.pbullet{width:15px;height:15px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;margin-top:2px}
.ptext{color:#7a8399;font-size:13px;line-height:1.6}
.ptext strong{color:#c4ccd8;font-weight:600}

/* Vooruitzichten */
.vblok{padding:20px 28px;border-top:1px solid #101520;background:#0a0e16}
.vhdr{display:flex;align-items:center;gap:7px;margin-bottom:10px}
.vhdr-icon{font-size:.95rem}
.vhdr-title{font-size:10px;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:#818cf8}
.vtext{color:#7a8399;font-size:14px;line-height:1.85}

/* Koopadvies */
.kblok{padding:20px 28px 26px;border-top:1px solid #101520;background:#0a0e16}
.khdr{display:flex;align-items:center;gap:7px;margin-bottom:10px}
.khdr-icon{font-size:.95rem}
.khdr-title{font-size:10px;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:#f97316}
.ktext{color:#8a93a8;font-size:14px;line-height:1.85}
.ktext strong{color:#e0e4ee;font-weight:600}

/* Zoekpagina */
.sp{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:2rem;background:radial-gradient(ellipse 80% 60% at 50% -10%,#1c0d00,#080b0f 55%)}
.si{max-width:540px;width:100%;text-align:center}
.sew{display:inline-block;font-size:10px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:#f97316;border:1px solid #3a1a00;background:#110900;padding:4px 12px;border-radius:20px;margin-bottom:24px}
.stit{font-family:'JetBrains Mono',monospace;font-size:clamp(2rem,6vw,3rem);font-weight:700;color:#fff;letter-spacing:-.03em;line-height:1.1;margin-bottom:14px}
.stit span{color:#f97316}
.ssub{font-size:15px;color:#444d62;line-height:1.6;margin-bottom:36px}
.srow{display:flex;gap:8px;background:#0a0e16;border:1px solid #151c2a;border-radius:10px;padding:7px;margin-bottom:12px;transition:border-color .2s}
.srow:focus-within{border-color:#f97316}
.sinp{flex:1;background:transparent;border:none;outline:none;color:#fff;font-family:'JetBrains Mono',monospace;font-size:1.25rem;font-weight:600;letter-spacing:.04em;padding:8px 12px}
.sinp::placeholder{color:#252d3e}
.sbtn{background:#f97316;color:#fff;border:none;border-radius:7px;padding:10px 24px;font-size:14px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;transition:background .15s;white-space:nowrap;display:flex;align-items:center;gap:8px}
.sbtn:hover{background:#e86c0a}
.sbtn:disabled{opacity:.5;cursor:default}
.serr{color:#ef4444;font-size:13px;margin-top:8px}
.sload{margin-top:32px;display:flex;flex-direction:column;align-items:center;gap:12px}
.sloadtxt{color:#444d62;font-size:13px;font-family:'JetBrains Mono',monospace}
.tags{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:40px}
.tag{font-size:11px;color:#252d40;background:#0a0e16;border:1px solid #151c2a;padding:4px 10px;border-radius:4px;font-family:'JetBrains Mono',monospace}
.spinner{width:24px;height:24px;border:2px solid #151c2a;border-top-color:#f97316;border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
.spinnersm{width:16px;height:16px;border:2px solid rgba(255,255,255,.2);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
.warn{background:#1a0f00;border:1px solid #f97316;border-radius:8px;padding:12px 16px;margin-bottom:24px;color:#f97316;font-size:13px}

/* Extra info */
.xsec{margin-bottom:2rem}
.xgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:#151c2a;border:1px solid #151c2a;border-radius:10px;overflow:hidden}
.xcell{background:#0a0e16;padding:16px 18px}
.xlbl{font-size:10px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#333d52;margin-bottom:8px;display:flex;align-items:center;gap:6px}
.xlbl-icon{font-size:.85rem}
.xval{font-family:'JetBrains Mono',monospace;font-size:1.1rem;font-weight:700;margin-bottom:3px}
.xsub{font-size:11px;color:#333d52}
.xsub2{font-size:11px;color:#444d62;margin-top:2px}
/* Analyst bar */
.abar{display:flex;height:6px;border-radius:3px;overflow:hidden;margin:8px 0 4px;gap:1px}
.abar-seg{height:100%;transition:width .3s}
.abar-lbls{display:flex;justify-content:space-between;font-size:9px;font-family:'JetBrains Mono',monospace}
/* Insider signal */
.ins-signal{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:.08em;margin-bottom:6px}
/* Earnings countdown */
.earn-days{font-family:'JetBrains Mono',monospace;font-size:1.6rem;font-weight:700;line-height:1;margin-bottom:3px}
@media(max-width:640px){.mgrid{grid-template-columns:1fr}.mktgrid{grid-template-columns:1fr 1fr}.punten{grid-template-columns:1fr}.eobanner{flex-wrap:wrap}.xgrid{grid-template-columns:1fr 1fr}}
`
document.head.appendChild(S)

function BandBar({ m, val }) {
  const colors = m._sectorColors || (m.lager_is_beter ? [...ZONE_COLORS].reverse() : ZONE_COLORS)
  const range = m.range
  const zones = m.zones

  if (val == null) return (
    <div className="bcon">
      <div className="btrack">{colors.map((c,i) => <div key={i} className="bzone" style={{background:c,flex:1}} />)}</div>
      <div style={{display:'flex',marginTop:4}}>
        {m.bandLabels.map((l,i) => {
          const zb = zones.map(z => ztp(z, range))
          const ws = [zb[0], zb[1]-zb[0], zb[2]-zb[1], zb[3]-zb[2], 100-zb[3]]
          return <span key={i} style={{flex:`0 0 ${ws[i]}%`,fontSize:9,color:'#252d40',fontFamily:'JetBrains Mono,monospace',textAlign:'center',overflow:'hidden'}}>{l}</span>
        })}
      </div>
    </div>
  )

  const pos = vtp(val, range)
  const zb = zones.map(z => ztp(z, range))
  const ws = [zb[0], zb[1]-zb[0], zb[2]-zb[1], zb[3]-zb[2], 100-zb[3]]

  let az = 0
  if (pos >= zb[3]) az = 4
  else if (pos >= zb[2]) az = 3
  else if (pos >= zb[1]) az = 2
  else if (pos >= zb[0]) az = 1
  else az = 0

  return (
    <div className="bcon">
      <div className="btrack">
        {ws.map((w,i) => <div key={i} className={`bzone${i===az?' on':''}`} style={{flex:`0 0 ${w}%`,background:colors[i]}} />)}
      </div>
      <div className="bpin" style={{left:`${pos}%`}}>
        <div className="bpinbar" style={{background:colors[az]}} />
      </div>
      <div style={{display:'flex',marginTop:4}}>
        {m.bandLabels.map((l,i) => (
          <span key={i} style={{
            flex:`0 0 ${ws[i]}%`,
            fontSize:9,
            color: i===az ? colors[az] : '#252d40',
            fontFamily:'JetBrains Mono,monospace',
            textAlign:'center',
            overflow:'hidden',
            fontWeight: i===az ? 600 : 400,
          }}>{l}</span>
        ))}
      </div>
    </div>
  )
}

function ScoreRing({ score }) {
  const color = scoreColor(score)
  const r = 27, circ = 2 * Math.PI * r, fill = (score / 10) * circ
  return (
    <div className="ring-wrap">
      <div className="ring">
        <svg width="70" height="70" viewBox="0 0 70 70">
          <circle cx="35" cy="35" r={r} fill="none" stroke="#151c2a" strokeWidth="5" />
          <circle cx="35" cy="35" r={r} fill="none" stroke={color} strokeWidth="5"
            strokeDasharray={`${fill} ${circ}`} strokeLinecap="round" />
        </svg>
        <div className="ring-num" style={{color}}>{score}</div>
      </div>
      <div className="ring-lbl">koopscore</div>
    </div>
  )
}

function berekenKoopscore(analyse, fundamenteleScore) {
  if (!analyse || typeof analyse !== 'object') return null
  const fs = fundamenteleScore != null ? Number(fundamenteleScore) : null
  const ws = analyse.waardering_score != null ? Number(analyse.waardering_score) : null
  const ts = analyse.timing_score != null ? Number(analyse.timing_score) : null
  if (fs == null || ws == null || ts == null) return analyse.koopscore != null ? Number(analyse.koopscore) : null
  return parseFloat((fs * 0.50 + ws * 0.25 + ts * 0.25).toFixed(1))
}

function AIBlok({ ticker, analyse, fundamenteleScore, currentPrice }) {
  if (!analyse) return null
  if (typeof analyse === 'string') {
    return (
      <div className="ai">
        <div className="aihdr"><span className="aidot" /><span className="aititle">AI Beoordeling — {ticker}</span></div>
        <div style={{padding:'24px 28px',color:'#7a8399',fontSize:'14px',lineHeight:'1.85',background:'#0a0e16',whiteSpace:'pre-wrap'}}>{analyse}</div>
      </div>
    )
  }

  const eo = analyse.eindoordeel?.trim().toUpperCase()
  const cfg = eo ? (OORDEEL[eo] || null) : null
  const score = berekenKoopscore(analyse, fundamenteleScore)

  return (
    <div className="ai">
      <div className="aihdr">
        <span className="aidot" />
        <span className="aititle">AI Beoordeling — {ticker}</span>
      </div>

      {/* Eindoordeel + score */}
      {cfg && (
        <div className="eobanner" style={{background: cfg.bg, borderBottom: `1px solid ${cfg.border}`}}>
          <span className="eoicon">{cfg.icon}</span>
          <div className="eoright">
            <div className="eosub" style={{color: cfg.color}}>Eindoordeel</div>
            <div className="eoverdict" style={{color: cfg.color}}>{eo}</div>
          </div>
          {score != null && <ScoreRing score={score} />}
        </div>
      )}

      {/* Samenvatting */}
      {analyse.samenvatting && (
        <div className="sam">
          <p>{analyse.samenvatting}</p>
        </div>
      )}

      {/* Sterke + zwakke punten */}
      {((analyse.sterke_punten?.length > 0) || (analyse.aandachtspunten?.length > 0)) && (
        <div className="punten">
          {analyse.sterke_punten?.length > 0 && (
            <div className="pblok">
              <div className="phdr">
                <span className="phdr-icon">✅</span>
                <span className="phdr-title" style={{color:'#22c55e'}}>Sterke punten</span>
              </div>
              <ul className="plist">
                {analyse.sterke_punten.map((p, i) => (
                  <li key={i} className="pitem">
                    <span className="pbullet" style={{background:'#22c55e20',color:'#22c55e'}}>+</span>
                    <span className="ptext">{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {analyse.aandachtspunten?.length > 0 && (
            <div className="pblok">
              <div className="phdr">
                <span className="phdr-icon">⚠️</span>
                <span className="phdr-title" style={{color:'#f97316'}}>Aandachtspunten</span>
              </div>
              <ul className="plist">
                {analyse.aandachtspunten.map((p, i) => (
                  <li key={i} className="pitem">
                    <span className="pbullet" style={{background:'#f9731620',color:'#f97316'}}>!</span>
                    <span className="ptext">{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Vooruitzichten */}
      {analyse.vooruitzichten && (
        <div className="vblok">
          <div className="vhdr">
            <span className="vhdr-icon">🔭</span>
            <span className="vhdr-title">Vooruitzichten</span>
          </div>
          <p className="vtext">{analyse.vooruitzichten}</p>
        </div>
      )}

      {/* Koopadvies */}
      {analyse.koopadvies && (
        <div className="kblok">
          <div className="khdr">
            <span className="khdr-icon">💡</span>
            <span className="khdr-title">Koopadvies</span>
          </div>
          {analyse.richtprijs != null && analyse.richtprijs < (currentPrice ?? Infinity) && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '10px',
              background: '#1a0f00', border: '1px solid #3a1800',
              borderRadius: '8px', padding: '10px 16px', marginBottom: '14px'
            }}>
              <span style={{fontSize: '11px', fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: '#f97316'}}>Richtprijs</span>
              <span style={{fontFamily: 'JetBrains Mono, monospace', fontSize: '1.3rem', fontWeight: 700, color: '#f97316'}}>${analyse.richtprijs}</span>
              <span style={{fontSize: '12px', color: '#664422'}}>Interessant vanaf deze koers</span>
            </div>
          )}
          <p className="ktext">{analyse.koopadvies}</p>
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [ticker, setTicker] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  async function go() {
    if (!ticker.trim()) return
    setLoading(true); setError(null); setResult(null)
    try {
      const res = await fetch(WEBHOOK, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ ticker: ticker.trim().toUpperCase() }),
      })
      if (!res.ok) throw new Error()
      setResult(await res.json())
    } catch { setError('Ophalen mislukt. Controleer de ticker en probeer opnieuw.') }
    finally { setLoading(false) }
  }

  if (result) return <ResultPage result={result} onReset={() => { setResult(null); setTicker('') }} />

  return (
    <div className="sp">
      <div className="si">
        <span className="sew">AI Fundamentele Analyse</span>
        <h1 className="stit">Aandelen<span>Analyse</span></h1>
        <p className="ssub">Directe fundamentele analyse op basis van 15 metrics en recent nieuws.</p>
        <div className="srow">
          <input className="sinp" type="text" placeholder="AAPL, MSFT, META..."
            value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && go()} disabled={loading} autoFocus />
          <button className="sbtn" onClick={go} disabled={loading || !ticker.trim()}>
            {loading ? <span className="spinnersm" /> : null}
            {loading ? 'Laden...' : 'Analyseer →'}
          </button>
        </div>
        {error && <p className="serr">{error}</p>}
        {loading && <div className="sload"><span className="spinner" /><span className="sloadtxt">Data ophalen · Nieuws laden · Analyse via Claude...</span></div>}
        <div className="tags">
          {['P/E','PEG','P/B','EPS','D/E','ROE','Brutomarge','Nettomarge','Omzetgroei','FCF','52W Range','Dividend','Nieuws'].map(t => (
            <span key={t} className="tag">{t}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

function ExtraInfoBalk({ d }) {
  const ins = d?.insider
  const ana = d?.analyst
  const earn = d?.earnings
  const peers = d?.sector_peers ?? []

  const insSignalClr = ins?.signal === 'KOOP' ? '#22c55e' : ins?.signal === 'VERKOOP' ? '#ef4444' : '#eab308'
  const insSignalBg = ins?.signal === 'KOOP' ? '#22c55e18' : ins?.signal === 'VERKOOP' ? '#ef444418' : '#eab30818'

  const anaTotal = ana ? (ana.strong_buy + ana.buy + ana.hold + ana.sell + ana.strong_sell) : 0
  const anaBuyPct = anaTotal > 0 ? ((ana.strong_buy + ana.buy) / anaTotal * 100) : 0
  const anaHoldPct = anaTotal > 0 ? (ana.hold / anaTotal * 100) : 0
  const anaSellPct = anaTotal > 0 ? ((ana.sell + ana.strong_sell) / anaTotal * 100) : 0
  const anaLabel = anaBuyPct > 60 ? 'KOOP' : anaSellPct > 40 ? 'VERKOOP' : 'HOUD'
  const anaLabelClr = anaBuyPct > 60 ? '#22c55e' : anaSellPct > 40 ? '#ef4444' : '#eab308'

  const earnClr = earn?.days_until != null
    ? earn.days_until <= 14 ? '#f97316' : earn.days_until <= 30 ? '#eab308' : '#22c55e'
    : '#333d52'

  return (
    <div className="xsec">
      <div className="stitle">Marktcontext</div>
      <div className="xgrid">

        {/* Insider trading */}
        <div className="xcell">
          <div className="xlbl"><span className="xlbl-icon">👤</span>Wat doen insiders?</div>
          <div style={{fontSize:11,color:'#444d62',marginBottom:10,lineHeight:1.5}}>
            Kopen of verkopen CEO/CFO en andere bestuurders hun eigen aandelen? Aankopen zijn een sterk positief signaal.
          </div>
          {ins ? (
            <>
              <div className="ins-signal" style={{background: insSignalBg, color: insSignalClr}}>
                {ins.signal === 'KOOP' ? '↑' : ins.signal === 'VERKOOP' ? '↓' : '—'} {ins.signal}
              </div>
              <div style={{marginTop:12,display:'flex',gap:8}}>
                <div style={{flex:1,background:'#22c55e18',border:'1px solid #22c55e30',borderRadius:6,padding:'8px 12px',textAlign:'center'}}>
                  <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:'1.4rem',fontWeight:700,color:'#22c55e'}}>{ins.buys}</div>
                  <div style={{fontSize:10,color:'#22c55e80',marginTop:2,textTransform:'uppercase',letterSpacing:'.08em'}}>aankopen</div>
                </div>
                <div style={{flex:1,background:'#ef444418',border:'1px solid #ef444430',borderRadius:6,padding:'8px 12px',textAlign:'center'}}>
                  <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:'1.4rem',fontWeight:700,color:'#ef4444'}}>{ins.sells}</div>
                  <div style={{fontSize:10,color:'#ef444480',marginTop:2,textTransform:'uppercase',letterSpacing:'.08em'}}>verkopen</div>
                </div>
              </div>
              <div style={{fontSize:10,color:'#333d52',marginTop:8}}>Laatste 6 maanden</div>
            </>
          ) : <div className="xsub">Geen data</div>}
        </div>

        {/* Analyst consensus */}
        <div className="xcell">
          <div className="xlbl"><span className="xlbl-icon">📊</span>Wat adviseren analisten?</div>
          <div style={{fontSize:11,color:'#444d62',marginBottom:10,lineHeight:1.5}}>
            Analisten van banken als Goldman Sachs en JPMorgan beoordelen het aandeel. Dit is hun gemiddeld advies.
          </div>
          {ana && anaTotal > 0 ? (
            <>
              <div className="xval" style={{color: anaLabelClr, marginBottom:6}}>{anaLabel}</div>
              <div style={{fontSize:12,color:'#666f88',marginBottom:6}}>{anaTotal} analisten beoordeeld</div>
              <div className="abar">
                <div className="abar-seg" style={{width:`${anaBuyPct}%`, background:'#22c55e'}} />
                <div className="abar-seg" style={{width:`${anaHoldPct}%`, background:'#eab308'}} />
                <div className="abar-seg" style={{width:`${anaSellPct}%`, background:'#ef4444'}} />
              </div>
              <div className="abar-lbls">
                <span style={{color:'#22c55e'}}>{Math.round(anaBuyPct)}% koop</span>
                <span style={{color:'#eab308'}}>{Math.round(anaHoldPct)}% houd</span>
                <span style={{color:'#ef4444'}}>{Math.round(anaSellPct)}% verkoop</span>
              </div>
            </>
          ) : <div className="xsub">Geen data</div>}
        </div>

        {/* Earnings */}
        <div className="xcell">
          <div className="xlbl"><span className="xlbl-icon">📅</span>Volgende kwartaalcijfers</div>
          <div style={{fontSize:11,color:'#444d62',marginBottom:10,lineHeight:1.5}}>
            Elk kwartaal publiceert het bedrijf zijn resultaten. Dit zorgt vaak voor grote koersbewegingen.
          </div>
          {earn ? (
            <>
              <div className="earn-days" style={{color: earnClr}}>{earn.days_until} dagen</div>
              <div className="xsub" style={{marginTop:4}}>{earn.date}</div>
              {earn.eps_estimate != null && (
                <div style={{fontSize:11,color:'#444d62',marginTop:6}}>
                  Verwachte winst per aandeel: <span style={{color:'#888',fontFamily:'JetBrains Mono,monospace'}}>${earn.eps_estimate}</span>
                </div>
              )}
              {earn.days_until <= 14 && (
                <div style={{fontSize:11,color:'#f97316',marginTop:6}}>⚠️ Earnings binnen 2 weken — verhoogd risico</div>
              )}
            </>
          ) : <div className="xsub">Geen datum bekend</div>}
        </div>

        {/* Sector vergelijking */}
        <div className="xcell">
          <div className="xlbl"><span className="xlbl-icon">🏭</span>Sectorvergelijking P/E</div>
          <div style={{fontSize:11,color:'#444d62',marginBottom:10,lineHeight:1.5}}>
            Hoe duur is dit aandeel vergeleken met concurrenten? Een lagere P/E kan goedkoper zijn.
          </div>
          {d?.peer_pe?.length > 0 ? (
            <div style={{display:'flex',flexDirection:'column',gap:5}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'4px 0',borderBottom:'1px solid #1a2235'}}>
                <span style={{fontSize:12,fontWeight:700,color:'#f97316',fontFamily:'JetBrains Mono,monospace'}}>{d?.ticker}</span>
                <span style={{fontSize:13,fontFamily:'JetBrains Mono,monospace',color:'#f97316',fontWeight:700}}>
                  {d?.pe_ratio != null ? `${d.pe_ratio}x` : '—'}
                </span>
              </div>
              {d.peer_pe.map(p => {
                const isHigher = p.pe != null && d?.pe_ratio != null && p.pe > d.pe_ratio
                return (
                  <div key={p.ticker} style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontSize:12,color:'#666f88'}}>{p.naam || p.ticker}</span>
                    <span style={{
                      fontSize:12,fontFamily:'JetBrains Mono,monospace',
                      color: p.pe == null ? '#333d52' : isHigher ? '#ef4444' : '#22c55e'
                    }}>
                      {p.pe != null ? `${p.pe}x` : '—'}
                    </span>
                  </div>
                )
              })}
              <div style={{fontSize:10,color:'#333d52',marginTop:4}}>Groen = concurrent duurder · Rood = concurrent goedkoper dan {d?.ticker}</div>
            </div>
          ) : peers.length > 0 ? (
            <div style={{display:'flex',flexDirection:'column',gap:5}}>
              <div style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:'1px solid #1a2235'}}>
                <span style={{fontSize:12,fontWeight:700,color:'#f97316',fontFamily:'JetBrains Mono,monospace'}}>{d?.ticker}</span>
                <span style={{fontSize:13,fontFamily:'JetBrains Mono,monospace',color:'#f97316'}}>{d?.pe_ratio != null ? `${d.pe_ratio}x` : '—'}</span>
              </div>
              {peers.map(p => (
                <div key={p.ticker || p} style={{display:'flex',justifyContent:'space-between'}}>
                  <span style={{fontSize:12,color:'#666f88',fontFamily:'JetBrains Mono,monospace'}}>{p.ticker || p}</span>
                  <span style={{fontSize:12,color:'#333d52'}}>—</span>
                </div>
              ))}
            </div>
          ) : <div className="xsub">Geen sectordata</div>}
        </div>

      </div>
    </div>
  )
}

function ResultPage({ result, onReset }) {
  const { ticker, analyse, raw_data: d } = result
  const poor = [d?.pe_ratio,d?.eps,d?.debt_to_equity,d?.roe_percent,d?.profit_margin_percent,d?.revenue_growth_percent,d?.free_cash_flow_billions,d?.peg_ratio,d?.gross_margin_percent,d?.current_ratio].filter(v => v == null).length >= 5
  const ytdClr = d?.ytd_return_percent > 0 ? '#22c55e' : d?.ytd_return_percent < 0 ? '#ef4444' : '#444d62'

  return (
    <div className="page">
      {poor && <div className="warn">⚠️ Beperkte data — mogelijk verlieslatend of recent beursgenoteerd.</div>}

      <div className="hdr">
        <div>
          <div className="eyebrow">Fundamentele Analyse</div>
          <div className="ticker">{ticker}</div>
        </div>
        <button className="back" onClick={onReset}>← Nieuw aandeel</button>
      </div>

      {/* Markt */}
      <div className="mkt">
        <div className="stitle">Markt & Timing</div>
        <div className="mktgrid">
          <div className="mktcell">
            <div className="mktlbl">Huidige Koers</div>
            <div className="mktval">${d?.current_price ?? '—'}</div>
            <div className="mktsub">Live prijs</div>
          </div>
          <div className="mktcell">
            <div className="mktlbl">YTD Rendement</div>
            <div className="mktval" style={{color: ytdClr}}>{d?.ytd_return_percent != null ? `${d.ytd_return_percent}%` : '—'}</div>
            <div className="mktsub">Dit kalenderjaar</div>
          </div>
          <div className="mktcell">
            <div className="mktlbl">Dividendrendement</div>
            <div className="mktval" style={{color: d?.dividend_yield_percent > 0 ? '#22c55e' : '#444d62'}}>
              {d?.dividend_yield_percent > 0 ? `${d.dividend_yield_percent}%` : 'Geen dividend'}
            </div>
            <div className="mktsub">Indicated annual yield</div>
          </div>
        </div>
        {d?.week52_high && d?.week52_low && (
          <div className="w52">
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
              <span style={{fontSize:10,fontWeight:600,letterSpacing:'.1em',textTransform:'uppercase',color:'#333d52'}}>52-Week Range</span>
              {d?.week52_position != null && <span style={{fontSize:11,color:'#666f88',fontFamily:'JetBrains Mono,monospace'}}>{d.week52_position}% van laagste</span>}
            </div>
            <div className="w52bar">
              <div className="w52track" />
              {d?.week52_position != null && <div className="w52pin" style={{left:`${d.week52_position}%`}} />}
            </div>
            <div style={{display:'flex',justifyContent:'space-between',marginTop:4}}>
              <span style={{fontSize:11,color:'#ef4444',fontFamily:'JetBrains Mono,monospace'}}>${d.week52_low}</span>
              <span style={{fontSize:11,color:'#22c55e',fontFamily:'JetBrains Mono,monospace'}}>${d.week52_high}</span>
            </div>
          </div>
        )}
      </div>

      {/* Metrics */}
      <div className="msec">
        <div className="stitle">Fundamentele Metrics</div>
        <div className="mgrid">
          {METRICS.map(m => {
            const val = d?.[m.key]
            // Gebruik sectorspecifieke P/E config als beschikbaar
            const sector = analyse?.sector
            const peConfig = m.key === 'pe_ratio' ? getPeConfig(sector) : null
            const metricOverride = peConfig ? {
              ...m,
              lager_is_beter: false, // eigen kleurlogica hieronder
              _sectorColors: ['#22c55e', '#22c55e', '#eab308', '#f97316', '#ef4444'], // laag=groen, gezond=groen, hoog=geel, duur=oranje, erg duur=rood
              range: [peConfig.zones[0] - 5, peConfig.zones[3] + 15],
              zones: peConfig.zones,
              bandLabels: peConfig.labels,
              score: v => v == null ? null : v < 0 ? 5 : v < peConfig.zones[1] ? 85 : v < peConfig.zones[2] ? 65 : v < peConfig.zones[3] ? 40 : 20
            } : m
            const s = metricOverride.score(val)
            const { label, color } = scoreToLabel(s)
            const dv = val != null ? (m.format ? m.format(val) : `${val}${m.suffix}`) : '—'
            return (
              <div key={m.key} className="mcell">
                <div className="mtop">
                  <span className="mlbl">{m.label}</span>
                  <span className="mbadge" style={{background:color+'20',color}}>{label}</span>
                </div>
                <div className="mval" style={{color: s != null ? color : '#2a3044'}}>{dv}</div>
                <div className="mdesc">{m.desc}{peConfig && sector ? ` · ${sector} sector` : ''}</div>
                <BandBar m={metricOverride} val={val} />
              </div>
            )
          })}
        </div>
      </div>

      {/* Extra info */}
      <ExtraInfoBalk d={{...d, ticker, peer_pe: d?.sector_peers}} />

      {/* AI */}
      <AIBlok ticker={ticker} analyse={analyse} fundamenteleScore={d?.fundamentele_score} currentPrice={d?.current_price} />
    </div>
  )
}
