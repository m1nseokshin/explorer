"use client";

import dynamic from "next/dynamic";

/**
 * ssr:false 는 선택이 아니라 필수다 — 트리 전체가 모듈 스코프에서 window,
 * navigator, screen을 만진다. 동시에 홈 화면이 three.js와 astronomy-engine을
 * 내려받지 않게 해준다.
 */
const Loading = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-background">
    <p className="type-eyebrow text-muted">준비 중</p>
  </div>
);

const SkyExperience = dynamic(() => import("./SkyExperience"), { ssr: false, loading: Loading });

/**
 * 타임랩스는 손 인식 화면과 다른 컴포넌트다. 카메라·제스처 코드(MediaPipe 포함)를
 * 아예 불러오지 않는다.
 */
const TimelapseExperience = dynamic(() => import("./TimelapseExperience"), {
  ssr: false,
  loading: Loading,
});

export default function SkyClient({ timelapse = false }: { timelapse?: boolean }) {
  return timelapse ? <TimelapseExperience /> : <SkyExperience />;
}
