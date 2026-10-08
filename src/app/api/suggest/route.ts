import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  if (!query) {
    return NextResponse.json([]);
  }

  try {
    const res = await fetch(
      `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      }
    );

    if (!res.ok) {
      return NextResponse.json([]);
    }

    const text = await res.text();
    try {
      const data = JSON.parse(text);
      return NextResponse.json(data[1] || []);
    } catch {
      return NextResponse.json([]);
    }
  } catch {
    return NextResponse.json([]);
  }
}
