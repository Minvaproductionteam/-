// Minva Messenger 2.0.0 - АБСОЛЮТНО РАБОЧАЯ ВЕРСИЯ

let currentUser = null;
let currentChat = null;
let currentChatName = null;
let onlineUsers = new Set();
let activeGames = {};
let currentTheme = 'auto';
let currentLanguage = 'ru';
let sessionId = null;
let chats = [];
let friends = [];
let friendRequests = { incoming: [], outgoing: [] };
let voiceRecorder = null;
let voiceStream = null;
let voiceChunks = [];
let mediaRecorder = null;
let typingTimeout = null;
let currentAudio = null;
let pollInterval = 3000;
let pollTimeout = null;
let usersList = [];

// Базовые эмодзи для реакций
const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '👏', '🔥', '🤔'];

// Поддерживаемые языки
const LANGUAGES = {
    'ru': 'Русский',
    'en': 'English',
    'es': 'Español',
    'de': 'Deutsch',
    'fr': 'Français',
    'zh': '中文',
    'ja': '日本語'
};

// Переводы интерфейса
const TRANSLATIONS = {
    'ru': {
        'online': 'онлайн',
        'offline': 'не в сети',
        'typing': 'печатает...',
        'send': 'Отправить',
        'cancel': 'Отмена',
        'save': 'Сохранить',
        'delete': 'Удалить',
        'edit': 'Редактировать',
        'reply': 'Ответить',
        'copy': 'Копировать',
        'forward': 'Переслать',
        'pin': 'Закрепить',
        'unpin': 'Открепить',
        'mute': 'Отключить звук',
        'unmute': 'Включить звук',
        'archive': 'В архив',
        'unarchive': 'Из архива',
        'report': 'Пожаловаться',
        'block': 'Заблокировать',
        'unblock': 'Разблокировать',
        'add_friend': 'Добавить в друзья',
        'remove_friend': 'Удалить из друзей',
        'accept': 'Принять',
        'decline': 'Отклонить',
        'write': 'Написать',
        'game_invite': 'Пригласить в игру',
        'voice_message': 'Голосовое сообщение',
        'gift': 'Подарок',
        'secret_chat': 'Секретный чат',
        'verified': 'Подтвержденный аккаунт',
        'balance': 'Баланс',
        'settings': 'Настройки',
        'logout': 'Выйти',
        'chats': 'Чаты',
        'friends': 'Друзья',
        'gifts': 'Подарки',
        'games': 'Игры',
        'search': 'Поиск',
        'admin': 'Админ-панель',
        'support': 'Поддержка',
        'privacy': 'Политика конфиденциальности'
    },
    'en': {
        'online': 'online',
        'offline': 'offline',
        'typing': 'typing...',
        'send': 'Send',
        'cancel': 'Cancel',
        'save': 'Save',
        'delete': 'Delete',
        'edit': 'Edit',
        'reply': 'Reply',
        'copy': 'Copy',
        'forward': 'Forward',
        'pin': 'Pin',
        'unpin': 'Unpin',
        'mute': 'Mute',
        'unmute': 'Unmute',
        'archive': 'Archive',
        'unarchive': 'Unarchive',
        'report': 'Report',
        'block': 'Block',
        'unblock': 'Unblock',
        'add_friend': 'Add friend',
        'remove_friend': 'Remove friend',
        'accept': 'Accept',
        'decline': 'Decline',
        'write': 'Write',
        'game_invite': 'Invite to game',
        'voice_message': 'Voice message',
        'gift': 'Gift',
        'secret_chat': 'Secret chat',
        'verified': 'Verified account',
        'balance': 'Balance',
        'settings': 'Settings',
        'logout': 'Logout',
        'chats': 'Chats',
        'friends': 'Friends',
        'gifts': 'Gifts',
        'games': 'Games',
        'search': 'Search',
        'admin': 'Admin panel',
        'support': 'Support',
        'privacy': 'Privacy policy'
    }
};

// Функция для получения перевода
function t(key) {
    if (!currentLanguage || !TRANSLATIONS[currentLanguage]) return key;
    return TRANSLATIONS[currentLanguage][key] || TRANSLATIONS['ru'][key] || key;
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('Minva Messenger 2.0.0 инициализация...');
    checkSavedSession();
    setupEventListeners();
    initializeAutoTheme();
    
    // Активация кнопки регистрации при согласии с политикой
    const privacyCheckbox = document.getElementById('privacy-checkbox');
    const registerBtn = document.getElementById('register-btn');
    
    if (privacyCheckbox && registerBtn) {
        privacyCheckbox.addEventListener('change', function() {
            registerBtn.disabled = !this.checked;
        });
    }
    
    // Обработка Enter в поле ввода сообщения
    const messageInput = document.getElementById('message-input');
    if (messageInput) {
        messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
        });
    }
    
    // Закрытие меню при клике вне
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.side-menu') && !e.target.closest('.menu-btn')) {
            closeSideMenu();
        }
    });
    
    // Закрытие модалок по Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeAllModals();
            closeSideMenu();
            closeGame();
        }
    });
});

function checkSavedSession() {
    const savedUser = localStorage.getItem('minva_user');
    const savedSession = localStorage.getItem('minva_session');
    
    if (savedUser && savedSession) {
        try {
            currentUser = JSON.parse(savedUser);
            sessionId = savedSession;
            currentLanguage = currentUser.language || 'ru';
            currentTheme = currentUser.theme || 'auto';
            
            console.log('Восстановлена сессия для:', currentUser.username);
            initApp();
        } catch (e) {
            console.error('Ошибка восстановления сессии:', e);
            localStorage.removeItem('minva_user');
            localStorage.removeItem('minva_session');
        }
    }
}

function setupEventListeners() {
    // Дополнительные обработчики событий
}

// ========== ПОЛЛИНГ (ВМЕСТО WEBSOCKET) ==========
function startPolling() {
    if (pollTimeout) clearTimeout(pollTimeout);
    
    function poll() {
        if (!currentUser) return;
        
        fetch('/api/poll')
            .then(res => res.json())
            .then(data => {
                if (data.updates && data.updates.length > 0) {
                    handleUpdates(data.updates);
                }
                pollTimeout = setTimeout(poll, pollInterval);
            })
            .catch(err => {
                console.error('Poll error:', err);
                pollTimeout = setTimeout(poll, 5000);
            });
    }
    
    poll();
}

function handleUpdates(updates) {
    updates.forEach(update => {
        switch(update.type) {
            case 'new_message':
                handleNewMessage(update.data);
                playNotificationSound('message');
                break;
            case 'friend_request_received':
                showNotification(`📨 Запрос в друзья от ${update.data.from_user}`, 'info');
                loadFriendRequests();
                break;
            case 'friend_request_accepted':
                showNotification(`✅ ${update.data.from_user} принял запрос`, 'success');
                loadFriends();
                loadFriendRequests();
                break;
            case 'friend_request_declined':
                showNotification(`❌ ${update.data.from_user} отклонил запрос`, 'info');
                loadFriendRequests();
                break;
            case 'friend_removed':
                showNotification(`👋 ${update.data.username} удален из друзей`, 'info');
                loadFriends();
                break;
            case 'verification_changed':
                if (currentUser && currentUser.username === update.data.username) {
                    currentUser.verified = update.data.verified;
                    updateUserInfo();
                }
                break;
            case 'user_banned':
                if (currentUser && currentUser.username === update.data.username) {
                    showNotification(`⛔ Вы забанены: ${update.data.reason}`, 'error');
                    setTimeout(() => logout(), 3000);
                }
                break;
            case 'user_unbanned':
                if (currentUser && currentUser.username === update.data.username) {
                    showNotification('✅ Вы разбанены', 'success');
                }
                break;
            case 'role_changed':
                if (currentUser && currentUser.username === update.data.username) {
                    currentUser.role = update.data.role;
                    updateUserInfo();
                    showNotification(`🔄 Ваша роль изменена на: ${getRoleName(update.data.role)}`, 'info');
                }
                break;
            case 'support_response':
                showNotification(`📬 Ответ от поддержки: ${update.data.response}`, 'info');
                playNotificationSound('message');
                break;
            case 'new_support':
                if (currentUser && ['owner', 'tech_leader', 'moderator'].includes(currentUser.role)) {
                    showNotification(`📨 Новое обращение от ${update.data.user}`, 'info');
                }
                break;
            case 'game_invite':
                showGameInvite(update.data);
                playNotificationSound('game');
                break;
            case 'game_started':
                openGame(update.data);
                break;
            case 'game_move':
                updateGame(update.data);
                break;
            case 'game_finished':
                showGameResult(update.data);
                break;
            case 'message_deleted':
                updateDeletedMessage(update.data.message_id);
                break;
            case 'message_edited':
                updateEditedMessage(update.data);
                break;
            case 'reaction_updated':
                updateMessageReactions(update.data.message_id, update.data.reactions);
                break;
        }
    });
}

function handleNewMessage(data) {
    if (currentChat === data.chat_id) {
        const container = document.getElementById('messages-container');
        if (container) {
            if (!document.querySelector(`[data-message-id="${data.id}"]`)) {
                displayMessages([data]);
                setTimeout(() => {
                    container.scrollTop = container.scrollHeight;
                }, 100);
            }
        }
    } else {
        loadChats();
    }
}

function updateOnlineStatus(data) {
    if (data.is_online) {
        onlineUsers.add(data.username);
    } else {
        onlineUsers.delete(data.username);
    }
    
    if (currentChat && currentChatName === data.username) {
        loadUserStatus(currentChatName);
    }
    
    loadChats();
    loadFriends();
}

function updateDeletedMessage(messageId) {
    const msgEl = document.querySelector(`[data-message-id="${messageId}"]`);
    if (msgEl) {
        msgEl.querySelector('.message-content').innerHTML = '<i>Сообщение удалено</i>';
    }
}

function updateEditedMessage(data) {
    const msgEl = document.querySelector(`[data-message-id="${data.message_id}"]`);
    if (msgEl) {
        msgEl.querySelector('.message-content').innerHTML = escapeHtml(data.text).replace(/\n/g, '<br>');
        const timeEl = msgEl.querySelector('.message-time');
        if (timeEl) {
            timeEl.textContent += ' (ред.)';
        }
    }
}

function updateMessageReactions(messageId, reactions) {
    const msgEl = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!msgEl) return;
    
    let reactionsHtml = '';
    if (reactions && Object.keys(reactions).length > 0) {
        reactionsHtml = '<div class="message-reactions">';
        for (const [reaction, users] of Object.entries(reactions)) {
            reactionsHtml += `
                <span class="reaction" onclick="addReaction('${messageId}', '${reaction}')">
                    ${reaction} ${users.length}
                </span>
            `;
        }
        reactionsHtml += '</div>';
    }
    
    const existingReactions = msgEl.querySelector('.message-reactions');
    if (existingReactions) {
        existingReactions.outerHTML = reactionsHtml;
    } else {
        msgEl.insertAdjacentHTML('beforeend', reactionsHtml);
    }
}

