async function showProfile() {
    document.getElementById('profileSection').classList.remove('hidden');
    document.getElementById('qrSection').classList.add('hidden');
    
    document.getElementById('loadingProfile').classList.remove('hidden');
    document.getElementById('profileContent').classList.add('hidden');
    
    await updateBonusDisplay();
    
    document.getElementById('loadingProfile').classList.add('hidden');
    document.getElementById('profileContent').classList.remove('hidden');
}

function showQR() {
    document.getElementById('profileSection').classList.add('hidden');
    document.getElementById('qrSection').classList.remove('hidden');
    
    const user = getCurrentUser();
    if (user) {
        // Генерируем QR-код с данными пользователя
        const qrData = JSON.stringify({
            userId: user.userId,
            username: user.username
        });
        
        document.getElementById('qrcode').innerHTML = '';
        QRCode.toCanvas(document.getElementById('qrcode'), qrData, function (error) {
            if (error) console.error(error);
        });
        
        document.getElementById('qrBonusCount').textContent = user.bonuses;
    }
}

async function updateProfile() {
    const newUsername = document.getElementById('changeUsername').value.trim().toLowerCase();
    const newPassword = document.getElementById('changePassword').value.trim();
    
    const user = getCurrentUser();
    if (!user) return;
    
    if (!newUsername && !newPassword) {
        showMessage('введите новые данные для изменения', 'error');
        return;
    }
    
    try {
        const data = await loadUserData();
        let changed = false;
        
        // Меняем никнейм если нужно
        if (newUsername && newUsername !== user.username) {
            if (data.users[newUsername]) {
                showMessage('этот никнейм уже занят. выберите другой', 'error');
                return;
            }
            
            if (!/^[a-z0-9]+$/.test(newUsername)) {
                showMessage('никнейм может содержать только английские буквы и цифры', 'error');
                return;
            }
            
            // Переносим данные на новый никнейм
            data.users[newUsername] = {
                ...data.users[user.username],
                password: newPassword || data.users[user.username].password
            };
            delete data.users[user.username];
            
            user.username = newUsername;
            changed = true;
        }
        
        // Меняем пароль если нужно
        if (newPassword && data.users[user.username]) {
            if (newPassword.length < 4) {
                showMessage('пароль должен содержать минимум 4 символа', 'error');
                return;
            }
            data.users[user.username].password = newPassword;
            changed = true;
        }
        
        if (changed) {
            await saveUserData(data);
            localStorage.setItem('current_user', JSON.stringify(user));
            document.getElementById('currentUsername').value = user.username;
            document.getElementById('changeUsername').value = '';
            document.getElementById('changePassword').value = '';
            showMessage('отлично! данные профиля обновлены', 'success');
        }
    } catch (error) {
        showMessage('ой! не удалось обновить профиль: ' + error.message, 'error');
    }
}

async function updateBonusDisplay() {
    const user = getCurrentUser();
    if (!user) return;
    
    try {
        const data = await loadUserData();
        if (data.users[user.username]) {
            const currentBonuses = data.users[user.username].bonuses;
            document.getElementById('bonusCount').textContent = currentBonuses;
            document.getElementById('qrBonusCount').textContent = currentBonuses;
            
            // Обновляем данные в localStorage
            user.bonuses = currentBonuses;
            localStorage.setItem('current_user', JSON.stringify(user));
        }
    } catch (error) {
        console.error('error updating bonuses:', error);
    }
}

// Обновляем бонусы каждые 10 секунд
setInterval(updateBonusDisplay, 10000);
