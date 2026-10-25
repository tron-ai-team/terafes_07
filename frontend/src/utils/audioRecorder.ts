/**
 * Audio recording utility that records microphone audio and outputs standard
 * WAV (16-bit PCM, 16kHz mono) or WebM audio accepted by the TRON AI backend STT.
 */

export interface AudioRecordingResult {
  blob: Blob;
  durationSeconds: number;
}

export class TronAudioRecorder {
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioContext: AudioContext | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private inputNode: MediaStreamAudioSourceNode | null = null;
  private pcmSamples: Float32Array[] = [];
  private startTime = 0;
  private isRecording = false;

  async start(): Promise<MediaStream> {
    this.pcmSamples = [];
    this.audioChunks = [];
    this.isRecording = true;
    this.startTime = Date.now();

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });
    this.mediaStream = stream;

    // Set up PCM capture via AudioContext for exact 16-bit WAV encoding
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx({ sampleRate: 16000 });
      this.audioContext = ctx;
      const source = ctx.createMediaStreamSource(stream);
      this.inputNode = source;

      // Buffer size 4096, 1 input channel, 1 output channel
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      this.processorNode = processor;

      processor.onaudioprocess = (e) => {
        if (!this.isRecording) return;
        const inputData = e.inputBuffer.getChannelData(0);
        this.pcmSamples.push(new Float32Array(inputData));
      };

      source.connect(processor);
      processor.connect(ctx.destination);
    } catch {
      // Fallback to standard MediaRecorder
    }

    // Also run MediaRecorder in parallel as backup
    try {
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      this.mediaRecorder = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.audioChunks.push(e.data);
        }
      };
      recorder.start(250);
    } catch {
      // ignore
    }

    return stream;
  }

  async stop(): Promise<AudioRecordingResult> {
    this.isRecording = false;
    const durationSeconds = Math.max(0.1, (Date.now() - this.startTime) / 1000);

    // Stop MediaRecorder
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {
        // ignore
      }
    }

    // Stop AudioContext & nodes
    if (this.processorNode) {
      try {
        this.processorNode.disconnect();
      } catch {
        // ignore
      }
      this.processorNode = null;
    }
    if (this.inputNode) {
      try {
        this.inputNode.disconnect();
      } catch {
        // ignore
      }
      this.inputNode = null;
    }
    if (this.audioContext) {
      try {
        await this.audioContext.close();
      } catch {
        // ignore
      }
      this.audioContext = null;
    }

    // Stop MediaStream tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }

    // Build standard 16-bit 16kHz mono WAV from captured PCM samples if available
    if (this.pcmSamples.length > 0) {
      const totalLength = this.pcmSamples.reduce((acc, curr) => acc + curr.length, 0);
      const mergedSamples = new Float32Array(totalLength);
      let offset = 0;
      for (const chunk of this.pcmSamples) {
        mergedSamples.set(chunk, offset);
        offset += chunk.length;
      }
      const wavBlob = encodePcmToWav(mergedSamples, 16000);
      return {
        blob: wavBlob,
        durationSeconds,
      };
    }

    // Fallback to media recorder blob
    const fallbackBlob =
      this.audioChunks.length > 0
        ? new Blob(this.audioChunks, { type: this.mediaRecorder?.mimeType || 'audio/webm' })
        : new Blob([], { type: 'audio/wav' });

    return {
      blob: fallbackBlob,
      durationSeconds,
    };
  }

  release(): void {
    this.isRecording = false;
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.audioContext) {
      void this.audioContext.close();
      this.audioContext = null;
    }
  }
}

/**
 * Encodes 32-bit float audio samples into a standard 16-bit PCM RIFF WAV blob.
 */
function encodePcmToWav(samples: Float32Array, sampleRate = 16000): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // file length
  view.setUint32(4, 36 + samples.length * 2, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // format chunk identifier
  writeString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (1 = raw integer PCM)
  view.setUint16(20, 1, true);
  // channel count (1 = mono)
  view.setUint16(22, 1, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sampleRate * 1 channel * 2 bytes)
  view.setUint32(28, sampleRate * 2, true);
  // block align (1 * 2)
  view.setUint16(32, 2, true);
  // bits per sample (16 bit)
  view.setUint16(34, 16, true);
  // data chunk identifier
  writeString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, samples.length * 2, true);

  // Write 16-bit integer PCM samples
  let index = 44;
  for (let i = 0; i < samples.length; i++, index += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(index, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}
