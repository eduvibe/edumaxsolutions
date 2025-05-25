
import { HeroSection } from "@/components/sections/HeroSection";
import { SolutionsSection } from "@/components/sections/SolutionsSection";
import { FounderProfileSection } from "@/components/sections/FounderProfileSection";
import { LmsDetailsSection } from "@/components/sections/LmsDetailsSection";
import { ManagementSoftwareSection } from "@/components/sections/ManagementSoftwareSection";
import { InquirySection } from "@/components/sections/InquirySection";
import { FaqSection } from "@/components/sections/FaqSection";
import { Separator } from "@/components/ui/separator";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <SolutionsSection />
      <div className="animate-in fade-in duration-500 ease-out delay-300">
        <Separator className="my-8 md:my-12" />
      </div>
      <LmsDetailsSection />
      <div className="animate-in fade-in duration-500 ease-out delay-300">
        <Separator className="my-8 md:my-12" />
      </div>
      <ManagementSoftwareSection />
      <div className="animate-in fade-in duration-500 ease-out delay-300">
        <Separator className="my-8 md:my-12" />
      </div>
      <FaqSection />
      <div className="animate-in fade-in duration-500 ease-out delay-300">
        <Separator className="my-8 md:my-12" />
      </div>
      <FounderProfileSection />
      <div className="animate-in fade-in duration-500 ease-out delay-300">
        <Separator className="my-8 md:my-12" />
      </div>
      <InquirySection />
    </>
  );
}
