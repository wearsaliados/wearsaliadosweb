"use client";

import { useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

export default function LoginBackground() {
  const [soundOn, setSoundOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  function toggleSound() {
    const video = videoRef.current;
    if (!video) return;
    const next = !soundOn;
    video.muted = !next;
    if (next) video.play().catch(() => {});
    setSoundOn(next);
  }

  return (
    <>
      <div className="pointer-events-none absolute inset-0 overflow-hidden wears-sea-bg">
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover opacity-90"
        >
          <source src="/brand/barco-wears-video.webm" type="video/webm" />
          <source src="/brand/barco-wears-video.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-wears-black/30 via-transparent to-wears-black/55" />
      </div>

      <button
        type="button"
        onClick={toggleSound}
        className="pointer-events-auto absolute right-4 top-4 z-10 flex items-center gap-2 rounded-full border border-wears-tan/30 bg-wears-black/60 px-3 py-1.5 text-xs text-wears-sand/80 backdrop-blur-sm transition hover:border-wears-gold hover:text-wears-gold"
      >
        {soundOn ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
        {soundOn ? "Sonido del mar" : "Activar sonido"}
      </button>
    </>
  );
}
