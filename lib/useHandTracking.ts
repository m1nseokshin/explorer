"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { asset } from "./asset";
import { readHand, type HandState, type Landmark } from "./gestures";

export type HandStatus =
  | "idle"
  | "insecure"
  | "unsupported"
  | "loading"
  | "pending"
  | "running"
  | "denied"
  | "busy"
  | "not-found"
  | "failed";

/**
 * 전면 카메라 + MediaPipe HandLandmarker.
 *
 * 영상은 화면에 보여주지 않는다 — 인식 입력으로만 쓰고, 사용자에게는 손 스켈레톤만
 * 그려 준다. <video>는 DOM에 있어야 프레임이 디코딩되므로 제거하지 말고
 * 화면 밖으로 숨긴다(display:none이면 일부 브라우저가 디코딩을 멈춘다).
 */
export function useHandTracking(active: boolean) {
  const [status, setStatus] = useState<HandStatus>("idle");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<{
    detectForVideo: (v: HTMLVideoElement, t: number) => { landmarks: Landmark[][] };
    close: () => void;
  } | null>(null);

  /** 최신 손 상태. 60fps 리렌더를 피하려고 ref에 둔다. */
  const handRef = useRef<HandState | null>(null);
  /** 스켈레톤 그리기용 원시 랜드마크 (미러링 전). */
  const landmarksRef = useRef<Landmark[] | null>(null);
  const pinchingRef = useRef(false);
  const rafRef = useRef(0);
  const lastVideoTime = useRef(-1);
  const lastInferRef = useRef(0);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    handRef.current = null;
    landmarksRef.current = null;
    // 멈춘 뒤에도 status가 running이면 소비자가 '켜져 있다'고 오판한다
    setStatus((prev) => (prev === "running" ? "idle" : prev));
  }, []);

  const start = useCallback(async (): Promise<HandStatus> => {
    if (typeof window === "undefined") return "unsupported";
    if (!window.isSecureContext) {
      setStatus("insecure");
      return "insecure";
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      return "unsupported";
    }

    // 1) 카메라 먼저. 사용자 제스처 직후에 불러야 권한 팝업이 뜬다.
    setStatus("pending");
    try {
      // 손을 비추는 용도이므로 전면 카메라. ideal이지 exact가 아니다 —
      // exact는 후면 카메라만 있는 기기에서 OverconstrainedError를 던진다.
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "user" },
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      });
    } catch (err) {
      const name = (err as DOMException)?.name;
      const s: HandStatus =
        name === "NotAllowedError" || name === "SecurityError"
          ? "denied"
          : name === "NotReadableError" || name === "AbortError"
            ? "busy"
            : "not-found";
      setStatus(s);
      return s;
    }

    const v = videoRef.current;
    if (v) {
      v.srcObject = streamRef.current;
      try {
        await v.play();
      } catch {
        /* playsInline + muted면 통과한다 */
      }
    }

    // 2) 모델 로드. WASM과 .task 모두 자체 호스팅이라 오프라인·basePath 모두 안전하다.
    setStatus("loading");
    try {
      const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
      const fileset = await FilesetResolver.forVisionTasks(asset("/mediapipe/wasm"));
      const landmarker = await HandLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: asset("/models/hand_landmarker.task"),
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        // 손 하나만 본다. 두 손을 켜면 인식 부하가 두 배가 되고,
        // 지금 제스처 어휘에는 한 손이면 충분하다.
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      landmarkerRef.current = landmarker as unknown as typeof landmarkerRef.current;
    } catch {
      stop();
      setStatus("failed");
      return "failed";
    }

    setStatus("running");
    return "running";
  }, [stop]);

  // 인식 루프
  useEffect(() => {
    if (status !== "running") return;

    // 카메라는 30fps인데 rAF는 60Hz다. 추론을 60번 돌려봐야 절반은 같은 프레임이고,
    // 추론이 이 앱에서 가장 비싼 작업이라 그대로 두면 렌더 프레임을 잡아먹는다.
    // 24Hz면 손동작 판정에 충분하고, 팬은 어차피 속도 적분이라 부드럽게 이어진다.
    const INFER_INTERVAL = 1000 / 24;

    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      const now = performance.now();
      if (now - lastInferRef.current < INFER_INTERVAL) return;

      const v = videoRef.current;
      const lm = landmarkerRef.current;
      if (!v || !lm || v.readyState < 2) return;
      // 같은 프레임을 두 번 넣으면 MediaPipe가 타임스탬프 오류를 던진다
      if (v.currentTime === lastVideoTime.current) return;
      lastVideoTime.current = v.currentTime;
      lastInferRef.current = now;

      let res: { landmarks: Landmark[][] };
      try {
        res = lm.detectForVideo(v, now);
      } catch {
        return;
      }

      const hand = res.landmarks?.[0];
      if (!hand || hand.length < 21) {
        handRef.current = null;
        landmarksRef.current = null;
        pinchingRef.current = false;
        return;
      }
      landmarksRef.current = hand;
      const state = readHand(hand, pinchingRef.current, true);
      pinchingRef.current = state.kind === "pinch";
      handRef.current = state;
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [status]);

  // 백그라운드로 가면 카메라를 놓는다. 죽은 트랙을 붙들고 있으면 마지막 프레임이
  // 얼어붙은 채 인식이 계속 실패한다.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = false));
      } else {
        streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = true));
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    if (!active) stop();
  }, [active, stop]);

  useEffect(
    () => () => {
      stop();
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    },
    [stop],
  );

  return { status, videoRef, handRef, landmarksRef, start, stop };
}
