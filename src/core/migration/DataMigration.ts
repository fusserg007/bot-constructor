/**
 * Система миграции данных между версиями схем
 * Обеспечивает автоматическое преобразование старых форматов в новые
 */

import { BotSchema, Node, Edge } from '../types';
import { BotSchema as NewBotSchema, NodeInstance, NodeConnection } from '../schema/NodeTypes';
import { SchemaVersioning, MigrationRule } from '../versioning/SchemaVersioning';
import { SchemaValidator } from '../validation/SchemaValidator';
import { NodeDefinitions } from '../schema/NodeDefinitions';

export interface MigrationResult {
  success: boolean;
  migratedSchema?: BotSchema | NewBotSchema;
  errors: string[];
  warnings: string[];
  backupData?: any;
  migrationSteps: MigrationStep[];
  fromVersion: string;
  toVersion: string;
  timestamp: string;
}

export interface MigrationStep {
  fromVersion: string;
  toVersion: string;
  description: string;
  success: boolean;
  duration: number; // в миллисекундах
  changes: string[];
  warnings: string[];
  errors: string[];
}

export interface BackupInfo {
  id: string;
  originalVersion: string;
  timestamp: string;
  size: number;
  description: string;
  filePath?: string;
}

export class DataMigration {
  private static migrationRules: MigrationRule[] = [
    // Миграция с 0.1.0 на 0.2.0
    {
      fromVersion: '0.1.0',
      toVersion: '0.2.0',
      description: 'Добавление поддержки визуального редактора',
      transform: (oldSchema: any) => DataMigration.migrate_0_1_0_to_0_2_0(oldSchema)
    },
    // Миграция с 0.2.0 на 1.0.0
    {
      fromVersion: '0.2.0',
      toVersion: '1.0.0',
      description: 'Переход на мультиплатформенную архитектуру',
      transform: (oldSchema: any) => DataMigration.migrate_0_2_0_to_1_0_0(oldSchema)
    },
    // Миграция с 1.0.0 на 2.0.0 (новая схема)
    {
      fromVersion: '1.0.0',
      toVersion: '2.0.0',
      description: 'Переход на новую архитектуру схем с улучшенными типами',
      transform: (oldSchema: any) => DataMigration.migrate_1_0_0_to_2_0_0(oldSchema)
    },
    // Прямая миграция с 0.1.0 на 1.0.0
    {
      fromVersion: '0.1.0',
      toVersion: '1.0.0',
      description: 'Прямая миграция на мультиплатформенную архитектуру',
      transform: (oldSchema: any) => DataMigration.migrate_0_1_0_to_1_0_0(oldSchema)
    },
    // Прямая миграция с 0.1.0 на 2.0.0
    {
      fromVersion: '0.1.0',
      toVersion: '2.0.0',
      description: 'Прямая миграция на новую архитектуру схем',
      transform: (oldSchema: any) => DataMigration.migrate_0_1_0_to_2_0_0(oldSchema)
    },
    // Прямая миграция с 0.2.0 на 2.0.0
    {
      fromVersion: '0.2.0',
      toVersion: '2.0.0',
      description: 'Миграция на новую архитектуру схем',
      transform: (oldSchema: any) => DataMigration.migrate_0_2_0_to_2_0_0(oldSchema)
    }
  ];

  /**
   * Автоматическая миграция схемы к текущей версии
   */
  static async migrateToCurrentVersion(data: any): Promise<MigrationResult> {
    const currentVersion = SchemaVersioning.detectSchemaVersion(data);
    const targetVersion = SchemaVersioning.getCurrentVersion();

    if (currentVersion === targetVersion) {
      return {
        success: true,
        migratedSchema: data as BotSchema,
        errors: [],
        warnings: ['Схема уже соответствует текущей версии']
      };
    }

    return DataMigration.migrateSchema(data, currentVersion, targetVersion);
  }

