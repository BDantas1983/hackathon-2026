/**
 * BVX 360 - Lógica Frontend
 * Consome os endpoints da API FastAPI e interage com o Copiloto de IA
 */

// URL pública padrão do Backend no Render
const RENDER_PROD_URL = 'https://hackathon-2026-6ni3.onrender.com';

// Detecta a URL base da API (suporte a localhost:8000, Live Server porta 5500, Vercel e Render)
function obterApiBase() {
  const salva = localStorage.getItem('BVX_RENDER_API');
  if (salva) {
    return salva.replace(/\/$/, '');
  }

  const origin = window.location.origin || '';
  const port = window.location.port;
  const isRender = origin.includes('onrender.com');

  if (isRender) {
    return '';
  }

  // Se estiver rodando exatamente na porta 8000 do FastAPI local
  if (port === '8000') {
    return '';
  }

  // Se estiver rodando em outra porta local (ex: Live Server 5500, Vite 5173, etc.)
  const isLocal = origin.includes('localhost') || origin.includes('127.0.0.1');
  if (isLocal) {
    return 'http://localhost:8000';
  }

  // Se for ambiente remoto ou file://
  return RENDER_PROD_URL;
}

let API_BASE = obterApiBase();

function atualizarStatusConexaoApi(customMsg) {
  const label = document.getElementById('api-status-label');
  if (!label) return;
  if (customMsg) {
    label.innerText = customMsg;
    return;
  }
  const isLocal = API_BASE.includes('localhost') || API_BASE.includes('127.0.0.1') || (!API_BASE && window.location.port === '8000');
  const isRender = API_BASE.includes('onrender.com') || window.location.origin.includes('onrender.com');
  if (isLocal) {
    label.innerText = 'API Local (8000)';
  } else if (isRender) {
    label.innerText = 'Render Conectado';
  } else {
    label.innerText = 'Render Conectado';
  }
}

function abrirConfigApi() {
  const atual = localStorage.getItem('BVX_RENDER_API') || '';
  const novaUrl = prompt(
    "Insira a URL pública do seu backend no Render (ex: https://bvx360-backend.onrender.com):\n\n(Deixe vazio para usar a rota relativa padrão)",
    atual
  );
  if (novaUrl !== null) {
    if (novaUrl.trim()) {
      localStorage.setItem('BVX_RENDER_API', novaUrl.trim());
    } else {
      localStorage.removeItem('BVX_RENDER_API');
    }
    window.location.reload();
  }
}

let allClients = [];
let currentFilter = 'all';
let filterBackupCritico = false;
let filterVersaoAntiga = false;
let filterAnomaliaIA = false;
let selectedClient = null;

// Instâncias Chart.js (controle de lifecycle)
let chartRiskDoughnut = null;
let chartRadarPillars = null;
let chartTopMelhores = null;
let chartTopPiores = null;
let chartTopValencia = null;

// ==================== INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', () => {
  atualizarStatusConexaoApi();
  carregarEstatisticas();
  carregarAlertas();
  carregarClientes();
  configurarEventos();
});

// ==================== REQUISIÇÕES DA API ====================

async function carregarEstatisticas() {
  try {
    const res = await fetch(`${API_BASE}/api/dashboard/stats`);
    if (!res.ok) throw new Error('Erro ao buscar stats');
    const data = await res.json();

    document.getElementById('avg-health-score').innerText = data.media_health_score;
    document.getElementById('avg-health-fill').style.width = `${data.media_health_score}%`;
    
    document.getElementById('count-high-risk').innerText = data.distribuicao_risco.alto_risco;
    document.getElementById('pct-high-risk').innerText = `${data.distribuicao_risco.pct_alto_risco}% da base ativa`;

    document.getElementById('count-attention').innerText = data.distribuicao_risco.atencao;
    document.getElementById('pct-attention').innerText = `${data.distribuicao_risco.pct_atencao}% da base ativa`;

    document.getElementById('count-healthy').innerText = data.distribuicao_risco.baixo_risco;
    document.getElementById('pct-healthy').innerText = `${data.distribuicao_risco.pct_baixo_risco}% da base ativa`;

    const faturamentoFormatado = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0
    }).format(data.faturamento_diario_monitorado);
    document.getElementById('total-revenue').innerText = faturamentoFormatado;

    // === GRÁFICO DOUGHNUT: Distribuição de Risco ===
    renderizarGraficoDoughnut(
      data.distribuicao_risco.alto_risco,
      data.distribuicao_risco.atencao,
      data.distribuicao_risco.baixo_risco
    );

  } catch (err) {
    console.error('Falha ao carregar KPIs:', err);
  }
}

