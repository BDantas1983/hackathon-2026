"""
Gerador de Dados Realistas (Mock Telemetria) - BVX Tecnologia 360
Simula a telemetria de 60 PDVs e comércios atendidos pela BVX na região (Santa Cruz do Rio Pardo, Ourinhos, etc.)
"""
import random
from typing import List, Dict, Any

CIDADES_REGIAO = [
    ("Santa Cruz do Rio Pardo", "SP"),
    ("Ourinhos", "SP"),
    ("Bernardino de Campos", "SP"),
    ("Ipaussu", "SP"),
    ("Chavantes", "SP"),
    ("Assis", "SP"),
    ("Bauru", "SP"),
    ("Marília", "SP"),
    ("Piraju", "SP"),
    ("Jacarezinho", "PR")
]

TIPOS_COMERCIO = [
    "Supermercado", "Padaria & Confeitaria", "Drogaria & Farmácia", 
    "Loja de Materiais de Construção", "Autopeças", "Restaurante & Hamburgueria", 
    "Distribuidora de Bebidas", "Boutique & Vestuário", "Agropecuária", "Posto de Combustíveis"
]

NOMES_FANTASIA = [
    "Estrela do Vale", "Bom Preço", "Nova Opção", "Santa Helena", "São Francisco",
    "Central", "União", "Progresso", "Aliança", "Vanguarda", "Imperial", "Ponto Certo",
    "Pão Quente", "Real", "Líder", "Triunfo", "SuperMais", "Confiante", "Modelo", "Expresso"
]

VERSAO_ATUAL_SISTEMA = "5.4.2"
VERSOES_POSSIVEIS = ["5.0.1", "5.1.0", "5.2.3", "5.3.1", "5.4.0", "5.4.2"]

def gerar_base_clientes(qtd: int = 60) -> List[Dict[str, Any]]:
    random.seed(42)  # Semente fixa para consistência nos testes
    clientes = []

    for i in range(1, qtd + 1):
        cidade, uf = random.choice(CIDADES_REGIAO)
        tipo = random.choice(TIPOS_COMERCIO)
        nome = f"{tipo} {random.choice(NOMES_FANTASIA)} {i}"
        
        # Simula perfis específicos (Críticos, Alerta e Saudáveis)
        tipo_perfil = random.choices(["saudavel", "alerta", "critico"], weights=[0.55, 0.25, 0.20])[0]

        if tipo_perfil == "critico":
            versao = random.choice(["5.0.1", "5.1.0"])
            dias_sem_backup = random.randint(4, 15)
            backup_integro = random.choice([True, False, False])
            variacao_vendas_pct = random.randint(-65, -25)
            chamados_ultimos_30d = random.randint(4, 12)
            faturamento_diario = random.uniform(2000, 18000)
            contato_nome = "Carlos Eduardo" if i % 2 == 0 else "Mariana Souza"
        elif tipo_perfil == "alerta":
            versao = random.choice(["5.2.3", "5.3.1"])
            dias_sem_backup = random.randint(2, 4)
            backup_integro = True
            variacao_vendas_pct = random.randint(-24, -5)
            chamados_ultimos_30d = random.randint(2, 4)
            faturamento_diario = random.uniform(4000, 25000)
            contato_nome = "Roberto Alves" if i % 2 == 0 else "Fernanda Lima"
        else:  # Saudável
            versao = random.choice(["5.4.0", "5.4.2"])
            dias_sem_backup = random.choice([0, 1])
            backup_integro = True
            variacao_vendas_pct = random.randint(-4, 25)
            chamados_ultimos_30d = random.randint(0, 1)
            faturamento_diario = random.uniform(8000, 45000)
            contato_nome = "José Silva" if i % 2 == 0 else "Ana Paula Martins"

        telefone = f"(14) 9{random.randint(8100, 9999)}-{random.randint(1000, 9999)}"
        email = f"contato@{nome.lower().replace(' ', '').replace('&', '').replace('ã', 'a').replace('ç', 'c')}.com.br"
        
        # Tamanho do backup em MB
        tamanho_backup_mb = round(random.uniform(150, 2400), 1)

        clientes.append({
            "id": i,
            "codigo_pdv": f"PDV-{1000 + i}",
            "razao_social": f"{nome} LTDA",
            "nome_fantasia": nome,
            "cidade": cidade,
            "uf": uf,
            "telefone": telefone,
            "email": email,
            "responsavel": contato_nome,
            "versao_sistema": versao,
            "versao_atual_homologada": VERSAO_ATUAL_SISTEMA,
            "dias_sem_backup": dias_sem_backup,
            "backup_integro": backup_integro,
            "tamanho_backup_mb": tamanho_backup_mb,
            "variacao_vendas_pct": variacao_vendas_pct,
            "faturamento_diario_estimado": round(faturamento_diario, 2),
            "chamados_ultimos_30d": chamados_ultimos_30d,
            "dias_ultima_interacao": random.randint(1, 45),
            "quantidade_terminais": random.randint(1, 6)
        })

    return clientes

if __name__ == "__main__":
    lista = gerar_base_clientes(5)
    print(f"Gerados com sucesso {len(lista)} exemplos.")
    print(lista[0])
