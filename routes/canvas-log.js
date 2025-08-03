const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const router = express.Router();

// Путь к файлу лога
const LOG_FILE_PATH = path.join(__dirname, '..', 'logs', 'canvas-debug.log');
const LOG_DIR = path.dirname(LOG_FILE_PATH);

// Убеждаемся, что папка logs существует
async function ensureLogDir() {
  try {
    await fs.access(LOG_DIR);
  } catch (error) {
    await fs.mkdir(LOG_DIR, { recursive: true });
  }
}

// Инициализация - очищаем лог при запуске сервера
async function initializeLog() {
  try {
    await ensureLogDir();
    await fs.writeFile(LOG_FILE_PATH, '');
    console.log('Canvas debug log initialized:', LOG_FILE_PATH);
  } catch (error) {
    console.error('Failed to initialize canvas log:', error);
  }
}

// Инициализируем при загрузке модуля
initializeLog();

// POST /api/canvas-log - добавить запись в лог
router.post('/', async (req, res) => {
  try {
    const { logLine } = req.body;
    
    if (!logLine) {
      return res.status(400).json({ error: 'logLine is required' });
    }

    await ensureLogDir();
    
    // Добавляем запись в файл
    await fs.appendFile(LOG_FILE_PATH, logLine + '\n');
    
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to write canvas log:', error);
    res.status(500).json({ error: 'Failed to write log' });
  }
});

// POST /api/canvas-log/clear - очистить лог
router.post('/clear', async (req, res) => {
  try {
    await ensureLogDir();
    await fs.writeFile(LOG_FILE_PATH, '');
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to clear canvas log:', error);
    res.status(500).json({ error: 'Failed to clear log' });
  }
});

// GET /api/canvas-log - получить содержимое лога
router.get('/', async (req, res) => {
  try {
    const { lines } = req.query;
    const maxLines = parseInt(lines) || 100;
    
    await ensureLogDir();
    
    try {
      const content = await fs.readFile(LOG_FILE_PATH, 'utf8');
      const allLines = content.split('\n').filter(line => line.trim());
      const recentLines = allLines.slice(-maxLines);
      
      res.json({ 
        lines: recentLines,
        totalLines: allLines.length,
        filePath: LOG_FILE_PATH
      });
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Файл не существует - возвращаем пустой результат
        res.json({ 
          lines: [],
          totalLines: 0,
          filePath: LOG_FILE_PATH
        });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Failed to read canvas log:', error);
    res.status(500).json({ error: 'Failed to read log' });
  }
});

module.exports = router;