
import { InquiryForm } from "@/components/InquiryForm";
import { Mail } from "lucide-react";

export function InquirySection() {
  return (
    <section id="contact" className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12 animate-in fade-in slide-in-from-top-8 duration-700 ease-out">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              Get in Touch or Request a Demo
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              We're here to help you find the perfect solution for your school. Fill out the form below, or email us, and we'll contact you shortly.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 items-start animate-in fade-in slide-in-from-bottom-12 duration-700 ease-out delay-200">
            <div className="space-y-6">
                <h3 className="text-xl font-semibold text-primary">Contact Information</h3>
                <p className="text-muted-foreground">
                Feel free to reach out to us directly via email for any inquiries or demo requests.
                </p>
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-primary"/>
                        <a href="mailto:edumaxsolutions.ng@gmail.com" className="text-foreground hover:text-primary transition-colors">edumaxsolutions.ng@gmail.com</a>
                    </div>
                </div>
                 <h3 className="text-xl font-semibold text-primary mt-8">Our Office</h3>
                 <p className="text-muted-foreground">
                    123 Education Drive,<br/>
                    Ikeja, Lagos,<br/>
                    Nigeria
                 </p>
            </div>
            <div>
                 <InquiryForm />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
