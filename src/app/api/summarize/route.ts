export async function POST(req: Request) {
  const { transcript } = await req.json();

  if (!transcript || typeof transcript !== "string" || !transcript.trim()) {
    return Response.json({ error: "No transcript provided" }, { status: 400 });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "GROQ_API_KEY is not configured on the server" },
      { status: 500 }
    );
  }

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-20b",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "You summarize spoken feedback from a learner at a 4-day youth program called 'Soul Trek'. " +
            "The transcript is Hinglish (Hindi and English mixed together) and may be in Devanagari script, " +
            "Latin script, or both. Write a concise 2-3 sentence summary IN ENGLISH covering: what they " +
            "learned or took away, how they felt about the sessions, and any suggestions or complaints " +
            "they raised. Be neutral and factual, and do not invent details that aren't in the transcript.",
        },
        { role: "user", content: transcript },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    return Response.json({ error: `Groq API error: ${errText}` }, { status: 502 });
  }

  const data = await res.json();
  const summary: string = data?.choices?.[0]?.message?.content ?? "";

  return Response.json({ summary });
}
