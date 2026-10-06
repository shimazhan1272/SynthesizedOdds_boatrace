/**
 * Boat Race Open API & Official Site Data Fetching Service
 * Includes robust multi-level caching to prevent server overload.
 */

import { BRANCH_CODE_MAP, STADIUMS, STADIUM_MAP } from '../constants/boatrace';
import {
  BoatEntry,
  RaceDetail,
  RacerRank,
  StartExhibitionBoat,
  TodayStadiumStatus,
  WeatherData,
  TrifectaOddsMap,
} from '../types/boatrace';

// Helper to format 2-digit stadium code (e.g. 1 -> "01", 2 -> "02")
export function formatStadiumCode(id: number): string {
  return String(id).padStart(2, '0');
}

// Convert class number or string to RacerRank
function parseRacerClass(raw: unknown, rawRankSource?: unknown): RacerRank {
  if (typeof rawRankSource === 'string') {
    const s = rawRankSource.trim().toUpperCase();
    if (s === 'A1' || s === 'A2' || s === 'B1' || s === 'B2') return s as RacerRank;
  }
  if (typeof raw === 'string') {
    const s = raw.trim().toUpperCase();
    if (s === 'A1' || s === 'A2' || s === 'B1' || s === 'B2') return s as RacerRank;
  }
  const n = Number(raw);
  if (n === 1) return 'A1';
  if (n === 2) return 'A2';
  if (n === 3) return 'B1';
  if (n === 4) return 'B2';
  return 'B1';
}

// Convert branch code or name
function parseBranch(branchNum: unknown, branchName: unknown): string {
  if (typeof branchName === 'string' && branchName.trim()) {
    return branchName.trim();
  }
  const num = Number(branchNum);
  if (num && BRANCH_CODE_MAP[num]) {
    return BRANCH_CODE_MAP[num];
  }
  return 'ー';
}

// Parse float safely with fallback
function parseFloatSafe(val: unknown, fallback: number = 0): number {
  if (val === null || val === undefined || val === '') return fallback;
  const num = parseFloat(String(val));
  return isNaN(num) ? fallback : num;
}

// Format date & time strings
export function formatTime(raw: string): string {
  if (!raw) return '';
  // Match HH:mm in strings like "2026-10-06 10:47:00" or "10:47"
  const m = raw.match(/([0-9]{1,2}):([0-9]{2})/);
  if (m) return `${m[1].padStart(2, '0')}:${m[2]}`;
  if (/^[0-9]{4}$/.test(raw)) {
    return `${raw.slice(0, 2)}:${raw.slice(2, 4)}`;
  }
  return raw;
}

// Get JST today as YYYYMMDD and YYYY-MM-DD
export function getTodayJST(): { ymd: string; ymdDash: string; year: string } {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(now);
  const y = parts.find((p) => p.type === 'year')?.value || String(now.getFullYear());
  const m = parts.find((p) => p.type === 'month')?.value || String(now.getMonth() + 1).padStart(2, '0');
  const d = parts.find((p) => p.type === 'day')?.value || String(now.getDate()).padStart(2, '0');

  return {
    ymd: `${y}${m}${d}`,
    ymdDash: `${y}-${m}-${d}`,
    year: y,
  };
}

let activeRequestId = 0;

// =========================================================================
// Server Load Protection: In-Memory Caches
// Prevents continuous, redundant requests to boatraceopenapi & boatrace.jp
// =========================================================================
let cachedTodayJson: { data: any; timestamp: number } | null = null;
const TODAY_CACHE_TTL_MS = 180000; // 3 minutes TTL for today.json

const programsDailyCache = new Map<string, any>(); // key: YYYYMMDD
const previewsDailyCache = new Map<string, any>(); // key: YYYYMMDD
export const oddsCache = new Map<
  string,
  { oddsMap: TrifectaOddsMap; updateTime: string; timestamp: number }
>(); // key: YYYYMMDD_stadiumId_raceNumber

/**
 * Fetch today's JSON with 3-minute in-memory caching to protect server
 */
