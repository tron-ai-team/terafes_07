import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { TronLogo } from '../components/common/TronLogo';
import { HUDCircle } from '../components/common/HUDCircle';
import { AiProfileSelector } from '../components/common/AiProfileSelector';
import { AiProfile } from '../types/aiProfile';
import { tronApi } from '../services/api';
import { TronAudioRecorder } from '../utils/audioRecorder';
import { getVoiceNotice } from '../utils/languageResolver';
import {
  Mic,
  MicOff,
  Square,
  MessageSquare,
  Send,
  Loader2,
  Volume2,
  Radio,
  Hand,
  Lock,
} from 'lucide-react';

type VoiceState = 'idle' | 'calibrating' | 'listening' | 'thinking' | 'speaking';
type VoiceInteractionMode = 'auto' | 'manual';

// ── Dynamic Baseline VAD Configuration (Mission 08F) ─────────────────────────
// All thresholds are RELATIVE to a measured ambient noise floor.
// These constants are MARGINS, not absolute RMS values.
const VAD_SPEECH_MARGIN    = 12;    // floor + 12 → counted as speech
const VAD_SILENCE_MARGIN   = 5;     // floor + 5  → counted as silence

const VAD_BASELINE_FRAMES  = 40;    // ~0.65s at 60fps to calibrate ambient noise
const VAD_SILENCE_MS       = 1800;  // 1.8 s continuous silence after speech → submit
const VAD_MIN_SPEECH_MS    = 800;   // min real speech before silence timer starts
const VAD_MAX_UTTERANCE_MS = 55000; // absolute max recording: 55 s safety fallback

