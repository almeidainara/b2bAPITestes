import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CasinoIcon from '@mui/icons-material/Casino'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import EditIcon from '@mui/icons-material/Edit'
import ErrorIcon from '@mui/icons-material/Error'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import TuneIcon from '@mui/icons-material/Tune'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  Grid,
  IconButton,
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
import { Fragment, useState } from 'react'
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
const LAST_NAMES = ['Silva','Santos','Oliveira','Souza','Rodrigues','Ferreira','Alves','Pereira','Lima','Gomes','Costa','Ribeiro','Martins','Carvalho','Almeida','Lopes','Nascimento','Mendes','Moreira','Barbosa']
const SPOUSE_NAMES = ['Maria Silva Santos','Ana Oliveira Costa','Fernanda Lima Souza','Juliana Pereira Alves','Carla Rodrigues Martins','Patricia Fernandes Gomes','Roberto Alves Lima','Carlos Souza Pereira','Eduardo Martins Costa','Marcelo Ribeiro Santos']
const STATES = ['SP','RJ','MG','RS','PR','BA','SC','GO','DF','ES']
const NEIGHBORHOODS: Record<string, string[]> = {
  SP: ['Brooklin','Moema','Vila Olímpia','Pinheiros','Perdizes','Lapa'],
  RJ: ['Barra da Tijuca','Botafogo','Flamengo','Ipanema','Leblon','Tijuca'],
  MG: ['Savassi','Lourdes','Funcionários','Cidade Nova','Buritis'],
  default: ['Centro','Jardim América','Vila Nova','Boa Vista','São Luís'],
}
const STREETS = ['Av. Paulista','Rua Augusta','Av. Rebouças','Rua Oscar Freire','Av. Brigadeiro Faria Lima','Rua da Consolação','Av. Nove de Julho','Rua Vergueiro']
const PURPOSES = ['DEBTS_REFINANCING','DEBTS_PAYMENT','REAL_ESTATE_RENOVATION','INVESTMENT_IN_OWN_BUSINESS','OTHERS']
const PROFESSIONAL_STATUSES: Array<'CLT'|'SELF_EMPLOYED'|'BUSINESSMAN'|'CIVIL_SERVANT'|'RETIRED'> = ['CLT','SELF_EMPLOYED','BUSINESSMAN','CIVIL_SERVANT','RETIRED']
const REAL_ESTATE_TYPES: Array<'HOUSE'|'APARTMENT'|'COMMERCIAL'> = ['HOUSE','APARTMENT','COMMERCIAL']

function randomName(gender: 'MALE'|'FEMALE'): string {
  const first = gender === 'FEMALE' ? pick(FIRST_NAMES_FEMALE) : pick(FIRST_NAMES_MALE)
  return `${first} ${pick(LAST_NAMES)} ${pick(LAST_NAMES)}`
}
function randomEmail(name: string, salt: number): string {
  const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,'.').replace(/[^a-z.]/g,'')
  return `${slug}.${salt}@tuamaeaquelaursa.com`
}
function randomBirthDate(): string {
  const y = new Date().getFullYear() - rnd(25,58)
  return `${y}-${String(rnd(1,12)).padStart(2,'0')}-${String(rnd(1,28)).padStart(2,'0')}`
}
function randomPhone(): string { return `9${String(rnd(10000000,99999999))}` }
function randomIncome(): number { return rnd(5,40)*1000 }
function randomPostalCode(): string { const n = rnd(10000000,99999999); return `${String(n).slice(0,5)}-${String(n).slice(5)}` }