  /**
   * Миграция схемы между конкретными версиями
   */
  static async migrateSchema(
    data: any,
    fromVersion: string,
    toVersion: string
  ): Promise<MigrationResult> {
    const startTime = Date.now();
    const result: MigrationResult = {
      success: false,
      errors: [],
      warnings: [],
      backupData: JSON.parse(JSON.stringify(data)), // Глубокая копия для backup
      migrationSteps: [],
      fromVersion,
      toVersion,
      timestamp: new Date().toISOString()
    };

    try {
      // Проверяем поддержку версий
      if (!SchemaVersioning.isVersionSupported(fromVersion)) {
        result.errors.push(`Неподдерживаемая исходная версия: ${fromVersion}`);
        return result;
      }

      if (!SchemaVersioning.isVersionSupported(toVersion)) {
        result.errors.push(`Неподдерживаемая целевая версия: ${toVersion}`);
        return result;
      }

      // Если версии одинаковые, возвращаем исходные данные
      if (fromVersion === toVersion) {
        result.success = true;
        result.migratedSchema = data;
        result.warnings.push('Исходная и целевая версии одинаковы');
        return result;
      }

      // Получаем путь миграции
      const migrationPath = SchemaVersioning.getMigrationPath(fromVersion, toVersion);
      
      if (migrationPath.length === 0) {
        // Пробуем найти прямое правило миграции
        const directRule = DataMigration.findMigrationRule(fromVersion, toVersion);
        if (directRule) {
          const stepResult = await DataMigration.executeMigrationStep(data, directRule);
          result.migrationSteps.push(stepResult);
          
          if (stepResult.success) {
            result.success = true;
            result.migratedSchema = stepResult.success ? data : undefined;
          } else {
            result.errors.push(...stepResult.errors);
          }
          return result;
        }
        
        result.errors.push(`Невозможно мигрировать с ${fromVersion} на ${toVersion}`);
        return result;
      }

      // Выполняем пошаговую миграцию
      let currentData = data;
      let currentVersion = fromVersion;

      for (const nextVersion of migrationPath) {
        const migrationRule = DataMigration.findMigrationRule(currentVersion, nextVersion);
        
        if (!migrationRule) {
          result.errors.push(`Не найдено правило миграции с ${currentVersion} на ${nextVersion}`);
          return result;
        }

        const stepResult = await DataMigration.executeMigrationStep(currentData, migrationRule);
        result.migrationSteps.push(stepResult);
        
        if (!stepResult.success) {
          result.errors.push(...stepResult.errors);
          return result;
        }

        currentData = stepResult.success ? currentData : currentData; // Обновляем данные после успешной миграции
        currentVersion = nextVersion;
        result.warnings.push(...stepResult.warnings);
      }

      // Финальная валидация
      const validator = new SchemaValidator();
      let validationResult;
      
      // Выбираем правильный метод валидации в зависимости от версии
      if (toVersion === '2.0.0') {
        validationResult = validator.validateSchema(currentData);
      } else {
        validationResult = validator.validateBotSchema(currentData);
      }
      
      if (!validationResult.isValid) {
        result.errors.push('Схема не прошла финальную валидацию');
        result.errors.push(...validationResult.errors.map(e => e.message));
      }

      if (validationResult.hasWarnings) {
        result.warnings.push(...validationResult.warnings.map(w => w.message));
      }

      result.success = validationResult.isValid;
      result.migratedSchema = currentData;

      // Добавляем общую информацию о миграции
      const totalDuration = Date.now() - startTime;
      result.warnings.push(`Миграция завершена за ${totalDuration}мс`);
      result.warnings.push(`Выполнено шагов миграции: ${result.migrationSteps.length}`);

    } catch (error) {
      result.errors.push(`Критическая ошибка миграции: ${(error as Error).message}`);
    }

    return result;
  }

  /**
   * Выполнение одного шага миграции
   */
  private static async executeMigrationStep(data: any, rule: MigrationRule): Promise<MigrationStep> {
    const startTime = Date.now();
    const step: MigrationStep = {
      fromVersion: rule.fromVersion,
      toVersion: rule.toVersion,
      description: rule.description,
      success: false,
      duration: 0,
      changes: [],
      warnings: [],
      errors: []
    };

    try {
      console.log(`Executing migration step: ${rule.fromVersion} → ${rule.toVersion}`);
      
      const transformedData = rule.transform(data);
      
      // Валидация после трансформации
      if (rule.validate) {
        const isValid = rule.validate(transformedData);
        if (!isValid) {
          step.errors.push(`Валидация не пройдена после миграции на ${rule.toVersion}`);
          return step;
        }
      }

      // Анализируем изменения
      step.changes = DataMigration.analyzeChanges(data, transformedData);
      step.success = true;
      
      // Обновляем исходные данные
      Object.assign(data, transformedData);

    } catch (error) {
      step.errors.push(`Ошибка выполнения миграции: ${(error as Error).message}`);
    } finally {
      step.duration = Date.now() - startTime;
    }

    return step;
  }

