export interface PartnerCompany {
  id: string
  name: string
  source?: string
  status?: string
  [key: string]: unknown
}

export interface InternalSettings {
  token: string
  userId: string
  userType: string
  tenantId: string
}

export type CredentialAuthType = 'manual' | 'affiliate' | 'consultant' | 'partner_client'

export interface PartnerCredential {
  id: string
  name: string
  companyId: string
  /** 'affiliate' = login via email+senha | 'manual' = token colado */
  authType: CredentialAuthType
  /** Token Bearer (manual ou gerado via login afiliado) */
  token: string
  /** ID do usuário extraído do JWT (necessário para X-User-Id) */
  userId: string
  /** Tipo do usuário para headers (affiliate | consultant) */
  userType: 'affiliate' | 'consultant'
  /** Apenas para authType='affiliate' */
  affiliateEmail?: string
  /** Armazenado para permitir re-login automático (⚠️ localStorage) */
  affiliatePassword?: string
  /** Apenas para authType='partner_client' — permite re-login automático no 401 */
  consumerKey?: string
  consumerSecret?: string
  createdAt: string
}
