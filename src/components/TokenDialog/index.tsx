import KeyIcon from '@mui/icons-material/Key'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { updateInternalToken, updatePartnerToken, getActiveCredentialId } from '../../services/tokenManager'
import tokens from '../../theme/tokens'

export function TokenDialog() {
  const { tokenDialog, closeTokenDialog, refreshCredentials, refreshInternalSettings } = useApp()
  const [value, setValue] = useState('')

  const handleSave = () => {
    if (!value.trim()) return
    const clean = value.trim().replace(/^Bearer\s+/i, '')

    if (tokenDialog.apiType === 'internal') {
      updateInternalToken(clean)
      refreshInternalSettings()
    } else if (tokenDialog.apiType === 'partner') {
      const id = getActiveCredentialId()
      if (id) {
        updatePartnerToken(id, clean)
        refreshCredentials()
      }
    }

    setValue('')
    closeTokenDialog()
  }

  const label =
    tokenDialog.apiType === 'internal'
      ? 'Token das APIs internas (partner/companies)'
      : 'Token Bearer do parceiro (B2B API)'

  const description =
    tokenDialog.apiType === 'internal'
      ? 'O token anterior expirou ou é inválido. Cole um novo JWT para as APIs internas da Creditas.'
      : 'O token do parceiro ativo expirou ou é inválido. Cole um novo JWT Bearer para continuar os testes.'

  return (
    <Dialog
      open={tokenDialog.open}
      onClose={closeTokenDialog}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            backgroundColor: tokens.colors.neutral[90],
            border: `1px solid ${tokens.colors.warning[60]}55`,
          },
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <KeyIcon sx={{ color: tokens.colors.warning[60] }} />
        Token expirado ou inválido (401)
      </DialogTitle>

      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          {description}
        </Alert>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {label}
        </Typography>

        <TextField
          fullWidth
          multiline
          rows={4}
          label="Cole o JWT aqui"
          placeholder="eyJhbGciOiJIUzI1NiJ9..."
          value={value}
          onChange={e => setValue(e.target.value)}
          autoFocus
          slotProps={{ htmlInput: { style: { fontFamily: 'monospace', fontSize: '0.75rem' } } }}
        />

        <Box
          sx={{
            mt: 1.5,
            p: 1,
            borderRadius: 1,
            backgroundColor: tokens.colors.neutral[100],
            border: `1px solid ${tokens.colors.neutral[80]}`,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            💡 Pode colar com ou sem o prefixo <code>Bearer</code> — a aplicação ajusta automaticamente.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={closeTokenDialog} color="inherit">
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!value.trim()}
        >
          Salvar e retentar
        </Button>
      </DialogActions>
    </Dialog>
  )
}
