export const Header = () => {
  return (
    <header className="w-full mt-8 mb-16 px-10">
      <h1 
        className="text-[48px] md:text-4xl sm:text-[28px] font-bold text-center tracking-[2px] animate-title-font"
        style={{
          background: 'linear-gradient(90deg, #3B82F6 0%, #8B5CF6 16%, #EC4899 32%, #F59E0B 48%, #10B981 64%, #06B6D4 80%, #3B82F6 100%)',
          backgroundSize: '200% 100%',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          animation: 'gradient-shift 4s linear infinite',
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.1), 0 4px 8px rgba(59, 130, 246, 0.2), 0 8px 16px rgba(139, 92, 246, 0.15)',
          lineHeight: 1.2,
        }}
      >
        KXF CREATIVE
      </h1>
    </header>
  );
};