export async function getTodayJson(): Promise<any | null> {
  const now = Date.now();
  if (cachedTodayJson && now - cachedTodayJson.timestamp < TODAY_CACHE_TTL_MS) {
    return cachedTodayJson.data;
  }

  try {
    const res = await fetch(
      `https://boatraceopenapi.github.io/api/v1/today.json?_t=${now}`,
      { cache: 'no-store' }
    );
    if (res.ok) {
      const data = await res.json();
      cachedTodayJson = { data, timestamp: now };
      return data;
    }
  } catch (err) {
    console.warn('Could not fetch today.json:', err);
  }
  return cachedTodayJson?.data ?? null;
}

/**
 * Fetch programs for a specific date with caching
 */
export async function getDailyPrograms(dateYMD: string): Promise<any | null> {
  if (programsDailyCache.has(dateYMD)) {
    return programsDailyCache.get(dateYMD);
  }

  const year = dateYMD.slice(0, 4);
  try {
    const url = `https://boatraceopenapi.github.io/programs/v2/${year}/${dateYMD}.json?_t=${Date.now()}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      programsDailyCache.set(dateYMD, data);
      return data;
    }
  } catch (err) {
    console.warn('Could not fetch daily programs:', err);
  }
  return null;
}

/**
 * Fetch previews for a specific date with caching
 */
export async function getDailyPreviews(dateYMD: string): Promise<any | null> {
  if (previewsDailyCache.has(dateYMD)) {
    return previewsDailyCache.get(dateYMD);
  }

  const year = dateYMD.slice(0, 4);
  try {
    const url = `https://boatraceopenapi.github.io/previews/v2/${year}/${dateYMD}.json?_t=${Date.now()}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      previewsDailyCache.set(dateYMD, data);
      return data;
    }
  } catch (err) {
    console.warn('Could not fetch daily previews:', err);
  }
  return null;
}

/**
 * Fetch today's schedule and active stadium statuses
 * Correctly parses today.json: data.programs.stadiums[stadiumNumber].races
 */
