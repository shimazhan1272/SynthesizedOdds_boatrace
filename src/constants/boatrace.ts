/**
 * Boat Race Constants & Statistical Model Configuration
 */

import { StadiumInfo } from '../types/boatrace';

// 24 Boat Race Stadiums (Codes 1 - 24, including Karatsu=23, Omura=24)
export const STADIUMS: StadiumInfo[] = [
  { id: 1, code: '01', name: '桐生', shortName: '桐生' },
  { id: 2, code: '02', name: '戸田', shortName: '戸田' },
  { id: 3, code: '03', name: '江戸川', shortName: '江戸川' },
  { id: 4, code: '04', name: '平和島', shortName: '平和島' },
  { id: 5, code: '05', name: '多摩川', shortName: '多摩川' },
  { id: 6, code: '06', name: '浜名湖', shortName: '浜名湖' },
  { id: 7, code: '07', name: '蒲郡', shortName: '蒲郡' },
  { id: 8, code: '08', name: '常滑', shortName: '常滑' },
  { id: 9, code: '09', name: '津', shortName: '津' },
  { id: 10, code: '10', name: '三国', shortName: '三国' },
  { id: 11, code: '11', name: 'びわこ', shortName: 'びわこ' },
  { id: 12, code: '12', name: '住之江', shortName: '住之江' },
  { id: 13, code: '13', name: '尼崎', shortName: '尼崎' },
  { id: 14, code: '14', name: '鳴門', shortName: '鳴門' },
  { id: 15, code: '15', name: '丸亀', shortName: '丸亀' },
  { id: 16, code: '16', name: '児島', shortName: '児島' },
  { id: 17, code: '17', name: '宮島', shortName: '宮島' },
  { id: 18, code: '18', name: '徳山', shortName: '徳山' },
  { id: 19, code: '19', name: '下関', shortName: '下関' },
  { id: 20, code: '20', name: '若松', shortName: '若松' },
  { id: 21, code: '21', name: '芦屋', shortName: '芦屋' },
  { id: 22, code: '22', name: '福岡', shortName: '福岡' },
  { id: 23, code: '23', name: '唐津', shortName: '唐津' },
  { id: 24, code: '24', name: '大村', shortName: '大村' },
];

export const STADIUM_MAP = new Map<number, StadiumInfo>(
  STADIUMS.map((s) => [s.id, s])
);

// Boat Color specifications (1: White, 2: Black, 3: Red, 4: Blue, 5: Yellow, 6: Green)
export interface BoatColorDef {
  number: number;
  name: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  accentBg: string;
}

export const BOAT_COLORS: Record<number, BoatColorDef> = {
  1: {
    number: 1,
    name: '白',
    bgColor: 'bg-white',
    textColor: 'text-slate-900',
    borderColor: 'border-slate-300',
    accentBg: 'bg-slate-100',
  },
  2: {
    number: 2,
    name: '黒',
    bgColor: 'bg-slate-900',
    textColor: 'text-white',
    borderColor: 'border-slate-600',
    accentBg: 'bg-slate-800',
  },
  3: {
    number: 3,
    name: '赤',
    bgColor: 'bg-red-600',
    textColor: 'text-white',
    borderColor: 'border-red-500',
    accentBg: 'bg-red-700',
  },
  4: {
    number: 4,
    name: '青',
    bgColor: 'bg-blue-600',
    textColor: 'text-white',
    borderColor: 'border-blue-500',
    accentBg: 'bg-blue-700',
  },
  5: {
    number: 5,
    name: '黄',
    bgColor: 'bg-yellow-400',
    textColor: 'text-slate-950 font-bold',
    borderColor: 'border-yellow-300',
    accentBg: 'bg-yellow-500',
  },
  6: {
    number: 6,
    name: '緑',
    bgColor: 'bg-emerald-600',
    textColor: 'text-white',
    borderColor: 'border-emerald-500',
    accentBg: 'bg-emerald-700',
  },
};

