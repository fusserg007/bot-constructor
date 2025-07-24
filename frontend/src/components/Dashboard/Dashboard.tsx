import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import styles from './Dashboard.module.css';

const Dashboard: React.FC = () => {
  const { state, fetchBots } = useApp();
  const { bots: rawBots, loading, error } = state;
  
  // Ensure bots is always an array
  const bots = Array.isArray(rawBots) ? rawBots : [];

  useEffect(() => {
    fetchBots();
  }, []);

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingSpinner}></div>
        Загрузка ботов...
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.container}>
          <div className={styles.error}>
            <h2>Ошибка загрузки</h2>
            <p>{error}</p>
            <button onClick={fetchBots} className={styles.retryButton}>
              Попробовать снова
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <h1>Конструктор ботов</h1>
            <p>Простое создание Telegram-ботов</p>
          </div>
          <div className={styles.headerActions}>
            <Link to="/editor" className={styles.createButton}>
              ➕ Создать бота
            </Link>
          </div>
        </header>

        <div className={styles.stats}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>🤖</div>
            <h3>Всего ботов</h3>
            <span className={styles.statNumber}>{bots.length}</span>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>✅</div>
            <h3>Активных</h3>
            <span className={styles.statNumber}>
              {bots.filter(bot => bot.status === 'active').length}
            </span>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>💬</div>
            <h3>Сообщений обработано</h3>
            <span className={styles.statNumber}>
              {bots.reduce((sum, bot) => sum + bot.stats.messagesProcessed, 0)}
            </span>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>👥</div>
            <h3>Активных пользователей</h3>
            <span className={styles.statNumber}>
              {bots.reduce((sum, bot) => sum + bot.stats.activeUsers, 0)}
            </span>
          </div>
        </div>

      <div className={styles.botsList}>
          {bots.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🤖</div>
              <h2>У вас пока нет ботов</h2>
              <p>Создайте своего первого бота, чтобы начать работу с конструктором</p>
              <Link to="/editor" className={styles.createButton}>
                ➕ Создать первого бота
              </Link>
            </div>
          ) : (
            bots.map(bot => (
              <div key={bot.id} className={`${styles.botCard} ${styles[bot.status]}`}>
                <div className={styles.botHeader}>
                  <div className={styles.botTitle}>
                    <h3>{bot.name}</h3>
                    <div className={styles.botId}>ID: {bot.id.slice(0, 8)}...</div>
                  </div>
                  <span className={`${styles.status} ${styles[bot.status]}`}>
                    {bot.status === 'active' ? 'Активен' : 
                     bot.status === 'draft' ? 'Черновик' : 'Приостановлен'}
                  </span>
                </div>
                <p className={styles.botDescription}>{bot.description}</p>
                <div className={styles.botStats}>
                  <div className={styles.statItem}>
                    <span className={styles.label}>Сообщений</span>
                    <span className={styles.value}>{bot.stats.messagesProcessed}</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.label}>Пользователей</span>
                    <span className={styles.value}>{bot.stats.activeUsers}</span>
                  </div>
                </div>
                <div className={styles.botActions}>
                  <Link to={`/editor/${bot.id}`} className={styles.editButton}>
                    ✏️ Редактировать
                  </Link>
                  <button className={styles.statsButton}>
                    📊 Статистика
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;