async function carregarAlertas() {
  try {
    const res = await fetch(`${API_BASE}/api/alerts`);
    if (!res.ok) throw new Error('Erro ao buscar alertas');
    const alertas = await res.json();

    const container = document.getElementById('alerts-container');
    const countBadge = document.getElementById('alerts-count-badge');
    countBadge.innerText = `${alertas.length} alertas ativos`;

    container.innerHTML = alertas.map(a => `
      <div class="alert-item-card" onclick="selecionarClientePorId(${a.client_id})">
        <div class="alert-item-client">⚠️ ${a.cliente} (${a.cidade})</div>
        <div class="alert-item-msg">${a.mensagem}</div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Falha ao carregar alertas:', err);
  }
}

async function carregarClientes() {
  try {
    const res = await fetch(`${API_BASE}/api/clients`);
    if (!res.ok) throw new Error('Erro ao buscar clientes');
    allClients = await res.json();
    renderizarListaClientes();
    
    // Auto-seleciona o primeiro cliente da lista (geralmente o mais crítico)
    if (allClients.length > 0 && !selectedClient) {
      selecionarCliente(allClients[0]);
    }
  } catch (err) {
    console.error('Falha ao carregar clientes via ' + API_BASE, err);
    // Se falhou tentando conectar localmente, tenta automaticamente o Render
    if (API_BASE !== RENDER_PROD_URL) {
      console.warn('Tentando fallback automático para o Render:', RENDER_PROD_URL);
      try {
        API_BASE = RENDER_PROD_URL;
        atualizarStatusConexaoApi('Render Conectado (Fallback)');
        const resRender = await fetch(`${API_BASE}/api/clients`);
        if (resRender.ok) {
          allClients = await resRender.json();
          renderizarListaClientes();
          if (allClients.length > 0 && !selectedClient) {
            selecionarCliente(allClients[0]);
          }
          carregarEstatisticas();
          carregarAlertas();
          return;
        }
      } catch (renderErr) {
        console.error('Falha também no Render:', renderErr);
      }
    }

    const container = document.getElementById('clients-list');
    if (container) {
      container.innerHTML = `
        <div style="text-align:center; padding: 30px 15px; color: var(--color-danger);">
          <div style="font-size: 26px; margin-bottom: 8px;">⚠️</div>
          <div style="font-weight: 700; margin-bottom: 6px;">Não foi possível carregar os dados</div>
          <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 14px;">
            A aplicação tentou conectar em <code>${API_BASE}</code>.<br>
            Verifique se o backend FastAPI está ativo na porta 8000 ou conecte-se ao servidor na nuvem.
          </div>
          <button onclick="abrirConfigApi()" class="btn-primary-action" style="padding: 6px 14px; font-size: 12px; margin: 0 auto; display: inline-flex;">
            ⚙️ Configurar URL da API
          </button>
        </div>
      `;
    }
  }
}

// ==================== FILTRAGEM E RENDERIZAÇÃO ====================

function renderizarListaClientes() {
  const container = document.getElementById('clients-list');
  const countBadge = document.getElementById('filtered-clients-count');
  const termoBusca = document.getElementById('search-input').value.toLowerCase().trim();

  let filtrados = allClients.filter(c => {
    // Filtro de risco
    if (currentFilter !== 'all' && c.risco !== currentFilter) {
      return false;
    }
    // Filtro backup
    if (filterBackupCritico && c.dias_sem_backup < 3 && c.backup_integro) {
      return false;
    }
    // Filtro versão antiga
    if (filterVersaoAntiga && c.versao_sistema.startsWith('5.4')) {
      return false;
    }
    // Filtro anomalia IA (Isolation Forest)
    if (filterAnomaliaIA && !c.alerta_anomalia) {
      return false;
    }
    // Busca textual
    if (termoBusca) {
      const matchNome = c.nome_fantasia.toLowerCase().includes(termoBusca);
      const matchPdv = c.codigo_pdv.toLowerCase().includes(termoBusca);
      const matchCidade = c.cidade.toLowerCase().includes(termoBusca);
      const matchResp = c.responsavel.toLowerCase().includes(termoBusca);
      if (!matchNome && !matchPdv && !matchCidade && !matchResp) return false;
    }
    return true;
  });

  countBadge.innerText = `${filtrados.length} clientes`;

  if (filtrados.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding: 40px 10px; color: var(--text-dim);">
        Nenhum cliente encontrado com os filtros selecionados.
      </div>
    `;
    return;
  }

  container.innerHTML = filtrados.map(c => {
    const isSelected = selectedClient && selectedClient.id === c.id;
    const bubbleClass = c.health_score < 50 ? 'score-bubble-high' : (c.health_score < 75 ? 'score-bubble-med' : 'score-bubble-low');
    
    // Tags dinâmicas
    let tagsHtml = '';
    if (c.dias_sem_backup >= 3 || !c.backup_integro) {
      tagsHtml += `<span class="mini-tag tag-backup-bad">💾 Backup ${c.dias_sem_backup}d</span>`;
    }
    if (!c.versao_sistema.startsWith('5.4')) {
      tagsHtml += `<span class="mini-tag tag-version-bad">📦 v${c.versao_sistema}</span>`;
    }
    if (c.variacao_vendas_pct <= -20) {
      tagsHtml += `<span class="mini-tag tag-backup-bad">📉 Vendas ${c.variacao_vendas_pct}%</span>`;
    }
    if (c.alerta_anomalia) {
      tagsHtml += `<span class="mini-tag tag-ai-anomaly" title="${c.tipo_anomalia || 'Anomalia multivariada detectada por IA'}">⚡ IA: Anomalia</span>`;
    }

    return `
      <div class="client-item-row ${isSelected ? 'selected' : ''}" onclick="selecionarClientePorId(${c.id})">
        <div class="client-primary">
          <div class="client-name-text">${c.nome_fantasia}</div>
          <div class="client-sub-meta">${c.codigo_pdv} • ${c.cidade} - ${c.uf} • ${c.responsavel}</div>
          <div class="client-tags-row">${tagsHtml}</div>
        </div>
        <div class="client-score-col">
          <div class="client-score-bubble ${bubbleClass}">
            ${c.health_score}
          </div>
          <span style="font-size: 10px; color: var(--text-dim);">${c.risco}</span>
        </div>
      </div>
    `;
  }).join('');
}

function selecionarClientePorId(id) {
  const c = allClients.find(item => item.id === id);
  if (c) {
    selecionarCliente(c);
  }
}

function selecionarCliente(cliente) {
  selectedClient = cliente;
  renderizarListaClientes(); // Atualiza a seleção visual na lista

  document.getElementById('empty-detail-state').style.display = 'none';
  document.getElementById('client-detail-content').style.display = 'block';

  // Atualiza indicador de cliente selecionado no menu de relatórios
  const dropdownIndicator = document.getElementById('dropdown-client-indicator');
  if (dropdownIndicator) {
    dropdownIndicator.innerText = cliente.nome_fantasia;
  }

  // Cabeçalho do Detalhe
  document.getElementById('detail-pdv-code').innerText = cliente.codigo_pdv;
  document.getElementById('detail-city-tag').innerText = `${cliente.cidade} - ${cliente.uf}`;
  document.getElementById('detail-cluster-tag').innerText = cliente.cluster_nome || 'Cluster Padrão';
  document.getElementById('detail-name').innerText = cliente.nome_fantasia;
  document.getElementById('detail-responsible').innerText = cliente.responsavel;
  document.getElementById('detail-phone').innerText = cliente.telefone;
  document.getElementById('detail-terminals').innerText = cliente.quantidade_terminais;

  // Gauge do Health Score
  const scoreVal = document.getElementById('detail-score-value');
  const riskBadge = document.getElementById('detail-risk-badge');
  const gaugeCircle = document.getElementById('gauge-circle');

  scoreVal.innerText = cliente.health_score;
  riskBadge.innerText = cliente.risco;
  riskBadge.style.color = cliente.cor_risco;
  riskBadge.style.borderColor = cliente.cor_risco;
  gaugeCircle.style.borderColor = cliente.cor_risco;
  gaugeCircle.style.boxShadow = `0 0 20px ${cliente.cor_risco}40`;

  // Banner de Anomalia Detectada por IA (Isolation Forest)
  const anomalyBanner = document.getElementById('detail-anomaly-banner');
  const anomalyDesc = document.getElementById('detail-anomaly-desc');
  if (anomalyBanner && anomalyDesc) {
    if (cliente.alerta_anomalia) {
      anomalyBanner.style.display = 'flex';
      anomalyDesc.innerText = cliente.tipo_anomalia 
        ? `${cliente.tipo_anomalia} - Identificado pelo modelo preditivo Isolation Forest.`
        : 'Padrão atípico multivariado identificado nos pilares operacionais.';
    } else {
      anomalyBanner.style.display = 'none';
    }
  }

  // 01. Pilar Versionamento
  document.getElementById('pillar-version-val').innerText = cliente.versao_sistema;
  const isHomologado = cliente.versao_sistema.startsWith('5.4');
  document.getElementById('pillar-version-status').innerText = isHomologado 
    ? 'Versão Homologada e Estável' 
    : `Defasada (Versão Homologada: ${cliente.versao_atual_homologada})`;
  document.getElementById('pillar-version-status').style.color = isHomologado ? 'var(--color-success)' : 'var(--color-warning)';

  // 02. Pilar Backup
  document.getElementById('pillar-backup-val').innerText = cliente.dias_sem_backup === 0 ? 'Hoje' : `Há ${cliente.dias_sem_backup} dias`;
  const backupOk = cliente.dias_sem_backup <= 1 && cliente.backup_integro;
  document.getElementById('pillar-backup-status').innerText = backupOk 
    ? `Íntegro (${cliente.tamanho_backup_mb} MB)` 
    : (!cliente.backup_integro ? 'Falha de Integridade / Risco' : 'Atraso Crítico');
  document.getElementById('pillar-backup-status').style.color = backupOk ? 'var(--color-success)' : 'var(--color-danger)';

  // 03. Pilar Vendas / Utilização
  const sinalVendas = cliente.variacao_vendas_pct >= 0 ? `+${cliente.variacao_vendas_pct}%` : `${cliente.variacao_vendas_pct}%`;
  document.getElementById('pillar-sales-val').innerText = sinalVendas;
  const vendasOk = cliente.variacao_vendas_pct >= -10;
  document.getElementById('pillar-sales-status').innerText = vendasOk ? 'Uso Normal do PDV' : 'Sinal de Abandono (Churn)';
  document.getElementById('pillar-sales-status').style.color = vendasOk ? 'var(--color-success)' : 'var(--color-danger)';

  // 04. Pilar Chamados
  document.getElementById('pillar-tickets-val').innerText = `${cliente.chamados_ultimos_30d} chamados`;
  const chamadosOk = cliente.chamados_ultimos_30d <= 2;
  document.getElementById('pillar-tickets-status').innerText = chamadosOk ? 'Demanda Estável' : 'Alto Volume de Dúvidas/Bugs';
  document.getElementById('pillar-tickets-status').style.color = chamadosOk ? 'var(--color-success)' : 'var(--color-warning)';

  // Reseta controles do Simulador
  document.getElementById('sim-check-version').checked = false;
  document.getElementById('sim-check-backup').checked = false;
  document.getElementById('sim-check-tickets').checked = false;
  
  document.getElementById('sim-current-score').innerText = cliente.health_score;
  document.getElementById('sim-projected-score').innerText = cliente.health_score;
  document.getElementById('sim-diff-badge').innerText = '+0 pts';
  document.getElementById('sim-feedback-text').innerText = 'Selecione as ações acima para simular a recuperação do cliente.';

  // === GRÁFICO RADAR: Atualiza pilares 360° ===
  if (cliente.detalhe_subscores) {
    renderizarGraficoRadar(cliente.detalhe_subscores);
  }
}

// ==================== SIMULADOR DE IMPACTO ====================

async function executarSimulacao() {
  if (!selectedClient) return;

  const simVersao = document.getElementById('sim-check-version').checked;
  const simBackup = document.getElementById('sim-check-backup').checked;
  const simChamados = document.getElementById('sim-check-tickets').checked;

  try {
    const res = await fetch(`${API_BASE}/api/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: selectedClient.id,
        simula_versao: simVersao,
        simula_backup: simBackup,
        simula_chamados: simChamados
      })
    });
    if (!res.ok) throw new Error('Erro na simulação');
    const data = await res.json();

    document.getElementById('sim-current-score').innerText = data.score_original;
    document.getElementById('sim-projected-score').innerText = data.score_simulado;
    
    const ganho = data.ganho_pontos;
    document.getElementById('sim-diff-badge').innerText = `+${ganho} pts`;

    if (ganho > 0) {
      document.getElementById('sim-feedback-text').innerHTML = `
        Com essas ações preventivas, o cliente evolui de <strong>${data.risco_original}</strong> para 
        <strong style="color:var(--color-success);">${data.risco_simulado}</strong>, reduzindo o risco de churn!
      `;
    } else {
      document.getElementById('sim-feedback-text').innerText = 'Nenhuma intervenção selecionada no momento.';
    }

  } catch (err) {
    console.warn('Falha na API remota de simulação, calculando com motor local BVX:', err);
    // Fallback motor local BVX (Base 100 ponderada: 30% Backup, 25% Versão, 25% Vendas, 20% Chamados)
    const c = selectedClient;
    const sub = c.detalhe_subscores || { backup: 50, versao: 50, vendas: 50, chamados: 50 };

    const ptsBackup = simBackup ? 100 * 0.30 : (sub.backup || 0) * 0.30;
    const ptsVersao = simVersao ? 100 * 0.25 : (sub.versao || 0) * 0.25;
    const ptsVendas = (sub.vendas || 0) * 0.25;
    const ptsChamados = simChamados ? Math.min(100, (sub.chamados || 50) + 40) * 0.20 : (sub.chamados || 0) * 0.20;

    const scoreOrig = c.health_score || 0;
    const scoreSim = Math.min(100, Math.round(ptsBackup + ptsVersao + ptsVendas + ptsChamados));
    const ganho = Math.max(0, scoreSim - scoreOrig);

    const riscoOrig = c.risco || (scoreOrig < 50 ? 'ALTO RISCO' : scoreOrig < 75 ? 'ATENÇÃO' : 'BAIXO RISCO');
    const riscoSim = scoreSim < 50 ? 'ALTO RISCO' : scoreSim < 75 ? 'ATENÇÃO' : 'BAIXO RISCO';

    const elCurrent = document.getElementById('sim-current-score');
    const elProjected = document.getElementById('sim-projected-score');
    const elDiff = document.getElementById('sim-diff-badge');
    const elFeedback = document.getElementById('sim-feedback-text');

    if (elCurrent) elCurrent.innerText = scoreOrig;
    if (elProjected) elProjected.innerText = scoreSim;
    if (elDiff) elDiff.innerText = `+${ganho} pts`;

    if (elFeedback) {
      if (ganho > 0) {
        elFeedback.innerHTML = `
          Com essas ações preventivas, o cliente evolui de <strong>${riscoOrig}</strong> para 
          <strong style="color:var(--color-success);">${riscoSim}</strong>, reduzindo o risco de churn!
        `;
      } else {
        elFeedback.innerText = 'Nenhuma intervenção selecionada no momento.';
      }
    }
  }
}

// ==================== COPILOTO DE IA ====================

function abrirModal(titulo, icone, subtitulo) {
  const modal = document.getElementById('ai-modal');
  document.getElementById('modal-title').innerText = titulo;
  document.getElementById('modal-type-icon').innerText = icone;
  document.getElementById('modal-subtitle').innerText = subtitulo;
  
  document.getElementById('modal-loading').style.display = 'block';
  document.getElementById('modal-text-content').innerText = '';
  document.getElementById('modal-whatsapp-link').style.display = 'none';

  modal.style.display = 'flex';
}

function fecharModal() {
  document.getElementById('ai-modal').style.display = 'none';
}

async function acionarDiagnosticoIA() {
  if (!selectedClient) return;
  abrirModal(`Diagnóstico Preditivo: ${selectedClient.nome_fantasia}`, '🔍', 'Motor Analítico BVX via FreeLLMAPI');

  try {
    const res = await fetch(`${API_BASE}/api/ai/diagnose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: selectedClient.id })
    });
    const data = await res.json();
    document.getElementById('modal-loading').style.display = 'none';
    document.getElementById('modal-text-content').innerText = data.diagnostico;
  } catch (err) {
    document.getElementById('modal-loading').style.display = 'none';
    document.getElementById('modal-text-content').innerText = 'Erro ao processar com a IA. Tente novamente.';
  }
}

