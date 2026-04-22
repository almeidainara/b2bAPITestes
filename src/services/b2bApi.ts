import axios, { type AxiosRequestConfig } from 'axios'
import type {
  AffiliateProposalHeaders,
  ApiTrace,
  CreateHomeRefiProposalRequest,
  CreateOfferRequest,
  CreateProposalRequest,
  EligibilityRequest,
  EligibilityResult,
  HomeRefiProposalResponse,
  OfferResponse,
  ProposalListResponse,
  SimulationItem,
  SimulationRequest,
} from '../types/api'
import { getActiveCredential } from './tokenManager'

/** Em dev: /proxy/b2b/... → https://stg-api.creditas.io/b2b/...
 *  Em prod: substitua pelo seu backend/proxy de produção */
const BASE_URL = '/proxy/b2b'

let onUnauthorized: ((apiType: 'partner') => Promise<void>) | null = null

export function setB2BUnauthorizedHandler(
  handler: (apiType: 'partner') => Promise<void>,
): void {
  onUnauthorized = handler
}

function buildHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const cred = getActiveCredential()
  return {
    'Accept': 'application/vnd.creditas.v1+json',
    'Content-Type': 'application/json;charset=UTF-8',
    ...(cred?.token ? { Authorization: `Bearer ${cred.token}` } : {}),
    ...(cred?.userId ? { 'X-User-Id': cred.userId } : {}),
    ...(cred?.userType ? { 'X-User-Type': cred.userType } : {}),
    ...extra,
  }
}

function maskHeaders(headers: Record<string, string>): Record<string, string> {
  const masked = { ...headers }
  if (masked.Authorization) {
    masked.Authorization = masked.Authorization.substring(0, 30) + '…'
  }
  return masked
}

async function request<T>(
  config: AxiosRequestConfig & { url: string },
  extraHeaders: Record<string, string> = {},
  retried = false,
): Promise<{ data: T; trace: ApiTrace }> {
  const headers = buildHeaders(extraHeaders)
  const start = Date.now()
  const timestamp = new Date().toISOString()
  const fullUrl = `${BASE_URL}${config.url}`

  // Display URL shows the real remote URL for developer readability
  const displayUrl = `https://stg-api.creditas.io/b2b${config.url}`

  const trace: ApiTrace = {
    method: config.method?.toUpperCase() ?? 'GET',
    url: displayUrl,
    headers: maskHeaders(headers),
    requestBody: config.data,
    timestamp,
  }

  try {
    const res = await axios.request<T>({ ...config, url: fullUrl, headers })
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

      if (err.response?.status === 401 && !retried && onUnauthorized) {
        await onUnauthorized('partner')
        return request<T>(config, extraHeaders, true)
      }

      throw { trace, error: err.response?.data ?? err.message }
    }
    throw { trace, error: String(err) }
  }
}

// ── Eligibility ───────────────────────────────────────────────────────────────

export async function checkEligibility(
  params: EligibilityRequest,
): Promise<{ data: EligibilityResult[]; trace: ApiTrace }> {
  const query = new URLSearchParams({
    cpf: params.cpf,
    email: params.email,
    ...(params.productType ? { productType: params.productType } : {}),
  })
  return request<EligibilityResult[]>({
    method: 'GET',
    url: `/borrowers/eligibility?${query.toString()}`,
  })
}

// ── Offers (Auto) ─────────────────────────────────────────────────────────────

export async function createOffer(
  body: CreateOfferRequest,
): Promise<{ data: OfferResponse; trace: ApiTrace }> {
  return request<OfferResponse>({ method: 'POST', url: '/offers', data: body })
}

export async function getOffer(
  id: string,
): Promise<{ data: OfferResponse; trace: ApiTrace }> {
  return request<OfferResponse>({ method: 'GET', url: `/offers/${encodeURIComponent(id)}` })
}

// ── Simulations (Home) ────────────────────────────────────────────────────────

export async function getSimulations(
  params: SimulationRequest,
): Promise<{ data: SimulationItem[]; trace: ApiTrace }> {
  const query = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  )
  return request<SimulationItem[]>({
    method: 'GET',
    url: `/simulations?${query.toString()}`,
  })
}

// ── Proposals (Auto / legacy Home) ───────────────────────────────────────────

export async function createProposal(
  body: CreateProposalRequest,
  extraHeaders: Record<string, string> = {},
): Promise<{ data: unknown; trace: ApiTrace }> {
  return request<unknown>({ method: 'POST', url: '/proposals', data: body }, extraHeaders)
}

// ── HOME_REFI Proposal (affiliate flow) ───────────────────────────────────────

/**
 * Remove campos null, undefined e string vazia de um objeto (shallow).
 * Evita que campos opcionais vazios causem erros de deserialização na API Java.
 */
function stripEmpty<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && v !== ''),
  ) as Partial<T>
}

export async function createHomeRefiProposal(
  body: CreateHomeRefiProposalRequest,
  affiliateHeaders: AffiliateProposalHeaders = {},
  endpoint: '/proposals' | '/proposals/home' = '/proposals',
): Promise<{ data: HomeRefiProposalResponse; trace: ApiTrace }> {
  const extra: Record<string, string> = {
    'X-User-Agent': affiliateHeaders.userAgent ?? 'creditas-api-tester',
    'X-User-Ip': affiliateHeaders.userIp ?? '191.47.43.210',
    // BACEN sempre obrigatório — formato: YYYY-MM-DDTHH:mm
    'X-Bacen-Authorized-At': affiliateHeaders.bacenAuthorizedAt ?? new Date().toISOString().substring(0, 16),
  }

  // Sanitiza collateral e residence: remove campos opcionais vazios (string vazia,
  // undefined, null) para evitar MISMATCH_INPUT no deserializador Java da API.
  const cleanBody = {
    ...body,
    collateral: stripEmpty(body.collateral),
    borrower: {
      ...body.borrower,
      ...(body.borrower.residence ? { residence: stripEmpty(body.borrower.residence) } : {}),
    },
  }

  return request<HomeRefiProposalResponse>(
    { method: 'POST', url: endpoint, data: cleanBody },
    extra,
  )
}

// ── Listagem de propostas ─────────────────────────────────────────────────────

export interface ListProposalsParams {
  companyId?: string
  status?: string
  productType?: string
  page?: number
  size?: number
}

export async function listProposals(
  params: ListProposalsParams = {},
): Promise<{ data: ProposalListResponse; trace: ApiTrace }> {
  const query = new URLSearchParams()
  if (params.companyId) query.set('companyId', params.companyId)
  if (params.status)    query.set('status', params.status)
  if (params.productType) query.set('productType', params.productType)
  query.set('page', String(params.page ?? 0))
  query.set('size', String(params.size ?? 20))
  return request<ProposalListResponse>({
    method: 'GET',
    url: `/proposals?${query.toString()}`,
  })
}

// ── Inspection Link ───────────────────────────────────────────────────────────

export async function getInspectionLink(
  proposalId: string,
): Promise<{ data: { url: string }; trace: ApiTrace }> {
  return request<{ url: string }>({
    method: 'GET',
    url: `/proposals/${encodeURIComponent(proposalId)}/inspection-link`,
  })
}
