'use client';

interface Props {
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
}

export default function ThemePreview({ primaryColor, secondaryColor, logoUrl }: Props) {
  return (
    <div className="space-y-6">
      {/* Logo Preview */}
      {logoUrl && (
        <div className="flex items-center gap-3">
          <img
            src={logoUrl}
            alt="League logo"
            className="w-12 h-12 rounded-lg object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <span className="text-sm text-gray-400">League Logo</span>
        </div>
      )}

      {/* Live Score Header mockup */}
      <div
        className="rounded-xl p-5"
        style={{ backgroundColor: secondaryColor, borderLeft: `4px solid ${primaryColor}` }}
      >
        <p className="text-xs font-bold tracking-widest mb-1" style={{ color: primaryColor }}>
          INDIA
        </p>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-5xl font-extrabold text-white">142</span>
          <span className="text-3xl text-gray-400">/3</span>
          <span className="text-lg text-gray-400 ml-1">(18.4 ov)</span>
        </div>
        <div className="flex gap-8">
          <div>
            <p className="text-[10px] font-semibold text-gray-400 tracking-wider">RUN RATE</p>
            <p className="text-sm font-bold" style={{ color: primaryColor }}>7.68</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-400 tracking-wider">NEED</p>
            <p className="text-sm font-bold" style={{ color: primaryColor }}>23 in 8 balls</p>
          </div>
        </div>
      </div>

      {/* Score Buttons mockup */}
      <div>
        <p className="text-[10px] font-bold text-gray-500 tracking-widest mb-3">SCORE BUTTONS</p>
        <div className="flex gap-2 flex-wrap">
          {[0, 1, 2, 3, 4, 5, 6].map((v) => {
            const isBoundary = v === 4 || v === 6;
            return (
              <div
                key={v}
                className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold border-2 transition-colors"
                style={{
                  backgroundColor: isBoundary ? primaryColor : secondaryColor,
                  borderColor: isBoundary ? primaryColor : '#334155',
                  color: isBoundary ? secondaryColor : '#fff',
                }}
              >
                {v}
              </div>
            );
          })}
        </div>
      </div>

      {/* Extra Buttons mockup */}
      <div>
        <p className="text-[10px] font-bold text-gray-500 tracking-widest mb-3">EXTRAS</p>
        <div className="flex gap-2">
          {['WD', 'NB', 'B', 'LB'].map((type) => (
            <div
              key={type}
              className="w-16 h-16 rounded-lg flex flex-col items-center justify-center border"
              style={{ backgroundColor: '#334155', borderColor: '#475569' }}
            >
              <span className="text-base font-bold" style={{ color: primaryColor }}>{type}</span>
              <span className="text-[9px] text-gray-400">
                {type === 'WD' ? 'Wide' : type === 'NB' ? 'No Ball' : type === 'B' ? 'Bye' : 'Leg Bye'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Wicket Button mockup */}
      <div>
        <p className="text-[10px] font-bold text-gray-500 tracking-widest mb-3">WICKET</p>
        <div
          className="w-full py-5 rounded-xl flex items-center justify-center gap-2 border-2"
          style={{ backgroundColor: '#EF4444', borderColor: '#DC2626' }}
        >
          <span className="text-2xl">⚡</span>
          <span className="text-xl font-extrabold text-white tracking-wide">WICKET</span>
        </div>
      </div>

      {/* Over Progress mockup */}
      <div>
        <p className="text-[10px] font-bold text-gray-500 tracking-widest mb-3">OVER PROGRESS</p>
        <div className="flex gap-2">
          {[null, 4, 'W', null, null, null].map((outcome, i) => {
            const filled = i < 3;
            let bg = '#334155';
            if (filled) {
              if (outcome === 'W') bg = '#EF4444';
              else if (outcome === 4) bg = primaryColor;
              else bg = '#fff';
            }
            return (
              <div
                key={i}
                className="w-3 h-3 rounded-full border"
                style={{
                  backgroundColor: bg,
                  borderColor: filled ? 'transparent' : '#334155',
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Header / Branding mockup */}
      <div>
        <p className="text-[10px] font-bold text-gray-500 tracking-widest mb-3">HEADER</p>
        <div className="flex items-center gap-3 border-b border-[#334155] pb-3">
          <div
            className="w-3 h-3 rounded-full animate-pulse"
            style={{ backgroundColor: primaryColor }}
          />
          <h1 className="text-xl font-bold text-white tracking-tight">
            cric<span style={{ color: primaryColor }}>head</span>
          </h1>
        </div>
      </div>
    </div>
  );
}
