import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Governance.css';

function Governance() {
  const [governanceData, setGovernanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchGovernanceData();
    // Refresh every 5 minutes
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

  const getStatusBadge = (proposal) => {
    if (proposal.error) return { text: 'Error', className: 'status-error' };
    if (proposal.expired) return { text: 'Expired', className: 'status-expired' };
    if (proposal.enacted) return { text: 'Enacted', className: 'status-enacted' };
    if (proposal.dropped) return { text: 'Dropped', className: 'status-dropped' };
    return { text: 'Active', className: 'status-active' };
  };

  const getProposalType = (proposal) => {
    if (proposal.govActionType) return proposal.govActionType;
    if (proposal.type) return proposal.type;
    return 'Unknown';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const viewProposal = (proposal) => {
    setSelectedProposal(proposal);
  };

  const closeModal = () => {
    setSelectedProposal(null);
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

  const proposals = governanceData?.proposals || [];
  const filteredProposals = filter === 'all'
    ? proposals
    : proposals.filter(p => {
        const status = getStatusBadge(p);
        return status.className.includes(filter);
      });

  return (
    <div className="governance-container">
      <div className="governance-header">
        <div>
          <h2>🏛️ Cardano Governance</h2>
          <p>On-chain governance proposals and voting</p>
        </div>
        <div className="governance-stats">
          <div className="stat-item">
            <span className="label">Current Epoch:</span>
            <span className="value">{governanceData?.currentEpoch || 'N/A'}</span>
          </div>
          <div className="stat-item">
            <span className="label">Total Proposals:</span>
            <span className="value">{governanceData?.totalProposals || 0}</span>
          </div>
        </div>
      </div>

      <div className="governance-filters">
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
          onClick={() => setFilter('active')}
        >
          Active
        </button>
        <button
          className={`filter-btn ${filter === 'enacted' ? 'active' : ''}`}
          onClick={() => setFilter('enacted')}
        >
          Enacted
        </button>
        <button
          className={`filter-btn ${filter === 'expired' ? 'active' : ''}`}
          onClick={() => setFilter('expired')}
        >
          Expired
        </button>
      </div>

      {filteredProposals.length === 0 ? (
        <div className="empty-state">
          <p>No governance proposals found.</p>
          <p className="empty-note">
            This could mean governance features are not yet active on this network, or there are no proposals matching your filter.
          </p>
        </div>
      ) : (
        <div className="proposals-grid">
          {filteredProposals.map((proposal, index) => {
            const status = getStatusBadge(proposal);
            return (
              <div key={`${proposal.txHash}-${index}`} className="proposal-card">
                <div className="proposal-header">
                  <div className="proposal-type">{getProposalType(proposal)}</div>
                  <div className={`proposal-status ${status.className}`}>
                    {status.text}
                  </div>
                </div>

                <div className="proposal-body">
                  <div className="proposal-info">
                    <div className="info-row">
                      <span className="label">TX Hash:</span>
                      <span className="value hash" title={proposal.txHash}>
                        {proposal.txHash?.substring(0, 16)}...
                      </span>
                    </div>
                    {proposal.certIndex !== undefined && (
                      <div className="info-row">
                        <span className="label">Cert Index:</span>
                        <span className="value">{proposal.certIndex}</span>
                      </div>
                    )}
                    {proposal.anchorUrl && (
                      <div className="info-row">
                        <span className="label">Anchor:</span>
                        <a
                          href={proposal.anchorUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="anchor-link"
                        >
                          View Details
                        </a>
                      </div>
                    )}
                  </div>

                  <button
                    className="view-details-btn"
                    onClick={() => viewProposal(proposal)}
                  >
                    View Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedProposal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Proposal Details</h3>
              <button className="close-btn" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body">
              <pre>{JSON.stringify(selectedProposal, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}

      <div className="governance-footer">
        <p>Last updated: {governanceData?.fetchedAt ? new Date(governanceData.fetchedAt).toLocaleString() : 'Unknown'}</p>
        <button onClick={fetchGovernanceData} className="refresh-btn">
          🔄 Refresh
        </button>
      </div>
    </div>
  );
}

export default Governance;
