# API Спецификация

## Обзор

Это полная API спецификация для медиа-платформы. Все endpoints реализованы через n8n webhooks.

**Base URL:** `https://your-n8n-instance.com/webhook`

**Authentication:** Bearer Token в заголовке `Authorization`

**Content-Type:** `application/json`

---

## Аутентификация

### POST /auth/register

Регистрация нового пользователя.

**Endpoint:** `/auth/register`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secure_password_123"
}
```

**Validation:**
- Email: валидный email формат
- Password: минимум 8 символов

**Response: 201 Created**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

**Errors:**
- `400` - Invalid email format / Password too short
- `409` - Email already exists

---

### POST /auth/login

Вход пользователя в систему.

**Endpoint:** `/auth/login`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secure_password_123"
}
```

**Response: 200 OK**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2024-01-22T10:30:00Z",
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

**Errors:**
- `401` - Invalid credentials
- `403` - Account is inactive

---

### GET /auth/me

Получить данные текущего пользователя.

**Endpoint:** `/auth/me`

**Headers:**
```
Authorization: Bearer {token}
```

**Response: 200 OK**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "createdAt": "2024-01-15T10:30:00Z",
  "lastLogin": "2024-01-15T12:00:00Z"
}
```

**Errors:**
- `401` - No token provided / Invalid token
- `403` - Token expired

---

### POST /auth/logout

Выход из системы (удаление сессии).

**Endpoint:** `/auth/logout`

**Headers:**
```
Authorization: Bearer {token}
```

**Response: 200 OK**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Загрузки (Uploads)

### POST /uploads

Создать новую загрузку.

**Endpoint:** `/uploads`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request для фото/видео:**
```json
{
  "contentType": "photo",
  "cloudinaryPublicId": "media/abc123",
  "cloudinaryUrl": "http://res.cloudinary.com/...",
  "cloudinarySecureUrl": "https://res.cloudinary.com/...",
  "originalFilename": "photo.jpg",
  "fileSize": 1024000,
  "mimeType": "image/jpeg"
}
```

**Request для текста:**
```json
{
  "contentType": "text",
  "textContent": "Мой текстовый контент"
}
```

**Request для голоса:**
```json
{
  "contentType": "voice",
  "textContent": "Транскрипция голосового сообщения"
}
```

**Content Types:**
- `photo` - Фото
- `video` - Видео
- `text` - Текстовый ввод
- `voice` - Голосовой ввод (транскрибированный)

**Response: 201 Created**
```json
{
  "success": true,
  "upload": {
    "id": "uuid",
    "contentType": "photo",
    "status": "pending",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

**Errors:**
- `400` - Invalid content type / Missing required fields
- `401` - Unauthorized
- `413` - File too large

---

### GET /uploads

Получить все загрузки текущего пользователя.

**Endpoint:** `/uploads`

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `status` (optional): Фильтр по статусу
- `limit` (optional): Количество результатов (default: 50)
- `offset` (optional): Смещение для пагинации

**Response: 200 OK**
```json
{
  "success": true,
  "uploads": [
    {
      "id": "uuid",
      "contentType": "photo",
      "status": "awaiting_decision",
      "cloudinarySecureUrl": "https://res.cloudinary.com/...",
      "originalFilename": "photo.jpg",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:35:00Z",
      "processingResult": {
        "resultPreview": "Обнаружены объекты: person, building",
        "resultMediaUrl": "https://res.cloudinary.com/processed/...",
        "userDecision": null
      }
    },
    {
      "id": "uuid2",
      "contentType": "text",
      "status": "completed",
      "textContent": "Мой текст",
      "createdAt": "2024-01-14T09:00:00Z",
      "processingResult": {
        "resultPreview": "Текст обработан успешно",
        "userDecision": "approve"
      }
    }
  ],
  "total": 25,
  "limit": 50,
  "offset": 0
}
```

**Statuses:**
- `uploading` - Загружается
- `pending` - Ожидает обработки
- `processing` - Обрабатывается
- `awaiting_decision` - Ожидает решения пользователя
- `approved` - Одобрено пользователем
- `rejected` - Отклонено пользователем
- `completed` - Завершено
- `failed` - Ошибка обработки

---

### GET /uploads/:id

Получить одну загрузку по ID.

**Endpoint:** `/uploads/:id`

**Headers:**
```
Authorization: Bearer {token}
```

**Response: 200 OK**
```json
{
  "id": "uuid",
  "userId": "user_uuid",
  "contentType": "photo",
  "status": "awaiting_decision",
  "cloudinaryPublicId": "media/abc123",
  "cloudinaryUrl": "http://res.cloudinary.com/...",
  "cloudinarySecureUrl": "https://res.cloudinary.com/...",
  "originalFilename": "photo.jpg",
  "fileSize": 1024000,
  "mimeType": "image/jpeg",
  "processingAttempts": 1,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:35:00Z"
}
```

**Errors:**
- `404` - Upload not found
- `403` - Forbidden (not your upload)

---

### GET /uploads/:id/results

Получить результаты обработки загрузки.

**Endpoint:** `/uploads/:id/results`

**Headers:**
```
Authorization: Bearer {token}
```

**Response: 200 OK**
```json
{
  "success": true,
  "results": [
    {
      "id": "result_uuid",
      "uploadId": "upload_uuid",
      "resultData": {
        "analyzed": true,
        "colors": ["red", "blue"],
        "objects": ["person", "building"],
        "confidence": 0.95,
        "customData": {}
      },
      "resultPreview": "Обнаружены объекты: person, building. Уверенность: 95%",
      "resultMediaUrl": "https://res.cloudinary.com/processed/...",
      "userDecision": null,
      "createdAt": "2024-01-15T10:35:00Z"
    }
  ]
}
```

**resultData структура:**
Поле `resultData` - это JSONB, может содержать любую структуру данных от n8n:
- AI анализ
- OCR результаты
- Метаданные обработки
- Пользовательские данные

---

### POST /uploads/:id/decision

Отправить решение пользователя по результату обработки.

**Endpoint:** `/uploads/:id/decision`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request:**
```json
{
  "decision": "approve"
}
```

**Decision values:**
- `approve` - Одобрить результат, продолжить финальную обработку
- `reject` - Отклонить результат
- `retry` - Повторить обработку заново

**Response: 200 OK**
```json
{
  "success": true,
  "message": "Decision recorded",
  "upload": {
    "id": "uuid",
    "status": "approved",
    "updatedAt": "2024-01-15T10:40:00Z"
  }
}
```

**Errors:**
- `400` - Invalid decision value
- `404` - Upload not found
- `409` - Decision already made

---

## Webhooks (для n8n)

Эти endpoints используются внутренне n8n workflows и защищены API ключом.

### POST /webhook/media-upload

Webhook для обработки новых загрузок.

**Authentication:** `X-N8N-API-KEY` header

**Request:**
```json
{
  "uploadId": "uuid",
  "userId": "user_uuid",
  "contentType": "photo",
  "cloudinaryUrl": "https://res.cloudinary.com/...",
  "textContent": null,
  "metadata": {
    "filename": "photo.jpg",
    "fileSize": 1024000,
    "mimeType": "image/jpeg"
  }
}
```

**Response: 200 OK**
```json
{
  "success": true,
  "workflowId": "workflow_123",
  "message": "Processing started"
}
```

---

### POST /webhook/user-decision

Webhook для обработки решений пользователя.

**Authentication:** `X-N8N-API-KEY` header

**Request:**
```json
{
  "uploadId": "uuid",
  "decision": "approve",
  "userId": "user_uuid"
}
```

**Response: 200 OK**
```json
{
  "success": true,
  "action": "completed",
  "message": "Processing completed"
}
```

**Action values:**
- `completed` - Обработка завершена
- `reprocessing` - Началась повторная обработка
- `cancelled` - Обработка отменена

---

## Callbacks (n8n → Backend)

### POST /api/processing-results

Endpoint для n8n, чтобы отправить результаты обработки обратно в приложение.

**Authentication:** `X-N8N-API-KEY` header

**Request от n8n:**
```json
{
  "uploadId": "uuid",
  "resultData": {
    "analyzed": true,
    "colors": ["red", "blue", "green"],
    "objects": ["person", "building"],
    "confidence": 0.95,
    "aiAnalysis": {
      "sentiment": "positive",
      "categories": ["nature", "architecture"]
    }
  },
  "resultPreview": "Обнаружены объекты: person, building. Основные цвета: red, blue, green. Настроение: позитивное.",
  "resultMediaUrl": "https://res.cloudinary.com/processed/abc123"
}
```

**Response: 201 Created**
```json
{
  "success": true,
  "resultId": "result_uuid",
  "uploadStatus": "awaiting_decision"
}
```

---

## Коды ошибок

### 400 Bad Request
```json
{
  "error": true,
  "message": "Invalid request data",
  "details": {
    "field": "email",
    "error": "Invalid email format"
  }
}
```

### 401 Unauthorized
```json
{
  "error": true,
  "message": "Unauthorized",
  "details": "No token provided"
}
```

### 403 Forbidden
```json
{
  "error": true,
  "message": "Forbidden",
  "details": "You don't have access to this resource"
}
```

### 404 Not Found
```json
{
  "error": true,
  "message": "Resource not found"
}
```

### 409 Conflict
```json
{
  "error": true,
  "message": "Conflict",
  "details": "Email already exists"
}
```

### 413 Payload Too Large
```json
{
  "error": true,
  "message": "File too large",
  "details": "Maximum file size is 100MB"
}
```

### 500 Internal Server Error
```json
{
  "error": true,
  "message": "Internal server error",
  "details": "An unexpected error occurred"
}
```

---

## Rate Limiting

API использует rate limiting для предотвращения злоупотреблений:

- **Authentication endpoints:** 5 запросов в минуту на IP
- **Upload endpoints:** 10 запросов в минуту на пользователя
- **Read endpoints:** 60 запросов в минуту на пользователя

**Response при превышении лимита: 429 Too Many Requests**
```json
{
  "error": true,
  "message": "Too many requests",
  "retryAfter": 60
}
```

---

## Pagination

Для endpoints с большим количеством результатов используется pagination:

**Query Parameters:**
- `limit`: Количество результатов (default: 50, max: 100)
- `offset`: Смещение от начала (default: 0)

**Example:**
```
GET /uploads?limit=20&offset=40
```

**Response включает pagination metadata:**
```json
{
  "uploads": [...],
  "pagination": {
    "total": 150,
    "limit": 20,
    "offset": 40,
    "hasMore": true
  }
}
```

---

## Filtering

**Фильтрация по статусу:**
```
GET /uploads?status=awaiting_decision
```

**Фильтрация по типу контента:**
```
GET /uploads?contentType=photo
```

**Сортировка:**
```
GET /uploads?sortBy=createdAt&order=desc
```

---

## Webhooks (для клиента)

### Real-time уведомления

Для real-time обновлений статусов загрузок, клиент может использовать polling:

**Рекомендованный интервал:** 5 секунд

**Использование react-query:**
```typescript
useQuery({
  queryKey: ['uploads'],
  queryFn: fetchUploads,
  refetchInterval: 5000
});
```

---

## CORS

API поддерживает CORS для следующих origins:
- `http://localhost:5173` (development)
- `https://your-domain.com` (production)

**Разрешенные методы:** GET, POST, PUT, DELETE, OPTIONS

**Разрешенные заголовки:** Authorization, Content-Type, X-N8N-API-KEY

---

## Security Best Practices

### Для клиента:

1. **Хранение токенов:**
   - Используйте `localStorage` или `sessionStorage`
   - Никогда не храните токены в cookies без `HttpOnly` флага

2. **HTTPS Only:**
   - Всегда используйте HTTPS в production
   - Не отправляйте токены через HTTP

3. **Token refresh:**
   - Проверяйте `expiresAt` перед запросами
   - Реализуйте автоматический logout при истечении

4. **Валидация на клиенте:**
   - Валидируйте данные перед отправкой
   - Санитизируйте пользовательский ввод

### Для n8n:

1. **API Keys:**
   - Используйте сложные API ключи (минимум 32 символа)
   - Храните ключи в environment variables

2. **SQL Injection:**
   - Используйте parameterized queries
   - Никогда не конкатенируйте SQL строки

3. **Rate Limiting:**
   - Настройте rate limiting для всех endpoints
   - Логируйте подозрительную активность

---

## Примеры использования

### JavaScript/TypeScript

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

// Create upload
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

// Submit decision
const submitDecision = async (uploadId: string, decision: string) => {
  const token = localStorage.getItem('auth_token');
  const response = await fetch(`https://n8n.com/webhook/uploads/${uploadId}/decision`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ decision })
  });

  return response.json();
};
```

---

## Changelog

### v1.0.0 (2024-01-15)
- Initial API specification
- Authentication endpoints
- Upload management endpoints
- Processing callbacks
- Webhooks integration

---

## Support

Для вопросов и поддержки:
- Документация n8n: [docs/n8n-setup.md](./n8n-setup.md)
- Email: support@your-domain.com
- GitHub Issues: https://github.com/your-repo/issues
