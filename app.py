"""
Minva Messenger 2.0.0 - АБСОЛЮТНО РАБОЧАЯ ВЕРСИЯ ДЛЯ VERCEL
Все пользователи видны! Минимум нагрузки! Максимум стабильности!
"""

from flask import Flask, render_template, request, jsonify, send_from_directory, session
from flask_login import LoginManager, login_user, logout_user, login_required, current_user, UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
from functools import wraps
import os
import secrets
import uuid
import logging
import json

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__, 
            static_folder='static', 
            template_folder='templates')

# Конфигурация
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', secrets.token_hex(64))
app.config['UPLOAD_FOLDER'] = '/tmp/uploads'
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=30)
app.config['SESSION_COOKIE_SECURE'] = True
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

login_manager = LoginManager(app)
login_manager.login_view = 'login'

# ========== БАЗЫ ДАННЫХ ==========
users_db = {}              # {username: User}
users_by_id = {}           # {user_id: User}
chats_db = {}
messages_db = {}
friend_requests_db = {}
friends_db = {}
sessions_db = {}
active_games = {}
voice_messages = {}
gifts_store = {}
support_messages = {}
reports_db = {}
admin_logs = []

# ========== ЗАРЕЗЕРВИРОВАННЫЕ АККАУНТЫ ==========
RESERVED_ACCOUNTS = {
    'SLYEED': {
        'password': 'ABC098123@1234567890',
        'role': 'owner',
        'verified': True,
        'email': 'slyeed@minva.com',
        'bio': '👑 Владелец и основатель Minva Messenger',
        'status': 'Создатель мессенджера',
        'balance': 999999,
        'avatar': None
    },
    'КЕС': {
        'password': r'g[m8#Sg4a&%V8yb@=\\ylJ+{I;=$p,zjbPfd+UYS>CmR!NClu#Z+\/&L,5p:dpUS',
        'role': 'tech_leader',
        'verified': True,
        'email': 'kes@minva.com',
        'bio': '🔧 Технический лидер Minva Messenger',
        'status': 'Разрабатываю будущее',
        'balance': 999999,
        'avatar': None
    },
    'Фин и Мем': {
        'password': '03711PO',
        'role': 'moderator',
        'verified': True,
        'email': 'finimem@minva.com',
        'bio': '🛡️ Модератор Minva Messenger',
        'status': 'Слежу за порядком',
        'balance': 50000,
        'avatar': None
    }
}

# ========== МОДЕЛЬ ПОЛЬЗОВАТЕЛЯ ==========
class User(UserMixin):
    def __init__(self, user_id, username, email):
        self.id = user_id
        self.username = username
        self.email = email
        self.password_hash = None
        self.verified = False
        self.role = 'user'
        self.created_at = datetime.now()
        self.last_seen = datetime.now()
        self.is_online = False
        self.avatar = None
        self.bio = ''
        self.status = 'В сети'
        self.balance = 1000
        self.gifts_sent = 0
        self.gifts_received = 0
        self.games_won = 0
        self.games_lost = 0
        self.games_draw = 0
        self.banned = False
        self.ban_reason = None
        self.banned_until = None
        self.theme = 'auto'
        self.language = 'ru'
        self.notification_settings = {
            'messages': True,
            'friend_requests': True,
            'games': True,
            'sound': True
        }
        self.privacy_settings = {
            'show_online': 'everyone',
            'allow_messages': 'everyone',
            'allow_friend_requests': 'everyone'
        }
        self.security = {'active_sessions': []}
        self.accepted_privacy = False
        self.privacy_accepted_at = None

@login_manager.user_loader
def load_user(user_id):
    return users_by_id.get(user_id)

# ========== ДЕКОРАТОРЫ ПРАВ ==========
def owner_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not current_user.is_authenticated or current_user.role != 'owner':
            return jsonify({'success': False, 'error': 'Требуются права владельца'}), 403
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not current_user.is_authenticated or current_user.role not in ['owner', 'tech_leader', 'administrator']:
            return jsonify({'success': False, 'error': 'Требуются права администратора'}), 403
        return f(*args, **kwargs)
    return decorated

def moderator_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not current_user.is_authenticated or current_user.role not in ['owner', 'tech_leader', 'administrator', 'moderator']:
            return jsonify({'success': False, 'error': 'Требуются права модератора'}), 403
        return f(*args, **kwargs)
    return decorated

# ========== ФУНКЦИИ ==========
def create_chat(user1, user2):
    chat_id = str(uuid.uuid4())
    chats_db[chat_id] = {
        'id': chat_id,
        'type': 'private',
        'participants': [user1, user2],
        'created_at': datetime.now().isoformat(),
        'last_message': None,
        'unread_count': {user1: 0, user2: 0},
        'pinned': {user1: False, user2: False},
        'archived': {user1: False, user2: False},
        'muted': {user1: False, user2: False},
        'is_secret': False
    }
    return chat_id

def get_or_create_chat(user1, user2):
    for chat_id, chat in chats_db.items():
        if chat['type'] == 'private' and set(chat['participants']) == {user1, user2}:
            return chat_id
    return create_chat(user1, user2)

def send_friend_request(from_user, to_user):
    for req_id, req in friend_requests_db.items():
        if req['from'] == from_user and req['to'] == to_user and req['status'] == 'pending':
            return None
        if req['from'] == to_user and req['to'] == from_user and req['status'] == 'pending':
            accept_friend_request(req_id)
            return None
    
    req_id = str(uuid.uuid4())
    friend_requests_db[req_id] = {
        'id': req_id,
        'from': from_user,
        'to': to_user,
        'status': 'pending',
        'created_at': datetime.now().isoformat()
    }
    return req_id

def accept_friend_request(req_id):
    if req_id in friend_requests_db:
        req = friend_requests_db[req_id]
        if req['status'] != 'pending':
            return False
            
        req['status'] = 'accepted'
        req['accepted_at'] = datetime.now().isoformat()
        
        if req['from'] not in friends_db:
            friends_db[req['from']] = []
        if req['to'] not in friends_db:
            friends_db[req['to']] = []
        
        if req['to'] not in friends_db[req['from']]:
            friends_db[req['from']].append(req['to'])
        if req['from'] not in friends_db[req['to']]:
            friends_db[req['to']].append(req['from'])
        
        return True
    return False

def decline_friend_request(req_id):
    if req_id in friend_requests_db:
        friend_requests_db[req_id]['status'] = 'declined'
        friend_requests_db[req_id]['declined_at'] = datetime.now().isoformat()
        return True
    return False

def are_friends(user1, user2):
    return user1 in friends_db and user2 in friends_db[user1]

def check_tic_tac_toe_winner(board):
    wins = [
        [0,1,2], [3,4,5], [6,7,8],
        [0,3,6], [1,4,7], [2,5,8],
        [0,4,8], [2,4,6]
    ]
    for w in wins:
        if board[w[0]] and board[w[0]] == board[w[1]] == board[w[2]]:
            return board[w[0]]
    if '' not in board:
        return 'draw'
    return None

# ========== ИНИЦИАЛИЗАЦИЯ ==========
def create_dirs():
    dirs = ['uploads', 'uploads/gifts', 'uploads/voices', 'uploads/avatars', 
            'uploads/documents', 'uploads/media']
    for d in dirs:
        os.makedirs(os.path.join('/tmp', d), exist_ok=True)

