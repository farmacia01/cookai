import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';

const CaktoSuccess = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscription, refetch, isActive } = useSubscription();
  const { toast } = useToast();
  const [checking, setChecking] = useState(true);
  const [verified, setVerified] = useState(false);
  const orderId = searchParams.get('order_id');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!orderId) {
      setChecking(false);
      return;
    }

    // Poll for subscription update (fallback if webhook is slow)
    const checkSubscription = async () => {
      let attempts = 0;
      const maxAttempts = 10;

      const pollInterval = setInterval(async () => {
        attempts++;

        // Refetch subscription
        await refetch();

        // Check if subscription is now active with this order_id
        const { data: currentSub } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .eq('cakto_order_id', orderId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (currentSub || isActive || attempts >= maxAttempts) {
          clearInterval(pollInterval);
          setChecking(false);
          setVerified(true);

          if (currentSub || isActive) {
            toast({
              title: t('cakto.success.title') || 'Pagamento confirmado!',
              description: t('cakto.success.description') || 'Sua assinatura foi ativada com sucesso.',
            });
          }
        }
      }, 2000); // Check every 2 seconds

      // Cleanup after 20 seconds max
      setTimeout(() => {
        clearInterval(pollInterval);
        if (checking) {
          setChecking(false);
          setVerified(true);
        }
      }, 20000);
    };

    checkSubscription();
  }, [user, orderId, navigate, refetch, isActive, checking, toast, t]);

  useEffect(() => {
    if (verified && !checking) {
      // Redirect to dashboard after 3 seconds
      const timer = setTimeout(() => {
        navigate('/dashboard');
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [verified, checking, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="hidden md:block"><Header /></div>

      <main className="flex-1 container mx-auto px-4 py-4 md:py-12 md:pt-28 pt-8 pb-24 md:pb-8">
        <div className="max-w-md mx-auto">
          <Card className="border-primary/20 shadow-lg">
            <CardContent className="p-8 text-center space-y-6">
              {checking ? (
                <>
                  <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin" />
                  <h1 className="text-2xl font-bold">
                    {t('cakto.verifying.title') || 'Verificando pagamento...'}
                  </h1>
                  <p className="text-muted-foreground">
                    {t('cakto.verifying.description') || 'Aguarde enquanto confirmamos seu pagamento.'}
                  </p>
                </>
              ) : verified ? (
                <>
                  <CheckCircle2 className="w-16 h-16 mx-auto text-primary" />
                  <h1 className="text-2xl font-bold">
                    {t('cakto.success.title') || 'Pagamento confirmado!'}
                  </h1>
                  <p className="text-muted-foreground">
                    {t('cakto.success.description') || 'Sua assinatura foi ativada com sucesso. Redirecionando...'}
                  </p>
                  <Button onClick={() => navigate('/dashboard')} className="w-full">
                    {t('cakto.goToDashboard') || 'Ir para Dashboard'}
                  </Button>
                </>
              ) : (
                <>
                  <AlertCircle className="w-16 h-16 mx-auto text-destructive" />
                  <h1 className="text-2xl font-bold">
                    {t('cakto.error.title') || 'Erro ao verificar pagamento'}
                  </h1>
                  <p className="text-muted-foreground">
                    {t('cakto.error.description') || 'Não foi possível verificar seu pagamento. Entre em contato com o suporte se o problema persistir.'}
                  </p>
                  <div className="flex gap-4">
                    <Button variant="outline" onClick={() => navigate('/precos')} className="flex-1">
                      {t('cakto.backToPricing') || 'Voltar aos Planos'}
                    </Button>
                    <Button onClick={() => navigate('/dashboard')} className="flex-1">
                      {t('cakto.goToDashboard') || 'Ir para Dashboard'}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <div className="hidden md:block"><Footer /></div>
      <MobileBottomNav />
    </div>
  );
};

export default CaktoSuccess;

