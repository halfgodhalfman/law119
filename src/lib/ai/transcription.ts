/**
 * Voice Transcription — Stub
 *
 * Converts audio blobs to text using OpenAI Whisper API.
 * Falls back to a placeholder message when OPENAI_API_KEY is not configured.
 *
 * Usage:
 *   const text = await transcribeAudio(audioBlob);
 *
 * Integration:
 *   - Set OPENAI_API_KEY in environment to enable real transcription
 *   - Supports WebM, MP4, MP3, WAV formats
 *   - Max file size: 25 MB (Whisper API limit)
 */

const MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB — Whisper API limit

export type TranscriptionResult = {
  text: string;
  /** true if this is a mock result (no API key configured) */
  isMock: boolean;
  /** language detected by Whisper (if real result) */
  language?: string;
};

export async function transcribeAudio(
  audioBlob: Blob,
): Promise<TranscriptionResult> {
  if (audioBlob.size > MAX_AUDIO_SIZE_BYTES) {
    return {
      text: "[录音文件过大，请控制在 25MB 以内 / Audio file too large, please keep under 25MB]",
      isMock: true,
    };
  }

  const openaiKey = process.env.OPENAI_API_KEY;

  if (openaiKey) {
    try {
      const formData = new FormData();
      // Use a filename with proper extension so Whisper can detect format
      const ext = getAudioExtension(audioBlob.type);
      formData.append("file", audioBlob, `recording.${ext}`);
      formData.append("model", "whisper-1");
      formData.append("response_format", "verbose_json");
      // Let Whisper auto-detect language (works well for Chinese + English mix)

      const response = await fetch(
        "https://api.openai.com/v1/audio/transcriptions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiKey}`,
          },
          body: formData,
        },
      );

      if (response.ok) {
        const data = (await response.json()) as {
          text: string;
          language?: string;
        };
        if (data.text && data.text.trim().length > 0) {
          return {
            text: data.text.trim(),
            isMock: false,
            language: data.language,
          };
        }
      } else {
        const errBody = await response.text().catch(() => "");
        console.warn("[transcription] Whisper API error:", response.status, errBody);
      }
    } catch (e) {
      console.warn("[transcription] Whisper API call failed:", e);
    }
  }

  // ── Mock fallback ─────────────────────────────────────────────────────────
  return {
    text: "[语音转文字功能 — 请配置 OPENAI_API_KEY 以启用 / Voice transcription — configure OPENAI_API_KEY to enable]",
    isMock: true,
  };
}

/** Map MIME type to a file extension that Whisper accepts */
function getAudioExtension(mimeType: string): string {
  const map: Record<string, string> = {
    "audio/webm": "webm",
    "audio/webm;codecs=opus": "webm",
    "audio/ogg": "ogg",
    "audio/mp4": "mp4",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/wave": "wav",
    "audio/flac": "flac",
  };
  // Normalize by stripping codec params for lookup
  const base = mimeType.split(";")[0].trim();
  return map[base] ?? map[mimeType] ?? "webm";
}