def init_system():
    """Инициализирует систему с тестовыми данными"""
    # Зарезервированные аккаунты
    for username, info in RESERVED_ACCOUNTS.items():
        if username not in users_db:
            user = User(username, username, info['email'])
            user.password_hash = generate_password_hash(info['password'])
            user.verified = info['verified']
            user.role = info['role']
            user.bio = info['bio']
            user.status = info['status']
            user.balance = info['balance']
            user.avatar = info['avatar']
            user.accepted_privacy = True
            user.privacy_accepted_at = datetime.now()
            users_db[username] = user
            users_by_id[user.id] = user
            logger.info(f"✅ Создан зарезервированный аккаунт: {username}")
    
    # Тестовые пользователи
    test_users = [
        {'username': 'alice', 'email': 'alice@test.com', 'password': 'password123'},
        {'username': 'bob', 'email': 'bob@test.com', 'password': 'password123'},
        {'username': 'charlie', 'email': 'charlie@test.com', 'password': 'password123'},
        {'username': 'david', 'email': 'david@test.com', 'password': 'password123'},
        {'username': 'eva', 'email': 'eva@test.com', 'password': 'password123'}
    ]
    
    for test in test_users:
        if test['username'] not in users_db:
            user_id = str(uuid.uuid4())
            user = User(user_id, test['username'], test['email'])
            user.password_hash = generate_password_hash(test['password'])
            user.accepted_privacy = True
            user.privacy_accepted_at = datetime.now()
            users_db[test['username']] = user
            users_by_id[user.id] = user
            logger.info(f"✅ Создан тестовый пользователь: {test['username']}")
    
    # Тестовые подарки
    test_gifts = [
        {'name': '❤️ Сердечко', 'price': 10, 'desc': 'Анимированное сердечко', 'file': 'heart.gif'},
        {'name': '🎄 Ёлочка', 'price': 50, 'desc': 'Новогодняя ёлка', 'file': 'tree.gif'},
        {'name': '🎉 Конфетти', 'price': 20, 'desc': 'Праздничное конфетти', 'file': 'confetti.gif'},
        {'name': '🎈 Шарик', 'price': 15, 'desc': 'Воздушный шар', 'file': 'balloon.gif'},
        {'name': '🌟 Звезда', 'price': 30, 'desc': 'Сияющая звезда', 'file': 'star.gif'},
        {'name': '🎂 Тортик', 'price': 25, 'desc': 'День рождения', 'file': 'cake.gif'}
    ]
    
    for i, gift in enumerate(test_gifts):
        gift_id = f'gift_{i}'
        gifts_store[gift_id] = {
            'id': gift_id,
            'name': gift['name'],
            'price': gift['price'],
            'description': gift['desc'],
            'filename': gift['file'],
            'uploaded_by': 'SLYEED',
            'uploaded_at': datetime.now().isoformat(),
            'purchases': 0,
            'active': True
        }
    
    logger.info(f"📊 ВСЕГО ПОЛЬЗОВАТЕЛЕЙ: {len(users_db)}")
    logger.info(f"👤 СПИСОК: {list(users_db.keys())}")

# ========== API ДЛЯ ПОЛЛИНГА (ОПТИМИЗИРОВАНО) ==========
pending_updates = {}
last_poll_time = {}

@app.route('/api/poll', methods=['GET'])
@login_required
def poll_updates():
    username = current_user.username
    
    # Проверяем, не слишком ли часто запрашивают
    now = datetime.now()
    if username in last_poll_time:
        diff = (now - last_poll_time[username]).total_seconds()
        if diff < 2:  # Минимум 2 секунды между запросами
            return jsonify({'updates': [], 'throttled': True})
    
    last_poll_time[username] = now
    
    if username not in pending_updates:
        pending_updates[username] = []
    
    updates = pending_updates[username].copy()
    pending_updates[username] = []
    
    return jsonify({'updates': updates})

def add_update(username, update_type, data):
    if username not in pending_updates:
        pending_updates[username] = []
    pending_updates[username].append({
        'type': update_type,
        'data': data,
        'timestamp': datetime.now().isoformat()
    })

# ========== МАРШРУТЫ ==========
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/static/<path:path>')
def send_static(path):
    return send_from_directory('static', path)

@app.route('/uploads/<path:filename>')
@login_required
def send_upload(filename):
    tmp_path = os.path.join('/tmp', 'uploads', filename)
    if os.path.exists(tmp_path):
        return send_from_directory('/tmp/uploads', filename)
    return send_from_directory('uploads', filename)

# ========== АУТЕНТИФИКАЦИЯ ==========
@app.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        password = data.get('password', '')
        remember = data.get('remember', False)
        
        if not username or not password:
            return jsonify({'success': False, 'error': 'Заполните все поля'})
        
        logger.info(f"Попытка входа: {username}")
        
        # Проверка зарезервированных аккаунтов
        if username in RESERVED_ACCOUNTS:
            if password == RESERVED_ACCOUNTS[username]['password']:
                if username not in users_db:
                    user = User(username, username, RESERVED_ACCOUNTS[username]['email'])
                    user.password_hash = generate_password_hash(password)
                    user.verified = RESERVED_ACCOUNTS[username]['verified']
                    user.role = RESERVED_ACCOUNTS[username]['role']
                    user.bio = RESERVED_ACCOUNTS[username]['bio']
                    user.status = RESERVED_ACCOUNTS[username]['status']
                    user.balance = RESERVED_ACCOUNTS[username]['balance']
                    user.avatar = RESERVED_ACCOUNTS[username]['avatar']
                    user.accepted_privacy = True
                    user.privacy_accepted_at = datetime.now()
                    users_db[username] = user
                    users_by_id[user.id] = user
                    logger.info(f"✅ Создан аккаунт при входе: {username}")
                
                user = users_db[username]
                
                if user.banned:
                    if user.banned_until and user.banned_until > datetime.now():
                        return jsonify({'success': False, 'error': f'Забанен до {user.banned_until.strftime("%d.%m.%Y")}: {user.ban_reason}'})
                    elif not user.banned_until:
                        return jsonify({'success': False, 'error': f'Забанен навсегда: {user.ban_reason}'})
                
                user.is_online = True
                user.last_seen = datetime.now()
                
                session_id = str(uuid.uuid4())
                session_data = {
                    'id': session_id,
                    'ip': request.remote_addr,
                    'user_agent': request.user_agent.string,
                    'created_at': datetime.now().isoformat()
                }
                user.security['active_sessions'].append(session_data)
                sessions_db[session_id] = {'user_id': user.id, 'username': user.username}
                
                login_user(user, remember=remember)
                session['session_id'] = session_id
                
                logger.info(f"✅ Успешный вход: {username}")
                
                return jsonify({
                    'success': True,
                    'user': user.username,
                    'role': user.role,
                    'verified': user.verified,
                    'avatar': user.avatar,
                    'bio': user.bio,
                    'status': user.status,
                    'balance': user.balance,
                    'theme': user.theme,
                    'language': user.language,
                    'session_id': session_id
                })
        
        # Обычный пользователь
        user = users_db.get(username)
        if user and user.password_hash and check_password_hash(user.password_hash, password):
            if user.banned:
                if user.banned_until and user.banned_until > datetime.now():
                    return jsonify({'success': False, 'error': f'Забанен до {user.banned_until.strftime("%d.%m.%Y")}: {user.ban_reason}'})
                elif not user.banned_until:
                    return jsonify({'success': False, 'error': f'Забанен навсегда: {user.ban_reason}'})
            
            user.is_online = True
            user.last_seen = datetime.now()
            
            session_id = str(uuid.uuid4())
            session_data = {
                'id': session_id,
                'ip': request.remote_addr,
                'user_agent': request.user_agent.string,
                'created_at': datetime.now().isoformat()
            }
            user.security['active_sessions'].append(session_data)
            sessions_db[session_id] = {'user_id': user.id, 'username': user.username}
            
            login_user(user, remember=remember)
            session['session_id'] = session_id
            
            logger.info(f"✅ Успешный вход: {username}")
            
            return jsonify({
                'success': True,
                'user': user.username,
                'role': user.role,
                'verified': user.verified,
                'avatar': user.avatar,
                'bio': user.bio,
                'status': user.status,
                'balance': user.balance,
                'theme': user.theme,
                'language': user.language,
                'session_id': session_id
            })
        
        logger.warning(f"❌ Неудачная попытка входа: {username}")
        return jsonify({'success': False, 'error': 'Неверный логин или пароль'})
        
    except Exception as e:
        logger.error(f'Login error: {str(e)}')
        return jsonify({'success': False, 'error': 'Ошибка сервера'})

