/**
 * Проверка содержимого экспортированного архива
 */

const fs = require('fs');
const path = require('path');
const yauzl = require('yauzl');

// Функция для извлечения и проверки архива
function extractAndCheckArchive(archivePath) {
  return new Promise((resolve, reject) => {
    console.log(`📦 Проверяем архив: ${archivePath}`);
    
    if (!fs.existsSync(archivePath)) {
      reject(new Error('Архив не найден'));
      return;
    }
    
    const extractedFiles = {};
    
    yauzl.open(archivePath, { lazyEntries: true }, (err, zipfile) => {
      if (err) {
        reject(err);
        return;
      }
      
      zipfile.readEntry();
      
      zipfile.on('entry', (entry) => {
        if (/\/$/.test(entry.fileName)) {
          // Это директория
          zipfile.readEntry();
        } else {
          // Это файл
          zipfile.openReadStream(entry, (err, readStream) => {
            if (err) {
              reject(err);
              return;
            }
            
            let content = '';
            readStream.on('data', (chunk) => {
              content += chunk.toString();
            });
            
            readStream.on('end', () => {
              extractedFiles[entry.fileName] = content;
              zipfile.readEntry();
            });
          });
        }
      });
      
      zipfile.on('end', () => {
        resolve(extractedFiles);
      });
      
      zipfile.on('error', (err) => {
        reject(err);
      });
    });
  });
}

// Функция для анализа содержимого
function analyzeExtractedFiles(files) {
  console.log('\n📋 Анализ содержимого архива:');
  console.log('─'.repeat(50));
  
  const fileTypes = {
    'index.js': 'Основной файл бота',
    'package.json': 'Конфигурация npm',
    'README.md': 'Документация',
    '.env.example': 'Пример переменных окружения',
    'config.json': 'Конфигурация бота'
  };
  
  // Проверяем наличие всех необходимых файлов
  Object.entries(fileTypes).forEach(([fileName, description]) => {
    if (files[fileName]) {
      console.log(`✅ ${fileName} - ${description} (${files[fileName].length} символов)`);
    } else {
      console.log(`❌ ${fileName} - ОТСУТСТВУЕТ`);
    }
  });
  
  // Анализируем основной файл
  if (files['index.js']) {
    console.log('\n🔍 Анализ основного файла (index.js):');
    const mainFile = files['index.js'];
    
    const checks = [
      { pattern: /const TelegramBot = require\('node-telegram-bot-api'\)/, name: 'Импорт TelegramBot' },
      { pattern: /bot\.onText\(/, name: 'Обработчики команд' },
      { pattern: /updateUserState/, name: 'Управление состоянием' },
      { pattern: /replaceVariables/, name: 'Замена переменных' },
      { pattern: /console\.log/, name: 'Логирование' },
      { pattern: /process\.on\('SIGINT'/, name: 'Graceful shutdown' }
    ];
    
    checks.forEach(check => {
      if (check.pattern.test(mainFile)) {
        console.log(`  ✅ ${check.name}`);
      } else {
        console.log(`  ❌ ${check.name} - НЕ НАЙДЕНО`);
      }
    });
  }
  
  // Анализируем package.json
  if (files['package.json']) {
    console.log('\n📦 Анализ package.json:');
    try {
      const packageData = JSON.parse(files['package.json']);
      
      console.log(`  📝 Название: ${packageData.name}`);
      console.log(`  🔢 Версия: ${packageData.version}`);
      console.log(`  📄 Описание: ${packageData.description}`);
      
      if (packageData.dependencies) {
        console.log('  📚 Зависимости:');
        Object.entries(packageData.dependencies).forEach(([dep, version]) => {
          console.log(`    - ${dep}: ${version}`);
        });
      }
      
      if (packageData.scripts) {
        console.log('  🚀 Скрипты:');
        Object.entries(packageData.scripts).forEach(([script, command]) => {
          console.log(`    - ${script}: ${command}`);
        });
      }
      
    } catch (error) {
      console.log('  ❌ Ошибка парсинга package.json:', error.message);
    }
  }
  
  // Анализируем README.md
  if (files['README.md']) {
    console.log('\n📖 Анализ README.md:');
    const readme = files['README.md'];
    
    const readmeChecks = [
      { pattern: /# .+/, name: 'Заголовок' },
      { pattern: /## 🚀 Быстрый старт/, name: 'Раздел быстрого старта' },
      { pattern: /npm install/, name: 'Инструкции по установке' },
      { pattern: /## 📋 Команды бота/, name: 'Список команд' },
      { pattern: /TELEGRAM_BOT_TOKEN/, name: 'Информация о токене' }
    ];
    
    readmeChecks.forEach(check => {
      if (check.pattern.test(readme)) {
        console.log(`  ✅ ${check.name}`);
      } else {
        console.log(`  ❌ ${check.name} - НЕ НАЙДЕНО`);
      }
    });
  }
  
  console.log('\n' + '─'.repeat(50));
}

// Основная функция тестирования
async function testArchiveContent() {
  console.log('🧪 Тестирование содержимого экспортированного архива\n');
  
  try {
    // Ищем последний созданный архив
    const tempDir = path.join(__dirname, '..', 'temp');
    
    if (!fs.existsSync(tempDir)) {
      console.error('❌ Директория temp не найдена');
      return;
    }
    
    const files = fs.readdirSync(tempDir)
      .filter(file => file.startsWith('exported-') && file.endsWith('.zip'))
      .map(file => ({
        name: file,
        path: path.join(tempDir, file),
        mtime: fs.statSync(path.join(tempDir, file)).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime);
    
    if (files.length === 0) {
      console.error('❌ Экспортированные архивы не найдены');
      console.log('💡 Сначала запустите: node src/test-nodejs-export-api.js');
      return;
    }
    
    const latestArchive = files[0];
    console.log(`📁 Найден архив: ${latestArchive.name}`);
    console.log(`📅 Создан: ${latestArchive.mtime.toLocaleString('ru-RU')}`);
    
    // Извлекаем и анализируем содержимое
    const extractedFiles = await extractAndCheckArchive(latestArchive.path);
    
    console.log(`\n✅ Архив успешно извлечен! Найдено файлов: ${Object.keys(extractedFiles).length}`);
    
    // Анализируем содержимое
    analyzeExtractedFiles(extractedFiles);
    
    // Показываем превью основного файла
    if (extractedFiles['index.js']) {
      console.log('\n📄 Превью основного файла (первые 20 строк):');
      console.log('─'.repeat(60));
      const lines = extractedFiles['index.js'].split('\n').slice(0, 20);
      lines.forEach((line, index) => {
        console.log(`${String(index + 1).padStart(2, ' ')}: ${line}`);
      });
      console.log('─'.repeat(60));
    }
    
    console.log('\n🎉 Анализ архива завершен успешно!');
    
  } catch (error) {
    console.error('💥 Ошибка анализа архива:', error.message);
  }
}

// Запуск тестирования
if (require.main === module) {
  testArchiveContent();
}

module.exports = {
  extractAndCheckArchive,
  analyzeExtractedFiles,
  testArchiveContent
};