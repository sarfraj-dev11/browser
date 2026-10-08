import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      }
    );
    const html = await response.text();
    
    // Parse result blocks
    const results: { title: string; snippet: string; url: string }[] = [];
    const blocks = html.split('<div class="result results_links');
    
    for (let i = 1; i < Math.min(blocks.length, 5); i++) {
      const block = blocks[i];
      
      // Extract Title
      const titleMatch = block.match(/<a class="result__url"[^>]*>([\s\S]*?)<\/a>/);
      let title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, "").trim() : "";
      
      // Extract Link URL
      const urlMatch = block.match(/href="([^"]*)"/);
      let url = urlMatch ? urlMatch[1] : "";
      if (url.startsWith("//")) url = "https:" + url;

      // Extract Snippet Text
      const snippetMatch = block.match(/<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
      let snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]*>/g, "").trim() : "";

      // Clean up HTML encoding entities
      title = decodeHtmlEntities(title);
      snippet = decodeHtmlEntities(snippet);

      if (title || snippet) {
        results.push({ title, snippet, url });
      }
    }

    return NextResponse.json({ results });
  } catch (err: any) {
    console.error("Background search API error:", err);
    return NextResponse.json({ error: err.message || "Search failed" }, { status: 500 });
  }
}

// Simple helper to clean up standard HTML entities
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&nbsp;/g, " ");
}
