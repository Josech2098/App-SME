import { useEffect, useState } from "react";
import logo from "../assets/SMIPEM.png";

export default function SplashScreen({ onFinish }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);

          setTimeout(() => {
            onFinish();
          }, 500);

          return 100;
        }

        return prev + 2;
      });
    }, 40);

    return () => clearInterval(timer);
  }, [onFinish]);

  return (
    <div className="fixed inset-0 bg-[#0d1117] flex flex-col items-center justify-center z-[9999]">
      
      {/* Logo */}
      <img
        src={logo}
        alt="SMIPEM"
        className="w-[500px] max-w-full mt-8"
      />

      {/* Barra de progreso */}
      <div className="w-64 h-2 bg-slate-800 rounded-full overflow-hidden mt-6">
        <div
          className="h-full bg-emerald-500 transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Texto de estado */}
      <div className="text-slate-400 text-sm mt-4">
        Inicializando SMIPEM... {progress}%
      </div>

      {/* Subtítulo */}
      <div className="text-slate-500 text-xs mt-2">
        Rastreador de escenarios de distribución
      </div>

    </div>
  );
}