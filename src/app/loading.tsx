
import { Logo } from "@/components/Logo";

export default function Loading() {
  // You can add any UI inside Loading, including a Skeleton.
  return (
    <div className="fixed inset-0 z-[200] flex h-screen w-screen flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="animate-pulse-subtle">
        <Logo />
      </div>
      <p className="mt-4 text-sm text-muted-foreground">Loading, please wait...</p>
    </div>
  );
}
