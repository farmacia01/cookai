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
        "relative rounded-[24px] border-2 border-dashed transition-all duration-300 cursor-pointer group min-h-[260px] flex items-center justify-center overflow-hidden",
        isDragging
          ? "border-[#A3E635] bg-[#A3E635]/6 scale-[1.01]"
          : "border-[#2a2a2a] bg-[#111] hover:border-[#A3E635]/40 hover:bg-[#141414]"
      )}
    >
      <input type="file" accept="image/*" onChange={handleFileSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />

      {/* BG glow */}
      {isDragging && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-48 h-48 rounded-full bg-[#A3E635]/8 blur-3xl" />
        </div>
      )}

      <div className="relative z-10 text-center flex flex-col items-center gap-5 px-8">
        {/* Camera icon */}
        <div className={cn(
          "w-20 h-20 rounded-[22px] flex items-center justify-center transition-all duration-300",
          isDragging
            ? "bg-[#A3E635] shadow-lime scale-110"
            : "bg-[#1a1a1a] border border-[#2a2a2a] group-hover:border-[#A3E635]/30 group-hover:bg-[#1e1e1e] group-hover:scale-105"
        )}>
          {isDragging
            ? <Upload className="w-10 h-10 text-black animate-bounce" />
            : <Camera className="w-10 h-10 text-[#444] group-hover:text-[#A3E635] transition-colors duration-300" />
          }
        </div>

        <div>
          <h3 className="text-lg font-black text-white mb-1.5">
            {isDragging ? t("imageUpload.dropHere") : t("imageUpload.uploadTitle")}
          </h3>
          <p className="text-sm text-[#555] leading-relaxed max-w-[240px]">
            {t("imageUpload.dragOrClick")}
          </p>
        </div>

        <button
          type="button"
          className="pointer-events-none flex items-center gap-2 bg-[#A3E635] text-black font-bold text-sm px-6 py-3 rounded-2xl transition-all duration-200 group-hover:shadow-lime-sm group-hover:scale-105"
        >
          <ImageIcon className="w-4 h-4" />
          {t("imageUpload.selectPhoto")}
        </button>

        <p className="text-[11px] text-[#3a3a3a]">{t("imageUpload.formats")}</p>
      </div>
    </div>
  );
};

export default ImageUpload;