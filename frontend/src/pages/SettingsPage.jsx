import React, { useState } from 'react';
import {
  Box, Paper, Typography, Button, Alert, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText,
  Grid, Divider,
} from '@mui/material';
import {
  DeleteForever, FolderDelete, DeleteSweep, Warning,
} from '@mui/icons-material';
import { dataAPI } from '../services/api';
import useAuthStore from '../store/authStore';

function ConfirmDialog({ open, title, message, onConfirm, onClose, loading }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Warning color="error" /> {title}
      </DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" disabled={loading}>Cancel</Button>
        <Button onClick={onConfirm} variant="contained" color="error" disabled={loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <DeleteForever />}>
          {loading ? 'Deleting…' : 'Confirm Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ActionCard({ icon, title, desc, buttonLabel, color, onAction }) {
  return (
    <Paper sx={{
      p: 3, border: `1px solid ${color === 'error' ? '#FFCDD2' : color === 'warning' ? '#FFE0B2' : '#C8E6C9'}`,
      bgcolor: color === 'error' ? '#FFF8F8' : color === 'warning' ? '#FFFBF5' : '#F9FBF9',
    }}>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        <Box sx={{
          p: 1.2, borderRadius: 2, flexShrink: 0,
          bgcolor: color === 'error' ? '#FFEBEE' : color === 'warning' ? '#FFF3E0' : '#E8F5E9',
          color: color === 'error' ? 'error.main' : color === 'warning' ? 'warning.main' : 'success.main',
        }}>
          {icon}
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography fontWeight={700} sx={{ mb: 0.4, color: 'text.primary' }}>{title}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{desc}</Typography>
          <Button size="small" variant="outlined" color={color} startIcon={<DeleteForever />}
            onClick={onAction} sx={{ borderRadius: 2 }}>
            {buttonLabel}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [confirm, setConfirm] = useState({ open: false, title: '', message: '', action: null });
  const [actionLoading, setActionLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const openConfirm = (title, message, action) =>
    setConfirm({ open: true, title, message, action });

  const closeConfirm = () =>
    setConfirm({ open: false, title: '', message: '', action: null });

  const runAction = async () => {
    setActionLoading(true);
    setError(''); setSuccess('');
    try {
      const result = await confirm.action();
      setSuccess(result?.data?.message || 'Done');
    } catch (err) {
      setError(err.response?.data?.detail || 'Action failed');
    } finally {
      setActionLoading(false);
      closeConfirm();
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800}>My Data</Typography>
        <Typography variant="body2" color="text.secondary">
          Manage and delete your own uploads and detection data
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>Account</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Signed in as</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Box sx={{
            width: 48, height: 48, borderRadius: '12px',
            bgcolor: user?.is_admin ? '#FFF3E0' : '#E3EFFE',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: '1.1rem',
            color: user?.is_admin ? '#E65100' : '#1565C0',
          }}>
            {user?.username?.[0]?.toUpperCase()}
          </Box>
          <Box>
            <Typography fontWeight={700}>{user?.full_name || user?.username}</Typography>
            <Typography variant="caption" color="text.secondary">{user?.email}</Typography>
          </Box>
        </Box>
      </Paper>

      <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: 'error.main' }}>
        Delete My Data
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <ActionCard
            icon={<DeleteSweep />}
            title="Delete my detection jobs"
            desc="Removes all your detection jobs and result heatmaps. Your uploaded files are kept."
            buttonLabel="Delete my jobs"
            color="warning"
            onAction={() => openConfirm(
              'Delete your jobs',
              'All your detection jobs and result heatmap images will be permanently deleted. Your uploaded files remain.',
              () => dataAPI.deleteMyJobs()
            )}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <ActionCard
            icon={<FolderDelete />}
            title="Delete my uploads"
            desc="Permanently deletes all your uploaded images and videos, and all related jobs and results."
            buttonLabel="Delete my uploads"
            color="error"
            onAction={() => openConfirm(
              'Delete your uploads',
              'All your uploaded files and their associated detection jobs and results will be permanently deleted.',
              () => dataAPI.deleteMyUploads()
            )}
          />
        </Grid>
        <Grid item xs={12}>
          <ActionCard
            icon={<DeleteForever />}
            title="Delete all my data"
            desc="Wipes everything associated with your account — uploads, jobs, results, and camera streams. Your account itself is kept."
            buttonLabel="Delete everything"
            color="error"
            onAction={() => openConfirm(
              'Delete all your data',
              'This permanently removes ALL your uploads, detection jobs, results, and camera streams. Your account is not deleted. This cannot be undone.',
              () => dataAPI.deleteMyAll()
            )}
          />
        </Grid>
      </Grid>

      <ConfirmDialog
        open={confirm.open} title={confirm.title} message={confirm.message}
        onConfirm={runAction} onClose={closeConfirm} loading={actionLoading}
      />
    </Box>
  );
}