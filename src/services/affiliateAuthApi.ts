import axios from 'axios'
import type { AffiliateAuthResponse, ApiTrace } from '../types/api'

const AUTH_BASE = '/proxy/auth'

export interface AffiliateLoginResult {
  accessToken: string
  refreshToken: string
  expiresIn: number
  trace: ApiTrace
}

/**
 * Login de afiliado via email + senha.
 * POST https://auth-staging.creditas.com.br/api/affiliates/tokens
 */
export async function affiliateLogin(
  username: string,
  password: string,
): Promise<AffiliateLoginResult> {
  const url = `${AUTH_BASE}/api/affiliates/tokens`
  const body = { grant_type: 'password', username, password }
  const headers = { 'Accept-Version': 'v1', 'Content-Type': 'application/json' }
  const start = Date.now()
  const timestamp = new Date().toISOString()

  const trace: ApiTrace = {
    method: 'POST',
    url: 'https://auth-staging.creditas.com.br/api/affiliates/tokens',
    headers: { ...headers },
    requestBody: { ...body, password: '***' },
    timestamp,
  }

  try {
    const res = await axios.post<AffiliateAuthResponse>(url, body, { headers })
    trace.statusCode = res.status
    trace.durationMs = Date.now() - start
    trace.response = {
      token_type: res.data.token_type,
      expires_in: res.data.expires_in,
      access_token: res.data.access_token.substring(0, 30) + '…',
    }
    return {
      accessToken: res.data.access_token,
      refreshToken: res.data.refresh_token,
      expiresIn: res.data.expires_in,
      trace,
    }
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      trace.statusCode = err.response?.status
      trace.durationMs = Date.now() - start
      trace.response = err.response?.data
      trace.error = err.message
    }
    throw { trace, error: axios.isAxiosError(err) ? err.response?.data ?? err.message : String(err) }
  }
}

/**
 * Login de consultor via email + senha.
 * POST https://auth-staging.creditas.com.br/api/consultants/tokens
 */
export async function consultantLogin(
  username: string,
  password: string,
): Promise<AffiliateLoginResult> {
  const url = `${AUTH_BASE}/api/consultants/tokens`
  const body = { grant_type: 'password', username, password }
  const headers = { 'Accept-Version': 'v1', 'Content-Type': 'application/json' }
  const start = Date.now()
  const timestamp = new Date().toISOString()

  const trace: ApiTrace = {
    method: 'POST',
    url: 'https://auth-staging.creditas.com.br/api/consultants/tokens',
    headers: { ...headers },
    requestBody: { ...body, password: '***' },
    timestamp,
  }

  try {
    const res = await axios.post<AffiliateAuthResponse>(url, body, { headers })
    trace.statusCode = res.status
    trace.durationMs = Date.now() - start
    trace.response = {
      token_type: res.data.token_type,
      expires_in: res.data.expires_in,
      access_token: res.data.access_token.substring(0, 30) + '…',
    }
    return {
      accessToken: res.data.access_token,
      refreshToken: res.data.refresh_token,
      expiresIn: res.data.expires_in,
      trace,
    }
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      trace.statusCode = err.response?.status
      trace.durationMs = Date.now() - start
      trace.response = err.response?.data
      trace.error = err.message
    }
    throw { trace, error: axios.isAxiosError(err) ? err.response?.data ?? err.message : String(err) }
  }
}

/**
 * Login de parceiro via consumer_key + consumer_secret.
 * POST https://auth-staging.creditas.com.br/api/affiliate_clients/tokens
 */
export async function partnerClientLogin(
  consumerKey: string,
  consumerSecret: string,
): Promise<AffiliateLoginResult> {
  const url = `${AUTH_BASE}/api/affiliate_clients/tokens`
  const body = { consumer_key: consumerKey, consumer_secret: consumerSecret }
  const headers = { 'Accept-Version': 'v1', 'Content-Type': 'application/json' }
  const start = Date.now()
  const timestamp = new Date().toISOString()

  const trace: ApiTrace = {
    method: 'POST',
    url: 'https://auth-staging.creditas.com.br/api/affiliate_clients/tokens',
    headers: { ...headers },
    requestBody: { consumer_key: consumerKey, consumer_secret: '***' },
    timestamp,
  }

  try {
    const res = await axios.post<AffiliateAuthResponse>(url, body, { headers })
    trace.statusCode = res.status
    trace.durationMs = Date.now() - start
    trace.response = {
      token_type: res.data.token_type,
      expires_in: res.data.expires_in,
      access_token: res.data.access_token.substring(0, 30) + '…',
    }
    return {
      accessToken: res.data.access_token,
      refreshToken: res.data.refresh_token,
      expiresIn: res.data.expires_in,
      trace,
    }
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      trace.statusCode = err.response?.status
      trace.durationMs = Date.now() - start
      trace.response = err.response?.data
      trace.error = err.message
    }
    throw { trace, error: axios.isAxiosError(err) ? err.response?.data ?? err.message : String(err) }
  }
}

/**
 * Extrai o userId do payload do JWT (sem verificação de assinatura).
 */
export function extractUserIdFromJwt(token: string): string {
  try {
    const payload = token.split('.')[1]
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return decoded.user_id ?? decoded.sub ?? ''
  } catch {
    return ''
  }
}
