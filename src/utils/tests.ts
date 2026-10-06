/**
 * Unit verification tests for prediction model and synthetic odds logic
 */

import { predict } from './prediction';
import { calcSyntheticOdds, calcStakeAllocation, parseOfficialOddsHtml } from './odds';
import { BoatEntry, CoefSliders, WeatherData } from '../types/boatrace';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
  console.log(`✓ ${msg}`);
}

export function runAllTests() {
  console.log('--- Running Prediction and Odds Tests ---');

  // 1. Synthetic Odds test: 10.0 and 15.0 -> 6.0倍
  const synOdds = calcSyntheticOdds([10.0, 15.0]);
  assert(Math.abs(synOdds - 6.0) < 0.01, `Synthetic odds of 10.0 and 15.0 is 6.0 (got ${synOdds})`);

  // 2. Invalid odds excluded
  const synWithZero = calcSyntheticOdds([10.0, 0, -1, 15.0]);
  assert(synWithZero === synOdds, `Invalid odds (0, negative) excluded cleanly`);

  // 3. Stake allocation test with 100 yen rounding
  const alloc = calcStakeAllocation(['1-2-3', '1-2-4'], { '1-2-3': 10.0, '1-2-4': 15.0 }, 1000);
  assert(alloc.betCount === 2, `Selected 2 valid bets`);
  assert(alloc.rows[0].amount + alloc.rows[1].amount === alloc.totalCost, `Total cost matches sum of rows`);
  assert(alloc.rows[0].amount % 100 === 0 && alloc.rows[1].amount % 100 === 0, `Amounts rounded to 100 yen`);

  // 4. Prediction model: Sum of 120 Trifecta probabilities must equal 1.0
  const sampleBoats: BoatEntry[] = [
    {
      boatNumber: 1,
      racerName: '峰 竜太',
      racerClass: 'A1',
      branch: '佐賀',
      nationalWinRate: 8.5,
      nationalTop2Rate: 65.0,
      nationalTop3Rate: 80.0,
      localTop2Rate: 60.0,
      localTop3Rate: 75.0,
      motorTop2Rate: 42.0,
      avgST: 0.12,
      exhibitionTime: 6.68,
    },
    {
      boatNumber: 2,
      racerName: '毒島 誠',
      racerClass: 'A1',
      branch: '群馬',
      nationalWinRate: 7.8,
      nationalTop2Rate: 58.0,
      nationalTop3Rate: 72.0,
      localTop2Rate: 50.0,
      localTop3Rate: 68.0,
      motorTop2Rate: 38.0,
      avgST: 0.13,
      exhibitionTime: 6.72,
    },
    {
      boatNumber: 3,
      racerName: '白井 英治',
      racerClass: 'A1',
      branch: '山口',
      nationalWinRate: 7.5,
      nationalTop2Rate: 52.0,
      nationalTop3Rate: 70.0,
      localTop2Rate: 48.0,
      localTop3Rate: 65.0,
      motorTop2Rate: 35.0,
      avgST: 0.14,
      exhibitionTime: 6.74,
    },
    {
      boatNumber: 4,
      racerName: '茅原 悠紀',
      racerClass: 'A1',
      branch: '岡山',
      nationalWinRate: 7.6,
      nationalTop2Rate: 55.0,
      nationalTop3Rate: 73.0,
      localTop2Rate: 51.0,
      localTop3Rate: 67.0,
      motorTop2Rate: 40.0,
      avgST: 0.13,
      exhibitionTime: 6.70,
    },
    {
      boatNumber: 5,
      racerName: '平本 真之',
      racerClass: 'A1',
      branch: '愛知',
      nationalWinRate: 7.2,
      nationalTop2Rate: 49.0,
      nationalTop3Rate: 66.0,
      localTop2Rate: 45.0,
      localTop3Rate: 62.0,
      motorTop2Rate: 33.0,
      avgST: 0.15,
      exhibitionTime: 6.78,
    },
    {
      boatNumber: 6,
      racerName: '池田 浩二',
      racerClass: 'A1',
      branch: '愛知',
      nationalWinRate: 7.4,
      nationalTop2Rate: 51.0,
      nationalTop3Rate: 68.0,
      localTop2Rate: 46.0,
      localTop3Rate: 63.0,
      motorTop2Rate: 36.0,
      avgST: 0.14,
      exhibitionTime: 6.75,
    },
  ];

  const courses = [0, 1, 2, 3, 4, 5];
  const weather: WeatherData = {
    windSpeed: 4,
    windDirectionCode: 5, // 追い風
    waveHeight: 3,
  };
  const sliders: CoefSliders = {
    localTop2: 0,
    motorTop2: 0,
    exhibitionTime: 0,
  };

  const pred120 = predict(sampleBoats, courses, weather, sliders, 120, 30, 20);
  const sumTrifecta = pred120.trifectaBets.reduce((s, b) => s + b.probability, 0);
  assert(
    Math.abs(sumTrifecta - 1.0) < 1e-5,
    `Sum of all 120 trifecta probabilities is 1.0 (got ${sumTrifecta})`
  );

  const sum1st = pred120.firstProbabilities.reduce((s, p) => s + p, 0);
  assert(
    Math.abs(sum1st - 1.0) < 1e-5,
    `Sum of 1st place probabilities is 1.0 (got ${sum1st})`
  );

  // 5. 120 Odds HTML parsing test (simulating 120 odds items)
  let simulatedHtml = `<html><body><p class="tab3_time">オッズ更新時間 11:30</p><table>`;
  for (let b1 = 1; b1 <= 6; b1++) {
    for (let b2 = 1; b2 <= 6; b2++) {
      if (b2 === b1) continue;
      for (let b3 = 1; b3 <= 6; b3++) {
        if (b3 === b1 || b3 === b2) continue;
        const fakeOdds = (b1 * 10 + b2 * 2 + b3 * 0.5).toFixed(1);
        simulatedHtml += `<tr><th>${b1}</th><td>${b2}</td><td>${b3}</td><td class="oddsPoint">${fakeOdds}</td></tr>`;
      }
    }
  }
  simulatedHtml += `</table></body></html>`;

  const parsed = parseOfficialOddsHtml(simulatedHtml, 1, 2, '20261006');
  assert(parsed.validCount === 120, `Parsed all 120 combinations cleanly (got ${parsed.validCount})`);
  assert(parsed.updateTime === '11:30', `Parsed update time 11:30 (got ${parsed.updateTime})`);

  console.log('--- All Tests Passed Successfully! ---');
}
