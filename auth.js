// Шифрование данных
function encrypt(text) {
    const textBytes = new TextEncoder().encode(text);
    const keyBytes = new TextEncoder().encode(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
    
    return crypto.subtle.importKey('raw', keyBytes, { name: 'AES-CBC' }, false, ['encrypt'])
        .then(key => {
            const iv = crypto.getRandomValues(new Uint8Array(16));
            return crypto.subtle.encrypt({ name: 'AES-CBC', iv }, key, textBytes)
                .then(encrypted => {
                    const combined = new Uint8Array(iv.length + encrypted.byteLength);
                    combined.set(iv, 0);
                    combined.set(new Uint8Array(encrypted), iv.length);
                    return btoa(String.fromCharCode(...combined));
                });
        });
}

function decrypt(encryptedText) {
    const combined = new Uint8Array(atob(encryptedText).split('').map(c => c.charCodeAt(0)));
    const iv = combined.slice(0, 16);
    const encrypted = combined.slice(16);
    const keyBytes = new TextEncoder().encode(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
    
    return crypto.subtle.importKey('raw', keyBytes, { name: 'AES-CBC' }, false, ['decrypt'])
        .then(key => {
            return crypto.subtle.decrypt({ name: 'AES-CBC', iv }, key, encrypted)
                .then(decrypted => {
                    return new TextDecoder().decode(decrypted);
                });
        });
}

// GitHub API функции
async function githubAPI(endpoint, method = 'GET', data = null) {
    const url = `https://api.github.com/${endpoint}`;
    const token = process.env.GITHUB_TOKEN || GITHUB_CONFIG.token;
    
    const options = {
        method: method,
        headers: {
            'Authorization': `token ${token}`,
            'Content-Type': 'application/json',
        }
    };
    
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(url, options);
        if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('GitHub API error:', error);
        throw error;
    }
}

// Работа с данными
async function loadUserData() {
    try {
        const content = await githubAPI(`repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.dataFile}`);
        const encryptedData = atob(content.content);
        const decryptedJson = await decrypt(encryptedData);
        return JSON.parse(decryptedJson);
    } catch (error) {
        // Если файла нет, создаем пустую базу
        if (error.message.includes('404')) {
            return { users: {} };
        }
        throw error;
    }
}

async function saveUserData(data) {
    const jsonString = JSON.stringify(data);
    const encryptedData = await encrypt(jsonString);
    
    try {
        // Получаем текущий файл чтобы узнать sha
        const currentContent = await githubAPI(`repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.dataFile}`);
        
        return await githubAPI(`repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.dataFile}`, 'PUT', {
            message: 'Update bonus data',
            content: btoa(encryptedData),
            sha: currentContent.sha
        });
    } catch (error) {
        // Если файла нет, создаем новый
        if (error.message.includes('404')) {
            return await githubAPI(`repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.dataFile}`, 'PUT', {
                message: 'Create bonus data',
                content: btoa(encryptedData)
            });
        }
        throw error;
    }
}

// Функции интерфейса
function showLogin() {
    document.getElementById('loginSection').classList.remove('hidden');
    document.getElementById('registerSection').classList.add('hidden');
    document.getElementById('dashboard').classList.add('hidden');
}

function showRegister() {
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('registerSection').classList.remove('hidden');
    document.getElementById('dashboard').classList.add('hidden');
}

async function register() {
    const username = document.getElementById('newUsername').value.trim();
    const password = document.getElementById('newPassword').value.trim();

    if (!username || !password) {
        alert('Заполните все поля!');
        return;
    }

    try {
        const data = await loadUserData();
        
        if (data.users[username]) {
            alert('Такой никнейм уже существует!');
            return;
        }

        // Создаем нового пользователя
        data.users[username] = {
            password: password,
            bonuses: 0,
            userId: Date.now().toString() + Math.random().toString(36).substr(2, 9)
        };

        await saveUserData(data);
        alert('Регистрация успешна! Теперь войдите в систему.');
        showLogin();
    } catch (error) {
        alert('Ошибка регистрации: ' + error.message);
    }
}

async function login() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    try {
        const data = await loadUserData();
        const user = data.users[username];

        if (user && user.password === password) {
            localStorage.setItem('current_user', JSON.stringify({ 
                username: username, 
                bonuses: user.bonuses,
                userId: user.userId 
            }));
            await showDashboard();
        } else {
            alert('Неверный никнейм или пароль!');
        }
    } catch (error) {
        alert('Ошибка входа: ' + error.message);
    }
}

function logout() {
    localStorage.removeItem('current_user');
    showLogin();
}

function getCurrentUser() {
    const userData = localStorage.getItem('current_user');
    return userData ? JSON.parse(userData) : null;
}

async function showDashboard() {
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('registerSection').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    
    const user = getCurrentUser();
    if (user) {
        document.getElementById('currentUsername').value = user.username;
        await updateBonusDisplay();
        showProfile();
    }
}

// Проверяем авторизацию при загрузке
window.addEventListener('DOMContentLoaded', async () => {
    if (getCurrentUser()) {
        await showDashboard();
    } else {
        showLogin();
    }
});