async function acionarMensagemIA(canal) {
  if (!selectedClient) return;
  const isWhatsapp = canal === 'whatsapp';
  const icone = isWhatsapp ? '💬' : '✉️';
  const canalNome = isWhatsapp ? 'WhatsApp' : 'E-mail Preventivo';
  
  abrirModal(`Script de Contato (${canalNome})`, icone, `Destinatário: ${selectedClient.responsavel} - ${selectedClient.nome_fantasia}`);

  try {
    const res = await fetch(`${API_BASE}/api/ai/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: selectedClient.id,
        canal: canal
      })
    });
    const data = await res.json();
    document.getElementById('modal-loading').style.display = 'none';
    document.getElementById('modal-text-content').innerText = data.mensagem;

    if (isWhatsapp) {
      const waLink = document.getElementById('modal-whatsapp-link');
      const telDigitos = selectedClient.telefone.replace(/\D/g, '');
      const waUrl = `https://wa.me/55${telDigitos}?text=${encodeURIComponent(data.mensagem)}`;
      waLink.href = waUrl;
      waLink.style.display = 'inline-flex';
    }
  } catch (err) {
    document.getElementById('modal-loading').style.display = 'none';
    document.getElementById('modal-text-content').innerText = 'Erro ao gerar mensagem com a IA. Tente novamente.';
  }
}

// ==================== CONFIGURAÇÃO DE EVENTOS ====================

