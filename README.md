# 🤖 Ollama Chat Web

Современный веб-интерфейс для взаимодействия с AI моделями через платформу Ollama. Проект предоставляет удобный чат-интерфейс с продвинутыми возможностями форматирования кода и работы с AI в реальном времени.

## ✨ Ключевые особенности

- **🎯 AI Чат в реальном времени**
  - Мгновенное взаимодействие с AI моделями Ollama
  - Поддержка различных моделей
  - Умное управление контекстом диалога

- **💻 Продвинутая работа с кодом**
  - Автоматическая подсветка синтаксиса для множества языков программирования
  - Копирование кода в один клик с визуальным подтверждением
  - Определение языка программирования

- **📝 Форматирование текста**
  - Полная поддержка Markdown
  - Рендеринг математических формул
  - Красивое оформление блоков кода

- **🎨 Современный дизайн**
  - Адаптивный интерфейс для desktop и mobile
  - Анимации и визуальные эффекты
  - Профессиональное оформление

## 🌟 Features

- 💬 Real-time chat interface with Ollama AI models
- 🔄 Dynamic model selection from available Ollama models
- 🎨 Beautiful and responsive UI with syntax highlighting
- 📝 Markdown support with code highlighting
- ⚡ Fast and lightweight
- 🔒 Secure local deployment

## 🛠️ Технологический стек

### Backend
- Node.js + Express
- node-fetch для HTTP запросов
- Интеграция с Ollama API
- Обработка ошибок и таймауты

### Frontend
- Vanilla JavaScript
- marked.js для Markdown
- highlight.js для подсветки кода
- Font Awesome иконки
- Адаптивная верстка

## 🛠️ Configuration

The server can be configured through environment variables or by modifying the `CONFIG` object in `server.js`:

```javascript
const CONFIG = {
  defaultModel: 'qwen2.5-coder:3b', // Default model to use if none specified
  timeout: 180000,                  // Request timeout in milliseconds
  maxOutputLength: 2000,            // Maximum length of model output
  ollamaApi: 'http://127.0.0.1:11434' // Ollama API endpoint
};
```

### Available Models

The application automatically detects and lists all available Ollama models installed on your system. You can:

- View all available models in the dropdown menu
- Switch between models during chat
- Set a default model in the configuration

To add more models, install them through Ollama CLI:
```bash
ollama pull [model-name]
```

## 📋 Требования

- Node.js (версия 14 или выше)
- Установленный и запущенный Ollama
- Современный веб-браузер

## 🚀 Установка и запуск

1. Клонируйте репозиторий:
```bash
git clone https://github.com/yourusername/ollama-chat-web.git
cd ollama-chat-web
```

2. Установите зависимости:
```bash
npm install
```

3. Убедитесь, что Ollama запущен:
```bash
ollama serve
```

4. Запустите сервер:
```bash
node server/server.js
```

5. Откройте в браузере:
```
http://localhost:3000
```

## ⚙️ Конфигурация

Настройки по умолчанию находятся в `server/server.js`:

```javascript
const CONFIG = {
  model: 'qwen2.5-coder:3b',  // AI модель по умолчанию
  timeout: 180000,            // Таймаут запроса (3 минуты)
  maxOutputLength: 2000,      // Максимальная длина ответа
  ollamaApi: 'http://127.0.0.1:11434'  // Endpoint Ollama API
};
```

## 🔒 Безопасность

- Включен CORS для локальной разработки
- Валидация входных данных
- Защита от утечки чувствительных данных
- Безопасный механизм копирования кода

## 🤝 Как внести свой вклад

1. Форкните репозиторий
2. Создайте ветку для новой функции (`git checkout -b feature/NewFeature`)
3. Зафиксируйте изменения (`git commit -m 'Add NewFeature'`)
4. Отправьте изменения в репозиторий (`git push origin feature/NewFeature`)
5. Создайте Pull Request

## 📝 Лицензия

Проект распространяется под лицензией MIT. Подробности в файле [LICENSE](LICENSE).

## 🙏 Благодарности

- [Ollama](https://ollama.ai/) за отличные AI модели
- [marked.js](https://marked.js.org/) за парсинг Markdown
- [highlight.js](https://highlightjs.org/) за подсветку синтаксиса
- [Font Awesome](https://fontawesome.com/) за иконки

## 📞 Поддержка

Если у вас возникли проблемы или вопросы:
1. Создайте Issue в репозитории
2. Опишите проблему максимально подробно
3. При необходимости приложите скриншоты или логи

## 🔄 Текущий статус

Проект активно развивается. Планируются следующие улучшения:
- Добавление новых моделей
- Улучшение обработки ошибок
- Создание конфигурационного файла
- Добавление аутентификации
- Сохранение истории диалогов