@app.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '')
        confirm = data.get('confirm_password', '')
        accepted_privacy = data.get('accepted_privacy', False)
        
        if not all([username, email, password, confirm]):
            return jsonify({'success': False, 'error': 'Заполните все поля'})
        
        if password != confirm:
            return jsonify({'success': False, 'error': 'Пароли не совпадают'})
        
        if len(password) < 6:
            return jsonify({'success': False, 'error': 'Пароль минимум 6 символов'})
        
        if username in users_db or username in RESERVED_ACCOUNTS:
            return jsonify({'success': False, 'error': 'Логин уже занят'})
        
        if not accepted_privacy:
            return jsonify({'success': False, 'error': 'Примите политику конфиденциальности'})
        
        # Проверяем email на уникальность
        for u in users_db.values():
            if isinstance(u, User) and u.email == email:
                return jsonify({'success': False, 'error': 'Email уже используется'})
        
        user_id = str(uuid.uuid4())
        user = User(user_id, username, email)
        user.password_hash = generate_password_hash(password)
        user.is_online = True
        user.last_seen = datetime.now()
        user.balance = 1000
        user.accepted_privacy = True
        user.privacy_accepted_at = datetime.now()
        
        users_db[username] = user
        users_by_id[user.id] = user
        
        session_id = str(uuid.uuid4())
        session_data = {
            'id': session_id,
            'ip': request.remote_addr,
            'user_agent': request.user_agent.string,
            'created_at': datetime.now().isoformat()
        }
        user.security['active_sessions'].append(session_data)
        sessions_db[session_id] = {'user_id': user.id, 'username': user.username}
        
        login_user(user, remember=True)
        session['session_id'] = session_id
        
        logger.info(f"✅ Новый пользователь зарегистрирован: {username}")
        logger.info(f"📊 Теперь в системе {len(users_db)} пользователей")
        
        return jsonify({
            'success': True,
            'user': user.username,
            'role': user.role,
            'verified': user.verified,
            'avatar': user.avatar,
            'bio': user.bio,
            'status': user.status,
            'balance': user.balance,
            'theme': user.theme,
            'language': user.language,
            'session_id': session_id
        })
        
    except Exception as e:
        logger.error(f'Register error: {str(e)}')
        return jsonify({'success': False, 'error': 'Ошибка сервера'})

@app.route('/api/logout', methods=['POST'])
@login_required
def api_logout():
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        
        username = current_user.username
        current_user.is_online = False
        current_user.last_seen = datetime.now()
        
        if session_id:
            current_user.security['active_sessions'] = [
                s for s in current_user.security['active_sessions'] 
                if s.get('id') != session_id
            ]
            if session_id in sessions_db:
                del sessions_db[session_id]
        
        logout_user()
        session.clear()
        
        logger.info(f"👋 Пользователь вышел: {username}")
        
        return jsonify({'success': True})
        
    except Exception as e:
        logger.error(f'Logout error: {str(e)}')
        return jsonify({'success': False, 'error': str(e)})

# ========== ПОЛЬЗОВАТЕЛИ (ИСПРАВЛЕНО) ==========
@app.route('/api/users', methods=['GET'])
@login_required
def get_users():
    """ВОЗВРАЩАЕТ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ КРОМЕ ТЕКУЩЕГО"""
    try:
        users = []
        for username, user in users_db.items():
            if isinstance(user, User) and username != current_user.username:
                users.append({
                    'username': user.username,
                    'verified': user.verified,
                    'role': user.role,
                    'is_online': user.is_online,
                    'last_seen': user.last_seen.isoformat() if user.last_seen else None,
                    'avatar': user.avatar,
                    'bio': user.bio,
                    'status': user.status,
                    'balance': user.balance
                })
        
        # Важно! Логируем для отладки
        logger.info(f"📋 Запрос пользователей: текущий={current_user.username}, найдено={len(users)}, всего={len(users_db)}")
        
        return jsonify({'users': users})
    except Exception as e:
        logger.error(f'Ошибка get_users: {str(e)}')
        return jsonify({'users': [], 'error': str(e)})

@app.route('/api/user/<username>', methods=['GET'])
@login_required
def get_user(username):
    try:
        user = users_db.get(username)
        if not user or not isinstance(user, User):
            logger.warning(f"Пользователь не найден: {username}")
            return jsonify({'error': 'Не найден'}), 404
        
        is_friend = are_friends(current_user.username, username)
        
        incoming = None
        outgoing = None
        for rid, req in friend_requests_db.items():
            if req['status'] == 'pending':
                if req['to'] == current_user.username and req['from'] == username:
                    incoming = rid
                if req['from'] == current_user.username and req['to'] == username:
                    outgoing = rid
        
        return jsonify({
            'username': user.username,
            'verified': user.verified,
            'role': user.role,
            'is_online': user.is_online,
            'last_seen': user.last_seen.isoformat() if user.last_seen else None,
            'avatar': user.avatar,
            'bio': user.bio,
            'status': user.status,
            'balance': user.balance,
            'gifts_sent': user.gifts_sent,
            'gifts_received': user.gifts_received,
            'games_won': user.games_won,
            'games_lost': user.games_lost,
            'games_draw': user.games_draw,
            'is_friend': is_friend,
            'incoming_request': incoming,
            'outgoing_request': outgoing
        })
    except Exception as e:
        logger.error(f'Ошибка get_user: {str(e)}')
        return jsonify({'error': str(e)}), 500

@app.route('/api/update_online', methods=['POST'])
@login_required
def update_online():
    """Обновление статуса онлайн (вызывается раз в 30 секунд)"""
    try:
        current_user.is_online = True
        current_user.last_seen = datetime.now()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

# ========== ДРУЗЬЯ ==========
@app.route('/api/friends', methods=['GET'])
@login_required
def get_friends():
    try:
        flist = []
        if current_user.username in friends_db:
            for f in friends_db[current_user.username]:
                user = users_db.get(f)
                if user:
                    flist.append({
                        'username': user.username,
                        'verified': user.verified,
                        'is_online': user.is_online,
                        'avatar': user.avatar,
                        'status': user.status
                    })
        return jsonify({'friends': flist})
    except Exception as e:
        logger.error(f'Ошибка get_friends: {str(e)}')
        return jsonify({'friends': [], 'error': str(e)})

@app.route('/api/friend_requests', methods=['GET'])
@login_required
def get_friend_requests():
    try:
        incoming = []
        outgoing = []
        
        for rid, req in friend_requests_db.items():
            if req['status'] == 'pending':
                if req['to'] == current_user.username:
                    user = users_db.get(req['from'])
                    if user:
                        incoming.append({
                            'id': rid,
                            'from_user': req['from'],
                            'avatar': user.avatar,
                            'verified': user.verified,
                            'created_at': req['created_at']
                        })
                elif req['from'] == current_user.username:
                    user = users_db.get(req['to'])
                    if user:
                        outgoing.append({
                            'id': rid,
                            'to_user': req['to'],
                            'avatar': user.avatar,
                            'verified': user.verified,
                            'created_at': req['created_at']
                        })
        
        return jsonify({'incoming': incoming, 'outgoing': outgoing})
    except Exception as e:
        logger.error(f'Ошибка get_friend_requests: {str(e)}')
        return jsonify({'incoming': [], 'outgoing': [], 'error': str(e)})