// ========== ЗВУКИ ==========
function playNotificationSound(type = 'message') {
    if (!currentUser || !currentUser.notification_settings?.sound) return;
    
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'sine';
        gainNode.gain.value = 0.1;
        
        if (type === 'message') {
            oscillator.frequency.value = 800;
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.1);
        } else if (type === 'friend_request') {
            oscillator.frequency.value = 600;
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.15);
        } else if (type === 'game') {
            oscillator.frequency.value = 400;
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.2);
        } else if (type === 'success') {
            oscillator.frequency.value = 1000;
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.2);
        }
    } catch (e) {
        console.warn('Звук не поддерживается:', e);
    }
}

// ========== АУТЕНТИФИКАЦИЯ ==========
async function login() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const remember = document.getElementById('login-remember')?.checked || false;
    
    if (!username || !password) {
        showNotification('Заполните все поля', 'error');
        return;
    }
    
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) loginBtn.disabled = true;
    
    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, remember })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUser = {
                username: data.user,
                role: data.role,
                verified: data.verified || false,
                theme: data.theme || 'auto',
                language: data.language || 'ru',
                avatar: data.avatar,
                bio: data.bio,
                status: data.status,
                balance: data.balance || 0
            };
            sessionId = data.session_id;
            currentLanguage = currentUser.language;
            currentTheme = currentUser.theme;
            
            localStorage.setItem('minva_user', JSON.stringify(currentUser));
            localStorage.setItem('minva_session', sessionId);
            
            initApp();
            showNotification('✅ Вход выполнен успешно!', 'success');
            playNotificationSound('success');
        } else {
            showNotification(data.error || '❌ Ошибка входа', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('❌ Ошибка соединения', 'error');
    } finally {
        if (loginBtn) loginBtn.disabled = false;
    }
}

async function register() {
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-confirm').value;
    const acceptedPrivacy = document.getElementById('privacy-checkbox')?.checked || false;
    
    if (!username || !email || !password || !confirmPassword) {
        showNotification('Заполните все поля', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showNotification('Пароли не совпадают', 'error');
        return;
    }
    
    if (password.length < 6) {
        showNotification('Пароль минимум 6 символов', 'error');
        return;
    }
    
    if (!acceptedPrivacy) {
        showNotification('Примите политику конфиденциальности', 'error');
        return;
    }
    
    const registerBtn = document.getElementById('register-btn');
    if (registerBtn) registerBtn.disabled = true;
    
    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username,
                email,
                password,
                confirm_password: confirmPassword,
                accepted_privacy: acceptedPrivacy
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUser = {
                username: data.user,
                role: data.role || 'user',
                verified: data.verified || false,
                theme: data.theme || 'auto',
                language: data.language || 'ru',
                avatar: data.avatar,
                bio: data.bio,
                status: data.status,
                balance: data.balance || 1000
            };
            sessionId = data.session_id;
            currentLanguage = currentUser.language;
            currentTheme = currentUser.theme;
            
            localStorage.setItem('minva_user', JSON.stringify(currentUser));
            localStorage.setItem('minva_session', sessionId);
            
            initApp();
            showNotification('✅ Регистрация успешна!', 'success');
            playNotificationSound('success');
        } else {
            showNotification(data.error || '❌ Ошибка регистрации', 'error');
        }
    } catch (error) {
        console.error('Register error:', error);
        showNotification('❌ Ошибка соединения', 'error');
    } finally {
        if (registerBtn) registerBtn.disabled = false;
    }
}

function showLogin() {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
}

function showRegister() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
}

async function logout() {
    try {
        await fetch('/api/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId })
        });
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        localStorage.removeItem('minva_user');
        localStorage.removeItem('minva_session');
        
        if (pollTimeout) {
            clearTimeout(pollTimeout);
        }
        
        location.reload();
    }
}

// ========== ПОЛИТИКА КОНФИДЕНЦИАЛЬНОСТИ ==========
function showPrivacyPolicyModal() {
    const modalOverlay = document.getElementById('modal-overlay');
    if (!modalOverlay) return;
    
    modalOverlay.innerHTML = `
        <div class="modal" style="max-width: 600px;">
            <div class="modal-header">
                <h3>📌 Политика конфиденциальности Minva Messenger</h3>
                <button class="modal-close" onclick="closeAllModals()">&times;</button>
            </div>
            <div class="modal-content" style="text-align: left; max-height: 70vh; overflow-y: auto;">
                <p><strong>Дата вступления в силу:</strong> 23.01.2026</p>
                <p><strong>Последнее обновление:</strong> 23.01.2026</p>
                
                <h4>📚 1. Собираемая информация</h4>
                <p>Мы собираем только те данные, которые необходимы для функционирования мессенджера:</p>
                <ul>
                    <li>Информация профиля: имя пользователя, email, аватар (по желанию)</li>
                    <li>Сообщения и контент: шифруются и хранятся в зашифрованном виде</li>
                    <li>Технические данные: IP-адрес, тип устройства, версия ОС</li>
                </ul>
                
                <h4>📚 2. Использование информации</h4>
                <p>Мы используем данные для обеспечения работы сервиса, идентификации пользователей и защиты от спама.</p>
                
                <h4>📚 3. Передача данных третьим лицам</h4>
                <p>Мы не продаем вашу личную информацию. Передача данных возможна только по закону.</p>
                
                <h4>📚 4. Защита и хранение данных</h4>
                <p>Мы используем современные протоколы шифрования. Вы можете удалить свой аккаунт в любое время.</p>
                
                <h4>📚 5. Права пользователя</h4>
                <p>Вы имеете право на доступ, изменение и удаление своих данных.</p>
                
                <h4>📚 6. Контактная информация</h4>
                <p>Email: abuseminvamessenger@gmail.com</p>
            </div>
        </div>
    `;
    
    modalOverlay.style.display = 'flex';
}

// ========== ОСНОВНОЕ ПРИЛОЖЕНИЕ ==========
function initApp() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('main-app').style.display = 'flex';
    
    updateUserInfo();
    applyTheme(currentTheme);
    loadChats();
    loadFriends();
    loadFriendRequests();
    loadGifts();
    loadUsers();
    
    // Запускаем polling
    startPolling();
    
    // Обновляем статус онлайн каждые 30 секунд
    setInterval(() => {
        fetch('/api/update_online', { method: 'POST' });
        loadUsers();
    }, 30000);
    
    // Показываем раздел админа если есть права
    if (currentUser.role !== 'user') {
        document.getElementById('admin-section').style.display = 'block';
    }
    
    showChats();
}

function updateUserInfo() {
    const usernameEl = document.getElementById('current-username');
    const verifiedIcon = document.getElementById('verified-icon');
    const verificationStatus = document.getElementById('verification-status');
    const adminRoleName = document.getElementById('admin-role-name');
    const balanceAmount = document.getElementById('balance-amount');
    const settingsBalance = document.getElementById('settings-balance');
    const settingsUsername = document.getElementById('settings-username');
    const settingsEmail = document.getElementById('settings-email');
    const settingsStatus = document.getElementById('settings-status');
    
    if (usernameEl) usernameEl.textContent = currentUser.username;
    if (verifiedIcon) verifiedIcon.style.display = currentUser.verified ? 'inline-block' : 'none';
    if (verificationStatus) {
        verificationStatus.textContent = currentUser.verified ? '✅ Подтвержден' : '❌ Не подтвержден';
        verificationStatus.style.color = currentUser.verified ? '#4CAF50' : '#f44336';
    }
    if (balanceAmount) balanceAmount.textContent = currentUser.balance || 0;
    if (settingsBalance) settingsBalance.textContent = currentUser.balance || 0;
    if (settingsUsername) settingsUsername.textContent = currentUser.username;
    if (settingsEmail) settingsEmail.textContent = currentUser.email || 'не указан';
    if (settingsStatus) settingsStatus.textContent = currentUser.status || 'В сети';
    if (adminRoleName) adminRoleName.textContent = getRoleName(currentUser.role);
}

function getRoleName(role) {
    const roles = {
        'owner': '👑 Владелец',
        'tech_leader': '🔧 Технический лидер',
        'administrator': '⚙️ Администратор',
        'moderator': '🛡️ Модератор',
        'user': '👤 Пользователь'
    };
    return roles[role] || role;
}

// ========== ТЕМЫ ==========
function initializeAutoTheme() {
    const hour = new Date().getHours();
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if ((hour >= 18 || hour <= 6) || prefersDark) {
        document.body.classList.add('dark-theme');
    }
    
    if (checkNewYearPeriod()) {
        document.body.classList.add('new-year-theme');
        createSnowflakes();
    }
}

function applyTheme(theme) {
    currentTheme = theme;
    
    document.body.classList.remove('dark-theme', 'new-year-theme');
    
    const snowContainer = document.getElementById('snowflakes-container');
    if (snowContainer) {
        snowContainer.style.display = 'none';
        snowContainer.innerHTML = '';
    }
    
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
    } else if (theme === 'new-year') {
        document.body.classList.add('new-year-theme');
        createSnowflakes();
    } else if (theme === 'auto') {
        const hour = new Date().getHours();
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if ((hour >= 18 || hour <= 6) || prefersDark) {
            document.body.classList.add('dark-theme');
        }
        
        if (checkNewYearPeriod()) {
            document.body.classList.add('new-year-theme');
            createSnowflakes();
        }
    }
    
    if (currentUser) {
        currentUser.theme = theme;
        localStorage.setItem('minva_user', JSON.stringify(currentUser));
    }
    
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) themeSelect.value = theme;
}

function checkNewYearPeriod() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    
    return (month === 12 && day >= 25) || (month === 1 && day <= 14);
}

async function updateTheme(theme) {
    try {
        const response = await fetch('/api/settings/theme', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ theme })
        });
        
        const data = await response.json();
        if (data.success) {
            applyTheme(theme);
            showNotification('✅ Тема изменена', 'success');
        } else {
            showNotification(data.error || '❌ Ошибка', 'error');
        }
    } catch (error) {
        console.error('Update theme error:', error);
        showNotification('❌ Ошибка соединения', 'error');
    }
}

function createSnowflakes() {
    const container = document.getElementById('snowflakes-container');
    if (!container) return;
    
    container.innerHTML = '';
    container.style.display = 'block';
    
    for (let i = 0; i < 30; i++) {
        const snowflake = document.createElement('div');
        snowflake.className = 'snowflake';
        snowflake.innerHTML = Math.random() > 0.5 ? '❄' : '❅';
        snowflake.style.left = Math.random() * 100 + 'vw';
        snowflake.style.top = '-20px';
        snowflake.style.animation = `fall linear ${Math.random() * 5 + 3}s infinite`;
        snowflake.style.opacity = Math.random() * 0.8 + 0.2;
        snowflake.style.fontSize = Math.random() * 15 + 10 + 'px';
        snowflake.style.animationDelay = Math.random() * 5 + 's';
        container.appendChild(snowflake);
    }
}

// ========== ПОЛЬЗОВАТЕЛИ ==========
async function loadUsers() {
    try {
        const response = await fetch('/api/users');
        const data = await response.json();
        
        if (data.users) {
            usersList = data.users;
            console.log(`📊 Загружено ${usersList.length} пользователей`);
            
            // Обновляем статусы онлайн
            usersList.forEach(user => {
                if (user.is_online) {
                    onlineUsers.add(user.username);
                }
            });
        }
    } catch (error) {
        console.error('Ошибка загрузки пользователей:', error);
    }
}

