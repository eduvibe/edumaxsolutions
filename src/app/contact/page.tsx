
import { InquiryForm } from "@/components/InquiryForm";
import { Mail, MapPin, ArrowLeft, Phone } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ContactPage() {
  return (
    <div className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <div className="mb-8">
            <Button asChild variant="ghost" className="pl-0 hover:bg-transparent hover:text-primary">
                <Link href="/" className="flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" /> Back to Home
                </Link>
            </Button>
        </div>
        <div className="text-center mb-12 md:mb-16">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">Contact Us</h1>
          <p className="mt-4 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            We&apos;re excited to hear from you! Whether you have questions, need a demo, or want to discuss your school&apos;s specific needs, please get in touch using the form below or our direct contact details.
          </p>
        </div>

        <div className="grid md:grid-cols-5 gap-8 md:gap-12 max-w-5xl mx-auto">
          <div className="md:col-span-2 space-y-8 p-6 bg-card rounded-lg shadow-lg">
            <div>
              <h2 className="text-2xl font-semibold text-primary mb-4">Direct Contact</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Phone className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-foreground">Phone</h3>
                    <div className="flex flex-col">
                        <a href="tel:+2348059403939" className="text-muted-foreground hover:text-primary transition-colors">+234 805 940 3939</a>
                        <a href="tel:+2348067819642" className="text-muted-foreground hover:text-primary transition-colors">+234 806 781 9642</a>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Mon-Fri from 8am to 5pm.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-foreground">Email</h3>
                    <a href="mailto:info@edumaxsolutions.com.ng" className="text-muted-foreground hover:text-primary transition-colors">info@edumaxsolutions.com.ng</a>
                    <p className="text-sm text-muted-foreground">For general inquiries and demo requests.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-foreground">Office Address</h3>
                  <p className="text-muted-foreground">
                    No 1 Liberty Estate, Greenroof Bus/Stop Magboro,<br />
                    Ogun State Nigeria.
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
