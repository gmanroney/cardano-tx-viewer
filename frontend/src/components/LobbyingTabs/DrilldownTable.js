import React, { useState, useMemo } from 'react';
import { exportLobbyingBrief } from '../../utils/lobbyingAnalytics';
import './DrilldownTable.css';

function DrilldownTable({ votes, voterId, drepName, analytics }) {
  const [filters, setFilters] = useState({
    type: 'all',
    vote: 'all',
    dateFrom: '',
    dateTo: ''
  });

  const [sortBy, setSortBy] = useState('blockTime');
  const [sortOrder, setSortOrder] = useState('desc');

  const filteredAndSortedVotes = useMemo(() => {
    if (!votes) return [];

    let filtered = [...votes];

    // Apply filters
    if (filters.type !== 'all') {
      filtered = filtered.filter(v => v.proposal?.type === filters.type);
    }

    if (filters.vote !== 'all') {
      filtered = filtered.filter(v => v.vote?.toLowerCase() === filters.vote);
    }

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(v => new Date(v.blockTime) >= fromDate);
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      filtered = filtered.filter(v => new Date(v.blockTime) <= toDate);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal, bVal;

      switch (sortBy) {
        case 'blockTime':
          aVal = new Date(a.blockTime);
          bVal = new Date(b.blockTime);
          break;
        case 'type':
          aVal = a.proposal?.type || '';
          bVal = b.proposal?.type || '';
          break;
        case 'vote':
          aVal = a.vote || '';
          bVal = b.vote || '';
          break;
        case 'latency':
          aVal = a.latency || 0;
          bVal = b.latency || 0;
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [votes, filters, sortBy, sortOrder]);

  const handleExportCSV = () => {
    const headers = ['Proposal ID', 'Type', 'Vote', 'Block Time', 'Latency (hours)', 'Voting Power'];
    const rows = filteredAndSortedVotes.map(v => [
      v.proposalId || 'N/A',
      v.proposal?.type || 'unknown',
      v.vote || 'N/A',
      v.blockTime || 'N/A',
      v.latency != null ? v.latency.toFixed(2) : 'N/A',
      v.votingPower || 'N/A'
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `drep-votes-${voterId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportBrief = () => {
    const brief = exportLobbyingBrief(filteredAndSortedVotes, drepName, analytics);
    const blob = new Blob([brief], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lobbying-brief-${voterId}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Get unique types for filter
  const types = useMemo(() => {
    const uniqueTypes = new Set(votes?.map(v => v.proposal?.type).filter(Boolean));
    return Array.from(uniqueTypes).sort();
  }, [votes]);

  if (!votes || votes.length === 0) {
    return (
      <div className="drilldown-table">
        <div className="empty-state">
          <p>No voting data available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="drilldown-table">
      <h3>Detailed Drilldown</h3>

      {/* Filters and Export */}
      <div className="controls-section">
        <div className="filters-row">
          <div className="filter-group">
            <label>Type:</label>
            <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
              <option value="all">All Types</option>
              {types.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Vote:</label>
            <select value={filters.vote} onChange={(e) => setFilters({ ...filters, vote: e.target.value })}>
              <option value="all">All Votes</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
              <option value="abstain">Abstain</option>
            </select>
          </div>

          <div className="filter-group">
            <label>From:</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
            />
          </div>

          <div className="filter-group">
            <label>To:</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            />
          </div>
        </div>

        <div className="export-row">
          <button className="export-btn csv-btn" onClick={handleExportCSV}>
            📄 Export CSV
          </button>
          <button className="export-btn brief-btn" onClick={handleExportBrief}>
            📋 Export Lobbying Brief
          </button>
          <span className="result-count">
            {filteredAndSortedVotes.length} of {votes.length} votes
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="votes-table-container">
        <table className="votes-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('blockTime')} className="sortable">
                Date {sortBy === 'blockTime' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th>Proposal ID</th>
              <th onClick={() => handleSort('type')} className="sortable">
                Type {sortBy === 'type' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th onClick={() => handleSort('vote')} className="sortable">
                Vote {sortBy === 'vote' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th onClick={() => handleSort('latency')} className="sortable">
                Latency {sortBy === 'latency' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th>Voting Power</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedVotes.map((vote, idx) => (
              <tr key={idx}>
                <td>{new Date(vote.blockTime).toLocaleDateString()}</td>
                <td className="proposal-id">
                  {vote.proposalId?.substring(0, 12) || 'N/A'}...
                </td>
                <td>
                  <span className="type-badge">{vote.proposal?.type || 'unknown'}</span>
                </td>
                <td>
                  <span className={`vote-badge ${vote.vote?.toLowerCase()}`}>
                    {vote.vote || 'N/A'}
                  </span>
                </td>
                <td className="latency-cell">
                  {vote.latency != null ? (
                    <span className={`latency-value ${vote.latency < 24 ? 'fast' : vote.latency < 48 ? 'moderate' : 'slow'}`}>
                      {vote.latency.toFixed(1)}h
                    </span>
                  ) : (
                    'N/A'
                  )}
                </td>
                <td className="power-cell">
                  {vote.votingPower ? (parseFloat(vote.votingPower) / 1_000_000).toFixed(1) + 'M' : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredAndSortedVotes.length === 0 && (
        <div className="no-results">
          <p>No votes match the selected filters.</p>
        </div>
      )}
    </div>
  );
}

export default DrilldownTable;
