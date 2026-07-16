import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

// Los Supabase-project voor deze tab (Nasdaq-100 batch-scores, workflow W-Nasdaq100-Sync).
// Dit is een ANDER project dan waar de losse zoekfunctie vandaan komt — die gebruikt
// live Finnhub via de n8n-webhook, geen database.
const supabase = createClient(
  'https://onbzmtpynijcozokvigr.supabase.co',
  'VUL_HIER_DE_ANON_KEY_IN' // Supabase project "Aandelen Dashboard" -> Settings -> API -> anon key
)

const ADVIES_COLOR = {
  'STERKE KOOP': '#22c55e',
  'KOOP': '#84cc16',
  'NEUTRAAL': '#eab308',
  'VERMIJD': '#ef4444',
}

function scoreColor(s) {
  if (s == null) return '#3a3f52'
  if (s >= 8) return '#22c55e'
  if (s >= 6) return '#84cc16'
  if (s >= 4) return '#eab308'
  if (s >= 2) return '#f97316'
  return '#ef4444'
}

export default function Top25({ onSelectTicker }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [updatedAt, setUpdatedAt] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase
        .from('metrics')
        .select('*, companies(ticker, name)')
        .not('interesse_score', 'is', null)
        .order('interesse_score', { ascending: false })
        .limit(25)

      if (cancelled) return
      if (error) { setError(error.message); setLoading(false); return }
      setRows(data || [])
      if (data && data[0]) setUpdatedAt(data[0].updated_at)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="page">
      <div className="hdr">
        <div>
          <div className="eyebrow">Nasdaq-100 · Batch-scan</div>
          <div className="ticker" style={{fontSize: 'clamp(1.6rem,4vw,2.4rem)'}}>Top 25</div>
        </div>
      </div>

      <p style={{fontSize: 13, color: '#666f88', marginBottom: 24, lineHeight: 1.6}}>
        Gerangschikt op een combinatie van eigen fundamentele score (60%) en korting t.o.v.
        de 52-weken-high (40%). Berekend met dezelfde scoring-engine als de losse zoekfunctie,
        maar met een absolute P/E-band i.p.v. sector-relatieve P/E.
        {updatedAt && ` Bijgewerkt: ${new Date(updatedAt).toLocaleString('nl-NL')}.`}
      </p>

      {loading && (
        <div style={{padding: '60px 0', textAlign: 'center'}}>
          <span className="spinner" />
        </div>
      )}

      {!loading && error && (
        <div className="warn">⚠️ Kon data niet laden: {error}</div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div className="warn">
          ⚠️ Nog geen data. De nachtelijke scan (W-Nasdaq100-Sync in n8n) moet eerst minstens
          één keer gedraaid hebben.
        </div>
      )}

      {!loading && !error && rows.length > 0 && (
        <div style={{background: '#0a0e16', border: '1px solid #151c2a', borderRadius: 10, overflow: 'hidden'}}>
          <table style={{width: '100%', borderCollapse: 'collapse'}}>
            <thead>
              <tr style={{borderBottom: '1px solid #151c2a'}}>
                {['#', 'Bedrijf', 'Koers', 'Korting v/ 52w-high', 'Score', 'Advies'].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '10px 16px', fontSize: 10, fontWeight: 600,
                    letterSpacing: '.1em', textTransform: 'uppercase', color: '#333d52',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const advies = r.advies ? r.advies.trim().toUpperCase() : null
                const clr = ADVIES_COLOR[advies] || '#3a3f52'
                return (
                  <tr
                    key={r.company_id}
                    onClick={() => onSelectTicker && r.companies?.ticker && onSelectTicker(r.companies.ticker)}
                    style={{
                      borderBottom: '1px solid #101520',
                      cursor: onSelectTicker ? 'pointer' : 'default',
                      transition: 'background .1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#0e131c'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{padding: '12px 16px', fontFamily: "'JetBrains Mono',monospace", color: '#333d52', fontSize: 13}}>
                      {i + 1}
                    </td>
                    <td style={{padding: '12px 16px'}}>
                      <div style={{fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 14, color: '#e8eaf0'}}>
                        {r.companies?.ticker}
                      </div>
                      <div style={{fontSize: 11, color: '#444d62', marginTop: 2}}>{r.companies?.name}</div>
                    </td>
                    <td style={{padding: '12px 16px', fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: '#c4ccd8'}}>
                      {r.price != null ? `$${Number(r.price).toFixed(2)}` : '—'}
                    </td>
                    <td style={{padding: '12px 16px', fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: r.discount_pct > 25 ? '#f97316' : '#666f88'}}>
                      {r.discount_pct != null ? `-${Number(r.discount_pct).toFixed(1)}%` : '—'}
                    </td>
                    <td style={{padding: '12px 16px', fontFamily: "'JetBrains Mono',monospace", fontSize: 14, fontWeight: 700, color: scoreColor(r.score_totaal)}}>
                      {r.score_totaal != null ? Number(r.score_totaal).toFixed(1) : '—'}
                    </td>
                    <td style={{padding: '12px 16px'}}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: '.05em', padding: '4px 10px',
                        borderRadius: 5, background: clr + '20', color: clr,
                      }}>
                        {advies || 'ONBEKEND'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
