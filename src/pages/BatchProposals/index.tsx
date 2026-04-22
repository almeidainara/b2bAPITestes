import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CasinoIcon from '@mui/icons-material/Casino'
import ErrorIcon from '@mui/icons-material/Error'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { ApiPanel } from '../../components/ApiPanel'
import { useApp } from '../../context/AppContext'
import { checkEligibility, createHomeRefiProposal } from '../../services/b2bApi'
import type { ApiTrace, CreateHomeRefiProposalRequest } from '../../types/api'
import tokens from '../../theme/tokens'
import { randomTestCpf, randomTestCpfs } from '../../utils/cpf'

// Mapa de bodies aleatórios (preenchido pelo Aleatorizar; vazio = usa buildDefaultBody)
type RandomBodies = Record<number, CreateHomeRefiProposalRequest>

// ── Random data helpers ───────────────────────────────────────────────────────

function rnd(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

const FIRST_NAMES_MALE = ['Bruno','Diego','Felipe','Henrique','Joao','Lucas','Nuno','Paulo','Rafael','Thiago','Vitor']
const FIRST_NAMES_FEMALE = ['Ana','Carla','Eva','Gabriela','Isabela','Karen','Marina','Olivia','Sofia','Wanda','Yasmin']
const LAST_NAMES = [
  'Silva','Santos','Oliveira','Souza','Rodrigues','Ferreira','Alves','Pereira',
  'Lima','Gomes','Costa','Ribeiro','Martins','Carvalho','Almeida','Lopes',
  'Nascimento','Mendes','Moreira','Barbosa',
]
const SPOUSE_NAMES = [
  'Maria Silva Santos','Ana Oliveira Costa','Fernanda Lima Souza',
  'Juliana Pereira Alves','Carla Rodrigues Martins','Patricia Fernandes Gomes',
  'Roberto Alves Lima','Carlos Souza Pereira','Eduardo Martins Costa',
  'Marcelo Ribeiro Santos','Fabio Oliveira Gomes','Anderson Silva Ferreira',
]
const STATES = ['SP','RJ','MG','RS','PR','BA','SC','GO','DF','ES']
const NEIGHBORHOODS: Record<string, string[]> = {
  SP: ['Brooklin','Moema','Vila Olímpia','Pinheiros','Perdizes','Lapa'],
  RJ: ['Barra da Tijuca','Botafogo','Flamengo','Ipanema','Leblon','Tijuca'],
  MG: ['Savassi','Lourdes','Funcionários','Cidade Nova','Buritis'],
  default: ['Centro','Jardim América','Vila Nova','Boa Vista','São Luís'],
}
const STREETS = [
  'Av. Paulista','Rua Augusta','Av. Rebouças','Rua Oscar Freire',
  'Av. Brigadeiro Faria Lima','Rua da Consolação','Av. Nove de Julho',
  'Rua Vergueiro','Av. Santo André','Rua São Paulo',
]
const PURPOSES = ['DEBTS_REFINANCING','DEBTS_PAYMENT','REAL_ESTATE_RENOVATION','INVESTMENT_IN_OWN_BUSINESS','OTHERS']
const PROFESSIONAL_STATUSES: Array<'CLT' | 'SELF_EMPLOYED' | 'BUSINESSMAN' | 'CIVIL_SERVANT' | 'RETIRED'> = ['CLT','SELF_EMPLOYED','BUSINESSMAN','CIVIL_SERVANT','RETIRED']
const REAL_ESTATE_TYPES: Array<'HOUSE' | 'APARTMENT' | 'COMMERCIAL'> = ['HOUSE','APARTMENT','COMMERCIAL']

function randomName(gender: 'MALE' | 'FEMALE' = 'MALE'): string {
  const first = gender === 'FEMALE' ? pick(FIRST_NAMES_FEMALE) : pick(FIRST_NAMES_MALE)
  return `${first} ${pick(LAST_NAMES)} ${pick(LAST_NAMES)}`
}
function randomEmail(name: string, salt: number): string {
  const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '.').replace(/[^a-z.]/g, '')
  return `${slug}.${salt}@tuamaeaquelaursa.com`
}
function randomBirthDate(): string {
  const year = new Date().getFullYear() - rnd(25, 58)
  return `${year}-${String(rnd(1, 12)).padStart(2, '0')}-${String(rnd(1, 28)).padStart(2, '0')}`
}
function randomPhone(): string {
  return `9${String(rnd(10000000, 99999999))}`
}
function randomIncome(): number {
  return rnd(5, 40) * 1000
}
function randomLoanAmount(): number {
  return rnd(5, 30) * 10000
}
function randomCollateralValue(loanAmount: number): number {
  return Math.ceil((loanAmount * rnd(3, 6)) / 10000) * 10000
}
function randomTerm(): number {
  return pick([36, 60, 84, 120, 180, 240])
}

