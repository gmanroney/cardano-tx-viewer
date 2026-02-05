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
        txHash: 'abc123def456ghi789',
        certIndex: 0,
        type: 'treasury_withdrawals',
        status: 'Active',
        deposit: '100000000000',
        returnAddress: 'addr1_test_address'
      },
      {
        txHash: 'def456ghi789jkl012',
        certIndex: 1,
        type: 'parameter_change',
        status: 'Enacted',
        deposit: '100000000000'
      },
      {
        txHash: 'ghi789jkl012mno345',
        certIndex: 0,
        type: 'info_action',
        status: 'Dropped',
        deposit: '100000000000'
      }
    ],
    totalProposals: 3
  };

  const mockProposalDetails = {
    votes: [
      { voter: 'voter1', vote: 'yes' },
      { voter: 'voter2', vote: 'no' }
    ],
    voteCount: {
      yes: 1,
      no: 1,
      abstain: 0
    },
    metadata: {
      json_metadata: {
        body: {
          title: 'Test Proposal',
          abstract: 'This is a test proposal',
          motivation: 'Testing purposes',
          rationale: 'To verify functionality'
        }
      }
    }
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
      expect(screen.getByText(/abc123de/i)).toBeInTheDocument();
    });

    expect(axios.get).toHaveBeenCalledWith('/api/governance/proposals');
  });

  test('displays proposal statistics', async () => {
    axios.get.mockResolvedValue({ data: mockGovernanceData });

    render(<Governance />);

    await waitFor(() => {
      expect(screen.getByText('Total Proposals')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  test('displays current epoch', async () => {
    axios.get.mockResolvedValue({ data: mockGovernanceData });

    render(<Governance />);

    await waitFor(() => {
      expect(screen.getByText('Current Epoch')).toBeInTheDocument();
      expect(screen.getByText('611')).toBeInTheDocument();
    });
  });

  test('displays status counts correctly', async () => {
    axios.get.mockResolvedValue({ data: mockGovernanceData });

    render(<Governance />);

    await waitFor(() => {
      expect(screen.getByText(/Active \(1\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Enacted \(1\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Dropped \(1\)/i)).toBeInTheDocument();
    });
  });

  test('filters proposals by status', async () => {
    axios.get.mockResolvedValue({ data: mockGovernanceData });

    render(<Governance />);

    await waitFor(() => {
      expect(screen.getByText(/abc123def456/i)).toBeInTheDocument();
    });

    // Initially should show all 3 proposal types
    expect(screen.getByText('treasury_withdrawals')).toBeInTheDocument();
    expect(screen.getByText('parameter_change')).toBeInTheDocument();
    expect(screen.getByText('info_action')).toBeInTheDocument();

    const activeFilter = screen.getByText(/Active \(1\)/i);
    fireEvent.click(activeFilter);

    // Should show only active proposal (treasury_withdrawals)
    await waitFor(() => {
      expect(screen.getByText('treasury_withdrawals')).toBeInTheDocument();
      expect(screen.queryByText('parameter_change')).not.toBeInTheDocument();
      expect(screen.queryByText('info_action')).not.toBeInTheDocument();
    });
  });

  test('handles sorting by column headers', async () => {
    axios.get.mockResolvedValue({ data: mockGovernanceData });

    render(<Governance />);

    await waitFor(() => {
      expect(screen.getByText(/abc123def456/i)).toBeInTheDocument();
    });

    const typeHeader = screen.getByText(/Type ⇅/i);
    fireEvent.click(typeHeader);

    // After clicking, should show ascending sort icon
    await waitFor(() => {
      expect(screen.getByText(/Type ↑/i)).toBeInTheDocument();
    });
  });

  test('opens inline detail panel when row is clicked', async () => {
    axios.get.mockResolvedValueOnce({ data: mockGovernanceData });
    axios.get.mockResolvedValueOnce({ data: mockProposalDetails });

    render(<Governance />);

    await waitFor(() => {
      expect(screen.getByText(/abc123def456/i)).toBeInTheDocument();
    });

    // Find and click the row containing the first proposal
    const firstProposalHash = screen.getByText(/abc123def456/i);
    const row = firstProposalHash.closest('tr');
    fireEvent.click(row);

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText(/Loading details/i)).toBeInTheDocument();
    });

    // Should fetch proposal details
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/governance/proposals/abc123def456ghi789/0');
    });

    // Should display details after loading
    await waitFor(() => {
      expect(screen.getByText('Transaction Information')).toBeInTheDocument();
    });
  });

  test('closes detail panel when same row is clicked again', async () => {
    axios.get.mockResolvedValueOnce({ data: mockGovernanceData });
    axios.get.mockResolvedValueOnce({ data: mockProposalDetails });

    render(<Governance />);

    await waitFor(() => {
      expect(screen.getByText(/abc123def456/i)).toBeInTheDocument();
    });

    const firstProposalHash = screen.getByText(/abc123def456/i);
    const row = firstProposalHash.closest('tr');

    // Open details
    fireEvent.click(row);

    await waitFor(() => {
      expect(screen.getByText('Transaction Information')).toBeInTheDocument();
    });

    // Wait for debounce to reset
    await new Promise(resolve => setTimeout(resolve, 600));

    // Close details by clicking same row again
    fireEvent.click(row);

    await waitFor(() => {
      expect(screen.queryByText('Transaction Information')).not.toBeInTheDocument();
    });
  });

  test('displays expand/collapse indicator', async () => {
    axios.get.mockResolvedValueOnce({ data: mockGovernanceData });
    axios.get.mockResolvedValueOnce({ data: mockProposalDetails });

    render(<Governance />);

    await waitFor(() => {
      expect(screen.getAllByText('▶')[0]).toBeInTheDocument();
    });

    const firstProposalHash = screen.getByText(/abc123def456/i);
    const row = firstProposalHash.closest('tr');
    fireEvent.click(row);

    await waitFor(() => {
      expect(screen.getByText('▼')).toBeInTheDocument();
    });
  });

  test('displays proposal details sections', async () => {
    axios.get.mockResolvedValueOnce({ data: mockGovernanceData });
    axios.get.mockResolvedValueOnce({ data: mockProposalDetails });

    render(<Governance />);

    await waitFor(() => {
      expect(screen.getByText(/abc123def456/i)).toBeInTheDocument();
    });

    const firstProposalHash = screen.getByText(/abc123def456/i);
    const row = firstProposalHash.closest('tr');
    fireEvent.click(row);

    await waitFor(() => {
      expect(screen.getByText('Transaction Information')).toBeInTheDocument();
      expect(screen.getByText('Financial Information')).toBeInTheDocument();
      expect(screen.getByText('Voting Information')).toBeInTheDocument();
    });
  });

  test('displays vote counts in details', async () => {
    axios.get.mockResolvedValueOnce({ data: mockGovernanceData });
    axios.get.mockResolvedValueOnce({ data: mockProposalDetails });

    render(<Governance />);

    await waitFor(() => {
      expect(screen.getByText(/abc123def456/i)).toBeInTheDocument();
    });

    const firstProposalHash = screen.getByText(/abc123def456/i);
    const row = firstProposalHash.closest('tr');
    fireEvent.click(row);

    await waitFor(() => {
      expect(screen.getByText('Yes Votes')).toBeInTheDocument();
      expect(screen.getByText('No Votes')).toBeInTheDocument();
      expect(screen.getByText('Abstain')).toBeInTheDocument();
    });
  });

  test('displays proposal metadata', async () => {
    axios.get.mockResolvedValueOnce({ data: mockGovernanceData });
    axios.get.mockResolvedValueOnce({ data: mockProposalDetails });

    render(<Governance />);

    await waitFor(() => {
      expect(screen.getByText(/abc123def456/i)).toBeInTheDocument();
    });

    const firstProposalHash = screen.getByText(/abc123def456/i);
    const row = firstProposalHash.closest('tr');
    fireEvent.click(row);

    await waitFor(() => {
      expect(screen.getByText('Proposal Metadata')).toBeInTheDocument();
      expect(screen.getByText('Test Proposal')).toBeInTheDocument();
      expect(screen.getByText('This is a test proposal')).toBeInTheDocument();
    });
  });

  test('prevents rapid double-clicks with debounce', async () => {
    axios.get.mockResolvedValueOnce({ data: mockGovernanceData });
    axios.get.mockResolvedValueOnce({ data: mockProposalDetails });

    render(<Governance />);

    await waitFor(() => {
      expect(screen.getByText(/abc123def456/i)).toBeInTheDocument();
    });

    const firstProposalHash = screen.getByText(/abc123def456/i);
    const row = firstProposalHash.closest('tr');

    // Click twice rapidly (within debounce period)
    fireEvent.click(row);
    fireEvent.click(row);

    // Should only call initial fetch + detail fetch once (second click debounced)
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledTimes(2); // Initial + one detail fetch
    });
  });

  test('allows clicks after debounce period', async () => {
    axios.get.mockResolvedValueOnce({ data: mockGovernanceData });
    axios.get.mockResolvedValueOnce({ data: mockProposalDetails });
    axios.get.mockResolvedValueOnce({ data: mockProposalDetails });

    render(<Governance />);

    await waitFor(() => {
      expect(screen.getByText(/abc123def456/i)).toBeInTheDocument();
    });

    const firstProposalHash = screen.getByText(/abc123def456/i);
    const row = firstProposalHash.closest('tr');

    // First click
    fireEvent.click(row);

    await waitFor(() => {
      expect(screen.getByText('Transaction Information')).toBeInTheDocument();
    });

    // Wait for debounce and close the panel
    await new Promise(resolve => setTimeout(resolve, 600));
    fireEvent.click(row);

    await waitFor(() => {
      expect(screen.queryByText('Transaction Information')).not.toBeInTheDocument();
    });

    // Wait for debounce period
    await new Promise(resolve => setTimeout(resolve, 600));

    // Click again after debounce period
    fireEvent.click(row);

    // Should call API again
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledTimes(3); // Initial + first detail fetch + second detail fetch
    });
  });

  test('handles pagination', async () => {
    const largeMockData = {
      ...mockGovernanceData,
      proposals: Array(30).fill(null).map((_, i) => ({
        ...mockGovernanceData.proposals[0],
        txHash: `tx${i}`,
        certIndex: i
      }))
    };

    axios.get.mockResolvedValue({ data: largeMockData });

    render(<Governance />);

    await waitFor(() => {
      const nextButton = screen.getByText('Next →');
      expect(nextButton).toBeInTheDocument();
      expect(nextButton).not.toBeDisabled();
    });

    // Should show page 1 initially
    expect(screen.getByText(/Page 1 of 2/i)).toBeInTheDocument();

    const nextButton = screen.getByText('Next →');
    fireEvent.click(nextButton);

    // Should navigate to page 2
    await waitFor(() => {
      expect(screen.getByText(/Page 2 of 2/i)).toBeInTheDocument();
    });
  });

  test('disables pagination buttons appropriately', async () => {
    axios.get.mockResolvedValue({ data: mockGovernanceData });

    render(<Governance />);

    await waitFor(() => {
      const prevButton = screen.getByText('← Previous');
      const nextButton = screen.getByText('Next →');

      expect(prevButton).toBeDisabled();
      expect(nextButton).toBeDisabled(); // Only 3 items, fits in one page
    });
  });

  test('handles error state', async () => {
    axios.get.mockRejectedValue(new Error('API Error'));

    render(<Governance />);

    await waitFor(() => {
      expect(screen.getByText(/Governance Data Unavailable/i)).toBeInTheDocument();
    });
  });

  test('displays error note about Conway era', async () => {
    axios.get.mockRejectedValue(new Error('API Error'));

    render(<Governance />);

    await waitFor(() => {
      expect(screen.getByText(/Conway era/i)).toBeInTheDocument();
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

  test('retry button in error state refetches data', async () => {
    axios.get.mockRejectedValueOnce(new Error('API Error'));
    axios.get.mockResolvedValueOnce({ data: mockGovernanceData });

    render(<Governance />);

    await waitFor(() => {
      expect(screen.getByText(/Governance Data Unavailable/i)).toBeInTheDocument();
    });

    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText(/abc123de/i)).toBeInTheDocument();
    });
  });

  test('displays empty state when no proposals', async () => {
    const emptyData = {
      currentEpoch: 611,
      proposals: [],
      totalProposals: 0
    };

    axios.get.mockResolvedValue({ data: emptyData });

    render(<Governance />);

    await waitFor(() => {
      expect(screen.getByText(/No governance proposals found/i)).toBeInTheDocument();
    });
  });

  test('displays empty state message for filtered results', async () => {
    const dataWithOneActive = {
      ...mockGovernanceData,
      proposals: [mockGovernanceData.proposals[0]] // Only active
    };

    axios.get.mockResolvedValue({ data: dataWithOneActive });

    render(<Governance />);

    await waitFor(() => {
      const enactedFilter = screen.getByText(/Enacted \(0\)/i);
      fireEvent.click(enactedFilter);
    });

    await waitFor(() => {
      expect(screen.getByText(/No proposals match the selected filter/i)).toBeInTheDocument();
    });
  });

  test('formats deposit amounts correctly', async () => {
    axios.get.mockResolvedValue({ data: mockGovernanceData });

    render(<Governance />);

    await waitFor(() => {
      // 100000000000 lovelace = 100000 ADA
      expect(screen.getAllByText('100000.00')[0]).toBeInTheDocument();
    });
  });

  test('formats transaction hashes correctly', async () => {
    axios.get.mockResolvedValue({ data: mockGovernanceData });

    render(<Governance />);

    await waitFor(() => {
      // Hash "abc123def456ghi789" should be formatted as first 12...last 12
      // First 12: abc123def456, Last 12: def456ghi789
      expect(screen.getAllByText(/abc123def456...def456ghi789/i)[0]).toBeInTheDocument();
    });
  });

  test('keeps detail panel open after API data merges', async () => {
    axios.get.mockResolvedValueOnce({ data: mockGovernanceData });
    axios.get.mockResolvedValueOnce({ data: mockProposalDetails });

    render(<Governance />);

    await waitFor(() => {
      expect(screen.getByText(/abc123def456/i)).toBeInTheDocument();
    });

    const firstProposalHash = screen.getByText(/abc123def456/i);
    const row = firstProposalHash.closest('tr');
    fireEvent.click(row);

    // Wait for API call to complete
    await waitFor(() => {
      expect(screen.getByText('Transaction Information')).toBeInTheDocument();
    });

    // Panel should still be open after state updates
    expect(screen.getByText('Financial Information')).toBeInTheDocument();
    expect(screen.getByText('Voting Information')).toBeInTheDocument();
  });

  test('handles API error when fetching details gracefully', async () => {
    axios.get.mockResolvedValueOnce({ data: mockGovernanceData });
    axios.get.mockRejectedValueOnce(new Error('Detail fetch failed'));

    render(<Governance />);

    await waitFor(() => {
      expect(screen.getByText(/abc123def456/i)).toBeInTheDocument();
    });

    const firstProposalHash = screen.getByText(/abc123def456/i);
    const row = firstProposalHash.closest('tr');
    fireEvent.click(row);

    // Should still show basic proposal data even if detail fetch fails
    await waitFor(() => {
      expect(screen.getByText('Transaction Information')).toBeInTheDocument();
    });
  });
});