@app.route('/api/send_friend_request', methods=['POST'])
@login_required
def send_friend_request_route():
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        
        if not username:
            return jsonify({'success': False, 'error': 'Введите имя'})
        
        if username not in users_db:
            return jsonify({'success': False, 'error': 'Пользователь не найден'})
        
        if username == current_user.username:
            return jsonify({'success': False, 'error': 'Нельзя добавить себя'})
        
        if are_friends(current_user.username, username):
            return jsonify({'success': False, 'error': 'Уже друзья'})
        
        # Проверяем существующие запросы
        for req in friend_requests_db.values():
            if req['status'] == 'pending':
                if req['from'] == current_user.username and req['to'] == username:
                    return jsonify({'success': False, 'error': 'Запрос уже отправлен'})
                if req['from'] == username and req['to'] == current_user.username:
                    accept_friend_request(req['id'])
                    return jsonify({'success': True, 'message': 'Запрос принят (встречный)'})
        
        req_id = send_friend_request(current_user.username, username)
        
        if req_id:
            add_update(username, 'friend_request_received', {
                'request_id': req_id,
                'from_user': current_user.username,
                'from_verified': current_user.verified
            })
            
            logger.info(f"📨 Запрос в друзья от {current_user.username} к {username}")
            
            return jsonify({'success': True, 'request_id': req_id})
        else:
            return jsonify({'success': False, 'error': 'Ошибка создания запроса'})
        
    except Exception as e:
        logger.error(f'Ошибка send_friend_request: {str(e)}')
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/accept_friend_request', methods=['POST'])
@login_required
def accept_friend_request_route():
    try:
        data = request.get_json()
        req_id = data.get('request_id')
        
        if not req_id or req_id not in friend_requests_db:
            return jsonify({'success': False, 'error': 'Запрос не найден'})
        
        req = friend_requests_db[req_id]
        
        if req['to'] != current_user.username:
            return jsonify({'success': False, 'error': 'Нет прав'})
        
        if accept_friend_request(req_id):
            chat_id = get_or_create_chat(req['from'], req['to'])
            
            add_update(req['from'], 'friend_request_accepted', {
                'request_id': req_id,
                'from_user': req['from'],
                'to_user': req['to'],
                'chat_id': chat_id
            })
            
            add_update(req['to'], 'friend_request_accepted', {
                'request_id': req_id,
                'from_user': req['from'],
                'to_user': req['to'],
                'chat_id': chat_id
            })
            
            logger.info(f"✅ Запрос в друзья принят: {req['from']} и {req['to']} теперь друзья")
            
            return jsonify({'success': True, 'chat_id': chat_id})
        else:
            return jsonify({'success': False, 'error': 'Ошибка'})
        
    except Exception as e:
        logger.error(f'Ошибка accept_friend_request: {str(e)}')
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/decline_friend_request', methods=['POST'])
@login_required
def decline_friend_request_route():
    try:
        data = request.get_json()
        req_id = data.get('request_id')
        
        if not req_id or req_id not in friend_requests_db:
            return jsonify({'success': False, 'error': 'Запрос не найден'})
        
        req = friend_requests_db[req_id]
        
        if req['to'] != current_user.username:
            return jsonify({'success': False, 'error': 'Нет прав'})
        
        if decline_friend_request(req_id):
            add_update(req['from'], 'friend_request_declined', {
                'request_id': req_id,
                'from_user': req['from'],
                'to_user': req['to']
            })
            
            logger.info(f"❌ Запрос в друзья отклонен: {req['from']} -> {req['to']}")
            
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'error': 'Ошибка'})
        
    except Exception as e:
        logger.error(f'Ошибка decline_friend_request: {str(e)}')
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/remove_friend', methods=['POST'])
@login_required
def remove_friend_route():
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        
        if not username:
            return jsonify({'success': False, 'error': 'Введите имя'})
        
        if not are_friends(current_user.username, username):
            return jsonify({'success': False, 'error': 'Не друзья'})
        
        if current_user.username in friends_db and username in friends_db[current_user.username]:
            friends_db[current_user.username].remove(username)
        
        if username in friends_db and current_user.username in friends_db[username]:
            friends_db[username].remove(current_user.username)
        
        add_update(username, 'friend_removed', {'username': current_user.username})
        
        logger.info(f"👋 Друг удален: {current_user.username} удалил {username}")
        
        return jsonify({'success': True})
        
    except Exception as e:
        logger.error(f'Ошибка remove_friend: {str(e)}')
        return jsonify({'success': False, 'error': str(e)})

# ========== ЧАТЫ ==========
@app.route('/api/chats', methods=['GET'])
@login_required
def get_chats():
    try:
        chats = []
        for cid, chat in chats_db.items():
            if current_user.username in chat['participants']:
                other = [p for p in chat['participants'] if p != current_user.username]
                name = other[0] if other else 'Чат'
                
                user = users_db.get(name) if other else None
                
                chats.append({
                    'id': cid,
                    'name': name,
                    'type': chat['type'],
                    'last_message': chat.get('last_message'),
                    'unread_count': chat['unread_count'].get(current_user.username, 0),
                    'pinned': chat['pinned'].get(current_user.username, False),
                    'archived': chat['archived'].get(current_user.username, False),
                    'muted': chat['muted'].get(current_user.username, False),
                    'is_secret': chat.get('is_secret', False),
                    'is_online': user.is_online if user else False,
                    'avatar': user.avatar if user else None,
                    'verified': user.verified if user else False
                })
        
        chats.sort(key=lambda x: (
            not x['pinned'],
            x.get('last_message', {}).get('timestamp', '') if x.get('last_message') else ''
        ), reverse=True)
        
        return jsonify({'chats': chats})
        
    except Exception as e:
        logger.error(f'Ошибка get_chats: {str(e)}')
        return jsonify({'chats': [], 'error': str(e)})

@app.route('/api/create_chat', methods=['POST'])
@login_required
def create_chat_route():
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        is_secret = data.get('is_secret', False)
        
        if not username:
            return jsonify({'success': False, 'error': 'Введите имя'})
        
        if username not in users_db:
            return jsonify({'success': False, 'error': 'Пользователь не найден'})
        
        if username == current_user.username:
            return jsonify({'success': False, 'error': 'Нельзя с собой'})
        
        for cid, chat in chats_db.items():
            if chat['type'] == 'private' and set(chat['participants']) == {current_user.username, username}:
                return jsonify({'success': True, 'chat_id': cid, 'existing': True})
        
        chat_id = create_chat(current_user.username, username)
        if is_secret:
            chats_db[chat_id]['is_secret'] = True
        
        logger.info(f"💬 Создан новый чат между {current_user.username} и {username}")
        
        return jsonify({'success': True, 'chat_id': chat_id})
        
    except Exception as e:
        logger.error(f'Ошибка create_chat: {str(e)}')
        return jsonify({'success': False, 'error': str(e)})

