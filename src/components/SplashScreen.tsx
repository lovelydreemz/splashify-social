import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const SplashScreen = () => {
  const navigate = useNavigate();
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(() => navigate("/landing"), 300);
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-primary via-secondary to-accent bg-200 animate-gradient-shift">
      <div className="text-center space-y-6 animate-scale-in">
        {/* Logo Circle */}
        <div className="relative mx-auto w-32 h-32 mb-8">
          <div className="absolute inset-0 rounded-full bg-white/20 backdrop-blur-sm animate-logo-pulse" 
               style={{ boxShadow: "var(--shadow-glow)" }} />
          <div className="absolute inset-2 rounded-full bg-white flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-16 h-16"
            >
              <path
                d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                fill="url(#gradient)"
              />
              <defs>
                <linearGradient id="gradient" x1="2" y1="2" x2="22" y2="21">
                  <stop offset="0%" stopColor="hsl(14 100% 57%)" />
                  <stop offset="50%" stopColor="hsl(340 82% 67%)" />
                  <stop offset="100%" stopColor="hsl(25 95% 53%)" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* App Name */}
        <h1 className="text-5xl font-bold text-white tracking-tight animate-fade-in">
          Connect
        </h1>
        <p className="text-white/90 text-lg animate-fade-in-up">
          Share moments, make memories
        </p>
      </div>

      {/* Loading dots */}
      <div className="absolute bottom-20 flex gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-white/80"
            style={{
              animation: `fade-in 0.6s ease-in-out infinite`,
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default SplashScreen;
