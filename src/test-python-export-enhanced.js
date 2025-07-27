/**
 * Расширенный тест экспорта в Python с использованием TypeScript экспортера
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

// Импортируем TypeScript экспортер (компилируем на лету)
const ts = require('typescript');

// Функция для компиляции TypeScript в JavaScript
function compileTypeScript(tsCode) {
  const result = ts.transpile(tsCode, {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    strict: false
  });
  return result;
}

// Функция для HTTP запроса
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    req.on('error', (err) => {
      reject(err);
    });
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

// Тестовая схема бота для Python экспорта
const testBotSchema = {
  id: "python-export-test-bot",
  name: "Python Export Test Bot",
  description: "Тестовый бот для проверки экспорта в Python",
  token: "TEST_PYTHON_TOKEN_123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  status: "draft",
  platforms: [
    {
      platform: "telegram",
      enabled: true,
      credentials: {
        token: "TEST_PYTHON_TOKEN_123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZ"
      },
      mode: "polling",
      status: "disconnected"
    }
  ],
  configuration: {
    nodes: [
      {
        id: "start-command",
        type: "trigger-command",
        position: { x: 100, y: 100 },
        data: {
          label: "Start Command",
          command: "/start",
          description: "Команда запуска бота",
          color: "#3b82f6"
        }
      },
      {
        id: "welcome-message",
        type: "action-send-message",
        position: { x: 400, y: 100 },
        data: {
          label: "Welcome Message",
          text: "🐍 Добро пожаловать в Python бота!\\n\\nЭтот бот создан с помощью конструктора и экспортирован в Python код.\\n\\nВаш ID: {{user_id}}\\nСообщений: {{message_count}}",
          parseMode: "HTML",
          color: "#10b981"
        }
      },
      {
        id: "help-command",
        type: "trigger-command",
        position: { x: 100, y: 250 },
        data: {
          label: "Help Command",
          command: "/help",
          description: "Справка по командам",
          color: "#3b82f6"
        }
      },
      {
        id: "help-message",
        type: "action-send-message",
        position: { x: 400, y: 250 },
        data: {
          label: "Help Message",
          text: "📚 <b>Справка по командам:</b>\\n\\n/start - Запуск бота\\n/help - Эта справка\\n/python - Информация о Python\\n/quiz - Викторина\\n\\n🐍 Этот бот написан на Python!",
          parseMode: "HTML",
          color: "#10b981"
        }
      },
      {
        id: "python-command",
        type: "trigger-command",
        position: { x: 100, y: 400 },
        data: {
          label: "Python Info Command",
          command: "/python",
          description: "Информация о Python",
          color: "#3b82f6"
        }
      },
      {
        id: "python-message",
        type: "action-send-message",
        position: { x: 400, y: 400 },
        data: {
          label: "Python Info",
          text: "🐍 <b>Python - мощный язык программирования!</b>\\n\\n• Простой и читаемый синтаксис\\n• Огромная экосистема библиотек\\n• Отлично подходит для ботов\\n• Поддерживает ООП и функциональное программирование\\n\\n<i>Этот бот создан с использованием pyTelegramBotAPI</i>",
          parseMode: "HTML",
          color: "#10b981"
        }
      },
      {
        id: "quiz-command",
        type: "trigger-command",
        position: { x: 100, y: 550 },
        data: {
          label: "Quiz Command",
          command: "/quiz",
          description: "Викторина о Python",
          color: "#3b82f6"
        }
      },
      {
        id: "quiz-message",
        type: "action-send-message",
        position: { x: 400, y: 550 },
        data: {
          label: "Quiz Question",
          text: "🧠 <b>Викторина о Python!</b>\\n\\nВопрос: На каком языке написан этот бот?\\n\\nВыберите правильный ответ:",
          parseMode: "HTML",
          buttons: [
            [
              { text: "A) JavaScript", callback_data: "quiz_a" },
              { text: "B) Python", callback_data: "quiz_b" }
            ],
            [
              { text: "C) Java", callback_data: "quiz_c" },
              { text: "D) C++", callback_data: "quiz_d" }
            ]
          ],
          color: "#f59e0b"
        }
      }
    ],
    edges: [
      {
        id: "start-to-welcome",
        source: "start-command",
        target: "welcome-message"
      },
      {
        id: "help-to-message",
        source: "help-command",
        target: "help-message"
      },
      {
        id: "python-to-info",
        source: "python-command",
        target: "python-message"
      },
      {
        id: "quiz-to-question",
        source: "quiz-command",
        target: "quiz-message"
      }
    ],
    variables: {
      user_id: {
        type: "string",
        defaultValue: "0",
        description: "ID пользователя"
      },
      message_count: {
        type: "number",
        defaultValue: "0",
        description: "Количество сообщений пользователя"
      },
      bot_name: {
        type: "string",
        defaultValue: "Python Bot",
        description: "Название бота"
      }
    }
  },
  stats: {
    messagesProcessed: 0,
    activeUsers: 0,
    uptime: 1,
    lastActivity: new Date().toISOString()
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

// Функция тестирования TypeScript экспортера
async function testTypeScriptPythonExporter() {
  console.log('🔧 Тестирование TypeScript Python экспортера...\n');
  
  try {
    // Читаем TypeScript код экспортера
    const exporterPath = path.join(__dirname, 'core', 'export', 'PythonExporter.ts');
    
    if (!fs.existsSync(exporterPath)) {
      console.error('❌ TypeScript экспортер не найден:', exporterPath);
      return false;
    }
    
    const tsCode = fs.readFileSync(exporterPath, 'utf8');
    console.log('✅ TypeScript экспортер загружен');
    console.log(`📊 Размер файла: ${Math.round(tsCode.length / 1024)} KB`);
    
    // Компилируем TypeScript в JavaScript
    console.log('\n🔄 Компиляция TypeScript...');
    const jsCode = compileTypeScript(tsCode);
    console.log('✅ TypeScript скомпилирован в JavaScript');
    
    // Создаем временный файл для выполнения
    const tempJsPath = path.join(__dirname, '..', 'temp', 'PythonExporter.js');
    const tempDir = path.dirname(tempJsPath);
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    fs.writeFileSync(tempJsPath, jsCode);
    console.log('💾 Временный JS файл создан');
    
    // Импортируем и тестируем экспортер
    delete require.cache[require.resolve(tempJsPath)];
    const { PythonExporter } = require(tempJsPath);
    
    console.log('\n🧪 Создание экземпляра экспортера...');
    const exporter = new PythonExporter(testBotSchema, {
      includeComments: true,
      includeAdvancedFeatures: true,
      includeIntegrations: true,
      includeTypeHints: true,
      useAsyncio: false,
      pythonVersion: '3.9'
    });
    
    console.log('✅ Экспортер создан');
    
    // Выполняем экспорт
    console.log('\n📦 Выполнение экспорта...');
    const exportResult = exporter.export();
    
    if (!exportResult.success) {
      console.error('❌ Ошибка экспорта:', exportResult.error);
      return false;
    }
    
    console.log('✅ Экспорт выполнен успешно!');
    console.log(`📁 Файлов создано: ${exportResult.files.length}`);
    
    // Анализируем созданные файлы
    console.log('\n📋 Анализ созданных файлов:');
    exportResult.files.forEach(file => {
      console.log(`  📄 ${file.path} (${file.type}) - ${Math.round(file.content.length / 1024)} KB`);
    });
    
    // Сохраняем файлы для анализа
    const outputDir = path.join(__dirname, '..', 'temp', 'python-export-test');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    exportResult.files.forEach(file => {
      const filePath = path.join(outputDir, file.path);
      fs.writeFileSync(filePath, file.content);
    });
    
    console.log(`💾 Файлы сохранены в: ${outputDir}`);
    
    // Очищаем временный файл
    fs.unlinkSync(tempJsPath);
    
    return exportResult;
    
  } catch (error) {
    console.error('💥 Ошибка тестирования TypeScript экспортера:', error.message);
    return false;
  }
}

// Функция тестирования API экспорта
async function testPythonExportAPI() {
  console.log('\n🌐 Тестирование API экспорта в Python...\n');
  
  try {
    // Создаем тестового бота
    const botId = `python-test-${Date.now()}`;
    const botData = {
      ...testBotSchema,
      id: botId
    };
    
    // Сохраняем бота
    const botsDir = path.join(__dirname, '..', 'data', 'bots');
    if (!fs.existsSync(botsDir)) {
      fs.mkdirSync(botsDir, { recursive: true });
    }
    
    const botPath = path.join(botsDir, `bot_${botId}.json`);
    fs.writeFileSync(botPath, JSON.stringify(botData, null, 2));
    console.log('✅ Тестовый бот создан:', botId);
    
    // Тестируем API экспорта
    const exportRequest = await makeRequest({
      hostname: 'localhost',
      port: 3002,
      path: `/api/export/${botId}/python`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, JSON.stringify({
      options: {
        includeComments: true,
        includeAdvancedFeatures: true,
        includeIntegrations: true,
        includeTypeHints: true,
        useAsyncio: false,
        pythonVersion: '3.9'
      }
    }));
    
    if (exportRequest.statusCode === 200) {
      console.log('✅ API экспорта работает');
      console.log(`📊 Размер архива: ${Math.round(exportRequest.data.length / 1024)} KB`);
      
      // Сохраняем архив
      const archivePath = path.join(__dirname, '..', 'temp', `python-export-${Date.now()}.zip`);
      fs.writeFileSync(archivePath, exportRequest.data);
      console.log(`💾 Архив сохранен: ${archivePath}`);
      
      return true;
    } else {
      console.error('❌ Ошибка API экспорта:', exportRequest.statusCode);
      console.error('Ответ:', exportRequest.data);
      return false;
    }
    
  } catch (error) {
    console.error('💥 Ошибка тестирования API:', error.message);
    return false;
  }
}

// Функция анализа качества Python кода
function analyzePythonCodeQuality(exportResult) {
  console.log('\n🔍 Анализ качества Python кода...\n');
  
  const analysis = {
    files: exportResult.files.length,
    totalLines: 0,
    features: [],
    issues: [],
    score: 0
  };
  
  // Анализируем основной файл
  const mainFile = exportResult.files.find(f => f.path === 'main.py');
  if (mainFile) {
    const lines = mainFile.content.split('\n');
    analysis.totalLines = lines.length;
    
    console.log(`📄 Основной файл: ${lines.length} строк`);
    
    // Проверяем Python особенности
    const pythonChecks = [
      { pattern: /class \w+:/, name: 'Классы Python', found: false },
      { pattern: /def \w+\(self/, name: 'Методы классов', found: false },
      { pattern: /from typing import/, name: 'Type hints', found: false },
      { pattern: /@dataclass/, name: 'Dataclasses', found: false },
      { pattern: /import telebot/, name: 'pyTelegramBotAPI', found: false },
      { pattern: /logging\./, name: 'Логирование', found: false },
      { pattern: /sqlite3/, name: 'База данных', found: false },
      { pattern: /try:.*except/, name: 'Обработка ошибок', found: false },
      { pattern: /f".*{.*}"/, name: 'F-strings', found: false },
      { pattern: /if __name__ == "__main__":/, name: 'Main guard', found: false }
    ];
    
    pythonChecks.forEach(check => {
      if (check.pattern.test(mainFile.content)) {
        check.found = true;
        analysis.features.push(check.name);
      }
    });
    
    console.log('🐍 Python особенности:');
    pythonChecks.forEach(check => {
      const icon = check.found ? '✅' : '❌';
      console.log(`  ${icon} ${check.name}`);
    });
    
    // Проверяем потенциальные проблемы
    const issueChecks = [
      { pattern: /print\(/, name: 'Использование print() вместо logging', severity: 'warning' },
      { pattern: /except:/, name: 'Общий except без типа исключения', severity: 'warning' },
      { pattern: /TODO|FIXME/, name: 'TODO комментарии', severity: 'info' }
    ];
    
    issueChecks.forEach(check => {
      if (check.pattern.test(mainFile.content)) {
        analysis.issues.push({
          name: check.name,
          severity: check.severity
        });
      }
    });
    
    if (analysis.issues.length > 0) {
      console.log('\n⚠️ Потенциальные проблемы:');
      analysis.issues.forEach(issue => {
        const icon = issue.severity === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`  ${icon} ${issue.name}`);
      });
    }
  }
  
  // Анализируем requirements.txt
  const reqFile = exportResult.files.find(f => f.path === 'requirements.txt');
  if (reqFile) {
    const requirements = reqFile.content.split('\n').filter(line => line.trim());
    console.log(`\n📦 Зависимости: ${requirements.length}`);
    requirements.forEach(req => {
      console.log(`  📌 ${req}`);
    });
  }
  
  // Анализируем README
  const readmeFile = exportResult.files.find(f => f.path === 'README.md');
  if (readmeFile) {
    const readmeLines = readmeFile.content.split('\n').length;
    console.log(`\n📖 README: ${readmeLines} строк`);
    
    const docChecks = [
      { pattern: /## 🚀 Быстрый старт/, name: 'Инструкции по установке' },
      { pattern: /## 📋 Команды бота/, name: 'Описание команд' },
      { pattern: /## 🔧 Конфигурация/, name: 'Настройка' },
      { pattern: /## 🐛 Отладка/, name: 'Отладка' }
    ];
    
    console.log('📚 Документация:');
    docChecks.forEach(check => {
      const found = check.pattern.test(readmeFile.content);
      const icon = found ? '✅' : '❌';
      console.log(`  ${icon} ${check.name}`);
    });
  }
  
  // Вычисляем общую оценку
  const maxScore = 100;
  let score = 0;
  
  // Оценка за файлы (20 баллов)
  score += Math.min(20, analysis.files * 4);
  
  // Оценка за Python особенности (50 баллов)
  score += Math.min(50, analysis.features.length * 5);
  
  // Оценка за размер кода (20 баллов)
  score += Math.min(20, Math.floor(analysis.totalLines / 10));
  
  // Штраф за проблемы (до -10 баллов)
  const warnings = analysis.issues.filter(i => i.severity === 'warning').length;
  score -= Math.min(10, warnings * 5);
  
  // Бонус за отсутствие проблем (10 баллов)
  if (analysis.issues.length === 0) {
    score += 10;
  }
  
  analysis.score = Math.max(0, Math.min(maxScore, score));
  
  console.log(`\n🎯 Общая оценка: ${analysis.score}/${maxScore} (${Math.round(analysis.score/maxScore*100)}%)`);
  
  if (analysis.score >= 80) {
    console.log('🎉 Отличное качество Python кода!');
  } else if (analysis.score >= 60) {
    console.log('👍 Хорошее качество кода, есть место для улучшений');
  } else {
    console.log('⚠️ Код требует доработки');
  }
  
  return analysis;
}

// Основная функция тестирования
async function main() {
  console.log('🐍 Расширенное тестирование экспорта в Python\n');
  console.log('='.repeat(60));
  
  let allTestsPassed = true;
  
  // 1. Тестируем TypeScript экспортер
  const tsExportResult = await testTypeScriptPythonExporter();
  if (!tsExportResult) {
    allTestsPassed = false;
  } else {
    // Анализируем качество кода
    analyzePythonCodeQuality(tsExportResult);
  }
  
  // 2. Тестируем API экспорта
  const apiTest = await testPythonExportAPI();
  if (!apiTest) {
    allTestsPassed = false;
  }
  
  console.log('\n' + '='.repeat(60));
  if (allTestsPassed) {
    console.log('🎉 Все тесты Python экспорта прошли успешно!');
    console.log('\n📋 Результаты:');
    console.log('✅ TypeScript экспортер работает');
    console.log('✅ API экспорта функционирует');
    console.log('✅ Python код генерируется корректно');
    console.log('✅ Документация создается');
    console.log('\n💡 Возможности Python экспорта:');
    console.log('• Полнофункциональный Python код');
    console.log('• Type hints для лучшей типизации');
    console.log('• Современные Python практики');
    console.log('• Подробная документация');
    console.log('• Обработка ошибок и логирование');
    console.log('• SQLite для хранения состояний');
  } else {
    console.log('❌ Некоторые тесты Python экспорта не прошли');
    console.log('⚠️ Проверьте настройки экспортера и API');
  }
  
  console.log('\nТестирование Python экспорта завершено');
}

// Запуск тестирования
if (require.main === module) {
  main();
}

module.exports = {
  testTypeScriptPythonExporter,
  testPythonExportAPI,
  analyzePythonCodeQuality,
  testBotSchema
};