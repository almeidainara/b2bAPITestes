import SaveIcon from '@mui/icons-material/Save'
import WifiIcon from '@mui/icons-material/Wifi'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
import { ApiPanel } from '../../components/ApiPanel'
import { listPartnerCompanies } from '../../services/internalApi'
import { getInternalSettings, saveInternalSettings } from '../../services/tokenManager'
import type { ApiTrace } from '../../types/api'
import { useApp } from '../../context/AppContext'
import tokens from '../../theme/tokens'

export function SettingsPage() {
  const { pushNotification, refreshInternalSettings } = useApp()

  const [token, setToken] = useState('')
  const [userId, setUserId] = useState('user-uuid')
  const [userType, setUserType] = useState('consultant')
  const [tenantId, setTenantId] = useState('creditasbr')
  const [loading, setLoading] = useState(false)
  const [testTrace, setTestTrace] = useState<ApiTrace | null>(null)

  useEffect(() => {
    const s = getInternalSettings()
    if (s) {
      setToken(s.token)
      setUserId(s.userId)
      setUserType(s.userType)
      setTenantId(s.tenantId)
    }
  }, [])

  const handleSave = () => {
    if (!token.trim()) {
      pushNotification('error', 'Informe um token JWT')
      return
    }
    const clean = token.trim().replace(/^Bearer\s+/i, '')
    saveInternalSettings({ token: clean, userId, userType, tenantId })
    refreshInternalSettings()
    pushNotification('success', 'Configurações salvas!')
  }

  const handleTest = async () => {
    handleSave()
    setLoading(true)
    setTestTrace(null)
    try {
      const { trace } = await listPartnerCompanies(1, 0)
      setTestTrace(trace)
      pushNotification('success', 'Conexão OK!')
    } catch (err: unknown) {
      const e = err as { trace?: ApiTrace }
      if (e.trace) setTestTrace(e.trace)
      pushNotification('error', 'Falha na conexão. Verifique o token.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Configurações Internas
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure o token JWT usado nas APIs internas da Creditas (<code>/partner/companies</code>).
        Estes dados são salvos no <code>localStorage</code> do navegador.
      </Typography>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            Credenciais das APIs Internas
          </Typography>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Token JWT (Bearer)"
                placeholder="eyJhbGciOiJIUzI1NiJ9..."
                value={token}
                onChange={e => setToken(e.target.value)}
                helperText="Cole o token JWT sem o prefixo 'Bearer'"
                slotProps={{ htmlInput: { style: { fontFamily: 'monospace', fontSize: '0.8rem' } } }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label="X-User-Id"
                value={userId}
                onChange={e => setUserId(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label="X-User-Type"
                value={userType}
                onChange={e => setUserType(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label="X-Tenant-Id"
                value={tenantId}
                onChange={e => setTenantId(e.target.value)}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
            >
              Salvar
            </Button>
            <Button
              variant="outlined"
              startIcon={loading ? <CircularProgress size={16} /> : <WifiIcon />}
              onClick={handleTest}
              disabled={loading}
            >
              Testar conexão
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Box
        sx={{
          mt: 3,
          p: 2,
          borderRadius: 1,
          backgroundColor: tokens.colors.neutral[90],
          border: `1px solid ${tokens.colors.neutral[80]}`,
        }}
      >
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Headers enviados nas APIs internas
        </Typography>
        <Box component="pre" sx={{ m: 0, fontFamily: 'monospace', fontSize: '0.75rem', color: tokens.colors.neutral[10] }}>
          {`Accept: application/vnd.creditas.v1+json\nContent-Type: application/json\nX-User-Id: ${userId}\nX-User-Type: ${userType}\nX-Tenant-Id: ${tenantId}\nAuthorization: Bearer <token>`}
        </Box>
      </Box>

      <Alert severity="info" sx={{ mt: 2 }}>
        Base URL das APIs internas: <strong>https://stg-api.creditas.io</strong>
      </Alert>

      {testTrace && <ApiPanel trace={testTrace} title="Teste de conexão" defaultExpanded />}
    </Box>
  )
}
