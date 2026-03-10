interface SectionDividerProps {
  className?: string;
  fillTop?: string;
  fillBottom?: string;
}

export default function SectionDivider({
  className,
  fillTop = "#f5f5f5",
  fillBottom = "#1b2528",
}: SectionDividerProps) {
  return (
    <div
      className={`relative w-full overflow-hidden leading-[0] ${className ?? ""}`}
      style={{ height: "70px" }}
    >
      {/* Shadow layer */}
      <div
        className="absolute inset-x-0 bottom-0 h-8 pointer-events-none"
        style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.18), rgba(0,0,0,0.06) 50%, transparent)",
        }}
      />
      <svg
        viewBox="0 0 1440 70"
        preserveAspectRatio="none"
        className="relative block h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="wave-fill" x1="0" x2="0" y1="1" y2="0">
            <stop offset="0%" stopColor="#3D5258" />
            <stop offset="35%" stopColor="#2E4248" />
            <stop offset="100%" stopColor={fillBottom} />
          </linearGradient>
          <linearGradient id="wave-highlight" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="white" stopOpacity="0" />
            <stop offset="25%" stopColor="white" stopOpacity="0.06" />
            <stop offset="50%" stopColor="white" stopOpacity="0.08" />
            <stop offset="75%" stopColor="white" stopOpacity="0.04" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="gold-stroke" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.08" />
            <stop offset="30%" stopColor="#D4AF37" stopOpacity="0.5" />
            <stop offset="55%" stopColor="#D4AF37" stopOpacity="0.9" />
            <stop offset="80%" stopColor="#D4AF37" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        {/* Background */}
        <rect width="1440" height="70" fill={fillTop} />
        {/* Main wave with gradient */}
        <path
          d="M0,35 C240,55 480,65 720,50 C960,35 1200,25 1440,40 L1440,70 L0,70 Z"
          fill="url(#wave-fill)"
        />
        {/* Highlight layer */}
        <path
          d="M0,35 C240,55 480,65 720,50 C960,35 1200,25 1440,40 L1440,70 L0,70 Z"
          fill="url(#wave-highlight)"
        />
        {/* Fold/secondary wave */}
        <path
          d="M0,50 C360,60 720,55 1080,45 C1260,40 1380,42 1440,45 L1440,70 L0,70 Z"
          fill={fillBottom}
          opacity="0.6"
        />
        {/* Gold accent stroke */}
        <path
          d="M0,48 C300,58 600,62 900,52 C1100,44 1300,38 1440,42"
          fill="none"
          stroke="url(#gold-stroke)"
          strokeWidth="1.5"
        />
        {/* Subtle white edge highlight */}
        <path
          d="M0,35 C240,55 480,65 720,50 C960,35 1200,25 1440,40"
          fill="none"
          stroke="white"
          strokeOpacity="0.15"
          strokeWidth="0.75"
        />
      </svg>
    </div>
  );
}
