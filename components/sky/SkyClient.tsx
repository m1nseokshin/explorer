"use client";

import dynamic from "next/dynamic";

/**
 * ssr:false 는 선택이 아니라 필수다 — 트리 전체가 모듈 스코프에서 window,
 * navigator, screen을 만진다. 동시에 홈 화면이 three.js와 astronomy-engine을
 * 내려받지 않게 해준다.
 */
const SkyExperience = dynamic(() => import("./SkyExperience"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <p className="type-eyebrow text-muted">준비 중</p>
    </div>
  ),
});

export default function SkyClient({ timelapse = false }: { timelapse?: boolean }) {
  return <SkyExperience timelapse={timelapse} />;
}
