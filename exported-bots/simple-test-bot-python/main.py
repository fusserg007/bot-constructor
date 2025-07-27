#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Простой тестовый бот
Базовый бот для тестирования с командой /start

Сгенерировано автоматически из конструктора ботов
Дата: 26.07.2025, 20:08:03
"""

import os
import json
import logging
import time
from datetime import datetime
from typing import Dict, Any, Optional
from collections import defaultdict

import telebot
from telebot import types

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('bot.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Загружаем конфигурацию
with open('config.json', 'r', encoding='utf-8') as f:
    config = json.load(f)

# Создаем бота
bot_token = os.getenv('TELEGRAM_BOT_TOKEN')
if not bot_token:
    raise ValueError("TELEGRAM_BOT_TOKEN не установлен в переменных окружения")

bot = telebot.TeleBot(bot_token)

# Состояние пользователей
user_states: Dict[int, Dict[str, Any]] = defaultdict(lambda: {
    'message_count': 0,
    'last_activity': datetime.now(),
    'variables': {}
})

# Переменные бота
bot_variables = {
    'uptime': {
        'type': 'string',
        'defaultValue': '0 минут'
    },
    'message_count': {
        'type': 'number',
        'defaultValue': 0
    },
    'user_count': {
        'type': 'number',
        'defaultValue': 0
    },
    'last_update': {
        'type': 'string',
        'defaultValue': '26.07.2025, 19:16:45'
    }
}

# Время запуска бота
start_time = datetime.now()

# Обработчики команд

@bot.message_handler(commands=['start'])
def handle_start(message):
    """Обработчик команды /start"""
    chat_id = message.chat.id
    user_id = message.from_user.id
    
    logger.info(f"📨 Команда /start от пользователя {user_id}")
    
    try:
        # Обновляем состояние пользователя
        update_user_state(user_id)
        
        # Отправляем сообщение: Приветственное сообщение
        message_text = replace_variables("""👋 Привет! Я простой тестовый бот.

✅ Команда /start работает корректно!

📝 Доступные команды:
/start - показать это сообщение
/help - получить справку
/status - проверить статус бота""", user_id)
        bot.send_message(
            chat_id, 
            message_text, 
            parse_mode='HTML'
        )
        logger.info("✅ Отправлено сообщение")
        
    except Exception as e:
        logger.error(f"Ошибка обработки команды /start: {e}")
        bot.send_message(chat_id, "Произошла ошибка при обработке команды.")

@bot.message_handler(commands=['help'])
def handle_help(message):
    """Обработчик команды /help"""
    chat_id = message.chat.id
    user_id = message.from_user.id
    
    logger.info(f"📨 Команда /help от пользователя {user_id}")
    
    try:
        # Обновляем состояние пользователя
        update_user_state(user_id)
        
        # Отправляем сообщение: Справочное сообщение
        message_text = replace_variables("""📖 <b>Справка по боту</b>

Это простой тестовый бот для проверки базовой функциональности.

<b>Команды:</b>
/start - приветствие
/help - эта справка
/status - статус системы

<b>Возможности:</b>
✅ Обработка команд
✅ Отправка сообщений
✅ HTML форматирование

<i>Бот создан в конструкторе ботов</i>""", user_id)
        bot.send_message(
            chat_id, 
            message_text, 
            parse_mode='HTML'
        )
        logger.info("✅ Отправлено сообщение")
        
    except Exception as e:
        logger.error(f"Ошибка обработки команды /help: {e}")
        bot.send_message(chat_id, "Произошла ошибка при обработке команды.")

@bot.message_handler(commands=['status'])
def handle_status(message):
    """Обработчик команды /status"""
    chat_id = message.chat.id
    user_id = message.from_user.id
    
    logger.info(f"📨 Команда /status от пользователя {user_id}")
    
    try:
        # Обновляем состояние пользователя
        update_user_state(user_id)
        
        # Отправляем сообщение: Статусное сообщение
        message_text = replace_variables("""📊 <b>Статус бота</b>

🟢 Статус: Активен
⏰ Время работы: {{uptime}}
💬 Обработано сообщений: {{message_count}}
👥 Активных пользователей: {{user_count}}

🔧 Версия: 1.0.0
📅 Последнее обновление: {{last_update}}""", user_id)
        bot.send_message(
            chat_id, 
            message_text, 
            parse_mode='HTML'
        )
        logger.info("✅ Отправлено сообщение")
        
    except Exception as e:
        logger.error(f"Ошибка обработки команды /status: {e}")
        bot.send_message(chat_id, "Произошла ошибка при обработке команды.")

# Вспомогательные функции
def update_user_state(user_id: int) -> None:
    """Обновляет состояние пользователя"""
    state = user_states[user_id]
    state['message_count'] += 1
    state['last_activity'] = datetime.now()

def replace_variables(text: str, user_id: int) -> str:
    """Заменяет переменные в тексте"""
    result = text
    
    # Заменяем глобальные переменные
    for key, variable in bot_variables.items():
        placeholder = f"{{{{{key}}}}}"
        result = result.replace(placeholder, str(variable.get('defaultValue', '')))
    
    # Заменяем пользовательские переменные
    state = user_states[user_id]
    result = result.replace('{{message_count}}', str(state['message_count']))
    result = result.replace('{{user_count}}', str(len(user_states)))
    
    # Время работы
    uptime = datetime.now() - start_time
    uptime_str = f"{uptime.days} дней {uptime.seconds // 3600} часов"
    result = result.replace('{{uptime}}', uptime_str)
    
    return result

def get_bot_stats() -> Dict[str, Any]:
    """Возвращает статистику бота"""
    uptime = datetime.now() - start_time
    return {
        'total_users': len(user_states),
        'total_messages': sum(state['message_count'] for state in user_states.values()),
        'uptime_seconds': uptime.total_seconds(),
        'uptime_str': f"{uptime.days} дней {uptime.seconds // 3600} часов"
    }

# Обработчик ошибок
@bot.message_handler(func=lambda message: True)
def handle_unknown_message(message):
    """Обработчик неизвестных сообщений"""
    logger.info(f"💬 Неизвестное сообщение от {message.from_user.id}: {message.text}")
    # Здесь можно добавить обработку текстовых сообщений

# Запуск бота
def main():
    """Основная функция запуска бота"""
    logger.info("🤖 Бот запущен!")
    logger.info(f"Название: {config['name']}")
    logger.info(f"Описание: {config['description']}")
    
    try:
        bot.polling(none_stop=True, interval=0, timeout=20)
    except KeyboardInterrupt:
        logger.info("\n🛑 Остановка бота...")
    except Exception as e:
        logger.error(f"Критическая ошибка: {e}")
    finally:
        bot.stop_polling()

if __name__ == '__main__':
    main()
