# Настройка n8n для медиа-платформы

## Обзор

Этот документ описывает настройку всех n8n workflows, необходимых для работы медиа-платформы. n8n выступает в роли backend API и обрабатывает все операции с базой данных, аутентификацией и медиа-контентом.

## Содержание

1. [Подготовка](#подготовка)
2. [Аутентификация](#аутентификация)
3. [Управление загрузками](#управление-загрузками)
4. [Обработка медиа](#обработка-медиа)
5. [Callbacks](#callbacks)
6. [Безопасность](#безопасность)
7. [Примеры workflows](#примеры-workflows)

---

## Подготовка

### 1. Установка n8n

**Cloud версия:**
- Зарегистрируйтесь на [n8n.cloud](https://n8n.cloud)
- Создайте новый workspace

**Self-hosted:**
```bash
npm install n8n -g
n8n start
```

### 2. Настройка подключения к PostgreSQL

В n8n создайте Credentials для PostgreSQL:
- **Type:** PostgreSQL
- **Host:** ваш PostgreSQL хост
- **Database:** название базы данных
- **User:** пользователь БД
- **Password:** пароль БД
- **Port:** 5432 (по умолчанию)

### 3. Environment Variables

Настройте следующие переменные окружения в n8n:
```env
N8N_API_KEY=your_secure_api_key_here
FRONTEND_URL=http://localhost:5173
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

---

## Аутентификация

### 1. POST /auth/register - Регистрация пользователя

**Webhook URL:** `https://your-n8n-instance.com/webhook/auth/register`

**Workflow:**

```
[Webhook] → [Validate Input] → [Check User Exists] → [Hash Password] → [Insert User] → [Return Response]
```

**Детали nodes:**

1. **Webhook Node**
   - HTTP Method: POST
   - Path: /auth/register
   - Response Mode: Last Node
   - Authentication: None (публичный endpoint)

2. **Function Node: Validate Input**
```javascript
const email = $input.item.json.body.email;
const password = $input.item.json.body.password;

// Email validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  return {
    error: true,
    message: 'Invalid email format',
    statusCode: 400
  };
}

// Password validation (min 8 characters)
if (password.length < 8) {
  return {
    error: true,
    message: 'Password must be at least 8 characters',
    statusCode: 400
  };
}

return {
  email: email.toLowerCase(),
  password: password
};
```

3. **PostgreSQL Node: Check User Exists**
   - Operation: Execute Query
   - Query:
   ```sql
   SELECT id FROM users WHERE email = $1 LIMIT 1
   ```
   - Parameters: `{{ $json.email }}`

4. **IF Node: User Exists Check**
   - Condition: `{{ $json.id }}` is empty
   - True: Continue to hash password
   - False: Return error

5. **Function Node: Hash Password**
```javascript
const crypto = require('crypto');

// Generate salt and hash password using bcrypt-compatible method
// Note: В реальности используйте bcrypt библиотеку
const password = $input.item.json.password;
const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
const passwordHash = `${salt}:${hash}`;

return {
  email: $input.item.json.email,
  passwordHash: passwordHash
};
```

6. **PostgreSQL Node: Insert User**
   - Operation: Execute Query
   - Query:
   ```sql
   INSERT INTO users (email, password_hash)
   VALUES ($1, $2)
   RETURNING id, email, created_at
   ```
   - Parameters: `{{ $json.email }}`, `{{ $json.passwordHash }}`

7. **Respond to Webhook Node**
   - Response Code: 201
   - Response Body:
   ```json
   {
     "success": true,
     "message": "User registered successfully",
     "user": {
       "id": "{{ $json.id }}",
       "email": "{{ $json.email }}",
       "createdAt": "{{ $json.created_at }}"
     }
   }
   ```

---

### 2. POST /auth/login - Вход пользователя

**Webhook URL:** `https://your-n8n-instance.com/webhook/auth/login`

**Workflow:**

```
[Webhook] → [Get User] → [Verify Password] → [Generate Token] → [Create Session] → [Return Token]
```

**Детали nodes:**

1. **Webhook Node**
   - HTTP Method: POST
   - Path: /auth/login

2. **PostgreSQL Node: Get User**
```sql
SELECT id, email, password_hash, is_active
FROM users
WHERE email = $1
LIMIT 1
```

3. **Function Node: Verify Password**
```javascript
const inputPassword = $input.first().json.body.password;
const storedHash = $input.item.json.password_hash;
const isActive = $input.item.json.is_active;

if (!isActive) {
  return {
    error: true,
    message: 'Account is inactive',
    statusCode: 403
  };
}

// Verify password (simplified - use proper bcrypt in production)
const [salt, hash] = storedHash.split(':');
const crypto = require('crypto');
const verifyHash = crypto.pbkdf2Sync(inputPassword, salt, 10000, 64, 'sha512').toString('hex');

if (hash !== verifyHash) {
  return {
    error: true,
    message: 'Invalid credentials',
    statusCode: 401
  };
}

return {
  userId: $input.item.json.id,
  email: $input.item.json.email
};
```

4. **Function Node: Generate Token**
```javascript
const crypto = require('crypto');
const userId = $input.item.json.userId;

// Generate random token
const token = crypto.randomBytes(32).toString('hex');

// Set expiration (7 days from now)
const expiresAt = new Date();
expiresAt.setDate(expiresAt.getDate() + 7);

return {
  userId: userId,
  email: $input.item.json.email,
  token: token,
  expiresAt: expiresAt.toISOString()
};
```

5. **PostgreSQL Node: Create Session**
```sql
INSERT INTO sessions (user_id, token, expires_at)
VALUES ($1, $2, $3)
RETURNING id
```

6. **PostgreSQL Node: Update Last Login**
```sql
UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1
```

7. **Respond to Webhook**
```json
{
  "success": true,
  "token": "{{ $json.token }}",
  "expiresAt": "{{ $json.expiresAt }}",
  "user": {
    "id": "{{ $json.userId }}",
    "email": "{{ $json.email }}"
  }
}
```

---

### 3. GET /auth/me - Получить текущего пользователя

**Workflow:**

```
[Webhook] → [Extract Token] → [Verify Session] → [Get User] → [Return User Data]
```

1. **Webhook Node**
   - HTTP Method: GET
   - Path: /auth/me

2. **Function Node: Extract Token**
```javascript
const authHeader = $input.item.headers.authorization;

if (!authHeader || !authHeader.startsWith('Bearer ')) {
  return {
    error: true,
    message: 'No token provided',
    statusCode: 401
  };
}

const token = authHeader.substring(7);
return { token: token };
```

3. **PostgreSQL Node: Verify Session**
```sql
SELECT user_id, expires_at
FROM sessions
WHERE token = $1 AND expires_at > CURRENT_TIMESTAMP
LIMIT 1
```

4. **PostgreSQL Node: Get User**
```sql
SELECT id, email, created_at, last_login
FROM users
WHERE id = $1 AND is_active = true
```

---

### 4. POST /auth/logout - Выход

**Workflow:**

```
[Webhook] → [Extract Token] → [Delete Session] → [Return Success]
```

**PostgreSQL Node: Delete Session**
```sql
DELETE FROM sessions WHERE token = $1
```

---

## Управление загрузками

### 1. POST /uploads - Создание загрузки

**Webhook URL:** `https://your-n8n-instance.com/webhook/uploads`

**Workflow:**

```
[Webhook] → [Auth Check] → [Validate Input] → [Insert Upload] → [Log Activity] → [Trigger Processing] → [Return Response]
```

**Детали:**

1. **Webhook Node**
   - HTTP Method: POST
   - Path: /uploads
   - Authentication: Header check

2. **Function Node: Validate & Extract**
```javascript
const body = $input.item.json.body;
const userId = $input.item.json.userId; // from auth check

const contentType = body.contentType;
const allowedTypes = ['photo', 'video', 'text', 'voice'];

if (!allowedTypes.includes(contentType)) {
  return {
    error: true,
    message: 'Invalid content type',
    statusCode: 400
  };
}

// Validate required fields based on content type
if (['photo', 'video'].includes(contentType)) {
  if (!body.cloudinaryPublicId || !body.cloudinarySecureUrl) {
    return {
      error: true,
      message: 'Cloudinary data required for media uploads',
      statusCode: 400
    };
  }
}

if (['text', 'voice'].includes(contentType)) {
  if (!body.textContent) {
    return {
      error: true,
      message: 'Text content required',
      statusCode: 400
    };
  }
}

return {
  userId: userId,
  contentType: contentType,
  cloudinaryPublicId: body.cloudinaryPublicId || null,
  cloudinaryUrl: body.cloudinaryUrl || null,
  cloudinarySecureUrl: body.cloudinarySecureUrl || null,
  textContent: body.textContent || null,
  originalFilename: body.originalFilename || null,
  fileSize: body.fileSize || null,
  mimeType: body.mimeType || null
};
```

3. **PostgreSQL Node: Insert Upload**
```sql
INSERT INTO uploads (
  user_id, content_type, status,
  cloudinary_public_id, cloudinary_url, cloudinary_secure_url,
  text_content, original_filename, file_size, mime_type
) VALUES ($1, $2, 'pending', $3, $4, $5, $6, $7, $8, $9)
RETURNING id, created_at
```

4. **PostgreSQL Node: Log Activity**
```sql
INSERT INTO activity_logs (user_id, upload_id, action, details)
VALUES ($1, $2, 'upload_created', $3)
```

5. **HTTP Request Node: Trigger Processing Webhook**
   - Method: POST
   - URL: `https://your-n8n-instance.com/webhook/media-upload`
   - Headers: `X-N8N-API-KEY: {{ $env.N8N_API_KEY }}`
   - Body:
   ```json
   {
     "uploadId": "{{ $json.id }}",
     "userId": "{{ $json.userId }}",
     "contentType": "{{ $json.contentType }}",
     "cloudinaryUrl": "{{ $json.cloudinarySecureUrl }}",
     "textContent": "{{ $json.textContent }}",
     "metadata": {
       "filename": "{{ $json.originalFilename }}",
       "fileSize": "{{ $json.fileSize }}"
     }
   }
   ```

---

### 2. GET /uploads - Получить все загрузки пользователя

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

---

### 3. POST /uploads/:id/decision - Отправка решения пользователя

**Workflow:**

```
[Webhook] → [Auth Check] → [Validate Decision] → [Update Processing Result] → [Update Upload Status] → [Notify n8n] → [Return Response]
```

**Function Node: Validate Decision**
```javascript
const decision = $input.item.json.body.decision;
const allowedDecisions = ['approve', 'reject', 'retry'];

if (!allowedDecisions.includes(decision)) {
  return {
    error: true,
    message: 'Invalid decision. Must be: approve, reject, or retry',
    statusCode: 400
  };
}

return {
  uploadId: $input.item.json.params.id,
  userId: $input.item.json.userId,
  decision: decision
};
```

**PostgreSQL Node: Update Processing Result**
```sql
UPDATE processing_results
SET user_decision = $1, decision_timestamp = CURRENT_TIMESTAMP
WHERE upload_id = $2 AND user_decision IS NULL
RETURNING id
```

**PostgreSQL Node: Update Upload Status**
```sql
UPDATE uploads
SET status = CASE
  WHEN $1 = 'approve' THEN 'approved'::processing_status
  WHEN $1 = 'reject' THEN 'rejected'::processing_status
  WHEN $1 = 'retry' THEN 'pending'::processing_status
END,
processing_attempts = CASE
  WHEN $1 = 'retry' THEN processing_attempts + 1
  ELSE processing_attempts
END
WHERE id = $2
```

**HTTP Request Node: Notify n8n Decision Webhook**
```json
{
  "uploadId": "{{ $json.uploadId }}",
  "decision": "{{ $json.decision }}",
  "userId": "{{ $json.userId }}"
}
```

---

## Обработка медиа

### Webhook: /webhook/media-upload

Этот webhook получает данные о новых загрузках и выполняет обработку.

**Workflow:**

```
[Webhook] → [Validate API Key] → [Process Media] → [Send Results Back] → [Complete]
```

**1. Webhook Node**
- HTTP Method: POST
- Path: /webhook/media-upload
- Authentication: Header `X-N8N-API-KEY`

**2. Function Node: Validate API Key**
```javascript
const apiKey = $input.item.headers['x-n8n-api-key'];
const validKey = $env.N8N_API_KEY;

if (apiKey !== validKey) {
  return {
    error: true,
    message: 'Unauthorized',
    statusCode: 401
  };
}

return $input.item.json.body;
```

**3. Switch Node: Route by Content Type**
- Route 0: contentType === 'photo'
- Route 1: contentType === 'video'
- Route 2: contentType === 'text'
- Route 3: contentType === 'voice'

**4. Processing Nodes (пример для фото):**

```javascript
// Function Node: Process Photo
const uploadData = $input.item.json;

// Здесь ваша логика обработки
// Например: AI анализ, OCR, фильтры и т.д.

// Симуляция обработки
const result = {
  uploadId: uploadData.uploadId,
  resultData: {
    analyzed: true,
    colors: ['red', 'blue', 'green'],
    objects: ['person', 'building'],
    confidence: 0.95
  },
  resultPreview: 'Обнаружены объекты: person, building. Основные цвета: red, blue, green.',
  resultMediaUrl: uploadData.cloudinaryUrl // или URL обработанного изображения
};

return result;
```

**5. HTTP Request Node: Send Results to Backend**
- Method: POST
- URL: `{{ $env.FRONTEND_URL }}/api/processing-results`
- Headers: `X-N8N-API-KEY: {{ $env.N8N_API_KEY }}`
- Body: результат обработки

---

### Webhook: /webhook/user-decision

Принимает решения пользователя и выполняет соответствующие действия.

**Workflow:**

```
[Webhook] → [Validate API Key] → [Switch on Decision] → [Execute Action] → [Return Response]
```

**Switch Node: Decision Routes**

**Route: approve**
```
→ [Update Status to 'completed'] → [Final Processing] → [Notify User]
```

**Route: reject**
```
→ [Update Status to 'rejected'] → [Archive/Cleanup] → [Notify User]
```

**Route: retry**
```
→ [Reset Status to 'pending'] → [Increment Retry Counter] → [Re-trigger Processing]
```

---

## Callbacks

### POST /api/processing-results

Этот endpoint принимает результаты обработки от n8n и сохраняет их в БД.

**Создайте отдельный workflow в n8n для приема callbacks от обработки:**

**Workflow:**

```
[Webhook] → [Validate API Key] → [Insert Processing Result] → [Update Upload Status] → [Log Activity] → [Return Success]
```

**PostgreSQL Node: Insert Processing Result**
```sql
INSERT INTO processing_results (upload_id, result_data, result_preview, result_media_url)
VALUES ($1, $2::jsonb, $3, $4)
RETURNING id
```

**PostgreSQL Node: Update Upload Status**
```sql
UPDATE uploads
SET status = 'awaiting_decision'::processing_status
WHERE id = $1
```

---

## Безопасность

### 1. API Key Authentication

Для всех sensitive endpoints используйте API key проверку:

**Function Node: Check API Key**
```javascript
const apiKey = $input.item.headers['x-n8n-api-key'];
const validKey = $env.N8N_API_KEY;

if (!apiKey || apiKey !== validKey) {
  $response.statusCode = 401;
  $response.body = { error: 'Unauthorized' };
  return $response;
}

return $input.item;
```

### 2. CORS Configuration

В n8n Settings → Security → CORS:
- Разрешите домен вашего фронтенда
- Для разработки: `http://localhost:5173`
- Для production: `https://your-domain.com`

### 3. Rate Limiting

Используйте n8n Rate Limit node для ограничения частоты запросов:
- Auth endpoints: 5 запросов в минуту на IP
- Upload endpoints: 10 запросов в минуту на пользователя

### 4. Input Validation

Всегда валидируйте входящие данные:
- Email format
- Password strength
- File sizes
- Content types
- SQL injection prevention

---

## Примеры workflows

### Полный пример: Authentication Flow

**Импорт workflow JSON:**

```json
{
  "name": "Auth Register",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "auth/register",
        "responseMode": "lastNode"
      },
      "type": "n8n-nodes-base.webhook",
      "position": [250, 300]
    }
  ]
}
```

---

## Тестирование

### Тестирование endpoints с помощью curl:

**Регистрация:**
```bash
curl -X POST https://your-n8n.com/webhook/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123456"}'
```

**Вход:**
```bash
curl -X POST https://your-n8n.com/webhook/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123456"}'
```

**Создание загрузки:**
```bash
curl -X POST https://your-n8n.com/webhook/uploads \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "contentType":"photo",
    "cloudinaryPublicId":"abc123",
    "cloudinarySecureUrl":"https://res.cloudinary.com/...",
    "originalFilename":"photo.jpg"
  }'
```

---

## Мониторинг

### Рекомендуемые метрики для отслеживания:

1. **Success Rate**: Процент успешных запросов
2. **Processing Time**: Среднее время обработки
3. **Error Rate**: Количество ошибок
4. **Decision Distribution**: Соотношение approve/reject/retry

В n8n используйте Error Trigger node для отлавливания и логирования ошибок.

---

## Troubleshooting

### Проблема: "Unauthorized" при запросах

**Решение:**
- Проверьте API key в заголовке
- Убедитесь, что environment variable `N8N_API_KEY` установлена
- Проверьте, что используется правильный заголовок: `X-N8N-API-KEY`

### Проблема: "Database connection failed"

**Решение:**
- Проверьте PostgreSQL credentials
- Убедитесь, что БД доступна из n8n
- Проверьте, что schema.sql выполнена

### Проблема: "CORS error" во frontend

**Решение:**
- Добавьте домен фронтенда в CORS настройки n8n
- Проверьте, что используется правильный protocol (http vs https)

---

## Следующие шаги

1. Импортируйте workflows в n8n
2. Настройте environment variables
3. Протестируйте каждый endpoint
4. Настройте мониторинг
5. Добавьте обработку ошибок
6. Настройте production deployment

Для получения дополнительной информации смотрите [официальную документацию n8n](https://docs.n8n.io/).
