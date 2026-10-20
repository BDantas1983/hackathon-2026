"""
Ponto de Entrada da Aplicação BVX 360
Hackathon Fatecou 2026 / BVX Tecnologia

Execute: python main.py
Acesse: http://localhost:8000
"""
import uvicorn

if __name__ == "__main__":
    print("Iniciando Plataforma BVX 360...")
    print("Acesse no navegador: http://localhost:8000")
    uvicorn.run("backend.app:app", host="0.0.0.0", port=8000, reload=True)
