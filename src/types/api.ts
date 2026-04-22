export type ProductType = 'AUTO_REFINANCING' | 'HOME_REFINANCING'

export type ProfessionalStatus =
  | 'CLT'
  | 'SELF_EMPLOYED'
  | 'FREELANCER'
  | 'BUSINESSMAN'
  | 'CIVIL_SERVANT'
  | 'RETIRED'

export type Amortization = 'PRICE' | 'SAC'

// ── Affiliate Auth ────────────────────────────────────────────────────────────

export interface AffiliateAuthRequest {
  grant_type: 'password'
  username: string
  password: string
}

export interface AffiliateAuthResponse {
  access_token: string
  token_type: string
  refresh_token: string
  expires_in: number
}

// ── Eligibility ──────────────────────────────────────────────────────────────

export interface EligibilityRequest {
  cpf: string
  email: string
  productType?: ProductType
}

export interface EligibilityResult {
  product: ProductType
  eligible: boolean
}

// ── Offers (Auto) ─────────────────────────────────────────────────────────────

export interface OfferBorrower {
  cpf: string
  fullName: string
  email: string
  cellphoneCode: string
  cellphone: string
  birthDate: string
  postalCode: string
  professionalStatus: ProfessionalStatus
  monthlyIncome: number
  authorizationTerms: string
  optIns: boolean
}

export interface OfferIntendedCredit {
  value: number
  loanTerms: number
}

export interface OfferCollateral {
  licensePlate: string
  debt: number
  borrowerVehicleOwner?: boolean
}

export interface CreateOfferRequest {
  purpose: string
  borrower: OfferBorrower
  intendedCredit: OfferIntendedCredit
  collateral: OfferCollateral
  metadata?: Record<string, unknown>
}

export interface OfferItem {
  id: string
  term: number
  installment: number
  interestRate: number
  cet: number
  loanAmount: number
}

export interface OfferResponse {
  id: string
  approvedStatus: string
  offers: OfferItem[]
}

// ── Simulations (Home) ────────────────────────────────────────────────────────

export interface SimulationRequest {
  cpf: string
  value: number
  loanTerms: number
  monthlyIncome: number
  professionalStatus: ProfessionalStatus
  productType: 'HOME_REFI'
  uf: string
  amortization?: Amortization
}

export interface SimulationItem {
  term: number
  minMonthlyIncome: number
  installment: number
  interestRate: number
  cet: number
  loanAmount: number
}

// ── Proposals (Auto) ──────────────────────────────────────────────────────────

export interface ProposalBorrower extends OfferBorrower {
  maritalStatus?: string
  nationality?: string
  motherName?: string
  fatherName?: string
  rg?: string
  rgIssuer?: string
  rgIssuerState?: string
  rgIssuanceDate?: string
  politicallyExposedPerson?: boolean
}

export interface ProposalCollateral {
  licensePlate: string
  debt: number
  borrowerVehicleOwner?: boolean
  ownerKinshipDegree?: string
}

export interface ProposalConditions {
  offerId?: string
  loanTerms: number
  installment: number
  interestRate: number
  loanAmount: number
  amortization?: Amortization
}

export interface CreateAutoProposalRequest {
  productType: 'AUTO_REFINANCING'
  purpose: string
  borrower: ProposalBorrower
  collateral: ProposalCollateral
  intendedCredit: OfferIntendedCredit
  conditions?: ProposalConditions
  offerId?: string
  metadata?: Record<string, unknown>
}

export interface CreateHomeProposalRequest {
  productType: 'HOME_REFINANCING'
  purpose: string
  borrower: ProposalBorrower
  intendedCredit: OfferIntendedCredit
  conditions?: ProposalConditions
  metadata?: Record<string, unknown>
}

export type CreateProposalRequest = CreateAutoProposalRequest | CreateHomeProposalRequest

// ── HOME_REFI proposal (POST /proposals/home — Accept: v2) ───────────────────

export interface HomeRefinancingOptIns {
  email: boolean
  whatsApp: boolean
  sms: boolean
}

export interface HomeRefinancingProfessionalInfo {
  professionalStatus: ProfessionalStatus
  monthlyIncome: number
  startedAt?: string
  jobTitle?: string
  description?: string
  regularContract?: boolean
  company?: {
    cnpj?: string
    revenue?: number
  }
}

