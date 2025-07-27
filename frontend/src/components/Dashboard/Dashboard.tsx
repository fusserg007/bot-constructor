import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import PlatformSettings from '../Settings/PlatformSettings';
import styles from './Dashboard.module.css';

const Dashboard: React.FC = () => {
  const { state, fetchBots } = useApp();
  const { bots: rawBots, loading, error } = state;
  
  // Ensure bots is always an array
  const bots = Array.isArray(rawBots) ? rawBots : [];
  
  // Состояние для фильтров
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  
  // Состояние для настроек платформ
  const [platformSettingsVisible, setPlatformSettingsVisible] = useState(false);
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  
  // Состояние для статистики
  const [statsVisible, setStatsVisible] = useState(false);
  const [selectedBotForStats, setSelectedBotForStats] = useState<any>(null);

  useEffect(() => {
    fetchBots();
  }, []);

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingSpinner}></div>
        Loading bots...
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.container}>
          <div className={styles.error}>
            <h2>Loading Error</h2>
            <p>{error}</p>
            <button onClick={fetchBots} className={styles.retryButton}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Фильтрация ботов
  const filteredBots = bots.filter(bot => {
    const matchesSearch = bot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         bot.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || bot.status === statusFilter;
    const matchesPlatform = platformFilter === 'all' || 
                           (bot.platforms && bot.platforms.includes(platformFilter));
    
    return matchesSearch && matchesStatus && matchesPlatform;
  });

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'telegram': return 'TG';
      case 'max': return 'MAX';
      case 'whatsapp': return 'WA';
      case 'discord': return 'DC';
      default: return 'BOT';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const openPlatformSettings = (botId: string) => {
    setSelectedBotId(botId);
    setPlatformSettingsVisible(true);
  };

  const closePlatformSettings = () => {
    setPlatformSettingsVisible(false);
    setSelectedBotId(null);
  };

  const openBotStats = (bot: any) => {
    setSelectedBotForStats(bot);
    setStatsVisible(true);
  };

  const closeBotStats = () => {
    setStatsVisible(false);
    setSelectedBotForStats(null);
  };

  return (
    <div className={styles.dashboard}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <h1>Bot Constructor</h1>
            <p>Multi-platform bot creation and management</p>
          </div>
          <div className={styles.headerActions}>
            <Link to="/editor" className={styles.createButton}>
              Create Bot
            </Link>
          </div>
        </header>

        <div className={styles.stats}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <circle cx="12" cy="5" r="2"/>
                <path d="M12 7v4"/>
              </svg>
            </div>
            <h3>Total Bots</h3>
            <span className={styles.statNumber}>{bots.length}</span>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20,6 9,17 4,12"/>
              </svg>
            </div>
            <h3>Active</h3>
            <span className={styles.statNumber}>
              {bots.filter(bot => bot.status === 'active').length}
            </span>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <h3>Messages Processed</h3>
            <span className={styles.statNumber}>
              {bots.reduce((sum, bot) => sum + (bot.stats?.messagesProcessed || 0), 0)}
            </span>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <h3>Active Users</h3>
            <span className={styles.statNumber}>
              {bots.reduce((sum, bot) => sum + (bot.stats?.activeUsers || 0), 0)}
            </span>
          </div>
        </div>

        {/* Фильтры */}
        <div className={styles.filters}>
          <div className={styles.searchBox}>
            <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search bots..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="draft">Draft</option>
          </select>
          
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">All Platforms</option>
            <option value="telegram">Telegram</option>
            <option value="max">MAX</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="discord">Discord</option>
          </select>
        </div>

        <div className={styles.botsSection}>
          <div className={styles.sectionHeader}>
            <h2>My Bots ({filteredBots.length})</h2>
          </div>

          <div className={styles.botsList}>
          {filteredBots.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <circle cx="12" cy="5" r="2"/>
                  <path d="M12 7v4"/>
                </svg>
              </div>
              <h2>
                {searchQuery || statusFilter !== 'all' || platformFilter !== 'all'
                  ? 'No bots found'
                  : 'No bots yet'
                }
              </h2>
              <p>
                {searchQuery || statusFilter !== 'all' || platformFilter !== 'all'
                  ? 'Try adjusting your search filters'
                  : 'Create your first bot to get started with the constructor'
                }
              </p>
              {!searchQuery && statusFilter === 'all' && platformFilter === 'all' && (
                <Link to="/editor" className={styles.createButton}>
                  Create First Bot
                </Link>
              )}
            </div>
          ) : (
            filteredBots.map(bot => (
              <div key={bot.id} className={`${styles.botCard} ${styles[bot.status]}`}>
                <div className={styles.botHeader}>
                  <div className={styles.botTitle}>
                    <h3>{bot.name}</h3>
                    <div className={styles.botId}>ID: {bot.id.slice(0, 8)}...</div>
                  </div>
                  <span className={`${styles.status} ${styles[bot.status]}`}>
                    {bot.status === 'active' ? 'Active' : 
                     bot.status === 'draft' ? 'Draft' : 'Paused'}
                  </span>
                </div>
                <p className={styles.botDescription}>{bot.description}</p>
                <div className={styles.botMeta}>
                  <div className={styles.botPlatforms}>
                    {bot.platforms?.map(platform => (
                      <span key={platform} className={styles.platformBadge}>
                        {getPlatformIcon(platform)} {platform}
                      </span>
                    )) || <span className={styles.noPlatforms}>No platforms configured</span>}
                  </div>
                  
                  <div className={styles.botDates}>
                    <span>Created: {formatDate(bot.createdAt)}</span>
                    {bot.updatedAt !== bot.createdAt && (
                      <span>Updated: {formatDate(bot.updatedAt)}</span>
                    )}
                  </div>
                </div>

                <div className={styles.botStats}>
                  <div className={styles.statItem}>
                    <span className={styles.label}>Messages</span>
                    <span className={styles.value}>{bot.stats?.messagesProcessed || 0}</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.label}>Users</span>
                    <span className={styles.value}>{bot.stats?.activeUsers || 0}</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.label}>Uptime</span>
                    <span className={styles.value}>{((bot.stats?.uptime || 0) * 100).toFixed(1)}%</span>
                  </div>
                </div>
                <div className={styles.botActions}>
                  <Link to={`/editor/${bot.id}`} className={styles.editButton}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Edit
                  </Link>
                  <button 
                    className={styles.statsButton}
                    onClick={() => openBotStats(bot)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="20" x2="18" y2="10"/>
                      <line x1="12" y1="20" x2="12" y2="4"/>
                      <line x1="6" y1="20" x2="6" y2="14"/>
                    </svg>
                    Stats
                  </button>
                  <button 
                    className={styles.settingsButton}
                    onClick={() => openPlatformSettings(bot.id)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="3"/>
                      <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"/>
                    </svg>
                    Platforms
                  </button>
                </div>
              </div>
            ))
          )}
          </div>
        </div>
      </div>

      {/* Модальное окно настроек платформ */}
      {platformSettingsVisible && selectedBotId && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <PlatformSettings
              botId={selectedBotId}
              onClose={closePlatformSettings}
            />
          </div>
        </div>
      )}

      {/* Модальное окно статистики бота */}
      {statsVisible && selectedBotForStats && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.statsModal}>
              <div className={styles.statsHeader}>
                <h2>Bot Statistics: {selectedBotForStats.name}</h2>
                <button onClick={closeBotStats} className={styles.closeButton}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <h3>Messages Processed</h3>
                  <span className={styles.statNumber}>
                    {selectedBotForStats.stats?.messagesProcessed || 0}
                  </span>
                </div>
                <div className={styles.statCard}>
                  <h3>Active Users</h3>
                  <span className={styles.statNumber}>
                    {selectedBotForStats.stats?.activeUsers || 0}
                  </span>
                </div>
                <div className={styles.statCard}>
                  <h3>Uptime</h3>
                  <span className={styles.statNumber}>
                    {((selectedBotForStats.stats?.uptime || 0) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className={styles.statCard}>
                  <h3>Last Activity</h3>
                  <span className={styles.statText}>
                    {selectedBotForStats.stats?.lastActivity 
                      ? formatDate(selectedBotForStats.stats.lastActivity)
                      : 'Never'
                    }
                  </span>
                </div>
              </div>

              <div className={styles.platformStats}>
                <h3>Platform Status</h3>
                <div className={styles.platformList}>
                  {selectedBotForStats.platforms?.map((platform: string) => (
                    <div key={platform} className={styles.platformItem}>
                      <span className={styles.platformName}>
                        {getPlatformIcon(platform)} {platform}
                      </span>
                      <span className={`${styles.platformStatus} ${styles.active}`}>
                        Connected
                      </span>
                    </div>
                  )) || <p>No platforms configured</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;