  /**
   * Анализ изменений между схемами
   */
  private static analyzeChanges(oldData: any, newData: any): string[] {
    const changes: string[] = [];

    // Сравнение версий
    if (oldData.version !== newData.version) {
      changes.push(`Версия изменена с ${oldData.version || 'неизвестно'} на ${newData.version}`);
    }

    // Сравнение количества узлов
    const oldNodesCount = oldData.nodes?.length || 0;
    const newNodesCount = newData.nodes?.length || 0;
    if (oldNodesCount !== newNodesCount) {
      changes.push(`Количество узлов изменено с ${oldNodesCount} на ${newNodesCount}`);
    }

    // Сравнение количества соединений
    const oldEdgesCount = (oldData.edges || oldData.connections)?.length || 0;
    const newEdgesCount = (newData.edges || newData.connections)?.length || 0;
    if (oldEdgesCount !== newEdgesCount) {
      changes.push(`Количество соединений изменено с ${oldEdgesCount} на ${newEdgesCount}`);
    }

    // Сравнение настроек
    if (oldData.settings && newData.settings) {
      const oldPlatforms = oldData.settings.platforms?.length || 0;
      const newPlatforms = newData.settings.platforms?.length || 0;
      if (oldPlatforms !== newPlatforms) {
        changes.push(`Количество платформ изменено с ${oldPlatforms} на ${newPlatforms}`);
      }
    }

    // Добавление новых полей
    if (newData.variables && !oldData.variables) {
      changes.push('Добавлена поддержка переменных');
    }

    if (newData.groups && !oldData.groups) {
      changes.push('Добавлена поддержка групп узлов');
    }

    if (newData.constants && !oldData.constants) {
      changes.push('Добавлена поддержка констант');
    }

    return changes;
  }

  /**
   * Найти правило миграции
   */
  private static findMigrationRule(fromVersion: string, toVersion: string): MigrationRule | null {
    return DataMigration.migrationRules.find(
      rule => rule.fromVersion === fromVersion && rule.toVersion === toVersion
    ) || null;
  }

  /**
   * Миграция с версии 0.1.0 на 0.2.0
   */
  private static migrate_0_1_0_to_0_2_0(oldSchema: any): BotSchema {
    const now = new Date().toISOString();

    // Конвертируем старую структуру configuration в новую
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    if (oldSchema.configuration?.nodes) {
      oldSchema.configuration.nodes.forEach((oldNode: any, index: number) => {
        const node: Node = {
          id: oldNode.id || `node_${index}`,
          type: DataMigration.convertOldNodeType(oldNode.type),
          category: DataMigration.inferNodeCategory(oldNode),
          position: { x: 100 + (index * 200), y: 100 },
          data: {
            label: oldNode.data?.label || oldNode.type || 'Узел',
            config: oldNode.data || {},
            inputs: DataMigration.createDefaultPorts('input'),
            outputs: DataMigration.createDefaultPorts('output')
          }
        };
        nodes.push(node);

        // Создаем соединения из старых connections
        if (oldNode.connections && Array.isArray(oldNode.connections)) {
          oldNode.connections.forEach((targetId: string, connIndex: number) => {
            edges.push({
              id: `edge_${node.id}_${targetId}_${connIndex}`,
              source: node.id,
              target: targetId,
              type: 'default'
            });
          });
        }
      });
    }

    return {
      id: oldSchema.id || `migrated_${Date.now()}`,
      name: oldSchema.name || 'Мигрированная схема',
      nodes,
      edges,
      variables: {},
      settings: {
        name: oldSchema.name || 'Мигрированный бот',
        description: oldSchema.description || '',
        platforms: ['telegram'], // По умолчанию Telegram
        mode: 'polling',
        variables: {}
      },
      version: '0.2.0',
      createdAt: oldSchema.createdAt || now,
      updatedAt: now
    };
  }

