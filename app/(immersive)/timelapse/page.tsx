import type { Metadata } from "next";
import SkyClient from "@/components/sky/SkyClient";

export const metadata: Metadata = {
  title: "Timelapse",
  description: "시간을 돌려 하늘이 어떻게 흘러가는지 봅니다.",
};

export default function TimelapsePage() {
  return <SkyClient timelapse />;
}
