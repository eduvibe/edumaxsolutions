import Image from 'next/image';
import Link from 'next/link';
// ... existing code ... // Path relative to src folder

export function Logo() {
  return (
    <Link href="/" className="flex items-center">
      <Image src="/media/chtlogo.png" alt="EduMaxSolutions Logo" width={70} height={40} priority />
    </Link>
  );
}
