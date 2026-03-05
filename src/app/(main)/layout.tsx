import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { WhatsAppChat } from "@/components/WhatsAppChat";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-grow">{children}</main>
      <WhatsAppChat />
      <Footer />
    </div>
  );
}
