import React from 'react';
import { EventSchema, formatBallDisplay } from '@crichead/core';

type BallEvent = EventSchema.BallEvent;

export interface OverProgressProps {
  balls: BallEvent[];
  className?: string;
}

function getBallColor(ball: BallEvent): string {
  if (ball.wicket) return 'bg-red-500 text-white';
  if (ball.runs.bat === 4 && ball.runs.extra === 0) return 'bg-[#00FF41] text-[#0F172A]';
  if (ball.runs.bat === 6 && ball.runs.extra === 0) return 'bg-yellow-400 text-[#0F172A]';
  if (ball.runs.extra > 0) return 'bg-amber-600 text-white';
  if (ball.runs.bat === 0 && ball.runs.extra === 0 && ball.runs.penalty === 0) return 'bg-[#334155] text-gray-400';
  return 'bg-[#334155] text-white';
}

export function OverProgress({ balls, className = '' }: OverProgressProps) {
  return (
    <div className={`flex gap-1.5 flex-wrap ${className}`}>
      {balls.map((ball, i) => (
        <div
          key={i}
          className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold ${getBallColor(ball)}`}
        >
          {formatBallDisplay(ball)}
        </div>
      ))}
      {balls.length === 0 && (
        <p className="text-sm text-gray-500 italic">New over</p>
      )}
    </div>
  );
}
