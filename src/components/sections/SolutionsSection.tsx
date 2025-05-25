
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpenCheck, Building, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const solutions = [
  {
    title: "Learning Management System (LMS)",
    description: "A comprehensive platform to create, deliver, and manage educational content, track student progress, and foster interactive learning environments.",
    icon: <BookOpenCheck className="h-10 w-10 text-primary" />,
    image: "https://placehold.co/400x300.png",
    dataAiHint: "LMS dashboard",
    link: "/#lms",
  },
  {
    title: "School Management Software",
    description: "An all-in-one solution to streamline administrative tasks, manage student data, facilitate communication, and improve overall school efficiency.",
    icon: <Building className="h-10 w-10 text-primary" />,
    image: "https://placehold.co/400x300.png",
    dataAiHint: "admin panel",
    link: "/#management-software",
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
        <div className="grid md:grid-cols-2 gap-8">
          {solutions.map((solution, index) => (
            <Card 
              key={solution.title} 
              className="overflow-hidden shadow-xl hover:shadow-2xl transition-shadow duration-300 flex flex-col animate-in fade-in slide-in-from-bottom-12 duration-700 ease-out"
              style={{ animationDelay: `${index * 200}ms` }}
            >
              <CardHeader className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-primary/10 flex-shrink-0">
                    {solution.icon}
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-semibold">{solution.title}</CardTitle>
                    <CardDescription className="mt-2 text-muted-foreground leading-relaxed">{solution.description}</CardDescription>
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
          ))}
        </div>
      </div>
    </section>
  );
}
