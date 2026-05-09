import { useMemo, useState } from 'react';
import { BellRing, CheckCircle2, CircleSlash, Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { isPushSupported, subscribeUserToPush } from '@/lib/push';

type PushCardState = 'unsupported' | 'prompt' | 'pending' | 'granted' | 'denied' | 'error';

function getInitialState(): PushCardState {
  if (typeof window === 'undefined') return 'prompt';
  if (!isPushSupported()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return 'prompt';
}

export default function PushPermissionCard() {
  const [state, setState] = useState<PushCardState>(getInitialState());
  const [errorMessage, setErrorMessage] = useState<string>('');

  const ui = useMemo(() => {
    switch (state) {
      case 'unsupported':
        return { icon: <CircleSlash className="w-4 h-4" />, text: 'Seu navegador não suporta push notifications.' };
      case 'pending':
        return { icon: <Loader2 className="w-4 h-4 animate-spin" />, text: 'Solicitando permissão...' };
      case 'granted':
        return { icon: <CheckCircle2 className="w-4 h-4" />, text: 'Notificações ativas com sucesso.' };
      case 'denied':
        return { icon: <ShieldAlert className="w-4 h-4" />, text: 'Permissão negada. Você pode habilitar nas configurações do navegador.' };
      case 'error':
        return { icon: <ShieldAlert className="w-4 h-4" />, text: errorMessage || 'Falha ao ativar notificações.' };
      default:
        return { icon: <BellRing className="w-4 h-4" />, text: 'Receba lembretes inteligentes de receitas, economia e proteína.' };
    }
  }, [errorMessage, state]);

  const onActivate = async () => {
    setErrorMessage('');
    setState('pending');

    try {
      await subscribeUserToPush();
      setState('granted');
    } catch (error) {
      if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
        setState('denied');
        return;
      }
      setErrorMessage(error instanceof Error ? error.message : 'Erro desconhecido');
      setState('error');
    }
  };

  return (
    <Card className="border border-lime-400/30 bg-zinc-950/90 shadow-[0_0_24px_rgba(163,230,53,0.12)]">
      <CardContent className="p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2 text-lime-300 text-xs uppercase tracking-[0.18em] font-bold">
          {ui.icon}
          Premium Alerts
        </div>

        <p className="text-zinc-100 text-sm leading-relaxed">{ui.text}</p>

        <Button
          type="button"
          disabled={state === 'unsupported' || state === 'pending' || state === 'granted'}
          onClick={onActivate}
          className="w-full bg-lime-400 hover:bg-lime-300 text-zinc-950 font-bold"
        >
          {state === 'pending' ? 'Ativando...' : 'Ativar notificações'}
        </Button>
      </CardContent>
    </Card>
  );
}
