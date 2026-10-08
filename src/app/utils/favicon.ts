export interface TabLike {
  url: string;
  favicon?: string;
}

export const getFaviconUrl = (tabOrUrl: TabLike | string, favicon?: string): string => {
  if (typeof tabOrUrl === "object" && tabOrUrl !== null) {
    const url = tabOrUrl.url;
    const fav = tabOrUrl.favicon;
    return getFaviconUrl(url, fav);
  }

  const url = tabOrUrl as string;
  if (favicon) return favicon;
  if (url === "about:newtab" || !url) return "/logo/brocus-logo.webp";
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes("google.com") && urlObj.pathname.includes("/search")) {
      return "/logo/brocus-logo.webp";
    }
    return `https://www.google.com/s2/favicons?sz=32&domain=${urlObj.hostname}`;
  } catch {
    return "/logo/brocus-logo.webp";
  }
};
