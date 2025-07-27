/**
 * Исполнители узлов условий и логики
 */
import { Node, BotSchema } from '../../types';
import { ExecutionContext, ExecutionResult } from '../SchemaExecutionEngine';
import { BaseNodeExecutor } from './BaseNodeExecutor';

/**
 * Исполнитель условия содержания текста
 */
export class TextConditionExecutor extends BaseNodeExecutor {
  async execute(node: Node, context: ExecutionContext, schema: BotSchema): Promise<ExecutionResult> {
    const pattern = node.data.pattern || '';
    const text = context.variables.messageText || '';
    const caseSensitive = node.data.caseSensitive || false;
    const matchType = node.data.matchType || 'contains'; // contains, equals, startsWith, endsWith, regex
    
    let matches = false;
    
    try {
      const searchText = caseSensitive ? text : text.toLowerCase();
      const searchPattern = caseSensitive ? pattern : pattern.toLowerCase();
      
      switch (matchType) {
        case 'contains':
          matches = searchText.includes(searchPattern);
          break;
        case 'equals':
          matches = searchText === searchPattern;
          break;
        case 'startsWith':
          matches = searchText.startsWith(searchPattern);
          break;
        case 'endsWith':
          matches = searchText.endsWith(searchPattern);
          break;
        case 'regex':
          const regex = new RegExp(pattern, caseSensitive ? 'g' : 'gi');
          matches = regex.test(text);
          break;
        default:
          matches = searchText.includes(searchPattern);
      }
    } catch (error) {
      return this.createErrorResult(
        `Ошибка в условии текста: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        context.variables,
        context.userState
      );
    }

    // Получаем следующие узлы в зависимости от результата
    const nextNodes = matches 
      ? this.getConditionalNextNodes(node.id, schema, 'true')
      : this.getConditionalNextNodes(node.id, schema, 'false');

    // Если нет специальных связей, берем все доступные
    if (nextNodes.length === 0) {
      const allNextNodes = this.getNextNodes(node.id, schema);
      return this.createSuccessResult(
        matches ? allNextNodes : [],
        context.variables,
        context.userState,
        [],
        [`Условие "${pattern}" (${matchType}): ${matches ? 'выполнено' : 'не выполнено'}`]
      );
    }

    return this.createSuccessResult(
      nextNodes,
      context.variables,
      context.userState,
      [],
      [`Условие "${pattern}" (${matchType}): ${matches ? 'выполнено' : 'не выполнено'}`]
    );
  }
}

/**
 * Исполнитель условия сравнения переменных
 */
export class VariableConditionExecutor extends BaseNodeExecutor {
  async execute(node: Node, context: ExecutionContext, schema: BotSchema): Promise<ExecutionResult> {
    const variable1 = node.data.variable1 || '';
    const operator = node.data.operator || '=='; // ==, !=, >, <, >=, <=, contains
    const variable2 = node.data.variable2 || '';
    const value1 = this.replaceVariables(variable1, context);
    const value2 = this.replaceVariables(variable2, context);
    
    let result = false;
    
    try {
      switch (operator) {
        case '==':
          result = value1 == value2;
          break;
        case '===':
          result = value1 === value2;
          break;
        case '!=':
          result = value1 != value2;
          break;
        case '!==':
          result = value1 !== value2;
          break;
        case '>':
          result = parseFloat(value1) > parseFloat(value2);
          break;
        case '<':
          result = parseFloat(value1) < parseFloat(value2);
          break;
        case '>=':
          result = parseFloat(value1) >= parseFloat(value2);
          break;
        case '<=':
          result = parseFloat(value1) <= parseFloat(value2);
          break;
        case 'contains':
          result = String(value1).includes(String(value2));
          break;
        case 'startsWith':
          result = String(value1).startsWith(String(value2));
          break;
        case 'endsWith':
          result = String(value1).endsWith(String(value2));
          break;
        default:
          result = value1 == value2;
      }
    } catch (error) {
      return this.createErrorResult(
        `Ошибка в условии сравнения: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        context.variables,
        context.userState
      );
    }

    const nextNodes = result 
      ? this.getConditionalNextNodes(node.id, schema, 'true')
      : this.getConditionalNextNodes(node.id, schema, 'false');

    return this.createSuccessResult(
      nextNodes,
      context.variables,
      context.userState,
      [],
      [`Условие "${value1} ${operator} ${value2}": ${result ? 'выполнено' : 'не выполнено'}`]
    );
  }
}

