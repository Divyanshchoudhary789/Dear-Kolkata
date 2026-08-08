import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Landmark, Users, RefreshCw, Loader } from 'lucide-react';
import * as productApi from '../../api/productApi';
import * as couponApi from '../../api/couponApi';
import * as adminApi from '../../api/adminApi';
import * as walletApi from '../../api/walletApi';
import { showSuccess, showError } from '../../utils/toast';

const money = (value) => `Rs ${Number(value || 0).toLocaleString()}`;
const idOf = (item) => item?._id || item?.id;

const OpsCenter = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingProducts, setPendingProducts] = useState([]);
  const [pendingCoupons, setPendingCoupons] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [clients, setClients] = useState([]);
  const [ledger, setLedger] = useState(null);
  const [busyId, setBusyId] = useState('');
  const [walletForm, setWalletForm] = useState({ userId: '', amount: '', description: '' });

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [productsRes, couponsRes, payoutsRes, clientsRes, ledgerRes] = await Promise.all([
        productApi.getPendingProducts({ limit: 50 }),
        couponApi.getPendingCoupons({ limit: 50 }),
        adminApi.getAllPayouts({ limit: 50 }),
        adminApi.getAllClients({ limit: 50 }),
        adminApi.getWalletLedger(),
      ]);
      if (productsRes?.success) setPendingProducts(productsRes.data.products || []);
      if (couponsRes?.success) setPendingCoupons(couponsRes.data.coupons || []);
      if (payoutsRes?.success) setPayouts(payoutsRes.data.payouts || []);
      if (clientsRes?.success) setClients(clientsRes.data.clients || []);
      if (ledgerRes?.success) setLedger(ledgerRes.data);
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const decideProduct = async (product, approve) => {
    const id = idOf(product);
    const reason = approve ? '' : window.prompt('Reason for product rejection?');
    if (!approve && !reason) return;
    setBusyId(id);
    try {
      const res = approve
        ? await productApi.approveProduct(id)
        : await productApi.rejectProduct(id, reason);
      if (res?.success) {
        setPendingProducts(prev => prev.filter(p => idOf(p) !== id));
        showSuccess(`Product ${approve ? 'approved' : 'rejected'}.`);
      }
    } catch (err) {
      showError(err.message);
    } finally {
      setBusyId('');
    }
  };

  const decideCoupon = async (coupon, approve) => {
    const id = idOf(coupon);
    const reason = approve ? '' : window.prompt('Reason for coupon rejection?');
    if (!approve && !reason) return;
    setBusyId(id);
    try {
      const res = approve
        ? await couponApi.approveCoupon(id)
        : await couponApi.rejectCoupon(id, reason);
      if (res?.success) {
        setPendingCoupons(prev => prev.filter(c => idOf(c) !== id));
        showSuccess(`Coupon ${approve ? 'approved' : 'rejected'}.`);
      }
    } catch (err) {
      showError(err.message);
    } finally {
      setBusyId('');
    }
  };

  const processPayout = async (payout, action) => {
    const id = idOf(payout);
    const reason = action === 'hold' ? window.prompt('Reason for holding payout?') : '';
    if (action === 'hold' && !reason) return;
    setBusyId(id);
    try {
      const res = action === 'release'
        ? await adminApi.releasePayout(id)
        : await adminApi.holdPayout(id, reason);
      if (res?.success) {
        setPayouts(prev => prev.map(p => idOf(p) === id ? res.data.payout : p));
        showSuccess(action === 'release' ? 'Payout released.' : 'Payout held.');
      }
    } catch (err) {
      showError(err.message);
    } finally {
      setBusyId('');
    }
  };

  const adjustWallet = async (type) => {
    const { userId, amount, description } = walletForm;
    if (!userId || !amount || !description.trim()) {
      showError('Select client, amount and description.');
      return;
    }
    setBusyId(`wallet-${type}`);
    try {
      const res = type === 'credit'
        ? await walletApi.adminCreditWallet(userId, Number(amount), description)
        : await walletApi.adminDebitWallet(userId, Number(amount), description);
      if (res?.success) {
        showSuccess(`Wallet ${type === 'credit' ? 'credited' : 'debited'}.`);
        setWalletForm({ userId: '', amount: '', description: '' });
        load();
      }
    } catch (err) {
      showError(err.message);
    } finally {
      setBusyId('');
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '64px' }}><Loader size={28} className="spin" style={{ color: 'var(--crimson)' }} /></div>;
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: '24px' }}>Ops Center</h2>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Moderation, payout control and client wallet operations.</span>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 14px', cursor: refreshing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', opacity: refreshing ? 0.6 : 1 }}
        >
          {refreshing ? <Loader size={14} className="spin" /> : <RefreshCw size={14} />} Refresh
        </button>
      </div>

      <div className="analytics-grid">
        <div className="analytics-card"><div className="analytics-icon" style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}><CheckCircle size={20} /></div><div className="analytics-info"><div className="value">{pendingProducts.length}</div><div className="label">Products Pending</div></div></div>
        <div className="analytics-card"><div className="analytics-icon" style={{ backgroundColor: 'var(--crimson-light)', color: 'var(--crimson)' }}><XCircle size={20} /></div><div className="analytics-info"><div className="value">{pendingCoupons.length}</div><div className="label">Coupons Pending</div></div></div>
        <div className="analytics-card"><div className="analytics-icon" style={{ backgroundColor: '#E0F2FE', color: '#0284C7' }}><Landmark size={20} /></div><div className="analytics-info"><div className="value">{money(ledger?.totalLiability)}</div><div className="label">Wallet Liability</div></div></div>
        <div className="analytics-card"><div className="analytics-icon" style={{ backgroundColor: '#ECFDF5', color: '#10B981' }}><Users size={20} /></div><div className="analytics-info"><div className="value">{clients.length}</div><div className="label">Loaded Clients</div></div></div>
      </div>

      <Section title="Product Moderation">
        {pendingProducts.length === 0 ? <Empty text="No products pending review." /> : pendingProducts.map(product => (
          <ReviewRow
            key={idOf(product)}
            title={product.name}
            meta={`${product.vendor?.name || 'Vendor'} | ${product.category} | ${money(product.price)} | Stock ${product.stock}`}
            busy={busyId === idOf(product)}
            onApprove={() => decideProduct(product, true)}
            onReject={() => decideProduct(product, false)}
          />
        ))}
      </Section>

      <Section title="Coupon Moderation">
        {pendingCoupons.length === 0 ? <Empty text="No coupons pending review." /> : pendingCoupons.map(coupon => (
          <ReviewRow
            key={idOf(coupon)}
            title={coupon.name}
            meta={`${coupon.vendor?.name || 'Admin'} | ${coupon.type} | ${coupon.value} | Price ${money(coupon.price)}`}
            busy={busyId === idOf(coupon)}
            onApprove={() => decideCoupon(coupon, true)}
            onReject={() => decideCoupon(coupon, false)}
          />
        ))}
      </Section>

      <Section title="Payout Control">
        {payouts.length === 0 ? <Empty text="No payouts found." /> : payouts.map(payout => {
          const pid      = idOf(payout);
          const isBusy   = busyId === pid;
          const isLocked = ['released', 'cancelled'].includes(payout.status);
          return (
            <div key={pid} className="ops-row">
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ fontSize: '14px', display: 'block', marginBottom: '3px' }}>
                  {payout.order?.orderNumber || pid}
                </strong>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                  <span style={{ fontWeight: 600 }}>{payout.vendor?.name || 'Vendor'}</span>
                  {' · '}Net <strong>{money(payout.amount)}</strong>
                  {' · '}Comm {money(payout.commissionDeducted)}
                  {' · '}
                  <span style={{
                    display: 'inline-block', padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700,
                    backgroundColor: payout.status === 'released' ? '#D1FAE5' : payout.status === 'held' ? '#FEF3C7' : '#DBEAFE',
                    color:           payout.status === 'released' ? '#065F46' : payout.status === 'held' ? '#92400E' : '#1E40AF',
                  }}>{payout.status}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button
                  disabled={isBusy || isLocked}
                  onClick={() => processPayout(payout, 'release')}
                  className="ops-btn ops-btn--green"
                >
                  {isBusy ? <Loader size={12} className="spin"/> : 'Release'}
                </button>
                <button
                  disabled={isBusy || isLocked}
                  onClick={() => processPayout(payout, 'hold')}
                  className="ops-btn ops-btn--amber"
                >
                  Hold
                </button>
              </div>
            </div>
          );
        })}
      </Section>

      <Section title="Client Wallet Operations">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', alignItems: 'end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Client</label>
            <select value={walletForm.userId} onChange={e => setWalletForm(p => ({ ...p, userId: e.target.value }))}>
              <option value="">Select client</option>
              {clients.map(client => <option key={idOf(client)} value={idOf(client)}>{client.name || client.phone} ({money(client.walletBalance)})</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Amount</label>
            <input type="number" min={1} value={walletForm.amount} onChange={e => setWalletForm(p => ({ ...p, amount: e.target.value }))} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Description</label>
            <input type="text" value={walletForm.description} onChange={e => setWalletForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <button className="btn-primary" style={{ width: 'auto', padding: '11px 14px' }} disabled={busyId === 'wallet-credit'} onClick={() => adjustWallet('credit')}>Credit</button>
          <button className="btn-outline-white" style={{ color: 'var(--crimson)', borderColor: 'var(--crimson)', padding: '11px 14px' }} disabled={busyId === 'wallet-debit'} onClick={() => adjustWallet('debit')}>Debit</button>
        </div>
      </Section>
    </div>
  );
};

const rowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '16px',
  alignItems: 'center',
  padding: '12px',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  backgroundColor: 'var(--bg-festive)'
};

const smallButton = (color) => ({
  border: `1px solid ${color}`,
  color,
  background: '#fff',
  padding: '6px 12px',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 700
});

const Section = ({ title, children }) => (
  <div style={{ backgroundColor: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
    <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>{title}</h3>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>{children}</div>
  </div>
);

const Empty = ({ text }) => <div style={{ padding: '20px', color: 'var(--text-muted)', textAlign: 'center', fontSize: '13px' }}>{text}</div>;

const ReviewRow = ({ title, meta, busy, onApprove, onReject }) => (
  <div className="ops-row">
    <div style={{ flex: 1, minWidth: 0 }}>
      <strong style={{ fontSize: '14px', display: 'block', marginBottom: '3px' }}>{title}</strong>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5', wordBreak: 'break-word' }}>{meta}</div>
    </div>
    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
      <button disabled={busy} onClick={onApprove} className="ops-btn ops-btn--green">
        {busy ? <Loader size={12} className="spin"/> : 'Approve'}
      </button>
      <button disabled={busy} onClick={onReject} className="ops-btn ops-btn--red">Reject</button>
    </div>
  </div>
);

export default OpsCenter;
