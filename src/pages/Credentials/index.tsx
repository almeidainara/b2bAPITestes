import AddIcon from '@mui/icons-material/Add'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import KeyIcon from '@mui/icons-material/Key'
import LoginIcon from '@mui/icons-material/Login'
import LogoutIcon from '@mui/icons-material/Logout'
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts'
import PersonIcon from '@mui/icons-material/Person'
import BusinessIcon from '@mui/icons-material/Business'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { ApiPanel } from '../../components/ApiPanel'
import { useApp } from '../../context/AppContext'
import {
  affiliateLogin,
  consultantLogin,
  extractUserIdFromJwt,
  partnerClientLogin,
} from '../../services/affiliateAuthApi'
import {
  SESSION_CREDENTIAL_ID,
  addPartnerCredential,
  getInternalSettings,
  getPartnerCredentials,
  getSessionCredential,
  removePartnerCredential,
  saveInternalSettings,
} from '../../services/tokenManager'
import type { ApiTrace } from '../../types/api'
import type { PartnerCredential } from '../../types/partner'
import tokens from '../../theme/tokens'

// ── Tipos do JSON de credencial de parceiro ───────────────────────────────────

interface PartnerClientJson {
  id?: string
  name?: string
  email?: string
  description?: string
  consumerKey?: string
  consumerSecret?: string
  activeness?: string
}

// ── Coluna 1: Credencial de Parceiro via JSON ─────────────────────────────────

