import ArticleIcon from '@mui/icons-material/Article'
import BusinessIcon from '@mui/icons-material/Business'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted'
import KeyIcon from '@mui/icons-material/Key'
import LayersIcon from '@mui/icons-material/Layers'
import LocalOfferIcon from '@mui/icons-material/LocalOffer'
import MenuIcon from '@mui/icons-material/Menu'
import PeopleIcon from '@mui/icons-material/People'
import SettingsIcon from '@mui/icons-material/Settings'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import {
  Alert,
  AppBar,
  Box,
  Chip,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { CredentialSelector } from '../CredentialSelector'
import tokens from '../../theme/tokens'

const DRAWER_WIDTH = 240

const NAV_ITEMS = [
  { to: '/settings', label: 'Configurações', icon: <SettingsIcon fontSize="small" /> },
  { to: '/partners', label: 'Parceiros', icon: <PeopleIcon fontSize="small" /> },
  { to: '/credentials', label: 'Credenciais', icon: <KeyIcon fontSize="small" /> },
  { divider: true },
  { to: '/eligibility', label: 'Elegibilidade', icon: <CheckCircleIcon fontSize="small" /> },
  { to: '/offers', label: 'Ofertas / Simulações', icon: <LocalOfferIcon fontSize="small" /> },
  { to: '/proposals', label: 'Criar Proposta', icon: <ArticleIcon fontSize="small" /> },
  { to: '/proposals-list', label: 'Ver Propostas', icon: <FormatListBulletedIcon fontSize="small" /> },
  { to: '/batch-proposals', label: 'Criação em Lote', icon: <LayersIcon fontSize="small" /> },
]

const PAGE_LABELS: Record<string, string> = {
  '/settings': 'Configurações',
  '/partners': 'Parceiros',
  '/credentials': 'Credenciais',
  '/eligibility': 'Elegibilidade',
  '/offers': 'Ofertas / Simulações',
  '/proposals': 'Criar Proposta',
  '/proposals-list': 'Ver Propostas',
  '/batch-proposals': 'Criação em Lote',
}

export function Layout() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const { hasInternalSettings, activeCredential, activePartner } = useApp()
  const location = useLocation()

  const pageTitle = PAGE_LABELS[location.pathname] ?? 'Creditas API Tester'

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo / Title */}
      <Box
        sx={{
          px: 2,
          py: 2.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          borderBottom: `1px solid ${tokens.colors.neutral[80]}`,
        }}
      >
        <BusinessIcon sx={{ color: tokens.colors.primary[40], fontSize: 28 }} />
        <Box>
          <Typography variant="subtitle1" sx={{ lineHeight: 1.2, fontWeight: 700 }}>
            Creditas
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>
            API Tester · Staging
          </Typography>
        </Box>
      </Box>

      {/* Nav */}
      <List sx={{ flex: 1, pt: 1 }}>
        {NAV_ITEMS.map((item, idx) => {
          if ('divider' in item) {
            return <Divider key={idx} sx={{ my: 1 }} />
          }
          return (
            <ListItemButton
              key={item.to}
              component={NavLink}
              to={item.to}
              onClick={() => isMobile && setMobileOpen(false)}
              sx={{
                mx: 1,
                borderRadius: 1,
                mb: 0.25,
                '&.active': {
                  backgroundColor: `${tokens.colors.primary[40]}22`,
                  color: tokens.colors.primary[40],
                  '& .MuiListItemIcon-root': { color: tokens.colors.primary[40] },
                },
                '&:hover': {
                  backgroundColor: `${tokens.colors.neutral[80]}80`,
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
              <ListItemText
                primary={item.label}
                slotProps={{ primary: { variant: 'body2', sx: { fontWeight: 500 } } }}
              />
            </ListItemButton>
          )
        })}
      </List>

      {/* Status footer */}
      <Box sx={{ p: 1.5, borderTop: `1px solid ${tokens.colors.neutral[80]}` }}>
        <Tooltip title={hasInternalSettings ? 'Token de consultor configurado (APIs /partner/*)' : 'Necessário apenas para buscar parceiros — configure em Configurações'}>
          <Chip
            size="small"
            icon={hasInternalSettings ? <CheckCircleIcon /> : <WarningAmberIcon />}
            label={hasInternalSettings ? 'Consultor OK' : 'Consultor (opcional)'}
            color={hasInternalSettings ? 'success' : 'default'}
            variant="outlined"
            sx={{ width: '100%', justifyContent: 'flex-start', opacity: hasInternalSettings ? 1 : 0.5 }}
          />
        </Tooltip>
        <Tooltip title={activeCredential ? `Parceiro: ${activeCredential.name}` : 'Selecione uma credencial de parceiro'}>
          <Chip
            size="small"
            icon={activeCredential ? <KeyIcon /> : <WarningAmberIcon />}
            label={activeCredential ? activeCredential.name : 'Sem credencial ativa'}
            color={activeCredential ? 'primary' : 'warning'}
            variant="outlined"
            sx={{ width: '100%', justifyContent: 'flex-start', mt: 0.75 }}
          />
        </Tooltip>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Drawer */}
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
        >
          {drawerContent}
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* Main */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <AppBar position="static" elevation={0}>
          <Toolbar sx={{ gap: 2 }}>
            {isMobile && (
              <IconButton
                edge="start"
                onClick={() => setMobileOpen(true)}
                sx={{ color: 'inherit' }}
              >
                <MenuIcon />
              </IconButton>
            )}
            <Typography variant="h6" sx={{ flex: 1 }}>
              {pageTitle}
            </Typography>

            {activePartner && (
              <Chip
                size="small"
                icon={<BusinessIcon />}
                label={activePartner.name ?? activePartner.id}
                sx={{
                  backgroundColor: `${tokens.colors.secondary[40]}22`,
                  color: tokens.colors.secondary[20],
                  border: `1px solid ${tokens.colors.secondary[40]}55`,
                }}
              />
            )}

            <CredentialSelector size="small" />
          </Toolbar>
        </AppBar>

        {/* Banners */}

        {/* Aviso de JWT interno: só relevante na página de Parceiros */}
        <Collapse in={!hasInternalSettings && location.pathname === '/partners'}>
          <Alert
            severity="warning"
            action={
              <NavLink to="/settings" style={{ color: 'inherit', fontWeight: 600 }}>
                Configurar →
              </NavLink>
            }
          >
            Configure o token de consultor em <strong>Configurações</strong> para buscar parceiros.
          </Alert>
        </Collapse>

        {/* Aviso de credencial: em todas as páginas B2B exceto configurações e parceiros */}
        <Collapse in={!activeCredential && !['/settings', '/partners', '/credentials'].includes(location.pathname)}>
          <Alert
            severity="info"
            action={
              <NavLink to="/credentials" style={{ color: 'inherit', fontWeight: 600 }}>
                Entrar →
              </NavLink>
            }
          >
            Faça login como afiliado ou selecione uma <strong>credencial de parceiro</strong> para usar os endpoints B2B.
          </Alert>
        </Collapse>

        {/* Page content */}
        <Box
          component="main"
          sx={{
            flex: 1,
            p: { xs: 2, md: 3 },
            backgroundColor: 'background.default',
            overflowY: 'auto',
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}
