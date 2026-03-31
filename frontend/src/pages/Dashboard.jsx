import React, { useEffect, useState } from 'react';
import {
  Box, Grid, Paper, Typography, Chip, CircularProgress, LinearProgress,
  Table, TableBody, TableCell, TableHead, TableRow, Avatar,
} from '@mui/material';
import { BugReport, CheckCircle, AccessTime, Speed, Warning } from '@mui/icons-material';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { analyticsAPI } from '../services/api';
import { format } from 'date-fns';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const StatCard = ({ icon, label, value, sub, color = '#00e5ff', loading }) => (
  <Paper sx={{ p: 3, height: '100%' }}>
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
      <Box sx={{
        p: 1.5, borderRadius: 2,
        background: `${color}18`,
        border: `1px solid ${color}33`,
        color,
      }}>
        {icon}
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1.5, fontSize: '0.65rem' }}>
          {label}
        </Typography>
        {loading ? (
          <CircularProgress size={20} sx={{ display: 'block', mt: 0.5 }} />
        ) : (
          <Typography variant="h4" fontWeight={700} color={color} sx={{ lineHeight: 1.1 }}>
            {value}
          </Typography>
        )}
        {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
      </Box>
    </Box>
  </Paper>
);

const statusColors = {
  completed: '#69f0ae', running: '#00e5ff', failed: '#ff5252', pending: '#ffab40',
};

const StatusChip = ({ status }) => (
  <Chip
    size="small"
    label={status}
    sx={{
      bgcolor: `${statusColors[status] || '#666'}22`,
      color: statusColors[status] || '#666',
      border: `1px solid ${statusColors[status] || '#666'}44`,
      fontWeight: 700, fontSize: '0.7rem',
    }}
  />
);

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [timeseries, setTimeseries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, t] = await Promise.all([
          analyticsAPI.summary(),
          analyticsAPI.timeseries(14),
        ]);
        setSummary(s.data);
        setTimeseries(t.data);
      } finally {
        setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  const chartData = {
    labels: timeseries.map((p) => p.timestamp),
    datasets: [
      {
        label: 'Anomalies Detected',
        data: timeseries.map((p) => p.anomaly_count),
        borderColor: '#ff4081',
        backgroundColor: 'rgba(255,64,129,0.1)',
        fill: true, tension: 0.4, pointRadius: 4,
      },
      {
        label: 'Avg Score',
        data: timeseries.map((p) => (p.average_score * 100).toFixed(1)),
        borderColor: '#00e5ff',
        backgroundColor: 'rgba(0,229,255,0.05)',
        fill: true, tension: 0.4, pointRadius: 4,
        yAxisID: 'y1',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { labels: { color: '#80cbc4', font: { size: 12 } } }, tooltip: {} },
    scales: {
      x: { ticks: { color: '#80cbc4' }, grid: { color: 'rgba(0,229,255,0.05)' } },
      y: { ticks: { color: '#ff4081' }, grid: { color: 'rgba(0,229,255,0.05)' } },
      y1: { position: 'right', ticks: { color: '#00e5ff' }, grid: { drawOnChartArea: false } },
    },
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800} color="text.primary">Dashboard</Typography>
        <Typography variant="body2" color="text.secondary">Real-time anomaly detection overview</Typography>
      </Box>

      {/* Stat cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { icon: <BugReport />, label: 'Total Anomalies', value: summary?.total_anomalies_detected ?? '—', color: '#ff4081' },
          { icon: <Speed />, label: 'Anomaly Rate', value: summary ? `${(summary.anomaly_rate * 100).toFixed(1)}%` : '—', color: '#ffab40' },
          { icon: <CheckCircle />, label: 'Jobs Completed', value: summary?.jobs_by_status?.completed ?? '—', color: '#69f0ae' },
          { icon: <AccessTime />, label: 'Frames Processed', value: summary?.total_frames_processed ?? '—', color: '#00e5ff' },
        ].map((props) => (
          <Grid item xs={12} sm={6} lg={3} key={props.label}>
            <StatCard {...props} loading={loading} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
        {/* Timeseries chart */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
              Anomaly Trends (14 days)
            </Typography>
            {timeseries.length > 0 ? (
              <Line data={chartData} options={chartOptions} />
            ) : (
              <Box sx={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography color="text.secondary">No data yet. Run some detection jobs.</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Job status breakdown */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Job Status</Typography>
            {summary ? (
              <Box>
                {Object.entries(summary.jobs_by_status).map(([status, count]) => (
                  <Box key={status} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <StatusChip status={status} />
                      <Typography variant="caption" fontWeight={700}>{count}</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={(count / summary.total_jobs) * 100}
                      sx={{
                        height: 4, borderRadius: 2,
                        bgcolor: 'rgba(255,255,255,0.05)',
                        '& .MuiLinearProgress-bar': { bgcolor: statusColors[status] || '#666' },
                      }}
                    />
                  </Box>
                ))}
                {Object.keys(summary.jobs_by_status).length === 0 && (
                  <Typography color="text.secondary" variant="body2">No jobs yet</Typography>
                )}
              </Box>
            ) : (
              <CircularProgress />
            )}
          </Paper>
        </Grid>

        {/* Recent activity */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Recent Activity</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Job ID</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Anomalies</TableCell>
                  <TableCell>Avg Score</TableCell>
                  <TableCell>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(summary?.recent_activity || []).map((job) => (
                  <TableRow key={job.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace', color: 'primary.main' }}>#{job.id}</TableCell>
                    <TableCell>
                      <Chip size="small" label={job.job_type} variant="outlined" />
                    </TableCell>
                    <TableCell><StatusChip status={job.status} /></TableCell>
                    <TableCell>
                      {job.anomaly_count > 0
                        ? <Chip size="small" icon={<Warning sx={{ fontSize: '14px !important' }} />} label={job.anomaly_count} color="error" variant="outlined" />
                        : <Chip size="small" label="0" color="success" variant="outlined" />}
                    </TableCell>
                    <TableCell>{job.average_score != null ? (job.average_score * 100).toFixed(1) + '%' : '—'}</TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                      {job.created_at ? format(new Date(job.created_at), 'MMM d, HH:mm') : '—'}
                    </TableCell>
                  </TableRow>
                ))}
                {!summary?.recent_activity?.length && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                      No activity yet. Upload media and run a detection job.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
