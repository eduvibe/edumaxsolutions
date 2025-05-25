import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { ChatbotTrigger } from "@/components/ChatbotTrigger";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-grow">{children}</main>
      <ChatbotTrigger />
      <Footer />
    </div>
  );
}
