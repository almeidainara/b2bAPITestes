import FilterListIcon from '@mui/icons-material/FilterList'
import RefreshIcon from '@mui/icons-material/Refresh'
import SearchIcon from '@mui/icons-material/Search'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Pagination,
  Paper,
  Select,
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
import { listProposals } from '../../services/b2bApi'
import type { ApiTrace, ProposalListItem } from '../../types/api'
import tokens from '../../theme/tokens'

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'PENDING', label: 'PENDING' },
  { value: 'UNDER_ANALYSIS', label: 'UNDER_ANALYSIS' },
  { value: 'APPROVED', label: 'APPROVED' },
  { value: 'REJECTED', label: 'REJECTED' },
  { value: 'CANCELLED', label: 'CANCELLED' },
  { value: 'CONTRACTED', label: 'CONTRACTED' },
]

const PRODUCT_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'AUTO_REFINANCING', label: 'AUTO_REFINANCING' },
  { value: 'HOME_REFINANCING', label: 'HOME_REFINANCING' },
]

const PAGE_SIZE = 20

function statusColor(status: string): 'default' | 'info' | 'success' | 'error' | 'warning' {
  switch (status?.toUpperCase()) {
    case 'APPROVED':
    case 'CONTRACTED': return 'success'
    case 'REJECTED':
    case 'CANCELLED':  return 'error'
    case 'UNDER_ANALYSIS': return 'info'
    case 'PENDING':    return 'warning'
    default:           return 'default'
  }
}

export function ProposalsListPage() {
  const { activeCredential } = useApp()

  const [filterStatus, setFilterStatus] = useState('')
  const [filterProduct, setFilterProduct] = useState('')
  const [page, setPage] = useState(1)

  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<ProposalListItem[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [trace, setTrace] = useState<ApiTrace | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)

  const fetchPage = async (p: number) => {
    if (!activeCredential) return
    setLoading(true)
    setError(null)
    try {
      const res = await listProposals({
        companyId: activeCredential.companyId || undefined,
        status: filterStatus || undefined,
        productType: filterProduct || undefined,
        page: p - 1,   // API é 0-based
        size: PAGE_SIZE,
      })
      setTrace(res.trace)
      setRows(res.data.content ?? [])
      setTotalPages(res.data.totalPages ?? 1)
      setTotalElements(res.data.totalElements ?? 0)
      setSearched(true)
    } catch (err: unknown) {
      const e = err as { trace?: ApiTrace; error?: unknown }
      if (e.trace) setTrace(e.trace)
      setError(typeof e.error === 'string' ? e.error : JSON.stringify(e.error))
      setRows([])
      setSearched(true)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setPage(1)
    fetchPage(1)
  }

  const handlePageChange = (_: React.ChangeEvent<unknown>, value: number) => {
    setPage(value)
    fetchPage(value)
  }

  return (
    <Box>
      {/* Cabeçalho */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>Propostas do Parceiro</Typography>
        <Typography variant="body2" color="text.secondary">
          Lista propostas via <code>GET /proposals</code> com a credencial ativa.
          {activeCredential?.companyId && (
            <> Filtrando por <code>companyId={activeCredential.companyId}</code>.</>
          )}
        </Typography>
      </Box>

      {!activeCredential && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Selecione uma credencial de parceiro para listar as propostas.
        </Alert>
      )}

      {/* Filtros */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: 'flex-end' }}>
          <FilterListIcon sx={{ color: 'text.secondary', mb: 0.5, display: { xs: 'none', sm: 'block' } }} />

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filterStatus}
              label="Status"
              onChange={e => setFilterStatus(e.target.value)}
            >
              {STATUS_OPTIONS.map(o => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Produto</InputLabel>
            <Select
              value={filterProduct}
              label="Produto"
              onChange={e => setFilterProduct(e.target.value)}
            >
              {PRODUCT_OPTIONS.map(o => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
            onClick={handleSearch}
            disabled={loading || !activeCredential}
          >
            Buscar
          </Button>

          {searched && (
            <Tooltip title="Recarregar com os mesmos filtros">
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => fetchPage(page)}
                disabled={loading}
              >
                Atualizar
              </Button>
            </Tooltip>
          )}
        </Stack>
      </Paper>

      {/* Resultado */}
      {searched && (
        <>
          {error ? (
            <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
          ) : (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {totalElements} proposta{totalElements !== 1 ? 's' : ''} encontrada{totalElements !== 1 ? 's' : ''}
                </Typography>
                {loading && <CircularProgress size={16} />}
              </Box>

              <Paper variant="outlined" sx={{ mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>ID</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Produto</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>CPF / Nome</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Criada em</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.length === 0 && !loading && (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                          Nenhuma proposta encontrada com os filtros selecionados.
                        </TableCell>
                      </TableRow>
                    )}
                    {rows.map(row => (
                      <TableRow key={row.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                        <TableCell>
                          <Tooltip title={row.id}>
                            <Typography
                              variant="caption"
                              sx={{
                                fontFamily: 'monospace',
                                color: tokens.colors.primary[40],
                                cursor: 'default',
                                display: 'block',
                                maxWidth: 220,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {row.id}
                            </Typography>
                          </Tooltip>
                          {row.legacyId && (
                            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                              {row.legacyId}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={row.productType ?? '—'}
                            variant="outlined"
                            sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={row.status ?? '—'}
                            color={statusColor(row.status ?? '')}
                            sx={{ fontSize: '0.65rem' }}
                          />
                        </TableCell>
                        <TableCell>
                          {row.borrower ? (
                            <Box>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                {row.borrower.cpf ?? '—'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {row.borrower.fullName ?? ''}
                              </Typography>
                            </Box>
                          ) : (
                            <Typography variant="caption" color="text.secondary">—</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {row.createdAt ? new Date(row.createdAt).toLocaleString('pt-BR') : '—'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>

              {totalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                  <Pagination
                    count={totalPages}
                    page={page}
                    onChange={handlePageChange}
                    color="primary"
                    disabled={loading}
                  />
                </Box>
              )}
            </>
          )}

          {/* ApiPanel */}
          {trace && (
            <ApiPanel
              trace={trace}
              title="GET /proposals"
              defaultExpanded={!!error}
            />
          )}
        </>
      )}
    </Box>
  )
}
