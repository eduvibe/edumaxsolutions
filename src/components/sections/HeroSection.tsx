
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { Laptop, Layout, GraduationCap, CalendarDays } from "lucide-react";


export function HeroSection() {
  const contactPageLink = "/contact";
  return (
    <section className="relative py-20 md:py-32 bg-gradient-to-br from-primary/5 via-background to-background overflow-hidden">
       <div
        aria-hidden="true"
        className="absolute inset-0 grid grid-cols-2 -space-x-52 opacity-20 dark:opacity-10"
      >
        <div className="blur-[106px] h-56 bg-gradient-to-br from-primary to-[hsl(330,100%,85%)] dark:from-primary"></div>
        <div className="blur-[106px] h-32 bg-gradient-to-r from-accent to-[hsl(0,72%,85%)] dark:from-accent"></div>
      </div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 text-center md:text-left animate-in fade-in slide-in-from-bottom-10 duration-1000 ease-out">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground">
              <span className="text-primary">Best CBT</span> & <span className="text-primary">School Portal</span> Software in Nigeria
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground">
              EduMax Solutions provides the most <strong>affordable LMS</strong> and comprehensive <strong>School Management Software</strong>. Trusted by top software providers in Nigeria for primary and secondary education.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transform hover:scale-105 transition-transform duration-300">
                <Link href="/#solutions">Explore Solutions</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="shadow-lg transform hover:scale-105 transition-transform duration-300 border-accent text-accent hover:bg-accent/10 hover:text-accent">
                <Link href={contactPageLink}>Request a Demo</Link>
              </Button>
            </div>
          </div>
          <div className="relative group animate-in fade-in zoom-in-95 duration-1000 ease-out delay-300">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary via-accent to-primary/50 rounded-lg blur opacity-40 group-hover:opacity-60 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
            <div className="relative">
              <Image
                src="/media/heroimage.png"
                alt="EduMax Solutions Platform Showcase"
                width={600}
                height={400}
                className="rounded-lg shadow-2xl relative"
                data-ai-hint="education tech"
                priority
              />
              
              {/* Floating Cards */}
              
              {/* Card 1: CBT Software & LMS (Top Left) */}
              <div className="absolute -top-6 -left-4 md:-left-12 bg-card p-3 rounded-xl shadow-lg border border-border flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-700 delay-500 max-w-[200px] md:max-w-xs z-20">
                <div className="bg-primary/10 p-2 rounded-full">
                  <Laptop className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Software</p>
                  <p className="text-sm font-bold leading-tight">CBT & LMS Installations</p>
                </div>
              </div>

              {/* Card 2: Modern & Sleek Website (Top Right) */}
              <div className="absolute top-8 -right-4 md:-right-8 bg-card p-3 rounded-xl shadow-lg border border-border flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-700 delay-700 max-w-[180px] md:max-w-xs z-20">
                <div className="bg-accent/10 p-2 rounded-full">
                  <Layout className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Design</p>
                  <p className="text-sm font-bold leading-tight">Modern & Sleek Website</p>
                </div>
              </div>

              {/* Card 3: School Portal (Bottom Right) */}
              <div className="absolute bottom-12 -right-2 md:-right-6 bg-card p-3 rounded-xl shadow-lg border border-border flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-700 delay-1000 max-w-[180px] md:max-w-xs z-20">
                <div className="bg-blue-500/10 p-2 rounded-full">
                  <GraduationCap className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Management</p>
                  <p className="text-sm font-bold leading-tight">School Portal</p>
                </div>
              </div>

               {/* Card 4: Academics Planning (Bottom Left) */}
               <div className="absolute -bottom-6 -left-2 md:left-8 bg-card p-3 rounded-xl shadow-lg border border-border flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-700 delay-1000 max-w-[180px] md:max-w-xs z-20">
                <div className="bg-green-500/10 p-2 rounded-full">
                  <CalendarDays className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Strategy</p>
                  <p className="text-sm font-bold leading-tight">Academics Planning</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
