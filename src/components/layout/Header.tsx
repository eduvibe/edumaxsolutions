
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { NAV_LINKS } from "@/constants";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";
import { RequestDemoModal } from "@/components/RequestDemoModal";
import React from "react";
import { getPlatformPublicEnv } from "@/lib/platform/env";

export function Header() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [currentHash, setCurrentHash] = React.useState(""); // Store hash with '#'
  const env = getPlatformPublicEnv();
  const resourcesComingSoon = env.resourcesComingSoon;

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    const handleHashChange = () => {
      setCurrentHash(window.location.hash); // e.g., "#solutions"
    };

    handleScroll(); 
    handleHashChange(); 

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("hashchange", handleHashChange, false);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("hashchange", handleHashChange, false);
    };
  }, []);

  const getLinkActiveClass = (linkHref: string) => {
    const isHomePage = pathname === "/";

    // Case 1: Check if the link is for the currently active hash section on the homepage
    const linkIsForCurrentActiveHash =
      isHomePage &&
      linkHref.includes("#") &&
      currentHash && currentHash !== "#" && // Ensure currentHash is a specific section like #solutions, not just #
      linkHref.endsWith(currentHash);

    if (linkIsForCurrentActiveHash) {
      return "text-primary";
    }

    // Case 2: Handle non-hash links (like "/contact") or the "Home" link ("/")
    if (!linkHref.includes("#")) {
      if (pathname === linkHref) { // Exact match for path, e.g., /contact or /
        // If this is the "Home" link (href="/") on the homepage,
        // it should only be active if no other hash-based nav link is currently active.
        if (linkHref === "/" && isHomePage && currentHash && currentHash !== "#") {
          const aHashLinkIsActive = NAV_LINKS.some(nav => 
            nav.href.startsWith("/#") && nav.href.endsWith(currentHash)
          );
          if (aHashLinkIsActive) {
            return "text-foreground/80"; // Another hash link is active, so "Home" is not.
          }
        }
        return "text-primary"; // Active for "/contact", or for "/" if no other hash link is active.
      }

      // Handle parent path highlighting (e.g., "/settings" for "/settings/profile")
      // Ensure linkHref is not just "/" to avoid matching every path.
      if (linkHref !== "/" && pathname.startsWith(linkHref + '/')) {
        return "text-primary";
      }
    }
    
    // Default: link is not active
    return "text-foreground/80";
  };


  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b border-transparent transition-all duration-300",
        isScrolled ? "bg-background/80 backdrop-blur-md border-border" : "bg-background/0"
      )}
    >
      <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
        <Logo href="/" />
        <nav className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            link.label === "Resources" && resourcesComingSoon ? (
              <span
                key={link.label}
                className="inline-flex items-center gap-2 text-sm font-medium text-foreground/60 cursor-not-allowed"
              >
                {link.label}
                <span className="rounded-full border border-black/10 bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-black/70 backdrop-blur-md dark:border-white/10 dark:text-white/70">
                  Soon
                </span>
              </span>
            ) : (
              <Link
                key={link.label}
                href={link.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  getLinkActiveClass(link.href)
                )}
              >
                {link.label}
              </Link>
            )
          ))}
          {resourcesComingSoon && process.env.NODE_ENV !== "production" ? (
            <Link href="/learn?preview=1" className="text-sm font-semibold text-primary hover:underline underline-offset-4">
              Preview
            </Link>
          ) : null}
          <RequestDemoModal>
            <Button size="sm" className="shadow-md hover:shadow-lg transition-all bg-primary hover:bg-accent text-primary-foreground">
              Request a Demo
            </Button>
          </RequestDemoModal>
        </nav>

        {/* Mobile Menu */}
        <div className="flex items-center gap-2 md:hidden">
          <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="md:hidden">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <div className="flex flex-col gap-6 p-6">
              <Logo href="/" />
              <nav className="flex flex-col gap-4">
                {NAV_LINKS.map((link) => (
                  link.label === "Resources" && resourcesComingSoon ? (
                    <span
                      key={link.label}
                      className="inline-flex items-center justify-between gap-3 text-lg font-medium text-foreground/60 cursor-not-allowed"
                    >
                      <span>{link.label}</span>
                      <span className="rounded-full border border-black/10 bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-black/70 backdrop-blur-md dark:border-white/10 dark:text-white/70">
                        Soon
                      </span>
                    </span>
                  ) : (
                    <Link
                      key={link.label}
                      href={link.href}
                      className={cn(
                        "text-lg font-medium transition-colors hover:text-primary",
                        getLinkActiveClass(link.href)
                      )}
                    >
                      {link.label}
                    </Link>
                  )
                ))}
              </nav>
              {resourcesComingSoon && process.env.NODE_ENV !== "production" ? (
                <Link href="/learn?preview=1" className="text-sm font-semibold text-primary hover:underline underline-offset-4">
                  Preview resources
                </Link>
              ) : null}
              <RequestDemoModal className="w-full">
                <Button size="lg" className="w-full mt-4 bg-primary hover:bg-accent text-primary-foreground">
                  Request a Demo
                </Button>
              </RequestDemoModal>
            </div>
          </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
