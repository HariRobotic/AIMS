import React, { useState } from 'react';
import {
  Box, Button, TextField, Typography, Tab, Tabs,
  Alert, CircularProgress, InputAdornment, IconButton, Chip,
} from '@mui/material';
import {
  Visibility, VisibilityOff, Security, Shield,
  Analytics, Videocam, BugReport,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

const FEATURES = [
  { icon: <BugReport sx={{ fontSize: 20 }} />, title: 'Anomaly Detection', desc: 'AI-powered detection using PaDiM & PatchCore' },
  { icon: <Videocam sx={{ fontSize: 20 }} />, title: 'Video Analysis', desc: 'Frame-by-frame heatmap visualisation' },
  { icon: <Analytics sx={{ fontSize: 20 }} />, title: 'Analytics Dashboard', desc: 'Real-time charts and trend monitoring' },
  { icon: <Shield sx={{ fontSize: 20 }} />, title: 'Secure Platform', desc: 'JWT authentication with role-based access' },
];

export default function AuthPage() {
  const [tab, setTab] = useState(0);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', email: '', full_name: '' });
  const { login, register, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleChange = (e) => {
    clearError();
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await login(form.username, form.password);
      navigate('/dashboard');
    } catch {}
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await register(form);
      setTab(0);
      setForm(f => ({ ...f, email: '', full_name: '' }));
    } catch {}
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>

      {/* ── Left panel – branding ── */}
      <Box sx={{
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column',
        justifyContent: 'center',
        width: '52%',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(150deg, #0D1B3E 0%, #112266 35%, #0D3380 65%, #1565C0 100%)',
        p: 6,
      }}>
        {/* Decorative circles */}
        <Box sx={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, borderRadius: '50%', background: 'rgba(66,165,245,0.08)', border: '1px solid rgba(66,165,245,0.12)' }} />
        <Box sx={{ position: 'absolute', bottom: -60, left: -60, width: 240, height: 240, borderRadius: '50%', background: 'rgba(21,101,192,0.12)', border: '1px solid rgba(255,255,255,0.06)' }} />
        <Box sx={{ position: 'absolute', top: '40%', right: '10%', width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

        {/* Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 5 }}>
          <Box sx={{
            width: 52, height: 52, borderRadius: '14px',
            background: 'linear-gradient(135deg, #42A5F5, #1565C0)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(66,165,245,0.4)',
          }}>
            <Security sx={{ color: '#fff', fontSize: 28 }} />
          </Box>
          <Box>
            <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1.4rem', lineHeight: 1, letterSpacing: '-0.02em' }}>
              AnomalyMonitor
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              AI Detection Platform
            </Typography>
          </Box>
        </Box>

        <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '2rem', lineHeight: 1.2, mb: 1.5, letterSpacing: '-0.02em', maxWidth: 400 }}>
          Detect anomalies before they become problems
        </Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: '1rem', mb: 5, maxWidth: 380, lineHeight: 1.7 }}>
          Upload images or video and let AI pinpoint exactly where things look wrong — no labelled data needed.
        </Typography>

        {/* Feature list */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {FEATURES.map(({ icon, title, desc }) => (
            <Box key={title} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <Box sx={{
                width: 38, height: 38, borderRadius: '10px', flexShrink: 0,
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#90CAF9',
              }}>
                {icon}
              </Box>
              <Box>
                <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '0.88rem', lineHeight: 1.3 }}>{title}</Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem', lineHeight: 1.4 }}>{desc}</Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ── Right panel – form ── */}
      <Box sx={{
        flex: 1,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #EEF2FF 0%, #E8F0FE 60%, #EDF5FF 100%)',
        p: { xs: 3, md: 6 },
      }}>
        <Box sx={{ width: '100%', maxWidth: 420 }}>

          {/* Mobile logo */}
          <Box sx={{ display: { md: 'none' }, textAlign: 'center', mb: 3 }}>
            <Box sx={{
              width: 48, height: 48, borderRadius: '14px', mx: 'auto', mb: 1.5,
              background: 'linear-gradient(135deg, #42A5F5, #1565C0)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(66,165,245,0.3)',
            }}>
              <Security sx={{ color: '#fff', fontSize: 26 }} />
            </Box>
            <Typography fontWeight={800} fontSize="1.2rem" color="#0D1B3E">AnomalyMonitor</Typography>
          </Box>

          <Typography variant="h5" fontWeight={700} color="#0D1B3E" sx={{ mb: 0.5 }}>
            {tab === 0 ? 'Welcome back' : 'Create account'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {tab === 0 ? 'Sign in to your account to continue' : 'Set up your account to get started'}
          </Typography>

          {/* Default creds hint */}
          {/* {tab === 0 && (
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 1, mb: 2.5,
              p: 1.5, borderRadius: 2,
              background: 'rgba(21,101,192,0.06)',
              border: '1px solid rgba(21,101,192,0.15)',
            }}>
              <Shield sx={{ fontSize: 16, color: '#1565C0' }} />
              <Typography variant="caption" color="#1565C0" fontWeight={600}>
                Default admin:
              </Typography>
              <Chip label="admin" size="small" sx={{ height: 20, fontSize: '0.68rem', bgcolor: '#E3EFFE', color: '#1565C0' }} />
              <Chip label="admin1234" size="small" sx={{ height: 20, fontSize: '0.68rem', bgcolor: '#E3EFFE', color: '#1565C0' }} />
            </Box>
          )} */}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={clearError}>{error}</Alert>
          )}

          <Tabs
            value={tab}
            onChange={(_, v) => { setTab(v); clearError(); }}
            variant="fullWidth"
            sx={{
              mb: 3,
              bgcolor: 'rgba(255,255,255,0.7)',
              borderRadius: 2,
              border: '1px solid #D6E4F7',
              p: 0.5,
              '& .MuiTab-root': { borderRadius: 1.5, minHeight: 38, py: 0.5 },
              '& .Mui-selected': { bgcolor: '#fff', boxShadow: '0 2px 8px rgba(21,101,192,0.12)' },
              '& .MuiTabs-indicator': { display: 'none' },
            }}
          >
            <Tab label="Sign In" />
            <Tab label="Register" />
          </Tabs>

          {tab === 0 ? (
            <Box component="form" onSubmit={handleLogin}>
              <TextField
                fullWidth label="Username" name="username" value={form.username}
                onChange={handleChange} sx={{ mb: 2 }} required autoFocus
                InputProps={{ sx: { borderRadius: 2 } }}
              />
              <TextField
                fullWidth label="Password" name="password" value={form.password}
                onChange={handleChange} type={showPass ? 'text' : 'password'}
                sx={{ mb: 3 }} required
                InputProps={{
                  sx: { borderRadius: 2 },
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPass(!showPass)} edge="end" size="small">
                        {showPass ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                fullWidth variant="contained" type="submit" size="large"
                disabled={isLoading}
                sx={{ borderRadius: 2, py: 1.4, fontSize: '0.95rem' }}
              >
                {isLoading ? <CircularProgress size={22} color="inherit" /> : 'Sign In'}
              </Button>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleRegister}>
              <TextField
                fullWidth label="Full Name" name="full_name" value={form.full_name}
                onChange={handleChange} sx={{ mb: 2 }}
                InputProps={{ sx: { borderRadius: 2 } }}
              />
              <TextField
                fullWidth label="Email" name="email" type="email" value={form.email}
                onChange={handleChange} sx={{ mb: 2 }} required
                InputProps={{ sx: { borderRadius: 2 } }}
              />
              <TextField
                fullWidth label="Username" name="username" value={form.username}
                onChange={handleChange} sx={{ mb: 2 }} required
                InputProps={{ sx: { borderRadius: 2 } }}
              />
              <TextField
                fullWidth label="Password" name="password" value={form.password}
                onChange={handleChange} type={showPass ? 'text' : 'password'}
                sx={{ mb: 3 }} required
                InputProps={{
                  sx: { borderRadius: 2 },
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPass(!showPass)} edge="end" size="small">
                        {showPass ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                fullWidth variant="contained" type="submit" size="large"
                disabled={isLoading}
                sx={{ borderRadius: 2, py: 1.4, fontSize: '0.95rem' }}
              >
                {isLoading ? <CircularProgress size={22} color="inherit" /> : 'Create Account'}
              </Button>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}