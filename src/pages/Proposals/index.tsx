import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import SendIcon from '@mui/icons-material/Send'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { useEffect, useState } from 'react'
import { ApiPanel } from '../../components/ApiPanel'
import { CredentialSelector } from '../../components/CredentialSelector'
import { JsonEditor } from '../../components/JsonEditor'
import { useApp } from '../../context/AppContext'
import { checkEligibility, createHomeRefiProposal, createOffer, createProposal, getSimulations } from '../../services/b2bApi'
import type { ApiTrace, CreateHomeRefiProposalRequest, CreateProposalRequest, EligibilityResult, OfferItem, SimulationItem } from '../../types/api'
import tokens from '../../theme/tokens'
import { DEFAULT_AUTO_PROPOSAL, DEFAULT_HOME_PROPOSAL, DEFAULT_HOME_REFI_PROPOSAL } from './defaultPayloads'
import { randomTestCpf } from '../../utils/cpf'

// ── Step indicator ────────────────────────────────────────────────────────────

type StepStatus = 'idle' | 'running' | 'success' | 'error'

interface StepState {
  status: StepStatus
  trace: ApiTrace | null
}

function stepIcon(s: StepStatus, _idx?: number) {
  if (s === 'running') return <CircularProgress size={20} />
  if (s === 'success') return <CheckCircleIcon sx={{ color: tokens.colors.primary[40] }} />
  if (s === 'error') return <CheckCircleIcon sx={{ color: tokens.colors.error[60] }} />
  return <RadioButtonUncheckedIcon sx={{ color: tokens.colors.neutral[40] }} />
}

// ── Auto-Create drawer ────────────────────────────────────────────────────────

interface AutoCreateDrawerProps {
  open: boolean
  onClose: () => void
  product: 'AUTO_REFINANCING' | 'HOME_REFINANCING'
}

