# MongoDB Database Access Guide

## Connection Details
- **Database Name:** `cardano-transactions`
- **Connection URI:** `mongodb://localhost:27017/cardano-transactions`
- **Collection:** `transactions`

## Method 1: MongoDB Shell (mongosh)

### Connect to database:
```bash
mongosh mongodb://localhost:27017/cardano-transactions
```

### Useful Commands:

#### View all databases
```javascript
show dbs
```

#### Switch to your database
```javascript
use cardano-transactions
```

#### View all collections
```javascript
show collections
```

#### Count total transactions
```javascript
db.transactions.countDocuments()
```

#### View the latest 5 transactions
```javascript
db.transactions.find().sort({blockHeight: -1}).limit(5).pretty()
```

#### View transactions from a specific block
```javascript
db.transactions.find({blockHeight: 10000000}).pretty()
```

#### Find transactions with smart contracts
```javascript
db.transactions.find({validContract: true, redeemerCount: {$gt: 0}}).limit(10).pretty()
```

#### Find transactions with NFT mints
```javascript
db.transactions.find({assetMintOrBurnCount: {$gt: 0}}).limit(10).pretty()
```

#### Get average transaction fee
```javascript
db.transactions.aggregate([
  {$group: {_id: null, avgFee: {$avg: {$toDouble: "$fees"}}}}
])
```

#### Find high-value transactions (>1000 ADA)
```javascript
db.transactions.find({
  "outputAmount": {
    $elemMatch: {
      unit: "lovelace",
      quantity: {$gt: "1000000000"}
    }
  }
}).limit(10).pretty()
```

#### Get transaction count by day
```javascript
db.transactions.aggregate([
  {
    $group: {
      _id: {$dateToString: {format: "%Y-%m-%d", date: "$createdAt"}},
      count: {$sum: 1}
    }
  },
  {$sort: {_id: -1}},
  {$limit: 7}
])
```

#### Find a specific transaction by hash
```javascript
db.transactions.findOne({hash: "YOUR_TX_HASH_HERE"})
```

#### Get latest transaction
```javascript
db.transactions.findOne({}, {sort: {blockHeight: -1}})
```

#### Delete all transactions (careful!)
```javascript
db.transactions.deleteMany({})
```

#### Create an index on blockHeight for faster queries
```javascript
db.transactions.createIndex({blockHeight: -1})
```

#### View all indexes
```javascript
db.transactions.getIndexes()
```

#### Exit mongosh
```javascript
exit
```

## Method 2: MongoDB Compass (GUI)

1. Download MongoDB Compass: https://www.mongodb.com/products/compass
2. Open Compass
3. Connection string: `mongodb://localhost:27017`
4. Click "Connect"
5. Navigate to `cardano-transactions` database
6. Explore the `transactions` collection

## Method 3: VS Code Extension

1. Install "MongoDB for VS Code" extension
2. Click MongoDB icon in sidebar
3. Add connection: `mongodb://localhost:27017`
4. Expand to see your database and collections

## Method 4: Programmatic Access (Node.js)

```javascript
const { MongoClient } = require('mongodb');

async function queryDatabase() {
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();

  const db = client.db('cardano-transactions');
  const transactions = db.collection('transactions');

  // Your queries here
  const count = await transactions.countDocuments();
  console.log(`Total transactions: ${count}`);

  await client.close();
}

queryDatabase();
```

## Database Schema

Each transaction document contains:
- `hash`: Transaction hash (unique identifier)
- `block`: Block hash
- `blockHeight`: Block number
- `slot`: Cardano slot number
- `index`: Transaction index in block
- `outputAmount`: Array of outputs [{unit, quantity}]
- `fees`: Transaction fee in lovelace
- `size`: Transaction size in bytes
- `utxoCount`: Number of UTXOs
- `validContract`: Boolean for smart contracts
- `redeemerCount`: Number of script redeemers
- `assetMintOrBurnCount`: Number of assets minted/burned
- `delegationCount`: Number of delegations
- `fetchedAt`: Timestamp when added to DB
- `createdAt`: MongoDB creation timestamp
- `updatedAt`: MongoDB update timestamp
