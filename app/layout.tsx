import type { Metadata, Viewport } from "next";
import { LanguageProvider } from "@/lib/i18n";
import { ObserverProvider } from "@/lib/observer";
import "./globals.css";

export const metadata: Metadata = {
  // 탭 제목은 사이트명 접미사 없이 페이지 이름만. 탭이 여러 개 열려 있을 때
  // "EXPLORER — …"가 반복되면 앞부분이 다 잘려 구분이 안 된다.
  title: "Explorer",
  description:
    "수천 년 동안 뱃사람은 별로 자기 위치를 알았습니다. 그 오래된 도구를 지금 당신이 선 자리의 하늘로 되돌려 놓았습니다. 항해는 손으로 합니다.",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  // AR 라우트가 안전영역을 직접 다루려면 cover가 필수다
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="flex min-h-dvh flex-col antialiased">
        <LanguageProvider>
          <ObserverProvider>{children}</ObserverProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
