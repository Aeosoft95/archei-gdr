"use client";
import React from "react";
import { useAutoscale } from "@/hooks/useAutoscale";

/**
 * Avvolgi il contenuto che vuoi “scalare”.
 * Imposta una base virtuale (es. 1280x720).
 */
export default function AutoScaler({
  baseWidth = 1280,
  baseHeight = 720,
  children,
  className = "",
}: {
  baseWidth?: number;
  baseHeight?: number;
  children: React.ReactNode;
  className?: string;
}) {
  const { ref, scale } = useAutoscale({ width: baseWidth, height: baseHeight });

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      <div
        ref={ref}
        style={{
          width: baseWidth,
          height: baseHeight,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
}