function randomPostalCodeFormatted(): string {
  const n = rnd(10000000, 99999999)
  return `${String(n).slice(0, 5)}-${String(n).slice(5)}`
}

function buildRandomProposalBody(cpf: string, email: string, fullName: string, gender: 'MALE' | 'FEMALE', idx: number): CreateHomeRefiProposalRequest {
  const state = pick(STATES)
  const neighborhood = pick(NEIGHBORHOODS[state] ?? NEIGHBORHOODS.default)
  const street = pick(STREETS)
  const postalCode = randomPostalCodeFormatted()
  const loanAmount = randomLoanAmount()
  const collateralValue = randomCollateralValue(loanAmount)
  const realEstateType = pick(REAL_ESTATE_TYPES)
  const purpose = pick(PURPOSES)
  const maritalStatus = 'MARRIED'
  const borrowerIncome = randomIncome()
  const spouseIncome = randomIncome()
  const profStatus = pick(PROFESSIONAL_STATUSES)
  const cityMap: Record<string, string> = { SP: 'São Paulo', RJ: 'Rio de Janeiro', MG: 'Belo Horizonte', RS: 'Porto Alegre', PR: 'Curitiba', BA: 'Salvador', SC: 'Florianópolis', GO: 'Goiânia', DF: 'Brasília', ES: 'Vitória' }
  const city = cityMap[state] ?? 'São Paulo'
  const complement = pick(['Apto 101','Apto 203','Casa','Bloco A','Cobertura', undefined])

  const collateralAddress = {
    address: street,
    number: String(rnd(1, 9999)),
    city,
    ...(complement ? { complement } : {}),
    state,
    neighborhood,
    postalCode,
    country: 'BR',
  }

  return {
    productType: 'HOME_REFI',
    purpose,
    metadata: { version: '1.0.0', experiments: ['LF_B2B_SIMPLIFY'], externalId: `batch-${idx + 1}-${Date.now()}` },
    urgency: pick(['ONE_MONTH','TWO_MONTHS','SIX_MONTHS','JUST_SEARCHING']),
    formReference: `creditas-api-tester-batch-${idx + 1}`,
    conditions: { installment: { term: randomTerm() } },
    borrower: {
      cpf,
      fullName,
      email,
      gender,
      birthDate: randomBirthDate(),
      cellphone: randomPhone(),
      cellphoneCode: String(rnd(11, 99)),
      postalCode,
      maritalStatus,
      stableUnion: false,
      nationality: 'Brasileiro',
      familyMonthlyIncome: borrowerIncome + spouseIncome,
      monthlyIncome: borrowerIncome,
      professionalStatus: profStatus,
      professionalInfo: {
        professionalStatus: profStatus,
        monthlyIncome: borrowerIncome,
      },
      optIns: { email: Math.random() > 0.5, whatsApp: true, sms: false },
      authorizationTerms:
        'Ao continuar, você autoriza o parceiro Creditas a consultar o seu histórico de crédito no Sistema de Informações de Crédito – SCR do Banco Central do Brasil.',
      spouse: {
        cpf: randomTestCpf(),
        fullName: pick(SPOUSE_NAMES),
        email: randomEmail(pick(SPOUSE_NAMES), Date.now() + idx),
        birthDate: randomBirthDate(),
        cellphone: randomPhone(),
        cellphoneCode: String(rnd(11, 99)),
        nationality: 'Brasileiro',
        isCosigner: false,
      },
    },
    intendedCredit: { currency: 'BRL', amount: loanAmount },
    collateral: {
      ...collateralAddress,
      value: collateralValue,
      debt: rnd(0, 1) === 0 ? 0 : rnd(1, 5) * 10000,
      realEstateType,
      hasDeed: pick(['YES', 'YES', 'YES', 'NO', 'DO_NOT_KNOW']),
      owners: ['BORROWER'],
    },
  }
}

