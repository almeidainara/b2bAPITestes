import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'
import type { ApiTrace } from '../types/api'
import type { PartnerCompany } from '../types/partner'
import { getInternalSettings } from './tokenManager'

/** Em dev: /proxy/partner/... → https://stg-api.creditas.io/partner/... */
const BASE_URL = '/proxy/partner'

let onUnauthorized: ((apiType: 'internal') => Promise<void>) | null = null

export function setInternalUnauthorizedHandler(
  handler: (apiType: 'internal') => Promise<void>,
): void {
  onUnauthorized = handler
}

function buildClient(): AxiosInstance {
  return axios.create({ baseURL: BASE_URL })
}

function buildHeaders(): Record<string, string> {
  const settings = getInternalSettings()
  return {
    'Accept': 'application/vnd.creditas.v1+json',
    'Content-Type': 'application/json',
    'X-User-Id': settings?.userId ?? 'user-uuid',
    'X-User-Type': settings?.userType ?? 'consultant',
    'X-Tenant-Id': settings?.tenantId ?? 'creditasbr',
    ...(settings?.token ? { Authorization: `Bearer ${settings.token}` } : {}),
  }
}

async function request<T>(
  config: AxiosRequestConfig & { url: string },
): Promise<{ data: T; trace: ApiTrace }> {
  const client = buildClient()
  const headers = buildHeaders()
  const start = Date.now()
  const timestamp = new Date().toISOString()

  const maskedHeaders = { ...headers }
  if (maskedHeaders.Authorization) {
    maskedHeaders.Authorization = maskedHeaders.Authorization.substring(0, 30) + '…'
  }

  const trace: ApiTrace = {
    method: config.method?.toUpperCase() ?? 'GET',
    url: `https://stg-api.creditas.io/partner${config.url}`,
    headers: maskedHeaders,
    requestBody: config.data,
    timestamp,
  }

  try {
    const res = await client.request<T>({ ...config, headers })
    trace.statusCode = res.status
    trace.durationMs = Date.now() - start
    trace.response = res.data
    return { data: res.data, trace }
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      trace.statusCode = err.response?.status
      trace.durationMs = Date.now() - start
      trace.response = err.response?.data
      trace.error = err.message

      if (err.response?.status === 401 && onUnauthorized) {
        await onUnauthorized('internal')
        return request<T>(config)
      }

      throw { trace, error: err.response?.data ?? err.message }
    }
    throw { trace, error: String(err) }
  }
}

export async function listPartnerCompanies(
  limit = 200,
  offset = 0,
): Promise<{ data: PartnerCompany[]; trace: ApiTrace }> {
  return request<PartnerCompany[]>({
    method: 'GET',
    url: `/companies?limit=${limit}&offset=${offset}`,
  })
}

export async function getPartnerByCompanyId(
  companyId: string,
): Promise<{ data: PartnerCompany; trace: ApiTrace }> {
  return request<PartnerCompany>({
    method: 'GET',
    url: `/companies/${encodeURIComponent(companyId)}`,
  })
}

export async function getPartnerBySource(
  source: string,
): Promise<{ data: PartnerCompany; trace: ApiTrace }> {
  return request<PartnerCompany>({
    method: 'GET',
    url: `/companies/by-source/${encodeURIComponent(source)}`,
  })
}
