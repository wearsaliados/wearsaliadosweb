"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

/**
 * Ambiente de puerto: ruido marrón filtrado (olas) + un bocinazo grave y
 * lejano de barco, sintetizados con Web Audio API — sin archivos de audio.
 * Los navegadores bloquean el audio con sonido hasta el primer gesto del
 * usuario, así que se intenta de una vez y además se arma un listener que
 * lo retoma en el primer click/tecla si el navegador lo bloqueó.
 */
function startPortAmbience(ctx: AudioContext) {
  const master = ctx.createGain();
  master.gain.value = 0.16;
  master.connect(ctx.destination);

  // Olas: ruido marrón (integración de ruido blanco) pasado por un filtro
  // paso-bajo, con un LFO lento que hace "respirar" el volumen como el
  // vaivén de las olas contra el muelle.
  const bufferSize = 2 * ctx.sampleRate;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  let lastOut = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    data[i] = (lastOut + 0.02 * white) / 1.02;
    lastOut = data[i];
    data[i] *= 3.2;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  noise.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 650;

  const waveGain = ctx.createGain();
  waveGain.gain.value = 0.5;

  const swell = ctx.createOscillator();
  swell.frequency.value = 0.09;
  const swellDepth = ctx.createGain();
  swellDepth.gain.value = 0.25;
  swell.connect(swellDepth);
  swellDepth.connect(waveGain.gain);

  noise.connect(filter);
  filter.connect(waveGain);
  waveGain.connect(master);

  noise.start();
  swell.start();

  // Bocina de barco llegando a puerto: tono grave con ataque y caída
  // suaves, con un leve vibrato para que no suene a tono puro sintético.
  const hornGain = ctx.createGain();
  hornGain.gain.value = 0;
  hornGain.connect(master);

  const horn = ctx.createOscillator();
  horn.type = "sawtooth";
  horn.frequency.value = 98;

  const hornFilter = ctx.createBiquadFilter();
  hornFilter.type = "lowpass";
  hornFilter.frequency.value = 320;

  const vibrato = ctx.createOscillator();
  vibrato.frequency.value = 4.5;
  const vibratoDepth = ctx.createGain();
  vibratoDepth.gain.value = 2.5;
  vibrato.connect(vibratoDepth);
  vibratoDepth.connect(horn.frequency);

  horn.connect(hornFilter);
  hornFilter.connect(hornGain);
  horn.start();
  vibrato.start();

  function playHorn(delaySeconds: number) {
    const t = ctx.currentTime + delaySeconds;
    hornGain.gain.setValueAtTime(0, t);
    hornGain.gain.linearRampToValueAtTime(0.22, t + 0.6);
    hornGain.gain.linearRampToValueAtTime(0.16, t + 1.6);
    hornGain.gain.linearRampToValueAtTime(0, t + 2.6);
  }
  playHorn(1.2);
  const hornInterval = setInterval(() => playHorn(0), 26000);

  return () => {
    clearInterval(hornInterval);
    noise.stop();
    swell.stop();
    horn.stop();
    vibrato.stop();
    master.disconnect();
  };
}

export default function LoginBackground() {
  const [soundOn, setSoundOn] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      stopRef.current?.();
      audioCtxRef.current?.close();
    };
  }, []);

  async function enableSound() {
    if (!audioCtxRef.current) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") await ctx.resume();
    if (!stopRef.current) stopRef.current = startPortAmbience(ctx);
    setSoundOn(true);
  }

  function disableSound() {
    audioCtxRef.current?.suspend();
    setSoundOn(false);
  }

  return (
    <>
      <div className="pointer-events-none absolute inset-0 overflow-hidden wears-sea-bg">
        {/* Brillo de sol/luna reflejado sobre el mar */}
        <div
          className="wears-motion absolute left-1/2 top-[8%] h-64 w-64 -translate-x-1/2 rounded-full bg-wears-gold/40 blur-3xl animate-[wears-glow-pulse_7s_ease-in-out_infinite]"
        />
        {/* Destello horizontal como luz sobre el agua */}
        <div className="absolute inset-x-0 top-[18%] h-24 overflow-hidden opacity-70">
          <div className="wears-motion h-full w-full bg-gradient-to-r from-transparent via-white/25 to-transparent blur-2xl animate-[wears-shimmer_10s_ease-in-out_infinite]" />
        </div>

        {/* Foto de El Barco Wears, completa y centrada */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="wears-motion animate-[wears-kenburns_40s_ease-in-out_infinite_alternate]">
            <div className="wears-motion animate-[wears-sail_9s_ease-in-out_infinite]">
              <Image
                src="/brand/barco-wears.jpg"
                alt=""
                width={896}
                height={1195}
                className="h-[78vh] max-h-[820px] w-auto object-contain opacity-90 drop-shadow-[0_30px_60px_rgba(0,0,0,0.5)]"
                sizes="(max-width: 768px) 90vw, 700px"
                priority
              />
            </div>
          </div>
        </div>

        <div className="absolute inset-0 bg-gradient-to-b from-wears-black/35 via-transparent to-wears-black/55" />

        {/* Olas animadas al pie de la pantalla */}
        <div className="absolute inset-x-0 bottom-0 h-40 overflow-hidden">
          <svg
            className="wears-motion absolute bottom-0 h-24 w-[200%] animate-[wears-wave-drift_18s_linear_infinite]"
            viewBox="0 0 2400 200"
            preserveAspectRatio="none"
          >
            <path
              d="M0 100 C 200 40, 400 160, 600 100 S 1000 40, 1200 100 S 1600 160, 1800 100 S 2200 40, 2400 100 L2400 200 L0 200 Z"
              fill="#0b2b4a"
              fillOpacity="0.55"
            />
          </svg>
          <svg
            className="wears-motion absolute bottom-0 h-16 w-[200%] animate-[wears-wave-drift-rev_12s_linear_infinite]"
            viewBox="0 0 2400 200"
            preserveAspectRatio="none"
          >
            <path
              d="M0 120 C 250 60, 450 170, 700 120 S 1100 60, 1350 120 S 1750 170, 2000 120 S 2350 60, 2400 120 L2400 200 L0 200 Z"
              fill="#e8f4f6"
              fillOpacity="0.18"
            />
          </svg>
        </div>
      </div>

      <button
        type="button"
        onClick={() => (soundOn ? disableSound() : enableSound())}
        className="absolute right-4 top-4 z-10 flex items-center gap-2 rounded-full border border-wears-tan/30 bg-wears-black/60 px-3 py-1.5 text-xs text-wears-sand/80 backdrop-blur-sm transition hover:border-wears-gold hover:text-wears-gold"
      >
        {soundOn ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
        {soundOn ? "Sonido del puerto" : "Activar sonido"}
      </button>
    </>
  );
}
