import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar'
import HomeIcon from '@mui/icons-material/Home'
import SearchIcon from '@mui/icons-material/Search'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { ApiPanel } from '../../components/ApiPanel'
import { CredentialSelector } from '../../components/CredentialSelector'
import { useApp } from '../../context/AppContext'
import { checkEligibility } from '../../services/b2bApi'
import type { ApiTrace, EligibilityResult, ProductType } from '../../types/api'
import tokens from '../../theme/tokens'

const PRODUCT_OPTIONS = [
  { value: '', label: 'Ambos (Auto + Home)' },
  { value: 'AUTO_REFINANCING', label: 'AUTO_REFINANCING' },
  { value: 'HOME_REFINANCING', label: 'HOME_REFINANCING' },
]

function ResultCard({ result }: { result: EligibilityResult }) {
  const isAuto = result.product === 'AUTO_REFINANCING'
  const color = result.eligible ? tokens.colors.primary[40] : tokens.colors.error[60]

  return (
    <Card
      sx={{
        border: `2px solid ${color}55`,
        backgroundColor: `${color}11`,
      }}
    >
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {isAuto ? (
          <DirectionsCarIcon sx={{ fontSize: 32, color }} />
        ) : (
          <HomeIcon sx={{ fontSize: 32, color }} />
        )}
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" sx={{ fontFamily: 'monospace' }}>
            {result.product}
          </Typography>
        </Box>
        <Chip
          label={result.eligible ? 'ELEGÍVEL' : 'NÃO ELEGÍVEL'}
          icon={result.eligible ? <CheckCircleIcon /> : undefined}
          sx={{
            backgroundColor: `${color}22`,
            color,
            border: `1px solid ${color}55`,
            fontWeight: 700,
          }}
        />
      </CardContent>
    </Card>
  )
}

export function EligibilityPage() {
  const { pushNotification, activeCredential } = useApp()
  const [cpf, setCpf] = useState('')
  const [email, setEmail] = useState('')
  const [productType, setProductType] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<EligibilityResult[] | null>(null)
  const [trace, setTrace] = useState<ApiTrace | null>(null)

  const handleCheck = async () => {
    if (!cpf.trim() || !email.trim()) {
      pushNotification('error', 'Informe CPF e e-mail')
      return
    }
    if (!activeCredential) {
      pushNotification('warning', 'Selecione uma credencial de parceiro')
      return
    }

    setLoading(true)
    setResults(null)
    setTrace(null)

    try {
      const res = await checkEligibility({
        cpf: cpf.replace(/\D/g, ''),
        email: email.trim(),
        ...(productType ? { productType: productType as ProductType } : {}),
      })
      setResults(res.data)
      setTrace(res.trace)
      const eligible = res.data.filter(r => r.eligible)
      pushNotification(
        eligible.length > 0 ? 'success' : 'warning',
        `${eligible.length} de ${res.data.length} produto(s) elegível(is)`,
      )
    } catch (err: unknown) {
      const e = err as { trace?: ApiTrace }
      if (e.trace) setTrace(e.trace)
      pushNotification('error', 'Erro ao verificar elegibilidade')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Elegibilidade
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Verifica se um CPF/e-mail é elegível para os produtos Creditas.
        Endpoint: <code>GET /borrowers/eligibility</code>
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="subtitle1">Parâmetros</Typography>
            <CredentialSelector />
          </Box>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label="CPF"
                placeholder="700.000.000-01"
                value={cpf}
                onChange={e => setCpf(e.target.value)}
                helperText="Sem formatação ou com máscara"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label="E-mail"
                type="email"
                placeholder="teste@exemplo.com.br"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Produto</InputLabel>
                <Select
                  value={productType}
                  label="Produto"
                  onChange={e => setProductType(e.target.value)}
                >
                  {PRODUCT_OPTIONS.map(o => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              size="large"
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SearchIcon />}
              onClick={handleCheck}
              disabled={loading || !cpf.trim() || !email.trim()}
            >
              Verificar elegibilidade
            </Button>
          </Box>
        </CardContent>
      </Card>

      {!activeCredential && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Nenhuma credencial de parceiro ativa. Acesse <strong>Credenciais</strong> para adicionar.
        </Alert>
      )}

      {results && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            Resultado
          </Typography>
          <Stack spacing={1}>
            {results.map(r => (
              <ResultCard key={r.product} result={r} />
            ))}
          </Stack>
        </Box>
      )}

      {trace && <ApiPanel trace={trace} title="GET /borrowers/eligibility" defaultExpanded />}
    </Box>
  )
}
