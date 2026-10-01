import { useId } from "react";

/**
 * 로고 마크 — 네 갈래 별과 그 앞을 지나는 궤도.
 *
 * 래스터 원본을 도형으로 다시 그렸다. 색은 currentColor 하나라 야간 시야
 * 리맵(--on-primary)을 그대로 따른다.
 *
 * 궤도가 별 앞을 지나는 자리는 별을 '지워서' 틈을 낸다(마스크). 배경색으로
 * 덧칠하면 검정이 아닌 바탕(파비콘 탭, 라이트 모드 공유 카드)에서 테두리가 보인다.
 *
 * ⚠️ public/icon 계열 파일(app/icon.svg)은 이 도형을 손으로 옮긴 사본이다.
 *    모양을 바꾸면 둘 다 바꿀 것.
 */
export const STAR_PATH =
  "M44 4 C44.8 30 47.2 43.4 80 46 C47.2 48.6 44.8 62 44 91 C43.2 62 40.8 48.6 8 46 C40.8 43.4 43.2 30 44 4 Z";
/** 궤도: 같은 두 끝점을 잇는 두 타원호. 가운데가 두껍고 양 끝이 뾰족해진다. */
export const ORBIT_PATH = "M5 50 A47 17 0 0 0 99 50 A47 10.5 0 0 1 5 50 Z";
export const ORBIT_TRANSFORM = "rotate(-27 52 50)";
export const STAR_TRANSFORM = "rotate(7 44 46)";

export default function LogoMark({
  size = 28,
  title,
  className,
}: {
  size?: number;
  /** 있으면 의미 있는 이미지, 없으면 장식(aria-hidden) */
  title?: string;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const mask = `logo-gap-${id}`;
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      fill="currentColor"
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <defs>
        <mask id={mask} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
          <rect width="100" height="100" fill="#fff" />
          {/* 궤도보다 조금 굵게 지워 별과 궤도 사이에 틈을 만든다 */}
          <path
            d={ORBIT_PATH}
            transform={ORBIT_TRANSFORM}
            fill="#000"
            stroke="#000"
            strokeWidth={6}
            strokeLinejoin="round"
          />
        </mask>
      </defs>
      {/* ⚠️ 마스크는 회전이 없는 그룹에 건다. userSpaceOnUse는 참조하는 요소의
          좌표계를 쓰므로, 회전된 별에 직접 걸면 틈이 궤도에서 7°만큼 비껴 난다. */}
      <g mask={`url(#${mask})`}>
        <path d={STAR_PATH} transform={STAR_TRANSFORM} />
      </g>
      <path d={ORBIT_PATH} transform={ORBIT_TRANSFORM} />
    </svg>
  );
}
