
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

const faqItems = [
  {
    question: "What types of schools are EduMax solutions designed for?",
    answer: "EduMax solutions are specifically tailored for primary and secondary schools in Nigeria, addressing their unique educational and administrative needs.",
    value: "item-1",
  },
  {
    question: "Is the Offline CBT and LMS difficult to use for teachers who are not tech-savvy?",
    answer: "Not at all! Our platform is designed with user-friendliness in mind. We provide comprehensive training and ongoing support to ensure all teachers, regardless of their tech skills, can comfortably use the platform.",
    value: "item-2",
  },
  {
    question: "Can the School Portal handle student billing and online payments?",
    answer: "Yes, our School Portal includes robust fee management modules that can handle invoicing, track payments, and integrate with online payment gateways for convenient and secure transactions.",
    value: "item-3",
  },
  {
    question: "How does EduMax ensure data security and privacy?",
    answer: "We take data security and privacy very seriously. Our platforms are built with industry-standard security measures, including data encryption, regular backups, and access controls to protect sensitive school and student information.",
    value: "item-4",
  },
  {
    question: "What kind of support do you offer after we purchase a solution?",
    answer: "EduMax provides comprehensive post-purchase support, including onboarding assistance, training sessions for staff, a dedicated helpdesk, and regular software updates to ensure smooth operation and user satisfaction.",
    value: "item-5",
  },
  {
    question: "Can I see examples of schools using your software?",
    answer: (
      <div className="space-y-4">
        <p>Yes, we are trusted by top schools including:</p>
        
        <div className="space-y-1">
          <p className="font-medium text-foreground">Offline CBT and LMS:</p>
          <ul className="list-disc pl-5">
            <li>Straitgate College</li>
            <li>Distinct Star College</li>
          </ul>
        </div>

        <div className="space-y-1">
          <p className="font-medium text-foreground">School Portal:</p>
          <ul className="list-disc pl-5">
            <li>Vester International School</li>
          </ul>
        </div>

        <div className="space-y-1">
          <p className="font-medium text-foreground">School Website:</p>
          <ul className="list-disc pl-5">
            <li>
              <a href="https://www.distinctstarschools.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Distinct Star Schools
              </a>
            </li>
          </ul>
        </div>
      </div>
    ),
    value: "item-6",
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="py-16 md:py-24 bg-muted/50">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12 animate-in fade-in slide-in-from-top-8 duration-700 ease-out">
            <HelpCircle className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              Frequently Asked Questions
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Find answers to common questions about our solutions and services.
            </p>
          </div>
          <div className="animate-in fade-in slide-in-from-bottom-12 duration-700 ease-out delay-200">
            <Accordion type="single" collapsible className="w-full">
              {faqItems.map((item) => (
                <AccordionItem 
                  value={item.value} 
                  key={item.value}
                  className="bg-card shadow-sm rounded-lg mb-3 px-4"
                >
                  <AccordionTrigger className="text-left hover:no-underline text-base md:text-lg font-medium text-foreground">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed pt-2">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </div>
    </section>
  );
}