function configurarEventos() {
  // Filtros de Risco
  document.querySelectorAll('.filter-chip[data-filter]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-chip[data-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.getAttribute('data-filter');
      renderizarListaClientes();
    });
  });

  // Filtro Backup Crítico
  const btnBackup = document.getElementById('filter-backup-btn');
  btnBackup.addEventListener('click', () => {
    filterBackupCritico = !filterBackupCritico;
    btnBackup.classList.toggle('active', filterBackupCritico);
    renderizarListaClientes();
  });

  // Filtro Versão Antiga
  const btnVersao = document.getElementById('filter-version-btn');
  btnVersao.addEventListener('click', () => {
    filterVersaoAntiga = !filterVersaoAntiga;
    btnVersao.classList.toggle('active', filterVersaoAntiga);
    renderizarListaClientes();
  });

  // Filtro Anomalias IA (Isolation Forest)
  const btnAnomaly = document.getElementById('filter-anomaly-btn');
  if (btnAnomaly) {
    btnAnomaly.addEventListener('click', () => {
      filterAnomaliaIA = !filterAnomaliaIA;
      btnAnomaly.classList.toggle('active', filterAnomaliaIA);
      renderizarListaClientes();
    });
  }

  // Botão Gerar Ordem de Serviço Preventiva (O.S. Oficial BVX)
  const btnGerarOS = document.getElementById('btn-gerar-os');
  if (btnGerarOS) {
    btnGerarOS.addEventListener('click', () => {
      abrirModalOS(selectedClient);
    });
  }

  // Modais de O.S. Preventiva
  const btnCloseOS = document.getElementById('modal-os-close-btn');
  if (btnCloseOS) {
    btnCloseOS.addEventListener('click', fecharModalOS);
  }

  const btnCloseOSBottom = document.getElementById('modal-os-close-bottom-btn');
  if (btnCloseOSBottom) {
    btnCloseOSBottom.addEventListener('click', fecharModalOS);
  }

  const modalOS = document.getElementById('modal-os-preventiva');
  if (modalOS) {
    modalOS.addEventListener('click', (e) => {
      if (e.target.id === 'modal-os-preventiva') fecharModalOS();
    });
  }

  const btnPrintOS = document.getElementById('modal-os-print-btn');
  if (btnPrintOS) {
    btnPrintOS.addEventListener('click', () => {
      window.print();
    });
  }

  // Botão Gerar Laudo de Conformidade (Cliente)
  const btnGerarLaudo = document.getElementById('btn-gerar-laudo');
  if (btnGerarLaudo) {
    btnGerarLaudo.addEventListener('click', () => {
      abrirModalLaudo(selectedClient);
    });
  }

  // Modais de Laudo do Cliente
  const btnCloseLaudo = document.getElementById('modal-laudo-close-btn');
  if (btnCloseLaudo) {
    btnCloseLaudo.addEventListener('click', fecharModalLaudo);
  }

  const btnCloseLaudoBottom = document.getElementById('modal-laudo-close-bottom-btn');
  if (btnCloseLaudoBottom) {
    btnCloseLaudoBottom.addEventListener('click', fecharModalLaudo);
  }

  const modalLaudo = document.getElementById('modal-laudo-conformidade');
  if (modalLaudo) {
    modalLaudo.addEventListener('click', (e) => {
      if (e.target.id === 'modal-laudo-conformidade') fecharModalLaudo();
    });
  }

  const btnPrintLaudo = document.getElementById('modal-laudo-print-btn');
  if (btnPrintLaudo) {
    btnPrintLaudo.addEventListener('click', () => {
      window.print();
    });
  }

  // Modal de Análise Estratégica de Extremos (Colab / Top 10)
  const btnExtremos = document.getElementById('btn-open-extremos-modal');
  if (btnExtremos) {
    btnExtremos.addEventListener('click', abrirModalExtremos);
  }

  const btnCloseExtremos = document.getElementById('modal-extremos-close-btn');
  if (btnCloseExtremos) {
    btnCloseExtremos.addEventListener('click', fecharModalExtremos);
  }

  const btnCloseExtremosBottom = document.getElementById('modal-extremos-close-bottom-btn');
  if (btnCloseExtremosBottom) {
    btnCloseExtremosBottom.addEventListener('click', fecharModalExtremos);
  }

  const modalExtremos = document.getElementById('modal-extremos');
  if (modalExtremos) {
    modalExtremos.addEventListener('click', (e) => {
      if (e.target.id === 'modal-extremos') fecharModalExtremos();
    });
  }

  const btnPrintExtremos = document.getElementById('modal-extremos-print-btn');
  if (btnPrintExtremos) {
    btnPrintExtremos.addEventListener('click', () => {
      window.print();
    });
  }

  // Dropdown Central de Relatórios & Ações
  const dropdownWrap = document.getElementById('reports-dropdown-wrap');
  const btnToggleReports = document.getElementById('btn-toggle-reports-menu');
  const reportsMenu = document.getElementById('reports-dropdown-menu');
  const btnClientReports = document.getElementById('btn-client-reports');

  function alternarMenuRelatorios(e) {
    if (e) e.stopPropagation();
    if (!reportsMenu) return;
    const isVisible = reportsMenu.style.display === 'flex';
    reportsMenu.style.display = isVisible ? 'none' : 'flex';
    if (dropdownWrap) {
      dropdownWrap.classList.toggle('active', !isVisible);
    }
  }

  function fecharMenuRelatorios() {
    if (reportsMenu) reportsMenu.style.display = 'none';
    if (dropdownWrap) dropdownWrap.classList.remove('active');
  }

  if (btnToggleReports) {
    btnToggleReports.addEventListener('click', alternarMenuRelatorios);
  }

  if (btnClientReports) {
    btnClientReports.addEventListener('click', (e) => {
      alternarMenuRelatorios(e);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Fechar dropdown ao clicar fora
  document.addEventListener('click', (e) => {
    if (dropdownWrap && !dropdownWrap.contains(e.target)) {
      fecharMenuRelatorios();
    }
  });

  // Ações dos Itens do Dropdown
  const itemDossie = document.getElementById('menu-item-dossie');
  if (itemDossie) {
    itemDossie.addEventListener('click', () => {
      fecharMenuRelatorios();
      abrirModalDossie();
    });
  }

  const itemExtremos = document.getElementById('menu-item-extremos');
  if (itemExtremos) {
    itemExtremos.addEventListener('click', () => {
      fecharMenuRelatorios();
      abrirModalExtremos();
    });
  }

  const itemPerdas = document.getElementById('menu-item-perdas');
  if (itemPerdas) {
    itemPerdas.addEventListener('click', () => {
      fecharMenuRelatorios();
      if (!selectedClient && allClients && allClients.length > 0) {
        selecionarCliente(allClients[0]);
      }
      abrirModalGraficoPerdas();
    });
  }

  const itemOS = document.getElementById('menu-item-os');
  if (itemOS) {
    itemOS.addEventListener('click', () => {
      fecharMenuRelatorios();
      if (!selectedClient && allClients && allClients.length > 0) {
        selecionarCliente(allClients[0]);
      }
      abrirModalOS(selectedClient);
    });
  }

  const itemLaudo = document.getElementById('menu-item-laudo');
  if (itemLaudo) {
    itemLaudo.addEventListener('click', () => {
      fecharMenuRelatorios();
      if (!selectedClient && allClients && allClients.length > 0) {
        selecionarCliente(allClients[0]);
      }
      abrirModalLaudo(selectedClient);
    });
  }

  // Modal Dossiê Executivo (Diretoria)
  const btnDossie = document.getElementById('btn-open-dossier-modal');
  if (btnDossie) {
    btnDossie.addEventListener('click', abrirModalDossie);
  }

  const btnDossieFicha = document.getElementById('btn-gerar-dossie-ficha');
  if (btnDossieFicha) {
    btnDossieFicha.addEventListener('click', abrirModalDossie);
  }

  const btnCloseDossie = document.getElementById('modal-dossie-close-btn');
  if (btnCloseDossie) {
    btnCloseDossie.addEventListener('click', fecharModalDossie);
  }

  const btnCloseDossieBottom = document.getElementById('modal-dossie-close-bottom-btn');
  if (btnCloseDossieBottom) {
    btnCloseDossieBottom.addEventListener('click', fecharModalDossie);
  }

  const modalDossie = document.getElementById('modal-dossie-diretoria');
  if (modalDossie) {
    modalDossie.addEventListener('click', (e) => {
      if (e.target.id === 'modal-dossie-diretoria') fecharModalDossie();
    });
  }

  const btnPrintDossie = document.getElementById('modal-dossie-print-btn');
  if (btnPrintDossie) {
    btnPrintDossie.addEventListener('click', () => {
      window.print();
    });
  }

  // Modal Gráfico de Perdas (Colab)
  const btnGraficoPerdas = document.getElementById('btn-grafico-perdas');
  if (btnGraficoPerdas) {
    btnGraficoPerdas.addEventListener('click', abrirModalGraficoPerdas);
  }

  const btnClosePerdas = document.getElementById('modal-perdas-close-btn');
  if (btnClosePerdas) {
    btnClosePerdas.addEventListener('click', fecharModalGraficoPerdas);
  }

  const btnClosePerdasBottom = document.getElementById('modal-perdas-close-bottom-btn');
  if (btnClosePerdasBottom) {
    btnClosePerdasBottom.addEventListener('click', fecharModalGraficoPerdas);
  }

  const modalPerdas = document.getElementById('modal-grafico-perdas');
  if (modalPerdas) {
    modalPerdas.addEventListener('click', (e) => {
      if (e.target.id === 'modal-grafico-perdas') fecharModalGraficoPerdas();
    });
  }

  // Abas e Botões do Modal de Perdas & Simulação
  const tabPerdasAnalise = document.getElementById('tab-btn-perdas-analise');
  const tabPerdasSimulacao = document.getElementById('tab-btn-perdas-simulacao');
  if (tabPerdasAnalise) tabPerdasAnalise.addEventListener('click', () => alternarAbasPerdas('analise'));
  if (tabPerdasSimulacao) tabPerdasSimulacao.addEventListener('click', () => alternarAbasPerdas('simulacao'));

  const btnSimularPerdas = document.getElementById('modal-perdas-simular-btn');
  if (btnSimularPerdas) {
    btnSimularPerdas.addEventListener('click', (e) => {
      e.preventDefault();
      // Alterna diretamente para a aba de simulação dentro do modal (não volta pra tela inicial)
      alternarAbasPerdas('simulacao');
    });
  }

  const btnSimVoltar = document.getElementById('modal-sim-btn-voltar');
  if (btnSimVoltar) btnSimVoltar.addEventListener('click', () => alternarAbasPerdas('analise'));

  const btnSimOS = document.getElementById('modal-sim-btn-os');
  if (btnSimOS) {
    btnSimOS.addEventListener('click', () => {
      fecharModalGraficoPerdas();
      if (selectedClient) abrirModalOS(selectedClient);
    });
  }

  const btnSimLaudo = document.getElementById('modal-sim-btn-laudo');
  if (btnSimLaudo) {
    btnSimLaudo.addEventListener('click', () => {
      fecharModalGraficoPerdas();
      if (selectedClient) abrirModalLaudo(selectedClient);
    });
  }

  const btnSimCloseBottom = document.getElementById('modal-sim-close-bottom-btn');
  if (btnSimCloseBottom) btnSimCloseBottom.addEventListener('click', fecharModalGraficoPerdas);

  // Checkboxes interativos do Modal de Simulação
  const mCheckBackup = document.getElementById('modal-sim-check-backup');
  const mCheckVersion = document.getElementById('modal-sim-check-version');
  const mCheckTickets = document.getElementById('modal-sim-check-tickets');
  if (mCheckBackup) mCheckBackup.addEventListener('change', executarSimulacaoModal);
  if (mCheckVersion) mCheckVersion.addEventListener('change', executarSimulacaoModal);
  if (mCheckTickets) mCheckTickets.addEventListener('change', executarSimulacaoModal);

  // Abas do Modal de Extremos
  const tabInterativo = document.getElementById('tab-btn-interativo');
  const tabOriginal = document.getElementById('tab-btn-original');
  const viewInterativo = document.getElementById('view-extremos-interativo');
  const viewOriginal = document.getElementById('view-extremos-original');

  if (tabInterativo && tabOriginal) {
    tabInterativo.addEventListener('click', () => {
      tabInterativo.classList.add('active');
      tabOriginal.classList.remove('active');
      viewInterativo.style.display = 'block';
      viewOriginal.style.display = 'none';
    });

    tabOriginal.addEventListener('click', () => {
      tabOriginal.classList.add('active');
      tabInterativo.classList.remove('active');
      viewInterativo.style.display = 'none';
      viewOriginal.style.display = 'block';
    });
  }

  // Busca textual
  document.getElementById('search-input').addEventListener('input', () => {
    renderizarListaClientes();
  });

  // Checkboxes do Simulador
  document.getElementById('sim-check-version').addEventListener('change', executarSimulacao);
  document.getElementById('sim-check-backup').addEventListener('change', executarSimulacao);
  document.getElementById('sim-check-tickets').addEventListener('change', executarSimulacao);

  // Botões de IA
  document.getElementById('btn-ai-diagnose').addEventListener('click', acionarDiagnosticoIA);
  document.getElementById('btn-ai-whatsapp').addEventListener('click', () => acionarMensagemIA('whatsapp'));
  document.getElementById('btn-ai-email').addEventListener('click', () => acionarMensagemIA('email'));

  // Fechar Modal
  document.getElementById('modal-close-btn').addEventListener('click', fecharModal);
  document.getElementById('ai-modal').addEventListener('click', (e) => {
    if (e.target.id === 'ai-modal') fecharModal();
  });

  // Copiar Texto do Modal
  document.getElementById('modal-copy-btn').addEventListener('click', () => {
    const text = document.getElementById('modal-text-content').innerText;
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.getElementById('modal-copy-btn');
      const original = btn.innerHTML;
      btn.innerHTML = '<span>✅ Copiado!</span>';
      setTimeout(() => {
        btn.innerHTML = original;
      }, 2000);
    });
  });
}

// ==================== GRÁFICOS CHART.JS ====================

