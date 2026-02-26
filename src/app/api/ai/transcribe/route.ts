import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth-context";
import { transcribeAudio } from "@/lib/ai/transcription";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // 25 MB

/**
 * POST /api/ai/transcribe
 *
 * Accepts a multipart/form-data request with an `audio` file and returns
 * the transcribed text using OpenAI Whisper (or a mock if no key is set).
 *
 * Requires authentication (any logged-in user).
 *
 * Body (multipart): audio: File
 * Response: { ok: true, text: string, isMock: boolean, language?: string }
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAuthContext().catch(() => null);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    // Parse multipart form data
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "请求格式错误，请使用 multipart/form-data 上传音频文件。" },
        { status: 400 },
      );
    }

    const audioFile = formData.get("audio");
    if (!audioFile || !(audioFile instanceof Blob)) {
      return NextResponse.json(
        { error: "缺少 audio 字段，请附上音频文件。" },
        { status: 400 },
      );
    }

    if (audioFile.size === 0) {
      return NextResponse.json({ error: "音频文件为空。" }, { status: 400 });
    }

    if (audioFile.size > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { error: `音频文件过大（最大 25 MB），当前 ${(audioFile.size / 1024 / 1024).toFixed(1)} MB。` },
        { status: 413 },
      );
    }

    const result = await transcribeAudio(audioFile);

    return NextResponse.json({
      ok: true,
      text: result.text,
      isMock: result.isMock,
      language: result.language ?? null,
    });
  } catch (error) {
    console.error("POST /api/ai/transcribe failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
