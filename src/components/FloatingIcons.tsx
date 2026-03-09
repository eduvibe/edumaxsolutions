"use client";

import { motion } from "framer-motion";
import { 
  BookOpen, 
  GraduationCap, 
  Laptop, 
  Brain, 
  School, 
  Calculator, 
  Lightbulb, 
  Pencil 
} from "lucide-react";
import { cn } from "@/lib/utils";

const icons = [
  { Icon: GraduationCap, color: "text-primary", delay: 0, x: "5%", y: "10%" },
  { Icon: BookOpen, color: "text-accent", delay: 2, x: "85%", y: "15%" },
  { Icon: Laptop, color: "text-blue-500", delay: 4, x: "5%", y: "75%" },
  { Icon: Brain, color: "text-green-500", delay: 1, x: "80%", y: "70%" },
  { Icon: School, color: "text-purple-500", delay: 3, x: "15%", y: "85%" },
  { Icon: Calculator, color: "text-orange-500", delay: 5, x: "90%", y: "40%" },
  { Icon: Lightbulb, color: "text-yellow-500", delay: 1.5, x: "50%", y: "5%" },
  { Icon: Pencil, color: "text-pink-500", delay: 3.5, x: "40%", y: "90%" },
];

export function FloatingIcons({ className }: { className?: string }) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none z-0", className)}>
      {icons.map((item, index) => (
        <motion.div
          key={index}
          className={`absolute p-3 bg-background/50 backdrop-blur-sm rounded-full shadow-sm border border-border/50 ${item.color}`}
          style={{ left: item.x, top: item.y }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ 
            opacity: 0.6, 
            y: [0, -15, 0],
            rotate: [0, 5, -5, 0]
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            repeatType: "reverse",
            delay: item.delay,
            ease: "easeInOut"
          }}
        >
          <item.Icon className="w-5 h-5 opacity-80" />
        </motion.div>
      ))}
    </div>
  );
}
