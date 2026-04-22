import type {
  CreateAutoProposalRequest,
  CreateHomeProposalRequest,
  CreateHomeRefiProposalRequest,
} from '../../types/api'

export const DEFAULT_AUTO_PROPOSAL: CreateAutoProposalRequest = {
  productType: 'AUTO_REFINANCING',
  purpose: 'DEBTS_REFINANCING',
  borrower: {
    cpf: '70000000159',
    fullName: 'João da Silva Teste',
    email: 'joao.teste@tuamaeaquelaursa.com',
    cellphoneCode: '11',
    cellphone: '999999999',
    birthDate: '1985-06-15',
    postalCode: '01310100',
    professionalStatus: 'CLT',
    monthlyIncome: 5000,
    authorizationTerms:
      'Autorizo a Creditas a consultar minhas informações no SCR (Sistema de Informações de Crédito) do Banco Central do Brasil.',
    optIns: true,
    maritalStatus: 'SINGLE',
    nationality: 'BRAZILIAN',
    motherName: 'Maria da Silva',
    politicallyExposedPerson: false,
  },
  collateral: {
    licensePlate: 'ABC1D23',
    debt: 0,
    borrowerVehicleOwner: true,
    ownerKinshipDegree: 'SELF',
  },
  intendedCredit: {
    value: 30000,
    loanTerms: 36,
  },
  metadata: {
    externalId: 'test-proposal-001',
    campaign: 'staging-test',
  },
}

export const DEFAULT_HOME_PROPOSAL: CreateHomeProposalRequest = {
  productType: 'HOME_REFINANCING',
  purpose: 'DEBTS_REFINANCING',
  borrower: {
    cpf: '70000000159',
    fullName: 'João da Silva Teste',
    email: 'joao.teste@tuamaeaquelaursa.com',
    cellphoneCode: '11',
    cellphone: '999999999',
    birthDate: '1985-06-15',
    postalCode: '01310100',
    professionalStatus: 'CLT',
    monthlyIncome: 8000,
    authorizationTerms:
      'Autorizo a Creditas a consultar minhas informações no SCR (Sistema de Informações de Crédito) do Banco Central do Brasil.',
    optIns: true,
    maritalStatus: 'SINGLE',
    nationality: 'BRAZILIAN',
    motherName: 'Maria da Silva',
    politicallyExposedPerson: false,
  },
  intendedCredit: {
    value: 100000,
    loanTerms: 60,
  },
  metadata: {
    externalId: 'test-home-proposal-001',
    campaign: 'staging-test',
  },
}

/** Payload padrão para POST /proposals/home (Accept: v2) */
export const DEFAULT_HOME_REFI_PROPOSAL: CreateHomeRefiProposalRequest = {
  productType: 'HOME_REFI',
  purpose: 'OTHERS',
  metadata: { version: '1.0.0', experiments: ['LF_B2B_SIMPLIFY'] },
  urgency: 'ONE_MONTH',
  formReference: 'creditas-api-tester',
  conditions: { installment: { term: 240 } },
  borrower: {
    cpf: '70000000159',
    fullName: 'João da Silva Teste',
    email: 'joao.teste@tuamaeaquelaursa.com',
    gender: 'MALE',
    birthDate: '1985-06-15',
    cellphone: '991234567',
    cellphoneCode: '11',
    postalCode: '01310-100',
    maritalStatus: 'MARRIED',
    stableUnion: false,
    nationality: 'Brasileiro',
    familyMonthlyIncome: 8000,
    monthlyIncome: 5000,
    professionalStatus: 'CLT',
    professionalInfo: {
      professionalStatus: 'CLT',
      monthlyIncome: 5000,
      description: 'Analista de TI',
    },
    optIns: { email: true, whatsApp: true, sms: false },
    authorizationTerms:
      'Ao continuar, você autoriza o parceiro Creditas a consultar o seu histórico de crédito no Sistema de Informações de Crédito – SCR do Banco Central do Brasil.',
    spouse: {
      cpf: '98765432100',
      fullName: 'Maria da Silva Teste',
      email: 'maria.teste@tuamaeaquelaursa.com',
      birthDate: '1988-03-22',
      cellphone: '987654321',
      cellphoneCode: '11',
      nationality: 'Brasileiro',
    },
  },
  intendedCredit: { currency: 'BRL', amount: 150000 },
  collateral: {
    value: 500000,
    debt: 0,
    realEstateType: 'APARTMENT',
    address: 'Rua das Flores',
    number: '123',
    complement: 'Apto 45',
    neighborhood: 'Centro',
    city: 'São Paulo',
    state: 'SP',
    postalCode: '01310-100',
    country: 'BR',
    hasDeed: 'YES',
    owners: ['BORROWER'],
  },
}
