"use client";

import React from 'react';

export type Level = 1 | 2 | 3;

interface PriorityMatrixProps {
  urgency: Level;
  impact: Level;
  onChange: (urgency: Level, impact: Level) => void;
}

export default function PriorityMatrix({ urgency, impact, onChange }: PriorityMatrixProps) {
  
  // Calculate priority for display purposes (backend also calculates this)
  const getPriority = (u: Level, i: Level) => {
    const score = u + i;
    if (score === 6) return 'P1';
    if (score >= 5) return 'P2';
    if (score >= 4) return 'P3';
    return 'P4';
  };

  const currentPriority = getPriority(urgency, impact);

  const getCellColor = (u: Level, i: Level, isSelected: boolean) => {
    const priority = getPriority(u, i);
    
    if (!isSelected) {
      if (priority === 'P1') return 'bg-red-50 hover:bg-red-100 border-gray-300';
      if (priority === 'P2') return 'bg-orange-50 hover:bg-orange-100 border-gray-300';
      if (priority === 'P3') return 'bg-yellow-50 hover:bg-yellow-100 border-gray-300';
      return 'bg-green-50 hover:bg-green-100 border-gray-300';
    }

    // Selected state
    if (priority === 'P1') return 'bg-red-500 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold text-white scale-105 z-10';
    if (priority === 'P2') return 'bg-orange-500 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold text-white scale-105 z-10';
    if (priority === 'P3') return 'bg-yellow-400 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold text-black scale-105 z-10';
    return 'bg-green-400 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold text-black scale-105 z-10';
  };

  const getPriorityBadgeColor = () => {
    if (currentPriority === 'P1') return 'bg-red-600 text-white animate-pulse';
    if (currentPriority === 'P2') return 'bg-orange-500 text-white';
    if (currentPriority === 'P3') return 'bg-yellow-400 text-black';
    return 'bg-green-400 text-black';
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg">Select Priority Matrix</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono uppercase">Calculated Priority:</span>
          <span className={`px-3 py-1 font-bold border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${getPriorityBadgeColor()}`}>
            {currentPriority}
          </span>
        </div>
      </div>

      <div className="relative border-2 border-black p-4 md:p-8 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        {/* Y-Axis Label (Impact) */}
        <div className="absolute left-[-15px] top-1/2 -translate-y-1/2 -rotate-90 origin-center font-bold tracking-widest text-sm uppercase">
          Impact
        </div>
        
        {/* X-Axis Label (Urgency) */}
        <div className="absolute bottom-[-15px] left-1/2 -translate-x-1/2 font-bold tracking-widest text-sm uppercase bg-[#fbfaf2] px-2 border border-black z-10">
          Urgency
        </div>

        <div className="grid grid-cols-[auto_1fr] gap-4">
          
          {/* Y-Axis Scale */}
          <div className="flex flex-col justify-around text-xs font-mono font-bold text-gray-500 h-[240px]">
            <span>HIGH (3)</span>
            <span>MED (2)</span>
            <span>LOW (1)</span>
          </div>

          <div className="flex flex-col">
            {/* The Grid */}
            <div className="grid grid-rows-3 grid-cols-3 gap-2 h-[240px]">
              {([3, 2, 1] as Level[]).map((i) => (
                ([1, 2, 3] as Level[]).map((u) => {
                  const isSelected = urgency === u && impact === i;
                  return (
                    <button
                      key={`${u}-${i}`}
                      type="button"
                      onClick={() => onChange(u, i)}
                      className={`
                        border-2 transition-all duration-200 flex flex-col items-center justify-center p-2
                        ${getCellColor(u, i, isSelected)}
                      `}
                    >
                      <span className="text-sm md:text-base">{getPriority(u, i)}</span>
                      {isSelected && <span className="text-[10px] uppercase font-mono mt-1 opacity-80 border-t border-current pt-1">Selected</span>}
                    </button>
                  );
                })
              ))}
            </div>
            
            {/* X-Axis Scale */}
            <div className="grid grid-cols-3 gap-2 mt-2 text-center text-xs font-mono font-bold text-gray-500">
              <span>LOW (1)</span>
              <span>MED (2)</span>
              <span>HIGH (3)</span>
            </div>
          </div>
        </div>
      </div>
      
      <p className="text-xs text-gray-500 mt-6 font-mono">
        * Priority is calculated automatically. High Impact (System down) + High Urgency (Affects all users) = P1 Critical.
      </p>
    </div>
  );
}
