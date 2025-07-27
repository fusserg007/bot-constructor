/**
 * Исполнители узлов интеграций
 */
import { Node, BotSchema } from '../../types';
import { ExecutionContext, ExecutionResult } from '../SchemaExecutionEngine';
import { BaseNodeExecutor } from './BaseNodeExecutor';

/**
 * Исполнитель REST API запросов
 */
export class RestApiExecutor extends BaseNodeExecutor {
  async execute(node: Node, context: ExecutionContext, schema: BotSchema): Promise<ExecutionResult> {
    const url = this.replaceVariables(node.data.url || '', context);
    const method = node.data.method || 'GET';
    const headers = node.data.headers || {};
    const body = node.data.body;
    const responseVariable = node.data.responseVariable || 'apiResponse';
    const timeout = parseInt(node.data.timeout || '10000');
    const retries = parseInt(node.data.retries || '0');
    const nextNodes = this.getNextNodes(node.id, schema);

    // Обрабатываем заголовки
    const processedHeaders: Record<string, string> = {};
    Object.entries(headers).forEach(([key, value]) => {
      processedHeaders[key] = this.replaceVariables(String(value), context);
    });

    // Обрабатываем тело запроса
    let processedBody: any = undefined;
    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      if (typeof body === 'string') {
        processedBody = this.replaceVariables(body, context);
      } else {
        processedBody = JSON.stringify(body);
        Object.entries(body).forEach(([key, value]) => {
          if (typeof value === 'string') {
            (body as any)[key] = this.replaceVariables(value, context);
          }
        });
        processedBody = JSON.stringify(body);
      }
    }

    let lastError: Error | null = null;
    
    // Попытки с повторами
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Bot-Constructor/1.0',
            ...processedHeaders
          },
          body: processedBody,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // Получаем тело ответа
        let responseData: any;
        const contentType = response.headers.get('content-type') || '';
        
        if (contentType.includes('application/json')) {
          responseData = await response.json();
        } else if (contentType.includes('text/')) {
          responseData = await response.text();
        } else {
          responseData = await response.arrayBuffer();
        }

        const newVariables = {
          ...context.variables,
          [responseVariable]: responseData,
          [`${responseVariable}_status`]: response.status,
          [`${responseVariable}_statusText`]: response.statusText,
          [`${responseVariable}_headers`]: Object.fromEntries(response.headers.entries()),
          [`${responseVariable}_ok`]: response.ok
        };

        return this.createSuccessResult(
          nextNodes,
          newVariables,
          context.userState,
          [],
          [`REST API запрос выполнен: ${method} ${url} -> ${response.status}`]
        );

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < retries) {
          // Ждем перед повторной попыткой (экспоненциальная задержка)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          continue;
        }
      }
    }

    return this.createErrorResult(
      `Ошибка REST API запроса после ${retries + 1} попыток: ${lastError?.message || 'Неизвестная ошибка'}`,
      context.variables,
      context.userState
    );
  }
}

/**
 * Исполнитель GraphQL запросов
 */