function PartnerJsonCard() {
  const { pushNotification, activeCredential, setSessionCredential, clearSessionCredential } = useApp()
  const [jsonText, setJsonText] = useState('')
  const [parsed, setParsed] = useState<PartnerClientJson | null>(null)
  const [parseError, setParseError] = useState('')
  const [loading, setLoading] = useState(false)
  const [trace, setTrace] = useState<ApiTrace | null>(null)

  const isSessionActive = activeCredential?.id === SESSION_CREDENTIAL_ID && activeCredential?.authType === 'partner_client'

  const sanitizeJson = (s: string) =>
    s
      .replace(/\uFEFF/g, '')          // BOM
      .replace(/\u200B/g, '')          // zero-width space
      .replace(/\u00A0/g, ' ')         // non-breaking space
      .replace(/[\u2018\u2019]/g, "'") // smart single quotes
      .replace(/[\u201C\u201D]/g, '"') // smart double quotes
      .trim()

  const handleJsonChange = (value: string) => {
    setJsonText(value)
    setParseError('')
    setParsed(null)
    if (!value.trim()) return
    try {
      const obj = JSON.parse(sanitizeJson(value)) as PartnerClientJson
      if (!obj.consumerKey || !obj.consumerSecret) {
        setParseError('JSON não contém consumerKey / consumerSecret')
        return
      }
      setParsed(obj)
    } catch {
      setParseError('JSON inválido — verifique aspas e caracteres especiais')
    }
  }

  const handleLogin = async () => {
    if (!parsed?.consumerKey || !parsed?.consumerSecret) return
    setLoading(true)
    setTrace(null)
    try {
      const result = await partnerClientLogin(parsed.consumerKey, parsed.consumerSecret)
      const userId = extractUserIdFromJwt(result.accessToken)
      const cred: PartnerCredential = {
        id: SESSION_CREDENTIAL_ID,
        name: parsed.name ?? parsed.email ?? 'Sessão — Parceiro',
        companyId: '',
        authType: 'partner_client',
        token: result.accessToken,
        userId,
        userType: 'affiliate',
        // Guardados para re-login automático quando o token expirar (401)
        consumerKey: parsed.consumerKey,
        consumerSecret: parsed.consumerSecret,
        createdAt: new Date().toISOString(),
      }
      setSessionCredential(cred)
      setTrace(result.trace)
      pushNotification('success', `Login de parceiro realizado: ${cred.name}`)
    } catch (err: unknown) {
      const e = err as { trace?: ApiTrace }
      if (e.trace) setTrace(e.trace)
      pushNotification('error', 'Falha no login de parceiro')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    clearSessionCredential()
    setJsonText('')
    setParsed(null)
    setTrace(null)
    pushNotification('info', 'Sessão encerrada')
  }

  return (
    <Card variant="outlined" sx={{ height: '100%', border: isSessionActive ? `2px solid ${tokens.colors.secondary[40]}` : undefined }}>
      <CardHeader
        avatar={<BusinessIcon sx={{ color: tokens.colors.secondary[40] }} />}
        title={
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Credencial de Parceiro</Typography>
            {isSessionActive && <Chip size="small" label="ATIVO" color="secondary" sx={{ fontWeight: 700, fontSize: '0.65rem' }} />}
          </Stack>
        }
        subheader="consumer_key + consumer_secret → token"
        sx={{ pb: 0 }}
      />
      <CardContent>
        {isSessionActive && activeCredential ? (
          <Box>
            <Alert severity="success" sx={{ mb: 2 }}>
              <strong>{activeCredential.name}</strong>
              {activeCredential.userId && <><br />userId: <code>{activeCredential.userId}</code></>}
            </Alert>
            <Button variant="outlined" color="error" size="small" startIcon={<LogoutIcon />} onClick={handleLogout} fullWidth>
              Encerrar sessão
            </Button>
          </Box>
        ) : (
          <Stack spacing={1.5}>
            <TextField
              multiline
              rows={7}
              fullWidth
              placeholder={'{\n  "consumerKey": "...",\n  "consumerSecret": "...",\n  "name": "..."\n}'}
              value={jsonText}
              onChange={e => handleJsonChange(e.target.value)}
              error={!!parseError}
              helperText={parseError || (parsed ? `✓ ${parsed.name ?? parsed.email ?? 'Credencial reconhecida'}` : 'Cole o JSON da credencial de parceiro')}
              slotProps={{ htmlInput: { style: { fontFamily: 'monospace', fontSize: '0.75rem' } } }}
            />
            <Button
              variant="contained"
              color="secondary"
              fullWidth
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <LoginIcon />}
              onClick={handleLogin}
              disabled={loading || !parsed?.consumerKey || !parsed?.consumerSecret}
            >
              Entrar com credencial de parceiro
            </Button>
          </Stack>
        )}
        {trace && (
          <Box sx={{ mt: 2 }}>
            <ApiPanel trace={trace} title="POST /api/affiliate_clients/tokens" defaultExpanded={false} />
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

// ── Coluna 2: Login com email + senha (Afiliado ou Consultor) ─────────────────

function AffiliateLoginCard() {
  const { pushNotification, activeCredential, setSessionCredential, clearSessionCredential } = useApp()
  const [loginType, setLoginType] = useState<'affiliate' | 'consultant'>('affiliate')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [trace, setTrace] = useState<ApiTrace | null>(null)

  const isSessionActive =
    activeCredential?.id === SESSION_CREDENTIAL_ID &&
    (activeCredential?.authType === 'affiliate' || activeCredential?.authType === 'consultant')

  const typeLabel = loginType === 'affiliate' ? 'Afiliado (portal)' : 'Consultor (partner)'
  const apiPath = loginType === 'affiliate' ? '/api/affiliates/tokens' : '/api/consultants/tokens'

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      pushNotification('error', 'Informe e-mail e senha')
      return
    }
    setLoading(true)
    setTrace(null)
    try {
      const result = loginType === 'affiliate'
        ? await affiliateLogin(email.trim(), password)
        : await consultantLogin(email.trim(), password)
      const userId = extractUserIdFromJwt(result.accessToken)
      const cred: PartnerCredential = {
        id: SESSION_CREDENTIAL_ID,
        name: `Sessão — ${email.trim()}`,
        companyId: '',
        authType: loginType,
        token: result.accessToken,
        userId,
        userType: loginType === 'affiliate' ? 'affiliate' : 'consultant',
        affiliateEmail: email.trim(),
        affiliatePassword: password,
        createdAt: new Date().toISOString(),
      }
      setSessionCredential(cred)
      setTrace(result.trace)
      pushNotification('success', `Login de ${typeLabel} realizado!`)
    } catch (err: unknown) {
      const e = err as { trace?: ApiTrace }
      if (e.trace) setTrace(e.trace)
      pushNotification('error', `Falha no login de ${typeLabel}`)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    clearSessionCredential()
    setTrace(null)
    pushNotification('info', 'Sessão encerrada')
  }

  return (
    <Card variant="outlined" sx={{ height: '100%', border: isSessionActive ? `2px solid ${tokens.colors.primary[40]}` : undefined }}>
      <CardHeader
        avatar={<PersonIcon sx={{ color: tokens.colors.primary[40] }} />}
        title={
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Login por E-mail e Senha</Typography>
            {isSessionActive && <Chip size="small" label="ATIVO" color="primary" sx={{ fontWeight: 700, fontSize: '0.65rem' }} />}
          </Stack>
        }
        subheader="afiliado ou consultor → token"
        sx={{ pb: 0 }}
      />
      <CardContent>
        {isSessionActive && activeCredential ? (
          <Box>
            <Alert severity="success" sx={{ mb: 2 }}>
              <strong>{activeCredential.affiliateEmail ?? activeCredential.name}</strong>
              <br />
              <Typography variant="caption" component="span">
                {activeCredential.authType === 'consultant' ? 'Consultor (partner)' : 'Afiliado (portal)'}
              </Typography>
              {activeCredential.userId && <><br />userId: <code>{activeCredential.userId}</code></>}
            </Alert>
            <Button variant="outlined" color="error" size="small" startIcon={<LogoutIcon />} onClick={handleLogout} fullWidth>
              Encerrar sessão
            </Button>
          </Box>
        ) : (
          <Stack spacing={1.5}>
            <FormControl fullWidth size="small">
              <InputLabel>Tipo de login</InputLabel>
              <Select
                value={loginType}
                label="Tipo de login"
                onChange={e => setLoginType(e.target.value as 'affiliate' | 'consultant')}
              >
                <MenuItem value="affiliate">Afiliado (portal)</MenuItem>
                <MenuItem value="consultant">Consultor (partner)</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth label="E-mail" type="email" size="small"
              value={email} onChange={e => setEmail(e.target.value)}
              autoComplete="username"
            />
            <TextField
              fullWidth label="Senha" type="password" size="small"
              value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              autoComplete="current-password"
            />
            <Button
              variant="contained"
              fullWidth
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <LoginIcon />}
              onClick={handleLogin}
              disabled={loading || !email || !password}
            >
              Entrar como {typeLabel}
            </Button>
          </Stack>
        )}
        {trace && (
          <Box sx={{ mt: 2 }}>
            <ApiPanel trace={trace} title={`POST ${apiPath}`} defaultExpanded={false} />
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

// ── Coluna 3: JWT (Afiliado ou Consultor) ─────────────────────────────────────

function ConsultantJwtCard() {
  const { pushNotification, refreshInternalSettings } = useApp()
  const [jwtUserType, setJwtUserType] = useState<'affiliate' | 'consultant'>(
    () => (getInternalSettings()?.userType as 'affiliate' | 'consultant') ?? 'consultant',
  )
  const [token, setToken] = useState(() => getInternalSettings()?.token ?? '')
  const [saved, setSaved] = useState(!!getInternalSettings()?.token)

  const handleSave = () => {
    const clean = token.trim().replace(/^Bearer\s+/i, '')
    if (!clean) {
      pushNotification('error', 'Cole o JWT antes de salvar')
      return
    }
    const current = getInternalSettings()
    saveInternalSettings({
      token: clean,
      userId: current?.userId ?? 'user-uuid',
      userType: jwtUserType,
      tenantId: current?.tenantId ?? 'creditasbr',
    })
    refreshInternalSettings()
    setSaved(true)
    pushNotification('success', `JWT de ${jwtUserType === 'affiliate' ? 'afiliado' : 'consultor'} salvo`)
  }

  const handleClear = () => {
    setToken('')
    setSaved(false)
    saveInternalSettings({ token: '', userId: 'user-uuid', userType: jwtUserType, tenantId: 'creditasbr' })
    refreshInternalSettings()
    pushNotification('info', 'JWT removido')
  }

  return (
    <Card variant="outlined" sx={{ height: '100%', border: saved && token ? `2px solid ${tokens.colors.neutral[60]}` : undefined }}>
      <CardHeader
        avatar={<ManageAccountsIcon sx={{ color: tokens.colors.neutral[40] }} />}
        title={
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>JWT</Typography>
            {saved && token && <Chip size="small" label="CONFIGURADO" variant="outlined" sx={{ fontSize: '0.65rem' }} />}
          </Stack>
        }
        subheader="Necessário apenas para buscar parceiros (/partner/*)"
        sx={{ pb: 0 }}
      />
      <CardContent>
        <Stack spacing={1.5}>
          <FormControl fullWidth size="small">
            <InputLabel>Tipo de usuário</InputLabel>
            <Select
              value={jwtUserType}
              label="Tipo de usuário"
              onChange={e => { setJwtUserType(e.target.value as 'affiliate' | 'consultant'); setSaved(false) }}
            >
              <MenuItem value="affiliate">Afiliado (portal)</MenuItem>
              <MenuItem value="consultant">Consultor (partner)</MenuItem>
            </Select>
          </FormControl>
          <TextField
            multiline
            rows={6}
            fullWidth
            label="Bearer JWT"
            placeholder="eyJhbGciOiJIUzI1NiJ9..."
            value={token}
            onChange={e => { setToken(e.target.value); setSaved(false) }}
            slotProps={{ htmlInput: { style: { fontFamily: 'monospace', fontSize: '0.75rem' } } }}
            helperText="Token para APIs internas /partner/companies — não necessário para propostas"
          />
          <Stack direction="row" spacing={1}>
            <Button variant="contained" color="inherit" startIcon={<CheckCircleIcon />} onClick={handleSave} sx={{ flex: 1 }} disabled={!token.trim()}>
              Salvar
            </Button>
            {token && (
              <Button variant="outlined" color="error" onClick={handleClear}>
                Limpar
              </Button>
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}

// ── Dialog de credencial salva ─────────────────────────────────────────────────

interface CredentialDialogProps {
  open: boolean
  initial?: PartnerCredential | null
  onClose: () => void
  onSave: (cred: PartnerCredential) => void
}

function CredentialDialog({ open, initial, onClose, onSave }: CredentialDialogProps) {
  const [name, setName] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [token, setToken] = useState('')
  const [userId, setUserId] = useState('')
  const [userType, setUserType] = useState<'affiliate' | 'consultant'>('affiliate')

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? '')
      setCompanyId(initial?.companyId ?? '')
      setToken(initial?.token ?? '')
      setUserId(initial?.userId ?? '')
      setUserType(initial?.userType ?? 'affiliate')
    }
  }, [open, initial])

  const handleTokenChange = (raw: string) => {
    setToken(raw)
    const clean = raw.trim().replace(/^Bearer\s+/i, '')
    const extracted = extractUserIdFromJwt(clean)
    if (extracted) setUserId(extracted)
  }

  const handleSave = () => {
    const clean = token.trim().replace(/^Bearer\s+/i, '')
    onSave({
      id: initial?.id ?? uuidv4(),
      name: name.trim(),
      companyId: companyId.trim(),
      authType: 'manual',
      token: clean,
      userId: userId.trim() || extractUserIdFromJwt(clean),
      userType,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    })
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initial ? 'Editar credencial' : 'Nova credencial salva'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField fullWidth label="Nome *" value={name} onChange={e => setName(e.target.value)} autoFocus />
          <TextField fullWidth label="Company ID" placeholder="CPN-XXXXXXXX-..."
            value={companyId} onChange={e => setCompanyId(e.target.value)}
            slotProps={{ htmlInput: { style: { fontFamily: 'monospace' } } }}
            helperText="Opcional" />
          <FormControl fullWidth size="small">
            <InputLabel>Tipo de usuário</InputLabel>
            <Select value={userType} label="Tipo de usuário"
              onChange={e => setUserType(e.target.value as 'affiliate' | 'consultant')}>
              <MenuItem value="affiliate">Afiliado (X-User-Type: affiliate)</MenuItem>
              <MenuItem value="consultant">Consultor (X-User-Type: consultant)</MenuItem>
            </Select>
          </FormControl>
          <TextField fullWidth multiline rows={4} label="Token JWT *"
            placeholder="eyJhbGciOiJIUzI1NiJ9..."
            value={token} onChange={e => handleTokenChange(e.target.value)}
            slotProps={{ htmlInput: { style: { fontFamily: 'monospace', fontSize: '0.75rem' } } }}
            helperText="Cole o JWT — 'Bearer' removido automaticamente" />
          <TextField fullWidth label="X-User-Id" placeholder="Extraído automaticamente do JWT"
            value={userId} onChange={e => setUserId(e.target.value)}
            slotProps={{ htmlInput: { style: { fontFamily: 'monospace' } } }} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={!name.trim() || !token.trim()}>Salvar</Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function CredentialsPage() {
  const { pushNotification, activeCredential, setActiveCredentialById, clearSessionCredential, refreshCredentials } = useApp()
  const [credentials, setCredentials] = useState<PartnerCredential[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<PartnerCredential | null>(null)

  const reload = () => setCredentials(getPartnerCredentials())

  // Valida se as credenciais ainda estão no localStorage ao carregar a página
  useEffect(() => {
    reload()
    if (activeCredential?.id === SESSION_CREDENTIAL_ID) {
      // Sessão: verifica se a chave ainda existe no localStorage
      const stored = getSessionCredential()
      if (!stored) {
        clearSessionCredential()
        pushNotification('warning', 'Sessão expirada — faça login novamente')
      }
    } else if (activeCredential && activeCredential.id !== SESSION_CREDENTIAL_ID) {
      // Credencial salva: verifica se ainda está na lista
      const saved = getPartnerCredentials().find(c => c.id === activeCredential.id)
      if (!saved) {
        setActiveCredentialById(null)
        pushNotification('warning', 'Credencial removida do armazenamento')
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = (cred: PartnerCredential) => {
    addPartnerCredential(cred)
    reload(); refreshCredentials()
    setDialogOpen(false); setEditing(null)
    pushNotification('success', `Credencial "${cred.name}" salva!`)
  }

  const handleDelete = (id: string, name: string) => {
    removePartnerCredential(id)
    reload(); refreshCredentials()
    pushNotification('info', `Credencial "${name}" removida`)
  }

  const handleActivate = (id: string) => {
    const isActive = activeCredential?.id === id
    setActiveCredentialById(isActive ? null : id)
    reload()
    const cred = credentials.find(c => c.id === id)
    pushNotification('info', isActive ? 'Credencial desativada' : `"${cred?.name}" ativa`)
  }

  const tokenPreview = (t: string) => t ? `${t.substring(0, 20)}…${t.slice(-8)}` : '—'

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>Credenciais</Typography>
        <Typography variant="body2" color="text.secondary">
          Três formas de autenticar — use a que faz sentido para o seu caso.
        </Typography>
      </Box>

      {/* ── 3 colunas de login ── */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <PartnerJsonCard />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <AffiliateLoginCard />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <ConsultantJwtCard />
        </Grid>
      </Grid>

      {/* ── Credenciais Salvas ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Credenciais Salvas</Typography>
        <Button variant="outlined" size="small" startIcon={<AddIcon />}
          onClick={() => { setEditing(null); setDialogOpen(true) }}>
          Nova credencial
        </Button>
      </Box>

      {credentials.length === 0 ? (
        <Card variant="outlined">
          <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 5, gap: 2 }}>
            <KeyIcon sx={{ fontSize: 40, color: tokens.colors.neutral[60] }} />
            <Typography color="text.secondary" variant="body2">Nenhuma credencial salva.</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 380 }}>
              Credenciais salvas são úteis para tokens de longa duração. Para testes rápidos use os cards acima.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {credentials.map(cred => {
            const isActive = activeCredential?.id === cred.id
            return (
              <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={cred.id}>
                <Card sx={{
                  border: isActive ? `2px solid ${tokens.colors.primary[40]}` : `1px solid ${tokens.colors.neutral[80]}`,
                  position: 'relative',
                }}>
                  {isActive && (
                    <Chip label="ATIVO" size="small" color="primary"
                      sx={{ position: 'absolute', top: 12, right: 12, fontWeight: 700, fontSize: '0.65rem' }} />
                  )}
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, pr: 6 }}>{cred.name}</Typography>
                    <Chip size="small" label={`X-User-Type: ${cred.userType}`} variant="outlined"
                      color={cred.userType === 'affiliate' ? 'secondary' : 'default'} sx={{ mt: 0.5 }} />
                    {cred.companyId && (
                      <Typography variant="caption"
                        sx={{ fontFamily: 'monospace', color: tokens.colors.neutral[40], display: 'block', mt: 0.75 }}>
                        {cred.companyId}
                      </Typography>
                    )}
                    <Divider sx={{ my: 1.5 }} />
                    <Box sx={{ p: 1, borderRadius: 1, backgroundColor: tokens.colors.neutral[100], border: `1px solid ${tokens.colors.neutral[80]}` }}>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', color: tokens.colors.neutral[40] }}>
                        Bearer <span style={{ color: tokens.colors.neutral[10] }}>{tokenPreview(cred.token)}</span>
                      </Typography>
                      {cred.userId && (
                        <Typography variant="caption"
                          sx={{ fontFamily: 'monospace', color: tokens.colors.neutral[60], display: 'block', mt: 0.25 }}>
                          userId: {cred.userId.substring(0, 20)}…
                        </Typography>
                      )}
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Criado em {new Date(cred.createdAt).toLocaleDateString('pt-BR')}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                      <Button variant={isActive ? 'contained' : 'outlined'} size="small"
                        startIcon={isActive ? <CheckCircleIcon /> : undefined}
                        onClick={() => handleActivate(cred.id)} sx={{ flex: 1 }}>
                        {isActive ? 'Ativo' : 'Ativar'}
                      </Button>
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => { setEditing(cred); setDialogOpen(true) }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Remover">
                        <IconButton size="small" color="error" onClick={() => handleDelete(cred.id, cred.name)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            )
          })}
        </Grid>
      )}

      <CredentialDialog open={dialogOpen} initial={editing}
        onClose={() => { setDialogOpen(false); setEditing(null) }}
        onSave={handleSave} />
    </Box>
  )
}
