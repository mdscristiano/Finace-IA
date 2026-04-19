let user_id = localStorage.getItem("user_id");
let chart = null;

// Função auxiliar para pegar valores dos inputs
function getValue(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
}

// ==========================================
// GRÁFICOS E ELEMENTOS VISUAIS
// ==========================================

// 1. Gráfico de Saldo (Sparkline)
function renderSparkline() {
    const saldoCanvas = document.getElementById('saldoChart');
    if (!saldoCanvas) return;

    const saldoCtx = saldoCanvas.getContext('2d');
    let gradientFill = saldoCtx.createLinearGradient(0, 0, 0, 80);
    gradientFill.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
    gradientFill.addColorStop(1, 'rgba(59, 130, 246, 0)');

    new Chart(saldoCtx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago'],
            datasets: [{
                data: [12, 10, 18, 14, 38, 22, 25, 38],
                borderColor: '#3b82f6',
                borderWidth: 2,
                backgroundColor: gradientFill,
                fill: true,
                pointRadius: 0,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: {
                x: { grid: { display: false, drawBorder: false }, ticks: { color: '#9ca3af', font: { size: 11 } } },
                y: { display: false, min: 0 }
            },
            layout: { padding: { left: -8, right: 0, bottom: 0, top: 10 } }
        }
    });
}

// 2. Gráfico de Fluxo de Caixa Mensal (Linhas com Área)
function renderFluxoCaixaChart() {
    const canvas = document.getElementById('fluxoCaixaChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Gradiente Azul (Receita)
    let gradReceita = ctx.createLinearGradient(0, 0, 0, 350);
    gradReceita.addColorStop(0, 'rgba(59, 130, 246, 0.5)');
    gradReceita.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

    // Gradiente Laranja (Gastos)
    let gradGastos = ctx.createLinearGradient(0, 0, 0, 350);
    gradGastos.addColorStop(0, 'rgba(249, 115, 22, 0.5)');
    gradGastos.addColorStop(1, 'rgba(249, 115, 22, 0.0)');

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Sep', 'Out', 'Nov', 'Dez'],
            datasets: [
                {
                    label: 'Receita',
                    data: [4500, 6500, 5000, 8500, 10000, 8000, 13298, 7500, 15500, 7000, 11500, 3000],
                    borderColor: '#3b82f6',
                    backgroundColor: gradReceita,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                },
                {
                    label: 'Gastos',
                    data: [2000, 3500, 500, 5500, 5000, 4500, 8000, 0, 7000, 5500, 16000, 3500],
                    borderColor: '#f97316',
                    backgroundColor: gradGastos,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#f97316',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: '#e5e7eb', usePointStyle: true, boxWidth: 8 }
                },
                tooltip: {
                    backgroundColor: '#151b2b',
                    titleColor: '#e5e7eb',
                    bodyColor: '#e5e7eb',
                    borderColor: '#2a3449',
                    borderWidth: 1,
                    padding: 12
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(42, 52, 73, 0.4)', drawBorder: false },
                    ticks: { color: '#9ca3af' }
                },
                y: {
                    grid: { color: 'rgba(42, 52, 73, 0.4)', drawBorder: false },
                    ticks: {
                        color: '#9ca3af',
                        callback: function (value) { return 'R$ ' + value.toLocaleString('pt-BR'); }
                    },
                    min: 0,
                    suggestedMax: 25000
                }
            }
        }
    });
}

// 3. Gráfico de Análise Vertical (Donut/Rosca)
function renderDonutChart() {
    const ctx = document.getElementById("financeChart");
    if (!ctx) return;

    let chartStatus = Chart.getChart("financeChart");
    if (chartStatus != undefined) {
        chartStatus.destroy();
    }

    chart = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: ["Matérias-Primas", "Serviços Terceiros", "Impostos", "Marketing", "Outros"],
            datasets: [{
                data: [30, 25, 20, 15, 10],
                backgroundColor: ["#ffffff", "#93c5fd", "#3b82f6", "#1e3a8a", "#60a5fa"],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: "bottom",
                    labels: { font: { family: "sans-serif", size: 12 }, color: "#9ca3af", padding: 20 }
                }
            }
        }
    });
}

// 4. Tabela de Últimos Lançamentos
function renderUltimosLancamentos() {
    const tbody = document.getElementById('tabela-lancamentos');
    if (!tbody) return;

    const lançamentosMock = [
        { descricao: "Projeto Web", categoria: "Receita - Serviço", valor: 1000.00, data: "23/03/2023", tipo: "receita" },
        { descricao: "Compra de Mouse", categoria: "Gasto - Equipamentos", valor: 150.00, data: "29/03/2023", tipo: "gasto" },
        { descricao: "Consultoria IA", categoria: "Receita - Serviço", valor: 2500.00, data: "05/04/2023", tipo: "receita" },
        { descricao: "Assinatura Servidor", categoria: "Gasto - Software", valor: 85.00, data: "10/04/2023", tipo: "gasto" }
    ];

    tbody.innerHTML = '';

    lançamentosMock.forEach(item => {
        const tr = document.createElement('tr');
        const isReceita = item.tipo === 'receita';
        const iconClass = isReceita ? 'icon-receita' : 'icon-gasto';
        const iconSymbol = isReceita ? 'fa-wallet' : 'fa-bag-shopping';
        const textClass = isReceita ? 'text-success' : 'text-danger';

        tr.innerHTML = `
          <td>
              <div class="desc-cell">
                  <div class="icon-box ${iconClass}">
                      <i class="fa-solid ${iconSymbol}"></i>
                  </div>
                  <span style="font-weight: 500;">${item.descricao}</span>
              </div>
          </td>
          <td style="color: #9ca3af;">${item.categoria}</td>
          <td class="${textClass}">R$ ${item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
          <td style="color: #9ca3af;">${item.data}</td>
      `;
        tbody.appendChild(tr);
    });
}

// 5. Adicionar Novo Lançamento na Tabela
function adicionarNovoLancamento() {
    const desc = document.getElementById('descInput').value;
    const cat = document.getElementById('catInput').value;
    const valor = parseFloat(document.getElementById('valorInput').value);
    let data = document.getElementById('dataInput').value;

    if (!desc || !valor || !data) {
        alert("Por favor, preencha todos os campos (Descrição, Valor e Data)!");
        return;
    }

    const dataParts = data.split('-');
    data = `${dataParts[2]}/${dataParts[1]}/${dataParts[0]}`;

    const isReceita = cat.toLowerCase().includes("receita");

    const tr = document.createElement('tr');
    const iconClass = isReceita ? 'icon-receita' : 'icon-gasto';
    const iconSymbol = isReceita ? 'fa-wallet' : 'fa-bag-shopping';
    const textClass = isReceita ? 'text-success' : 'text-danger';

    tr.innerHTML = `
      <td>
          <div class="desc-cell">
              <div class="icon-box ${iconClass}">
                  <i class="fa-solid ${iconSymbol}"></i>
              </div>
              <span style="font-weight: 500;">${desc}</span>
          </div>
      </td>
      <td style="color: #9ca3af;">${cat}</td>
      <td class="${textClass}">R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
      <td style="color: #9ca3af;">${data}</td>
  `;

    const tbody = document.getElementById('tabela-lancamentos');
    tbody.insertBefore(tr, tbody.firstChild);

    document.getElementById('descInput').value = '';
    document.getElementById('valorInput').value = '';
    document.getElementById('dataInput').value = '';
}

// ================== INIT (INICIALIZAÇÃO DA TELA) ==================
document.addEventListener('DOMContentLoaded', () => {
    // Agora todas as 4 funções de visualização vão rodar!
    renderSparkline();
    renderFluxoCaixaChart();
    renderDonutChart();
    renderUltimosLancamentos();
});

// ==========================================
// FUNÇÕES DE BACKEND / API (MANTIDAS)
// ==========================================
async function register() { /* ... Seu código original ... */ }
async function login() { /* ... Seu código original ... */ }
async function add() { /* ... Seu código original ... */ }
async function carregar() { /* ... Seu código original ... */ }
async function analisar() {
    alert("IA: Analisando seus dados em breve!");
}
function logout() {
    localStorage.removeItem("user_id");
    window.location.href = "/";
}





// =========================

// IA (API TEVION) - MODO NINJA

// =========================

app.post("/analisar", async (req, res) => {

    const dados = req.body;



    if (!dados || (Array.isArray(dados) && dados.length === 0)) {

        return res.status(400).json({ erro: "Nenhum dado enviado para análise" });

    }

    try {

        const prompt = `Você é um consultor financeiro do sistema Finance IA. Analise estes dados financeiros do usuário (onde receitas são positivas e gastos são negativos) e dê um conselho prático e curto em português sobre como melhorar o saldo: ${JSON.stringify(dados)}`;

        const promptCodificado = encodeURIComponent(prompt);

        // Sem o "?" - idêntico ao seu cURL

        const urlApi = `https://gptfree.tevion.com.br/prompt=${promptCodificado}`;



        // Enviando com disfarce de navegador (Headers)

        const resposta = await fetch(urlApi, {

            method: 'GET',

            headers: {

                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',

                'Accept': 'application/json, text/plain, */*'

            }

        });



        if (!resposta.ok) {

            throw new Error(`A API da Tevion recusou a conexão. Status: ${resposta.status}`);

        }



        const textoResposta = await resposta.text();

        res.json({ mensagem: textoResposta });



    } catch (error) {

        console.error("🚨 ERRO DETALHADO DA IA:", error.message);

        res.status(500).json({ erro: "Falha ao conectar com o servidor da IA." });

    }

});