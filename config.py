"""
Minva Messenger 2.0.0 Конфигурация
"""

import os
from datetime import datetime

class Config:
    # Основные настройки
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-2026-minva')
    UPLOAD_FOLDER = 'uploads'
    MAX_CONTENT_LENGTH = 100 * 1024 * 1024  # 100MB
    
    # База данных
    DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///minva.db')
    
    # WebSocket
    SOCKETIO_ASYNC_MODE = 'eventlet'
    
    # Безопасность
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    
    # E2E Шифрование
    E2E_ENABLED = True
    ENCRYPTION_KEY = os.environ.get('ENCRYPTION_KEY', 'minva-e2e-key-2026')
    
    # Админ-панель
    ADMIN_ROLES = ['owner', 'tech_leader', 'administrator', 'moderator']
    
    # Новогодняя тема
    NEW_YEAR_START = datetime(datetime.now().year, 12, 25)
    NEW_YEAR_END = datetime(datetime.now().year + 1, 1, 14)
    
    # Цвета темы
    THEME_COLORS = {
        'light': {
            'primary': '#FFB347',
            'secondary': '#89CFF0',
            'background': '#ffffff',
            'text': '#333333'
        },
        'dark': {
            'primary': '#FFB347',
            'secondary': '#7393B3',
            'background': '#1a1a2e',
            'text': '#ffffff'
        },
        'new-year': {
            'primary': '#d32f2f',
            'secondary': '#2e7d32',
            'background': '#c62828',
            'text': '#ffffff'
        }
    }
    
    # Настройки подарков
    ALLOWED_GIFT_FORMATS = ['mp4', 'avi', 'mov', 'webp', 'gif', 'png']
    MAX_GIFT_SIZE = 50 * 1024 * 1024  # 50MB
    
    # Настройки голосовых сообщений
    MAX_VOICE_DURATION = 300  # 5 минут
    VOICE_FORMAT = 'ogg'
    
    # Мини-игры
    GAMES = ['tic_tac_toe', 'sea_battle', 'checkers']
    GAME_SESSION_TIMEOUT = 3600  # 1 час
    
    # Пути
    STATIC_FOLDER = 'static'
    TEMPLATE_FOLDER = 'templates'
