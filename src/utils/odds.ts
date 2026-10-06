/**
 * Boat Race Odds and Synthetic Odds Utility
 */

import { CONFIG } from '../constants/boatrace';
import {
  OddsData,
  SyntheticOddsSummary,
  TrifectaOddsMap,
  AllocationRow,
} from '../types/boatrace';

/**
 * Calculate synthetic odds: 1 / Σ(1 / o_i)
 */
export function calcSyntheticOdds(oddsList: number[]): number {
  const validOdds = oddsList.filter((o) => typeof o === 'number' && o > 0);
  if (validOdds.length === 0) return 0;

  const invSum = validOdds.reduce((sum, o) => sum + 1 / o, 0);
  if (invSum <= 0) return 0;

  return Number((1 / invSum).toFixed(2));
}

/**
 * Calculate stake distribution and synthetic odds summary
 * Balances stakes in 100 yen increments so each bet yields approximately equal payout.
 */
export function calcStakeAllocation(
  selectedCombinations: string[],
  oddsMap: TrifectaOddsMap,
  budget: number,
  modelProbMap?: Map<string, number>
): SyntheticOddsSummary {
  if (!selectedCombinations || selectedCombinations.length === 0) {
    return {
      betCount: 0,
      syntheticOdds: 0,
      modelHitProb: 0,
      impliedOddsHitProb: 0,
      totalCost: 0,
      rows: [],
      minReturn: 0,
      maxReturn: 0,
      allocationError: 0,
    };
  }

  const validBets = selectedCombinations
    .map((comb) => ({
      combination: comb,
      odds: oddsMap[comb] ?? 0,
      modelProb: modelProbMap?.get(comb) ?? 0,
    }))
    .filter((b) => b.odds > 0);

  // If no odds are available yet: fallback to equal split of budget
  if (validBets.length === 0) {
    const count = selectedCombinations.length;
    const safeBudget = Math.max(count * 100, Math.round(budget / 100) * 100);
    const baseAmt = Math.max(100, Math.floor(safeBudget / count / 100) * 100);
    let remainder = safeBudget - baseAmt * count;

    const rows: AllocationRow[] = selectedCombinations.map((comb) => {
      let amt = baseAmt;
      if (remainder >= 100) {
        amt += 100;
        remainder -= 100;
      }
      return {
        combination: comb,
        odds: 0,
        modelProb: modelProbMap?.get(comb) ?? 0,
        weight: 1 / count,
        rawAmount: safeBudget / count,
        amount: amt,
        expectedReturn: 0,
        returnRate: 0,
      };
    });

    return {
      betCount: count,
      syntheticOdds: 0,
      modelHitProb: 0,
      impliedOddsHitProb: 0,
      totalCost: rows.reduce((s, r) => s + r.amount, 0),
      rows,
      minReturn: 0,
      maxReturn: 0,
      allocationError: 0,
    };
  }

  const oddsList = validBets.map((b) => b.odds);
  const syntheticOdds = calcSyntheticOdds(oddsList);
  const invSum = validBets.reduce((sum, b) => sum + 1 / b.odds, 0);

  // Model hit probability (sum of probabilities)
  const modelHitProb = validBets.reduce((sum, b) => sum + (b.modelProb || 0), 0);
  // Odds implied hit probability: Σ(1/o_i) * 0.75
  const impliedOddsHitProb = invSum * CONFIG.PAYOUT_RATE;

  // Target budget must be at least 100 yen per bet
  const minRequired = validBets.length * 100;
  const targetBudget = Math.max(minRequired, Math.round(budget / 100) * 100);

  // Step 1: Initial proportional stake calculation
  const rows: AllocationRow[] = validBets.map((b) => {
    const weight = 1 / b.odds / invSum;
    const rawAmount = targetBudget * weight;
    const rounded = Math.round(rawAmount / 100) * 100;
    const amount = Math.max(100, rounded);
    const expectedReturn = Math.round(amount * b.odds);
    const returnRate = amount > 0 ? (expectedReturn / amount) * 100 : 0;

    return {
      combination: b.combination,
      odds: b.odds,
      modelProb: b.modelProb,
      weight,
      rawAmount,
      amount,
      expectedReturn,
      returnRate,
    };
  });

  // Step 2: Balance discrepancy to make payouts as equal as possible
  let totalCost = rows.reduce((sum, r) => sum + r.amount, 0);

  // If under budget: add 100 yen to the bet with the lowest expected payout
  while (totalCost < targetBudget) {
    let minIdx = -1;
    let minRet = Infinity;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].expectedReturn < minRet) {
        minRet = rows[i].expectedReturn;
        minIdx = i;
      }
    }
    if (minIdx === -1) minIdx = 0;
    rows[minIdx].amount += 100;
    rows[minIdx].expectedReturn = Math.round(rows[minIdx].amount * rows[minIdx].odds);
    rows[minIdx].returnRate = (rows[minIdx].expectedReturn / rows[minIdx].amount) * 100;
    totalCost += 100;
  }

  // If over budget: subtract 100 yen from the bet with the highest expected payout (staying >= 100)
  while (totalCost > targetBudget) {
    let maxIdx = -1;
    let maxRet = -1;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].amount > 100 && rows[i].expectedReturn > maxRet) {
        maxRet = rows[i].expectedReturn;
        maxIdx = i;
      }
    }
    if (maxIdx === -1) break; // Cannot reduce further without violating min 100
    rows[maxIdx].amount -= 100;
    rows[maxIdx].expectedReturn = Math.round(rows[maxIdx].amount * rows[maxIdx].odds);
    rows[maxIdx].returnRate = (rows[maxIdx].expectedReturn / rows[maxIdx].amount) * 100;
    totalCost -= 100;
  }

  const returns = rows.map((r) => r.expectedReturn);
  const minReturn = returns.length > 0 ? Math.min(...returns) : 0;
  const maxReturn = returns.length > 0 ? Math.max(...returns) : 0;
  const allocationError = totalCost - targetBudget;

  return {
    betCount: validBets.length,
    syntheticOdds,
    modelHitProb,
    impliedOddsHitProb,
    totalCost,
    rows,
    minReturn,
    maxReturn,
    allocationError,
  };
}