function renderizarGraficoDoughnut(altoRisco, atencao, baixoRisco) {
  const ctx = document.getElementById('chart-risk-doughnut');
  if (!ctx) return;

  if (chartRiskDoughnut) {
    chartRiskDoughnut.destroy();
  }

  chartRiskDoughnut = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Alto Risco', 'Atenção', 'Saudável'],
      datasets: [{
        data: [altoRisco, atencao, baixoRisco],
        backgroundColor: [
          'rgba(220, 38, 38, 0.85)',
          'rgba(217, 119, 6, 0.85)',
          'rgba(22, 163, 74, 0.85)'
        ],
        borderColor: [
          'rgba(220, 38, 38, 1)',
          'rgba(217, 119, 6, 1)',
          'rgba(22, 163, 74, 1)'
        ],
        borderWidth: 2,
        hoverOffset: 8,
        borderRadius: 4,
        spacing: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#64748b',
            font: {
              family: "'Montserrat', sans-serif",
              size: 12,
              weight: '600'
            },
            padding: 16,
            usePointStyle: true,
            pointStyleWidth: 12
          }
        },
        tooltip: {
          backgroundColor: '#1e293b',
          titleFont: { family: "'Montserrat', sans-serif", weight: '700' },
          bodyFont: { family: "'Open Sans', sans-serif" },
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: function(context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const pct = ((context.parsed / total) * 100).toFixed(1);
              return ` ${context.label}: ${context.parsed} clientes (${pct}%)`;
            }
          }
        }
      },
      animation: {
        animateRotate: true,
        duration: 1000,
        easing: 'easeOutQuart'
      }
    }
  });
}

function renderizarGraficoRadar(subscores) {
  const ctx = document.getElementById('chart-radar-pillars');
  if (!ctx) return;

  if (chartRadarPillars) {
    chartRadarPillars.destroy();
  }

  const labels = ['Backup', 'Versionamento', 'Vendas', 'Chamados'];
  const valores = [
    subscores.backup,
    subscores.versao,
    subscores.vendas,
    subscores.chamados
  ];

  // Benchmark "ideal" para comparação visual
  const benchmark = [100, 100, 100, 100];

  chartRadarPillars = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Cliente Atual',
          data: valores,
          backgroundColor: 'rgba(5, 102, 95, 0.20)',
          borderColor: 'rgba(5, 102, 95, 0.9)',
          borderWidth: 2.5,
          pointBackgroundColor: '#05665f',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          fill: true
        },
        {
          label: 'Referência Ideal',
          data: benchmark,
          backgroundColor: 'rgba(0, 141, 133, 0.06)',
          borderColor: 'rgba(0, 141, 133, 0.35)',
          borderWidth: 1.5,
          borderDash: [6, 4],
          pointBackgroundColor: 'rgba(0, 141, 133, 0.5)',
          pointRadius: 3,
          pointHoverRadius: 5,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          ticks: {
            stepSize: 25,
            display: true,
            color: '#94a3b8',
            font: { size: 10, family: "'Open Sans', sans-serif" },
            backdropColor: 'transparent'
          },
          grid: {
            color: 'rgba(226, 232, 240, 0.6)',
            lineWidth: 1
          },
          angleLines: {
            color: 'rgba(226, 232, 240, 0.5)'
          },
          pointLabels: {
            color: '#1e293b',
            font: {
              family: "'Montserrat', sans-serif",
              size: 12,
              weight: '700'
            },
            padding: 8
          }
        }
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#64748b',
            font: {
              family: "'Montserrat', sans-serif",
              size: 11,
              weight: '600'
            },
            padding: 14,
            usePointStyle: true,
            pointStyleWidth: 10
          }
        },
        tooltip: {
          backgroundColor: '#1e293b',
          titleFont: { family: "'Montserrat', sans-serif", weight: '700' },
          bodyFont: { family: "'Open Sans', sans-serif" },
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: function(context) {
              return ` ${context.dataset.label}: ${context.parsed.r}/100`;
            }
          }
        }
      },
      animation: {
        duration: 800,
        easing: 'easeOutQuart'
      }
    }
  });
}

// ==================== MODAL DE EXTREMOS & RISCO DE VALÊNCIA ====================

function abrirModalExtremos() {
  const modal = document.getElementById('modal-extremos');
  if (!modal) return;
  modal.style.display = 'flex';
  renderizarGraficosExtremos();
}

function fecharModalExtremos() {
  const modal = document.getElementById('modal-extremos');
  if (modal) modal.style.display = 'none';
}

function renderizarGraficosExtremos() {
  if (!allClients || allClients.length === 0) return;

  // 1. Top 10 Melhores Clientes (Maior Saúde)
  const top10Melhores = [...allClients]
    .sort((a, b) => b.health_score - a.health_score)
    .slice(0, 10);

  // 2. Top 10 Piores Clientes (Críticos / Risco Churn)
  const top10Piores = [...allClients]
    .sort((a, b) => a.health_score - b.health_score)
    .slice(0, 10);

  // 3. Risco de Valência Técnica (Sem Backup + Sistema Antigo)
  let top10Valencia = [...allClients]
    .filter(c => c.dias_sem_backup >= 2 || !c.versao_sistema.startsWith('5.4'))
    .sort((a, b) => b.dias_sem_backup - a.dias_sem_backup)
    .slice(0, 10);

  if (top10Valencia.length === 0) {
    top10Valencia = [...allClients].sort((a, b) => b.dias_sem_backup - a.dias_sem_backup).slice(0, 10);
  }

  // --- Gráfico 1: Melhores (Horizontal) ---
  const ctxMelhores = document.getElementById('chart-top-melhores');
  if (ctxMelhores) {
    if (chartTopMelhores) chartTopMelhores.destroy();
    chartTopMelhores = new Chart(ctxMelhores, {
      type: 'bar',
      data: {
        labels: top10Melhores.map(c => c.nome_fantasia),
        datasets: [{
          label: 'Health Score',
          data: top10Melhores.map(c => c.health_score),
          backgroundColor: [
            '#2e1065', '#3b0764', '#1e1b4b', '#1e3a8a', '#0369a1',
            '#0e7490', '#047857', '#059669', '#65a30d', '#84cc16'
          ],
          borderRadius: 4,
          borderSkipped: false
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` Health Score: ${ctx.parsed.x}/100`
            }
          }
        },
        scales: {
          x: {
            min: 0,
            max: 100,
            grid: { color: 'rgba(226, 232, 240, 0.6)' },
            ticks: { font: { family: "'Open Sans', sans-serif", size: 10 } }
          },
          y: {
            grid: { display: false },
            ticks: {
              font: { family: "'Montserrat', sans-serif", size: 10, weight: '600' },
              color: '#1e293b'
            }
          }
        }
      }
    });
  }

  // --- Gráfico 2: Piores (Horizontal) ---
  const ctxPiores = document.getElementById('chart-top-piores');
  if (ctxPiores) {
    if (chartTopPiores) chartTopPiores.destroy();
    chartTopPiores = new Chart(ctxPiores, {
      type: 'bar',
      data: {
        labels: top10Piores.map(c => c.nome_fantasia),
        datasets: [{
          label: 'Health Score',
          data: top10Piores.map(c => c.health_score),
          backgroundColor: [
            '#7f1d1d', '#991b1b', '#b91c1c', '#dc2626', '#ea580c',
            '#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5'
          ],
          borderRadius: 4,
          borderSkipped: false
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` Health Score: ${ctx.parsed.x}/100`
            }
          }
        },
        scales: {
          x: {
            min: 0,
            max: 100,
            grid: { color: 'rgba(226, 232, 240, 0.6)' },
            ticks: { font: { family: "'Open Sans', sans-serif", size: 10 } }
          },
          y: {
            grid: { display: false },
            ticks: {
              font: { family: "'Montserrat', sans-serif", size: 10, weight: '600' },
              color: '#1e293b'
            }
          }
        }
      }
    });
  }

  // --- Gráfico 3: Valência Técnica (Horizontal) ---
  const ctxValencia = document.getElementById('chart-top-valencia');
  if (ctxValencia) {
    if (chartTopValencia) chartTopValencia.destroy();
    const maxDias = Math.max(...top10Valencia.map(c => c.dias_sem_backup), 10);
    chartTopValencia = new Chart(ctxValencia, {
      type: 'bar',
      data: {
        labels: top10Valencia.map(c => `${c.nome_fantasia} (v${c.versao_sistema})`),
        datasets: [{
          label: 'Dias sem Backup',
          data: top10Valencia.map(c => c.dias_sem_backup),
          backgroundColor: [
            '#e0a96d', '#d98b68', '#c96a66', '#b34d67', '#973669',
            '#782468', '#581961', '#3b1251', '#260c3b', '#170624'
          ],
          borderRadius: 4,
          borderSkipped: false
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` Dias sem Backup: ${ctx.parsed.x} dias`
            }
          }
        },
        scales: {
          x: {
            min: 0,
            max: Math.ceil(maxDias * 1.2),
            grid: { color: 'rgba(226, 232, 240, 0.6)' },
            ticks: { font: { family: "'Open Sans', sans-serif", size: 10 } }
          },
          y: {
            grid: { display: false },
            ticks: {
              font: { family: "'Montserrat', sans-serif", size: 10, weight: '600' },
              color: '#1e293b'
            }
          }
        }
      }
    });
  }
}

// ==================== ORDEM DE SERVIÇO PREVENTIVA (O.S. TÉCNICA) ====================