function buildRandomBody(cpf: string, email: string, fullName: string, gender: 'MALE'|'FEMALE', idx: number): CreateHomeRefiProposalRequest {
  const state = pick(STATES)
  const postalCode = randomPostalCode()
  const loanAmount = rnd(5,30)*10000
  const collateralValue = Math.ceil((loanAmount*rnd(3,6))/10000)*10000
  const borrowerIncome = randomIncome()
  const profStatus = pick(PROFESSIONAL_STATUSES)
  const cityMap: Record<string,string> = {SP:'São Paulo',RJ:'Rio de Janeiro',MG:'Belo Horizonte',RS:'Porto Alegre',PR:'Curitiba',BA:'Salvador',SC:'Florianópolis',GO:'Goiânia',DF:'Brasília',ES:'Vitória'}
  const complement = pick(['Apto 101','Apto 203','Casa','Bloco A','Cobertura',undefined])
  return {
    productType: 'HOME_REFI',
    purpose: pick(PURPOSES),
    metadata: { version: '1.0.0', experiments: ['LF_B2B_SIMPLIFY'], externalId: `batch-${idx+1}-${Date.now()}` },
    urgency: pick(['ONE_MONTH','TWO_MONTHS','SIX_MONTHS','JUST_SEARCHING']),
    formReference: `creditas-api-tester-batch-${idx+1}`,
    conditions: { installment: { term: pick([36,60,84,120,180,240]) } },
    borrower: {
      cpf, fullName, email, gender,
      birthDate: randomBirthDate(),
      cellphone: randomPhone(),
      cellphoneCode: String(rnd(11,99)),
      postalCode,
      maritalStatus: 'MARRIED',
      stableUnion: false,
      nationality: 'Brasileiro',
      familyMonthlyIncome: borrowerIncome + randomIncome(),
      monthlyIncome: borrowerIncome,
      professionalStatus: profStatus,
      professionalInfo: { professionalStatus: profStatus, monthlyIncome: borrowerIncome },
      optIns: { email: Math.random()>0.5, whatsApp: true, sms: false },
      authorizationTerms: 'Ao continuar, você autoriza o parceiro Creditas a consultar o seu histórico de crédito no Sistema de Informações de Crédito – SCR do Banco Central do Brasil.',
      spouse: {
        cpf: randomTestCpf(),
        fullName: pick(SPOUSE_NAMES),
        email: randomEmail(pick(SPOUSE_NAMES), Date.now()+idx),
        birthDate: randomBirthDate(),
        cellphone: randomPhone(),
        cellphoneCode: String(rnd(11,99)),
        nationality: 'Brasileiro',
        isCosigner: false,
      },
    },
    intendedCredit: { currency: 'BRL', amount: loanAmount },
    collateral: {
      address: pick(STREETS),
      number: String(rnd(1,9999)),
      city: cityMap[state] ?? 'São Paulo',
      ...(complement ? { complement } : {}),
      state,
      neighborhood: pick(NEIGHBORHOODS[state] ?? NEIGHBORHOODS.default),
      postalCode,
      country: 'BR',
      value: collateralValue,
      debt: rnd(0,1)===0 ? 0 : rnd(1,5)*10000,
      realEstateType: pick(REAL_ESTATE_TYPES),
      hasDeed: pick(['YES','YES','YES','NO','DO_NOT_KNOW']),
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
  gender: 'MALE'|'FEMALE'
  checkEligibility: boolean
  addBacen: boolean
}

type ProposalStatus = 'idle'|'running'|'success'|'error'

interface ProposalResult {
  status: ProposalStatus
  eligibilityTrace?: ApiTrace
  eligibilityPassed?: boolean
  proposalTrace?: ApiTrace
  proposalId?: string
  error?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateConfigs(total: number, eligCount: number, bacenCount: number): ProposalConfig[] {
  const cpfs = randomTestCpfs(total)
  const salt = Date.now()
  return Array.from({ length: total }, (_, i) => {
    const gender: 'MALE'|'FEMALE' = Math.random()>0.5 ? 'MALE' : 'FEMALE'
    const fullName = randomName(gender)
    return { label: `Proposta ${i+1}`, cpf: cpfs[i], email: randomEmail(fullName, salt+i), fullName, gender, checkEligibility: i<eligCount, addBacen: i<bacenCount }
  })
}

function StatusChip({ status }: { status: ProposalStatus }) {
  switch (status) {
    case 'idle':    return <Chip size="small" icon={<RadioButtonUncheckedIcon />} label="Aguardando" variant="outlined" />
    case 'running': return <Chip size="small" icon={<CircularProgress size={12} />} label="Executando…" color="info" variant="outlined" />
    case 'success': return <Chip size="small" icon={<CheckCircleIcon />} label="Sucesso" color="success" />
    case 'error':   return <Chip size="small" icon={<ErrorIcon />} label="Erro" color="error" />
  }
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <Tooltip title={copied ? 'Copiado!' : 'Copiar'}>
      <IconButton size="small" onClick={handleCopy} sx={{ color: copied ? tokens.colors.primary[40] : tokens.colors.neutral[40] }}>
        <ContentCopyIcon sx={{ fontSize: 14 }} />
      </IconButton>
    </Tooltip>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const DEFAULT_TOTAL = 3

export function BatchProposalsPage() {
  const { activeCredential, pushNotification } = useApp()

  // Fase da página
  const [configOpen, setConfigOpen] = useState(true)
  const [hasRun, setHasRun]         = useState(false)

  // Inputs do bloco de configuração
  const [totalInput, setTotalInput] = useState(DEFAULT_TOTAL)
  const [eligInput, setEligInput]   = useState(DEFAULT_TOTAL)
  const [bacenInput, setBacenInput] = useState(DEFAULT_TOTAL)

  // Tabela de propostas
  const [configs, setConfigs] = useState<ProposalConfig[]>([])
  const [results, setResults] = useState<ProposalResult[]>([])
  const [running, setRunning] = useState(false)
  const [expandedRow, setExpandedRow] = useState<number|null>(null)

  const updateConfig = (idx: number, patch: Partial<ProposalConfig>) =>
    setConfigs(prev => prev.map((c, i) => i===idx ? {...c, ...patch} : c))

  const updateResult = (idx: number, patch: Partial<ProposalResult>) =>
    setResults(prev => prev.map((r, i) => i===idx ? {...r, ...patch} : r))

  // ── Aplicar configuração ──
  const handleApply = () => {
    const total = Math.max(1, Math.min(20, totalInput))
    const elig  = Math.max(0, Math.min(total, eligInput))
    const bacen = Math.max(0, Math.min(total, bacenInput))
    setTotalInput(total); setEligInput(elig); setBacenInput(bacen)
    setConfigs(generateConfigs(total, elig, bacen))
    setResults(Array.from({ length: total }, () => ({ status: 'idle' as ProposalStatus })))
    setHasRun(false)
    setConfigOpen(false)
    setExpandedRow(null)
  }

  // ── Aleatorizar (mantém elig/BACEN, gera novos dados) ──
  const handleRandomize = () => {
    if (configs.length === 0) return
    const salt = Date.now()
    const cpfs = randomTestCpfs(configs.length)
    setConfigs(prev => prev.map((cfg, i) => {
      const gender: 'MALE'|'FEMALE' = Math.random()>0.5 ? 'MALE' : 'FEMALE'
      const fullName = randomName(gender)
      return { ...cfg, cpf: cpfs[i], email: randomEmail(fullName, salt+i), fullName, gender }
    }))
    setResults(Array.from({ length: configs.length }, () => ({ status: 'idle' })))
    setHasRun(false)
    setExpandedRow(null)
    pushNotification('success', 'Novos dados aleatórios gerados!')
  }

  // ── Executar lote ──
  const handleRun = async () => {
    if (!activeCredential) { pushNotification('error', 'Selecione uma credencial'); return }
    if (isConsultant) { pushNotification('error', 'Consultor não pode criar propostas — use afiliado ou parceiro'); return }

    // CPFs e emails frescos para garantir consistência elig ↔ proposta
    const freshCpfs = randomTestCpfs(configs.length)
    const salt = Date.now()
    const runConfigs = configs.map((cfg, i) => ({
      ...cfg,
      cpf: freshCpfs[i],
      email: `batch.${i+1}.${salt}@tuamaeaquelaursa.com`,
    }))
    setConfigs(runConfigs)
    setRunning(true)
    setHasRun(true)
    setResults(runConfigs.map(() => ({ status: 'idle' })))

    let ok = 0, err = 0

    for (let i = 0; i < runConfigs.length; i++) {
      const cfg = runConfigs[i]
      updateResult(i, { status: 'running' })
      setExpandedRow(i)

      // Elegibilidade
      let eligibilityTrace: ApiTrace|undefined
      let eligibilityPassed: boolean|undefined
      if (cfg.checkEligibility) {
        try {
          const res = await checkEligibility({ cpf: cfg.cpf, email: cfg.email, productType: 'HOME_REFINANCING' })
          eligibilityTrace = res.trace
          eligibilityPassed = res.data.some(e => String(e.product).startsWith('HOME') && e.eligible)
        } catch (e: unknown) {
          eligibilityTrace = (e as {trace?: ApiTrace}).trace
          eligibilityPassed = false
        }
      }

      // Body sempre aleatório
      const body = buildRandomBody(cfg.cpf, cfg.email, cfg.fullName, cfg.gender, i)

      // Criar proposta
      const affiliateHeaders = cfg.addBacen
        ? { bacenAuthorizedAt: new Date().toISOString().substring(0,16), userAgent: 'creditas-api-tester-batch', userIp: '191.47.43.210' }
        : { userAgent: 'creditas-api-tester-batch', userIp: '191.47.43.210' }

      try {
        const res = await createHomeRefiProposal(body, affiliateHeaders)
        updateResult(i, { status: 'success', eligibilityTrace, eligibilityPassed, proposalTrace: res.trace, proposalId: res.data.id })
        ok++
      } catch (e: unknown) {
        const ex = e as { trace?: ApiTrace; error?: unknown }
        updateResult(i, { status: 'error', eligibilityTrace, eligibilityPassed, proposalTrace: ex.trace, error: typeof ex.error==='string' ? ex.error : JSON.stringify(ex.error) })
        err++
      }
    }

    setRunning(false)
    setExpandedRow(null)
    pushNotification(err===0 ? 'success' : ok>0 ? 'warning' : 'error', `Lote concluído: ${ok} sucesso(s), ${err} erro(s)`)
  }

  const successCount  = results.filter(r => r.status==='success').length
  const errorCount    = results.filter(r => r.status==='error').length
  const idleCount     = results.filter(r => r.status==='idle').length
  const isConsultant  = activeCredential?.authType === 'consultant'
  const canRun        = !!activeCredential && !isConsultant && !running

  return (
    <Box>
      {/* ── Título ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5 }}>
        <Box>
          <Typography variant="h5" gutterBottom>Criação em Lote — HOME_REFI</Typography>
          <Typography variant="body2" color="text.secondary">
            Executa múltiplas propostas <code>POST /proposals</code> com dados aleatórios.
          </Typography>
        </Box>
        {configs.length > 0 && !running && (
          <Stack direction="row" spacing={1}>
            <Tooltip title="Gera novos dados aleatórios mantendo elig./BACEN da tabela">
              <Button variant="outlined" color="secondary" size="small" startIcon={<CasinoIcon />} onClick={handleRandomize}>
                Aleatorizar
              </Button>
            </Tooltip>
            <Button
              variant="contained"
              size="small"
              startIcon={<PlayArrowIcon />}
              onClick={handleRun}
              disabled={!canRun}
            >
              Executar lote
            </Button>
          </Stack>
        )}
        {running && (
          <Button variant="contained" size="small" disabled startIcon={<CircularProgress size={16} color="inherit" />}>
            Executando…
          </Button>
        )}
      </Box>

      {!activeCredential && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Selecione uma credencial de afiliado ou parceiro para executar o lote.
        </Alert>
      )}
      {isConsultant && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Credenciais de <strong>consultor</strong> não têm permissão para criar propostas.
          Use um login de <strong>afiliado</strong> ou uma credencial de <strong>parceiro</strong> (consumer_key).
        </Alert>
      )}

      {/* ── Bloco de configuração (colapsável) ── */}
      <Paper variant="outlined" sx={{ mb: 2.5 }}>
        {/* Header do bloco */}
        <Box
          sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
          onClick={() => setConfigOpen(o => !o)}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <TuneIcon sx={{ fontSize: 18, color: tokens.colors.neutral[40] }} />
            <Typography variant="subtitle2">Configuração do lote</Typography>
            {!configOpen && configs.length > 0 && (
              <Stack direction="row" spacing={0.75} sx={{ ml: 1 }}>
                <Chip size="small" label={`${configs.length} propostas`} variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
                <Chip size="small" label={`${configs.filter(c=>c.checkEligibility).length} elig.`} color="secondary" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
                <Chip size="small" label={`${configs.filter(c=>c.addBacen).length} BACEN`} color="primary" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
              </Stack>
            )}
          </Stack>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            {!configOpen && (
              <Tooltip title="Editar configuração">
                <IconButton size="small" onClick={e => { e.stopPropagation(); setConfigOpen(true) }}>
                  <EditIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            )}
            {configOpen ? <ExpandLessIcon sx={{ fontSize: 20, color: tokens.colors.neutral[40] }} /> : <ExpandMoreIcon sx={{ fontSize: 20, color: tokens.colors.neutral[40] }} />}
          </Stack>
        </Box>

        {/* Conteúdo colapsável */}
        <Collapse in={configOpen}>
          <Divider />
          <Box sx={{ p: 2.5 }}>
            <Grid container spacing={2.5} sx={{ alignItems: 'flex-start' }}>

              {/* Total de propostas */}
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField
                  fullWidth size="small" type="number"
                  label="Total de propostas"
                  value={totalInput}
                  onChange={e => {
                    const v = Math.max(1, Math.min(20, Number(e.target.value)))
                    setTotalInput(v)
                    if (eligInput > v) setEligInput(v)
                    if (bacenInput > v) setBacenInput(v)
                  }}
                  slotProps={{ htmlInput: { min: 1, max: 20 } }}
                />
                <Stack direction="row" spacing={0.75} sx={{ mt: 1 }}>
                  {[1, 5, 10].map(n => (
                    <Button
                      key={n}
                      size="small"
                      variant="outlined"
                      sx={{ minWidth: 0, px: 1.25, fontSize: '0.72rem', flex: 1 }}
                      onClick={() => {
                        const v = n === 1 ? 1 : Math.min(20, totalInput + n)
                        setTotalInput(v)
                        if (eligInput > v) setEligInput(v)
                        if (bacenInput > v) setBacenInput(v)
                      }}
                    >
                      {n === 1 ? '1' : `+${n}`}
                    </Button>
                  ))}
                </Stack>
              </Grid>

              {/* Com elegibilidade */}
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField
                  fullWidth size="small" type="number"
                  label="Com elegibilidade"
                  value={eligInput}
                  onChange={e => setEligInput(Math.max(0, Math.min(totalInput, Number(e.target.value))))}
                  slotProps={{ htmlInput: { min: 0, max: totalInput } }}
                  helperText={`0 – ${totalInput}`}
                />
                <Stack direction="row" spacing={0.75} sx={{ mt: 0.25 }}>
                  {(['Todas', 'Metade', 'Nenhuma'] as const).map(opt => (
                    <Button
                      key={opt}
                      size="small"
                      variant="outlined"
                      color="secondary"
                      sx={{ minWidth: 0, px: 1, fontSize: '0.72rem', flex: 1 }}
                      onClick={() => {
                        if (opt === 'Todas')   setEligInput(totalInput)
                        if (opt === 'Metade')  setEligInput(Math.floor(totalInput / 2))
                        if (opt === 'Nenhuma') setEligInput(0)
                      }}
                    >
                      {opt}
                    </Button>
                  ))}
                </Stack>
              </Grid>

              {/* Com BACEN */}
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField
                  fullWidth size="small" type="number"
                  label="Com BACEN"
                  value={bacenInput}
                  onChange={e => setBacenInput(Math.max(0, Math.min(totalInput, Number(e.target.value))))}
                  slotProps={{ htmlInput: { min: 0, max: totalInput } }}
                  helperText={`0 – ${totalInput}`}
                />
                <Stack direction="row" spacing={0.75} sx={{ mt: 0.25 }}>
                  {(['Todas', 'Metade', 'Nenhuma'] as const).map(opt => (
                    <Button
                      key={opt}
                      size="small"
                      variant="outlined"
                      sx={{ minWidth: 0, px: 1, fontSize: '0.72rem', flex: 1 }}
                      onClick={() => {
                        if (opt === 'Todas')   setBacenInput(totalInput)
                        if (opt === 'Metade')  setBacenInput(Math.floor(totalInput / 2))
                        if (opt === 'Nenhuma') setBacenInput(0)
                      }}
                    >
                      {opt}
                    </Button>
                  ))}
                </Stack>
              </Grid>

              {/* Botão gerar */}
              <Grid size={{ xs: 12, sm: 3 }} sx={{ display: 'flex', alignItems: 'flex-start' }}>
                <Button variant="contained" fullWidth onClick={handleApply} startIcon={<TuneIcon />} sx={{ mt: 0.25 }}>
                  Gerar propostas
                </Button>
              </Grid>

            </Grid>
          </Box>
        </Collapse>
      </Paper>

      {/* ── Tabela + resultados inline ── */}
      {configs.length > 0 && (
        <>
          {/* Progress summary (só durante/após execução) */}
          {(successCount > 0 || errorCount > 0 || running) && (
            <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                {running && <CircularProgress size={14} />}
                <Chip size="small" label={`${successCount} sucesso`} color="success" variant={successCount>0 ? 'filled' : 'outlined'} />
                <Chip size="small" label={`${errorCount} erro`} color="error" variant={errorCount>0 ? 'filled' : 'outlined'} />
                <Chip size="small" label={`${idleCount} pendente`} variant="outlined" />
              </Stack>
            </Paper>
          )}

          <Paper variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, width: 36 }}>#</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Nome</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>CPF</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>E-mail</TableCell>
                  <TableCell sx={{ fontWeight: 600, textAlign: 'center', width: 60 }}>
                    <Tooltip title="Verificar elegibilidade antes de criar"><span>Elig.</span></Tooltip>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, textAlign: 'center', width: 60 }}>
                    <Tooltip title="Incluir X-Bacen-Authorized-At"><span>BACEN</span></Tooltip>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 120 }}>Status</TableCell>
                  <TableCell sx={{ width: 40 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {configs.map((cfg, idx) => {
                  const result = results[idx]
                  const isExpanded = expandedRow === idx
                  const isLocked = hasRun

                  return (
                    <Fragment key={idx}>
                      {/* ── Linha principal ── */}
                      <TableRow
                        sx={{
                          backgroundColor: result?.status === 'error' ? `${tokens.colors.error[60]}0A` : result?.status === 'success' ? `${tokens.colors.primary[40]}08` : undefined,
                          '& td': { borderBottom: isExpanded ? 'none' : undefined },
                        }}
                      >
                        <TableCell>
                          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                            {idx + 1}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 160 }}>
                            {cfg.fullName}
                          </Typography>
                        </TableCell>

                        {/* CPF */}
                        <TableCell>
                          {isLocked ? (
                            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                              <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{cfg.cpf}</Typography>
                              <CopyButton value={cfg.cpf} />
                            </Stack>
                          ) : (
                            <TextField
                              size="small" value={cfg.cpf} disabled={running}
                              onChange={e => updateConfig(idx, { cpf: e.target.value })}
                              slotProps={{ htmlInput: { style: { fontFamily: 'monospace', fontSize: '0.8rem' }, maxLength: 11 } }}
                              sx={{ width: 130 }}
                            />
                          )}
                        </TableCell>

                        {/* E-mail */}
                        <TableCell>
                          {isLocked ? (
                            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                              <Typography variant="caption" noWrap sx={{ maxWidth: 200 }}>{cfg.email}</Typography>
                              <CopyButton value={cfg.email} />
                            </Stack>
                          ) : (
                            <TextField
                              size="small" value={cfg.email} disabled={running}
                              onChange={e => updateConfig(idx, { email: e.target.value })}
                              sx={{ width: 220 }}
                            />
                          )}
                        </TableCell>

                        <TableCell align="center">
                          <Checkbox
                            checked={cfg.checkEligibility}
                            size="small" color="secondary"
                            disabled={running || isLocked}
                            onChange={e => updateConfig(idx, { checkEligibility: e.target.checked })}
                          />
                        </TableCell>

                        <TableCell align="center">
                          <Checkbox
                            checked={cfg.addBacen}
                            size="small" color="primary"
                            disabled={running || isLocked}
                            onChange={e => updateConfig(idx, { addBacen: e.target.checked })}
                          />
                        </TableCell>

                        <TableCell>
                          <StatusChip status={result?.status ?? 'idle'} />
                        </TableCell>

                        {/* Expand button — só aparece se tem resultado */}
                        <TableCell>
                          {(result?.eligibilityTrace || result?.proposalTrace) && (
                            <IconButton size="small" onClick={() => setExpandedRow(isExpanded ? null : idx)}>
                              {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                            </IconButton>
                          )}
                        </TableCell>
                      </TableRow>

                      {/* ── Linha de detalhes (collapse) ── */}
                      <TableRow>
                        <TableCell colSpan={8} sx={{ p: 0, border: 0 }}>
                          <Collapse in={isExpanded} unmountOnExit>
                            <Box sx={{ p: 2, backgroundColor: `${tokens.colors.neutral[95]}`, borderBottom: `1px solid ${tokens.colors.neutral[80]}` }}>
                              {result?.eligibilityTrace && (
                                <Box sx={{ mb: result?.proposalTrace ? 2 : 0 }}>
                                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                                    <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                      Elegibilidade
                                    </Typography>
                                    {result.eligibilityPassed !== undefined && (
                                      <Chip
                                        size="small"
                                        icon={result.eligibilityPassed ? <CheckCircleIcon /> : <ErrorIcon />}
                                        label={result.eligibilityPassed ? 'Elegível' : 'Não elegível'}
                                        color={result.eligibilityPassed ? 'success' : 'warning'}
                                      />
                                    )}
                                  </Stack>
                                  <ApiPanel trace={result.eligibilityTrace} title="GET /borrowers/eligibility" defaultExpanded={false} />
                                </Box>
                              )}

                              {result?.eligibilityTrace && result?.proposalTrace && <Divider sx={{ my: 2 }} />}

                              {result?.proposalTrace && (
                                <Box>
                                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                                    <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                      Proposta HOME_REFI
                                    </Typography>
                                    {cfg.addBacen && (
                                      <Chip size="small" label="X-Bacen-Authorized-At" variant="outlined" sx={{ fontSize: '0.65rem' }} />
                                    )}
                                    {result.proposalId && (
                                      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', ml: 'auto' }}>
                                        <Chip size="small" label={result.proposalId} color="success" sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }} />
                                        <CopyButton value={result.proposalId} />
                                      </Stack>
                                    )}
                                  </Stack>
                                  <ApiPanel trace={result.proposalTrace} title="POST /proposals" defaultExpanded={result.status==='error'} />
                                </Box>
                              )}
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </Fragment>
                  )
                })}
              </TableBody>
            </Table>
          </Paper>

          {/* Botão executar abaixo da tabela */}
          {!hasRun && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                variant="contained"
                startIcon={running ? <CircularProgress size={16} color="inherit" /> : <PlayArrowIcon />}
                onClick={handleRun}
                disabled={!canRun}
              >
                {running ? 'Executando…' : 'Executar lote'}
              </Button>
            </Box>
          )}
        </>
      )}

      {/* ── Empty state ── */}
      {configs.length === 0 && (
        <Paper variant="outlined" sx={{ p: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, color: 'text.secondary' }}>
          <HourglassEmptyIcon sx={{ fontSize: 48, color: tokens.colors.neutral[60] }} />
          <Typography variant="body2">Configure o lote acima e clique em <strong>Gerar propostas</strong>.</Typography>
        </Paper>
      )}
    </Box>
  )
}
