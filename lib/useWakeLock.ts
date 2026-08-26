"use client";

import { useCallback, useEffect, useRef } from "react";

/** 화면 잠금 방지. 구형 iOS에선 지원하지 않고 '던지므로' 반드시 try/catch. */
export function useWakeLock(active: boolean) {
  const lockRef = useRef<WakeLockSentinel | null>(null);

  const request = useCallback(async () => {
    try {
      if (!("wakeLock" in navigator)) return;
      lockRef.current = await navigator.wakeLock.request("screen");
    } catch {
      /* 미지원 또는 정책상 거부 — 조용히 넘어간다 */
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    void request();
    // 잠금은 문서가 숨겨질 때 자동 해제되므로 복귀 시 다시 요청해야 한다
    const onVis = () => {
      if (document.visibilityState === "visible") void request();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      lockRef.current?.release().catch(() => {});
      lockRef.current = null;
    };
  }, [active, request]);
}