/**
 * Исполнитель логического условия
 */
export class LogicConditionExecutor extends BaseNodeExecutor {
  async execute(node: Node, context: ExecutionContext, schema: BotSchema): Promise<ExecutionResult> {
    const conditions = node.data.conditions || [];
    const operator = node.data.operator || 'AND'; // AND, OR, NOT
    
    let result = operator === 'AND';
    
    try {
      for (const condition of conditions) {
        const conditionResult = this.evaluateCondition(condition, context);
        
        switch (operator) {
          case 'AND':
            result = result && conditionResult;
            break;
          case 'OR':
            result = result || conditionResult;
            break;
          case 'NOT':
            result = !conditionResult;
            break;
        }
        
        // Для OR можем прервать, если уже true
        if (operator === 'OR' && result) break;
        // Для AND можем прервать, если уже false
        if (operator === 'AND' && !result) break;
      }
    } catch (error) {
      return this.createErrorResult(
        `Ошибка в логическом условии: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        context.variables,
        context.userState
      );
    }

    const nextNodes = result 
      ? this.getConditionalNextNodes(node.id, schema, 'true')
      : this.getConditionalNextNodes(node.id, schema, 'false');

    return this.createSuccessResult(
      nextNodes,
      context.variables,
      context.userState,
      [],
      [`Логическое условие (${operator}): ${result ? 'выполнено' : 'не выполнено'}`]
    );
  }
}

/**
 * Исполнитель условия времени
 */
export class TimeConditionExecutor extends BaseNodeExecutor {
  async execute(node: Node, context: ExecutionContext, schema: BotSchema): Promise<ExecutionResult> {
    const timeType = node.data.timeType || 'hour'; // hour, day, date, weekday
    const operator = node.data.operator || '==';
    const value = node.data.value;
    
    const now = new Date();
    let currentValue: number;
    
    switch (timeType) {
      case 'hour':
        currentValue = now.getHours();
        break;
      case 'day':
        currentValue = now.getDate();
        break;
      case 'month':
        currentValue = now.getMonth() + 1;
        break;
      case 'weekday':
        currentValue = now.getDay();
        break;
      case 'year':
        currentValue = now.getFullYear();
        break;
      default:
        currentValue = now.getHours();
    }
    
    let result = false;
    const targetValue = parseInt(value);
    
    switch (operator) {
      case '==':
        result = currentValue === targetValue;
        break;
      case '!=':
        result = currentValue !== targetValue;
        break;
      case '>':
        result = currentValue > targetValue;
        break;
      case '<':
        result = currentValue < targetValue;
        break;
      case '>=':
        result = currentValue >= targetValue;
        break;
      case '<=':
        result = currentValue <= targetValue;
        break;
    }

    const nextNodes = result 
      ? this.getConditionalNextNodes(node.id, schema, 'true')
      : this.getConditionalNextNodes(node.id, schema, 'false');

    return this.createSuccessResult(
      nextNodes,
      context.variables,
      context.userState,
      [],
      [`Условие времени (${timeType} ${operator} ${value}): ${result ? 'выполнено' : 'не выполнено'} (текущее: ${currentValue})`]
    );
  }
}

/**
 * Исполнитель условия случайности
 */
export class RandomConditionExecutor extends BaseNodeExecutor {
  async execute(node: Node, context: ExecutionContext, schema: BotSchema): Promise<ExecutionResult> {
    const probability = parseFloat(node.data.probability || '0.5'); // от 0 до 1
    const seed = node.data.seed ? parseInt(this.replaceVariables(node.data.seed, context)) : undefined;
    
    // Если указан seed, используем его для воспроизводимости
    let random = Math.random();
    if (seed !== undefined) {
      // Простая функция псевдослучайных чисел на основе seed
      const x = Math.sin(seed) * 10000;
      random = x - Math.floor(x);
    }
    
    const result = random < probability;

    const nextNodes = result 
      ? this.getConditionalNextNodes(node.id, schema, 'true')
      : this.getConditionalNextNodes(node.id, schema, 'false');

    return this.createSuccessResult(
      nextNodes,
      context.variables,
      context.userState,
      [],
      [`Случайное условие (${probability * 100}%): ${result ? 'выполнено' : 'не выполнено'} (случайное: ${random.toFixed(3)})`]
    );
  }
}

/**
 * Исполнитель переключателя (switch)
 */
export class SwitchExecutor extends BaseNodeExecutor {
  async execute(node: Node, context: ExecutionContext, schema: BotSchema): Promise<ExecutionResult> {
    const variable = this.replaceVariables(node.data.variable || '', context);
    const cases = node.data.cases || [];
    const defaultCase = node.data.defaultCase;
    
    // Ищем подходящий case
    let matchedCase = null;
    for (const caseItem of cases) {
      if (caseItem.value === variable) {
        matchedCase = caseItem;
        break;
      }
    }
    
    // Если не найден подходящий case, используем default
    if (!matchedCase && defaultCase) {
      matchedCase = { value: 'default', output: defaultCase };
    }
    
    const nextNodes = matchedCase 
      ? this.getConditionalNextNodes(node.id, schema, matchedCase.output)
      : [];

    return this.createSuccessResult(
      nextNodes,
      context.variables,
      context.userState,
      [],
      [`Переключатель для "${variable}": ${matchedCase ? `выбран case "${matchedCase.value}"` : 'не найден подходящий case'}`]
    );
  }
}

/**
 * Исполнитель условия существования переменной
 */
export class ExistsConditionExecutor extends BaseNodeExecutor {
  async execute(node: Node, context: ExecutionContext, schema: BotSchema): Promise<ExecutionResult> {
    const variableName = node.data.variable || '';
    const checkType = node.data.checkType || 'exists'; // exists, notExists, empty, notEmpty
    
    const variableValue = context.variables[variableName];
    let result = false;
    
    switch (checkType) {
      case 'exists':
        result = variableValue !== undefined;
        break;
      case 'notExists':
        result = variableValue === undefined;
        break;
      case 'empty':
        result = !variableValue || variableValue === '' || (Array.isArray(variableValue) && variableValue.length === 0);
        break;
      case 'notEmpty':
        result = !!variableValue && variableValue !== '' && (!Array.isArray(variableValue) || variableValue.length > 0);
        break;
    }

    const nextNodes = result 
      ? this.getConditionalNextNodes(node.id, schema, 'true')
      : this.getConditionalNextNodes(node.id, schema, 'false');

    return this.createSuccessResult(
      nextNodes,
      context.variables,
      context.userState,
      [],
      [`Условие существования переменной "${variableName}" (${checkType}): ${result ? 'выполнено' : 'не выполнено'}`]
    );
  }
}

/**
 * Исполнитель условия типа данных
 */
export class TypeConditionExecutor extends BaseNodeExecutor {
  async execute(node: Node, context: ExecutionContext, schema: BotSchema): Promise<ExecutionResult> {
    const variableName = node.data.variable || '';
    const expectedType = node.data.expectedType || 'string'; // string, number, boolean, array, object
    
    const variableValue = context.variables[variableName];
    const actualType = Array.isArray(variableValue) ? 'array' : typeof variableValue;
    
    const result = actualType === expectedType;

    const nextNodes = result 
      ? this.getConditionalNextNodes(node.id, schema, 'true')
      : this.getConditionalNextNodes(node.id, schema, 'false');

    return this.createSuccessResult(
      nextNodes,
      context.variables,
      context.userState,
      [],
      [`Условие типа переменной "${variableName}": ожидался ${expectedType}, получен ${actualType} - ${result ? 'выполнено' : 'не выполнено'}`]
    );
  }
}