/**
 * Исполнители узлов для работы с данными
 */
import { Node, BotSchema } from '../../types';
import { ExecutionContext, ExecutionResult } from '../SchemaExecutionEngine';
import { BaseNodeExecutor } from './BaseNodeExecutor';

/**
 * Исполнитель математических операций
 */
export class MathExecutor extends BaseNodeExecutor {
  async execute(node: Node, context: ExecutionContext, schema: BotSchema): Promise<ExecutionResult> {
    const operation = node.data.operation || 'add';
    const operand1 = parseFloat(this.replaceVariables(node.data.operand1 || '0', context));
    const operand2 = parseFloat(this.replaceVariables(node.data.operand2 || '0', context));
    const resultVariable = node.data.resultVariable || 'mathResult';
    const precision = parseInt(node.data.precision || '2');
    const nextNodes = this.getNextNodes(node.id, schema);

    if (isNaN(operand1) || isNaN(operand2)) {
      return this.createErrorResult(
        `Некорректные операнды для математической операции: ${node.data.operand1}, ${node.data.operand2}`,
        context.variables,
        context.userState
      );
    }

    let result: number;

    switch (operation) {
      case 'add':
        result = operand1 + operand2;
        break;
      case 'subtract':
        result = operand1 - operand2;
        break;
      case 'multiply':
        result = operand1 * operand2;
        break;
      case 'divide':
        if (operand2 === 0) {
          return this.createErrorResult('Деление на ноль', context.variables, context.userState);
        }
        result = operand1 / operand2;
        break;
      case 'modulo':
        if (operand2 === 0) {
          return this.createErrorResult('Деление на ноль в операции modulo', context.variables, context.userState);
        }
        result = operand1 % operand2;
        break;
      case 'power':
        result = Math.pow(operand1, operand2);
        break;
      case 'sqrt':
        result = Math.sqrt(operand1);
        break;
      case 'abs':
        result = Math.abs(operand1);
        break;
      case 'round':
        result = Math.round(operand1);
        break;
      case 'floor':
        result = Math.floor(operand1);
        break;
      case 'ceil':
        result = Math.ceil(operand1);
        break;
      case 'min':
        result = Math.min(operand1, operand2);
        break;
      case 'max':
        result = Math.max(operand1, operand2);
        break;
      default:
        result = 0;
    }

    // Применяем точность
    if (precision >= 0) {
      result = parseFloat(result.toFixed(precision));
    }

    const newVariables = {
      ...context.variables,
      [resultVariable]: result
    };

    return this.createSuccessResult(
      nextNodes,
      newVariables,
      context.userState,
      [],
      [`Математическая операция: ${operand1} ${operation} ${operand2} = ${result}`]
    );
  }
}

/**
 * Исполнитель работы со строками
 */
export class StringExecutor extends BaseNodeExecutor {
  async execute(node: Node, context: ExecutionContext, schema: BotSchema): Promise<ExecutionResult> {
    const operation = node.data.operation || 'concat';
    const string1 = this.replaceVariables(node.data.string1 || '', context);
    const string2 = this.replaceVariables(node.data.string2 || '', context);
    const resultVariable = node.data.resultVariable || 'stringResult';
    const nextNodes = this.getNextNodes(node.id, schema);

    let result: string | number;

    switch (operation) {
      case 'concat':
        result = string1 + string2;
        break;
      case 'substring':
        const start = parseInt(node.data.start || '0');
        const end = node.data.end ? parseInt(node.data.end) : undefined;
        result = string1.substring(start, end);
        break;
      case 'replace':
        const searchValue = this.replaceVariables(node.data.searchValue || '', context);
        const replaceValue = this.replaceVariables(node.data.replaceValue || '', context);
        const replaceAll = node.data.replaceAll || false;
        if (replaceAll) {
          result = string1.replaceAll(searchValue, replaceValue);
        } else {
          result = string1.replace(searchValue, replaceValue);
        }
        break;
      case 'toLowerCase':
        result = string1.toLowerCase();
        break;
      case 'toUpperCase':
        result = string1.toUpperCase();
        break;
      case 'trim':
        result = string1.trim();
        break;
      case 'length':
        result = string1.length;
        break;
      case 'split':
        const separator = this.replaceVariables(node.data.separator || ',', context);
        const splitResult = string1.split(separator);
        const newVariables = {
          ...context.variables,
          [resultVariable]: splitResult,
          [`${resultVariable}_length`]: splitResult.length
        };
        return this.createSuccessResult(
          nextNodes,
          newVariables,
          context.userState,
          [],
          [`Строка разделена на ${splitResult.length} частей`]
        );
      case 'indexOf':
        const searchString = this.replaceVariables(node.data.searchString || '', context);
        result = string1.indexOf(searchString);
        break;
      case 'includes':
        const includesString = this.replaceVariables(node.data.includesString || '', context);
        result = string1.includes(includesString) ? 1 : 0;
        break;
      default:
        result = string1;
    }

    const newVariables = {
      ...context.variables,
      [resultVariable]: result
    };

    return this.createSuccessResult(
      nextNodes,
      newVariables,
      context.userState,
      [],
      [`Строковая операция ${operation}: результат = ${result}`]
    );
  }
}

