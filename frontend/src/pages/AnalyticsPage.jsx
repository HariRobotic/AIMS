import React, { useEffect, useState } from 'react';
import {
  Box, Grid, Paper, Typography, CircularProgress,
  ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement,
  LineElement, ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { analyticsAPI } from '../services/api';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, PointElement,
  LineElement, ArcElement, Title, Tooltip, Legend, Filler,
);

const CHART_DEFAULTS = {
  responsive: true,
  plugins: { legend: { labels: { color: '#80cbc4' } } },
};

export default function AnalyticsPage() {
  const [summary, setSummary] = useState(null);
  const [timeseries, setTimeseries] = useState([]);
  const [distribution, setDistribution] = useState(null);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [s, t, d] = await Promise.all([
          analyticsAPI.summary(),
          analyticsAPI.timeseries(days),
          analyticsAPI.scoreDistribution(),
        ]);
        setSummary(s.data);
        setTimeseries(t.data);
        setDistribution(d.data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [days]);

  const timeseriesChart = {
    labels: timeseries.map((p) => p.timestamp),
    datasets: [
      {
        label: 'Anomalies',
        data: timeseries.map((p) => p.anomaly_count),
        backgroundColor: 'rgba(255,64,129,0.7)',
        borderColor: '#ff4081',
        borderWidth: 1,
      },
    ],
  };

  const framesChart = {
    labels: timeseries.map((p) => p.timestamp),
    datasets: [
      {
        label: 'Frames Processed',
        data: timeseries.map((p) => p.total_frames),
        borderColor: '#00e5ff',
        backgroundColor: 'rgba(0,229,255,0.1)',
        fill: true, tension: 0.4,
      },
    ],
  };

  const statusData = summary?.jobs_by_status || {};
  const doughnutChart = {
    labels: Object.keys(statusData),
    datasets: [{
      data: Object.values(statusData),
      backgroundColor: ['#69f0ae44', '#00e5ff44', '#ff525244', '#ffab4044'],
      borderColor: ['#69f0ae', '#00e5ff', '#ff5252', '#ffab40'],
      borderWidth: 2,
    }],
  };

  const distChart = distribution ? {
    labels: distribution.bins.map((b) => b.toFixed(2)),
    datasets: [{
      label: 'Frame Count',
      data: distribution.counts,
      backgroundColor: distribution.bins.map((b) =>
        b > 0.5 ? 'rgba(255,64,129,0.6)' : 'rgba(0,229,255,0.4)'
      ),
      borderColor: distribution.bins.map((b) => b > 0.5 ? '#ff4081' : '#00e5ff'),
      borderWidth: 1,
    }],
  } : null;

  const gridAxes = {
    x: { ticks: { color: '#80cbc4' }, grid: { color: 'rgba(0,229,255,0.06)' } },
    y: { ticks: { color: '#80cbc4' }, grid: { color: 'rgba(0,229,255,0.06)' } },
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Analytics</Typography>
          <Typography variant="body2" color="text.secondary">Detection performance and trends</Typography>
        </Box>
        <ToggleButtonGroup
          value={days} exclusive size="small"
          onChange={(_, v) => v && setDays(v)}
        >
          {[7, 14, 30, 90].map((d) => (
            <ToggleButton key={d} value={d} sx={{ px: 2 }}>{d}d</ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>
      ) : (
        <Grid container spacing={2}>
          {/* KPI strip */}
          {[
            { label: 'Total Jobs', value: summary?.total_jobs ?? 0 },
            { label: 'Frames Processed', value: summary?.total_frames_processed ?? 0 },
            { label: 'Anomalies Detected', value: summary?.total_anomalies_detected ?? 0 },
            { label: 'Anomaly Rate', value: `${((summary?.anomaly_rate ?? 0) * 100).toFixed(2)}%` },
            { label: 'Avg Score', value: `${((summary?.average_score ?? 0) * 100).toFixed(1)}%` },
          ].map(({ label, value }) => (
            <Grid item xs={6} sm={4} md={2.4} key={label}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h5" fontWeight={800} color="primary.main">{value}</Typography>
                <Typography variant="caption" color="text.secondary">{label}</Typography>
              </Paper>
            </Grid>
          ))}

          {/* Anomaly count bar chart */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Daily Anomaly Count</Typography>
              {timeseries.length > 0 ? (
                <Bar data={timeseriesChart} options={{ ...CHART_DEFAULTS, scales: gridAxes }} />
              ) : (
                <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>No data</Typography>
              )}
            </Paper>
          </Grid>

          {/* Job status doughnut */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Jobs by Status</Typography>
              {Object.keys(statusData).length > 0 ? (
                <Box sx={{ maxWidth: 220, mx: 'auto' }}>
                  <Doughnut data={doughnutChart} options={{
                    ...CHART_DEFAULTS,
                    cutout: '65%',
                    plugins: { legend: { position: 'bottom', labels: { color: '#80cbc4', padding: 12 } } },
                  }} />
                </Box>
              ) : (
                <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>No data</Typography>
              )}
            </Paper>
          </Grid>

          {/* Frames line chart */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Frames Processed Daily</Typography>
              {timeseries.length > 0 ? (
                <Line data={framesChart} options={{ ...CHART_DEFAULTS, scales: gridAxes }} />
              ) : (
                <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>No data</Typography>
              )}
            </Paper>
          </Grid>

          {/* Score distribution */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Anomaly Score Distribution</Typography>
              {distChart ? (
                <Bar data={distChart} options={{
                  ...CHART_DEFAULTS,
                  scales: {
                    ...gridAxes,
                    x: { ...gridAxes.x, title: { display: true, text: 'Score', color: '#80cbc4' } },
                  },
                }} />
              ) : (
                <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>No data</Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
