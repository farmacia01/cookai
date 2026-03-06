import { useState, useEffect, useCallback, useRef } from "react";

export interface MealReminder {
    id: string;
    enabled: boolean;
    time: string; // HH:mm
}

export interface NotificationSettings {
    enabled: boolean;
    meals: MealReminder[];
}

const STORAGE_KEY = "cookai_notification_settings";

const DEFAULT_SETTINGS: NotificationSettings = {
    enabled: true,
    meals: [
        { id: "breakfast", enabled: true, time: "07:00" },
        { id: "lunch", enabled: true, time: "12:00" },
        { id: "dinner", enabled: true, time: "19:00" },
    ],
};

const MEAL_NOTIFICATIONS: Record<string, { pt: string; en: string; es: string }> = {
    breakfast: {
        pt: "☀️ Hora do café da manhã! Que tal gerar uma receita saudável?",
        en: "☀️ Breakfast time! How about generating a healthy recipe?",
        es: "☀️ ¡Hora del desayuno! ¿Qué tal generar una receta saludable?",
    },
    lunch: {
        pt: "🍽️ Hora do almoço! Gere uma receita com o que tem na geladeira.",
        en: "🍽️ Lunch time! Generate a recipe with what's in your fridge.",
        es: "🍽️ ¡Hora del almuerzo! Genera una receta con lo que tienes en el refrigerador.",
    },
    dinner: {
        pt: "🌙 Hora do jantar! Não esqueça de preparar algo nutritivo.",
        en: "🌙 Dinner time! Don't forget to prepare something nutritious.",
        es: "🌙 ¡Hora de cenar! No olvides preparar algo nutritivo.",
    },
};

function getStoredSettings(): NotificationSettings {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            return { ...DEFAULT_SETTINGS, ...parsed };
        }
    } catch {
        // ignore parse errors
    }
    return DEFAULT_SETTINGS;
}

function saveSettings(settings: NotificationSettings) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function getLanguage(): "pt" | "en" | "es" {
    try {
        const lang = localStorage.getItem("i18nextLng") || "pt";
        if (lang.startsWith("en")) return "en";
        if (lang.startsWith("es")) return "es";
        return "pt";
    } catch {
        return "pt";
    }
}

function getDelayUntil(timeStr: string): number {
    const [hours, minutes] = timeStr.split(":").map(Number);
    const now = new Date();
    const target = new Date();
    target.setHours(hours, minutes, 0, 0);

    // If the time has already passed today, schedule for tomorrow
    if (target.getTime() <= now.getTime()) {
        target.setDate(target.getDate() + 1);
    }

    return target.getTime() - now.getTime();
}

