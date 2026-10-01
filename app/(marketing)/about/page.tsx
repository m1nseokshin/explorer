import type { Metadata } from "next";
import AboutContent from "@/components/home/AboutContent";

export const metadata: Metadata = {
  title: "About",
  description:
    "점뿐인 밤하늘에 누가 언제 선을 그어 88개 별자리가 됐는지, 그리고 이 도구를 만든 이유.",
};

export default function AboutPage() {
  return <AboutContent />;
}