export class GraphQLExecutor extends BaseNodeExecutor {
  async execute(node: Node, context: ExecutionContext, schema: BotSchema): Promise<ExecutionResult> {
    const endpoint = this.replaceVariables(node.data.endpoint || '', context);
    const query = this.replaceVariables(node.data.query || '', context);
    const variables = node.data.variables || {};
    const headers = node.data.headers || {};
    const responseVariable = node.data.responseVariable || 'graphqlResponse';
    const nextNodes = this.getNextNodes(node.id, schema);

    // Обрабатываем переменные GraphQL
    const processedVariables: Record<string, any> = {};
    Object.entries(variables).forEach(([key, value]) => {
      if (typeof value === 'string') {
        processedVariables[key] = this.replaceVariables(value, context);
      } else {
        processedVariables[key] = value;
      }
    });

    // Обрабатываем заголовки
    const processedHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers
    };
    Object.entries(processedHeaders).forEach(([key, value]) => {
      processedHeaders[key] = this.replaceVariables(String(value), context);
    });

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: processedHeaders,
        body: JSON.stringify({
          query,
          variables: processedVariables
        })
      });

      const responseData = await response.json();

      // Проверяем на ошибки GraphQL
      if (responseData.errors && responseData.errors.length > 0) {
        const errorMessages = responseData.errors.map((err: any) => err.message).join(', ');
        return this.createErrorResult(
          `GraphQL ошибки: ${errorMessages}`,
          context.variables,
          context.userState
        );
      }

      const newVariables = {
        ...context.variables,
        [responseVariable]: responseData.data,
        [`${responseVariable}_full`]: responseData,
        [`${responseVariable}_status`]: response.status
      };

      return this.createSuccessResult(
        nextNodes,
        newVariables,
        context.userState,
        [],
        [`GraphQL запрос выполнен: ${endpoint}`]
      );

    } catch (error) {
      return this.createErrorResult(
        `Ошибка GraphQL запроса: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        context.variables,
        context.userState
      );
    }
  }
}

/**
 * Исполнитель веб-скрапинга
 */
export class WebScrapingExecutor extends BaseNodeExecutor {
  async execute(node: Node, context: ExecutionContext, schema: BotSchema): Promise<ExecutionResult> {
    const url = this.replaceVariables(node.data.url || '', context);
    const selector = node.data.selector || 'body';
    const attribute = node.data.attribute || 'textContent'; // textContent, innerHTML, href, src, etc.
    const multiple = node.data.multiple || false;
    const responseVariable = node.data.responseVariable || 'scrapedData';
    const nextNodes = this.getNextNodes(node.id, schema);

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const html = await response.text();
      
      // Простой парсинг HTML (в реальном проекте лучше использовать jsdom или cheerio)
      const scrapedData = this.parseHtml(html, selector, attribute, multiple);

      const newVariables = {
        ...context.variables,
        [responseVariable]: scrapedData,
        [`${responseVariable}_url`]: url,
        [`${responseVariable}_selector`]: selector
      };

      return this.createSuccessResult(
        nextNodes,
        newVariables,
        context.userState,
        [],
        [`Веб-скрапинг выполнен: ${url} -> ${Array.isArray(scrapedData) ? scrapedData.length : 1} элементов`]
      );

    } catch (error) {
      return this.createErrorResult(
        `Ошибка веб-скрапинга: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        context.variables,
        context.userState
      );
    }
  }

  private parseHtml(html: string, selector: string, attribute: string, multiple: boolean): any {
    // Упрощенный парсер HTML для демонстрации
    // В реальном проекте следует использовать полноценную библиотеку
    
    if (selector === 'title') {
      const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
      return titleMatch ? titleMatch[1].trim() : '';
    }

    if (selector.startsWith('meta[name="')) {
      const metaName = selector.match(/meta\[name="([^"]+)"\]/)?.[1];
      if (metaName) {
        const metaRegex = new RegExp(`<meta[^>]*name="${metaName}"[^>]*content="([^"]*)"`, 'i');
        const match = html.match(metaRegex);
        return match ? match[1] : '';
      }
    }

    // Простой поиск по тегам
    const tagMatch = selector.match(/^([a-zA-Z]+)$/);
    if (tagMatch) {
      const tag = tagMatch[1];
      const regex = new RegExp(`<${tag}[^>]*>(.*?)<\/${tag}>`, multiple ? 'gi' : 'i');
      
      if (multiple) {
        const matches = Array.from(html.matchAll(regex));
        return matches.map(match => this.stripHtml(match[1].trim()));
      } else {
        const match = html.match(regex);
        return match ? this.stripHtml(match[1].trim()) : '';
      }
    }

    // Если не удалось распарсить, возвращаем пустое значение
    return multiple ? [] : '';
  }
}

/**
 * Исполнитель парсинга CSV
 */
