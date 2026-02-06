# Cardano Transaction Viewer

A real-time Cardano blockchain transaction viewer with governance tracking and DRep voting history.

## Features

- 📊 **Dashboard** - Real-time transaction monitoring with statistics
- 📜 **Transactions** - Browse and search Cardano transactions
- 🏛️ **Governance** - View governance proposals with voting details
- 👥 **DReps** - Track DRep and Stake Pool voting history
- 🗄️ **Database Browser** - Explore stored blockchain data

## Tech Stack

### Backend
- Node.js + Express.js
- MongoDB for data storage
- Blockfrost API for Cardano blockchain data
- Axios for HTTP requests

### Frontend
- React.js
- Axios for API calls
- CSS3 for styling

## Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v14 or higher)
- [MongoDB](https://www.mongodb.com/try/download/community) (v4.4 or higher)
- A [Blockfrost API key](https://blockfrost.io/) (free tier available)

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/gmanroney/cardano-tx-viewer.git
cd cardano-tx-viewer
```

### 2. Set up the Backend

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:

```bash
# Backend environment variables
PORT=5000
MONGODB_URI=mongodb://localhost:27017/cardano-transactions
BLOCKFROST_API_KEY=your_blockfrost_api_key_here
BLOCKFROST_NETWORK=mainnet
FETCH_INTERVAL_SECONDS=30
```

**Getting a Blockfrost API Key:**
1. Go to [blockfrost.io](https://blockfrost.io/)
2. Sign up for a free account
3. Create a new project (select Cardano Mainnet)
4. Copy your API key and paste it in the `.env` file

### 3. Set up the Frontend

```bash
cd ../frontend
npm install
```

Create a `.env` file in the `frontend` directory (optional):

```bash
# Frontend environment variables
REACT_APP_API_URL=http://localhost:5000
```

### 4. Start MongoDB

Make sure MongoDB is running on your system:

**Linux/Mac:**
```bash
sudo systemctl start mongod
# or
sudo service mongod start
```

**Windows:**
```bash
# MongoDB should start automatically as a service
# Or run: net start MongoDB
```

**Using Docker:**
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

## Running the Application

### Start the Backend

```bash
cd backend
npm start
```

The backend will start on `http://localhost:5000`

### Start the Frontend

In a new terminal:

```bash
cd frontend
npm start
```

The frontend will start on `http://localhost:3000` and automatically open in your browser.

## Usage

### Dashboard
- View real-time Cardano transactions
- See transaction statistics (total count, volume, etc.)
- Monitor latest blocks

### Transactions
- Browse all transactions stored in the database
- Search by transaction hash
- Filter and sort transactions

### Governance
- View all governance proposals (CIP-1694)
- Click any proposal to see voting details
- See voter names, voting power, and epochs
- View yes/no/abstain vote counts

### DReps
- Browse all DReps and Stake Pools (232+ voters)
- Sort by voting power, vote count, or last vote date
- Filter by DReps only or Pools only
- Click "View History" to see complete voting record for any voter
- See proposal types and outcomes for each vote

## Project Structure

```
cardano-tx-viewer/
├── backend/
│   ├── models/              # MongoDB schemas
│   │   ├── Transaction.js
│   │   ├── GovernanceProposal.js
│   │   └── GovernanceVote.js
│   ├── routes/              # API routes
│   │   ├── transactions.js
│   │   ├── governance.js
│   │   └── dreps.js
│   ├── services/            # Business logic
│   │   ├── blockfrostService.js
│   │   ├── transactionService.js
│   │   └── governanceService.js
│   ├── server.js            # Express server
│   ├── package.json
│   └── .env
│
└── frontend/
    ├── src/
    │   ├── components/      # React components
    │   │   ├── Dashboard.js
    │   │   ├── TransactionList.js
    │   │   ├── Governance.js
    │   │   ├── DReps.js
    │   │   └── ...
    │   ├── App.js
    │   └── index.js
    ├── public/
    ├── package.json
    └── .env (optional)
```

## API Endpoints

### Transactions
- `GET /api/transactions` - Get all transactions
- `GET /api/transactions/:hash` - Get specific transaction
- `GET /api/transactions/stats/summary` - Get transaction statistics
- `POST /api/transactions/fetch` - Manually trigger transaction fetch

### Governance
- `GET /api/governance/proposals` - Get all governance proposals
- `GET /api/governance/proposals/:txHash/:certIndex` - Get proposal details with votes
- `GET /api/governance/proposals/:txHash/:certIndex/votes` - Get votes for a proposal

### DReps
- `GET /api/dreps` - Get all DReps with vote counts
- `GET /api/dreps/:voterId/votes` - Get voting history for a specific DRep

## Configuration

### Backend Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Backend server port | `5000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/cardano-transactions` |
| `BLOCKFROST_API_KEY` | Your Blockfrost API key | **Required** |
| `BLOCKFROST_NETWORK` | Cardano network (mainnet/testnet) | `mainnet` |
| `FETCH_INTERVAL_SECONDS` | Transaction fetch interval | `30` |

### Frontend Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `REACT_APP_API_URL` | Backend API URL | `http://localhost:5000` |

## Troubleshooting

### Backend won't start
- Check if MongoDB is running: `mongod --version` or `mongo --eval "db.version()"`
- Verify your Blockfrost API key is valid
- Check if port 5000 is available

### Frontend can't connect to backend
- Ensure the backend is running on port 5000
- Check for CORS issues in browser console
- Verify the API URL in frontend `.env` file

### No governance data showing
- Governance features require Cardano mainnet
- Wait for initial data fetch (can take 1-2 minutes)
- Check backend logs for errors

### MongoDB connection errors
- Ensure MongoDB service is running
- Check MongoDB connection string in `.env`
- Verify MongoDB port (default: 27017)

## Development

### Running in Development Mode

Backend with auto-reload:
```bash
cd backend
npm install -g nodemon
nodemon server.js
```

Frontend with hot reload:
```bash
cd frontend
npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).

## Acknowledgments

- [Blockfrost.io](https://blockfrost.io/) - Cardano blockchain API
- [Cardano Foundation](https://cardanofoundation.org/) - Cardano blockchain
- [CIP-1694](https://github.com/cardano-foundation/CIPs/tree/master/CIP-1694) - Cardano governance specification
- [CIP-119](https://github.com/cardano-foundation/CIPs/tree/master/CIP-0119) - DRep metadata specification

## Support

For issues and questions:
- Open an issue on [GitHub](https://github.com/gmanroney/cardano-tx-viewer/issues)
- Check existing issues for solutions

---

Built with ❤️ for the Cardano community
