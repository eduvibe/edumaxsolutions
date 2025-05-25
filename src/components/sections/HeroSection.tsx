
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";

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
              Empowering <span className="text-primary">Nigerian Schools</span> with Innovative Technology
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground">
              EduMax Solutions provides cutting-edge Learning Management Systems (LMS) and School Management Software tailored for primary and secondary education across Nigeria.
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
            <Image
              src="https://placehold.co/600x400.png"
              alt="EduMax Solutions Platform Showcase"
              width={600}
              height={400}
              className="rounded-lg shadow-2xl relative"
              data-ai-hint="education tech"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}
