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
  // Основные типы
  'trigger-message': 'Триггер сообщения',
  'trigger-command': 'Триггер команды',
  'action-send-message': 'Отправить сообщение',
  'action-send-photo': 'Отправить фото',
  'condition-text': 'Условие по тексту',
  'condition-user': 'Условие по пользователю',
  'data-save': 'Сохранить данные',
  'data-load': 'Загрузить данные',
  
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