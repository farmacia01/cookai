import { FormEvent, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

type Audience = 'all' | 'custom';

export default function PushAdminPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('/');
  const [audience, setAudience] = useState<Audience>('all');
  const [sessionIds, setSessionIds] = useState('');
  const [sending, setSending] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSending(true);

    const payload = {
      title,
      body,
      url,
      audience,
      custom: audience === 'custom' ? {
        sessionIds: sessionIds.split(',').map((x) => x.trim()).filter(Boolean),
      } : undefined,
    };

    try {
      const { error } = await supabase.functions.invoke('send-broadcast', {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_PUSH_ADMIN_SECRET || ''}`,
        },
        body: payload,
      });

      if (error) {
        throw new Error(error.message || 'Falha no envio');
      }

      setTitle('');
      setBody('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-10">
      <div className="max-w-xl mx-auto">
        <Card className="border border-lime-400/30 bg-zinc-900/80 shadow-[0_0_30px_rgba(163,230,53,0.15)]">
          <CardContent className="p-5 space-y-4">
            <h1 className="text-lg font-black text-lime-300 tracking-wide">Disparo Push Admin</h1>

            <form onSubmit={onSubmit} className="space-y-3">
              <div className="space-y-1">
                <Label>Título</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>

              <div className="space-y-1">
                <Label>Mensagem</Label>
                <Textarea value={body} onChange={(e) => setBody(e.target.value)} required />
              </div>

              <div className="space-y-1">
                <Label>URL</Label>
                <Input value={url} onChange={(e) => setUrl(e.target.value)} />
              </div>

              <div className="space-y-1">
                <Label>Público</Label>
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value as Audience)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-md h-10 px-3"
                >
                  <option value="all">all</option>
                  <option value="custom">custom</option>
                </select>
              </div>

              {audience === 'custom' && (
                <div className="space-y-1">
                  <Label>Session IDs (CSV)</Label>
                  <Input
                    value={sessionIds}
                    onChange={(e) => setSessionIds(e.target.value)}
                    placeholder="id1,id2,id3"
                  />
                </div>
              )}

              <Button disabled={sending} className="w-full bg-lime-400 text-zinc-900 hover:bg-lime-300 font-bold">
                {sending ? 'Enviando...' : 'Enviar'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