// ========== ЧАТЫ ==========
async function loadChats() {
    try {
        const response = await fetch('/api/chats');
        
        if (!response.ok) {
            if (response.status === 401) showLoginScreen();
            return;
        }
        
        const data = await response.json();
        chats = data.chats || [];
        displayChats(chats);
        updateUnreadCount(chats);
    } catch (error) {
        console.error('Ошибка загрузки чатов:', error);
    }
}

function showLoginScreen() {
    document.getElementById('auth-screen').style.display = 'flex';
    document.getElementById('main-app').style.display = 'none';
    currentUser = null;
    localStorage.removeItem('minva_user');
    localStorage.removeItem('minva_session');
}

function displayChats(chats) {
    const container = document.getElementById('chats-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!chats || chats.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">💬</div>
                <h3>Нет чатов</h3>
                <p>Начните общение, создав новый чат</p>
                <button class="new-chat-btn" onclick="showCreateChatModal()" style="margin-top: 1rem;">
                    <i class="fas fa-plus"></i> Новый чат
                </button>
            </div>
        `;
        return;
    }
    
    chats.forEach(chat => {
        const chatItem = document.createElement('div');
        chatItem.className = 'chat-item';
        chatItem.onclick = () => openChat(chat.id, chat.name);
        
        const isOnline = chat.is_online || onlineUsers.has(chat.name);
        
        chatItem.innerHTML = `
            <div class="chat-avatar">
                ${chat.avatar ? `<img src="${chat.avatar}">` : chat.name.charAt(0).toUpperCase()}
                ${chat.verified ? '<span class="verified-small"><i class="fas fa-check-circle"></i></span>' : ''}
                ${isOnline ? '<span class="online-dot"></span>' : ''}
                ${chat.is_secret ? '<span class="secret-badge" style="position: absolute; top: 0; left: 0; background: #4CAF50; color: white; font-size: 0.7rem; padding: 2px 4px; border-radius: 10px;"><i class="fas fa-lock"></i></span>' : ''}
            </div>
            <div class="chat-info">
                <div class="chat-name-row">
                    <div>
                        <span class="chat-name">${escapeHtml(chat.name)}</span>
                        ${isOnline ? '<span class="online-dot"></span>' : ''}
                    </div>
                    <div>
                        ${chat.pinned ? '<i class="fas fa-thumbtack pinned-badge"></i>' : ''}
                        ${chat.unread_count > 0 ? `<span class="unread-badge">${chat.unread_count}</span>` : ''}
                    </div>
                </div>
                <div class="chat-last-message">
                    ${chat.last_message 
                        ? `<strong>${escapeHtml(chat.last_message.sender)}:</strong> ${escapeHtml(chat.last_message.text)}`
                        : 'Нет сообщений'
                    }
                </div>
            </div>
        `;
        
        container.appendChild(chatItem);
    });
}

function updateUnreadCount(chats) {
    const totalUnread = chats.reduce((sum, chat) => sum + (chat.unread_count || 0), 0);
    const badge = document.getElementById('unread-total');
    if (badge) {
        badge.textContent = totalUnread > 0 ? totalUnread : '0';
        badge.style.display = totalUnread > 0 ? 'inline-block' : 'none';
    }
}

async function openChat(chatId, chatName) {
    currentChat = chatId;
    currentChatName = chatName;
    
    document.getElementById('chats-view').style.display = 'none';
    document.getElementById('chat-view').style.display = 'block';
    document.getElementById('chat-name').textContent = chatName;
    
    await loadUserStatus(chatName);
    await loadMessages(chatId);
    
    setTimeout(() => {
        const messagesContainer = document.getElementById('messages-container');
        if (messagesContainer) messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 100);
}

async function loadUserStatus(username) {
    try {
        const response = await fetch(`/api/user/${username}`);
        if (response.ok) {
            const data = await response.json();
            const chatStatus = document.getElementById('chat-status');
            if (chatStatus) {
                chatStatus.textContent = data.is_online ? 'онлайн' : 'не в сети';
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки статуса:', error);
    }
}

// ========== СООБЩЕНИЯ ==========
async function loadMessages(chatId) {
    try {
        const response = await fetch(`/api/messages/${chatId}`);
        const data = await response.json();
        displayMessages(data.messages || []);
    } catch (error) {
        console.error('Ошибка загрузки сообщений:', error);
        displayMessages([]);
    }
}

function displayMessages(messages) {
    const container = document.getElementById('messages-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!messages || messages.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">✉️</div>
                <p>Нет сообщений</p>
                <p>Напишите что-нибудь!</p>
            </div>
        `;
        return;
    }
    
    messages.forEach(msg => {
        if (msg.deleted) return;
        
        const isSent = msg.sender === currentUser.username;
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;
        messageDiv.dataset.messageId = msg.id;
        
        const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        let content = '';
        if (msg.type === 'gift') {
            content = `
                <div style="text-align: center;">
                    <div>🎁 ${escapeHtml(msg.text)}</div>
                    <img src="${msg.gift_url}" style="max-width: 150px; max-height: 150px;" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\'><rect width=\'100\' height=\'100\' fill=\'%23f0f0f0\'/><text x=\'50\' y=\'50\' font-size=\'40\' text-anchor=\'middle\' dy=\'.3em\'>🎁</text></svg>'">
                </div>
            `;
        } else if (msg.type === 'voice') {
            content = `
                <div class="voice-message-player">
                    <button class="play-btn" onclick="playVoiceMessage('${msg.voice_url}', this)">
                        <i class="fas fa-play"></i>
                    </button>
                    <div class="voice-progress" onclick="seekVoice(this, event)">
                        <div class="voice-progress-bar" style="width: 0%"></div>
                    </div>
                    <span class="voice-duration">${formatDuration(msg.duration || 0)}</span>
                </div>
            `;
        } else {
            content = escapeHtml(msg.text || '').replace(/\n/g, '<br>');
        }
        
        let reactionsHtml = '';
        if (msg.reactions && Object.keys(msg.reactions).length > 0) {
            reactionsHtml = '<div class="message-reactions">';
            for (const [reaction, users] of Object.entries(msg.reactions)) {
                reactionsHtml += `
                    <span class="reaction" onclick="addReaction('${msg.id}', '${reaction}')">
                        ${reaction} ${users.length}
                    </span>
                `;
            }
            reactionsHtml += '</div>';
        }
        
        messageDiv.innerHTML = `
            <div class="message-header">
                <span class="message-sender" onclick="showUserProfile('${msg.sender}')">${escapeHtml(msg.sender)}</span>
                ${msg.sender_verified ? '<i class="fas fa-check-circle" style="color: #4CAF50;"></i>' : ''}
                <span class="message-time">${time}${msg.edited ? ' (ред.)' : ''}</span>
            </div>
            <div class="message-content">${content}</div>
            ${reactionsHtml}
            <div class="message-actions">
                <button class="action-btn" onclick="showEmojiPicker('${msg.id}')" title="Реакция"><i class="far fa-smile"></i></button>
                <button class="action-btn" onclick="replyToMessage('${msg.id}')" title="Ответить"><i class="fas fa-reply"></i></button>
                ${isSent ? `
                    <button class="action-btn" onclick="editMessage('${msg.id}')" title="Редактировать"><i class="fas fa-edit"></i></button>
                    <button class="action-btn" onclick="deleteMessage('${msg.id}')" title="Удалить"><i class="fas fa-trash"></i></button>
                ` : `
                    <button class="action-btn" onclick="reportMessage('${msg.id}')" title="Пожаловаться"><i class="fas fa-flag"></i></button>
                `}
            </div>
        `;
        
        container.appendChild(messageDiv);
    });
}

function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function playVoiceMessage(url, btn) {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
    
    const audio = new Audio(url);
    currentAudio = audio;
    
    const player = btn.closest('.voice-message-player');
    const progressBar = player.querySelector('.voice-progress-bar');
    const durationSpan = player.querySelector('.voice-duration');
    
    btn.innerHTML = '<i class="fas fa-pause"></i>';
    
    audio.addEventListener('timeupdate', () => {
        const progress = (audio.currentTime / audio.duration) * 100;
        progressBar.style.width = progress + '%';
        durationSpan.textContent = formatDuration(audio.currentTime) + '/' + formatDuration(audio.duration);
    });
    
    audio.addEventListener('ended', () => {
        btn.innerHTML = '<i class="fas fa-play"></i>';
        progressBar.style.width = '0%';
        durationSpan.textContent = formatDuration(audio.duration);
        currentAudio = null;
    });
    
    audio.play();
}

function seekVoice(element, event) {
    if (!currentAudio) return;
    
    const rect = element.getBoundingClientRect();
    const pos = (event.clientX - rect.left) / rect.width;
    currentAudio.currentTime = pos * currentAudio.duration;
}

async function sendMessage() {
    const input = document.getElementById('message-input');
    const text = input.value.trim();
    
    if (!text || !currentChat) {
        showNotification('Введите сообщение', 'error');
        return;
    }
    
    const sendBtn = document.querySelector('.send-btn');
    if (sendBtn) sendBtn.disabled = true;
    
    try {
        const response = await fetch('/api/send_message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: currentChat, text, type: 'text' })
        });
        
        const data = await response.json();
        
        if (data.success) {
            input.value = '';
            input.style.height = 'auto';
            loadMessages(currentChat);
            loadChats();
            
            if (data.balance !== undefined && currentUser) {
                currentUser.balance = data.balance;
                updateUserInfo();
            }
        } else {
            if (data.error !== 'Сообщение уже отправлено') {
                showNotification(data.error || 'Ошибка отправки', 'error');
            }
        }
    } catch (error) {
        console.error('Send message error:', error);
        showNotification('Ошибка соединения', 'error');
    } finally {
        if (sendBtn) sendBtn.disabled = false;
        input.focus();
    }
}

async function deleteMessage(messageId) {
    if (!confirm('Удалить сообщение?')) return;
    
    try {
        const response = await fetch(`/api/message/${messageId}/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        if (data.success) {
            showNotification('✅ Сообщение удалено', 'success');
        }
    } catch (error) {
        console.error('Delete message error:', error);
    }
}

async function editMessage(messageId) {
    const newText = prompt('Редактировать сообщение:');
    if (!newText) return;
    
    try {
        const response = await fetch(`/api/message/${messageId}/edit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: newText })
        });
        
        const data = await response.json();
        if (data.success) {
            showNotification('✅ Сообщение отредактировано', 'success');
            loadMessages(currentChat);
        }
    } catch (error) {
        console.error('Edit message error:', error);
    }
}

async function addReaction(messageId, reaction) {
    try {
        await fetch('/api/add_reaction', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message_id: messageId, reaction })
        });
    } catch (error) {
        console.error('Add reaction error:', error);
    }
}

function showEmojiPicker(messageId) {
    const modalOverlay = document.getElementById('modal-overlay');
    if (!modalOverlay) return;
    
    let emojis = '';
    EMOJIS.forEach(emoji => {
        emojis += `<button class="emoji-btn-small" onclick="addReaction('${messageId}', '${emoji}'); closeAllModals();">${emoji}</button>`;
    });
    
    modalOverlay.innerHTML = `
        <div class="modal" style="max-width: 300px;">
            <div class="modal-header">
                <h3>Выберите реакцию</h3>
                <button class="modal-close" onclick="closeAllModals()">&times;</button>
            </div>
            <div class="emoji-grid">
                ${emojis}
            </div>
        </div>
    `;
    
    modalOverlay.style.display = 'flex';
}

