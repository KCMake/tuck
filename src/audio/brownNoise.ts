interface Options {
  volume?: number;
  fadeInSeconds?: number;
  fadeOutMinutes?: number;
}

/**
 * Plays soft, generated brown noise: it fades in, then fades out to silence over
 * `fadeOutMinutes`. Nothing is downloaded, so it works offline. Returns a stop function.
 */
export function startBrownNoise(
  ctx: AudioContext,
  destination: AudioNode,
  { volume = 0.12, fadeInSeconds = 4, fadeOutMinutes = 10 }: Options = {},
): () => void {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    data[i] = last * 3.5;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const gain = ctx.createGain();
  const now = ctx.currentTime;
  const end = now + fadeInSeconds + fadeOutMinutes * 60;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + fadeInSeconds);
  gain.gain.linearRampToValueAtTime(0, end);

  source.connect(gain).connect(destination);
  source.start(now);
  source.stop(end + 1);

  return () => {
    try {
      source.stop();
    } catch {
      // Already stopped.
    }
  };
}
