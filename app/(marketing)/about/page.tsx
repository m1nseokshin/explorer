import type { Metadata } from "next";
import AboutContent from "@/components/home/AboutContent";

export const metadata: Metadata = {
  title: "About",
  description: "왜 이걸 만들었는지, 무엇을 실험했는지, 그리고 만든 사람에 대하여.",
};

export default function AboutPage() {
  return <AboutContent />;
}
