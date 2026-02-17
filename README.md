# Медиа-платформа для загрузки контента

Веб-приложение для загрузки фото/видео материалов с автоматической обработкой через n8n automation и интерактивным управлением процессом обработки.

## Возможности

- 📸 **Загрузка фото и видео** в облачное хранилище Cloudinary
- 📝 **Текстовый ввод** с клавиатуры
- 🎤 **Голосовой ввод** с транскрипцией через OpenAI Whisper API
- 🔄 **Автоматическая обработка** контента через n8n workflows
- 👤 **Личный кабинет** для просмотра статусов и результатов
- ✅ **Интерактивное принятие решений** (одобрить/отклонить/повторить)
- 🔐 **Аутентификация** по email

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

Следуйте инструкциям в [docs/n8n-setup.md](./docs/n8n-setup.md) для настройки всех необходимых workflows в n8n.

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

## API Документация

Полная API спецификация доступна в [docs/api-spec.md](./docs/api-spec.md).

**Базовый URL:** `https://your-n8n-instance.com/webhook`

**Authentication:** Bearer Token в заголовке `Authorization`

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

## Разработка

### Структура кода

**Components:**
- `components/auth/*` - Компоненты аутентификации
- `components/upload/*` - Компоненты загрузки файлов
- `components/dashboard/*` - Компоненты личного кабинета

**Services:**
- `services/authService.ts` - Аутентификация API
- `services/uploadService.ts` - Управление загрузками
- `services/cloudinaryService.ts` - Cloudinary интеграция
- `services/voiceService.ts` - Голосовой ввод и Whisper API

**Contexts:**
- `contexts/AuthContext.tsx` - Глобальное состояние аутентификации

**Types:**
- `types/index.ts` - Все TypeScript типы

### Добавление новых компонентов

```bash
# Создать новый компонент
cd frontend/src/components/your-category
touch YourComponent.tsx
```

### Стили

Проект использует **TailwindCSS**. Доступные utility классы:

```tsx
// Buttons
<button className="btn btn-primary">Primary</button>
<button className="btn btn-secondary">Secondary</button>

// Inputs
<input className="input" />

// Cards
<div className="card">Content</div>
```

---

## Тестирование

### Unit тесты
```bash
npm run test
```

### E2E тесты
```bash
npm run test:e2e
```

### Проверка типов
```bash
npm run typecheck
```

---

## Deployment

### Frontend (Vercel)

1. Зарегистрируйтесь на [Vercel](https://vercel.com)
2. Подключите GitHub репозиторий
3. Настройте environment variables в Vercel dashboard
4. Deploy автоматически при push в main

### PostgreSQL (Supabase)

1. Создайте проект на [Supabase](https://supabase.com)
2. Выполните SQL миграции в SQL Editor
3. Получите connection string
4. Обновите n8n PostgreSQL credentials

### n8n (n8n.cloud)

1. Зарегистрируйтесь на [n8n.cloud](https://n8n.cloud)
2. Импортируйте workflows из `docs/n8n-setup.md`
3. Настройте environment variables
4. Обновите webhook URLs в frontend `.env`

---

## Troubleshooting

### Проблема: "Unauthorized" при запросах

**Решение:**
- Проверьте токен в localStorage: `localStorage.getItem('auth_token')`
- Убедитесь, что токен не истек
- Попробуйте выйти и войти заново

### Проблема: "CORS error"

**Решение:**
- Проверьте CORS настройки в n8n
- Убедитесь, что ваш frontend domain добавлен в allowed origins

### Проблема: Файлы не загружаются в Cloudinary

**Решение:**
- Проверьте Cloudinary credentials в `.env`
- Убедитесь, что Upload Preset настроен как "Unsigned"
- Проверьте максимальный размер файла

### Проблема: Голосовой ввод не работает

**Решение:**
- Разрешите доступ к микрофону в браузере
- Проверьте OpenAI API key
- Убедитесь, что используете HTTPS (микрофон работает только на HTTPS)

---

## Roadmap

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

## Контакты и поддержка

- **Email:** support@your-domain.com
- **Documentation:** [docs/](./docs/)
- **GitHub Issues:** https://github.com/your-repo/issues

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
