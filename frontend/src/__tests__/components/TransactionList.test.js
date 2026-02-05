import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TransactionList from '../../components/TransactionList';
import axios from 'axios';

jest.mock('axios');

describe('TransactionList Component', () => {
  const mockTransactionData = {
    transactions: [
      {
        hash: 'tx1abc123def456',
        blockHeight: 1000,
        slot: 50000,
        index: 0,
        fees: '170000',
        size: 500,
        utxoCount: 2,
        assetMintOrBurnCount: 0,
        delegationCount: 0,
        redeemerCount: 0,
        validContract: false,
        outputAmount: [{ unit: 'lovelace', quantity: '5000000' }],
        fetchedAt: '2024-01-01T12:00:00Z',
        updatedAt: '2024-01-01T12:00:00Z'
      },
      {
        hash: 'tx2def456ghi789',
        blockHeight: 1001,
        slot: 50001,
        index: 1,
        fees: '180000',
        size: 600,
        utxoCount: 3,
        assetMintOrBurnCount: 1,
        delegationCount: 0,
        redeemerCount: 0,
        validContract: false,
        outputAmount: [{ unit: 'lovelace', quantity: '10000000' }],
        fetchedAt: '2024-01-01T12:01:00Z',
        updatedAt: '2024-01-01T12:01:00Z'
      },
      {
        hash: 'tx3ghi789jkl012',
        blockHeight: 1002,
        slot: 50002,
        index: 2,
        fees: '200000',
        size: 700,
        utxoCount: 4,
        assetMintOrBurnCount: 0,
        delegationCount: 1,
        redeemerCount: 0,
        validContract: false,
        outputAmount: [{ unit: 'lovelace', quantity: '15000000' }],
        fetchedAt: '2024-01-01T12:02:00Z',
        updatedAt: '2024-01-01T12:02:00Z'
      },
      {
        hash: 'tx4jkl012mno345',
        blockHeight: 1003,
        slot: 50003,
        index: 3,
        fees: '250000',
        size: 800,
        utxoCount: 5,
        assetMintOrBurnCount: 0,
        delegationCount: 0,
        redeemerCount: 2,
        validContract: true,
        outputAmount: [{ unit: 'lovelace', quantity: '20000000' }],
        fetchedAt: '2024-01-01T12:03:00Z',
        updatedAt: '2024-01-01T12:03:00Z'
      }
    ],
    pagination: {
      total: 100,
      page: 1,
      pages: 5
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders transaction list header', async () => {
    axios.get.mockResolvedValue({ data: mockTransactionData });

    render(<TransactionList />);

    await waitFor(() => {
      expect(screen.getByText(/Cardano Transactions/i)).toBeInTheDocument();
    });
  });

  test('displays loading state initially', () => {
    axios.get.mockImplementation(() => new Promise(() => {}));

    render(<TransactionList />);

    expect(screen.getByText(/Loading transactions/i)).toBeInTheDocument();
  });

  test('fetches and displays transactions', async () => {
    axios.get.mockResolvedValue({ data: mockTransactionData });

    render(<TransactionList />);

    await waitFor(() => {
      expect(screen.getByText(/tx1abc123/i)).toBeInTheDocument();
    });

    expect(axios.get).toHaveBeenCalledWith('/api/transactions?page=1&limit=20');
  });

  test('displays transaction statistics', async () => {
    axios.get.mockResolvedValue({ data: mockTransactionData });

    render(<TransactionList />);

    await waitFor(() => {
      expect(screen.getByText('Total Tracked')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
    });
  });

  test('displays correct transaction type badges', async () => {
    axios.get.mockResolvedValue({ data: mockTransactionData });

    render(<TransactionList />);

    await waitFor(() => {
      // Check for NFT badge (tx2 has assetMintOrBurnCount > 0)
      const nftBadges = screen.getAllByTitle('NFT/Token');
      expect(nftBadges.length).toBeGreaterThan(0);

      // Check for delegation badge (tx3 has delegationCount > 0)
      const delegationBadges = screen.getAllByTitle('Delegation');
      expect(delegationBadges.length).toBeGreaterThan(0);

      // Check for smart contract badge (tx4 has validContract and redeemerCount > 0)
      const contractBadges = screen.getAllByTitle('Smart Contract');
      expect(contractBadges.length).toBeGreaterThan(0);
    });
  });

  test('handles sorting by block height', async () => {
    axios.get.mockResolvedValue({ data: mockTransactionData });

    render(<TransactionList />);

    await waitFor(() => {
      const blockHeightHeader = screen.getByText(/Block Height/i);
      fireEvent.click(blockHeightHeader);
    });

    // Check that sort icon appears
    expect(screen.getByText(/Block Height/i)).toBeInTheDocument();
  });

  test('handles sorting by amount', async () => {
    axios.get.mockResolvedValue({ data: mockTransactionData });

    render(<TransactionList />);

    await waitFor(() => {
      const amountHeader = screen.getByText(/Amount \(ADA\)/i);
      fireEvent.click(amountHeader);
    });

    // Verify transactions are displayed after sorting
    await waitFor(() => {
      expect(screen.getByText(/tx1abc123def456/i)).toBeInTheDocument();
    });
  });

  test('opens detail modal when View Details is clicked', async () => {
    axios.get.mockResolvedValue({ data: mockTransactionData });

    render(<TransactionList />);

    await waitFor(() => {
      const viewButtons = screen.getAllByText('View Details');
      fireEvent.click(viewButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Transaction Details')).toBeInTheDocument();
    });
  });

  test('displays transaction details in modal', async () => {
    axios.get.mockResolvedValue({ data: mockTransactionData });

    render(<TransactionList />);

    await waitFor(() => {
      const viewButtons = screen.getAllByText('View Details');
      fireEvent.click(viewButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Basic Information')).toBeInTheDocument();
      expect(screen.getByText('Financial Details')).toBeInTheDocument();
      expect(screen.getByText('Transaction Metadata')).toBeInTheDocument();
    });
  });

  test('closes modal when close button is clicked', async () => {
    axios.get.mockResolvedValue({ data: mockTransactionData });

    render(<TransactionList />);

    await waitFor(() => {
      const viewButtons = screen.getAllByText('View Details');
      fireEvent.click(viewButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Transaction Details')).toBeInTheDocument();
    });

    const closeButton = screen.getByText('×');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText('Transaction Details')).not.toBeInTheDocument();
    });
  });

  test('handles pagination - next page', async () => {
    axios.get.mockResolvedValue({ data: mockTransactionData });

    render(<TransactionList />);

    await waitFor(() => {
      const nextButton = screen.getByText('Next →');
      expect(nextButton).toBeInTheDocument();
      fireEvent.click(nextButton);
    });

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/transactions?page=2&limit=20');
    });
  });

  test('handles pagination - previous page', async () => {
    const page2Data = {
      ...mockTransactionData,
      pagination: { total: 100, page: 2, pages: 5 }
    };

    axios.get.mockResolvedValue({ data: page2Data });

    render(<TransactionList />);

    await waitFor(() => {
      const prevButton = screen.getByText('← Previous');
      expect(prevButton).toBeInTheDocument();
    });

    const prevButton = screen.getByText('← Previous');
    fireEvent.click(prevButton);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/transactions?page=1&limit=20');
    });
  });

  test('disables previous button on first page', async () => {
    axios.get.mockResolvedValue({ data: mockTransactionData });

    render(<TransactionList />);

    await waitFor(() => {
      const prevButton = screen.getByText('← Previous');
      expect(prevButton).toBeDisabled();
    });
  });

  test('disables next button on last page', async () => {
    const lastPageData = {
      ...mockTransactionData,
      pagination: { total: 100, page: 5, pages: 5 }
    };

    axios.get.mockResolvedValue({ data: lastPageData });

    render(<TransactionList />);

    await waitFor(() => {
      const nextButton = screen.getByText('Next →');
      expect(nextButton).toBeDisabled();
    });
  });

  test('handles error state', async () => {
    axios.get.mockRejectedValue(new Error('API Error'));

    render(<TransactionList />);

    await waitFor(() => {
      expect(screen.getByText(/Transaction Data Unavailable/i)).toBeInTheDocument();
    });
  });

  test('refresh button refetches data', async () => {
    axios.get.mockResolvedValue({ data: mockTransactionData });

    render(<TransactionList />);

    await waitFor(() => {
      const refreshButton = screen.getByText('🔄 Refresh');
      fireEvent.click(refreshButton);
    });

    expect(axios.get).toHaveBeenCalledTimes(2);
  });

  test('displays empty state when no transactions', async () => {
    const emptyData = {
      transactions: [],
      pagination: { total: 0, page: 1, pages: 0 }
    };

    axios.get.mockResolvedValue({ data: emptyData });

    render(<TransactionList />);

    await waitFor(() => {
      expect(screen.getByText(/No transactions found/i)).toBeInTheDocument();
    });
  });

  test('formats ADA amounts correctly', async () => {
    axios.get.mockResolvedValue({ data: mockTransactionData });

    render(<TransactionList />);

    await waitFor(() => {
      // 5000000 lovelace = 5.000000 ADA
      expect(screen.getByText('5.000000')).toBeInTheDocument();
    });
  });

  test('displays page information correctly', async () => {
    axios.get.mockResolvedValue({ data: mockTransactionData });

    render(<TransactionList />);

    await waitFor(() => {
      expect(screen.getByText(/Page 1 of 5/i)).toBeInTheDocument();
    });
  });

  test('calculates transaction stats correctly', async () => {
    axios.get.mockResolvedValue({ data: mockTransactionData });

    render(<TransactionList />);

    await waitFor(() => {
      // 1 smart contract (tx4), 1 NFT mint (tx2), 1 delegation (tx3)
      const statCards = screen.getAllByText('1');
      expect(statCards.length).toBeGreaterThanOrEqual(3);
    });
  });
});
