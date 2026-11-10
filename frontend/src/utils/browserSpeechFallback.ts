/**
 * Browser Web Speech API fallback when server-side TTS is unavailable.
 * Labeled clearly so users know this is not VOICEVOX / Groq Orpheus audio.
 */

export const BROWSER_SPEECH_FALLBACK_LABEL_EN =
  'Browser speech (fallback) — server TTS unavailable for this language.';

export const BROWSER_SPEECH_FALLBACK_LABEL_JA =
  'ブラウザ音声（フォールバック）— サーバーTTSはこの言語で利用できません。';

export function browserSpeechFallbackLabel(uiLanguage: string): string {
  return uiLanguage === 'ja' ? BROWSER_SPEECH_FALLBACK_LABEL_JA : BROWSER_SPEECH_FALLBACK_LABEL_EN;
}

export function isBrowserSpeechSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined';
}

/**
 * Speak text with the browser SpeechSynthesis API.
 * Resolves when utterance ends or is cancelled / errors.
 */
export function speakWithBrowserFallback(text: string, language: string): Promise<void> {
  const spoken = (text || '').replace(/\s+/g, ' ').trim();
  if (!spoken) {
    return Promise.resolve();
  }
  if (!isBrowserSpeechSupported()) {
    return Promise.reject(new Error('Browser speech synthesis is not supported in this browser'));
  }

  return new Promise((resolve, reject) => {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(spoken);
      utterance.lang = mapLanguageToBcp47(language);
      utterance.rate = 1.0;
      utterance.onend = () => resolve();
      utterance.onerror = (event) => {
        // 'interrupted' / 'canceled' are expected when stopping for a new turn
        const err = (event as SpeechSynthesisErrorEvent).error;
        if (err === 'interrupted' || err === 'canceled') {
          resolve();
          return;
        }
        reject(new Error(`Browser speech failed: ${err || 'unknown'}`));
      };
      window.speechSynthesis.speak(utterance);
    } catch (err: any) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

export function stopBrowserSpeechFallback(): void {
  if (isBrowserSpeechSupported()) {
    window.speechSynthesis.cancel();
  }
}

function mapLanguageToBcp47(language: string): string {
  const code = (language || 'en').trim().toLowerCase();
  switch (code) {
    case 'ja':
    case 'jp':
    case 'japanese':
      return 'ja-JP';
    case 'en':
    case 'english':
      return 'en-US';
    case 'bn':
      return 'bn-BD';
    case 'ne':
      return 'ne-NP';
    case 'my':
      return 'my-MM';
    case 'si':
      return 'si-LK';
    default:
      return code.length === 2 ? `${code}-${code.toUpperCase()}` : code;
  }
}
