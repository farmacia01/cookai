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
        <Card className="border-primary/20 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-border/50">
                <CardTitle className="flex items-center justify-between text-lg">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Bell className="w-5 h-5 text-primary" />
                        </div>
                        {t("notifications.title")}
                    </div>
                    <Switch
                        checked={settings.enabled}
                        onCheckedChange={toggleEnabled}
                        aria-label={t("notifications.toggle")}
                    />
                </CardTitle>
                <CardDescription className="mt-2">
                    {t("notifications.description")}
                </CardDescription>
                
                <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] uppercase font-bold tracking-wider">
                    <div className="flex flex-col gap-1 p-2 rounded-lg bg-background border border-border">
                        <span className="text-muted-foreground">Permissão</span>
                        <span className={permission === 'granted' ? 'text-primary' : 'text-destructive'}>
                            {permission === 'granted' ? 'Concedida' : permission === 'denied' ? 'Negada' : 'Padrão'}
                        </span>
                    </div>
                    <div className="flex flex-col gap-1 p-2 rounded-lg bg-background border border-border">
                        <span className="text-muted-foreground">Estado</span>
                        <span className={settings.enabled ? 'text-primary' : 'text-muted-foreground'}>
                            {settings.enabled ? 'Assinado' : 'Não Assinado'}
                        </span>
                    </div>
                </div>
            </CardHeader>

            {settings.enabled && (
                <CardContent className="space-y-3 pt-6">
                    {/* Permission warning */}
                    {permission === "denied" && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                            <BellOff className="w-4 h-4 flex-shrink-0" />
                            {t("notifications.permissionDenied")}
                        </div>
                    )}

                    {/* Meal toggles */}
                    {settings.meals.map((meal) => (
                        <div
                            key={meal.id}
                            className={`flex items-center justify-between p-3 rounded-xl border transition-all ${meal.enabled
                                ? "bg-primary/5 border-primary/20 shadow-sm"
                                : "bg-background border-border"
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${meal.enabled ? "bg-primary/10" : "bg-muted"
                                        }`}
                                >
                                    {MEAL_ICONS[meal.id]}
                                </div>
                                <div>
                                    <Label className="text-sm font-semibold cursor-pointer">
                                        {t(`notifications.meals.${meal.id}`)}
                                    </Label>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <input
                                    type="time"
                                    value={meal.time}
                                    onChange={(e) => updateMealTime(meal.id, e.target.value)}
                                    disabled={!meal.enabled}
                                    className="h-8 px-2 text-sm rounded-md border border-border bg-background text-foreground disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all [color-scheme:dark]"
                                />
                                <Switch
                                    checked={meal.enabled}
                                    onCheckedChange={(checked) => toggleMeal(meal.id, checked)}
                                    aria-label={t(`notifications.meals.${meal.id}`)}
                                />
                            </div>
                        </div>
                    ))}

                    {/* Status info */}
                    <div className="pt-2 space-y-2">
                        <p className="text-xs text-muted-foreground text-center">
                            {permission === "granted"
                                ? t("notifications.statusActive")
                                : t("notifications.statusInactive")}
                        </p>

                        <div className="grid grid-cols-2 gap-2 mt-2">
                            <button
                                onClick={async () => {
                                    const success = await testNotification();
                                    if (success) {
                                        toast.success(t("notifications.testSuccess"));
                                    } else {
                                        toast.error(t("notifications.testError"));
                                    }
                                }}
                                className="text-xs py-2 px-3 rounded-lg border border-border bg-background hover:bg-muted transition-colors flex items-center justify-center gap-2"
                            >
                                <Bell className="w-3 h-3" />
                                {t("notifications.testLocal")}
                            </button>
                            <button
                                onClick={async () => {
                                    const success = await testPush();
                                    if (success) {
                                        toast.success(t("notifications.testSuccess"));
                                    } else {
                                        toast.error(t("notifications.testError"));
                                    }
                                }}
                                className="text-xs py-2 px-3 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors flex items-center justify-center gap-2 text-primary"
                            >
                                <Sun className="w-3 h-3" />
                                {t("notifications.testPush")}
                            </button>
                        </div>
                    </div>
                </CardContent>
            )}
        </Card>
    );
};

export default NotificationSettings;
