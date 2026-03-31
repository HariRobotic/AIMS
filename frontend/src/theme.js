import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1565C0', light: '#1E88E5', dark: '#0D47A1', contrastText: '#ffffff' },
    secondary: { main: '#0288D1', light: '#29B6F6', dark: '#01579B', contrastText: '#ffffff' },
    error: { main: '#D32F2F' },
    warning: { main: '#F57C00' },
    success: { main: '#2E7D32' },
    info: { main: '#0277BD' },
    background: { default: '#F0F4FF', paper: '#FFFFFF' },
    text: { primary: '#0D1B3E', secondary: '#3A5080' },
    divider: '#C5D3F0',
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", sans-serif',
    h4: { fontWeight: 700, color: '#0D1B3E' },
    h5: { fontWeight: 700, color: '#0D1B3E' },
    h6: { fontWeight: 600, color: '#0D1B3E' },
    body2: { color: '#3A5080' },
    caption: { color: '#3A5080' },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { background: 'linear-gradient(135deg,#EEF2FF 0%,#E8F0FE 50%,#EDF5FF 100%)', minHeight: '100vh' },
        '::-webkit-scrollbar': { width: '6px' },
        '::-webkit-scrollbar-track': { background: '#E8EFFD' },
        '::-webkit-scrollbar-thumb': { background: '#90B4E8', borderRadius: '3px' },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none', border: '1px solid #D6E4F7', boxShadow: '0 2px 8px rgba(21,101,192,0.08)' },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600, borderRadius: 8, boxShadow: 'none', '&:hover': { boxShadow: '0 4px 12px rgba(21,101,192,0.25)' } },
        containedPrimary: { background: 'linear-gradient(135deg,#1E88E5 0%,#1565C0 100%)', '&:hover': { background: 'linear-gradient(135deg,#2196F3 0%,#1976D2 100%)' } },
      },
    },
    MuiChip: { styleOverrides: { root: { fontWeight: 600, fontSize: '0.75rem' } } },
    MuiTableHead: {
      styleOverrides: {
        root: { backgroundColor: '#EEF4FF', '& .MuiTableCell-root': { color: '#1565C0', fontWeight: 700, borderBottom: '2px solid #C5D3F0', fontSize: '0.82rem', letterSpacing: '0.03em', textTransform: 'uppercase' } },
      },
    },
    MuiTableRow: { styleOverrides: { root: { '&:hover': { backgroundColor: '#F0F6FF' }, '&:last-child td': { border: 0 } } } },
    MuiTableCell: { styleOverrides: { root: { borderBottom: '1px solid #E8EFFD', color: '#0D1B3E' } } },
    MuiDrawer: {
      styleOverrides: {
        paper: { background: 'linear-gradient(180deg,#0D1B3E 0%,#1A2F5E 100%)', border: 'none', borderRight: '1px solid rgba(255,255,255,0.08)' },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: { borderRadius: 8, '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' } },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: { '& .MuiOutlinedInput-root': { backgroundColor: '#FAFCFF', '& fieldset': { borderColor: '#C5D3F0' }, '&:hover fieldset': { borderColor: '#1565C0' }, '&.Mui-focused fieldset': { borderColor: '#1565C0', borderWidth: 2 } } },
      },
    },
    MuiLinearProgress: { styleOverrides: { root: { backgroundColor: '#DDEEFF', borderRadius: 4 }, bar: { borderRadius: 4 } } },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 8 },
        standardInfo: { backgroundColor: '#E3F2FD', color: '#01579B' },
        standardError: { backgroundColor: '#FFEBEE', color: '#B71C1C' },
        standardSuccess: { backgroundColor: '#E8F5E9', color: '#1B5E20' },
      },
    },
    MuiDialog: { styleOverrides: { paper: { border: '1px solid #C5D3F0', boxShadow: '0 20px 60px rgba(21,101,192,0.2)' } } },
    MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600, color: '#3A5080', '&.Mui-selected': { color: '#1565C0' } } } },
    MuiTabs: { styleOverrides: { indicator: { backgroundColor: '#1565C0', height: 3, borderRadius: 2 } } },
    MuiToggleButton: {
      styleOverrides: { root: { textTransform: 'none', fontWeight: 600, color: '#3A5080', borderColor: '#C5D3F0', '&.Mui-selected': { backgroundColor: '#E3EFFE', color: '#1565C0', borderColor: '#1565C0' } } },
    },
    MuiSlider: { styleOverrides: { root: { color: '#1565C0' }, rail: { backgroundColor: '#C5D3F0' } } },
    MuiSwitch: { styleOverrides: { switchBase: { '&.Mui-checked': { color: '#1565C0' }, '&.Mui-checked + .MuiSwitch-track': { backgroundColor: '#1565C0' } } } },
    MuiIconButton: { styleOverrides: { root: { '&:hover': { backgroundColor: '#E8F0FE' } } } },
    MuiCircularProgress: { styleOverrides: { root: { color: '#1565C0' } } },
    MuiDivider: { styleOverrides: { root: { borderColor: '#D6E4F7' } } },
  },
});

export default theme;