/**
 * Statistical Plackett-Luce Model for Boat Race Prediction
 * Based on maximum likelihood estimation over 264,035 races (2022-2026)
 */

import { CONFIG } from '../constants/boatrace';
import {
  BoatEntry,
  CoefSliders,
  WeatherData,
  PredictionResult,
  BetPrediction,
  FormationGroup,
} from '../types/boatrace';

/**
 * Calculate wind term by course according to §7-3
 */
export function calcWindTerms(weather: WeatherData): number[] {
  const { windSpeed: w, windDirectionCode: code } = weather;
  const terms = [0, 0, 0, 0, 0, 0];

  if (!w || w <= 0 || code === null || code === undefined || code >= 17) {
    return terms;
  }

  // τ: tailwind component, σ: crosswind component (code 5 = pure tailwind, code 13 = headwind)
  const angle = ((code - 5) * Math.PI) / 8;
  const tau = Math.cos(angle);
  const sigma = Math.sin(angle);
  const h = Math.max(0, w - 5);

  for (let c = 0; c < 6; c++) {
    terms[c] =
      CONFIG.WIND_LIN[c] * w +
      CONFIG.WIND_OVER5[c] * h +
      CONFIG.WIND_TAIL[c] * w * tau +
      CONFIG.WIND_CROSS[c] * w * sigma +
      CONFIG.WIND_TAIL_OVER5[c] * h * tau +
      CONFIG.WIND_CROSS_OVER5[c] * h * sigma;
  }

  return terms;
}

/**
 * Calculate wind effect differences from course average for UI presentation
 */
export function calcWindEffectDifferences(weather: WeatherData): number[] {
  const terms = calcWindTerms(weather);
  const avg = terms.reduce((a, b) => a + b, 0) / 6;
  return terms.map((t) => Number((t - avg).toFixed(2)));
}

/**
 * Core prediction function according to §7-2, §7-4, §7-5
 */
