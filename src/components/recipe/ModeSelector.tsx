import { cn } from "@/lib/utils";
import { Lock, Crown, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export type RecipeMode = "faxina" | "monstro" | "seca";

interface ModeSelectorProps {
  selectedMode: RecipeMode;
  onModeSelect: (mode: RecipeMode) => void;
  disabledModes?: string[];
  isPro?: boolean;
}

const modes = [
  {
    id: "faxina" as RecipeMode,
    emoji: "🧹",
    accentColor: "#A3E635",
    bgColor: "hsl(82 100% 58% / 0.1)",
    borderColor: "#A3E635",
    proOnly: false,
  },
  {
    id: "monstro" as RecipeMode,
    emoji: "💪",
    accentColor: "#fb923c",
    bgColor: "hsl(25 95% 53% / 0.1)",
    borderColor: "#fb923c",
    proOnly: true,
  },
  {
    id: "seca" as RecipeMode,
    emoji: "🔥",
    accentColor: "#38bdf8",
    bgColor: "hsl(200 80% 50% / 0.1)",
    borderColor: "#38bdf8",
    proOnly: true,
  },
];

const ModeSelector = ({ selectedMode, onModeSelect, disabledModes = [], isPro = false }: ModeSelectorProps) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white uppercase tracking-widest">
          {t("modeSelector.title")}
        </h3>
        {!isPro && (
          <Link to="/precos">
            <span className="flex items-center gap-1 text-[11px] text-[#555] hover:text-[#A3E635] transition-colors bg-[#1a1a1a] border border-[#2a2a2a] px-2.5 py-1 rounded-full">
              <Crown className="w-3 h-3" />
              Ver Pro
            </span>
          </Link>
        )}
      </div>

      <div className="grid gap-2.5">
        {modes.map((mode) => {
          const isSelected = selectedMode === mode.id;
          const isDisabled = disabledModes.includes(mode.id);
          const isLocked = mode.proOnly && !isPro;

          return (
            <button
              key={mode.id}
              id={`mode-${mode.id}`}
              onClick={() => {
                if (!isDisabled && !isLocked) {
                  if ("vibrate" in navigator) navigator.vibrate(12);
                  onModeSelect(mode.id);
                }
              }}
              disabled={isDisabled || isLocked}
              className={cn(
                "relative flex items-center gap-3.5 p-3.5 rounded-[18px] border text-left transition-all duration-250 focus:outline-none",
                isSelected && !isLocked
                  ? "scale-[1.035]"
                  : isLocked
                    ? "opacity-45 cursor-not-allowed border-[#1e1e1e] bg-[#0e0e0e]"
                    : "border-[#1e1e1e] bg-[#111] hover:border-[#2a2a2a] hover:bg-[#141414]"
              )}
              style={
                isSelected && !isLocked
                  ? {
                    borderColor: mode.accentColor,
                    background: mode.bgColor,
                    boxShadow: `0 0 0 1px ${mode.accentColor}, 0 0 20px ${mode.accentColor}40, 0 4px 16px ${mode.accentColor}18`,
                  }
                  : {}
              }
            >
              {/* Emoji container */}
              <div
                className={cn(
                  "w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 transition-all duration-250",
                  isSelected && !isLocked ? "scale-105" : isLocked ? "grayscale" : ""
                )}
                style={{ background: isSelected && !isLocked ? mode.bgColor : "#1a1a1a", border: `1px solid ${isSelected && !isLocked ? mode.accentColor + "50" : "#252525"}` }}
              >
                {isLocked ? (
                  <Lock className="w-4.5 h-4.5" style={{ color: "#444" }} />
                ) : (
                  <span className={cn(isSelected ? "text-2xl" : "text-lg opacity-70")}>{mode.emoji}</span>
                )}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h4 className={cn(
                    "font-bold text-sm transition-colors",
                    isSelected && !isLocked ? "text-white" : "text-[#888]"
                  )}>
                    {t(`modeSelector.${mode.id}.title`)}
                  </h4>
                  {isLocked && (
                    <span className="flex items-center gap-0.5 text-[10px] bg-[#1a1a1a] border border-[#2a2a2a] text-[#555] px-1.5 py-0.5 rounded-full">
                      <Crown className="w-2.5 h-2.5" /> Pro
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#555] leading-relaxed line-clamp-2">
                  {t(`modeSelector.${mode.id}.description`)}
                </p>
              </div>

              {/* Check dot */}
              {isSelected && !isLocked && (
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 animate-scale-in"
                  style={{ background: mode.accentColor }}
                >
                  <Check className="w-3 h-3 text-black stroke-[2.5px]" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ModeSelector;