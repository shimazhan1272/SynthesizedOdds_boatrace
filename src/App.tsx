/**
 * Boat Race AI Prediction & Synthetic Odds Web App
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { RaceInputForm } from './components/RaceInputForm';
import { RaceHeader } from './components/RaceHeader';
import { RacerTable } from './components/RacerTable';
import { ExhibitionCard } from './components/ExhibitionCard';
import { WeatherCard } from './components/WeatherCard';
import { PredictionBets } from './components/PredictionBets';
import { ModelSliders } from './components/ModelSliders';
import { ManualCorrection } from './components/ManualCorrection';
import { DisclaimerFooter } from './components/DisclaimerFooter';
import { OfflineIndicator } from './components/OfflineIndicator';
import {
  BoatEntry,
  CoefSliders,
  PredictionResult,
  RaceDetail,
  TodayStadiumStatus,
  TrifectaOddsMap,
  WeatherData,
} from './types/boatrace';
import {
  fetchTodayActiveStadiums,
  fetchStadiumSchedule,
  fetchRaceData,
  fetchOfficialPage,
  formatStadiumCode,
  getTodayJST,
  oddsCache,
} from './services/boatraceApi';
import { predict } from './utils/prediction';
import { parseOfficialOddsHtml } from './utils/odds';
import { AlertCircle } from 'lucide-react';

const STORAGE_KEY = 'boatrace_ai_v1_prefs';

export default function App() {
  const { ymdDash: todayYMDDash } = useMemo(() => getTodayJST(), []);

  // Saved preferences in localStorage
  const loadStoredPrefs = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      // Ignore
    }
    return null;
  };

  const stored = loadStoredPrefs();

  // State: Inputs
  const [date, setDate] = useState<string>(stored?.date || todayYMDDash);
  const [stadiumId, setStadiumId] = useState<number>(stored?.stadiumId || 1);
  const [raceNumber, setRaceNumber] = useState<number>(stored?.raceNumber || 1);
  const [nTrifecta, setNTrifecta] = useState<number>(
    stored?.nTrifecta !== undefined ? stored.nTrifecta : 5
  );
  const [nExacta, setNExacta] = useState<number>(
    stored?.nExacta !== undefined ? stored.nExacta : 3
  );
  const [nTrio, setNTrio] = useState<number>(
    stored?.nTrio !== undefined ? stored.nTrio : 3
  );
  const [budget, setBudget] = useState<number>(stored?.budget || 1000);

  // State: Sliders
  const [sliders, setSliders] = useState<CoefSliders>(
    stored?.sliders || {
      localTop2: 0,
      motorTop2: 0,
      exhibitionTime: 0,
    }
  );

  // State: Today's active stadiums & schedule
  const [todayStadiums, setTodayStadiums] = useState<TodayStadiumStatus[]>([]);
  const [todayJsonRaw, setTodayJsonRaw] = useState<any | null>(null);
  const [stadiumSchedule, setStadiumSchedule] = useState<{ raceNumber: number; deadlineTime: string }[]>([]);

  // State: Loaded race detail
  const [raceDetail, setRaceDetail] = useState<RaceDetail | null>(null);
  // Manual overrides for boats (exhibition times, etc.)
  const [boats, setBoats] = useState<BoatEntry[]>([]);
  // Manual overrides for courses (0-indexed length 6)
  const [courses, setCourses] = useState<number[]>([0, 1, 2, 3, 4, 5]);
  // Manual overrides for weather
  const [weather, setWeather] = useState<WeatherData>({
    windSpeed: 0,
    windDirectionCode: null,
    waveHeight: 0,
  });

  // State: Odds
  const [oddsMap, setOddsMap] = useState<TrifectaOddsMap>({});
  const [oddsUpdateTime, setOddsUpdateTime] = useState<string>('');
  const [isLoadingOdds, setIsLoadingOdds] = useState<boolean>(false);

  // State: UI & Status
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasCourseDuplicateOrMissing, setHasCourseDuplicateOrMissing] =
    useState<boolean>(false);

  const isToday = date === todayYMDDash;
  const currentReqRef = useRef<number>(0);

  // Save preferences to localStorage
  const savePrefs = useCallback(
    (overrides?: Partial<any>) => {
      try {
        const data = {
          date: overrides?.date ?? date,
          stadiumId: overrides?.stadiumId ?? stadiumId,
          raceNumber: overrides?.raceNumber ?? raceNumber,
          nTrifecta: overrides?.nTrifecta ?? nTrifecta,
          nExacta: overrides?.nExacta ?? nExacta,
          nTrio: overrides?.nTrio ?? nTrio,
          budget: overrides?.budget ?? budget,
          sliders: overrides?.sliders ?? sliders,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (e) {
        // Ignore
      }
    },
    [date, stadiumId, raceNumber, nTrifecta, nExacta, nTrio, budget, sliders]
  );

  // Load Today's active stadiums once on mount
  useEffect(() => {
    let mounted = true;
    fetchTodayActiveStadiums().then(({ activeStadiums, todayJsonRaw }) => {
      if (!mounted) return;
      setTodayStadiums(activeStadiums);
      setTodayJsonRaw(todayJsonRaw);

      // If user selected today and current stadium is not in active stadiums, or if current stadium is finished, prefer first ongoing stadium
      if (isToday && activeStadiums.length > 0) {
        const currentActive = activeStadiums.find((ts) => ts.stadiumId === stadiumId);
        const ongoingStadiums = activeStadiums.filter((ts) => !ts.allFinished);
        if (!currentActive || currentActive.allFinished) {
          if (ongoingStadiums.length > 0) {
            setStadiumId(ongoingStadiums[0].stadiumId);
          } else if (!currentActive) {
            setStadiumId(activeStadiums[0].stadiumId);
          }
        }
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch all 12 race deadlines whenever date or stadiumId changes
  useEffect(() => {
    let mounted = true;
    const targetYMD = date.replace(/-/g, '');
    fetchStadiumSchedule(targetYMD, stadiumId, todayJsonRaw).then((schedule) => {
      if (mounted) {
        setStadiumSchedule(schedule);
      }
    });
    return () => {
      mounted = false;
    };
  }, [date, stadiumId, todayJsonRaw]);

  // Fetch Odds function with in-memory caching to protect server
  const fetchOddsForCurrentRace = useCallback(
    async (
      targetDateYMD: string,
      targetStadiumId: number,
      targetRaceNo: number,
      forceRefresh: boolean = false
    ) => {
      const cacheKey = `${targetDateYMD}_${targetStadiumId}_${targetRaceNo}`;

      // Use cached odds if available and not explicitly forced
      if (!forceRefresh && oddsCache.has(cacheKey)) {
        const cached = oddsCache.get(cacheKey)!;
        setOddsMap(cached.oddsMap);
        setOddsUpdateTime(cached.updateTime);
        return;
      }

      setIsLoadingOdds(true);
      try {
        const jcd = formatStadiumCode(targetStadiumId);
        const oddsPath = `/owpc/pc/race/odds3t?rno=${targetRaceNo}&jcd=${jcd}&hd=${targetDateYMD}`;
        const html = await fetchOfficialPage(oddsPath);

        if (html) {
          const parsed = parseOfficialOddsHtml(
            html,
            targetRaceNo,
            targetStadiumId,
            targetDateYMD
          );
          if (parsed.validCount > 0) {
            // Save in cache
            oddsCache.set(cacheKey, {
              oddsMap: parsed.oddsMap,
              updateTime: parsed.updateTime,
              timestamp: Date.now(),
            });
            setOddsMap(parsed.oddsMap);
            setOddsUpdateTime(parsed.updateTime);
          }
        }
      } catch (err) {
        console.warn('Could not fetch odds:', err);
      } finally {
        setIsLoadingOdds(false);
      }
    },
    []
  );

  // Execute full race fetch & prediction (§2-3: Reset previous data)
  const handleFetchRace = useCallback(async () => {
    const targetYMD = date.replace(/-/g, '');
    const reqId = ++currentReqRef.current;

    setIsLoading(true);
    setErrorMessage(null);

    // §2-3 Reset: Invalidate previous preview, courses, weather, odds
    setRaceDetail(null);
    setBoats([]);
    setCourses([0, 1, 2, 3, 4, 5]);
    setWeather({ windSpeed: 0, windDirectionCode: null, waveHeight: 0 });
    setOddsMap({});
    setOddsUpdateTime('');
    setHasCourseDuplicateOrMissing(false);

    // Save inputs
    savePrefs();

    try {
      const { detail, requestId } = await fetchRaceData(
        targetYMD,
        stadiumId,
        raceNumber,
        todayJsonRaw
      );

      // Ensure response is for the latest request
      if (reqId !== currentReqRef.current) return;

      setRaceDetail(detail);
      setBoats(detail.boats);
      setWeather(detail.weather);

      // Compute courses from start exhibition
      let courseArr = [0, 1, 2, 3, 4, 5];
      let hasDupOrMissing = false;

      if (detail.startExhibition && detail.startExhibition.length === 6) {
        const tempCourses = new Array(6).fill(-1);
        const assignedCourses = new Set<number>();

        for (const se of detail.startExhibition) {
          const bIdx = se.boatNumber - 1;
          const cIdx = se.course - 1;
          if (bIdx >= 0 && bIdx < 6 && cIdx >= 0 && cIdx < 6) {
            if (assignedCourses.has(cIdx) || tempCourses[bIdx] !== -1) {
              hasDupOrMissing = true;
            }
            assignedCourses.add(cIdx);
            tempCourses[bIdx] = cIdx;
          }
        }

        if (hasDupOrMissing || tempCourses.some((c) => c === -1)) {
          // Warning & Wakunari fallback
          setHasCourseDuplicateOrMissing(true);
          courseArr = [0, 1, 2, 3, 4, 5];
        } else {
          courseArr = tempCourses;
        }
      }
      setCourses(courseArr);

      // Concurrently fetch odds
      fetchOddsForCurrentRace(targetYMD, stadiumId, raceNumber);
    } catch (err: any) {
      if (reqId === currentReqRef.current) {
        setErrorMessage(
          err.message ||
            'データの取得に失敗しました。出走表が未発表か、中止・発売前の可能性があります。'
        );
      }
    } finally {
      if (reqId === currentReqRef.current) {
        setIsLoading(false);
      }
    }
  }, [date, stadiumId, raceNumber, todayJsonRaw, savePrefs, fetchOddsForCurrentRace]);

  // Initial fetch on mount
  useEffect(() => {
    handleFetchRace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compute prediction results (pure function, recalculates instantly whenever inputs, sliders or overrides change)
  const prediction: PredictionResult = useMemo(() => {
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
    return predict(
      boats,
      courses,
      weather,
      sliders,
      nTrifecta,
      nExacta,
      nTrio
    );
  }, [boats, courses, weather, sliders, nTrifecta, nExacta, nTrio]);

  // Course order (which boat took course 1..6)
  const courseOrder = useMemo(() => {
    const order = new Array(6).fill(0);
    courses.forEach((c, bIdx) => {
      if (c >= 0 && c < 6) {
        order[c] = bIdx + 1; // 1-indexed boat number
      }
    });
    return order;
  }, [courses]);

  // Exhibition times list
  const exhibitionTimes = useMemo(() => {
    return boats.map((b) => ({
      boatNumber: b.boatNumber,
      time: b.exhibitionTime,
    }));
  }, [boats]);

  // Handlers for manual corrections
  const handleUpdateBoatExhibition = (boatIndex: number, time: number) => {
    setBoats((prev) => {
      const next = [...prev];
      if (next[boatIndex]) {
        next[boatIndex] = { ...next[boatIndex], exhibitionTime: time };
      }
      return next;
    });
  };

  const handleUpdateCourse = (boatIndex: number, newCourse: number) => {
    setCourses((prev) => {
      const next = [...prev];
      next[boatIndex] = newCourse;
      return next;
    });
  };

  const handleUpdateWeather = (newWeather: WeatherData) => {
    setWeather(newWeather);
  };

  // Handler for HTML paste
  const handlePasteOddsHtml = (html: string) => {
    const targetYMD = date.replace(/-/g, '');
    const parsed = parseOfficialOddsHtml(html, raceNumber, stadiumId, targetYMD);
    if (parsed.validCount > 0) {
      setOddsMap(parsed.oddsMap);
      setOddsUpdateTime(parsed.updateTime);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans pb-12 selection:bg-cyan-500 selection:text-white">
      {/* PWA offline banner */}
      <OfflineIndicator />

      {/* Main Header */}
      <Header />

      {/* Main Content Area */}
      <main className="max-w-4xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5 flex-1">
        {/* 1. Input Area */}
        <RaceInputForm
          date={date}
          stadiumId={stadiumId}
          raceNumber={raceNumber}
          nTrifecta={nTrifecta}
          nExacta={nExacta}
          nTrio={nTrio}
          isToday={isToday}
          todayStadiums={todayStadiums}
          stadiumSchedule={stadiumSchedule}
          isLoading={isLoading}
          onDateChange={(newDate) => {
            setDate(newDate);
            savePrefs({ date: newDate });
          }}
          onStadiumChange={(newStadium) => {
            setStadiumId(newStadium);
            savePrefs({ stadiumId: newStadium });
          }}
          onRaceChange={(newRace) => {
            setRaceNumber(newRace);
            savePrefs({ raceNumber: newRace });
          }}
          onTrifectaChange={(val) => {
            setNTrifecta(val);
            savePrefs({ nTrifecta: val });
          }}
          onExactaChange={(val) => {
            setNExacta(val);
            savePrefs({ nExacta: val });
          }}
          onTrioChange={(val) => {
            setNTrio(val);
            savePrefs({ nTrio: val });
          }}
          onSubmit={handleFetchRace}
        />

        {/* Error Notification */}
        {errorMessage && (
          <div className="bg-rose-950/80 border border-rose-800 rounded-2xl p-4 text-sm text-rose-200 flex items-start gap-3 shadow-lg">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">データ取得・解析エラー</p>
              <p className="text-xs text-rose-300/90 leading-relaxed">
                {errorMessage}
              </p>
              <p className="text-[11px] text-rose-400/80 pt-1">
                ※当日レースの開催中であるか、または別の日付・場・レース番号をお試しください。直前情報やオッズは手動修正・HTML貼付でも入力できます。
              </p>
            </div>
          </div>
        )}

        {/* Results Area */}
        {raceDetail && (
          <div className="space-y-5">
            {/* 2. Result Header */}
            <RaceHeader
              detail={raceDetail}
              courseOrder={courseOrder}
              hasCourseDuplicateOrMissing={hasCourseDuplicateOrMissing}
            />

            {/* 3. Racer Details & 1st Place Probability (Shown BEFORE predictions) */}
            <RacerTable
              boats={boats}
              firstProbabilities={prediction.firstProbabilities}
            />

            {/* 4. Exhibition Info & SVG Slit Graphic */}
            <ExhibitionCard
              exhibitionTimes={exhibitionTimes}
              startExhibition={raceDetail.startExhibition}
            />

            {/* 5. Weather & Wind Correction Card */}
            <WeatherCard weather={weather} />

            {/* 6. AI Recommended Bets (with Synthetic Odds & Odds Update Button) */}
            <PredictionBets
              prediction={prediction}
              oddsMap={oddsMap}
              updateTime={oddsUpdateTime}
              isLoadingOdds={isLoadingOdds}
              onRefreshOdds={() =>
                fetchOddsForCurrentRace(
                  date.replace(/-/g, ''),
                  stadiumId,
                  raceNumber,
                  true
                )
              }
              stadiumId={stadiumId}
              raceNumber={raceNumber}
              date={date.replace(/-/g, '')}
              onPasteHtml={handlePasteOddsHtml}
              budget={budget}
              onBudgetChange={(b) => {
                setBudget(b);
                savePrefs({ budget: b });
              }}
            />

            {/* 7. Collapsible: Model Sliders */}
            <ModelSliders
              sliders={sliders}
              onChange={(s) => {
                setSliders(s);
                savePrefs({ sliders: s });
              }}
            />

            {/* 9. Collapsible: Manual Correction */}
            <ManualCorrection
              boats={boats}
              courses={courses}
              weather={weather}
              onUpdateBoatExhibition={handleUpdateBoatExhibition}
              onUpdateCourse={handleUpdateCourse}
              onUpdateWeather={handleUpdateWeather}
            />
          </div>
        )}

        {/* 10. Disclaimer Footer */}
        <DisclaimerFooter />
      </main>
    </div>
  );
}
