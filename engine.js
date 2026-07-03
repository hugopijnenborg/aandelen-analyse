// ============================================================
// AANDELEN SCORING ENGINE — volledig config-gestuurd
// Enige bron van waarheid voor scores. Frontend berekent niets.
// ============================================================

const METRIC_LABELS = {
  revenueGrowth: "Omzetgroei",
  epsGrowth: "EPS Groei",
  roe: "ROE",
  profitMargin: "Nettomarge",
  fcfTrend: "FCF Trend",
  debtToEquity: "Debt/Equity",
  pe: "P/E vs Sector",
  evEbitda: "EV/EBITDA",
  fcfYield: "FCF Yield"
};

const ENGINE_VERSION = "1.0.0";

const CONFIG = {
  eindscoreWeights: {
    bedrijfskwaliteit: 0.40,
    waardering: 0.35,
    financieleGezondheid: 0.25
  },

  categorieMetricWeights: {
    bedrijfskwaliteit: {
      revenueGrowth: 0.30,
      epsGrowth: 0.25,
      roe: 0.25,
      profitMargin: 0.20
    },
    financieleGezondheid: {
      fcfTrend: 0.60,
      debtToEquity: 0.40
    },
    waardering: {
      pe: 0.35,
      evEbitda: 0.35,
      fcfYield: 0.30
    }
  },

  hypergroei: {
    drempelRevenueGrowth: 25,
    drempelEpsGrowth: 25,
    waarderingWeights: {
      pe: 0.20,
      evEbitda: 0.40,
      fcfYield: 0.40
    }
  },

  scoreTabellen: {
    revenueGrowth: (v) => {
      if (v === null || v === undefined) return null;
      if (v >= 30) return 10;
      if (v >= 20) return 9;
      if (v >= 15) return 8;
      if (v >= 10) return 7;
      if (v >= 5) return 6;
      if (v >= 0) return 5;
      if (v >= -10) return 4;
      if (v >= -20) return 2;
      return 1;
    },
    epsGrowth: (v) => {
      if (v === null || v === undefined) return null;
      if (v >= 30) return 10;
      if (v >= 20) return 9;
      if (v >= 15) return 8;
      if (v >= 10) return 7;
      if (v >= 5) return 6;
      if (v >= 0) return 5;
      if (v >= -10) return 4;
      if (v >= -20) return 2;
      return 1;
    },
    roe: (v) => {
      if (v === null || v === undefined) return null;
      if (v >= 30) return 10;
      if (v >= 25) return 9;
      if (v >= 20) return 8;
      if (v >= 15) return 7;
      if (v >= 10) return 6;
      if (v >= 5) return 4;
      return 2;
    },
    profitMargin: (v) => {
      if (v === null || v === undefined) return null;
      if (v >= 30) return 10;
      if (v >= 25) return 9;
      if (v >= 20) return 8;
      if (v >= 15) return 7;
      if (v >= 10) return 6;
      if (v >= 5) return 4;
      return 2;
    },
    fcfTrend: (v) => {
      if (v === null || v === undefined) return null;
      if (v >= 20) return 10;
      if (v >= 10) return 9;
      if (v >= 5) return 8;
      if (v >= -5) return 7;
      if (v >= -15) return 5;
      if (v < -15 && v <= 0) return 3;
      return 1;
    },
    debtToEquity: (v) => {
      if (v === null || v === undefined) return null;
      if (v < 0.3) return 10;
      if (v < 0.5) return 9;
      if (v < 1.0) return 8;
      if (v < 1.5) return 7;
      if (v < 2.0) return 6;
      if (v < 3.0) return 4;
      return 2;
    },
    pe: (v) => {
      if (v === null || v === undefined) return null;
      if (v <= -20) return 10;
      if (v <= -10) return 9;
      if (v <= 10) return 7;
      if (v <= 30) return 5;
      if (v <= 60) return 3;
      return 1;
    },
    fcfYield: (v) => {
      if (v === null || v === undefined) return null;
      if (v >= 8) return 10;
      if (v >= 6) return 9;
      if (v >= 4) return 7;
      if (v >= 2) return 5;
      if (v >= 0) return 3;
      return 1;
    },
    evEbitda: (v) => {
      if (v === null || v === undefined) return null;
      if (v < 8) return 10;
      if (v < 12) return 8;
      if (v < 16) return 6;
      if (v < 20) return 4;
      return 2;
    }
  },

  // 4 buckets — moet exact overeenkomen met de 4 OORDEEL-keys in de frontend
  adviesDrempels: [
    { min: 9.0, advies: "STERKE KOOP", veiligheidsmarge: 0.05 },
    { min: 8.0, advies: "KOOP", veiligheidsmarge: 0.10 },
    { min: 7.0, advies: "NEUTRAAL", veiligheidsmarge: 0.15 },
    { min: -Infinity, advies: "VERMIJD", veiligheidsmarge: 0.20 }
  ],

  completenessDrempels: [
    { min: 0.95, label: "Zeer hoge betrouwbaarheid" },
    { min: 0.80, label: "Hoge betrouwbaarheid" },
    { min: 0.60, label: "Gemiddelde betrouwbaarheid" },
    { min: -Infinity, label: "Lage betrouwbaarheid" }
  ]
};

