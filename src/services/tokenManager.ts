import type { InternalSettings, PartnerCredential } from '../types/partner'

const INTERNAL_SETTINGS_KEY = 'creditas_internal_settings'
const PARTNER_CREDENTIALS_KEY = 'creditas_partner_credentials'
const ACTIVE_CREDENTIAL_KEY = 'creditas_active_credential_id'
const SESSION_CREDENTIAL_KEY = 'creditas_session_credential'

/** ID reservado para a sessão de login rápido (não aparece na lista de credenciais salvas) */
export const SESSION_CREDENTIAL_ID = '__session__'

// ── Internal settings ─────────────────────────────────────────────────────────

export function getInternalSettings(): InternalSettings | null {
  const raw = localStorage.getItem(INTERNAL_SETTINGS_KEY)
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export function saveInternalSettings(settings: InternalSettings): void {
  localStorage.setItem(INTERNAL_SETTINGS_KEY, JSON.stringify(settings))
}

// ── Partner credentials (saved list) ─────────────────────────────────────────

export function getPartnerCredentials(): PartnerCredential[] {
  const raw = localStorage.getItem(PARTNER_CREDENTIALS_KEY)
  if (!raw) return []
  try {
    const list = JSON.parse(raw) as PartnerCredential[]
    // Migrate legacy credentials without authType/userType
    return list.map(c => ({
      ...c,
      authType: c.authType ?? ('manual' as const),
      userType: c.userType ?? ('consultant' as const),
      userId: c.userId ?? '',
    }))
  } catch { return [] }
}

export function savePartnerCredentials(creds: PartnerCredential[]): void {
  localStorage.setItem(PARTNER_CREDENTIALS_KEY, JSON.stringify(creds))
}

export function addPartnerCredential(cred: PartnerCredential): void {
  const creds = getPartnerCredentials()
  const idx = creds.findIndex(c => c.id === cred.id)
  if (idx >= 0) creds[idx] = cred
  else creds.push(cred)
  savePartnerCredentials(creds)
}

export function removePartnerCredential(id: string): void {
  const creds = getPartnerCredentials().filter(c => c.id !== id)
  savePartnerCredentials(creds)
  if (getActiveCredentialId() === id) setActiveCredentialId(null)
}

export function updatePartnerToken(id: string, token: string, userId?: string): void {
  const creds = getPartnerCredentials()
  const idx = creds.findIndex(c => c.id === id)
  if (idx >= 0) {
    creds[idx].token = token
    if (userId !== undefined) creds[idx].userId = userId
    savePartnerCredentials(creds)
  }
}

// ── Session credential (login rápido — não salvo na lista) ────────────────────

export function getSessionCredential(): PartnerCredential | null {
  const raw = localStorage.getItem(SESSION_CREDENTIAL_KEY)
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export function saveSessionCredential(cred: PartnerCredential): void {
  localStorage.setItem(SESSION_CREDENTIAL_KEY, JSON.stringify(cred))
}

export function clearSessionCredential(): void {
  localStorage.removeItem(SESSION_CREDENTIAL_KEY)
  if (getActiveCredentialId() === SESSION_CREDENTIAL_ID) {
    setActiveCredentialId(null)
  }
}

// ── Active credential ─────────────────────────────────────────────────────────

export function getActiveCredentialId(): string | null {
  return localStorage.getItem(ACTIVE_CREDENTIAL_KEY)
}

export function setActiveCredentialId(id: string | null): void {
  if (id) localStorage.setItem(ACTIVE_CREDENTIAL_KEY, id)
  else localStorage.removeItem(ACTIVE_CREDENTIAL_KEY)
}

export function getActiveCredential(): PartnerCredential | null {
  const id = getActiveCredentialId()
  if (!id) return null
  if (id === SESSION_CREDENTIAL_ID) return getSessionCredential()
  return getPartnerCredentials().find(c => c.id === id) ?? null
}

// ── Token update for internal (after 401) ─────────────────────────────────────

export function updateInternalToken(token: string): void {
  const settings = getInternalSettings()
  if (settings) {
    saveInternalSettings({ ...settings, token })
  } else {
    saveInternalSettings({
      token,
      userId: 'user-uuid',
      userType: 'consultant',
      tenantId: 'creditasbr',
    })
  }
}
