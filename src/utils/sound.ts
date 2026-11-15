/**
 * Plays a short sound that ships inside the script as a data URL. Some sites
 * (YouTube, for one) block pages from loading extension files, so the sound is
 * never fetched. The audio context is created on first use, inside a click,
 * so browsers allow it to start.
 */
export function createSound(dataUrl: string) {
  let context: AudioContext | undefined;
  let buffer: AudioBuffer | undefined;

  return {
    async play() {
      try {
        if (!context) {
          context = new AudioContext();
          const bytes = Uint8Array.from(atob(dataUrl.slice(dataUrl.indexOf(',') + 1)), (c) =>
            c.charCodeAt(0),
          );
          buffer = await context.decodeAudioData(bytes.buffer);
        }
        if (context.state === 'suspended') await context.resume();
        if (!buffer) return;
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);
        source.start();
      } catch {
        // A missing tap sound is not worth an error.
      }
    },
  };
}
