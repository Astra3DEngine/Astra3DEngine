/**
 * @file components/InfoModal.jsx
 * @description 信息模态框组件，显示隐私政策、更新检查和关于信息
 * @module components/InfoModal
 */

import React, { useState, useEffect } from 'react';
import { msg } from '../i18n/index.js';
import IconClose from '../icons/close.svg?react';

const CURRENT_VERSION = '0.1.0';
const GITHUB_REPO = 'LanwyWriteXU/Astra3DEngine';

/**
 * 信息模态框组件
 * @param {Object} props - 组件属性
 * @param {boolean} props.isOpen - 是否打开
 * @param {Function} props.onClose - 关闭回调
 * @param {string} props.type - 类型（privacy/update/about）
 * @returns {JSX.Element|null} 信息模态框组件
 */
function InfoModal({ isOpen, onClose, type }) {
  const [updateState, setUpdateState] = useState('idle');
  const [latestVersion, setLatestVersion] = useState(null);
  const [releaseUrl, setReleaseUrl] = useState(null);

  useEffect(() => {
    if (type === 'update' && isOpen && updateState === 'idle') {
      checkForUpdates();
    }
  }, [type, isOpen]);

  const checkForUpdates = async () => {
    setUpdateState('checking');
    try {
      const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
      if (response.ok) {
        const data = await response.json();
        setLatestVersion(data.tag_name?.replace('v', '') || '0.1.0');
        setReleaseUrl(data.html_url);
        setUpdateState('success');
      } else {
        setUpdateState('error');
      }
    } catch (error) {
      setUpdateState('error');
    }
  };

  if (!isOpen) return null;

  const titles = {
    privacy: msg('info.privacy.title'),
    update: msg('info.update.title'),
    about: msg('info.about.title')
  };

  const renderPrivacy = () => (
    <div className="info-content privacy-content">
      <p className="info-intro">{msg('info.privacy.intro')}</p>
      
      <section className="info-section">
        <h4>{msg('info.privacy.collect.title')}</h4>
        <p>{msg('info.privacy.collect.content')}</p>
      </section>
      
      <section className="info-section">
        <h4>{msg('info.privacy.storage.title')}</h4>
        <p>{msg('info.privacy.storage.content')}</p>
      </section>
      
      <section className="info-section">
        <h4>{msg('info.privacy.third.title')}</h4>
        <p>{msg('info.privacy.third.content')}</p>
      </section>
      
      <section className="info-section">
        <h4>{msg('info.privacy.contact.title')}</h4>
        <p>{msg('info.privacy.contact.content')}</p>
      </section>
    </div>
  );

  const renderUpdate = () => (
    <div className="info-content update-content">
      <div className="update-status">
        {updateState === 'checking' && (
          <div className="update-checking">
            <div className="update-spinner"></div>
            <p>{msg('info.update.checking')}</p>
          </div>
        )}
        
        {updateState === 'success' && (
          <>
            <div className="version-info">
              <div className="version-row">
                <span className="version-label">{msg('info.update.currentVersion')}:</span>
                <span className="version-value">v{CURRENT_VERSION}</span>
              </div>
              <div className="version-row">
                <span className="version-label">{msg('info.update.latestVersion')}:</span>
                <span className="version-value">v{latestVersion}</span>
              </div>
            </div>
            
            {latestVersion !== CURRENT_VERSION ? (
              <div className="update-available">
                <p className="update-message">{msg('info.update.available')}</p>
                <button 
                  className="update-download-btn"
                  onClick={() => window.open(releaseUrl, '_blank')}
                >
                  {msg('info.update.download')}
                </button>
              </div>
            ) : (
              <div className="update-latest">
                <span className="update-check-icon">✓</span>
                <p>{msg('info.update.latest')}</p>
              </div>
            )}
          </>
        )}
        
        {updateState === 'error' && (
          <div className="update-error">
            <p>{msg('info.update.error')}</p>
            <button className="update-retry-btn" onClick={checkForUpdates}>
              {msg('info.update.title')}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderAbout = () => (
    <div className="info-content about-content">
      <div className="about-header">
        <svg className="about-logo" version="1.1" xmlns="http://www.w3.org/2000/svg" height="64" viewBox="0,0,69.99346,66.43688">
          <g transform="translate(-205.00327,-146.78156)">
            <g stroke="#000000" strokeWidth="0" strokeMiterlimit="10">
              <path d="M274.99673,190.93032l-11.95866,22.28812h-44.44009l13.31277,-22.10459z" fill="#0073bf" />
              <path d="M216.31868,212.14198l-11.31541,-21.28864l24.21416,-0.00471z" fill="#66ccff" />
              <path d="M227.50821,146.78156l23.50249,0.00667l23.98603,44.14209l-11.95866,22.28812z" fill="#0099ff" />
              <path d="M205.06042,188.54619l22.44779,-41.76463l23.50249,0.00667l-20.58917,41.73314z" fill="#66ccff" />
            </g>
          </g>
        </svg>
        <div className="about-header-text">
          <h2 className="about-title">{msg('info.about.appName')}</h2>
          <p className="about-version">v{CURRENT_VERSION}</p>
        </div>
      </div>
      <p className="about-tagline">{msg('info.about.tagline')}</p>
      
      <section className="info-section">
        <h4>{msg('info.about.techStack')}</h4>
        <div className="tech-stack">
          <span className="tech-badge">React</span>
          <span className="tech-badge">Three.js</span>
          <span className="tech-badge">Vite</span>
          <span className="tech-badge">Electron</span>
        </div>
      </section>
      
      <section className="info-section">
        <h4>{msg('info.about.links')}</h4>
        <div className="about-links">
          <a href="https://github.com/LanwyWriteXU/Astra3DEngine" target="_blank" rel="noopener noreferrer">
            {msg('info.about.source')}
          </a>
          <a href="https://github.com/LanwyWriteXU/Astra3DEngine/issues" target="_blank" rel="noopener noreferrer">
            {msg('info.about.issues')}
          </a>
        </div>
      </section>
      
      <section className="info-section">
        <h4>{msg('info.about.credits')}</h4>
        <ul className="credits-list">
          <li>
            <span className="credit-role">[{msg('info.about.credit.dev')}]</span>
            <a href="https://cyberneko.cn" target="_blank" rel="noopener noreferrer">Cyberexplorer</a>
          </li>
          <li>
            <span className="credit-role">[{msg('info.about.credit.support1')}]</span>
            <a href="https://github.com/KOSHINOawa" target="_blank" rel="noopener noreferrer">KOSHINO</a>
          </li>
          <li>
            <span className="credit-role">[{msg('info.about.credit.support2')}]</span>
            <a href="https://github.com/NeuronPulse" target="_blank" rel="noopener noreferrer">NeuronPulse</a>
          </li>
        </ul>
      </section>
      
      <p className="about-copyright">{msg('info.about.copyright')}</p>
    </div>
  );

  const contents = {
    privacy: renderPrivacy(),
    update: renderUpdate(),
    about: renderAbout()
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
