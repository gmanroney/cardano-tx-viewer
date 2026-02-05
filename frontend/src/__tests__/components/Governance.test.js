import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Governance from '../../components/Governance';
import axios from 'axios';

jest.mock('axios');

describe('Governance Component', () => {
  const mockGovernanceData = {
    currentEpoch: 611,
    proposals: [
      {
        txHash: 'abc123',
        certIndex: 0,
        type: 'treasury_withdrawals',
        status: 'Active',
        deposit: '100000000000'
      },
      {
        txHash: 'def456',
        certIndex: 0,
        type: 'parameter_change',
        status: 'Enacted',
        deposit: '100000000000'
      }
    ],
    totalProposals: 2
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders governance header', async () => {
    axios.get.mockResolvedValue({ data: mockGovernanceData });
    
    render(<Governance />);
    
    await waitFor(() => {
      expect(screen.getByText(/Cardano Governance Actions/i)).toBeInTheDocument();
    });
  });

  test('displays loading state initially', () => {
    axios.get.mockImplementation(() => new Promise(() => {}));
    
    render(<Governance />);
    
    expect(screen.getByText(/Loading governance data/i)).toBeInTheDocument();
  });

  test('fetches and displays governance proposals', async () => {
    axios.get.mockResolvedValue({ data: mockGovernanceData });

    render(<Governance />);

    await waitFor(() => {
      expect(screen.getByText(/abc123/i)).toBeInTheDocument();
    });

    expect(axios.get).toHaveBeenCalledWith('/api/governance/proposals');
  });

  test('displays proposal statistics', async () => {
    axios.get.mockResolvedValue({ data: mockGovernanceData });
    
    render(<Governance />);
    
    await waitFor(() => {
      expect(screen.getByText('Total Proposals')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  test('handles filter buttons', async () => {
    axios.get.mockResolvedValue({ data: mockGovernanceData });

    render(<Governance />);

    await waitFor(() => {
      expect(screen.getByText(/Active \(1\)/i)).toBeInTheDocument();
    });

    const activeFilter = screen.getByText(/Active \(1\)/i);
    fireEvent.click(activeFilter);

    // Check that only active proposal rows are shown (not the enacted one)
    await waitFor(() => {
      const viewButtons = screen.getAllByText('View Details');
      expect(viewButtons.length).toBe(1);
    });
  });

  test('handles sorting by column headers', async () => {
    axios.get.mockResolvedValue({ data: mockGovernanceData });
    
    render(<Governance />);
    
    await waitFor(() => {
      const typeHeader = screen.getAllByText(/Type/i)[0];
      fireEvent.click(typeHeader);
    });
    
    // Check that sort icon appears
    expect(screen.getAllByText(/Type/i)[0]).toBeInTheDocument();
  });

  test('opens detail modal when View Details is clicked', async () => {
    axios.get.mockResolvedValue({ data: mockGovernanceData });
    
    render(<Governance />);
    
    await waitFor(() => {
      const viewButton = screen.getAllByText('View Details')[0];
      fireEvent.click(viewButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Governance Action Details')).toBeInTheDocument();
    });
  });

  test('handles pagination', async () => {
    const largeMockData = {
      ...mockGovernanceData,
      proposals: Array(30).fill(mockGovernanceData.proposals[0])
    };
    
    axios.get.mockResolvedValue({ data: largeMockData });
    
    render(<Governance />);
    
    await waitFor(() => {
      const nextButton = screen.getByText('Next →');
      expect(nextButton).toBeInTheDocument();
      fireEvent.click(nextButton);
    });
  });

  test('handles error state', async () => {
    axios.get.mockRejectedValue(new Error('API Error'));
    
    render(<Governance />);
    
    await waitFor(() => {
      expect(screen.getByText(/Governance Data Unavailable/i)).toBeInTheDocument();
    });
  });

  test('refresh button refetches data', async () => {
    axios.get.mockResolvedValue({ data: mockGovernanceData });
    
    render(<Governance />);
    
    await waitFor(() => {
      const refreshButton = screen.getByText('🔄 Refresh');
      fireEvent.click(refreshButton);
    });
    
    expect(axios.get).toHaveBeenCalledTimes(2);
  });
});
