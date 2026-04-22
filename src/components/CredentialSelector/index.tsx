import BusinessIcon from '@mui/icons-material/Business'
import KeyIcon from '@mui/icons-material/Key'
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Tooltip,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { getPartnerCredentials, getSessionCredential } from '../../services/tokenManager'
import type { PartnerCredential } from '../../types/partner'
import tokens from '../../theme/tokens'

interface Props {
  size?: 'small' | 'medium'
}

export function CredentialSelector({ size = 'small' }: Props) {
  const { activeCredential, setActiveCredentialById } = useApp()
  const [credentials, setCredentials] = useState<PartnerCredential[]>([])

  useEffect(() => {
    const saved = getPartnerCredentials()
    const session = getSessionCredential()
    // Sessão ativa entra no topo da lista para ficar visível no header
    setCredentials(session ? [session, ...saved] : saved)
  }, [activeCredential])

  if (credentials.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.5,
          py: 0.75,
          borderRadius: 1,
          backgroundColor: `${tokens.colors.warning[60]}22`,
          border: `1px solid ${tokens.colors.warning[60]}55`,
        }}
      >
        <KeyIcon sx={{ fontSize: 16, color: tokens.colors.warning[60] }} />
        <Typography variant="caption" sx={{ color: tokens.colors.warning[60] }}>
          Nenhuma credencial configurada
        </Typography>
      </Box>
    )
  }

  return (
    <FormControl size={size} sx={{ minWidth: 200 }}>
      <InputLabel>Credencial</InputLabel>
      <Select
        value={activeCredential?.id ?? ''}
        label="Credencial"
        onChange={e => setActiveCredentialById(e.target.value || null)}
        renderValue={id => {
          const cred = credentials.find(c => c.id === id)
          if (!cred) return 'Selecionar…'
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <BusinessIcon sx={{ fontSize: 14 }} />
              <span>{cred.name}</span>
            </Box>
          )
        }}
      >
        <MenuItem value="">
          <em>Nenhuma</em>
        </MenuItem>
        {credentials.map(cred => (
          <MenuItem key={cred.id} value={cred.id}>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="body2">{cred.name}</Typography>
              <Tooltip title={cred.companyId}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }}
                  noWrap
                >
                  {cred.companyId || '—'} · {cred.token ? '🔑 token configurado' : '⚠️ sem token'}
                </Typography>
              </Tooltip>
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}
