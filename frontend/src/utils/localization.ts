// Словарь русификации для интерфейса редактора
export const fieldTranslations: Record<string, string> = {
  // Общие поля
  'label': 'Название',
  'description': 'Описание',
  'message': 'Сообщение',
  'text': 'Текст',
  'value': 'Значение',
  'condition': 'Условие',
  'command': 'Команда',
  'photo': 'Фото',
  'caption': 'Подпись',
  'key': 'Ключ',
  'userData': 'Данные пользователя',
  'timeout': 'Таймаут',
  'delay': 'Задержка',
  'retries': 'Повторы',
  'url': 'Ссылка',
  'webhook': 'Вебхук',
  'api': 'API',
  'database': 'База данных',
  'file': 'Файл',
  'path': 'Путь',
  'format': 'Формат',
  'encoding': 'Кодировка',
  
  // Типы триггеров
  'messageType': 'Тип сообщения',
  'triggerType': 'Тип триггера',
  'filters': 'Фильтры',
  
  // Типы действий
  'actionType': 'Тип действия',
  'parseMode': 'Режим разбора',
  
  // Типы условий
  'conditionType': 'Тип условия',
  'caseSensitive': 'Учитывать регистр',
  'checkType': 'Тип проверки',
  
  // Значения условий
  'contains': 'содержит',
  'equals': 'равно',
  'startsWith': 'начинается с',
  'endsWith': 'заканчивается на',
  'regex': 'регулярное выражение',
  
  // Типы проверки пользователя
  'isAdmin': 'является администратором',
  'isBanned': 'заблокирован',
  'hasRole': 'имеет роль',
  
  // Режимы разбора
  'HTML': 'HTML',
  'Markdown': 'Markdown',
  'plain': 'обычный текст',
  
  // Типы сообщений (дополнительные)
  'sticker': 'стикер',
  'voice': 'голосовое сообщение',
  'location': 'местоположение',
  'contact': 'контакт'
};

export const nodeTypeTranslations: Record<string, string> = {
  // Стартовые узлы
  'start': 'Старт',
  'entry-point': 'Точка входа',
  
  // Новые улучшенные узлы
  'interactive-menu': 'Интерактивное меню',
  
  // Webhook и маршрутизация (n8n стиль)
  'webhook-telegram': 'Telegram Webhook',
  'webhook-http': 'HTTP Webhook',
  'switch-command': 'Switch (Команды)',
  'switch-condition': 'Switch (Условия)',
  
  // Триггеры
  'trigger-message': 'Триггер сообщения',
  'trigger-command': 'Триггер команды',
  'trigger-callback': 'Триггер кнопки',
  'trigger-inline': 'Inline триггер',
  'command': 'Команда бота',
  'callback_handler': 'Обработчик кнопок',
  
  // Действия - отправка сообщений
  'action-send-message': 'Отправить сообщение',
  'send_message': 'Отправить сообщение',
  'send_message_with_keyboard': 'Сообщение с клавиатурой',
  'action-edit-message': 'Редактировать сообщение',
  'action-delete-message': 'Удалить сообщение',
  
  // Действия - медиа
  'action-send-photo': 'Отправить фото',
  'action-send-video': 'Отправить видео',
  'action-send-audio': 'Отправить аудио',
  'action-send-document': 'Отправить документ',
  
  // Условия
  'condition-text': 'Условие по тексту',
  'condition-text-contains': 'Текст содержит',
  'condition-text-equals': 'Текст равен',
  'condition-user': 'Условие по пользователю',
  'condition-user-role': 'Роль пользователя',
  'condition-user-subscription': 'Подписка пользователя',
  'condition-time': 'Условие по времени',
  'condition-variable': 'Условие по переменной',
  
  // Данные
  'data-save': 'Сохранить данные',
  'data-load': 'Загрузить данные',
  'data-delete': 'Удалить данные',
  'data-variable-set': 'Установить переменную',
  'data-variable-get': 'Получить переменную',
  
  // Интеграции
  'integration-http': 'HTTP запрос',
  'integration-webhook': 'Webhook',
  'integration-database': 'База данных',
  'integration-api': 'API интеграция',
  
  // Сценарии
  'scenario-welcome': 'Сценарий приветствия',
  'scenario-support': 'Сценарий поддержки',
  'scenario-survey': 'Сценарий опроса',
  'scenario-quiz': 'Сценарий викторины',
  
  // Дополнительные типы из ботов
  'trigger_guess_number': 'Угадай число',
  'trigger_start': 'Старт',
  'trigger_new_member': 'Новый участник',
  'trigger_spam': 'Спам',
  'trigger_faq': 'Часто задаваемые вопросы',
  'trigger_create_ticket': 'Создать тикет',
  'trigger_upcoming_events': 'Предстоящие события',
  'trigger_register': 'Регистрация',
  
  'action_welcome': 'Приветствие',
  'action_support_menu': 'Меню поддержки',
  'action_show_faq': 'Показать FAQ',
  'action_ticket_form': 'Форма тикета',
  'action_save_ticket': 'Сохранить тикет',
  'action_ticket_confirmation': 'Подтверждение тикета',
  'action_events_menu': 'Меню событий',
  'action_show_events': 'Показать события',
  'action_registration_form': 'Форма регистрации',
  'action_save_registration': 'Сохранить регистрацию',
  'action_registration_success': 'Успешная регистрация',
  'action_delete_spam': 'Удалить спам',
  'action_warn_user': 'Предупредить пользователя',
  
  'condition_check_admin': 'Проверка администратора',
  
  // Общие типы
  'trigger': 'Триггер',
  'action': 'Действие',
  'condition': 'Условие'
};