  /**
   * Миграция с версии 0.2.0 на 1.0.0
   */
  private static migrate_0_2_0_to_1_0_0(oldSchema: any): BotSchema {
    const now = new Date().toISOString();

    // Обновляем структуру для мультиплатформенности
    const updatedNodes = oldSchema.nodes?.map((node: Node) => ({
      ...node,
      platforms: node.platforms || ['telegram'] // Добавляем платформы если их нет
    })) || [];

    return {
      ...oldSchema,
      nodes: updatedNodes,
      settings: {
        ...oldSchema.settings,
        platforms: oldSchema.settings?.platforms || ['telegram'],
        mode: oldSchema.settings?.mode || 'polling'
      },
      version: '1.0.0',
      updatedAt: now
    };
  }

  /**
   * Прямая миграция с версии 0.1.0 на 1.0.0
   */
  private static migrate_0_1_0_to_1_0_0(oldSchema: any): BotSchema {
    // Сначала мигрируем на 0.2.0, затем на 1.0.0
    const intermediate = DataMigration.migrate_0_1_0_to_0_2_0(oldSchema);
    return DataMigration.migrate_0_2_0_to_1_0_0(intermediate);
  }

  /**
   * Миграция с версии 1.0.0 на 2.0.0 (новая архитектура схем)
   */
  private static migrate_1_0_0_to_2_0_0(oldSchema: BotSchema): NewBotSchema {
    const now = new Date().toISOString();

    // Конвертируем узлы в новый формат
    const nodes: NodeInstance[] = oldSchema.nodes.map(oldNode => {
      const nodeDefinition = NodeDefinitions[oldNode.type];
      
      return {
        id: oldNode.id,
        type: oldNode.type,
        position: oldNode.position,
        config: DataMigration.migrateNodeConfig(oldNode.data?.config || {}, oldNode.type),
        metadata: {
          label: oldNode.data?.label,
          notes: undefined,
          disabled: false,
          breakpoint: false
        }
      };
    });

    // Конвертируем соединения в новый формат
    const connections: NodeConnection[] = oldSchema.edges.map(oldEdge => ({
      id: oldEdge.id,
      sourceNodeId: oldEdge.source,
      sourcePortId: oldEdge.sourceHandle || 'output',
      targetNodeId: oldEdge.target,
      targetPortId: oldEdge.targetHandle || 'input',
      metadata: {
        label: undefined,
        color: undefined,
        animated: false
      }
    }));

    // Конвертируем переменные
    const variables: Record<string, any> = {};
    if (oldSchema.variables) {
      Object.entries(oldSchema.variables).forEach(([key, variable]) => {
        variables[key] = {
          id: `var-${key}`,
          name: key,
          type: (variable as any).type || 'string',
          scope: (variable as any).scope || 'user',
          defaultValue: (variable as any).defaultValue,
          description: `Мигрированная переменная ${key}`,
          persistent: true
        };
      });
    }

    return {
      id: oldSchema.id,
      settings: {
        name: oldSchema.settings.name,
        description: oldSchema.settings.description || '',
        version: '2.0.0',
        platforms: oldSchema.settings.platforms,
        mode: oldSchema.settings.mode,
        timeout: 30,
        maxExecutionDepth: 10,
        errorHandling: 'stop',
        retryAttempts: 3,
        logging: {
          level: 'info',
          includeUserData: false,
          retention: 7
        },
        rateLimit: {
          enabled: true,
          requestsPerMinute: 60,
          burstLimit: 10
        }
      },
      nodes,
      connections,
      groups: [],
      variables,
      constants: {},
      metadata: {
        createdAt: oldSchema.createdAt,
        updatedAt: now,
        tags: ['migrated']
      }
    };
  }

