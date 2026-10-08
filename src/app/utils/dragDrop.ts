export const extractDroppedUrl = (e: any): string | null => {
    try {
        if (e && typeof e.preventDefault === "function") {
            e.preventDefault();
            e.stopPropagation();
        }
        const dt = e?.dataTransfer;
        if (!dt) return null;

        // 1. Try URI list (dragged hyperlinks)
        const uriList = dt.getData("text/uri-list");
        if (uriList && uriList.trim()) {
            const firstUri = uriList.split("\n").map((s: string) => s.trim()).find((s: string) => s && !s.startsWith("#"));
            if (firstUri) return firstUri;
        }

        // 2. Try URL format
        const urlData = dt.getData("URL");
        if (urlData && urlData.trim()) return urlData.trim();

        // 3. Try plain text (selected text or URL text)
        const textData = dt.getData("text/plain") || dt.getData("text");
        if (textData && textData.trim()) return textData.trim();

        // 4. Try HTML format (anchor href or img src)
        const htmlData = dt.getData("text/html");
        if (htmlData) {
            const match = htmlData.match(/href=["']([^"']+)["']/i) || htmlData.match(/src=["']([^"']+)["']/i);
            if (match && match[1]) return match[1];
        }

        // 5. Try local files
        if (dt.files && dt.files.length > 0) {
            const file = dt.files[0];
            if (file && file.path) {
                return `file:///${file.path.replace(/\\/g, "/")}`;
            }
        }
    } catch (err) {
        console.error("Failed to extract dropped URL:", err);
    }
    return null;
};
