/**
 * Менеджер состояний пользователей
 * Управляет состоянием пользователей между сессиями
 */

export interface UserSession {
  userId: string;
  chatId: string;
  platform: string;
  variables: Record<string, any>;
  state: Record<string, any>;
  currentNode?: string;
  waitingForInput?: boolean;
  inputVariable?: string;
  nextNodes?: string[];
  lastActivity: number;
  sessionId: string;
}

export class UserStateManager {
  private static instance: UserStateManager;
  private userSessions: Map<string, UserSession> = new Map();
  private sessionTimeout: number = 30 * 60 * 1000; // 30 минут

  private constructor() {
    // Запускаем очистку устаревших сессий каждые 5 минут
    setInterval(() => this.cleanupExpiredSessions(), 5 * 60 * 1000);
  }

  static getInstance(): UserStateManager {
    if (!UserStateManager.instance) {
      UserStateManager.instance = new UserStateManager();
    }
    return UserStateManager.instance;
  }

  /**
   * Получить сессию пользователя
   */
  getUserSession(platform: string, userId: string, chatId: string): UserSession {
    const sessionKey = `${platform}:${userId}:${chatId}`;
    let session = this.userSessions.get(sessionKey);

    if (!session) {
      session = this.createNewSession(platform, userId, chatId);
      this.userSessions.set(sessionKey, session);
    }

    // Обновляем время последней активности
    session.lastActivity = Date.now();
    return session;
  }

  /**
   * Обновить сессию пользователя
   */
  updateUserSession(session: UserSession): void {
    const sessionKey = `${session.platform}:${session.userId}:${session.chatId}`;
    session.lastActivity = Date.now();
    this.userSessions.set(sessionKey, session);
  }

  /**
   * Установить переменную пользователя
   */
  setUserVariable(platform: string, userId: string, chatId: string, key: string, value: any): void {
    const session = this.getUserSession(platform, userId, chatId);
    session.variables[key] = value;
    this.updateUserSession(session);
  }

  /**
   * Получить переменную пользователя
   */
  getUserVariable(platform: string, userId: string, chatId: string, key: string): any {
    const session = this.getUserSession(platform, userId, chatId);
    return session.variables[key];
  }

  /**
   * Установить состояние пользователя
   */
  setUserState(platform: string, userId: string, chatId: string, key: string, value: any): void {
    const session = this.getUserSession(platform, userId, chatId);
    session.state[key] = value;
    this.updateUserSession(session);
  }

  /**
   * Получить состояние пользователя
   */
  getUserState(platform: string, userId: string, chatId: string, key: string): any {
    const session = this.getUserSession(platform, userId, chatId);
    return session.state[key];
  }

  /**
   * Установить ожидание ввода
   */
  setWaitingForInput(
    platform: string, 
    userId: string, 
    chatId: string, 
    variable: string, 
    nextNodes: string[]
  ): void {
    const session = this.getUserSession(platform, userId, chatId);
    session.waitingForInput = true;
    session.inputVariable = variable;
    session.nextNodes = nextNodes;
    this.updateUserSession(session);
  }

  /**
   * Обработать ввод пользователя
   */
  processUserInput(platform: string, userId: string, chatId: string, input: string): {
    variable?: string;
    nextNodes?: string[];
    processed: boolean;
  } {
    const session = this.getUserSession(platform, userId, chatId);
    
    if (!session.waitingForInput || !session.inputVariable) {
      return { processed: false };
    }

    // Сохраняем ввод в переменную
    session.variables[session.inputVariable] = input;
    
    // Получаем следующие узлы
    const nextNodes = session.nextNodes || [];
    
    // Сбрасываем состояние ожидания
    session.waitingForInput = false;
    session.inputVariable = undefined;
    session.nextNodes = undefined;
    
    this.updateUserSession(session);
    
    return {
      variable: session.inputVariable,
      nextNodes,
      processed: true
    };
  }

  /**
   * Очистить сессию пользователя
   */
  clearUserSession(platform: string, userId: string, chatId: string): void {
    const sessionKey = `${platform}:${userId}:${chatId}`;
    this.userSessions.delete(sessionKey);
  }

  /**
   * Получить все активные сессии
   */
  getActiveSessions(): UserSession[] {
    return Array.from(this.userSessions.values());
  }

  /**
   * Получить статистику сессий
   */
  getSessionStats(): {
    totalSessions: number;
    activeSessions: number;
    sessionsByPlatform: Record<string, number>;
    averageSessionDuration: number;
  } {
    const sessions = this.getActiveSessions();
    const now = Date.now();
    
    const sessionsByPlatform: Record<string, number> = {};
    let totalDuration = 0;
    let activeSessions = 0;

    sessions.forEach(session => {
      // Подсчет по платформам
      sessionsByPlatform[session.platform] = (sessionsByPlatform[session.platform] || 0) + 1;
      
      // Подсчет активных сессий (активность в последние 5 минут)
      if (now - session.lastActivity < 5 * 60 * 1000) {
        activeSessions++;
      }
      
      // Подсчет средней продолжительности
      totalDuration += now - (now - session.lastActivity);
    });

    return {
      totalSessions: sessions.length,
      activeSessions,
      sessionsByPlatform,
      averageSessionDuration: sessions.length > 0 ? totalDuration / sessions.length : 0
    };
  }

  /**
   * Создать новую сессию
   */
  private createNewSession(platform: string, userId: string, chatId: string): UserSession {
    return {
      userId,
      chatId,
      platform,
      variables: {},
      state: {},
      lastActivity: Date.now(),
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  /**
   * Очистить устаревшие сессии
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    const expiredSessions: string[] = [];

    this.userSessions.forEach((session, key) => {
      if (now - session.lastActivity > this.sessionTimeout) {
        expiredSessions.push(key);
      }
    });

    expiredSessions.forEach(key => {
      this.userSessions.delete(key);
    });

    if (expiredSessions.length > 0) {
      console.log(`Очищено ${expiredSessions.length} устаревших сессий`);
    }
  }

  /**
   * Установить таймаут сессии
   */
  setSessionTimeout(timeout: number): void {
    this.sessionTimeout = timeout;
  }

  /**
   * Экспорт сессий для сохранения
   */
  exportSessions(): Record<string, UserSession> {
    const sessions: Record<string, UserSession> = {};
    this.userSessions.forEach((session, key) => {
      sessions[key] = { ...session };
    });
    return sessions;
  }

  /**
   * Импорт сессий из сохранения
   */
  importSessions(sessions: Record<string, UserSession>): void {
    Object.entries(sessions).forEach(([key, session]) => {
      this.userSessions.set(key, session);
    });
  }
}