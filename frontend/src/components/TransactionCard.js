import React from 'react';
import './TransactionCard.css';

function TransactionCard({ transaction }) {
  const formatADA = (lovelace) => {
    if (!lovelace) return '0';
    return (parseInt(lovelace) / 1000000).toFixed(6);
  };

  const getTotalADA = () => {
    if (!transaction.outputAmount || transaction.outputAmount.length === 0) {
      return '0';
    }
    const adaOutput = transaction.outputAmount.find(output => output.unit === 'lovelace');
    return adaOutput ? formatADA(adaOutput.quantity) : '0';
  };

  const formatHash = (hash) => {
    if (!hash) return '';
    return `${hash.substring(0, 12)}...${hash.substring(hash.length - 12)}`;
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="transaction-card">
      <div className="tx-header">
        <div className="tx-hash">
          <span className="label">Transaction Hash:</span>
          <span className="hash" title={transaction.hash}>
            {formatHash(transaction.hash)}
          </span>
        </div>
        <div className="tx-block">
          <span className="label">Block:</span>
          <span className="value">{transaction.blockHeight.toLocaleString()}</span>
        </div>
      </div>

      <div className="tx-details">
        <div className="detail-row">
          <div className="detail-item">
            <span className="label">Amount:</span>
            <span className="value ada">{getTotalADA()} ADA</span>
          </div>
          <div className="detail-item">
            <span className="label">Fees:</span>
            <span className="value">{formatADA(transaction.fees)} ADA</span>
          </div>
          <div className="detail-item">
            <span className="label">Size:</span>
            <span className="value">{transaction.size.toLocaleString()} bytes</span>
          </div>
        </div>

        <div className="detail-row">
          <div className="detail-item">
            <span className="label">Slot:</span>
            <span className="value">{transaction.slot.toLocaleString()}</span>
          </div>
          <div className="detail-item">
            <span className="label">Index:</span>
            <span className="value">{transaction.index}</span>
          </div>
          <div className="detail-item">
            <span className="label">UTXOs:</span>
            <span className="value">{transaction.utxoCount}</span>
          </div>
        </div>

        {(transaction.assetMintOrBurnCount > 0 || transaction.delegationCount > 0 || transaction.redeemerCount > 0) && (
          <div className="detail-row special">
            {transaction.assetMintOrBurnCount > 0 && (
              <div className="badge">
                <span>🪙 Assets: {transaction.assetMintOrBurnCount}</span>
              </div>
            )}
            {transaction.delegationCount > 0 && (
              <div className="badge">
                <span>🔗 Delegations: {transaction.delegationCount}</span>
              </div>
            )}
            {transaction.redeemerCount > 0 && (
              <div className="badge smart-contract">
                <span>📜 Smart Contract</span>
              </div>
            )}
          </div>
        )}

        <div className="tx-footer">
          <span className="timestamp">{formatDate(transaction.fetchedAt)}</span>
          {transaction.validContract && (
            <span className="valid-badge">✓ Valid</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default TransactionCard;
