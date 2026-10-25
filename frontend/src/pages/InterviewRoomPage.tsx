import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { TronLogo } from '../components/common/TronLogo';
import { HUDCircle } from '../components/common/HUDCircle';
import { GlassCard } from '../components/common/GlassCard';
import { AiProfileSelector } from '../components/common/AiProfileSelector';
import { tronApi } from '../services/api';
import { TronAudioRecorder } from '../utils/audioRecorder';
import {
  AIInterviewerState,
  InterviewConfig,
  InterviewMode,
  InterviewQuestion,
  TranscriptMessage,
} from '../types/interview';
import {
  Mic,
  MicOff,
  Square,
  Send,
  Volume2,
  VolumeX,
  Clock,
  ChevronDown,
  ChevronUp,
  Pause,
  Play,
  LogOut,
  Languages,
  Loader2,
  Radio,
  Hand,
  Sparkles,
} from 'lucide-react';

// VAD Configuration for Japanese Interview Auto Mode (Dynamic Baseline)
// These are MARGINS above/below the measured ambient noise floor, not absolute values.
const VAD_SPEECH_MARGIN    = 12;   // energy must be baseline + this to count as speech
const VAD_SILENCE_MARGIN   = 5;    // energy must be below baseline + this to count as silence
const VAD_BASELINE_FRAMES  = 35;   // number of frames to sample ambient noise on mic open
const VAD_SILENCE_MS       = 1800; // 1.8s of silence-level energy after speech → auto-submit
const VAD_MIN_SPEECH_MS    = 800;  // minimum speech duration before silence can trigger submit
const VAD_MAX_UTTERANCE_MS = 50000;// hard fallback: auto-submit after 50s of real speech

