import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import type { PartnerCompany, PartnerCredential } from '../types/partner'
import {
  SESSION_CREDENTIAL_ID,
  clearSessionCredential,
  getActiveCredential,
  getActiveCredentialId,
  getInternalSettings,
  getPartnerCredentials,
  getSessionCredential,
  saveSessionCredential,
  setActiveCredentialId,
} from '../services/tokenManager'
import { setInternalUnauthorizedHandler } from '../services/internalApi'
import { setB2BUnauthorizedHandler } from '../services/b2bApi'
import { affiliateLogin, consultantLogin, extractUserIdFromJwt, partnerClientLogin } from '../services/affiliateAuthApi'

// ── Notification ──────────────────────────────────────────────────────────────

export interface Notification {
  id: string
  severity: 'success' | 'error' | 'warning' | 'info'
  message: string
}

// ── Token Dialog state ────────────────────────────────────────────────────────

export interface TokenDialogState {
  open: boolean
  apiType: 'internal' | 'partner' | null
  onSave: () => void
}

// ── Context shape ─────────────────────────────────────────────────────────────

interface AppContextValue {
  // Notifications
  notifications: Notification[]
  pushNotification: (severity: Notification['severity'], message: string) => void
  dismissNotification: (id: string) => void

  // Active partner company (from internal API)
  activePartner: PartnerCompany | null
  setActivePartner: (p: PartnerCompany | null) => void

  // Active credential
  activeCredential: PartnerCredential | null
  setActiveCredentialById: (id: string | null) => void
  setSessionCredential: (cred: PartnerCredential) => void
  clearSessionCredential: () => void
  refreshCredentials: () => void

  // Internal settings configured?
  hasInternalSettings: boolean
  refreshInternalSettings: () => void

  // Token dialog
  tokenDialog: TokenDialogState
  openTokenDialog: (apiType: 'internal' | 'partner') => Promise<void>
  closeTokenDialog: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────────

let notifCounter = 0

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [activePartner, setActivePartner] = useState<PartnerCompany | null>(null)
  const [activeCredential, setActiveCredentialState] = useState<PartnerCredential | null>(
    () => getActiveCredential(),
  )
  const [hasInternalSettings, setHasInternalSettings] = useState(
    () => !!getInternalSettings()?.token,
  )
  const [tokenDialog, setTokenDialog] = useState<TokenDialogState>({
    open: false,
    apiType: null,
    onSave: () => {},
  })

  // Resolver for the Promise returned by openTokenDialog
  const tokenDialogResolverRef = useRef<(() => void) | null>(null)

  const pushNotification = useCallback(
    (severity: Notification['severity'], message: string) => {
      const id = String(++notifCounter)
      setNotifications(n => [...n, { id, severity, message }])
      setTimeout(() => {
        setNotifications(n => n.filter(x => x.id !== id))
      }, 5000)
    },
    [],
  )

  const dismissNotification = useCallback((id: string) => {
    setNotifications(n => n.filter(x => x.id !== id))
  }, [])

  const setActiveCredentialById = useCallback((id: string | null) => {
    setActiveCredentialId(id)
    if (!id) {
      setActiveCredentialState(null)
    } else if (id === SESSION_CREDENTIAL_ID) {
      setActiveCredentialState(getSessionCredential())
    } else {
      setActiveCredentialState(getPartnerCredentials().find(c => c.id === id) ?? null)
    }
  }, [])

  const setSessionCredentialFn = useCallback((cred: PartnerCredential) => {
    saveSessionCredential(cred)
    setActiveCredentialId(SESSION_CREDENTIAL_ID)
    setActiveCredentialState(cred)
  }, [])

  const clearSessionCredentialFn = useCallback(() => {
    clearSessionCredential()
    setActiveCredentialState(null)
  }, [])

  const refreshCredentials = useCallback(() => {
    const id = getActiveCredentialId()
    setActiveCredentialState(getActiveCredential() ?? null)
    void id // suppress unused warning
  }, [])

  const refreshInternalSettings = useCallback(() => {
    setHasInternalSettings(!!getInternalSettings()?.token)
  }, [])

  const openTokenDialog = useCallback((apiType: 'internal' | 'partner'): Promise<void> => {
    return new Promise(resolve => {
      tokenDialogResolverRef.current = resolve
      setTokenDialog({ open: true, apiType, onSave: resolve })
    })
  }, [])

  const closeTokenDialog = useCallback(() => {
    tokenDialogResolverRef.current?.()
    tokenDialogResolverRef.current = null
    setTokenDialog({ open: false, apiType: null, onSave: () => {} })
  }, [])

  // Wire up 401 handlers — tenta re-login automático antes de abrir o dialog
  useEffect(() => {
    setInternalUnauthorizedHandler(async () => {
      await openTokenDialog('internal')
    })

    setB2BUnauthorizedHandler(async () => {
      const cred = getActiveCredential()

      // Re-login automático com consumer_key/secret
      if (cred?.authType === 'partner_client' && cred.consumerKey && cred.consumerSecret) {
        try {
          const result = await partnerClientLogin(cred.consumerKey, cred.consumerSecret)
          const userId = extractUserIdFromJwt(result.accessToken)
          const refreshed: PartnerCredential = { ...cred, token: result.accessToken, userId }
          saveSessionCredential(refreshed)
          setActiveCredentialId(SESSION_CREDENTIAL_ID)
          setActiveCredentialState(refreshed)
          return // token renovado, não abre dialog
        } catch { /* cai no dialog se falhar */ }
      }

      // Re-login automático com email/senha de afiliado
      if (cred?.authType === 'affiliate' && cred.affiliateEmail && cred.affiliatePassword) {
        try {
          const result = await affiliateLogin(cred.affiliateEmail, cred.affiliatePassword)
          const userId = extractUserIdFromJwt(result.accessToken)
          const refreshed: PartnerCredential = { ...cred, token: result.accessToken, userId }
          saveSessionCredential(refreshed)
          setActiveCredentialId(SESSION_CREDENTIAL_ID)
          setActiveCredentialState(refreshed)
          return // token renovado, não abre dialog
        } catch { /* cai no dialog se falhar */ }
      }

      // Re-login automático com email/senha de consultor
      if (cred?.authType === 'consultant' && cred.affiliateEmail && cred.affiliatePassword) {
        try {
          const result = await consultantLogin(cred.affiliateEmail, cred.affiliatePassword)
          const userId = extractUserIdFromJwt(result.accessToken)
          const refreshed: PartnerCredential = { ...cred, token: result.accessToken, userId }
          saveSessionCredential(refreshed)
          setActiveCredentialId(SESSION_CREDENTIAL_ID)
          setActiveCredentialState(refreshed)
          return // token renovado, não abre dialog
        } catch { /* cai no dialog se falhar */ }
      }

      // Sem credenciais para re-login automático → abre dialog manual
      await openTokenDialog('partner')
    })
  }, [openTokenDialog])

  const value: AppContextValue = {
    notifications,
    pushNotification,
    dismissNotification,
    activePartner,
    setActivePartner,
    activeCredential,
    setActiveCredentialById,
    setSessionCredential: setSessionCredentialFn,
    clearSessionCredential: clearSessionCredentialFn,
    refreshCredentials,
    hasInternalSettings,
    refreshInternalSettings,
    tokenDialog,
    openTokenDialog,
    closeTokenDialog,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
