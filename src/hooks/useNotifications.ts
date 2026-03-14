import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

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


export function useNotifications() {
    const [settings, setSettings] = useState<NotificationSettings>(getStoredSettings);
    const [permission, setPermission] = useState<NotificationPermission>(
        typeof Notification !== "undefined" ? Notification.permission : "denied"
    );
    const [isSupported] = useState(() => typeof Notification !== "undefined");

    const syncSettingsToDB = useCallback(async (currentSettings: NotificationSettings) => {
        try {
            if ("serviceWorker" in navigator && "PushManager" in window) {
                const registration = await navigator.serviceWorker.ready;
                const subscription = await registration.pushManager.getSubscription();
                if (!subscription) return;

                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // Extract keys
                const p256dh = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(subscription.getKey("p256dh")!))));
                const auth = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(subscription.getKey("auth")!))));

                // We use the same edge function for syncing or just updating settings if needed
                const { error } = await supabase.functions.invoke("push-subscriptions", {
                    body: {
                        endpoint: subscription.endpoint,
                        p256dh: p256dh,
                        auth: auth,
                        action: "register",
                        meal_settings: currentSettings.enabled ? currentSettings.meals : []
                    }
                });

                if (error) console.error("Failed to sync meal settings", error);
            }
        } catch (e) {
            console.error(e);
        }
    }, []);
    const subscribeToPushNotifications = useCallback(async () => {
        try {
            if ("serviceWorker" in navigator && "PushManager" in window) {
                const registration = await navigator.serviceWorker.ready;

                // Get VAPID public key from env
                const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
                if (!vapidPublicKey) {
                    console.error("Vapid public key not found in env variables");
                    return;
                }

                // Subscribe to push manager
                const subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
                });

                // Get current user
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return; // Need to be logged in

                // Extract keys
                const p256dh = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(subscription.getKey("p256dh")!))));
                const auth = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(subscription.getKey("auth")!))));

                // Save to Supabase via Edge Function
                const { data, error } = await supabase.functions.invoke("push-subscriptions", {
                    body: {
                        endpoint: subscription.endpoint,
                        p256dh: p256dh,
                        auth: auth,
                        userAgent: navigator.userAgent,
                        action: "register"
                    }
                });

                if (error) {
                    console.error("Failed to save push subscription to DB:", error);
                } else {
                    console.log("Push subscription saved successfully:", data);
                }
            }
        } catch (error) {
            console.error("Error subscribing to web push:", error);
        }
    }, []);

    const unsubscribeFromPushNotifications = useCallback(async () => {
        try {
            if ("serviceWorker" in navigator && "PushManager" in window) {
                const registration = await navigator.serviceWorker.ready;
                const subscription = await registration.pushManager.getSubscription();
                
                if (subscription) {
                    // Call backend to unregister
                    await supabase.functions.invoke("push-subscriptions", {
                        body: {
                            endpoint: subscription.endpoint,
                            action: "unregister"
                        }
                    });
                    
                    // Local unsubscribe
                    await subscription.unsubscribe();
                    console.log("Unsubscribed from push notifications locally and on backend.");
                }
            }
        } catch (error) {
            console.error("Error unsubscribing from web push:", error);
        }
    }, []);

    // Helper to convert VAPID key
    const urlBase64ToUint8Array = (base64String: string) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    };

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
            if (!granted) {
                alert("O seu navegador está bloqueando as notificações. Clique no cadeado na barra de endereços (lá em cima, ao lado de localhost) e mude Notificações para 'Permitir'.");
                return;
            }

            // Try to subscribe to push globally if granted
            await subscribeToPushNotifications();
        } else {
            // Unsubscribe if disabled
            await unsubscribeFromPushNotifications();
        }

        setSettings((prev) => {
            const updated = { ...prev, enabled };
            saveSettings(updated);
            // syncSettingsToDB(updated); // Disabled for maintenance flow as it's handled by push-subscriptions
            return updated;
        });
    }, [requestPermission, subscribeToPushNotifications, unsubscribeFromPushNotifications]);

    // Toggle individual meal
    const toggleMeal = useCallback((mealId: string, enabled: boolean) => {
        setSettings((prev) => {
            const updated = {
                ...prev,
                meals: prev.meals.map((m) => (m.id === mealId ? { ...m, enabled } : m)),
            };
            saveSettings(updated);
            syncSettingsToDB(updated);
            return updated;
        });
    }, [syncSettingsToDB]);

    // Update meal time
    const updateMealTime = useCallback((mealId: string, time: string) => {
        setSettings((prev) => {
            const updated = {
                ...prev,
                meals: prev.meals.map((m) => (m.id === mealId ? { ...m, time } : m)),
            };
            saveSettings(updated);
            syncSettingsToDB(updated);
            return updated;
        });
    }, [syncSettingsToDB]);

    // Auto-request permission on first load if enabled
    useEffect(() => {
        if (settings.enabled && isSupported && permission === "default") {
            requestPermission();
        } else if (settings.enabled && permission === "granted") {
            // Already granted, make sure we have the push subscription registered
            subscribeToPushNotifications();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [permission]);

    // Also communicate with service worker to schedule there
    // This isn't needed anymore with the Cron job, but keeping for compatibility
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

    // Function to test push via server
    const testPush = useCallback(async () => {
        console.log("[useNotifications] Test push triggered.");
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return false;

            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData.session?.access_token;

            const res = await supabase.functions.invoke("send-broadcast", {
                body: {
                    title: "🚀 Teste de Servidor Cook AI",
                    body: "Se você recebeu isso, as notificações push estão configuradas corretamente!",
                    isTest: true
                },
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });

            return !res.error;
        } catch (err) {
            console.error("[useNotifications] Push test failed:", err);
            return false;
        }
    }, []);

    return {
        settings,
        permission,
        isSupported,
        toggleEnabled,
        toggleMeal,
        updateMealTime,
        requestPermission,
        testNotification,
        testPush,
        subscribeToPushNotifications,
        unsubscribeFromPushNotifications
    };
}
