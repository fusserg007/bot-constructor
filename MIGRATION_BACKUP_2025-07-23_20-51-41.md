# Резервная копия перед миграцией на React + TypeScript

Дата создания: 2025-07-23 20:51:41

## Файлы, которые будут удалены:

### Устаревшие JS файлы визуального редактора:
- public/js/TemplatePanel.js
- public/js/TemplateWizard.js  
- public/js/TemplateSystem.js
- public/js/ModulePanel.js
- public/js/ModuleSystem.js
- public/js/ConnectionTypesPanel.js
- public/js/ConnectionManager.js
- public/js/ConnectionTypes.js
- public/js/SuggestionsPanel.js
- public/js/SmartSuggestions.js
- public/js/ComplexityLevelSwitcher.js

### Экспериментальные файлы:
- public/app-new.js
- public/js/app-simple.js
- public/js/SimpleVisualEditor.js

### Устаревшие API роуты:
- routes/bots-no-auth.js
- routes/bots-simple.js

## Причина удаления:
Подготовка к миграции на современный стек:
- TypeScript + React + Vite
- CSS Modules
- React Flow для визуального редактора
- Jest + React Testing Library

## Статус:
Файлы будут удалены после создания этой резервной копии.
Backend остается без изменений для минимизации рисков.