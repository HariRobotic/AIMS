import React, { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableHead,
  TableRow, Chip, IconButton, Dialog, DialogTitle, DialogContent,
  Grid, CircularProgress, Tooltip, Pagination, Switch, FormControlLabel,
  Alert, LinearProgress, Slider,
} from '@mui/material';
import {
  Visibility, Warning, CheckCircle, Refresh, ZoomIn, Close,
  BrokenImage, Code,
} from '@mui/icons-material';
import { detectionsAPI } from '../services/api';
import { format } from 'date-fns';

const statusColors = {
  completed: '#69f0ae', running: '#00e5ff', failed: '#ff5252', pending: '#ffab40',
};

// Derive correct base URL – works for localhost dev and nginx proxy
const API_BASE = (() => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL.replace(/\/api\/?$/, '');
  }
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:8000';
  }
  return window.location.origin; // nginx proxy on same origin
})();

function heatmapUrl(p) {
  if (!p) return null;
  const f = p.replace(/\\/g, '/').split('/').pop();
  return `${API_BASE}/static/heatmaps/${f}`;
}

function frameUrl(p) {
  if (!p) return null;
  const f = p.replace(/\\/g, '/').split('/').pop();
  return `${API_BASE}/static/frames/${f}`;
}

function scoreColor(s) {
  if (s >= 0.7) return '#ff5252';
  if (s >= 0.5) return '#ffab40';
  return '#69f0ae';
}

