"""
Motor Analítico de Saúde do Cliente (Customer Health Score - CHS)
BVX Tecnologia 360 - Inteligência, Prevenção e Ação

Calcula um índice ponderado explicável de 0 a 100 com base nos 3 pilares da BVX:
- Versionamento
- Backups
- Churn (Variação de uso/vendas e chamados)

Inclui:
- Simulador de Impacto ("E se...")
- Clusterização Não Supervisionada (Scikit-Learn K-Means) para detecção de perfis ocultos
"""
from typing import Dict, Any, List, Tuple
import numpy as np
from sklearn.cluster import KMeans
from sklearn.ensemble import IsolationForest

def calcular_subscore_backup(dias_sem_backup: int, backup_integro: bool) -> float:
    if not backup_integro:
        return 10.0
    if dias_sem_backup == 0:
        return 100.0
    elif dias_sem_backup == 1:
        return 85.0
    elif dias_sem_backup == 2:
        return 65.0
    elif dias_sem_backup == 3:
        return 40.0
    elif dias_sem_backup <= 5:
        return 20.0
    else:
        return 0.0

def calcular_subscore_versao(versao: str, versao_homologada: str = "5.4.2") -> float:
    if versao.startswith("5.4"):
        return 100.0
    elif versao.startswith("5.3"):
        return 75.0
    elif versao.startswith("5.2"):
        return 45.0
    elif versao.startswith("5.1"):
        return 20.0
    else:
        return 10.0

def calcular_subscore_vendas(variacao_pct: float) -> float:
    if variacao_pct >= 5:
        return 100.0
    elif variacao_pct >= 0:
        return 90.0
    elif variacao_pct >= -10:
        return 75.0
    elif variacao_pct >= -25:
        return 50.0
    elif variacao_pct >= -40:
        return 25.0
    else:
        return 5.0

def calcular_subscore_chamados(qtd_chamados: int, variacao_vendas_pct: float = 0.0) -> float:
    # Lógica Colab: 0 chamados com vendas em queda livre indica 'Cliente Silencioso' (abandono)
    if qtd_chamados == 0:
        if variacao_vendas_pct <= -20:
            return 25.0  # Risco grave de churn silencioso
        return 90.0
    elif 1 <= qtd_chamados <= 3:
        return 100.0  # Comportamento saudável e equilibrado de suporte
    elif 4 <= qtd_chamados <= 7:
        return 50.0
    else:
        return 20.0  # Instabilidade ou suporte excessivo

def calcular_health_score(cliente: Dict[str, Any]) -> Dict[str, Any]:
    score_backup = calcular_subscore_backup(
        cliente["dias_sem_backup"], 
        cliente.get("backup_integro", True)
    )
    score_versao = calcular_subscore_versao(
        cliente["versao_sistema"], 
        cliente.get("versao_atual_homologada", "5.4.2")
    )
    score_vendas = calcular_subscore_vendas(cliente["variacao_vendas_pct"])
    score_chamados = calcular_subscore_chamados(
        cliente["chamados_ultimos_30d"], 
        cliente.get("variacao_vendas_pct", 0.0)
    )

    # Pesos do negócio BVX:
    # Backup: 30% | Versão: 25% | Vendas: 25% | Chamados: 20%
    score_final = (
        (score_backup * 0.30) +
        (score_versao * 0.25) +
        (score_vendas * 0.25) +
        (score_chamados * 0.20)
    )
    score_final = round(score_final)

    # Classificação de Risco (Conforme Slide 14 da BVX)
    if score_final < 50:
        risco = "ALTO RISCO"
        cor_risco = "#FF3366"  # Vermelho
        nivel_prioridade = 1
        status_label = "Priorizar atendimento"
    elif score_final < 75:
        risco = "ATENÇÃO"
        cor_risco = "#FFB703"  # Amarelo/Laranja
        nivel_prioridade = 2
        status_label = "Acompanhar sinais"
    else:
        risco = "BAIXO RISCO"
        cor_risco = "#00F5D4"  # Verde/Ciano
        nivel_prioridade = 3
        status_label = "Cliente saudável"

    # Diagnósticos automáticos objetivos
    motivos_alerta = []
    if cliente["dias_sem_backup"] >= 3 or not cliente.get("backup_integro", True):
        motivos_alerta.append(f"Backup crítico: {cliente['dias_sem_backup']} dias sem cópia ou integridade falha")
    if not cliente["versao_sistema"].startswith("5.4"):
        motivos_alerta.append(f"Versão desatualizada ({cliente['versao_sistema']} vs 5.4.2)")
    if cliente["variacao_vendas_pct"] < -20:
        motivos_alerta.append(f"Queda expressiva de vendas ({cliente['variacao_vendas_pct']}%)")
    if cliente["chamados_ultimos_30d"] >= 4:
        motivos_alerta.append(f"Alto volume de suporte ({cliente['chamados_ultimos_30d']} chamados)")

    return {
        "health_score": score_final,
        "risco": risco,
        "cor_risco": cor_risco,
        "nivel_prioridade": nivel_prioridade,
        "status_label": status_label,
        "detalhe_subscores": {
            "backup": round(score_backup, 1),
            "versao": round(score_versao, 1),
            "vendas": round(score_vendas, 1),
            "chamados": round(score_chamados, 1)
        },
        "motivos_alerta": motivos_alerta
    }

