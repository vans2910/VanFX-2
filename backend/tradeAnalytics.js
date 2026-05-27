function calculateTradeAnalytics(closedTrades) {
  if (!Array.isArray(closedTrades)) {
    throw new TypeError('closedTrades must be an array');
  }

  const metrics = {
    totalTrades: closedTrades.length,
    winningTrades: 0,
    losingTrades: 0,
    breakEvenTrades: 0,
    winRate: 0,
    grossProfit: 0,
    grossLoss: 0,
    netProfit: 0,
    totalPips: 0,
    profitFactor: null,
    bySymbol: {},
    weeklyWins: {},
    monthlyNetProfit: {}
  };

  for (const trade of closedTrades) {
    const normalized = normalizeTrade(trade);
    const symbol = normalized.symbol;

    metrics.grossProfit += normalized.profit > 0 ? normalized.profit : 0;
    metrics.grossLoss += normalized.profit < 0 ? Math.abs(normalized.profit) : 0;
    metrics.netProfit += normalized.profit;
    metrics.totalPips += normalized.pips;

    if (normalized.profit > 0) metrics.winningTrades += 1;
    else if (normalized.profit < 0) metrics.losingTrades += 1;
    else metrics.breakEvenTrades += 1;

    if (!metrics.bySymbol[symbol]) {
      metrics.bySymbol[symbol] = {
        trades: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        netProfit: 0,
        totalPips: 0
      };
    }

    const symbolStats = metrics.bySymbol[symbol];
    symbolStats.trades += 1;
    symbolStats.netProfit += normalized.profit;
    symbolStats.totalPips += normalized.pips;
    if (normalized.profit > 0) symbolStats.wins += 1;
    if (normalized.profit < 0) symbolStats.losses += 1;

    const weekKey = getIsoWeekKey(normalized.closeTime);
    if (!metrics.weeklyWins[weekKey]) metrics.weeklyWins[weekKey] = 0;
    if (normalized.profit > 0) metrics.weeklyWins[weekKey] += 1;

    const monthKey = getMonthKey(normalized.closeTime);
    if (!metrics.monthlyNetProfit[monthKey]) metrics.monthlyNetProfit[monthKey] = 0;
    metrics.monthlyNetProfit[monthKey] += normalized.profit;
  }

  metrics.winRate = rate(metrics.winningTrades, metrics.totalTrades);
  metrics.profitFactor = metrics.grossLoss === 0
    ? (metrics.grossProfit > 0 ? Infinity : null)
    : round(metrics.grossProfit / metrics.grossLoss);

  for (const symbolStats of Object.values(metrics.bySymbol)) {
    symbolStats.winRate = rate(symbolStats.wins, symbolStats.trades);
    symbolStats.netProfit = round(symbolStats.netProfit);
    symbolStats.totalPips = round(symbolStats.totalPips);
  }

  metrics.grossProfit = round(metrics.grossProfit);
  metrics.grossLoss = round(metrics.grossLoss);
  metrics.netProfit = round(metrics.netProfit);
  metrics.totalPips = round(metrics.totalPips);

  for (const month of Object.keys(metrics.monthlyNetProfit)) {
    metrics.monthlyNetProfit[month] = round(metrics.monthlyNetProfit[month]);
  }

  return metrics;
}

function normalizeTrade(trade) {
  const profit = Number(trade.profit);
  const pips = Number(trade.pips ?? trade.pipsTaken ?? 0);
  const closeTime = new Date(trade.closeTime || trade.close_time || trade.closedAt);
  const openTime = new Date(trade.openTime || trade.open_time || trade.openedAt);
  const symbol = String(trade.symbol || trade.currencySymbol || trade.pair || '').trim().toUpperCase();

  if (!Number.isFinite(profit)) throw new TypeError('Each trade must include a numeric profit');
  if (!Number.isFinite(pips)) throw new TypeError('Each trade must include numeric pips');
  if (!symbol) throw new TypeError('Each trade must include a symbol');
  if (Number.isNaN(openTime.getTime())) throw new TypeError('Each trade must include a valid openTime');
  if (Number.isNaN(closeTime.getTime())) throw new TypeError('Each trade must include a valid closeTime');

  return { profit, pips, symbol, openTime, closeTime };
}

function rate(part, total) {
  return total === 0 ? 0 : round((part / total) * 100);
}

function round(value, places = 2) {
  return Number(Number(value).toFixed(places));
}

function getMonthKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function getIsoWeekKey(date) {
  const working = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = working.getUTCDay() || 7;
  working.setUTCDate(working.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(working.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((working - yearStart) / 86400000) + 1) / 7);
  return `${working.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

module.exports = { calculateTradeAnalytics };

if (require.main === module) {
  const sampleClosedTrades = [
    { symbol: 'EURUSD', profit: 45.2, pips: 18.4, openTime: '2026-05-01T09:10:00Z', closeTime: '2026-05-01T11:35:00Z' },
    { symbol: 'GBPUSD', profit: -20, pips: -8, openTime: '2026-05-02T08:00:00Z', closeTime: '2026-05-02T09:15:00Z' },
    { symbol: 'EURUSD', profit: 32.6, pips: 12.1, openTime: '2026-05-08T13:20:00Z', closeTime: '2026-05-08T15:00:00Z' },
    { symbol: 'USDJPY', profit: 0, pips: 0, openTime: '2026-06-03T10:00:00Z', closeTime: '2026-06-03T10:30:00Z' }
  ];

  console.log(JSON.stringify(calculateTradeAnalytics(sampleClosedTrades), null, 2));
}