export function predict(
  boats: BoatEntry[],
  courses: number[], // 0-indexed course for each boat (length 6)
  weather: WeatherData,
  coefSliders: CoefSliders,
  nTrifecta: number = 5,
  nExacta: number = 3,
  nTrio: number = 3
): PredictionResult {
  if (!boats || boats.length < 6) {
    return {
      scores: [0, 0, 0, 0, 0, 0],
      firstProbabilities: [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6],
      trifectaBets: [],
      trifectaFormations: [],
      exactaBets: [],
      trioBets: [],
    };
  }

  // Modulated coefficients from sliders: base * (1 + slider/3)
  const cL2_prime = CONFIG.cL2 * (1 + coefSliders.localTop2 / 3);
  const cM2_prime = CONFIG.cM2 * (1 + coefSliders.motorTop2 / 3);
  const exCoef_prime = CONFIG.EX_COEF.map(
    (val) => val * (1 + coefSliders.exhibitionTime / 3)
  );

  const windTerms = calcWindTerms(weather);

  // Exhibition times check: must be > 0 for all 6 boats
  const allExValid = boats.every((b) => b.exhibitionTime > 0);
  const meanEx = allExValid
    ? boats.reduce((sum, b) => sum + b.exhibitionTime, 0) / 6
    : 0;

  // Calculate score for each boat
  const scores: number[] = new Array(6).fill(0);

  for (let i = 0; i < 6; i++) {
    const boat = boats[i];
    const c = courses[i] ?? i; // 0-indexed course (0 to 5)

    const winRate = boat.nationalWinRate || 5.5;
    const n2Rate = boat.nationalTop2Rate || 35.0;
    const l2Rate = boat.localTop2Rate || 35.0;
    const m2Rate = boat.motorTop2Rate || 35.0;
    const avgST = boat.avgST > 0 ? boat.avgST : 0.16;

    const gradeAdj = CONFIG.GRADE_ADJ[boat.racerClass] ?? 0;
    const exTerm = allExValid
      ? exCoef_prime[c] * (boat.exhibitionTime - meanEx)
      : 0;

    // Front entry penalty: entering inside assigned boat number (boat.boatNumber is 1..6, so boat index is boatNumber - 1)
    const inwardMoves = Math.max(0, boat.boatNumber - 1 - c);
    const frontPenalty = CONFIG.FRONT_ENTRY_PENALTY * inwardMoves;

    scores[i] =
      CONFIG.COURSE_INTERCEPT[c] +
      CONFIG.cWin * (winRate - 5.5) +
      CONFIG.cN2 * (n2Rate - 35.0) +
      cL2_prime * (l2Rate - 35.0) +
      cM2_prime * (m2Rate - 35.0) -
      CONFIG.ST_COEF[c] * (avgST - 0.16) +
      gradeAdj -
      exTerm +
      windTerms[c] +
      frontPenalty;
  }

  // Plackett-Luce exponential terms with temperature parameters
  const maxScore = Math.max(...scores);
  const e1 = scores.map((s) => Math.exp(s - maxScore));
  const sum_e1 = e1.reduce((sum, v) => sum + v, 0);

  // 1st place probabilities
  const firstProbabilities = e1.map((v) => v / sum_e1);

  // 2nd and 3rd rank terms
  const e2 = scores.map((s, i) => {
    const c = courses[i] ?? i;
    return Math.exp(
      CONFIG.LAMBDA[1] * (s - maxScore) + CONFIG.COURSE_OFFSET2[c]
    );
  });
  const sum_e2 = e2.reduce((sum, v) => sum + v, 0);

  const e3 = scores.map((s, i) => {
    const c = courses[i] ?? i;
    return Math.exp(
      CONFIG.LAMBDA[2] * (s - maxScore) + CONFIG.COURSE_OFFSET3[c]
    );
  });
  const sum_e3 = e3.reduce((sum, v) => sum + v, 0);

  // Compute all 120 Trifecta (3連単) probabilities
  const allTrifecta: BetPrediction[] = [];
  for (let a = 0; a < 6; a++) {
    const p1_a = e1[a] / sum_e1;
    const rem_e2 = sum_e2 - e2[a];

    for (let b = 0; b < 6; b++) {
      if (b === a) continue;
      const p2_b = e2[b] / rem_e2;
      const rem_e3 = sum_e3 - e3[a] - e3[b];

      for (let d = 0; d < 6; d++) {
        if (d === a || d === b) continue;
        const p3_d = e3[d] / rem_e3;
        const prob = p1_a * p2_b * p3_d;

        allTrifecta.push({
          combination: `${boats[a].boatNumber}-${boats[b].boatNumber}-${boats[d].boatNumber}`,
          boats: [
            boats[a].boatNumber,
            boats[b].boatNumber,
            boats[d].boatNumber,
          ],
          probability: prob,
        });
      }
    }
  }

  // Sort descending by probability
  allTrifecta.sort((x, y) => y.probability - x.probability);
  const trifectaBets = nTrifecta > 0 ? allTrifecta.slice(0, nTrifecta) : [];

  // Group into minimal formations
  const trifectaFormations = groupTrifectaFormations(trifectaBets);

  // Compute all 30 Exacta (2連単) probabilities
  const allExacta: BetPrediction[] = [];
  for (let a = 0; a < 6; a++) {
    const p1_a = e1[a] / sum_e1;
    const rem_e2 = sum_e2 - e2[a];

    for (let b = 0; b < 6; b++) {
      if (b === a) continue;
      const p2_b = e2[b] / rem_e2;
      allExacta.push({
        combination: `${boats[a].boatNumber}-${boats[b].boatNumber}`,
        boats: [boats[a].boatNumber, boats[b].boatNumber],
        probability: p1_a * p2_b,
      });
    }
  }
  allExacta.sort((x, y) => y.probability - x.probability);
  const exactaBets = nExacta > 0 ? allExacta.slice(0, nExacta) : [];

  // Compute all 20 Trio (3連複) probabilities (sum of 6 trifecta permutations)
  const trioMap = new Map<string, { boats: number[]; prob: number }>();
  for (let a = 0; a < 6; a++) {
    for (let b = a + 1; b < 6; b++) {
      for (let d = b + 1; d < 6; d++) {
        const key = `${boats[a].boatNumber}=${boats[b].boatNumber}=${boats[d].boatNumber}`;
        trioMap.set(key, {
          boats: [
            boats[a].boatNumber,
            boats[b].boatNumber,
            boats[d].boatNumber,
          ],
          prob: 0,
        });
      }
    }
  }

  for (const tri of allTrifecta) {
    const sorted = [...tri.boats].sort((x, y) => x - y);
    const key = `${sorted[0]}=${sorted[1]}=${sorted[2]}`;
    const item = trioMap.get(key);
    if (item) {
      item.prob += tri.probability;
    }
  }

  const allTrio: BetPrediction[] = Array.from(trioMap.entries()).map(
    ([key, value]) => ({
      combination: key,
      boats: value.boats,
      probability: value.prob,
    })
  );
  allTrio.sort((x, y) => y.probability - x.probability);
  const trioBets = nTrio > 0 ? allTrio.slice(0, nTrio) : [];

  return {
    scores,
    firstProbabilities,
    trifectaBets,
    trifectaFormations,
    exactaBets,
    trioBets,
  };
}

/**
 * Formation grouping algorithm:
 * Aggregates bets into minimal formations without commas (e.g. 1-2-345, 1-24-35).
 * Strictly guarantees that NO unselected bets are mixed in!
 * The points count equals the number of actual bets contained.
 */
