/**
 * Менеджер данных ботов
 * Обеспечивает загрузку, сохранение и миграцию данных ботов
 */

import { Bot } from '../core/types';
import { BotSchema } from '../core/schema/NodeTypes';
import { SchemaValidator } from '../core/validation/SchemaValidator';
import { SchemaVersioning } from '../core/versioning/SchemaVersioning';
import { DataMigrationSimple } from '../core/migration/DataMigrationSimple';
import * as fs from 'fs';
import * as path from 'path';

export interface BotDataResult {
  success: boolean;
  data?: any;
  errors: string[];
  warnings: string[];
  migrated?: boolean;
  migrationDetails?: any;
  backupPath?: string;
}

export interface BotSaveOptions {
  createBackup?: boolean;
  validateBeforeSave?: boolean;
  overwrite?: boolean;
}

export class BotDataManager {
  private validator: SchemaValidator;
  private backupDir: string;

  constructor(backupDir: string = './backups') {
    this.validator = new SchemaValidator();
    this.backupDir = backupDir;
    this.ensureBackupDirectory();
  }

  /**
   * Загрузка и валидация данных бота с автоматической миграцией
   */
  async loadBotData(rawData: any, options?: { skipMigration?: boolean }): Promise<BotDataResult> {
    const result: BotDataResult = {
      success: false,
      errors: [],
      warnings: [],
      migrated: false
    };

    try {
      console.log('Loading bot data...');
      
      if (!rawData) {
        result.errors.push('No data provided');
        return result;
      }

      let processedData = rawData;

      // Проверяем, нужна ли миграция
      if (!options?.skipMigration) {
        const currentVersion = SchemaVersioning.getCurrentVersion();
        const dataVersion = DataMigrationSimple.detectSchemaVersion(rawData);
        
        console.log(`Data version: ${dataVersion}, Current version: ${currentVersion}`);

        if (dataVersion !== currentVersion) {
          console.log('Bot data needs migration, starting migration process...');
          
          // Создаем бэкап перед миграцией
          const backupPath = await this.createBackup(rawData, `pre-migration-${dataVersion}-to-${currentVersion}`);
          result.backupPath = backupPath;
          
          const migrationResult = await DataMigrationSimple.migrateToCurrentVersion(rawData);
          result.migrationDetails = migrationResult;
          
          if (!migrationResult.success) {
            result.errors.push('Migration failed');
            result.errors.push(...migrationResult.errors);
            return result;
          }

          result.migrated = true;
          result.warnings.push(`Data was migrated from ${dataVersion} to ${currentVersion}`);
          result.warnings.push(...migrationResult.warnings);
          
          if (migrationResult.appliedMigrations.length > 0) {
            result.warnings.push(`Applied migrations: ${migrationResult.appliedMigrations.join(', ')}`);
          }
          
          processedData = migrationResult.migratedSchema;
          console.log('Migration completed successfully');
        }
      }

      // Валидируем данные
      console.log('Validating schema...');
      const validationResult = this.validator.validateSchema(processedData);
      
      if (!validationResult.isValid) {
        result.errors.push('Schema validation failed');
        result.errors.push(...validationResult.errors.map(err => err.message));
        
        // Если миграция была выполнена, но валидация не прошла, это серьезная проблема
        if (result.migrated) {
          result.errors.push('Migration completed but resulted in invalid schema');
        }
        
        return result;
      }

      result.warnings.push(...validationResult.warnings.map(warn => warn.message));
      result.data = processedData;
      result.success = true;

      console.log('Bot data loaded successfully');
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Unexpected error during load: ${errorMessage}`);
      console.error('Error loading bot data:', error);
      return result;
    }
  }

  /**
   * Сохранение данных бота с опциональным бэкапом
   */
  async saveBotData(
    bot: any, 
    filePath?: string, 
    options: BotSaveOptions = {}
  ): Promise<{ success: boolean; errors: string[]; backupPath?: string }> {
    const {
      createBackup = true,
      validateBeforeSave = true,
      overwrite = true
    } = options;

    try {
      console.log('Saving bot data...');

      // Валидируем перед сохранением
      if (validateBeforeSave) {
        const validationResult = this.validator.validateSchema(bot);
        
        if (!validationResult.isValid) {
          return {
            success: false,
            errors: ['Validation failed before save', ...validationResult.errors.map(err => err.message)]
          };
        }
      }

      let backupPath: string | undefined;

      // Создаем бэкап если файл существует
      if (createBackup && filePath && fs.existsSync(filePath)) {
        try {
          const existingData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          backupPath = await this.createBackup(existingData, `pre-save-${Date.now()}`);
        } catch (backupError) {
          console.warn('Failed to create backup:', backupError);
        }
      }

      // Сохраняем данные
      if (filePath) {
        if (!overwrite && fs.existsSync(filePath)) {
          return {
            success: false,
            errors: ['File already exists and overwrite is disabled']
          };
        }

        // Обеспечиваем существование директории
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        // Добавляем метаданные
        const dataToSave = {
          ...bot,
          metadata: {
            ...bot.metadata,
            savedAt: new Date().toISOString(),
            version: SchemaVersioning.getCurrentVersion()
          }
        };

        fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2), 'utf8');
        console.log(`Bot data saved to ${filePath}`);
      }
      
      return { 
        success: true, 
        errors: [],
        backupPath 
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        errors: [`Save error: ${errorMessage}`]
      };
    }
  }

  /**
   * Загрузка бота из файла
   */
  async loadBotFromFile(filePath: string): Promise<BotDataResult> {
    try {
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          errors: [`File not found: ${filePath}`],
          warnings: [],
          migrated: false
        };
      }

      const rawData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return await this.loadBotData(rawData);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        errors: [`Failed to load file: ${errorMessage}`],
        warnings: [],
        migrated: false
      };
    }
  }

  /**
   * Создание бэкапа данных
   */
  async createBackup(data: any, suffix: string = ''): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}${suffix ? '-' + suffix : ''}.json`;
    const backupPath = path.join(this.backupDir, filename);

    fs.writeFileSync(backupPath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Backup created: ${backupPath}`);
    
    return backupPath;
  }

  /**
   * Восстановление из бэкапа
   */
  async restoreFromBackup(backupPath: string): Promise<BotDataResult> {
    try {
      if (!fs.existsSync(backupPath)) {
        return {
          success: false,
          errors: [`Backup file not found: ${backupPath}`],
          warnings: [],
          migrated: false
        };
      }

      const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
      
      // Загружаем данные без миграции, так как это бэкап
      return await this.loadBotData(backupData, { skipMigration: true });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        errors: [`Failed to restore from backup: ${errorMessage}`],
        warnings: [],
        migrated: false
      };
    }
  }

  /**
   * Получение списка доступных бэкапов
   */
  getAvailableBackups(): string[] {
    try {
      if (!fs.existsSync(this.backupDir)) {
        return [];
      }

      return fs.readdirSync(this.backupDir)
        .filter(file => file.endsWith('.json') && file.startsWith('backup-'))
        .sort()
        .reverse(); // Новые сначала

    } catch (error) {
      console.error('Error reading backup directory:', error);
      return [];
    }
  }

  /**
   * Получение информации о миграции
   */
  getMigrationInfo(data: any): {
    currentVersion: string;
    dataVersion: string;
    needsMigration: boolean;
    availableMigrations: string[];
  } {
    const currentVersion = SchemaVersioning.getCurrentVersion();
    const dataVersion = DataMigrationSimple.detectSchemaVersion(data);
    const needsMigration = dataVersion !== currentVersion;
    const availableMigrations = needsMigration 
      ? DataMigrationSimple.getMigrationDescription(dataVersion, currentVersion)
      : [];

    return {
      currentVersion,
      dataVersion,
      needsMigration,
      availableMigrations
    };
  }

  /**
   * Проверка совместимости данных
   */
  checkCompatibility(data: any): {
    compatible: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      const migrationInfo = this.getMigrationInfo(data);
      
      if (migrationInfo.needsMigration) {
        issues.push(`Data version ${migrationInfo.dataVersion} is outdated`);
        recommendations.push('Run migration to update to current version');
      }

      const validationResult = this.validator.validateSchema(data);
      if (!validationResult.isValid) {
        issues.push(...validationResult.errors.map(err => err.message));
        recommendations.push('Fix validation errors before using');
      }

      return {
        compatible: issues.length === 0,
        issues,
        recommendations
      };

    } catch (error) {
      return {
        compatible: false,
        issues: [`Compatibility check failed: ${error}`],
        recommendations: ['Check data format and try again']
      };
    }
  }

  /**
   * Обеспечение существования директории бэкапов
   */
  private ensureBackupDirectory(): void {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Очистка старых бэкапов
   */
  async cleanupOldBackups(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    try {
      const backups = this.getAvailableBackups();
      let deletedCount = 0;
      const now = Date.now();

      for (const backup of backups) {
        const backupPath = path.join(this.backupDir, backup);
        const stats = fs.statSync(backupPath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(backupPath);
          deletedCount++;
        }
      }

      console.log(`Cleaned up ${deletedCount} old backups`);
      return deletedCount;

    } catch (error) {
      console.error('Error cleaning up backups:', error);
      return 0;
    }
  }
}