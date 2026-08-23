"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

/**
 * Sonido de olas de mar, sintetizado con Web Audio API — sin archivos de
 * audio. Dos capas: un fondo continuo de ruido marrón (la "respiración"
 * constante del mar) y ciclos de olas que se levantan, rompen y se
 * retiran sobre la arena, con tiempos ligeramente aleatorios entre cada
 * una para que no suene mecánico ni repetitivo.
 * Los navegadores bloquean el audio hasta el primer gesto del usuario,
 * por eso arranca solo cuando se hace click en el botón de sonido.
 */
function startPortAmbience(ctx: AudioContext) {
  const master = ctx.createGain();
  master.gain.value = 0.22;
  master.connect(ctx.destination);

  const bufferSize = 2 * ctx.sampleRate;

  // Fondo continuo: ruido marrón (integración de ruido blanco) filtrado
  // en paso-bajo, el murmullo constante del mar de fondo.
  const bedBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const bedData = bedBuffer.getChannelData(0);
  let lastOut = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    bedData[i] = (lastOut + 0.02 * white) / 1.02;
    lastOut = bedData[i];
    bedData[i] *= 3.2;
  }
  const bedNoise = ctx.createBufferSource();
  bedNoise.buffer = bedBuffer;
  bedNoise.loop = true;

  const bedFilter = ctx.createBiquadFilter();
  bedFilter.type = "lowpass";
  bedFilter.frequency.value = 400;

  const bedGain = ctx.createGain();
  bedGain.gain.value = 0.3;

  bedNoise.connect(bedFilter);
  bedFilter.connect(bedGain);
  bedGain.connect(master);
  bedNoise.start();

  // Olas que rompen: ruido blanco por un filtro pasabanda cuya frecuencia
  // y volumen suben (la ola se levanta), llegan a un pico (rompe) y bajan
  // (la espuma se retira). Se reprograma cada vez con duración distinta.
  const surfBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const surfData = surfBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) surfData[i] = Math.random() * 2 - 1;
  const surfNoise = ctx.createBufferSource();
  surfNoise.buffer = surfBuffer;
  surfNoise.loop = true;

  const surfFilter = ctx.createBiquadFilter();
  surfFilter.type = "bandpass";
  surfFilter.Q.value = 0.6;
  surfFilter.frequency.value = 400;

  const surfGain = ctx.createGain();
  surfGain.gain.value = 0.02;

  surfNoise.connect(surfFilter);
  surfFilter.connect(surfGain);
  surfGain.connect(master);
  surfNoise.start();

  let waveTimer: ReturnType<typeof setTimeout>;
  function scheduleWave() {
    const buildTime = 1.8 + Math.random() * 1.3;
    const breakTime = 0.35 + Math.random() * 0.3;
    const recedeTime = 2.3 + Math.random() * 1.6;
    const t0 = ctx.currentTime + 0.05;
    const tBreak = t0 + buildTime;
    const tCrest = tBreak + breakTime;
    const tEnd = tCrest + recedeTime;

    surfGain.gain.cancelScheduledValues(t0);
    surfFilter.frequency.cancelScheduledValues(t0);
    surfGain.gain.setValueAtTime(0.02, t0);
    surfGain.gain.linearRampToValueAtTime(0.42, tBreak);
    surfGain.gain.linearRampToValueAtTime(0.58, tCrest);
    surfGain.gain.exponentialRampToValueAtTime(0.015, tEnd);

    surfFilter.frequency.setValueAtTime(350, t0);
    surfFilter.frequency.linearRampToValueAtTime(1400, tBreak);
    surfFilter.frequency.linearRampToValueAtTime(2200, tCrest);
    surfFilter.frequency.exponentialRampToValueAtTime(300, tEnd);

    const totalMs = (tEnd - t0) * 1000;
    waveTimer = setTimeout(scheduleWave, totalMs * (0.75 + Math.random() * 0.3));
  }
  scheduleWave();

  return () => {
    clearTimeout(waveTimer);
    bedNoise.stop();
    surfNoise.stop();
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
        {/* Destello horizontal como luz sobre el agua */}
        <div className="absolute inset-x-0 top-[18%] h-24 overflow-hidden opacity-50">
          <div className="wears-motion h-full w-full bg-gradient-to-r from-transparent via-white/25 to-transparent blur-2xl animate-[wears-shimmer_10s_ease-in-out_infinite]" />
        </div>

        {/* Foto de El Barco Wears navegando, de fondo completo */}
        <div className="wears-motion absolute inset-0 animate-[wears-kenburns_40s_ease-in-out_infinite_alternate]">
          <div className="wears-motion absolute inset-0 animate-[wears-sail_9s_ease-in-out_infinite]">
            <Image
              src="/brand/barco-wears-mar.jpg"
              alt=""
              fill
              className="object-cover opacity-90"
              sizes="100vw"
              priority
            />
          </div>
        </div>

        <div className="absolute inset-0 bg-gradient-to-b from-wears-black/30 via-transparent to-wears-black/55" />

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
        {soundOn ? "Sonido del mar" : "Activar sonido"}
      </button>
    </>
  );
}
