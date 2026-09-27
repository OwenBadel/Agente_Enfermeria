import React from "react";
import { HeartPulse, Mic, History } from "lucide-react";
import { NavTab } from "./Sidebar";

interface HeaderProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
}) => {
  return (
    <>
      {/* Mobile Top Nav */}
      <header className="flex md:hidden justify-between items-center px-4 py-3 w-full bg-[#f8f9fa] border-b border-[#c2c6d4] shadow-xs z-50 sticky top-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#00478d] flex items-center justify-center">
            <HeartPulse className="w-5 h-5 text-[#79f2f0]" />
          </div>
          <div>
            <span className="text-base font-bold text-[#00478d]">Unicolombo</span>
            <p className="text-[10px] text-[#006a68] font-semibold leading-none">Enfermería</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#006a68] bg-[#e0f7f6] px-2.5 py-1 rounded-full">
            Enfermera
          </span>
          <img
            src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=120"
            alt="Enfermera"
            className="w-8 h-8 rounded-full object-cover border border-[#006a68]"
          />
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-[#c2c6d4] shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-50 flex justify-around items-center py-2 px-6 pb-safe">
        <button
          onClick={() => setActiveTab("captura")}
          className={`flex-1 flex flex-col items-center gap-1 p-2 transition-colors ${
            activeTab === "captura" ? "text-[#00478d] font-bold" : "text-[#727783]"
          }`}
        >
          <Mic className="w-5 h-5" />
          <span className="text-[11px]">Captura Rápida</span>
        </button>

        <button
          onClick={() => setActiveTab("historial")}
          className={`flex-1 flex flex-col items-center gap-1 p-2 transition-colors ${
            activeTab === "historial" ? "text-[#00478d] font-bold" : "text-[#727783]"
          }`}
        >
          <History className="w-5 h-5" />
          <span className="text-[11px]">Historial Clínico</span>
        </button>
      </nav>
    </>
  );
};
