import React, { useEffect, useState } from 'react';
import {
  Box, Grid, Paper, Typography, Chip, CircularProgress,
  IconButton, Tooltip, Pagination, TextField, InputAdornment,
} from '@mui/material';
import { Image, VideoFile, Search, Refresh } from '@mui/icons-material';
import { detectionsAPI } from '../services/api';
import { format } from 'date-fns';

const formatBytes = (b) => {
  if (!b) return '—';
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
};

const formatDuration = (s) => {
  if (!s) return null;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
};

export default function VideosPage() {
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await detectionsAPI.listUploads({ limit: 200 });
      setUploads(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = uploads.filter((u) =>
    u.original_filename.toLowerCase().includes(search.toLowerCase())
  );
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);

  const statusColor = { uploaded: '#80cbc4', processing: '#00e5ff', processed: '#69f0ae', error: '#ff5252' };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Media Library</Typography>
          <Typography variant="body2" color="text.secondary">{uploads.length} files uploaded</Typography>
        </Box>
        <IconButton onClick={load} sx={{ color: 'primary.main' }}><Refresh /></IconButton>
      </Box>

      <TextField
        fullWidth placeholder="Search files…" value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: <InputAdornment position="start"><Search sx={{ color: 'text.secondary' }} /></InputAdornment>,
        }}
      />

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>
      ) : (
        <>
          <Grid container spacing={2}>
            {paginated.map((upload) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={upload.id}>
                <Paper sx={{
                  p: 2, height: '100%', display: 'flex', flexDirection: 'column',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                  '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 32px rgba(0,229,255,0.1)' },
                }}>
                  {/* Thumbnail area */}
                  <Box sx={{
                    aspectRatio: '16/9', bgcolor: 'rgba(0,229,255,0.05)',
                    borderRadius: 2, mb: 1.5, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', border: '1px solid rgba(0,229,255,0.1)',
                  }}>
                    {upload.file_type === 'video'
                      ? <VideoFile sx={{ fontSize: 40, color: 'primary.main', opacity: 0.6 }} />
                      : <Image sx={{ fontSize: 40, color: 'primary.main', opacity: 0.6 }} />}
                  </Box>

                  <Typography variant="body2" fontWeight={600} noWrap sx={{ mb: 0.5 }} title={upload.original_filename}>
                    {upload.original_filename}
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                    <Chip size="small" label={upload.file_type} variant="outlined" />
                    {upload.status && (
                      <Chip size="small" label={upload.status}
                        sx={{ color: statusColor[upload.status], borderColor: `${statusColor[upload.status]}66` }}
                        variant="outlined" />
                    )}
                  </Box>

                  <Box sx={{ mt: 'auto' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                      <Typography variant="caption" color="text.secondary">Size</Typography>
                      <Typography variant="caption">{formatBytes(upload.file_size)}</Typography>
                    </Box>
                    {upload.width && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                        <Typography variant="caption" color="text.secondary">Dimensions</Typography>
                        <Typography variant="caption">{upload.width}×{upload.height}</Typography>
                      </Box>
                    )}
                    {upload.duration_seconds && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                        <Typography variant="caption" color="text.secondary">Duration</Typography>
                        <Typography variant="caption">{formatDuration(upload.duration_seconds)}</Typography>
                      </Box>
                    )}
                    {upload.frame_count && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                        <Typography variant="caption" color="text.secondary">Frames</Typography>
                        <Typography variant="caption">{upload.frame_count.toLocaleString()}</Typography>
                      </Box>
                    )}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">Uploaded</Typography>
                      <Typography variant="caption">{format(new Date(upload.uploaded_at), 'MMM d, HH:mm')}</Typography>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            ))}
            {!paginated.length && (
              <Grid item xs={12}>
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <Typography color="text.secondary">
                    {search ? 'No files match your search' : 'No uploads yet. Go to "Upload & Detect" to add media.'}
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>
          {pageCount > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination count={pageCount} page={page} onChange={(_, v) => setPage(v)} color="primary" />
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
