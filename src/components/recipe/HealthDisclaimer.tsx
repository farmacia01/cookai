import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const HealthDisclaimer = () => {
  const { t } = useTranslation();
  
  return (
    <Alert className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50 mt-8">
      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
      <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">
        <strong>{t('healthDisclaimer.warning')}</strong> {t('healthDisclaimer.text')}
      </AlertDescription>
    </Alert>
  );
};

export default HealthDisclaimer;