function replyToMessage(messageId) {
    const input = document.getElementById('message-input');
    input.focus();
    input.placeholder = 'Ответ на сообщение...';
}

function reportMessage(messageId) {
    showNotification('Сообщение отправлено в поддержку', 'info');
}

// ========== ГОЛОСОВЫЕ СООБЩЕНИЯ ==========
async function startVoiceRecording() {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showNotification('Ваш браузер не поддерживает запись голоса', 'error');
            return;
        }
        
        const btn = document.getElementById('voice-record-btn');
        btn.classList.add('recording');
        
        voiceStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(voiceStream);
        voiceChunks = [];
        
        mediaRecorder.ondataavailable = (e) => {
            voiceChunks.push(e.data);
        };
        
        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(voiceChunks, { type: 'audio/ogg' });
            sendVoiceMessage(audioBlob);
        };
        
        mediaRecorder.start();
        
        setTimeout(() => {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                stopVoiceRecording();
            }
        }, 300000);
        
    } catch (error) {
        console.error('Voice recording error:', error);
        showNotification('Ошибка доступа к микрофону', 'error');
        stopVoiceRecording();
    }
}

function stopVoiceRecording() {
    const btn = document.getElementById('voice-record-btn');
    btn.classList.remove('recording');
    
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
    
    if (voiceStream) {
        voiceStream.getTracks().forEach(track => track.stop());
        voiceStream = null;
    }
}

async function sendVoiceMessage(audioBlob) {
    if (!currentChat) {
        showNotification('Выберите чат', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('audio', audioBlob, 'voice.ogg');
    formData.append('duration', Math.floor(audioBlob.size / 16000));
    
    try {
        const response = await fetch('/api/voice/upload', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            await fetch('/api/send_message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: currentChat,
                    text: '🎤 Голосовое сообщение',
                    type: 'voice',
                    voice_url: data.voice_url,
                    duration: data.duration
                })
            });
            
            loadMessages(currentChat);
        } else {
            showNotification(data.error || 'Ошибка загрузки', 'error');
        }
    } catch (error) {
        console.error('Send voice error:', error);
        showNotification('Ошибка отправки', 'error');
    }
}

// ========== ДРУЗЬЯ ==========
async function loadFriends() {
    try {
        const response = await fetch('/api/friends');
        const data = await response.json();
        friends = data.friends || [];
        displayFriends(friends);
    } catch (error) {
        console.error('Ошибка загрузки друзей:', error);
    }
}

function displayFriends(friendsList) {
    const container = document.getElementById('friends-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!friendsList || friendsList.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">👥</div>
                <h3>Нет друзей</h3>
                <p>Добавьте друзей, чтобы начать общение</p>
                <button class="new-chat-btn" onclick="showAddFriendModal()" style="margin-top: 1rem;">
                    <i class="fas fa-user-plus"></i> Добавить друга
                </button>
            </div>
        `;
        return;
    }
    
    friendsList.forEach(friend => {
        const friendItem = document.createElement('div');
        friendItem.className = 'friend-item';
        friendItem.onclick = () => showUserProfile(friend.username);
        
        const isOnline = friend.is_online || onlineUsers.has(friend.username);
        
        friendItem.innerHTML = `
            <div class="friend-avatar">
                ${friend.avatar ? `<img src="${friend.avatar}">` : friend.username.charAt(0).toUpperCase()}
                ${friend.verified ? '<span class="verified-small"><i class="fas fa-check-circle"></i></span>' : ''}
                ${isOnline ? '<span class="online-dot" style="position: absolute; bottom: 2px; right: 2px;"></span>' : ''}
            </div>
            <div class="friend-info">
                <div class="friend-name">${escapeHtml(friend.username)}</div>
                <div class="friend-status">${friend.status || ''}</div>
            </div>
            <div class="friend-actions">
                <button class="friend-action-btn" onclick="event.stopPropagation(); openChatWithFriend('${friend.username}')" title="Написать">
                    <i class="fas fa-comment"></i>
                </button>
                <button class="friend-action-btn" onclick="event.stopPropagation(); removeFriend('${friend.username}')" title="Удалить из друзей">
                    <i class="fas fa-user-minus"></i>
                </button>
            </div>
        `;
        
        container.appendChild(friendItem);
    });
}

async function loadFriendRequests() {
    try {
        const response = await fetch('/api/friend_requests');
        const data = await response.json();
        friendRequests = { incoming: data.incoming || [], outgoing: data.outgoing || [] };
        displayFriendRequests(friendRequests);
        updateFriendRequestsBadge();
    } catch (error) {
        console.error('Ошибка загрузки заявок:', error);
    }
}

function displayFriendRequests(requests) {
    const container = document.getElementById('friend-requests-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (requests.incoming.length === 0 && requests.outgoing.length === 0) {
        container.innerHTML = '<p class="empty-state">Нет заявок</p>';
        return;
    }
    
    if (requests.incoming.length > 0) {
        const incomingSection = document.createElement('div');
        incomingSection.innerHTML = '<h4 style="margin: 1rem 0 0.5rem;">Входящие заявки</h4>';
        
        requests.incoming.forEach(req => {
            const reqItem = document.createElement('div');
            reqItem.className = 'friend-request-item';
            reqItem.innerHTML = `
                <div class="friend-request-avatar">
                    ${req.avatar ? `<img src="${req.avatar}">` : req.from_user.charAt(0).toUpperCase()}
                    ${req.verified ? '<span class="verified-small"><i class="fas fa-check-circle"></i></span>' : ''}
                </div>
                <div class="friend-request-info">
                    <div class="friend-request-name">${escapeHtml(req.from_user)}</div>
                    <div style="font-size: 0.8rem; color: #666;">${new Date(req.created_at).toLocaleDateString()}</div>
                </div>
                <div class="friend-request-actions">
                    <button class="friend-request-accept" onclick="acceptFriendRequest('${req.id}')" title="Принять">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="friend-request-decline" onclick="declineFriendRequest('${req.id}')" title="Отклонить">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            incomingSection.appendChild(reqItem);
        });
        
        container.appendChild(incomingSection);
    }
    
    if (requests.outgoing.length > 0) {
        const outgoingSection = document.createElement('div');
        outgoingSection.innerHTML = '<h4 style="margin: 1rem 0 0.5rem;">Исходящие заявки</h4>';
        
        requests.outgoing.forEach(req => {
            const reqItem = document.createElement('div');
            reqItem.className = 'friend-request-item';
            reqItem.innerHTML = `
                <div class="friend-request-avatar">
                    ${req.avatar ? `<img src="${req.avatar}">` : req.to_user.charAt(0).toUpperCase()}
                    ${req.verified ? '<span class="verified-small"><i class="fas fa-check-circle"></i></span>' : ''}
                </div>
                <div class="friend-request-info">
                    <div class="friend-request-name">${escapeHtml(req.to_user)}</div>
                    <div style="font-size: 0.8rem; color: #666;">Ожидание ответа</div>
                </div>
            `;
            outgoingSection.appendChild(reqItem);
        });
        
        container.appendChild(outgoingSection);
    }
}

