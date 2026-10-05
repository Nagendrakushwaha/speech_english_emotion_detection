// Cognivision Voice Intelligence - Browser Audio WAV Converter & PCM Encoder

export function resampleAudio(inputData, inSampleRate, outSampleRate = 16000) {
  if (inSampleRate === outSampleRate) return inputData;
  const ratio = inSampleRate / outSampleRate;
  const newLength = Math.round(inputData.length / ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const srcIndex = i * ratio;
    const i1 = Math.floor(srcIndex);
    const i2 = Math.min(i1 + 1, inputData.length - 1);
    const frac = srcIndex - i1;
    result[i] = inputData[i1] * (1 - frac) + inputData[i2] * frac;
  }
  return result;
}

export function encodeWav(samples, sampleRate = 16000) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  /* RIFF identifier */
  writeString(0, 'RIFF');
  /* file length */
  view.setUint32(4, 36 + samples.length * 2, true);
  /* RIFF type & format */
  writeString(8, 'WAVE');
  /* format chunk identifier */
  writeString(12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw PCM = 1) */
  view.setUint16(20, 1, true);
  /* channel count (mono = 1) */
  view.setUint16(22, 1, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sampleRate * channels * bytesPerSample) */
  view.setUint32(28, sampleRate * 2, true);
  /* block align (channels * bytesPerSample) */
  view.setUint16(32, 2, true);
  /* bits per sample */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  writeString(36, 'data');
  /* data chunk length */
  view.setUint32(40, samples.length * 2, true);

  // Write the 16-bit PCM samples with clipping protection
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([view], { type: 'audio/wav' });
}

/**
 * Decodes any browser-supported audio (WebM/Opus, OGG, MP3, AAC, WAV) using AudioContext
 * and encodes it to a canonical, standard 16-bit 16kHz PCM WAV File.
 */
export async function convertBlobToWavFile(blobOrFile, fileName = 'recording.wav', targetSampleRate = 16000) {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  try {
    const arrayBuffer = await blobOrFile.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    // Mixdown to single mono channel
    const numChannels = audioBuffer.numberOfChannels;
    let monoData;
    if (numChannels === 1) {
      monoData = audioBuffer.getChannelData(0);
    } else {
      const ch0 = audioBuffer.getChannelData(0);
      const ch1 = audioBuffer.getChannelData(1);
      monoData = new Float32Array(ch0.length);
      for (let i = 0; i < ch0.length; i++) {
        monoData[i] = (ch0[i] + ch1[i]) / 2.0;
      }
    }

    // Resample to 16,000 Hz for optimal ML inference
    const resampled = resampleAudio(monoData, audioBuffer.sampleRate, targetSampleRate);
    const wavBlob = encodeWav(resampled, targetSampleRate);

    const safeName = fileName.replace(/\.[^/.]+$/, '') + '.wav';
    return new File([wavBlob], safeName, { type: 'audio/wav' });
  } finally {
    if (audioCtx.state !== 'closed') {
      audioCtx.close().catch(() => {});
    }
  }
}