export const VoiceModePage: React.FC = () => {
  const { uiLanguage, selectedLanguage, addToast, aiProfiles, preferredAiProfile, selectedAiMode } = useApp();

  const [selectedProfile, setSelectedProfile] = useState<AiProfile>(
    (selectedAiMode as AiProfile) || preferredAiProfile
  );
  const [hasStartedSession, setHasStartedSession] = useState(false);

  useEffect(() => {
    const next = (selectedAiMode as AiProfile) || preferredAiProfile;
    if (next && !hasStartedSession) {
      setSelectedProfile(next);
    }
  }, [selectedAiMode, preferredAiProfile, hasStartedSession]);
  const [voiceMode, setVoiceMode] = useState<VoiceInteractionMode>('auto');
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeechDetected, setIsSpeechDetected] = useState(false);
  const [silenceCountdown, setSilenceCountdown] = useState<number | null>(null);
  const [audioMeterLevels, setAudioMeterLevels] = useState<number[]>([15, 25, 45, 30, 20, 50, 35, 25]);
  const [captions, setCaptions] = useState<{ speaker: 'ai' | 'user' | 'system'; text: string }[]>([
    {
      speaker: 'ai',
      text: 'Voice conversation ready. Tap "Start Voice Conversation" to speak with real AI.',
    },
  ]);
  const [showCaptions, setShowCaptions] = useState(true);

  // Audio Context & Analyser Refs
  const audioRecorderRef = useRef<TronAudioRecorder | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const sessionIdRef = useRef<string>('voice-' + Date.now());
  const activeStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // VAD tracking refs
  const hasSpokenRef = useRef(false);
  const speechStartTimeRef = useRef(0);
  const silenceStartTimeRef = useRef<number | null>(null);
  const isSubmittingTurnRef = useRef(false);
  const isActiveRef = useRef(false);
  const voiceModeRef = useRef<VoiceInteractionMode>('auto');
  const voiceStateRef = useRef<VoiceState>('idle');

  // Dynamic VAD baseline refs (Mission 08F)
  const vadNoiseFloorRef = useRef(0);
  const vadBaselineReadyRef = useRef(false);
  const vadBaselineSamplesRef = useRef<number[]>([]);
  const vadSpeechThreshRef = useRef(VAD_SPEECH_MARGIN);
  const vadSilenceThreshRef = useRef(0);
  const maxUtteranceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep refs in sync with state
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    voiceModeRef.current = voiceMode;
  }, [voiceMode]);

  useEffect(() => {
    voiceStateRef.current = voiceState;
  }, [voiceState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopVoiceSession();
    };
  }, []);

  // ── VAD State Reset ──────────────────────────────────────────────────────────
  const resetVad = () => {
    hasSpokenRef.current = false;
    speechStartTimeRef.current = 0;
    silenceStartTimeRef.current = null;
    setIsSpeechDetected(false);
    setSilenceCountdown(null);

    // Reset dynamic baseline
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

  // ── Web Audio Analyser + Dynamic Baseline VAD ────────────────────────────────
  /**
   * Sets up the Web Audio analyser and runs the VAD animation frame loop.
   *
   * Phase 1 — Calibration (VAD_BASELINE_FRAMES frames):
   *   Samples ambient room energy and computes a median noise floor.
   *   While calibrating, voiceState is 'calibrating' and VAD does not trigger.
   *
   * Phase 2 — Detection (dynamic thresholds):
   *   speechThreshold  = noiseFloor + VAD_SPEECH_MARGIN
   *   silenceThreshold = noiseFloor + VAD_SILENCE_MARGIN
   *   Energy in the mid-range (above silence, below speech) conservatively
   *   starts/continues the silence timer — it does NOT reset it.
   *   After VAD_SILENCE_MS of below-speech energy post-speech → auto-submit.
   *
   * Safety fallback: VAD_MAX_UTTERANCE_MS setTimeout after speech starts.
   */
  const setupWaveformMeterAndVad = (stream: MediaStream) => {
    try {
      // Teardown any previous loop
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
        if (!analyserRef.current || !isActiveRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);

        // Waveform visualizer bars (always update)
        const normalized = Array.from(dataArray.slice(0, 12)).map((v) =>
          Math.max(10, Math.min(100, Math.round((v / 255) * 100)))
        );
        setAudioMeterLevels(normalized);

        // VAD only runs in auto mode and when not already submitting
        if (voiceModeRef.current !== 'auto' || isSubmittingTurnRef.current) {
          animationFrameRef.current = requestAnimationFrame(updateMeterAndVad);
          return;
        }

        // Compute mean energy over voice-frequency bins (≈ 300 Hz–2.7 kHz for fftSize=64)
        const voiceBins = dataArray.slice(1, 20);
        let sum = 0;
        for (let i = 0; i < voiceBins.length; i++) sum += voiceBins[i];
        const energy = sum / voiceBins.length;
        const now = Date.now();

        // ── Phase 1: Calibration ─────────────────────────────────────────────
        if (!vadBaselineReadyRef.current) {
          vadBaselineSamplesRef.current.push(energy);

          if (vadBaselineSamplesRef.current.length >= VAD_BASELINE_FRAMES) {
            const samples = vadBaselineSamplesRef.current;
            // Median is robust against transient noise spikes during calibration
            const sorted = [...samples].sort((a, b) => a - b);
            const median = sorted[Math.floor(sorted.length / 2)];

            vadNoiseFloorRef.current    = median;
            vadSpeechThreshRef.current  = median + VAD_SPEECH_MARGIN;
            vadSilenceThreshRef.current = median + VAD_SILENCE_MARGIN;
            vadBaselineReadyRef.current = true;

            console.debug(
              `[VAD Voice] Baseline ready — floor: ${median.toFixed(1)},`,
              `speech>: ${vadSpeechThreshRef.current.toFixed(1)},`,
              `silence<: ${vadSilenceThreshRef.current.toFixed(1)}`
            );

            // Transition from 'calibrating' → 'listening'
            setVoiceState('listening');
            voiceStateRef.current = 'listening';
          }

          animationFrameRef.current = requestAnimationFrame(updateMeterAndVad);
          return;
        }

        // ── Phase 2: Detection (only in 'listening' state) ──────────────────
        if (voiceStateRef.current !== 'listening') {
          animationFrameRef.current = requestAnimationFrame(updateMeterAndVad);
          return;
        }

        const isSpeech  = energy >= vadSpeechThreshRef.current;
        const isSilence = energy <  vadSilenceThreshRef.current;

        if (isSpeech) {
          if (!hasSpokenRef.current) {
            hasSpokenRef.current = true;
            speechStartTimeRef.current = now;
            setIsSpeechDetected(true);
            console.debug(`[VAD Voice] Speech started — energy: ${energy.toFixed(1)}`);

            // Arm max-utterance safety fallback
            if (maxUtteranceTimerRef.current) clearTimeout(maxUtteranceTimerRef.current);
            maxUtteranceTimerRef.current = setTimeout(() => {
              if (!isSubmittingTurnRef.current && isActiveRef.current && hasSpokenRef.current) {
                console.warn('[VAD Voice] Max utterance timeout — auto-submitting');
                addToast(
                  uiLanguage === 'ja'
                    ? '最大録音時間に達しました。送信します。'
                    : 'Max recording time reached. Submitting now.',
                  'info'
                );
                resetVad();
                void handleFinishUtterance();
              }
            }, VAD_MAX_UTTERANCE_MS);
          }

          // Active speech — reset silence timer
          silenceStartTimeRef.current = null;
          setSilenceCountdown(null);
        } else if (hasSpokenRef.current) {
          // Was speaking; energy has dropped below speech threshold
          const speechDuration = now - speechStartTimeRef.current;

          if (speechDuration >= VAD_MIN_SPEECH_MS) {
            if (isSilence) {
              // Genuine silence — start/continue silence timer
              if (silenceStartTimeRef.current === null) {
                silenceStartTimeRef.current = now;
                console.debug(`[VAD Voice] Silence timer started — energy: ${energy.toFixed(1)}`);
              }
              const silenceElapsed = now - silenceStartTimeRef.current;
              const remainingSec = Math.max(0, Math.ceil((VAD_SILENCE_MS - silenceElapsed) / 1000));
              setSilenceCountdown(remainingSec);

              if (silenceElapsed >= VAD_SILENCE_MS) {
                // ✅ Auto-submit: candidate finished speaking
                console.debug(`[VAD Voice] Silence confirmed (${silenceElapsed}ms) — auto-submitting`);
                resetVad();
                void handleFinishUtterance();
                return;
              }
            } else {
              // Mid-range energy (between silence and speech thresholds)
              // Could be natural Japanese pause — do NOT reset silence timer once started.
              // Only start if not already counting.
              if (silenceStartTimeRef.current === null) {
                silenceStartTimeRef.current = now;
              }
              const silenceElapsed = now - silenceStartTimeRef.current;
              const remainingSec = Math.max(0, Math.ceil((VAD_SILENCE_MS - silenceElapsed) / 1000));
              setSilenceCountdown(remainingSec);

              if (silenceElapsed >= VAD_SILENCE_MS) {
                console.debug(`[VAD Voice] Mid-range silence timeout — auto-submitting`);
                resetVad();
                void handleFinishUtterance();
                return;
              }
            }
          }
        }

        animationFrameRef.current = requestAnimationFrame(updateMeterAndVad);
      };

      updateMeterAndVad();
    } catch {
      // ignore analyser setup issues in unsupported environments
    }
  };

  // ── Start Recording Turn ─────────────────────────────────────────────────────
  const startRecordingTurn = async () => {
    if (!isActiveRef.current) return;

    try {
      resetVad();
      isSubmittingTurnRef.current = false;

      const recorder = new TronAudioRecorder();
      audioRecorderRef.current = recorder;

      const stream = await recorder.start();
      activeStreamRef.current = stream;

      // Enter calibrating state before listening
      setVoiceState('calibrating');
      voiceStateRef.current = 'calibrating';

      setupWaveformMeterAndVad(stream);
      // Note: voiceState transitions to 'listening' once calibration completes inside VAD loop
    } catch (_err) {
      addToast(
        uiLanguage === 'ja'
          ? 'マイクへのアクセスに失敗しました。設定を確認してください。'
          : 'Microphone access failed. Please check permissions.',
        'warning'
      );
      setVoiceState('idle');
      voiceStateRef.current = 'idle';
      setIsActive(false);
      isActiveRef.current = false;
    }
  };

  // ── Start Initial Voice Session ──────────────────────────────────────────────
  const startVoiceSession = async () => {
    try {
      if (currentAudioRef.current) {
        currentAudioRef.current.onended = null;
        currentAudioRef.current.onerror = null;
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }

      sessionIdRef.current = 'voice-' + Date.now();
      setHasStartedSession(true);
      setIsActive(true);
      isActiveRef.current = true;

      await startRecordingTurn();

      addToast(
        uiLanguage === 'ja'
          ? voiceMode === 'auto'
            ? 'ハンズフリー自動音声通話を開始しました。話しかけてください。'
            : '手動音声通話を開始しました。話し終わったら送信を押してください。'
          : voiceMode === 'auto'
          ? 'Hands-free Auto Voice active. Calibrating microphone...'
          : 'Manual Voice active. Tap Finish Speaking when done.',
        'info'
      );

      setCaptions((prev) => [
        ...prev,
        {
          speaker: 'ai',
          text:
            uiLanguage === 'ja'
              ? '聞いています。何か質問やお話ししたいことはありますか？'
              : 'I am listening. What would you like to talk about?',
        },
      ]);
    } catch (_err) {
      addToast('Microphone access is required for Voice Mode.', 'warning');
    }
  };

  // ── Handle Finish Utterance (Auto VAD trigger or Manual button) ──────────────
  const handleFinishUtterance = useCallback(async () => {
    // Guard: only one submission per turn
    if (isSubmittingTurnRef.current) return;
    // Must have an active recorder and be in calibrating or listening state
    if (!audioRecorderRef.current) return;
    const state = voiceStateRef.current;
    if (state !== 'listening' && state !== 'calibrating') return;

    isSubmittingTurnRef.current = true;

    // Stop VAD loop immediately
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    // Clear max-utterance timer
    if (maxUtteranceTimerRef.current) {
      clearTimeout(maxUtteranceTimerRef.current);
      maxUtteranceTimerRef.current = null;
    }

    setVoiceState('thinking');
    voiceStateRef.current = 'thinking';
    resetVad();

    try {
      const { blob } = await audioRecorderRef.current.stop();
      audioRecorderRef.current = null;

      // POST /api/v1/voice/turn exactly once with locked selectedProfile and user selected experience language
      const response = await tronApi.submitVoiceTurn(blob, sessionIdRef.current, selectedLanguage, selectedProfile);
      if (response.sessionId) {
        sessionIdRef.current = response.sessionId;
      }

      // Append user transcript
      if (response.transcript) {
        setCaptions((prev) => [...prev, { speaker: 'user', text: response.transcript }]);
      }

      // Append AI reply
      if (response.reply) {
        setCaptions((prev) => [...prev, { speaker: 'ai', text: response.reply }]);
      }

      // Note when VOICEVOX audio is unavailable for non-Japanese languages
      const hasAudio = !!response.audio_url;
      const isJapanese = selectedLanguage === 'ja' || response.language === 'ja';

      if (!hasAudio && !isJapanese) {
        const notice = getVoiceNotice(selectedLanguage);
        if (notice) {
          setCaptions((prev) => [
            ...prev,
            {
              speaker: 'system',
              text: notice,
            },
          ]);
        }
      }

      // ── Play returned VOICEVOX audio ────────────────────────────────────────
      if (response.audio_url) {
        setVoiceState('speaking');
        voiceStateRef.current = 'speaking';

        const fullAudioUrl = tronApi.resolveAudioUrl(response.audio_url);
        const audio = new Audio(fullAudioUrl);
        currentAudioRef.current = audio;

        const onAudioDone = async () => {
          // Guard: clear ref only if still the same audio element
          if (currentAudioRef.current === audio) {
            currentAudioRef.current = null;
          }
          if (!isActiveRef.current) return;
          if (voiceModeRef.current === 'auto') {
            await startRecordingTurn();
          } else {
            setVoiceState('idle');
            voiceStateRef.current = 'idle';
          }
        };

        audio.onended = onAudioDone;
        audio.onerror = onAudioDone;

        await audio.play().catch(async () => {
          // Autoplay blocked or error — still try to resume listening
          if (currentAudioRef.current === audio) currentAudioRef.current = null;
          if (isActiveRef.current && voiceModeRef.current === 'auto') {
            await startRecordingTurn();
          } else {
            setVoiceState('idle');
            voiceStateRef.current = 'idle';
          }
        });
      } else {
        // No audio returned (non-Japanese text-only or empty STT)
        // IMPORTANT: must still reopen microphone in auto mode — do not wait for onended
        if (isActiveRef.current && voiceModeRef.current === 'auto') {
          // Brief pause for caption readability before resuming
          setTimeout(async () => {
            if (isActiveRef.current) {
              await startRecordingTurn();
            }
          }, 1200);
        } else {
          setVoiceState('idle');
          voiceStateRef.current = 'idle';
        }
      }
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('No Japanese speech') || msg.includes('422') || msg.includes('No speech')) {
        addToast(
          uiLanguage === 'ja'
            ? '音声が十分に認識されませんでした。もう少しはっきりと話してください。'
            : 'No clear speech detected. Please speak closer to your microphone.',
          'warning'
        );
      } else {
        addToast(
          uiLanguage === 'ja' ? `音声エラー: ${msg}` : `Voice turn error: ${msg}`,
          'error'
        );
      }

      // Resume listening if still active
      if (isActiveRef.current) {
        if (voiceModeRef.current === 'auto') {
          setTimeout(async () => {
            if (isActiveRef.current) {
              await startRecordingTurn();
            }
          }, 1000);
        } else {
          setVoiceState('idle');
          voiceStateRef.current = 'idle';
        }
      }
    } finally {
      isSubmittingTurnRef.current = false;
    }
  }, [uiLanguage, addToast]);

  // ── Stop Voice Session — full cleanup ────────────────────────────────────────
  const stopVoiceSession = () => {
    isActiveRef.current = false;
    setIsActive(false);
    setHasStartedSession(false);
    setVoiceState('idle');
    voiceStateRef.current = 'idle';
    resetVad();
    isSubmittingTurnRef.current = false;

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
      activeStreamRef.current.getTracks().forEach((track) => track.stop());
      activeStreamRef.current = null;
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.onended = null;
      currentAudioRef.current.onerror = null;
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    // max-utterance timer is cleared inside resetVad()
    setAudioMeterLevels([15, 25, 45, 30, 20, 50, 35, 25]);
  };

  const toggleMute = () => {
    if (activeStreamRef.current) {
      activeStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
      addToast(isMuted ? 'Microphone unmuted' : 'Microphone muted', 'info');
    }
  };

  const getStatusText = () => {
    switch (voiceState) {
      case 'calibrating':
        return uiLanguage === 'ja'
          ? 'マイクを調整中... しばらくお待ちください'
          : 'Calibrating microphone...';
      case 'listening':
        if (isMuted) return 'Microphone Muted';
        if (voiceMode === 'auto') {
          if (isSpeechDetected) {
            return silenceCountdown !== null
              ? `Silence detected... Sending in ${silenceCountdown}s`
              : 'Speaking detected... Keep speaking';
          }
          return 'Hands-free: Listening for your voice...';
        }
        return 'Listening... Speak and tap Finish Speaking';
      case 'thinking':
        return 'TRON AI is thinking & processing with qwen3:8b...';
      case 'speaking':
        return 'TRON AI is speaking with VOICEVOX...';
      case 'idle':
      default:
        return 'Ready to connect. Tap below to start.';
    }
  };

  // Determine whether the "Finish Speaking" button should appear
  const showFinishButton =
    isActive && (voiceState === 'listening' || voiceState === 'calibrating');

  return (
    <div className="relative flex-1 flex flex-col justify-between items-center max-w-4xl mx-auto w-full h-[calc(100vh-6rem)] select-none py-4 text-center">
      {/* Top Bar: Mode Selector & Live Status Pill */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {/* Auto / Manual Segmented Toggle */}
        <div className="flex items-center p-1 rounded-full bg-white/90 border border-[#E2EEF8] shadow-2xs">
          <button
            type="button"
            onClick={() => {
              setVoiceMode('auto');
              addToast(
                uiLanguage === 'ja'
                  ? '自動モードに切り替えました (ハンズフリー)'
                  : 'Switched to Auto Mode (Hands-free)',
                'info'
              );
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold transition-all ${
              voiceMode === 'auto'
                ? 'bg-gradient-to-r from-[#00DFFF] to-[#008CFF] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Radio className="w-3 h-3" />
            <span>Auto Mode</span>
            <span className="text-[10px] opacity-80">(Hands-free)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setVoiceMode('manual');
              addToast(
                uiLanguage === 'ja'
                  ? '手動モードに切り替えました'
                  : 'Switched to Manual Mode',
                'info'
              );
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold transition-all ${
              voiceMode === 'manual'
                ? 'bg-gradient-to-r from-[#00DFFF] to-[#008CFF] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Hand className="w-3 h-3" />
            <span>Manual Mode</span>
          </button>
        </div>

        {/* Live Audio Stream Status Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 border border-[#E2EEF8] text-xs font-semibold text-slate-600 shadow-2xs">
          <span
            className={`w-2 h-2 rounded-full ${
              isActive ? 'bg-cyan-400 animate-ping' : 'bg-slate-300'
            }`}
          />
          <span>
            {isActive
              ? voiceState === 'calibrating'
                ? 'Calibrating...'
                : voiceMode === 'auto'
                ? 'Auto VAD Active'
                : 'Live Audio Stream'
              : 'Voice Standby'}
          </span>
        </div>
      </div>

      {/* Centerpiece: Glowing TRON AI Logo inside animated concentric HUD circles */}
      <div className="relative flex flex-col items-center justify-center my-auto">
        <div className="relative flex items-center justify-center">
          <HUDCircle
            size={340}
            animate={isActive}
            className="w-[280px] h-[280px] md:w-[340px] md:h-[340px]"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <TronLogo
              size="hero"
              state={voiceState === 'calibrating' ? 'thinking' : voiceState}
              showGlow
            />
          </div>
        </div>

        {/* Dynamic Voice Status Heading */}
        <h2 className="mt-6 text-xl md:text-2xl font-black font-display tracking-tight text-slate-900">
          {getStatusText()}
        </h2>

        {/* Audio Reactive Waveform Bars */}
        {isActive && !isMuted && (
          <div className="flex items-center gap-1.5 mt-4 h-12">
            {audioMeterLevels.map((lvl, idx) => (
              <div
                key={idx}
                className={`w-2 rounded-full transition-all duration-75 ${
                  isSpeechDetected
                    ? 'bg-gradient-to-t from-emerald-500 to-cyan-400'
                    : voiceState === 'calibrating'
                    ? 'bg-gradient-to-t from-amber-400 to-yellow-300'
                    : 'bg-gradient-to-t from-[#008CFF] to-[#00DFFF]'
                }`}
                style={{ height: `${Math.max(6, lvl * 0.45)}px` }}
              />
            ))}
          </div>
        )}

        {/* VAD Status Pill in Auto Mode */}
        {isActive && voiceMode === 'auto' && (
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border transition-all bg-white/90 border-[#D6E6F7] text-slate-600">
            {voiceState === 'calibrating' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-amber-700 font-bold">
                  {uiLanguage === 'ja' ? 'マイク調整中...' : 'Calibrating microphone...'}
                </span>
              </>
            ) : voiceState === 'listening' && isSpeechDetected ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-700 font-bold">Speech Detected</span>
                {silenceCountdown !== null && (
                  <span className="text-amber-600 font-mono text-[10px]">
                    (auto-sending in {silenceCountdown}s)
                  </span>
                )}
              </>
            ) : voiceState === 'listening' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>Listening for speech...</span>
              </>
            ) : null}
          </div>
        )}
      </div>

      {/* Live Captions Sub-panel (collapsible) */}
      <div className="w-full max-w-xl mx-auto space-y-4">
        {showCaptions && (
          <div className="p-4 rounded-2xl bg-white/90 backdrop-blur-xl border border-[#E2EEF8] shadow-sm max-h-36 overflow-y-auto text-xs text-left space-y-2">
            {captions.slice(-4).map((c, idx) => (
              <div key={idx} className="flex gap-2 items-start">
                <span
                  className={`font-bold uppercase text-[10px] shrink-0 mt-0.5 ${
                    c.speaker === 'ai'
                      ? 'text-blue-600'
                      : c.speaker === 'user'
                      ? 'text-emerald-600'
                      : 'text-amber-600'
                  }`}
                >
                  {c.speaker === 'ai' ? 'TRON AI:' : c.speaker === 'user' ? 'YOU:' : 'NOTICE:'}
                </span>
                <span className="text-slate-700 leading-relaxed">{c.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Voice Controls Bar */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {isActive ? (
            <>
              {/* Compact locked selector */}
              <AiProfileSelector
                selectedProfile={selectedProfile}
                onChange={() => {}}
                locked={true}
                availableProfiles={aiProfiles}
                placement="top"
                className="shrink-0"
              />

              {/* Mute/Unmute */}
              <button
                onClick={toggleMute}
                className={`p-4 rounded-full border transition-all ${
                  isMuted
                    ? 'bg-amber-500 text-white border-amber-600 shadow-md'
                    : 'bg-white text-slate-700 border-[#E2EEF8] hover:bg-slate-50'
                }`}
                title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* Action Turn Button: Manual "Finish Speaking" or Auto Override */}
              {showFinishButton && (
                <button
                  onClick={() => void handleFinishUtterance()}
                  className="px-8 py-3.5 rounded-full bg-gradient-to-r from-[#00DFFF] to-[#008CFF] hover:brightness-105 text-white font-extrabold text-sm shadow-lg shadow-blue-500/25 flex items-center gap-2 transition-all active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {uiLanguage === 'ja'
                      ? voiceMode === 'auto'
                        ? '今すぐ送信'
                        : '話し終わった (送信)'
                      : voiceMode === 'auto'
                      ? 'Send Now'
                      : 'Finish Speaking'}
                  </span>
                </button>
              )}

              {voiceState === 'thinking' && (
                <div className="px-6 py-3.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-bold text-xs flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  <span>{uiLanguage === 'ja' ? 'AI応答を生成中...' : 'Processing response...'}</span>
                </div>
              )}

              {voiceState === 'speaking' && (
                <div className="px-6 py-3.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-emerald-600 animate-pulse" />
                  <span>{uiLanguage === 'ja' ? 'AIが音声で回答中...' : 'Speaking reply...'}</span>
                </div>
              )}

              {/* End Conversation Button */}
              <button
                onClick={stopVoiceSession}
                className="px-6 py-3.5 rounded-full bg-red-500 hover:bg-red-600 text-white font-bold text-xs shadow-md shadow-red-500/25 flex items-center gap-1.5 transition-all active:scale-95"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>End</span>
              </button>

              {/* Captions Toggle */}
              <button
                onClick={() => setShowCaptions(!showCaptions)}
                className={`p-4 rounded-full border transition-all ${
                  showCaptions
                    ? 'bg-blue-50 text-blue-600 border-blue-200'
                    : 'bg-white text-slate-400 border-[#E2EEF8]'
                }`}
                title="Toggle Live Captions"
              >
                <MessageSquare className="w-5 h-5" />
              </button>
            </>
          ) : (
            /* Start Conversation CTA with compact model selector */
            <div className="flex flex-wrap items-center justify-center gap-3">
              <AiProfileSelector
                selectedProfile={selectedProfile}
                onChange={(p) => {
                  if (hasStartedSession || isActive) {
                    addToast('AI profile is locked for this voice session. End the session to choose another profile.', 'warning');
                    return;
                  }
                  setSelectedProfile(p);
                }}
                locked={hasStartedSession || isActive}
                availableProfiles={aiProfiles}
                placement="top"
              />
              <button
                onClick={startVoiceSession}
                className="px-8 py-3.5 rounded-full bg-gradient-to-r from-[#00DFFF] via-[#008CFF] to-[#0066FF] text-white font-extrabold text-sm md:text-base shadow-xl shadow-blue-500/30 hover:brightness-105 active:scale-95 transition-all flex items-center gap-2.5"
              >
                <Mic className="w-5 h-5" />
                <span>
                  {voiceMode === 'auto' ? 'Start Auto Voice' : 'Start Voice Conversation'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