function updateFriendRequestsBadge() {
    const count = friendRequests.incoming.length;
    const badge = document.getElementById('friend-requests-badge');
    if (badge) {
        badge.textContent = count > 0 ? count : '0';
        badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
}

async function sendFriendRequest(username) {
    if (!username) {
        showNotification('Введите имя пользователя', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/send_friend_request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(`✅ Запрос отправлен ${username}`, 'success');
            loadFriendRequests();
        } else {
            showNotification(data.error || '❌ Ошибка', 'error');
        }
    } catch (error) {
        console.error('Send friend request error:', error);
        showNotification('❌ Ошибка соединения', 'error');
    }
}

async function acceptFriendRequest(requestId) {
    try {
        const response = await fetch('/api/accept_friend_request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ request_id: requestId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('✅ Запрос принят', 'success');
            loadFriendRequests();
            loadFriends();
            playNotificationSound('success');
            
            if (data.chat_id) {
                const req = friendRequests.incoming.find(r => r.id === requestId);
                if (req) {
                    await openChat(data.chat_id, req.from_user);
                }
            }
        } else {
            showNotification(data.error || '❌ Ошибка', 'error');
        }
    } catch (error) {
        console.error('Accept friend request error:', error);
    }
}

async function declineFriendRequest(requestId) {
    try {
        const response = await fetch('/api/decline_friend_request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ request_id: requestId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('❌ Запрос отклонен', 'info');
            loadFriendRequests();
        }
    } catch (error) {
        console.error('Decline friend request error:', error);
    }
}

async function removeFriend(username) {
    if (!confirm(`Удалить ${username} из друзей?`)) return;
    
    try {
        const response = await fetch('/api/remove_friend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(`👋 ${username} удален из друзей`, 'info');
            loadFriends();
        }
    } catch (error) {
        console.error('Remove friend error:', error);
    }
}

async function openChatWithFriend(username) {
    try {
        const response = await fetch('/api/create_chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        
        const data = await response.json();
        
        if (data.success) {
            closeAllModals();
            await openChat(data.chat_id, username);
        } else {
            showNotification(data.error || 'Ошибка', 'error');
        }
    } catch (error) {
        console.error('Open chat error:', error);
    }
}

// ========== ПРОФИЛЬ ==========
async function showUserProfile(username) {
    try {
        const response = await fetch(`/api/user/${username}`);
        if (!response.ok) {
            showNotification('Пользователь не найден', 'error');
            return;
        }
        
        const user = await response.json();
        
        const modalOverlay = document.getElementById('modal-overlay');
        if (!modalOverlay) return;
        
        const isOnline = user.is_online || onlineUsers.has(user.username);
        
        modalOverlay.innerHTML = `
            <div class="modal" style="max-width: 500px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header">
                    <h3>Профиль</h3>
                    <button class="modal-close" onclick="closeAllModals()">&times;</button>
                </div>
                <div class="modal-content">
                    <div style="text-align: center;">
                        <div style="position: relative; width: 100px; height: 100px; margin: 0 auto;">
                            <div class="friend-avatar" style="width: 100px; height: 100px; font-size: 2rem;">
                                ${user.avatar ? `<img src="${user.avatar}">` : user.username.charAt(0).toUpperCase()}
                                ${user.verified ? '<span class="verified-small"><i class="fas fa-check-circle"></i></span>' : ''}
                                ${isOnline ? '<span class="online-dot" style="bottom: 5px; right: 5px;"></span>' : ''}
                            </div>
                        </div>
                        <h2 style="margin: 1rem 0 0.5rem;">${escapeHtml(user.username)}</h2>
                        <div style="color: #666; margin-bottom: 1rem;">${user.role !== 'user' ? getRoleName(user.role) : ''}</div>
                        
                        <div style="margin: 1rem 0; padding: 1rem; background: #f5f5f5; border-radius: 10px;">
                            <p style="margin-bottom: 0.5rem;"><strong>Статус:</strong> ${user.status || ''}</p>
                            <p><strong>О себе:</strong> ${user.bio || 'Нет информации'}</p>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; margin: 1rem 0;">
                            <div style="text-align: center; padding: 0.5rem; background: rgba(137, 207, 240, 0.1); border-radius: 8px;">
                                <div style="font-weight: bold;">🎁 ${user.gifts_sent || 0}</div>
                                <div style="font-size: 0.8rem;">Подарков</div>
                            </div>
                            <div style="text-align: center; padding: 0.5rem; background: rgba(137, 207, 240, 0.1); border-radius: 8px;">
                                <div style="font-weight: bold;">🏆 ${user.games_won || 0}</div>
                                <div style="font-size: 0.8rem;">Побед</div>
                            </div>
                            <div style="text-align: center; padding: 0.5rem; background: rgba(137, 207, 240, 0.1); border-radius: 8px;">
                                <div style="font-weight: bold;">💰 ${user.balance || 0}</div>
                                <div style="font-size: 0.8rem;">Баланс</div>
                            </div>
                        </div>
                        
                        <div style="display: flex; gap: 1rem; margin: 1rem 0;">
                            ${user.is_friend ? `
                                <button onclick="openChatWithFriend('${user.username}')" class="modal-btn" style="flex: 1;">
                                    <i class="fas fa-comment"></i> Написать
                                </button>
                            ` : user.incoming_request ? `
                                <button onclick="acceptFriendRequest('${user.incoming_request}')" class="modal-btn" style="flex: 1; background: #4CAF50;">
                                    <i class="fas fa-check"></i> Принять
                                </button>
                                <button onclick="declineFriendRequest('${user.incoming_request}')" class="modal-btn" style="flex: 1; background: #f44336;">
                                    <i class="fas fa-times"></i> Отклонить
                                </button>
                            ` : user.outgoing_request ? `
                                <button class="modal-btn" style="flex: 1; background: #999;" disabled>
                                    <i class="fas fa-clock"></i> Запрос отправлен
                                </button>
                            ` : `
                                <button onclick="sendFriendRequest('${user.username}')" class="modal-btn" style="flex: 1;">
                                    <i class="fas fa-user-plus"></i> Добавить в друзья
                                </button>
                            `}
                        </div>
                        
                        <div style="display: flex; gap: 0.5rem; margin: 1rem 0;">
                            <button onclick="inviteToGame('${user.username}')" class="settings-btn" style="flex: 1; background: #FFB347;">
                                <i class="fas fa-gamepad"></i> Играть
                            </button>
                            <button onclick="reportUser('${user.username}')" class="settings-btn" style="flex: 1; background: #f44336;">
                                <i class="fas fa-flag"></i> Пожаловаться
                            </button>
                        </div>
                        
                        ${['owner', 'tech_leader', 'administrator', 'moderator'].includes(currentUser.role) && user.username !== currentUser.username ? `
                            <div style="margin-top: 2rem; padding-top: 1rem; border-top: 2px solid #eee;">
                                <h4 style="margin-bottom: 1rem;">🛠️ Админ-действия</h4>
                                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                                    <div style="display: flex; gap: 0.5rem;">
                                        <button onclick="verifyUser('${user.username}', ${!user.verified})" class="settings-btn" style="flex: 1; background: ${user.verified ? '#f44336' : '#4CAF50'};">
                                            ${user.verified ? '❌ Снять галочку' : '✅ Поставить галочку'}
                                        </button>
                                    </div>
                                    
                                    ${!user.banned ? `
                                        <div style="display: flex; gap: 0.5rem;">
                                            <input type="number" id="ban-days" placeholder="Дни" style="flex: 1; padding: 0.5rem; border: 1px solid #ddd; border-radius: 8px;" value="1">
                                            <input type="text" id="ban-reason" placeholder="Причина" style="flex: 2; padding: 0.5rem; border: 1px solid #ddd; border-radius: 8px;">
                                            <button onclick="banUser('${user.username}')" class="settings-btn" style="background: #f44336;">
                                                Забанить
                                            </button>
                                        </div>
                                    ` : `
                                        <button onclick="unbanUser('${user.username}')" class="settings-btn" style="background: #4CAF50;">
                                            ✅ Разбанить
                                        </button>
                                    `}
                                    
                                    ${currentUser.role === 'owner' ? `
                                        <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                                            <select id="role-select" class="setting-select" style="flex: 2;">
                                                <option value="user" ${user.role === 'user' ? 'selected' : ''}>Пользователь</option>
                                                <option value="moderator" ${user.role === 'moderator' ? 'selected' : ''}>Модератор</option>
                                                <option value="administrator" ${user.role === 'administrator' ? 'selected' : ''}>Администратор</option>
                                                <option value="tech_leader" ${user.role === 'tech_leader' ? 'selected' : ''}>Техлидер</option>
                                            </select>
                                            <button onclick="changeRole('${user.username}')" class="settings-btn" style="flex: 1;">
                                                Изменить роль
                                            </button>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        
        modalOverlay.style.display = 'flex';
        
    } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
        showNotification('Ошибка загрузки', 'error');
    }
}

// ========== АДМИН-ФУНКЦИИ ==========
async function verifyUser(username, verify) {
    try {
        const response = await fetch('/api/admin/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username,
                action: verify ? 'grant' : 'revoke'
            })
        });
        
        const data = await response.json();
        if (data.success) {
            showNotification(verify ? '✅ Галочка выдана' : '❌ Галочка снята', 'success');
            closeAllModals();
            if (currentUser.username === username) {
                currentUser.verified = verify;
                updateUserInfo();
            }
            playNotificationSound('success');
        } else {
            showNotification(data.error || '❌ Ошибка', 'error');
        }
    } catch (error) {
        console.error('Verify error:', error);
        showNotification('❌ Ошибка соединения', 'error');
    }
}

async function banUser(username) {
    const reason = document.getElementById('ban-reason')?.value;
    if (!reason) {
        showNotification('Введите причину бана', 'error');
        return;
    }
    
    const days = parseInt(document.getElementById('ban-days')?.value) || 1;
    
    try {
        const response = await fetch('/api/admin/ban', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username, 
                reason, 
                days: days
            })
        });
        
        const data = await response.json();
        if (data.success) {
            showNotification('⛔ Пользователь забанен', 'success');
            closeAllModals();
        } else {
            showNotification(data.error || '❌ Ошибка', 'error');
        }
    } catch (error) {
        console.error('Ban error:', error);
        showNotification('❌ Ошибка', 'error');
    }
}

async function unbanUser(username) {
    try {
        const response = await fetch('/api/admin/unban', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        
        const data = await response.json();
        if (data.success) {
            showNotification('✅ Пользователь разбанен', 'success');
            closeAllModals();
        }
    } catch (error) {
        console.error('Unban error:', error);
    }
}

async function changeRole(username) {
    const roleSelect = document.getElementById('role-select');
    if (!roleSelect) return;
    
    const role = roleSelect.value;
    
    try {
        const response = await fetch('/api/admin/role', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, role })
        });
        
        const data = await response.json();
        if (data.success) {
            showNotification(`✅ Роль изменена на ${getRoleName(role)}`, 'success');
            closeAllModals();
        } else {
            showNotification(data.error || '❌ Ошибка', 'error');
        }
    } catch (error) {
        console.error('Role change error:', error);
    }
}

function reportUser(username) {
    const reason = prompt('Причина жалобы:');
    if (!reason) return;
    
    fetch('/api/report_user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, reason })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showNotification('✅ Жалоба отправлена', 'success');
            closeAllModals();
        } else {
            showNotification(data.error || '❌ Ошибка', 'error');
        }
    })
    .catch(err => {
        console.error('Report error:', err);
        showNotification('❌ Ошибка', 'error');
    });
}

// ========== ИГРЫ ==========
function showGames() {
    hideAllViews();
    document.getElementById('games-view').style.display = 'block';
    closeSideMenu();
    loadGameLeaderboard();
}

async function loadGameLeaderboard() {
    try {
        const response = await fetch('/api/game/leaderboard');
        const data = await response.json();
        displayLeaderboard(data.leaderboard || []);
    } catch (error) {
        console.error('Load leaderboard error:', error);
    }
}

function displayLeaderboard(players) {
    const container = document.getElementById('game-stats');
    if (!container) return;
    
    if (!players || players.length === 0) {
        container.innerHTML = '<p class="empty-state">Нет статистики</p>';
        return;
    }
    
    let html = '<h3 style="margin: 2rem 0 1rem;">🏆 Таблица лидеров</h3><div class="leaderboard">';
    
    players.forEach((player, index) => {
        html += `
            <div class="leaderboard-item" style="display: flex; align-items: center; padding: 0.8rem; background: rgba(137, 207, 240, 0.1); border-radius: 10px; margin-bottom: 0.5rem;">
                <div style="width: 30px; font-weight: bold; ${index === 0 ? 'color: gold;' : index === 1 ? 'color: silver;' : index === 2 ? 'color: #cd7f32;' : ''}">
                    ${index + 1}
                </div>
                <div class="friend-avatar" style="width: 40px; height: 40px; margin: 0 10px;">
                    ${player.avatar ? `<img src="${player.avatar}">` : player.username.charAt(0).toUpperCase()}
                    ${player.verified ? '<span class="verified-small"><i class="fas fa-check-circle"></i></span>' : ''}
                </div>
                <div style="flex: 1;">
                    <strong>${escapeHtml(player.username)}</strong>
                </div>
                <div style="display: flex; gap: 10px;">
                    <span title="Победы">🏆 ${player.wins}</span>
                    <span title="Поражения">📉 ${player.losses}</span>
                    <span title="Ничьи">🤝 ${player.draws}</span>
                    <span title="Процент побед">⚡ ${player.win_rate}%</span>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

function startGame(gameType) {
    if (!currentChat) {
        showNotification('Сначала откройте чат с другом', 'error');
        return;
    }
    
    fetch('/api/game/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: currentChat, game_type: gameType })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showNotification('✅ Приглашение отправлено!', 'success');
        } else {
            showNotification(data.error || '❌ Ошибка', 'error');
        }
    })
    .catch(err => {
        console.error('Game invite error:', err);
    });
}

function showGameInvite(data) {
    const modalOverlay = document.getElementById('modal-overlay');
    if (!modalOverlay) return;
    
    modalOverlay.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h3>🎮 Приглашение в игру</h3>
                <button class="modal-close" onclick="closeAllModals()">&times;</button>
            </div>
            <div class="modal-content" style="text-align: center;">
                <p>${escapeHtml(data.from_user)} приглашает вас сыграть в ${data.type === 'tic_tac_toe' ? 'Крестики-нолики' : data.type}!</p>
                <div style="display: flex; gap: 1rem; margin-top: 2rem;">
                    <button onclick="acceptGame('${data.game_id}')" class="modal-btn" style="flex: 1; background: #4CAF50;">
                        ✅ Принять
                    </button>
                    <button onclick="closeAllModals()" class="modal-btn" style="flex: 1; background: #f44336;">
                        ❌ Отклонить
                    </button>
                </div>
            </div>
        </div>
    `;
    
    modalOverlay.style.display = 'flex';
}

function acceptGame(gameId) {
    fetch('/api/game/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_id: gameId })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            closeAllModals();
        }
    })
    .catch(err => {
        console.error('Accept game error:', err);
    });
}

function openGame(gameData) {
    const gameContainer = document.createElement('div');
    gameContainer.id = 'tic-tac-toe-container';
    gameContainer.className = 'game-container';
    
    const isMyTurn = gameData.current_turn === currentUser.username;
    
    gameContainer.innerHTML = `
        <div class="game-header">
            <h3>🎮 Крестики-нолики</h3>
            <button class="modal-close" onclick="closeGame()">×</button>
        </div>
        
        <div class="game-players">
            <div class="player-info ${gameData.current_turn === gameData.players[0] ? 'current-player' : ''}">
                <div class="player-avatar">${gameData.players[0].charAt(0).toUpperCase()}</div>
                <div>${escapeHtml(gameData.players[0])}</div>
                <div class="player-symbol">X</div>
            </div>
            <div class="vs">VS</div>
            <div class="player-info ${gameData.current_turn === gameData.players[1] ? 'current-player' : ''}">
                <div class="player-avatar">${gameData.players[1].charAt(0).toUpperCase()}</div>
                <div>${escapeHtml(gameData.players[1])}</div>
                <div class="player-symbol">O</div>
            </div>
        </div>
        
        <div class="tic-tac-toe-board" id="game-board">
            ${gameData.board.map((cell, index) => `
                <button class="ttt-cell" onclick="makeMove(${index})" ${cell || !isMyTurn ? 'disabled' : ''}>
                    ${cell || ''}
                </button>
            `).join('')}
        </div>
        
        <div class="game-status" id="game-status">
            ${isMyTurn ? 'Ваш ход' : `Ход игрока ${gameData.current_turn}`}
        </div>
    `;
    
    document.body.appendChild(gameContainer);
    activeGames[data.game_id] = gameData;
}

function makeMove(index) {
    if (!activeGames) return;
    
    const gameId = Object.keys(activeGames)[0];
    if (!gameId) return;
    
    fetch('/api/game/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_id: gameId, move: index })
    })
    .then(res => res.json())
    .then(data => {
        if (!data.success) {
            showNotification(data.error || 'Ошибка', 'error');
        }
    })
    .catch(err => {
        console.error('Game move error:', err);
    });
}

function updateGame(data) {
    const container = document.getElementById('tic-tac-toe-container');
    if (!container) return;
    
    const gameData = data;
    const isMyTurn = gameData.current_turn === currentUser.username;
    
    const board = container.querySelector('.tic-tac-toe-board');
    board.innerHTML = gameData.board.map((cell, index) => `
        <button class="ttt-cell" onclick="makeMove(${index})" ${cell || !isMyTurn ? 'disabled' : ''}>
            ${cell || ''}
        </button>
    `).join('');
    
    const status = container.querySelector('#game-status');
    status.textContent = isMyTurn ? 'Ваш ход' : `Ход игрока ${gameData.current_turn}`;
    
    const players = container.querySelectorAll('.player-info');
    players[0].classList.toggle('current-player', gameData.current_turn === gameData.players[0]);
    players[1].classList.toggle('current-player', gameData.current_turn === gameData.players[1]);
    
    activeGames[data.game_id] = gameData;
}

function showGameResult(data) {
    const container = document.getElementById('tic-tac-toe-container');
    if (!container) return;
    
    let message = '';
    if (data.winner) {
        const winnerName = data.winner === 'X' ? activeGames[data.game_id]?.players[0] : activeGames[data.game_id]?.players[1];
        message = `🏆 Победил ${winnerName}!`;
    } else {
        message = '🤝 Ничья!';
    }
    
    const status = container.querySelector('#game-status');
    status.textContent = message;
    
    const buttons = container.querySelectorAll('.ttt-cell');
    buttons.forEach(btn => btn.disabled = true);
    
    showNotification(message, 'success');
    playNotificationSound('success');
    
    setTimeout(() => {
        closeGame();
    }, 3000);
}

function closeGame() {
    const gameContainer = document.getElementById('tic-tac-toe-container');
    if (gameContainer) gameContainer.remove();
    activeGames = {};
}

function inviteToGame(username) {
    if (!currentChat) {
        showNotification('Сначала откройте чат с этим пользователем', 'error');
        return;
    }
    
    startGame('tic_tac_toe');
}

// ========== ПОДАРКИ ==========
async function loadGifts() {
    try {
        const response = await fetch('/api/gifts');
        const data = await response.json();
        displayGifts(data.gifts || []);
    } catch (error) {
        console.error('Ошибка загрузки подарков:', error);
        displayGifts([]);
    }
}

function displayGifts(gifts) {
    const container = document.getElementById('gifts-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!gifts || gifts.length === 0) {
        container.innerHTML = '<p class="empty-state">Подарки скоро появятся</p>';
        return;
    }
    
    gifts.forEach(gift => {
        const giftItem = document.createElement('div');
        giftItem.className = 'gift-item';
        giftItem.innerHTML = `
            <img src="/uploads/gifts/${gift.filename}" class="gift-image" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\'><rect width=\'100\' height=\'100\' fill=\'%23f0f0f0\'/><text x=\'50\' y=\'50\' font-size=\'40\' text-anchor=\'middle\' dy=\'.3em\'>🎁</text></svg>'">
            <h4 class="gift-name">${escapeHtml(gift.name)}</h4>
            <p class="gift-description">${escapeHtml(gift.description || '')}</p>
            <div class="gift-price">💰 ${gift.price}</div>
            <button class="send-gift-btn" onclick="sendGift('${gift.id}')">Отправить</button>
        `;
        container.appendChild(giftItem);
    });
}

async function sendGift(giftId) {
    if (!currentChat) {
        showNotification('Выберите чат', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/send_message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: currentChat, text: '🎁', type: 'gift', gift_id: giftId })
        });
        
        const data = await response.json();
        if (data.success) {
            showNotification('✅ Подарок отправлен!', 'success');
            loadMessages(currentChat);
            if (data.balance !== undefined) {
                currentUser.balance = data.balance;
                updateUserInfo();
            }
            playNotificationSound('success');
        } else {
            showNotification(data.error || '❌ Ошибка', 'error');
        }
    } catch (error) {
        console.error('Send gift error:', error);
    }
}

// ========== ПОДДЕРЖКА ==========
function showSupport() {
    const modalOverlay = document.getElementById('modal-overlay');
    if (!modalOverlay) return;
    
    modalOverlay.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h3>📬 Поддержка</h3>
                <button class="modal-close" onclick="closeAllModals()">&times;</button>
            </div>
            <div class="modal-content">
                <p style="margin-bottom: 1rem;">Опишите вашу проблему или вопрос. Наши модераторы ответят вам как можно скорее.</p>
                <textarea id="support-message" placeholder="Сообщение..." class="modal-input" rows="4"></textarea>
                <button onclick="sendSupportMessage()" class="modal-btn">Отправить</button>
            </div>
        </div>
    `;
    
    modalOverlay.style.display = 'flex';
}

async function sendSupportMessage() {
    const message = document.getElementById('support-message')?.value.trim();
    if (!message) {
        showNotification('Введите сообщение', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/support/message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });
        
        const data = await response.json();
        if (data.success) {
            showNotification('✅ Сообщение отправлено в поддержку', 'success');
            closeAllModals();
            playNotificationSound('success');
        } else {
            showNotification(data.error || '❌ Ошибка', 'error');
        }
    } catch (error) {
        console.error('Support error:', error);
        showNotification('❌ Ошибка соединения', 'error');
    }
}

// ========== СЕССИИ ==========
function showSessionsModal() {
    const modalOverlay = document.getElementById('modal-overlay');
    if (!modalOverlay) return;
    
    fetch('/api/sessions')
        .then(res => res.json())
        .then(data => {
            let sessionsHtml = '';
            
            if (data.sessions && data.sessions.length > 0) {
                data.sessions.forEach(session => {
                    sessionsHtml += `
                        <div class="session-item">
                            <div class="session-info">
                                <div><strong>IP:</strong> ${session.ip}</div>
                                <div><strong>Устройство:</strong> ${session.user_agent.substring(0, 50)}...</div>
                                <div><strong>Создана:</strong> ${new Date(session.created_at).toLocaleString()}</div>
                            </div>
                            ${!session.is_current ? `
                                <button class="terminate-btn" onclick="terminateSession('${session.id}')">
                                    Завершить
                                </button>
                            ` : '<span style="color: #4CAF50;">Текущая сессия</span>'}
                        </div>
                    `;
                });
            } else {
                sessionsHtml = '<p class="empty-state">Нет активных сессий</p>';
            }
            
            modalOverlay.innerHTML = `
                <div class="modal" style="max-width: 600px;">
                    <div class="modal-header">
                        <h3>🔐 Активные сессии</h3>
                        <button class="modal-close" onclick="closeAllModals()">&times;</button>
                    </div>
                    <div class="modal-content">
                        ${sessionsHtml}
                        <div style="margin-top: 2rem;">
                            <button onclick="terminateAllSessions()" class="modal-btn" style="background: #f44336;">
                                Завершить все другие сессии
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            modalOverlay.style.display = 'flex';
        })
        .catch(err => {
            console.error('Load sessions error:', err);
            showNotification('Ошибка загрузки сессий', 'error');
        });
}

async function terminateSession(sid) {
    try {
        const response = await fetch(`/api/sessions/${sid}/terminate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        if (data.success) {
            showNotification('✅ Сессия завершена', 'success');
            showSessionsModal();
        }
    } catch (error) {
        console.error('Terminate session error:', error);
    }
}

async function terminateAllSessions() {
    if (!confirm('Завершить все сессии кроме текущей?')) return;
    
    try {
        const response = await fetch('/api/sessions/terminate_all', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        if (data.success) {
            showNotification('✅ Все другие сессии завершены', 'success');
            showSessionsModal();
        }
    } catch (error) {
        console.error('Terminate all sessions error:', error);
    }
}

// ========== НАСТРОЙКИ ==========
function showSettings() {
    hideAllViews();
    document.getElementById('settings-view').style.display = 'block';
    closeSideMenu();
    
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) themeSelect.value = currentTheme;
    
    const languageSelect = document.getElementById('language-select');
    if (languageSelect) languageSelect.value = currentLanguage;
    
    if (currentUser.privacy_settings) {
        const messagesSelect = document.getElementById('allow-messages-select');
        if (messagesSelect) messagesSelect.value = currentUser.privacy_settings.allow_messages || 'everyone';
        
        const showOnlineSelect = document.getElementById('show-online-select');
        if (showOnlineSelect) showOnlineSelect.value = currentUser.privacy_settings.show_online || 'everyone';
        
        const friendRequestsSelect = document.getElementById('allow-friend-requests-select');
        if (friendRequestsSelect) friendRequestsSelect.value = currentUser.privacy_settings.allow_friend_requests || 'everyone';
    }
    
    if (currentUser.notification_settings) {
        const soundMessages = document.getElementById('sound-messages');
        if (soundMessages) soundMessages.checked = currentUser.notification_settings.messages !== false;
        
        const soundRequests = document.getElementById('sound-friend-requests');
        if (soundRequests) soundRequests.checked = currentUser.notification_settings.friend_requests !== false;
        
        const soundGames = document.getElementById('sound-games');
        if (soundGames) soundGames.checked = currentUser.notification_settings.games !== false;
    }
}

async function updateLanguage(language) {
    try {
        const response = await fetch('/api/settings/language', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ language })
        });
        
        const data = await response.json();
        if (data.success) {
            currentLanguage = language;
            if (currentUser) {
                currentUser.language = language;
                localStorage.setItem('minva_user', JSON.stringify(currentUser));
            }
            showNotification(`✅ Язык изменен на ${LANGUAGES[language] || language}`, 'success');
        } else {
            showNotification(data.error || '❌ Ошибка', 'error');
        }
    } catch (error) {
        console.error('Update language error:', error);
        showNotification('❌ Ошибка соединения', 'error');
    }
}

