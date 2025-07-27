/**
 * Система версионирования схем
 * Обеспечивает отслеживание версий и миграцию между ними
 */

import { BotSchema } from '../types';

export interface SchemaVersion {
  version: string;
  description: string;
  releaseDate: string;
  breaking: boolean;
  deprecated?: boolean;
  supportUntil?: string;
}

export interface MigrationRule {
  fromVersion: string;
  toVersion: string;
  description: string;
  transform: (oldSchema: any) => BotSchema;
  validate?: (newSchema: BotSchema) => boolean;
}

export class SchemaVersioning {
  private static readonly CURRENT_VERSION = '1.0.0';
  private static readonly SUPPORTED_VERSIONS: SchemaVersion[] = [
    {
      version: '0.1.0',
      description: 'Первоначальная версия с базовой функциональностью',
      releaseDate: '2024-01-01',
      breaking: false,
      deprecated: true,
      supportUntil: '2025-12-31'
    },
    {
      version: '0.2.0',
      description: 'Добавлена поддержка мультиплатформенности',
      releaseDate: '2024-06-01',
      breaking: true,
      deprecated: true,
      supportUntil: '2025-12-31'
    },
    {
      version: '1.0.0',
      description: 'Стабильная версия с полной мультиплатформенной поддержкой',
      releaseDate: '2025-01-01',
      breaking: true
    }
  ];

  /**
   * Получить текущую версию схемы
   */
  static getCurrentVersion(): string {
    return SchemaVersioning.CURRENT_VERSION;
  }

  /**
   * Получить все поддерживаемые версии
   */
  static getSupportedVersions(): SchemaVersion[] {
    return [...SchemaVersioning.SUPPORTED_VERSIONS];
  }

  /**
   * Проверить, поддерживается ли версия
   */
  static isVersionSupported(version: string): boolean {
    return SchemaVersioning.SUPPORTED_VERSIONS.some(v => v.version === version);
  }

  /**
   * Проверить, является ли версия устаревшей
   */
  static isVersionDeprecated(version: string): boolean {
    const versionInfo = SchemaVersioning.SUPPORTED_VERSIONS.find(v => v.version === version);
    return versionInfo?.deprecated === true;
  }

  /**
   * Получить информацию о версии
   */
  static getVersionInfo(version: string): SchemaVersion | null {
    return SchemaVersioning.SUPPORTED_VERSIONS.find(v => v.version === version) || null;
  }

  /**
   * Определить версию схемы по её структуре
   */
  static detectSchemaVersion(schema: any): string {
    // Если версия указана явно
    if (schema.version) {
      return schema.version;
    }

    // Определяем версию по структуре данных
    if (schema.settings?.platforms && Array.isArray(schema.settings.platforms)) {
      // Версия 1.0.0 - есть мультиплатформенная поддержка
      return '1.0.0';
    }

    if (schema.useVisualEditor !== undefined) {
      // Версия 0.2.0 - есть поле useVisualEditor
      return '0.2.0';
    }

    if (schema.configuration?.nodes) {
      // Версия 0.1.0 - старый формат с configuration
      return '0.1.0';
    }

    // Неизвестная версия, считаем самой старой
    return '0.1.0';
  }

  /**
   * Проверить, нужна ли миграция
   */
  static needsMigration(schema: any): boolean {
    const currentVersion = SchemaVersioning.detectSchemaVersion(schema);
    return currentVersion !== SchemaVersioning.CURRENT_VERSION;
  }

  /**
   * Получить путь миграции от одной версии к другой
   */
  static getMigrationPath(fromVersion: string, toVersion: string = SchemaVersioning.CURRENT_VERSION): string[] {
    const versions = SchemaVersioning.SUPPORTED_VERSIONS.map(v => v.version).sort();
    const fromIndex = versions.indexOf(fromVersion);
    const toIndex = versions.indexOf(toVersion);

    if (fromIndex === -1 || toIndex === -1) {
      throw new Error(`Unsupported version in migration path: ${fromVersion} -> ${toVersion}`);
    }

    if (fromIndex >= toIndex) {
      return []; // Миграция не нужна или невозможна
    }

    return versions.slice(fromIndex + 1, toIndex + 1);
  }

  /**
   * Создать новую схему с текущей версией
   */
  static createNewSchema(baseData: Partial<BotSchema>): BotSchema {
    const now = new Date().toISOString();
    
    return {
      id: baseData.id || `schema_${Date.now()}`,
      name: baseData.name || 'Новая схема',
      nodes: baseData.nodes || [],
      edges: baseData.edges || [],
      variables: baseData.variables || {},
      settings: baseData.settings || {
        name: baseData.name || 'Новый бот',
        description: '',
        platforms: ['telegram'],
        mode: 'polling',
        variables: {}
      },
      version: SchemaVersioning.CURRENT_VERSION,
      createdAt: baseData.createdAt || now,
      updatedAt: now
    };
  }

  /**
   * Обновить версию схемы
   */
  static updateSchemaVersion(schema: BotSchema, newVersion: string = SchemaVersioning.CURRENT_VERSION): BotSchema {
    return {
      ...schema,
      version: newVersion,
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Сравнить версии (возвращает -1, 0, 1)
   */
  static compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    
    const maxLength = Math.max(v1Parts.length, v2Parts.length);
    
    for (let i = 0; i < maxLength; i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;
      
      if (v1Part < v2Part) return -1;
      if (v1Part > v2Part) return 1;
    }
    
    return 0;
  }

  /**
   * Проверить совместимость версий
   */
  static areVersionsCompatible(version1: string, version2: string): boolean {
    const v1Info = SchemaVersioning.getVersionInfo(version1);
    const v2Info = SchemaVersioning.getVersionInfo(version2);
    
    if (!v1Info || !v2Info) {
      return false;
    }

    // Если одна из версий breaking, то они несовместимы
    if (v1Info.breaking || v2Info.breaking) {
      return version1 === version2;
    }

    return true;
  }

  /**
   * Получить предупреждения о версии
   */
  static getVersionWarnings(version: string): string[] {
    const warnings: string[] = [];
    const versionInfo = SchemaVersioning.getVersionInfo(version);
    
    if (!versionInfo) {
      warnings.push(`Неизвестная версия схемы: ${version}`);
      return warnings;
    }

    if (versionInfo.deprecated) {
      warnings.push(`Версия ${version} устарела`);
      
      if (versionInfo.supportUntil) {
        warnings.push(`Поддержка прекратится: ${versionInfo.supportUntil}`);
      }
    }

    if (version !== SchemaVersioning.CURRENT_VERSION) {
      warnings.push(`Рекомендуется обновить до версии ${SchemaVersioning.CURRENT_VERSION}`);
    }

    return warnings;
  }
}