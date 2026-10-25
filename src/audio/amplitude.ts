/**
 * Reads how loud the audio going through `analyser` is, as 0–1, smoothed so the
 * cartoon's mouth opens quickly and closes a little more slowly, like speech.
 * Call it once per animation frame.
 */
export function createMouthMeter(analyser: AnalyserNode): () => number {
  const samples = new Uint8Array(analyser.fftSize);
  let level = 0;
  return () => {
    analyser.getByteTimeDomainData(samples);
    let sum = 0;
    for (const s of samples) {
      const x = (s - 128) / 128;
      sum += x * x;
    }
    // Speech sits around 0.05–0.25 RMS; scale that up to the mouth's full range.
    const target = Math.min(1, Math.sqrt(sum / samples.length) * 4);
    level += (target - level) * (target > level ? 0.5 : 0.2);
    return level;
  };
}
