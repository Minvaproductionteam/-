"""
Обработчик медиа для Minva Messenger
"""
import os
import uuid
from PIL import Image
import image_processor

ALLOWED_EXTENSIONS = {
    'images': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'],
    'videos': ['.mp4', '.avi', '.mov', '.webm'],
    'documents': ['.pdf', '.doc', '.docx', '.txt', '.rtf'],
    'audio': ['.mp3', '.wav', '.ogg', '.m4a']
}

def process_uploaded_file(file, upload_type='general'):
    """
    Обрабатывает загруженный файл
    """
    try:
        filename = file.filename
        file_extension = os.path.splitext(filename)[1].lower()
        
        # Проверяем расширение
        allowed = False
        for extensions in ALLOWED_EXTENSIONS.values():
            if file_extension in extensions:
                allowed = True
                break
        
        if not allowed:
            return None, "Неподдерживаемый формат файла"
        
        # Генерируем уникальное имя
        unique_filename = f"{upload_type}_{uuid.uuid4()}{file_extension}"
        
        # Сохраняем файл
        upload_folder = f"uploads/{upload_type}"
        os.makedirs(upload_folder, exist_ok=True)
        file_path = os.path.join(upload_folder, unique_filename)
        
        file.save(file_path)
        
        # Обрабатываем зеленый экран для GIF и изображений
        if file_extension in ['.gif', '.png', '.jpg', '.jpeg', '.webp']:
            try:
                # Проверяем наличие зеленого фона
                processed_path = os.path.join(upload_folder, f"processed_{unique_filename}")
                image_processor.remove_green_screen(file_path, processed_path)
                
                if os.path.exists(processed_path):
                    os.remove(file_path)
                    os.rename(processed_path, file_path)
            except Exception as e:
                print(f"Ошибка обработки изображения: {e}")
        
        return unique_filename, None
        
    except Exception as e:
        print(f"Ошибка обработки файла: {e}")
        return None, str(e)

def get_file_url(filename, upload_type='general'):
    """
    Возвращает URL для доступа к файлу
    """
    return f"/uploads/{upload_type}/{filename}"

def validate_file_size(file, max_size_mb=50):
    """
    Проверяет размер файла
    """
    file.seek(0, 2)  # Перемещаемся в конец файла
    size = file.tell()  # Получаем размер
    file.seek(0)  # Возвращаемся в начало
    
    max_size = max_size_mb * 1024 * 1024  # Конвертируем в байты
    return size <= max_size