"use client";

import { useLanguage } from "@/lib/i18n";
import { site } from "@/lib/content";
import LogoMark from "./Logo";

export default function Footer() {
  const { lang } = useLanguage();
  return (
    <footer className="border-t border-hairline px-6 py-12 sm:px-12 md:px-16 lg:px-24">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {/* 마크와 이름을 나란히. 푸터는 사이트를 한 번 더 '명명'하는 자리라 글자를 남긴다. */}
          <p className="flex items-center gap-3">
            <LogoMark size={28} />
            <span className="type-display-lg text-base leading-none sm:text-lg">{site.name}</span>
          </p>
          <p className="type-caption mt-2 text-muted">
            {lang === "ko" ? site.taglineKo : site.taglineEn}
          </p>
        </div>
        <div className="type-caption text-muted">
          <p>
            {lang === "en" && "Made as a "}
            <a
              href={site.portfolio}
              target="_blank"
              rel="noreferrer noopener"
              className="link-dark"
            >
              {lang === "ko" ? "개인 포트폴리오" : "personal portfolio"}
            </a>
            {lang === "ko" ? "용으로 만든 작업입니다." : " piece."}
          </p>
          <p className="mt-1">
            {lang === "ko" ? "성표" : "Star data"} ·{" "}
            <a
              href="https://github.com/ofrohn/d3-celestial"
              target="_blank"
              rel="noreferrer noopener"
              className="link-dark"
            >
              d3-celestial
            </a>{" "}
            (BSD-3-Clause) · Hipparcos · Yale BSC
          </p>
        </div>
      </div>
      <p className="type-caption mx-auto mt-8 max-w-7xl text-muted">
        © 2026 Minseok Shin. All Rights Reserved
      </p>
    </footer>
  );
}
