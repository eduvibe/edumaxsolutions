
import { UserPlus, CheckSquare, BarChart3, MessageCircle } from "lucide-react";
import Image from "next/image";

const softwareFeatures = [
  {
    title: "Student Enrollment & SIS",
    description: "Manage student admissions, records, and academic history seamlessly.",
    icon: <UserPlus className="h-6 w-6 text-accent" />,
  },
  {
    title: "Attendance Management",
    description: "Track student and staff attendance with automated reporting.",
    icon: <CheckSquare className="h-6 w-6 text-accent" />,
  },
  {
    title: "Gradebook & Reporting",
    description: "Efficiently manage grades, generate report cards, and analyze academic performance.",
    icon: <BarChart3 className="h-6 w-6 text-accent" />,
  },
  {
    title: "Parent Communication",
    description: "Keep parents informed with integrated messaging and a dedicated portal.",
    icon: <MessageCircle className="h-6 w-6 text-accent" />,
  },
];

export function ManagementSoftwareSection() {
  return (
    <section id="management-software" className="py-16 md:py-24 bg-muted/50">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="relative group order-last md:order-first animate-in fade-in slide-in-from-left-12 duration-700 ease-out delay-200">
             <div className="absolute -inset-0.5 bg-gradient-to-r from-accent to-primary rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
            <Image
              src="https://placehold.co/500x450.png"
              alt="School Management Software Interface"
              width={500}
              height={450}
              className="rounded-lg shadow-xl relative"
              data-ai-hint="admin working"
            />
          </div>
          <div className="animate-in fade-in slide-in-from-right-12 duration-700 ease-out">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              Comprehensive <span className="text-accent">School Management Software</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Streamline your school's operations, enhance productivity, and foster better communication with our robust management platform.
            </p>
            <ul className="mt-8 space-y-4">
              {softwareFeatures.map((feature, index) => (
                <li 
                  key={feature.title} 
                  className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-8 duration-500 ease-out"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <div className="flex-shrink-0 mt-1 p-1 bg-accent/10 rounded-full">
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
        </div>
      </div>
    </section>
  );
}
