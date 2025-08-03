// Словарь русских сообщений об ошибках
export const errorMessages: Record<string, string> = {
  // Сетевые ошибки
  'Network Error': 'Ошибка сети. Проверьте подключение к интернету.',
  'Failed to fetch': 'Не удалось загрузить данные. Проверьте подключение к серверу.',
  'timeout': 'Превышено время ожидания. Попробуйте еще раз.',
  
  // HTTP ошибки
  '400': 'Неверный запрос. Проверьте введенные данные.',
  '401': 'Необходима авторизация. Войдите в систему.',
  '403': 'Доступ запрещен. У вас нет прав для выполнения этого действия.',
  '404': 'Ресурс не найден. Возможно, он был удален или перемещен.',
  '409': 'Конфликт данных. Возможно, ресурс уже существует.',
  '422': 'Неверные данные. Проверьте правильность заполнения полей.',
  '429': 'Слишком много запросов. Подождите немного и попробуйте снова.',
  '500': 'Внутренняя ошибка сервера. Попробуйте позже.',
  '502': 'Сервер недоступен. Попробуйте позже.',
  '503': 'Сервис временно недоступен. Попробуйте позже.',
  
  // Ошибки валидации
  'validation_error': 'Ошибка валидации данных',
  'required_field': 'Это поле обязательно для заполнения',
  'invalid_email': 'Неверный формат email адреса',
  'invalid_phone': 'Неверный формат номера телефона',
  'password_too_short': 'Пароль должен содержать минимум 6 символов',
  'passwords_not_match': 'Пароли не совпадают',
  
  // Ошибки бота
  'bot_not_found': 'Бот не найден',
  'bot_save_error': 'Ошибка при сохранении бота',
  'bot_load_error': 'Ошибка при загрузке бота',
  'bot_delete_error': 'Ошибка при удалении бота',
  'bot_validation_error': 'Ошибка валидации схемы бота',
  'bot_deploy_error': 'Ошибка при развертывании бота',
  
  // Ошибки схемы
  'schema_invalid': 'Неверная схема бота',
  'schema_empty': 'Схема бота пуста',
  'schema_no_start': 'В схеме отсутствует стартовый узел',
  'schema_disconnected': 'В схеме есть несвязанные узлы',
  'schema_circular': 'В схеме обнаружена циклическая зависимость',
  
  // Ошибки узлов
  'node_invalid_config': 'Неверная конфигурация узла',
  'node_missing_required': 'Не заполнены обязательные поля узла',
  'node_invalid_connection': 'Неверное соединение между узлами',
  
  // Ошибки файлов
  'file_too_large': 'Файл слишком большой',
  'file_invalid_type': 'Неподдерживаемый тип файла',
  'file_upload_error': 'Ошибка при загрузке файла',
  'file_not_found': 'Файл не найден',
  
  // Общие ошибки
  'unknown_error': 'Неизвестная ошибка',
  'operation_failed': 'Операция не выполнена',
  'access_denied': 'Доступ запрещен',
  'session_expired': 'Сессия истекла. Войдите в систему заново.',
};

// Функция для получения русского сообщения об ошибке
export const getErrorMessage = (error: Error | string | number): string => {
  let errorKey: string;
  
  if (error instanceof Error) {
    errorKey = error.message;
  } else if (typeof error === 'number') {
    errorKey = error.toString();
  } else {
    errorKey = error;
  }
  
  // Ищем точное совпадение
  if (errorMessages[errorKey]) {
    return errorMessages[errorKey];
  }
  
  // Ищем частичное совпадение
  const partialMatch = Object.keys(errorMessages).find(key => 
    errorKey.toLowerCase().includes(key.toLowerCase()) ||
    key.toLowerCase().includes(errorKey.toLowerCase())
  );
  
  if (partialMatch) {
    return errorMessages[partialMatch];
  }
  
  // Если ничего не найдено, возвращаем исходное сообщение или общую ошибку
  return errorKey || errorMessages.unknown_error;
};

// Функция для создания детального сообщения об ошибке
export const createDetailedErrorMessage = (
  error: Error | string | number,
  context?: string
): { title: string; message: string } => {
  const baseMessage = getErrorMessage(error);
  
  let title = 'Ошибка';
  let message = baseMessage;
  
  if (context) {
    title = `Ошибка: ${context}`;
  }
  
  // Добавляем техническую информацию для разработчиков в dev режиме
  if (import.meta.env.DEV && error instanceof Error) {
    message += `\n\nТехническая информация:\n${error.stack || error.message}`;
  }
  
  return { title, message };
};

// Типы операций для контекстных сообщений
export const operationContexts: Record<string, string> = {
  'save': 'Сохранение',
  'load': 'Загрузка',
  'delete': 'Удаление',
  'create': 'Создание',
  'update': 'Обновление',
  'deploy': 'Развертывание',
  'validate': 'Валидация',
  'upload': 'Загрузка файла',
  'download': 'Скачивание',
  'connect': 'Подключение',
  'disconnect': 'Отключение',
};