import { Helmet } from "react-helmet";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import {
  Flame, Beef, Wheat, Droplets, ChefHat, Star, Loader2, Zap, Trophy,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

interface DashboardData {
  totalRecipes: number; favoriteRecipes: number; avgRating: number;
  totalCalories: number; totalProtein: number; totalCarbs: number; totalFat: number;
  goals: { calories: number; protein: number; carbs: number; fat: number };
  recipesByMode: { name: string; value: number; color: string }[];
  weeklyCalories: { day: string; calories: number }[];
}

/* ── Animated bar ── */
function MacroBar({ value, goal, color }: { value: number; goal: number; color: string }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(Math.min((value / goal) * 100, 100)), 150); return () => clearTimeout(t); }, [value, goal]);
  return (
    <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
      <div style={{ width: `${w}%`, background: color, transition: "width 900ms cubic-bezier(0.87,0,0.13,1)", height: "100%", borderRadius: 99 }} />
    </div>
  );
}

/* ── Circular ring SVG ── */
function CircleRing({ value, goal, label, size = 160 }: { value: number; goal: number; label: string; size?: number }) {
  const [progress, setProgress] = useState(0);
  const r = (size - 20) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value / goal, 1);
  useEffect(() => { const t = setTimeout(() => setProgress(pct), 200); return () => clearTimeout(t); }, [pct]);

  // Multi-arc: lime for calories, then muted segments for protein/fat
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="ring-progress absolute inset-0">
        {/* BG ring */}
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(0 0% 18%)" strokeWidth={10} />
        {/* Progress arc */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="#A3E635" strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ - circ * progress}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.87,0,0.13,1)" }}
        />
      </svg>
      <div className="z-10 text-center">
        <p className="text-[10px] text-[#666] uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-3xl font-black text-white leading-none">{value.toLocaleString()}</p>
        <p className="text-xs text-[#555] mt-1">/{goal.toLocaleString()} kcal</p>
      </div>
    </div>
  );
}

