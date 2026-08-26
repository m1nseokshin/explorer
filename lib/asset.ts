/** basePath 배포(GitHub Pages 프로젝트 페이지) 시 public 자산 경로 프리픽스 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function asset(path: string): string {
  return `${BASE_PATH}${path}`;
}
