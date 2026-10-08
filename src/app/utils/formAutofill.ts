import { AutofillProfile } from "../types";

export const getAutofillScript = (profile: AutofillProfile) => `
  (() => {
    try {
      const data = ${JSON.stringify(profile)};
      const inputs = Array.from(document.querySelectorAll("input, textarea, select"));

      const findMatch = (input, keys) => {
        const name = (input.name || "").toLowerCase();
        const id = (input.id || "").toLowerCase();
        const placeholder = (input.placeholder || "").toLowerCase();
        const autocomplete = (input.autocomplete || "").toLowerCase();
        const type = (input.type || "").toLowerCase();

        return keys.some(key => 
          name.includes(key) || 
          id.includes(key) || 
          placeholder.includes(key) || 
          autocomplete.includes(key) ||
          (key === "email" && type === "email")
        );
      };

      const setValue = (el, val) => {
        if (!el || !val) return;
        const valueSetter = (Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value") || {}).set;
        const textAreaSetter = (Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value") || {}).set;
        const selectSetter = (Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value") || {}).set;
        
        let setter = valueSetter;
        if (el.tagName === "TEXTAREA") setter = textAreaSetter;
        if (el.tagName === "SELECT") setter = selectSetter;

        if (setter) {
          setter.call(el, val);
        } else {
          el.value = val;
        }
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      };

      let filledCount = 0;
      inputs.forEach(el => {
        if (data.first_name && findMatch(el, ["first", "fname", "givenname"])) {
          setValue(el, data.first_name);
          filledCount++;
        } else if (data.last_name && findMatch(el, ["last", "lname", "surname", "familyname"])) {
          setValue(el, data.last_name);
          filledCount++;
        } else if (data.email && findMatch(el, ["email", "mail"])) {
          setValue(el, data.email);
          filledCount++;
        } else if (data.phone && findMatch(el, ["phone", "tel", "mobile", "contact"])) {
          setValue(el, data.phone);
          filledCount++;
        } else if (data.address && findMatch(el, ["address", "street", "line1"])) {
          setValue(el, data.address);
          filledCount++;
        } else if (data.city && findMatch(el, ["city", "town"])) {
          setValue(el, data.city);
          filledCount++;
        } else if (data.zip && findMatch(el, ["zip", "postal", "postcode"])) {
          setValue(el, data.zip);
          filledCount++;
        }
      });
      
      console.log("Autofilled inputs:", filledCount);
      return filledCount;
    } catch (e) {
      console.error("Autofill error:", e);
      return 0;
    }
  })()
`;
