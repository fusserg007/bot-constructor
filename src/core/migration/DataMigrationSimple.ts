/**
 * Упрощенная система миграции данных
 * Обеспечивает автоматическое обновление схем ботов между версиями
 */

import { SchemaVersioning } from '../versioning/SchemaVersioning';

export interface MigrationResult {
  success: boolean;
  migratedSchema?: any;
  errors: string[];
  warnings: string[];
  appliedMigrations: string[];
  backupData?: any;
}

export class DataMigrationSimple {
  /**
   * Выполнить миграцию схемы до текущей версии
   */
  static async migrateToCurrentVersion(schema: any): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      errors: [],
      warnings: [],
      appliedMigrations: [],
      backupData: JSON.parse(JSON.stringify(schema)) // Глубокая копия для бэкапа
    };

    if (!schema) {
      result.errors.push('Schema is null or undefined');
      return result;
    }

    let currentSchema = JSON.parse(JSON.stringify(schema)); // Глубокая копия
    const currentVersion = SchemaVersioning.getCurrentVersion();
    const schemaVersion = this.detectSchemaVersion(schema);

    console.log(`Starting migration from ${schemaVersion} to ${currentVersion}`);

    // Если схема уже актуальной версии
    if (schemaVersion === currentVersion) {
      result.success = true;
      result.migratedSchema = currentSchema;
      result.warnings.push('Schema is already at the current version');
      return result;
    }

    try {
      // Применяем миграции последовательно
      if (schemaVersion === '0.1.0') {
        currentSchema = this.migrate_0_1_0_to_0_2_0(currentSchema);
        result.appliedMigrations.push('0.1.0 -> 0.2.0');
      }

      if (schemaVersion === '0.1.0' || schemaVersion === '0.2.0') {
        currentSchema = this.migrate_0_2_0_to_1_0_0(currentSchema);
        result.appliedMigrations.push('0.2.0 -> 1.0.0');
      }

      result.success = true;
      result.migratedSchema = currentSchema;
      
      console.log(`Migration completed successfully. Applied ${result.appliedMigrations.length} migrations.`);
      
    } catch (error) {
      result.errors.push(`Migration process failed: ${error}`);
      console.error('Migration process failed:', error);
    }

    return result;
  }

  /**
   * Определить версию схемы
   */
  static detectSchemaVersion(schema: any): string {
    if (!schema) return '0.1.0';
    
    // Проверяем явно указанную версию
    if (schema.version) return schema.version;
    if (schema.settings?.version) return schema.settings.version;
    
    // Определяем версию по структуре
    if (schema.settings && schema.settings.platforms) {
      return '1.0.0'; // Формат с settings
    }
    
    if (schema.nodes && schema.edges) {
      return '0.2.0'; // Базовые узлы с edges
    }
    
    return '0.1.0'; // Самый старый формат
  }

  /**
   * Миграция с 0.1.0 на 0.2.0
   */
  static migrate_0_1_0_to_0_2_0(schema: any): any {
    return {
      ...schema,
      version: '0.2.0',
      nodes: schema.nodes || [],
      edges: schema.edges || [],
      variables: schema.variables || {},
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Миграция с 0.2.0 на 1.0.0
   */
  static migrate_0_2_0_to_1_0_0(schema: any): any {
    return {
      version: '1.0.0',
      settings: {
        name: schema.name || 'Untitled Bot',
        description: schema.description || '',
        platforms: schema.platforms || ['telegram'],
        mode: 'polling',
        timeout: 30,
        ...schema.settings
      },
      nodes: schema.nodes || [],
      edges: schema.edges || [],
      variables: schema.variables || {},
      metadata: {
        createdAt: schema.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...schema.metadata
      }
    };
  }

  /**
   * Проверить, возможна ли миграция
   */
  static canMigrate(fromVersion: string, toVersion: string): boolean {
    const supportedMigrations = [
      '0.1.0 -> 0.2.0',
      '0.2.0 -> 1.0.0',
      '0.1.0 -> 1.0.0'
    ];
    
    return supportedMigrations.includes(`${fromVersion} -> ${toVersion}`);
  }

  /**
   * Получить описание миграции
   */
  static getMigrationDescription(fromVersion: string, toVersion: string): string[] {
    const descriptions: Record<string, string> = {
      '0.1.0 -> 0.2.0': 'Add basic node structure and edge connections',
      '0.2.0 -> 1.0.0': 'Migrate to stable v1.0.0 format with enhanced settings',
      '0.1.0 -> 1.0.0': 'Full migration from legacy format to stable version'
    };
    
    const key = `${fromVersion} -> ${toVersion}`;
    return descriptions[key] ? [descriptions[key]] : [];
  }
}