  /**
   * Прямая миграция с версии 0.1.0 на 2.0.0
   */
  private static migrate_0_1_0_to_2_0_0(oldSchema: any): NewBotSchema {
    // Сначала мигрируем на 1.0.0, затем на 2.0.0
    const intermediate = DataMigration.migrate_0_1_0_to_1_0_0(oldSchema);
    return DataMigration.migrate_1_0_0_to_2_0_0(intermediate);
  }

  /**
   * Прямая миграция с версии 0.2.0 на 2.0.0
   */
  private static migrate_0_2_0_to_2_0_0(oldSchema: any): NewBotSchema {
    // Сначала мигрируем на 1.0.0, затем на 2.0.0
    const intermediate = DataMigration.migrate_0_2_0_to_1_0_0(oldSchema);
    return DataMigration.migrate_1_0_0_to_2_0_0(intermediate);
  }

  /**
   * Миграция конфигурации узла
   */
  private static migrateNodeConfig(oldConfig: any, nodeType: string): any {
    const nodeDefinition = NodeDefinitions[nodeType];
    if (!nodeDefinition) {
      return oldConfig;
    }

    const newConfig: any = {};
    
    // Копируем существующие поля, которые есть в новом определении
    Object.keys(nodeDefinition.configFields).forEach(fieldName => {
      if (oldConfig[fieldName] !== undefined) {
        newConfig[fieldName] = oldConfig[fieldName];
      } else {
        // Используем значение по умолчанию
        const fieldConfig = nodeDefinition.configFields[fieldName];
        newConfig[fieldName] = fieldConfig.defaultValue;
      }
    });

    // Специальная обработка для разных типов узлов
    switch (nodeType) {
      case 'trigger-command':
        if (oldConfig.command && !newConfig.command) {
          newConfig.command = oldConfig.command;
        }
        break;
      case 'action-send-message':
        if (oldConfig.message && !newConfig.text) {
          newConfig.text = oldConfig.message;
        }
        break;
      case 'condition-text-contains':
        if (oldConfig.pattern && !newConfig.searchText) {
          newConfig.searchText = oldConfig.pattern;
        }
        break;
    }

    return newConfig;
  }

  /**
   * Конвертация старых типов узлов
   */
  private static convertOldNodeType(oldType: string): Node['type'] {
    const typeMapping: Record<string, Node['type']> = {
      'action': 'action-send-message',
      'trigger': 'trigger-command',
      'condition': 'condition-text-contains',
      'variable': 'data-variable'
    };

    return typeMapping[oldType] || 'action-send-message';
  }

  /**
   * Определение категории узла по старым данным
   */
  private static inferNodeCategory(oldNode: any): Node['category'] {
    if (oldNode.data?.triggerType || oldNode.data?.actionType === 'trigger') {
      return 'triggers';
    }
    if (oldNode.data?.conditionType) {
      return 'conditions';
    }
    if (oldNode.data?.dataType || oldNode.type === 'variable') {
      return 'data';
    }
    if (oldNode.data?.integrationType) {
      return 'integrations';
    }
    return 'actions';
  }

  /**
   * Создание портов по умолчанию
   */
  private static createDefaultPorts(portType: 'input' | 'output') {
    return [{
      id: portType,
      name: portType === 'input' ? 'Вход' : 'Выход',
      type: 'control' as const,
      dataType: 'any' as const,
      required: false
    }];
  }

  /**
   * Создание backup с метаданными
   */
  static async createBackup(data: any, description?: string): Promise<BackupInfo> {
    const timestamp = new Date().toISOString();
    const backupId = `backup_${timestamp.replace(/[:.]/g, '-')}`;
    const version = SchemaVersioning.detectSchemaVersion(data);
    
    const backupInfo: BackupInfo = {
      id: backupId,
      originalVersion: version,
      timestamp,
      size: JSON.stringify(data).length,
      description: description || `Backup before migration from ${version}`,
      filePath: `${backupId}.json`
    };

    try {
      // В реальной реализации здесь будет сохранение в файл
      console.log(`Creating backup: ${backupInfo.filePath}`);
      console.log(`Backup info:`, backupInfo);
      
      // Сохраняем данные и метаданные
      // await fs.writeFile(backupInfo.filePath, JSON.stringify(data, null, 2));
      // await fs.writeFile(`${backupId}_info.json`, JSON.stringify(backupInfo, null, 2));
      
      return backupInfo;
    } catch (error) {
      throw new Error(`Failed to create backup: ${(error as Error).message}`);
    }
  }

