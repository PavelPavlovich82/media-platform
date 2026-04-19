# Документация проекта: Медиа-платформа для загрузки контента

## Обзор проекта

**Название:** Медиа-платформа для загрузки контента  
**Версия:** 1.0.0  
**Дата создания документа:** 16 апреля 2026  
**Статус:** В разработке (Phase 2: Authentication)

Веб-приложение для загрузки фото/видео материалов с автоматической обработкой через n8n automation и интерактивным управлением процессом обработки.

---

## Архитектура

### Технологический стек

#### Frontend
- **React** + **Vite** + **TypeScript**
- **TailwindCSS** для стилей
- **React Router** для навигации
- **React Query** для управления серверным состоянием
- **Zustand** для клиентского state management
- **Zod** для валидации

#### Backend
- **n8n** - обработка данных, API endpoints, webhooks
- **PostgreSQL** - хранение данных пользователей и загрузок

#### Сервисы
- **Cloudinary** - хранение фото/видео файлов
- **OpenAI Whisper API** - транскрипция голосовых сообщений

---

## Структура проекта

```
введение/
├── frontend/                    # React приложение
│   ├── src/
│   │   ├── components/         # React компоненты
│   │   │   ├── auth/          # Аутентификация
│   │   │   ├── upload/        # Загрузка файлов
│   │   │   ├── dashboard/     # Личный кабинет
│   │   │   └── common/        # Переиспользуемые компоненты
│   │   ├── services/          # API сервисы
│   │   ├── contexts/          # React Context
│   │   ├── hooks/             # Custom hooks
│   │   ├── types/             # TypeScript типы
│   │   ├── config/            # Конфигурация
│   │   └── App.tsx
│   ├── .env.example
│   └── package.json
├── database/
│   └── schema.sql             # PostgreSQL схема
├── docs/
│   ├── n8n-setup.md          # Инструкции для n8n
│   └── api-spec.md           # API спецификация
└── README.md
```

---

## Функциональные возможности

### Основные функции
1. **📸 Загрузка фото и видео** в облачное хранилище Cloudinary
2. **📝 Текстовый ввод** с клавиатуры
3. **🎤 Голосовой ввод** с транскрипцией через OpenAI Whisper API
4. **🔄 Автоматическая обработка** контента через n8n workflows
5. **👤 Личный кабинет** для просмотра статусов и результатов
6. **✅ Интерактивное принятие решений** (одобрить/отклонить/повторить)
7. **🔐 Аутентификация** по email

### Статусы обработки контента
- `uploading` - Загружается
- `pending` - Ожидает обработки
- `processing` - Обрабатывается
- `awaiting_decision` - Ожидает решения пользователя
- `approved` - Одобрено пользователем
- `rejected` - Отклонено пользователем
- `completed` - Завершено
- `failed` - Ошибка обработки

### Типы контента
- `photo` - Фото
- `video` - Видео
- `text` - Текстовый ввод
- `voice` - Голосовой ввод (транскрибированный)

---

## API Спецификация

### Базовый URL
```
https://your-n8n-instance.com/webhook
```

### Аутентификация
Bearer Token в заголовке `Authorization`

### Основные Endpoints

#### Аутентификация
- `POST /auth/register` - Регистрация нового пользователя
- `POST /auth/login` - Вход пользователя в систему
- `GET /auth/me` - Получить данные текущего пользователя
- `POST /auth/logout` - Выход из системы

#### Загрузки (Uploads)
- `POST /uploads` - Создать новую загрузку
- `GET /uploads` - Получить все загрузки текущего пользователя
- `GET /uploads/:id` - Получить одну загрузку по ID
- `GET /uploads/:id/results` - Получить результаты обработки загрузки
- `POST /uploads/:id/decision` - Отправить решение пользователя

#### Webhooks (для n8n)
- `POST /webhook/media-upload` - Webhook для обработки новых загрузок
- `POST /webhook/user-decision` - Webhook для обработки решений пользователя

#### Callbacks (n8n → Backend)
- `POST /api/processing-results` - Endpoint для отправки результатов обработки обратно в приложение

---

## База данных

### Основные таблицы