export async function fetchTodayActiveStadiums(): Promise<{
  activeStadiums: TodayStadiumStatus[];
  todayJsonRaw: any | null;
}> {
  const data = await getTodayJson();
  if (!data) {
    return { activeStadiums: [], todayJsonRaw: null };
  }

  const stadiumsMap = new Map<number, TodayStadiumStatus>();

  try {
    // Structure in today.json: data.programs.stadiums = { "2": { races: { "1": { ... } } } }
    const stadiumsObj = data.programs?.stadiums;

    if (stadiumsObj && typeof stadiumsObj === 'object') {
      for (const [sIdStr, sVal] of Object.entries(stadiumsObj)) {
        const sId = Number(sIdStr);
        if (sId >= 1 && sId <= 24) {
          const sInfo = STADIUM_MAP.get(sId);
          const racesObj = (sVal as any)?.races || {};
          const racesList: {
            raceNumber: number;
            deadlineTime: string;
            isClosed: boolean;
            isFinished: boolean;
          }[] = [];

          for (const [rNoStr, rVal] of Object.entries(racesObj)) {
            const rNo = Number(rNoStr);
            const rawClosed = String((rVal as any)?.closed_at || '');
            const deadlineTime = formatTime(rawClosed);

            // A race is truly finished only if it has actual trifecta payouts or racer place numbers
            const payouts = (rVal as any)?.result?.payouts;
            const hasTrifectaPayout =
              Array.isArray(payouts?.trifecta) && payouts.trifecta.length > 0;
            const racersResult = (rVal as any)?.result?.racers;
            const r1Place =
              racersResult?.['1']?.place_number ?? racersResult?.[1]?.place_number;
            const hasFinishedResult =
              hasTrifectaPayout || (r1Place !== null && r1Place !== undefined);

            // Or if race deadline was more than 30 minutes ago in JST
            let isTimeExpired = false;
            if (rawClosed && rawClosed.includes(':')) {
              const m = rawClosed.match(
                /([0-9]{4})-([0-9]{2})-([0-9]{2})\s+([0-9]{2}):([0-9]{2})/
              );
              if (m) {
                const isoJST = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00+09:00`;
                const targetMs = new Date(isoJST).getTime();
                if (Date.now() - targetMs > 30 * 60 * 1000) {
                  isTimeExpired = true;
                }
              }
            }

            const isRaceFinished = hasFinishedResult || isTimeExpired;

            racesList.push({
              raceNumber: rNo,
              deadlineTime: deadlineTime || `${rNo}R`,
              isClosed: isTimeExpired,
              isFinished: isRaceFinished,
            });
          }

          racesList.sort((a, b) => a.raceNumber - b.raceNumber);

          // Stadium is all finished ONLY IF race 12 has finished!
          const r12 = racesList.find((r) => r.raceNumber === 12);
          const isStadiumAllFinished = r12
            ? r12.isFinished
            : racesList.length >= 12 && racesList.every((r) => r.isFinished);

          stadiumsMap.set(sId, {
            stadiumId: sId,
            stadiumName: sInfo?.name || `場${sId}`,
            raceCount: racesList.length,
            races: racesList,
            allFinished: isStadiumAllFinished,
          });
        }
      }
    }

    // Fallback: If data.programs is an array
    if (Array.isArray(data.programs)) {
      for (const item of data.programs) {
        const sId = Number(item.race_stadium_number || item.stadium_number);
        if (sId >= 1 && sId <= 24) {
          if (!stadiumsMap.has(sId)) {
            const sInfo = STADIUM_MAP.get(sId);
            stadiumsMap.set(sId, {
              stadiumId: sId,
              stadiumName: sInfo?.name || `場${sId}`,
              raceCount: 12,
              races: [],
              allFinished: false,
            });
          }
          const sObj = stadiumsMap.get(sId)!;
          const rNo = Number(item.race_number);
          const rawClosed = String(item.race_closed_at || item.closed_at || '');
          if (rNo > 0 && !sObj.races.some((r) => r.raceNumber === rNo)) {
            sObj.races.push({
              raceNumber: rNo,
              deadlineTime: formatTime(rawClosed) || `${rNo}R`,
              isClosed: false,
              isFinished: false,
            });
          }
        }
      }
    }
  } catch (err) {
    console.error('Error parsing today.json:', err);
  }

  const activeStadiums = Array.from(stadiumsMap.values()).sort(
    (a, b) => a.stadiumId - b.stadiumId
  );
  return { activeStadiums, todayJsonRaw: data };
}

/**
 * Fetch all 12 race deadlines for a given stadium and date
 * Ensures race numbers always display their deadline time (e.g. 6R 16:10締切)
 */
export async function fetchStadiumSchedule(
  dateYMD: string,
  stadiumId: number,
  todayJsonRaw?: any | null
): Promise<{ raceNumber: number; deadlineTime: string }[]> {
  const result: { raceNumber: number; deadlineTime: string }[] = [];
  const { ymd: todayYMD } = getTodayJST();
  const isToday = dateYMD === todayYMD;

  // 1. Try today.json if today
  if (isToday) {
    const raw = todayJsonRaw || (await getTodayJson());
    const racesObj = raw?.programs?.stadiums?.[String(stadiumId)]?.races;
    if (racesObj && typeof racesObj === 'object') {
      for (let rNo = 1; rNo <= 12; rNo++) {
        const rData = racesObj[String(rNo)];
        const deadline = formatTime(String(rData?.closed_at || ''));
        result.push({
          raceNumber: rNo,
          deadlineTime: deadline,
        });
      }
      return result;
    }
  }

  // 2. Try programs/v2
  const dailyData = await getDailyPrograms(dateYMD);
  if (dailyData) {
    const list = Array.isArray(dailyData)
      ? dailyData
      : dailyData.programs || [];

    const stadiumRaces = list.filter(
      (p: any) =>
        Number(p.race_stadium_number || p.stadium_number) === stadiumId
    );

    for (let rNo = 1; rNo <= 12; rNo++) {
      const match = stadiumRaces.find(
        (p: any) => Number(p.race_number || p.rno) === rNo
      );
      const deadline = formatTime(
        String(match?.race_closed_at || match?.closed_at || '')
      );
      result.push({
        raceNumber: rNo,
        deadlineTime: deadline,
      });
    }
    return result;
  }

  // Fallback defaults
  for (let rNo = 1; rNo <= 12; rNo++) {
    result.push({ raceNumber: rNo, deadlineTime: '' });
  }
  return result;
}

/**
 * Fetch full race detail (program + exhibition + weather)
 */
export async function fetchRaceData(
  dateYMD: string, // YYYYMMDD
  stadiumId: number,
  raceNumber: number,
  todayDataCache?: any | null
): Promise<{ detail: RaceDetail; requestId: number }> {
  const currentReqId = ++activeRequestId;
  const { ymd: todayYMD } = getTodayJST();
  const isToday = dateYMD === todayYMD;

  let programRace: any = null;
  let previewRace: any = null;

  // 1. Priority for Today: today.json
  if (isToday) {
    const todayData = todayDataCache || (await getTodayJson());
    const rData =
      todayData?.programs?.stadiums?.[String(stadiumId)]?.races?.[
        String(raceNumber)
      ];

    if (rData) {
      programRace = rData;
      if (rData.preview) {
        previewRace = rData.preview;
      }
    }
  }

  // 2. Fallback to daily programs API
  if (!programRace) {
    const dailyProg = await getDailyPrograms(dateYMD);
    if (dailyProg) {
      const list = Array.isArray(dailyProg)
        ? dailyProg
        : dailyProg.programs || [];
      programRace = list.find(
        (p: any) =>
          Number(p.race_stadium_number || p.stadium_number) === stadiumId &&
          Number(p.race_number || p.rno) === raceNumber
      );
    }
  }

  // 3. Fallback to daily previews API
  if (!previewRace) {
    const dailyPrev = await getDailyPreviews(dateYMD);
    if (dailyPrev) {
      const list = Array.isArray(dailyPrev)
        ? dailyPrev
        : dailyPrev.previews || [];
      previewRace = list.find(
        (p: any) =>
          Number(p.race_stadium_number || p.stadium_number) === stadiumId &&
          Number(p.race_number || p.rno) === raceNumber
      );
    }
  }

  // 4. Fallback to boatrace.jp scraper
  if (!programRace) {
    try {
      const jcd = formatStadiumCode(stadiumId);
      const html = await fetchOfficialPage(
        `/owpc/pc/race/racelist?rno=${raceNumber}&jcd=${jcd}&hd=${dateYMD}`
      );
      if (html) {
        programRace = parseRacelistHtml(html, stadiumId, raceNumber);
      }
    } catch (e) {
      console.warn('Official racelist fallback failed:', e);
    }
  }

  if (!previewRace) {
    try {
      const jcd = formatStadiumCode(stadiumId);
      const html = await fetchOfficialPage(
        `/owpc/pc/race/beforeinfo?rno=${raceNumber}&jcd=${jcd}&hd=${dateYMD}`
      );
      if (html) {
        previewRace = parseBeforeinfoHtml(html);
      }
    } catch (e) {
      console.warn('Official beforeinfo fallback failed:', e);
    }
  }

  if (!programRace) {
    throw new Error(
      `レース出走表が見つかりませんでした (場: ${STADIUM_MAP.get(stadiumId)?.name || stadiumId}, ${raceNumber}R)。発売前または中止の可能性があります。`
    );
  }

  // Parse boats
  // In today.json: programRace.racers is an object { "1": ..., "2": ... }
  // In programs/v2: programRace.boats is an array [ ... ]
  let rawBoatsList: any[] = [];
  if (programRace.racers && typeof programRace.racers === 'object') {
    rawBoatsList = Object.values(programRace.racers);
  } else if (Array.isArray(programRace.boats)) {
    rawBoatsList = programRace.boats;
  }

  const boats: BoatEntry[] = [];
  for (let bNum = 1; bNum <= 6; bNum++) {
    const raw =
      rawBoatsList.find(
        (b: any) =>
          Number(b.racer_boat_number || b.boat_number || b.entry_number || b.number) === bNum
      ) || rawBoatsList[bNum - 1] || {};

    const name = String(raw.name || raw.racer_name || `${bNum}号艇`).trim();
    const racerClass = parseRacerClass(
      raw.rank_number || raw.racer_class_number || raw.class,
      raw.rank_number_source || raw.racer_class
    );
    const branch = parseBranch(
      raw.branch_number || raw.racer_branch_number,
      raw.branch_number_source || raw.racer_branch_name
    );

    // Win rates and motor rates (handles percent and rate suffixes)
    const winRate = parseFloatSafe(raw.national_win_rate || raw.racer_national_top_1_percent, 5.5);
    const n2Rate = parseFloatSafe(
      raw.national_top_2_percent || raw.national_top_2_rate || raw.racer_national_top_2_percent,
      35.0
    );
    const n3Rate = parseFloatSafe(
      raw.national_top_3_percent || raw.national_top_3_rate || raw.racer_national_top_3_percent,
      50.0
    );
    const l2Rate = parseFloatSafe(
      raw.local_top_2_percent || raw.local_top_2_rate || raw.racer_local_top_2_percent,
      35.0
    );
    const l3Rate = parseFloatSafe(
      raw.local_top_3_percent || raw.local_top_3_rate || raw.racer_local_top_3_percent,
      50.0
    );
    const m2Rate = parseFloatSafe(
      raw.motor_top_2_percent || raw.motor_top_2_rate || raw.racer_assigned_motor_top_2_percent,
      35.0
    );
    const avgST = parseFloatSafe(
      raw.average_start_timing || raw.racer_average_start_timing,
      0.16
    );

    // Exhibition time from preview if available
    let exTime = 0;
    if (previewRace) {
      let prevBoats: any[] = [];
      if (previewRace.racers && typeof previewRace.racers === 'object') {
        prevBoats = Object.values(previewRace.racers);
      } else if (Array.isArray(previewRace.boats)) {
        prevBoats = previewRace.boats;
      }
      const pRaw =
        prevBoats.find(
          (pb: any) =>
            Number(pb.entry_number || pb.boat_number || pb.racer_boat_number) === bNum
        ) || prevBoats[bNum - 1];
      if (pRaw) {
        exTime = parseFloatSafe(
          pRaw.exhibition_time || pRaw.racer_exhibition_time,
          0
        );
      }
    }

    boats.push({
      boatNumber: bNum,
      racerName: name,
      racerClass,
      branch,
      nationalWinRate: winRate,
      nationalTop2Rate: n2Rate,
      nationalTop3Rate: n3Rate,
      localTop2Rate: l2Rate,
      localTop3Rate: l3Rate,
      motorTop2Rate: m2Rate,
      avgST,
      exhibitionTime: exTime,
    });
  }

  // Parse Start Exhibition
  const startExhibition: StartExhibitionBoat[] = [];
  if (previewRace) {
    let prevBoats: any[] = [];
    if (previewRace.racers && typeof previewRace.racers === 'object') {
      prevBoats = Object.values(previewRace.racers);
    } else if (Array.isArray(previewRace.boats)) {
      prevBoats = previewRace.boats;
    }

    for (let c = 1; c <= 6; c++) {
      const matchBoat = prevBoats.find((pb: any) => {
        const course = Number(pb.course_number || pb.racer_course_number);
        return course === c;
      });

      if (matchBoat) {
        const bNo = Number(
          matchBoat.entry_number || matchBoat.boat_number || matchBoat.racer_boat_number
        ) || c;
        const st = parseFloatSafe(
          matchBoat.start_timing || matchBoat.racer_start_timing,
          0.15
        );
        startExhibition.push({
          boatNumber: bNo,
          course: c,
          startTiming: st,
          isFlying: st < 0,
        });
      }
    }
  }

  // Fallback to wakunari if start exhibition not complete
  if (startExhibition.length < 6) {
    startExhibition.length = 0;
    for (let i = 1; i <= 6; i++) {
      startExhibition.push({
        boatNumber: i,
        course: i,
        startTiming: boats[i - 1]?.avgST || 0.16,
      });
    }
  }

  // Parse Weather
  const weather: WeatherData = {
    windSpeed: 0,
    windDirectionCode: null,
    waveHeight: 0,
  };

  if (previewRace) {
    weather.windSpeed = parseFloatSafe(
      previewRace.wind_speed || previewRace.race_wind,
      0
    );
    const windDir = Number(
      previewRace.wind_direction_number || previewRace.race_wind_direction_number
    );
    weather.windDirectionCode = windDir > 0 && windDir <= 17 ? windDir : null;
    weather.waveHeight = parseFloatSafe(
      previewRace.wave_height || previewRace.race_wave,
      0
    );
  }

  const raceTitle = String(
    programRace.title ||
      programRace.race_title ||
      `${STADIUM_MAP.get(stadiumId)?.name || ''} 第${raceNumber}レース`
  );

  const rawDeadline = String(
    programRace.closed_at || programRace.race_closed_at || ''
  );
  const deadlineTime = formatTime(rawDeadline) || '締切時間未定';
  const dateDisplay = `${dateYMD.slice(0, 4)}-${dateYMD.slice(4, 6)}-${dateYMD.slice(6, 8)}`;
  const isExhibitionAvailable = boats.some((b) => b.exhibitionTime > 0);

  return {
    detail: {
      date: dateYMD,
      dateDisplay,
      stadiumId,
      stadiumName: STADIUM_MAP.get(stadiumId)?.name || `場${stadiumId}`,
      raceNumber,
      raceTitle,
      deadlineTime,
      boats,
      startExhibition,
      weather,
      isExhibitionAvailable,
    },
    requestId: currentReqId,
  };
}

/**
 * Fetch official Boatrace page HTML with proxy support
 */
export async function fetchOfficialPage(path: string): Promise<string | null> {
  const fullTargetUrl = `https://www.boatrace.jp${path}`;
  const cacheBuster = `_t=${Date.now()}`;
  const separator = path.includes('?') ? '&' : '?';

  // 1. Try local dev proxy: `/proxy/boatrace/...`
  try {
    const localProxyUrl = `/proxy/boatrace${path}${separator}${cacheBuster}`;
    const res = await fetch(localProxyUrl, { cache: 'no-store' });
    if (res.ok) {
      const text = await res.text();
      if (text.includes('oddsPoint') || text.includes('boatrace') || text.includes('table')) {
        return text;
      }
    }
  } catch (e) {
    // Continue
  }

  // 2. Try allorigins CORS proxy
  try {
    const targetWithBuster = `${fullTargetUrl}${separator}${cacheBuster}`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetWithBuster)}`;
    const res = await fetch(proxyUrl, { cache: 'no-store' });
    if (res.ok) {
      const text = await res.text();
      return text;
    }
  } catch (e) {
    // Continue
  }

  // 3. Try corsproxy.io
  try {
    const targetWithBuster = `${fullTargetUrl}${separator}${cacheBuster}`;
    const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(targetWithBuster)}`;
    const res = await fetch(proxyUrl, { cache: 'no-store' });
    if (res.ok) {
      const text = await res.text();
      return text;
    }
  } catch (e) {
    // Failed
  }

  return null;
}

function parseRacelistHtml(html: string, stadiumId: number, raceNumber: number): any {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const titleEl = doc.querySelector('.heading1_title, .title_h1');
  const raceTitle = titleEl?.textContent?.trim() || `第${raceNumber}レース`;
  const timeEl = doc.querySelector('.tab1_time, .race_time, .deadline');
  const deadline = timeEl?.textContent?.trim() || '';

  return {
    race_stadium_number: stadiumId,
    race_number: raceNumber,
    race_title: raceTitle,
    race_closed_at: deadline,
    boats: [],
  };
}

function parseBeforeinfoHtml(html: string): any {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const weatherEl = doc.querySelector('.weather1');
  let windSpeed = 0;
  let waveHeight = 0;
  let windDir = null;

  if (weatherEl) {
    const txt = weatherEl.textContent || '';
    const windMatch = txt.match(/風速\s*([0-9]+(?:\.[0-9]+)?)\s*m/);
    if (windMatch) windSpeed = parseFloat(windMatch[1]);
    const waveMatch = txt.match(/波高\s*([0-9]+(?:\.[0-9]+)?)\s*cm/);
    if (waveMatch) waveHeight = parseFloat(waveMatch[1]);
  }

  return {
    race_wind: windSpeed,
    race_wind_direction_number: windDir,
    race_wave: waveHeight,
    boats: [],
  };
}
