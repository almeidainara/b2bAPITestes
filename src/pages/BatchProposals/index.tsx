import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CasinoIcon from '@mui/icons-material/Casino'
import ErrorIcon from '@mui/icons-material/Error'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import TuneIcon from '@mui/icons-material/Tune'
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
  InputAdornment,
  Paper,
  Slider,
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

// ── Random data helpers ───────────────────────────────────────────────────────

function rnd(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

const FIRST_NAMES_MALE   = ['Bruno','Diego','Felipe','Henrique','Joao','Lucas','Nuno','Paulo','Rafael','Thiago','Vitor']
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

function buildRandomProposalBody(
  cpf: string,
  email: string,
  fullName: string,
  gender: 'MALE' | 'FEMALE',
  idx: number,
): CreateHomeRefiProposalRequest {
  const state = pick(STATES)
  const neighborhood = pick(NEIGHBORHOODS[state] ?? NEIGHBORHOODS.default)
  const street = pick(STREETS)
  const postalCode = randomPostalCodeFormatted()
  const loanAmount = randomLoanAmount()
  const collateralValue = randomCollateralValue(loanAmount)
  const realEstateType = pick(REAL_ESTATE_TYPES)
  const purpose = pick(PURPOSES)
  const borrowerIncome = randomIncome()
  const spouseIncome = randomIncome()
  const profStatus = pick(PROFESSIONAL_STATUSES)
  const cityMap: Record<string, string> = {
    SP: 'São Paulo', RJ: 'Rio de Janeiro', MG: 'Belo Horizonte', RS: 'Porto Alegre',
    PR: 'Curitiba', BA: 'Salvador', SC: 'Florianópolis', GO: 'Goiânia', DF: 'Brasília', ES: 'Vitória',
  }
  const city = cityMap[state] ?? 'São Paulo'
  const complement = pick(['Apto 101', 'Apto 203', 'Casa', 'Bloco A', 'Cobertura', undefined])

  return {
    productType: 'HOME_REFI',
    purpose,
    metadata: { version: '1.0.0', experiments: ['LF_B2B_SIMPLIFY'], externalId: `batch-${idx + 1}-${Date.now()}` },
    urgency: pick(['ONE_MONTH', 'TWO_MONTHS', 'SIX_MONTHS', 'JUST_SEARCHING']),
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
      maritalStatus: 'MARRIED',
      stableUnion: false,
      nationality: 'Brasileiro',
      familyMonthlyIncome: borrowerIncome + spouseIncome,
      monthlyIncome: borrowerIncome,
      professionalStatus: profStatus,
      professionalInfo: { professionalStatus: profStatus, monthlyIncome: borrowerIncome },
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
      address: street,
      number: String(rnd(1, 9999)),
      city,
      ...(complement ? { complement } : {}),
      state,
      neighborhood,
      postalCode,
      country: 'BR',
      value: collateralValue,
      debt: rnd(0, 1) === 0 ? 0 : rnd(1, 5) * 10000,
      realEstateType,
      hasDeed: pick(['YES', 'YES', 'YES', 'NO', 'DO_NOT_KNOW']),
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
  gender: 'MALE' | 'FEMALE'
  checkEligibility: boolean
  addBacen: boolean
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

// ── Config generator ──────────────────────────────────────────────────────────

/** Gera N configs aleatórias distribuindo elegibilidade e BACEN conforme contagens */
function generateConfigs(total: number, eligCount: number, bacenCount: number): ProposalConfig[] {
  const cpfs = randomTestCpfs(total)
  const salt = Date.now()
  return Array.from({ length: total }, (_, i) => {
    const gender: 'MALE' | 'FEMALE' = Math.random() > 0.5 ? 'MALE' : 'FEMALE'
    const fullName = randomName(gender)
    const email = randomEmail(fullName, salt + i)
    return {
      label: `Proposta ${i + 1}`,
      cpf: cpfs[i],
      email,
      fullName,
      gender,
      checkEligibility: i < eligCount,
      addBacen: i < bacenCount,
    }
  })
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

const DEFAULT_TOTAL = 6
const DEFAULT_ELIG  = 4
const DEFAULT_BACEN = 6
const MAX_PROPOSALS = 20

export function BatchProposalsPage() {
  const { activeCredential, pushNotification } = useApp()

  // ── Controles de configuração ──
  const [totalInput, setTotalInput] = useState(DEFAULT_TOTAL)
  const [eligInput, setEligInput]   = useState(DEFAULT_ELIG)
  const [bacenInput, setBacenInput] = useState(DEFAULT_BACEN)

  // ── Estado da tabela ──
  const [configs, setConfigs] = useState<ProposalConfig[]>(() =>
    generateConfigs(DEFAULT_TOTAL, DEFAULT_ELIG, DEFAULT_BACEN),
  )
  const [results, setResults] = useState<ProposalResult[]>(() =>
    Array.from({ length: DEFAULT_TOTAL }, () => ({ status: 'idle' as ProposalStatus })),
  )
  const [running, setRunning]   = useState(false)
  const [expanded, setExpanded] = useState<number | null>(null)

  const updateConfig = (idx: number, patch: Partial<ProposalConfig>) =>
    setConfigs(prev => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)))

  const updateResult = (idx: number, patch: Partial<ProposalResult>) =>
    setResults(prev => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)))

  // ── Aplicar configuração — gera novos dados aleatórios ──
  const handleApply = () => {
    const total = Math.max(1, Math.min(MAX_PROPOSALS, totalInput))
    const elig  = Math.max(0, Math.min(total, eligInput))
    const bacen = Math.max(0, Math.min(total, bacenInput))
    setTotalInput(total)
    setEligInput(elig)
    setBacenInput(bacen)
    const fresh = generateConfigs(total, elig, bacen)
    setConfigs(fresh)
    setResults(Array.from({ length: total }, () => ({ status: 'idle' })))
    setExpanded(null)
    pushNotification('success', `${total} proposta(s) gerada(s) — ${elig} com elig., ${bacen} com BACEN`)
  }

  // ── Aleatorizar mantendo a tabela atual (só gera novos dados de pessoa/imóvel) ──
  const handleRandomize = () => {
    const total = configs.length
    const salt  = Date.now()
    const cpfs  = randomTestCpfs(total)
    setConfigs(prev => prev.map((cfg, i) => {
      const gender: 'MALE' | 'FEMALE' = Math.random() > 0.5 ? 'MALE' : 'FEMALE'
      const fullName = randomName(gender)
      const email = randomEmail(fullName, salt + i)
      return { ...cfg, cpf: cpfs[i], email, fullName, gender }
    }))
    setResults(Array.from({ length: total }, () => ({ status: 'idle' })))
    setExpanded(null)
    pushNotification('success', 'Novos dados aleatórios gerados!')
  }

  // ── Executar lote ──
  const handleRun = async () => {
    if (!activeCredential) {
      pushNotification('error', 'Selecione uma credencial de parceiro antes de executar')
      return
    }

    // Gera CPFs únicos frescos para a execução — garante CPF igual entre elig. e proposta
    const freshCpfs = randomTestCpfs(configs.length)
    const salt = Date.now()
    const runConfigs = configs.map((cfg, i) => ({
      ...cfg,
      cpf: freshCpfs[i],
      email: `batch.${i + 1}.${salt}@tuamaeaquelaursa.com`,
    }))
    setConfigs(runConfigs)
    setRunning(true)
    setResults(runConfigs.map(() => ({ status: 'idle' })))

    let successCount = 0
    let errorCount   = 0

    for (let i = 0; i < runConfigs.length; i++) {
      const cfg = runConfigs[i]
      updateResult(i, { status: 'running' })
      setExpanded(i)

      // Step 1: Elegibilidade (opcional)
      let eligibilityTrace: ApiTrace | undefined
      let eligibilityPassed: boolean | undefined
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

      // Step 2: Monta body completamente aleatório (sempre fresco)
      const body = buildRandomProposalBody(cfg.cpf, cfg.email, cfg.fullName, cfg.gender, i)

      // Step 3: Criar proposta
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
      `Lote concluído: ${successCount} sucesso(s), ${errorCount} erro(s)`,
    )
  }

  const total        = configs.length
  const successCount = results.filter(r => r.status === 'success').length
  const errorCount   = results.filter(r => r.status === 'error').length
  const idleCount    = results.filter(r => r.status === 'idle').length
  const eligTotal    = configs.filter(c => c.checkEligibility).length
  const bacenTotal   = configs.filter(c => c.addBacen).length

  return (
    <Box>
      {/* ── Header ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h5" gutterBottom>Criação em Lote — HOME_REFI</Typography>
          <Typography variant="body2" color="text.secondary">
            Configura e executa múltiplas propostas <code>POST /proposals</code> com dados aleatórios.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Gera novos dados aleatórios mantendo a configuração atual de elig./BACEN">
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

      {/* ── Painel de configuração ── */}
      <Paper variant="outlined" sx={{ p: 2.5, mb: 3 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2.5 }}>
          <TuneIcon sx={{ fontSize: 18, color: tokens.colors.neutral[40] }} />
          <Typography variant="subtitle2">Configuração do lote</Typography>
        </Stack>

        <Grid container spacing={3} sx={{ alignItems: 'flex-start' }}>
          {/* Qtd de propostas */}
          <Grid size={{ xs: 12, sm: 4 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Total de propostas
            </Typography>
            <TextField
              type="number"
              size="small"
              fullWidth
              value={totalInput}
              onChange={e => {
                const v = Math.max(1, Math.min(MAX_PROPOSALS, Number(e.target.value)))
                setTotalInput(v)
                if (eligInput > v) setEligInput(v)
                if (bacenInput > v) setBacenInput(v)
              }}
              disabled={running}
              slotProps={{
                htmlInput: { min: 1, max: MAX_PROPOSALS, style: { fontFamily: 'monospace', fontWeight: 700, fontSize: '1.1rem' } },
                input: { endAdornment: <InputAdornment position="end">/ {MAX_PROPOSALS}</InputAdornment> },
              }}
            />
          </Grid>

          {/* Com elegibilidade */}
          <Grid size={{ xs: 12, sm: 4 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Com verificação de elegibilidade&nbsp;
              <Chip size="small" label={`${eligInput} de ${totalInput}`} color="secondary" variant="outlined" sx={{ fontSize: '0.65rem', height: 18 }} />
            </Typography>
            <Slider
              value={eligInput}
              min={0}
              max={totalInput}
              step={1}
              marks
              valueLabelDisplay="auto"
              color="secondary"
              disabled={running}
              onChange={(_, v) => setEligInput(v as number)}
              sx={{ mt: 1.5 }}
            />
          </Grid>

          {/* Com BACEN */}
          <Grid size={{ xs: 12, sm: 4 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Com X-Bacen-Authorized-At&nbsp;
              <Chip size="small" label={`${bacenInput} de ${totalInput}`} color="primary" variant="outlined" sx={{ fontSize: '0.65rem', height: 18 }} />
            </Typography>
            <Slider
              value={bacenInput}
              min={0}
              max={totalInput}
              step={1}
              marks
              valueLabelDisplay="auto"
              disabled={running}
              onChange={(_, v) => setBacenInput(v as number)}
              sx={{ mt: 1.5 }}
            />
          </Grid>
        </Grid>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2.5 }}>
          <Button
            variant="outlined"
            startIcon={<TuneIcon />}
            onClick={handleApply}
            disabled={running}
          >
            Gerar propostas
          </Button>
        </Box>
      </Paper>

      {/* ── Sumário da configuração atual ── */}
      <Stack direction="row" spacing={1.5} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Chip
          size="small"
          label={`${total} proposta${total !== 1 ? 's' : ''}`}
          variant="outlined"
        />
        <Chip
          size="small"
          label={`${eligTotal} com elegibilidade`}
          color="secondary"
          variant={eligTotal > 0 ? 'filled' : 'outlined'}
        />
        <Chip
          size="small"
          label={`${bacenTotal} com BACEN`}
          color="primary"
          variant={bacenTotal > 0 ? 'filled' : 'outlined'}
        />
      </Stack>

      {/* ── Progress summary ── */}
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

      {/* ── Tabela de configuração ── */}
      <Paper variant="outlined" sx={{ mb: 3 }}>
        <Box sx={{ p: 2, pb: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Configuração individual — edite CPF/e-mail ou marque/desmarque elig./BACEN por linha
          </Typography>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>#</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Nome</TableCell>
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
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                    {idx + 1}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 160, display: 'block' }}>
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
                    sx={{ width: 210 }}
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

      {/* ── Resultados ── */}
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
                        title="POST /proposals"
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

      {/* ── Empty state ── */}
      {results.every(r => r.status === 'idle') && (
        <Paper variant="outlined" sx={{ p: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, color: 'text.secondary' }}>
          <HourglassEmptyIcon sx={{ fontSize: 48, color: tokens.colors.neutral[60] }} />
          <Typography variant="body2">
            Configure o lote acima e clique em <strong>Executar lote</strong>.
          </Typography>
          <Typography variant="caption" sx={{ textAlign: 'center' }}>
            Use <strong>Gerar propostas</strong> para aplicar nova quantidade e distribuição de elig./BACEN.
            Use <strong>Aleatorizar</strong> para gerar novos dados mantendo a configuração atual.
          </Typography>
        </Paper>
      )}
    </Box>
  )
}
