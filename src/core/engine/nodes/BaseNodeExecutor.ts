/**
 * Базовый класс для исполнителей узлов
 */
import { Node, BotSchema } from '../../types';
import { ExecutionContext, ExecutionResult, NodeExecutor } from '../SchemaExecutionEngine';

export abstract class BaseNodeExecutor implements NodeExecutor {
  abstract execute(node: Node, context: ExecutionContext, schema: BotSchema): Promise<ExecutionResult>;

  /**
   * Получить следующие узлы для выполнения
   */
  protected getNextNodes(nodeId: string, schema: BotSchema): string[] {
    const edges = schema.edges.filter(edge => edge.source === nodeId);
    return edges.map(edge => edge.target);
  }

  /**
   * Получить следующие узлы с учетом условий
   */
  protected getConditionalNextNodes(nodeId: string, schema: BotSchema, condition: string): string[] {
    const edges = schema.edges.filter(edge => 
      edge.source === nodeId && 
      (edge.sourceHandle === condition || (!edge.sourceHandle && condition === 'default'))
    );
    return edges.map(edge => edge.target);
  }

  /**
   * Заменить переменные в тексте
   */
  protected replaceVariables(text: string, context: ExecutionContext): string {
    let result = text;
    
    // Заменяем переменные из контекста
    Object.entries(context.variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value));
    });

    // Заменяем системные переменные
    result = result.replace(/{{userId}}/g, context.userId);
    result = result.replace(/{{chatId}}/g, context.chatId);
    result = result.replace(/{{platform}}/g, context.platform);
    result = result.replace(/{{timestamp}}/g, String(context.timestamp));
    result = result.replace(/{{executionId}}/g, context.executionId);
    
    // Заменяем переменные даты и времени
    const now = new Date();
    result = result.replace(/{{current_date}}/g, now.toLocaleDateString());
    result = result.replace(/{{current_time}}/g, now.toLocaleTimeString());
    result = result.replace(/{{current_datetime}}/g, now.toLocaleString());
    result = result.replace(/{{current_timestamp}}/g, String(now.getTime()));
    result = result.replace(/{{current_iso}}/g, now.toISOString());
    
    // Заменяем переменные пользователя
    const userName = context.variables.userName || context.variables.firstName || 'Пользователь';
    result = result.replace(/{{userName}}/g, String(userName));
    result = result.replace(/{{userFirstName}}/g, String(context.variables.firstName || ''));
    result = result.replace(/{{userLastName}}/g, String(context.variables.lastName || ''));

    return result;
  }

  /**
   * Валидировать входные данные узла
   */
  protected validateNodeData(node: Node, requiredFields: string[]): string[] {
    const errors: string[] = [];
    
    requiredFields.forEach(field => {
      if (!node.data || node.data[field] === undefined || node.data[field] === '') {
        errors.push(`Поле "${field}" обязательно для узла типа ${node.type}`);
      }
    });

    return errors;
  }

  /**
   * Проверить условие
   */
  protected evaluateCondition(condition: string, context: ExecutionContext): boolean {
    try {
      // Создаем безопасный контекст для выполнения условия
      const safeContext = {
        ...context.variables,
        // Системные переменные
        userId: context.userId,
        chatId: context.chatId,
        platform: context.platform,
        timestamp: context.timestamp,
        // Временные переменные
        now: Date.now(),
        today: new Date().toDateString(),
        currentHour: new Date().getHours(),
        currentMinute: new Date().getMinutes(),
        // Математические функции
        abs: Math.abs,
        max: Math.max,
        min: Math.min,
        round: Math.round,
        floor: Math.floor,
        ceil: Math.ceil,
        random: Math.random,
        // Строковые функции
        length: (str: string) => str.length,
        toLowerCase: (str: string) => str.toLowerCase(),
        toUpperCase: (str: string) => str.toUpperCase(),
        includes: (str: string, search: string) => str.includes(search),
        startsWith: (str: string, search: string) => str.startsWith(search),
        endsWith: (str: string, search: string) => str.endsWith(search)
      };
      
      // Создаем функцию для выполнения условия
      const conditionFunction = new Function(...Object.keys(safeContext), `return ${condition}`);
      return Boolean(conditionFunction(...Object.values(safeContext)));
      
    } catch (error) {
      console.error('Ошибка в условии:', error);
      return false;
    }
  }

  /**
   * Форматировать значение по типу
   */
  protected formatValue(value: any, type: string): any {
    switch (type) {
      case 'string':
        return String(value);
      case 'number':
        const num = parseFloat(value);
        return isNaN(num) ? 0 : num;
      case 'boolean':
        return Boolean(value);
      case 'array':
        return Array.isArray(value) ? value : [value];
      case 'object':
        return typeof value === 'object' ? value : { value };
      case 'json':
        return typeof value === 'string' ? JSON.parse(value) : value;
      default:
        return value;
    }
  }

  /**
   * Создать успешный результат
   */
  protected createSuccessResult(
    nextNodes: string[],
    variables: Record<string, any> = {},
    userState: Record<string, any> = {},
    actions: any[] = [],
    logs: string[] = []
  ): ExecutionResult {
    return {
      success: true,
      nextNodes,
      variables,
      userState,
      actions,
      errors: [],
      logs
    };
  }

  /**
   * Создать результат с ошибкой
   */
  protected createErrorResult(
    error: string,
    variables: Record<string, any> = {},
    userState: Record<string, any> = {}
  ): ExecutionResult {
    return {
      success: false,
      nextNodes: [],
      variables,
      userState,
      actions: [],
      errors: [error],
      logs: []
    };
  }

  /**
   * Создать результат с предупреждением
   */
  protected createWarningResult(
    warning: string,
    nextNodes: string[],
    variables: Record<string, any> = {},
    userState: Record<string, any> = {},
    actions: any[] = []
  ): ExecutionResult {
    return {
      success: true,
      nextNodes,
      variables,
      userState,
      actions,
      errors: [],
      logs: [`ПРЕДУПРЕЖДЕНИЕ: ${warning}`]
    };
  }

  /**
   * Безопасно получить значение из объекта
   */
  protected safeGet(obj: any, path: string, defaultValue: any = undefined): any {
    try {
      return path.split('.').reduce((current, key) => current?.[key], obj) ?? defaultValue;
    } catch (error) {
      return defaultValue;
    }
  }

  /**
   * Безопасно установить значение в объект
   */
  protected safeSet(obj: any, path: string, value: any): void {
    try {
      const keys = path.split('.');
      const lastKey = keys.pop();
      if (!lastKey) return;

      const target = keys.reduce((current, key) => {
        if (!current[key] || typeof current[key] !== 'object') {
          current[key] = {};
        }
        return current[key];
      }, obj);

      target[lastKey] = value;
    } catch (error) {
      console.error('Ошибка установки значения:', error);
    }
  }

  /**
   * Генерировать уникальный ID
   */
  protected generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Проверить таймаут
   */
  protected isTimedOut(startTime: number, timeout: number): boolean {
    return Date.now() - startTime > timeout;
  }

  /**
   * Очистить HTML теги
   */
  protected stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }

  /**
   * Экранировать специальные символы для регулярных выражений
   */
  protected escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Проверить валидность email
   */
  protected isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Проверить валидность URL
   */
  protected isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Проверить валидность номера телефона
   */
  protected isValidPhone(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  }
}