/* ── Number swap ── */
function SwapNumber({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  const [up, setUp] = useState(false);
  useEffect(() => { setUp(true); const t = setTimeout(() => { setShown(value); setUp(false); }, 200); return () => clearTimeout(t); }, [value]);
  return (
    <div className="overflow-hidden h-[1.1em]">
      <span className={`block font-black transition-all duration-200 ${up ? "-translate-y-full opacity-0" : "translate-y-0 opacity-100"}`}>
        {shown.toLocaleString()}
      </span>
    </div>
  );
}

/* ── Weekly day pill ── */
const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
function WeekStrip({ activeIdx }: { activeIdx: number }) {
  const today = new Date();
  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
      {DAYS.map((d, i) => {
        const date = new Date(today);
        date.setDate(today.getDate() - (today.getDay() - i));
        const isToday = i === today.getDay();
        const isActive = i === activeIdx;
        return (
          <div key={d} className="flex flex-col items-center gap-1.5 flex-shrink-0 min-w-[36px]">
            <span className="text-[10px] text-[#555] uppercase font-medium">{d}</span>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${isToday
                ? "bg-[#A3E635] text-black shadow-lime-sm"
                : isActive
                  ? "bg-white/10 text-white ring-1 ring-white/20"
                  : "text-[#444]"
              }`}>
              {date.getDate()}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Macro pill ── */
function MacroPill({ icon, label, value, unit, color, bgColor, progress, goal }: any) {
  return (
    <div className="macro-card flex-1">
      <div className="flex items-center gap-1.5 mb-2">
        <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: bgColor }}>
          <span style={{ color }}>{icon}</span>
        </div>
        <span className="text-[11px] text-[#666] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-lg font-black text-white leading-none">{value}<span className="text-xs font-medium text-[#555] ml-0.5">{unit}</span></p>
      <p className="text-[10px] text-[#444] mb-2">/{goal}{unit}</p>
      <MacroBar value={value} goal={goal} color={color} />
    </div>
  );
}

const Dashboard = () => {
  const { t, i18n } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData>({
    totalRecipes: 0, favoriteRecipes: 0, avgRating: 0,
    totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0,
    goals: { calories: 2000, protein: 150, carbs: 250, fat: 65 },
    recipesByMode: [], weeklyCalories: [],
  });

  useEffect(() => { if (!authLoading && !user) navigate("/auth"); }, [user, authLoading, navigate]);
  useEffect(() => { if (user) fetchData(); }, [user]);

  const fetchData = async () => {
    try {
      const { data: profile } = await supabase.from("profiles")
        .select("daily_calories_goal,daily_protein_goal,daily_carbs_goal,daily_fat_goal")
        .eq("user_id", user?.id).maybeSingle();
      const { data: recipes } = await supabase.from("recipes").select("*").eq("user_id", user?.id);
      if (recipes) {
        const favs = recipes.filter(r => r.is_favorite);
        const rated = recipes.filter(r => r.rating);
        const avgRating = rated.length > 0 ? rated.reduce((s, r) => s + (r.rating || 0), 0) / rated.length : 0;
        const modeCounts = recipes.reduce((acc, r) => { acc[r.mode] = (acc[r.mode] || 0) + 1; return acc; }, {} as Record<string, number>);
        const modeColors: Record<string, string> = { faxina: "#A3E635", monstro: "hsl(25 95% 53%)", seca: "hsl(200 80% 50%)" };
        const modeLabels: Record<string, string> = { faxina: t("modes.faxina.title"), monstro: t("modes.monstro.title"), seca: t("modes.seca.title") };
        const recipesByMode = Object.entries(modeCounts).map(([m, c]) => ({ name: modeLabels[m] || m, value: c, color: modeColors[m] || "#A3E635" }));
        const now = new Date(), sod = new Date(now); sod.setHours(0, 0, 0, 0);
        const today = recipes.filter(r => new Date(r.created_at) >= sod);
        const locale = i18n.language === "en" ? "en-US" : i18n.language === "es" ? "es-ES" : "pt-BR";
        const weeklyCalories = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(); d.setDate(d.getDate() - (6 - i));
          const ds = new Date(d); ds.setHours(0, 0, 0, 0);
          const de = new Date(d); de.setHours(23, 59, 59, 999);
          return { day: d.toLocaleDateString(locale, { weekday: "short" }), calories: recipes.filter(r => { const x = new Date(r.created_at); return x >= ds && x <= de; }).reduce((s, r) => s + (r.calories || 0), 0) };
        });
        setData({
          totalRecipes: recipes.length, favoriteRecipes: favs.length, avgRating,
          totalCalories: today.reduce((s, r) => s + (r.calories || 0), 0),
          totalProtein: today.reduce((s, r) => s + (r.protein || 0), 0),
          totalCarbs: today.reduce((s, r) => s + (r.carbs || 0), 0),
          totalFat: today.reduce((s, r) => s + (r.fat || 0), 0),
          goals: { calories: profile?.daily_calories_goal ?? 2000, protein: profile?.daily_protein_goal ?? 150, carbs: profile?.daily_carbs_goal ?? 250, fat: profile?.daily_fat_goal ?? 65 },
          recipesByMode, weeklyCalories,
        });
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  if (authLoading || loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-3xl bg-[#A3E635] flex items-center justify-center shadow-lime animate-pulse-lime">
          <Loader2 className="w-8 h-8 text-black animate-spin" />
        </div>
        <p className="text-sm text-[#555] animate-pulse">Carregando...</p>
      </div>
    </div>
  );

  const todayIdx = new Date().getDay();

  return (
    <>
      <Helmet><title>{t("dashboard.title")} | Cook AI</title></Helmet>
      <div className="min-h-screen bg-background flex flex-col">
        <div className="hidden md:block"><Header /></div>

        <main className="flex-1 container mx-auto px-4 py-4 pt-4 md:py-12 md:pt-28 pb-32 md:pb-8">
          <div className="max-w-lg mx-auto md:max-w-5xl space-y-5">

            {/* ── Header greeting ── */}
            <div className="flex items-center justify-between animate-fade-up">
              <div>
                <p className="text-[#555] text-sm font-medium">Bom dia! 🌿</p>
                <h1 className="text-2xl md:text-3xl font-black text-white leading-tight">
                  Sua Nutrição
                </h1>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#1C1C1C] border border-[#2a2a2a] flex items-center justify-center">
                  <ChefHat className="w-5 h-5 text-[#A3E635]" />
                </div>
              </div>
            </div>

            {/* ── Week strip ── */}
            <div className="card-dark p-4 animate-fade-up" style={{ animationDelay: "0.05s" }}>
              <WeekStrip activeIdx={todayIdx} />
            </div>

            {/* ── Calorie ring + side macros ── */}
            <div className="card-dark p-5 animate-fade-up" style={{ animationDelay: "0.1s" }}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-xs text-[#555] uppercase tracking-widest font-medium">Hoje</p>
                  <p className="text-sm text-white font-semibold">Progresso Calórico</p>
                </div>
                <span className="text-[10px] text-[#555] bg-[#1a1a1a] px-2 py-1 rounded-full border border-[#2a2a2a]">
                  Dia {new Date().getDate()}
                </span>
              </div>

              <div className="flex items-center gap-6">
                {/* Ring */}
                <div className="flex-shrink-0">
                  <CircleRing value={data.totalCalories} goal={data.goals.calories} label="Kcal" size={152} />
                </div>
                {/* Side protein/fat */}
                <div className="flex-1 space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#A3E635]" />
                        <span className="text-xs text-[#888]">Carboidratos</span>
                      </div>
                      <span className="text-xs font-bold text-white">{data.totalCarbs}g / {data.goals.carbs}g</span>
                    </div>
                    <MacroBar value={data.totalCarbs} goal={data.goals.carbs} color="#A3E635" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-violet-400" />
                        <span className="text-xs text-[#888]">Proteínas</span>
                      </div>
                      <span className="text-xs font-bold text-white">{data.totalProtein}g / {data.goals.protein}g</span>
                    </div>
                    <MacroBar value={data.totalProtein} goal={data.goals.protein} color="#a78bfa" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                        <span className="text-xs text-[#888]">Gorduras</span>
                      </div>
                      <span className="text-xs font-bold text-white">{data.totalFat}g / {data.goals.fat}g</span>
                    </div>
                    <MacroBar value={data.totalFat} goal={data.goals.fat} color="#fbbf24" />
                  </div>
                </div>
              </div>
            </div>

            {/* ── 3 macro pills (calories, protein, carbs) ── */}
            <div className="grid grid-cols-3 gap-3 animate-fade-up" style={{ animationDelay: "0.15s" }}>
              <MacroPill icon={<Flame className="w-3.5 h-3.5" />} label="Calorias" value={data.totalCalories} unit="kcal" color="#f87171" bgColor="hsl(0 72% 51% / 0.15)" progress={data.totalCalories} goal={data.goals.calories} />
              <MacroPill icon={<Beef className="w-3.5 h-3.5" />} label="Proteína" value={data.totalProtein} unit="g" color="#a78bfa" bgColor="hsl(263 70% 60% / 0.15)" progress={data.totalProtein} goal={data.goals.protein} />
              <MacroPill icon={<Wheat className="w-3.5 h-3.5" />} label="Carbos" value={data.totalCarbs} unit="g" color="#A3E635" bgColor="hsl(82 100% 58% / 0.12)" progress={data.totalCarbs} goal={data.goals.carbs} />
            </div>

            {/* ── Stats row ── */}
            <div className="grid grid-cols-3 gap-3 animate-fade-up" style={{ animationDelay: "0.2s" }}>
              {[
                { icon: <ChefHat className="w-4 h-4" />, label: "Receitas", value: data.totalRecipes },
                { icon: <Star className="w-4 h-4" />, label: "Favoritas", value: data.favoriteRecipes },
                { icon: <Trophy className="w-4 h-4" />, label: "Avaliação", value: parseFloat(data.avgRating.toFixed(1)) },
              ].map((s, i) => (
                <div key={i} className="card-dark p-4 flex flex-col items-center gap-1 text-center">
                  <div className="w-9 h-9 rounded-2xl bg-[#A3E635]/12 flex items-center justify-center text-[#A3E635] mb-1">
                    {s.icon}
                  </div>
                  <p className="text-lg font-black text-white leading-none"><SwapNumber value={s.value} /></p>
                  <p className="text-[10px] text-[#555] uppercase tracking-wide">{s.label}</p>
                </div>
              ))}
            </div>

            {/* ── Bar chart ── */}
            <div className="card-dark p-5 animate-fade-up" style={{ animationDelay: "0.25s" }}>
              <p className="font-bold text-white mb-1">{t("dashboard.caloriesLast7Days")}</p>
              <p className="text-xs text-[#555] mb-5">{t("dashboard.caloriesLast7DaysDesc")}</p>
              <div className="h-[180px] md:h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.weeklyCalories} barSize={22}>
                    <CartesianGrid strokeDasharray="4 4" stroke="hsl(0 0% 18%)" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#555" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#555" }} axisLine={false} tickLine={false} width={32} />
                    <Tooltip contentStyle={{ background: "#1c1c1c", border: "1px solid #2a2a2a", borderRadius: 12, fontSize: 12, color: "#fff" }} cursor={{ fill: "hsl(82 100% 58% / 0.06)" }} />
                    <Bar dataKey="calories" fill="url(#limeGrad)" radius={[8, 8, 0, 0]} />
                    <defs>
                      <linearGradient id="limeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#A3E635" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#65a30d" stopOpacity={0.5} />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ── Recipes by mode ── */}
            {data.recipesByMode.length > 0 && (
              <div className="card-dark p-5 animate-fade-up" style={{ animationDelay: "0.3s" }}>
                <p className="font-bold text-white mb-1">{t("dashboard.recipesByMode")}</p>
                <p className="text-xs text-[#555] mb-4">{t("dashboard.recipesByModeDesc")}</p>
                <div className="flex items-center gap-4">
                  <div className="w-[120px] h-[120px] flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={data.recipesByMode} cx="50%" cy="50%" innerRadius={38} outerRadius={55} paddingAngle={4} dataKey="value" strokeWidth={0}>
                          {data.recipesByMode.map((e, i) => <Cell key={i} fill={e.color} opacity={0.88} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-3">
                    {data.recipesByMode.map(m => (
                      <div key={m.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: m.color }} />
                          <span className="text-sm text-[#888]">{m.name}</span>
                        </div>
                        <span className="text-sm font-bold text-white">{m.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        <div className="hidden md:block"><Footer /></div>
        <MobileBottomNav />
      </div>
    </>
  );
};

export default Dashboard;
