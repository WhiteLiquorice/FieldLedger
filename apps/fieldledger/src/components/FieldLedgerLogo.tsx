import React from 'react';

interface FieldLedgerLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export const FieldLedgerLogo: React.FC<FieldLedgerLogoProps> = ({
  className = '',
  size = 36,
  showText = true,
}) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Tactical Industrial Shield & Flame Telemetry Gauge Mark */}
      <div
        className="relative flex items-center justify-center shrink-0"
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        {/* Glow Backdrop */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-orange-500/30 via-amber-500/20 to-transparent blur-sm" />

        {/* Shield SVG */}
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative w-full h-full drop-shadow-md"
        >
          {/* Outer Rugged Hex Shield Base */}
          <polygon
            points="24,3 44,11 44,28 24,45 4,28 4,11"
            fill="#111722"
            stroke="#253247"
            strokeWidth="2"
          />

          {/* Inner High-Contrast Border */}
          <polygon
            points="24,6 41,13 41,26 24,41 7,26 7,13"
            fill="#070a0f"
            stroke="url(#reactFlameGrad)"
            strokeWidth="1.5"
          />

          {/* Tactical Hazard Grip Hatching */}
          <path
            d="M12 16L16 12M32 12L36 16"
            stroke="#f59e0b"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.6"
          />

          {/* Centered Telemetry Flame */}
          <path
            d="M24 13C24 13 28.5 17.5 28.5 22C28.5 24.5 26.5 26.5 24 26.5C21.5 26.5 19.5 24.5 19.5 22C19.5 19.5 21.5 16.5 24 13Z"
            fill="url(#reactInnerFlame)"
          />

          {/* Inspection Check & Barcode Line */}
          <path
            d="M17 31L22 36L32 24"
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* LED Telemetry Active Beacon */}
          <circle cx="24" cy="40" r="1.5" fill="#f97316" />

          {/* Gradients */}
          <defs>
            <linearGradient
              id="reactFlameGrad"
              x1="4"
              y1="3"
              x2="44"
              y2="45"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#f97316" />
              <stop offset="0.5" stopColor="#f59e0b" />
              <stop offset="1" stopColor="#ea580c" />
            </linearGradient>
            <linearGradient
              id="reactInnerFlame"
              x1="19.5"
              y1="13"
              x2="28.5"
              y2="26.5"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#fb923c" />
              <stop offset="1" stopColor="#ea580c" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-xl font-extrabold tracking-tight text-white font-sans">
              FIELD<span className="text-orange-500">LEDGER</span>
            </span>
            <span className="rounded border border-orange-500/30 bg-orange-500/10 px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider text-orange-400">
              OS
            </span>
          </div>
          <span className="text-[10px] -mt-1 font-mono uppercase tracking-widest text-slate-400 font-semibold">
            Life Safety & Field Telemetry
          </span>
        </div>
      )}
    </div>
  );
};
