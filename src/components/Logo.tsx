import Link from "next/link";
import { GraduationCap } from "lucide-react";

export function Logo({ href }: { href?: string }) {
  const content = (
    <span className="inline-flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <GraduationCap className="h-5 w-5" />
      </span>
      <span className="text-sm font-extrabold tracking-tight text-foreground">EduMax</span>
    </span>
  );
  if (href) {
    return (
      <Link href={href} className="flex items-center">
        {content}
      </Link>
    );
  }
  return <span className="flex items-center">{content}</span>;
}
