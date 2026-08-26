"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** 순서대로 들어오게 할 때의 지연(초) */
  delay?: number;
  /** 아래에서 올라오는 거리(px). 0이면 페이드만. */
  y?: number;
  className?: string;
  /** 한 번만 재생할지. 기본은 한 번 — 오르내릴 때마다 다시 튀면 성가시다. */
  once?: boolean;
}

/**
 * 스크롤 진입 시 등장.
 *
 * IntersectionObserver를 직접 다루던 이전 구현을 Motion의 whileInView로 대체했다.
 * 뷰포트 경계 근처에서 앞뒤로 스크롤할 때 관찰자를 즉시 해제하던 예전 방식은
 * 등장이 반쯤 끊긴 채로 남는 경우가 있었다.
 *
 * ⚠️ prefers-reduced-motion에서는 초기 상태를 '보이는 상태'로 둔다. opacity 0에서
 *    시작하는 등장은 모션이 꺼지면 콘텐츠가 통째로 사라지는 결과가 된다.
 */
export default function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
  once = true,
}: Props) {
  const reduce = useReducedMotion();

  const variants: Variants = {
    hidden: reduce ? { opacity: 1 } : { opacity: 0, y },
    shown: {
      opacity: 1,
      y: 0,
      transition: {
        duration: reduce ? 0 : 0.7,
        delay: reduce ? 0 : delay,
        // easeOutQuint — 벤치마크 프로젝트의 reveal 곡선을 그대로 쓴다
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="shown"
      // 화면에 조금 들어왔을 때 시작하고, 한 번 보이면 다시 숨기지 않는다
      viewport={{ once, amount: 0.25, margin: "0px 0px -12% 0px" }}
    >
      {children}
    </motion.div>
  );
}
