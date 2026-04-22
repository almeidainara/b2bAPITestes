import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  Grid,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import type { ApiTrace } from '../../types/api'
import tokens from '../../theme/tokens'

interface Props {
  trace: ApiTrace
  title?: string
  defaultExpanded?: boolean
}

const METHOD_COLORS: Record<string, string> = {
  GET: tokens.colors.secondary[40],
  POST: tokens.colors.primary[40],
  PUT: tokens.colors.warning[60],
  DELETE: tokens.colors.error[60],
  PATCH: tokens.colors.warning[60],
}

function StatusBadge({ code }: { code?: number }) {
  if (!code) return null
  const color =
    code >= 500
      ? tokens.colors.error[60]
      : code >= 400
        ? tokens.colors.warning[60]
        : code >= 300
          ? tokens.colors.secondary[40]
          : tokens.colors.primary[40]
  return (
    <Chip
      label={code}
      size="small"
      sx={{
        backgroundColor: `${color}22`,
        color,
        border: `1px solid ${color}55`,
        fontWeight: 700,
        fontFamily: 'monospace',
      }}
    />
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <Tooltip title={copied ? 'Copiado!' : 'Copiar'}>
      <IconButton size="small" onClick={handleCopy} sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}>
        <ContentCopyIcon fontSize="inherit" />
      </IconButton>
    </Tooltip>
  )
}

function CodeBlock({ value, label }: { value: unknown; label: string }) {
  if (value === undefined || value === null) return null
  const text =
    typeof value === 'string' ? value : JSON.stringify(value, null, 2)

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ textTransform: 'uppercase', letterSpacing: 1 }}
        >
          {label}
        </Typography>
        <CopyButton text={text} />
      </Box>
      <Box
        component="pre"
        sx={{
          m: 0,
          p: 1.5,
          borderRadius: 1,
          backgroundColor: tokens.colors.neutral[100],
          border: `1px solid ${tokens.colors.neutral[80]}`,
          fontSize: '0.75rem',
          fontFamily: 'monospace',
          overflowX: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          color: tokens.colors.neutral[10],
          maxHeight: 400,
          overflowY: 'auto',
        }}
      >
        {text}
      </Box>
    </Box>
  )
}

function HeadersBlock({ headers }: { headers: Record<string, string> }) {
  const text = Object.entries(headers)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')
  return <CodeBlock value={text} label="Headers" />
}

export function ApiPanel({ trace, title, defaultExpanded }: Props) {
  const isError = trace.statusCode !== undefined && trace.statusCode >= 400
  const shouldExpand = defaultExpanded ?? (isError || !trace.statusCode)
  const methodColor = METHOD_COLORS[trace.method] ?? tokens.colors.neutral[40]

  return (
    <Accordion
      defaultExpanded={shouldExpand}
      sx={{
        backgroundColor: tokens.colors.neutral[90],
        border: `1px solid ${isError ? tokens.colors.error[60] + '55' : tokens.colors.neutral[80]}`,
        borderRadius: '8px !important',
        '&:before': { display: 'none' },
        mt: 2,
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            flexWrap: 'wrap',
            width: '100%',
            mr: 1,
          }}
        >
          {title && (
            <Typography variant="caption" sx={{ color: tokens.colors.neutral[40] }}>
              {title}
            </Typography>
          )}
          <Chip
            label={trace.method}
            size="small"
            sx={{
              backgroundColor: `${methodColor}22`,
              color: methodColor,
              border: `1px solid ${methodColor}55`,
              fontWeight: 700,
              fontFamily: 'monospace',
            }}
          />
          <Typography
            variant="body2"
            sx={{
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              color: tokens.colors.neutral[15],
              flex: 1,
              wordBreak: 'break-all',
            }}
          >
            {trace.url}
          </Typography>
          <StatusBadge code={trace.statusCode} />
          {trace.durationMs !== undefined && (
            <Typography variant="caption" color="text.secondary">
              {trace.durationMs}ms
            </Typography>
          )}
        </Box>
      </AccordionSummary>

      <AccordionDetails>
        <Grid container spacing={2}>
          {/* Request */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography
              variant="subtitle2"
              sx={{ mb: 1, color: tokens.colors.primary[40] }}
            >
              ↑ Request
            </Typography>
            <Stack spacing={1.5}>
              <HeadersBlock headers={trace.headers} />
              {trace.requestBody !== undefined && (
                <CodeBlock value={trace.requestBody} label="Body" />
              )}
            </Stack>
          </Grid>

          {/* Response */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  color: isError
                    ? tokens.colors.error[60]
                    : tokens.colors.primary[40],
                }}
              >
                ↓ Response
              </Typography>
              <StatusBadge code={trace.statusCode} />
            </Box>
            {trace.response !== undefined ? (
              <CodeBlock value={trace.response} label="Body" />
            ) : trace.error ? (
              <CodeBlock value={trace.error} label="Erro" />
            ) : (
              <Typography variant="body2" color="text.secondary">
                Sem resposta
              </Typography>
            )}
          </Grid>
        </Grid>

        {trace.timestamp && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 1.5, display: 'block' }}
          >
            {new Date(trace.timestamp).toLocaleString('pt-BR')}
          </Typography>
        )}
      </AccordionDetails>
    </Accordion>
  )
}
