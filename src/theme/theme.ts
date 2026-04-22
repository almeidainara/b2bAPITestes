import { createTheme } from '@mui/material/styles'
import tokens from './tokens'

const { colors } = tokens

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: colors.primary[40],
      dark: colors.primary[60],
      light: colors.primary[20],
      contrastText: colors.neutral[100],
    },
    secondary: {
      main: colors.secondary[40],
      dark: colors.secondary[60],
      light: colors.secondary[20],
    },
    error: {
      main: colors.error[60],
      light: colors.error[40],
      dark: colors.error[80],
    },
    warning: {
      main: colors.warning[60],
      light: colors.warning[40],
      dark: colors.warning[80],
    },
    background: {
      default: colors.neutral[100],
      paper: colors.neutral[90],
    },
    text: {
      primary: colors.neutral[10],
      secondary: colors.neutral[40],
      disabled: colors.neutral[60],
    },
    divider: colors.neutral[80],
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 500 },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderColor: colors.neutral[80],
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: `1px solid ${colors.neutral[80]}`,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600, borderRadius: 8 },
        contained: {
          '&.MuiButton-colorPrimary': {
            color: colors.neutral[100],
            '&:hover': { backgroundColor: colors.primary[60] },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500 },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: colors.neutral[80],
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: colors.neutral[40],
          },
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: colors.neutral[80],
            color: colors.neutral[10],
            fontWeight: 600,
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: `${colors.neutral[80]}80`,
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 500 },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: colors.neutral[90],
          borderRight: `1px solid ${colors.neutral[80]}`,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: colors.neutral[90],
          backgroundImage: 'none',
          borderBottom: `1px solid ${colors.neutral[80]}`,
        },
      },
    },
  },
})

export default theme
