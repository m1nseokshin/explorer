import type { Metadata } from "next";
import SkyClient from "@/components/sky/SkyClient";

export const metadata: Metadata = {
  title: "Explore",
  description: "손으로 하늘을 항해하며 별로 길을 찾습니다.",
};

export default function ExplorePage() {
  // 실시간 하늘. 시간을 돌리는 건 /timelapse가 맡는다 — 한 화면이 둘을
  // 겸하면 '지금 보이는 게 진짜 하늘인가'라는 질문이 늘 따라붙는다.
  return <SkyClient />;
}