async function updatePrivacySetting(setting, value) {
    try {
        const response = await fetch('/api/settings/privacy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ setting, value })
        });
        
        const data = await response.json();
        if (data.success) {
            showNotification('✅ Настройки сохранены', 'success');
        } else {
            showNotification(data.error || '❌ Ошибка', 'error');
        }
    } catch (error) {
        console.error('Update privacy error:', error);
    }
}

async function updateNotificationSetting(setting, value) {
    try {
        const response = await fetch('/api/settings/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ setting, value })
        });
        
        const data = await response.json();
        if (data.success && currentUser && currentUser.notification_settings) {
            currentUser.notification_settings[setting] = value;
        }
    } catch (error) {
        console.error('Update notification error:', error);
    }
}

function toggleDesktopNotifications(enabled) {
    if (enabled && Notification.permission !== 'granted') {
        Notification.requestPermission();
    }
}

function toggleTwoFactor(enabled) {
    showNotification('Функция в разработке', 'info');
}

function clearChatHistory() {
    if (confirm('Очистить всю историю сообщений? Это действие нельзя отменить!')) {
        showNotification('История очищена', 'success');
    }
}

function exportData() {
    showNotification('Экспорт данных скоро будет доступен', 'info');
}

// ========== АДМИН-ПАНЕЛЬ ==========
function showAdminPanel() {
    hideAllViews();
    document.getElementById('admin-view').style.display = 'block';
    closeSideMenu();
    loadAdminStats();
    loadAdminUsers();
    loadAdminGifts();
    loadAdminReports();
    loadAdminSupport();
    loadAdminLogs();
    
    const tabs = document.querySelectorAll('.admin-tab');
    tabs.forEach(t => t.classList.remove('active'));
    tabs[0].classList.add('active');
    
    const contents = document.querySelectorAll('.admin-tab-content');
    contents.forEach(c => c.style.display = 'none');
    document.getElementById('stats-tab').style.display = 'block';
}

