"""
Обработчик изображений для удаления зеленого экрана
"""
from PIL import Image, ImageSequence
import numpy as np
import io
import os

def remove_green_screen(image_path, output_path=None, green_threshold=200):
    """
    Удаляет зеленый фон с изображения
    """
    try:
        # Открываем изображение
        img = Image.open(image_path)
        
        # Проверяем, является ли изображение GIF
        if image_path.lower().endswith('.gif'):
            return process_gif(image_path, output_path, green_threshold)
        
        # Конвертируем в RGBA если нужно
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        
        # Преобразуем в numpy массив
        data = np.array(img)
        
        # Определяем зеленые пиксели (R < 100, G > green_threshold, B < 100)
        red, green, blue = data[:,:,0], data[:,:,1], data[:,:,2]
        green_mask = (red < 100) & (green > green_threshold) & (blue < 100)
        
        # Создаем альфа-канал
        alpha = np.ones(data.shape[:2]) * 255
        alpha[green_mask] = 0
        
        # Применяем альфа-канал
        data[:,:,3] = alpha
        
        # Создаем новое изображение
        result = Image.fromarray(data, 'RGBA')
        
        # Сохраняем или возвращаем
        if output_path:
            # Определяем формат
            ext = os.path.splitext(output_path)[1].lower()
            if ext == '.png':
                result.save(output_path, 'PNG')
            elif ext in ['.jpg', '.jpeg']:
                result.convert('RGB').save(output_path, 'JPEG')
            elif ext == '.webp':
                result.save(output_path, 'WEBP', quality=95)
            else:
                result.save(output_path)
            return output_path
        else:
            return result
            
    except Exception as e:
        print(f"Ошибка обработки изображения: {e}")
        return image_path

def process_gif(gif_path, output_path=None, green_threshold=200):
    """
    Обрабатывает GIF с зеленым экраном
    """
    try:
        gif = Image.open(gif_path)
        frames = []
        
        # Обрабатываем каждый кадр
        for frame in ImageSequence.Iterator(gif):
            # Конвертируем в RGBA
            frame = frame.convert('RGBA')
            data = np.array(frame)
            
            # Определяем зеленые пиксели
            if len(data.shape) == 3:
                red, green, blue = data[:,:,0], data[:,:,1], data[:,:,2]
                green_mask = (red < 100) & (green > green_threshold) & (blue < 100)
                
                # Создаем альфа-канал
                alpha = np.ones(data.shape[:2]) * 255
                alpha[green_mask] = 0
                
                # Применяем альфа-канал
                if data.shape[2] == 4:
                    data[:,:,3] = alpha
                else:
                    # Добавляем альфа-канал
                    data = np.dstack((data, alpha))
            
            frames.append(Image.fromarray(data, 'RGBA'))
        
        # Сохраняем результат
        if output_path:
            frames[0].save(
                output_path,
                save_all=True,
                append_images=frames[1:],
                duration=gif.info.get('duration', 100),
                loop=gif.info.get('loop', 0),
                disposal=2  # Восстановление фона для прозрачности
            )
            return output_path
        else:
            # Возвращаем первый кадр как предпросмотр
            return frames[0]
            
    except Exception as e:
        print(f"Ошибка обработки GIF: {e}")
        return gif_path