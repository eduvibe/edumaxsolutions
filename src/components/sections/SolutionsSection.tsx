
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpenCheck, Building, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ParallaxWrapper } from "@/components/ParallaxWrapper";

const solutions = [
  {
    title: "Advanced Offline CBT and LMS",
    description: "A comprehensive platform to create, deliver, and manage educational content, track student progress, and foster interactive learning environments.",
    image: "/media/lms.png",
    dataAiHint: "LMS dashboard",
    link: "#lms-details",
  },
  {
    title: "Comprehensive School Portal",
    description: "An all-in-one solution to streamline administrative tasks, manage student data, facilitate communication, and improve overall school efficiency.",
    image: "/media/sms.jpg",
    dataAiHint: "admin panel",
    link: "#management-software",
  },
  {
    title: "Realtime Student Management (RSM)",
    description: "An attendance system that allows students to sign in and out, sends notifications to parents to keep them in the loop, and tracks spending by replacing physical cash with a voucher system.",
    image: "/media/attd.png",
    dataAiHint: "student management dashboard",
    link: "#rms",
  },
  {
    title: "ExamVault",
    description: "Teach without limits. Test without bias. Trusted exam integrity for true student performance.",
    image: "/media/examv.png",
    dataAiHint: "exam platform",
    link: "#examvault"
  },
];

export function SolutionsSection() {
  return (
    <section id="solutions" className="relative py-16 md:py-24 bg-background overflow-hidden">
      {/* Removed floating vector elements */}
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="text-center mb-12 animate-in fade-in slide-in-from-top-8 duration-700 ease-out">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">Our Core Solutions</h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Tailored software to meet the unique needs of primary and secondary schools in Nigeria.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {solutions.map((solution, index) => (
            <ParallaxWrapper 
              key={solution.title}
              offset={index % 2 === 0 ? 30 : -30} // Staggered parallax effect
              className="h-full"
            >
              <Card 
                className="overflow-hidden shadow-xl hover:shadow-2xl transition-shadow duration-300 flex flex-col h-full animate-in fade-in slide-in-from-bottom-12 duration-700 ease-out"
                style={{ animationDelay: `${index * 200}ms` }}
              >
                <CardHeader className="p-6">
                  <div className="flex items-start gap-4">

                    <div>
                      <CardTitle className="text-xl font-semibold">{solution.title}</CardTitle>
                      <CardDescription className="mt-1 text-base text-muted-foreground leading-relaxed">{solution.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-0 flex-grow flex flex-col justify-between">
                  <div className="mb-6 rounded-md overflow-hidden">
                    <Image
                      src={solution.image}
                      alt={solution.title}
                      width={400}
                      height={300}
                      className="w-full h-auto object-cover aspect-[4/3]"
                      data-ai-hint={solution.dataAiHint}
                    />
                  </div>
                  <Button asChild variant="default" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground mt-auto">
                    <Link href={solution.link}>
                      Learn More <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </ParallaxWrapper>
          ))}
        </div>
      </div>
    </section>
  );
}
