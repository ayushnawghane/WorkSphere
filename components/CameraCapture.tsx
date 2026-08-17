"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, X, RotateCcw, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface CameraCaptureProps {
  open: boolean;
  title: string;
  onCapture: (file: File) => void;
  onSkip: () => void;
  onClose: () => void;
}

const MAX_DIMENSION = 480;

export function CameraCapture({
  open,
  title,
  onCapture,
  onSkip,
  onClose,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        if (!cancelled) setUnavailable(true);
      }
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setPreviewUrl(null);
      setPreviewFile(null);
      setUnavailable(false);
    }
  }, [open]);

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const scale = Math.min(1, MAX_DIMENSION / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], "punch.jpg", { type: "image/jpeg" });
        setPreviewFile(file);
        setPreviewUrl(URL.createObjectURL(blob));
      },
      "image/jpeg",
      0.7
    );
  };

  const retake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewFile(null);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="safe-bottom w-full max-w-sm rounded-t-3xl bg-[var(--bg-elevated)] p-5 sm:rounded-3xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[var(--text)]">{title}</h2>
              <button
                onClick={onClose}
                className="rounded-full p-1.5 text-slate-400 hover:bg-black/5 hover:text-slate-600 dark:hover:bg-white/10"
              >
                <X className="size-5" />
              </button>
            </div>

            {unavailable ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-black/10 py-10 text-center dark:border-white/10">
                <Camera className="size-8 text-slate-300" />
                <p className="px-6 text-sm text-slate-500 dark:text-slate-400">
                  Camera isn&apos;t available. You can still punch in with just your location.
                </p>
              </div>
            ) : previewUrl ? (
              <div className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element -- blob: preview URL, not eligible for next/image optimization */}
                <img src={previewUrl} alt="Captured selfie" className="w-full scale-x-[-1] object-cover" />
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-black/10 bg-black dark:border-white/10">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="aspect-[4/5] w-full scale-x-[-1] object-cover"
                />
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />

            <div className="mt-4 flex gap-2">
              {unavailable ? (
                <Button fullWidth onClick={onSkip}>
                  Continue without photo
                </Button>
              ) : previewUrl && previewFile ? (
                <>
                  <Button variant="secondary" className="flex-1" onClick={retake}>
                    <RotateCcw className="size-4" /> Retake
                  </Button>
                  <Button className="flex-1" onClick={() => onCapture(previewFile)}>
                    <Check className="size-4" /> Use photo
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" onClick={onSkip}>
                    Skip
                  </Button>
                  <Button fullWidth onClick={capture}>
                    <Camera className="size-4" /> Capture
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