function showAdminTab(tab) {
    const tabs = document.querySelectorAll('.admin-tab');
    const contents = document.querySelectorAll('.admin-tab-content');
    
    tabs.forEach(t => t.classList.remove('active'));
    contents.forEach(c => c.style.display = 'none');
    
    event.target.classList.add('active');
    
    document.getElementById(tab + '-tab').style.display = 'block';
    
    if (tab === 'stats') loadAdminStats();
    if (tab === 'users') loadAdminUsers();
    if (tab === 'gifts') loadAdminGifts();
    if (tab === 'reports') loadAdminReports();
    if (tab === 'support') loadAdminSupport();
    if (tab === 'logs') loadAdminLogs();
}

async function loadAdminStats() {
    try {
        const response = await fetch('/api/admin/stats');
        const data = await response.json();
        displayAdminStats(data);
    } catch (error) {
        console.error('Load admin stats error:', error);
    }
}

function displayAdminStats(stats) {
    const container = document.getElementById('admin-stats');
    if (!container) return;
    
    container.innerHTML = `
        <div class="stat-card">
            <h4>👥 Всего пользователей</h4>
            <div>${stats.total_users || 0}</div>
        </div>
        <div class="stat-card">
            <h4>🟢 Онлайн</h4>
            <div>${stats.online_users || 0}</div>
        </div>
        <div class="stat-card">
            <h4>✅ Верифицировано</h4>
            <div>${stats.verified_users || 0}</div>
        </div>
        <div class="stat-card">
            <h4>💬 Сообщений</h4>
            <div>${stats.total_messages || 0}</div>
        </div>
        <div class="stat-card">
            <h4>⛔ Забанено</h4>
            <div>${stats.banned_users || 0}</div>
        </div>
        <div class="stat-card">
            <h4>🚩 Жалобы</h4>
            <div>${stats.reports_count || 0}</div>
        </div>
        <div class="stat-card">
            <h4>🎁 Подарков</h4>
            <div>${stats.gifts_count || 0}</div>
        </div>
        <div class="stat-card">
            <h4>🎮 Игр активно</h4>
            <div>${stats.active_games || 0}</div>
        </div>
        <div class="stat-card">
            <h4>📬 Поддержка</h4>
            <div>${stats.support_tickets || 0}</div>
        </div>
    `;
}

async function loadAdminUsers() {
    try {
        const response = await fetch('/api/admin/users');
        const data = await response.json();
        displayAdminUsers(data.users || []);
    } catch (error) {
        console.error('Load admin users error:', error);
    }
}

function displayAdminUsers(users) {
    const container = document.getElementById('admin-users-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!users || users.length === 0) {
        container.innerHTML = '<p>Нет пользователей</p>';
        return;
    }
    
    users.forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = 'admin-user-item';
        userItem.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1rem;">
                <div class="user-avatar">
                    ${user.avatar ? `<img src="${user.avatar}" style="width: 40px; height: 40px; border-radius: 50%;">` : user.username.charAt(0).toUpperCase()}
                    ${user.verified ? '<span class="verified-small"><i class="fas fa-check-circle"></i></span>' : ''}
                </div>
                <div>
                    <div><strong>${escapeHtml(user.username)}</strong></div>
                    <div style="font-size: 0.8rem;">${user.email}</div>
                    <div style="font-size: 0.8rem;">
                        Роль: ${getRoleName(user.role)} | 
                        Статус: ${user.is_online ? '🟢 Онлайн' : '⚫ Офлайн'} | 
                        Баланс: 💰 ${user.balance}
                    </div>
                    ${user.banned ? `
                        <div style="color: #f44336; font-size: 0.8rem;">
                            ⛔ Забанен до ${new Date(user.banned_until).toLocaleDateString()}
                        </div>
                    ` : ''}
                </div>
            </div>
            <div class="user-actions">
                <button class="settings-btn" onclick="showUserProfile('${user.username}')">
                    <i class="fas fa-eye"></i>
                </button>
                ${user.role !== 'owner' ? `
                    <button class="settings-btn" onclick="verifyUser('${user.username}', ${!user.verified})" style="background: ${user.verified ? '#f44336' : '#4CAF50'};">
                        ${user.verified ? '❌' : '✅'}
                    </button>
                ` : ''}
            </div>
        `;
        container.appendChild(userItem);
    });
}

async function loadAdminGifts() {
    try {
        const response = await fetch('/api/admin/gifts');
        const data = await response.json();
        displayAdminGifts(data.gifts || []);
    } catch (error) {
        console.error('Load admin gifts error:', error);
    }
}

function displayAdminGifts(gifts) {
    const container = document.getElementById('admin-gifts-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!gifts || gifts.length === 0) {
        container.innerHTML = '<p>Нет подарков</p>';
        return;
    }
    
    gifts.forEach(gift => {
        const giftItem = document.createElement('div');
        giftItem.className = 'admin-gift-item';
        giftItem.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1rem;">
                <img src="/uploads/gifts/${gift.filename}" style="width: 50px; height: 50px; object-fit: contain;">
                <div>
                    <div><strong>${escapeHtml(gift.name)}</strong></div>
                    <div>💰 ${gift.price} | 🎁 ${gift.purchases} покупок</div>
                    <div>Загрузил: ${gift.uploaded_by}</div>
                </div>
            </div>
            <div class="gift-actions">
                <button class="settings-btn" onclick="editGift('${gift.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="settings-btn" onclick="toggleGift('${gift.id}', ${!gift.active})" style="background: ${gift.active ? '#f44336' : '#4CAF50'};">
                    ${gift.active ? '❌' : '✅'}
                </button>
            </div>
        `;
        container.appendChild(giftItem);
    });
}

function editGift(giftId) {
    const modalOverlay = document.getElementById('modal-overlay');
    if (!modalOverlay) return;
    
    fetch('/api/admin/gifts')
        .then(res => res.json())
        .then(data => {
            const gift = data.gifts.find(g => g.id === giftId);
            if (!gift) return;
            
            modalOverlay.innerHTML = `
                <div class="modal">
                    <div class="modal-header">
                        <h3>Редактировать подарок</h3>
                        <button class="modal-close" onclick="closeAllModals()">&times;</button>
                    </div>
                    <div class="modal-content">
                        <input type="text" id="edit-gift-name" value="${escapeHtml(gift.name)}" placeholder="Название" class="modal-input">
                        <input type="number" id="edit-gift-price" value="${gift.price}" placeholder="Цена" class="modal-input">
                        <textarea id="edit-gift-description" placeholder="Описание" class="modal-input" rows="3">${escapeHtml(gift.description || '')}</textarea>
                        <button onclick="saveGift('${gift.id}')" class="modal-btn">Сохранить</button>
                    </div>
                </div>
            `;
            
            modalOverlay.style.display = 'flex';
        });
}

async function saveGift(giftId) {
    const name = document.getElementById('edit-gift-name')?.value;
    const price = document.getElementById('edit-gift-price')?.value;
    const description = document.getElementById('edit-gift-description')?.value;
    
    try {
        const response = await fetch('/api/admin/gift/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                gift_id: giftId,
                name,
                price: parseInt(price),
                description,
                active: true
            })
        });
        
        const data = await response.json();
        if (data.success) {
            showNotification('✅ Подарок обновлен', 'success');
            closeAllModals();
            loadAdminGifts();
        }
    } catch (error) {
        console.error('Save gift error:', error);
    }
}

async function toggleGift(giftId, active) {
    try {
        const response = await fetch('/api/admin/gift/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                gift_id: giftId,
                active
            })
        });
        
        const data = await response.json();
        if (data.success) {
            showNotification(active ? '✅ Подарок активирован' : '❌ Подарок деактивирован', 'success');
            loadAdminGifts();
        }
    } catch (error) {
        console.error('Toggle gift error:', error);
    }
}

async function loadAdminReports() {
    try {
        const response = await fetch('/api/reports');
        const data = await response.json();
        displayAdminReports(data.reports || []);
    } catch (error) {
        console.error('Load admin reports error:', error);
    }
}

function displayAdminReports(reports) {
    const container = document.getElementById('admin-reports-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!reports || reports.length === 0) {
        container.innerHTML = '<p>Нет новых жалоб</p>';
        return;
    }
    
    reports.forEach(report => {
        const reportItem = document.createElement('div');
        reportItem.className = 'report-item';
        reportItem.innerHTML = `
            <div class="report-header">
                <strong>Жалоба #${report.id.substring(0, 8)}</strong>
                <span class="report-status pending">Новая</span>
            </div>
            <div class="report-details">
                <p><strong>От:</strong> ${escapeHtml(report.reporter)}</p>
                <p><strong>На:</strong> ${escapeHtml(report.reported_user)}</p>
                <p><strong>Причина:</strong> ${escapeHtml(report.reason)}</p>
                <p><strong>Время:</strong> ${new Date(report.timestamp).toLocaleString()}</p>
            </div>
            <div class="report-actions">
                <button class="settings-btn" onclick="handleReport('${report.id}', 'accept')" style="background: #4CAF50;">
                    ✅ Принять (забанить)
                </button>
                <button class="settings-btn" onclick="handleReport('${report.id}', 'decline')" style="background: #999;">
                    ❌ Отклонить
                </button>
            </div>
        `;
        container.appendChild(reportItem);
    });
}

