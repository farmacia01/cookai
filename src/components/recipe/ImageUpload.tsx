import { useState, useCallback, useEffect } from "react";
import { Camera, ImageIcon, X, Loader2, ScanLine, CheckCircle2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface ImageUploadProps {
  onImageSelect: (base64: string) => void;
  selectedImage: string | null;
  onClear: () => void;
}

const compressImage = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    img.onload = () => {
      try {
        const maxWidth = 800;
        let { width, height } = img;
        if (width > maxWidth) { height = (height * maxWidth) / width; width = maxWidth; }
        canvas.width = width; canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);
        let url = canvas.toDataURL("image/webp", 0.8);
        if (url.startsWith("data:image/png")) url = canvas.toDataURL("image/jpeg", 0.8);
        resolve(url);
      } catch (e) { reject(e); }
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
};

const ImageUpload = ({ onImageSelect, selectedImage, onClear }: ImageUploadProps) => {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanDone, setScanDone] = useState(false);

  useEffect(() => {
    if (selectedImage && !isScanning) {
      setScanDone(false); setIsScanning(true);
      const timer = setTimeout(() => { setIsScanning(false); setScanDone(true); }, 2600);
      return () => clearTimeout(timer);
    }
  }, [selectedImage]);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setIsCompressing(true);
    try {
      onImageSelect(await compressImage(file));
    } catch {
      const reader = new FileReader();
      reader.onload = (e) => onImageSelect(e.target?.result as string);
      reader.readAsDataURL(file);
    } finally { setIsCompressing(false); }
  }, [onImageSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files.length > 0) processFile(e.dataTransfer.files[0]);
  }, [processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) processFile(e.target.files[0]);
  }, [processFile]);

  const handleClear = () => { setScanDone(false); setIsScanning(false); onClear(); };

  /* ── Compressing ── */
  if (isCompressing) {
    return (
      <div className="card-dark min-h-[280px] flex items-center justify-center">
        <div className="text-center flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-3xl bg-[#A3E635] flex items-center justify-center animate-pulse-lime">
            <Loader2 className="w-8 h-8 text-black animate-spin" />
          </div>
          <div>
            <p className="font-bold text-white">{t("imageUpload.compressing")}</p>
            <p className="text-sm text-[#555] mt-0.5">{t("imageUpload.optimizing")}</p>
          </div>
        </div>
      </div>
    );
  }

  /* ── Image selected + scanner ── */
  if (selectedImage) {
    return (
      <div className="relative rounded-[24px] overflow-hidden border border-[#A3E635]/25 animate-scale-in group">
        <img src={selectedImage} alt={t("imageUpload.selectedImage")} className="w-full aspect-[4/3] object-cover" />

        {/* Scanner overlay */}
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute inset-0 bg-black/25" />
            {/* Neon lime scanner line */}
            <div
              className="absolute left-0 right-0 animate-scan"
              style={{
                height: "2px",
                background: "linear-gradient(90deg,transparent 0%,#A3E635 20%,#fff 50%,#A3E635 80%,transparent 100%)",
                boxShadow: "0 0 16px 6px hsl(82 100% 58% / 0.8), 0 0 40px 10px hsl(82 100% 58% / 0.3)",
              }}
            />
            {/* Grid lines for scan effect */}
            <div className="absolute inset-0" style={{
              backgroundImage: "linear-gradient(hsl(82 100% 58% / 0.04) 1px, transparent 1px), linear-gradient(90deg, hsl(82 100% 58% / 0.04) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }} />
            <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/70 backdrop-blur rounded-full px-3 py-1.5 border border-[#A3E635]/40">
              <ScanLine className="w-3.5 h-3.5 text-[#A3E635] animate-pulse" />
              <span className="text-[11px] font-bold text-[#A3E635] tracking-wide">ANALISANDO IA...</span>
            </div>
          </div>
        )}

        {scanDone && (
          <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/70 backdrop-blur rounded-full px-3 py-1.5 border border-[#A3E635]/50 animate-fade-in">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#A3E635]" />
            <span className="text-[11px] font-bold text-[#A3E635]">Pronto!</span>
          </div>
        )}

        <button onClick={handleClear} className="absolute top-3 right-3 w-8 h-8 bg-black/75 hover:bg-black rounded-full flex items-center justify-center border border-white/10 hover:border-white/25 transition-all">
          <X className="w-4 h-4 text-white" />
        </button>

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/75 to-transparent p-4">
          <p className="text-white text-sm font-semibold">{t("imageUpload.imageReady")}</p>
        </div>
      </div>
    );
  }

  /* ── Empty upload area ── */
  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "relative rounded-[28px] border-2 border-dashed transition-all duration-500 cursor-pointer group min-h-[320px] flex items-center justify-center overflow-hidden",
        isDragging
          ? "border-[#A3E635] bg-[#A3E635]/6 scale-[1.01]"
          : "border-[#222] bg-gradient-to-b from-[#141414] to-[#0e0e0e] hover:border-[#A3E635]/40"
      )}
    >
      <input type="file" accept="image/*" onChange={handleFileSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />

      {/* Ambient glow behind icon */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] pointer-events-none">
        <div className="w-52 h-52 rounded-full bg-[#A3E635]/10 blur-[80px] group-hover:bg-[#A3E635]/15 transition-all duration-700" />
      </div>

      {/* Concentric animated rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[55%] pointer-events-none">
        <div className="w-36 h-36 rounded-full border border-[#A3E635]/[0.07] group-hover:border-[#A3E635]/15 transition-all duration-700 flex items-center justify-center animate-[pulse_4s_ease-in-out_infinite]">
          <div className="w-28 h-28 rounded-full border border-[#A3E635]/[0.12] group-hover:border-[#A3E635]/20 transition-all duration-500 flex items-center justify-center animate-[pulse_3s_ease-in-out_infinite_0.5s]">
          </div>
        </div>
      </div>

      <div className="relative z-[5] text-center flex flex-col items-center gap-5 px-8 py-6">
        {/* Camera icon container */}
        <div className="relative">
          <div className={cn(
            "w-[72px] h-[72px] rounded-[20px] flex items-center justify-center transition-all duration-500 relative z-10",
            isDragging
              ? "bg-[#A3E635] shadow-[0_0_30px_rgba(163,230,53,0.5)] scale-110"
              : "bg-[#1C1C1C] border border-[#2a2a2a] group-hover:border-[#A3E635]/40 group-hover:bg-[#1e1e1e] group-hover:scale-110 group-hover:shadow-[0_0_25px_rgba(163,230,53,0.15)]"
          )}>
            {isDragging
              ? <Upload className="w-9 h-9 text-black animate-bounce" />
              : <Camera className="w-9 h-9 text-[#555] group-hover:text-[#A3E635] transition-colors duration-500" />
            }
          </div>
          {/* Subtle dot indicator */}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#A3E635] opacity-0 group-hover:opacity-100 transition-all duration-500 group-hover:shadow-[0_0_8px_rgba(163,230,53,0.6)]" />
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-black text-white tracking-tight">
            {isDragging ? t("imageUpload.dropHere") : t("imageUpload.uploadTitle")}
          </h3>
          <p className="text-[13px] text-[#555] leading-relaxed max-w-[260px] mx-auto">
            {t("imageUpload.dragOrClick")}
          </p>
        </div>

        <button
          type="button"
          className="relative z-0 flex items-center gap-2.5 bg-[#A3E635] text-black font-extrabold text-sm px-7 py-3.5 rounded-2xl transition-all duration-300 group-hover:shadow-[0_4px_20px_rgba(163,230,53,0.3)] group-hover:scale-105 active:scale-95"
        >
          <ImageIcon className="w-4 h-4" />
          {t("imageUpload.selectPhoto")}
        </button>

        <p className="text-[11px] text-[#333] tracking-wide font-medium">{t("imageUpload.formats")}</p>
      </div>
    </div>
  );
};

export default ImageUpload;