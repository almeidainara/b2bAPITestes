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
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { ApiPanel } from '../../components/ApiPanel'
import { CredentialSelector } from '../../components/CredentialSelector'
import { useApp } from '../../context/AppContext'
import { createOffer, getSimulations } from '../../services/b2bApi'
import type { ApiTrace, CreateOfferRequest, OfferItem, SimulationItem, SimulationRequest } from '../../types/api'
import tokens from '../../theme/tokens'

const PROFESSIONAL_STATUS = [
  'CLT', 'SELF_EMPLOYED', 'FREELANCER', 'BUSINESSMAN', 'CIVIL_SERVANT', 'RETIRED',
]

const PURPOSES = [
  'DEBT_REFINANCING', 'WORKING_CAPITAL', 'HOME_IMPROVEMENT', 'VEHICLE_PURCHASE',
  'EDUCATION', 'MEDICAL_EXPENSES', 'TRAVEL', 'OTHER',
]

const UF_LIST = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
]

// ── Auto Offers tab ───────────────────────────────────────────────────────────

function AutoOffersTab() {
  const { pushNotification, activeCredential } = useApp()
  const [loading, setLoading] = useState(false)
  const [trace, setTrace] = useState<ApiTrace | null>(null)
  const [offerResults, setOfferResults] = useState<OfferItem[] | null>(null)

  const [form, setForm] = useState<CreateOfferRequest>({
    purpose: 'DEBT_REFINANCING',
    borrower: {
      cpf: '70000000001',
      fullName: 'João da Silva Teste',
      email: 'joao.teste@exemplo.com.br',
      cellphoneCode: '11',
      cellphone: '999999999',
      birthDate: '1985-06-15',
      postalCode: '01310100',
      professionalStatus: 'CLT',
      monthlyIncome: 5000,
      authorizationTerms: 'Autorizo a consulta ao SCR',
      optIns: true,
    },
    intendedCredit: { value: 30000, loanTerms: 36 },
    collateral: { licensePlate: 'ABC1234', debt: 0, borrowerVehicleOwner: true },
  })

  const set = (path: string, value: unknown) => {
    const keys = path.split('.')
    setForm(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      let cur: Record<string, unknown> = next
      keys.slice(0, -1).forEach(k => { cur = cur[k] as Record<string, unknown> })
      cur[keys[keys.length - 1]] = value
      return next
    })
  }

  const handleSubmit = async () => {
    if (!activeCredential) { pushNotification('warning', 'Selecione uma credencial'); return }
    setLoading(true); setTrace(null); setOfferResults(null)
    try {
      const res = await createOffer(form)
      setTrace(res.trace)
      setOfferResults(res.data.offers ?? [])
      pushNotification('success', `Oferta criada! Status: ${res.data.approvedStatus}`)
    } catch (err: unknown) {
      const e = err as { trace?: ApiTrace }
      if (e.trace) setTrace(e.trace)
      pushNotification('error', 'Erro ao criar oferta')
    } finally { setLoading(false) }
  }

  return (
    <Stack spacing={3}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="subtitle1">POST /offers</Typography>
            <CredentialSelector />
          </Box>

          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Geral</Typography>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Purpose</InputLabel>
                <Select value={form.purpose} label="Purpose" onChange={e => set('purpose', e.target.value)}>
                  {PURPOSES.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Borrower</Typography>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            {[
              { label: 'CPF', field: 'borrower.cpf' },
              { label: 'Nome completo', field: 'borrower.fullName' },
              { label: 'E-mail', field: 'borrower.email' },
              { label: 'DDD', field: 'borrower.cellphoneCode' },
              { label: 'Celular', field: 'borrower.cellphone' },
              { label: 'Data nascimento', field: 'borrower.birthDate', placeholder: 'YYYY-MM-DD' },
              { label: 'CEP', field: 'borrower.postalCode' },
            ].map(f => (
              <Grid size={{ xs: 12, sm: 4 }} key={f.field}>
                <TextField
                  fullWidth size="small" label={f.label}
                  placeholder={f.placeholder}
                  value={(form.borrower as unknown as Record<string,unknown>)[f.field.split('.')[1]] as string ?? ''}
                  onChange={e => set(f.field, e.target.value)}
                />
              </Grid>
            ))}
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Professional Status</InputLabel>
                <Select value={form.borrower.professionalStatus} label="Professional Status"
                  onChange={e => set('borrower.professionalStatus', e.target.value)}>
                  {PROFESSIONAL_STATUS.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth size="small" label="Renda mensal (R$)" type="number"
                value={form.borrower.monthlyIncome}
                onChange={e => set('borrower.monthlyIncome', Number(e.target.value))} />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Crédito pretendido</Typography>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField fullWidth size="small" label="Valor (R$)" type="number"
                value={form.intendedCredit.value}
                onChange={e => set('intendedCredit.value', Number(e.target.value))} />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField fullWidth size="small" label="Prazo (meses)" type="number"
                value={form.intendedCredit.loanTerms}
                onChange={e => set('intendedCredit.loanTerms', Number(e.target.value))} />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Garantia (Veículo)</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField fullWidth size="small" label="Placa" value={form.collateral.licensePlate}
                onChange={e => set('collateral.licensePlate', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField fullWidth size="small" label="Dívida do veículo (R$)" type="number"
                value={form.collateral.debt}
                onChange={e => set('collateral.debt', Number(e.target.value))} />
            </Grid>
          </Grid>

          <Box sx={{ mt: 3 }}>
            <Button variant="contained" size="large"
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
              onClick={handleSubmit} disabled={loading}>
              Criar oferta
            </Button>
          </Box>
        </CardContent>
      </Card>

      {offerResults && offerResults.length > 0 && (
        <Box>
          <Typography variant="subtitle1" sx={{ mb: 1.5 }}>Ofertas retornadas</Typography>
          <Grid container spacing={2}>
            {offerResults.map((o, i) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={o.id ?? i}>
                <Card sx={{ border: `1px solid ${tokens.colors.primary[40]}55` }}>
                  <CardContent>
                    <Typography variant="subtitle2" sx={{ fontFamily: 'monospace', mb: 1 }}>
                      Oferta #{i + 1}
                    </Typography>
                    {[
                      { label: 'Prazo', value: `${o.term} meses` },
                      { label: 'Parcela', value: `R$ ${Number(o.installment).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
                      { label: 'Taxa juros', value: `${o.interestRate}% a.m.` },
                      { label: 'CET', value: `${o.cet}% a.a.` },
                      { label: 'Valor aprovado', value: `R$ ${Number(o.loanAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
                    ].map(row => (
                      <Box key={row.label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.25 }}>
                        <Typography variant="caption" color="text.secondary">{row.label}</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>{row.value}</Typography>
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {trace && <ApiPanel trace={trace} title="POST /offers" />}
    </Stack>
  )
}

// ── Home Simulations tab ──────────────────────────────────────────────────────

function HomeSimulationsTab() {
  const { pushNotification, activeCredential } = useApp()
  const [loading, setLoading] = useState(false)
  const [trace, setTrace] = useState<ApiTrace | null>(null)
  const [simResults, setSimResults] = useState<SimulationItem[] | null>(null)

  const [form, setForm] = useState<SimulationRequest>({
    cpf: '70000000001',
    value: 100000,
    loanTerms: 60,
    monthlyIncome: 8000,
    professionalStatus: 'CLT',
    productType: 'HOME_REFI',
    uf: 'SP',
    amortization: 'PRICE',
  })

  const handleSubmit = async () => {
    if (!activeCredential) { pushNotification('warning', 'Selecione uma credencial'); return }
    setLoading(true); setTrace(null); setSimResults(null)
    try {
      const res = await getSimulations(form)
      setTrace(res.trace)
      setSimResults(Array.isArray(res.data) ? res.data : [])
      pushNotification('success', `${Array.isArray(res.data) ? res.data.length : 0} simulação(ões) retornada(s)`)
    } catch (err: unknown) {
      const e = err as { trace?: ApiTrace }
      if (e.trace) setTrace(e.trace)
      pushNotification('error', 'Erro ao buscar simulações')
    } finally { setLoading(false) }
  }

  return (
    <Stack spacing={3}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="subtitle1">GET /simulations</Typography>
            <CredentialSelector />
          </Box>

          <Grid container spacing={2}>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField fullWidth size="small" label="CPF" value={form.cpf}
                onChange={e => setForm(f => ({ ...f, cpf: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField fullWidth size="small" label="Valor imóvel (R$)" type="number"
                value={form.value}
                onChange={e => setForm(f => ({ ...f, value: Number(e.target.value) }))} />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField fullWidth size="small" label="Prazo (meses)" type="number"
                value={form.loanTerms}
                onChange={e => setForm(f => ({ ...f, loanTerms: Number(e.target.value) }))} />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField fullWidth size="small" label="Renda mensal (R$)" type="number"
                value={form.monthlyIncome}
                onChange={e => setForm(f => ({ ...f, monthlyIncome: Number(e.target.value) }))} />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Status profissional</InputLabel>
                <Select value={form.professionalStatus} label="Status profissional"
                  onChange={e => setForm(f => ({ ...f, professionalStatus: e.target.value as SimulationRequest['professionalStatus'] }))}>
                  {PROFESSIONAL_STATUS.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>UF</InputLabel>
                <Select value={form.uf} label="UF"
                  onChange={e => setForm(f => ({ ...f, uf: e.target.value }))}>
                  {UF_LIST.map(uf => <MenuItem key={uf} value={uf}>{uf}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Amortização</InputLabel>
                <Select value={form.amortization ?? 'PRICE'} label="Amortização"
                  onChange={e => setForm(f => ({ ...f, amortization: e.target.value as 'PRICE' | 'SAC' }))}>
                  <MenuItem value="PRICE">PRICE</MenuItem>
                  <MenuItem value="SAC">SAC</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Box sx={{ mt: 3 }}>
            <Button variant="contained" size="large"
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
              onClick={handleSubmit} disabled={loading}>
              Simular
            </Button>
          </Box>
        </CardContent>
      </Card>

      {simResults && simResults.length > 0 && (
        <Box>
          <Typography variant="subtitle1" sx={{ mb: 1.5 }}>Simulações retornadas</Typography>
          <Grid container spacing={2}>
            {simResults.map((s, i) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
                <Card sx={{ border: `1px solid ${tokens.colors.secondary[40]}55` }}>
                  <CardContent>
                    <Chip label={`${s.term} meses`} size="small" color="secondary" sx={{ mb: 1 }} />
                    {[
                      { label: 'Parcela', value: `R$ ${Number(s.installment).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
                      { label: 'Taxa juros', value: `${s.interestRate}% a.m.` },
                      { label: 'CET', value: `${s.cet}% a.a.` },
                      { label: 'Valor empréstimo', value: `R$ ${Number(s.loanAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
                      { label: 'Renda mín.', value: `R$ ${Number(s.minMonthlyIncome).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
                    ].map(row => (
                      <Box key={row.label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.25 }}>
                        <Typography variant="caption" color="text.secondary">{row.label}</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>{row.value}</Typography>
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {simResults && simResults.length === 0 && (
        <Alert severity="warning">Nenhuma simulação retornada para os parâmetros informados.</Alert>
      )}

      {trace && <ApiPanel trace={trace} title="GET /simulations" />}
    </Stack>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function OffersPage() {
  const [tab, setTab] = useState(0)
  return (
    <Box>
      <Typography variant="h5" gutterBottom>Ofertas / Simulações</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Teste os endpoints de criação de oferta (Auto) e simulação (Home Equity).
      </Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Auto — POST /offers" />
        <Tab label="Home — GET /simulations" />
      </Tabs>
      {tab === 0 && <AutoOffersTab />}
      {tab === 1 && <HomeSimulationsTab />}
    </Box>
  )
}
