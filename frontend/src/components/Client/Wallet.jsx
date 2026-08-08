import React, { useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { Wallet as WalletIcon, ArrowDownCircle, ArrowUpCircle, Info, RefreshCw, Loader } from 'lucide-react';

const Wallet = () => {
  const { walletBalance, walletTransactions, fetchWallet, loadingWallet } = useContext(AppContext);

  return (
    <div className="animate-fade-in">
      <div className="page-title-banner">
        <div>
          <h2>Your Gifting Wallet</h2>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>Cashback credits earned from coupon redemptions</p>
        </div>
        <button
          onClick={fetchWallet}
          disabled={loadingWallet}
          className="btn-refresh"
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 16px', cursor: loadingWallet ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', opacity: loadingWallet ? 0.6 : 1, flexShrink: 0 }}
        >
          {loadingWallet ? <Loader size={14} className="spin" /> : <RefreshCw size={14} />} Refresh
        </button>
      </div>

      <div className="wallet-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="wallet-balance-card">
            <div className="trust-icon-container" style={{ margin: '0 auto 12px auto', backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff' }}>
              <WalletIcon size={20} />
            </div>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>Current Wallet Balance</div>
            <div className="wallet-balance-amount">₹{walletBalance.toFixed(2)}</div>
            <span style={{ fontSize: '12px', opacity: 0.8 }}>Apply towards future purchases on checkout</span>
          </div>

          <div style={{ backgroundColor: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              <Info size={16} style={{ color: 'var(--gold)', flexShrink: 0, marginTop: '2px' }} />
              <span>Wallet balance is earned via coupon redemption cashbacks. Use it during checkout by selecting "Dear Kolkata Wallet" as your payment method.</span>
            </div>
          </div>
        </div>

        <div className="wallet-history">
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '700', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
            Transaction Ledger
          </h3>
          {walletTransactions.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>No transactions yet.</div>
          ) : (
            <div className="table-scroll">
              <table className="tx-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Date</th>
                    <th>Type</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {walletTransactions.map(tx => (
                    <tr key={tx._id || tx.id}>
                      <td style={{ fontWeight: '500' }}>{tx.description}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                        {new Date(tx.createdAt || tx.date).toLocaleDateString()} {new Date(tx.createdAt || tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '600' }} className={tx.type === 'Credit' ? 'tx-credit' : 'tx-debit'}>
                          {tx.type === 'Credit' ? <ArrowDownCircle size={14} /> : <ArrowUpCircle size={14} />}
                          {tx.type}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: '700' }} className={tx.type === 'Credit' ? 'tx-credit' : 'tx-debit'}>
                        {tx.type === 'Credit' ? '+' : '-'}₹{tx.amount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Wallet;
