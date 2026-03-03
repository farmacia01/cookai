import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Trophy, Users, Star, Plus, Trash2, Pencil, X, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ReferralEntry {
    id: string;
    referrer_id: string;
    referred_id: string;
    referrer_name: string | null;
    referred_name: string | null;
    points_awarded: number;
    status: string;
    created_at: string;
}

interface LeaderboardEntry {
    user_id: string;
    full_name: string | null;
    referral_code: string | null;
    referral_points: number;
    referral_count: number;
}

interface RewardItem {
    id: string;
    name: string;
    description: string | null;
    points_cost: number;
    reward_type: string;
    reward_value: number;
    image_url: string | null;
    active: boolean;
}

type RewardForm = {
    name: string;
    description: string;
    points_cost: number;
    reward_type: string;
    reward_value: number;
    image_url: string;
};

const emptyRewardForm: RewardForm = {
    name: '',
    description: '',
    points_cost: 10,
    reward_type: 'credits',
    reward_value: 10,
    image_url: '',
};

const AdminReferrals = () => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [referralEntries, setReferralEntries] = useState<ReferralEntry[]>([]);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [rewards, setRewards] = useState<RewardItem[]>([]);
    const [activeTab, setActiveTab] = useState<'leaderboard' | 'referrals' | 'rewards'>('leaderboard');

    // Reward form state
    const [rewardForm, setRewardForm] = useState<RewardForm>({ ...emptyRewardForm });
    const [editingRewardId, setEditingRewardId] = useState<string | null>(null);
    const [savingReward, setSavingReward] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch all referrals
            const { data: refData } = await supabase
                .from('referrals')
                .select('*')
                .order('created_at', { ascending: false });

            if (refData && refData.length > 0) {
                const allUserIds = [...new Set([
                    ...refData.map(r => r.referrer_id),
                    ...refData.map(r => r.referred_id),
                ])];

                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('user_id, full_name')
                    .in('user_id', allUserIds);

                const enriched: ReferralEntry[] = refData.map(ref => ({
                    ...ref,
                    referrer_name: profiles?.find(p => p.user_id === ref.referrer_id)?.full_name || null,
                    referred_name: profiles?.find(p => p.user_id === ref.referred_id)?.full_name || null,
                }));

                setReferralEntries(enriched);

                // Build leaderboard (only from completed referrals)
                const completedRefs = refData.filter(r => r.status === 'completed');
                const referrerCounts: Record<string, number> = {};
                completedRefs.forEach(r => {
                    referrerCounts[r.referrer_id] = (referrerCounts[r.referrer_id] || 0) + 1;
                });

                if (Object.keys(referrerCounts).length > 0) {
                    const { data: topProfiles } = await supabase
                        .from('profiles')
                        .select('user_id, full_name, referral_code, referral_points')
                        .in('user_id', Object.keys(referrerCounts));

                    const lb: LeaderboardEntry[] = (topProfiles || [])
                        .map(p => ({
                            user_id: p.user_id,
                            full_name: p.full_name,
                            referral_code: p.referral_code,
                            referral_points: p.referral_points || 0,
                            referral_count: referrerCounts[p.user_id] || 0,
                        }))
                        .sort((a, b) => b.referral_count - a.referral_count);

                    setLeaderboard(lb);
                }
            }

            // Fetch rewards
            const { data: rewardsData } = await supabase
                .from('referral_rewards')
                .select('*')
                .order('points_cost', { ascending: true });

            setRewards(rewardsData || []);
        } catch (error) {
            console.error('Error fetching referral data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveReward = async () => {
        if (!rewardForm.name) return;
        setSavingReward(true);
        try {
            const payload = {
                name: rewardForm.name,
                description: rewardForm.description || null,
                points_cost: rewardForm.points_cost,
                reward_type: rewardForm.reward_type,
                reward_value: rewardForm.reward_value,
                image_url: rewardForm.image_url || null,
            };

            if (editingRewardId) {
                // Update existing
                const { error } = await supabase
                    .from('referral_rewards')
                    .update(payload)
                    .eq('id', editingRewardId);
                if (error) throw error;
                toast({ title: 'Recompensa atualizada!' });
            } else {
                // Create new
                const { error } = await supabase
                    .from('referral_rewards')
                    .insert(payload);
                if (error) throw error;
                toast({ title: 'Recompensa criada!' });
            }

            setRewardForm({ ...emptyRewardForm });
            setEditingRewardId(null);
            await fetchData();
        } catch (err: any) {
            const message = err?.message || err?.error_description || String(err);
            console.error('Error saving reward:', err);
            toast({ title: 'Erro ao salvar recompensa', description: message, variant: 'destructive' });
        } finally {
            setSavingReward(false);
        }
    };

    const handleEditReward = (reward: RewardItem) => {
        setEditingRewardId(reward.id);
        setRewardForm({
            name: reward.name,
            description: reward.description || '',
            points_cost: reward.points_cost,
            reward_type: reward.reward_type,
            reward_value: reward.reward_value,
            image_url: reward.image_url || '',
        });
        setActiveTab('rewards');
    };

    const handleCancelEdit = () => {
        setEditingRewardId(null);
        setRewardForm({ ...emptyRewardForm });
    };

    const handleToggleReward = async (id: string, active: boolean) => {
        try {
            const { error } = await supabase
                .from('referral_rewards')
                .update({ active: !active })
                .eq('id', id);

            if (error) throw error;
            await fetchData();
            toast({ title: active ? 'Recompensa desativada' : 'Recompensa ativada' });
        } catch (err: any) {
            const message = err?.message || err?.error_description || String(err);
            console.error('Error toggling reward:', err);
            toast({ title: 'Erro ao atualizar recompensa', description: message, variant: 'destructive' });
        }
    };

    const handleDeleteReward = async (id: string) => {
        if (!confirm('Tem certeza que deseja remover esta recompensa?')) return;

        try {
            const { error } = await supabase.from('referral_rewards').delete().eq('id', id);
            if (error) throw error;
            await fetchData();
            toast({ title: 'Recompensa removida' });
        } catch (err: any) {
            const message = err?.message || err?.error_description || String(err);
            console.error('Error deleting reward:', err);
            toast({ title: 'Erro ao remover recompensa', description: message, variant: 'destructive' });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold">Programa de Indicação</h2>
                <p className="text-muted-foreground">Gerencie indicações, ranking e recompensas</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4 text-center">
                        <Users className="w-6 h-6 text-primary mx-auto mb-1" />
                        <p className="text-2xl font-bold">{referralEntries.length}</p>
                        <p className="text-xs text-muted-foreground">Total Indicações</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <Trophy className="w-6 h-6 text-green-500 mx-auto mb-1" />
                        <p className="text-2xl font-bold">{referralEntries.filter(r => r.status === 'completed').length}</p>
                        <p className="text-xs text-muted-foreground">Compraram Plano</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <Trophy className="w-6 h-6 text-amber-500 mx-auto mb-1" />
                        <p className="text-2xl font-bold">{leaderboard.length}</p>
                        <p className="text-xs text-muted-foreground">Afiliados Ativos</p>
                    </CardContent>
                </Card>
                <Card className="hidden sm:block">
                    <CardContent className="p-4 text-center">
                        <Star className="w-6 h-6 text-blue-500 mx-auto mb-1" />
                        <p className="text-2xl font-bold">{rewards.length}</p>
                        <p className="text-xs text-muted-foreground">Recompensas</p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b pb-2 overflow-x-auto">
                {[
                    { id: 'leaderboard' as const, label: 'Ranking', icon: Trophy },
                    { id: 'referrals' as const, label: 'Indicações', icon: Users },
                    { id: 'rewards' as const, label: 'Recompensas', icon: Star },
                ].map(tab => (
                    <Button
                        key={tab.id}
                        variant={activeTab === tab.id ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab(tab.id)}
                        className="gap-2 whitespace-nowrap"
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </Button>
                ))}
            </div>

            {/* Leaderboard Tab */}
            {activeTab === 'leaderboard' && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Ranking de Indicações (Compras Confirmadas)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {leaderboard.length === 0 ? (
                            <p className="text-muted-foreground text-center py-4">Nenhuma indicação com compra ainda</p>
                        ) : (
                            <div className="space-y-2">
                                {leaderboard.map((entry, index) => (
                                    <div
                                        key={entry.user_id}
                                        className="flex items-center justify-between border rounded-lg p-3"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${index === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                                index === 1 ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300' :
                                                    index === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                                        'bg-muted text-muted-foreground'
                                                }`}>
                                                {index + 1}
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">{entry.full_name || 'Usuário'}</p>
                                                <p className="text-xs text-muted-foreground font-mono">{entry.referral_code}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Badge variant="secondary">{entry.referral_count} indicações</Badge>
                                            <Badge className="bg-primary/10 text-primary">{entry.referral_points} pts</Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Referrals Tab */}
            {activeTab === 'referrals' && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Quem Indicou Quem</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {referralEntries.length === 0 ? (
                            <p className="text-muted-foreground text-center py-4">Nenhuma indicação registrada</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left py-2 px-3 font-medium text-muted-foreground">Quem Indicou</th>
                                            <th className="text-left py-2 px-3 font-medium text-muted-foreground">Indicado</th>
                                            <th className="text-left py-2 px-3 font-medium text-muted-foreground">Status</th>
                                            <th className="text-left py-2 px-3 font-medium text-muted-foreground">Pontos</th>
                                            <th className="text-left py-2 px-3 font-medium text-muted-foreground">Data</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {referralEntries.map(entry => (
                                            <tr key={entry.id} className="border-b last:border-0">
                                                <td className="py-2 px-3">{entry.referrer_name || 'Usuário'}</td>
                                                <td className="py-2 px-3">{entry.referred_name || 'Usuário'}</td>
                                                <td className="py-2 px-3">
                                                    <Badge
                                                        variant={entry.status === 'completed' ? 'default' : 'secondary'}
                                                        className={entry.status === 'completed' ? 'bg-green-500' : ''}
                                                    >
                                                        {entry.status === 'completed' ? 'Comprou' : 'Pendente'}
                                                    </Badge>
                                                </td>
                                                <td className="py-2 px-3">
                                                    {entry.status === 'completed' ? (
                                                        <Badge variant="secondary">+{entry.points_awarded}</Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">Aguardando compra</span>
                                                    )}
                                                </td>
                                                <td className="py-2 px-3 text-muted-foreground">
                                                    {new Date(entry.created_at).toLocaleDateString('pt-BR')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Rewards Tab */}
            {activeTab === 'rewards' && (
                <div className="space-y-4">
                    {/* Add/Edit Reward Form */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg">
                                    {editingRewardId ? 'Editar Recompensa' : 'Adicionar Recompensa'}
                                </CardTitle>
                                {editingRewardId && (
                                    <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                                        <X className="w-4 h-4 mr-1" /> Cancelar
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <Label className="text-xs">Nome</Label>
                                    <Input
                                        placeholder="Nome da recompensa"
                                        value={rewardForm.name}
                                        onChange={e => setRewardForm(s => ({ ...s, name: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">Descrição</Label>
                                    <Input
                                        placeholder="Descrição (opcional)"
                                        value={rewardForm.description}
                                        onChange={e => setRewardForm(s => ({ ...s, description: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">Custo em Pontos</Label>
                                    <Input
                                        type="number"
                                        value={rewardForm.points_cost}
                                        onChange={e => setRewardForm(s => ({ ...s, points_cost: parseInt(e.target.value) || 0 }))}
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">Tipo</Label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={rewardForm.reward_type}
                                        onChange={e => setRewardForm(s => ({ ...s, reward_type: e.target.value }))}
                                    >
                                        <option value="credits">Créditos</option>
                                        <option value="free_days">Dias Grátis</option>
                                        <option value="discount">Desconto</option>
                                    </select>
                                </div>
                                <div>
                                    <Label className="text-xs">Valor da recompensa</Label>
                                    <Input
                                        type="number"
                                        placeholder="Ex: 10 créditos, 7 dias"
                                        value={rewardForm.reward_value}
                                        onChange={e => setRewardForm(s => ({ ...s, reward_value: parseInt(e.target.value) || 0 }))}
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs flex items-center gap-1">
                                        <ImageIcon className="w-3 h-3" /> URL da Imagem
                                    </Label>
                                    <Input
                                        placeholder="https://exemplo.com/imagem.png"
                                        value={rewardForm.image_url}
                                        onChange={e => setRewardForm(s => ({ ...s, image_url: e.target.value }))}
                                    />
                                </div>
                            </div>

                            {/* Image Preview */}
                            {rewardForm.image_url && (
                                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                                    <img
                                        src={rewardForm.image_url}
                                        alt="Preview"
                                        className="w-16 h-16 rounded-lg object-cover border"
                                        onError={e => (e.currentTarget.style.display = 'none')}
                                    />
                                    <p className="text-xs text-muted-foreground">Preview da imagem</p>
                                </div>
                            )}

                            <Button onClick={handleSaveReward} disabled={savingReward || !rewardForm.name} className="gap-2 w-full sm:w-auto">
                                {savingReward ? <Loader2 className="w-4 h-4 animate-spin" /> : editingRewardId ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                {editingRewardId ? 'Salvar Alterações' : 'Adicionar'}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Existing Rewards */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Recompensas Existentes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {rewards.length === 0 ? (
                                <p className="text-muted-foreground text-center py-4">Nenhuma recompensa cadastrada</p>
                            ) : (
                                <div className="space-y-2">
                                    {rewards.map(reward => (
                                        <div key={reward.id} className="flex items-center justify-between border rounded-lg p-3">
                                            <div className="flex items-center gap-3">
                                                {reward.image_url ? (
                                                    <img src={reward.image_url} alt={reward.name} className="w-12 h-12 rounded-lg object-cover border" />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                                                        <ImageIcon className="w-5 h-5 text-muted-foreground" />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-medium text-sm">{reward.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {reward.points_cost} pts → {reward.reward_value} {reward.reward_type === 'credits' ? 'créditos' : reward.reward_type === 'free_days' ? 'dias' : '%'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleEditReward(reward)}
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant={reward.active ? 'default' : 'secondary'}
                                                    onClick={() => handleToggleReward(reward.id, reward.active)}
                                                >
                                                    {reward.active ? 'Ativa' : 'Inativa'}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleDeleteReward(reward.id)}
                                                    className="text-destructive hover:text-destructive"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default AdminReferrals;
