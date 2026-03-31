import React, { useState, useCallback } from 'react';
import {
  Box, Paper, Typography, Button, Slider, Select, MenuItem,
  FormControl, InputLabel, LinearProgress, Chip, Grid, Alert,
  CircularProgress, List, ListItem, ListItemText, ListItemIcon,
} from '@mui/material';
import {
  CloudUpload, Image, VideoFile, CheckCircle, Error, PlayArrow,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { detectionsAPI, modelsAPI } from '../services/api';

const MODELS = [
  { id: 'padim', name: 'PaDiM', desc: 'Patch Distribution Modeling' },
  { id: 'patchcore', name: 'PatchCore', desc: 'Memory-bank approach' },
  { id: 'efficient_ad', name: 'EfficientAD', desc: 'Lightweight student-teacher' },
  { id: 'fastflow', name: 'FastFlow', desc: 'Normalizing flow-based' },
];

const formatBytes = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [uploadRecord, setUploadRecord] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [model, setModel] = useState('padim');
  const [threshold, setThreshold] = useState(0.5);
  const [job, setJob] = useState(null);
  const [error, setError] = useState('');
  const [polling, setPolling] = useState(false);

  const onDrop = useCallback((accepted) => {
    setFile(accepted[0]);
    setUploadRecord(null);
    setJob(null);
    setError('');
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [], 'video/*': [] },
    maxFiles: 1,
  });

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const { data } = await detectionsAPI.upload(file, setUploadProgress);
      setUploadRecord(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleRunDetection = async () => {
    if (!uploadRecord) return;
    setError('');
    try {
      const { data } = await detectionsAPI.createJob({
        upload_id: uploadRecord.id,
        model_name: model,
        anomaly_threshold: threshold,
      });
      setJob(data);
      pollJob(data.id);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to start job');
    }
  };

  const pollJob = async (jobId) => {
    setPolling(true);
    const interval = setInterval(async () => {
      try {
        const { data } = await detectionsAPI.getJob(jobId);
        setJob(data);
        if (['completed', 'failed'].includes(data.status)) {
          clearInterval(interval);
          setPolling(false);
        }
      } catch {
        clearInterval(interval);
        setPolling(false);
      }
    }, 2000);
  };

  const jobProgress = job && job.total_frames > 0
    ? (job.processed_frames / job.total_frames) * 100
    : 0;

  return (
    <Box>
      <Typography variant="h4" fontWeight={800} sx={{ mb: 0.5 }}>Upload & Detect</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Upload images or videos for AI-powered anomaly detection
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Grid container spacing={3}>
        {/* Drop zone */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>1. Select File</Typography>
            <Box
              {...getRootProps()}
              sx={{
                border: `2px dashed ${isDragActive ? '#00e5ff' : 'rgba(0,229,255,0.25)'}`,
                borderRadius: 3, p: 4, textAlign: 'center', cursor: 'pointer',
                background: isDragActive ? 'rgba(0,229,255,0.07)' : 'rgba(0,229,255,0.02)',
                transition: 'all 0.2s',
                '&:hover': { borderColor: '#00e5ff', background: 'rgba(0,229,255,0.05)' },
              }}
            >
              <input {...getInputProps()} />
              <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
              <Typography fontWeight={600}>{isDragActive ? 'Drop it!' : 'Drag & drop or click to browse'}</Typography>
              <Typography variant="caption" color="text.secondary">
                Supports JPEG, PNG, BMP (up to 20 MB) · MP4, AVI, MOV (up to 500 MB)
              </Typography>
            </Box>

            {file && (
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  {file.type.startsWith('video') ? <VideoFile color="primary" /> : <Image color="primary" />}
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>{file.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{formatBytes(file.size)}</Typography>
                  </Box>
                </Box>

                {uploading && (
                  <LinearProgress variant="determinate" value={uploadProgress} sx={{ mb: 1 }} />
                )}

                {!uploadRecord ? (
                  <Button
                    fullWidth variant="contained" onClick={handleUpload}
                    disabled={uploading}
                    startIcon={uploading ? <CircularProgress size={16} /> : <CloudUpload />}
                  >
                    {uploading ? `Uploading ${uploadProgress}%` : 'Upload File'}
                  </Button>
                ) : (
                  <Chip icon={<CheckCircle />} label="Uploaded successfully" color="success" sx={{ width: '100%' }} />
                )}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Model config */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>2. Configure Detection</Typography>

            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Detection Model</InputLabel>
              <Select value={model} onChange={(e) => setModel(e.target.value)} label="Detection Model">
                {MODELS.map((m) => (
                  <MenuItem key={m.id} value={m.id}>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{m.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{m.desc}</Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" fontWeight={600}>Anomaly Threshold</Typography>
                <Chip size="small" label={threshold.toFixed(2)} color="primary" />
              </Box>
              <Slider
                value={threshold}
                onChange={(_, v) => setThreshold(v)}
                min={0} max={1} step={0.01}
                marks={[
                  { value: 0.3, label: 'Sensitive' },
                  { value: 0.5, label: 'Balanced' },
                  { value: 0.7, label: 'Strict' },
                ]}
                sx={{ color: 'primary.main' }}
              />
            </Box>

            <Button
              fullWidth variant="contained" size="large"
              onClick={handleRunDetection}
              disabled={!uploadRecord || polling}
              startIcon={polling ? <CircularProgress size={18} color="inherit" /> : <PlayArrow />}
            >
              {polling ? 'Running Detection…' : 'Run Detection'}
            </Button>
          </Paper>
        </Grid>

        {/* Job progress */}
        {job && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight={700}>Detection Job #{job.id}</Typography>
                <Chip
                  label={job.status}
                  color={job.status === 'completed' ? 'success' : job.status === 'failed' ? 'error' : 'primary'}
                />
              </Box>

              {job.status === 'running' && (
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      {job.processed_frames} / {job.total_frames} frames
                    </Typography>
                    <Typography variant="caption" color="primary.main">{jobProgress.toFixed(0)}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={jobProgress} />
                </Box>
              )}

              {job.status === 'completed' && (
                <Grid container spacing={2}>
                  {[
                    { label: 'Frames Processed', value: job.processed_frames },
                    { label: 'Anomalies Found', value: job.anomaly_count, color: job.anomaly_count > 0 ? 'error.main' : 'success.main' },
                    { label: 'Average Score', value: job.average_score ? (job.average_score * 100).toFixed(1) + '%' : '—' },
                    { label: 'Peak Score', value: job.max_score ? (job.max_score * 100).toFixed(1) + '%' : '—' },
                  ].map(({ label, value, color }) => (
                    <Grid item xs={6} sm={3} key={label}>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(0,229,255,0.04)', borderRadius: 2 }}>
                        <Typography variant="h5" fontWeight={700} color={color || 'primary.main'}>{value}</Typography>
                        <Typography variant="caption" color="text.secondary">{label}</Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              )}

              {job.status === 'failed' && (
                <Alert severity="error">{job.error_message || 'Detection failed'}</Alert>
              )}
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
