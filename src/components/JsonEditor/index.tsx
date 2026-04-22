import { Box, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import tokens from '../../theme/tokens'

interface Props {
  value: unknown
  onChange: (val: unknown) => void
  label?: string
  minRows?: number
  error?: string
}

export function JsonEditor({ value, onChange, label, minRows = 8, error: externalError }: Props) {
  const [raw, setRaw] = useState(() => JSON.stringify(value, null, 2))
  const [parseError, setParseError] = useState<string | null>(null)

  // Sync outward value → textarea when parent changes programmatically
  useEffect(() => {
    try {
      const current = JSON.parse(raw)
      if (JSON.stringify(current) !== JSON.stringify(value)) {
        setRaw(JSON.stringify(value, null, 2))
      }
    } catch {
      // Keep raw text if it can't be parsed (user is typing)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const handleChange = (text: string) => {
    setRaw(text)
    try {
      const parsed = JSON.parse(text)
      setParseError(null)
      onChange(parsed)
    } catch {
      setParseError('JSON inválido')
    }
  }

  const displayError = parseError ?? externalError

  return (
    <Box>
      {label && (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1 }}>
          {label}
        </Typography>
      )}
      <Box
        component="textarea"
        value={raw}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange(e.target.value)}
        spellCheck={false}
        sx={{
          width: '100%',
          minHeight: minRows * 20,
          p: 1.5,
          borderRadius: 1,
          backgroundColor: tokens.colors.neutral[100],
          border: `1px solid ${displayError ? tokens.colors.error[60] : tokens.colors.neutral[80]}`,
          color: tokens.colors.neutral[10],
          fontFamily: 'monospace',
          fontSize: '0.75rem',
          resize: 'vertical',
          outline: 'none',
          boxSizing: 'border-box',
          '&:focus': {
            borderColor: displayError ? tokens.colors.error[60] : tokens.colors.primary[40],
          },
        }}
      />
      {displayError && (
        <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
          {displayError}
        </Typography>
      )}
    </Box>
  )
}