function abrirModalOS(cliente) {
  const c = cliente || selectedClient;
  if (!c) {
    alert('Por favor, selecione um estabelecimento na lista para gerar a Ordem de Serviço Preventiva.');
    return;
  }

  const modal = document.getElementById('modal-os-preventiva');
  if (!modal) return;

  // 1. Dados de Cabeçalho da O.S.
  const now = new Date();
  const dataFormatada = now.toLocaleDateString('pt-BR') + ' às ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  document.getElementById('os-number').innerText = `O.S. PREV-2026-${String(c.id).padStart(4, '0')}`;
  document.getElementById('os-emission-date').innerText = dataFormatada;

  const priorityBadge = document.getElementById('os-priority-badge');
  if (c.health_score < 50) {
    priorityBadge.innerText = '🚨 ALTA CRITICIDADE (ATENDIMENTO 24H)';
    priorityBadge.style.background = '#dc2626';
  } else if (c.health_score < 75) {
    priorityBadge.innerText = '⚠️ MODERADA (ATENDIMENTO 72H)';
    priorityBadge.style.background = '#d97706';
  } else {
    priorityBadge.innerText = '🟢 PREVENTIVA REGULAR';
    priorityBadge.style.background = '#16a34a';
  }

  // 2. Dados do Estabelecimento
  document.getElementById('os-client-name').innerText = c.nome_fantasia;
  document.getElementById('os-client-pdv').innerText = c.codigo_pdv;
  document.getElementById('os-client-resp').innerText = c.responsavel;
  document.getElementById('os-client-phone').innerText = c.telefone;
  document.getElementById('os-client-city').innerText = `${c.cidade} - ${c.uf}`;
  document.getElementById('os-client-terminals').innerText = `${c.quantidade_terminais} terminal(is) de PDV`;

  // 3. Telemetria
  document.getElementById('os-kpi-score').innerText = `${c.health_score}/100`;
  document.getElementById('os-kpi-version').innerText = `v${c.versao_sistema}`;
  document.getElementById('os-kpi-backup').innerText = `${c.dias_sem_backup} dias (${c.backup_integro ? 'Íntegro' : 'CORROMPIDO'})`;
  document.getElementById('os-kpi-sales').innerText = `${c.variacao_vendas_pct}%`;
  document.getElementById('os-kpi-tickets').innerText = `${c.chamados_ultimos_30d} chamados`;

  // 4. Motivos e Parecer de IA
  let alertasTexto = '';
  if (c.alerta_anomalia) {
    alertasTexto += `<strong>⚠️ Anomalia Detectada por IA (Isolation Forest):</strong> ${c.tipo_anomalia || 'Padrão multivariado crítico de risco de abandono'}.<br>`;
  }
  if (c.motivos_alerta && c.motivos_alerta.length > 0) {
    alertasTexto += `<strong>Sinais Técnicos:</strong> ${c.motivos_alerta.join('; ')}.`;
  } else {
    alertasTexto += `Rotina preventiva padrão para manutenção e otimização de estabilidade.`;
  }
  document.getElementById('os-alert-text').innerHTML = alertasTexto;

  // 5. Assinatura do Cliente
  document.getElementById('os-sign-client-name').innerText = c.responsavel || 'Responsável pelo Estabelecimento';

  modal.style.display = 'flex';
}

function fecharModalOS() {
  const modal = document.getElementById('modal-os-preventiva');
  if (modal) modal.style.display = 'none';
}

// ==================== LAUDO TÉCNICO DE CONFORMIDADE (CLIENTE) ====================

function abrirModalLaudo(cliente) {
  const c = cliente || selectedClient;
  if (!c) {
    alert('Por favor, selecione um estabelecimento na lista para emitir o Laudo de Conformidade.');
    return;
  }

  const modal = document.getElementById('modal-laudo-conformidade');
  if (!modal) return;

  const now = new Date();
  const dataFormatada = now.toLocaleDateString('pt-BR');

  // Cabeçalho e Metadados
  document.getElementById('laudo-protocol').innerText = `LAUDO-2026-${String(c.id).padStart(4, '0')}`;
  document.getElementById('laudo-date').innerText = dataFormatada;

  // Status Geral do Laudo
  const statusBadge = document.getElementById('laudo-badge-status');
  if (c.health_score < 50) {
    statusBadge.innerText = 'VULNERABILIDADE CRÍTICA IDENTIFICADA';
    statusBadge.style.background = '#dc2626';
  } else if (c.health_score < 75) {
    statusBadge.innerText = 'ATENÇÃO OPERACIONAL REQUERIDA';
    statusBadge.style.background = '#d97706';
  } else {
    statusBadge.innerText = 'CONFORME E OPERACIONALMENTE SEGURO';
    statusBadge.style.background = '#16a34a';
  }

  // Identificação do Comércio
  document.getElementById('laudo-client-name').innerText = c.nome_fantasia;
  document.getElementById('laudo-client-pdv').innerText = c.codigo_pdv;
  document.getElementById('laudo-client-resp').innerText = c.responsavel;
  document.getElementById('laudo-client-city').innerText = `${c.cidade} - ${c.uf}`;

  // Selo 1: Backup
  const stampBackup = document.getElementById('laudo-stamp-backup');
  const detailBackup = document.getElementById('laudo-detail-backup');
  if (c.dias_sem_backup <= 1 && c.backup_integro) {
    stampBackup.innerText = 'CONFORME';
    stampBackup.className = 'laudo-stamp stamp-green';
    detailBackup.innerHTML = `Rotina atualizada realizada <strong>hoje/ontem</strong> com integridade atestada. Os arquivos fiscais (XMLs) e o estoque estão devidamente resguardados na nuvem segura BVX.`;
  } else {
    stampBackup.innerText = c.dias_sem_backup >= 4 ? 'RISCO CRÍTICO' : 'EM ALERTA';
    stampBackup.className = c.dias_sem_backup >= 4 ? 'laudo-stamp stamp-red' : 'laudo-stamp stamp-yellow';
    detailBackup.innerHTML = `Última sincronização válida registrada há <strong>${c.dias_sem_backup} dias</strong>. A ausência de backup regular expõe seu negócio a perdas irreversíveis em casos de pane mecânica ou queima de computadores.`;
  }

  // Selo 2: Versão
  const stampVersion = document.getElementById('laudo-stamp-version');
  const detailVersion = document.getElementById('laudo-detail-version');
  const isHomolog = c.versao_sistema.startsWith('5.4');
  if (isHomolog) {
    stampVersion.innerText = 'HOMOLOGADA';
    stampVersion.className = 'laudo-stamp stamp-green';
    detailVersion.innerHTML = `Versão instalada: <strong>v${c.versao_sistema}</strong>. O sistema opera com a versão mais recente e estável, em total conformidade com as exigências da SEFAZ e emissão fiscal rápida.`;
  } else {
    stampVersion.innerText = 'DEFASADA';
    stampVersion.className = 'laudo-stamp stamp-yellow';
    detailVersion.innerHTML = `Versão em uso: <strong>v${c.versao_sistema}</strong> (Versão Oficial Vigente: <strong>v5.4.2</strong>). Recomendamos agendar a atualização gratuita para garantir acesso às melhorias fiscais e correções de segurança.`;
  }

  // Selo 3: Índice Geral de Saúde
  const stampHealth = document.getElementById('laudo-stamp-health');
  const detailHealth = document.getElementById('laudo-detail-health');
  stampHealth.innerText = `${c.health_score} / 100`;
  if (c.health_score >= 75) {
    stampHealth.className = 'laudo-stamp stamp-green';
    detailHealth.innerHTML = `Classificação: <strong style="color: #16a34a;">ESTABELECIMENTO SAUDÁVEL</strong>. Seu comércio demonstra excelente disciplina técnica e estabilidade de operação contínua.`;
  } else if (c.health_score >= 50) {
    stampHealth.className = 'laudo-stamp stamp-yellow';
    detailHealth.innerHTML = `Classificação: <strong style="color: #d97706;">ATENÇÃO MODERADA</strong>. Pequenos ajustes de rotina de cópia ou versão elevarão a segurança do seu PDV.`;
  } else {
    stampHealth.className = 'laudo-stamp stamp-red';
    detailHealth.innerHTML = `Classificação: <strong style="color: #dc2626;">ALTO RISCO DE OPERAÇÃO</strong>. Nossa equipe técnica está à sua inteira disposição para apoiar sua empresa sem qualquer cobrança adicional.`;
  }

  // Recomendações Consultivas
  let conselho = '';
  if (c.health_score >= 75) {
    conselho = 'Parabéns pela excelência na gestão técnica do seu PDV! Mantenha a rotina automática de fechamento diário ativa para preservar a segurança máxima dos seus dados fiscais.';
  } else if (c.dias_sem_backup >= 3) {
    conselho = 'Prioridade Imediata: Recomendamos autorizar a execução da rotina de cópia de segurança em nuvem ainda hoje. Nossa equipe pode conectá-lo remotamente em menos de 10 minutos para concluir o procedimento sem interromper suas vendas.';
  } else {
    conselho = 'Recomendamos o agendamento de uma revisão preventiva com nosso suporte para atualização de versão e alinhamento de rotinas operacionais.';
  }
  document.getElementById('laudo-advice-text').innerText = conselho;

  modal.style.display = 'flex';
}

function fecharModalLaudo() {
  const modal = document.getElementById('modal-laudo-conformidade');
  if (modal) modal.style.display = 'none';
}

// ==================== DOSSIÊ EXECUTIVO DE RISCO (DIRETORIA) ====================

