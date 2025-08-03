# Design Document

## Overview

Создание системы управления архитектурой редакторов для предотвращения путаницы между старым Canvas-based редактором и новым React-based редактором.

## Architecture

### Компоненты системы

1. **Editor Detection System** - автоматическое определение активного редактора
2. **File Mapping Registry** - реестр файлов по редакторам  
3. **Editor Switch Manager** - управление переключением редакторов
4. **Kiro Integration Layer** - интеграция с AI помощником

## Components and Interfaces

### 1. Editor Configuration File

```json
{
  "activeEditor": "legacy|react",
  "editors": {
    "legacy": {
      "name": "Canvas-based Editor",
      "status": "active|deprecated|disabled",
      "files": {
        "styles": ["public/styles.css"],
        "scripts": ["public/js/*.js", "public/app.js"],
        "templates": ["public/index.html"],
        "components": ["public/js/NodeLibrary.js", "public/js/VisualEditor.js"]
      },
      "entryPoint": "public/index.html",
      "buildCommand": null
    },
    "react": {
      "name": "React-based Editor", 
      "status": "development|active|disabled",
      "files": {
        "styles": ["frontend/src/**/*.css", "frontend/src/**/*.module.css"],
        "scripts": ["frontend/src/**/*.ts", "frontend/src/**/*.tsx"],
        "templates": ["frontend/index.html"],
        "components": ["frontend/src/components/**/*"]
      },
      "entryPoint": "public/dist/index.html",
      "buildCommand": "cd frontend && npm run build"
    }
  }
}
```

### 2. Editor Detection API

```javascript
class EditorDetector {
  static detectActiveEditor() {
    // Проверяет какой редактор активен
    // Возвращает 'legacy' или 'react'
  }
  
  static getEditorFiles(editorType) {
    // Возвращает список файлов для редактора
  }
  
  static validateFileForEditor(filePath, editorType) {
    // Проверяет, относится ли файл к редактору
  }
}
```

### 3. Kiro Integration

```javascript
class KiroEditorHelper {
  static checkBeforeEdit(filePath) {
    const activeEditor = EditorDetector.detectActiveEditor();
    const isValidFile = EditorDetector.validateFileForEditor(filePath, activeEditor);
    
    if (!isValidFile) {
      throw new Error(`File ${filePath} belongs to inactive editor. Active: ${activeEditor}`);
    }
  }
  
  static getCorrectFilesForTask(taskType) {
    // Возвращает правильные файлы для задачи
  }
}
```

## Data Models

### Editor Config Schema

```typescript
interface EditorConfig {
  activeEditor: 'legacy' | 'react';
  editors: {
    [key: string]: {
      name: string;
      status: 'active' | 'deprecated' | 'disabled' | 'development';
      files: {
        styles: string[];
        scripts: string[];
        templates: string[];
        components: string[];
      };
      entryPoint: string;
      buildCommand: string | null;
    }
  };
}
```

## Error Handling

1. **Wrong Editor File Edit** - предупреждение при попытке изменить файл неактивного редактора
2. **Missing Editor Config** - создание конфига по умолчанию
3. **Build Failures** - откат к предыдущему состоянию
4. **File Not Found** - проверка существования файлов

## Testing Strategy

1. **Unit Tests** - тестирование детекции редактора
2. **Integration Tests** - тестирование переключения редакторов  
3. **E2E Tests** - тестирование полного цикла работы
4. **Kiro Integration Tests** - тестирование работы с AI помощником