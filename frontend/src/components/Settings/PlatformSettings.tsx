import React, { useState, useEffect } from 'react';
import styles from './PlatformSettings.module.css';

interface PlatformConfig {
  platform: string;
  enabled: boolean;
  credentials: Record<string, string>;
  mode: 'polling' | 'webhook';
  status: 'connected' | 'disconnected' | 'testing' | 'error';
  lastError?: string;
}

interface PlatformSettingsProps {
  botId: string;
  onClose?: () => void;
}

const PLATFORMS = [
  {
    id: 'telegram',
    name: 'Telegram',
    icon: '📱',
    description: 'Telegram Bot API',
    credentialFields: [
      { key: 'token', label: 'Bot Token', type: 'password', placeholder: '1234567890:AAAA...' }
    ],
    supportsModes: ['polling', 'webhook'],
    docsUrl: 'https://core.telegram.org/bots#creating-a-new-bot'
  },
  {
    id: 'max',
    name: 'MAX',
    icon: '💬',
    description: 'MAX Messenger API',
    credentialFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'your-api-key' },
      { key: 'secretKey', label: 'Secret Key', type: 'password', placeholder: 'your-secret-key' }
    ],
    supportsModes: ['polling', 'webhook'],
    docsUrl: '#'
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: '📞',
    description: 'WhatsApp Business API',
    credentialFields: [
      { key: 'phoneNumberId', label: 'Phone Number ID', type: 'text', placeholder: '1234567890' },
      { key: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'your-access-token' }
    ],
    supportsModes: ['webhook'],
    docsUrl: 'https://developers.facebook.com/docs/whatsapp'
  },
  {
    id: 'discord',
    name: 'Discord',
    icon: '🎮',
    description: 'Discord Bot API',
    credentialFields: [
      { key: 'token', label: 'Bot Token', type: 'password', placeholder: 'your-bot-token' }
    ],
    supportsModes: ['webhook'],
    docsUrl: 'https://discord.com/developers/docs/intro'
  }
];