// ── Frame card ───────────────────────────────────────────────────────────────
function FrameCard({ r, onZoom, showDebug }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const hUrl = heatmapUrl(r.heatmap_path);
  const pct = Math.round(r.anomaly_score * 100);

  return (
    <Paper
      onClick={() => !failed && hUrl && onZoom(r)}
      sx={{
        overflow: 'hidden', position: 'relative',
        border: r.is_anomaly ? '1px solid #ff405166' : '1px solid rgba(0,229,255,0.1)',
        cursor: hUrl && !failed ? 'zoom-in' : 'default',
        transition: 'transform 0.15s, box-shadow 0.15s',
        '&:hover': { transform: 'scale(1.02)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' },
      }}
    >
      {hUrl && !failed ? (
        <Box sx={{ position: 'relative', aspectRatio: '16/9', bgcolor: 'rgba(0,229,255,0.04)' }}>
          {!loaded && (
            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CircularProgress size={18} />
            </Box>
          )}
          <Box component="img" src={hUrl} alt={`Frame ${r.frame_number}`}
            onLoad={() => setLoaded(true)} onError={() => setFailed(true)}
            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: loaded ? 1 : 0, transition: 'opacity 0.3s' }}
          />
          {loaded && <ZoomIn sx={{ position: 'absolute', top: 4, right: 4, fontSize: 14, color: '#fff', opacity: 0.6 }} />}
        </Box>
      ) : (
        <Box sx={{ aspectRatio: '16/9', bgcolor: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0.5, px: 1.5 }}>
          <BrokenImage sx={{ fontSize: 20, color: 'text.secondary' }} />
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem', textAlign: 'center' }}>
            {failed ? 'Image not found on server' : 'No heatmap path'}
          </Typography>
          <Box sx={{ width: '100%', mt: 0.5 }}>
            <LinearProgress variant="determinate" value={pct}
              sx={{ height: 5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.08)', '& .MuiLinearProgress-bar': { bgcolor: scoreColor(r.anomaly_score) } }}
            />
          </Box>
        </Box>
      )}

      <Box sx={{ px: 1, py: 0.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
          f{r.frame_number}
          {r.timestamp_ms != null && <span style={{ opacity: 0.55, marginLeft: 3 }}>{(r.timestamp_ms / 1000).toFixed(1)}s</span>}
        </Typography>
        <Chip size="small" label={`${pct}%`} sx={{
          height: 16, fontSize: '0.62rem', fontWeight: 700,
          bgcolor: `${scoreColor(r.anomaly_score)}22`,
          color: scoreColor(r.anomaly_score),
          border: `1px solid ${scoreColor(r.anomaly_score)}55`,
        }} />
      </Box>

      {r.is_anomaly && (
        <Box sx={{ position: 'absolute', top: 4, left: 4, bgcolor: '#ff4081cc', borderRadius: '50%', p: 0.3 }}>
          <Warning sx={{ fontSize: 11, color: '#fff' }} />
        </Box>
      )}

      {showDebug && (
        <Typography sx={{ px: 0.8, pb: 0.5, fontSize: '0.52rem', fontFamily: 'monospace', color: 'text.secondary', opacity: 0.5, wordBreak: 'break-all' }}>
          {hUrl || 'no path'}
        </Typography>
      )}
    </Paper>
  );
}

// ── Lightbox ─────────────────────────────────────────────────────────────────
function Lightbox({ result, onClose }) {
  const hUrl = heatmapUrl(result.heatmap_path);
  const fUrl = frameUrl(result.frame_path);
  const pct = Math.round(result.anomaly_score * 100);

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { bgcolor: '#050d1a', border: '1px solid rgba(0,229,255,0.2)' } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', pb: 1 }}>
        <Box>
          <Typography fontWeight={700}>Frame {result.frame_number}</Typography>
          <Typography variant="caption" color="text.secondary">
            {result.timestamp_ms != null ? `${(result.timestamp_ms / 1000).toFixed(2)}s · ` : ''}
            score: <span style={{ color: scoreColor(result.anomaly_score), fontWeight: 700 }}>{pct}%</span>
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small"><Close /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Grid container>
          <Grid item xs={12} sm={fUrl ? 6 : 12}>
            <Box sx={{ p: 1 }}>
              <Typography variant="caption" color="primary.main" sx={{ display: 'block', mb: 0.5, fontWeight: 700 }}>
                Heatmap overlay (anomaly = red/yellow zones)
              </Typography>
              {hUrl
                ? <Box component="img" src={hUrl} alt="Heatmap" sx={{ width: '100%', borderRadius: 1, display: 'block' }}
                    onError={(e) => { e.target.outerHTML = '<div style="color:#666;padding:2rem;text-align:center;font-size:13px">Image not found — check backend is running</div>' }} />
                : <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>No heatmap saved for this frame</Box>}
            </Box>
          </Grid>
          {fUrl && (
            <Grid item xs={12} sm={6}>
              <Box sx={{ p: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 700 }}>
                  Original frame (thumbnail)
                </Typography>
                <Box component="img" src={fUrl} alt="Frame" sx={{ width: '100%', borderRadius: 1, display: 'block' }}
                  onError={(e) => { e.target.style.display = 'none' }} />
              </Box>
            </Grid>
          )}
        </Grid>

        <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid rgba(0,229,255,0.1)' }}>
          <Grid container spacing={2} sx={{ mb: 1.5 }}>
            {[
              { label: 'Anomaly score', value: `${pct}%`, color: scoreColor(result.anomaly_score) },
              { label: 'Classification', value: result.is_anomaly ? 'Anomaly' : 'Normal', color: result.is_anomaly ? '#ff5252' : '#69f0ae' },
              { label: 'Regions found', value: result.bounding_boxes?.length ?? 0 },
              { label: 'Timestamp', value: result.timestamp_ms != null ? `${(result.timestamp_ms / 1000).toFixed(2)}s` : '—' },
            ].map(({ label, value, color }) => (
              <Grid item xs={6} sm={3} key={label}>
                <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
                <Typography fontWeight={700} sx={{ color: color || 'text.primary', fontFamily: label === 'Timestamp' ? 'monospace' : 'inherit', fontSize: '0.9rem' }}>{value}</Typography>
              </Grid>
            ))}
          </Grid>

          {result.bounding_boxes?.length > 0 && (
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                Anomalous regions (pixel coords from heatmap contours — not object names)
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {result.bounding_boxes.map((bb, i) => (
                  <Chip key={i} size="small" variant="outlined" color="warning"
                    label={`${Math.round(bb.score * 100)}% · x${bb.x} y${bb.y} · ${bb.w}×${bb.h}px`}
                    sx={{ fontFamily: 'monospace', fontSize: '0.62rem' }}
                  />
                ))}
              </Box>
            </Box>
          )}

          <Box sx={{ p: 1, bgcolor: 'rgba(0,0,0,0.35)', borderRadius: 1 }}>
            <Typography sx={{ fontFamily: 'monospace', color: 'text.secondary', fontSize: '0.62rem', display: 'block', wordBreak: 'break-all' }}>
              GET {hUrl || '(no heatmap path)'}
            </Typography>
            {fUrl && <Typography sx={{ fontFamily: 'monospace', color: 'text.secondary', fontSize: '0.62rem', display: 'block', wordBreak: 'break-all', mt: 0.3 }}>
              GET {fUrl}
            </Typography>}
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function HistoryPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [results, setResults] = useState([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [anomaliesOnly, setAnomaliesOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [showDebug, setShowDebug] = useState(false);
  const [minScore, setMinScore] = useState(0);
  const PAGE_SIZE = 24;

  const loadJobs = async () => {
    setLoading(true);
    try { const { data } = await detectionsAPI.listJobs({ limit: 100 }); setJobs(data); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadJobs(); }, []);

  const openResults = async (job) => {
    setSelectedJob(job);
    setDialogOpen(true);
    setResultsLoading(true);
    setResults([]);
    setPage(1);
    setMinScore(0);
    try { const { data } = await detectionsAPI.getJobResults(job.id, { limit: 500, anomalies_only: false }); setResults(data); }
    finally { setResultsLoading(false); }
  };

  const filtered = results.filter((r) => {
    if (anomaliesOnly && !r.is_anomaly) return false;
    if (r.anomaly_score * 100 < minScore) return false;
    return true;
  });
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);

  const anomalyCount = results.filter((r) => r.is_anomaly).length;
  const avgScore = results.length ? (results.reduce((s, r) => s + r.anomaly_score, 0) / results.length * 100).toFixed(1) : '—';
  const maxScore = results.length ? (Math.max(...results.map((r) => r.anomaly_score)) * 100).toFixed(1) : '—';

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Detection History</Typography>
          <Typography variant="body2" color="text.secondary">All detection jobs and their results</Typography>
        </Box>
        <IconButton onClick={loadJobs} sx={{ color: 'primary.main' }}><Refresh /></IconButton>
      </Box>

      <Paper>
        {loading ? <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box> : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Job ID</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Model</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Progress</TableCell>
                <TableCell>Anomalies</TableCell>
                <TableCell>Avg Score</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace', color: 'primary.main' }}>#{job.id}</TableCell>
                  <TableCell><Chip size="small" label={job.job_type} variant="outlined" /></TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', bgcolor: 'rgba(0,229,255,0.08)', px: 1, py: 0.3, borderRadius: 1 }}>
                      {job.model_name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={job.status} sx={{ bgcolor: `${statusColors[job.status] || '#666'}22`, color: statusColors[job.status] || '#666', border: `1px solid ${statusColors[job.status] || '#666'}44`, fontWeight: 700 }} />
                  </TableCell>
                  <TableCell sx={{ minWidth: 120 }}>
                    {job.total_frames > 0 ? (
                      <Box>
                        <LinearProgress variant="determinate" value={(job.processed_frames / job.total_frames) * 100} sx={{ height: 4, borderRadius: 2, mb: 0.3 }} />
                        <Typography variant="caption" color="text.secondary">{job.processed_frames}/{job.total_frames}</Typography>
                      </Box>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    {job.anomaly_count > 0
                      ? <Chip size="small" icon={<Warning sx={{ fontSize: '14px !important' }} />} label={job.anomaly_count} color="error" variant="outlined" />
                      : <Chip size="small" icon={<CheckCircle sx={{ fontSize: '14px !important' }} />} label="0" color="success" variant="outlined" />}
                  </TableCell>
                  <TableCell>
                    {job.average_score != null
                      ? <Typography variant="body2" color={job.average_score > 0.5 ? 'error.main' : 'success.main'} fontWeight={700}>{(job.average_score * 100).toFixed(1)}%</Typography>
                      : '—'}
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>{format(new Date(job.created_at), 'MMM d, HH:mm')}</TableCell>
                  <TableCell>
                    <Tooltip title="View Results">
                      <span>
                        <IconButton size="small" onClick={() => openResults(job)} disabled={job.status !== 'completed'} sx={{ color: 'primary.main' }}>
                          <Visibility />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {!jobs.length && (
                <TableRow><TableCell colSpan={9} align="center" sx={{ py: 5, color: 'text.secondary' }}>No detection jobs yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* Results dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xl" fullWidth
        PaperProps={{ sx: { bgcolor: '#0a1628', height: '90vh', display: 'flex', flexDirection: 'column' } }}>
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1 }}>
            <Box>
              <Typography variant="h6" fontWeight={700}>Job #{selectedJob?.id} — {selectedJob?.model_name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {results.length} frames · {anomalyCount} anomalies · avg {avgScore}% · peak {maxScore}%
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
              <FormControlLabel
                control={<Switch checked={anomaliesOnly} size="small" onChange={(e) => { setAnomaliesOnly(e.target.checked); setPage(1); }} />}
                label={<Typography variant="caption">Anomalies only</Typography>}
              />
              <Tooltip title="Show image URLs">
                <IconButton size="small" onClick={() => setShowDebug(!showDebug)} sx={{ color: showDebug ? 'primary.main' : 'text.secondary' }}>
                  <Code fontSize="small" />
                </IconButton>
              </Tooltip>
              <IconButton size="small" onClick={() => setDialogOpen(false)}><Close /></IconButton>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>Min score: {minScore}%</Typography>
            <Slider value={minScore} onChange={(_, v) => { setMinScore(v); setPage(1); }}
              min={0} max={90} step={5} size="small" sx={{ maxWidth: 180 }} />
            <Typography variant="caption" color="text.secondary">
              Showing {filtered.length} / {results.length}
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ flex: 1, overflow: 'auto', pt: 0.5 }}>
          {resultsLoading ? (
            <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>
          ) : (
            <>
              {/* Stats strip */}
              {results.length > 0 && (
                <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Total frames', value: results.length, color: 'primary.main' },
                    { label: 'Anomalous', value: anomalyCount, color: '#ff5252' },
                    { label: 'Normal', value: results.length - anomalyCount, color: '#69f0ae' },
                    { label: 'Avg score', value: `${avgScore}%`, color: '#ffab40' },
                    { label: 'Peak score', value: `${maxScore}%`, color: '#ff5252' },
                  ].map(({ label, value, color }) => (
                    <Box key={label} sx={{ px: 2, py: 1, bgcolor: 'rgba(0,229,255,0.04)', borderRadius: 2, border: '1px solid rgba(0,229,255,0.08)' }}>
                      <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
                      <Typography fontWeight={700} sx={{ color }}>{value}</Typography>
                    </Box>
                  ))}
                  {/* API_BASE indicator */}
                  <Box sx={{ px: 2, py: 1, bgcolor: 'rgba(0,229,255,0.04)', borderRadius: 2, border: '1px solid rgba(0,229,255,0.08)' }}>
                    <Typography variant="caption" color="text.secondary" display="block">Image server</Typography>
                    <Typography fontWeight={700} sx={{ color: 'text.secondary', fontSize: '0.72rem', fontFamily: 'monospace' }}>{API_BASE}</Typography>
                  </Box>
                </Box>
              )}

              <Grid container spacing={1.5} sx={{ mb: 2 }}>
                {paginated.map((r) => (
                  <Grid item xs={6} sm={4} md={3} lg={2} key={r.id}>
                    <FrameCard r={r} onZoom={setLightbox} showDebug={showDebug} />
                  </Grid>
                ))}
                {!paginated.length && (
                  <Grid item xs={12}>
                    <Alert severity="info">No frames match the current filters.</Alert>
                  </Grid>
                )}
              </Grid>

              {pageCount > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                  <Pagination count={pageCount} page={page} onChange={(_, v) => setPage(v)} color="primary" />
                </Box>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {lightbox && <Lightbox result={lightbox} onClose={() => setLightbox(null)} />}
    </Box>
  );
}