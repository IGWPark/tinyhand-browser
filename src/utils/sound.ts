/**
 * Plays a short sound file. The audio context is created on first use, which
 * happens inside a click, so browsers allow it to start.
 */
export function createSound(url: string) {
  let context: AudioContext | undefined;
  let buffer: AudioBuffer | undefined;
  const bytes = fetch(url)
    .then((response) => response.arrayBuffer())
    .catch(() => undefined);

  function start() {
    if (!context || !buffer) return;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.start();
  }

  return {
    async play() {
      if (!context) {
        context = new AudioContext();
        const data = await bytes;
        if (data) buffer = await context.decodeAudioData(data.slice(0));
      }
      if (context.state === 'suspended') await context.resume();
      start();
    },
  };
}