/**
 * Endereço simples — usado em borrower.residence
 * (não tem value/debt/realEstateType, é só o endereço de moradia do solicitante)
 */
export interface HomeRefinancingAddress {
  address: string
  /** Pode ser string ou number dependendo do endpoint */
  number: string
  city: string
  complement?: string
  state: string
  neighborhood: string
  postalCode: string
  /** Código ISO 3166-1 alpha-2: "BR" */
  country: string
}

export interface HomeRefinancingSpouse {
  cpf: string
  fullName: string
  email: string
  birthDate: string
  cellphone: string
  cellphoneCode: string
  nationality: string
  isCosigner?: boolean
  professionalInfo?: HomeRefinancingProfessionalInfo
}

export interface HomeRefinancingBorrower {
  cpf: string
  fullName: string
  email: string
  gender?: 'MALE' | 'FEMALE' | 'OTHER'
  birthDate: string
  cellphone: string
  cellphoneCode: string
  postalCode: string
  maritalStatus?: string
  stableUnion?: boolean
  nationality?: string
  /** Renda familiar total (borrower + cônjuge) */
  familyMonthlyIncome?: number
  /** Renda mensal individual do borrower (campo direto exigido pela API) */
  monthlyIncome?: number
  /** Status profissional do borrower (campo direto exigido pela API) */
  professionalStatus?: string
  professionalInfo: HomeRefinancingProfessionalInfo
  optIns: HomeRefinancingOptIns
  authorizationTerms: string
  spouse?: HomeRefinancingSpouse
  /** Endereço de moradia — omitir quando é o mesmo do collateral */
  residence?: HomeRefinancingAddress
}

/** Garantia do imóvel — tem todos os campos de endereço + dados financeiros */
export interface HomeRefinancingCollateral extends HomeRefinancingAddress {
  value: number
  debt: number
  realEstateType: 'HOUSE' | 'APARTMENT' | 'COMMERCIAL'
  hasDeed: 'YES' | 'NO' | 'DO_NOT_KNOW'
  owners?: Array<'BORROWER' | 'SPOUSE'>
}

export interface HomeRefinancingIntendedCredit {
  currency: 'BRL'
  amount: number
}

export interface HomeRefinancingConditions {
  installment: {
    term: number
  }
}

export type HomeRefinancingUrgency =
  | 'ONE_MONTH'
  | 'TWO_MONTHS'
  | 'SIX_MONTHS'
  | 'JUST_SEARCHING'

export interface CreateHomeRefiProposalRequest {
  productType: 'HOME_REFI'
  purpose: string
  metadata?: Record<string, unknown>
  urgency?: HomeRefinancingUrgency
  formReference?: string
  borrower: HomeRefinancingBorrower
  conditions: HomeRefinancingConditions
  intendedCredit: HomeRefinancingIntendedCredit
  collateral: HomeRefinancingCollateral
}

export interface HomeRefiProposalResponse {
  id: string
  productType: string
}

// ── Extra headers for affiliate proposals ─────────────────────────────────────

export interface AffiliateProposalHeaders {
  bacenAuthorizedAt?: string   // X-Bacen-Authorized-At (ISO datetime)
  userAgent?: string           // X-User-Agent
  userIp?: string              // X-User-Ip
}

export interface ProposalResponse {
  id: string
  legacyId?: string
  productType: ProductType | string
  status?: string
}

// ── Listagem de propostas ─────────────────────────────────────────────────────

export interface ProposalListItem {
  id: string
  legacyId?: string
  productType: string
  status: string
  createdAt?: string
  updatedAt?: string
  companyId?: string
  borrower?: {
    cpf?: string
    fullName?: string
    email?: string
  }
  [key: string]: unknown
}

export interface ProposalListResponse {
  content: ProposalListItem[]
  totalElements: number
  totalPages: number
  size: number
  number: number   // página atual (0-based)
}

// ── API call trace ─────────────────────────────────────────────────────────────

export interface ApiTrace {
  method: string
  url: string
  headers: Record<string, string>
  requestBody?: unknown
  response?: unknown
  statusCode?: number
  durationMs?: number
  error?: string
  timestamp: string
}