function abrirModalDossie() {
  if (!allClients || allClients.length === 0) {
    alert('Os dados dos clientes ainda estão sendo carregados.');
    return;
  }

  const modal = document.getElementById('modal-dossie-diretoria');
  if (!modal) return;

  const now = new Date();
  document.getElementById('dossie-emission-date').innerText = now.toLocaleDateString('pt-BR') + ' às ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // Cálculos Macroeconômicos e de Risco
  const totalReceita = allClients.reduce((acc, c) => acc + (c.faturamento_diario_estimado || 0), 0);
  const clientesAltoRisco = allClients.filter(c => c.health_score < 50);
  const receitaEmRisco = clientesAltoRisco.reduce((acc, c) => acc + (c.faturamento_diario_estimado || 0), 0);
  const backupsCriticos = allClients.filter(c => c.dias_sem_backup >= 3 || !c.backup_integro).length;
  const versoesDefasadas = allClients.filter(c => !c.versao_sistema.startsWith('5.4')).length;

  const formatBRL = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

  document.getElementById('dossie-total-revenue').innerText = formatBRL(totalReceita);
  document.getElementById('dossie-risk-revenue').innerText = formatBRL(receitaEmRisco);
  document.getElementById('dossie-risk-count').innerText = `${clientesAltoRisco.length} estabelecimentos em Alto Risco`;
  document.getElementById('dossie-backups-count').innerText = backupsCriticos;
  document.getElementById('dossie-versions-count').innerText = versoesDefasadas;
  document.getElementById('dossie-plan-current-risk').innerText = clientesAltoRisco.length;

  // Badge Geral da Carteira
  const mediaScore = allClients.reduce((acc, c) => acc + c.health_score, 0) / allClients.length;
  const badgeRisk = document.getElementById('dossie-badge-risk');
  if (mediaScore < 50) {
    badgeRisk.innerText = `🚨 ÍNDICE GERAL: ${mediaScore.toFixed(1)}/100 • ALERTA CRÍTICO`;
    badgeRisk.style.background = '#dc2626';
  } else if (mediaScore < 75) {
    badgeRisk.innerText = `⚠️ ÍNDICE GERAL: ${mediaScore.toFixed(1)}/100 • ALERTA MODERADO`;
    badgeRisk.style.background = '#d97706';
  } else {
    badgeRisk.innerText = `🟢 ÍNDICE GERAL: ${mediaScore.toFixed(1)}/100 • CARTEIRA SAUDÁVEL`;
    badgeRisk.style.background = '#16a34a';
  }

  // Tabela Sintética dos Top 10 Clientes sob Risco Iminente
  const top10Criticos = [...allClients].sort((a, b) => a.health_score - b.health_score).slice(0, 10);
  const tbody = document.getElementById('dossie-table-body');
  tbody.innerHTML = top10Criticos.map(c => `
    <tr>
      <td><strong>${c.codigo_pdv}</strong></td>
      <td><strong>${c.nome_fantasia}</strong></td>
      <td>${c.cidade}</td>
      <td style="text-align: center;">
        <span class="dossie-table-score ${c.health_score < 50 ? 'score-danger' : 'score-warning'}">${c.health_score}</span>
      </td>
      <td style="text-align: center; color: ${c.dias_sem_backup >= 3 ? '#dc2626' : '#1e293b'}; font-weight: 600;">
        ${c.dias_sem_backup}d ${!c.backup_integro ? '⚠️' : ''}
      </td>
      <td style="text-align: center;">v${c.versao_sistema}</td>
      <td>
        <span class="dossie-table-alert">${c.alerta_anomalia ? '⚡ ' + (c.tipo_anomalia || 'Anomalia IA') : ((c.motivos_alerta && c.motivos_alerta[0]) || 'Atenção Operacional')}</span>
      </td>
      <td style="text-align: right; font-weight: 700; color: #0f172a;">
        ${formatBRL(c.faturamento_diario_estimado)}
      </td>
    </tr>
  `).join('');

  modal.style.display = 'flex';
}

function fecharModalDossie() {
  const modal = document.getElementById('modal-dossie-diretoria');
  if (modal) modal.style.display = 'none';
}

// ==================== GRÁFICO DE DECOMPOSIÇÃO DE PERDAS (INSPIRAÇÃO COLAB) ====================
let chartPerdasInstance = null;

function abrirModalGraficoPerdas() {
  if (!selectedClient) {
    alert('Por favor, selecione um cliente na lista primeiro.');
    return;
  }

  const c = selectedClient;
  const modal = document.getElementById('modal-grafico-perdas');
  if (!modal) return;

  const sub = c.detalhe_subscores || { backup: 50, versao: 50, vendas: 50, chamados: 50 };

  // Cálculo das perdas baseado nos pesos da BVX (Base 100):
  // Backup (peso 30%), Versão (peso 25%), Vendas (peso 25%), Chamados (peso 20%)
  const ptsBackup = (sub.backup || 0) * 0.30;
  const ptsVersao = (sub.versao || 0) * 0.25;
  const ptsVendas = (sub.vendas || 0) * 0.25;
  const ptsChamados = (sub.chamados || 0) * 0.20;

  const scoreRestante = Math.max(0, +(ptsBackup + ptsVersao + ptsVendas + ptsChamados).toFixed(1));
  const perdaBackup = Math.max(0, +(30 - ptsBackup).toFixed(1));
  const perdaVersao = Math.max(0, +(25 - ptsVersao).toFixed(1));
  const perdaVendas = Math.max(0, +(25 - ptsVendas).toFixed(1));
  const perdaChamados = Math.max(0, +(20 - ptsChamados).toFixed(1));

  // Preenche dados do cliente no cabeçalho do diagnóstico
  document.getElementById('perdas-pdv-badge').innerText = c.codigo_pdv || 'PDV-0000';
  document.getElementById('perdas-client-name').innerText = c.nome_fantasia || 'Cliente';
  document.getElementById('perdas-score-val').innerText = `${c.health_score} / 100`;

  const riskTag = document.getElementById('perdas-risk-tag');
  riskTag.innerText = c.risco || (c.health_score < 50 ? 'ALTO RISCO' : c.health_score < 75 ? 'ATENÇÃO' : 'BAIXO RISCO');
  riskTag.style.background = c.cor_risco || (c.health_score < 50 ? '#dc2626' : c.health_score < 75 ? '#d97706' : '#16a34a');

  // Valores numéricos e barras
  document.getElementById('factor-restante-val').innerText = `+${scoreRestante} pts`;
  document.getElementById('bar-restante').style.width = `${Math.min(100, scoreRestante)}%`;

  document.getElementById('factor-backup-val').innerText = `-${perdaBackup} pts`;
  document.getElementById('bar-backup').style.width = `${(perdaBackup / 30) * 100}%`;
  document.getElementById('factor-backup-desc').innerText = `${c.dias_sem_backup} dias sem envio de cópia (${c.backup_integro ? 'integridade ok' : 'falha de integridade'}).`;

  document.getElementById('factor-versao-val').innerText = `-${perdaVersao} pts`;
  document.getElementById('bar-versao').style.width = `${(perdaVersao / 25) * 100}%`;
  document.getElementById('factor-versao-desc').innerText = `Versão instalada: ${c.versao_sistema} (homologada atual: ${c.versao_atual_homologada || '5.4.2'}).`;

  document.getElementById('factor-vendas-val').innerText = `-${perdaVendas} pts`;
  document.getElementById('bar-vendas').style.width = `${(perdaVendas / 25) * 100}%`;
  document.getElementById('factor-vendas-desc').innerText = `Variação de vendas de ${c.variacao_vendas_pct}% nos últimos 30 dias.`;

  document.getElementById('factor-chamados-val').innerText = `-${perdaChamados} pts`;
  document.getElementById('bar-chamados').style.width = `${(perdaChamados / 20) * 100}%`;
  document.getElementById('factor-chamados-desc').innerText = `${c.chamados_ultimos_30d} chamados de suporte abertos no mês.`;

  // Insight Preditivo dinâmico
  const perdasArray = [
    { nome: 'rotina de backup', perda: perdaBackup, acao: 'realizar sincronização imediata de backup' },
    { nome: 'versão defasada do sistema', perda: perdaVersao, acao: 'atualizar para a versão homologada 5.4.2' },
    { nome: 'queda acentuada de vendas', perda: perdaVendas, acao: 'contato consultivo para diagnóstico operacional' },
    { nome: 'instabilidade de chamados', perda: perdaChamados, acao: 'revisão técnica dos terminais de atendimento' }
  ].sort((a, b) => b.perda - a.perda);

  const maiorPerda = perdasArray[0];
  document.getElementById('perdas-insight-text').innerHTML = `O maior gargalo de saúde deste cliente é <strong>${maiorPerda.nome}</strong> (penalidade de <strong>${maiorPerda.perda} pontos</strong>). Ação recomendada: <strong>${maiorPerda.acao}</strong>.`;

  // Pré-configura os checkboxes de simulação com base nos gargalos do cliente
  const mCheckBackup = document.getElementById('modal-sim-check-backup');
  const mCheckVersion = document.getElementById('modal-sim-check-version');
  const mCheckTickets = document.getElementById('modal-sim-check-tickets');
  if (mCheckBackup) mCheckBackup.checked = (c.dias_sem_backup >= 1 || !c.backup_integro || (sub.backup !== undefined && sub.backup < 90));
  if (mCheckVersion) mCheckVersion.checked = (!c.versao_sistema || !c.versao_sistema.startsWith('5.4') || (sub.versao !== undefined && sub.versao < 90));
  if (mCheckTickets) mCheckTickets.checked = (c.chamados_ultimos_30d > 0 || (sub.chamados !== undefined && sub.chamados < 90));

  if (mCheckBackup && mCheckVersion && !mCheckBackup.checked && !mCheckVersion.checked && (!mCheckTickets || !mCheckTickets.checked)) {
    mCheckBackup.checked = true;
    mCheckVersion.checked = true;
  }

  // Renderização do Gráfico de Pizza no Canvas (Chart.js)
  const canvas = document.getElementById('chart-perdas-pie');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    if (chartPerdasInstance) {
      chartPerdasInstance.destroy();
    }

    chartPerdasInstance = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: [
          'Pontuação Restante',
          'Perda por Backup (Risco)',
          'Perda por Versão Desatualizada',
          'Perda por Queda de Vendas',
          'Perda por Chamados/Suporte'
        ],
        datasets: [{
          data: [scoreRestante, perdaBackup, perdaVersao, perdaVendas, perdaChamados],
          backgroundColor: [
            '#2a9d8f', // Pontuação Restante (Teal / Verde BVX)
            '#e63946', // Backup (Vermelho vibrante)
            '#f4a261', // Versão (Laranja quente)
            '#e76f51', // Vendas (Terracota / Salmão)
            '#457b9d'  // Chamados (Azul petróleo)
          ],
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 12
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          animateScale: true,
          animateRotate: true
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: { family: 'Open Sans', size: 11, weight: '600' },
              boxWidth: 14,
              padding: 10
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const val = context.raw || 0;
                return ` ${context.label}: ${val} pts (${val.toFixed(1)}%)`;
              }
            }
          }
        }
      }
    });
  }

  // Abre sempre na aba de diagnóstico inicial
  alternarAbasPerdas('analise');
  modal.style.display = 'flex';
}

