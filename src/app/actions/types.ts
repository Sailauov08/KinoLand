import type { TKey } from "@/lib/i18n/translate";

export interface FormState {
  ok?: boolean;
  error?: TKey;
  message?: TKey;
  fields?: Record<string, true>;
  /** Non-secret values echoed back so React's form reset doesn't wipe them. */
  values?: Record<string, string>;
}

export const initialFormState: FormState = {};