/**
 * Исполнитель работы с массивами
 */
export class ArrayExecutor extends BaseNodeExecutor {
  async execute(node: Node, context: ExecutionContext, schema: BotSchema): Promise<ExecutionResult> {
    const operation = node.data.operation || 'push';
    const arrayVariable = node.data.arrayVariable || 'array';
    const currentArray = context.variables[arrayVariable] || [];
    const resultVariable = node.data.resultVariable || arrayVariable;
    const nextNodes = this.getNextNodes(node.id, schema);

    if (!Array.isArray(currentArray)) {
      return this.createErrorResult(
        `Переменная ${arrayVariable} не является массивом`,
        context.variables,
        context.userState
      );
    }

    let result: any[] | any = [...currentArray];

    switch (operation) {
      case 'push':
        const pushValue = this.replaceVariables(node.data.value || '', context);
        result.push(pushValue);
        break;
      case 'pop':
        const poppedValue = result.pop();
        const newVariables1 = {
          ...context.variables,
          [resultVariable]: result,
          [`${resultVariable}_popped`]: poppedValue
        };
        return this.createSuccessResult(
          nextNodes,
          newVariables1,
          context.userState,
          [],
          [`Удален последний элемент массива: ${poppedValue}`]
        );
      case 'shift':
        const shiftedValue = result.shift();
        const newVariables2 = {
          ...context.variables,
          [resultVariable]: result,
          [`${resultVariable}_shifted`]: shiftedValue
        };
        return this.createSuccessResult(
          nextNodes,
          newVariables2,
          context.userState,
          [],
          [`Удален первый элемент массива: ${shiftedValue}`]
        );
      case 'unshift':
        const unshiftValue = this.replaceVariables(node.data.value || '', context);
        result.unshift(unshiftValue);
        break;
      case 'slice':
        const start = parseInt(node.data.start || '0');
        const end = node.data.end ? parseInt(node.data.end) : undefined;
        result = result.slice(start, end);
        break;
      case 'splice':
        const spliceStart = parseInt(node.data.start || '0');
        const deleteCount = parseInt(node.data.deleteCount || '1');
        const spliceValue = node.data.value ? this.replaceVariables(node.data.value, context) : undefined;
        const splicedItems = spliceValue 
          ? result.splice(spliceStart, deleteCount, spliceValue)
          : result.splice(spliceStart, deleteCount);
        const newVariables3 = {
          ...context.variables,
          [resultVariable]: result,
          [`${resultVariable}_spliced`]: splicedItems
        };
        return this.createSuccessResult(
          nextNodes,
          newVariables3,
          context.userState,
          [],
          [`Удалено ${splicedItems.length} элементов из массива`]
        );
      case 'join':
        const separator = this.replaceVariables(node.data.separator || ',', context);
        result = result.join(separator);
        break;
      case 'reverse':
        result = result.reverse();
        break;
      case 'sort':
        result = result.sort();
        break;
      case 'length':
        result = result.length;
        break;
      case 'indexOf':
        const searchValue = this.replaceVariables(node.data.searchValue || '', context);
        result = result.indexOf(searchValue);
        break;
      case 'includes':
        const includesValue = this.replaceVariables(node.data.includesValue || '', context);
        result = result.includes(includesValue) ? 1 : 0;
        break;
      case 'filter':
        const filterCondition = node.data.filterCondition || '';
        try {
          result = result.filter((item: any, index: number) => {
            const itemContext = {
              ...context.variables,
              item,
              index,
              array: result
            };
            return this.evaluateCondition(filterCondition, { ...context, variables: itemContext });
          });
        } catch (error) {
          return this.createErrorResult(
            `Ошибка в условии фильтрации: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
            context.variables,
            context.userState
          );
        }
        break;
      default:
        result = currentArray;
    }

    const newVariables = {
      ...context.variables,
      [resultVariable]: result
    };

    return this.createSuccessResult(
      nextNodes,
      newVariables,
      context.userState,
      [],
      [`Операция с массивом ${operation}: результат = ${Array.isArray(result) ? `массив из ${result.length} элементов` : result}`]
    );
  }
}

/**
 * Исполнитель работы с JSON
 */
export class JsonExecutor extends BaseNodeExecutor {
  async execute(node: Node, context: ExecutionContext, schema: BotSchema): Promise<ExecutionResult> {
    const operation = node.data.operation || 'parse';
    const jsonString = this.replaceVariables(node.data.jsonString || '', context);
    const jsonObject = context.variables[node.data.jsonVariable || 'jsonObject'];
    const resultVariable = node.data.resultVariable || 'jsonResult';
    const nextNodes = this.getNextNodes(node.id, schema);

    let result: any;

    try {
      switch (operation) {
        case 'parse':
          result = JSON.parse(jsonString);
          break;
        case 'stringify':
          const indent = node.data.indent ? parseInt(node.data.indent) : undefined;
          result = JSON.stringify(jsonObject, null, indent);
          break;
        case 'get':
          const path = node.data.path || '';
          result = this.safeGet(jsonObject, path);
          break;
        case 'set':
          const setPath = node.data.path || '';
          const setValue = this.replaceVariables(node.data.value || '', context);
          const newObject = { ...jsonObject };
          this.safeSet(newObject, setPath, setValue);
          result = newObject;
          break;
        case 'keys':
          result = Object.keys(jsonObject || {});
          break;
        case 'values':
          result = Object.values(jsonObject || {});
          break;
        case 'entries':
          result = Object.entries(jsonObject || {});
          break;
        default:
          result = jsonObject;
      }
    } catch (error) {
      return this.createErrorResult(
        `Ошибка JSON операции: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        context.variables,
        context.userState
      );
    }

    const newVariables = {
      ...context.variables,
      [resultVariable]: result
    };

    return this.createSuccessResult(
      nextNodes,
      newVariables,
      context.userState,
      [],
      [`JSON операция ${operation} выполнена успешно`]
    );
  }
}

/**
 * Исполнитель генерации случайных данных
 */
export class RandomDataExecutor extends BaseNodeExecutor {
  async execute(node: Node, context: ExecutionContext, schema: BotSchema): Promise<ExecutionResult> {
    const dataType = node.data.dataType || 'number';
    const resultVariable = node.data.resultVariable || 'randomResult';
    const nextNodes = this.getNextNodes(node.id, schema);

    let result: any;

    switch (dataType) {
      case 'number':
        const min = parseFloat(node.data.min || '0');
        const max = parseFloat(node.data.max || '100');
        const isInteger = node.data.integer || false;
        result = Math.random() * (max - min) + min;
        if (isInteger) {
          result = Math.floor(result);
        }
        break;
      case 'string':
        const length = parseInt(node.data.length || '10');
        const charset = node.data.charset || 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        result = '';
        for (let i = 0; i < length; i++) {
          result += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        break;
      case 'boolean':
        result = Math.random() < 0.5;
        break;
      case 'uuid':
        result = this.generateId();
        break;
      case 'choice':
        const choices = node.data.choices || [];
        if (choices.length > 0) {
          result = choices[Math.floor(Math.random() * choices.length)];
        } else {
          result = null;
        }
        break;
      default:
        result = Math.random();
    }

    const newVariables = {
      ...context.variables,
      [resultVariable]: result
    };

    return this.createSuccessResult(
      nextNodes,
      newVariables,
      context.userState,
      [],
      [`Сгенерированы случайные данные (${dataType}): ${result}`]
    );
  }
}

/**
 * Исполнитель форматирования данных
 */
export class FormatExecutor extends BaseNodeExecutor {
  async execute(node: Node, context: ExecutionContext, schema: BotSchema): Promise<ExecutionResult> {
    const formatType = node.data.formatType || 'template';
    const template = this.replaceVariables(node.data.template || '', context);
    const value = context.variables[node.data.variable || ''];
    const resultVariable = node.data.resultVariable || 'formatResult';
    const nextNodes = this.getNextNodes(node.id, schema);

    let result: string;

    switch (formatType) {
      case 'template':
        result = template;
        break;
      case 'date':
        const dateValue = new Date(value);
        const dateFormat = node.data.dateFormat || 'YYYY-MM-DD';
        result = this.formatDate(dateValue, dateFormat);
        break;
      case 'number':
        const numberValue = parseFloat(value);
        const decimals = parseInt(node.data.decimals || '2');
        const thousandsSeparator = node.data.thousandsSeparator || ',';
        const decimalSeparator = node.data.decimalSeparator || '.';
        result = this.formatNumber(numberValue, decimals, thousandsSeparator, decimalSeparator);
        break;
      case 'currency':
        const currencyValue = parseFloat(value);
        const currency = node.data.currency || 'USD';
        const locale = node.data.locale || 'en-US';
        result = new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: currency
        }).format(currencyValue);
        break;
      default:
        result = String(value);
    }

    const newVariables = {
      ...context.variables,
      [resultVariable]: result
    };

    return this.createSuccessResult(
      nextNodes,
      newVariables,
      context.userState,
      [],
      [`Данные отформатированы (${formatType}): ${result}`]
    );
  }

  private formatDate(date: Date, format: string): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return format
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }

  private formatNumber(num: number, decimals: number, thousandsSep: string, decimalSep: string): string {
    const parts = num.toFixed(decimals).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSep);
    return parts.join(decimalSep);
  }
}