"use client";

import React, { useState } from "react";

interface HelpTooltipProps {
  text: string;
}

export function HelpTooltip({ text }: HelpTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-flex items-center ml-1.5 group select-none">
      <button
        type="button"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        className="text-gray-400 hover:text-brand-600 transition-colors focus:outline-none"
        aria-label="Ayuda"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4 cursor-help"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>

      {isVisible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-slate-900/95 backdrop-blur-sm text-white text-[11px] rounded-xl p-3 shadow-xl border border-slate-800 z-50 pointer-events-none leading-relaxed font-medium">
          <div className="relative">
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45 mt-1 border-r border-b border-slate-800"></div>
          </div>
        </div>
      )}
    </div>
  );
}