// ── Default bodies (determinísticos) ─────────────────────────────────────────

function buildDefaultBody(cfg: ProposalConfig, idx: number): CreateHomeRefiProposalRequest {
  const income = 5000 + idx * 500
  return {
    productType: 'HOME_REFI',
    purpose: 'OTHERS',
    metadata: { version: '1.0.0', experiments: ['LF_B2B_SIMPLIFY'], externalId: `batch-home-refi-${idx + 1}` },
    urgency: 'ONE_MONTH',
    formReference: `creditas-api-tester-batch-${idx + 1}`,
    conditions: { installment: { term: 240 } },
    borrower: {
      cpf: cfg.cpf,
      fullName: cfg.fullName,
      email: cfg.email,
      gender: 'MALE',
      birthDate: '1988-03-22',
      cellphone: `9912345${String(idx).padStart(2, '0')}`,
      cellphoneCode: '11',
      postalCode: '01310-100',
      maritalStatus: 'MARRIED',
      stableUnion: false,
      nationality: 'Brasileiro',
      familyMonthlyIncome: income * 2,
      monthlyIncome: income,
      professionalStatus: 'CLT',
      professionalInfo: {
        professionalStatus: 'CLT',
        monthlyIncome: income,
        description: 'Analista de TI',
      },
      optIns: { email: true, whatsApp: true, sms: false },
      authorizationTerms:
        'Ao continuar, você autoriza o parceiro Creditas a consultar o seu histórico de crédito no Sistema de Informações de Crédito – SCR do Banco Central do Brasil.',
      spouse: {
        cpf: generateTestCpf(idx + 10),
        fullName: SPOUSE_NAMES[idx % SPOUSE_NAMES.length],
        email: `conjuge.lote${idx + 1}@tuamaeaquelaursa.com`,
        birthDate: '1990-05-10',
        cellphone: `9887654${String(idx).padStart(2, '0')}`,
        cellphoneCode: '11',
        nationality: 'Brasileiro',
        isCosigner: false,
      },
    },
    intendedCredit: { currency: 'BRL', amount: 80000 + idx * 10000 },
    collateral: {
      value: 500000,
      debt: 0,
      realEstateType: 'APARTMENT',
      address: 'Rua das Flores',
      number: String(100 + idx),
      complement: `Apto ${idx + 1}`,
      neighborhood: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      postalCode: '01310-100',
      country: 'BR',
      hasDeed: 'YES',
      owners: ['BORROWER'],
    },
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProposalConfig {
  label: string
  cpf: string
  email: string
  fullName: string
  checkEligibility: boolean
  addBacen: boolean
  // Sem `body` no estado — sempre reconstruído em handleRun para evitar cache stale do HMR
}

type ProposalStatus = 'idle' | 'running' | 'success' | 'error'

interface ProposalResult {
  status: ProposalStatus
  eligibilityTrace?: ApiTrace
  eligibilityPassed?: boolean
  proposalTrace?: ApiTrace
  proposalId?: string
  error?: string
}

// ── Default config matrix ─────────────────────────────────────────────────────

function buildDefaultConfigs(): ProposalConfig[] {
  // CPFs únicos gerados a cada chamada — nunca repete entre execuções
  const cpfs = randomTestCpfs(6)
  const salt = Date.now()
  return [
    { label: 'Proposta 1', cpf: cpfs[0], email: `batch.1.${salt}@tuamaeaquelaursa.com`, fullName: 'Ana Lote Silva',       checkEligibility: true,  addBacen: true  },
    { label: 'Proposta 2', cpf: cpfs[1], email: `batch.2.${salt}@tuamaeaquelaursa.com`, fullName: 'Bruno Lote Oliveira',  checkEligibility: true,  addBacen: true  },
    { label: 'Proposta 3', cpf: cpfs[2], email: `batch.3.${salt}@tuamaeaquelaursa.com`, fullName: 'Carla Lote Santos',    checkEligibility: true,  addBacen: true  },
    { label: 'Proposta 4', cpf: cpfs[3], email: `batch.4.${salt}@tuamaeaquelaursa.com`, fullName: 'Diego Lote Ferreira',  checkEligibility: false, addBacen: true  },
    { label: 'Proposta 5', cpf: cpfs[4], email: `batch.5.${salt}@tuamaeaquelaursa.com`, fullName: 'Eva Lote Costa',       checkEligibility: true,  addBacen: false },
    { label: 'Proposta 6', cpf: cpfs[5], email: `batch.6.${salt}@tuamaeaquelaursa.com`, fullName: 'Felipe Lote Pereira',  checkEligibility: false, addBacen: false },
  ]
}

// ── Status chip ───────────────────────────────────────────────────────────────

function StatusChip({ status }: { status: ProposalStatus }) {
  switch (status) {
    case 'idle':    return <Chip size="small" icon={<RadioButtonUncheckedIcon />} label="Aguardando" variant="outlined" />
    case 'running': return <Chip size="small" icon={<CircularProgress size={12} />} label="Executando…" color="info" variant="outlined" />
    case 'success': return <Chip size="small" icon={<CheckCircleIcon />} label="Sucesso" color="success" />
    case 'error':   return <Chip size="small" icon={<ErrorIcon />} label="Erro" color="error" />
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function BatchProposalsPage() {
  const { activeCredential, pushNotification } = useApp()
  const [configs, setConfigs] = useState<ProposalConfig[]>(buildDefaultConfigs)
  const [results, setResults] = useState<ProposalResult[]>(() => Array.from({ length: 6 }, () => ({ status: 'idle' as ProposalStatus })))
  // Bodies aleatórios separados para que os padrões sempre reconstruam do zero (evita estado stale no HMR)
  const [randomBodies, setRandomBodies] = useState<RandomBodies>({})
  const [running, setRunning] = useState(false)
  const [expanded, setExpanded] = useState<number | null>(null)

  const updateConfig = (idx: number, patch: Partial<ProposalConfig>) =>
    setConfigs(prev => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)))

  const updateResult = (idx: number, patch: Partial<ProposalResult>) =>
    setResults(prev => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)))

  // ── Reset (determinístico) ──
  const handleReset = () => {
    const fresh = buildDefaultConfigs()
    setConfigs(fresh)
    setRandomBodies({})
    setResults(fresh.map(() => ({ status: 'idle' })))
    setExpanded(null)
    pushNotification('info', 'Dados resetados para o padrão')
  }

  // ── Randomize (dados aleatórios, mantém matriz eligibility/BACEN) ──
  const handleRandomize = () => {
    const salt = Date.now()
    // Gera os dados fora do setConfigs para evitar inconsistência com double-invoke do StrictMode
    const generated = Array.from({ length: 6 }, (_, idx) => {
      const cpf = randomTestCpf()
      const gender: 'MALE' | 'FEMALE' = Math.random() > 0.5 ? 'MALE' : 'FEMALE'
      const fullName = randomName(gender)
      const email = randomEmail(fullName, salt + idx)
      return { cpf, gender, fullName, email }
    })
    const newBodies: RandomBodies = {}
    generated.forEach(({ cpf, gender, fullName, email }, idx) => {
      newBodies[idx] = buildRandomProposalBody(cpf, email, fullName, gender, idx)
    })
    setConfigs(prev => prev.map((cfg, idx) => ({
      ...cfg,
      cpf: generated[idx].cpf,
      email: generated[idx].email,
      fullName: generated[idx].fullName,
    })))
    setRandomBodies(newBodies)
    setResults(Array.from({ length: 6 }, () => ({ status: 'idle' })))
    setExpanded(null)
    pushNotification('success', 'Dados aleatórios gerados!')
  }

  // ── Run ──
  const handleRun = async () => {
    if (!activeCredential) {
      pushNotification('error', 'Selecione uma credencial de parceiro antes de executar')
      return
    }

    // Gera CPFs únicos e frescos para cada execução (nunca reutiliza CPFs de runs anteriores)
    const freshCpfs = randomTestCpfs(configs.length)
    const salt = Date.now()
    const runConfigs = configs.map((cfg, i) => ({
      ...cfg,
      cpf: freshCpfs[i],
      email: `batch.${i + 1}.${salt}@tuamaeaquelaursa.com`,
    }))
    setConfigs(runConfigs)

    setRunning(true)
    setResults(configs.map(() => ({ status: 'idle' })))

    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < runConfigs.length; i++) {
      const cfg = runConfigs[i]
      updateResult(i, { status: 'running' })
      setExpanded(i)

      let eligibilityTrace: ApiTrace | undefined
      let eligibilityPassed: boolean | undefined

      // Step 1: Eligibility (optional)
      if (cfg.checkEligibility) {
        try {
          const res = await checkEligibility({ cpf: cfg.cpf, email: cfg.email, productType: 'HOME_REFINANCING' })
          eligibilityTrace = res.trace
          eligibilityPassed = res.data.some(e => String(e.product).startsWith('HOME') && e.eligible)
        } catch (err: unknown) {
          const e = err as { trace?: ApiTrace }
          eligibilityTrace = e.trace
          eligibilityPassed = false
        }
      }

      // Passo 2: Monta o body — aleatório se disponível, senão reconstrói o padrão com o código atual.
      // Sempre sobrescreve cpf/email/fullName do borrower com os valores atuais do cfg
      // para garantir que a proposta usa os mesmos dados da elegibilidade.
      const baseBody = randomBodies[i] ?? buildDefaultBody(cfg, i)
      const body: CreateHomeRefiProposalRequest = {
        ...baseBody,
        borrower: {
          ...baseBody.borrower,
          cpf: cfg.cpf,
          email: cfg.email,
          fullName: cfg.fullName,
        },
      }

      // Passo 3: Criar proposta
      const affiliateHeaders = cfg.addBacen
        ? { bacenAuthorizedAt: new Date().toISOString().substring(0, 16), userAgent: 'creditas-api-tester-batch', userIp: '191.47.43.210' }
        : { userAgent: 'creditas-api-tester-batch', userIp: '191.47.43.210' }

      try {
        const res = await createHomeRefiProposal(body, affiliateHeaders)
        updateResult(i, { status: 'success', eligibilityTrace, eligibilityPassed, proposalTrace: res.trace, proposalId: res.data.id })
        successCount++
      } catch (err: unknown) {
        const e = err as { trace?: ApiTrace; error?: unknown }
        updateResult(i, {
          status: 'error',
          eligibilityTrace,
          eligibilityPassed,
          proposalTrace: e.trace,
          error: typeof e.error === 'string' ? e.error : JSON.stringify(e.error),
        })
        errorCount++
      }
    }

    setRunning(false)
    setExpanded(null)
    pushNotification(
      errorCount === 0 ? 'success' : successCount > 0 ? 'warning' : 'error',
      `Lote concluído: ${successCount} sucesso(s), ${errorCount} erro(s)`
    )
  }

  const total = configs.length
  const successCount = results.filter(r => r.status === 'success').length
  const errorCount  = results.filter(r => r.status === 'error').length
  const idleCount   = results.filter(r => r.status === 'idle').length

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h5" gutterBottom>Criação em Lote — HOME_REFI</Typography>
          <Typography variant="body2" color="text.secondary">
            Cria {total} propostas <code>POST /proposals/home</code> sequencialmente.
            Mantém a matriz de eligibilidade/BACEN ao aleatorizar.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Restaura CPFs, e-mails e nomes determinísticos padrão">
            <Button variant="outlined" startIcon={<RestartAltIcon />} onClick={handleReset} disabled={running}>
              Resetar
            </Button>
          </Tooltip>
          <Tooltip title="Gera CPF, nome, e-mail e todos os dados da proposta aleatoriamente (dentro dos limites da API)">
            <Button variant="outlined" color="secondary" startIcon={<CasinoIcon />} onClick={handleRandomize} disabled={running}>
              Aleatorizar
            </Button>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={running ? <CircularProgress size={18} color="inherit" /> : <PlayArrowIcon />}
            onClick={handleRun}
            disabled={running || !activeCredential}
          >
            {running ? 'Executando…' : 'Executar lote'}
          </Button>
        </Stack>
      </Box>

      {!activeCredential && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Selecione uma credencial de afiliado ativa para executar o lote.
        </Alert>
      )}

      {/* Progress summary */}
      {(!idleCount || successCount > 0 || errorCount > 0) && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">Progresso:</Typography>
            <Chip size="small" label={`${successCount} sucesso`} color="success" variant={successCount > 0 ? 'filled' : 'outlined'} />
            <Chip size="small" label={`${errorCount} erro`} color="error" variant={errorCount > 0 ? 'filled' : 'outlined'} />
            <Chip size="small" label={`${idleCount} pendente`} variant="outlined" />
            {running && <CircularProgress size={16} />}
          </Stack>
        </Paper>
      )}

      {/* Config table */}
      <Paper variant="outlined" sx={{ mb: 3 }}>
        <Box sx={{ p: 2, pb: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Configuração das propostas — edite CPF/e-mail manualmente ou clique em <strong>Aleatorizar</strong>
          </Typography>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Proposta</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>CPF</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>E-mail</TableCell>
              <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>
                <Tooltip title="Verificar elegibilidade (GET /borrowers/eligibility) antes de criar"><span>Elig.</span></Tooltip>
              </TableCell>
              <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>
                <Tooltip title="Incluir X-Bacen-Authorized-At no header"><span>BACEN</span></Tooltip>
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {configs.map((cfg, idx) => (
              <TableRow key={idx} sx={{ '&:last-child td': { borderBottom: 0 } }}>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{cfg.label}</Typography>
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 140, display: 'block' }}>
                    {cfg.fullName}
                  </Typography>
                </TableCell>
                <TableCell>
                  <TextField
                    size="small" value={cfg.cpf} disabled={running}
                    onChange={e => updateConfig(idx, { cpf: e.target.value })}
                    slotProps={{ htmlInput: { style: { fontFamily: 'monospace', fontSize: '0.8rem' }, maxLength: 11 } }}
                    sx={{ width: 130 }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small" value={cfg.email} disabled={running}
                    onChange={e => updateConfig(idx, { email: e.target.value })}
                    sx={{ width: 220 }}
                  />
                </TableCell>
                <TableCell align="center">
                  <Checkbox
                    checked={cfg.checkEligibility} size="small" color="secondary" disabled={running}
                    onChange={e => updateConfig(idx, { checkEligibility: e.target.checked })}
                  />
                </TableCell>
                <TableCell align="center">
                  <Checkbox
                    checked={cfg.addBacen} size="small" color="primary" disabled={running}
                    onChange={e => updateConfig(idx, { addBacen: e.target.checked })}
                  />
                </TableCell>
                <TableCell>
                  <StatusChip status={results[idx]?.status ?? 'idle'} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* Legend */}
      <Grid container spacing={1} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Paper variant="outlined" sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: tokens.colors.secondary[40], flexShrink: 0 }} />
            <Typography variant="caption" color="text.secondary">Elig.: verifica elegibilidade antes de criar</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Paper variant="outlined" sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: tokens.colors.primary[40], flexShrink: 0 }} />
            <Typography variant="caption" color="text.secondary">BACEN: envia X-Bacen-Authorized-At no header</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Results */}
      {results.some(r => r.status !== 'idle') && (
        <Box>
          <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600 }}>Resultados</Typography>
          {results.map((result, idx) => {
            if (result.status === 'idle') return null
            const cfg = configs[idx]
            return (
              <Accordion key={idx} expanded={expanded === idx}
                onChange={(_, open) => setExpanded(open ? idx : null)}
                variant="outlined" sx={{ mb: 1 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flex: 1, pr: 1 }}>
                    <StatusChip status={result.status} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{cfg.label}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                      {cfg.cpf}
                    </Typography>
                    {cfg.checkEligibility && (
                      <Chip size="small" label="Elig." variant="outlined" color="secondary" sx={{ fontSize: '0.65rem' }} />
                    )}
                    {cfg.addBacen && (
                      <Chip size="small" label="BACEN" variant="outlined" color="primary" sx={{ fontSize: '0.65rem' }} />
                    )}
                    {result.proposalId && (
                      <Chip size="small" label={result.proposalId} color="success"
                        sx={{ fontFamily: 'monospace', fontSize: '0.65rem', ml: 'auto' }} />
                    )}
                    {result.error && (
                      <Typography variant="caption" color="error.main" sx={{ ml: 'auto', maxWidth: 300 }} noWrap>
                        {result.error}
                      </Typography>
                    )}
                  </Stack>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  {result.eligibilityTrace && (
                    <Box sx={{ mb: 2 }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle2">Elegibilidade</Typography>
                        {result.eligibilityPassed !== undefined && (
                          <Chip size="small"
                            icon={result.eligibilityPassed ? <CheckCircleIcon /> : <ErrorIcon />}
                            label={result.eligibilityPassed ? 'Elegível' : 'Não elegível'}
                            color={result.eligibilityPassed ? 'success' : 'warning'}
                          />
                        )}
                      </Stack>
                      <ApiPanel trace={result.eligibilityTrace} title="GET /borrowers/eligibility" defaultExpanded={false} />
                    </Box>
                  )}

                  {result.eligibilityTrace && result.proposalTrace && <Divider sx={{ mb: 2 }} />}

                  {result.proposalTrace && (
                    <Box>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle2">Proposta HOME_REFI</Typography>
                        {cfg.addBacen && (
                          <Chip size="small" label="X-Bacen-Authorized-At" variant="outlined" sx={{ fontSize: '0.65rem' }} />
                        )}
                      </Stack>
                      <ApiPanel
                        trace={result.proposalTrace}
                        title="POST /proposals/home"
                        defaultExpanded={result.status === 'error'}
                      />
                    </Box>
                  )}
                </AccordionDetails>
              </Accordion>
            )
          })}
        </Box>
      )}

      {/* Empty state */}
      {results.every(r => r.status === 'idle') && (
        <Paper variant="outlined" sx={{ p: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, color: 'text.secondary' }}>
          <HourglassEmptyIcon sx={{ fontSize: 48, color: tokens.colors.neutral[60] }} />
          <Typography variant="body2">
            Configure as propostas acima e clique em <strong>Executar lote</strong>.
          </Typography>
          <Typography variant="caption">
            Use <strong>Aleatorizar</strong> para gerar dados válidos aleatoriamente (CPF, nome, renda, imóvel…)
            mantendo a matriz de eligibilidade/BACEN.
          </Typography>
        </Paper>
      )}
    </Box>
  )
}