/**
 * Parse Official Boatrace odds3t HTML page
 */
export function parseOfficialOddsHtml(
  htmlText: string,
  raceNumber: number,
  stadiumId: number,
  date: string
): OddsData {
  const oddsMap: TrifectaOddsMap = {};
  let updateTime = '';

  // Extract update time: e.g. "締切時オッズ", "14:25更新", or time stamps
  const closedMatch = htmlText.match(/締切時オッズ/);
  const timeMatch = htmlText.match(/(?:オッズ更新時間|更新時間|更新)\s*[:：]?\s*([0-9]{1,2}:[0-9]{2})/);
  if (closedMatch) {
    updateTime = '締切時オッズ (確定)';
  } else if (timeMatch) {
    updateTime = timeMatch[1];
  } else {
    const now = new Date();
    updateTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }

  // Strategy 1: Dedicated official boatrace.jp 3t table row parser
  // boatrace.jp odds3t has 20 <tr> in tbody. In each row, there are 6 columns corresponding to 1st boat 1..6.
  // 2nd boat has rowspan="4", 3rd boat is next cell, oddsPoint is the odds cell.
  try {
    const tbMatches = htmlText.match(/<tbody[\s\S]*?<\/tbody>/gi) || [];
    // The odds table is typically the second tbody (tbody 1)
    for (const tbodyHtml of tbMatches) {
      if (!tbodyHtml.includes('oddsPoint')) continue;

      const trMatches = tbodyHtml.match(/<tr[\s\S]*?<\/tr>/gi) || [];
      if (trMatches.length >= 20) {
        const currentSeconds = [0, 0, 0, 0, 0, 0]; // for 1st boat 1..6

        for (let rIdx = 0; rIdx < trMatches.length; rIdx++) {
          const tr = trMatches[rIdx];
          const tds = tr.match(/<td[\s\S]*?<\/td>/gi) || [];
          let tdIdx = 0;

          for (let f = 1; f <= 6; f++) {
            let sec = currentSeconds[f - 1];
            let thd = 0;
            let odds = 0;

            // Check if next td has rowspan (2nd boat)
            if (tdIdx < tds.length && tds[tdIdx].includes('rowspan')) {
              const m2 = tds[tdIdx].match(/>\s*([1-6])\s*<\/td>/i);
              if (m2) {
                sec = parseInt(m2[1], 10);
                currentSeconds[f - 1] = sec;
              }
              tdIdx++;
            }

            // 3rd boat td
            if (tdIdx < tds.length) {
              const m3 = tds[tdIdx].match(/>\s*([1-6])\s*<\/td>/i);
              if (m3) thd = parseInt(m3[1], 10);
              tdIdx++;
            }

            // oddsPoint td
            if (tdIdx < tds.length) {
              const mO = tds[tdIdx].match(/class=["'][^"']*oddsPoint[^"']*["'][^>]*>\s*([0-9]+(?:\.[0-9]+)?)/i);
              if (mO && mO[1]) {
                const val = parseFloat(mO[1]);
                if (!isNaN(val) && val > 0) odds = val;
              }
              tdIdx++;
            }

            if (sec > 0 && thd > 0 && odds > 0 && f !== sec && f !== thd && sec !== thd) {
              oddsMap[`${f}-${sec}-${thd}`] = odds;
            }
          }
        }

        if (Object.keys(oddsMap).length >= 100) {
          break;
        }
      }
    }
  } catch (err) {
    console.warn('Row parser failed, falling back:', err);
  }

  // Strategy 2: If DOMParser is available (Browser fallback)
  if (Object.keys(oddsMap).length < 60 && typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');
      const allOddsPoints = Array.from(doc.querySelectorAll('td.oddsPoint, td[class*="oddsPoint"]'));
      if (allOddsPoints.length >= 120) {
        let ptIdx = 0;
        for (let b1 = 1; b1 <= 6; b1++) {
          for (let b2 = 1; b2 <= 6; b2++) {
            if (b2 === b1) continue;
            for (let b3 = 1; b3 <= 6; b3++) {
              if (b3 === b1 || b3 === b2) continue;
              if (ptIdx < allOddsPoints.length) {
                const raw = allOddsPoints[ptIdx].textContent?.trim().replace(/,/g, '') || '';
                const val = parseFloat(raw);
                if (!isNaN(val) && val > 0) {
                  oddsMap[`${b1}-${b2}-${b3}`] = val;
                }
                ptIdx++;
              }
            }
          }
        }
      }
    } catch (e) {
      // Continue
    }
  }

  // Strategy 3: Direct tr rows with [b1, b2, b3, oddsPoint] or regex pattern
  if (Object.keys(oddsMap).length < 20) {
    const trRegex = /<tr[^>]*>[\s\S]*?([1-6])[\s\S]*?([1-6])[\s\S]*?([1-6])[\s\S]*?class=["'][^"']*oddsPoint[^"']*["'][^>]*>\s*([0-9.]+)/gi;
    let trMatch;
    while ((trMatch = trRegex.exec(htmlText)) !== null) {
      const [, b1, b2, b3, oddsStr] = trMatch;
      const n1 = parseInt(b1, 10);
      const n2 = parseInt(b2, 10);
      const n3 = parseInt(b3, 10);
      if (n1 !== n2 && n2 !== n3 && n1 !== n3) {
        const val = parseFloat(oddsStr);
        if (val > 0) {
          oddsMap[`${n1}-${n2}-${n3}`] = val;
        }
      }
    }
  }

  // Strategy 4: Regex string fallback (1-2-3: 12.5)
  if (Object.keys(oddsMap).length < 20) {
    const regexTrifecta = /\b([1-6])-([1-6])-([1-6])\b\s*[:：\t\s]*([0-9]+(?:\.[0-9]+)?)/g;
    let match;
    while ((match = regexTrifecta.exec(htmlText)) !== null) {
      const [, b1, b2, b3, oddsStr] = match;
      if (b1 !== b2 && b2 !== b3 && b1 !== b3) {
        const val = parseFloat(oddsStr);
        if (val > 0) {
          oddsMap[`${b1}-${b2}-${b3}`] = val;
        }
      }
    }
  }

  const validCount = Object.keys(oddsMap).length;
  return {
    raceNumber,
    stadiumId,
    date,
    updateTime: updateTime || '更新時間不明',
    oddsMap,
    isValid120: validCount === 120,
    validCount,
  };
}
