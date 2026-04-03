"use client";

import React from "react";

/**
 * PremiumLoader Component
 * Inspired by institutional-grade financial portals.
 * Uses a circular SVG animation that is smooth and high-end.
 */
const PremiumLoader: React.FC<{ size?: "sm" | "md" | "lg"; color?: string; className?: string }> = ({ 
  size = "md", 
  color = "#9A7D2E", // GV Gold
  className = "" 
}) => {
  const sizeMap = {
    sm: "h-8 w-8",
    md: "h-16 w-16",
    lg: "h-24 w-24",
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={`relative ${sizeMap[size]}`}>
        <svg 
            className="animate-premium-rotate w-full h-full" 
            viewBox="0 0 50 50"
        >
          <circle 
            className="opacity-10" 
            cx="25" 
            cy="25" 
            r="20" 
            fill="none" 
            stroke={color} 
            strokeWidth="3" 
          />
          <circle 
            className="animate-premium-dash" 
            cx="25" 
            cy="25" 
            r="20" 
            fill="none" 
            stroke={color} 
            strokeWidth="3" 
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
};

export default PremiumLoader;
