import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Dashboard from '../../components/Dashboard';

describe('Dashboard Component', () => {
  const mockStats = {
    latestBlock: 8500000,
    transactionsPerMinute: 25,
    totalTransactions: 1500,
    totalADA: 25000000,
    averageAmount: 16666.67,
    totalFees: 25000,
    averageFee: 0.17,
    smartContractTransactions: 15,
    nftTransactions: 8,
    delegationTransactions: 5,
    latestTxHash: 'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz',
    latestTxTime: new Date('2024-01-01T12:00:00Z').toISOString()
  };

  test('renders dashboard header', () => {
    render(<Dashboard stats={mockStats} />);

    expect(screen.getByText(/Cardano Blockchain Metrics/i)).toBeInTheDocument();
  });

  test('displays live indicator', () => {
    render(<Dashboard stats={mockStats} />);

    expect(screen.getByText('LIVE')).toBeInTheDocument();
  });

  test('displays latest block number', () => {
    render(<Dashboard stats={mockStats} />);

    expect(screen.getByText('Latest Block')).toBeInTheDocument();
    expect(screen.getByText('8,500,000')).toBeInTheDocument();
  });

  test('displays transactions per minute', () => {
    render(<Dashboard stats={mockStats} />);

    expect(screen.getByText('TX/Minute')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
  });

  test('displays total tracked transactions', () => {
    render(<Dashboard stats={mockStats} />);

    expect(screen.getByText('Total Tracked')).toBeInTheDocument();
    expect(screen.getByText('1,500')).toBeInTheDocument();
  });

  test('displays total volume in ADA', () => {
    render(<Dashboard stats={mockStats} />);

    expect(screen.getByText('Total Volume')).toBeInTheDocument();
    expect(screen.getByText(/25,000,000.*ADA/i)).toBeInTheDocument();
  });

  test('displays average transaction amount', () => {
    render(<Dashboard stats={mockStats} />);

    expect(screen.getByText('Avg Amount')).toBeInTheDocument();
    expect(screen.getByText(/16,666\.67.*ADA/i)).toBeInTheDocument();
  });

  test('displays total fees', () => {
    render(<Dashboard stats={mockStats} />);

    expect(screen.getByText('Total Fees')).toBeInTheDocument();
    const feeElements = screen.getAllByText(/25,000.*ADA/i);
    expect(feeElements.length).toBeGreaterThan(0);
  });

  test('displays average fee', () => {
    render(<Dashboard stats={mockStats} />);

    expect(screen.getByText('Avg Fee')).toBeInTheDocument();
    expect(screen.getByText(/0\.17.*ADA/i)).toBeInTheDocument();
  });

  test('displays smart contract transactions count', () => {
    render(<Dashboard stats={mockStats} />);

    expect(screen.getByText('Smart Contracts')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  test('displays NFT/Token mints count', () => {
    render(<Dashboard stats={mockStats} />);

    expect(screen.getByText('NFT/Token Mints')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  test('displays delegations count', () => {
    render(<Dashboard stats={mockStats} />);

    expect(screen.getByText('Delegations')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  test('displays latest transaction hash', () => {
    render(<Dashboard stats={mockStats} />);

    expect(screen.getByText(/abc123de\.\.\.234yz/i)).toBeInTheDocument();
  });

  test('displays latest transaction time', () => {
    render(<Dashboard stats={mockStats} />);

    expect(screen.getByText('Latest Transaction')).toBeInTheDocument();
  });

  test('formats numbers with commas', () => {
    render(<Dashboard stats={mockStats} />);

    // Check that large numbers are formatted with commas
    expect(screen.getByText('8,500,000')).toBeInTheDocument();
    expect(screen.getByText('1,500')).toBeInTheDocument();
  });

  test('handles missing stats gracefully', () => {
    const incompleteStats = {
      latestBlock: 8500000,
      totalTransactions: 0
    };

    render(<Dashboard stats={incompleteStats} />);

    expect(screen.getByText('8,500,000')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  test('displays zero values correctly', () => {
    const zeroStats = {
      latestBlock: 0,
      transactionsPerMinute: 0,
      totalTransactions: 0,
      totalADA: 0,
      averageAmount: 0,
      totalFees: 0,
      averageFee: 0,
      smartContractTransactions: 0,
      nftTransactions: 0,
      delegationTransactions: 0,
      latestTxHash: '',
      latestTxTime: null
    };

    render(<Dashboard stats={zeroStats} />);

    expect(screen.getByText('Latest Block')).toBeInTheDocument();
    expect(screen.getByText('Total Tracked')).toBeInTheDocument();
  });

  test('renders all metric sections', () => {
    render(<Dashboard stats={mockStats} />);

    expect(screen.getByText('Network Status')).toBeInTheDocument();
    expect(screen.getByText('Transaction Analytics')).toBeInTheDocument();
    expect(screen.getByText('Activity Breakdown')).toBeInTheDocument();
  });

  test('displays all metric icons', () => {
    render(<Dashboard stats={mockStats} />);

    // Check for various emoji icons
    expect(screen.getByText('🔗')).toBeInTheDocument(); // Latest Block
    expect(screen.getByText('⚡')).toBeInTheDocument(); // TX/Minute
    expect(screen.getByText('💰')).toBeInTheDocument(); // Total Volume
    expect(screen.getByText('📜')).toBeInTheDocument(); // Smart Contracts
  });
});
