# Настройка Cloudinary

Cloudinary - облачное хранилище для медиа-файлов с мощным API для управления изображениями и видео.

## 🚀 Быстрая настройка (5 минут)

### 1. Создайте аккаунт

1. Перейдите на [cloudinary.com](https://cloudinary.com/)
2. Нажмите **Sign Up for Free**
3. Заполните форму или войдите через Google/GitHub
4. Подтвердите email

**Бесплатный план включает:**
- ✅ 25 credits/месяц
- ✅ До 25GB хранилища
- ✅ До 25GB bandwidth
- ✅ Все основные функции

---

### 2. Получите учетные данные

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

---

### 3. Создайте Upload Preset

Upload Preset - это предустановленные настройки для загрузки файлов.

#### Шаги:

1. В Dashboard перейдите в **Settings** (шестеренка в правом верхнем углу)
2. Выберите вкладку **Upload**
3. Прокрутите вниз до **Upload presets**
4. Нажмите **Add upload preset**

#### Настройки preset:

**Основные:**
- **Preset name:** `media-platform` (или любое имя)
- **Signing Mode:** ⚠️ **Unsigned** (ВАЖНО!)
- **Folder:** `media-platform` (опционально)

**Upload manipulations:**
- **Allowed formats:**
  - Images: `jpg, png, gif, webp`
  - Videos: `mp4, webm, mov, avi`
- **Max file size:** `100000000` (100MB в bytes)

**Eager transformations (опционально):**
- Можно настроить автоматическое создание thumbnails
- Пример: `c_fill,w_400,h_300` для preview

5. Нажмите **Save**
6. Скопируйте **Preset name** (например: `media-platform`)

---

### 4. Настройте .env файл

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

---

### 5. Перезапустите dev сервер

```bash
cd frontend
npm run dev
```

Dev сервер нужно перезапустить, чтобы применились новые environment variables.

---

## ✅ Проверка работы

### 1. Откройте приложение
```
http://localhost:5175/upload
```

### 2. Попробуйте загрузить файл
1. Перетащите изображение в зону загрузки
2. Или кликните и выберите файл
3. Наблюдайте прогресс бар

### 3. Проверьте в Cloudinary Dashboard
1. Перейдите на [console.cloudinary.com](https://console.cloudinary.com/)
2. Откройте **Media Library**
3. Вы должны увидеть загруженный файл в папке `media-platform`

---

## 🔧 Дополнительные настройки

### Upload Controls

В Settings → Upload можно настроить:

**File size limits:**
```
Max File Size: 100MB
Max Image Width: 10000px
Max Image Height: 10000px
Max Video Length: 300 seconds (5 минут)
```

**Auto-moderation:**
- Включите AI модерацию контента
- Блокировка неподходящих изображений

**Notifications:**
- Email уведомления при загрузке
- Webhooks для интеграции с n8n

---

### Folders Organization

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

Настраивается через параметр `folder` в API запросе.

---

### Transformations

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

---

### Security

**Upload Preset Security:**

⚠️ **Unsigned preset** - безопасен для frontend:
- Пользователи могут загружать только
- Не могут удалять или изменять настройки
- Контроль через ограничения preset

🔒 **Signed upload** - для backend:
- Требует API Secret
- Полный контроль над загрузкой
- Используйте для admin функций

**Рекомендации:**
1. Используйте Unsigned preset для пользовательских загрузок
2. Настройте лимиты (размер, формат, количество)
3. Включите модерацию контента
4. Регулярно проверяйте Media Library

---

## 📊 Мониторинг использования

### Dashboard → Analytics

Отслеживайте:
- **Storage:** Сколько места занято
- **Bandwidth:** Трафик загрузок/скачиваний
- **Transformations:** Количество обработанных изображений
- **Credits:** Использование бесплатных кредитов

### Лимиты бесплатного плана:

```
Storage:        25 GB
Bandwidth:      25 GB/месяц
Transformations: 25,000/месяц
Video seconds:  25,000/месяц
```

Если превысите лимиты - нужно будет перейти на платный план.

---

## 🐛 Troubleshooting

### Проблема: "Cloudinary not configured"

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

### Проблема: "Upload failed" / 401 Unauthorized

**Решение:**
1. Проверьте Upload Preset:
   - Должен быть **Unsigned**
   - Имя preset должно совпадать с `.env`
2. Проверьте Cloud Name:
   - Точное совпадение (case-sensitive)

### Проблема: "Invalid file type"

**Решение:**
1. Проверьте Allowed Formats в Upload Preset
2. Убедитесь, что тип файла включен:
   ```
   Images: jpg, png, gif, webp
   Videos: mp4, webm, mov
   ```

### Проблема: Файлы загружаются но не видны в Dashboard

**Решение:**
1. Обновите страницу Media Library (F5)
2. Проверьте фильтры (возможно скрыты по папке/дате)
3. Проверьте параметр `folder` в коде

---

## 🎯 Best Practices

### 1. Организация файлов
```javascript
// В cloudinaryService.ts
formData.append('folder', `media-platform/${userId}/${year}/${month}`);
```

### 2. Автоматическая оптимизация
```javascript
// Использовать в компонентах
const optimizedUrl = getOptimizedImageUrl(publicId, {
  width: 800,
  quality: 80,
  format: 'auto'
});
```

### 3. Lazy loading thumbnails
```javascript
// Для списков загрузок
const thumbnail = getVideoThumbnail(publicId);
<img src={thumbnail} loading="lazy" />
```

### 4. Cleanup старых файлов
- Настройте Auto-delete в Cloudinary
- Или используйте Lifecycle rules
- Удаляйте файлы старше 30 дней автоматически

---

## 📚 Полезные ссылки

- **Dashboard:** https://console.cloudinary.com/
- **Documentation:** https://cloudinary.com/documentation
- **Upload API:** https://cloudinary.com/documentation/image_upload_api_reference
- **Transformations:** https://cloudinary.com/documentation/image_transformations
- **React SDK:** https://cloudinary.com/documentation/react_integration

---

## ✅ Checklist настройки

- [ ] Создал аккаунт на Cloudinary
- [ ] Скопировал Cloud Name
- [ ] Скопировал API Key
- [ ] Создал Upload Preset (Unsigned)
- [ ] Настроил Allowed Formats
- [ ] Установил лимит размера файла
- [ ] Добавил данные в `.env`
- [ ] Перезапустил dev сервер
- [ ] Протестировал загрузку файла
- [ ] Проверил файл в Media Library

---

**Готово!** Теперь ваше приложение может загружать файлы в Cloudinary! 🎉
