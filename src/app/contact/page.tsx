
import { InquiryForm } from "@/components/InquiryForm";
import { Mail, MapPin } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-12 md:mb-16">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">Contact Us</h1>
          <p className="mt-4 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            We're excited to hear from you! Whether you have questions, need a demo, or want to discuss your school's specific needs, please get in touch using the form below or our direct contact details.
          </p>
        </div>

        <div className="grid md:grid-cols-5 gap-8 md:gap-12 max-w-5xl mx-auto">
          <div className="md:col-span-2 space-y-8 p-6 bg-card rounded-lg shadow-lg">
            <div>
              <h2 className="text-2xl font-semibold text-primary mb-4">Direct Contact</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Mail className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-foreground">Email</h3>
                    <a href="mailto:edumaxsolutions.ng@gmail.com" className="text-muted-foreground hover:text-primary transition-colors">edumaxsolutions.ng@gmail.com</a>
                    <p className="text-sm text-muted-foreground">For general inquiries and demo requests.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-foreground">Office Address</h3>
                    <p className="text-muted-foreground">
                      123 Education Drive, <br />
                      Ikeja, Lagos, Nigeria.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-3 p-6 bg-card rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold text-primary mb-6">Send us a Message</h2>
            <InquiryForm />
          </div>
        </div>
      </div>
    </div>
  );
}
