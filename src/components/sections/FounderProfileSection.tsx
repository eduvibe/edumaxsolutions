
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Briefcase, Award } from "lucide-react";

export function FounderProfileSection() {
  return (
    <section id="founder" className="py-16 md:py-24 bg-muted/50">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-12 animate-in fade-in slide-in-from-top-8 duration-700 ease-out">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">Meet Our Founder</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Driven by passion and experience in education.
          </p>
        </div>
        <Card className="shadow-xl overflow-hidden animate-in fade-in zoom-in-90 duration-700 ease-out delay-200">
          <div className="grid md:grid-cols-3">
            <div className="md:col-span-1">
              <Image
                src="https://placehold.co/400x500.png"
                alt="Okolo Uchenna Maxwell, Founder of EduMax Solutions"
                width={400}
                height={500}
                className="object-cover w-full h-full"
                data-ai-hint="founder portrait"
              />
            </div>
            <div className="md:col-span-2 p-8 md:p-12 flex flex-col justify-center">
              <h3 className="text-2xl md:text-3xl font-semibold text-primary">Okolo Uchenna Maxwell</h3>
              <p className="mt-2 text-base text-muted-foreground">Founder & CEO, EduMax Solutions</p>
              <div className="mt-4 flex items-center gap-4 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" />
                  <span>6+ Years in Education</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  <span>Teaching & School Management Expert</span>
                </div>
              </div>
              <p className="mt-6 text-foreground/90 leading-relaxed">
                With over six years of dedicated experience in teaching and school management, Okolo Uchenna Maxwell founded EduMax Solutions to bridge the gap between traditional education and modern technology. His firsthand understanding of the challenges and opportunities within Nigerian schools fuels his passion for empowering students and educators.
              </p>
              <p className="mt-4 text-foreground/90 leading-relaxed">
                Okolo's vision is to deliver impactful, user-friendly software solutions that enhance learning outcomes and streamline school operations, ultimately transforming the educational landscape in Nigeria.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}
