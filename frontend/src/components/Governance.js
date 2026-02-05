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

  const viewProposal = (proposal) => {
    setSelectedProposal(proposal);
  };

  const closeModal = () => {
    setSelectedProposal(null);
  };

  const proposals = governanceData?.proposals || [];
  const filteredProposals = filter === 'all'
    ? proposals
    : proposals.filter(p => p.status?.toLowerCase().includes(filter.toLowerCase()));

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
                  <th>Transaction Hash</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Deposit (ADA)</th>
                  <th>Cert Index</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProposals.map((proposal, index) => (
                  <tr key={`${proposal.txHash}-${index}`}>
                    <td className="hash-cell" title={proposal.txHash}>
                      {formatHash(proposal.txHash)}
                    </td>
                    <td className="type-cell">{proposal.type || 'Proposal'}</td>
                    <td>
                      <span className={`status-badge ${getStatusClass(proposal)}`}>
                        {proposal.status || 'Active'}
                      </span>
                    </td>
                    <td>{formatADA(proposal.deposit)}</td>
                    <td>{proposal.certIndex ?? '-'}</td>
                    <td>
                      <button
                        className="view-btn"
                        onClick={() => viewProposal(proposal)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
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

      {selectedProposal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Governance Action Details</h3>
              <button className="close-btn" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-section">
                <h4>Transaction Information</h4>
                <div className="detail-row">
                  <span className="detail-label">Transaction Hash:</span>
                  <span className="detail-value hash">{selectedProposal.txHash}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Certificate Index:</span>
                  <span className="detail-value">{selectedProposal.certIndex ?? 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Type:</span>
                  <span className="detail-value">{selectedProposal.type || 'Proposal'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Status:</span>
                  <span className={`detail-value status-badge ${getStatusClass(selectedProposal)}`}>
                    {selectedProposal.status || 'Active'}
                  </span>
                </div>
              </div>

              {(selectedProposal.deposit || selectedProposal.returnAddress) && (
                <div className="detail-section">
                  <h4>Financial Information</h4>
                  {selectedProposal.deposit && (
                    <div className="detail-row">
                      <span className="detail-label">Deposit:</span>
                      <span className="detail-value">{formatADA(selectedProposal.deposit)} ADA</span>
                    </div>
                  )}
                  {selectedProposal.returnAddress && (
                    <div className="detail-row">
                      <span className="detail-label">Return Address:</span>
                      <span className="detail-value hash">{selectedProposal.returnAddress}</span>
                    </div>
                  )}
                </div>
              )}

              {(selectedProposal.enactedEpoch || selectedProposal.expiredEpoch || selectedProposal.droppedEpoch) && (
                <div className="detail-section">
                  <h4>Lifecycle</h4>
                  {selectedProposal.enactedEpoch !== null && selectedProposal.enactedEpoch !== undefined && (
                    <div className="detail-row">
                      <span className="detail-label">Enacted Epoch:</span>
                      <span className="detail-value">{selectedProposal.enactedEpoch}</span>
                    </div>
                  )}
                  {selectedProposal.expiredEpoch !== null && selectedProposal.expiredEpoch !== undefined && (
                    <div className="detail-row">
                      <span className="detail-label">Expired Epoch:</span>
                      <span className="detail-value">{selectedProposal.expiredEpoch}</span>
                    </div>
                  )}
                  {selectedProposal.droppedEpoch !== null && selectedProposal.droppedEpoch !== undefined && (
                    <div className="detail-row">
                      <span className="detail-label">Dropped Epoch:</span>
                      <span className="detail-value">{selectedProposal.droppedEpoch}</span>
                    </div>
                  )}
                  {selectedProposal.expiresAt && (
                    <div className="detail-row">
                      <span className="detail-label">Expires At:</span>
                      <span className="detail-value">{selectedProposal.expiresAt}</span>
                    </div>
                  )}
                </div>
              )}

              {(selectedProposal.anchorUrl || selectedProposal.anchorHash || selectedProposal.votingAnchor) && (
                <div className="detail-section">
                  <h4>Anchor Information</h4>
                  {selectedProposal.anchorUrl && (
                    <div className="detail-row">
                      <span className="detail-label">Anchor URL:</span>
                      <a
                        href={selectedProposal.anchorUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="detail-value anchor-link"
                      >
                        {selectedProposal.anchorUrl}
                      </a>
                    </div>
                  )}
                  {selectedProposal.anchorHash && (
                    <div className="detail-row">
                      <span className="detail-label">Anchor Hash:</span>
                      <span className="detail-value hash">{selectedProposal.anchorHash}</span>
                    </div>
                  )}
                </div>
              )}

              {selectedProposal.metadata && (
                <div className="detail-section">
                  <h4>Metadata</h4>
                  <pre className="metadata-pre">{JSON.stringify(selectedProposal.metadata, null, 2)}</pre>
                </div>
              )}

              <div className="detail-section">
                <h4>Raw Data</h4>
                <pre className="metadata-pre">{JSON.stringify(selectedProposal, null, 2)}</pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Governance;