export const PlatformSettings: React.FC<PlatformSettingsProps> = ({ botId, onClose }) => {
  const [platforms, setPlatforms] = useState<PlatformConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPlatformSettings();
  }, [botId]);

  const loadPlatformSettings = async () => {
    try {
      const response = await fetch(`/api/bots/${botId}/platforms`);
      if (response.ok) {
        const data = await response.json();
        setPlatforms(data.platforms || []);
      } else {
        // Инициализируем пустые настройки
        const initialPlatforms = PLATFORMS.map(p => ({
          platform: p.id,
          enabled: false,
          credentials: {},
          mode: p.supportsModes[0] as 'polling' | 'webhook',
          status: 'disconnected' as const
        }));
        setPlatforms(initialPlatforms);
      }
    } catch (error) {
      console.error('Ошибка загрузки настроек платформ:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePlatform = (platformId: string, updates: Partial<PlatformConfig>) => {
    setPlatforms(prev => prev.map(p => 
      p.platform === platformId ? { ...p, ...updates } : p
    ));
  };

  const testConnection = async (platformId: string) => {
    const platform = platforms.find(p => p.platform === platformId);
    if (!platform) return;

    updatePlatform(platformId, { status: 'testing' });

    try {
      const response = await fetch(`/api/bots/${botId}/platforms/${platformId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentials: platform.credentials,
          mode: platform.mode
        })
      });

      const result = await response.json();
      
      if (result.success) {
        updatePlatform(platformId, { 
          status: 'connected',
          lastError: undefined
        });
      } else {
        updatePlatform(platformId, { 
          status: 'error',
          lastError: result.error
        });
      }
    } catch (error) {
      updatePlatform(platformId, { 
        status: 'error',
        lastError: 'Ошибка подключения к серверу'
      });
    }
  };

  const savePlatformSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/bots/${botId}/platforms`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platforms })
      });

      if (response.ok) {
        alert('Настройки платформ сохранены!');
      } else {
        const error = await response.json();
        alert(`Ошибка сохранения: ${error.error}`);
      }
    } catch (error) {
      alert('Ошибка сохранения настроек');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return '#10b981';
      case 'testing': return '#f59e0b';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected': return 'Подключено';
      case 'testing': return 'Тестирование...';
      case 'error': return 'Ошибка';
      default: return 'Не подключено';
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        Загрузка настроек...
      </div>
    );
  }

  return (
    <div className={styles.platformSettings}>
      <div className={styles.header}>
        <h2>Настройки платформ</h2>
        {onClose && (
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        )}
      </div>

      <div className={styles.content}>
        <div className={styles.description}>
          <p>
            Настройте подключения к различным мессенджерам. Каждая платформа требует 
            свои учетные данные и поддерживает разные режимы работы.
          </p>
        </div>

        <div className={styles.platformsList}>
          {PLATFORMS.map(platformInfo => {
            const platform = platforms.find(p => p.platform === platformInfo.id) || {
              platform: platformInfo.id,
              enabled: false,
              credentials: {},
              mode: platformInfo.supportsModes[0] as 'polling' | 'webhook',
              status: 'disconnected' as const
            };

            return (
              <div key={platformInfo.id} className={styles.platformCard}>
                <div className={styles.platformHeader}>
                  <div className={styles.platformInfo}>
                    <span className={styles.platformIcon}>{platformInfo.icon}</span>
                    <div>
                      <h3>{platformInfo.name}</h3>
                      <p>{platformInfo.description}</p>
                    </div>
                  </div>
                  
                  <div className={styles.platformControls}>
                    <div className={styles.statusIndicator}>
                      <span 
                        className={styles.statusDot}
                        style={{ backgroundColor: getStatusColor(platform.status) }}
                      />
                      {getStatusText(platform.status)}
                    </div>
                    
                    <label className={styles.enableSwitch}>
                      <input
                        type="checkbox"
                        checked={platform.enabled}
                        onChange={(e) => updatePlatform(platformInfo.id, { 
                          enabled: e.target.checked 
                        })}
                      />
                      <span className={styles.slider}></span>
                    </label>
                  </div>
                </div>

                {platform.enabled && (
                  <div className={styles.platformConfig}>
                    <div className={styles.credentials}>
                      <h4>Учетные данные</h4>
                      {platformInfo.credentialFields.map(field => (
                        <div key={field.key} className={styles.field}>
                          <label>{field.label}</label>
                          <input
                            type={field.type}
                            placeholder={field.placeholder}
                            value={platform.credentials[field.key] || ''}
                            onChange={(e) => updatePlatform(platformInfo.id, {
                              credentials: {
                                ...platform.credentials,
                                [field.key]: e.target.value
                              }
                            })}
                          />
                        </div>
                      ))}
                      
                      <a 
                        href={platformInfo.docsUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={styles.docsLink}
                      >
                        📖 Как получить учетные данные
                      </a>
                    </div>

                    <div className={styles.modeSelection}>
                      <h4>Режим работы</h4>
                      <div className={styles.modeOptions}>
                        {platformInfo.supportsModes.map(mode => (
                          <label key={mode} className={styles.modeOption}>
                            <input
                              type="radio"
                              name={`mode-${platformInfo.id}`}
                              value={mode}
                              checked={platform.mode === mode}
                              onChange={(e) => updatePlatform(platformInfo.id, {
                                mode: e.target.value as 'polling' | 'webhook'
                              })}
                            />
                            <span className={styles.modeLabel}>
                              {mode === 'polling' ? '🔄 Polling' : '🔗 Webhook'}
                            </span>
                            <span className={styles.modeDescription}>
                              {mode === 'polling' 
                                ? 'Регулярные запросы к API' 
                                : 'Получение уведомлений через webhook'
                              }
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className={styles.testSection}>
                      <button
                        className={styles.testButton}
                        onClick={() => testConnection(platformInfo.id)}
                        disabled={platform.status === 'testing'}
                      >
                        {platform.status === 'testing' ? '⏳ Тестирование...' : '🧪 Тест подключения'}
                      </button>
                      
                      {platform.lastError && (
                        <div className={styles.error}>
                          ❌ {platform.lastError}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className={styles.actions}>
          <button
            className={styles.saveButton}
            onClick={savePlatformSettings}
            disabled={saving}
          >
            {saving ? 'Сохранение...' : 'Сохранить настройки'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlatformSettings;