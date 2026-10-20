/**
 * BVX 360 - Lógica Frontend
 * Consome os endpoints da API FastAPI e interage com o Copiloto de IA
 */

const API_BASE = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
  ? '' 
  : ''; // Mantém relativo para deploy no Vercel ou Render

let allClients = [];
let currentFilter = 'all';
let filterBackupCritico = false;
let filterVersaoAntiga = false;
let selectedClient = null;

// ==================== INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', () => {
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
    console.error('Falha ao carregar clientes:', err);
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
    console.error('Falha ao simular impacto:', err);
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
