import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DatabaseBrowser from '../../components/DatabaseBrowser';
import axios from 'axios';

jest.mock('axios');

describe('DatabaseBrowser Component', () => {
  const mockResponse = {
    transactions: [
      {
        _id: '1',
        hash: 'tx1abc123def',
        blockHeight: 1000,
        fees: '170000',
        size: 500,
        fetchedAt: '2024-01-01T12:00:00Z',
        outputAmount: [{ unit: 'lovelace', quantity: '5000000' }]
      },
      {
        _id: '2',
        hash: 'tx2def456ghi',
        blockHeight: 1001,
        fees: '180000',
        size: 600,
        fetchedAt: '2024-01-01T12:01:00Z',
        outputAmount: [{ unit: 'lovelace', quantity: '10000000' }]
      }
    ],
    pagination: {
      total: 100,
      page: 1,
      pages: 5,
      limit: 20
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders database browser header', async () => {
    axios.get.mockResolvedValue({ data: mockResponse });

    render(<DatabaseBrowser />);

    await waitFor(() => {
      expect(screen.getByText(/Database Browser/i)).toBeInTheDocument();
    });
  });

  test('fetches and displays database records', async () => {
    axios.get.mockResolvedValue({ data: mockResponse });

    render(<DatabaseBrowser />);

    await waitFor(() => {
      expect(screen.getByText(/tx1abc123de/i)).toBeInTheDocument();
    });

    expect(axios.get).toHaveBeenCalledWith('/api/transactions?page=1&limit=20');
  });

  test('displays pagination information', async () => {
    axios.get.mockResolvedValue({ data: mockResponse });

    render(<DatabaseBrowser />);

    await waitFor(() => {
      expect(screen.getByText(/Page.*1.*of.*5/i)).toBeInTheDocument();
    });
  });

  test('handles pagination', async () => {
    axios.get.mockResolvedValue({ data: mockResponse });

    render(<DatabaseBrowser />);

    await waitFor(() => {
      expect(screen.getByText(/tx1abc123de/i)).toBeInTheDocument();
    });

    const nextButton = screen.getByText('Next →');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/transactions?page=2&limit=20');
    });
  });

  test('displays formatted block height', async () => {
    axios.get.mockResolvedValue({ data: mockResponse });

    render(<DatabaseBrowser />);

    await waitFor(() => {
      expect(screen.getByText(/1,000/)).toBeInTheDocument();
    });
  });

  test('opens transaction modal when View is clicked', async () => {
    axios.get.mockResolvedValue({ data: mockResponse });

    render(<DatabaseBrowser />);

    await waitFor(() => {
      const viewButtons = screen.getAllByText('View');
      fireEvent.click(viewButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText(/Transaction Details/i)).toBeInTheDocument();
    });
  });
});
