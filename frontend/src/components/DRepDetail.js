import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  computeParticipation,
  computeParticipationByType,
  computeChoiceDistribution,
  computeLatencyStats,
  computeLateVoterRate,
  computeAlignment,
  computeEntropyStability,
  computeRollingStats,
  categorizeLatency,
  filterVotes,
  toCsv
} from '../utils/drepAnalytics';
import './DRepDetail.css';

const COLORS = {
  yes: '#10b981',
  no: '#ef4444',
  abstain: '#9ca3af'
};

function DRepDetail({ voterId, onClose }) {
  const [drepData, setDrepData] = useState(null);
  const [votingHistory, setVotingHistory] = useState(null);
  const [allProposals, setAllProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('analytics');
  const [weightMode, setWeightMode] = useState('count');
  const [filters, setFilters] = useState({
    startDate: null,
    endDate: null,
    choice: 'all',
    actionType: 'all',
    status: 'all',
    minVotingPower: null
  });
  const [selectedAction, setSelectedAction] = useState(null);

  useEffect(() => {
    fetchDRepData();
  }, [voterId]);

  const fetchDRepData = async () => {
    try {
      setLoading(true);
      const [drepRes, proposalsRes] = await Promise.all([
        axios.get(`/api/dreps/${voterId}/votes`),
        axios.get('/api/governance/proposals')
      ]);

      setDrepData(drepRes.data);
      setVotingHistory(drepRes.data);
      setAllProposals(proposalsRes.data.proposals || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching DRep data:', err);
      setError('Failed to load DRep data');
    } finally {
      setLoading(false);
    }
  };

  // Memoized analytics computations
  const analytics = useMemo(() => {
    if (!votingHistory || !allProposals) return null;

    const votes = votingHistory.votes || [];
    const participation = computeParticipation(votes, allProposals);
    const participationByType = computeParticipationByType(votes, allProposals);
    const choiceDistribution = computeChoiceDistribution(votes, weightMode);
    const latencyStats = computeLatencyStats(votes, allProposals);
    const lateVoterRate = computeLateVoterRate(votes, allProposals);
    const entropy = computeEntropyStability(votes);
    const rollingStats = computeRollingStats(votes, 30);

    // Compute alignment (if we had network-wide outcomes, we'd pass them here)
    // For now, skip or use a mock
    const alignment = { alignmentRate: 0, contrarian: 0, totalComparable: 0 };

    return {
      participation,
      participationByType,
      choiceDistribution,
      latencyStats,
      lateVoterRate,
      entropy,
      rollingStats,
      alignment
    };
  }, [votingHistory, allProposals, weightMode]);

  // Filtered votes for table
  const filteredVotes = useMemo(() => {
    if (!votingHistory) return [];
    return filterVotes(votingHistory.votes || [], filters);
  }, [votingHistory, filters]);

  const handleExportCSV = () => {
    if (!filteredVotes || filteredVotes.length === 0) return;

    const columns = [
      { key: 'proposalTxHash', label: 'Proposal TX Hash' },
      { key: 'vote', label: 'Vote' },
      { key: 'voting_power', label: 'Voting Power' },
      { key: 'epoch', label: 'Epoch' },
      { key: 'blockTime', label: 'Vote Date' }
    ];

    const csv = toCsv(filteredVotes, columns);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `drep-${voterId}-votes.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatVotingPower = (power) => {
    if (!power) return 'N/A';
    const ada = parseInt(power) / 1000000;
    if (ada >= 1000000000) return `${(ada / 1000000000).toFixed(2)}B ADA`;
    if (ada >= 1000000) return `${(ada / 1000000).toFixed(2)}M ADA`;
    if (ada >= 1000) return `${(ada / 1000).toFixed(2)}K ADA`;
    return `${ada.toFixed(2)} ADA`;
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="drep-detail-modal" onClick={onClose}>
        <div className="drep-detail-content" onClick={e => e.stopPropagation()}>
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading DRep details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="drep-detail-modal" onClick={onClose}>
        <div className="drep-detail-content" onClick={e => e.stopPropagation()}>
          <div className="error-state">
            <h3>Error</h3>
            <p>{error}</p>
            <button onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  if (!votingHistory || !votingHistory.votes || votingHistory.votes.length === 0) {
    return (
      <div className="drep-detail-modal" onClick={onClose}>
        <div className="drep-detail-content" onClick={e => e.stopPropagation()}>
          <div className="drep-detail-header">
            <h2>{votingHistory?.voterName || 'DRep Details'}</h2>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
          <div className="empty-state">
            <p>No voting history available for this DRep.</p>
          </div>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const choiceChartData = [
    { name: 'Yes', value: analytics.choiceDistribution.yes, color: COLORS.yes },
    { name: 'No', value: analytics.choiceDistribution.no, color: COLORS.no },
    { name: 'Abstain', value: analytics.choiceDistribution.abstain, color: COLORS.abstain }
  ];

  const participationByTypeData = Object.entries(analytics.participationByType).map(([type, data]) => ({
    type: type.replace(/_/g, ' '),
    participated: data.voted,
    missed: data.total - data.voted,
    rate: (data.rate * 100).toFixed(1)
  }));

  const latencyDistribution = analytics.latencyStats.distribution.map(d => ({
    latency: d.latencyHours,
    bucket: categorizeLatency(d.latencyHours)
  }));

  // Group by bucket for histogram
  const latencyBuckets = latencyDistribution.reduce((acc, item) => {
    const bucket = item.bucket;
    if (!acc[bucket]) acc[bucket] = 0;
    acc[bucket]++;
    return acc;
  }, {});

  const latencyHistogramData = Object.entries(latencyBuckets).map(([bucket, count]) => ({
    bucket,
    count
  }));

  return (
    <div className="drep-detail-modal" onClick={onClose}>
      <div className="drep-detail-content" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="drep-detail-header">
          <div>
            <h2>{votingHistory.voterName || 'DRep Details'}</h2>
            <p className="drep-id">{voterId}</p>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            Voting Analytics
          </button>
          <button
            className={`tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            Vote History
          </button>
        </div>

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="tab-content">
            {/* Weight mode toggle */}
            <div className="controls-bar">
              <div className="weight-toggle">
                <label>
                  <input
                    type="radio"
                    value="count"
                    checked={weightMode === 'count'}
                    onChange={() => setWeightMode('count')}
                  />
                  Count-based
                </label>
                <label>
                  <input
                    type="radio"
                    value="stake"
                    checked={weightMode === 'stake'}
                    onChange={() => setWeightMode('stake')}
                  />
                  Stake-weighted
                </label>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="kpi-grid">
              <div className="kpi-card">
                <span className="kpi-label">Participation Rate</span>
                <span className="kpi-value">{(analytics.participation * 100).toFixed(1)}%</span>
                <span className="kpi-subtitle">
                  {votingHistory.totalVotes} / {allProposals.length} actions
                </span>
              </div>

              <div className="kpi-card">
                <span className="kpi-label">Median Latency</span>
                <span className="kpi-value">
                  {analytics.latencyStats.median > 24
                    ? `${(analytics.latencyStats.median / 24).toFixed(1)}d`
                    : `${analytics.latencyStats.median.toFixed(1)}h`
                  }
                </span>
                <span className="kpi-subtitle">Time to vote</span>
              </div>

              <div className="kpi-card">
                <span className="kpi-label">Late Voter Rate</span>
                <span className="kpi-value">{(analytics.lateVoterRate * 100).toFixed(1)}%</span>
                <span className="kpi-subtitle">Last 20% of window</span>
              </div>

              <div className="kpi-card">
                <span className="kpi-label">Abstain Rate</span>
                <span className="kpi-value">
                  {((analytics.choiceDistribution.abstain / votingHistory.totalVotes) * 100).toFixed(1)}%
                </span>
                <span className="kpi-subtitle">
                  {analytics.choiceDistribution.abstain} abstain votes
                </span>
              </div>

              <div className="kpi-card">
                <span className="kpi-label">Consistency Score</span>
                <span className="kpi-value">{(3 - analytics.entropy).toFixed(2)}/3</span>
                <span className="kpi-subtitle">Lower entropy = more consistent</span>
              </div>

              <div className="kpi-card">
                <span className="kpi-label">Voting Power</span>
                <span className="kpi-value">{formatVotingPower(votingHistory.votingPower)}</span>
                <span className="kpi-subtitle">Current delegation</span>
              </div>
            </div>

            {/* Charts Row */}
            <div className="charts-grid">
              {/* Choice Distribution */}
              <div className="chart-card">
                <h3>Vote Distribution</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={choiceChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={entry => `${entry.name}: ${entry.value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {choiceChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Participation by Type */}
              <div className="chart-card">
                <h3>Participation by Action Type</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={participationByTypeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="participated" fill="#10b981" name="Voted" />
                    <Bar dataKey="missed" fill="#ef4444" name="Missed" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Latency Distribution */}
              <div className="chart-card full-width">
                <h3>Voting Latency Distribution</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={latencyHistogramData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="bucket" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b9dff" name="Votes" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="tab-content">
            {/* Filters */}
            <div className="filters-bar">
              <select
                value={filters.choice}
                onChange={e => setFilters({ ...filters, choice: e.target.value })}
              >
                <option value="all">All Votes</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="abstain">Abstain</option>
              </select>

              <select
                value={filters.status}
                onChange={e => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="all">All Statuses</option>
                <option value="Enacted">Enacted</option>
                <option value="Dropped">Dropped</option>
                <option value="Active">Active</option>
                <option value="Expired">Expired</option>
              </select>

              <button className="export-btn" onClick={handleExportCSV}>
                Export CSV
              </button>
            </div>

            {/* Votes Table */}
            <div className="votes-table-container">
              <table className="votes-table">
                <thead>
                  <tr>
                    <th>Action Type</th>
                    <th>Vote</th>
                    <th>Status</th>
                    <th>Voting Power</th>
                    <th>Epoch</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVotes.map((vote, idx) => (
                    <tr key={idx} className={`vote-row vote-${vote.vote}`}>
                      <td>{vote.proposal?.type || 'Unknown'}</td>
                      <td>
                        <span className={`vote-badge vote-${vote.vote}`}>
                          {vote.vote.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge status-${vote.proposal?.status?.toLowerCase() || 'unknown'}`}>
                          {vote.proposal?.status || 'Unknown'}
                        </span>
                      </td>
                      <td className="power-cell">{formatVotingPower(vote.voting_power)}</td>
                      <td className="epoch-cell">{vote.epoch}</td>
                      <td>{formatDate(vote.blockTime)}</td>
                      <td>
                        <button
                          className="view-btn-small"
                          onClick={() => setSelectedAction(vote)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredVotes.length === 0 && (
                <div className="empty-table-state">
                  <p>No votes match the current filters.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Detail Drawer */}
        {selectedAction && (
          <div className="action-drawer">
            <div className="drawer-header">
              <h3>Action Details</h3>
              <button onClick={() => setSelectedAction(null)}>×</button>
            </div>
            <div className="drawer-content">
              <div className="detail-row">
                <span className="detail-label">Type:</span>
                <span>{selectedAction.proposal?.type || 'Unknown'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Status:</span>
                <span className={`status-badge status-${selectedAction.proposal?.status?.toLowerCase()}`}>
                  {selectedAction.proposal?.status || 'Unknown'}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">DRep Vote:</span>
                <span className={`vote-badge vote-${selectedAction.vote}`}>
                  {selectedAction.vote.toUpperCase()}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Voting Power:</span>
                <span>{formatVotingPower(selectedAction.voting_power)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Epoch:</span>
                <span>{selectedAction.epoch}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Voted At:</span>
                <span>{formatDate(selectedAction.blockTime)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Proposal TX:</span>
                <span className="hash-value">{selectedAction.proposalTxHash?.substring(0, 20)}...</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DRepDetail;
