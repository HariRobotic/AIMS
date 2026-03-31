import React, { useEffect, useState } from 'react';
import {
  Box, Grid, Paper, Typography, Table, TableBody, TableCell,
  TableHead, TableRow, Chip, IconButton, Switch, CircularProgress,
  Tooltip, Alert, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, DialogContentText, Divider,
} from '@mui/material';
import {
  Delete, AdminPanelSettings, Storage, Memory,
  DeleteForever, DeleteSweep, PersonRemove, Warning,
  CheckCircle, FolderDelete, Assignment,
} from '@mui/icons-material';
import { adminAPI, dataAPI } from '../services/api';
import { format } from 'date-fns';

// ── Confirm dialog ────────────────────────────────────────────────────────────
function ConfirmDialog({ open, title, message, severity = 'error', onConfirm, onClose, loading }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Warning sx={{ color: severity === 'error' ? 'error.main' : 'warning.main' }} />
        {title}
      </DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" disabled={loading}>Cancel</Button>
        <Button
          onClick={onConfirm} variant="contained" color="error"
          disabled={loading} startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <DeleteForever />}
        >
          {loading ? 'Deleting…' : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Danger action card ────────────────────────────────────────────────────────
function DangerCard({ icon, title, desc, buttonLabel, onAction, color = 'error' }) {
  return (
    <Paper sx={{
      p: 2.5,
      border: `1px solid ${color === 'error' ? '#FFCDD2' : '#FFE0B2'}`,
      bgcolor: color === 'error' ? '#FFF8F8' : '#FFFBF5',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <Box sx={{
          p: 1, borderRadius: 2, flexShrink: 0,
          bgcolor: color === 'error' ? '#FFEBEE' : '#FFF3E0',
          color: color === 'error' ? 'error.main' : 'warning.main',
        }}>
          {icon}
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography fontWeight={700} fontSize="0.9rem" color={color === 'error' ? 'error.main' : 'warning.main'} sx={{ mb: 0.3 }}>
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
            {desc}
          </Typography>
          <Button
            size="small" variant="outlined" color={color}
            startIcon={<Delete />} onClick={onAction}
            sx={{ borderRadius: 2 }}
          >
            {buttonLabel}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}

export default function AdminPage() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Confirm dialog state
  const [confirm, setConfirm] = useState({ open: false, title: '', message: '', action: null });

  const loadData = async () => {
    try {
      const [s, u] = await Promise.all([adminAPI.stats(), adminAPI.listUsers()]);
      setStats(s.data);
      setUsers(u.data);
    } catch {
      setError('Failed to load admin data. Admin access required.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const openConfirm = (title, message, action) =>
    setConfirm({ open: true, title, message, action });

  const closeConfirm = () =>
    setConfirm({ open: false, title: '', message: '', action: null });

  const runAction = async () => {
    setActionLoading(true);
    setError('');
    setSuccess('');
    try {
      const result = await confirm.action();
      setSuccess(result?.data?.message || 'Done');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Action failed');
    } finally {
      setActionLoading(false);
      closeConfirm();
    }
  };

  const toggleAdmin = async (user) => {
    try {
      await adminAPI.updateUser(user.id, { is_admin: !user.is_admin });
      setUsers(users.map(u => u.id === user.id ? { ...u, is_admin: !u.is_admin } : u));
    } catch { setError('Failed to update user'); }
  };

  const toggleActive = async (user) => {
    try {
      await adminAPI.updateUser(user.id, { is_active: !user.is_active });
      setUsers(users.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u));
    } catch { setError('Failed to update user'); }
  };

  if (loading) return <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>;

  // Sort: admins first
  const sortedUsers = [...users].sort((a, b) => (b.is_admin ? 1 : 0) - (a.is_admin ? 1 : 0));

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800}>Admin Panel</Typography>
        <Typography variant="body2" color="text.secondary">System management, user control, and data cleanup</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* ── System stats ── */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { icon: <AdminPanelSettings />, label: 'Total Users', value: stats.total_users, color: '#1565C0' },
            { icon: <Storage />, label: 'Total Uploads', value: stats.total_uploads, color: '#0288D1' },
            { icon: <Assignment />, label: 'Total Jobs', value: stats.total_jobs, color: '#00897B' },
            { icon: <Memory />, label: 'Disk Usage', value: `${stats.disk_usage_mb.toFixed(0)} MB`, color: '#F57C00' },
          ].map(({ icon, label, value, color }) => (
            <Grid item xs={6} md={3} key={label}>
              <Paper sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ color, p: 1, bgcolor: `${color}18`, borderRadius: 2 }}>{icon}</Box>
                <Box>
                  <Typography variant="h5" fontWeight={800} sx={{ color }}>{value}</Typography>
                  <Typography variant="caption" color="text.secondary">{label}</Typography>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      <Grid container spacing={3}>
        {/* ── System-wide danger zone ── */}
        <Grid item xs={12} lg={5}>
          <Paper sx={{ p: 3, mb: 0 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
              System Data Management
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              Admin-only. These actions affect all users.
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <DangerCard
                icon={<DeleteForever />}
                title="Wipe all system data"
                desc="Deletes every upload, job, result and heatmap from all users. User accounts are kept."
                buttonLabel="Wipe everything"
                color="error"
                onAction={() => openConfirm(
                  'Wipe all data',
                  'This permanently deletes ALL uploads, detection jobs, results, and heatmap files from every user. User accounts are not affected. This cannot be undone.',
                  () => dataAPI.adminDeleteAllData()
                )}
              />
              <DangerCard
                icon={<FolderDelete />}
                title="Delete all uploads"
                desc="Removes every uploaded file and cascades to delete all jobs and results."
                buttonLabel="Delete all uploads"
                color="error"
                onAction={() => openConfirm(
                  'Delete all uploads',
                  'All uploaded images and videos will be permanently deleted along with their detection jobs and results.',
                  () => dataAPI.adminDeleteAllUploads()
                )}
              />
              <DangerCard
                icon={<DeleteSweep />}
                title="Delete all detection jobs"
                desc="Removes all jobs and result heatmaps. Uploaded files are kept."
                buttonLabel="Delete all jobs"
                color="warning"
                onAction={() => openConfirm(
                  'Delete all jobs',
                  'All detection jobs and their heatmap results will be deleted. Uploaded files are kept.',
                  () => dataAPI.adminDeleteAllJobs()
                )}
              />
            </Box>
          </Paper>
        </Grid>

        {/* ── User management ── */}
        <Grid item xs={12} lg={7}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>User Management</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell align="center">Active</TableCell>
                  <TableCell align="center">Admin</TableCell>
                  <TableCell>Last Login</TableCell>
                  <TableCell align="center">Data</TableCell>
                  <TableCell align="center">Delete</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedUsers.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>{user.username}</Typography>
                        <Typography variant="caption" color="text.secondary">{user.email}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {user.is_admin
                        ? <Chip size="small" label="Admin" sx={{ bgcolor: '#FFF3E0', color: '#E65100', fontWeight: 700, border: '1px solid #FFCC80' }} />
                        : <Chip size="small" label="User" sx={{ bgcolor: '#E3F2FD', color: '#1565C0', fontWeight: 700, border: '1px solid #90CAF9' }} />}
                    </TableCell>
                    <TableCell align="center">
                      <Switch checked={user.is_active} onChange={() => toggleActive(user)} size="small" color="success" />
                    </TableCell>
                    <TableCell align="center">
                      <Switch checked={user.is_admin} onChange={() => toggleAdmin(user)} size="small" color="warning" />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
                      {user.last_login ? format(new Date(user.last_login), 'MMM d, HH:mm') : 'Never'}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Delete this user's data only (keep account)">
                        <IconButton size="small" color="warning"
                          onClick={() => openConfirm(
                            `Delete ${user.username}'s data`,
                            `This deletes all uploads, detection jobs, results, and streams for "${user.username}". The account itself is kept.`,
                            () => dataAPI.adminDeleteUserData(user.id)
                          )}>
                          <FolderDelete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Delete account and all their data">
                        <IconButton size="small" color="error"
                          onClick={() => openConfirm(
                            `Delete ${user.username}`,
                            `This permanently deletes the account "${user.username}" along with ALL their data. This cannot be undone.`,
                            () => adminAPI.deleteUser(user.id)
                          )}>
                          <PersonRemove fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Grid>

        {/* ── Available models ── */}
        {stats && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2.5 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>Available Detection Models</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {stats.models_available.map((m) => (
                  <Chip key={m} label={m}
                    icon={<CheckCircle sx={{ fontSize: '14px !important' }} />}
                    color="primary" variant="outlined"
                    sx={{ fontFamily: 'monospace' }} />
                ))}
              </Box>
            </Paper>
          </Grid>
        )}
      </Grid>

      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        onConfirm={runAction}
        onClose={closeConfirm}
        loading={actionLoading}
      />
    </Box>
  );
}