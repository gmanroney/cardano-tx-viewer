import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';
import TransactionCard from './components/TransactionCard';
import Stats from './components/Stats';
import Dashboard from './components/Dashboard';
import DatabaseBrowser from './components/DatabaseBrowser';
import Governance from './components/Governance';

function App() {
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard'); // dashboard, database, governance
  const loaderRef = useRef(null);

  const fetchTransactions = async (pageNum) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/transactions?page=${pageNum}&limit=20`);

      if (pageNum === 1) {
        setTransactions(response.data.transactions);
      } else {
        setTransactions(prev => [...prev, ...response.data.transactions]);
      }

      setHasMore(pageNum < response.data.pagination.pages);
      setError(null);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Failed to fetch transactions. Please check if the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/transactions/stats/summary');
      setStats(response.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  useEffect(() => {
    fetchTransactions(1);
    fetchStats();

    // Refresh transactions every 30 seconds
    const interval = setInterval(() => {
      fetchTransactions(1);
      fetchStats();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setPage(prev => prev + 1);
        }
      },
      { threshold: 1.0 }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => {
      if (loaderRef.current) {
        observer.unobserve(loaderRef.current);
      }
    };
  }, [hasMore, loading]);

  useEffect(() => {
    if (page > 1) {
      fetchTransactions(page);
    }
  }, [page]);

  const handleManualFetch = async () => {
    try {
      await axios.post('/api/transactions/fetch');
      fetchTransactions(1);
      fetchStats();
    } catch (err) {
      console.error('Error triggering manual fetch:', err);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-content">
          <div className="header-title">
            <h1>Cardano Transaction Viewer</h1>
            <p>Real-time Cardano blockchain transactions</p>
          </div>
          <nav className="nav-menu">
            <button
              className={`nav-btn ${currentView === 'dashboard' ? 'active' : ''}`}
              onClick={() => setCurrentView('dashboard')}
            >
              📊 Dashboard
            </button>
            <button
              className={`nav-btn ${currentView === 'database' ? 'active' : ''}`}
              onClick={() => setCurrentView('database')}
            >
              🗄️ Database
            </button>
            <button
              className={`nav-btn ${currentView === 'governance' ? 'active' : ''}`}
              onClick={() => setCurrentView('governance')}
            >
              🏛️ Governance
            </button>
          </nav>
        </div>
      </header>

      {currentView === 'dashboard' && (
        <>
          {stats && <Dashboard stats={stats} />}
          {stats && <Stats stats={stats} onRefresh={handleManualFetch} />}
        </>
      )}

      {currentView === 'database' && <DatabaseBrowser />}

      {currentView === 'governance' && <Governance />}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {currentView === 'dashboard' && (
        <main className="transactions-container">
        {transactions.length === 0 && !loading && (
          <div className="empty-state">
            <p>No transactions found. Click "Fetch Now" to load transactions.</p>
          </div>
        )}

        {transactions.map((tx, index) => (
          <TransactionCard key={`${tx.hash}-${index}`} transaction={tx} />
        ))}

        {loading && (
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading transactions...</p>
          </div>
        )}

        {hasMore && !loading && <div ref={loaderRef} className="loader-trigger"></div>}

        {!hasMore && transactions.length > 0 && (
          <div className="end-message">
            <p>No more transactions to load</p>
          </div>
        )}
        </main>
      )}
    </div>
  );
}

export default App;
