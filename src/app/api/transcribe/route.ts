export const maxDuration = 60;

export async function POST(req: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "GROQ_API_KEY is not configured on the server" },
      { status: 500 }
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "No audio provided" }, { status: 400 });
  }

  const upstream = new FormData();
  upstream.append("file", file, file.name || "recording.webm");
  upstream.append("model", "whisper-large-v3-turbo");
  // Learners speak Hinglish, which Whisper handles best as Hindi with English
  // words carried through, rather than auto-detecting per utterance.
  upstream.append("language", "hi");
  upstream.append("temperature", "0");

  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: upstream,
  });

  if (res.status === 429) {
    // Free tier caps audio-seconds per hour. The caller keeps the recording
    // queued and retries rather than dropping it.
    return Response.json(
      { error: "rate_limited", retryAfter: res.headers.get("retry-after") },
      { status: 429 }
    );
  }

  if (!res.ok) {
    const detail = await res.text();
    return Response.json({ error: `Transcription failed: ${detail}` }, { status: 502 });
  }

  const data = await res.json();
  return Response.json({ text: (data?.text ?? "").trim() });
}
