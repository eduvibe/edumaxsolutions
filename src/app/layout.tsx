
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://edumaxsolutions.ng'), // Replace with actual domain
  title: {
    default: 'EduMax Solutions | Best CBT & School Management Software in Nigeria',
    template: '%s | EduMax Solutions'
  },
  description: 'EduMax Solutions offers the best CBT software, affordable LMS, and top-rated school portals for primary and secondary schools in Nigeria. Transform your school management today.',
  keywords: [
    'Best CBT software Nigeria',
    'Software providers in Nigeria',
    'Affordable LMS',
    'Best School Portal',
    'School Management System Nigeria',
    'E-learning platform Nigeria',
    'Computer Based Test software',
    'School Administration Software',
    'Result Management System',
    'EduMax Solutions'
  ],
  authors: [{ name: 'EduMax Solutions' }],
  creator: 'EduMax Solutions',
  publisher: 'EduMax Solutions',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: 'EduMax Solutions | Best CBT & School Portal Software in Nigeria',
    description: 'Empowering Nigerian schools with affordable LMS, robust CBT software, and comprehensive school portals.',
    url: 'https://edumaxsolutions.com',
    siteName: 'EduMax Solutions',
    images: [
      {
        url: '/og-image.png', // Ensure this image exists or use a placeholder
        width: 1200,
        height: 630,
        alt: 'EduMax Solutions Platform Preview',
      },
    ],
    locale: 'en_NG',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EduMax Solutions | Top School Software in Nigeria',
    description: 'Get the best CBT software and affordable LMS for your school in Nigeria. Contact EduMax Solutions today.',
    images: ['/og-image.png'], // Ensure this image exists
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://edumaxsolutions.com.ng',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'EduMax Solutions',
    url: 'https://edumaxsolutions.ng',
    logo: 'https://edumaxsolutions.ng/logo.png',
    description: 'Leading provider of CBT software, LMS, and School Portals in Nigeria.',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'No 1 Liberty Estate, Greenroof Bus/Stop Magboro',
      addressLocality: 'Magboro',
      addressRegion: 'Ogun State',
      addressCountry: 'NG'
    },
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'info@edumaxsolutions.com.ng',
      telephone: '+2348059403939',
      contactType: 'customer service',
      areaServed: 'NG',
      availableLanguage: 'en',
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Educational Software Services',
      itemListElement: [
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'SoftwareApplication',
            name: 'EduMax LMS',
            applicationCategory: 'EducationalApplication',
            operatingSystem: 'Web',
            description: 'Affordable Learning Management System for Nigerian schools.',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'SoftwareApplication',
            name: 'ExamVault',
            applicationCategory: 'EducationalApplication',
            operatingSystem: 'Web',
            description: 'Best Computer Based Test (CBT) software in Nigeria.',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'SoftwareApplication',
            name: 'EduMax School Portal',
            applicationCategory: 'EducationalApplication',
            operatingSystem: 'Web',
            description: 'Comprehensive School Management Portal and Result Management System.',
          },
        },
      ],
    },
  };

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <div className="animate-in fade-in duration-500 ease-out">
          {children}
        </div>
        <Toaster />
      </body>
    </html>
  );
}
