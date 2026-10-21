"use client";

import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

type AnimatedButtonProps = HTMLMotionProps<"button"> & {
  children?: React.ReactNode;
};

const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  children = "Browse Components",
  className = "",
  ...rest
}) => {
  return (
    <motion.button
      {...rest}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 25,
      }}
      className={cn(
        "group relative inline-flex items-center justify-center px-6 py-3 rounded-xl overflow-hidden bg-slate-950 border border-indigo-500/40 text-white font-medium shadow-lg shadow-indigo-500/20 transition-all duration-300 hover:border-indigo-400 hover:shadow-indigo-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
        className
      )}
    >
      {/* Outer Glow Background */}
      <span className="absolute -inset-px rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 opacity-40 blur-sm transition-opacity duration-300 group-hover:opacity-100" />

      {/* Inner Button Container */}
      <span className="absolute inset-[1px] rounded-[11px] bg-slate-900/90 transition-colors group-hover:bg-slate-900/80" />

      {/* Button Text */}
      <span className="tracking-wide font-medium flex items-center justify-center h-full w-full relative z-10 text-white">
        {children}
      </span>

      {/* Shimmer Effect */}
      <motion.span
        className="block absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
        animate={{ translateX: ["-100%", "200%"] }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "linear",
          repeatDelay: 1,
        }}
      />
    </motion.button>
  );
};

export default AnimatedButton;
