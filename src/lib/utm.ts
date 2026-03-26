const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;
const STORAGE_KEY = "fabrica_utms";

export type UtmParams = Partial<Record<typeof UTM_KEYS[number], string>>;

export function captureUtms(): void {
  const params = new URLSearchParams(window.location.search);
  const utms: UtmParams = {};
  let hasAny = false;

  for (const key of UTM_KEYS) {
    const val = params.get(key);
    if (val) {
      utms[key] = val;
      hasAny = true;
    }
  }

  if (hasAny) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(utms));
  }
}

export function getStoredUtms(): UtmParams {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function clearStoredUtms(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}
