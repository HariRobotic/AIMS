import React, { useEffect, useState } from 'react';
import {
  Box, Grid, Paper, Typography, Button, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, Chip, Slider, Alert, CircularProgress,
} from '@mui/material';
import { Add, Delete, Videocam, VideocamOff } from '@mui/icons-material';
import { streamsAPI } from '../services/api';
import { format } from 'date-fns';

export default function StreamsPage() {
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', url: '', sampling_interval_ms: 1000 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await streamsAPI.list();
      setStreams(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    setSaving(true);
    setError('');
    try {
      await streamsAPI.create(form);
      setOpen(false);
      setForm({ name: '', url: '', sampling_interval_ms: 1000 });
      load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create stream');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    await streamsAPI.delete(id);
    load();
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Camera Streams</Typography>
          <Typography variant="body2" color="text.secondary">Manage RTSP / HTTP camera feeds</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
          Add Stream
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>
      ) : (
        <Grid container spacing={2}>
          {streams.map((stream) => (
            <Grid item xs={12} sm={6} md={4} key={stream.id}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{
                      p: 1, borderRadius: 2,
                      bgcolor: stream.is_active ? 'rgba(105,240,174,0.15)' : 'rgba(128,128,128,0.15)',
                    }}>
                      {stream.is_active
                        ? <Videocam sx={{ color: '#69f0ae' }} />
                        : <VideocamOff sx={{ color: '#666' }} />}
                    </Box>
                    <Box>
                      <Typography fontWeight={700}>{stream.name}</Typography>
                      <Chip
                        size="small"
                        label={stream.is_active ? 'Active' : 'Inactive'}
                        sx={{
                          bgcolor: stream.is_active ? 'rgba(105,240,174,0.15)' : 'rgba(128,128,128,0.15)',
                          color: stream.is_active ? '#69f0ae' : '#666',
                          fontSize: '0.65rem',
                        }}
                      />
                    </Box>
                  </Box>
                  <IconButton size="small" color="error" onClick={() => handleDelete(stream.id)}>
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>

                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, wordBreak: 'break-all', fontFamily: 'monospace' }}>
                  {stream.url}
                </Typography>

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="text.secondary">
                    Sample every {stream.sampling_interval_ms}ms
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Added {format(new Date(stream.created_at), 'MMM d')}
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          ))}
          {!streams.length && (
            <Grid item xs={12}>
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Videocam sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                <Typography color="text.secondary">No camera streams configured.</Typography>
                <Typography variant="caption" color="text.secondary">Add a stream to start monitoring live feeds.</Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Camera Stream</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField
            fullWidth label="Stream Name" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            sx={{ mt: 1, mb: 2 }}
          />
          <TextField
            fullWidth label="Stream URL (RTSP / HTTP)" value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            placeholder="rtsp://camera-ip:554/stream"
            sx={{ mb: 3 }}
          />
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" fontWeight={600}>Sampling Interval</Typography>
              <Chip size="small" label={`${form.sampling_interval_ms}ms`} color="primary" />
            </Box>
            <Slider
              value={form.sampling_interval_ms}
              onChange={(_, v) => setForm({ ...form, sampling_interval_ms: v })}
              min={100} max={10000} step={100}
              marks={[
                { value: 500, label: '0.5s' },
                { value: 1000, label: '1s' },
                { value: 5000, label: '5s' },
              ]}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving || !form.name || !form.url}>
            {saving ? <CircularProgress size={18} /> : 'Add Stream'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
