import React from 'react';

interface LogoProps {
  className?: string;
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg' | 'navbar' | 'xl';
  showText?: boolean;
  showBadge?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  variant = 'light',
  size = 'navbar',
  showText = true,
  showBadge = true,
}) => {
  // Dimensions calibrated for prominent, bold, clear presence
  const sizeConfig = {
    sm: {
      icon: 'w-9 h-9',
      svgSize: 36,
      title: 'text-xl',
      badge: 'text-[9px]',
      gap: 'gap-2.5',
    },
    md: {
      icon: 'w-11 h-11',
      svgSize: 44,
      title: 'text-2xl',
      badge: 'text-[10px]',
      gap: 'gap-3',
    },
    navbar: {
      icon: 'w-11 sm:w-12 md:w-13 h-11 sm:h-12 md:h-13',
      svgSize: 52,
      title: 'text-2xl sm:text-[26px] md:text-[28px]',
      badge: 'text-[9.5px] sm:text-[10.5px] md:text-[11px]',
      gap: 'gap-3 sm:gap-3.5',
    },
    lg: {
      icon: 'w-14 sm:w-16 h-14 sm:h-16',
      svgSize: 64,
      title: 'text-3xl sm:text-4xl',
      badge: 'text-xs',
      gap: 'gap-4',
    },
    xl: {
      icon: 'w-18 sm:w-20 h-18 sm:h-20',
      svgSize: 80,
      title: 'text-4xl sm:text-5xl',
      badge: 'text-sm',
      gap: 'gap-4.5',
    },
  };

  const current = sizeConfig[size] || sizeConfig.navbar;
  const isDark = variant === 'dark';

  return (
    <div
      id="brand-logo-container"
      className={`relative inline-flex items-center select-none leading-none group/logo cursor-pointer ${current.gap} ${className}`}
      aria-label="PDF Toolbox Logo"
    >
      {/* Ambient Backlight Glow on Hover */}
      <div
        className="absolute -inset-2 rounded-2xl bg-radial from-red-500/20 via-orange-500/10 to-transparent opacity-0 group-hover/logo:opacity-100 blur-lg transition-all duration-300 pointer-events-none scale-95 group-hover/logo:scale-105"
        aria-hidden="true"
      />

      {/* Primary Vector Icon Badge (100% uptime, zero network dependency, razor-sharp on all DPIs) */}
      <div className={`relative shrink-0 flex items-center justify-center ${current.icon}`}>
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-md transition-transform duration-300 ease-out group-hover/logo:scale-105"
        >
          <defs>
            {/* Deep Crimson Badge Gradient */}
            <linearGradient id="logoRedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#EF4444" />
              <stop offset="50%" stopColor="#DC2626" />
              <stop offset="100%" stopColor="#991B1B" />
            </linearGradient>

            {/* Document Surface Gradient */}
            <linearGradient id="logoSheetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#F1F5F9" />
            </linearGradient>

            {/* Inner Sheen */}
            <linearGradient id="logoSheen" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Badge Base Plate */}
          <rect x="3" y="3" width="58" height="58" rx="16" fill="url(#logoRedGrad)" />
          {/* Glass Highlight Stroke */}
          <rect x="3.75" y="3.75" width="56.5" height="56.5" rx="15.25" stroke="url(#logoSheen)" strokeWidth="1.5" />
          <rect x="4" y="4" width="56" height="56" rx="15" stroke="rgba(0,0,0,0.15)" strokeWidth="1" />

          {/* Folded Paper Document */}
          <path
            d="M19 14.5C19 13.1193 20.1193 12 21.5 12H35.5L45 21.5V49.5C45 50.8807 43.8807 52 42.5 52H21.5C20.1193 52 19 50.8807 19 49.5V14.5Z"
            fill="url(#logoSheetGrad)"
            filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.25))"
          />
          {/* Fold Corner */}
          <path d="M35.5 12V21.5H45L35.5 12Z" fill="#CBD5E1" />
          <path d="M35.5 21.5H45" stroke="#94A3B8" strokeWidth="0.75" />

          {/* Red Header Banner */}
          <rect x="23.5" y="24.5" width="17" height="4.5" rx="2.25" fill="#DC2626" />
          {/* Document Content Lines */}
          <rect x="23.5" y="32" width="17" height="3" rx="1.5" fill="#1E293B" />
          <rect x="23.5" y="38" width="11" height="3" rx="1.5" fill="#475569" />

          {/* Golden Sparkle / Pro Tool Star Badge */}
          <circle cx="47" cy="47" r="7.5" fill="#F59E0B" stroke="#FFFFFF" strokeWidth="2" />
          <path
            d="M47 43V51M43 47H51"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Brand Typography: Bolder, Darker, Ultra-Crisp & Sharp */}
      {showText && (
        <div className="flex flex-col justify-center select-none">
          <div className="flex items-center gap-1.5 leading-none tracking-tight font-black">
            {/* PDF in ultra-dark high-contrast */}
            <span
              className={`font-black tracking-tight drop-shadow-2xs ${current.title} ${
                isDark ? 'text-white' : 'text-[#020617]'
              }`}
              style={{
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontWeight: 950,
                letterSpacing: '-0.03em',
              }}
            >
              PDF
            </span>

            {/* TOOLBOX in saturated crimson */}
            <span
              className={`font-black tracking-tight drop-shadow-2xs ${current.title} ${
                isDark ? 'text-red-500' : 'text-[#DC2626]'
              }`}
              style={{
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontWeight: 950,
                letterSpacing: '-0.02em',
              }}
            >
              TOOLBOX
            </span>
          </div>

          {/* Subtitle / Pro Utilities Tagline */}
          {showBadge && (
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className={`font-mono font-black uppercase tracking-widest ${current.badge} ${
                  isDark ? 'text-slate-300' : 'text-[#0F172A]'
                }`}
                style={{
                  letterSpacing: '0.12em',
                  fontWeight: 900,
                }}
              >
                26 PRO UTILITIES
              </span>
              <span
                className={`inline-block w-1 h-1 rounded-full ${
                  isDark ? 'bg-red-400' : 'bg-red-600'
                }`}
              />
              <span
                className={`font-mono font-bold uppercase tracking-wider text-[8.5px] sm:text-[9.5px] hidden sm:inline-block ${
                  isDark ? 'text-slate-400' : 'text-slate-600'
                }`}
                style={{ letterSpacing: '0.08em' }}
              >
                PRIVATE & SECURE
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};





