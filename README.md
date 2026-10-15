# selfheal — recuperação automática de seletores em testes web

Protótipo de *self-healing* para testes automatizados de interfaces web.
Quando um seletor deixa de funcionar porque a interface mudou, a ferramenta
reposiciona o elemento por similaridade ponderada e **reescreve o seletor no
arquivo de teste**, de modo que a correção seja permanente.

## O que diferencia esta ferramenta

As abordagens existentes resolvem a falha em tempo de execução: o teste passa
naquela rodada, mas o seletor obsoleto continua no código e volta a falhar na
execução seguinte. Aqui o arquivo `.spec.ts` é efetivamente alterado.

Além disso, a implementação estende o algoritmo Similo com **rejeição por
ambiguidade**: quando o primeiro e o segundo colocado praticamente empatam,
não há evidência para escolher entre eles e a ferramenta se abstém. No
experimento, isso reduziu as correções incorretas de 69 para 19 (-72%).

## Como um tester usa

Quem escreve testes trabalha em um projeto Node. A instalacao, por isso, e
feita pelo npm — o engine de decisao viaja dentro do pacote e se instala
sozinho, sem exigir que a maquina tenha Python configurado.

```bash
npm i -D selfheal-playwright
npx selfheal init
```

O `selfheal init` registra o reporter no `playwright.config.ts`, liga o
Chromium em janela e troca a origem do import nos arquivos de teste:

```diff
- import { test, expect } from '@playwright/test';
+ import { test, expect } from 'selfheal-playwright';
```

Os testes continuam exatamente como estavam. A partir daí:

```bash
npx playwright test
```

O Chromium abre em janela e a suíte roda normalmente. Enquanto a interface
não muda, a ferramenta apenas observa e memoriza os elementos. Quando um
seletor quebra, ela recupera o elemento na hora, deixa o teste seguir e, ao
final, reescreve o seletor no arquivo `.spec.ts`:

```
================================================================
  SELF-HEALING
================================================================
  #aumentar-item-1 -> #e19f8em  similaridade 0.617  compra.spec.ts:16
  #link-esqueci -> #e1jbe5x     similaridade 0.613  login.spec.ts:17

  2 de 2 seletor(es) corrigido(s) permanentemente no codigo.
  execute a suite novamente para confirmar.

  nao recuperados — exigem correcao manual:
    #campo-busca  compra.spec.ts:6
      motivo: abaixo-do-limiar, melhor similaridade 0.483
    #diminuir-item-1  compra.spec.ts:17
      motivo: ambiguo, melhor similaridade 0.589
================================================================
```

O que a ferramenta consegue decidir, ela corrige. O que não consegue, ela
localiza: arquivo, linha e o motivo da abstenção. Em nenhum dos dois casos
sobra para o tester procurar o seletor pela suíte.

### Onde o engine roda

O engine de decisão é Python, mas isso não aparece para quem usa. Na
execução ele é localizado nesta ordem:

1. **binário standalone** embutido no pacote, quando existe um para a
   plataforma — dispensa Python por completo;
2. **ambiente próprio**, criado pelo pacote na instalação a partir do wheel
   que viaja junto — usa o Python da máquina sem tocar nele;
3. **Python do sistema**, quando já tem o engine instalado;
4. se nada disso existir, a mensagem diz exatamente o que fazer.

### Em integração contínua

A base de conhecimento é **entrada, não saída**: sem ela a ferramenta não tem
com o que comparar e não recupera nada. Como o runner de CI parte de uma
máquina limpa a cada execução, `.selfheal/knowledge.json` precisa ser
versionado — o `selfheal init` já ajusta o `.gitignore` para isso:

```gitignore
**/.selfheal/*
!**/.selfheal/knowledge.json
```

Na prática, a base acompanha o código dos testes como um *snapshot*: quando um
seletor é corrigido, a base muda junto e entra no mesmo commit.

A execução em paralelo é suportada. Cada worker do Playwright roda o seu
próprio engine, e a gravação da base é feita sob trava exclusiva, relendo o
disco e fundindo antes de substituir o arquivo de forma atômica — de modo que
o que um worker aprendeu não apague o que os outros aprenderam.

Para CI, desligue a janela do navegador:

```bash
HEADLESS=1 npx playwright test
```

### Tabela de resultados

Depois da execução:

```bash
npx selfheal table      # ou: selfheal table
```

Gera `.selfheal/tabela.md` e `.selfheal/tabela.csv` comparando o custo da
suíte com e sem a ferramenta:

