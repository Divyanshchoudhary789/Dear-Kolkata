import React from 'react';
import { Heart, Globe, Share2, Send, ShieldCheck, Store } from 'lucide-react';

const Footer = ({ onPartnerLogin }) => {
  return (
    <footer className="site-footer">
      <div className="footer-content">
        <div className="footer-grid">

          {/* Brand */}
          <div className="footer-col brand-col">
            <div className="footer-logo">Dear <span>Kolkata</span></div>
            <p className="footer-desc">
              Your neighborhood curation for Kolkata's finest sarees, traditional jewellery, and
              local boutique deals. Celebrating Bengal's heritage and craftsmanship.
            </p>
            <div className="footer-socials">
              <a href="#website" aria-label="Website"><Globe size={18} /></a>
              <a href="#share"   aria-label="Share"><Share2 size={18} /></a>
              <a href="#newsletter" aria-label="Newsletter"><Send size={18} /></a>
            </div>
          </div>

          {/* Shop Occasions */}
          <div className="footer-col">
            <h4>Shop Occasions</h4>
            <ul>
              <li><a href="#shop" className="footer-link">Elegant &amp; Traditional</a></li>
              <li><a href="#shop" className="footer-link">Glamorous &amp; Festive</a></li>
              <li><a href="#shop" className="footer-link">Sindoor Khela Special</a></li>
              <li><a href="#shop" className="footer-link">Trendy &amp; Stylish</a></li>
            </ul>
          </div>

          {/* Boutique Hubs */}
          <div className="footer-col">
            <h4>Boutique Hubs</h4>
            <ul>
              <li><a href="#shop" className="footer-link">Bowbazar (Jewellery)</a></li>
              <li><a href="#shop" className="footer-link">Gariahat (Food &amp; Sarees)</a></li>
              <li><a href="#shop" className="footer-link">Park Street (Kurtas)</a></li>
              <li><a href="#shop" className="footer-link">Lindsay Street (Footwear)</a></li>
            </ul>
          </div>

          {/* Trust + Partner Login */}
          <div className="footer-col">
            <h4>Trust &amp; Verification</h4>
            <div className="trust-badge-footer">
              <ShieldCheck size={20} className="trust-icon" />
              <span>100% Verified Local Sellers</span>
            </div>
            <p className="footer-zone-msg">
              All transactions are geo-restricted to Kolkata Zone to support local artisans and
              merchants.
            </p>

            {/* Partner / Admin login button */}
            <button
              onClick={onPartnerLogin}
              className="footer-partner-btn"
            >
              <Store size={14} />
              <span>Partner / Admin Login</span>
            </button>
          </div>
        </div>

        <div className="footer-divider" />

        <div className="footer-bottom">
          <div className="footer-copyright">© 2026 Dear Kolkata. All rights reserved.</div>
          <div className="footer-love">
            Made with <Heart size={14} className="heart-icon" /> for Kolkata
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