function normalizeWeights(baseWeights, availableKeys) {
  const filtered = {};
  let total = 0;
  for (const key of availableKeys) {
    if (baseWeights[key] !== undefined) {
      filtered[key] = baseWeights[key];
      total += baseWeights[key];
    }
  }
  if (total === 0) return {};
  const normalized = {};
  for (const key in filtered) normalized[key] = filtered[key] / total;
  return normalized;
}

function calculateCategoryScore(metricScores, baseWeights) {
  const availableKeys = Object.keys(metricScores).filter(
    (k) => metricScores[k] !== null && metricScores[k] !== undefined
  );
  const totalMetrics = Object.keys(baseWeights).length;
  const completeness = totalMetrics === 0 ? 0 : availableKeys.length / totalMetrics;

  if (availableKeys.length === 0) {
    return { score: null, completeness: 0, availableCount: 0, totalCount: totalMetrics };
  }

  const normalizedWeights = normalizeWeights(baseWeights, availableKeys);
  let score = 0;
  for (const key of availableKeys) score += metricScores[key] * normalizedWeights[key];

  return {
    score: Math.round(score * 100) / 100,
    completeness,
    availableCount: availableKeys.length,
    totalCount: totalMetrics
  };
}

function lookupThreshold(value, drempelArray) {
  for (const entry of drempelArray) {
    if (value >= entry.min) return entry;
  }
  return drempelArray[drempelArray.length - 1];
}

/**
 * input = { revenueGrowth, epsGrowth, roe, profitMargin, fcfTrend, debtToEquity,
 *           peVsSectorPct, evEbitda, fcfYield, sector }
 * sector wordt ongewijzigd doorgegeven in de output — nodig voor de P/E sectorband
 * in de frontend metrics-grid, staat los van de scoring-logica.
 */
function calculateStockScore(input) {
  const rawScores = {
    revenueGrowth: CONFIG.scoreTabellen.revenueGrowth(input.revenueGrowth),
    epsGrowth: CONFIG.scoreTabellen.epsGrowth(input.epsGrowth),
    roe: CONFIG.scoreTabellen.roe(input.roe),
    profitMargin: CONFIG.scoreTabellen.profitMargin(input.profitMargin),
    fcfTrend: CONFIG.scoreTabellen.fcfTrend(input.fcfTrend),
    debtToEquity: CONFIG.scoreTabellen.debtToEquity(input.debtToEquity),
    pe: CONFIG.scoreTabellen.pe(input.peVsSectorPct),
    evEbitda: CONFIG.scoreTabellen.evEbitda(input.evEbitda),
    fcfYield: CONFIG.scoreTabellen.fcfYield(input.fcfYield)
  };

  const isHypergroei =
    input.revenueGrowth !== null && input.revenueGrowth !== undefined &&
    input.epsGrowth !== null && input.epsGrowth !== undefined &&
    input.revenueGrowth > CONFIG.hypergroei.drempelRevenueGrowth &&
    input.epsGrowth > CONFIG.hypergroei.drempelEpsGrowth;

  const waarderingBaseWeights = isHypergroei
    ? CONFIG.hypergroei.waarderingWeights
    : CONFIG.categorieMetricWeights.waardering;

  const bedrijfskwaliteit = calculateCategoryScore(
    {
      revenueGrowth: rawScores.revenueGrowth,
      epsGrowth: rawScores.epsGrowth,
      roe: rawScores.roe,
      profitMargin: rawScores.profitMargin
    },
    CONFIG.categorieMetricWeights.bedrijfskwaliteit
  );

  const financieleGezondheid = calculateCategoryScore(
    { fcfTrend: rawScores.fcfTrend, debtToEquity: rawScores.debtToEquity },
    CONFIG.categorieMetricWeights.financieleGezondheid
  );

  const waardering = calculateCategoryScore(
    { pe: rawScores.pe, evEbitda: rawScores.evEbitda, fcfYield: rawScores.fcfYield },
    waarderingBaseWeights
  );

  const categorieScores = { bedrijfskwaliteit, financieleGezondheid, waardering };
  const beschikbareCategorieen = Object.keys(categorieScores).filter(
    (k) => categorieScores[k].score !== null
  );

  let eindscore = null;
  if (beschikbareCategorieen.length > 0) {
    const normalizedCatWeights = normalizeWeights(CONFIG.eindscoreWeights, beschikbareCategorieen);
    eindscore = 0;
    for (const cat of beschikbareCategorieen) {
      eindscore += categorieScores[cat].score * normalizedCatWeights[cat];
    }
    eindscore = Math.round(eindscore * 100) / 100;
  }

  const allMetricKeys = Object.keys(rawScores);
  const gebruikteMetrics = allMetricKeys.filter((k) => rawScores[k] !== null).map((k) => METRIC_LABELS[k]);
  const ontbrekendeMetrics = allMetricKeys.filter((k) => rawScores[k] === null).map((k) => METRIC_LABELS[k]);

  const dataCompleteness = allMetricKeys.length === 0 ? 0 : gebruikteMetrics.length / allMetricKeys.length;
  const dataCompletenessLabel = lookupThreshold(dataCompleteness, CONFIG.completenessDrempels).label;

  let adviesResult = { advies: "Onvoldoende data", veiligheidsmarge: null };
  if (eindscore !== null) adviesResult = lookupThreshold(eindscore, CONFIG.adviesDrempels);

  return {
    engineVersion: ENGINE_VERSION,
    eindscore,
    bedrijfskwaliteit: bedrijfskwaliteit.score,
    financieleGezondheid: financieleGezondheid.score,
    waardering: waardering.score,
    advies: adviesResult.advies,
    veiligheidsmarge: adviesResult.veiligheidsmarge,
    isHypergroei,
    dataCompleteness: Math.round(dataCompleteness * 1000) / 10,
    dataCompletenessLabel,
    gebruikteMetrics,
    ontbrekendeMetrics,
    sector: input.sector ?? null,
    _detail: { bedrijfskwaliteit, financieleGezondheid, waardering, ruweScores: rawScores }
  };
}