export const InterviewRoomPage: React.FC = () => {
  const navigate = useNavigate();
  const { interviewConfig, setLastAnalysis, addToast, uiLanguage } = useApp();

  // Mode: Auto (Hands-free VAD) or Manual
  const [interviewMode, setInterviewMode] = useState<InterviewMode>(interviewConfig.mode || 'auto');

  // AI State
  const [aiState, setAiState] = useState<AIInterviewerState>('thinking');
  const [statusMessage, setStatusMessage] = useState(
    uiLanguage === 'ja' ? 'AI面接を準備しています...' : 'Preparing AI interview...'
  );
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState(false);

  // Questions and Session State
  const [interviewId, setInterviewId] = useState('');
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [activeQuestionText, setActiveQuestionText] = useState('');
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [showEnglishTranslation, setShowEnglishTranslation] = useState(false);
  const [showTranscriptPanel, setShowTranscriptPanel] = useState(true);

  // Audio & Microphone State
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeechDetected, setIsSpeechDetected] = useState(false);
  const [silenceCountdown, setSilenceCountdown] = useState<number | null>(null);
  const [audioMeterLevels, setAudioMeterLevels] = useState<number[]>([15, 25, 40, 20, 30, 50, 25, 35]);
  const [userAnswerText, setUserAnswerText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);

  // Timer & Session Controls
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  // Refs
  const audioRecorderRef = useRef<TronAudioRecorder | null>(null);
  const currentSpeechAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastRecordedBlobRef = useRef<Blob | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const transcriptScrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<any>(null);
  const restartTimerRef = useRef<any>(null);

  // Lifecycle & Session Refs
  const hasInitializedRef = useRef(false);
  const isMountedRef = useRef(true);
  const isSessionActiveRef = useRef(true);
  const isFinishedRef = useRef(false);
  const interviewIdRef = useRef('');
  const currentQIndexRef = useRef(0);
  const audioPlayGenRef = useRef(0);

  // VAD Refs
  const interviewModeRef = useRef<InterviewMode>(interviewMode);
  const isRecordingRef = useRef(false);
  const isSubmittingRef = useRef(false);
  const hasSpokenRef = useRef(false);
  const speechStartTimeRef = useRef(0);
  const silenceStartTimeRef = useRef<number | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);

  // Dynamic VAD baseline refs
  const vadNoiseFloorRef = useRef(0);       // measured ambient energy (mean during calibration)
  const vadBaselineReadyRef = useRef(false); // true after VAD_BASELINE_FRAMES sampled
  const vadBaselineSamplesRef = useRef<number[]>([]); // accumulation buffer
  const vadSpeechThreshRef = useRef(VAD_SPEECH_MARGIN);  // baseline + margin (updated after calib)
  const vadSilenceThreshRef = useRef(0);    // baseline + silence margin (updated after calib)
  const maxUtteranceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    interviewModeRef.current = interviewMode;
  }, [interviewMode]);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  const resetVad = () => {
    hasSpokenRef.current = false;
    speechStartTimeRef.current = 0;
    silenceStartTimeRef.current = null;
    setIsSpeechDetected(false);
    setSilenceCountdown(null);
    // Reset dynamic baseline state
    vadNoiseFloorRef.current = 0;
    vadBaselineReadyRef.current = false;
    vadBaselineSamplesRef.current = [];
    vadSpeechThreshRef.current = VAD_SPEECH_MARGIN;
    vadSilenceThreshRef.current = 0;
    // Clear max-utterance safety timer
    if (maxUtteranceTimerRef.current) {
      clearTimeout(maxUtteranceTimerRef.current);
      maxUtteranceTimerRef.current = null;
    }
  };

  /**
   * Synthesize and play Japanese interviewer's question using VOICEVOX
   * Used for initial opening question and manual mode follow-up questions
   */
  const playAiVoice = useCallback(async (text: string, isInitialQuestion: boolean = false) => {
    // Prevent mic from recording while AI is speaking
    if (isRecordingRef.current) {
      void stopAudioRecordingOnly();
    }

    if (currentSpeechAudioRef.current) {
      currentSpeechAudioRef.current.onended = null;
      currentSpeechAudioRef.current.onerror = null;
      currentSpeechAudioRef.current.pause();
      currentSpeechAudioRef.current = null;
    }
    const currentGen = ++audioPlayGenRef.current;

    if (audioMuted || !text) {
      setAiState('idle');
      setStatusMessage('Waiting for candidate response...');
      if (interviewModeRef.current === 'auto' && isSessionActiveRef.current && !isFinishedRef.current) {
        void startAudioRecording();
      }
      return;
    }

    setAiState('thinking');
    setStatusMessage(
      uiLanguage === 'ja'
        ? 'TRON AIが音声を準備しています...'
        : 'TRON AI is preparing speech with VOICEVOX...'
    );

    try {
      const url = await tronApi.synthesizeSpeech(text);
      if (audioPlayGenRef.current !== currentGen || !isSessionActiveRef.current || isFinishedRef.current) {
        return;
      }

      const audio = new Audio(url);
      currentSpeechAudioRef.current = audio;

      audio.onended = () => {
        if (currentSpeechAudioRef.current === audio) {
          currentSpeechAudioRef.current = null;
        }
        if (audioPlayGenRef.current !== currentGen) return;
        if (!isSessionActiveRef.current || isFinishedRef.current) return;

        setAiState('idle');
        setStatusMessage('Waiting for candidate response...');

        // In Auto Mode, automatically open microphone after AI finishes asking question
        if (interviewModeRef.current === 'auto') {
          void startAudioRecording();
        }
      };

      audio.onerror = (err) => {
        console.warn('Audio playback error:', err);
        if (currentSpeechAudioRef.current === audio) {
          currentSpeechAudioRef.current = null;
        }
        if (audioPlayGenRef.current !== currentGen) return;
        if (!isSessionActiveRef.current || isFinishedRef.current) return;

        setAiState('idle');
        setStatusMessage('Waiting for candidate response...');
        if (interviewModeRef.current === 'auto') {
          void startAudioRecording();
        }
      };

      try {
        await audio.play();
        if (audioPlayGenRef.current !== currentGen) return;
        setAiState('speaking');
        setStatusMessage(
          uiLanguage === 'ja'
            ? 'TRON AIが質問を話しています...'
            : 'TRON AI is speaking with VOICEVOX...'
        );
        setIsAutoplayBlocked(false);
      } catch (playErr: any) {
        console.warn('audio.play() rejected (autoplay or browser restriction):', playErr);
        if (audioPlayGenRef.current !== currentGen) return;

        // Browser blocked unprompted audio autoplay (TASK 3)
        setIsAutoplayBlocked(true);
        setAiState('idle');
        setStatusMessage(
          uiLanguage === 'ja'
            ? '「面接を開始」をクリックして質問の音声を再生してください'
            : 'Click "Start Interview" to enable audio playback'
        );
        // Do NOT automatically open mic yet; wait for human click to hear Question 1!
      }
    } catch (synthErr: any) {
      console.warn('Speech synthesis failed:', synthErr);
      if (audioPlayGenRef.current !== currentGen) return;
      setAiState('idle');
      setStatusMessage('Audio synthesis unavailable. You may speak or type your answer.');
      if (interviewModeRef.current === 'auto' && isSessionActiveRef.current && !isFinishedRef.current) {
        void startAudioRecording();
      }
    }
  }, [audioMuted, uiLanguage]);

  /**
   * User-gesture fallback handler when browser autoplay blocks opening question audio (TASK 3)
   */
  const handleStartOpeningAudio = async () => {
    setIsAutoplayBlocked(false);
    const audio = currentSpeechAudioRef.current;
    if (audio) {
      try {
        setAiState('speaking');
        setStatusMessage(
          uiLanguage === 'ja'
            ? 'TRON AIが質問を話しています...'
            : 'TRON AI is speaking with VOICEVOX...'
        );
        await audio.play();
        return;
      } catch (err) {
        console.warn('Opening audio play retry failed:', err);
      }
    }

    const textToPlay = activeQuestionText || questions[0]?.textJa || '';
    if (textToPlay) {
      void playAiVoice(textToPlay, false);
    }
  };

  /**
   * Play backend-synthesized audio directly from returned audio_url (TASK 5 & 7)
   * Avoids calling /demo/voice/speak again to prevent double-speaking
   */
  const playReturnedAudio = useCallback((audioUrl: string) => {
    // Prevent mic from recording while AI is speaking
    if (isRecordingRef.current) {
      void stopAudioRecordingOnly();
    }

    if (currentSpeechAudioRef.current) {
      currentSpeechAudioRef.current.onended = null;
      currentSpeechAudioRef.current.onerror = null;
      currentSpeechAudioRef.current.pause();
      currentSpeechAudioRef.current = null;
    }
    const currentGen = ++audioPlayGenRef.current;

    if (audioMuted || !audioUrl) {
      setAiState('idle');
      setStatusMessage('Waiting for candidate response...');
      if (interviewModeRef.current === 'auto' && isSessionActiveRef.current && !isFinishedRef.current) {
        void startAudioRecording();
      }
      return;
    }

    setAiState('thinking');
    setStatusMessage('Loading next question audio...');

    const resolvedUrl = tronApi.resolveAudioUrl(audioUrl);
    const audio = new Audio(resolvedUrl);
    currentSpeechAudioRef.current = audio;

    audio.onended = () => {
      if (currentSpeechAudioRef.current === audio) {
        currentSpeechAudioRef.current = null;
      }
      if (audioPlayGenRef.current !== currentGen) return;
      if (!isSessionActiveRef.current || isFinishedRef.current) return;

      setAiState('idle');
      setStatusMessage('Waiting for candidate response...');

      // In Auto Mode, automatically open microphone after AI finishes asking question
      if (interviewModeRef.current === 'auto') {
        void startAudioRecording();
      }
    };

    audio.onerror = (err) => {
      console.warn('Returned audio error:', err);
      if (currentSpeechAudioRef.current === audio) {
        currentSpeechAudioRef.current = null;
      }
      if (audioPlayGenRef.current !== currentGen) return;
      if (!isSessionActiveRef.current || isFinishedRef.current) return;

      setAiState('idle');
      setStatusMessage('Waiting for candidate response...');
      if (interviewModeRef.current === 'auto') {
        void startAudioRecording();
      }
    };

    audio.play().then(() => {
      if (audioPlayGenRef.current !== currentGen) return;
      setAiState('speaking');
      setStatusMessage(
        uiLanguage === 'ja'
          ? 'TRON AIが質問を話しています...'
          : 'TRON AI is speaking with VOICEVOX...'
      );
    }).catch((playErr) => {
      console.warn('playReturnedAudio play failed:', playErr);
      if (audioPlayGenRef.current !== currentGen) return;
      setAiState('idle');
      setStatusMessage('Waiting for candidate response...');
      if (interviewModeRef.current === 'auto' && isSessionActiveRef.current && !isFinishedRef.current) {
        void startAudioRecording();
      }
    });
  }, [audioMuted, uiLanguage]);

  // Initialize Session
  useEffect(() => {
    isMountedRef.current = true;
    isSessionActiveRef.current = true;

    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;
    isFinishedRef.current = false;

    async function init() {
      try {
        setAiState('thinking');
        setStatusMessage(
          uiLanguage === 'ja' ? 'AI面接を初期化しています...' : 'Initializing AI interview...'
        );

        const session = await tronApi.startInterview(interviewConfig);
        if (!isMountedRef.current) return;

        setInterviewId(session.interviewId);
        interviewIdRef.current = session.interviewId;

        setQuestions(session.questions);

        setCurrentQIndex(0);
        currentQIndexRef.current = 0;

        setTranscript(session.transcript);

        const initialQ = session.transcript[0]?.text || session.questions[0]?.textJa || '';
        setActiveQuestionText(initialQ);

        // Synthesize and play initial question
        void playAiVoice(initialQ, true);
      } catch (err: any) {
        if (!isMountedRef.current) return;
        setAiState('error');
        setStatusMessage('AI Backend connection error');
        addToast(
          uiLanguage === 'ja'
            ? `面接の初期化に失敗しました: ${err?.message || 'バックエンドオフライン'}`
            : `Failed to initialize interview: ${err?.message || 'Backend offline'}`,
          'error'
        );
      }
    }

    void init();

    return () => {
      isMountedRef.current = false;
      isSessionActiveRef.current = false;
      cleanupAudioSession();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Elapsed Time Counter
  useEffect(() => {
    if (!isPaused) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isPaused]);

  // Scroll transcript to bottom
  useEffect(() => {
    transcriptScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript.length, isSubmitting]);

  /**
   * Web Audio Analyser setup with DYNAMIC BASELINE VAD for Japanese Interview (Mission 08D)
   *
   * Phase 1 — Calibration (first VAD_BASELINE_FRAMES frames):
   *   Samples ambient room energy to build a noise-floor baseline.
   *   Speech/silence thresholds are computed relative to that baseline.
   *
   * Phase 2 — Detection:
   *   Speech  : energy >= vadSpeechThreshRef  (baseline + VAD_SPEECH_MARGIN)
   *   Silence : energy <  vadSilenceThreshRef (baseline + VAD_SILENCE_MARGIN)
   *   Submit  : VAD_SILENCE_MS of silence-level energy after ≥ VAD_MIN_SPEECH_MS of speech
   *
   * Safety fallback: VAD_MAX_UTTERANCE_MS timer arms when speech first detected.
   */
  const setupInterviewMeterAndVad = (stream: MediaStream) => {
    try {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (audioContextRef.current) {
        void audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateMeterAndVad = () => {
        if (!analyserRef.current || !isRecordingRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);

        // Waveform bars (visual meter)
        const normalized = Array.from(dataArray.slice(0, 8)).map((v) =>
          Math.max(12, Math.min(100, Math.round((v / 255) * 100)))
        );
        setAudioMeterLevels(normalized);

        // VAD Analysis in Auto Mode only
        if (interviewModeRef.current !== 'auto' || isSubmittingRef.current) {
          animationFrameRef.current = requestAnimationFrame(updateMeterAndVad);
          return;
        }

        // Compute energy over voice-frequency bins (bins 1-17 ≈ 300 Hz – 2.7 kHz for fftSize=64)
        const voiceBins = dataArray.slice(1, 18);
        let sum = 0;
        for (let i = 0; i < voiceBins.length; i++) sum += voiceBins[i];
        const energy = sum / voiceBins.length;
        const now = Date.now();

        // ── Phase 1: Calibration (sample ambient noise floor) ──────────────────
        if (!vadBaselineReadyRef.current) {
          vadBaselineSamplesRef.current.push(energy);
          if (vadBaselineSamplesRef.current.length >= VAD_BASELINE_FRAMES) {
            const samples = vadBaselineSamplesRef.current;
            // Use median rather than mean to be robust against transient noise spikes
            const sorted = [...samples].sort((a, b) => a - b);
            const median = sorted[Math.floor(sorted.length / 2)];
            vadNoiseFloorRef.current    = median;
            vadSpeechThreshRef.current  = median + VAD_SPEECH_MARGIN;
            vadSilenceThreshRef.current = median + VAD_SILENCE_MARGIN;
            vadBaselineReadyRef.current = true;
            console.debug(
              `[VAD] Baseline ready — floor: ${median.toFixed(1)},`,
              `speech>: ${vadSpeechThreshRef.current.toFixed(1)},`,
              `silence<: ${vadSilenceThreshRef.current.toFixed(1)}`
            );
          }
          // During calibration, show the mic as active but don't trigger VAD yet
          animationFrameRef.current = requestAnimationFrame(updateMeterAndVad);
          return;
        }

        // ── Phase 2: Dynamic VAD detection ─────────────────────────────────────
        const isSpeech  = energy >= vadSpeechThreshRef.current;
        const isSilence = energy <  vadSilenceThreshRef.current;

        if (isSpeech) {
          // Speech detected
          if (!hasSpokenRef.current) {
            hasSpokenRef.current = true;
            speechStartTimeRef.current = now;
            setIsSpeechDetected(true);

            // Arm max-utterance safety fallback
            if (maxUtteranceTimerRef.current) clearTimeout(maxUtteranceTimerRef.current);
            maxUtteranceTimerRef.current = setTimeout(() => {
              if (!isSubmittingRef.current && isRecordingRef.current && hasSpokenRef.current) {
                console.warn('[VAD] Max utterance timeout reached — auto-submitting');
                resetVad();
                void handleAutoTriggerSubmit();
              }
            }, VAD_MAX_UTTERANCE_MS);
          }
          // Voice is active — reset silence timer
          silenceStartTimeRef.current = null;
          setSilenceCountdown(null);
        } else if (hasSpokenRef.current) {
          // Was speaking; now energy has dropped
          const speechDuration = now - speechStartTimeRef.current;

          if (speechDuration >= VAD_MIN_SPEECH_MS) {
            if (isSilence) {
              // Energy is below the silence threshold — start/continue silence timer
              if (silenceStartTimeRef.current === null) {
                silenceStartTimeRef.current = now;
              }
              const silenceElapsed = now - silenceStartTimeRef.current;
              const remainingSec = Math.max(0, Math.ceil((VAD_SILENCE_MS - silenceElapsed) / 1000));
              setSilenceCountdown(remainingSec);

              if (silenceElapsed >= VAD_SILENCE_MS) {
                // ✅ Candidate has finished speaking — submit!
                console.debug('[VAD] Silence timeout reached — auto-submitting');
                resetVad();
                void handleAutoTriggerSubmit();
                return;
              }
            } else {
              // Energy is between silence threshold and speech threshold (mid-range)
              // Could be a natural short Japanese pause — do NOT reset silence if already started,
              // but DO allow it to continue accumulating silence duration.
              // Only reset the silence timer if energy rises back to speech level (handled by isSpeech branch above).
              if (silenceStartTimeRef.current === null) {
                // First frame in mid-range after speech — start the silence timer conservatively
                silenceStartTimeRef.current = now;
              }
              const silenceElapsed = now - silenceStartTimeRef.current;
              const remainingSec = Math.max(0, Math.ceil((VAD_SILENCE_MS - silenceElapsed) / 1000));
              setSilenceCountdown(remainingSec);

              if (silenceElapsed >= VAD_SILENCE_MS) {
                console.debug('[VAD] Mid-range silence timeout — auto-submitting');
                resetVad();
                void handleAutoTriggerSubmit();
                return;
              }
            }
          }
        }

        animationFrameRef.current = requestAnimationFrame(updateMeterAndVad);
      };

      updateMeterAndVad();
    } catch {
      // ignore
    }
  };

  /**
   * Start microphone recording
   */
  const startAudioRecording = async () => {
    if (!isSessionActiveRef.current || isFinishedRef.current) return;

    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    try {
      if (currentSpeechAudioRef.current) {
        currentSpeechAudioRef.current.onended = null;
        currentSpeechAudioRef.current.onerror = null;
        currentSpeechAudioRef.current.pause();
        currentSpeechAudioRef.current = null;
      }

      resetVad();
      isSubmittingRef.current = false;

      const recorder = new TronAudioRecorder();
      audioRecorderRef.current = recorder;
      const stream = await recorder.start();
      activeStreamRef.current = stream;

      setIsRecording(true);
      isRecordingRef.current = true;
      setAiState('listening');
      setStatusMessage('Listening to candidate response in Japanese...');

      setupInterviewMeterAndVad(stream);

      if (interviewModeRef.current === 'manual') {
        addToast(
          uiLanguage === 'ja'
            ? 'マイク録音中。回答を話してください。'
            : 'Microphone active. Speak your answer clearly.',
          'info'
        );
      }
    } catch (_err) {
      setIsRecording(false);
      isRecordingRef.current = false;
      addToast(
        uiLanguage === 'ja'
          ? 'マイクへのアクセスが許可されませんでした。テキストで回答を入力できます。'
          : 'Microphone permission denied. You can type your answer below.',
        'warning'
      );
    }
  };

  /**
   * Stop audio recording without submitting (helper)
   */
  const stopAudioRecordingOnly = async () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      void audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((t) => t.stop());
      activeStreamRef.current = null;
    }
    if (audioRecorderRef.current) {
      try {
        const { blob } = await audioRecorderRef.current.stop();
        lastRecordedBlobRef.current = blob;
      } catch {
        // ignore
      }
      audioRecorderRef.current = null;
    }
    setIsRecording(false);
    isRecordingRef.current = false;
  };

  /**
   * Stop audio recording and transcribe with Whisper (PRESERVED FOR MANUAL MODE)
   */
  const stopAudioRecording = async (): Promise<string> => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      void audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    if (!audioRecorderRef.current || !isRecordingRef.current) {
      setIsRecording(false);
      isRecordingRef.current = false;
      return '';
    }

    setIsRecording(false);
    isRecordingRef.current = false;
    setAudioMeterLevels([15, 25, 40, 20, 30, 50, 25, 35]);
    setStatusMessage('Transcribing microphone audio with Whisper...');
    setAiState('thinking');

    try {
      const { blob } = await audioRecorderRef.current.stop();
      audioRecorderRef.current = null;
      lastRecordedBlobRef.current = blob;

      // Send actual audio blob to backend STT (Manual Mode transcription only)
      const turnRes = await tronApi.submitVoiceTurn(blob, undefined, 'ja');
      if (turnRes.transcript) {
        setUserAnswerText(turnRes.transcript);
        addToast(
          uiLanguage === 'ja'
            ? `音声認識完了: 「${turnRes.transcript.slice(0, 30)}...」`
            : `Transcribed: "${turnRes.transcript.slice(0, 30)}..."`,
          'success'
        );
        return turnRes.transcript;
      }
      return '';
    } catch (err: any) {
      addToast(
        uiLanguage === 'ja'
          ? '音声を認識できませんでした。テキストで回答を入力または再録音してください。'
          : 'Could not transcribe speech. Please type your answer or retry recording.',
        'warning'
      );
      return '';
    } finally {
      setAiState('idle');
      setStatusMessage('Waiting for candidate response...');
    }
  };

  /**
   * Auto VAD trigger: stops recording and submits audio directly to /voice-answer ONCE (TASK 4)
   */
  const handleAutoTriggerSubmit = async () => {
    if (isSubmittingRef.current || !isSessionActiveRef.current || isFinishedRef.current) return;
    isSubmittingRef.current = true;

    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      void audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((t) => t.stop());
      activeStreamRef.current = null;
    }

    let audioBlob: Blob | null = null;
    if (audioRecorderRef.current) {
      try {
        const res = await audioRecorderRef.current.stop();
        audioBlob = res.blob;
        lastRecordedBlobRef.current = res.blob;
      } catch {
        // ignore
      }
      audioRecorderRef.current = null;
    }

    setIsRecording(false);
    isRecordingRef.current = false;
    setAudioMeterLevels([15, 25, 40, 20, 30, 50, 25, 35]);

    if (!audioBlob) {
      isSubmittingRef.current = false;
      if (interviewModeRef.current === 'auto' && isSessionActiveRef.current && !isFinishedRef.current) {
        void startAudioRecording();
      }
      return;
    }

    setIsSubmitting(true);
    setAiState('thinking');
    setStatusMessage('TRON AI is processing voice answer with qwen3:8b...');

    const currentSessionId = interviewIdRef.current;
    const qIndex = currentQIndexRef.current;

    try {
      // POST recorded audio to /voice-answer ONCE (TASK 4)
      const response = await tronApi.submitInterviewVoiceAnswer(currentSessionId, audioBlob, qIndex);

      // Verify session did not change or unmount while waiting
      if (!isMountedRef.current || !isSessionActiveRef.current || interviewIdRef.current !== currentSessionId) {
        return;
      }

      // Append candidate transcript to visible interview transcript
      const userMsg: TranscriptMessage = {
        id: 'usr-' + Date.now(),
        sender: 'user',
        text: response.transcript || '(Speech recorded)',
        timestamp: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
      };

      if (response.isFinished) {
        // TASK 8: Finished Interview
        isFinishedRef.current = true;
        setTranscript((prev) => [...prev, userMsg]);
        setIsSubmitting(false);
        isSubmittingRef.current = false;
        setAiState('speaking');
        setStatusMessage('Interview completed! Retrieving qualitative evaluation...');
        addToast(
          uiLanguage === 'ja'
            ? '全質問が終了しました！AI面接評価を取得しています...'
            : 'All questions answered! Preparing performance analysis...',
          'success'
        );

        try {
          const analysis = await tronApi.getInterviewAnalysis(
            currentSessionId,
            interviewConfig,
            [...transcript, userMsg]
          );
          setLastAnalysis(analysis);
          navigate('/interview/feedback');
        } catch (err: any) {
          addToast(`Evaluation error: ${err?.message}`, 'error');
        }
      } else {
        // Follow-up question
        const aiMsg: TranscriptMessage = {
          id: 'ai-' + Date.now(),
          sender: 'ai',
          text: response.nextQuestionText,
          timestamp: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
          isFollowUp: true,
        };
        setTranscript((prev) => [...prev, userMsg, aiMsg]);

        // Server-authoritative nextQuestionIndex and nextQuestionText (TASK 2 & 7)
        const nextIdx = response.nextQuestionIndex;
        currentQIndexRef.current = nextIdx;
        setCurrentQIndex(nextIdx);

        const nextText = response.nextQuestionText;
        setActiveQuestionText(nextText);
        setQuestions((prev) =>
          prev.map((q, idx) => (idx === nextIdx ? { ...q, textJa: nextText } : q))
        );

        setIsSubmitting(false);
        isSubmittingRef.current = false;

        // TASK 5: Play returned audio_url directly (do NOT double-speak)
        if (response.audio_url) {
          playReturnedAudio(response.audio_url);
        } else {
          void playAiVoice(nextText);
        }
      }
    } catch (err: any) {
      setIsSubmitting(false);
      isSubmittingRef.current = false;

      // TASK 10: HTTP 409 handling
      if (err?.status === 409 || (typeof err?.message === 'string' && err.message.includes('409'))) {
        setAiState('idle');
        setStatusMessage('Turn synchronization notice.');
        addToast(
          uiLanguage === 'ja'
            ? '質問ターンの不整合が検出されました (HTTP 409)。現在の面接状態を維持します。'
            : 'Turn conflict detected (HTTP 409). Preserving interview state.',
          'warning'
        );
        // Do NOT automatically resend, keep mic stopped temporarily, preserve current state
        return;
      }

      setAiState('error');
      setStatusMessage('Error submitting voice answer. Please retry.');
      addToast(err?.message || 'Connection error. Please try again.', 'error');

      // In Auto mode, allow retry after delay
      if (interviewModeRef.current === 'auto' && isSessionActiveRef.current && !isFinishedRef.current) {
        restartTimerRef.current = setTimeout(() => {
          if (interviewModeRef.current === 'auto' && isSessionActiveRef.current && !isFinishedRef.current) {
            void startAudioRecording();
          }
        }, 3000);
      }
    }
  };

  /**
   * Common answer submission logic for Manual Mode
   */
  const executeAnswerSubmission = async (textToSubmit: string) => {
    if (isSubmittingRef.current || !isSessionActiveRef.current || isFinishedRef.current) return;
    isSubmittingRef.current = true;

    setUserAnswerText('');
    setIsSubmitting(true);
    setAiState('thinking');
    setStatusMessage('TRON AI is analyzing your answer with qwen3:8b...');

    const currentSessionId = interviewIdRef.current;
    const qIndex = currentQIndexRef.current;

    try {
      const response = await tronApi.submitAnswer(
        currentSessionId,
        qIndex,
        questions.length || 5,
        textToSubmit,
        lastRecordedBlobRef.current || undefined
      );

      // Append candidate & AI messages to transcript
      setTranscript((prev) => [...prev, response.userMessage, response.aiFollowUpMessage]);
      setIsSubmitting(false);
      isSubmittingRef.current = false;

      if (response.isFinished) {
        isFinishedRef.current = true;
        setAiState('speaking');
        setStatusMessage('Interview completed! Retrieving qualitative evaluation...');
        addToast(
          uiLanguage === 'ja'
            ? '全質問が終了しました！AI面接評価を取得しています...'
            : 'All questions answered! Preparing performance analysis...',
          'success'
        );

        setTimeout(async () => {
          try {
            const analysis = await tronApi.getInterviewAnalysis(
              currentSessionId,
              interviewConfig,
              [...transcript, response.userMessage, response.aiFollowUpMessage]
            );
            setLastAnalysis(analysis);
            navigate('/interview/feedback');
          } catch (err: any) {
            addToast(`Evaluation error: ${err?.message}`, 'error');
          }
        }, 1500);
      } else {
        const nextIdx = response.nextQuestionIndex;
        currentQIndexRef.current = nextIdx;
        setCurrentQIndex(nextIdx);

        const nextQuestionText = response.aiFollowUpMessage.text;
        setActiveQuestionText(nextQuestionText);

        // Update Question card text in state
        setQuestions((prev) =>
          prev.map((q, idx) => (idx === nextIdx ? { ...q, textJa: nextQuestionText } : q))
        );

        // In Manual Mode, synthesize and play next question voice
        void playAiVoice(nextQuestionText);
      }
    } catch (err: any) {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
      setAiState('error');
      setStatusMessage('Error submitting answer. Please retry.');
      addToast(err?.message || 'Connection error. Please try again.', 'error');
    }
  };

  /**
   * Manual submission handler (button click or Enter key)
   */
  const handleSubmitAnswer = async () => {
    if (isRecording) {
      const transcribed = await stopAudioRecording();
      const textToSubmit = transcribed.trim() || userAnswerText.trim();
      if (!textToSubmit) {
        addToast(
          uiLanguage === 'ja'
            ? '回答内容を入力するか、マイクで話してから送信してください。'
            : 'Please enter or speak your answer before submitting.',
          'warning'
        );
        return;
      }
      await executeAnswerSubmission(textToSubmit);
      return;
    }

    const textToSubmit = userAnswerText.trim();
    if (!textToSubmit) {
      addToast(
        uiLanguage === 'ja'
          ? '回答内容を入力するか、マイクで話してから送信してください。'
          : 'Please enter or speak your answer before submitting.',
        'warning'
      );
      return;
    }

    await executeAnswerSubmission(textToSubmit);
  };

  const cleanupAudioSession = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      void audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (audioRecorderRef.current) {
      audioRecorderRef.current.release();
      audioRecorderRef.current = null;
    }
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((t) => t.stop());
      activeStreamRef.current = null;
    }
    if (currentSpeechAudioRef.current) {
      currentSpeechAudioRef.current.onended = null;
      currentSpeechAudioRef.current.onerror = null;
      currentSpeechAudioRef.current.pause();
      currentSpeechAudioRef.current = null;
    }
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    // Clear max-utterance safety timer (Mission 08D)
    if (maxUtteranceTimerRef.current) {
      clearTimeout(maxUtteranceTimerRef.current);
      maxUtteranceTimerRef.current = null;
    }
    setIsRecording(false);
    isRecordingRef.current = false;
    setIsAutoplayBlocked(false);
  };

  const handleFinishEarly = async () => {
    setShowExitModal(false);
    isSessionActiveRef.current = false;
    isFinishedRef.current = true;
    cleanupAudioSession();
    try {
      const analysis = await tronApi.getInterviewAnalysis(interviewIdRef.current, interviewConfig, transcript);
      setLastAnalysis(analysis);
      navigate('/interview/feedback');
    } catch {
      navigate('/interview/setup');
    }
  };

  const handleSwitchMode = (mode: InterviewMode) => {
    setInterviewMode(mode);
    interviewModeRef.current = mode;
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (mode === 'manual' && isRecordingRef.current) {
      void stopAudioRecording();
    }
    addToast(
      uiLanguage === 'ja'
        ? mode === 'auto'
          ? '自動面接モード (ハンズフリー) に切り替えました'
          : '手動面接モードに切り替えました'
        : mode === 'auto'
          ? 'Switched to Auto Interview Mode (Hands-free)'
          : 'Switched to Manual Interview Mode',
      'info'
    );
  };

  const currentQ = questions[currentQIndex] || {
    questionNumber: 1,
    totalQuestions: 5,
    categoryJa: '自己紹介',
    textJa: '本日はお時間をいただきありがとうございます。まず簡単に自己紹介と、これまでのご経歴をお願いいたします。',
    textEn: 'Thank you for your time today. First, please introduce yourself briefly and tell us about your background.',
  };

  const displayQuestionJa = activeQuestionText || currentQ.textJa;

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative flex-1 flex flex-col justify-between max-w-6xl mx-auto w-full select-none py-1">
      {/* Top Status Bar: Mode, Company, Question Counter, Timer */}
      <GlassCard className="px-5 py-3 mb-3 flex flex-wrap items-center justify-between gap-4">
        {/* Company & Role */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-200 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
            AI
          </div>
          <div>
            <div className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <span>{interviewConfig.companyName}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100/70 text-blue-700">
                {interviewConfig.type.toUpperCase()}
              </span>
              <AiProfileSelector
                selectedProfile={interviewConfig.aiProfile || 'FAST'}
                onChange={() => {}}
                locked={true}
                compact
              />
            </div>
            <div className="text-xs text-slate-500 mt-0.5">{interviewConfig.jobPosition}</div>
          </div>
        </div>

        {/* Auto / Manual Mode Toggle */}
        <div className="flex items-center p-1 rounded-full bg-slate-100/80 border border-[#E2EEF8] shadow-2xs">
          <button
            type="button"
            onClick={() => handleSwitchMode('auto')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
              interviewMode === 'auto'
                ? 'bg-gradient-to-r from-[#00DFFF] to-[#008CFF] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Radio className="w-3 h-3" />
            <span>Auto Mode</span>
          </button>
          <button
            type="button"
            onClick={() => handleSwitchMode('manual')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
              interviewMode === 'manual'
                ? 'bg-gradient-to-r from-[#00DFFF] to-[#008CFF] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Hand className="w-3 h-3" />
            <span>Manual Mode</span>
          </button>
        </div>

        {/* Question Counter & Status */}
        <div className="flex items-center gap-5 text-xs font-semibold">
          <div className="flex items-center gap-1.5 text-slate-600">
            <span className="text-slate-400">Q:</span>
            <span className="text-blue-600 font-extrabold text-sm">
              {currentQIndex + 1}
            </span>
            <span className="text-slate-400">/ {questions.length || 5}</span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-600">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono text-slate-700">{formatTimer(elapsedSeconds)}</span>
          </div>

          {/* AI Status Badge */}
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                aiState === 'listening'
                  ? 'bg-cyan-400 animate-ping'
                  : aiState === 'speaking'
                  ? 'bg-blue-500 animate-pulse'
                  : aiState === 'thinking'
                  ? 'bg-amber-400 animate-spin'
                  : 'bg-emerald-400'
              }`}
            />
            <span className="capitalize font-bold text-slate-700">
              AI: {aiState}
            </span>
          </div>
        </div>

        {/* Header Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAudioMuted(!audioMuted)}
            className="p-2 rounded-xl bg-white border border-[#E2EEF8] text-slate-600 hover:text-blue-600 transition-colors shadow-2xs"
            title={audioMuted ? 'Unmute voice' : 'Mute voice'}
          >
            {audioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setIsPaused(!isPaused)}
            className="p-2 rounded-xl bg-white border border-[#E2EEF8] text-slate-600 hover:text-blue-600 transition-colors shadow-2xs"
            title={isPaused ? 'Resume' : 'Pause'}
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setShowExitModal(true)}
            className="px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>End</span>
          </button>
        </div>
      </GlassCard>

      {/* Main Center Area: Avatar & HUD Circles */}
      <div className="relative flex flex-col items-center justify-center my-auto py-1">
        {/* Animated HUD Circles centerpiece */}
        <div className="relative flex items-center justify-center">
          <HUDCircle
            size={180}
            animate={aiState === 'thinking' || aiState === 'listening'}
            className="w-[160px] h-[160px] md:w-[180px] md:h-[180px]"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <TronLogo size="lg" state={aiState} showGlow />
          </div>
        </div>

        {/* AI Status Caption */}
        <p className="mt-2 text-xs font-semibold font-mono tracking-wider text-slate-500 uppercase flex items-center gap-2">
          <span>●</span>
          <span>{statusMessage}</span>
        </p>

        {/* Active Audio Waveform bars when speaking or listening */}
        {(isRecording || aiState === 'speaking') && (
          <div className="flex items-center gap-1.5 mt-2 h-6">
            {audioMeterLevels.map((lvl, idx) => (
              <div
                key={idx}
                className={`w-1.5 rounded-full transition-all duration-100 ${
                  isSpeechDetected
                    ? 'bg-gradient-to-t from-emerald-500 to-cyan-400'
                    : 'bg-gradient-to-t from-[#008CFF] to-[#00DFFF]'
                }`}
                style={{ height: `${Math.max(4, lvl * 0.24)}px` }}
              />
            ))}
          </div>
        )}

        {/* Auto Mode Speech Pill */}
        {interviewMode === 'auto' && isRecording && (
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-semibold border bg-white/90 border-[#D6E6F7] text-slate-600 shadow-2xs">
            {isSpeechDetected ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-700 font-bold">Answer Detected</span>
                {silenceCountdown !== null && (
                  <span className="text-amber-600 font-mono text-[10px]">
                    (auto-submitting in {silenceCountdown}s)
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span>Hands-free: Speak your answer...</span>
              </>
            )}
          </div>
        )}

        {/* Autoplay Fallback Button when browser blocks automatic audio start (TASK 3) */}
        {isAutoplayBlocked && (
          <div className="mt-2.5 mb-1 w-full max-w-md mx-auto p-3.5 rounded-2xl bg-white/95 backdrop-blur-xl border border-blue-200 shadow-md text-center space-y-2 animate-fadeIn">
            <p className="text-xs font-semibold text-slate-700">
              {uiLanguage === 'ja'
                ? '面接の準備が完了しました。最初の質問の音声を再生して開始してください。'
                : 'Interview session ready. Click below to start Question 1 audio.'}
            </p>
            <button
              id="start-opening-audio-btn"
              type="button"
              onClick={() => void handleStartOpeningAudio()}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#00DFFF] to-[#008CFF] text-white font-bold text-xs shadow-md shadow-blue-500/25 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{uiLanguage === 'ja' ? '面接を開始 (音声再生)' : 'Start Interview (Play Audio)'}</span>
            </button>
          </div>
        )}

        {/* Current Question Panel */}
        <div className="w-full max-w-3xl mt-3">
          <GlassCard className="p-5 md:p-6 text-center border-blue-200/80 shadow-md shadow-blue-500/5 relative overflow-hidden">
            <div className="absolute top-3 left-4 flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-700">
                {currentQ.categoryJa || '面接質問'}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                Q{currentQIndex + 1}
              </span>
            </div>

            <button
              onClick={() => setShowEnglishTranslation(!showEnglishTranslation)}
              className="absolute top-3 right-4 flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-semibold bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 transition-colors"
            >
              <Languages className="w-3.5 h-3.5" />
              <span>{showEnglishTranslation ? '日本語のみ' : 'English Translation'}</span>
            </button>

            {/* Real Japanese AI Question */}
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 leading-relaxed font-display mt-4">
              「{displayQuestionJa}」
            </h2>

            {/* Optional English translation */}
            {showEnglishTranslation && currentQ.textEn && (
              <p className="text-sm text-slate-500 mt-3 pt-3 border-t border-slate-100 italic">
                "{currentQ.textEn}"
              </p>
            )}
          </GlassCard>
        </div>
      </div>

      {/* Bottom Controls Area: Microphone, Answer Input, and Collapsible Transcript */}
      <div className="w-full max-w-3xl mx-auto mt-3 space-y-3">
        {/* Microphone Recording Bar */}
        <div className="p-3 rounded-2xl bg-white/95 backdrop-blur-xl border border-[#D6E6F7] shadow-md flex items-center justify-between gap-3">
          {/* Mic Button */}
          <button
            type="button"
            onClick={
              isRecording
                ? () => {
                    if (interviewMode === 'auto') {
                      void handleAutoTriggerSubmit();
                    } else {
                      void stopAudioRecording();
                    }
                  }
                : () => void startAudioRecording()
            }
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 shrink-0
              ${isRecording
                ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse'
                : 'bg-gradient-to-r from-[#008CFF] to-[#0066FF] text-white shadow-md shadow-blue-500/25 hover:brightness-105'
              }
            `}
          >
            {isRecording ? (
              <>
                <Square className="w-4 h-4 fill-current" />
                <span>録音完了・認識</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span>{interviewMode === 'auto' ? 'マイク再開 (Mic)' : '話す (Start Speaking)'}</span>
              </>
            )}
          </button>

          {/* Text input for manual submission / editing */}
          <input
            id="interview-answer-input"
            type="text"
            value={userAnswerText}
            onChange={(e) => setUserAnswerText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isSubmitting && void handleSubmitAnswer()}
            placeholder={
              interviewMode === 'auto'
                ? '自動音声検知中... (マイクに向かって話すか、直接入力してEnter)'
                : 'マイクで話すか、直接日本語で回答を入力してください... (Enterで送信)'
            }
            className="flex-1 bg-transparent border-none outline-none text-xs md:text-sm text-slate-800 placeholder:text-slate-400 px-2"
          />

          {/* Submit Answer Button */}
          <button
            id="interview-submit-btn"
            type="button"
            onClick={() => void handleSubmitAnswer()}
            disabled={isSubmitting}
            className={`px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#008CFF] to-[#0066FF] text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 hover:brightness-105 active:scale-95 transition-all shrink-0 ${
              !userAnswerText.trim() && !isRecording ? 'opacity-70' : ''
            }`}
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>送信 (Submit)</span>
          </button>
        </div>

        {/* Collapsible Transcript Viewer */}
        <div className="rounded-2xl bg-white/80 border border-[#E2EEF8] shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => setShowTranscriptPanel(!showTranscriptPanel)}
            className="w-full px-4 py-2 text-xs font-bold text-slate-600 flex items-center justify-between hover:bg-slate-50/80 transition-colors"
          >
            <span>Live Transcript ({transcript.length} turns)</span>
            {showTranscriptPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showTranscriptPanel && (
            <div className="p-3 max-h-36 overflow-y-auto space-y-2 text-xs border-t border-[#E2EEF8]">
              {transcript.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2 items-start ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      msg.sender === 'user' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {msg.sender === 'user' ? 'YOU' : 'AI'}
                  </span>
                  <p
                    className={`p-2 rounded-xl max-w-[80%] ${
                      msg.sender === 'user' ? 'bg-blue-50 text-slate-800' : 'bg-white border border-slate-100 text-slate-800'
                    }`}
                  >
                    {msg.text}
                  </p>
                </div>
              ))}
              <div ref={transcriptScrollRef} />
            </div>
          )}
        </div>
      </div>

      {/* Exit Early Confirmation Modal */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 text-center space-y-4">
            <h3 className="font-extrabold text-base text-slate-900 font-display">
              {uiLanguage === 'ja' ? '面接を終了しますか？' : 'End Interview Session?'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {uiLanguage === 'ja'
                ? 'これまでの回答に基づいてAI評価とフィードバックを生成します。'
                : 'Your evaluation and feedback will be generated based on answers submitted so far.'}
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowExitModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                {uiLanguage === 'ja' ? '面接を続ける' : 'Continue Interview'}
              </button>
              <button
                type="button"
                onClick={handleFinishEarly}
                className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold shadow-md shadow-red-500/25 transition-colors"
              >
                {uiLanguage === 'ja' ? '面接を終了して評価を見る' : 'End & View Evaluation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
