import { Separator } from "@/components/ui/separator";
import { RevealOnScroll } from "@/components/RevealOnScroll";
import { BravoHero } from "@/components/sections/bravo/BravoHero";
import { BravoFeatures } from "@/components/sections/bravo/BravoFeatures";
import { BravoSocialProof } from "@/components/sections/bravo/BravoSocialProof";
import { BravoScreenshots } from "@/components/sections/bravo/BravoScreenshots";
import { BravoCta } from "@/components/sections/bravo/BravoCta";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bravo CBT — Offline JAMB & WAEC Practice | EduMax Solutions",
  description:
    "Bravo CBT is a fully offline computer-based test app for Nigerian students. Practice JAMB UTME and WAEC SSCE past questions from 2015 to current edition — no internet required after activation.",
};

export default function BravoPage() {
  return (
    <>
      <BravoHero />
      <RevealOnScroll className="my-8 md:my-12">
        <Separator />
      </RevealOnScroll>
      <RevealOnScroll>
        <BravoFeatures />
      </RevealOnScroll>
      <RevealOnScroll>
        <BravoSocialProof />
      </RevealOnScroll>
      <RevealOnScroll className="my-8 md:my-12">
        <Separator />
      </RevealOnScroll>
      <RevealOnScroll>
        <BravoScreenshots />
      </RevealOnScroll>
      <RevealOnScroll className="my-8 md:my-12">
        <Separator />
      </RevealOnScroll>
      <RevealOnScroll>
        <BravoCta />
      </RevealOnScroll>
    </>
  );
}