  /**
   * Восстановление из backup
   */
  static async restoreFromBackup(backupId: string): Promise<{ data: any; info: BackupInfo }> {
    try {
      console.log(`Restoring from backup: ${backupId}`);
      
      // В реальной реализации здесь будет чтение из файлов
      // const data = JSON.parse(await fs.readFile(`${backupId}.json`, 'utf8'));
      // const info = JSON.parse(await fs.readFile(`${backupId}_info.json`, 'utf8'));
      
      const mockData = { id: 'restored', version: '1.0.0' };
      const mockInfo: BackupInfo = {
        id: backupId,
        originalVersion: '1.0.0',
        timestamp: new Date().toISOString(),
        size: 1000,
        description: 'Mock backup'
      };
      
      return { data: mockData, info: mockInfo };
    } catch (error) {
      throw new Error(`Failed to restore from backup: ${(error as Error).message}`);
    }
  }

  /**
   * Получить список доступных backup'ов
   */
  static async listBackups(): Promise<BackupInfo[]> {
    try {
      // В реальной реализации здесь будет чтение директории backup'ов
      console.log('Listing available backups...');
      
      // Возвращаем mock данные
      return [
        {
          id: 'backup_2025-07-25T10-00-00',
          originalVersion: '0.1.0',
          timestamp: '2025-07-25T10:00:00.000Z',
          size: 1500,
          description: 'Backup before migration from 0.1.0'
        },
        {
          id: 'backup_2025-07-25T11-00-00',
          originalVersion: '1.0.0',
          timestamp: '2025-07-25T11:00:00.000Z',
          size: 2500,
          description: 'Backup before migration from 1.0.0'
        }
      ];
    } catch (error) {
      throw new Error(`Failed to list backups: ${(error as Error).message}`);
    }
  }

