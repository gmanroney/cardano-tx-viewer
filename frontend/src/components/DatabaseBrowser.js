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
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

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

  // Apply sorting to transactions
  const sortedTransactions = sortField ? [...transactions].sort((a, b) => {
    let aVal, bVal;

    switch(sortField) {
      case 'block':
        aVal = a.blockHeight || 0;
        bVal = b.blockHeight || 0;
        break;
      case 'slot':
        aVal = a.slot || 0;
        bVal = b.slot || 0;
        break;
      case 'amount':
        aVal = parseInt(a.outputAmount?.find(o => o.unit === 'lovelace')?.quantity || 0);
        bVal = parseInt(b.outputAmount?.find(o => o.unit === 'lovelace')?.quantity || 0);
        break;
      case 'fees':
        aVal = parseInt(a.fees || 0);
        bVal = parseInt(b.fees || 0);
        break;
      case 'size':
        aVal = a.size || 0;
        bVal = b.size || 0;
        break;
      default:
        aVal = a[sortField];
        bVal = b[sortField];
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  }) : transactions;

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
              <th onClick={() => handleSort('hash')} style={{cursor: 'pointer'}}>
                Hash {getSortIcon('hash')}
              </th>
              <th onClick={() => handleSort('block')} style={{cursor: 'pointer'}}>
                Block {getSortIcon('block')}
              </th>
              <th onClick={() => handleSort('slot')} style={{cursor: 'pointer'}}>
                Slot {getSortIcon('slot')}
              </th>
              <th onClick={() => handleSort('amount')} style={{cursor: 'pointer'}}>
                Amount (ADA) {getSortIcon('amount')}
              </th>
              <th onClick={() => handleSort('fees')} style={{cursor: 'pointer'}}>
                Fees (ADA) {getSortIcon('fees')}
              </th>
              <th onClick={() => handleSort('size')} style={{cursor: 'pointer'}}>
                Size {getSortIcon('size')}
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedTransactions.map((tx) => {
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
