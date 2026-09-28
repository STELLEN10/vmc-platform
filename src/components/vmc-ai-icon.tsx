import type { SVGProps } from "react";

interface VmcAiIconProps extends SVGProps<SVGSVGElement> {
  size?: number;
  glow?: boolean;
}

export function VmcAiIcon({ size = 24, glow = false, className = "", ...props }: VmcAiIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${glow ? "drop-shadow-[0_0_8px_rgba(0,210,255,0.7)]" : ""} ${className}`}
      aria-label="VMC AI Icon"
      {...props}
    >
      <defs>
        {/* Core tech linear gradients */}
        <linearGradient id="vmc-grad-hex" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#081726" />
          <stop offset="50%" stopColor="#0d2b45" />
          <stop offset="100%" stopColor="#05101a" />
        </linearGradient>

        <linearGradient id="vmc-grad-stroke" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00d2ff" />
          <stop offset="50%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#e11d48" />
        </linearGradient>

        <linearGradient id="vmc-grad-spark" x1="18" y1="12" x2="30" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#00d2ff" />
        </linearGradient>

        <radialGradient id="vmc-spark-core" cx="24" cy="24" r="8" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Hexagonal Outer Frame */}
      <polygon
        points="24,3 43,13.5 43,34.5 24,45 5,34.5 5,13.5"
        fill="url(#vmc-grad-hex)"
        stroke="url(#vmc-grad-stroke)"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />

      {/* Inner Hex Rim */}
      <polygon
        points="24,6.5 39.5,15.5 39.5,32.5 24,41.5 8.5,32.5 8.5,15.5"
        fill="none"
        stroke="#00d2ff"
        strokeOpacity="0.25"
        strokeWidth="1"
      />

      {/* Motorcycle Speed/Wing Flares (Left & Right) */}
      {/* Left Wing Line */}
      <path
        d="M10 20 L18 24 L10 28"
        stroke="#38bdf8"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />
      {/* Right Wing Line */}
      <path
        d="M38 20 L30 24 L38 28"
        stroke="#e11d48"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />

      {/* Central AI Neural Glow Core */}
      <circle cx="24" cy="24" r="7" fill="url(#vmc-spark-core)" opacity="0.6" />

      {/* Central 4-point AI Star / Diamond Spark */}
      <path
        d="M24 13 L26.8 21.2 L35 24 L26.8 26.8 L24 35 L21.2 26.8 L13 24 L21.2 21.2 Z"
        fill="url(#vmc-grad-spark)"
      />

      {/* Center Bright AI Core Dot */}
      <circle cx="24" cy="24" r="2.2" fill="#ffffff" />

      {/* Satellite Connectivity Nodes */}
      <circle cx="24" cy="10" r="1.3" fill="#38bdf8" />
      <circle cx="24" cy="38" r="1.3" fill="#e11d48" />
      <circle cx="14" cy="15" r="1.1" fill="#38bdf8" opacity="0.7" />
      <circle cx="34" cy="15" r="1.1" fill="#e11d48" opacity="0.7" />
    </svg>
  );
}
