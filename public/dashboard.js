// ==========================================
// 1. O PORTEIRO (Segurança)
// ==========================================
const token = localStorage.getItem('token');

if (!token) {
    window.location.href = '/'; 
}

function getUserId() {
    try {
        const payload = token.split('.')[1];
        const decoded = JSON.parse(atob(payload)); 
        return decoded.id; 
    } catch (e) {
        localStorage.removeItem('token');
        window.location.href = '/';
    }
}

const userId = getUserId();

// ==========================================
// VARIÁVEIS GLOBAIS PARA OS GRÁFICOS
// ==========================================
let graficoPizza = null;
let graficoFluxo = null;
let graficoSaldo = null;

// ==========================================
// 2. O MENSAGEIRO (Puxar dados do Banco)
// ==========================================
async function carregarDashboard() {
    try {
        const resposta = await fetch(`/dashboard/${userId}`);
        const dados = await resposta.json();

        if (resposta.ok) {
            atualizarTela(dados);
        } else {
            console.error("Erro ao carregar dados:", dados.erro);
        }
    } catch (erro) {
        console.error("Erro de conexão:", erro);
    }
}

// ==========================================
// 3. ATUALIZAR A TELA (Números e Tabela)
// ==========================================
function atualizarTela(dadosDoBanco) {
    let totalReceitas = 0;
    let totalGastos = 0;
    
    const categoriasGastos = [];
    const valoresGastos = [];

    const tabela = document.getElementById("tabela-lancamentos");
    tabela.innerHTML = ""; 

    dadosDoBanco.forEach(item => {
        if (item.categoria.includes("Receita")) {
            totalReceitas += item.total;
        } else {
            totalGastos += item.total;
            categoriasGastos.push(item.categoria.replace('Gasto - ', ''));
            valoresGastos.push(item.total);
        }

        tabela.innerHTML += `
            <tr>
                <td>Lançamento Agrupado</td>
                <td><span class="badge ${item.categoria.includes('Receita') ? 'badge-success' : 'badge-danger'}">${item.categoria}</span></td>
                <td style="color: ${item.categoria.includes('Receita') ? 'var(--success)' : 'var(--danger)'};">R$ ${item.total.toFixed(2)}</td>
                <td style="color: var(--muted);">Hoje</td>
            </tr>
        `;
    });

    const saldoFinal = totalReceitas - totalGastos;

    // Atualiza os textos dos cards
    document.getElementById("totalReceita").innerText = `R$ ${totalReceitas.toFixed(2)}`;
    document.getElementById("totalGasto").innerText = `R$ ${totalGastos.toFixed(2)}`;
    document.getElementById("saldo").innerText = `R$ ${saldoFinal.toFixed(2)}`;

    // Chama a função que desenha TODOS os gráficos
    desenharGraficos(categoriasGastos, valoresGastos, totalReceitas, totalGastos, saldoFinal);
}