export const getFieldTranslation = (field: string): string => {
  return fieldTranslations[field] || field.charAt(0).toUpperCase() + field.slice(1);
};

export const getNodeTypeTranslation = (nodeType: string): string => {
  return nodeTypeTranslations[nodeType] || nodeType;
};

export const getValueTranslation = (value: string): string => {
  return fieldTranslations[value] || value;
};

// Подробные описания узлов для tooltips
export const nodeDescriptions: Record<string, string> = {
  // Стартовые узлы
  'start': 'Начальная точка выполнения схемы бота. Используется для запуска логики.',
  'entry-point': 'Определяет как пользователи попадают в бот (команды, первое сообщение, кнопки).',
  
  // Новые улучшенные узлы
  'interactive-menu': 'Отправляет сообщение с настраиваемыми кнопками. Объединяет отправку сообщения и обработку нажатий.',
  
  // Webhook и маршрутизация
  'webhook-telegram': 'Получает входящие сообщения из Telegram через webhook.',
  'webhook-http': 'Получает HTTP запросы от внешних сервисов.',
  'switch-command': 'Маршрутизирует выполнение в зависимости от команды пользователя.',
  'switch-condition': 'Маршрутизирует выполнение в зависимости от условий.',
  
  // Триггеры
  'trigger-message': 'Активируется при получении сообщения от пользователя.',
  'trigger-command': 'Активируется при получении команды (например, /start).',
  'trigger-callback': 'Активируется при нажатии inline-кнопки.',
  'trigger-inline': 'Активируется при inline-запросе.',
  'command': 'Обрабатывает команды бота (/start, /help и другие).',
  'callback_handler': 'Обрабатывает нажатия на inline-кнопки.',
  
  // Действия - сообщения
  'action-send-message': 'Отправляет текстовое сообщение пользователю.',
  'send_message': 'Отправляет текстовое сообщение пользователю.',
  'send_message_with_keyboard': 'Отправляет сообщение с интерактивными кнопками.',
  'action-edit-message': 'Редактирует ранее отправленное сообщение.',
  'action-delete-message': 'Удаляет сообщение из чата.',
  
  // Действия - медиа
  'action-send-photo': 'Отправляет изображение с возможностью добавить подпись.',
  'action-send-video': 'Отправляет видеофайл с возможностью добавить подпись.',
  'action-send-audio': 'Отправляет аудиофайл.',
  'action-send-document': 'Отправляет документ любого типа.',
  
  // Условия
  'condition-text': 'Проверяет содержимое текстового сообщения.',
  'condition-text-contains': 'Проверяет, содержит ли текст определенную строку.',
  'condition-text-equals': 'Проверяет, равен ли текст определенной строке.',
  'condition-user': 'Проверяет права и статус пользователя.',
  'condition-user-role': 'Проверяет роль пользователя в системе.',
  'condition-user-subscription': 'Проверяет статус подписки пользователя.',
  'condition-time': 'Проверяет текущее время или дату.',
  'condition-variable': 'Проверяет значение переменной.',
  
  // Данные
  'data-save': 'Сохраняет данные пользователя в базе данных.',
  'data-load': 'Загружает ранее сохраненные данные пользователя.',
  'data-delete': 'Удаляет данные пользователя из базы данных.',
  'data-variable-set': 'Устанавливает значение переменной.',
  'data-variable-get': 'Получает значение переменной.',
  
  // Интеграции
  'integration-http': 'Выполняет HTTP запрос к внешнему API.',
  'integration-webhook': 'Отправляет данные на внешний webhook.',
  'integration-database': 'Взаимодействует с внешней базой данных.',
  'integration-api': 'Интегрируется с внешним API сервисом.',
  
  // Сценарии
  'scenario-welcome': 'Готовый сценарий приветствия новых пользователей.',
  'scenario-support': 'Готовый сценарий службы поддержки.',
  'scenario-survey': 'Готовый сценарий проведения опроса.',
  'scenario-quiz': 'Готовый сценарий викторины или теста.'
};

// Функция для получения полной локализации узла
export interface NodeLocalization {
  name: string;
  description: string;
  category: string;
  tooltip: string;
}

export const getNodeLocalization = (nodeType: string): NodeLocalization => {
  const name = nodeTypeTranslations[nodeType] || nodeType;
  const description = nodeDescriptions[nodeType] || 'Описание недоступно';
  
  // Определяем категорию по префиксу типа узла
  let category = 'Общие';
  if (nodeType.startsWith('trigger') || nodeType.includes('command') || nodeType.includes('callback')) {
    category = 'Триггеры';
  } else if (nodeType.startsWith('action') || nodeType.includes('send_')) {
    category = 'Действия';
  } else if (nodeType.startsWith('condition')) {
    category = 'Условия';
  } else if (nodeType.startsWith('data')) {
    category = 'Данные';
  } else if (nodeType.startsWith('integration')) {
    category = 'Интеграции';
  } else if (nodeType.startsWith('scenario')) {
    category = 'Сценарии';
  } else if (nodeType.includes('webhook') || nodeType.includes('switch')) {
    category = 'Маршрутизация';
  }
  
  const tooltip = `${name}\n\nКатегория: ${category}\n\n${description}`;
  
  return {
    name,
    description,
    category,
    tooltip
  };
};