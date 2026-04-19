# Проект "Введение": Медиа-платформа для загрузки контента

## Содержание

1. [Обзор проекта](#обзор-проекта)
2. [Технологический стек](#технологический-стек)
3. [Структура проекта](#структура-проекта)
4. [Функциональные возможности](#функциональные-возможности)
5. [Установка и запуск](#установка-и-запуск)
6. [Использование](#использование)
7. [API Спецификация](#api-спецификация)
8. [База данных](#база-данных)
9. [Настройка n8n](#настройка-n8n)
10. [Настройка Cloudinary](#настройка-cloudinary)
11. [Конфигурация](#конфигурация)
12. [TypeScript Типы](#typescript-типы)
13. [Сервисы и компоненты](#сервисы-и-компоненты)
14. [Рабочий процесс](#рабочий-процесс)
15. [Интеграции](#интеграции)
16. [Безопасность](#безопасность)
17. [Развертывание](#развертывание)
18. [Roadmap разработки](#roadmap-разработки)
19. [Устранение неполадок](#устранение-неполадок)
20. [Мониторинг и логирование](#мониторинг-и-логирование)
21. [Приложения](#приложения)

---

## Обзор проекта

**Название:** Медиа-платформа для загрузки контента  
**Версия:** 1.0.0  
**Дата создания документа:** 16 апреля 2026  
**Статус:** В разработке (Phase 2: Authentication)

Веб-приложение для загрузки фото/видео материалов с автоматической обработкой через n8n automation и интерактивным управлением процессом обработки.

### Основные характеристики:
- 📸 Загрузка фото и видео в облачное хранилище Cloudinary
- 📝 Текстовый ввод с клавиатуры
- 🎤 Голосовой ввод с транскрипцией через OpenAI Whisper API
- 🔄 Автоматическая обработка контента через n8n workflows
- 👤 Личный кабинет для просмотра статусов и результатов
- ✅ Интерактивное принятие решений (одобрить/отклонить/повторить)
- 🔐 Аутентификация по email

---

## Технологический стек

### Frontend
- **React** + **Vite** + **TypeScript**
- **TailwindCSS** для стилей
- **React Router** для навигации
- **React Query** для управления серверным состоянием
- **Zustand** для клиентского state management
- **Zod** для валидации

### Backend
- **n8n** - обработка данных, API endpoints, webhooks
- **PostgreSQL** - хранение данных пользователей и загрузок

### Сервисы
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

## Установка и запуск

### Требования
- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **PostgreSQL** >= 14.0
- **n8n** (cloud или self-hosted)

### 1. Клонирование репозитория
```bash
cd "C:\Users\Павел\Desktop\Курсор обучение\введение"
```

### 2. Установка зависимостей
```bash
cd frontend
npm install
```

### 3. Настройка PostgreSQL
Создайте базу данных и выполните SQL схему:
```bash
psql -U your_username -d your_database -f ../database/schema.sql
```

### 4. Настройка environment variables
Скопируйте `.env.example` в `.env` и заполните значения:
```bash
cd frontend
cp .env.example .env
```

Отредактируйте `.env`:
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

### 5. Настройка n8n workflows
Следуйте инструкциям в [разделе "Настройка n8n"](#настройка-n8n) для настройки всех необходимых workflows в n8n.

**Основные endpoints, которые нужно создать в n8n:**
- `POST /auth/register` - Регистрация
- `POST /auth/login` - Вход
- `GET /auth/me` - Текущий пользователь
- `POST /auth/logout` - Выход
- `POST /uploads` - Создание загрузки
- `GET /uploads` - Список загрузок
- `GET /uploads/:id` - Одна загрузка
- `POST /uploads/:id/decision` - Принятие решения

### 6. Настройка Cloudinary
1. Создайте аккаунт на [Cloudinary](https://cloudinary.com/)
2. Получите **Cloud Name**, **API Key**, **API Secret**
3. Создайте **Upload Preset** (Settings → Upload → Upload presets):
   - Mode: **Unsigned**
   - Folder: `media-platform`
   - Allowed formats: `jpg, png, gif, webp, mp4, webm, mov`
   - Max file size: `100MB`

### 7. Запуск приложения
**Development mode:**
```bash
cd frontend
npm run dev
```

Приложение будет доступно по адресу: http://localhost:5173

**Production build:**
```bash
npm run build
npm run preview
```

---

## Использование

### Регистрация и вход
1. Откройте приложение в браузере
2. Нажмите "Регистрация"
3. Введите email и пароль (минимум 8 символов)
4. После регистрации вы автоматически войдете в систему

### Загрузка контента
#### Фото/Видео:
1. Перейдите в раздел "Upload"
2. Перетащите файл в область загрузки или кликните для выбора
3. Дождитесь загрузки в Cloudinary (progress bar)
4. Файл автоматически отправится на обработку в n8n

#### Текстовый ввод:
1. Выберите вкладку "Text"
2. Введите текст в textarea
3. Нажмите "Submit"

#### Голосовой ввод:
1. Выберите вкладку "Voice"
2. Нажмите "Start Recording"
3. Разрешите доступ к микрофону
4. Говорите ваше сообщение
5. Нажмите "Stop Recording"
6. Дождитесь транскрипции через Whisper API

### Личный кабинет
1. Перейдите в раздел "Dashboard"
2. Просмотрите все свои загрузки с их статусами:
   - **Awaiting Decision** - требуется ваше решение
   - **Processing** - в процессе обработки
   - **Completed** - завершено
   - **Rejected** - отклонено

### Принятие решений
Когда обработка завершена и статус "Awaiting Decision":

1. Кликните на загрузку для просмотра результата
2. Ознакомьтесь с промежуточным результатом
3. Выберите одно из действий:
   - **Approve** ✅ - Одобрить результат
   - **Reject** ❌ - Отклонить результат
   - **Retry** 🔄 - Повторить обработку заново

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

### Примеры запросов

**Регистрация:**
```bash
curl -X POST https://your-n8n.com/webhook/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

**Вход:**
```bash
curl -X POST https://your-n8n.com/webhook/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

**Получение загрузок:**
```bash
curl -X GET https://your-n8n.com/webhook/uploads \
  -H "Authorization: Bearer YOUR_TOKEN"
```

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

## Настройка n8n

### Обзор
n8n выступает в роли backend API и обрабатывает все операции с базой данных, аутентификацией и медиа-контентом.

### Подготовка

#### 1. Установка n8n
**Cloud версия:**
- Зарегистрируйтесь на [n8n.cloud](https://n8n.cloud)
- Создайте новый workspace

**Self-hosted:**
```bash
npm install n8n -g
n8n start
```

#### 2. Настройка подключения к PostgreSQL
В n8n создайте Credentials для PostgreSQL:
- **Type:** PostgreSQL
- **Host:** ваш PostgreSQL хост
- **Database:** название базы данных
- **User:** пользователь БД
- **Password:** пароль БД
- **Port:** 5432 (по умолчанию)

#### 3. Environment Variables
Настройте следующие переменные окружения в n8n:
```env
N8N_API_KEY=your_secure_api_key_here
FRONTEND_URL=http://localhost:5173
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

### Аутентификация Workflows

#### 1. POST /auth/register - Регистрация пользователя
**Webhook URL:** `https://your-n8n-instance.com/webhook/auth/register`

**Workflow:**
```
[Webhook] → [Validate Input] → [Check User Exists] → [Hash Password] → [Insert User] → [Return Response]
```

#### 2. POST /auth/login - Вход пользователя
**Webhook URL:** `https://your-n8n-instance.com/webhook/auth/login`

**Workflow:**
```
[Webhook] → [Get User] → [Verify Password] → [Generate Token] → [Create Session] → [Return Token]
```

#### 3. GET /auth/me - Получить текущего пользователя
**Workflow:**
```
[Webhook] → [Extract Token] → [Verify Session] → [Get User] → [Return User Data]
```

#### 4. POST /auth/logout - Выход
**Workflow:**
```
[Webhook] → [Extract Token] → [Delete Session] → [Return Success]
```

### Управление загрузками

#### 1. POST /uploads - Создание загрузки
**Webhook URL:** `https://your-n8n-instance.com/webhook/uploads`

**Workflow:**
```
[Webhook] → [Auth Check] → [Validate Input] → [Insert Upload] → [Log Activity] → [Trigger Processing] → [Return Response]
```

#### 2. GET /uploads - Получить все загрузки пользователя
**PostgreSQL Query:**
```sql
SELECT
  u.id, u.content_type, u.status,
  u.cloudinary_secure_url, u.text_content,
  u.original_filename, u.created_at, u.updated_at,
  pr.result_preview, pr.result_media_url, pr.user_decision
FROM uploads u
LEFT JOIN LATERAL (
  SELECT result_preview, result_media_url, user_decision
  FROM processing_results
  WHERE upload_id = u.id
  ORDER BY created_at DESC
  LIMIT 1
) pr ON true
WHERE u.user_id = $1
ORDER BY u.created_at DESC
LIMIT 50
```

#### 3. POST /uploads/:id/decision - Отправка решения пользователя
**Workflow:**
```
[Webhook] → [Auth Check] → [Validate Decision] → [Update Processing Result] → [Update Upload Status] → [Notify n8n] → [Return Response]
```

### Обработка медиа

#### Webhook: /webhook/media-upload
Этот webhook получает данные о новых загрузках и выполняет обработку.

**Workflow:**
```
[Webhook] → [Validate API Key] → [Process Media] → [Send Results Back] → [Complete]
```

#### Webhook: /webhook/user-decision
Принимает решения пользователя и выполняет соответствующие действия.

**Workflow:**
```
[Webhook] → [Validate API Key] → [Switch on Decision] → [Execute Action] → [Return Response]
```

### Callbacks

#### POST /api/processing-results
Этот endpoint принимает результаты обработки от n8n и сохраняет их в БД.

**Workflow:**
```
[Webhook] → [Validate API Key] → [Insert Processing Result] → [Update Upload Status] → [Log Activity] → [Return Success]
```

### Безопасность

#### 1. API Key Authentication
Для всех sensitive endpoints используйте API key проверку.

#### 2. CORS Configuration
В n8n Settings → Security → CORS:
- Разрешите домен вашего фронтенда
- Для разработки: `http://localhost:5173`
- Для production: `https://your-domain.com`

#### 3. Rate Limiting
Используйте n8n Rate Limit node для ограничения частоты запросов:
- Auth endpoints: 5 запросов в минуту на IP
- Upload endpoints: 10 запросов в минуту на пользователя

#### 4. Input Validation
Всегда валидируйте входящие данные:
- Email format
- Password strength
- File sizes
- Content types
- SQL injection prevention

---

## Настройка Cloudinary

### 🚀 Быстрая настройка (5 минут)

#### 1. Создайте аккаунт
1. Перейдите на [cloudinary.com](https://cloudinary.com/)
2. Нажмите **Sign Up for Free**
3. Заполните форму или войдите через Google/GitHub
4. Подтвердите email

**Бесплатный план включает:**
- ✅ 25 credits/месяц
- ✅ До 25GB хранилища
- ✅ До 25GB bandwidth
- ✅ Все основные функции

#### 2. Получите учетные данные
После регистрации вы попадете на Dashboard:

1. В верхней части страницы найдите секцию **Account Details**
2. Скопируйте следующие данные:
   - **Cloud Name** (например: `dxxxxxxx`)
   - **API Key** (например: `123456789012345`)
   - **API Secret** (не нужен для frontend)

**Пример:**
```
Cloud name: my-cloud-name
API Key: 123456789012345
API Secret: AbCdEfGhIjKlMnOpQrStUvWxYz  (не используем)
```

#### 3. Создайте Upload Preset
Upload Preset - это предустановленные настройки для загрузки файлов.

**Шаги:**
1. В Dashboard перейдите в **Settings** (шестеренка в правом верхнем углу)
2. Выберите вкладку **Upload**
3. Прокрутите вниз до **Upload presets**
4. Нажмите **Add upload preset**

**Настройки preset:**
- **Preset name:** `media-platform` (или любое имя)
- **Signing Mode:** ⚠️ **Unsigned** (ВАЖНО!)
- **Folder:** `media-platform` (опционально)
- **Allowed formats:**
  - Images: `jpg, png, gif, webp`
  - Videos: `mp4, webm, mov, avi`
- **Max file size:** `100000000` (100MB в bytes)

5. Нажмите **Save**
6. Скопируйте **Preset name** (например: `media-platform`)

#### 4. Настройте .env файл
Откройте `frontend/.env` и добавьте:
```env
# Cloudinary Configuration
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=media-platform
VITE_CLOUDINARY_API_KEY=123456789012345
```

**Замените:**
- `your_cloud_name` → ваш Cloud Name
- `media-platform` → имя вашего Upload Preset
- `123456789012345` → ваш API Key

**Пример:**
```env
VITE_CLOUDINARY_CLOUD_NAME=dxxxxxxx
VITE_CLOUDINARY_UPLOAD_PRESET=media-platform
VITE_CLOUDINARY_API_KEY=123456789012345
```

#### 5. Перезапустите dev сервер
```bash
cd frontend
npm run dev
```

Dev сервер нужно перезапустить, чтобы применились новые environment variables.

### ✅ Проверка работы
1. Откройте приложение: `http://localhost:5175/upload`
2. Попробуйте загрузить файл:
   - Перетащите изображение в зону загрузки
   - Или кликните и выберите файл
   - Наблюдайте прогресс бар
3. Проверьте в Cloudinary Dashboard:
   - Перейдите на [console.cloudinary.com](https://console.cloudinary.com/)
   - Откройте **Media Library**
   - Вы должны увидеть загруженный файл в папке `media-platform`

### 🔧 Дополнительные настройки

#### Upload Controls
В Settings → Upload можно настроить:
- **File size limits:**
  ```
  Max File Size: 100MB
  Max Image Width: 10000px
  Max Image Height: 10000px
  Max Video Length: 300 seconds (5 минут)
  ```
- **Auto-moderation:**
  - Включите AI модерацию контента
  - Блокировка неподходящих изображений
- **Notifications:**
  - Email уведомления при загрузке
  - Webhooks для интеграции с n8n

#### Folders Organization
Рекомендуемая структура папок:
```
media-platform/
├── photos/
│   ├── 2024/
│   │   ├── 01/
│   │   └── 02/
├── videos/
│   ├── 2024/
│   │   ├── 01/
│   │   └── 02/
└── temp/
```

#### Transformations
Cloudinary может автоматически:
- Изменять размер изображений
- Конвертировать форматы
- Оптимизировать для web
- Создавать thumbnails
- Применять фильтры

**Пример URL трансформации:**
```
https://res.cloudinary.com/YOUR_CLOUD/image/upload/w_800,h_600,c_fill/sample.jpg
```

Параметры:
- `w_800` - ширина 800px
- `h_600` - высота 600px
- `c_fill` - обрезка по размеру
- `q_80` - качество 80%
- `f_auto` - автоматический формат (WebP для поддерживающих)

### 🐛 Troubleshooting

#### Проблема: "Cloudinary not configured"
**Решение:**
1. Проверьте файл `.env`:
   ```bash
   cat frontend/.env
   ```
2. Убедитесь, что переменные начинаются с `VITE_`
3. Перезапустите dev сервер:
   ```bash
   npm run dev
   ```

#### Проблема: "Upload failed" / 401 Unauthorized
**Решение:**
1. Проверьте Upload Preset:
   - Должен быть **Unsigned**
   - Имя preset должно совпадать с `.env`
2. Проверьте Cloud Name:
   - Точное совпадение (case-sensitive)

#### Проблема: "Invalid file type"
**Решение:**
1. Проверьте Allowed Formats в Upload Preset
2. Убедитесь, что тип файла включен:
   ```
   Images: jpg, png, gif, webp
   Videos: mp4, webm, mov
   ```

#### Проблема: Файлы загружаются но не видны в Dashboard
**Решение:**
1. Обновите страницу Media Library (F5)
2. Проверьте фильтры (возможно скрыты по папке/дате)
3. Проверьте параметр `folder` в коде

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

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  confirmPassword: string;
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

## Сервисы и компоненты

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
Следуйте инструкциям в разделе "Настройка n8n" для настройки всех необходимых workflows.

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

### B. Чеклист развертывания

- [ ] Настроить environment variables
- [ ] Развернуть PostgreSQL базу данных
- [ ] Настроить n8n workflows
- [ ] Настроить Cloudinary
- [ ] Развернуть frontend
- [ ] Протестировать интеграции
- [ ] Настроить мониторинг
- [ ] Создать backup стратегию

### C. Полезные ссылки

- **n8n Documentation:** https://docs.n8n.io/
- **Cloudinary Documentation:** https://cloudinary.com/documentation
- **React Documentation:** https://react.dev/
- **PostgreSQL Documentation:** https://www.postgresql.org/docs/
- **TypeScript Documentation:** https://www.typescriptlang.org/docs/

### D. Контакты и поддержка

- **Документация проекта:** [docs/](./docs/)
- **GitHub Issues:** https://github.com/your-repo/issues
- **Email поддержки:** support@your-domain.com

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

*Документ создан: 16 апреля 2026*  
*Версия документа: 1.0.0*  
*Последнее обновление: 16 апреля 2026*