# ========== СООБЩЕНИЯ ==========
@app.route('/api/messages/<chat_id>', methods=['GET'])
@login_required
def get_messages(chat_id):
    try:
        if chat_id not in chats_db or current_user.username not in chats_db[chat_id]['participants']:
            return jsonify({'messages': []})
        
        msgs = []
        for msg in messages_db.values():
            if msg.get('chat_id') == chat_id and not msg.get('deleted'):
                msgs.append(msg)
        
        msgs.sort(key=lambda x: x['timestamp'])
        
        if chat_id in chats_db:
            chats_db[chat_id]['unread_count'][current_user.username] = 0
        
        return jsonify({'messages': msgs})
        
    except Exception as e:
        logger.error(f'Ошибка get_messages: {str(e)}')
        return jsonify({'messages': [], 'error': str(e)})

@app.route('/api/send_message', methods=['POST'])
@login_required
def send_message_route():
    try:
        data = request.get_json()
        chat_id = data.get('chat_id')
        text = data.get('text', '').strip()
        msg_type = data.get('type', 'text')
        reply_to = data.get('reply_to')
        
        if not chat_id or chat_id not in chats_db:
            return jsonify({'success': False, 'error': 'Чат не найден'})
        
        if current_user.username not in chats_db[chat_id]['participants']:
            return jsonify({'success': False, 'error': 'Нет доступа'})
        
        if not text and msg_type == 'text':
            return jsonify({'success': False, 'error': 'Введите сообщение'})
        
        msg_id = str(uuid.uuid4())
        message = {
            'id': msg_id,
            'sender': current_user.username,
            'sender_verified': current_user.verified,
            'chat_id': chat_id,
            'text': text,
            'type': msg_type,
            'timestamp': datetime.now().isoformat(),
            'read_by': [current_user.username],
            'reactions': {},
            'edited': False,
            'deleted': False
        }
        
        if reply_to:
            message['reply_to'] = reply_to
        
        if msg_type == 'gift' and data.get('gift_id'):
            gift_id = data['gift_id']
            if gift_id in gifts_store:
                gift = gifts_store[gift_id]
                message['gift_id'] = gift_id
                message['gift_url'] = f'/uploads/gifts/{gift["filename"]}'
                message['text'] = f'🎁 {gift["name"]}'
                
                if current_user.balance >= gift['price']:
                    current_user.balance -= gift['price']
                    current_user.gifts_sent += 1
                    gift['purchases'] += 1
                    
                    for p in chats_db[chat_id]['participants']:
                        if p != current_user.username and p in users_db:
                            users_db[p].gifts_received += 1
                            users_db[p].balance += gift['price'] // 10
        
        elif msg_type == 'voice' and data.get('voice_url'):
            message['voice_url'] = data['voice_url']
            message['duration'] = data.get('duration', 0)
        
        messages_db[msg_id] = message
        
        chats_db[chat_id]['last_message'] = {
            'text': text[:50] + '...' if len(text) > 50 else text,
            'sender': current_user.username,
            'timestamp': message['timestamp']
        }
        
        for p in chats_db[chat_id]['participants']:
            if p != current_user.username:
                chats_db[chat_id]['unread_count'][p] = chats_db[chat_id]['unread_count'].get(p, 0) + 1
                add_update(p, 'new_message', message)
        
        logger.info(f"💬 Новое сообщение в чате {chat_id} от {current_user.username}")
        
        return jsonify({'success': True, 'message': message, 'balance': current_user.balance})
        
    except Exception as e:
        logger.error(f'Ошибка send_message: {str(e)}')
        return jsonify({'success': False, 'error': str(e)})

# ========== ПОДДЕРЖКА ==========
@app.route('/api/support/message', methods=['POST'])
@login_required
def send_support():
    try:
        data = request.get_json()
        message = data.get('message', '').strip()
        
        if not message:
            return jsonify({'success': False, 'error': 'Введите сообщение'})
        
        sid = str(uuid.uuid4())
        support_messages[sid] = {
            'id': sid,
            'user': current_user.username,
            'message': message,
            'timestamp': datetime.now().isoformat(),
            'status': 'pending',
            'responded_by': None,
            'response': None
        }
        
        for u in users_db.values():
            if isinstance(u, User) and u.role in ['owner', 'tech_leader', 'moderator']:
                add_update(u.username, 'new_support', {
                    'id': sid,
                    'user': current_user.username,
                    'message': message,
                    'time': datetime.now().isoformat()
                })
        
        logger.info(f"📬 Новое обращение в поддержку от {current_user.username}")
        
        return jsonify({'success': True, 'ticket_id': sid})
        
    except Exception as e:
        logger.error(f'Ошибка send_support: {str(e)}')
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/support/tickets', methods=['GET'])
@login_required
@moderator_required
def get_tickets():
    try:
        tickets = []
        for tid, t in support_messages.items():
            tickets.append({
                'id': tid,
                'user': t['user'],
                'message': t['message'],
                'timestamp': t['timestamp'],
                'status': t['status'],
                'responded_by': t['responded_by'],
                'response': t['response']
            })
        
        tickets.sort(key=lambda x: x['timestamp'], reverse=True)
        return jsonify({'tickets': tickets})
    except Exception as e:
        logger.error(f'Ошибка get_tickets: {str(e)}')
        return jsonify({'tickets': [], 'error': str(e)})

@app.route('/api/support/ticket/<tid>/respond', methods=['POST'])
@login_required
@moderator_required
def respond_ticket(tid):
    try:
        if tid not in support_messages:
            return jsonify({'success': False, 'error': 'Не найдено'})
        
        data = request.get_json()
        response = data.get('response', '').strip()
        
        if not response:
            return jsonify({'success': False, 'error': 'Введите ответ'})
        
        ticket = support_messages[tid]
        ticket['status'] = 'responded'
        ticket['responded_by'] = current_user.username
        ticket['response'] = response
        ticket['response_time'] = datetime.now().isoformat()
        
        add_update(ticket['user'], 'support_response', {
            'ticket_id': tid,
            'response': response,
            'responded_by': current_user.username,
            'time': ticket['response_time']
        })
        
        admin_logs.append({
            'id': str(uuid.uuid4()),
            'admin': current_user.username,
            'action': 'support_response',
            'details': f'Ответ на обращение {tid}',
            'timestamp': datetime.now().isoformat()
        })
        
        logger.info(f"📬 Ответ на обращение {tid} от {current_user.username}")
        
        return jsonify({'success': True})
        
    except Exception as e:
        logger.error(f'Ошибка respond_ticket: {str(e)}')
        return jsonify({'success': False, 'error': str(e)})

# ========== ЖАЛОБЫ ==========
@app.route('/api/report_user', methods=['POST'])
@login_required
def report_user():
    try:
        data = request.get_json()
        username = data.get('username')
        reason = data.get('reason', '')
        chat_id = data.get('chat_id')
        msg_id = data.get('message_id')
        
        if not username or not reason:
            return jsonify({'success': False, 'error': 'Заполните все поля'})
        
        if username not in users_db:
            return jsonify({'success': False, 'error': 'Пользователь не найден'})
        
        if username == current_user.username:
            return jsonify({'success': False, 'error': 'Нельзя на себя'})
        
        rid = str(uuid.uuid4())
        reports_db[rid] = {
            'id': rid,
            'reporter': current_user.username,
            'reported_user': username,
            'reason': reason,
            'chat_id': chat_id,
            'message_id': msg_id,
            'timestamp': datetime.now().isoformat(),
            'status': 'pending',
            'handled_by': None
        }
        
        for u in users_db.values():
            if isinstance(u, User) and u.role in ['owner', 'tech_leader', 'administrator', 'moderator']:
                add_update(u.username, 'new_report', {
                    'report_id': rid,
                    'reporter': current_user.username,
                    'reported_user': username,
                    'reason': reason
                })
        
        logger.info(f"🚩 Новая жалоба от {current_user.username} на {username}")
        
        return jsonify({'success': True, 'report_id': rid})
        
    except Exception as e:
        logger.error(f'Ошибка report_user: {str(e)}')
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/reports', methods=['GET'])
@login_required
@moderator_required
def get_reports():
    try:
        reports = []
        for rid, r in reports_db.items():
            if r['status'] == 'pending':
                reports.append({
                    'id': rid,
                    'reporter': r['reporter'],
                    'reported_user': r['reported_user'],
                    'reason': r['reason'],
                    'timestamp': r['timestamp'],
                    'status': r['status']
                })
        
        reports.sort(key=lambda x: x['timestamp'], reverse=True)
        return jsonify({'reports': reports})
    except Exception as e:
        logger.error(f'Ошибка get_reports: {str(e)}')
        return jsonify({'reports': [], 'error': str(e)})

