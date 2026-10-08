import Image from "next/image";
import { GraduationCap, Users, Award } from "lucide-react";

const stats = [
  {
    icon: GraduationCap,
    value: "JAMB & WAEC",
    label: "Fully covered",
  },
  {
    icon: Users,
    value: "Students",
    label: "Across Nigeria",
  },
  {
    icon: Award,
    value: "2015–2026",
    label: "Question bank",
  },
];

export function BravoSocialProof() {
  return (
    <section className="relative py-0 bg-foreground overflow-hidden">
      <div className="grid md:grid-cols-2 min-h-[340px]">
        {/* Left — photo */}
        <div className="relative h-64 md:h-auto overflow-hidden">
          <Image
            src="/media/bravo-students.jpg"
            alt="Nigerian students sitting a computer-based exam"
            fill
            className="object-cover object-center"
            data-ai-hint="students taking CBT exam"
          />
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-foreground/50" />
          {/* Caption over image */}
          <div className="absolute bottom-6 left-6 right-6">
            <p className="text-sm font-medium text-background/80 italic leading-snug">
              &ldquo;The same CBT experience Nigerian students face in the exam hall — practised at home, offline.&rdquo;
            </p>
          </div>
        </div>

        {/* Right — stats + copy */}
        <div className="flex flex-col justify-center px-8 md:px-12 py-12 bg-foreground">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-background leading-snug mb-6">
            Designed around how<br />Nigerian students actually sit exams.
          </h2>
          <p className="text-background/65 text-base leading-relaxed mb-8 max-w-md">
            Bravo CBT mirrors the real JAMB CBT interface — timer, question palette, subject tabs, and all. Students who practise with Bravo arrive at the exam hall already comfortable with the format.
          </p>

          <div className="grid grid-cols-3 gap-4">
            {stats.map(({ icon: Icon, value, label }) => (
              <div key={label} className="text-center">
                <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-background/10 border border-background/15 mb-3 mx-auto">
                  <Icon className="h-5 w-5 text-background/70" />
                </div>
                <div className="text-base font-extrabold text-background leading-none">{value}</div>
                <div className="text-xs text-background/50 mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
