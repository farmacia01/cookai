import { useState, useEffect, useCallback } from "react";
import { X, Copy, CheckCircle2, Clock, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";

interface PixQrCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    pixData: {
        qr_code_base64: string;
        copy_paste: string;
        transaction_id: string;
        amount: number;
        expires_at: string;
    } | null;
    planName: string;
}

export function PixQrCodeModal({ isOpen, onClose, pixData, planName }: PixQrCodeModalProps) {
    const { toast } = useToast();
    const { refetch } = useSubscription();
    const [copied, setCopied] = useState(false);
    const [timeLeft, setTimeLeft] = useState("");
    const [paymentStatus, setPaymentStatus] = useState<"pending" | "paid" | "expired" | "error">("pending");

    // Reset status when modal opens with new data
    useEffect(() => {
        if (isOpen && pixData) {
            setPaymentStatus("pending");
            setCopied(false);
        }
    }, [isOpen, pixData?.transaction_id]);

    // Poll S6X payment status directly via edge function
    useEffect(() => {
        if (!isOpen || !pixData || paymentStatus === "paid" || paymentStatus === "expired") return;

        const checkStatus = async () => {
            try {
                const { data, error } = await supabase.functions.invoke("s6x-check-status", {
                    body: { transaction_id: pixData.transaction_id },
                });

                if (error || !data?.success) return;

                if (data.status === "paid" || data.status === "approved" || data.status === "confirmed") {
                    setPaymentStatus("paid");
                    await refetch();
                    toast({
                        title: "Pagamento confirmado! 🎉",
                        description: `Seu plano ${planName} foi ativado com sucesso.`,
                    });
                    setTimeout(() => onClose(), 2500);
                } else if (data.status === "expired" || data.status === "cancelled" || data.status === "failed") {
                    setPaymentStatus("expired");
                }
            } catch {
                // silently retry next interval
            }
        };

        checkStatus();
        const interval = setInterval(checkStatus, 4000);
        return () => clearInterval(interval);
    }, [isOpen, pixData, paymentStatus, refetch, planName, toast, onClose]);

    // Countdown timer
    useEffect(() => {
        if (!pixData?.expires_at) return;

        const updateTimer = () => {
            const now = new Date().getTime();
            const expires = new Date(pixData.expires_at).getTime();
            const diff = expires - now;

            if (diff <= 0) {
                setTimeLeft("Expirado");
                if (paymentStatus === "pending") setPaymentStatus("expired");
                return;
            }

            const minutes = Math.floor(diff / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            setTimeLeft(`${minutes}:${seconds.toString().padStart(2, "0")}`);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [pixData?.expires_at, paymentStatus]);

    const handleCopy = useCallback(async () => {
        if (!pixData?.copy_paste) return;
        try {
            await navigator.clipboard.writeText(pixData.copy_paste);
            setCopied(true);
            toast({ title: "Código copiado!", description: "Cole no app do seu banco." });
            setTimeout(() => setCopied(false), 3000);
        } catch {
            const ta = document.createElement("textarea");
            ta.value = pixData.copy_paste;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
        }
    }, [pixData, toast]);

    if (!isOpen || !pixData) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-[420px] bg-[#131514] md:rounded-[28px] rounded-t-[28px] border-t border-x border-[#2a2a2a] md:border p-6 pb-10 md:pb-6 animate-fade-up z-10">
                {/* Close */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#1C1C1C] border border-[#333] flex items-center justify-center hover:bg-[#252525] transition-colors"
                >
                    <X className="w-4 h-4 text-white" />
                </button>

                {/* Drag handle */}
                <div className="w-12 h-1 bg-[#333] rounded-full mx-auto mb-6 md:hidden" />

                {/* Paid State */}
                {paymentStatus === "paid" ? (
                    <div className="text-center py-8">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[#A3E635]/20 flex items-center justify-center">
                            <CheckCircle2 className="w-10 h-10 text-[#A3E635]" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Pagamento Confirmado!</h2>
                        <p className="text-sm text-[#888]">Seu plano {planName} foi ativado.</p>
                    </div>
                ) : paymentStatus === "expired" ? (
                    <div className="text-center py-8">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                            <AlertCircle className="w-10 h-10 text-red-400" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">PIX Expirado</h2>
                        <p className="text-sm text-[#888] mb-4">O tempo para pagamento expirou.</p>
                        <button
                            onClick={onClose}
                            className="px-6 py-3 rounded-full bg-[#1C1C1C] border border-[#333] text-white text-sm font-semibold hover:border-[#555] transition-colors"
                        >
                            Tentar novamente
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="text-center mb-6">
                            <h2 className="text-lg font-bold text-white">Pagamento PIX</h2>
                            <p className="text-sm text-[#888] mt-1">{planName}</p>
                        </div>

                        {/* Amount */}
                        <div className="text-center mb-5">
                            <span className="text-3xl font-black text-[#A3E635]">
                                R$ {pixData.amount.toFixed(2).replace(".", ",")}
                            </span>
                        </div>

                        {/* QR Code */}
                        <div className="bg-white rounded-2xl p-4 mx-auto w-fit mb-5">
                            <img
                                src={`data:image/png;base64,${pixData.qr_code_base64}`}
                                alt="QR Code PIX"
                                className="w-[200px] h-[200px]"
                            />
                        </div>

                        {/* Copy-paste code */}
                        <button
                            onClick={handleCopy}
                            className={`w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all ${copied
                                    ? "bg-[#A3E635] text-black"
                                    : "bg-[#1C1C1C] border border-[#333] text-white hover:border-[#A3E635]/40"
                                }`}
                        >
                            {copied ? (
                                <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    Copiado!
                                </>
                            ) : (
                                <>
                                    <Copy className="w-4 h-4" />
                                    Copiar código Pix
                                </>
                            )}
                        </button>

                        {/* Status + Timer */}
                        <div className="flex items-center justify-between mt-5 px-1">
                            <div className="flex items-center gap-2 text-xs text-[#888]">
                                <Loader2 className="w-3 h-3 animate-spin text-[#A3E635]" />
                                <span>Aguardando pagamento...</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-[#888]">
                                <Clock className="w-3 h-3" />
                                <span>{timeLeft}</span>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
