// ==========================================
// SISTEMA DE TOAST NOTIFICATIONS
// ==========================================
function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container') || createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✓',
        error: '✕',
        info: 'ℹ',
        warning: '⚠'
    };
    
    toast.innerHTML = `
        <span class="toast-icon">${icons[type]}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.closest('.toast').remove()">×</button>
    `;
    
    container.appendChild(toast);
    
    if (duration > 0) {
        setTimeout(() => {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

// ==========================================
// 1. NAVEGAÇÃO ENTRE TELAS E INICIALIZAÇÃO
// ==========================================

// Verifica se o usuário chegou na página clicando num link de recuperação
window.onload = () => {
    createToastContainer();
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (token) {
        window.resetToken = token;
        alternarTela('box-reset');
    }
};

function alternarTela(idTelaAlvo) {
    const telas = document.querySelectorAll('.auth-card');
    telas.forEach(tela => tela.classList.add('hidden'));
    document.getElementById(idTelaAlvo).classList.remove('hidden');
}

// ==========================================
// 2. COMUNICAÇÃO COM O BACK-END (REAL)
// ==========================================

// --- LOGIN REAL ---
async function realizarLogin(event) {
    event.preventDefault(); 
    
    const btn = document.getElementById('btn-login');
    const emailInput = document.getElementById('login-email');
    const senhaInput = document.getElementById('login-senha');
    const email = emailInput.value.trim();
    const senha = senhaInput.value;

    // Validação básica
    if (!email || !senha) {
        showToast('Por favor, preencha todos os campos', 'warning');
        return;
    }

    if (!isValidEmail(email)) {
        showToast('Email inválido', 'error');
        return;
    }

    btn.classList.add('loading');
    btn.disabled = true;

    try {
        const resposta = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, senha: senha }) 
        });

        const dados = await resposta.json();

        if (resposta.ok) {
            localStorage.setItem('token', dados.token);
            showToast('Bem-vindo! Entrando no painel...', 'success');
            
            setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 1000);
        } else {
            showToast(dados.erro || 'Credenciais inválidas', 'error');
            btn.classList.remove('loading');
            btn.disabled = false;
        }
    } catch (erro) {
        showToast('Erro de conexão com o servidor', 'error');
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}

// --- CADASTRO REAL ---
async function realizarCadastro(event) {
    event.preventDefault();

    const nomeInput = document.getElementById('reg-nome');
    const emailInput = document.getElementById('reg-email');
    const senhaInput = document.getElementById('reg-senha');
    const confirmaInput = document.getElementById('reg-senha-conf');
    const btn = document.getElementById('btn-register');

    const nome = nomeInput.value.trim();
    const email = emailInput.value.trim();
    const senha = senhaInput.value;
    const confirmacao = confirmaInput.value;

    // Validação
    if (!nome || !email || !senha || !confirmacao) {
        showToast('Por favor, preencha todos os campos', 'warning');
        return;
    }

    if (!isValidEmail(email)) {
        showToast('Email inválido', 'error');
        return;
    }

    if (senha.length < 6) {
        showToast('A senha deve ter pelo menos 6 caracteres', 'error');
        return;
    }

    if (senha !== confirmacao) {
        showToast('As senhas não coincidem', 'error');
        confirmaInput.focus();
        return;
    }

    btn.classList.add('loading');
    btn.disabled = true;

    try {
        const resposta = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome: nome, email: email, senha: senha }) 
        });

        const dados = await resposta.json();

        if (resposta.ok) {
            showToast('Conta criada com sucesso! Redirecionando...', 'success');
            
            setTimeout(() => {
                alternarTela('box-login');
                document.getElementById('login-email').value = email;
                document.getElementById('login-email').focus();
                nomeInput.value = '';
                emailInput.value = '';
                senhaInput.value = '';
                confirmaInput.value = '';
                btn.classList.remove('loading');
                btn.disabled = false;
                showToast('Agora faça o login com suas credenciais', 'info');
            }, 1500);
        } else {
            showToast(dados.erro || 'Erro ao cadastrar', 'error');
            btn.classList.remove('loading');
            btn.disabled = false;
        }
    } catch (erro) {
        showToast('Erro de conexão com o servidor', 'error');
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}

// --- SOLICITAR RECUPERAÇÃO DE SENHA ---
async function solicitarRecuperacao(event) {
    event.preventDefault();
    const btn = document.getElementById('btn-forgot');
    const emailInput = document.getElementById('forgot-email');
    const email = emailInput.value.trim();

    if (!email) {
        showToast('Por favor, insira seu email', 'warning');
        return;
    }

    if (!isValidEmail(email)) {
        showToast('Email inválido', 'error');
        return;
    }

    btn.classList.add('loading');
    btn.disabled = true;

    try {
        const resposta = await fetch('/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        });

        const dados = await resposta.json();

        if (resposta.ok) {
            showToast('Link de recuperação enviado! Verifique seu email', 'success');
            
            setTimeout(() => {
                alternarTela('box-login');
                emailInput.value = '';
                btn.classList.remove('loading');
                btn.disabled = false;
            }, 2000);
        } else {
            showToast(dados.erro || 'Erro ao enviar link', 'error');
            btn.classList.remove('loading');
            btn.disabled = false;
        }
    } catch (erro) {
        showToast('Erro de conexão com o servidor', 'error');
        btn.disabled = false;
        btn.classList.remove('loading');
    }
}

// --- SALVAR NOVA SENHA ---
async function redefinirSenha(event) {
    event.preventDefault();
    const btn = document.getElementById('btn-reset');
    const senhaInput = document.getElementById('reset-senha');
    const novaSenha = senhaInput.value;

    if (!novaSenha) {
        showToast('Por favor, insira uma senha', 'warning');
        return;
    }

    if (novaSenha.length < 6) {
        showToast('A senha deve ter pelo menos 6 caracteres', 'error');
        return;
    }

    btn.classList.add('loading');
    btn.disabled = true;

    try {
        const resposta = await fetch('/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: window.resetToken, novaSenha: novaSenha })
        });

        const dados = await resposta.json();

        if (resposta.ok) {
            showToast('Senha atualizada com sucesso!', 'success');
            setTimeout(() => {
                window.location.href = "/"; 
            }, 1500);
        } else {
            showToast(dados.erro || 'Erro ao atualizar senha', 'error');
            btn.classList.remove('loading');
            btn.disabled = false;
        }
    } catch (erro) {
        showToast('Erro de conexão com o servidor', 'error');
        btn.disabled = false;
        btn.classList.remove('loading');
    }
}

// ==========================================
// 3. FUNÇÕES VISUAIS E VALIDAÇÃO DOS CAMPOS
// ==========================================

function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

function validarEmail(input) {
    const wrapper = input.parentElement;
    const icon = wrapper.querySelector('.check-icon');
    const formGroup = input.closest('.form-group');
    
    if (isValidEmail(input.value)) {
        icon.classList.add('visible');
        formGroup?.classList.remove('invalid');
    } else {
        icon.classList.remove('visible');
        formGroup?.classList.remove('valid');
    }
}

function togglePassword(icon) {
    const wrapper = icon.parentElement;
    const input = wrapper.querySelector('input');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
        icon.setAttribute('aria-label', 'Ocultar senha');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
        icon.setAttribute('aria-label', 'Mostrar senha');
    }
}