export interface Tab {
  id: string;
  url: string;
  initialUrl: string;
  title: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  favicon?: string;
  content?: string;
  consoleLogs?: string[];
  isClosing?: boolean;
}

export interface MacroStep {
  id: string;
  action: "open_tab" | "click_element" | "type_text" | "press_key" | "navigate_tab" | "reload_tab" | "close_tab";
  url?: string;
  selector?: string;
  text?: string;
  submit?: boolean;
  key?: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
}

export interface Macro {
  id: string;
  name: string;
  steps: MacroStep[];
}

export interface AutofillProfile {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  zip: string;
}
