import React from 'react';

interface AppLogoProps {
  className?: string;
  size?: number;
}

export const AppLogo: React.FC<AppLogoProps> = ({ className = 'w-11 h-11', size = 44 }) => {
  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-[0_4px_12px_rgba(6,182,212,0.35)]"
      >
        <defs>
          {/* Main Background Gradient */}
          <linearGradient id="bgGrad" x1="2" y1="2" x2="46" y2="46" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#083344" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>

          {/* TV Outer Border Gradient */}
          <linearGradient id="tvGrad" x1="10" y1="4" x2="38" y2="24" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>

          {/* Notebook Gradient */}
          <linearGradient id="notebookGrad" x1="12" y1="22" x2="36" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* Screen Glow */}
          <linearGradient id="screenGrad" x1="15" y1="8" x2="33" y2="20" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
        </defs>

        {/* Outer Rounded Container */}
        <rect
          x="1.5"
          y="1.5"
          width="45"
          height="45"
          rx="12"
          fill="url(#bgGrad)"
          stroke="#38bdf8"
          strokeWidth="1.2"
          strokeOpacity="0.4"
        />

        {/* ---------------------------------------------------- */}
        {/* LOWER PART: Notebook & Checklist (Cuaderno y Lista)  */}
        {/* ---------------------------------------------------- */}
        {/* Notebook Body */}
        <rect
          x="11"
          y="23"
          width="26"
          height="19"
          rx="3"
          fill="url(#notebookGrad)"
          stroke="#475569"
          strokeWidth="1.2"
        />

        {/* Notebook Spiral Rings on left */}
        <rect x="9.5" y="26" width="3" height="1.5" rx="0.75" fill="#94a3b8" />
        <rect x="9.5" y="30" width="3" height="1.5" rx="0.75" fill="#94a3b8" />
        <rect x="9.5" y="34" width="3" height="1.5" rx="0.75" fill="#94a3b8" />
        <rect x="9.5" y="38" width="3" height="1.5" rx="0.75" fill="#94a3b8" />

        {/* Checklist Item 1: Checkmark + Line */}
        <path
          d="M15 28.5L16.8 30.5L20.5 26.5"
          stroke="#34d399"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line x1="23" y1="28.5" x2="33" y2="28.5" stroke="#94a3b8" strokeWidth="1.4" strokeLinecap="round" />

        {/* Checklist Item 2: Checkmark + Line */}
        <path
          d="M15 34L16.8 36L20.5 32"
          stroke="#38bdf8"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line x1="23" y1="34" x2="31" y2="34" stroke="#64748b" strokeWidth="1.4" strokeLinecap="round" />

        {/* Checklist Item 3: Line */}
        <circle cx="16.5" cy="39" r="1.2" fill="#38bdf8" />
        <line x1="20" y1="39" x2="28" y2="39" stroke="#475569" strokeWidth="1.2" strokeLinecap="round" />

        {/* ---------------------------------------------------- */}
        {/* UPPER PART: Television (Tele arriba del cuaderno)    */}
        {/* ---------------------------------------------------- */}
        {/* TV Antennas */}
        <path
          d="M18 5L24 10L30 5"
          stroke="#38bdf8"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* TV Outer Frame */}
        <rect
          x="12"
          y="9"
          width="24"
          height="14"
          rx="3"
          fill="#091322"
          stroke="url(#tvGrad)"
          strokeWidth="1.5"
        />

        {/* TV Glowing Display Screen */}
        <rect
          x="14"
          y="11"
          width="17"
          height="10"
          rx="1.5"
          fill="url(#screenGrad)"
          fillOpacity="0.85"
        />

        {/* TV Power Knob / Dials on the right */}
        <circle cx="33" cy="13.5" r="1" fill="#38bdf8" />
        <circle cx="33" cy="17.5" r="1" fill="#60a5fa" />

        {/* TV Play Triangle Icon inside glowing screen */}
        <path
          d="M20.5 13.5L24.5 16L20.5 18.5V13.5Z"
          fill="#ffffff"
        />
      </svg>
    </div>
  );
};