function AutoCreateDrawer({ open, onClose, product }: AutoCreateDrawerProps) {
  const theme = useTheme()
  const isSmall = useMediaQuery(theme.breakpoints.down('lg'))
  const { pushNotification, activeCredential } = useApp()

  const isHomeRefi = product === 'HOME_REFINANCING'

  const buildDefaultPayload = () => {
    const cpf = randomTestCpf()
    const salt = Date.now()
    if (product === 'AUTO_REFINANCING') {
      const base = JSON.parse(JSON.stringify(DEFAULT_AUTO_PROPOSAL))
      base.borrower.cpf = cpf
      base.borrower.email = `auto.${salt}@tuamaeaquelaursa.com`
      return base
    }
    const base = JSON.parse(JSON.stringify(DEFAULT_HOME_REFI_PROPOSAL))
    base.borrower.cpf = cpf
    base.borrower.email = `home.${salt}@tuamaeaquelaursa.com`
    // CPF do cônjuge também único
    base.borrower.spouse.cpf = randomTestCpf()
    return base
  }

  const [payload, setPayload] = useState<CreateProposalRequest | CreateHomeRefiProposalRequest>(buildDefaultPayload)

  const [steps, setSteps] = useState<{
    eligibility: StepState
    offer: StepState
    proposal: StepState
  }>({
    eligibility: { status: 'idle', trace: null },
    offer:       { status: 'idle', trace: null },
    proposal:    { status: 'idle', trace: null },
  })

  const [eligibilityResults, setEligibilityResults] = useState<EligibilityResult[] | null>(null)
  const [offerResults, setOfferResults] = useState<OfferItem[] | SimulationItem[] | null>(null)
  const [proposalResult, setProposalResult] = useState<unknown>(null)

  // Headers obrigatórios para HOME_REFI (editáveis pelo usuário)
  const [bacenAuthorizedAt, setBacenAuthorizedAt] = useState(() => new Date().toISOString().substring(0, 16))
  const [userIp, setUserIp] = useState('191.47.43.210')
  const [userAgent, setUserAgent] = useState('creditas-api-tester')

  const setStep = (name: keyof typeof steps, partial: Partial<StepState>) => {
    setSteps(s => ({ ...s, [name]: { ...s[name], ...partial } }))
  }

  const resetSteps = () => {
    setSteps({
      eligibility: { status: 'idle', trace: null },
      offer:       { status: 'idle', trace: null },
      proposal:    { status: 'idle', trace: null },
    })
    setEligibilityResults(null)
    setOfferResults(null)
    setProposalResult(null)
  }

  // Quando o produto muda, reinicia payload e steps
  useEffect(() => {
    setPayload(buildDefaultPayload())
    resetSteps()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product])

  // ── Step 1: Elegibilidade ───────────────────────────────────────────────────

  const runEligibility = async (): Promise<boolean> => {
    const cpf   = (payload.borrower as { cpf?: string }).cpf ?? ''
    const email = (payload.borrower as { email?: string }).email ?? ''
    // A API de elegibilidade usa 'HOME_REFINANCING', mas o payload HOME_REFI usa 'HOME_REFI'
    const eligProductType = isHomeRefi ? 'HOME_REFINANCING' : (payload.productType as 'AUTO_REFINANCING')
    setStep('eligibility', { status: 'running' })
    try {
      const res = await checkEligibility({ cpf: cpf.replace(/\D/g, ''), email, productType: eligProductType })
      setStep('eligibility', { status: 'success', trace: res.trace })
      setEligibilityResults(res.data)
      return true  // resultado é informativo — não bloqueia
    } catch (err: unknown) {
      const e = err as { trace?: ApiTrace }
      setStep('eligibility', { status: 'error', trace: e.trace ?? null })
      pushNotification('error', 'Erro na verificação de elegibilidade')
      return false
    }
  }

  // ── Step 2: Oferta / Simulação (apenas AUTO) ────────────────────────────────

  const runOffer = async (): Promise<boolean> => {
    setStep('offer', { status: 'running' })
    try {
      const { borrower, collateral, intendedCredit, purpose } = payload as import('../../types/api').CreateAutoProposalRequest
      const res = await createOffer({
        purpose,
        borrower: {
          cpf: borrower.cpf,
          fullName: borrower.fullName,
          email: borrower.email,
          cellphoneCode: borrower.cellphoneCode,
          cellphone: borrower.cellphone,
          birthDate: borrower.birthDate,
          postalCode: borrower.postalCode,
          professionalStatus: borrower.professionalStatus,
          monthlyIncome: borrower.monthlyIncome ?? 0,
          authorizationTerms: borrower.authorizationTerms,
          optIns: borrower.optIns,
        },
        intendedCredit,
        collateral,
      })
      setStep('offer', { status: 'success', trace: res.trace })
      setOfferResults(res.data.offers ?? [])
      if (res.data.id) setPayload(p => ({ ...p, offerId: res.data.id }))
      return true
    } catch (err: unknown) {
      const e = err as { trace?: ApiTrace }
      setStep('offer', { status: 'error', trace: e.trace ?? null })
      pushNotification('error', 'Erro ao buscar oferta')
      return false
    }
  }

  // ── Step 3: Criar proposta ──────────────────────────────────────────────────

  const runProposal = async (): Promise<boolean> => {
    setStep('proposal', { status: 'running' })
    try {
      if (isHomeRefi) {
        // HOME_REFI: POST /proposals/home com Accept v2 + headers obrigatórios
        const homePayload = payload as CreateHomeRefiProposalRequest
        const res = await createHomeRefiProposal(homePayload, {
          bacenAuthorizedAt,
          userAgent,
          userIp,
        })
        setStep('proposal', { status: 'success', trace: res.trace })
        setProposalResult(res.data)
      } else {
        // AUTO: POST /proposals
        const res = await createProposal(payload as CreateProposalRequest)
        setStep('proposal', { status: 'success', trace: res.trace })
        setProposalResult(res.data)
      }
      pushNotification('success', 'Proposta criada com sucesso!')
      return true
    } catch (err: unknown) {
      const e = err as { trace?: ApiTrace }
      setStep('proposal', { status: 'error', trace: e.trace ?? null })
      pushNotification('error', 'Erro ao criar proposta')
      return false
    }
  }

  // ── Executar tudo ───────────────────────────────────────────────────────────

  const isConsultant = activeCredential?.authType === 'consultant'

  const runAll = async () => {
    if (!activeCredential) { pushNotification('warning', 'Selecione uma credencial'); return }
    if (isConsultant) { pushNotification('error', 'Consultor não pode criar propostas — use afiliado ou parceiro'); return }
    resetSteps()
    await runEligibility()   // informativo, não bloqueia
    if (!isHomeRefi) {
      const ok2 = await runOffer()
      if (!ok2) return
    }
    await runProposal()
  }

  // Stepper: HOME_REFI tem 2 passos, AUTO tem 3
  const stepLabels = isHomeRefi
    ? ['Elegibilidade', 'Proposta HOME_REFI']
    : ['Elegibilidade', 'Oferta (Auto)', 'Proposta AUTO']
  const stepKeys: Array<keyof typeof steps> = isHomeRefi
    ? ['eligibility', 'proposal']
    : ['eligibility', 'offer', 'proposal']
  const activeStep = stepKeys.findIndex(k => steps[k].status === 'running')
  const completedStep = stepKeys.filter(k => steps[k].status === 'success').length

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: isSmall ? '100vw' : '70vw',
            maxWidth: 1100,
            backgroundColor: tokens.colors.neutral[90],
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 3,
          borderBottom: `1px solid ${tokens.colors.neutral[80]}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Typography variant="h6">Criação Automática de Proposta</Typography>
          <Chip
            size="small"
            label={product}
            sx={{
              mt: 0.5,
              backgroundColor:
                product === 'AUTO_REFINANCING'
                  ? `${tokens.colors.primary[40]}22`
                  : `${tokens.colors.secondary[40]}22`,
              color:
                product === 'AUTO_REFINANCING'
                  ? tokens.colors.primary[40]
                  : tokens.colors.secondary[40],
              fontFamily: 'monospace',
              fontWeight: 700,
            }}
          />
        </Box>
        <CredentialSelector />
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        {/* Aviso de consultor */}
        {isConsultant && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Credenciais de <strong>consultor</strong> não têm permissão para criar propostas.
            Use um login de <strong>afiliado</strong> ou uma credencial de <strong>parceiro</strong> (consumer_key).
          </Alert>
        )}

        {/* Stepper */}
        <Stepper activeStep={activeStep >= 0 ? activeStep : completedStep} sx={{ mb: 3 }}>
          {stepLabels.map((label, i) => (
            <Step key={label} completed={steps[stepKeys[i]].status === 'success'}>
              <StepLabel
                icon={stepIcon(steps[stepKeys[i]].status, i)}
              >
                {label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>

        <Grid container spacing={3}>
          {/* Left: JSON editor */}
          <Grid size={{ xs: 12, lg: 6 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle2">Payload da proposta</Typography>
              <Tooltip title="Restaurar valores padrão">
                <Button
                  size="small"
                  variant="text"
                  onClick={() => setPayload(JSON.parse(JSON.stringify(defaultPayload)))}
                >
                  Resetar
                </Button>
              </Tooltip>
            </Box>
            <JsonEditor
              value={payload}
              onChange={v => setPayload(v as CreateProposalRequest)}
              minRows={20}
            />
          </Grid>

          {/* Right: JSON preview + results */}
          <Grid size={{ xs: 12, lg: 6 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Preview do JSON
            </Typography>
            <Box
              component="pre"
              sx={{
                m: 0, p: 1.5, borderRadius: 1,
                backgroundColor: tokens.colors.neutral[100],
                border: `1px solid ${tokens.colors.neutral[80]}`,
                fontSize: '0.72rem', fontFamily: 'monospace',
                whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                maxHeight: 400, overflowY: 'auto',
                color: tokens.colors.neutral[10],
              }}
            >
              {JSON.stringify(payload, null, 2)}
            </Box>

            {/* Eligibility result */}
            {eligibilityResults && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                  Elegibilidade
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                  {eligibilityResults.map(r => (
                    <Chip
                      key={r.product}
                      size="small"
                      label={`${r.product}: ${r.eligible ? '✓ elegível' : '✗ não elegível'}`}
                      color={r.eligible ? 'success' : 'error'}
                      variant="outlined"
                    />
                  ))}
                </Stack>
              </Box>
            )}

            {/* Offer/Simulation result */}
            {!!offerResults && offerResults.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                  {product === 'AUTO_REFINANCING' ? 'Ofertas' : 'Simulações'}
                </Typography>
                <Box sx={{ mt: 0.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {offerResults.slice(0, 3).map((o, i) => (
                    <Chip
                      key={i}
                      size="small"
                      label={`${(o as OfferItem).term ?? (o as SimulationItem).term}m · R$ ${Number((o as OfferItem).installment ?? (o as SimulationItem).installment).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês`}
                      variant="outlined"
                      color="primary"
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* Proposal result */}
            {!!proposalResult && (
              <Box sx={{ mt: 2, p: 1.5, borderRadius: 1, border: `2px solid ${tokens.colors.primary[40]}55`, backgroundColor: `${tokens.colors.primary[40]}11` }}>
                <Typography variant="subtitle2" sx={{ color: tokens.colors.primary[40], mb: 1 }}>
                  ✅ Proposta criada!
                </Typography>
                <Box component="pre" sx={{ m: 0, fontSize: '0.72rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {JSON.stringify(proposalResult, null, 2)}
                </Box>
              </Box>
            )}
          </Grid>
        </Grid>

        {/* Headers de afiliado — visíveis/editáveis apenas para HOME_REFI */}
        {isHomeRefi && (
          <>
            <Divider sx={{ my: 3 }} />
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                Headers obrigatórios (HOME_REFI)
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 5 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="X-Bacen-Authorized-At"
                    value={bacenAuthorizedAt}
                    onChange={e => setBacenAuthorizedAt(e.target.value)}
                    helperText="Formato: YYYY-MM-DDTHH:mm"
                    slotProps={{ htmlInput: { style: { fontFamily: 'monospace' } } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="X-User-Ip"
                    value={userIp}
                    onChange={e => setUserIp(e.target.value)}
                    slotProps={{ htmlInput: { style: { fontFamily: 'monospace' } } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="X-User-Agent"
                    value={userAgent}
                    onChange={e => setUserAgent(e.target.value)}
                    slotProps={{ htmlInput: { style: { fontFamily: 'monospace' } } }}
                  />
                </Grid>
              </Grid>
            </Box>
          </>
        )}

        <Divider sx={{ my: 3 }} />

        {/* Step buttons */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
          <Button
            variant="outlined" size="small"
            startIcon={steps.eligibility.status === 'running' ? <CircularProgress size={14} /> : stepIcon(steps.eligibility.status, 0)}
            onClick={() => { if (!activeCredential) { pushNotification('warning', 'Selecione uma credencial'); return }; if (isConsultant) { pushNotification('error', 'Consultor não pode criar propostas'); return }; runEligibility() }}
            disabled={steps.eligibility.status === 'running' || isConsultant}
          >
            1. Verificar elegibilidade
          </Button>
          {!isHomeRefi && (
            <Button
              variant="outlined" size="small"
              startIcon={steps.offer.status === 'running' ? <CircularProgress size={14} /> : stepIcon(steps.offer.status, 1)}
              onClick={() => { if (!activeCredential) { pushNotification('warning', 'Selecione uma credencial'); return }; runOffer() }}
              disabled={steps.offer.status === 'running'}
            >
              2. Buscar oferta
            </Button>
          )}
          <Button
            variant="outlined" size="small"
            startIcon={steps.proposal.status === 'running' ? <CircularProgress size={14} /> : stepIcon(steps.proposal.status, isHomeRefi ? 1 : 2)}
            onClick={() => { if (!activeCredential) { pushNotification('warning', 'Selecione uma credencial'); return }; if (isConsultant) { pushNotification('error', 'Consultor não pode criar propostas'); return }; runProposal() }}
            disabled={steps.proposal.status === 'running' || isConsultant}
          >
            {isHomeRefi ? '2.' : '3.'} Criar proposta
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button
            variant="contained" size="small"
            startIcon={Object.values(steps).some(s => s.status === 'running') ? <CircularProgress size={14} color="inherit" /> : <AutoFixHighIcon />}
            onClick={runAll}
            disabled={Object.values(steps).some(s => s.status === 'running') || isConsultant}
          >
            Executar tudo
          </Button>
        </Stack>

        {/* API traces */}
        {steps.eligibility.trace && (
          <ApiPanel trace={steps.eligibility.trace} title="1. GET /borrowers/eligibility" />
        )}
        {!isHomeRefi && steps.offer.trace && (
          <ApiPanel trace={steps.offer.trace} title="2. POST /offers" />
        )}
        {steps.proposal.trace && (
          <ApiPanel trace={steps.proposal.trace} title={isHomeRefi ? '2. POST /proposals/home' : '3. POST /proposals'} />
        )}
      </Box>

      <Box sx={{ p: 2, borderTop: `1px solid ${tokens.colors.neutral[80]}`, display: 'flex', justifyContent: 'flex-end' }}>
        <Button onClick={onClose}>Fechar</Button>
      </Box>
    </Drawer>
  )
}

// ── Manual proposal tab ───────────────────────────────────────────────────────

function ManualProposalTab({ product }: { product: 'AUTO_REFINANCING' | 'HOME_REFINANCING' }) {
  const { pushNotification, activeCredential } = useApp()
  const [loading, setLoading] = useState(false)
  const [trace, setTrace] = useState<ApiTrace | null>(null)
  const [result, setResult] = useState<unknown>(null)
  const defaultPayload =
    product === 'AUTO_REFINANCING' ? DEFAULT_AUTO_PROPOSAL : DEFAULT_HOME_PROPOSAL
  const [payload, setPayload] = useState<CreateProposalRequest>(
    JSON.parse(JSON.stringify(defaultPayload)),
  )

  const handleSubmit = async () => {
    if (!activeCredential) { pushNotification('warning', 'Selecione uma credencial'); return }
    setLoading(true); setTrace(null); setResult(null)
    try {
      const res = await createProposal(payload)
      setTrace(res.trace); setResult(res.data)
      pushNotification('success', 'Proposta criada!')
    } catch (err: unknown) {
      const e = err as { trace?: ApiTrace }
      if (e.trace) setTrace(e.trace)
      pushNotification('error', 'Erro ao criar proposta')
    } finally { setLoading(false) }
  }

  return (
    <Stack spacing={3}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="subtitle1">POST /proposals</Typography>
            <CredentialSelector />
          </Box>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <JsonEditor
                label="Payload (editável)"
                value={payload}
                onChange={v => setPayload(v as CreateProposalRequest)}
                minRows={18}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 0.5 }}>
                Preview
              </Typography>
              <Box
                component="pre"
                sx={{
                  m: 0, p: 1.5, borderRadius: 1,
                  backgroundColor: tokens.colors.neutral[100],
                  border: `1px solid ${tokens.colors.neutral[80]}`,
                  fontSize: '0.72rem', fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                  maxHeight: 400, overflowY: 'auto',
                  color: tokens.colors.neutral[10],
                }}
              >
                {JSON.stringify(payload, null, 2)}
              </Box>
            </Grid>
          </Grid>
          <Box sx={{ mt: 2 }}>
            <Button variant="contained" size="large"
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
              onClick={handleSubmit} disabled={loading}>
              Enviar proposta
            </Button>
          </Box>
        </CardContent>
      </Card>

      {!!result && (
        <Card sx={{ border: `2px solid ${tokens.colors.primary[40]}55` }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ color: tokens.colors.primary[40], mb: 1 }}>
              ✅ Proposta criada!
            </Typography>
            <Box component="pre" sx={{ m: 0, fontSize: '0.8rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {JSON.stringify(result, null, 2)}
            </Box>
          </CardContent>
        </Card>
      )}

      {trace && <ApiPanel trace={trace} title="POST /proposals" />}
    </Stack>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function ProposalsPage() {
  const [tab, setTab] = useState(0)
  const [product, setProduct] = useState<'AUTO_REFINANCING' | 'HOME_REFINANCING'>('HOME_REFINANCING')
  const [autoDrawerOpen, setAutoDrawerOpen] = useState(false)

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" gutterBottom>Propostas</Typography>
          <Typography variant="body2" color="text.secondary">
            Crie propostas manualmente ou use o fluxo automático (elegibilidade → oferta → proposta).
          </Typography>
        </Box>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Produto</InputLabel>
            <Select
              value={product}
              label="Produto"
              onChange={e => setProduct(e.target.value as typeof product)}
            >
              <MenuItem value="AUTO_REFINANCING">AUTO_REFINANCING</MenuItem>
              <MenuItem value="HOME_REFINANCING">HOME_REFINANCING</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            size="large"
            startIcon={<AutoFixHighIcon />}
            onClick={() => setAutoDrawerOpen(true)}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Criar proposta automática
          </Button>
        </Stack>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>Dica de staging:</strong> CPF começando com <code>7</code> = aprovação automática.
        CPF começando com <code>2</code> = recusa automática.
      </Alert>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Auto — AUTO_REFINANCING" />
        <Tab label="Home — HOME_REFINANCING" />
      </Tabs>

      {tab === 0 && <ManualProposalTab product="AUTO_REFINANCING" />}
      {tab === 1 && <ManualProposalTab product="HOME_REFINANCING" />}

      <AutoCreateDrawer
        open={autoDrawerOpen}
        onClose={() => setAutoDrawerOpen(false)}
        product={product}
      />
    </Box>
  )
}