#### users
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP
);
```

#### uploads
```sql
CREATE TABLE uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content_type content_type NOT NULL,
    status processing_status DEFAULT 'uploading',
    
    -- Cloudinary data
    cloudinary_public_id VARCHAR(500),
    cloudinary_url TEXT,
    cloudinary_secure_url TEXT,
    
    -- Text content
    text_content TEXT,
    
    -- File metadata
    original_filename VARCHAR(500),
    file_size BIGINT,
    mime_type VARCHAR(100),
    
    -- Processing info
    n8n_workflow_id VARCHAR(100),
    processing_attempts INTEGER DEFAULT 0,
    last_error TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### processing_results
```sql
CREATE TABLE processing_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    upload_id UUID REFERENCES uploads(id) ON DELETE CASCADE,
    result_data JSONB NOT NULL,
    result_preview TEXT,
    result_media_url TEXT,
    user_decision VARCHAR(20) CHECK (user_decision IN ('approve', 'reject', 'retry')),
    decision_timestamp TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Конфигурация

### Environment Variables

#### Обязательные переменные
```env
# API Configuration
VITE_API_BASE_URL=http://localhost:3000

# n8n Integration
VITE_N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook
VITE_N8N_API_KEY=your_n8n_api_key_here

# Cloudinary Configuration
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
VITE_CLOUDINARY_API_KEY=your_api_key

# OpenAI Configuration
VITE_OPENAI_API_KEY=sk-your-openai-api-key-here
```

#### Настройки приложения (frontend/src/config/env.ts)
```typescript
export const config = {
  app: {
    name: 'Media Upload Platform',
    version: '1.0.0',
    maxFileSize: 100 * 1024 * 1024, // 100MB
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedVideoTypes: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
    sessionTimeout: 7 * 24 * 60 * 60 * 1000, // 7 дней в миллисекундах
  },
  
  features: {
    voiceInput: true,
    textInput: true,
    photoUpload: true,
    videoUpload: true,
  },
};
```

---

## TypeScript Типы

### Основные типы (frontend/src/types/index.ts)

#### Пользователь и аутентификация
```typescript
export interface User {
  id: string;
  email: string;
  createdAt: string;
  lastLogin?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
```

#### Загрузки
```typescript
export interface Upload {
  id: string;
  userId: string;
  contentType: ContentType;
  status: ProcessingStatus;
  
  // Cloudinary данные
  cloudinaryPublicId?: string;
  cloudinaryUrl?: string;
  cloudinarySecureUrl?: string;
  
  // Текстовый контент
  textContent?: string;
  
  // Метаданные файла
  originalFilename?: string;
  fileSize?: number;
  mimeType?: string;
  
