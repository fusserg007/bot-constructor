import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import styles from './Dashboard.module.css';

const Dashboard: React.FC = () => {
  const { state, fetchBots } = useApp();
  const { bots, loading, error } = state;

  useEffect(() => {
    fetchBots();
  }, []);

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  if (error) {
    return <div className={styles.error}>Ошибка: {error}</div>;
  }

  const totalBots = bots.length;
  const activeBots = bots.filter(bot => bot.status === 'active').length;
  const totalMessages = bots.reduce((sum, bot) => sum + (bot.stats?.messagesProcessed || 0), 0);
  const totalUsers = bots.reduce((sum, bot) => sum + (bot.stats?.activeUsers || 0), 0);

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1>Bot Constructor</h1>
        <Link to="/editor" className={styles.createButton}>
          Создать бота
        </Link>
      </div>

      <div className={styles.stats}>
        <div className={styles.statItem}>
          <div className={styles.statValue}>{totalBots}</div>
          <div className={styles.statLabel}>Всего ботов</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statValue}>{activeBots}</div>
          <div className={styles.statLabel}>Активных</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statValue}>{totalMessages}</div>
          <div className={styles.statLabel}>Сообщений</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statValue}>{totalUsers}</div>
          <div className={styles.statLabel}>Пользователей</div>
        </div>
      </div>

      <div className={styles.botsGrid}>
        {bots.map(bot => (
          <div key={bot.id} className={styles.botCard}>
            <div className={styles.botHeader}>
              <h3 className={styles.botName}>{bot.name}</h3>
              <span className={`${styles.status} ${styles[bot.status]}`}>
                {bot.status}
              </span>
            </div>
            <p className={styles.botDescription}>{bot.description}</p>
            <div className={styles.botStats}>
              <span>Сообщений: {bot.stats?.messagesProcessed || 0}</span>
              <span>Пользователей: {bot.stats?.activeUsers || 0}</span>
            </div>
            <div className={styles.botActions}>
              <Link to={`/editor/${bot.id}`} className={styles.editButton}>
                Редактировать
              </Link>
            </div>
          </div>
        ))}
      </div>

      {bots.length === 0 && (
        <div className={styles.empty}>
          <p>Нет ботов</p>
          <Link to="/editor" className={styles.createButton}>
            Создать первого бота
          </Link>
        </div>
      )}
    </div>
  );
};

export default Dashboard;