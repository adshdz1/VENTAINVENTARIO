const { ipcRenderer } = require('electron');

// Default credentials
const DEFAULT_CREDENTIALS = {
    admin: {
        username: 'admin',
        password: 'admin123',
        role: 'admin',
        displayName: 'Administrador'
    },
    cajero: {
        username: 'cajero',
        password: 'cajero123',
        role: 'cajero',
        displayName: 'Cajero'
    }
};

// Global variables
let isAuthenticated = false;
let currentUser = null;

// Initialize login page
document.addEventListener('DOMContentLoaded', () => {
    setupLoginForm();
    checkRememberedSession();
});

function setupLoginForm() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
}

async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('remember-me').checked;
    
    // Show loading state
    const loginBtn = document.querySelector('.login-btn');
    const originalText = loginBtn.innerHTML;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
    loginBtn.classList.add('loading');
    
    try {
        // Validate credentials
        const validation = await validateCredentials(username, password);
        console.log('Login validation:', validation);
        
        if (validation.isValid) {
            // Store user session
            currentUser = {
                username: username,
                role: validation.user.role,
                displayName: validation.user.displayName,
                loginTime: new Date().toISOString(),
                rememberMe: rememberMe
            };
            
            // Always save user session for current session
            console.log('Saving user session:', currentUser);
            await ipcRenderer.invoke('save-user-session', currentUser);
            
            // Show success message
            showMessage('¡Inicio de sesión exitoso!', 'success');
            
            // Redirect to main application after a short delay
            setTimeout(() => {
                console.log('Redirecting to main application...');
                window.location.href = 'index.html';
            }, 1000);
            
        } else {
            showMessage('Usuario o contraseña incorrectos. Intenta de nuevo.', 'error');
            document.getElementById('password').value = '';
            document.getElementById('password').focus();
        }
        
    } catch (error) {
        console.error('Login error:', error);
        showMessage('Error al iniciar sesión. Intenta de nuevo.', 'error');
    } finally {
        // Restore button state
        loginBtn.innerHTML = originalText;
        loginBtn.classList.remove('loading');
    }
}

async function validateCredentials(username, password) {
    try {
        console.log('Validating credentials for:', username, 'password:', password);
        
        // Always check default credentials first
        const defaultUser = DEFAULT_CREDENTIALS[username];
        console.log('Default user for', username, ':', defaultUser);
        
        if (defaultUser && defaultUser.password === password) {
            console.log('Default credentials match');
            return { isValid: true, user: defaultUser };
        }
        
        // Then check stored credentials
        const storedCredentials = await ipcRenderer.invoke('get-credentials');
        console.log('Stored credentials:', storedCredentials);
        
        if (storedCredentials && storedCredentials[username]) {
            const storedUser = storedCredentials[username];
            console.log('Found stored user:', storedUser);
            if (storedUser.password === password) {
                console.log('Stored credentials match');
                return { isValid: true, user: storedUser };
            }
        }
        
        console.log('No valid credentials found');
        return { isValid: false, user: null };
    } catch (error) {
        console.error('Error validating credentials:', error);
        return { isValid: false, user: null };
    }
}

function showMessage(message, type) {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.error-message, .success-message');
    existingMessages.forEach(msg => msg.remove());
    
    // Create new message
    const messageDiv = document.createElement('div');
    messageDiv.className = `${type}-message`;
    messageDiv.textContent = message;
    
    // Insert before the form
    const loginForm = document.getElementById('login-form');
    loginForm.parentNode.insertBefore(messageDiv, loginForm);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 5000);
}

function togglePassword() {
    const passwordInput = document.getElementById('password');
    const eyeIcon = document.getElementById('eye-icon');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyeIcon.className = 'fas fa-eye-slash';
    } else {
        passwordInput.type = 'password';
        eyeIcon.className = 'fas fa-eye';
    }
}

function showForgotPassword() {
    const modal = document.getElementById('change-password-modal');
    modal.style.display = 'block';
    
    // Clear form
    document.getElementById('change-password-form').reset();
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

async function changePassword() {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    // Validate current password
    const validation = await validateCredentials('admin', currentPassword);
    
    if (!validation.isValid) {
        showMessage('La contraseña actual es incorrecta.', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showMessage('La nueva contraseña debe tener al menos 6 caracteres.', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showMessage('Las contraseñas no coinciden.', 'error');
        return;
    }
    
    try {
        // Save new credentials
        const storedCredentials = await ipcRenderer.invoke('get-credentials') || {};
        storedCredentials.admin = {
            ...DEFAULT_CREDENTIALS.admin,
            password: newPassword
        };
        
        await ipcRenderer.invoke('save-credentials', storedCredentials);
        
        showMessage('Contraseña cambiada exitosamente.', 'success');
        closeModal('change-password-modal');
        
        // Update footer
        updateFooterCredentials('admin', newPassword);
        
    } catch (error) {
        console.error('Error changing password:', error);
        showMessage('Error al cambiar la contraseña.', 'error');
    }
}

function updateFooterCredentials(username, password) {
    const footer = document.querySelector('.login-footer');
    if (footer) {
        footer.innerHTML = `
            <p>Usuario: <strong>${username}</strong></p>
            <p>Contraseña: <strong>${password}</strong></p>
        `;
    }
}

async function checkRememberedSession() {
    try {
        const rememberedSession = await ipcRenderer.invoke('get-user-session');
        
        if (rememberedSession && rememberedSession.rememberMe) {
            // Auto-fill username
            document.getElementById('username').value = rememberedSession.username;
            document.getElementById('remember-me').checked = true;
        }
    } catch (error) {
        console.error('Error checking remembered session:', error);
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Handle Enter key in password field
document.getElementById('password').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        document.getElementById('login-form').dispatchEvent(new Event('submit'));
    }
});

// Handle Enter key in username field
document.getElementById('username').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        document.getElementById('password').focus();
    }
}); 