  // Информация об обработке
  n8nWorkflowId?: string;
  processingAttempts: number;
  lastError?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  
  // Результат обработки
  processingResult?: ProcessingResult;
}
```

#### Результаты обработки
```typescript
export interface ProcessingResult {
  id: string;
  uploadId: string;
  resultData: Record<string, any>; // Гибкая JSONB структура
  resultPreview: string;
  resultMediaUrl?: string;
  userDecision?: 'approve' | 'reject' | 'retry';
  decisionTimestamp?: string;
  createdAt: string;
}
```

---

## Сервисы

### Основные сервисы (frontend/src/services/)

1. **authService.ts** - Аутентификация API
2. **uploadService.ts** - Управление загрузками
3. **cloudinaryService.ts** - Cloudinary интеграция
4. **voiceService.ts** - Голосовой ввод и Whisper API
5. **n8nService.ts** - Интеграция с n8n

### Пример использования сервисов
```typescript
// Авторизация
const { login, register, logout, getCurrentUser } = useAuth();

// Загрузка файлов
const { uploadFile, createUpload, getUploads, submitDecision } = useUpload();

// Голосовой ввод
const { startRecording, stopRecording, transcribeAudio } = useVoice();
```

---

## Компоненты

### Структура компонентов

#### Аутентификация
- `LoginForm.tsx` - Форма входа
- `RegisterForm.tsx` - Форма регистрации

#### Загрузка файлов
- `FileUploader.tsx` - Компонент загрузки файлов
- `TextInput.tsx` - Текстовый ввод
- `VoiceInput.tsx` - Голосовой ввод

#### Личный кабинет
- `UploadCard.tsx` - Карточка загрузки
- `Dashboard.tsx` - Основная страница дашборда

#### Общие компоненты
- `ProtectedRoute.tsx` - Защищенный маршрут
- `LoadingSpinner.tsx` - Индикатор загрузки

---

## Рабочий процесс (Workflow)

### 1. Регистрация и вход
1. Пользователь регистрируется с email и паролем
2. Получает токен аутентификации
3. Токен сохраняется в localStorage

### 2. Загрузка контента
#### Фото/Видео:
1. Пользователь перетаскивает файл или выбирает через диалог
2. Файл загружается в Cloudinary
3. После загрузки создается запись в базе данных
4. Запускается n8n workflow для обработки

#### Текстовый ввод:
1. Пользователь вводит текст
2. Текст отправляется на обработку через API
3. Создается запись в базе данных

#### Голосовой ввод:
1. Пользователь записывает голосовое сообщение
2. Аудио транскрибируется через Whisper API
3. Транскрипция отправляется на обработку
4. Создается запись в базе данных

### 3. Обработка в n8n
1. n8n получает webhook с данными загрузки
2. Выполняется обработка (AI анализ, OCR и т.д.)
3. Результаты отправляются обратно через callback
4. Статус загрузки меняется на `awaiting_decision`

### 4. Принятие решений
1. Пользователь видит результат обработки
2. Выбирает действие:
   - **Approve** ✅ - Одобрить результат
   - **Reject** ❌ - Отклонить результат
   - **Retry** 🔄 - Повторить обработку заново
3. Решение отправляется в n8n для дальнейших действий

---

## Интеграции

### n8n
- **Роль:** Backend-as-a-Service, обработка данных
- **Endpoints:** Все API endpoints реализованы как n8n webhooks
- **Workflows:** 
  - Аутентификация пользователей
  - Обработка загрузок
  - Управление решениями пользователей
  - Интеграция с внешними сервисами

### Cloudinary
- **Роль:** Хранилище медиафайлов
- **Конфигурация:** Unsigned upload preset
- **Максимальный размер файла:** 100MB
- **Поддерживаемые форматы:** jpg, png, gif, webp, mp4, webm, mov

### OpenAI Whisper API
- **Роль:** Транскрипция голосовых сообщений
- **Использование:** Только для транскрипции аудио
- **Лимиты:** Зависит от API ключа

---

## Безопасность

### Меры безопасности

#### Аутентификация
1. **JWT токены** с ограниченным временем жизни
2. **Хеширование паролей** с использованием bcrypt
3. **Rate limiting** для предотвращения brute force атак

#### Хранение данных
1. **Environment variables** для конфиденциальных данных
2. **HTTPS only** в production
3. **SQL injection protection** через parameterized queries

#### CORS
- Разрешенные origins: `http://localhost:5173` (dev), `https://your-domain.com` (prod)
- Разрешенные методы: GET, POST, PUT, DELETE, OPTIONS
- Разрешенные заголовки: Authorization, Content-Type, X-N8N-API-KEY

### Rate Limiting
- **Authentication endpoints:** 5 запросов в минуту на IP
- **Upload endpoints:** 10 запросов в минуту на пользователя
- **Read endpoints:** 60 запросов в минуту на пользователя

---

## Развертывание

### Требования
- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **PostgreSQL** >= 14.0
- **n8n** (cloud или self-hosted)

### Шаги развертывания

#### 1. Клонирование и настройка
```bash
cd "C:\Users\Павел\Desktop\Курсор обучение\введение"
cd frontend
npm install
cp .env.example .env
# Редактировать .env файл
```

#### 2. Настройка базы данных
```bash
psql -U your_username -d your_database -f ../database/schema.sql
```

#### 3. Настройка n8n
Следуйте инструкциям в `docs/n8n-setup.md` для настройки всех необходимых workflows.

#### 4. Настройка Cloudinary
1. Создайте аккаунт на Cloudinary
2. Получите Cloud Name, API Key, API Secret
3. Создайте Upload Preset (Mode: Unsigned)

#### 5. Запуск
```bash
# Development
npm run dev

# Production build
npm run build
npm run preview
```

### Платформы развертывания

#### Frontend (Vercel)
1. Зарегистрируйтесь на Vercel
2. Подключите GitHub репозиторий
3. Настройте environment variables
4. Deploy автоматически при push в main

#### PostgreSQL (Supabase)
1. Создайте проект на Supabase
2. Выполните SQL миграции
3. Получите connection string
4. Обновите n8n PostgreSQL credentials

#### n8n (n8n.cloud)
1. Зарегистрируйтесь на n8n.cloud
2. Импортируйте workflows из `docs/n8n-setup.md`
3. Настройте environment variables
4. Обновите webhook URLs в frontend `.env`

---

## Roadmap разработки

### Phase 1: ✅ Infrastructure (Завершено)
- [x] React + Vite setup
- [x] TailwindCSS
- [x] PostgreSQL schema
- [x] n8n documentation
- [x] API specification

### Phase 2: 🚧 Authentication (В работе)
- [ ] Auth components
- [ ] Auth service
- [ ] Protected routes
- [ ] n8n auth workflows

### Phase 3: 📋 File Upload
- [ ] File uploader component
- [ ] Cloudinary integration
- [ ] Progress tracking
- [ ] n8n upload workflow

### Phase 4: 📋 Voice & Text Input
- [ ] Text input component
- [ ] Voice recorder
- [ ] Whisper API integration
- [ ] n8n processing workflows

### Phase 5: 📋 Dashboard
- [ ] Upload list
- [ ] Upload card
- [ ] Decision buttons
- [ ] Real-time updates

### Phase 6: 📋 Testing & Polish
- [ ] Error handling
- [ ] Loading states
- [ ] Responsive design
- [ ] E2E testing

### Phase 7: 📋 Deployment
- [ ] Production build
- [ ] Environment setup
- [ ] Deploy frontend
- [ ] Deploy backend

---

## Устранение неполадок

### Распространенные проблемы

#### "Unauthorized" при запросах
- Проверьте токен в localStorage: `localStorage.getItem('auth_token')`
- Убедитесь, что токен не истек
- Попробуйте выйти и войти заново

#### "CORS error"
- Проверьте CORS настройки в n8n
- Убедитесь, что ваш frontend domain добавлен в allowed origins

#### Файлы не загружаются в Cloudinary
- Проверьте Cloudinary credentials в `.env`
- Убедитесь, что Upload Preset настроен как "Unsigned"
- Проверьте максимальный размер файла

#### Голосовой ввод не работает
- Разрешите доступ к микрофону в браузере
- Проверьте OpenAI API key
- Убедитесь, что используете HTTPS (микрофон работает только на HTTPS)

---

## Мониторинг и логирование

### Логирование
- **Frontend:** Console logs в development, Sentry в production
- **n8n:** Встроенное логирование workflows
- **PostgreSQL:** Query logs для отладки

### Мониторинг
- **Производительность:** React DevTools, Chrome Performance
- **Сеть:** Chrome Network tab
- **Ошибки:** Error boundaries в React

---

## Контакты и поддержка

- **Документация:** [docs/](./docs/)
- **GitHub Issues:** https://github.com/your-repo/issues
- **Email:** support@your-domain.com

---

## Лицензия

MIT License

Copyright (c) 2024

---

## Благодарности

- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [TailwindCSS](https://tailwindcss.com/)
- [n8n](https://n8n.io/)
- [Cloudinary](https://cloudinary.com/)
- [OpenAI](https://openai.com/)

---

## Приложения

### A. Примеры кода

#### Авторизация
```typescript
// Login
const login = async (email: string, password: string) => {
  const response = await fetch('https://n8n.com/webhook/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();
  localStorage.setItem('auth_token', data.token);
  return data;
};
```

#### Создание загрузки
```typescript
const createUpload = async (uploadData) => {
  const token = localStorage.getItem('auth_token');
  const response = await fetch('https://n8n.com/webhook/uploads', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(uploadData)
  });

  return response.json();
};
```

### B. Ссылки на документацию

1. [API Specification](./docs/api-spec.md)
2. [n8n Setup Guide](./docs/n8n-setup.md)
3. [Cloudinary Setup Guide](./docs/cloudinary-setup.md)
4. [Database Schema](./database/schema.sql)

### C. Чеклист развертывания

- [ ] Настроить environment variables
- [ ] Развернуть PostgreSQL базу данных
- [ ] Настроить n8n workflows
- [ ] Настроить Cloudinary
- [ ] Развернуть frontend
- [ ] Протестировать интеграции
- [ ] Настроить мониторинг
- [ ] Создать backup стратегию