export class CsvParserExecutor extends BaseNodeExecutor {
  async execute(node: Node, context: ExecutionContext, schema: BotSchema): Promise<ExecutionResult> {
    const csvData = this.replaceVariables(node.data.csvData || '', context);
    const csvUrl = node.data.csvUrl ? this.replaceVariables(node.data.csvUrl, context) : '';
    const delimiter = node.data.delimiter || ',';
    const hasHeader = node.data.hasHeader !== false;
    const responseVariable = node.data.responseVariable || 'csvData';
    const nextNodes = this.getNextNodes(node.id, schema);

    let csvContent = csvData;

    // Если указан URL, загружаем CSV
    if (csvUrl && !csvData) {
      try {
        const response = await fetch(csvUrl);
        csvContent = await response.text();
      } catch (error) {
        return this.createErrorResult(
          `Ошибка загрузки CSV: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
          context.variables,
          context.userState
        );
      }
    }

    try {
      const parsedData = this.parseCsv(csvContent, delimiter, hasHeader);

      const newVariables = {
        ...context.variables,
        [responseVariable]: parsedData,
        [`${responseVariable}_rows`]: parsedData.length,
        [`${responseVariable}_columns`]: parsedData.length > 0 ? Object.keys(parsedData[0]).length : 0
      };

      return this.createSuccessResult(
        nextNodes,
        newVariables,
        context.userState,
        [],
        [`CSV парсинг выполнен: ${parsedData.length} строк`]
      );

    } catch (error) {
      return this.createErrorResult(
        `Ошибка парсинга CSV: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        context.variables,
        context.userState
      );
    }
  }

  private parseCsv(csvContent: string, delimiter: string, hasHeader: boolean): any[] {
    const lines = csvContent.trim().split('\n');
    if (lines.length === 0) return [];

    const result: any[] = [];
    let headers: string[] = [];

    // Если есть заголовки, используем их
    if (hasHeader && lines.length > 0) {
      headers = this.parseCsvLine(lines[0], delimiter);
      lines.shift(); // Удаляем строку заголовков
    }

    // Парсим данные
    lines.forEach((line, index) => {
      const values = this.parseCsvLine(line, delimiter);
      
      if (hasHeader && headers.length > 0) {
        const row: Record<string, string> = {};
        headers.forEach((header, i) => {
          row[header.trim()] = values[i] || '';
        });
        result.push(row);
      } else {
        // Если нет заголовков, используем индексы
        const row: Record<string, string> = {};
        values.forEach((value, i) => {
          row[`column_${i}`] = value;
        });
        result.push(row);
      }
    });

    return result;
  }

  private parseCsvLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Экранированная кавычка
          current += '"';
          i++; // Пропускаем следующую кавычку
        } else {
          // Переключаем состояние кавычек
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        // Разделитель вне кавычек
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }
}

/**
 * Исполнитель парсинга XML
 */
