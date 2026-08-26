"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

interface Props {
  eyebrow?: string;
  title: string;
  body: string;
  /** 왜 이 권한이 필요한지 — 카드마다 정확히 한 줄. */
  rationale?: string;
  ctaLabel: string;
  onCta: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  children?: ReactNode;
}

/**
 * 권한/실패 카드. 여기선 순수 검정이 '옳다' — 카메라가 아직 안 돌고 있으므로
 * 벤치마크의 규칙이 수정 없이 그대로 적용된다.
 * CTA는 카드당 정확히 하나. 보조 동작은 밑줄 링크로 격을 낮춘다.
 */
export default function PermissionCard({
  eyebrow,
  title,
  body,
  rationale,
  ctaLabel,
  onCta,
  secondaryLabel,
  onSecondary,
  children,
}: Props) {
  // 순서대로 스며들어온다. 여기는 하늘이 아직 안 보이는 화면이라 marketing과
  // 같은 reveal 티어를 써도 자이로 모션과 싸울 일이 없다.
  const fade = (delay: number) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-6 text-center"
      style={{
        paddingTop: "calc(env(safe-area-inset-top) + 24px)",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)",
      }}
    >
      <div className="w-full max-w-md">
        {eyebrow && (
          <motion.p {...fade(0)} className="type-eyebrow mb-3 text-muted">
            {eyebrow}
          </motion.p>
        )}
        <motion.h1 {...fade(0.06)} className="type-display-lg">
          {title}
        </motion.h1>
        <motion.p {...fade(0.12)} className="type-body-lg mt-6 text-foreground-mute">
          {body}
        </motion.p>

        {children}

        <motion.button
          {...fade(0.2)}
          type="button"
          onClick={onCta}
          whileTap={{ scale: 0.96 }}
          className="btn-ghost tap-56 mt-10"
        >
          {ctaLabel}
        </motion.button>

        {rationale && (
          <motion.p {...fade(0.28)} className="type-caption mt-6 text-muted">
            {rationale}
          </motion.p>
        )}

        {secondaryLabel && onSecondary && (
          <motion.button
            {...fade(0.34)}
            type="button"
            onClick={onSecondary}
            className="type-caption link-dark tap-56 mt-6 block w-full text-muted"
          >
            {secondaryLabel}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
