
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { Laptop, Layout, GraduationCap, CalendarDays, ArrowRight, Sparkles } from "lucide-react";
import { RequestDemoModal } from "@/components/RequestDemoModal";
import { FloatingDecor } from "@/components/FloatingDecor";
import { ParallaxWrapper } from "@/components/ParallaxWrapper";


export function HeroSection() {
  const contactPageLink = "/contact";
  
  const services = [
    {
      icon: <Laptop className="h-6 w-6 text-white" />,
      title: "Offline CBT & LMS Installations",
      description: "Robust computer-based testing and learning management for seamless education.",
      color: "bg-primary",
      link: "/#solutions"
    },
    {
      icon: <Layout className="h-6 w-6 text-white" />,
      title: "Modern & Sleek Website",
      description: "Responsive, modern school websites that represent your brand excellence.",
      color: "bg-accent",
      link: "/#solutions"
    },
    {
      icon: <GraduationCap className="h-6 w-6 text-white" />,
      title: "School Portal",
      description: "Comprehensive management portal for students, staff, and parents.",
      color: "bg-blue-500",
      link: "/#solutions"
    },
    {
      icon: <CalendarDays className="h-6 w-6 text-white" />,
      title: "Academics Planning",
      description: "Expert consulting by a certified Educational Administrator to optimize your curriculum and school strategy.",
      color: "bg-green-500",
      link: "/#solutions"
    }
  ];

  return (
    <section className="relative pt-20 md:pt-32 bg-gradient-to-br from-primary/5 via-background to-background overflow-hidden">
       {/* Background Parallax Layer (Slower) */}
       <ParallaxWrapper 
         offset={100} 
         className="absolute inset-0 overflow-hidden pointer-events-none z-0"
       >
         <FloatingDecor />
         <div
            aria-hidden="true"
            className="absolute inset-0 grid grid-cols-2 -space-x-52 opacity-20 dark:opacity-10"
          >
            <div className="blur-[106px] h-56 bg-gradient-to-br from-primary to-[hsl(330,100%,85%)] dark:from-primary"></div>
            <div className="blur-[106px] h-32 bg-gradient-to-r from-accent to-[hsl(0,72%,85%)] dark:from-accent"></div>
          </div>
       </ParallaxWrapper>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="grid md:grid-cols-2 gap-12 items-center mb-12">
          <ParallaxWrapper offset={-30} className="space-y-6 text-center md:text-left animate-in fade-in slide-in-from-bottom-10 duration-1000 ease-out">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground">
              <span className="text-primary">Best CBT</span> & <span className="text-primary">School Portal</span> Software in Nigeria
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground">
              EduMax Solutions provides the most <strong>affordable LMS</strong> and comprehensive <strong>School Portal</strong>. Trusted by top software providers in Nigeria for primary and secondary education.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <Button asChild size="lg" className="bg-primary hover:bg-accent text-primary-foreground shadow-lg transform hover:scale-[1.03] transition-all duration-300">
                <Link href="/#solutions">
                  <span className="flex items-center gap-2">
                    Explore Solutions
                    <ArrowRight className="h-5 w-5" />
                  </span>
                </Link>
              </Button>
              <RequestDemoModal>
                <Button size="lg" variant="outline" className="shadow-lg transform hover:scale-[1.03] transition-all duration-300 border-accent text-accent hover:bg-accent/10 hover:text-accent">
                  <span className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5" />
                    Request a Demo
                  </span>
                </Button>
              </RequestDemoModal>
            </div>
          </ParallaxWrapper>
          
          <ParallaxWrapper offset={-60} className="relative group animate-in fade-in zoom-in-95 duration-1000 ease-out delay-300">
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
              <div className="absolute -top-3 -right-3 flex items-center gap-1 rounded-full bg-background/80 px-3 py-1 shadow-md backdrop-blur-sm">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">New Animations</span>
              </div>
            </div>
          </ParallaxWrapper>
        </div>

        {/* Resting Cards Section */}
        <div className="relative z-20 translate-y-6 md:translate-y-8">
          <div className="text-center mb-10">
            <span className="inline-block py-1 px-3 rounded-full bg-primary/10 text-primary text-sm font-semibold tracking-wide uppercase">
              Our Services
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service, index) => (
              <div 
                key={index}
                className="bg-card text-card-foreground rounded-xl shadow-xl border border-border/50 p-6 pt-12 relative flex flex-col items-center text-center group hover:-translate-y-2 transition-all duration-300 ease-in-out"
              >
                {/* Floating Icon */}
                <div className={`absolute -top-6 left-1/2 -translate-x-1/2 p-4 rounded-xl shadow-lg ${service.color} transform group-hover:scale-110 transition-transform duration-300`}>
                  {service.icon}
                </div>
                
                <h3 className="text-lg font-bold mb-3 mt-2">{service.title}</h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                  {service.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
