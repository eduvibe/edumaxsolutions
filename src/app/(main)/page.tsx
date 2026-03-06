
import { HeroSection } from "@/components/sections/HeroSection";
import { SolutionsSection } from "@/components/sections/SolutionsSection";
import { FounderProfileSection } from "@/components/sections/FounderProfileSection";
import { LmsDetailsSection } from "@/components/sections/LmsDetailsSection";
import { ManagementSoftwareSection } from "@/components/sections/ManagementSoftwareSection";
import { RMSSection } from "@/components/sections/rms/RMSSection";
import { ExamVaultSection } from "@/components/sections/examvault/ExamVaultSection";
import { InquirySection } from "@/components/sections/InquirySection";
import { FaqSection } from "@/components/sections/FaqSection";
import { Separator } from "@/components/ui/separator";
import { RevealOnScroll } from "@/components/RevealOnScroll";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <RevealOnScroll>
        <SolutionsSection />
      </RevealOnScroll>
      <RevealOnScroll className="my-8 md:my-12">
        <Separator />
      </RevealOnScroll>
      <RevealOnScroll>
        <LmsDetailsSection />
      </RevealOnScroll>
      <RevealOnScroll className="my-8 md:my-12">
        <Separator />
      </RevealOnScroll>
      <RevealOnScroll>
        <ManagementSoftwareSection />
      </RevealOnScroll>
      <RevealOnScroll className="my-8 md:my-12">
        <Separator />
      </RevealOnScroll>
      <RevealOnScroll>
        <RMSSection />
      </RevealOnScroll>
      <RevealOnScroll className="my-8 md:my-12">
        <Separator />
      </RevealOnScroll>
      <RevealOnScroll>
        <ExamVaultSection />
      </RevealOnScroll>
      <RevealOnScroll className="my-8 md:my-12">
        <Separator />
      </RevealOnScroll>
      <RevealOnScroll>
        <FaqSection />
      </RevealOnScroll>
      <RevealOnScroll className="my-8 md:my-12">
        <Separator />
      </RevealOnScroll>
      <RevealOnScroll>
        <FounderProfileSection />
      </RevealOnScroll>
      <RevealOnScroll className="my-8 md:my-12">
        <Separator />
      </RevealOnScroll>
      <RevealOnScroll>
        <InquirySection />
      </RevealOnScroll>
    </>
  );
}
