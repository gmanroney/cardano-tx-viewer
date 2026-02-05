# Cardano Transaction Viewer

A full-stack application to fetch, store, and display Cardano blockchain transactions.

## Features

- Fetch transactions from Cardano blockchain using Blockfrost API
- Store transactions in MongoDB
- Display transactions in a scrolling web interface
- Real-time updates

## Tech Stack

- **Frontend**: React
- **Backend**: Node.js + Express
- **Database**: MongoDB
- **Blockchain API**: Blockfrost

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (running locally or MongoDB Atlas)
- Blockfrost API key (get free at https://blockfrost.io)

## Setup

### Backend

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with your configuration:
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/cardano-transactions
   BLOCKFROST_API_KEY=your_blockfrost_api_key_here
   BLOCKFROST_NETWORK=mainnet
   ```

4. Start the server:
   ```bash
   npm start
   ```

### Frontend

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open http://localhost:3000 in your browser

## Usage

The app will automatically fetch recent Cardano transactions and display them in a scrolling list. Transactions are stored in MongoDB for persistence.