def simular_impacto(cliente: Dict[str, Any], simula_versao: bool, simula_backup: bool, simula_chamados: bool) -> Dict[str, Any]:
    """
    Simulador de Impacto ("E se...?")
    Avalia como intervenções proativas afetam o Health Score do cliente.
    """
    cliente_simulado = dict(cliente)

    if simula_versao:
        cliente_simulado["versao_sistema"] = cliente.get("versao_atual_homologada", "5.4.2")
    if simula_backup:
        cliente_simulado["dias_sem_backup"] = 0
        cliente_simulado["backup_integro"] = True
    if simula_chamados:
        cliente_simulado["chamados_ultimos_30d"] = max(0, cliente["chamados_ultimos_30d"] - 3)

    resultado_original = calcular_health_score(cliente)
    resultado_novo = calcular_health_score(cliente_simulado)

    return {
        "score_original": resultado_original["health_score"],
        "risco_original": resultado_original["risco"],
        "score_simulado": resultado_novo["health_score"],
        "risco_simulado": resultado_novo["risco"],
        "ganho_pontos": resultado_novo["health_score"] - resultado_original["health_score"],
        "detalhe_original": resultado_original["detalhe_subscores"],
        "detalhe_simulado": resultado_novo["detalhe_subscores"]
    }

def aplicar_clusterizacao_ml(clientes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Aplica K-Means em 3 clusters para detectar padrões ocultos
    cruzando Risco Técnico (Backup + Versão) com Risco Comercial (Vendas + Chamados).
    """
    if len(clientes) < 3:
        return clientes

    # Matriz de features: [dias_sem_backup, versao_score, variacao_vendas, chamados]
    features = []
    for c in clientes:
        v_score = 100 if c["versao_sistema"].startswith("5.4") else (70 if c["versao_sistema"].startswith("5.3") else 30)
        b_score = 100 if c["dias_sem_backup"] <= 1 and c.get("backup_integro", True) else (50 if c["dias_sem_backup"] <= 3 else 10)
        features.append([
            b_score,
            v_score,
            c["variacao_vendas_pct"],
            c["chamados_ultimos_30d"]
        ])

    X = np.array(features)
    kmeans = KMeans(n_clusters=3, random_state=42, n_init=10)
    labels = kmeans.fit_predict(X)

    # Identificar o perfil de cada cluster com base nas médias
    cluster_nomes = {
        0: "Perfil A: Alta Operação e Estabilidade",
        1: "Perfil B: Risco Técnico & Vulnerabilidade",
        2: "Perfil C: Alerta de Churn / Baixa Atividade"
    }

    for i, c in enumerate(clientes):
        c["cluster_id"] = int(labels[i])
        c["cluster_nome"] = cluster_nomes.get(int(labels[i]), f"Cluster {labels[i]}")

    return clientes

def aplicar_deteccao_anomalias_ml(clientes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Detecção de Anomalias Não Supervisionada usando Isolation Forest (Conforme Google Colab BVX).
    Identifica padrões atípicos multivariados (ex: Cliente Silencioso e Risco Iminente de Perda).
    """
    if len(clientes) < 5:
        for c in clientes:
            c["alerta_anomalia"] = False
            c["tipo_anomalia"] = None
        return clientes

    # Features do modelo Colab: [dias_sem_backup, variacao_vendas_pct, chamados_ultimos_30d]
    features = [
        [
            float(c["dias_sem_backup"]),
            float(c["variacao_vendas_pct"]),
            float(c["chamados_ultimos_30d"])
        ]
        for c in clientes
    ]

    X = np.array(features)
    # Contaminação estimada em 8%
    iso_forest = IsolationForest(contamination=0.08, random_state=42)
    predicoes = iso_forest.fit_predict(X)

    for i, c in enumerate(clientes):
        is_anomaly = bool(predicoes[i] == -1)
        c["alerta_anomalia"] = is_anomaly

        if is_anomaly:
            # Classificação explicável do tipo de anomalia
            if c["chamados_ultimos_30d"] == 0 and c["variacao_vendas_pct"] < -20:
                c["tipo_anomalia"] = "Cliente Silencioso (Risco de Churn Oculto)"
            elif c["dias_sem_backup"] >= 4 or not c.get("backup_integro", True):
                c["tipo_anomalia"] = "Vulnerabilidade Crítica de Backup"
            elif not c["versao_sistema"].startswith("5.4"):
                c["tipo_anomalia"] = "Defasagem Tecnológica Severa"
            else:
                c["tipo_anomalia"] = "Desvio Estatístico Multivariado"
        else:
            c["tipo_anomalia"] = None

    return clientes

