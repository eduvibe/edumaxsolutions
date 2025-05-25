import Image from 'next/image';
import Link from 'next/link';
import EduMaxSolutionsLogo from '@/public/media/chtlogo.png'; // Path relative to src folder

export function Logo() {
  return (
    <Link href="/" className="flex items-center">
      <Image
        src={EduMaxSolutionsLogo}
        alt="EduMax Solutions Logo"
        width={70}
        height={40}
        priority // Keeps the logo loading quickly, good for LCP
      />
    </Link>
  );
}
