// ==========================================
// 1. NAVEGAÇÃO ENTRE TELAS E INICIALIZAÇÃO
// ==========================================

// Verifica se o usuário chegou na página clicando num link de recuperação
window.onload = () => {
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
    const email = document.getElementById('login-email').value;
    const senha = document.getElementById('login-senha').value;

    btn.innerText = "A autenticar...";
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
            btn.innerText = "Sucesso! Entrando...";
            btn.style.backgroundColor = "var(--accent)";
            
            setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 1000);
        } else {
            alert("Erro ao entrar: " + (dados.erro || "Credenciais inválidas."));
            btn.innerText = "Entrar na plataforma";
            btn.disabled = false;
        }
    } catch (erro) {
        alert("Erro ao conectar com o servidor. Ele está rodando?");
        btn.innerText = "Entrar na plataforma";
        btn.disabled = false;
    }
}

// --- CADASTRO REAL ---
async function realizarCadastro(event) {
    event.preventDefault();

    const nome = document.getElementById('reg-nome').value;
    const email = document.getElementById('reg-email').value;
    const senha = document.getElementById('reg-senha').value;
    const confirmacao = document.getElementById('reg-senha-conf').value;
    const erroTexto = document.getElementById('erro-senha');
    const btn = document.getElementById('btn-register');

    if (senha !== confirmacao) {
        erroTexto.classList.remove('hidden');
        document.getElementById('reg-senha-conf').style.borderColor = "var(--danger)";
        return;
    }
    
    erroTexto.classList.add('hidden');
    document.getElementById('reg-senha-conf').style.borderColor = "var(--card-border)";

    btn.innerText = "A criar conta...";
    btn.disabled = true;

    try {
        const resposta = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome: nome, email: email, senha: senha }) 
        });

        const dados = await resposta.json();

        if (resposta.ok) {
            btn.innerText = "Conta criada com sucesso!";
            btn.style.backgroundColor = "var(--accent)";
            
            setTimeout(() => {
                alert("Conta criada! Por favor, faça o login.");
                alternarTela('box-login');
                btn.innerText = "Cadastrar";
                btn.style.backgroundColor = "";
                btn.disabled = false;
            }, 1500);
        } else {
            alert("Erro ao cadastrar: " + (dados.erro || "Tente novamente."));
            btn.innerText = "Cadastrar";
            btn.disabled = false;
        }
    } catch (erro) {
        alert("Erro ao conectar com o servidor.");
        btn.innerText = "Cadastrar";
        btn.disabled = false;
    }
}

// --- SOLICITAR RECUPERAÇÃO DE SENHA ---
async function solicitarRecuperacao(event) {
    event.preventDefault();
    const btn = document.getElementById('btn-forgot');
    const email = document.getElementById('forgot-email').value;

    btn.innerText = "A procurar...";
    btn.disabled = true;

    try {
        const resposta = await fetch('/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        });

        const dados = await resposta.json();

        if (resposta.ok) {
            btn.innerText = "Link Gerado! ✔️";
            btn.style.backgroundColor = "var(--accent)";
            alert("Atenção (Modo Dev): Olhe o terminal do seu VS Code para clicar no link de recuperação!");
            
            setTimeout(() => {
                alternarTela('box-login');
                btn.innerText = "Enviar Link";
                btn.disabled = false;
                btn.style.backgroundColor = "";
            }, 3000);
        } else {
            alert("Erro: " + (dados.erro || "Não foi possível gerar o link."));
            btn.innerText = "Enviar Link";
            btn.disabled = false;
        }
    } catch (erro) {
        alert("Erro de conexão. Servidor está rodando?");
        btn.disabled = false;
        btn.innerText = "Enviar Link";
    }
}

// --- SALVAR NOVA SENHA ---
async function redefinirSenha(event) {
    event.preventDefault();
    const btn = document.getElementById('btn-reset');
    const novaSenha = document.getElementById('reset-senha').value;

    btn.innerText = "A salvar...";
    btn.disabled = true;

    try {
        const resposta = await fetch('/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: window.resetToken, novaSenha: novaSenha })
        });

        const dados = await resposta.json();

        if (resposta.ok) {
            btn.innerText = "Senha atualizada! ✔️";
            btn.style.backgroundColor = "var(--accent)";
            setTimeout(() => {
                window.location.href = "/"; 
            }, 2000);
        } else {
            alert("Erro: " + (dados.erro || "Token inválido."));
            btn.innerText = "Salvar Nova Senha";
            btn.disabled = false;
        }
    } catch (erro) {
        alert("Erro de conexão.");
        btn.disabled = false;
        btn.innerText = "Salvar Nova Senha";
    }
}

// ==========================================
// 3. FUNÇÕES VISUAIS DOS CAMPOS
// ==========================================
function validarEmail(input) {
    const wrapper = input.parentElement;
    const icon = wrapper.querySelector('.check-icon');
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (regex.test(input.value)) {
        icon.classList.add('visible');
    } else {
        icon.classList.remove('visible');
    }
}

function togglePassword(icon) {
    const wrapper = icon.parentElement;
    const input = wrapper.querySelector('input');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}