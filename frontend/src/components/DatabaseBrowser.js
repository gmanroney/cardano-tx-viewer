import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './DatabaseBrowser.css';

function DatabaseBrowser() {
  const [transactions, setTransactions] = useState([]);
  const [selectedTx, setSelectedTx] = useState(null);
  const [searchHash, setSearchHash] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, [page]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/transactions?page=${page}&limit=20`);
      setTransactions(response.data.transactions);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchTransaction = async () => {
    if (!searchHash.trim()) return;

    try {
      setLoading(true);
      const response = await axios.get(`/api/transactions/${searchHash}`);
      setSelectedTx(response.data);
    } catch (error) {
      alert('Transaction not found');
    } finally {
      setLoading(false);
    }
  };

  const viewTransaction = (tx) => {
    setSelectedTx(tx);
  };

  const closeModal = () => {
    setSelectedTx(null);
  };

  const formatADA = (lovelace) => {
    return (parseInt(lovelace) / 1000000).toFixed(6);
  };

  const formatHash = (hash) => {
    return `${hash.substring(0, 10)}...${hash.substring(hash.length - 10)}`;
  };

  return (
    <div className="db-browser">
      <div className="db-header">
        <h2>🗄️ Database Browser</h2>
        <div className="db-search">
          <input
            type="text"
            placeholder="Search by transaction hash..."
            value={searchHash}
            onChange={(e) => setSearchHash(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchTransaction()}
          />
          <button onClick={searchTransaction}>Search</button>
        </div>
      </div>

      <div className="db-stats">
        <div className="stat-item">
          <span className="label">Total:</span>
          <span className="value">{pagination.total?.toLocaleString()}</span>
        </div>
        <div className="stat-item">
          <span className="label">Page:</span>
          <span className="value">{pagination.page} / {pagination.pages}</span>
        </div>
      </div>

      {loading && <div className="db-loading">Loading...</div>}

      <div className="db-table-container">
        <table className="db-table">
          <thead>
            <tr>
              <th>Hash</th>
              <th>Block</th>
              <th>Slot</th>
              <th>Amount (ADA)</th>
              <th>Fees (ADA)</th>
              <th>Size</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => {
              const adaOutput = tx.outputAmount?.find(o => o.unit === 'lovelace');
              return (
                <tr key={tx._id}>
                  <td className="hash-cell" title={tx.hash}>
                    {formatHash(tx.hash || 'N/A')}
                  </td>
                  <td>{tx.blockHeight ? tx.blockHeight.toLocaleString() : '-'}</td>
                  <td>{tx.slot ? tx.slot.toLocaleString() : '-'}</td>
                  <td>{adaOutput ? formatADA(adaOutput.quantity) : '-'}</td>
                  <td>{tx.fees ? formatADA(tx.fees) : '-'}</td>
                  <td>{tx.size ? `${tx.size.toLocaleString()} B` : '-'}</td>
                  <td>
                    <button
                      className="view-btn"
                      onClick={() => viewTransaction(tx)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="db-pagination">
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          ← Previous
        </button>
        <span>Page {page} of {pagination.pages}</span>
        <button
          onClick={() => setPage(p => p + 1)}
          disabled={page >= pagination.pages}
        >
          Next →
        </button>
      </div>

      {selectedTx && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Transaction Details</h3>
              <button className="close-btn" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body">
              <pre>{JSON.stringify(selectedTx, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DatabaseBrowser;
