import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const apiKey = process.env.SERPER_API_KEY || "7ed1c52768edb01fe4e0b8688b9d775719c4472c";

    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        q: query,
        num: 10
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: `Serper API Error: ${errText}` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to search Serper API" }, { status: 500 });
  }
}
