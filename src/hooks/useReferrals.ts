import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Referral {
    id: string;
    referred_id: string;
    referred_name: string | null;
    referred_email: string | null;
    points_awarded: number;
    created_at: string;
}

export interface Reward {
    id: string;
    name: string;
    description: string | null;
    points_cost: number;
    reward_type: string;
    reward_value: number;
    image_url: string | null;
    active: boolean;
}

export interface Redemption {
    id: string;
    reward_id: string;
    reward_name?: string;
    points_spent: number;
    status: string;
    created_at: string;
}

export function useReferrals() {
    const { user } = useAuth();
    const [referralCode, setReferralCode] = useState<string | null>(null);
    const [referralPoints, setReferralPoints] = useState(0);
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [redemptions, setRedemptions] = useState<Redemption[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchReferralData = useCallback(async () => {
        if (!user) {
            setLoading(false);
            return;
        }

        try {
            // Fetch user's referral code and points
            const { data: profile } = await supabase
                .from('profiles')
                .select('referral_code, referral_points')
                .eq('user_id', user.id)
                .single();

            if (profile) {
                setReferralCode(profile.referral_code);
                setReferralPoints(profile.referral_points || 0);
            }

            // Fetch referrals (people this user has referred)
            const { data: referralData } = await supabase
                .from('referrals')
                .select('id, referred_id, points_awarded, created_at')
                .eq('referrer_id', user.id)
                .order('created_at', { ascending: false });

            if (referralData && referralData.length > 0) {
                // Fetch referred user profiles
                const referredIds = referralData.map(r => r.referred_id);
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('user_id, full_name')
                    .in('user_id', referredIds);

                const enrichedReferrals: Referral[] = referralData.map(ref => {
                    const profile = profiles?.find(p => p.user_id === ref.referred_id);
                    return {
                        ...ref,
                        referred_name: profile?.full_name || null,
                        referred_email: null,
                    };
                });

                setReferrals(enrichedReferrals);
            } else {
                setReferrals([]);
            }

            // Fetch available rewards
            const { data: rewardsData } = await supabase
                .from('referral_rewards')
                .select('*')
                .eq('active', true)
                .order('points_cost', { ascending: true });

            setRewards(rewardsData || []);

            // Fetch user's redemptions
            const { data: redemptionData } = await supabase
                .from('referral_redemptions')
                .select('id, reward_id, points_spent, status, created_at')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (redemptionData) {
                // Enrich with reward names
                const enrichedRedemptions: Redemption[] = redemptionData.map(red => {
                    const reward = rewardsData?.find(r => r.id === red.reward_id);
                    return {
                        ...red,
                        reward_name: reward?.name || 'Recompensa',
                    };
                });
                setRedemptions(enrichedRedemptions);
            }
        } catch (error) {
            console.error('Error fetching referral data:', error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchReferralData();
    }, [fetchReferralData]);

    const redeemReward = async (rewardId: string) => {
        if (!user) return false;

        try {
            const { data, error } = await supabase
                .rpc('redeem_reward', {
                    p_user_id: user.id,
                    p_reward_id: rewardId,
                });

            if (error) {
                console.error('Error redeeming reward:', error);
                return false;
            }

            if (data) {
                // Refresh data after redemption
                await fetchReferralData();
                return true;
            }

            return false;
        } catch (error) {
            console.error('Error redeeming reward:', error);
            return false;
        }
    };

    const getReferralLink = () => {
        if (!referralCode) return '';
        return `${window.location.origin}/auth?ref=${referralCode}`;
    };

    return {
        referralCode,
        referralPoints,
        referrals,
        rewards,
        redemptions,
        loading,
        redeemReward,
        getReferralLink,
        refetch: fetchReferralData,
    };
}