export function groupTrifectaFormations(
  selectedBets: BetPrediction[]
): FormationGroup[] {
  if (selectedBets.length === 0) return [];

  const selectedMap = new Map<string, BetPrediction>();
  selectedBets.forEach((b) => selectedMap.set(b.combination, b));

  const remainingKeys = new Set(selectedMap.keys());
  const formations: FormationGroup[] = [];

  // 1. Group by 1st place and 2nd place: e.g. 1-2-3, 1-2-4, 1-2-5 -> 1-2-345
  // Check all distinct pairs of (1st, 2nd)
  const by12 = new Map<string, string[]>();
  for (const key of remainingKeys) {
    const [b1, b2, b3] = key.split('-');
    const prefix = `${b1}-${b2}`;
    if (!by12.has(prefix)) by12.set(prefix, []);
    by12.get(prefix)!.push(b3);
  }

  // Also check if multiple 2nd places share the exact same 3rd places:
  // e.g., 1-2-345 and 1-4-345? But only if 3rd places don't overlap with 2nd!
  // To keep it 100% accurate and standard boatrace formation format:
  // We first try 1-B-C formations, then 1-2-C formations.
  const by1 = new Map<string, string[]>();
  for (const key of remainingKeys) {
    const [b1] = key.split('-');
    if (!by1.has(b1)) by1.set(b1, []);
    by1.get(b1)!.push(key);
  }

  // Process 1st place groups
  for (const [firstBoat, keysIn1] of by1.entries()) {
    const subsetKeys = new Set(
      keysIn1.filter((k) => remainingKeys.has(k))
    );
    if (subsetKeys.size === 0) continue;

    // Check if we can form 1-BB-CC where BB and CC are cartesian product
    // Let's check 2nd places in this group
    const secondMap = new Map<string, Set<string>>();
    for (const key of subsetKeys) {
      const [, b2, b3] = key.split('-');
      if (!secondMap.has(b2)) secondMap.set(b2, new Set());
      secondMap.get(b2)!.add(b3);
    }

    // Check for identical 3rd sets across multiple 2nd boats
    const signatureMap = new Map<string, string[]>(); // signature -> list of b2
    for (const [b2, b3Set] of secondMap.entries()) {
      const sig = Array.from(b3Set).sort().join('');
      if (!signatureMap.has(sig)) signatureMap.set(sig, []);
      signatureMap.get(sig)!.push(b2);
    }

    for (const [sig, b2List] of signatureMap.entries()) {
      if (b2List.length > 1 && sig.length > 1) {
        // We have multiple 2nd boats sharing multiple 3rd boats!
        // E.g., b2List = ['2', '3'], sig = '45' -> bets 1-2-4, 1-2-5, 1-3-4, 1-3-5
        const b2Sorted = [...b2List].sort().join('');
        const b3Sorted = sig.split('').sort().join('');

        // Verify no collision between b2 and b3 (in formation, b2 != b3)
        let collision = false;
        for (const b2 of b2List) {
          if (sig.includes(b2)) collision = true;
        }

        if (!collision) {
          // Check all combinations exist in remaining
          const candidateBets: BetPrediction[] = [];
          let allPresent = true;
          for (const b2 of b2List) {
            for (const b3 of sig.split('')) {
              const k = `${firstBoat}-${b2}-${b3}`;
              if (!remainingKeys.has(k)) {
                allPresent = false;
                break;
              }
              candidateBets.push(selectedMap.get(k)!);
            }
            if (!allPresent) break;
          }

          if (allPresent && candidateBets.length > 1) {
            candidateBets.forEach((b) => remainingKeys.delete(b.combination));
            formations.push({
              formationText: `${firstBoat}-${b2Sorted}-${b3Sorted}`,
              bets: candidateBets,
              totalProbability: candidateBets.reduce(
                (sum, b) => sum + b.probability,
                0
              ),
              betCount: candidateBets.length,
            });
          }
        }
      }
    }

    // Now group remaining within this 1st boat by 2nd boat (1-b2-b3b3...)
    const remSecondMap = new Map<string, string[]>();
    for (const key of subsetKeys) {
      if (!remainingKeys.has(key)) continue;
      const [, b2, b3] = key.split('-');
      if (!remSecondMap.has(b2)) remSecondMap.set(b2, []);
      remSecondMap.get(b2)!.push(b3);
    }

    for (const [b2, b3List] of remSecondMap.entries()) {
      const b3Sorted = [...b3List].sort().join('');
      const candidateBets = b3List.map(
        (b3) => selectedMap.get(`${firstBoat}-${b2}-${b3}`)!
      );
      candidateBets.forEach((b) => remainingKeys.delete(b.combination));
      formations.push({
        formationText: `${firstBoat}-${b2}-${b3Sorted}`,
        bets: candidateBets,
        totalProbability: candidateBets.reduce(
          (sum, b) => sum + b.probability,
          0
        ),
        betCount: candidateBets.length,
      });
    }
  }

  // Any remaining single bets
  for (const key of remainingKeys) {
    const bet = selectedMap.get(key)!;
    formations.push({
      formationText: key,
      bets: [bet],
      totalProbability: bet.probability,
      betCount: 1,
    });
  }

  // Sort formations by total probability descending
  formations.sort((a, b) => b.totalProbability - a.totalProbability);
  return formations;
}
