import React from 'react';
import IconClose from '../icons/close.svg?react';

function InfoModal({ isOpen, onClose, type }) {
  if (!isOpen) return null;

  const titles = {
    privacy: '隐私政策',
    update: '检查更新',
    about: '关于'
  };

  const contents = {
    privacy: (
      <div className="info-content">
        <p>隐私政策内容待编辑...</p>
      </div>
    ),
    update: (
      <div className="info-content">
        <p>正在检查更新...</p>
        <p style={{ marginTop: '12px', color: 'var(--text-secondary)' }}>
          当前版本: 1.0.0
        </p>
      </div>
    ),
    about: (
      <div className="info-content">
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" height="48" viewBox="0,0,69.99346,66.43688">
            <g transform="translate(-205.00327,-146.78156)">
              <g stroke="#000000" strokeWidth="0" strokeMiterlimit="10">
                <path d="M274.99673,190.93032l-11.95866,22.28812h-44.44009l13.31277,-22.10459z" fill="#0073bf" />
                <path d="M216.31868,212.14198l-11.31541,-21.28864l24.21416,-0.00471z" fill="#66ccff" />
                <path d="M227.50821,146.78156l23.50249,0.00667l23.98603,44.14209l-11.95866,22.28812z" fill="#0099ff" />
                <path d="M205.06042,188.54619l22.44779,-41.76463l23.50249,0.00667l-20.58917,41.73314z" fill="#66ccff" />
              </g>
            </g>
          </svg>
        </div>
        <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Astra 3D Engine</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          version 1.0.0
        </p>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          A joking 3D engine.
        </p>
      </div>
    )
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal info-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{titles[type]}</h3>
          <button className="modal-close-btn" onClick={onClose}>
            <IconClose />
          </button>
        </div>
        <div className="modal-body">
          {contents[type]}
        </div>
      </div>
    </div>
  );
}

export default InfoModal;