@app.route('/api/report/<rid>/handle', methods=['POST'])
@login_required
@moderator_required
def handle_report(rid):
    try:
        if rid not in reports_db:
            return jsonify({'success': False, 'error': 'Не найдено'})
        
        data = request.get_json()
        action = data.get('action')
        
        report = reports_db[rid]
        report['status'] = action
        report['handled_by'] = current_user.username
        report['handled_at'] = datetime.now().isoformat()
        
        if action == 'accept':
            user = users_db.get(report['reported_user'])
            if user:
                user.banned = True
                user.ban_reason = f"Жалоба от {report['reporter']}: {report['reason']}"
                user.banned_until = datetime.now() + timedelta(days=1)
                user.banned_by = current_user.username
                
                add_update(user.username, 'user_banned', {
                    'reason': user.ban_reason,
                    'until': user.banned_until.isoformat() if user.banned_until else None
                })
                
                logger.info(f"⛔ Пользователь {user.username} забанен по жалобе {rid}")
        
        admin_logs.append({
            'id': str(uuid.uuid4()),
            'admin': current_user.username,
            'action': 'handle_report',
            'details': f'Жалоба #{rid}: {action}',
            'timestamp': datetime.now().isoformat()
        })
        
        return jsonify({'success': True})
        
    except Exception as e:
        logger.error(f'Ошибка handle_report: {str(e)}')
        return jsonify({'success': False, 'error': str(e)})

# ========== АДМИН-ПАНЕЛЬ ==========
@app.route('/api/admin/stats', methods=['GET'])
@login_required
@admin_required
def admin_stats():
    try:
        total_users = len([u for u in users_db.values() if isinstance(u, User)])
        online = sum(1 for u in users_db.values() if isinstance(u, User) and u.is_online)
        verified = sum(1 for u in users_db.values() if isinstance(u, User) and u.verified)
        banned = sum(1 for u in users_db.values() if isinstance(u, User) and u.banned)
        
        stats = {
            'total_users': total_users,
            'online_users': online,
            'total_chats': len(chats_db),
            'total_messages': len(messages_db),
            'verified_users': verified,
            'gifts_count': len(gifts_store),
            'active_games': len([g for g in active_games.values() if g.get('status') == 'playing']),
            'banned_users': banned,
            'reports_count': len([r for r in reports_db.values() if r['status'] == 'pending']),
            'support_tickets': len([t for t in support_messages.values() if t['status'] == 'pending'])
        }
        
        logger.info(f"📊 Статистика админ-панели: всего {total_users} пользователей")
        return jsonify(stats)
        
    except Exception as e:
        logger.error(f'Ошибка admin_stats: {str(e)}')
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/users', methods=['GET'])
@login_required
@admin_required
def admin_users():
    try:
        users = []
        for u in users_db.values():
            if isinstance(u, User) and u.username:
                users.append({
                    'username': u.username,
                    'email': u.email,
                    'verified': u.verified,
                    'role': u.role,
                    'is_online': u.is_online,
                    'last_seen': u.last_seen.isoformat() if u.last_seen else None,
                    'created_at': u.created_at.isoformat() if u.created_at else None,
                    'banned': u.banned,
                    'ban_reason': u.ban_reason,
                    'banned_until': u.banned_until.isoformat() if u.banned_until else None,
                    'balance': u.balance,
                    'avatar': u.avatar,
                    'gifts_sent': u.gifts_sent,
                    'gifts_received': u.gifts_received,
                    'games_won': u.games_won,
                    'games_lost': u.games_lost,
                    'games_draw': u.games_draw
                })
        
        users.sort(key=lambda x: x['created_at'] if x['created_at'] else '', reverse=True)
        logger.info(f"👥 Админ запрос пользователей: {len(users)}")
        return jsonify({'users': users})
    except Exception as e:
        logger.error(f'Ошибка admin_users: {str(e)}')
        return jsonify({'users': [], 'error': str(e)})

@app.route('/api/admin/verify', methods=['POST'])
@login_required
@moderator_required
def admin_verify():
    try:
        data = request.get_json()
        username = data.get('username')
        action = data.get('action')
        
        user = users_db.get(username)
        if not user:
            return jsonify({'success': False, 'error': 'Не найден'})
        
        old_verified = user.verified
        user.verified = (action == 'grant')
        
        admin_logs.append({
            'id': str(uuid.uuid4()),
            'admin': current_user.username,
            'action': 'verify',
            'details': f'{username}: {action} (было: {old_verified})',
            'timestamp': datetime.now().isoformat()
        })
        
        add_update(username, 'verification_changed', {
            'username': username,
            'verified': user.verified
        })
        
        logger.info(f"✅ Верификация изменена: {username} теперь verified={user.verified}")
        
        return jsonify({'success': True, 'verified': user.verified})
        
    except Exception as e:
        logger.error(f'Ошибка admin_verify: {str(e)}')
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/admin/ban', methods=['POST'])
@login_required
@moderator_required
def admin_ban():
    try:
        data = request.get_json()
        username = data.get('username')
        reason = data.get('reason', '')
        days = data.get('days', 1)
        
        user = users_db.get(username)
        if not user:
            return jsonify({'success': False, 'error': 'Не найден'})
        
        if user.role == 'owner':
            return jsonify({'success': False, 'error': 'Нельзя забанить владельца'})
        
        user.banned = True
        user.ban_reason = reason
        user.banned_until = datetime.now() + timedelta(days=days) if days > 0 else None
        user.banned_by = current_user.username
        
        admin_logs.append({
            'id': str(uuid.uuid4()),
            'admin': current_user.username,
            'action': 'ban',
            'details': f'{username} на {days} дн. Причина: {reason}',
            'timestamp': datetime.now().isoformat()
        })
        
        add_update(username, 'user_banned', {
            'reason': reason,
            'until': user.banned_until.isoformat() if user.banned_until else None
        })
        
        logger.info(f"⛔ Пользователь {username} забанен. Причина: {reason}")
        
        return jsonify({'success': True})
        
    except Exception as e:
        logger.error(f'Ошибка admin_ban: {str(e)}')
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/admin/unban', methods=['POST'])
@login_required
@moderator_required
def admin_unban():
    try:
        data = request.get_json()
        username = data.get('username')
        
        user = users_db.get(username)
        if not user:
            return jsonify({'success': False, 'error': 'Не найден'})
        
        user.banned = False
        user.ban_reason = None
        user.banned_until = None
        user.banned_by = None
        
        admin_logs.append({
            'id': str(uuid.uuid4()),
            'admin': current_user.username,
            'action': 'unban',
            'details': f'{username} разбанен',
            'timestamp': datetime.now().isoformat()
        })
        
        add_update(username, 'user_unbanned', {'username': username})
        
        logger.info(f"✅ Пользователь {username} разбанен")
        
        return jsonify({'success': True})
        
    except Exception as e:
        logger.error(f'Ошибка admin_unban: {str(e)}')
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/admin/role', methods=['POST'])
@login_required
@owner_required
def admin_role():
    try:
        data = request.get_json()
        username = data.get('username')
        role = data.get('role')
        
        if role not in ['tech_leader', 'administrator', 'moderator', 'user']:
            return jsonify({'success': False, 'error': 'Неверная роль'})
        
        user = users_db.get(username)
        if not user:
            return jsonify({'success': False, 'error': 'Не найден'})
        
        if username == 'SLYEED':
            return jsonify({'success': False, 'error': 'Нельзя изменить роль владельца'})
        
        old = user.role
        user.role = role
        
        admin_logs.append({
            'id': str(uuid.uuid4()),
            'admin': current_user.username,
            'action': 'role',
            'details': f'{username}: {old} -> {role}',
            'timestamp': datetime.now().isoformat()
        })
        
        add_update(username, 'role_changed', {'role': role})
        
        logger.info(f"🔄 Роль пользователя {username} изменена: {old} -> {role}")
        
        return jsonify({'success': True})
        
    except Exception as e:
        logger.error(f'Ошибка admin_role: {str(e)}')
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/admin/gifts', methods=['GET'])
@login_required
@admin_required
def admin_gifts():
    try:
        gifts = []
        for gid, gift in gifts_store.items():
            gifts.append({
                'id': gid,
                'name': gift['name'],
                'price': gift['price'],
                'description': gift['description'],
                'filename': gift['filename'],
                'uploaded_by': gift['uploaded_by'],
                'uploaded_at': gift['uploaded_at'],
                'purchases': gift['purchases'],
                'active': gift.get('active', True)
            })
        return jsonify({'gifts': gifts})
    except Exception as e:
        logger.error(f'Ошибка admin_gifts: {str(e)}')
        return jsonify({'gifts': [], 'error': str(e)})