| Metrica                    | Sem self-healing | Com self-healing |
|----------------------------|------------------|------------------|
| Seletores quebrados        | 6                | 6                |
| Corrigidos automaticamente | 0                | 2                |
| Exigem correcao manual     | 6                | 4                |
| Tempo ate a suite verde    | 25,2 min         | 16,8 min         |
| Intervencao humana         | 100,0%           | 66,7%            |

Quando o experimento controlado já foi executado, a tabela por cenário entra
no mesmo arquivo.

### Configuração

No `playwright.config.ts`, via `use`:

| Opção | Padrão | O que faz |
|-------|--------|-----------|
| `enabled` | `true` | Liga ou desliga o self-healing |
| `autoRetry` | `true` | Prossegue com o seletor recuperado na mesma execução |
| `healTimeout` | `2000` | Quanto esperar pelo elemento antes de tentar recuperá-lo |
| `threshold` | `0.50` | Similaridade mínima para aceitar um candidato |
| `margin` | `0.005` | Separação mínima entre 1º e 2º colocado |

Para apenas sugerir, sem tocar no código, registre o reporter com
`['selfheal-playwright/dist/reporter', { apply: false }]`.

## Estrutura

```
packages/selfheal/            engine Python + CLI (instalável via pip)
  selfheal/bridge.py            ponte JSON usada pela suíte durante a execução
  selfheal/similo.py     algoritmo de similaridade ponderada
  selfheal/descriptor.py as 11 propriedades comparadas e seus pesos
  selfheal/extractor.py  extração do DOM via Playwright + Chromium
  selfheal/rewriter.py   reescrita do seletor no arquivo de teste
  selfheal/engine.py     orquestração (aprender → recuperar → corrigir)
  selfheal/installer.py  acoplamento a um projeto Playwright (selfheal init)
  selfheal/packager.py   geração dos artefatos distribuíveis (selfheal build)
packages/selfheal-playwright/ pacote npm que se acopla ao Playwright
  src/fixture.ts                intercepta a falha do seletor durante o teste
  src/reporter.ts               aplica as correções ao final da execução
  src/engine-resolver.ts        localiza o engine sem exigir Python do usuário
  scripts/postinstall.js        provisiona o engine na instalação
web/                          aplicação de demonstração em Next.js + painel
e2e/                          suíte end-to-end de exemplo
experiment/                   harness do experimento controlado
```

## Desenvolvimento

### Requisitos

- **Python 3.13** (recomendado) ou 3.9+, apenas para gerar os artefatos.
- **Node.js 18+**.

### Gerar o pacote distribuível

```bash
python3.13 -m pip install -e packages/selfheal
selfheal build
```

Compila o adaptador, gera o wheel do engine, embute um dentro do outro e —
quando o PyInstaller está disponível — compila o binário standalone da
plataforma atual. Os artefatos ficam em `dist/`:

```
dist/selfheal-playwright-0.1.0.tgz    pacote npm — e isto que o QA instala
dist/selfheal-0.1.0-py3-none-any.whl  engine (ja embutido no pacote acima)
```

Para gerar sem o binário: `selfheal build --sem-binario`.

### Aplicação de demonstração

```bash
cd web && npm run dev                  # sobe a aplicacao em :3000
cd e2e && npx playwright test          # executa a suite

cd web && node scripts/apply-variant.mjs c3 4   # quebra a interface
cd e2e && npx playwright test                   # a ferramenta corrige
```

O painel de revisão fica em `http://localhost:3000/dashboard`.

### Comandos do engine

| Comando | O que faz |
|---------|-----------|
| `selfheal init [pasta]` | acopla o engine a um projeto Playwright |
| `selfheal build` | gera os artefatos distribuíveis |
| `selfheal report` | relatório da última execução |
| `selfheal table` | tabela comparativa com e sem self-healing |
| `selfheal apply` | aplica as correções aceitas no painel |
| `selfheal knowledge` | lista a base de conhecimento |

## Experimento

```bash
PYTHONPATH=packages/selfheal python3 experiment/harness.py
```

Aplica quatro cenários de mudança sobre a aplicação de demonstração, em duas
densidades de página, e mede taxa de recuperação, precisão e tempo. Os
resultados vão para `.selfheal/experimento.json`.

### Resultados obtidos

| Cenário | Alteração | Quebrados | Recuperação | Precisão |
|---------|-----------|-----------|-------------|----------|
| C1 | id renomeado | 128 | 87,5% | 100,0% |
| C2 | + classes CSS e reposicionamento | 128 | 87,5% | 100,0% |
| C3 | + atributo name | 128 | 77,3% | 96,1% |
| C4 | + reestruturação e reordenação | 128 | 56,2% | 82,8% |
| **Global** | | **512** | **77,1%** | **95,4%** |

Tempo médio: 27 ms por recuperação, contra 4,2 min da correção manual.

## Licença

MIT.
