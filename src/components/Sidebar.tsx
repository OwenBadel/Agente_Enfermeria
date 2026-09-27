import React from "react";
import {
  Mic,
  History,
  Sparkles,
  HeartPulse,
} from "lucide-react";

export type NavTab = "captura" | "historial";

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
}) => {
  const navItems = [
    {
      id: "captura" as NavTab,
      label: "Captura Rápida",
      icon: Mic,
    },
    {
      id: "historial" as NavTab,
      label: "Historial Clínico",
      icon: History,
    },
  ];

  return (
    <nav
      id="desktop-sidebar-nav"
      className="hidden md:flex flex-col fixed left-0 top-0 h-full w-64 bg-[#f3f4f5] z-40 border-r border-[#c2c6d4] transition-all duration-200 ease-in-out shadow-sm"
    >
      {/* Brand Header */}
      <div className="p-6 flex flex-col gap-2 border-b border-[#c2c6d4] bg-white/70 backdrop-blur-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00478d] text-white flex items-center justify-center shadow-xs flex-shrink-0">
            <HeartPulse className="w-6 h-6 text-[#79f2f0]" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-[#00478d] tracking-tight leading-none">
              Unicolombo
            </h1>
            <p className="text-xs font-semibold text-[#006a68] mt-1">
              Enfermería Universitaria
            </p>
          </div>
        </div>
        <div className="mt-2 px-2.5 py-1 rounded-md bg-[#e7e8e9] text-[11px] font-medium text-[#424752] flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#006a68]" />
          <span>Sistema de Registro Activo</span>
        </div>
      </div>

      {/* Navigation links */}
      <div className="flex-1 py-4 px-2 overflow-y-auto flex flex-col gap-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-tab-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={`w-full rounded-xl px-3.5 py-3 flex items-center justify-between text-sm font-medium transition-all duration-150 text-left ${
                isActive
                  ? "bg-[#79f2f0] text-[#00504f] font-semibold shadow-xs"
                  : "text-[#424752] hover:bg-[#e7e8e9] hover:text-[#191c1d]"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-5 h-5 ${
                    isActive ? "text-[#00504f] stroke-[2.5]" : "text-[#727783]"
                  }`}
                />
                <span>{item.label}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Nurse info footer (No login/logout management) */}
      <div className="p-4 border-t border-[#c2c6d4] bg-white/50 flex items-center gap-3">
        <img
          src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=120"
          alt="Enfermera de Turno"
          className="w-9 h-9 rounded-full object-cover border-2 border-[#006a68]"
        />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-[#191c1d] truncate">
            Enfermera
          </p>
          <p className="text-[11px] text-[#727783] truncate">
            Enfermería Institucional
          </p>
        </div>
      </div>
    </nav>
  );
};
