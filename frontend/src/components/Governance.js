import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Governance.css';

function Governance() {
  const [governanceData, setGovernanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [loadingDetails, setLoadingDetails] = useState(false);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchGovernanceData();
    const interval = setInterval(fetchGovernanceData, 300000);
    return () => clearInterval(interval);
  }, []);

  const fetchGovernanceData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/governance/proposals');
      setGovernanceData(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching governance data:', err);
      setError('Failed to fetch governance data. The governance API may not be available yet.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (proposal) => {
    if (proposal.error) return 'status-error';
    if (proposal.status === 'Dropped') return 'status-dropped';
    if (proposal.status === 'Enacted') return 'status-enacted';
    if (proposal.status === 'Expired') return 'status-expired';
    return 'status-active';
  };

  const formatHash = (hash) => {
    if (!hash) return 'N/A';
    return `${hash.substring(0, 12)}...${hash.substring(hash.length - 12)}`;
  };

  const formatADA = (lovelace) => {
    if (!lovelace) return '-';
    return (parseInt(lovelace) / 1000000).toFixed(2);
  };

  const viewProposal = async (proposal) => {
    // Toggle: if clicking the same row, close it
    if (selectedProposal?.txHash === proposal.txHash && selectedProposal?.certIndex === proposal.certIndex) {
      setSelectedProposal(null);
      setLoadingDetails(false);
      return;
    }

    // Set selected immediately so row expands
    setSelectedProposal(proposal);
    setLoadingDetails(true);

    try {
      // Fetch detailed proposal information including votes and metadata
      const response = await axios.get(`/api/governance/proposals/${proposal.txHash}/${proposal.certIndex}`);

      // Only update if this proposal is still selected (user didn't click another row)
      setSelectedProposal(prevSelected => {
        if (prevSelected?.txHash === proposal.txHash && prevSelected?.certIndex === proposal.certIndex) {
          return response.data;
        }
        return prevSelected;
      });
    } catch (err) {
      console.error('Error fetching proposal details:', err);
      // Keep the basic proposal data if detailed fetch fails
    } finally {
      setLoadingDetails(false);
    }
  };


  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return '⇅';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const proposals = governanceData?.proposals || [];
  let filteredProposals = filter === 'all'
    ? proposals
    : proposals.filter(p => p.status?.toLowerCase().includes(filter.toLowerCase()));

  // Apply sorting
  if (sortField) {
    filteredProposals = [...filteredProposals].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Handle different data types
      if (sortField === 'deposit') {
        aVal = parseInt(aVal) || 0;
        bVal = parseInt(bVal) || 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const totalPages = Math.ceil(filteredProposals.length / itemsPerPage);
  const paginatedProposals = filteredProposals.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const statusCounts = {
    total: proposals.length,
    active: proposals.filter(p => p.status === 'Active').length,
    enacted: proposals.filter(p => p.status === 'Enacted').length,
    expired: proposals.filter(p => p.status === 'Expired').length,
    dropped: proposals.filter(p => p.status === 'Dropped').length
  };

  const renderProposalDetails = (proposal) => {
    if (!proposal) {
      return <div className="inline-details">No proposal data available</div>;
    }

    return (
      <div className="inline-details">
        <div className="details-grid">
          <div className="detail-group">
            <h5>Transaction Information</h5>
            <div className="detail-item">
              <span className="detail-key">Transaction Hash</span>
              <span className="detail-val hash-mono">{proposal.txHash || 'N/A'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-key">Certificate Index</span>
              <span className="detail-val">{proposal.certIndex ?? 'N/A'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-key">Type</span>
              <span className="detail-val">{proposal.type || 'Proposal'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-key">Status</span>
              <span className="detail-val">{proposal.status || 'Active'}</span>
            </div>
          </div>

          {(proposal.deposit || proposal.returnAddress) && (
            <div className="detail-group">
              <h5>Financial Information</h5>
              {proposal.deposit && (
                <div className="detail-item">
                  <span className="detail-key">Deposit</span>
                  <span className="detail-val">{formatADA(proposal.deposit)} ADA</span>
                </div>
              )}
              {proposal.returnAddress && (
                <div className="detail-item">
                  <span className="detail-key">Return Address</span>
                  <span className="detail-val hash-mono">{proposal.returnAddress}</span>
                </div>
              )}
            </div>
          )}

          {(proposal.votingProcedure || proposal.votes) && (
            <div className="detail-group">
              <h5>Voting Information</h5>
              {proposal.votes && (
                <div className="detail-item">
                  <span className="detail-key">Total Votes</span>
                  <span className="detail-val">{proposal.votes.length || 0}</span>
                </div>
              )}
              {proposal.voteCount && (
                <>
                  <div className="detail-item">
                    <span className="detail-key">Yes Votes</span>
                    <span className="detail-val vote-yes">{proposal.voteCount.yes || 0}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-key">No Votes</span>
                    <span className="detail-val vote-no">{proposal.voteCount.no || 0}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-key">Abstain</span>
                    <span className="detail-val">{proposal.voteCount.abstain || 0}</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {proposal.metadata && proposal.metadata.json_metadata && proposal.metadata.json_metadata.body && (
          <div className="metadata-section">
            <h5>Proposal Metadata</h5>
            <div className="metadata-content">
              {Object.keys(proposal.metadata.json_metadata.body).map((key) => {
                const value = proposal.metadata.json_metadata.body[key];
                const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');

                if (!value || (Array.isArray(value) && value.length === 0)) return null;

                if (key === 'references' && Array.isArray(value)) {
                  return (
                    <div className="metadata-item" key={key}>
                      <span className="metadata-key">{label}</span>
                      <div className="metadata-val">
                        {value.map((ref, idx) => (
                          <div key={idx} className="reference-item">
                            {ref.uri ? (
                              <a href={ref.uri} target="_blank" rel="noopener noreferrer" className="ref-link">
                                {ref.label || ref.uri}
                              </a>
                            ) : (
                              <span>{ref.label || JSON.stringify(ref)}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                if (typeof value === 'string' && value.length > 300) {
                  return (
                    <div className="metadata-item full-width" key={key}>
                      <span className="metadata-key">{label}</span>
                      <div className="metadata-val text-content">{value}</div>
                    </div>
                  );
                }

                if (Array.isArray(value)) {
                  return (
                    <div className="metadata-item" key={key}>
                      <span className="metadata-key">{label}</span>
                      <div className="metadata-val">{value.join(', ')}</div>
                    </div>
                  );
                }

                if (typeof value === 'object') {
                  return (
                    <div className="metadata-item" key={key}>
                      <span className="metadata-key">{label}</span>
                      <div className="metadata-val"><pre>{JSON.stringify(value, null, 2)}</pre></div>
                    </div>
                  );
                }

                return (
                  <div className="metadata-item" key={key}>
                    <span className="metadata-key">{label}</span>
                    <div className="metadata-val">{String(value)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="governance-container">
        <div className="governance-loading">
          <div className="spinner"></div>
          <p>Loading governance data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="governance-container">
        <div className="governance-error">
          <h3>⚠️ Governance Data Unavailable</h3>
          <p>{error}</p>
          <p className="error-note">
            Note: Governance features require Cardano's Conway era. This may not be available on all networks.
          </p>
          <button onClick={fetchGovernanceData} className="retry-btn">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="governance-container">
      <div className="governance-header">
        <div>
          <h2>🏛️ Cardano Governance Actions</h2>
          <p>On-chain governance proposals and voting</p>
        </div>
        <button onClick={fetchGovernanceData} className="refresh-btn-header">
          🔄 Refresh
        </button>
      </div>

      <div className="gov-stats-grid">
        <div className="gov-stat-card">
          <span className="label">Current Epoch</span>
          <span className="value">{governanceData?.currentEpoch || 'N/A'}</span>
        </div>
        <div className="gov-stat-card">
          <span className="label">Total Proposals</span>
          <span className="value">{statusCounts.total}</span>
        </div>
        <div className="gov-stat-card">
          <span className="label">Active</span>
          <span className="value active">{statusCounts.active}</span>
        </div>
        <div className="gov-stat-card">
          <span className="label">Enacted</span>
          <span className="value enacted">{statusCounts.enacted}</span>
        </div>
        <div className="gov-stat-card">
          <span className="label">Expired</span>
          <span className="value expired">{statusCounts.expired}</span>
        </div>
        <div className="gov-stat-card">
          <span className="label">Dropped</span>
          <span className="value dropped">{statusCounts.dropped}</span>
        </div>
      </div>

      <div className="governance-filters">
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => { setFilter('all'); setPage(1); }}
        >
          All ({statusCounts.total})
        </button>
        <button
          className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
          onClick={() => { setFilter('active'); setPage(1); }}
        >
          Active ({statusCounts.active})
        </button>
        <button
          className={`filter-btn ${filter === 'enacted' ? 'active' : ''}`}
          onClick={() => { setFilter('enacted'); setPage(1); }}
        >
          Enacted ({statusCounts.enacted})
        </button>
        <button
          className={`filter-btn ${filter === 'expired' ? 'active' : ''}`}
          onClick={() => { setFilter('expired'); setPage(1); }}
        >
          Expired ({statusCounts.expired})
        </button>
        <button
          className={`filter-btn ${filter === 'dropped' ? 'active' : ''}`}
          onClick={() => { setFilter('dropped'); setPage(1); }}
        >
          Dropped ({statusCounts.dropped})
        </button>
      </div>

      {paginatedProposals.length === 0 ? (
        <div className="empty-state">
          <p>No governance proposals found.</p>
          <p className="empty-note">
            {filter !== 'all'
              ? 'No proposals match the selected filter.'
              : 'This network may not have Conway governance enabled yet.'}
          </p>
        </div>
      ) : (
        <>
          <div className="gov-table-container">
            <table className="gov-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('txHash')} style={{cursor: 'pointer'}}>
                    Transaction Hash {getSortIcon('txHash')}
                  </th>
                  <th onClick={() => handleSort('type')} style={{cursor: 'pointer'}}>
                    Type {getSortIcon('type')}
                  </th>
                  <th onClick={() => handleSort('status')} style={{cursor: 'pointer'}}>
                    Status {getSortIcon('status')}
                  </th>
                  <th onClick={() => handleSort('deposit')} style={{cursor: 'pointer'}}>
                    Deposit (ADA) {getSortIcon('deposit')}
                  </th>
                  <th onClick={() => handleSort('certIndex')} style={{cursor: 'pointer'}}>
                    Cert Index {getSortIcon('certIndex')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedProposals.map((proposal, index) => (
                  <React.Fragment key={`${proposal.txHash}-${index}`}>
                    <tr
                      className={`gov-table-row ${selectedProposal?.txHash === proposal.txHash && selectedProposal?.certIndex === proposal.certIndex ? 'expanded' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        viewProposal(proposal);
                      }}
                    >
                      <td className="hash-cell" title={proposal.txHash}>
                        <span className="expand-indicator">
                          {selectedProposal?.txHash === proposal.txHash && selectedProposal?.certIndex === proposal.certIndex ? '▼' : '▶'}
                        </span>
                        {formatHash(proposal.txHash)}
                      </td>
                      <td className="type-cell">{proposal.type || 'Proposal'}</td>
                      <td>
                        <span className={`status-badge ${getStatusClass(proposal)}`}>
                          {proposal.status || 'Active'}
                        </span>
                      </td>
                      <td className="deposit-cell">{formatADA(proposal.deposit)}</td>
                      <td className="cert-cell">{proposal.certIndex ?? '-'}</td>
                    </tr>
                    {selectedProposal?.txHash === proposal.txHash && selectedProposal?.certIndex === proposal.certIndex && (
                      <tr className="detail-row-expanded">
                        <td colSpan="5">
                          <div className="detail-panel">
                            <div style={{padding: '20px', background: '#e3f2fd', border: '2px solid #2196f3'}}>
                              <h3 style={{margin: '0 0 10px 0', color: '#1976d2'}}>Detail Panel Test</h3>
                              <p style={{margin: '5px 0'}}><strong>TX Hash:</strong> {selectedProposal?.txHash || 'N/A'}</p>
                              <p style={{margin: '5px 0'}}><strong>Cert Index:</strong> {selectedProposal?.certIndex ?? 'N/A'}</p>
                              <p style={{margin: '5px 0'}}><strong>Type:</strong> {selectedProposal?.type || 'N/A'}</p>
                              <p style={{margin: '5px 0'}}><strong>Status:</strong> {selectedProposal?.status || 'N/A'}</p>
                              <p style={{margin: '5px 0'}}><strong>Loading:</strong> {loadingDetails ? 'YES' : 'NO'}</p>
                              <p style={{margin: '5px 0'}}><strong>Has Metadata:</strong> {selectedProposal?.metadata ? 'YES' : 'NO'}</p>
                              {loadingDetails && (
                                <div className="detail-loading">
                                  <div className="spinner-small"></div>
                                  <span>Loading details...</span>
                                </div>
                              )}
                              {!loadingDetails && (
                                <div style={{marginTop: '15px', padding: '10px', background: '#fff', border: '1px solid #ddd'}}>
                                  <h4>Full Proposal Data:</h4>
                                  <pre style={{fontSize: '11px', maxHeight: '300px', overflow: 'auto'}}>
                                    {JSON.stringify(selectedProposal, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div className="gov-pagination">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              ← Previous
            </button>
            <span>
              Page {page} of {totalPages} ({filteredProposals.length} proposals)
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default Governance;
