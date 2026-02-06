import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DRepDetail from './DRepDetail';
import './DReps.css';

function DReps() {
  const [dreps, setDreps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDRep, setSelectedDRep] = useState(null);
  const [filter, setFilter] = useState('all');
  const [sortField, setSortField] = useState('totalVotes');
  const [sortDirection, setSortDirection] = useState('desc');

  useEffect(() => {
    fetchDReps();
  }, []);

  const fetchDReps = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/dreps');
      setDreps(response.data.dreps);
      setError(null);
    } catch (err) {
      console.error('Error fetching DReps:', err);
      setError('Failed to fetch DReps data');
    } finally {
      setLoading(false);
    }
  };


  const formatVoterName = (drep) => {
    if (drep.voterGivenName || drep.voterName) {
      return drep.voterGivenName || drep.voterName;
    }

    const id = drep.voterId;
    if (id.startsWith('pool')) {
      return drep.voterTicker || `Pool: ${id.substring(0, 12)}...`;
    }
    if (id.startsWith('drep')) {
      return `DRep: ${id.substring(0, 12)}...`;
    }
    return id.substring(0, 20) + '...';
  };

  const formatVotingPower = (power) => {
    if (!power) return 'N/A';
    const ada = parseInt(power) / 1000000;
    if (ada >= 1000000000) {
      return `${(ada / 1000000000).toFixed(2)}B ADA`;
    } else if (ada >= 1000000) {
      return `${(ada / 1000000).toFixed(2)}M ADA`;
    } else if (ada >= 1000) {
      return `${(ada / 1000).toFixed(2)}K ADA`;
    }
    return `${ada.toFixed(2)} ADA`;
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  };

  const formatHash = (hash) => {
    if (!hash) return 'N/A';
    return `${hash.substring(0, 12)}...${hash.substring(hash.length - 12)}`;
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return '⇅';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  let filteredDReps = dreps;
  if (filter === 'drep') {
    filteredDReps = dreps.filter(d => d.voterId.startsWith('drep'));
  } else if (filter === 'pool') {
    filteredDReps = dreps.filter(d => d.voterId.startsWith('pool'));
  }

  // Apply sorting
  if (sortField) {
    filteredDReps = [...filteredDReps].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === 'votingPower') {
        aVal = parseInt(aVal) || 0;
        bVal = parseInt(bVal) || 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  if (loading) {
    return (
      <div className="dreps-container">
        <div className="dreps-loading">
          <div className="spinner"></div>
          <p>Loading DReps...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dreps-container">
        <div className="dreps-error">
          <h3>Error</h3>
          <p>{error}</p>
          <button className="retry-btn" onClick={fetchDReps}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="dreps-container">
      <div className="dreps-header">
        <div>
          <h2>DReps & Stake Pools</h2>
          <p>Voting history and participation statistics</p>
        </div>
        <button className="refresh-btn-header" onClick={fetchDReps}>
          Refresh Data
        </button>
      </div>

      <div className="dreps-stats-grid">
        <div className="drep-stat-card">
          <span className="label">Total Voters</span>
          <span className="value">{dreps.length}</span>
        </div>
        <div className="drep-stat-card">
          <span className="label">DReps</span>
          <span className="value drep">{dreps.filter(d => d.voterId.startsWith('drep')).length}</span>
        </div>
        <div className="drep-stat-card">
          <span className="label">Stake Pools</span>
          <span className="value pool">{dreps.filter(d => d.voterId.startsWith('pool')).length}</span>
        </div>
        <div className="drep-stat-card">
          <span className="label">Total Votes Cast</span>
          <span className="value total">{dreps.reduce((sum, d) => sum + d.totalVotes, 0)}</span>
        </div>
      </div>

      <div className="dreps-filters">
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All Voters
        </button>
        <button
          className={`filter-btn ${filter === 'drep' ? 'active' : ''}`}
          onClick={() => setFilter('drep')}
        >
          DReps Only
        </button>
        <button
          className={`filter-btn ${filter === 'pool' ? 'active' : ''}`}
          onClick={() => setFilter('pool')}
        >
          Pools Only
        </button>
      </div>

      <div className="dreps-table-container">
        <table className="dreps-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('voterName')}>
                Voter {getSortIcon('voterName')}
              </th>
              <th onClick={() => handleSort('voterType')}>
                Type {getSortIcon('voterType')}
              </th>
              <th onClick={() => handleSort('votingPower')}>
                Voting Power {getSortIcon('votingPower')}
              </th>
              <th onClick={() => handleSort('totalVotes')}>
                Total Votes {getSortIcon('totalVotes')}
              </th>
              <th onClick={() => handleSort('yesVotes')}>
                Yes {getSortIcon('yesVotes')}
              </th>
              <th onClick={() => handleSort('noVotes')}>
                No {getSortIcon('noVotes')}
              </th>
              <th onClick={() => handleSort('abstainVotes')}>
                Abstain {getSortIcon('abstainVotes')}
              </th>
              <th onClick={() => handleSort('lastVoteDate')}>
                Last Vote {getSortIcon('lastVoteDate')}
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDReps.map((drep) => (
              <tr key={drep.voterId} className="dreps-table-row">
                <td className="voter-name-cell">
                  <div className="voter-name-info">
                    <span className="voter-name">{formatVoterName(drep)}</span>
                    {drep.voterTicker && (
                      <span className="ticker-badge">[{drep.voterTicker}]</span>
                    )}
                  </div>
                </td>
                <td className="type-cell">
                  <span className={`type-badge type-${drep.voterType?.toLowerCase() || 'unknown'}`}>
                    {drep.voterType || 'Unknown'}
                  </span>
                </td>
                <td className="power-cell">{formatVotingPower(drep.votingPower)}</td>
                <td className="votes-cell total">{drep.totalVotes}</td>
                <td className="votes-cell yes">{drep.yesVotes}</td>
                <td className="votes-cell no">{drep.noVotes}</td>
                <td className="votes-cell abstain">{drep.abstainVotes}</td>
                <td className="date-cell">{formatDate(drep.lastVoteDate)}</td>
                <td className="actions-cell">
                  <button
                    className="view-history-btn"
                    onClick={() => setSelectedDRep(drep.voterId)}
                  >
                    View Analytics
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedDRep && (
        <DRepDetail
          voterId={selectedDRep}
          onClose={() => setSelectedDRep(null)}
        />
      )}
    </div>
  );
}

export default DReps;