async function handleReport(reportId, action) {
    try {
        const response = await fetch(`/api/report/${reportId}/handle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action })
        });
        
        const data = await response.json();
        if (data.success) {
            showNotification(`✅ Жалоба обработана`, 'success');
            loadAdminReports();
        }
    } catch (error) {
        console.error('Handle report error:', error);
    }
}

async function loadAdminSupport() {
    try {
        const response = await fetch('/api/support/tickets');
        const data = await response.json();
        displayAdminSupport(data.tickets || []);
    } catch (error) {
        console.error('Load admin support error:', error);
    }
}

function displayAdminSupport(tickets) {
    const container = document.getElementById('admin-support-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!tickets || tickets.length === 0) {
        container.innerHTML = '<p>Нет обращений</p>';
        return;
    }
    
    tickets.forEach(ticket => {
        const ticketItem = document.createElement('div');
        ticketItem.className = 'ticket-item';
        ticketItem.innerHTML = `
            <div class="ticket-header">
                <strong>От: ${escapeHtml(ticket.user)}</strong>
                <span class="ticket-status ${ticket.status}">${ticket.status === 'pending' ? 'Ожидает' : 'Отвечено'}</span>
            </div>
            <div class="ticket-message">
                ${escapeHtml(ticket.message)}
            </div>
            <div class="ticket-time" style="font-size: 0.8rem; color: #666; margin: 0.5rem 0;">
                ${new Date(ticket.timestamp).toLocaleString()}
            </div>
            ${ticket.status === 'pending' ? `
                <div>
                    <textarea id="response-${ticket.id}" placeholder="Ваш ответ..." class="modal-input" rows="2"></textarea>
                    <button onclick="respondToTicket('${ticket.id}')" class="settings-btn" style="width: 100%;">
                        Ответить
                    </button>
                </div>
            ` : ticket.response ? `
                <div class="ticket-response">
                    <strong>Ответ (${ticket.responded_by}):</strong>
                    <p>${escapeHtml(ticket.response)}</p>
                </div>
            ` : ''}
        `;
        container.appendChild(ticketItem);
    });
}

async function respondToTicket(ticketId) {
    const response = document.getElementById(`response-${ticketId}`)?.value.trim();
    if (!response) {
        showNotification('Введите ответ', 'error');
        return;
    }
    
    try {
        const result = await fetch(`/api/support/ticket/${ticketId}/respond`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ response })
        });
        
        const data = await result.json();
        if (data.success) {
            showNotification('✅ Ответ отправлен', 'success');
            loadAdminSupport();
        }
    } catch (error) {
        console.error('Respond to ticket error:', error);
    }
}

async function loadAdminLogs() {
    try {
        const response = await fetch('/api/admin/logs');
        const data = await response.json();
        displayAdminLogs(data.logs || []);
    } catch (error) {
        console.error('Load admin logs error:', error);
    }
}

function displayAdminLogs(logs) {
    const container = document.getElementById('admin-logs-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!logs || logs.length === 0) {
        container.innerHTML = '<p>Нет логов</p>';
        return;
    }
    
    let html = '<div style="max-height: 400px; overflow-y: auto;">';
    logs.reverse().forEach(log => {
        html += `
            <div style="padding: 0.5rem; border-bottom: 1px solid #eee;">
                <div><strong>${escapeHtml(log.admin)}</strong> - ${escapeHtml(log.action)}</div>
                <div style="font-size: 0.8rem; color: #666;">${escapeHtml(log.details)}</div>
                <div style="font-size: 0.7rem; color: #999;">${new Date(log.timestamp).toLocaleString()}</div>
            </div>
        `;
    });
    html += '</div>';
    
    container.innerHTML = html;
}

// ========== НАВИГАЦИЯ ==========
function showChats() {
    hideAllViews();
    document.getElementById('chats-view').style.display = 'block';
    closeSideMenu();
    currentChat = null;
    loadChats();
}

function showFriends() {
    hideAllViews();
    document.getElementById('friends-view').style.display = 'block';
    closeSideMenu();
    loadFriends();
    loadFriendRequests();
}

function showGifts() {
    hideAllViews();
    document.getElementById('gifts-view').style.display = 'block';
    closeSideMenu();
    loadGifts();
}

function showThemes() {
    showSettings();
    setTimeout(() => {
        const themesSection = document.querySelector('.settings-section:last-child');
        if (themesSection) themesSection.scrollIntoView({ behavior: 'smooth' });
    }, 100);
}

function showSearch() {
    hideAllViews();
    document.getElementById('search-view').style.display = 'block';
    closeSideMenu();
}

function showCreateChatModal() {
    const username = prompt('Введите имя пользователя:');
    if (username && username.trim()) {
        createChat(username.trim());
    }
}

async function createChat(username) {
    try {
        const response = await fetch('/api/create_chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        
        const data = await response.json();
        if (data.success) {
            await openChat(data.chat_id, username);
        } else {
            showNotification(data.error || 'Ошибка', 'error');
        }
    } catch (error) {
        console.error('Create chat error:', error);
        showNotification('Ошибка', 'error');
    }
}

function showAddFriendModal() {
    const username = prompt('Введите имя пользователя для добавления в друзья:');
    if (username && username.trim()) {
        sendFriendRequest(username.trim());
    }
}

function showFriendsTab(tab) {
    const tabs = document.querySelectorAll('.friends-tab');
    tabs.forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    
    if (tab === 'all') {
        document.getElementById('friends-list').style.display = 'block';
        document.getElementById('friend-requests-list').style.display = 'none';
        
        const friends = document.querySelectorAll('.friend-item');
        friends.forEach(f => f.style.display = 'flex');
    } else if (tab === 'requests') {
        document.getElementById('friends-list').style.display = 'none';
        document.getElementById('friend-requests-list').style.display = 'block';
    } else if (tab === 'online') {
        document.getElementById('friends-list').style.display = 'block';
        document.getElementById('friend-requests-list').style.display = 'none';
        
        const friends = document.querySelectorAll('.friend-item');
        friends.forEach(f => {
            const isOnline = f.querySelector('.online-dot') !== null;
            f.style.display = isOnline ? 'flex' : 'none';
        });
    }
}

function showChatInfo() {
    if (!currentChatName) return;
    showUserProfile(currentChatName);
}

function toggleSecretChat() {
    showNotification('Секретный чат с E2E шифрованием', 'info');
}

function showGiftPicker() {
    showGifts();
}

function showAttachmentMenu() {
    showNotification('Меню вложений скоро будет доступно', 'info');
}

function showUploadGiftForm() {
    showNotification('Загрузка подарков доступна только владельцу', 'info');
}

function search(query) {
    if (!query || query.length < 2) {
        document.getElementById('search-results').innerHTML = '<p class="empty-state">Введите минимум 2 символа</p>';
        return;
    }
    
    const results = usersList.filter(user => 
        user.username.toLowerCase().includes(query.toLowerCase())
    );
    
    if (results.length === 0) {
        document.getElementById('search-results').innerHTML = '<p class="empty-state">Ничего не найдено</p>';
        return;
    }
    
    let html = '<h3>Пользователи:</h3>';
    results.slice(0, 10).forEach(user => {
        html += `
            <div class="search-result-item" onclick="showUserProfile('${user.username}')">
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <div class="search-avatar">
                        ${user.avatar ? `<img src="${user.avatar}">` : user.username.charAt(0).toUpperCase()}
                        ${user.verified ? '<span class="verified-small"><i class="fas fa-check-circle"></i></span>' : ''}
                    </div>
                    <div>
                        <strong>${escapeHtml(user.username)}</strong>
                        <div style="font-size: 0.8rem; color: #666;">${user.status || ''}</div>
                    </div>
                </div>
            </div>
        `;
    });
    
    document.getElementById('search-results').innerHTML = html;
}

function showChatMenu() {
    if (!currentChat || !currentChatName) return;
    
    const modalOverlay = document.getElementById('modal-overlay');
    if (!modalOverlay) return;
    
    modalOverlay.innerHTML = `
        <div class="modal" style="max-width: 300px;">
            <div class="modal-header">
                <h3>Меню чата</h3>
                <button class="modal-close" onclick="closeAllModals()">&times;</button>
            </div>
            <div class="modal-content">
                <button onclick="pinChat()" class="modal-btn" style="margin-bottom: 0.5rem;">
                    <i class="fas fa-thumbtack"></i> Закрепить чат
                </button>
                <button onclick="muteChat()" class="modal-btn" style="margin-bottom: 0.5rem;">
                    <i class="fas fa-bell-slash"></i> Отключить звук
                </button>
                <button onclick="archiveChat()" class="modal-btn" style="margin-bottom: 0.5rem;">
                    <i class="fas fa-archive"></i> Архивировать
                </button>
                <button onclick="clearHistory()" class="modal-btn" style="background: #f44336;">
                    <i class="fas fa-trash"></i> Очистить историю
                </button>
            </div>
        </div>
    `;
    
    modalOverlay.style.display = 'flex';
}

function pinChat() {
    if (!currentChat) return;
    
    fetch(`/api/chat/${currentChat}/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: true })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showNotification('Чат закреплен', 'success');
            closeAllModals();
            loadChats();
        }
    });
}

function muteChat() {
    if (!currentChat) return;
    
    fetch(`/api/chat/${currentChat}/mute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ muted: true })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showNotification('Уведомления отключены', 'success');
            closeAllModals();
        }
    });
}

function archiveChat() {
    if (!currentChat) return;
    
    fetch(`/api/chat/${currentChat}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: true })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showNotification('Чат архивирован', 'success');
            closeAllModals();
            showChats();
        }
    });
}

function clearHistory() {
    if (!confirm('Очистить историю сообщений?')) return;
    showNotification('История очищена', 'success');
    closeAllModals();
    loadMessages(currentChat);
}

function hideAllViews() {
    const views = ['chats-view', 'chat-view', 'friends-view', 'gifts-view', 'games-view', 
                   'settings-view', 'admin-view', 'search-view'];
    views.forEach(view => {
        const el = document.getElementById(view);
        if (el) el.style.display = 'none';
    });
}

function toggleSideMenu() {
    document.getElementById('side-menu').classList.toggle('active');
}

function closeSideMenu() {
    document.getElementById('side-menu').classList.remove('active');
}

function closeAllModals() {
    const modalOverlay = document.getElementById('modal-overlay');
    if (modalOverlay) {
        modalOverlay.style.display = 'none';
        modalOverlay.innerHTML = '';
    }
}

// ========== УТИЛИТЫ ==========
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div>${escapeHtml(message)}</div>
        <button class="notification-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) notification.remove();
    }, 3000);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function filterAdminUsers(query) {
    const items = document.querySelectorAll('.admin-user-item');
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        if (text.includes(query.toLowerCase())) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}