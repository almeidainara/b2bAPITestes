import SearchIcon from '@mui/icons-material/Search'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { ApiPanel } from '../../components/ApiPanel'
import { useApp } from '../../context/AppContext'
import {
  getPartnerByCompanyId,
  getPartnerBySource,
  listPartnerCompanies,
} from '../../services/internalApi'
import type { ApiTrace } from '../../types/api'
import type { PartnerCompany } from '../../types/partner'
import tokens from '../../theme/tokens'

// ── List tab ──────────────────────────────────────────────────────────────────

function ListTab() {
  const { pushNotification, activePartner, setActivePartner } = useApp()
  const [rows, setRows] = useState<PartnerCompany[]>([])
  const [trace, setTrace] = useState<ApiTrace | null>(null)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<PartnerCompany | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await listPartnerCompanies(200, 0)
      const list = Array.isArray(res.data) ? res.data : (res.data as { data?: PartnerCompany[] })?.data ?? [res.data]
      setRows(list)
      setTrace(res.trace)
      pushNotification('success', `${list.length} parceiros carregados`)
    } catch (err: unknown) {
      const e = err as { trace?: ApiTrace }
      if (e.trace) setTrace(e.trace)
      pushNotification('error', 'Erro ao listar parceiros')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Stack spacing={2}>
      <Button
        variant="contained"
        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
        onClick={load}
        disabled={loading}
        sx={{ alignSelf: 'flex-start' }}
      >
        Listar parceiros
      </Button>

      {rows.length > 0 && (
        <TableContainer component={Card}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Source</TableCell>
                <TableCell>ID</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Ativo</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map(row => (
                <TableRow
                  key={row.id}
                  onClick={() => setSelected(selected?.id === row.id ? null : row)}
                  sx={{ cursor: 'pointer' }}
                  selected={selected?.id === row.id}
                >
                  <TableCell>{String(row.name ?? '—')}</TableCell>
                  <TableCell>
                    <code style={{ fontSize: '0.75rem' }}>{String(row.source ?? '—')}</code>
                  </TableCell>
                  <TableCell>
                    <code style={{ fontSize: '0.7rem' }}>{row.id}</code>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={String(row.status ?? '—')}
                      size="small"
                      color={String(row.status) === 'ACTIVE' ? 'success' : 'default'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title={activePartner?.id === row.id ? 'Parceiro ativo' : 'Definir como ativo'}>
                      <IconButton
                        size="small"
                        onClick={e => {
                          e.stopPropagation()
                          setActivePartner(activePartner?.id === row.id ? null : row)
                          pushNotification('info', activePartner?.id === row.id ? 'Parceiro desativado' : `Parceiro "${row.name}" ativo`)
                        }}
                      >
                        {activePartner?.id === row.id ? (
                          <StarIcon sx={{ color: tokens.colors.primary[40] }} fontSize="small" />
                        ) : (
                          <StarBorderIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {selected && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle2">Detalhes: {String(selected.name)}</Typography>
              <Button
                size="small"
                variant={activePartner?.id === selected.id ? 'contained' : 'outlined'}
                startIcon={<StarIcon />}
                onClick={() => {
                  setActivePartner(activePartner?.id === selected.id ? null : selected)
                  pushNotification('info', `Parceiro "${selected.name}" ${activePartner?.id === selected.id ? 'desativado' : 'ativo'}`)
                }}
              >
                {activePartner?.id === selected.id ? 'Ativo' : 'Definir como ativo'}
              </Button>
            </Box>
            <Box
              component="pre"
              sx={{
                m: 0, p: 1.5, borderRadius: 1,
                backgroundColor: tokens.colors.neutral[100],
                fontSize: '0.75rem', fontFamily: 'monospace',
                overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
              }}
            >
              {JSON.stringify(selected, null, 2)}
            </Box>
          </CardContent>
        </Card>
      )}

      {trace && <ApiPanel trace={trace} title="GET /partner/companies" />}
    </Stack>
  )
}

// ── By companyId tab ──────────────────────────────────────────────────────────

function ByIdTab() {
  const { pushNotification, setActivePartner } = useApp()
  const [companyId, setCompanyId] = useState('')
  const [result, setResult] = useState<PartnerCompany | null>(null)
  const [trace, setTrace] = useState<ApiTrace | null>(null)
  const [loading, setLoading] = useState(false)

  const search = async () => {
    if (!companyId.trim()) return
    setLoading(true)
    try {
      const res = await getPartnerByCompanyId(companyId.trim())
      setResult(res.data)
      setTrace(res.trace)
      pushNotification('success', 'Parceiro encontrado!')
    } catch (err: unknown) {
      const e = err as { trace?: ApiTrace }
      setResult(null)
      if (e.trace) setTrace(e.trace)
      pushNotification('error', 'Parceiro não encontrado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1}>
        <TextField
          size="small"
          label="Company ID"
          placeholder="CPN-XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
          value={companyId}
          onChange={e => setCompanyId(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          sx={{ flex: 1 }}
          slotProps={{ htmlInput: { style: { fontFamily: 'monospace' } } }}
        />
        <Button
          variant="contained"
          onClick={search}
          disabled={loading || !companyId.trim()}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
        >
          Buscar
        </Button>
      </Stack>

      {result && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle2">{String(result.name)}</Typography>
              <Button
                size="small"
                variant="outlined"
                startIcon={<StarIcon />}
                onClick={() => {
                  setActivePartner(result)
                  pushNotification('info', `Parceiro "${result.name}" ativo`)
                }}
              >
                Definir como ativo
              </Button>
            </Box>
            <Box
              component="pre"
              sx={{
                m: 0, p: 1.5, borderRadius: 1,
                backgroundColor: tokens.colors.neutral[100],
                fontSize: '0.75rem', fontFamily: 'monospace',
                overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
              }}
            >
              {JSON.stringify(result, null, 2)}
            </Box>
          </CardContent>
        </Card>
      )}

      {trace && <ApiPanel trace={trace} title="GET /partner/companies/{companyId}" />}
    </Stack>
  )
}

// ── By source tab ─────────────────────────────────────────────────────────────

function BySourceTab() {
  const { pushNotification, setActivePartner } = useApp()
  const [source, setSource] = useState('')
  const [result, setResult] = useState<PartnerCompany | null>(null)
  const [trace, setTrace] = useState<ApiTrace | null>(null)
  const [loading, setLoading] = useState(false)

  const search = async () => {
    if (!source.trim()) return
    setLoading(true)
    try {
      const res = await getPartnerBySource(source.trim())
      setResult(res.data)
      setTrace(res.trace)
      pushNotification('success', 'Parceiro encontrado!')
    } catch (err: unknown) {
      const e = err as { trace?: ApiTrace }
      setResult(null)
      if (e.trace) setTrace(e.trace)
      pushNotification('error', 'Parceiro não encontrado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1}>
        <TextField
          size="small"
          label="Source"
          placeholder="ex: finanzero"
          value={source}
          onChange={e => setSource(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          sx={{ flex: 1 }}
          slotProps={{ htmlInput: { style: { fontFamily: 'monospace' } } }}
        />
        <Button
          variant="contained"
          onClick={search}
          disabled={loading || !source.trim()}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
        >
          Buscar
        </Button>
      </Stack>

      {result && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle2">{String(result.name)}</Typography>
              <Button
                size="small"
                variant="outlined"
                startIcon={<StarIcon />}
                onClick={() => {
                  setActivePartner(result)
                  pushNotification('info', `Parceiro "${result.name}" ativo`)
                }}
              >
                Definir como ativo
              </Button>
            </Box>
            <Box
              component="pre"
              sx={{
                m: 0, p: 1.5, borderRadius: 1,
                backgroundColor: tokens.colors.neutral[100],
                fontSize: '0.75rem', fontFamily: 'monospace',
                overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
              }}
            >
              {JSON.stringify(result, null, 2)}
            </Box>
          </CardContent>
        </Card>
      )}

      {trace && <ApiPanel trace={trace} title="GET /partner/companies/by-source/{source}" />}
    </Stack>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function PartnersPage() {
  const [tab, setTab] = useState(0)

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Parceiros
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Consulte parceiros via APIs internas da Creditas. O parceiro marcado como
        &ldquo;ativo&rdquo; aparece no header da aplicação.
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Listar todos" />
        <Tab label="Por Company ID" />
        <Tab label="Por Source" />
      </Tabs>

      {tab === 0 && <ListTab />}
      {tab === 1 && <ByIdTab />}
      {tab === 2 && <BySourceTab />}
    </Box>
  )
}
