"use client";

import { AnimatePresence, motion } from "motion/react";

interface Props {
  /** 조준선이 별에 걸렸는가. 레티클 크기로만 쓴다. */
  snapped: boolean;
  /** 조준한 대상의 이름. 라벨 레이어가 꺼졌을 때만 넘어온다. */
  name: string | null;
  /** '터치해서 자세히 보기'처럼, 지금 입력 방식으로 여는 법. */
  hint: string | null;
}

/**
 * 조준 레티클 — 유일하게 색을 쓰는 요소.
 *
 * 흰 십자선은 별과 구분되지 않아 '기능적'으로 실패한다. 그래서 여기에만
 * --accent-reticle을 쓴다. 청록이 아니라 호박색인 이유: 장파장은 암순응을 보존한다.
 * 절대 채우지 않는다 — 채우면 식별하려는 대상을 가린다.
 */
/**
 * ⚠️ 별 이름을 여기 적지 않는다. 조준선 아래에 필요한 건 '무엇이 있나'가 아니라
 *    '어떻게 여나'다 — 이름은 라벨 레이어가 이미 말하고 있고, 자세한 건 열어서
 *    읽는 것이다. 이름을 적으면 열 수 있다는 사실이 끝내 드러나지 않는다.
 */
export default function Reticle({ snapped, name, hint }: Props) {
  // 레티클이 커지는 건 '별에 걸렸다'는 뜻으로 남긴다. 별자리는 하늘 어디를
  // 봐도 항상 하나는 들어오므로, 여기서도 커지면 신호가 아니라 상시 상태가 된다.
  const size = snapped ? 64 : 44;
  const opacity = snapped ? 0.9 : 0.5;

  return (
    <div
      className="pointer-events-none absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2"
      aria-hidden
    >
      <motion.div
        className="relative"
        animate={{ width: size, height: size, opacity }}
        // 대상에 '딱 걸리는' 감각. duration 기반 transition은 물러날 때도 같은
        // 곡선이라 밋밋한데, 스프링은 걸릴 때만 살짝 오버슈트한다.
        transition={{ type: "spring", stiffness: 520, damping: 26, mass: 0.6 }}
        style={{ width: size, height: size }}
      >
        <div
          className="absolute inset-0 rounded-full border"
          style={{ borderColor: "var(--accent-reticle)" }}
        />
        {[0, 90, 180, 270].map((deg) => (
          <div
            key={deg}
            className="absolute left-1/2 top-1/2 origin-top"
            style={{
              width: 1,
              height: 6,
              background: "var(--accent-reticle)",
              transform: `rotate(${deg}deg) translateY(${size / 2 - 3}px) translateX(-50%)`,
            }}
          />
        ))}
      </motion.div>
      <AnimatePresence>
        {hint && (
          <motion.div
            key={hint}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute left-1/2 top-full mt-2.5 -translate-x-1/2 whitespace-nowrap text-center"
          >
            {name && (
              <span className="type-eyebrow hud-shadow block leading-none opacity-70">
                {name}
              </span>
            )}
            <span
              className="type-eyebrow hud-shadow mt-1 block leading-none"
              style={{ color: "var(--accent-reticle)" }}
            >
              {hint}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
