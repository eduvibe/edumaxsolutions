"use client";

import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { useRef, ReactNode } from "react";

interface ParallaxWrapperProps {
  children: ReactNode;
  /**
   * Distance in pixels the element will move relative to its natural position.
   * Positive values make the element move down as you scroll down (slower/background feel).
   * Negative values make the element move up as you scroll down (faster/foreground feel).
   */
  offset?: number;
  className?: string;
  /**
   * Use spring physics for smoother movement (default: true)
   */
  smooth?: boolean;
}

export function ParallaxWrapper({ 
  children, 
  offset = 50, 
  className = "",
  smooth = true
}: ParallaxWrapperProps) {
  const ref = useRef(null);
  
  // Track scroll progress of this specific element relative to the viewport
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // Map scroll progress (0 to 1) to vertical movement (-offset to +offset)
  const targetY = useTransform(scrollYProgress, [0, 1], [-offset, offset]);
  
  // Optionally apply spring physics for smoother animation
  const springY = useSpring(targetY, { stiffness: 100, damping: 30, restDelta: 0.001 });
  const y = smooth ? springY : targetY;

  return (
    <motion.div 
      ref={ref} 
      style={{ y }} 
      className={className}
    >
      {children}
    </motion.div>
  );
}
