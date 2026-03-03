import { useState } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useReferrals } from '@/hooks/useReferrals';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Copy,
    Gift,
    Users,
    Star,
    Loader2,
    Check,
    Trophy,
    Sparkles,
    ArrowLeft,
    Share2,
    CreditCard,
    Calendar,
} from 'lucide-react';

const Affiliates = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const {
        referralCode,
        referralPoints,
        referrals,
        rewards,
        redemptions,
        loading,
        redeemReward,
        getReferralLink,
    } = useReferrals();

    const [copied, setCopied] = useState(false);
    const [redeemingId, setRedeemingId] = useState<string | null>(null);

    if (!user) {
        navigate('/auth');
        return null;
    }

    const handleCopyLink = async () => {
        const link = getReferralLink();
        if (!link) return;

        try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            toast({
                title: 'Link copiado!',
                description: 'Envie para seus amigos e ganhe pontos.',
            });
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast({
                title: 'Erro ao copiar',
                description: 'Tente selecionar e copiar manualmente.',
                variant: 'destructive',
            });
        }
    };

    const handleShare = async () => {
        const link = getReferralLink();
        if (!link) return;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Cook AI — Receitas Inteligentes',
                    text: 'Use meu link para se cadastrar no Cook AI e transforme sua geladeira em receitas inteligentes! 🍳',
                    url: link,
                });
            } catch {
                // User canceled share
            }
        } else {
            handleCopyLink();
        }
    };

    const handleRedeem = async (rewardId: string) => {
        setRedeemingId(rewardId);
        const success = await redeemReward(rewardId);
        setRedeemingId(null);

        if (success) {
            toast({
                title: 'Recompensa resgatada! 🎉',
                description: 'Seus pontos foram descontados.',
            });
        } else {
            toast({
                title: 'Erro no resgate',
                description: 'Pontos insuficientes ou recompensa indisponível.',
                variant: 'destructive',
            });
        }
    };

    const getRewardIcon = (type: string) => {
        switch (type) {
            case 'credits': return <CreditCard className="w-5 h-5" />;
            case 'free_days': return <Calendar className="w-5 h-5" />;
            default: return <Gift className="w-5 h-5" />;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <>
            <Helmet>
                <title>Programa de Indicação | Cook</title>
                <meta name="description" content="Indique amigos e ganhe recompensas no Cook AI" />
            </Helmet>

            <div className="hidden md:block">
                <Header />
            </div>

            <main className="min-h-screen bg-background pt-4 md:pt-24 pb-24 md:pb-8 px-4">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/perfil')}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                                <Sparkles className="w-7 h-7 text-primary" />
                                Programa de Indicação
                            </h1>
                            <p className="text-muted-foreground text-sm mt-1">
                                Indique amigos e ganhe recompensas exclusivas
                            </p>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                            <CardContent className="p-4 text-center">
                                <Star className="w-6 h-6 text-primary mx-auto mb-2" />
                                <p className="text-2xl sm:text-3xl font-bold text-primary">{referralPoints}</p>
                                <p className="text-xs text-muted-foreground">Pontos</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
                            <CardContent className="p-4 text-center">
                                <Users className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                                <p className="text-2xl sm:text-3xl font-bold text-blue-500">{referrals.length}</p>
                                <p className="text-xs text-muted-foreground">Indicações</p>
                            </CardContent>
                        </Card>
                        <Card className="hidden sm:block bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
                            <CardContent className="p-4 text-center">
                                <Trophy className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                                <p className="text-2xl sm:text-3xl font-bold text-amber-500">{redemptions.length}</p>
                                <p className="text-xs text-muted-foreground">Resgates</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Referral Link */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Share2 className="w-5 h-5 text-primary" />
                                Seu Link de Indicação
                            </CardTitle>
                            <CardDescription>
                                Compartilhe este link — quando alguém se cadastrar, você ganha <strong>10 pontos</strong>!
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center gap-2">
                                <div className="flex-1 bg-muted rounded-lg px-4 py-3 font-mono text-sm truncate">
                                    {getReferralLink() || 'Gerando link...'}
                                </div>
                                <Button
                                    onClick={handleCopyLink}
                                    variant="outline"
                                    size="icon"
                                    className="shrink-0"
                                >
                                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                </Button>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={handleCopyLink} className="flex-1 gap-2">
                                    <Copy className="w-4 h-4" />
                                    Copiar Link
                                </Button>
                                <Button onClick={handleShare} variant="outline" className="flex-1 gap-2">
                                    <Share2 className="w-4 h-4" />
                                    Compartilhar
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground text-center">
                                Código: <span className="font-mono font-bold text-primary">{referralCode}</span>
                            </p>
                        </CardContent>
                    </Card>

                    {/* Rewards Catalog */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Gift className="w-5 h-5 text-primary" />
                                Recompensas
                            </CardTitle>
                            <CardDescription>Troque seus pontos por recompensas exclusivas</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {rewards.length === 0 ? (
                                <p className="text-muted-foreground text-center py-4">Nenhuma recompensa disponível</p>
                            ) : (
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {rewards.map((reward) => (
                                        <div
                                            key={reward.id}
                                            className="border rounded-xl p-4 hover:border-primary/50 transition-colors flex flex-col justify-between"
                                        >
                                            <div>
                                                {reward.image_url && (
                                                    <img
                                                        src={reward.image_url}
                                                        alt={reward.name}
                                                        className="w-full h-28 object-cover rounded-lg mb-3"
                                                    />
                                                )}
                                                <div className="flex items-center gap-2 mb-2">
                                                    {!reward.image_url && getRewardIcon(reward.reward_type)}
                                                    <h3 className="font-semibold">{reward.name}</h3>
                                                </div>
                                                {reward.description && (
                                                    <p className="text-sm text-muted-foreground mb-3">{reward.description}</p>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between mt-2">
                                                <Badge variant="secondary" className="gap-1">
                                                    <Star className="w-3 h-3" />
                                                    {reward.points_cost} pts
                                                </Badge>
                                                <Button
                                                    size="sm"
                                                    disabled={referralPoints < reward.points_cost || redeemingId === reward.id}
                                                    onClick={() => handleRedeem(reward.id)}
                                                >
                                                    {redeemingId === reward.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        'Resgatar'
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Referrals List */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Users className="w-5 h-5 text-primary" />
                                Amigos Indicados
                            </CardTitle>
                            <CardDescription>
                                {referrals.length === 0
                                    ? 'Nenhuma indicação ainda. Compartilhe seu link!'
                                    : `${referrals.length} amigo${referrals.length > 1 ? 's' : ''} indicado${referrals.length > 1 ? 's' : ''}`}
                            </CardDescription>
                        </CardHeader>
                        {referrals.length > 0 && (
                            <CardContent>
                                <div className="space-y-3">
                                    {referrals.map((ref) => (
                                        <div
                                            key={ref.id}
                                            className="flex items-center justify-between border rounded-lg p-3"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <Users className="w-5 h-5 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm">
                                                        {ref.referred_name || 'Usuário'}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {new Date(ref.created_at).toLocaleDateString('pt-BR')}
                                                    </p>
                                                </div>
                                            </div>
                                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                +{ref.points_awarded} pts
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        )}
                    </Card>

                    {/* Redemptions History */}
                    {redemptions.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Trophy className="w-5 h-5 text-primary" />
                                    Histórico de Resgates
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {redemptions.map((red) => (
                                        <div
                                            key={red.id}
                                            className="flex items-center justify-between border rounded-lg p-3"
                                        >
                                            <div>
                                                <p className="font-medium text-sm">{red.reward_name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(red.created_at).toLocaleDateString('pt-BR')}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-muted-foreground">-{red.points_spent} pts</span>
                                                <Badge
                                                    variant={red.status === 'approved' ? 'default' : 'secondary'}
                                                    className={red.status === 'approved' ? 'bg-green-500' : ''}
                                                >
                                                    {red.status === 'approved' ? 'Aprovado' : red.status === 'pending' ? 'Pendente' : red.status}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </main>

            <div className="hidden md:block">
                <Footer />
            </div>
            <MobileBottomNav />
        </>
    );
};

export default Affiliates;
