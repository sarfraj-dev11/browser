export const cookieAnnihilatorScript = `
  (() => {
    try {
      const selectors = [
        "[id*='cookie-notification']", "[class*='cookie-notification']",
        "[id*='cookie-banner']", "[class*='cookie-banner']",
        "[id*='cookie-consent']", "[class*='cookie-consent']",
        "[id*='consent-banner']", "[class*='consent-banner']",
        "[id*='qc-cmp2-container']", 
        ".ot-sdk-container", 
        "#onetrust-consent-sdk",
        "[class*='cookie-control']",
        "#cookie-bar",
        ".cookie-notice",
        ".banner-cookie",
        "#cookieConsent",
        ".cookie-accept"
      ];
      
      // Hide banner overlay elements directly
      selectors.forEach(sel => {
        try {
          document.querySelectorAll(sel).forEach(el => {
            (el as HTMLElement).style.setProperty("display", "none", "important");
          });
        } catch(e) {}
      });

      // Auto-click consent button selectors
      const buttonTexts = [
        "accept all", "accept", "agree", "allow all", "i accept", 
        "allow cookies", "ok", "got it", "i agree", "close & accept"
      ];
      
      const buttons = Array.from(document.querySelectorAll("button, a, [role='button']"));
      for (const btn of buttons) {
        const txt = (btn.textContent || "").trim().toLowerCase();
        if (buttonTexts.includes(txt)) {
          (btn as HTMLElement).click();
          console.log("Annihilated cookie banner by clicking:", txt);
        }
      }
    } catch (e) {
      console.error("Cookie annihilator error:", e);
    }
  })()
`;