@app.route('/api/admin/gift/update', methods=['POST'])
@login_required
@owner_required
def admin_update_gift():
    try:
        data = request.get_json()
        gift_id = data.get('gift_id')
        name = data.get('name')
        price = data.get('price')
        description = data.get('description')
        active = data.get('active', True)
        
        if gift_id not in gifts_store:
            return jsonify({'success': False, 'error': 'Подарок не найден'})
        
        gift = gifts_store[gift_id]
        if name:
            gift['name'] = name
        if price is not None:
            gift['price'] = int(price)
        if description is not None:
            gift['description'] = description
        gift['active'] = active
        
        admin_logs.append({
            'id': str(uuid.uuid4()),
            'admin': current_user.username,
            'action': 'gift_update',
            'details': f'Обновлен подарок {gift_id}',
            'timestamp': datetime.now().isoformat()
        })
        
        logger.info(f"🎁 Обновлен подарок {gift_id}: {name}")
        
        return jsonify({'success': True})
    except Exception as e:
        logger.error(f'Ошибка admin_update_gift: {str(e)}')
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/admin/logs', methods=['GET'])
@login_required
@admin_required
def get_admin_logs():
    try:
        return jsonify({'logs': admin_logs[-100:]})
    except Exception as e:
        logger.error(f'Ошибка get_admin_logs: {str(e)}')
        return jsonify({'logs': [], 'error': str(e)})

# ========== ПОДАРКИ ==========
@app.route('/api/gifts', methods=['GET'])
@login_required
def get_gifts():
    try:
        gifts = []
        for gid, gift in gifts_store.items():
            if gift.get('active', True):
                gifts.append({
                    'id': gid,
                    'name': gift['name'],
                    'price': gift['price'],
                    'description': gift['description'],
                    'filename': gift['filename'],
                    'purchases': gift['purchases']
                })
        return jsonify({'gifts': gifts})
    except Exception as e:
        logger.error(f'Ошибка get_gifts: {str(e)}')
        return jsonify({'gifts': [], 'error': str(e)})

# ========== ИГРЫ ==========
@app.route('/api/game/invite', methods=['POST'])
@login_required
def game_invite():
    try:
        data = request.get_json()
        chat_id = data.get('chat_id')
        game_type = data.get('game_type')
        
        if chat_id not in chats_db or current_user.username not in chats_db[chat_id]['participants']:
            return jsonify({'success': False, 'error': 'Чат не найден'})
        
        other = [p for p in chats_db[chat_id]['participants'] if p != current_user.username][0]
        
        game_id = str(uuid.uuid4())
        active_games[game_id] = {
            'id': game_id,
            'type': game_type,
            'players': [current_user.username, other],
            'status': 'waiting',
            'created_at': datetime.now().isoformat(),
            'current_turn': current_user.username,
            'board': [''] * 9 if game_type == 'tic_tac_toe' else None
        }
        
        add_update(other, 'game_invite', {
            'game_id': game_id,
            'type': game_type,
            'from_user': current_user.username
        })
        
        logger.info(f"🎮 Приглашение в игру от {current_user.username} к {other}")
        
        return jsonify({'success': True, 'game_id': game_id})
    except Exception as e:
        logger.error(f'Ошибка game_invite: {str(e)}')
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/game/accept', methods=['POST'])
@login_required
def game_accept():
    try:
        data = request.get_json()
        game_id = data.get('game_id')
        
        if game_id not in active_games:
            return jsonify({'success': False, 'error': 'Игра не найдена'})
        
        game = active_games[game_id]
        if current_user.username not in game['players']:
            return jsonify({'success': False, 'error': 'Нет прав'})
        
        game['status'] = 'playing'
        
        for player in game['players']:
            add_update(player, 'game_started', {
                'game_id': game_id,
                'type': game['type'],
                'players': game['players'],
                'current_turn': game['current_turn']
            })
        
        logger.info(f"🎮 Игра {game_id} началась между {game['players']}")
        
        return jsonify({'success': True})
    except Exception as e:
        logger.error(f'Ошибка game_accept: {str(e)}')
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/game/move', methods=['POST'])
@login_required
def game_move():
    try:
        data = request.get_json()
        game_id = data.get('game_id')
        move = data.get('move')
        
        if game_id not in active_games:
            return jsonify({'success': False, 'error': 'Игра не найдена'})
        
        game = active_games[game_id]
        if game['status'] != 'playing':
            return jsonify({'success': False, 'error': 'Игра не активна'})
        
        if game['current_turn'] != current_user.username:
            return jsonify({'success': False, 'error': 'Сейчас не ваш ход'})
        
        if game['type'] == 'tic_tac_toe':
            if not isinstance(move, int) or move < 0 or move > 8:
                return jsonify({'success': False, 'error': 'Неверный ход'})
            
            if game['board'][move]:
                return jsonify({'success': False, 'error': 'Клетка уже занята'})
            
            player_index = game['players'].index(current_user.username)
            symbol = 'X' if player_index == 0 else 'O'
            
            game['board'][move] = symbol
            
            winner = check_tic_tac_toe_winner(game['board'])
            
            if winner:
                game['status'] = 'finished'
                if winner == 'draw':
                    for player in game['players']:
                        user = users_db.get(player)
                        if user:
                            user.games_draw += 1
                else:
                    winner_user = game['players'][0] if winner == 'X' else game['players'][1]
                    loser_user = game['players'][1] if winner == 'X' else game['players'][0]
                    
                    users_db.get(winner_user).games_won += 1
                    users_db.get(loser_user).games_lost += 1
                
                for player in game['players']:
                    add_update(player, 'game_finished', {
                        'game_id': game_id,
                        'winner': winner if winner != 'draw' else None,
                        'board': game['board']
                    })
                
                logger.info(f"🎮 Игра {game_id} завершена. Победитель: {winner}")
            else:
                game['current_turn'] = game['players'][1] if current_user.username == game['players'][0] else game['players'][0]
                
                for player in game['players']:
                    add_update(player, 'game_move', {
                        'game_id': game_id,
                        'board': game['board'],
                        'current_turn': game['current_turn']
                    })
        
        return jsonify({'success': True})
    except Exception as e:
        logger.error(f'Ошибка game_move: {str(e)}')
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/game/leaderboard', methods=['GET'])
@login_required
def game_leaderboard():
    try:
        players = []
        for u in users_db.values():
            if isinstance(u, User) and u.username:
                total = u.games_won + u.games_lost + u.games_draw
                if total > 0:
                    win_rate = (u.games_won / total) * 100
                else:
                    win_rate = 0
                
                players.append({
                    'username': u.username,
                    'wins': u.games_won,
                    'losses': u.games_lost,
                    'draws': u.games_draw,
                    'total': total,
                    'win_rate': round(win_rate, 1),
                    'verified': u.verified
                })
        
        players.sort(key=lambda x: x['wins'], reverse=True)
        return jsonify({'leaderboard': players[:50]})
    except Exception as e:
        logger.error(f'Ошибка game_leaderboard: {str(e)}')
        return jsonify({'leaderboard': [], 'error': str(e)})

