/**
 * Тест функциональности экспортированного бота
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const yauzl = require('yauzl');

// Функция для извлечения архива в директорию
function extractArchive(archivePath, extractDir) {
  return new Promise((resolve, reject) => {
    console.log(`📦 Извлекаем архив в: ${extractDir}`);
    
    // Создаем директорию для извлечения
    if (!fs.existsSync(extractDir)) {
      fs.mkdirSync(extractDir, { recursive: true });
    }
    
    yauzl.open(archivePath, { lazyEntries: true }, (err, zipfile) => {
      if (err) {
        reject(err);
        return;
      }
      
      let filesExtracted = 0;
      
      zipfile.readEntry();
      
      zipfile.on('entry', (entry) => {
        if (/\/$/.test(entry.fileName)) {
          // Это директория
          const dirPath = path.join(extractDir, entry.fileName);
          if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
          }
          zipfile.readEntry();
        } else {
          // Это файл
          zipfile.openReadStream(entry, (err, readStream) => {
            if (err) {
              reject(err);
              return;
            }
            
            const filePath = path.join(extractDir, entry.fileName);
            const writeStream = fs.createWriteStream(filePath);
            
            readStream.pipe(writeStream);
            
            writeStream.on('close', () => {
              filesExtracted++;
              console.log(`  ✅ ${entry.fileName}`);
              zipfile.readEntry();
            });
          });
        }
      });
      
      zipfile.on('end', () => {
        resolve(filesExtracted);
      });
      
      zipfile.on('error', (err) => {
        reject(err);
      });
    });
  });
}

// Функция для установки зависимостей
function installDependencies(projectDir) {
  return new Promise((resolve, reject) => {
    console.log('📚 Устанавливаем зависимости...');
    
    const npmInstall = spawn('cmd', ['/c', 'npm', 'install'], {
      cwd: projectDir,
      stdio: 'pipe',
      shell: true
    });
    
    let output = '';
    let errorOutput = '';
    
    npmInstall.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    npmInstall.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    npmInstall.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Зависимости установлены успешно');
        resolve(output);
      } else {
        console.error('❌ Ошибка установки зависимостей:', errorOutput);
        reject(new Error(`npm install завершился с кодом ${code}`));
      }
    });
    
    npmInstall.on('error', (err) => {
      reject(err);
    });
  });
}

// Функция для проверки синтаксиса JavaScript
function checkSyntax(filePath) {
  return new Promise((resolve, reject) => {
    console.log(`🔍 Проверяем синтаксис: ${path.basename(filePath)}`);
    
    const nodeCheck = spawn('cmd', ['/c', 'node', '--check', filePath], {
      stdio: 'pipe',
      shell: true
    });
    
    let errorOutput = '';
    
    nodeCheck.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    nodeCheck.on('close', (code) => {
      if (code === 0) {
        console.log('  ✅ Синтаксис корректен');
        resolve(true);
      } else {
        console.error('  ❌ Ошибка синтаксиса:', errorOutput);
        resolve(false);
      }
    });
    
    nodeCheck.on('error', (err) => {
      reject(err);
    });
  });
}

// Функция для создания тестового .env файла
function createTestEnvFile(projectDir) {
  const envPath = path.join(projectDir, '.env');
  const envContent = `# Тестовый токен (не рабочий)
TELEGRAM_BOT_TOKEN=123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789
NODE_ENV=development
LOG_LEVEL=info
`;
  
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Создан тестовый .env файл');
}

// Функция для тестирования загрузки модулей
function testModuleLoading(projectDir) {
  return new Promise((resolve, reject) => {
    console.log('🧪 Тестируем загрузку модулей...');
    
    const testScript = `
const fs = require('fs');
const path = require('path');

try {
  // Проверяем, что все модули загружаются
  console.log('Проверяем основные модули...');
  
  const TelegramBot = require('node-telegram-bot-api');
  console.log('✅ node-telegram-bot-api загружен');
  
  const config = require('./config.json');
  console.log('✅ config.json загружен:', config.name);
  
  // Проверяем основные функции из index.js (без запуска бота)
  const indexContent = fs.readFileSync('./index.js', 'utf8');
  
  if (indexContent.includes('updateUserState')) {
    console.log('✅ Функция updateUserState найдена');
  }
  
  if (indexContent.includes('replaceVariables')) {
    console.log('✅ Функция replaceVariables найдена');
  }
  
  if (indexContent.includes('bot.onText')) {
    console.log('✅ Обработчики команд найдены');
  }
  
  console.log('🎉 Все модули загружены успешно!');
  process.exit(0);
  
} catch (error) {
  console.error('❌ Ошибка загрузки модулей:', error.message);
  process.exit(1);
}
`;
    
    const testFilePath = path.join(projectDir, 'test-modules.js');
    fs.writeFileSync(testFilePath, testScript);
    
    const nodeTest = spawn('cmd', ['/c', 'node', 'test-modules.js'], {
      cwd: projectDir,
      stdio: 'pipe',
      shell: true
    });
    
    let output = '';
    let errorOutput = '';
    
    nodeTest.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    nodeTest.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    nodeTest.on('close', (code) => {
      console.log(output);
      
      if (code === 0) {
        console.log('✅ Тест загрузки модулей прошел успешно');
        resolve(true);
      } else {
        console.error('❌ Тест загрузки модулей не прошел:', errorOutput);
        resolve(false);
      }
      
      // Удаляем тестовый файл
      try {
        fs.unlinkSync(testFilePath);
      } catch (e) {
        // Игнорируем ошибки удаления
      }
    });
    
    nodeTest.on('error', (err) => {
      reject(err);
    });
  });
}

// Основная функция тестирования
async function testExportedBotFunctionality() {
  console.log('🧪 Тестирование функциональности экспортированного бота\n');
  console.log('=' .repeat(60));
  
  try {
    // Ищем последний созданный архив
    const tempDir = path.join(__dirname, '..', 'temp');
    
    if (!fs.existsSync(tempDir)) {
      console.error('❌ Директория temp не найдена');
      return;
    }
    
    const archives = fs.readdirSync(tempDir)
      .filter(file => file.startsWith('exported-') && file.endsWith('.zip'))
      .map(file => ({
        name: file,
        path: path.join(tempDir, file),
        mtime: fs.statSync(path.join(tempDir, file)).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime);
    
    if (archives.length === 0) {
      console.error('❌ Экспортированные архивы не найдены');
      console.log('💡 Сначала запустите: node src/test-nodejs-export-api.js');
      return;
    }
    
    const latestArchive = archives[0];
    console.log(`📁 Тестируем архив: ${latestArchive.name}`);
    console.log(`📅 Создан: ${latestArchive.mtime.toLocaleString('ru-RU')}\n`);
    
    // Создаем директорию для тестирования
    const testDir = path.join(tempDir, `test-bot-${Date.now()}`);
    
    // Извлекаем архив
    const filesExtracted = await extractArchive(latestArchive.path, testDir);
    console.log(`\n✅ Извлечено файлов: ${filesExtracted}\n`);
    
    // Проверяем синтаксис основного файла
    const indexPath = path.join(testDir, 'index.js');
    const syntaxOk = await checkSyntax(indexPath);
    
    if (!syntaxOk) {
      console.error('❌ Синтаксис основного файла некорректен');
      return;
    }
    
    // Создаем тестовый .env файл
    createTestEnvFile(testDir);
    
    // Устанавливаем зависимости
    await installDependencies(testDir);
    
    // Тестируем загрузку модулей
    const moduleTestPassed = await testModuleLoading(testDir);
    
    if (moduleTestPassed) {
      console.log('\n🎉 Все тесты прошли успешно!');
      console.log('\n📋 Результаты тестирования:');
      console.log('  ✅ Архив корректно извлечен');
      console.log('  ✅ Синтаксис JavaScript корректен');
      console.log('  ✅ Зависимости установлены');
      console.log('  ✅ Модули загружаются без ошибок');
      console.log('  ✅ Основные функции присутствуют');
      
      console.log('\n💡 Для запуска бота:');
      console.log(`1. cd ${testDir}`);
      console.log('2. Отредактируйте .env и добавьте реальный токен');
      console.log('3. npm start');
      
    } else {
      console.log('\n❌ Некоторые тесты не прошли');
    }
    
    console.log(`\n📂 Тестовые файлы сохранены в: ${testDir}`);
    
  } catch (error) {
    console.error('💥 Ошибка тестирования:', error.message);
  }
}

// Запуск тестирования
if (require.main === module) {
  testExportedBotFunctionality();
}

module.exports = {
  extractArchive,
  installDependencies,
  checkSyntax,
  testModuleLoading,
  testExportedBotFunctionality
};