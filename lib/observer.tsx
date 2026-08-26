"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_CITY } from "./cities";

export type LocationSource = "gps" | "manual" | "default";

export interface ObserverState {
  lat: number;
  lon: number;
  source: LocationSource;
  label: string | null;
}

interface ObserverContextType extends ObserverState {
  setLocation: (lat: number, lon: number, source: LocationSource, label?: string) => void;
  requestGps: () => Promise<boolean>;
  gpsStatus: "idle" | "pending" | "granted" | "denied" | "unavailable";
  /**
   * GPS로 확인된 실제 위치. 지도를 돌아다녀도 지워지지 않는다 —
   * '내 위치로 돌아가기'를 하려면 선택 중인 위치와 따로 기억해야 한다.
   */
  gpsFix: { lat: number; lon: number } | null;
  /** 시뮬레이션 시각(ms). 60fps 리렌더를 피하려고 ref로 들고 있다. */
  simTimeRef: React.RefObject<number>;
  /** 1 = 실시간. 시간여행 배속. */
  timeScale: number;
  setTimeScale: (v: number) => void;
  /** 실시간으로 되돌린다. */
  resetTime: () => void;
  timeOffsetRef: React.RefObject<number>;
}

const STORAGE_KEY = "explorer_observer";

const ObserverContext = createContext<ObserverContextType | null>(null);

export function ObserverProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ObserverState>({
    lat: DEFAULT_CITY.lat,
    lon: DEFAULT_CITY.lon,
    source: "default",
    label: DEFAULT_CITY.ko,
  });
  const [gpsStatus, setGpsStatus] =
    useState<ObserverContextType["gpsStatus"]>("idle");
  const [gpsFix, setGpsFix] = useState<{ lat: number; lon: number } | null>(null);
  const [timeScale, setTimeScale] = useState(1);

  // 렌더 중 Date.now()를 부르지 않는다(순수하지 않다). 0은 "아직 초기화 전"을
  // 뜻하며, 소비자는 `timeRef.current || Date.now()`로 방어한다.
  // setLocation은 useCallback([])이라 최신 gpsFix를 ref로 읽는다
  const gpsFixRef = useRef<{ lat: number; lon: number } | null>(null);
  useEffect(() => {
    gpsFixRef.current = gpsFix;
  }, [gpsFix]);

  const simTimeRef = useRef(0);
  const timeOffsetRef = useRef(0); // 실제 시각 대비 누적 오프셋(ms)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as ObserverState & {
        gpsFix?: { lat: number; lon: number };
      };
      if (Number.isFinite(saved.lat) && Number.isFinite(saved.lon)) {
        setState({
          lat: saved.lat,
          lon: saved.lon,
          label: saved.label ?? null,
          source: saved.source === "gps" ? "gps" : "manual",
        });
      }
      if (saved.gpsFix && Number.isFinite(saved.gpsFix.lat)) setGpsFix(saved.gpsFix);
    } catch {
      // 손상된 저장값은 조용히 무시하고 기본값을 쓴다
    }
  }, []);

  const setLocation = useCallback(
    (lat: number, lon: number, source: LocationSource, label?: string) => {
      const next: ObserverState = { lat, lon, source, label: label ?? null };
      setState(next);
      try {
        const fix = source === "gps" ? { lat, lon } : gpsFixRef.current;
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...next, gpsFix: fix }));
      } catch {
        /* 사파리 프라이빗 모드 등 */
      }
    },
    [],
  );

  const requestGps = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsStatus("unavailable");
      return false;
    }
    setGpsStatus("pending");
    return new Promise<boolean>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          // enableHighAccuracy:false 는 의도적이다. 1km 위치 오차는 별을 0.01°
          // 움직인다 — GPS 정밀도는 배터리와 콜드스타트 지연만 먹는다.
          setGpsFix({ lat: pos.coords.latitude, lon: pos.coords.longitude });
          setLocation(pos.coords.latitude, pos.coords.longitude, "gps");
          setGpsStatus("granted");
          resolve(true);
        },
        (err) => {
          setGpsStatus(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable");
          resolve(false);
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 600_000 },
      );
    });
  }, [setLocation]);

  const resetTime = useCallback(() => {
    timeOffsetRef.current = 0;
    setTimeScale(1);
  }, []);

  const value = useMemo<ObserverContextType>(
    () => ({
      ...state,
      setLocation,
      requestGps,
      gpsStatus,
      gpsFix,
      simTimeRef,
      timeScale,
      setTimeScale,
      resetTime,
      timeOffsetRef,
    }),
    [state, setLocation, requestGps, gpsStatus, gpsFix, timeScale, resetTime],
  );

  return <ObserverContext.Provider value={value}>{children}</ObserverContext.Provider>;
}

export function useObserver(): ObserverContextType {
  const ctx = useContext(ObserverContext);
  if (!ctx) throw new Error("useObserver must be used inside <ObserverProvider>");
  return ctx;
}
