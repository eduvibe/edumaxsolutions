
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Presentation, TrendingUp, FileText, UsersRound, CheckCircle } from "lucide-react";
import Image from "next/image";

const lmsFeatures = [
  {
    title: "Interactive Courses",
    description: "Engage students with multimedia content, quizzes, and assignments.",
    icon: <Presentation className="h-6 w-6 text-primary" />,
  },
  {
    title: "Progress Tracking",
    description: "Monitor student performance with detailed analytics and reports.",
    icon: <TrendingUp className="h-6 w-6 text-primary" />,
  },
  {
    title: "Online Assessments",
    description: "Create and manage secure online tests and examinations.",
    icon: <FileText className="h-6 w-6 text-primary" />,
  },
  {
    title: "Collaborative Tools",
    description: "Facilitate group projects and discussions with integrated communication features.",
    icon: <UsersRound className="h-6 w-6 text-primary" />,
  },
];

export function LmsDetailsSection() {
  return (
    <section id="lms" className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="animate-in fade-in slide-in-from-left-12 duration-700 ease-out">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              Advanced <span className="text-primary">Learning Management System</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Our LMS is designed to create a dynamic and effective digital learning experience for students and educators alike.
            </p>
            <ul className="mt-8 space-y-4">
              {lmsFeatures.map((feature, index) => (
                <li 
                  key={feature.title} 
                  className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-8 duration-500 ease-out"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <div className="flex-shrink-0 mt-1 p-1 bg-primary/10 rounded-full">
                    {feature.icon}
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">{feature.title}</h4>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative group animate-in fade-in slide-in-from-right-12 duration-700 ease-out delay-200">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-accent rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
            <Image
              src="https://placehold.co/500x450.png"
              alt="LMS Dashboard Showcase"
              width={500}
              height={450}
              className="rounded-lg shadow-xl relative"
              data-ai-hint="online learning"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