// ============================================================
// MAPPING-LAAG — NIET GEVERIFIEERD tegen echte Finnhub response.
// Pas ALLEEN dit blok aan als veldnamen afwijken.
// ============================================================

function mapFinnhubToInput(metric, peVsSectorPct, evEbitdaValue, fcfYieldValue, fcfTrendValue, sector) {
  return {
    revenueGrowth: metric?.revenueGrowthTTMYoy ?? null,
    epsGrowth: metric?.epsGrowthTTMYoy ?? null,
    roe: metric?.roeTTM ?? null,
    profitMargin: metric?.netProfitMarginTTM ?? null,
    debtToEquity: metric?.totalDebtToEquityQuarterly ?? null,
    fcfTrend: fcfTrendValue ?? null,
    peVsSectorPct: peVsSectorPct ?? null,
    evEbitda: evEbitdaValue ?? null,
    fcfYield: fcfYieldValue ?? null,
    sector: sector ?? null
  };
}

// ============================================================
// WEBHOOK CONTRACT — dit is exact wat de n8n workflow moet
// teruggeven onder result.beoordeling (naast result.raw_data
// en result.ticker, die ongewijzigd blijven):
//
// {
//   engineVersion: "1.0.0",
//   eindscore: 8.4,
//   bedrijfskwaliteit: 8.7,
//   financieleGezondheid: 7.9,
//   waardering: 6.1,
//   advies: "KOOP",
//   veiligheidsmarge: 0.10,
//   isHypergroei: false,
//   dataCompleteness: 88.9,
//   dataCompletenessLabel: "Hoge betrouwbaarheid",
//   gebruikteMetrics: ["Omzetgroei", "EPS Groei", ...],
//   ontbrekendeMetrics: ["EV/EBITDA"],
//   sector: "AI Software",
//   samenvatting: "...",       // AI-gegenereerd, puur toelichting
//   sterkePunten: ["...", "..."],
//   zwakkePunten: ["...", "..."],
//   vooruitzichten: "..."
// }
//
// GEBRUIK IN N8N CODE NODE:
// const input = mapFinnhubToInput($json.metric, peVsSectorPct, evEbitdaVal, fcfYieldVal, fcfTrendVal, sectorNaam);
// const score = calculateStockScore(input);
// return [{ json: { ticker, raw_data: {...}, beoordeling: { ...score, samenvatting, sterkePunten, zwakkePunten, vooruitzichten } } }];
// ============================================================

module.exports = { CONFIG, calculateStockScore, mapFinnhubToInput, normalizeWeights };
