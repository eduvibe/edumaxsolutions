import Image from "next/image";

const points = [
  {
    title: "JAMB & WAEC",
    body: "Full past question coverage for both exams — every subject, every year in the bank.",
  },
  {
    title: "Works offline",
    body: "No data. No Wi-Fi. No subscription. The app and all its content live entirely on the student's device.",
  },
  {
    title: "Exam-day format",
    body: "The interface mirrors what students see in the real JAMB hall — so there are no surprises when it counts.",
  },
];

export function BravoSocialProof() {
  return (
    <section className="relative bg-foreground overflow-hidden">
      <div className="grid md:grid-cols-2 min-h-[380px]">

        {/* Left — photo, no overlay icons or cards */}
        <div className="relative h-64 md:h-auto overflow-hidden">
          <Image
            src="/media/bravo-students.jpg"
            alt="Nigerian students sitting a computer-based exam"
            fill
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-foreground/45" />
          <div className="absolute bottom-6 left-6 right-6">
            <p className="text-sm text-background/75 italic leading-snug">
              &ldquo;The same pressure. The same format. Practised at home, before it matters.&rdquo;
            </p>
          </div>
        </div>

        {/* Right — headline + plain text points, no icons, no cards */}
        <div className="flex flex-col justify-center px-8 md:px-14 py-14">
          <h2 className="text-2xl md:text-[1.85rem] font-extrabold tracking-tight text-background leading-tight mb-8">
            Designed around how<br />
            Nigerian students actually<br />
            sit exams.
          </h2>

          <div className="space-y-6">
            {points.map((pt) => (
              <div key={pt.title} className="border-t border-background/15 pt-5">
                <p className="text-sm font-bold text-background mb-1">{pt.title}</p>
                <p className="text-sm text-background/60 leading-relaxed">{pt.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
