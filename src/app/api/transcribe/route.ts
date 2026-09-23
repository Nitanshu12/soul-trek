export const maxDuration = 60;

async function romanizeToHinglish(apiKey: string, text: string): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-20b",
      temperature: 0,
      // gpt-oss is a reasoning model: at default effort it can spend its whole
      // token budget "thinking" and return empty content (finish_reason "length").
      // Low effort plus headroom for a long transcript avoids that failure mode.
      reasoning_effort: "low",
      max_completion_tokens: 4096,
      messages: [
        {
          role: "system",
          content:
            "You are given a speech transcript that mixes Hindi written in Devanagari script " +
            "with English written in Latin script. Rewrite it ENTIRELY in Roman/Latin script " +
            "Hinglish, the way it is commonly typed on WhatsApp (e.g. 'session bahut accha tha'). " +
            "Transliterate every Devanagari word phonetically into Roman letters. Keep English " +
            "words exactly as they are. Do not translate meaning, do not summarize, do not add or " +
            "remove any content — only convert the script. Reply with the converted text only.",
        },
        { role: "user", content: text },
      ],
    }),
  });
  if (!res.ok) return text; // fall back to the mixed-script original rather than fail the save
  const data = await res.json();
  const romanized = (data?.choices?.[0]?.message?.content ?? "").trim();
  // If the model still comes back empty for some reason, mixed script beats nothing.
  return romanized || text;
}

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
  // No language hint: learners code-switch between Hindi and English mid-sentence,
  // and forcing "hi" makes Whisper write the English words in Devanagari too.
  // Auto-detect keeps each word in its natural script, which we then romanize below.
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
  const rawText: string = (data?.text ?? "").trim();
  const hinglishText = rawText ? await romanizeToHinglish(apiKey, rawText) : "";

  return Response.json({ text: hinglishText });
}
