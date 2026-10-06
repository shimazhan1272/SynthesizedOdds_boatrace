/**
 * Boat Race AI & Odds Types
 */

export interface StadiumInfo {
  id: number; // 1 - 24
  code: string; // "01" - "24"
  name: string;
  shortName: string;
}

export type RacerRank = 'A1' | 'A2' | 'B1' | 'B2';

export interface BoatEntry {
  boatNumber: number; // 1 - 6
  racerName: string;
  racerClass: RacerRank;
  branch: string; // 支部名
  nationalWinRate: number; // 全国勝率 (e.g. 6.42)
  nationalTop2Rate: number; // 全国2連率 (e.g. 45.20)
  nationalTop3Rate: number; // 全国3連率 (e.g. 62.10)
  localTop2Rate: number; // 当地2連率 (e.g. 40.50)
  localTop3Rate: number; // 当地3連率 (e.g. 58.00)
  motorTop2Rate: number; // モーター2連率 (e.g. 33.30)
  avgST: number; // 平均ST (e.g. 0.15)
  exhibitionTime: number; // 展示タイム (e.g. 6.75)
}

export interface StartExhibitionBoat {
  boatNumber: number; // 艇番 1-6
  course: number; // コース 1-6
  startTiming: number; // ST (e.g. 0.12 or -0.02 for F)
  isFlying?: boolean;
}

export interface WeatherData {
  windSpeed: number; // m/s
  windDirectionCode: number | null; // 1-16, 17=無風, null=不明
  waveHeight: number; // cm
  airTemp?: number; // ℃
  waterTemp?: number; // ℃
}

export interface RaceDetail {
  date: string; // YYYYMMDD
  dateDisplay: string; // YYYY-MM-DD
  stadiumId: number;
  stadiumName: string;
  raceNumber: number; // 1 - 12
  raceTitle: string;
  deadlineTime: string; // HH:mm or HH:mm:ss
  boats: BoatEntry[];
  startExhibition: StartExhibitionBoat[];
  weather: WeatherData;
  isExhibitionAvailable: boolean;
}

export interface CoefSliders {
  localTop2: number; // -3.0 to +3.0
  motorTop2: number; // -3.0 to +3.0
  exhibitionTime: number; // -3.0 to +3.0
}

export interface BetPrediction {
  combination: string; // "1-2-3"
  boats: number[];
  probability: number; // 0.0 - 1.0
  odds?: number;
  expectedValue?: number; // probability * odds
}

export interface FormationGroup {
  formationText: string; // "1-2-345", "1-24-35", etc. (no commas)
  bets: BetPrediction[];
  totalProbability: number;
  betCount: number;
  syntheticOdds?: number;
}

export interface PredictionResult {
  scores: number[];
  firstProbabilities: number[]; // 1st place % (6 boats, sum = 1)
  trifectaBets: BetPrediction[]; // 3連単 Top N
  trifectaFormations: FormationGroup[]; // 3連単 grouped formations
  exactaBets: BetPrediction[]; // 2連単 Top N
  trioBets: BetPrediction[]; // 3連複 Top N
}

export type TrifectaOddsMap = Record<string, number>; // key: "1-2-3", value: odds

export interface OddsData {
  raceNumber: number;
  stadiumId: number;
  date: string;
  updateTime: string;
  oddsMap: TrifectaOddsMap;
  isValid120: boolean;
  validCount: number;
}

export interface AllocationRow {
  combination: string;
  odds: number;
  modelProb?: number;
  weight: number; // raw allocation share
  rawAmount: number;
  amount: number; // 100 yen rounded
  expectedReturn: number;
  returnRate: number; // %
}

export interface SyntheticOddsSummary {
  betCount: number;
  syntheticOdds: number;
  modelHitProb: number; // sum of model probabilities
  impliedOddsHitProb: number; // sum(1/o_i) * 0.75
  totalCost: number;
  rows: AllocationRow[];
  minReturn: number;
  maxReturn: number;
  allocationError: number;
}

export interface TodayStadiumStatus {
  stadiumId: number;
  stadiumName: string;
  raceCount: number;
  races: {
    raceNumber: number;
    deadlineTime: string; // HH:mm
    isClosed: boolean;
    isFinished: boolean;
  }[];
  allFinished: boolean;
}
