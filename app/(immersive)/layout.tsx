/**
 * 몰입 라우트에는 헤더도 푸터도 없다. 크롬은 HUD이며, 모든 픽셀과
 * 모든 안전영역 인셋이 중요하다 (DESIGN.md: Navigation).
 */
export default function ImmersiveLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
