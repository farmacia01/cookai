import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, BellOff, Sun, UtensilsCrossed, Moon, AlertCircle } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { toast } from "sonner";

const MEAL_ICONS: Record<string, React.ReactNode> = {
    breakfast: <Sun className="w-4 h-4 text-amber-500" />,
    lunch: <UtensilsCrossed className="w-4 h-4 text-orange-500" />,
    dinner: <Moon className="w-4 h-4 text-indigo-400" />,
};

const NotificationSettings = () => {
    const { t } = useTranslation();
    const {
        settings,
        permission,
        isSupported,
        toggleEnabled,
        toggleMeal,
        updateMealTime,
        requestPermission,
        testNotification,
        testPush,
        subscribeToPushNotifications, // Added
        unsubscribeFromPushNotifications // Added
    } = useNotifications();


    if (!isSupported) {
        return (
            <Card className="border-primary/20 shadow-lg">
                <CardContent className="pt-6">
                    <div className="flex items-center gap-3 text-muted-foreground">
                        <AlertCircle className="w-5 h-5" />
                        <p className="text-sm">{t("notifications.notSupported")}</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-primary/20 shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden animate-fade-up">
            <CardHeader className="bg-gradient-to-r from-primary/10 via-transparent to-transparent border-b border-border/50">
                <CardTitle className="flex items-center justify-between text-xl font-black">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center shadow-inner">
                            <Bell className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex flex-col">
                            <span>{t("notifications.title")}</span>
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">{t("notifications.activeStatus")}</span>
                        </div>
                    </div>
                </CardTitle>
                
                <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1 p-3 rounded-xl bg-background/50 border border-border/50">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Permissão Browser</span>
                        <span className={`text-sm font-bold ${permission === 'granted' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {permission === 'granted' ? 'CONCEDIDA' : permission === 'denied' ? 'NEGADA' : 'PENDENTE'}
                        </span>
                    </div>
                    <div className="flex flex-col gap-1 p-3 rounded-xl bg-background/50 border border-border/50">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Assinatura Cloud</span>
                        <span className={`text-sm font-bold ${settings.enabled ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {settings.enabled ? 'ATIVA' : 'INATIVA'}
                        </span>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
                {!settings.enabled ? (
                    <div className="space-y-4 text-center py-4">
                        <p className="text-muted-foreground text-sm leading-relaxed">
                            {t("notifications.description")}
                        </p>
                        <button
                            onClick={() => toggleEnabled(true)}
                            className="w-full py-4 px-6 bg-primary text-black font-black rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-lg"
                        >
                            <Bell className="w-6 h-6" />
                            {t("notifications.enableNow")}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {/* Meal toggles */}
                        <div className="space-y-3">
                            {settings.meals.map((meal) => (
                                <div
                                    key={meal.id}
                                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${meal.enabled
                                        ? "bg-primary/5 border-primary/30 shadow-[0_0_20px_rgba(var(--primary-rgb),0.05)]"
                                        : "bg-background/20 border-border/50 grayscale opacity-60"
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${meal.enabled ? "bg-primary/20 shadow-inner" : "bg-muted"}`}>
                                            {MEAL_ICONS[meal.id]}
                                        </div>
                                        <div className="flex flex-col">
                                            <Label className="text-sm font-bold cursor-pointer">
                                                {t(`notifications.meals.${meal.id}`)}
                                            </Label>
                                            <span className="text-[10px] text-muted-foreground uppercase">{meal.time}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <input
                                            type="time"
                                            value={meal.time}
                                            onChange={(e) => updateMealTime(meal.id, e.target.value)}
                                            disabled={!meal.enabled}
                                            className="h-9 px-3 text-sm font-bold rounded-xl border border-border/50 bg-background/50 text-foreground disabled:opacity-20 transition-all focus:ring-2 focus:ring-primary/20 [color-scheme:dark]"
                                        />
                                        <Switch
                                            checked={meal.enabled}
                                            onCheckedChange={(checked) => toggleMeal(meal.id, checked)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Control Actions */}
                        <div className="pt-4 border-t border-border/50 space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-muted-foreground">Controles</span>
                                <button 
                                    onClick={() => toggleEnabled(false)}
                                    className="text-rose-400 text-xs font-bold hover:underline"
                                >
                                    Desativar Tudo
                                </button>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                <button
                                    onClick={async () => {
                                        const success = await testPush();
                                        if (success) {
                                            toast.success(t("notifications.testSuccess"));
                                        } else {
                                            toast.error(t("notifications.testError"));
                                        }
                                    }}
                                    className="w-full py-4 px-6 bg-background border-2 border-primary/20 text-primary font-black rounded-2xl hover:bg-primary/5 transition-all flex items-center justify-center gap-3 shadow-sm"
                                >
                                    <Sun className="w-5 h-5 animate-pulse" />
                                    {t("notifications.testPush")}
                                </button>

                                <button
                                    onClick={async () => {
                                        const success = await testNotification();
                                        if (success) {
                                            toast.success(t("notifications.testSuccess"));
                                        } else {
                                            toast.error(t("notifications.testError"));
                                        }
                                    }}
                                    className="w-full py-3 px-6 text-muted-foreground font-bold rounded-xl hover:text-foreground transition-all flex items-center justify-center gap-2 text-xs"
                                >
                                    <Bell className="w-4 h-4" />
                                    {t("notifications.testLocal")}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default NotificationSettings;
