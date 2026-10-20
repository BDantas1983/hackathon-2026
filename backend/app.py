"""
API FastAPI - Plataforma BVX 360: Inteligência, Prevenção e Ação
Hackathon Fatecou 2026 / BVX Tecnologia

Servidor REST e entrega de aplicação Web completa.
"""
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os

from backend.data_simulator import gerar_base_clientes
from backend.health_engine import (
    calcular_health_score, 
    simular_impacto, 
    aplicar_clusterizacao_ml,
    aplicar_deteccao_anomalias_ml
)
from backend.ai_copilot import gerar_diagnostico_cliente, gerar_mensagem_contato

app = FastAPI(
    title="Plataforma BVX 360",
    description="Sistema inteligente de monitoramento, prevenção de churn e telemetria preditiva",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializa base em memória com dados enriquecidos
BASE_CLIENTES: List[Dict[str, Any]] = []

def carregar_dados():
    global BASE_CLIENTES
    brutos = gerar_base_clientes(60)
    processados = []
    for c in brutos:
        hs = calcular_health_score(c)
        c_completo = {**c, **hs}
        processados.append(c_completo)
    
    # Aplica Machine Learning (Clusterização K-Means e Detecção de Anomalias com Isolation Forest)
    processados = aplicar_clusterizacao_ml(processados)
    processados = aplicar_deteccao_anomalias_ml(processados)
    BASE_CLIENTES = processados

carregar_dados()

# Modelos Pydantic para validação
class SimularRequest(BaseModel):
    client_id: int
    simula_versao: bool = False
    simula_backup: bool = False
    simula_chamados: bool = False

class AIDiagnoseRequest(BaseModel):
    client_id: int

class AIMessageRequest(BaseModel):
    client_id: int
    canal: str = "whatsapp"  # "whatsapp" ou "email"

# ==================== ENDPOINTS REST ====================

@app.get("/api/dashboard/stats")
def get_dashboard_stats():
    total = len(BASE_CLIENTES)
    if total == 0:
        return {}

    scores = [c["health_score"] for c in BASE_CLIENTES]
    media_score = round(sum(scores) / total, 1)

    alto_risco = len([c for c in BASE_CLIENTES if c["risco"] == "ALTO RISCO"])
    atencao = len([c for c in BASE_CLIENTES if c["risco"] == "ATENÇÃO"])
    baixo_risco = len([c for c in BASE_CLIENTES if c["risco"] == "BAIXO RISCO"])

    faturamento_total_dia = sum(c["faturamento_diario_estimado"] for c in BASE_CLIENTES)
    backups_criticos = len([c for c in BASE_CLIENTES if c["dias_sem_backup"] >= 3 or not c.get("backup_integro", True)])
    versoes_antigas = len([c for c in BASE_CLIENTES if not c["versao_sistema"].startswith("5.4")])
    total_anomalias = len([c for c in BASE_CLIENTES if c.get("alerta_anomalia", False)])

    return {
        "total_clientes": total,
        "media_health_score": media_score,
        "distribuicao_risco": {
            "alto_risco": alto_risco,
            "atencao": atencao,
            "baixo_risco": baixo_risco,
            "pct_alto_risco": round((alto_risco / total) * 100, 1),
            "pct_atencao": round((atencao / total) * 100, 1),
            "pct_baixo_risco": round((baixo_risco / total) * 100, 1)
        },
        "faturamento_diario_monitorado": round(faturamento_total_dia, 2),
        "alertas_prioritarios": {
            "backups_criticos": backups_criticos,
            "versoes_antigas": versoes_antigas,
            "anomalias_detectadas": total_anomalias
        },
        "ods_onu": {
            "ods_8": "Trabalho Decente e Crescimento Econômico - Prevenção de perdas comerciais nos PDVs",
            "ods_9": "Indústria, Inovação e Infraestrutura - Resiliência digital e segurança da informação"
        }
    }

@app.get("/calcular_score")
def calcular_score_colab_compat():
    """
    Endpoint compatível diretamente com o notebook do Google Colab (Hackathon BVX 2026).
    Retorna o dataset processado com os scores e as predições do Isolation Forest.
    """
    resposta = []
    for c in BASE_CLIENTES:
        resposta.append({
            "id_cliente": f"CLI{str(c['id']).zfill(4)}",
            "nome_fantasia": c["nome_fantasia"],
            "dias_sem_backup": c["dias_sem_backup"],
            "tamanho_banco_gb": round(c.get("tamanho_backup_mb", 100) / 1024, 2),
            "versao_sistema": c["versao_sistema"],
            "variacao_vendas_percentual": c["variacao_vendas_pct"],
            "chamados_abertos_mes": c["chamados_ultimos_30d"],
            "score_saude": c["health_score"],
            "alerta_anomalia": c.get("alerta_anomalia", False),
            "tipo_anomalia": c.get("tipo_anomalia")
        })
    resposta.sort(key=lambda x: x["score_saude"])
    return resposta

@app.get("/api/clients")
def get_clients(
    risco: Optional[str] = Query(None, description="Filtrar por ALTO RISCO, ATENÇÃO ou BAIXO RISCO"),
    busca: Optional[str] = Query(None, description="Buscar por nome, código ou cidade"),
    versao_antiga_only: bool = False,
    backup_critico_only: bool = False
):
    resultado = list(BASE_CLIENTES)

    if risco:
        resultado = [c for c in resultado if c["risco"].upper() == risco.upper()]

    if busca:
        termo = busca.lower()
        resultado = [
            c for c in resultado 
            if termo in c["nome_fantasia"].lower() 
            or termo in c["codigo_pdv"].lower() 
            or termo in c["cidade"].lower()
            or termo in c["responsavel"].lower()
        ]

    if versao_antiga_only:
        resultado = [c for c in resultado if not c["versao_sistema"].startswith("5.4")]

    if backup_critico_only:
        resultado = [c for c in resultado if c["dias_sem_backup"] >= 3 or not c.get("backup_integro", True)]

    # Ordenação por prioridade (menor score = maior urgência de atendimento)
    resultado.sort(key=lambda x: (x["nivel_prioridade"], x["health_score"]))

    return resultado

@app.get("/api/clients/{client_id}")
def get_client_by_id(client_id: int):
    for c in BASE_CLIENTES:
        if c["id"] == client_id:
            return c
    raise HTTPException(status_code=404, detail="Cliente não encontrado")

@app.get("/api/alerts")
def get_critical_alerts():
    alertas = []
    for c in BASE_CLIENTES:
        if c["dias_sem_backup"] >= 5 or not c.get("backup_integro", True):
            alertas.append({
                "client_id": c["id"],
                "tipo": "BACKUP_CRITICO",
                "gravidade": "ALTA",
                "cliente": c["nome_fantasia"],
                "cidade": c["cidade"],
                "mensagem": f"Backup não realizado há {c['dias_sem_backup']} dias ou integridade corrompida.",
                "acao_sugerida": "Disparar rotina de backup remoto urgente"
            })
        if c["variacao_vendas_pct"] <= -35:
            alertas.append({
                "client_id": c["id"],
                "tipo": "QUEDA_USO_CHURN",
                "gravidade": "ALTA",
                "cliente": c["nome_fantasia"],
                "cidade": c["cidade"],
                "mensagem": f"Queda acentuada de {c['variacao_vendas_pct']}% nas vendas no PDV.",
                "acao_sugerida": "Ligar para entender se houve troca de sistema ou problema técnico"
            })
    return alertas[:12]

@app.post("/api/simulate")
def post_simular_impacto(req: SimularRequest):
    cliente = None
    for c in BASE_CLIENTES:
        if c["id"] == req.client_id:
            cliente = c
            break
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    resultado = simular_impacto(
        cliente, 
        simula_versao=req.simula_versao,
        simula_backup=req.simula_backup,
        simula_chamados=req.simula_chamados
    )
    return resultado

@app.post("/api/ai/diagnose")
def post_ai_diagnose(req: AIDiagnoseRequest):
    cliente = None
    for c in BASE_CLIENTES:
        if c["id"] == req.client_id:
            cliente = c
            break
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    return gerar_diagnostico_cliente(cliente)

@app.post("/api/ai/message")
def post_ai_message(req: AIMessageRequest):
    cliente = None
    for c in BASE_CLIENTES:
        if c["id"] == req.client_id:
            cliente = c
            break
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    return gerar_mensagem_contato(cliente, canal=req.canal)

# ==================== SERVE FRONTEND ESTÁTICO ====================
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
