import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell, SendHorizontal, Clock, Users, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

interface BroadcastLog {
    id: string;
    title: string;
    body: string;
    recipients_count: number;
    created_at: string;
}

const AdminBroadcast = () => {
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [sending, setSending] = useState(false);

    const { data: history, refetch } = useQuery<BroadcastLog[]>({
        queryKey: ["broadcast-history"],
        queryFn: async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data, error } = await (supabase as any)
                .from("broadcast_notifications")
                .select("id, title, body, recipients_count, created_at")
                .order("created_at", { ascending: false })
                .limit(20)
                .then((res: any) => res.error ? { data: [], error: null } : res);

            if (error) throw error;
            return (data as unknown) as BroadcastLog[];
        },
    });

    const { data: subCount } = useQuery<number>({
        queryKey: ["push-sub-count"],
        queryFn: async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { count, error } = await (supabase as any)
                .from("push_subscriptions")
                .select("*", { count: "exact", head: true })
                .then((res: any) => res.error ? { count: 0, error: null } : res);

            if (error) throw error;
            return count ?? 0;
        },
    });

    const handleSend = async () => {
        if (!title.trim() || !body.trim()) {
            toast.error("Preencha o título e a mensagem.");
            return;
        }
        setSending(true);
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData.session?.access_token;

            const res = await supabase.functions.invoke("send-broadcast", {
                body: { title: title.trim(), body: body.trim() },
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });

            if (res.error) throw res.error;

            const result = res.data as { sent: number; failed: number; total: number };
            toast.success(
                `Notificação enviada para ${result.sent} de ${result.total} usuário(s)!`
            );
            setTitle("");
            setBody("");
            refetch();
        } catch (err) {
            console.error("[AdminBroadcast] Error:", err);
            toast.error(
                "Erro ao enviar notificação. Verifique se a Edge Function está ativa."
            );
        } finally {
            setSending(false);
        }
    };

    const relativeTime = (iso: string) => {
        const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
        if (diff < 60) return `há ${diff}s`;
        if (diff < 3600) return `há ${Math.floor(diff / 60)}min`;
        if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
        return new Date(iso).toLocaleDateString("pt-BR");
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold">Notificações Push</h1>
                <p className="text-muted-foreground text-sm mt-0.5">
                    Envie mensagens para todos os usuários com notificações push ativas.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Compose */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Bell className="w-4 h-4" />
                            Nova Notificação
                        </CardTitle>
                        <CardDescription>
                            {subCount !== undefined
                                ? `${subCount} usuário(s) inscritos para receber notificações`
                                : "Carregando..."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="notif-title">Título</Label>
                            <Input
                                id="notif-title"
                                placeholder="Ex: 🍳 Nova receita disponível!"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                maxLength={80}
                            />
                            <p className="text-xs text-muted-foreground text-right">
                                {title.length}/80
                            </p>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="notif-body">Mensagem</Label>
                            <Textarea
                                id="notif-body"
                                placeholder="Ex: Confira as receitas personalizadas de hoje no Cook AI!"
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                rows={4}
                                maxLength={200}
                            />
                            <p className="text-xs text-muted-foreground text-right">
                                {body.length}/200
                            </p>
                        </div>

                        <div className="p-3 rounded-lg border bg-muted/40 text-sm space-y-1">
                            <p className="font-medium text-foreground">Pré-visualização</p>
                            <p className="font-semibold text-sm">
                                {title || "Título da notificação"}
                            </p>
                            <p className="text-muted-foreground text-xs">
                                {body || "Mensagem da notificação..."}
                            </p>
                        </div>

                        <Button
                            className="w-full gap-2"
                            onClick={handleSend}
                            disabled={sending || !title.trim() || !body.trim()}
                        >
                            <SendHorizontal className="w-4 h-4" />
                            {sending ? "Enviando..." : "Enviar para Todos"}
                        </Button>
                    </CardContent>
                </Card>

                {/* History */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Clock className="w-4 h-4" />
                            Histórico de Envios
                        </CardTitle>
                        <CardDescription>Últimas 20 notificações enviadas</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!history || history.length === 0 ? (
                            <p className="text-center text-sm text-muted-foreground py-8">
                                Nenhuma notificação enviada ainda.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {history.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-muted/20"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm truncate">{item.title}</p>
                                            <p className="text-xs text-muted-foreground line-clamp-1">
                                                {item.body}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {relativeTime(item.created_at)}
                                            </p>
                                        </div>
                                        <div className="shrink-0 flex items-center gap-1">
                                            {item.recipients_count > 0 ? (
                                                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                            ) : (
                                                <XCircle className="w-3.5 h-3.5 text-muted-foreground" />
                                            )}
                                            <Badge variant="outline" className="text-xs gap-1">
                                                <Users className="w-3 h-3" />
                                                {item.recipients_count}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Setup Info */}
            <Card className="border-amber-500/30 bg-amber-500/5">
                <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                        <Bell className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div className="text-sm space-y-1">
                            <p className="font-medium text-amber-700 dark:text-amber-400">
                                Configuração Necessária
                            </p>
                            <p className="text-muted-foreground">
                                Para que as notificações cheguem com a página fechada, é necessário:
                            </p>
                            <ol className="list-decimal list-inside text-muted-foreground space-y-1 text-xs">
                                <li>
                                    Gerar chaves VAPID:{" "}
                                    <code className="bg-muted px-1 rounded">npx web-push generate-vapid-keys</code>
                                </li>
                                <li>
                                    Adicionar ao Supabase Edge Function Secrets:{" "}
                                    <code className="bg-muted px-1 rounded">VAPID_PUBLIC_KEY</code>,{" "}
                                    <code className="bg-muted px-1 rounded">VAPID_PRIVATE_KEY</code>
                                </li>
                                <li>
                                    Adicionar ao <code className="bg-muted px-1 rounded">.env</code>:{" "}
                                    <code className="bg-muted px-1 rounded">VITE_VAPID_PUBLIC_KEY=sua_chave_publica</code>
                                </li>
                                <li>
                                    Deploy da Edge Function:{" "}
                                    <code className="bg-muted px-1 rounded">
                                        supabase functions deploy send-broadcast
                                    </code>
                                </li>
                                <li>
                                    Apply the SQL migration do Supabase dashboard em{" "}
                                    <code className="bg-muted px-1 rounded">SQL Editor</code>
                                </li>
                            </ol>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminBroadcast;