function fecharModalGraficoPerdas() {
  const modal = document.getElementById('modal-grafico-perdas');
  if (modal) modal.style.display = 'none';
}

// ==================== ABAS DO MODAL DE PERDAS & SIMULAÇÃO ====================
let chartRecuperacaoInstance = null;

function alternarAbasPerdas(aba) {
  const tabAnalise = document.getElementById('tab-btn-perdas-analise');
  const tabSimulacao = document.getElementById('tab-btn-perdas-simulacao');
  const viewAnalise = document.getElementById('view-perdas-analise');
  const viewSimulacao = document.getElementById('view-perdas-simulacao');
  const footerAnalise = document.getElementById('modal-perdas-footer-analise');
  const footerSimulacao = document.getElementById('modal-perdas-footer-simulacao');
  const title = document.getElementById('modal-perdas-main-title');

  if (aba === 'simulacao') {
    if (tabAnalise) tabAnalise.classList.remove('active');
    if (tabSimulacao) tabSimulacao.classList.add('active');
    if (viewAnalise) viewAnalise.style.display = 'none';
    if (viewSimulacao) viewSimulacao.style.display = 'block';
    if (footerAnalise) footerAnalise.style.display = 'none';
    if (footerSimulacao) footerSimulacao.style.display = 'flex';
    if (title) title.innerText = 'Simulação Ativa de Recuperação do Health Score';
    executarSimulacaoModal();
  } else {
    if (tabAnalise) tabAnalise.classList.add('active');
    if (tabSimulacao) tabSimulacao.classList.remove('active');
    if (viewAnalise) viewAnalise.style.display = 'block';
    if (viewSimulacao) viewSimulacao.style.display = 'none';
    if (footerAnalise) footerAnalise.style.display = 'flex';
    if (footerSimulacao) footerSimulacao.style.display = 'none';
    if (title) title.innerText = 'Decomposição de Perdas & Simulação de Recuperação';
  }
}

function executarSimulacaoModal() {
  if (!selectedClient) return;
  const c = selectedClient;

  // Preenche dados do cliente
  const pdvBadge = document.getElementById('modal-sim-pdv-badge');
  const clientName = document.getElementById('modal-sim-client-name');
  if (pdvBadge) pdvBadge.innerText = c.codigo_pdv || 'PDV-0000';
  if (clientName) clientName.innerText = c.nome_fantasia || 'Cliente';

  // Checkboxes do Modal
  const simBackup = document.getElementById('modal-sim-check-backup')?.checked ?? true;
  const simVersao = document.getElementById('modal-sim-check-version')?.checked ?? true;
  const simChamados = document.getElementById('modal-sim-check-tickets')?.checked ?? true;

  // Sincroniza com a caixa de simulação da página principal
  const bgBackup = document.getElementById('sim-check-backup');
  const bgVersao = document.getElementById('sim-check-version');
  const bgChamados = document.getElementById('sim-check-tickets');
  if (bgBackup) bgBackup.checked = simBackup;
  if (bgVersao) bgVersao.checked = simVersao;
  if (bgChamados) bgChamados.checked = simChamados;

  const sub = c.detalhe_subscores || { backup: 50, versao: 50, vendas: 50, chamados: 50 };

  // Cálculo de pesos da BVX (Base 100)
  const ptsBackupOrig = ((sub.backup || 0) * 0.30);
  const ptsBackupSim = simBackup ? 30 : ptsBackupOrig;

  const ptsVersaoOrig = ((sub.versao || 0) * 0.25);
  const ptsVersaoSim = simVersao ? 25 : ptsVersaoOrig;

  const ptsVendas = Math.min(25, +((sub.vendas || 0) * 0.25).toFixed(1));

  const ptsChamadosOrig = ((sub.chamados || 0) * 0.20);
  const ptsChamadosSim = simChamados ? Math.min(20, ptsChamadosOrig + 10) : ptsChamadosOrig;

  // Scores
  const scoreOrig = c.health_score || 0;
  const scoreSimulado = Math.min(100, Math.round(ptsBackupSim + ptsVersaoSim + ptsVendas + ptsChamadosSim));
  const ganhoTotal = Math.max(0, scoreSimulado - scoreOrig);

  // Risco
  const riscoOrig = c.risco || (scoreOrig < 50 ? 'ALTO RISCO' : scoreOrig < 75 ? 'ATENÇÃO' : 'BAIXO RISCO');
  const riscoSimulado = scoreSimulado < 50 ? 'ALTO RISCO' : (scoreSimulado < 75 ? 'ATENÇÃO' : 'BAIXO RISCO');
  const corRiscoSimulado = scoreSimulado < 50 ? '#dc2626' : (scoreSimulado < 75 ? '#d97706' : '#16a34a');

  // Atualização dos elementos no Modal
  const elOrigVal = document.getElementById('modal-sim-orig-val');
  const elOrigRisk = document.getElementById('modal-sim-orig-risk');
  const elProjVal = document.getElementById('modal-sim-proj-val');
  const elProjRisk = document.getElementById('modal-sim-proj-risk');
  const elGainBadge = document.getElementById('modal-sim-gain-badge');

  if (elOrigVal) elOrigVal.innerText = `${scoreOrig} / 100`;
  if (elOrigRisk) elOrigRisk.innerText = riscoOrig;
  if (elProjVal) elProjVal.innerText = `${scoreSimulado} / 100`;
  if (elProjRisk) {
    elProjRisk.innerText = riscoSimulado;
    elProjRisk.style.background = corRiscoSimulado;
  }
  if (elGainBadge) elGainBadge.innerText = `+${ganhoTotal} pts recuperados`;

  // Insight Preditivo dinâmico
  const insightEl = document.getElementById('modal-sim-insight-text');
  if (insightEl) {
    if (ganhoTotal > 0) {
      insightEl.innerHTML = `Com as intervenções proativas selecionadas, o cliente evolui de <strong>${scoreOrig}</strong> para <strong>${scoreSimulado} pontos</strong> (mudança de faixa para <strong style="color:${corRiscoSimulado}">${riscoSimulado}</strong>). O risco de cancelamento/churn é contornado com sucesso!`;
    } else {
      insightEl.innerText = 'Selecione uma ou mais intervenções acima para calcular o impacto da recuperação.';
    }
  }

  // Gráfico de Pizza de Recuperação no Canvas
  const canvas = document.getElementById('chart-recuperacao-pie');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    if (chartRecuperacaoInstance) {
      chartRecuperacaoInstance.destroy();
    }

    const perdaResidualBackup = Math.max(0, +(30 - ptsBackupSim).toFixed(1));
    const perdaResidualVersao = Math.max(0, +(25 - ptsVersaoSim).toFixed(1));
    const perdaResidualVendas = Math.max(0, +(25 - ptsVendas).toFixed(1));
    const perdaResidualChamados = Math.max(0, +(20 - ptsChamadosSim).toFixed(1));

    chartRecuperacaoInstance = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: [
          'Saúde Preservada & Recuperada',
          'Perda Residual de Backup',
          'Perda Residual de Versão',
          'Perda por Queda de Vendas',
          'Perda Residual de Chamados'
        ],
        datasets: [{
          data: [scoreSimulado, perdaResidualBackup, perdaResidualVersao, perdaResidualVendas, perdaResidualChamados],
          backgroundColor: [
            '#059669', // Verde Esmeralda (Recuperado)
            '#f87171', // Perda Backup
            '#fbbf24', // Perda Versão
            '#e76f51', // Perda Vendas
            '#94a3b8'  // Perda Chamados
          ],
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 12
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          animateScale: true,
          animateRotate: true
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: { family: 'Open Sans', size: 10.5, weight: '600' },
              boxWidth: 12,
              padding: 8
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const val = context.raw || 0;
                return ` ${context.label}: ${val} pts`;
              }
            }
          }
        }
      }
    });
  }

  // Sincroniza a simulação na coluna da página principal em background
  executarSimulacao();
}



