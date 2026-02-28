import os
from PIL import Image, ImageDraw, ImageFont

def create_gift(filename, text, color):
    """Создает GIF-изображение для подарка"""
    img = Image.new('RGBA', (100, 100), color)
    draw = ImageDraw.Draw(img)
    
    # Пробуем загрузить шрифт, если нет - используем дефолтный
    try:
        font = ImageFont.truetype("arial.ttf", 40)
    except:
        font = ImageFont.load_default()
    
    # Рисуем текст
    draw.text((30, 30), text, fill="white", font=font)
    
    # Сохраняем
    img.save(filename, format='GIF')

def main():
    # Создаем папку
    os.makedirs('uploads/gifts', exist_ok=True)
    
    # Создаем подарки
    gifts = [
        ('heart.gif', '❤️', (255, 0, 0, 255)),
        ('tree.gif', '🎄', (0, 128, 0, 255)),
        ('confetti.gif', '🎉', (128, 0, 128, 255)),
        ('balloon.gif', '🎈', (255, 165, 0, 255)),
        ('star.gif', '🌟', (255, 215, 0, 255)),
        ('cake.gif', '🎂', (255, 192, 203, 255))
    ]
    
    for filename, text, color in gifts:
        path = os.path.join('uploads/gifts', filename)
        create_gift(path, text, color)
        print(f"✅ Создан: {path}")

if __name__ == '__main__':
    main()