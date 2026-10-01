"use client";

import { ReactLenis, useLenis } from "lenis/react";
import "lenis/dist/lenis.css";
import { useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";

/**
 * 마케팅 페이지의 부드러운 스크롤(Lenis).
 *
 * 휠 한 칸이 100px씩 '툭툭' 끊기면 스크롤로 재생되는 소개 필름이 계단처럼
 * 움직인다. Lenis는 네이티브 스크롤 위치 자체를 보간하므로 sticky·useScroll·
 * scroll 이벤트가 전부 그대로 동작한다 — 가짜 스크롤 컨테이너를 두지 않는다.
 *
 * - 몰입 라우트(/explore, /timelapse)에는 걸지 않는다. 그쪽은 스크롤하지 않는
 *   100dvh 화면이고, 휠은 확대에 쓴다.
 * - 터치는 건드리지 않는다(syncTouch 끔). 모바일의 관성 스크롤은 이미 부드럽고,
 *   손가락을 따라오지 않는 스크롤은 즉시 어색하다.
 * - 모션 줄이기에서는 아예 켜지 않는다(DESIGN.md: reduced-motion은 부드러운
 *   스크롤을 끈다).
 *
 * ⚠️ 안쪽에서 따로 스크롤되는 영역(모달 등)에는 `data-lenis-prevent`를 달 것.
 *    안 달면 Lenis가 휠을 가로채 바깥 페이지가 대신 움직인다.
 */
export default function SmoothScroll({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;
  return (
    <ReactLenis
      root
      options={{
        // 0.1이 기본. 조금 더 느리게 따라와 필름이 잔잔하게 흐르도록.
        lerp: 0.085,
        wheelMultiplier: 0.9,
        syncTouch: false,
        // 같은 페이지 안의 #앵커 링크도 같은 곡선으로 이동
        anchors: true,
      }}
    >
      <RouteReset />
      {children}
    </ReactLenis>
  );
}

/**
 * 페이지를 옮기면 Lenis의 목표 위치를 새 페이지 맨 위로 맞춘다. 그러지 않으면
 * 이전 페이지에서 굴리던 관성이 남아 새 페이지가 도착하자마자 저절로 내려간다.
 */
function RouteReset() {
  const lenis = useLenis();
  const pathname = usePathname();
  useEffect(() => {
    lenis?.scrollTo(0, { immediate: true, force: true });
  }, [pathname, lenis]);
  return null;
}
