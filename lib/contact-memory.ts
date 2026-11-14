'use client';

export interface RememberedContact {
  name: string;
  email: string;
  phone: string;
}

const KEY = 'rl_contact';

/** Contact details a visitor has already entered, kept in their browser so repeat enquiries are one click. */
export function recallContact(): RememberedContact | null {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? 'null') as Partial<RememberedContact> | null;
    if (!parsed || typeof parsed.name !== 'string' || typeof parsed.email !== 'string') return null;
    return { name: parsed.name, email: parsed.email, phone: typeof parsed.phone === 'string' ? parsed.phone : '' };
  } catch {
    return null;
  }
}

export function rememberContact(contact: RememberedContact) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(contact));
  } catch {
    // Storage unavailable: nothing to remember.
  }
}