  /**
   * Удаление backup'а
   */
  static async deleteBackup(backupId: string): Promise<boolean> {
    try {
      console.log(`Deleting backup: ${backupId}`);
      
      // В реальной реализации здесь будет удаление файлов
      // await fs.unlink(`${backupId}.json`);
      // await fs.unlink(`${backupId}_info.json`);
      
      return true;
    } catch (error) {
      console.error(`Failed to delete backup: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Получить список доступных правил миграции
   */
  static getMigrationRules(): MigrationRule[] {
    return [...DataMigration.migrationRules];
  }

  /**
   * Проверить, возможна ли миграция
   */
  static canMigrate(fromVersion: string, toVersion: string): boolean {
    try {
      // Проверяем прямое правило миграции
      if (DataMigration.findMigrationRule(fromVersion, toVersion)) {
        return true;
      }

      // Проверяем пошаговую миграцию
      const migrationPath = SchemaVersioning.getMigrationPath(fromVersion, toVersion);
      return migrationPath.length > 0 && migrationPath.every(version => 
        DataMigration.findMigrationRule(
          migrationPath[migrationPath.indexOf(version) - 1] || fromVersion,
          version
        ) !== null
      );
    } catch {
      return false;
    }
  }

  /**
   * Получить план миграции
   */
  static getMigrationPlan(fromVersion: string, toVersion: string): {
    canMigrate: boolean;
    steps: Array<{ from: string; to: string; description: string }>;
    estimatedDuration: string;
    risks: string[];
    recommendations: string[];
  } {
    const plan = {
      canMigrate: false,
      steps: [] as Array<{ from: string; to: string; description: string }>,
      estimatedDuration: '< 1 секунды',
      risks: [] as string[],
      recommendations: [] as string[]
    };

    try {
      // Проверяем прямое правило
      const directRule = DataMigration.findMigrationRule(fromVersion, toVersion);
      if (directRule) {
        plan.canMigrate = true;
        plan.steps.push({
          from: fromVersion,
          to: toVersion,
          description: directRule.description
        });
        plan.estimatedDuration = '< 1 секунды';
      } else {
        // Проверяем пошаговую миграцию
        const migrationPath = SchemaVersioning.getMigrationPath(fromVersion, toVersion);
        if (migrationPath.length > 0) {
          let currentVersion = fromVersion;
          let allRulesFound = true;

          for (const nextVersion of migrationPath) {
            const rule = DataMigration.findMigrationRule(currentVersion, nextVersion);
            if (rule) {
              plan.steps.push({
                from: currentVersion,
                to: nextVersion,
                description: rule.description
              });
              currentVersion = nextVersion;
            } else {
              allRulesFound = false;
              break;
            }
          }

          plan.canMigrate = allRulesFound;
          plan.estimatedDuration = `${plan.steps.length} секунд`;
        }
      }

      // Добавляем риски и рекомендации
      if (plan.canMigrate) {
        if (plan.steps.length > 1) {
          plan.risks.push('Многошаговая миграция может занять больше времени');
        }

        const versionInfo = SchemaVersioning.getVersionInfo(toVersion);
        if (versionInfo?.breaking) {
          plan.risks.push('Целевая версия содержит breaking changes');
          plan.recommendations.push('Создайте backup перед миграцией');
        }

        if (SchemaVersioning.isVersionDeprecated(fromVersion)) {
          plan.recommendations.push('Исходная версия устарела, рекомендуется миграция');
        }

        plan.recommendations.push('Протестируйте функциональность после миграции');
      }

    } catch (error) {
      plan.risks.push(`Ошибка планирования миграции: ${(error as Error).message}`);
    }

    return plan;
  }

  /**
   * Валидация схемы перед миграцией
   */
  static async validateBeforeMigration(data: any): Promise<{
    isValid: boolean;
    canProceed: boolean;
    issues: string[];
    warnings: string[];
  }> {
    const result = {
      isValid: false,
      canProceed: false,
      issues: [] as string[],
      warnings: [] as string[]
    };

    try {
      // Определяем версию
      const version = SchemaVersioning.detectSchemaVersion(data);
      result.warnings.push(`Обнаружена версия схемы: ${version}`);

      // Валидируем схему
      const validator = new SchemaValidator();
      const validationResult = validator.validateBotSchema(data);

      result.isValid = validationResult.isValid;
      result.issues = validationResult.errors.map(e => e.message);
      result.warnings.push(...validationResult.warnings.map(w => w.message));

      // Проверяем критические ошибки
      const criticalErrors = validationResult.errors.filter(e => 
        e.type.includes('missing') || e.type.includes('invalid')
      );

      result.canProceed = criticalErrors.length === 0;

      if (!result.canProceed) {
        result.issues.push('Обнаружены критические ошибки, миграция может быть небезопасной');
      }

    } catch (error) {
      result.issues.push(`Ошибка валидации: ${(error as Error).message}`);
    }

    return result;
  }

  /**
   * Получить статистику миграций
   */
  static getMigrationStatistics(): {
    totalRules: number;
    supportedVersions: string[];
    availablePaths: Array<{ from: string; to: string; direct: boolean }>;
    mostCommonMigrations: Array<{ from: string; to: string; count: number }>;
  } {
    const supportedVersions = SchemaVersioning.getSupportedVersions().map(v => v.version);
    const availablePaths: Array<{ from: string; to: string; direct: boolean }> = [];

    // Находим все возможные пути миграции
    for (const fromVersion of supportedVersions) {
      for (const toVersion of supportedVersions) {
        if (fromVersion !== toVersion) {
          const directRule = DataMigration.findMigrationRule(fromVersion, toVersion);
          if (directRule) {
            availablePaths.push({ from: fromVersion, to: toVersion, direct: true });
          } else if (DataMigration.canMigrate(fromVersion, toVersion)) {
            availablePaths.push({ from: fromVersion, to: toVersion, direct: false });
          }
        }
      }
    }

    // Наиболее частые миграции (mock данные)
    const mostCommonMigrations = [
      { from: '0.1.0', to: '1.0.0', count: 15 },
      { from: '0.2.0', to: '1.0.0', count: 8 },
      { from: '1.0.0', to: '2.0.0', count: 3 }
    ];

    return {
      totalRules: DataMigration.migrationRules.length,
      supportedVersions,
      availablePaths,
      mostCommonMigrations
    };
  }
}