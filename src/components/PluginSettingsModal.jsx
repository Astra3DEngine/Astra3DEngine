import React, { useState, useEffect, useMemo } from 'react';
import { getPluginManager, pluginMsg, subscribePluginLocale } from '../plugins';
import { msg } from '../i18n/index.js';

import IconTagAll from '../icons/tag-all.svg?react';
import IconTagNew from '../icons/tag-new.svg?react';
import IconTagRecommended from '../icons/tag-recommended.svg?react';
import IconTagTheme from '../icons/tag-theme.svg?react';
import IconTagDebug from '../icons/tag-debug.svg?react';
import IconTagDanger from '../icons/tag-danger.svg?react';

const TAGS = [
  { id: 'all', labelKey: 'tagAll', Icon: IconTagAll },
  { id: 'new', labelKey: 'tagNew', Icon: IconTagNew },
  { id: 'recommended', labelKey: 'tagRecommended', Icon: IconTagRecommended },
  { id: 'theme', labelKey: 'tagTheme', Icon: IconTagTheme },
  { id: 'debug', labelKey: 'tagDebug', Icon: IconTagDebug },
  { id: 'danger', labelKey: 'tagDanger', Icon: IconTagDanger }
];

/**
 * 插件设置模态框组件，诶为什么你这么宽，诶不是你怎么这么高，我去你怎么到屏幕外面去了。
 * @param {Object} props - 组件属性
 * @param {boolean} props.isOpen - 是否打开
 * @param {Function} props.onClose - 关闭回调
 * @returns {JSX.Element|null} 插件设置模态框组件
 */
const PluginSettingsModal = ({ isOpen, onClose }) => {
  const [plugins, setPlugins] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('all');
  const [, forceUpdate] = useState(0);
  const pluginManager = getPluginManager();

  useEffect(() => {
    if (isOpen) {
      setPlugins(pluginManager.getPlugins());
    }
  }, [isOpen]);

  useEffect(() => {
    const unsubscribe = subscribePluginLocale(() => {
      forceUpdate(n => n + 1);
    });
    return unsubscribe;
  }, []);

  const handleTogglePlugin = async (pluginId, enabled) => {
    if (enabled) {
      await pluginManager.disablePlugin(pluginId);
    } else {
      await pluginManager.enablePlugin(pluginId);
    }
    setPlugins(pluginManager.getPlugins());
  };

  // 你看看，直接就可以获取插件元数据，爽炸了
  const getPluginName = (plugin) => {
    const l10nName = pluginMsg(plugin.id, 'name');
    return l10nName !== 'name' ? l10nName : plugin.manifest.name;
  };

  const getPluginDescription = (plugin) => {
    const l10nDesc = pluginMsg(plugin.id, 'description');
    return l10nDesc !== 'description' ? l10nDesc : plugin.manifest.description;
  };

  const getPluginTags = (plugin) => {
    return plugin.manifest.tags || [];
  };

  const filteredPlugins = useMemo(() => {
    return plugins.filter(plugin => {
      const name = getPluginName(plugin).toLowerCase();
      const desc = getPluginDescription(plugin).toLowerCase();
      const matchesSearch = name.includes(searchQuery.toLowerCase()) || desc.includes(searchQuery.toLowerCase());
      
      if (selectedTag === 'all') {
        return matchesSearch;
      }
      
      const pluginTags = getPluginTags(plugin);
      const matchesTag = pluginTags.includes(selectedTag);
      
      return matchesSearch && matchesTag;
    });
  }, [plugins, searchQuery, selectedTag]);

  const getTagLabel = (tagId) => {
    const tag = TAGS.find(t => t.id === tagId);
    if (!tag) return tagId;
    return msg(`pluginSettings.${tag.labelKey}`);
  };

  const getTagIcon = (tagId) => {
    const tag = TAGS.find(t => t.id === tagId);
    return tag ? tag.Icon : null;
  };

  const getPluginCountByTag = (tagId) => {
    if (tagId === 'all') return plugins.length;
    return plugins.filter(p => getPluginTags(p).includes(tagId)).length;
  };

  if (!isOpen) return null;

  return (
    <div className="plugin-settings-overlay" onClick={onClose}>
      <div className="plugin-settings-modal" onClick={e => e.stopPropagation()}>
        <div className="plugin-settings-header">
          <h2>{msg('pluginSettings.title')}</h2>
          <button className="plugin-settings-close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="plugin-settings-body">
          <div className="plugin-settings-sidebar">
            <div className="plugin-settings-search">
              <input
                type="text"
                placeholder={msg('pluginSettings.searchPlaceholder')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="plugin-settings-tags">
              {TAGS.map(tag => {
                const count = getPluginCountByTag(tag.id);
                if (count === 0 && tag.id !== 'all') return null;
                const TagIcon = tag.Icon;
                return (
                  <button
                    key={tag.id}
                    className={`plugin-settings-tag-btn ${selectedTag === tag.id ? 'active' : ''} tag-${tag.id}`}
                    onClick={() => setSelectedTag(tag.id)}
                  >
                    <span className="tag-icon"><TagIcon /></span>
                    <span className="tag-label">{msg(`pluginSettings.${tag.labelKey}`)}</span>
                    <span className="tag-count">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className="plugin-settings-content">
            <div className="plugin-settings-plugin-list">
              {filteredPlugins.length === 0 ? (
                <div className="plugin-settings-empty-message">
                  {searchQuery || selectedTag !== 'all' 
                    ? msg('pluginSettings.noResults') 
                    : msg('pluginSettings.noPlugins')}
                </div>
              ) : (
                filteredPlugins.map(plugin => {
                  const isEnabled = pluginManager.isPluginEnabled(plugin.id);
                  const pluginTags = getPluginTags(plugin);
                  return (
                    <div key={plugin.id} className="plugin-settings-plugin-item">
                      <div className="plugin-settings-plugin-info">
                        <div className="plugin-settings-plugin-header">
                          <span className="plugin-settings-plugin-name">{getPluginName(plugin)}</span>
                          <span className="plugin-settings-plugin-version">v{plugin.manifest.version || '1.0.0'}</span>
                        </div>
                        <p className="plugin-settings-plugin-description">{getPluginDescription(plugin)}</p>
                        <div className="plugin-settings-plugin-meta">
                          {plugin.manifest.author && (
                            <span className="plugin-settings-plugin-author">{msg('pluginSettings.author', { 0: plugin.manifest.author })}</span>
                          )}
                          {pluginTags.length > 0 && (
                            <div className="plugin-settings-plugin-tags">
                              {pluginTags.map(t => {
                                const TagIcon = getTagIcon(t);
                                return (
                                  <span key={t} className={`plugin-tag plugin-tag-${t}`}>
                                    {TagIcon && <TagIcon className="plugin-tag-icon" />}
                                    {getTagLabel(t)}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="plugin-settings-plugin-controls">
                        <label className="plugin-settings-switch">
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={() => handleTogglePlugin(plugin.id, isEnabled)}
                          />
                          <span className="plugin-settings-slider"></span>
                        </label>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
        
        <div className="plugin-settings-footer">
          <p className="plugin-settings-hint">
            {msg('pluginSettings.hint')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PluginSettingsModal;