# ========== НАСТРОЙКИ ==========
@app.route('/api/settings/theme', methods=['POST'])
@login_required
def set_theme():
    try:
        data = request.get_json()
        theme = data.get('theme', 'auto')
        
        if theme not in ['light', 'dark', 'auto', 'new-year']:
            return jsonify({'success': False, 'error': 'Неверная тема'})
        
        current_user.theme = theme
        return jsonify({'success': True, 'theme': current_user.theme})
        
    except Exception as e:
        logger.error(f'Ошибка set_theme: {str(e)}')
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/settings/language', methods=['POST'])
@login_required
def set_language():
    try:
        data = request.get_json()
        language = data.get('language', 'ru')
        
        if language not in ['ru', 'en', 'es', 'de', 'fr', 'zh', 'ja']:
            return jsonify({'success': False, 'error': 'Неверный язык'})
        
        current_user.language = language
        return jsonify({'success': True, 'language': current_user.language})
        
    except Exception as e:
        logger.error(f'Ошибка set_language: {str(e)}')
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/settings/privacy', methods=['POST'])
@login_required
def update_privacy():
    try:
        data = request.get_json()
        setting = data.get('setting')
        value = data.get('value')
        
        if setting in current_user.privacy_settings:
            current_user.privacy_settings[setting] = value
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'error': 'Неверная настройка'})
    except Exception as e:
        logger.error(f'Ошибка update_privacy: {str(e)}')
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/settings/notifications', methods=['POST'])
@login_required
def update_notifications():
    try:
        data = request.get_json()
        setting = data.get('setting')
        value = data.get('value')
        
        if setting in current_user.notification_settings:
            current_user.notification_settings[setting] = value
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'error': 'Неверная настройка'})
    except Exception as e:
        logger.error(f'Ошибка update_notifications: {str(e)}')
        return jsonify({'success': False, 'error': str(e)})

# ========== СЕССИИ ==========
@app.route('/api/sessions', methods=['GET'])
@login_required
def get_sessions():
    try:
        sessions = []
        current_session_id = session.get('session_id')
        
        for s in current_user.security.get('active_sessions', []):
            sessions.append({
                'id': s['id'],
                'ip': s['ip'],
                'user_agent': s['user_agent'],
                'created_at': s['created_at'],
                'is_current': s['id'] == current_session_id
            })
        return jsonify({'sessions': sessions})
    except Exception as e:
        logger.error(f'Ошибка get_sessions: {str(e)}')
        return jsonify({'sessions': [], 'error': str(e)})

@app.route('/api/sessions/<sid>/terminate', methods=['POST'])
@login_required
def terminate_session(sid):
    try:
        sessions = current_user.security.get('active_sessions', [])
        current_user.security['active_sessions'] = [s for s in sessions if s.get('id') != sid]
        
        if sid in sessions_db:
            del sessions_db[sid]
        
        if sid == session.get('session_id'):
            logout_user()
            session.clear()
        
        return jsonify({'success': True})
    except Exception as e:
        logger.error(f'Ошибка terminate_session: {str(e)}')
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/sessions/terminate_all', methods=['POST'])
@login_required
def terminate_all_sessions():
    try:
        current_session_id = session.get('session_id')
        
        current_user.security['active_sessions'] = [
            s for s in current_user.security.get('active_sessions', []) 
            if s.get('id') == current_session_id
        ]
        
        for sid in list(sessions_db.keys()):
            if sid != current_session_id:
                del sessions_db[sid]
        
        return jsonify({'success': True})
    except Exception as e:
        logger.error(f'Ошибка terminate_all_sessions: {str(e)}')
        return jsonify({'success': False, 'error': str(e)})

# ========== ГОЛОСОВЫЕ СООБЩЕНИЯ ==========
@app.route('/api/voice/upload', methods=['POST'])
@login_required
def upload_voice():
    try:
        if 'audio' not in request.files:
            return jsonify({'success': False, 'error': 'Файл не найден'})
        
        file = request.files['audio']
        duration = request.form.get('duration', 0)
        
        if not file:
            return jsonify({'success': False, 'error': 'Пустой файл'})
        
        filename = f"voice_{uuid.uuid4()}.ogg"
        filepath = os.path.join('/tmp', 'uploads', 'voices', filename)
        
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        file.save(filepath)
        
        voice_id = str(uuid.uuid4())
        voice_messages[voice_id] = {
            'id': voice_id,
            'filename': filename,
            'duration': int(duration),
            'uploaded_by': current_user.username,
            'uploaded_at': datetime.now().isoformat()
        }
        
        logger.info(f"🎤 Голосовое сообщение от {current_user.username}")
        
        return jsonify({
            'success': True,
            'voice_url': f'/uploads/voices/{filename}',
            'voice_id': voice_id,
            'duration': duration
        })
    except Exception as e:
        logger.error(f'Ошибка upload_voice: {str(e)}')
        return jsonify({'success': False, 'error': str(e)})

# ========== HEALTH CHECK ==========
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'ok', 
        'version': '2.0.0',
        'users': len(users_db),
        'chats': len(chats_db),
        'messages': len(messages_db)
    })

# ========== ЗАПУСК ==========
if __name__ == '__main__':
    create_dirs()
    init_system()
    
    print("=" * 80)
    print("MINVA MESSENGER 2.0.0 - АБСОЛЮТНО РАБОЧАЯ ВЕРСИЯ")
    print("=" * 80)
    print("Сайт: https://minva-messenger20.vercel.app")
    print()
    print(f"📊 В БД: {len(users_db)} пользователей")
    print("👤 Список всех пользователей:")
    for username in users_db.keys():
        print(f"   - {username}")
    print()
    print("👑 ВЛАДЕЛЕЦ: SLYEED")
    print("🔧 ТЕХЛИДЕР: КЕС")
    print("🛡️ МОДЕРАТОР: Фин и Мем")
    print("=" * 80)
    print("🚀 Режим: СТАБИЛЬНЫЙ | Polling: 3 сек | Онлайн обновление: 30 сек")
    print("=" * 80)
    
    app.run(debug=True, host='0.0.0.0', port=3000)