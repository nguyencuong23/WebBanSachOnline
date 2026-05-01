import { NextResponse } from 'next/server';

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
// We no longer use NEXT_PUBLIC prefix so it stays strictly on the server
const GROQ_API_KEY = process.env.GROQ_API_KEY;

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!GROQ_API_KEY) {
      return NextResponse.json({ error: 'Missing Groq API Key on server.' }, { status: 500 });
    }

    const res = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json({ error: `Groq API error: ${res.status}`, details: errorText }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data, { status: 200 });

  } catch (error) {
    console.error('API /api/chat error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
