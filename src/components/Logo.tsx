import Image from "next/image";
import Link from "next/link";

export function Logo({ href }: { href?: string }) {
  const content = <Image src="/media/chtlogo.png" alt="EduMaxSolutions Logo" width={70} height={40} priority />;
  if (href) {
    return (
      <Link href={href} className="flex items-center">
        {content}
      </Link>
    );
  }
  return <span className="flex items-center">{content}</span>;
}