// ==========================================
// 4. DESENHAR OS GRÁFICOS (Chart.js)
// ==========================================
function desenharGraficos(labelsPizza, dadosPizza, receitas, gastos, saldoFinal) {
    
    // Configuração de cores baseadas no seu CSS
    const corTexto = '#94a3b8'; // var(--text-muted)

    // --- 1. Gráfico de Análise Vertical (Pizza) ---
    const ctxPizza = document.getElementById('financeChart').getContext('2d');
    if (graficoPizza) graficoPizza.destroy();
    
    if (dadosPizza.length > 0) {
        graficoPizza = new Chart(ctxPizza, {
            type: 'doughnut',
            data: {
                labels: labelsPizza,
                datasets: [{
                    data: dadosPizza,
                    backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
                    borderWidth: 0,
                    hoverOffset: 5
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { color: corTexto } } },
                cutout: '75%'
            }
        });
    }

    // --- 2. Gráfico de Fluxo de Caixa (Barras) ---
    const ctxFluxo = document.getElementById('fluxoCaixaChart').getContext('2d');
    if (graficoFluxo) graficoFluxo.destroy();
    
    graficoFluxo = new Chart(ctxFluxo, {
        type: 'bar',
        data: {
            labels: ['Mês Atual'], // Depois o Back-end vai mandar os meses reais
            datasets: [
                { label: 'Receitas', data: [receitas], backgroundColor: '#10b981', borderRadius: 4 },
                { label: 'Gastos', data: [gastos], backgroundColor: '#ef4444', borderRadius: 4 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: corTexto } } },
            scales: {
                y: { ticks: { color: corTexto }, grid: { color: 'rgba(255,255,255,0.05)' } },
                x: { ticks: { color: corTexto }, grid: { display: false } }
            }
        }
    });

    // --- 3. Mini-Gráfico do Saldo Atual (Linha suave) ---
    const ctxSaldo = document.getElementById('saldoChart').getContext('2d');
    if (graficoSaldo) graficoSaldo.destroy();

    graficoSaldo = new Chart(ctxSaldo, {
        type: 'line',
        data: {
            labels: ['Início', 'Meio', 'Atual'],
            datasets: [{
                data: [0, saldoFinal / 2, saldoFinal], // Cria uma curvinha de crescimento
                borderColor: '#8b5cf6', // Roxo (var(--primary))
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4, // Deixa a linha curvada
                pointRadius: 0
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: { x: { display: false }, y: { display: false, min: 0 } },
            layout: { padding: 0 }
        }
    });
}

// ==========================================
// 5. ADICIONAR NOVO LANÇAMENTO
// ==========================================
async function adicionarNovoLancamento() {
    const categoria = document.getElementById('catInput').value;
    let valorStr = document.getElementById('valorInput').value;

    if (!valorStr || valorStr <= 0) {
        alert("Por favor, insira um valor válido.");
        return;
    }

    const valorNum = parseFloat(valorStr);
    const novoGasto = { user_id: userId, categoria: categoria, valor: valorNum };

    try {
        const resposta = await fetch('/gastos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(novoGasto)
        });

        if (resposta.ok) {
            document.getElementById('valorInput').value = "";
            carregarDashboard(); // Recarrega os gráficos na hora!
        } else {
            alert("Erro ao salvar lançamento.");
        }
    } catch (erro) {
        alert("Erro de conexão.");
    }
}

// ==========================================
// 6. INTELIGÊNCIA ARTIFICIAL E SAIR
// ==========================================
async function analisar() {
    const btn = document.getElementById('btnAnalisar');
    btn.innerText = "Pensando...";
    btn.disabled = true;

    try {
        // 1. Puxamos os dados reais do banco para mandar para a IA
        const respostaBanco = await fetch(`/dashboard/${userId}`);
        const gastos = await respostaBanco.json();

        // 2. Mandamos os gastos para a nossa rota /analisar
        const respostaIA = await fetch('/analisar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(gastos)
        });

        const dadosIA = await respostaIA.json();

        if (respostaIA.ok) {
            // Cria um "Modal" elegante para mostrar a resposta
            mostrarModalIA(dadosIA.mensagem);
        } else {
            alert("Erro ao analisar: " + dadosIA.erro);
        }
    } catch (erro) {
        alert("Erro ao conectar com a Inteligência Artificial.");
    } finally {
        // Volta o botão ao normal
        btn.innerText = "Analisar";
        btn.disabled = false;
    }
}

function mostrarModalIA(texto) {
    // Se já tiver uma caixa de IA aberta, fecha ela
    const velha = document.getElementById('modal-ia');
    if (velha) velha.remove();

    // Cria a estrutura visual (Modal)
    const modal = document.createElement('div');
    modal.id = 'modal-ia';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(0,0,0,0.8); backdrop-filter: blur(5px);
        display: flex; justify-content: center; align-items: center; z-index: 9999;
    `;

    const card = document.createElement('div');
    card.style.cssText = `
        background: var(--card-bg); border: 1px solid var(--primary);
        padding: 30px; border-radius: 16px; max-width: 500px; width: 90%;
        color: white; box-shadow: 0 10px 30px rgba(99, 102, 241, 0.3);
    `;

    card.innerHTML = `
        <h2 style="color: var(--primary); margin-bottom: 15px;">
            <i class="fa-solid fa-robot"></i> Análise do Assistente IA
        </h2>
        <p style="line-height: 1.6; color: var(--text-muted);">${texto}</p>
        <button onclick="document.getElementById('modal-ia').remove()" class="btn-primary" style="margin-top: 20px; width: 100%;">Fechar Insights</button>
    `;

    modal.appendChild(card);
    document.body.appendChild(modal);
}

function logout() {
    localStorage.removeItem('token'); 
    window.location.href = '/';       
}

window.onload = carregarDashboard;