// Racer Branch Map (Code -> Japanese branch name)
export const BRANCH_CODE_MAP: Record<number, string> = {
  1: '群馬',
  2: '埼玉',
  3: '東京',
  4: '静岡',
  5: '愛知',
  6: '三重',
  7: '福井',
  8: '滋賀',
  9: '大阪',
  10: '兵庫',
  11: '徳島',
  12: '香川',
  13: '岡山',
  14: '広島',
  15: '山口',
  16: '福岡',
  17: '佐賀',
  18: '長崎',
};

// Statistical Model Coefficients (Plackett-Luce Conditional Logit, N=264,035)
export const CONFIG = {
  // Course Intercepts (Course 1 to 6; Course 1 = 0 base)
  COURSE_INTERCEPT: [0.0, -1.401, -1.5192, -1.6912, -2.2128, -3.0918],

  // Base racer terms (cL2 and cM2 are modulated by user sliders)
  cWin: 0.6347,
  cN2: -0.0124,
  cL2: 0.0035, // Modulated: cL2 * (1 + slider/3)
  cM2: 0.01, // Modulated: cM2 * (1 + slider/3)

  // Start Timing coefficients by course (1-6)
  ST_COEF: [5.186, 1.208, 1.807, 2.795, 2.968, 4.099],

  // Exhibition Time coefficients by course (1-6) (Modulated by slider)
  EX_COEF: [2.768, 3.831, 4.071, 4.949, 4.408, 4.602],

  // Grade adjustment
  GRADE_ADJ: {
    A1: 0.217,
    A2: 0.1065,
    B1: 0.0,
    B2: -0.1727,
  } as Record<string, number>,

  // Front entry penalty (entering inside of assigned boat number)
  FRONT_ENTRY_PENALTY: -0.136,

  // Wind coefficients (6 courses each)
  WIND_LIN: [-0.0266, -0.0051, 0.0066, 0.0027, 0.0061, 0.0162],
  WIND_OVER5: [-0.0191, 0.0193, -0.0204, 0.0101, -0.0047, 0.0148],
  WIND_TAIL: [0.0066, 0.0266, 0.006, -0.0021, -0.0187, -0.0184],
  WIND_CROSS: [0.0202, 0.0062, 0.0057, -0.0015, -0.0072, -0.0234],
  WIND_TAIL_OVER5: [0.0025, -0.0178, -0.026, -0.0014, 0.0366, 0.0061],
  WIND_CROSS_OVER5: [-0.0327, -0.0178, -0.0285, -0.0046, 0.016, 0.0676],

  // Temperature parameters for 2nd and 3rd rank
  LAMBDA: [1.0, 0.7755, 0.7003],

  // Course offsets for 2nd and 3rd rank
  COURSE_OFFSET2: [-0.4445, 0.1855, 0.0972, -0.0266, 0.0471, 0.1414],
  COURSE_OFFSET3: [-0.8935, -0.0251, 0.0348, 0.0797, 0.2321, 0.5721],

  // Official payout rate for odds-implied probability
  PAYOUT_RATE: 0.75,
};

// Wind Direction Descriptions
export const WIND_DIR_NAMES: Record<number, string> = {
  1: '左横風 (コード1)',
  2: '左斜め向かい風 (コード2)',
  3: '向かい風寄り (コード3)',
  4: '追い風寄り (コード4)',
  5: '追い風 (コード5)',
  6: '追い風寄り (コード6)',
  7: '右斜め追い風 (コード7)',
  8: '右横風寄り (コード8)',
  9: '右横風 (コード9)',
  10: '右斜め向かい風 (コード10)',
  11: '向かい風寄り (コード11)',
  12: '向かい風 (コード12)',
  13: '向かい風 (コード13)',
  14: '向かい風 (コード14)',
  15: '左斜め向かい風 (コード15)',
  16: '左横風寄り (コード16)',
  17: '無風',
};