export function useNotifications() {
    const [settings, setSettings] = useState<NotificationSettings>(getStoredSettings);
    const [permission, setPermission] = useState<NotificationPermission>(
        typeof Notification !== "undefined" ? Notification.permission : "denied"
    );
    const [isSupported] = useState(() => typeof Notification !== "undefined");
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    // Clear all scheduled timers
    const clearTimers = useCallback(() => {
        timersRef.current.forEach(clearTimeout);
        timersRef.current = [];
    }, []);

    // Show a notification
    const showNotification = useCallback((mealId: string) => {
        const lang = getLanguage();
        const message = MEAL_NOTIFICATIONS[mealId]?.[lang] || MEAL_NOTIFICATIONS[mealId]?.pt || "";

        if (Notification.permission === "granted") {
            // Try service worker first (works in background)
            if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                    type: "SHOW_NOTIFICATION",
                    title: "🍳 Cook AI",
                    body: message,
                    tag: `meal-${mealId}`,
                });
            } else {
                // Fallback: direct notification (only when app is open)
                new Notification("🍳 Cook AI", {
                    body: message,
                    icon: "/icon.png",
                    tag: `meal-${mealId}`,
                });
            }
        }
    }, []);

    // Schedule notifications based on current settings
    const scheduleNotifications = useCallback(() => {
        clearTimers();

        if (!settings.enabled || Notification.permission !== "granted") return;

        settings.meals
            .filter((meal) => meal.enabled)
            .forEach((meal) => {
                const delay = getDelayUntil(meal.time);
                const timer = setTimeout(() => {
                    showNotification(meal.id);
                    // Re-schedule for the next day
                    scheduleNotifications();
                }, delay);
                timersRef.current.push(timer);
            });
    }, [settings, clearTimers, showNotification]);

    // Request permission
    const requestPermission = useCallback(async (): Promise<boolean> => {
        if (!isSupported) return false;

        try {
            const result = await Notification.requestPermission();
            setPermission(result);
            return result === "granted";
        } catch {
            return false;
        }
    }, [isSupported]);

    // Toggle master enable
    const toggleEnabled = useCallback(async (enabled: boolean) => {
        if (enabled) {
            const granted = await requestPermission();
            if (!granted) return;
        }

        setSettings((prev) => {
            const updated = { ...prev, enabled };
            saveSettings(updated);
            return updated;
        });
    }, [requestPermission]);

    // Toggle individual meal
    const toggleMeal = useCallback((mealId: string, enabled: boolean) => {
        setSettings((prev) => {
            const updated = {
                ...prev,
                meals: prev.meals.map((m) => (m.id === mealId ? { ...m, enabled } : m)),
            };
            saveSettings(updated);
            return updated;
        });
    }, []);

    // Update meal time
    const updateMealTime = useCallback((mealId: string, time: string) => {
        setSettings((prev) => {
            const updated = {
                ...prev,
                meals: prev.meals.map((m) => (m.id === mealId ? { ...m, time } : m)),
            };
            saveSettings(updated);
            return updated;
        });
    }, []);

    // Auto-request permission on first load if enabled
    useEffect(() => {
        if (settings.enabled && isSupported && permission === "default") {
            requestPermission();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Schedule notifications whenever settings change
    useEffect(() => {
        scheduleNotifications();
        return clearTimers;
    }, [scheduleNotifications, clearTimers]);

    // Also communicate with service worker to schedule there
    useEffect(() => {
        if (
            settings.enabled &&
            "serviceWorker" in navigator &&
            navigator.serviceWorker.controller
        ) {
            navigator.serviceWorker.controller.postMessage({
                type: "SCHEDULE_NOTIFICATIONS",
                settings: {
                    enabled: settings.enabled,
                    meals: settings.meals.filter((m) => m.enabled),
                    lang: getLanguage(),
                },
            });
        }
    }, [settings]);

    // Function to test notifications manually
    const testNotification = useCallback(async () => {
        console.log("[useNotifications] Test notification triggered.");
        if (!isSupported) {
            console.error("[useNotifications] Notifications not supported in this browser.");
            return false;
        }

        let currentPermission = permission;
        if (currentPermission !== "granted") {
            const granted = await requestPermission();
            if (!granted) {
                console.warn("[useNotifications] Permission denied for test notification.");
                return false;
            }
            currentPermission = "granted";
        }

        const message = "🔔 Teste Cook AI: A notificação está funcionando corretamente!";

        if (currentPermission === "granted") {
            if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
                console.log("[useNotifications] Dispatching test notification via Service Worker.");
                navigator.serviceWorker.controller.postMessage({
                    type: "SHOW_NOTIFICATION",
                    title: "🔔 Teste Cook AI",
                    body: message,
                    tag: "test-notification",
                });
            } else {
                console.log("[useNotifications] Dispatching test notification via direct API.");
                new Notification("🔔 Teste Cook AI", {
                    body: message,
                    icon: "/icon.png",
                    tag: "test-notification",
                });
            }
            return true;
        }
        return false;
    }, [isSupported, permission, requestPermission]);

    return {
        settings,
        permission,
        isSupported,
        toggleEnabled,
        toggleMeal,
        updateMealTime,
        requestPermission,
        testNotification,
    };
}
