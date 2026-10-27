# Atalhos para as etapas do projeto. Execute 'make' para ver a ordem.
SHELL := /bin/bash

# Usa o python3.13 quando disponivel; caso contrario, o python3 do sistema.
PYTHON := $(shell command -v python3.13 2>/dev/null || command -v python3)
PIP := $(PYTHON) -m pip
RUN := PYTHONPATH=packages/selfheal $(PYTHON)

.PHONY: help checar setup deps dev test demo quebrar experimento relatorio painel restaurar limpar

help:
	@echo ""
	@echo "  ORDEM DE EXECUCAO"
	@echo ""
	@echo "  0) make checar       confere se Python e Node estao ok"
	@echo "  1) make setup        instala tudo (uma vez so)"
	@echo "     make deps         instala so o que estiver faltando"
	@echo "  2) make dev          sobe a aplicacao em http://localhost:3000"
	@echo "  3) make test         roda a suite de testes na interface original"
	@echo "  4) make demo         quebra a interface e conserta sozinho  <-- a demonstracao"
	@echo "     make quebrar      so aplica a mudanca de interface (CENARIO=c1..c4)"
	@echo "  5) make experimento  roda os 4 cenarios e gera as metricas"
	@echo "  6) make relatorio    mostra o relatorio no terminal"
	@echo "     make painel       abre o painel de revisao no navegador"
	@echo "     make restaurar    volta tudo ao estado inicial (repetir a demo)"
	@echo ""

checar:
	@echo ">> Python : $(PYTHON)"
	@$(PYTHON) --version || (echo "   Python nao encontrado" && exit 1)
	@echo ">> pip    : $$($(PIP) --version 2>/dev/null || echo 'ausente')"
	@echo ">> Node   : $$(node --version 2>/dev/null || echo 'ausente')"
	@echo ">> npm    : $$(npm --version 2>/dev/null || echo 'ausente')"

setup:
	@echo ">> instalando a biblioteca Python..."
	$(PIP) install --user -e packages/selfheal
	@echo ">> baixando o Chromium do Playwright (Python)..."
	$(PYTHON) -m playwright install chromium
	@echo ">> instalando a aplicacao web..."
	cd web && npm install
	@echo ">> compilando o pacote npm do Playwright..."
	cd packages/selfheal-playwright && npm install && npx tsc && npm pack
	@echo ">> instalando a suite de testes..."
	cd e2e && npm install && npm install --no-save --no-package-lock ../packages/selfheal-playwright/selfheal-playwright-0.1.0.tgz && npx playwright install chromium
	@echo ""
	@echo "pronto. agora rode: make dev"

# Garante que tudo esta instalado antes de rodar. Sem isso, o npx baixa um
# Playwright temporario e o erro que aparece nao diz qual e o problema real.
deps:
	@if [ ! -d web/node_modules ]; then \
		echo ">> instalando dependencias da aplicacao web..."; \
		cd web && npm install; \
	fi
	@if [ ! -f packages/selfheal-playwright/selfheal-playwright-0.1.0.tgz ]; then \
		echo ">> compilando e empacotando o adaptador npm..."; \
		cd packages/selfheal-playwright && npm install && npx tsc && npm pack; \
	fi
	@if [ ! -d e2e/node_modules ]; then \
		echo ">> instalando dependencias da suite de testes..."; \
		cd e2e && npm install; \
	fi
	@if [ ! -d e2e/node_modules/selfheal-playwright ]; then \
		echo ">> instalando o adaptador selfheal-playwright..."; \
		cd e2e && npm install --no-save --no-package-lock \
			../packages/selfheal-playwright/selfheal-playwright-0.1.0.tgz; \
	fi
	@$(PYTHON) -c "import selfheal" 2>/dev/null || ( \
		echo ">> instalando o engine Python..."; \
		$(PIP) install --user -e packages/selfheal )
	@echo ">> dependencias ok"

dev: deps
	cd web && npm run dev

test: deps
	cd e2e && npx playwright test

# Demonstracao no formato real de uso: a suite roda normalmente e a
# ferramenta corrige durante a execucao.
demo: deps restaurar
	@echo ""
	@echo ">> 1/3 interface original — a ferramenta memoriza os elementos"
	@echo "   (na primeira vez o Next precisa compilar o site; pode levar 1-2 min)"
	@echo ""
	cd e2e && npx playwright test
	@echo ""
	@echo ">> 2/3 aplicando a mudanca de interface"
	cd web && node scripts/apply-variant.mjs $(or $(CENARIO),c1) 4
	@sleep 3
	@echo ""
	@echo ">> 3/3 a suite quebra e vai se corrigindo a cada execucao"
	@echo ""
	@ok=0; \
	for tentativa in 1 2 3 4 5; do \
		echo ""; \
		echo "   --- execucao $$tentativa ---"; \
		if (cd e2e && npx playwright test); then \
			echo ""; \
			echo "   suite VERDE na execucao $$tentativa."; \
			ok=1; break; \
		fi; \
	done; \
	if [ $$ok -eq 0 ]; then \
		echo ""; \
		echo "   restaram seletores sem correcao automatica."; \
		echo "   veja o resumo acima: sao os listados em 'nao recuperados'."; \
	fi
	@echo ""
	@echo ">> os seletores foram reescritos nos arquivos .spec.ts"
	@echo "   'make restaurar' devolve tudo ao estado inicial."

quebrar:
	cd web && node scripts/apply-variant.mjs $(or $(CENARIO),c1) 4

demo-antiga:
	$(RUN) experiment/demo_autofix.py $(or $(CENARIO),c1)

experimento:
	$(RUN) experiment/harness.py

relatorio:
	$(RUN) -m selfheal.cli report --report .selfheal/report.json

painel:
	@echo "abra http://localhost:3000/dashboard"

restaurar:
	@if [ -d e2e/tests.orig ]; then rm -rf e2e/tests && cp -r e2e/tests.orig e2e/tests; fi
	@if [ -d e2e/pages.orig ]; then rm -rf e2e/pages && cp -r e2e/pages.orig e2e/pages; fi
	cd web && node scripts/apply-variant.mjs base 4
	@echo "interface, testes e objetos de pagina de volta ao estado original"

limpar: restaurar
	rm -rf .selfheal e2e/test-results web/.next
