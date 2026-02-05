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
    setLoadingDetails(true);
    setSelectedProposal(proposal);

    try {
      // Fetch detailed proposal information including votes and metadata
      const response = await axios.get(`/api/governance/proposals/${proposal.txHash}/${proposal.certIndex}`);
      setSelectedProposal(response.data);
    } catch (err) {
      console.error('Error fetching proposal details:', err);
      // Keep the basic proposal data if detailed fetch fails
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeModal = () => {
    setSelectedProposal(null);
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

              {selectedProposal.voteCount && (
                <div className="detail-section">
                  <h4>Voting Summary</h4>
                  <div className="detail-row">
                    <span className="detail-label">Total Votes:</span>
                    <span className="detail-value">{selectedProposal.voteCount.total}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Yes Votes:</span>
                    <span className="detail-value" style={{color: '#10b981'}}>{selectedProposal.voteCount.yes}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">No Votes:</span>
                    <span className="detail-value" style={{color: '#fca5a5'}}>{selectedProposal.voteCount.no}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Abstain Votes:</span>
                    <span className="detail-value" style={{color: '#9ca3af'}}>{selectedProposal.voteCount.abstain}</span>
                  </div>
                </div>
              )}

              {selectedProposal.votes && selectedProposal.votes.length > 0 && (
                <div className="detail-section">
                  <h4>Votes ({selectedProposal.votes.length})</h4>
                  <div style={{maxHeight: '300px', overflowY: 'auto'}}>
                    <table className="gov-table" style={{fontSize: '0.85rem'}}>
                      <thead>
                        <tr>
                          <th>Voter</th>
                          <th>Vote</th>
                          <th>Block</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedProposal.votes.map((vote, idx) => (
                          <tr key={idx}>
                            <td className="hash-cell" title={vote.voter || vote.drep_id}>
                              {formatHash(vote.voter || vote.drep_id)}
                            </td>
                            <td>
                              <span className={`status-badge ${
                                vote.vote === 'yes' ? 'status-active' :
                                vote.vote === 'no' ? 'status-dropped' :
                                'status-expired'
                              }`}>
                                {vote.vote}
                              </span>
                            </td>
                            <td>{vote.block_height || vote.block || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {selectedProposal.metadata && selectedProposal.metadata.body && (
                <div className="detail-section">
                  <h4>Proposal Information</h4>

                  {selectedProposal.metadata.body.title && (
                    <div className="detail-row">
                      <span className="detail-label">Title:</span>
                      <span className="detail-value">{selectedProposal.metadata.body.title}</span>
                    </div>
                  )}

                  {selectedProposal.metadata.body.abstract && (
                    <div className="detail-row">
                      <span className="detail-label">Abstract:</span>
                      <span className="detail-value">{selectedProposal.metadata.body.abstract}</span>
                    </div>
                  )}

                  {selectedProposal.metadata.body.motivation && (
                    <div className="detail-row">
                      <span className="detail-label">Motivation:</span>
                      <span className="detail-value">{selectedProposal.metadata.body.motivation}</span>
                    </div>
                  )}

                  {selectedProposal.metadata.body.rationale && (
                    <div className="detail-row">
                      <span className="detail-label">Rationale:</span>
                      <span className="detail-value">{selectedProposal.metadata.body.rationale}</span>
                    </div>
                  )}

                  {selectedProposal.metadata.body.authors && selectedProposal.metadata.body.authors.length > 0 && (
                    <div className="detail-row">
                      <span className="detail-label">Authors:</span>
                      <span className="detail-value">
                        {selectedProposal.metadata.body.authors.map(author =>
                          typeof author === 'object' ? author.name || JSON.stringify(author) : author
                        ).join(', ')}
                      </span>
                    </div>
                  )}

                  {selectedProposal.metadata.body.references && selectedProposal.metadata.body.references.length > 0 && (
                    <div className="detail-row">
                      <span className="detail-label">References:</span>
                      <span className="detail-value">
                        {selectedProposal.metadata.body.references.map((ref, idx) => (
                          <span key={idx}>
                            {ref.uri ? (
                              <a href={ref.uri} target="_blank" rel="noopener noreferrer" className="anchor-link" style={{display: 'block', marginBottom: '0.5rem'}}>
                                {ref.label || ref.uri}
                              </a>
                            ) : (
                              <span style={{display: 'block', marginBottom: '0.5rem'}}>{ref.label || JSON.stringify(ref)}</span>
                            )}
                          </span>
                        ))}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {selectedProposal.metadata && (selectedProposal.metadata.url || selectedProposal.metadata.hash) && (
                <div className="detail-section">
                  <h4>Metadata Source</h4>

                  {selectedProposal.metadata.url && (
                    <div className="detail-row">
                      <span className="detail-label">Metadata URL:</span>
                      <a href={selectedProposal.metadata.url} target="_blank" rel="noopener noreferrer" className="detail-value anchor-link">
                        {selectedProposal.metadata.url}
                      </a>
                    </div>
                  )}

                  {selectedProposal.metadata.hash && (
                    <div className="detail-row">
                      <span className="detail-label">Metadata Hash:</span>
                      <span className="detail-value hash">{selectedProposal.metadata.hash}</span>
                    </div>
                  )}
                </div>
              )}

              {loadingDetails && (
                <div className="detail-section" style={{textAlign: 'center', padding: '2rem'}}>
                  <div className="spinner"></div>
                  <p>Loading votes and metadata...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Governance;
