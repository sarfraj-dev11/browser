import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Fetch live font metadata directly from Google Fonts API
    const res = await fetch("https://fonts.google.com/metadata/fonts", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      next: { revalidate: 86400 }, // Cache for 24 hours
    });

    if (res.ok) {
      const text = await res.text();
      // Google prepends safety prefix `)]}'\n` to JSON responses
      const cleanJsonText = text.replace(/^\)\]\}'\n/, "");
      const parsed = JSON.parse(cleanJsonText);

      if (parsed?.familyMetadataList && Array.isArray(parsed.familyMetadataList)) {
        const fontNames: string[] = parsed.familyMetadataList
          .map((item: any) => item.family)
          .filter(Boolean)
          .sort((a: string, b: string) => a.localeCompare(b));

        if (fontNames.length > 0) {
          return NextResponse.json({ fonts: fontNames });
        }
      }
    }
  } catch (err) {
    console.error("Failed to fetch live Google Fonts from API:", err);
  }

  // Robust fallback catalog if offline
  return NextResponse.json({
    fonts: [
      "Poppins", "Inter", "Roboto", "Open Sans", "Montserrat", "Lato", "Oswald", "Raleway",
      "Nunito", "Ubuntu", "Merriweather", "Playfair Display", "Rubik", "Work Sans", "Fira Sans",
      "Quicksand", "Plus Jakarta Sans", "Outfit", "Kumbh Sans", "Lexend", "Space Grotesk",
      "Syne", "Sora", "Urbanist", "Manrope", "Epilogue", "Dela Gothic One", "Space Mono",
      "Fira Code", "JetBrains Mono", "Roboto Mono", "Source Code Pro", "Courier Prime",
      "Lora", "Cinzel", "PT Serif", "EB Garamond", "Cormorant Garamond", "Baskervville"
    ],
  });
}