export class XmlParserExecutor extends BaseNodeExecutor {
  async execute(node: Node, context: ExecutionContext, schema: BotSchema): Promise<ExecutionResult> {
    const xmlData = this.replaceVariables(node.data.xmlData || '', context);
    const xmlUrl = node.data.xmlUrl ? this.replaceVariables(node.data.xmlUrl, context) : '';
    const xpath = node.data.xpath || '/';
    const responseVariable = node.data.responseVariable || 'xmlData';
    const nextNodes = this.getNextNodes(node.id, schema);

    let xmlContent = xmlData;

    // Если указан URL, загружаем XML
    if (xmlUrl && !xmlData) {
      try {
        const response = await fetch(xmlUrl);
        xmlContent = await response.text();
      } catch (error) {
        return this.createErrorResult(
          `Ошибка загрузки XML: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
          context.variables,
          context.userState
        );
      }
    }

    try {
      const parsedData = this.parseXml(xmlContent, xpath);

      const newVariables = {
        ...context.variables,
        [responseVariable]: parsedData
      };

      return this.createSuccessResult(
        nextNodes,
        newVariables,
        context.userState,
        [],
        [`XML парсинг выполнен`]
      );

    } catch (error) {
      return this.createErrorResult(
        `Ошибка парсинга XML: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        context.variables,
        context.userState
      );
    }
  }

  private parseXml(xmlContent: string, xpath: string): any {
    // Упрощенный XML парсер для демонстрации
    // В реальном проекте следует использовать полноценную библиотеку
    
    try {
      // Простое извлечение значений по тегам
      if (xpath.includes('/')) {
        const tagName = xpath.split('/').pop();
        if (tagName) {
          const regex = new RegExp(`<${tagName}[^>]*>(.*?)<\/${tagName}>`, 'gi');
          const matches = Array.from(xmlContent.matchAll(regex));
          
          if (matches.length === 1) {
            return this.stripHtml(matches[0][1].trim());
          } else if (matches.length > 1) {
            return matches.map(match => this.stripHtml(match[1].trim()));
          }
        }
      }

      // Если не удалось найти по xpath, возвращаем весь XML как объект
      return this.xmlToObject(xmlContent);
      
    } catch (error) {
      throw new Error(`Ошибка парсинга XML: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }

  private xmlToObject(xml: string): any {
    // Очень упрощенное преобразование XML в объект
    const result: any = {};
    
    // Удаляем XML декларацию и комментарии
    xml = xml.replace(/<\?xml[^>]*\?>/g, '').replace(/<!--[\s\S]*?-->/g, '');
    
    // Простое извлечение тегов
    const tagRegex = /<(\w+)[^>]*>([\s\S]*?)<\/\1>/g;
    let match;
    
    while ((match = tagRegex.exec(xml)) !== null) {
      const tagName = match[1];
      const content = match[2].trim();
      
      // Если содержимое содержит другие теги, рекурсивно парсим
      if (content.includes('<')) {
        result[tagName] = this.xmlToObject(content);
      } else {
        result[tagName] = content;
      }
    }
    
    return result;
  }
}

/**
 * Исполнитель работы с базами данных
 */
export class DatabaseExecutor extends BaseNodeExecutor {
  async execute(node: Node, context: ExecutionContext, schema: BotSchema): Promise<ExecutionResult> {
    const operation = node.data.operation || 'select'; // select, insert, update, delete
    const table = node.data.table || '';
    const query = this.replaceVariables(node.data.query || '', context);
    const parameters = node.data.parameters || {};
    const responseVariable = node.data.responseVariable || 'dbResult';
    const nextNodes = this.getNextNodes(node.id, schema);

    // Обрабатываем параметры
    const processedParams: Record<string, any> = {};
    Object.entries(parameters).forEach(([key, value]) => {
      if (typeof value === 'string') {
        processedParams[key] = this.replaceVariables(value, context);
      } else {
        processedParams[key] = value;
      }
    });

    try {
      // В реальной реализации здесь был бы подключение к базе данных
      // Пока что симулируем результат
      const simulatedResult = this.simulateDatabaseOperation(operation, table, query, processedParams);

      const newVariables = {
        ...context.variables,
        [responseVariable]: simulatedResult,
        [`${responseVariable}_operation`]: operation,
        [`${responseVariable}_table`]: table
      };

      return this.createSuccessResult(
        nextNodes,
        newVariables,
        context.userState,
        [],
        [`Операция с БД выполнена: ${operation} на таблице ${table}`]
      );

    } catch (error) {
      return this.createErrorResult(
        `Ошибка операции с БД: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        context.variables,
        context.userState
      );
    }
  }

  private simulateDatabaseOperation(operation: string, table: string, query: string, parameters: Record<string, any>): any {
    // Симуляция операций с базой данных
    switch (operation.toLowerCase()) {
      case 'select':
        return [
          { id: 1, name: 'Пример записи 1', created_at: new Date().toISOString() },
          { id: 2, name: 'Пример записи 2', created_at: new Date().toISOString() }
        ];
      case 'insert':
        return { insertId: Math.floor(Math.random() * 1000), affectedRows: 1 };
      case 'update':
        return { affectedRows: 1, changedRows: 1 };
      case 'delete':
        return { affectedRows: 1 };
      default:
        return { success: true, message: `Операция ${operation} выполнена` };
    }
  }
}

/**
 * Исполнитель работы с файлами
 */
export class FileOperationExecutor extends BaseNodeExecutor {
  async execute(node: Node, context: ExecutionContext, schema: BotSchema): Promise<ExecutionResult> {
    const operation = node.data.operation || 'read'; // read, write, append, delete, exists
    const filePath = this.replaceVariables(node.data.filePath || '', context);
    const content = node.data.content ? this.replaceVariables(node.data.content, context) : '';
    const encoding = node.data.encoding || 'utf8';
    const responseVariable = node.data.responseVariable || 'fileResult';
    const nextNodes = this.getNextNodes(node.id, schema);

    try {
      // В реальной реализации здесь были бы операции с файловой системой
      // Пока что симулируем результат
      const result = this.simulateFileOperation(operation, filePath, content, encoding);

      const newVariables = {
        ...context.variables,
        [responseVariable]: result,
        [`${responseVariable}_operation`]: operation,
        [`${responseVariable}_path`]: filePath
      };

      return this.createSuccessResult(
        nextNodes,
        newVariables,
        context.userState,
        [],
        [`Файловая операция выполнена: ${operation} для ${filePath}`]
      );

    } catch (error) {
      return this.createErrorResult(
        `Ошибка файловой операции: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        context.variables,
        context.userState
      );
    }
  }

  private simulateFileOperation(operation: string, filePath: string, content: string, encoding: string): any {
    // Симуляция файловых операций
    switch (operation.toLowerCase()) {
      case 'read':
        return `Содержимое файла ${filePath} (симуляция)`;
      case 'write':
        return { success: true, bytesWritten: content.length };
      case 'append':
        return { success: true, bytesAppended: content.length };
      case 'delete':
        return { success: true, deleted: true };
      case 'exists':
        return { exists: true, path: filePath };
      default:
        return { success: true, operation };
    }
  }
}