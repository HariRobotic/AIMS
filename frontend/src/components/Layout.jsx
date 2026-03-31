import React, { useState } from 'react';
import {
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Typography, IconButton, Avatar, Tooltip, Divider, Badge,
} from '@mui/material';
import {
  Dashboard, CloudUpload, History, VideoLibrary, Analytics,
  Videocam, AdminPanelSettings, Security, Logout,
  ChevronLeft, ChevronRight,
  ManageAccounts,
} from '@mui/icons-material';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import useAuthStore from '../store/authStore';

const DRAWER_WIDTH = 256;
const COLLAPSED_WIDTH = 70;

const NAV_ITEMS = [
  { path: '/dashboard', icon: <Dashboard />, label: 'Dashboard' },
  { path: '/upload', icon: <CloudUpload />, label: 'Upload & Detect' },
  { path: '/history', icon: <History />, label: 'Detection History' },
  { path: '/videos', icon: <VideoLibrary />, label: 'Media Library' },
  { path: '/analytics', icon: <Analytics />, label: 'Analytics' },
  { path: '/streams', icon: <Videocam />, label: 'Camera Streams' },
  { path: '/settings', icon: <ManageAccounts />, label: 'My Data' },
];

const SidebarButton = ({ icon, label, active, onClick, collapsed, color, badge }) => (
  <Tooltip title={collapsed ? label : ''} placement="right" arrow>
    <ListItemButton
      onClick={onClick}
      sx={{
        borderRadius: '12px',
        mx: 1, mb: 0.5,
        minHeight: 46,
        justifyContent: collapsed ? 'center' : 'flex-start',
        px: collapsed ? 1.5 : 2,
        position: 'relative',
        background: active
          ? 'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.12) 100%)'
          : 'transparent',
        backdropFilter: active ? 'blur(8px)' : 'none',
        border: active ? '1px solid rgba(255,255,255,0.25)' : '1px solid transparent',
        boxShadow: active ? '0 4px 15px rgba(0,0,0,0.15)' : 'none',
        transition: 'all 0.2s ease',
        '&:hover': {
          background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.07) 100%)',
          border: '1px solid rgba(255,255,255,0.18)',
          transform: 'translateX(2px)',
        },
        '&::before': active ? {
          content: '""',
          position: 'absolute',
          left: 0, top: '50%', transform: 'translateY(-50%)',
          width: 3, height: 24, borderRadius: '0 3px 3px 0',
          background: color || '#fff',
        } : {},
      }}
    >
      <ListItemIcon sx={{
        minWidth: collapsed ? 'auto' : 38,
        color: active ? (color || '#fff') : 'rgba(255,255,255,0.6)',
        transition: 'color 0.2s',
      }}>
        {badge
          ? <Badge badgeContent={badge} color="error" sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', minWidth: 16, height: 16 } }}>{icon}</Badge>
          : icon}
      </ListItemIcon>
      {!collapsed && (
        <ListItemText
          primary={label}
          primaryTypographyProps={{
            fontSize: '0.875rem',
            fontWeight: active ? 700 : 400,
            color: active ? '#fff' : 'rgba(255,255,255,0.7)',
            letterSpacing: active ? '0.01em' : 0,
          }}
        />
      )}
    </ListItemButton>
  </Tooltip>
);

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => { await logout(); navigate('/login'); };

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.username?.[0]?.toUpperCase() || '?';

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>

      {/* ── Sidebar ── */}
      <Drawer
        variant="permanent"
        sx={{
          width: collapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH,
          flexShrink: 0,
          transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
          '& .MuiDrawer-paper': {
            width: collapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH,
            boxSizing: 'border-box',
            border: 'none',
            overflow: 'hidden',
            transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
            background: 'linear-gradient(175deg, #0D1B3E 0%, #112266 40%, #0D3380 70%, #1565C0 100%)',
            boxShadow: '4px 0 24px rgba(13,27,62,0.35)',
          },
        }}
      >
        {/* Brand header */}
        <Box sx={{
          display: 'flex', alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          px: collapsed ? 1 : 2.5, py: 2,
          minHeight: 72,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(0,0,0,0.15)',
        }}>
          {!collapsed && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{
                width: 36, height: 36, borderRadius: '10px', flexShrink: 0,
                background: 'linear-gradient(135deg, #42A5F5, #1565C0)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(66,165,245,0.4)',
              }}>
                <Security sx={{ color: '#fff', fontSize: 20 }} />
              </Box>
              <Box>
                <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '0.95rem', lineHeight: 1.1, letterSpacing: '-0.01em' }}>
                  AnomalyMonitor
                </Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  AI Detection
                </Typography>
              </Box>
            </Box>
          )}

          {collapsed && (
            <Box sx={{
              width: 36, height: 36, borderRadius: '10px',
              background: 'linear-gradient(135deg, #42A5F5, #1565C0)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(66,165,245,0.4)',
            }}>
              <Security sx={{ color: '#fff', fontSize: 20 }} />
            </Box>
          )}

          <IconButton
            onClick={() => setCollapsed(c => !c)}
            size="small"
            sx={{
              color: 'rgba(255,255,255,0.7)', ml: collapsed ? 0 : 'auto',
              width: 28, height: 28,
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '8px',
              '&:hover': { background: 'rgba(255,255,255,0.2)', color: '#fff' },
              display: collapsed ? 'none' : 'flex',
            }}
          >
            <ChevronLeft fontSize="small" />
          </IconButton>
        </Box>

        {/* Open button when collapsed */}
        {collapsed && (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1.5 }}>
            <IconButton
              onClick={() => setCollapsed(false)}
              size="small"
              sx={{
                color: 'rgba(255,255,255,0.7)',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '8px',
                width: 32, height: 32,
                '&:hover': { background: 'rgba(255,255,255,0.2)', color: '#fff' },
              }}
            >
              <ChevronRight fontSize="small" />
            </IconButton>
          </Box>
        )}

        {/* Nav section label */}
        {!collapsed && (
          <Typography sx={{ px: 2.5, pt: 2.5, pb: 1, fontSize: '0.62rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Navigation
          </Typography>
        )}

        {/* Nav items */}
        <List sx={{ px: 0, pt: collapsed ? 1 : 0, flex: 1 }}>
          {NAV_ITEMS.map(({ path, icon, label }) => (
            <ListItem key={path} disablePadding>
              <SidebarButton
                icon={icon} label={label}
                active={location.pathname === path}
                onClick={() => navigate(path)}
                collapsed={collapsed}
                color="#90CAF9"
              />
            </ListItem>
          ))}
        </List>

        {/* Bottom section */}
        <Box sx={{ pb: 2 }}>
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mx: 2, mb: 1.5 }} />

          {/* Admin first if admin user */}
          {user?.is_admin && (
            <ListItem disablePadding>
              <SidebarButton
                icon={<AdminPanelSettings />}
                label="Admin Panel"
                active={location.pathname === '/admin'}
                onClick={() => navigate('/admin')}
                collapsed={collapsed}
                color="#FFB74D"
              />
            </ListItem>
          )}

          {/* User card */}
          {!collapsed ? (
            <Box sx={{
              mx: 1.5, mt: 1, p: 1.5, borderRadius: '12px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.2 }}>
                <Avatar sx={{
                  width: 34, height: 34, fontSize: '0.75rem', fontWeight: 700,
                  background: user?.is_admin
                    ? 'linear-gradient(135deg, #FFB74D, #F57C00)'
                    : 'linear-gradient(135deg, #42A5F5, #1565C0)',
                  boxShadow: user?.is_admin
                    ? '0 3px 10px rgba(245,124,0,0.4)'
                    : '0 3px 10px rgba(21,101,192,0.4)',
                }}>
                  {initials}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '0.82rem', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user?.full_name || user?.username}
                  </Typography>
                  <Typography sx={{
                    fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em',
                    color: user?.is_admin ? '#FFB74D' : 'rgba(255,255,255,0.5)',
                    textTransform: 'uppercase',
                  }}>
                    {user?.is_admin ? 'Administrator' : 'User'}
                  </Typography>
                </Box>
              </Box>
              <Box
                onClick={handleLogout}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1,
                  cursor: 'pointer', borderRadius: '8px', px: 1, py: 0.6,
                  color: 'rgba(255,255,255,0.55)',
                  transition: 'all 0.15s',
                  '&:hover': { background: 'rgba(239,68,68,0.15)', color: '#FC8181' },
                }}
              >
                <Logout sx={{ fontSize: 15 }} />
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 600 }}>Sign out</Typography>
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, px: 1 }}>
              <Tooltip title={`${user?.username} (${user?.is_admin ? 'Admin' : 'User'})`} placement="right" arrow>
                <Avatar sx={{
                  width: 34, height: 34, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                  background: user?.is_admin
                    ? 'linear-gradient(135deg, #FFB74D, #F57C00)'
                    : 'linear-gradient(135deg, #42A5F5, #1565C0)',
                }}>
                  {initials}
                </Avatar>
              </Tooltip>
              <Tooltip title="Sign out" placement="right" arrow>
                <IconButton onClick={handleLogout} size="small" sx={{
                  color: 'rgba(255,255,255,0.5)', width: 32, height: 32,
                  '&:hover': { color: '#FC8181', background: 'rgba(239,68,68,0.15)' },
                }}>
                  <Logout sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>
      </Drawer>

      {/* ── Main content ── */}
      <Box component="main" sx={{
        flex: 1, overflow: 'auto', p: 3,
        transition: 'margin 0.25s cubic-bezier(0.4,0,0.2,1)',
      }}>
        <Outlet />
      </Box>
    </Box>
  );
}