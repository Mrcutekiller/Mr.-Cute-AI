
import React from 'react';
import { clsx } from 'clsx';

interface VisualizerProps {
  volume: number; // 0 to 1
  isActive: boolean;
}

export const Visualizer: React.FC<VisualizerProps> = ({ volume, isActive }) => {
  // 5 bars for a balanced wave look
  const bars = [0, 1, 2, 3, 4];
  
  return (
    <div className="flex items-center justify-center gap-1.5 h-12 w-full my-4">
      {bars.map((i) => {
        // Create a wave pattern: Center bars (index 2) react most, edges (0, 4) react least
        const distanceToCenter = Math.abs(2 - i);
        const sensitivity = 1 - (distanceToCenter * 0.15); // 1.0, 0.85, 0.7...
        
        const minHeight = 4;
        const maxHeight = 48;
        
        // Calculate height: Base + (Volume * Max * Sensitivity * Randomness)
        const height = isActive 
            ? Math.max(minHeight, volume * maxHeight * sensitivity * (0.8 + Math.random() * 0.4))
            : minHeight;
            
        return (
          <div
            key={i}
            className={clsx(
              "w-1.5 rounded-full transition-all duration-75 ease-out will-change-[height,background-color]",
              isActive ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" : "bg-zinc-600/30 dark:bg-zinc-700/30"
            )}
            style={{
              height: `${height}px`,
            }}
          />
        );
      })}
    </div>
  );
};
