# selfheal: recuperação automática de seletores em testes web

Protótipo de *self-healing* para testes automatizados de interfaces web.
Quando um seletor deixa de funcionar porque a interface mudou, a ferramenta
reposiciona o elemento por similaridade ponderada e **reescreve o seletor nos
arquivos-fonte do projeto**, de modo que a correção seja permanente.

Artefato do Trabalho de Conclusão de Curso *Uso de técnicas de inteligência
artificial na adaptação automática de testes automatizados para sistemas web e
desenvolvimento de um protótipo de self-healing* (Ciência da Computação,
Unesc). Todos os números citados neste documento são reproduzíveis pelos
comandos indicados ao lado de cada um.

Se termos como pontuação, limiar e margem forem novos para você, comece pela
[seção 5.0](#50-antes-das-tabelas-o-que-cada-termo-quer-dizer), que explica
cada um com um exemplo real.

---

## Índice

1. [As duas contribuições](#1-as-duas-contribuições)
2. [O que instalar](#2-o-que-instalar)
3. [Roteiro de demonstração](#3-roteiro-de-demonstração)
4. [Onde ver os resultados](#4-onde-ver-os-resultados)
5. [Resultados medidos: todas as tabelas](#5-resultados-medidos-todas-as-tabelas)
6. [Como o algoritmo decide](#6-como-o-algoritmo-decide)
7. [Os cenários de mudança de interface](#7-os-cenários-de-mudança-de-interface)
8. [Reproduzir o experimento](#8-reproduzir-o-experimento)
9. [Mapa do repositório](#9-mapa-do-repositório)
10. [Uso em um projeto real](#10-uso-em-um-projeto-real)
11. [Limitações conhecidas](#11-limitações-conhecidas)
12. [Onde cada parte do TCC está no código](#12-onde-cada-parte-do-tcc-está-no-código)

---

## 1. As duas contribuições

**Correção permanente do código.** As abordagens existentes resolvem a falha em
tempo de execução: o teste passa naquela rodada, mas o seletor obsoleto
continua no código-fonte e volta a falhar na execução seguinte. Aqui o arquivo
`.spec.ts`, ou o objeto de página que declara o seletor, é efetivamente
alterado. O custo dessa reescrita é de 0,7% do tempo de processamento.

**Rejeição por ambiguidade.** O Similo original escolhe o candidato de maior
pontuação desde que ela supere um limiar. Esse critério ignora a distância
entre o primeiro e o segundo colocado: quando dois candidatos praticamente
empatam, a pontuação alta do primeiro não indica que ele seja o elemento
certo, mas que há mais de um elemento plausível na página. A extensão aqui
proposta exige também uma margem mínima de separação e, quando ela não é
atingida, **se abstém** em vez de aplicar uma correção sem evidência. No
experimento isso reduziu as correções incorretas de 16 para 2, elevando a
precisão de 96,4% para 99,5%.

A justificativa é o custo assimétrico dos dois erros. Uma falha não recuperada
mantém o teste vermelho e o problema visível. Uma correção incorreta substitui
um teste que falha de forma evidente por um que passa validando o elemento
errado, mascarando defeitos reais.

---

## 2. O que instalar

### 2.1 Pré-requisitos

Quatro programas precisam existir na máquina antes de tudo. Confira cada um no
terminal:

| Programa | Versão mínima | Para conferir | Onde baixar |
|---|---|---|---|
| Git | qualquer | `git --version` | <https://git-scm.com> |
| Python | 3.9 | `python3 --version` | <https://www.python.org/downloads> |
| Node.js (traz o npm) | 18 | `node --version` | <https://nodejs.org> |
| make | qualquer | `make --version` | já vem no macOS e no Linux; veja 2.4 para Windows |

No macOS, se `git` ou `make` não existirem, este comando instala os dois:

```bash
xcode-select --install
```

O Chromium não precisa estar instalado: o próprio Playwright baixa a versão
dele durante a instalação. Não há banco de dados, serviço externo nem chave de
API, e depois de instalado nada precisa de internet: o engine decide
localmente.

### 2.2 Baixar o projeto

```bash
git clone https://github.com/lipelf/self-healing.git
cd self-healing
```

**Todos os comandos `make` deste documento são executados dentro da pasta
`self-healing`**, a raiz do repositório, onde fica o `Makefile`. Você nunca
precisa entrar nas subpastas para rodar a demonstração.

### 2.3 Instalar as dependências

```bash
make checar      # mostra as versões encontradas de Python, pip, Node e npm
make setup       # instala tudo; só precisa ser feito uma vez
```

O `make setup` leva alguns minutos, a maior parte baixando pacotes npm e o
Chromium. Ele executa cinco passos, cada um em uma pasta:

| Passo | Pasta | O que faz |
|---|---|---|
| 1 | `packages/selfheal` | instala o engine Python em modo editável |
| 2 | raiz | baixa o Chromium usado pelo harness do experimento |
| 3 | `web` | instala as dependências da loja de demonstração (Next.js) |
| 4 | `packages/selfheal-playwright` | compila o adaptador TypeScript e o empacota como `.tgz` |
| 5 | `e2e` | instala a suíte de testes, o adaptador dentro dela e o Chromium dela |

Se algo já estiver instalado, `make deps` instala apenas o que falta. Todo
comando de execução depende de `deps`, então não é possível rodar a
demonstração com o ambiente incompleto.

### 2.4 Sem `make`: os mesmos passos à mão

Para quem não tem `make`, como no Windows sem WSL, estes são exatamente os
comandos que o `make setup` executa. Rode-os na ordem, a partir da raiz do
repositório:

```bash
# 1. engine Python
python3 -m pip install --user -e packages/selfheal

# 2. Chromium do harness
python3 -m playwright install chromium

# 3. loja de demonstração
cd web
npm install
cd ..

# 4. adaptador npm: compila e empacota
cd packages/selfheal-playwright
npm install
npx tsc
npm pack
cd ../..

# 5. suíte de testes, com o adaptador recém-empacotado
cd e2e
npm install
npm install --no-save --no-package-lock ../packages/selfheal-playwright/selfheal-playwright-0.1.0.tgz
npx playwright install chromium
cd ..
```

No Windows, troque `python3` por `python`. E os comandos de execução também
mudam, porque cada alvo do `Makefile` é um atalho:

| Em vez de | Rode |
|---|---|
| `make dev` | `cd web` e `npm run dev` |
| `make test` | `cd e2e` e `npx playwright test` |
| `make quebrar CENARIO=c1` | `cd web` e `node scripts/apply-variant.mjs c1 4` |
| `make restaurar` | `cd web` e `node scripts/apply-variant.mjs base 4`, depois copie `e2e/tests.orig` sobre `e2e/tests` e `e2e/pages.orig` sobre `e2e/pages` |
| `make experimento` | `PYTHONPATH=packages/selfheal python3 experiment/harness.py` |

### 2.5 Se o passo 1 falhar

Em Python instalado pelo Homebrew, o `pip` pode recusar a instalação com a
mensagem `externally-managed-environment`. Nesse caso, crie um ambiente virtual
na raiz do repositório e instale o engine nele:

```bash
python3 -m venv .venv
source .venv/bin/activate          # no Windows: .venv\Scripts\activate
pip install -e packages/selfheal
python -m playwright install chromium
```

Com o ambiente ativo, siga os passos 3 a 5 de 2.4 normalmente. Lembre de ativá-lo
(`source .venv/bin/activate`) sempre que abrir um terminal novo para rodar o
projeto.

---

## 3. Roteiro de demonstração

A demonstração usa **dois terminais**. Esta é a sequência exata.

### Terminal 1: a aplicação

```bash
make dev
```

Sobe a loja de demonstração em <http://localhost:3000>. Na primeira execução o
Next.js compila o site, o que leva um ou dois minutos. Deixe este terminal
aberto.

A loja tem cinco fluxos com 44 elementos interativos: autenticação, catálogo,
carrinho, finalização de pedido e galeria de produto. A credencial de acesso é
`luiz@unesc.net` / `unesc2026`, definida em `web/.env.local`: não há banco, o
login valida contra esses dois valores, e eles ficam fora do código para que a
troca não exija recompilar. Os fluxos funcionam de verdade: adicionar ao
carrinho altera o carrinho, aplicar cupom altera o total, finalizar gera um
pedido. Isso importa porque o teste precisa asseverar comportamento, e não
apenas a presença de elementos na tela.

### Terminal 2: a ferramenta

```bash
make test     # a suíte roda na interface original e a ferramenta memoriza
make demo     # quebra a interface e se conserta sozinha
```

O `make demo` é a demonstração completa e faz, sozinho, o seguinte:

1. restaura tudo ao estado inicial;
2. roda a suíte na interface original, para que a ferramenta memorize os
   elementos (**esta etapa é indispensável**: sem caso armazenado não há com o
   que comparar);
3. aplica a mudança de interface do cenário C1;
4. roda a suíte repetidamente, até ficar verde ou esgotar cinco tentativas.

A repetição é necessária por uma razão estrutural: um seletor situado depois de
outro no mesmo teste só é exercitado quando o anterior volta a funcionar. Na
verificação relatada no TCC foram 24 correções na primeira execução, quatro na
segunda e suíte verde na terceira.

Para demonstrar um cenário mais severo:

```bash
make demo CENARIO=c4
```

> O `playwright.config.ts` declara um `webServer` com `reuseExistingServer`, de
> modo que `make test` e `make demo` sobem a aplicação sozinhos se ela não
> estiver no ar. O `make experimento`, porém, controla o navegador direto e não
> sobe nada: para ele o `make dev` é obrigatório. Manter os dois terminais é o
> caminho que funciona nos dois casos, e deixa a aplicação visível durante a
> apresentação.

Para voltar ao estado inicial em qualquer momento:

```bash
make restaurar    # desfaz a mutação e devolve os testes originais
make limpar       # idem, e ainda apaga memória, relatórios e cache de build
```

### Por que `make restaurar` existe

A ferramenta **altera arquivos de verdade**: reescreve os seletores em
`e2e/tests/` e em `e2e/pages/`, e a mutação reescreve `web/app/ui.ts`. Depois
de uma demonstração o repositório não está mais no estado original. As cópias
intactas ficam em `e2e/tests.orig/` e `e2e/pages.orig/`, e é delas que
`make restaurar` repõe os arquivos. Sem isso a segunda demonstração começaria
com os seletores já corrigidos e não quebraria nada.

---

## 4. Onde ver os resultados

São seis lugares, do mais imediato ao mais detalhado.

### 4.1 No terminal, ao fim da suíte

O reporter imprime um bloco com cada correção, a pontuação de similaridade e o
arquivo e a linha alterados:

```
================================================================
  SELF-HEALING
================================================================
  #login-email      -> #elxdjwv   similaridade 0.786   compra.spec.ts:6
  #add-produto-1    -> #e1ciiox   similaridade 0.802   compra.spec.ts:44

  28 de 28 seletor(es) corrigido(s) permanentemente no codigo.
  execute a suite novamente para confirmar.

  nao recuperados — exigem correcao manual:
    #thumb-3   galeria.spec.ts:12
      motivo: ambiguo, melhor similaridade 0.714
```

A lista de não recuperados é parte do resultado, não um defeito: traz arquivo,
linha e motivo, para que a correção manual remanescente não exija procurá-los
na suíte. Os motivos possíveis são `abaixo-do-limiar` (o melhor candidato não
alcançou τ), `ambiguo` (alcançou τ, mas empatou com o segundo dentro de δ),
`sem-conhecimento` (o elemento nunca foi observado com sucesso) e
`sem-candidatos`.

### 4.2 `make relatorio`: o mesmo relatório, navegável no terminal

```bash
make relatorio
```

Imprime o resumo (quebrados, recuperados, taxa, tempo médio) e, para cada
seletor, o substituto, a pontuação e o estado (`applied` ou `pending`).

### 4.3 O painel de revisão, em `/dashboard`

Com `make dev` no ar, abra <http://localhost:3000/dashboard>. É o terceiro
componente da arquitetura: lista cada correção com a pontuação, o arquivo e a
linha, e a **contribuição de cada uma das seis propriedades** naquela decisão.
É o que permite auditar a escolha sem abrir o código, e é a diferença em
relação às plataformas comerciais, que operam como caixas-pretas.

> Os botões de aceitar e recusar marcam a revisão apenas na tela: a marcação
> vive no estado do componente e não é persistida nem reenviada ao engine. No
> modo *auto-fix*, usado na demonstração, a correção já foi aplicada ao código
> quando o painel a exibe. Ligar esses botões à aplicação seletiva das
> correções é trabalho pendente; hoje quem opera pelo modo de sugestão aplica
> tudo de uma vez, com `selfheal apply`.

### 4.4 `.selfheal/report.json`: o dado bruto de uma execução

Uma entrada por seletor quebrado:

```json
{
  "old_selector": "#login-email",
  "new_selector": "#elxdjwv",
  "score": 0.7857,
  "healed": true,
  "mode": "autofix",
  "file": ".../e2e/tests/compra.spec.ts",
  "line": 6,
  "breakdown": {
    "visible_text": 1, "neighbor_text": 1, "id": 0,
    "name": 1, "class_": 1, "xpath": 1
  },
  "status": "applied",
  "duration_ms": 56.81,
  "rewrite_ms": 0.4
}
```

O `breakdown` é a pontuação de cada propriedade naquela comparação: nesse caso
o `id` foi a zero, como esperado em C1, e as outras cinco sustentaram a
decisão. O `rewrite_ms` separa o custo de reescrever o arquivo do custo de
decidir, que é o que permite afirmar que a reescrita custa 0,7% do total.

O arquivo também traz o desfecho da suíte:

```json
"suite": { "total": 9, "passed": 9, "failed": 0,
           "failed_without_healing": 8, "execucoes": 3 }
```

O relatório **acumula** ao longo das execuções de um mesmo ciclo de
recuperação, com desduplicação por arquivo e seletor. É o comportamento
desejado: um seletor corrigido na primeira execução precisa continuar no
relatório final, senão o balanço do ciclo ficaria incompleto. O `execucoes`
conta quantas execuções o ciclo exigiu, e `failed_without_healing` registra
quantos testes teriam falhado sem a ferramenta. O `make demo` apaga o relatório
antes de começar, para que cada demonstração produza um balanço próprio.

### 4.5 `make relatorio-e2e`: o relatório do Playwright

```bash
make relatorio-e2e
```

Abre o relatório HTML da última execução, com cada passo de cada teste,
capturas de tela das falhas e o rastro navegável. É onde se vê o teste do ponto
de vista de quem o escreveu. `make ui` abre o modo interativo, que permite
reexecutar um teste isolado e voltar no tempo.

### 4.6 `.selfheal/experimento.json` e `make tabelas`: o experimento

O experimento controlado não passa pela suíte: ele aplica os quatro cenários
diretamente e mede a capacidade de decisão do algoritmo isolado.

```bash
make experimento   # ~4 min; precisa de make dev no ar
make tabelas       # imprime as tabelas do TCC já em LaTeX
```

O `experimento.json` guarda, para cada um dos 504 seletores invalidados, a
pontuação do primeiro colocado, a do segundo, a margem entre eles e se o
primeiro era o elemento correto segundo o gabarito. É por isso que a calibração
de τ e δ não exige reexecutar o navegador: recalculam-se recuperação e precisão
para qualquer par a partir desses três valores.

O `make tabelas` existe para que o texto do artigo e o experimento não possam
divergir em silêncio: ele emite os blocos LaTeX prontos para colar, em vez de
alguém transcrever número a número de um JSON.

---

## 5. Resultados medidos: todas as tabelas

Reproduza qualquer uma com `make experimento && make tabelas`.

### 5.0 Antes das tabelas: o que cada termo quer dizer

As tabelas usam seis termos: propriedade, peso, pontuação, limiar, margem e
abstenção, além das duas métricas, recuperação e precisão. Abaixo, cada um com
um caso real do experimento: o campo de e-mail do login, que se chamava
`#login-email` e, no cenário C1, foi renomeado para `#elxdjwv`.

**Propriedade.** Uma característica do elemento que a ferramenta memoriza
enquanto o teste funciona: o texto que aparece na tela, o texto dos elementos
ao lado, o `id`, o `name`, a classe CSS e o caminho na árvore da página (xpath).
São seis ao todo.

**Peso.** O quanto cada propriedade conta na comparação. As que costumam
sobreviver a uma mudança de interface (texto visível, texto dos vizinhos, `id`
e `name`) valem 1,5. As que mudam a qualquer ajuste de layout (classe CSS e
xpath) valem 0,5.

**Pontuação, ou similaridade.** Quando um seletor quebra, a ferramenta compara
o elemento memorizado com cada elemento da página nova e dá a cada um uma nota
de 0 a 1. Cada propriedade igual soma o seu peso, cada propriedade diferente
soma zero, e o total é dividido pela soma de todos os pesos, que é 7.

No caso do e-mail, só o `id` mudou:

| Propriedade | Peso | Antes e depois | Conta |
|---|---|---|---|
| texto visível | 1,5 | igual | 1,5 |
| texto dos vizinhos | 1,5 | igual | 1,5 |
| `id` | 1,5 | `login-email` → `elxdjwv` | **0** |
| `name` | 1,5 | igual | 1,5 |
| classe CSS | 0,5 | igual | 0,5 |
| xpath | 0,5 | igual | 0,5 |
| **total** | **7** | | **5,5** |

```
pontuação = 5,5 / 7 = 0,786
```

É exatamente o `0.786` que aparece no relatório para esse seletor. O
identificador mudou, mas as outras cinco características continuaram iguais,
então a nota ficou alta. É como reconhecer alguém que cortou o cabelo: o rosto,
a voz e o jeito continuam, e você reconhece.

Na prática a comparação não é só "igual ou diferente": textos parecidos ganham
nota parcial, medida pela distância de Levenshtein, que conta quantas letras
precisam ser trocadas para ir de um texto ao outro.

**Limiar (τ = 0,50).** A nota mínima para a ferramenta aceitar um candidato.
Se nem o melhor elemento da página chega a 0,50, ela entende que nada ali se
parece o bastante com o que sumiu.

**Margem (δ = 0,005).** A distância mínima entre o primeiro e o segundo
colocado. É a contribuição deste trabalho. Não basta o primeiro ter nota alta:
ele precisa estar na frente do segundo.

O motivo são casos como as miniaturas da galeria: oito botões sem texto, com a
mesma classe. Se um deles sumiu, os oito tiram a mesma nota, digamos 0,714. A
nota passa do limiar, mas não há como saber qual dos oito é o certo, e escolher
um seria chute. A regra completa fica assim:

```
corrige  se  pontuação do 1º ≥ 0,50  E  (pontuação do 1º − pontuação do 2º) ≥ 0,005
abstém   em qualquer outro caso
```

**Abstenção.** Quando a ferramenta não corrige. Ela não tenta adivinhar: deixa
o teste vermelho e lista o seletor com arquivo, linha e motivo, para alguém
olhar.

**Taxa de recuperação.** De tudo que quebrou, quanto foi consertado
corretamente. No experimento, 504 seletores quebraram e 375 foram consertados
certo:

```
recuperação = 375 / 504 = 74,4%
```

**Precisão.** De tudo que a ferramenta mexeu, quanto estava certo. Ela tentou
corrigir 377 e acertou 375, errando só 2:

```
precisão = 375 / 377 = 99,5%
```

**Por que as duas métricas brigam.** Sem a margem, a ferramenta corrigiria mais
(recuperação de 84,1%), mas erraria 16 vezes em vez de 2. E errar é pior do que
não corrigir. Se ela não corrige, o teste continua vermelho e alguém percebe. Se
corrige errado, o teste fica verde testando o botão errado, e um defeito de
verdade passa sem ninguém ver. Por isso o trabalho prioriza a precisão, mesmo
perdendo um pouco de recuperação.

### 5.1 Propriedades comparadas e seus pesos

Origem: [`packages/selfheal/selfheal/descriptor.py`](packages/selfheal/selfheal/descriptor.py)

| Propriedade | Descrição | Peso |
|---|---|---|
| `visible_text` | texto visível ao usuário | 1,5 |
| `neighbor_text` | texto dos elementos vizinhos | 1,5 |
| `id` | atributo identificador | 1,5 |
| `name` | atributo `name` | 1,5 |
| `class_` | classes CSS aplicadas | 0,5 |
| `xpath` | caminho absoluto na árvore DOM | 0,5 |

As quatro primeiras carregam significado semântico e tendem a sobreviver a
mudanças de versão; classes e caminhos variam a cada ajuste de *layout*, o que
justifica o peso reduzido.

O conjunto é menor que o do Similo original, que compara onze propriedades.
Foram retiradas a etiqueta HTML, o caminho relativo ao ancestral identificado e
as três geométricas (posição, área e proporção), por redundância e por
instabilidade. A redução foi verificada antes de ser adotada, e não suposta; veja 5.5.

### 5.2 Efeito da margem de ambiguidade (τ = 0,50)

| Margem δ | Recuperação | Precisão | Correções incorretas |
|---|---|---|---|
| 0 (sem rejeição) | 84,1% | 96,4% | 16 |
| **0,005 (adotada)** | **74,4%** | **99,5%** | **2** |
| 0,050 | 63,3% | 100,0% | 0 |

Meio ponto percentual de separação elimina 14 das 16 correções incorretas. Para
obter precisão equivalente mexendo apenas no limiar, seria necessário levar τ a
0,80 e sacrificar 61,1 pontos de recuperação, contra os 9,7 que a margem custa.
A margem é um discriminante muito mais eficiente que a pontuação absoluta,
porque distingue um acerto confiante de um empate, coisa que o valor absoluto
não faz.

### 5.3 Recuperação por cenário

| Cenário | Quebrados | Corrigidos | Corretos | Recuperação | Precisão |
|---|---|---|---|---|---|
| C1 | 126 | 112 | 112 | 88,9% | 100,0% |
| C2 | 126 | 112 | 112 | 88,9% | 100,0% |
| C3 | 126 | 105 | 103 | 81,7% | 98,1% |
| C4 | 126 | 48 | 48 | 38,1% | 100,0% |
| **Global** | **504** | **377** | **375** | **74,4%** | **99,5%** |

O gradiente acompanha o funcionamento do algoritmo. Em C1 e C2 sobrevivem três
das quatro propriedades de peso 1,5 e nenhuma correção erra. C1 e C2 empatam
porque a única coisa que os separa, a classe CSS, tem peso 0,5 e não inverte
nenhuma ordenação. C3 destrói o `name`, de peso 1,5, e a recuperação cai para
81,7%.

C4 é o caso mais revelador: a recuperação cai a 38,1% e a precisão **sobe** a
100%. Sem evidência, a ferramenta deixa de corrigir e não passa a errar. É a
demonstração mais direta da assimetria de custos que motiva a extensão.

Tempo médio: **89 ms por seletor**, comparando contra 47 candidatos em média.

### 5.4 Desempenho por tipo de elemento

Os mesmos 504 casos, reagrupados pela natureza do elemento procurado.

| Tipo de elemento | Quebrados | Corrigidos | Corretos | Recuperação | Precisão |
|---|---|---|---|---|---|
| Autenticação | 48 | 48 | 48 | 100,0% | 100,0% |
| Finalização de pedido | 64 | 64 | 64 | 100,0% | 100,0% |
| Catálogo de produtos | 248 | 191 | 191 | 77,0% | 100,0% |
| Carrinho | 80 | 66 | 64 | 80,0% | 97,0% |
| Miniaturas | 64 | 8 | 8 | 12,5% | 100,0% |

Esta é a tabela que explica a média global. Nos formulários, onde cada campo
tem rótulo próprio, a recuperação é integral e sem um único erro. As miniaturas
da galeria concentram o pior caso: oito controles sem texto, sem rótulo
acessível e com a mesma classe, distinguíveis apenas pela posição. Dos 64
casos, 8 foram corrigidos, todos nos cenários em que a ordem da lista
permanece intacta, e os 8 estavam certos. Nos demais a ferramenta se absteve.

As miniaturas estão na aplicação **de propósito**, e deliberadamente sem
`aria-label`: são o pior caso para qualquer abordagem por similaridade e sua
presença é o que permite observar onde a técnica para. Abstenção não é falha: a
precisão permanece intacta e o seletor aparece na lista de não recuperados, com
arquivo e linha.

Das 127 abstenções, 64 vieram de pontuação abaixo do limiar, concentradas em
C4, e 63 da margem. Os dois critérios atuam sobre populações distintas: o
limiar barra o que ficou irreconhecível, a margem barra o que ficou ambíguo.
Nos 428 casos em que o primeiro colocado era o elemento correto, a margem média
foi de 0,189; nos 76 em que não era, foi de 0,012, cerca de dezesseis vezes
menor. É
esse contraste que explica por que meio ponto percentual resolve.

### 5.5 Seis propriedades contra as onze originais

```bash
make experimento      # 6 propriedades  -> .selfheal/experimento.json
make experimento-11   # 11 propriedades -> .selfheal/experimento-11-propriedades.json
```

| Configuração | Recuperação | Precisão |
|---|---|---|
| 11 propriedades (Similo original) | 74,6% | 90,6% |
| 6 propriedades (adotada) | 74,4% | 99,5% |

O patamar de 74,6% / 90,6% é coerente com o relatado na literatura, o que serve
de verificação de que o algoritmo de referência foi corretamente codificado
antes de ser modificado.

O ganho se concentra onde se previa. No cenário mais severo com a maior
densidade, as onze propriedades recuperam 27,7% com precisão de 43,4%, isto é,
mais da metade das correções aplicadas aponta para o elemento errado, enquanto
as seis recuperam 28,9% com precisão integral. Quando os candidatos são irmãos de uma
mesma lista, área e proporção são idênticas por construção: a geometria deixa
de ser evidência e passa a ser ruído com peso. Abrir mão dela custa 0,2 ponto
de recuperação e devolve 8,9 pontos de precisão.

As funções geométricas continuam implementadas em
[`similo.py`](packages/selfheal/selfheal/similo.py), fora do vetor adotado,
justamente para que essa comparação seja reexecutável.

### 5.6 Efeito da densidade de elementos

| Catálogo | Elementos na página | Recuperação | Precisão |
|---|---|---|---|
| 4 produtos | 43 | 74,4% | 99,2% |
| 24 produtos | 83 | 74,4% | 99,6% |

Resultado contraintuitivo: dobrar o número de candidatos concorrentes não
degradou nada. Cada produto adicional traz consigo o próprio nome, que funciona
como texto de vizinhança e o distingue dos demais. O que degrada a recuperação
não é a quantidade de candidatos, mas a ausência de propriedades que os
diferenciem, o que indica que interfaces com rotulagem textual consistente são
mais fáceis de manter automatizadas, independentemente do tamanho.

### 5.7 Verificação de ponta a ponta

Esta é a medição com a suíte real, e não com o algoritmo isolado.

| | |
|---|---|
| Testes na suíte | 9 |
| Seletores memorizados na interface original | 28 |
| Testes que passaram a falhar após a mudança | 8 de 9 |
| Correções na 1ª execução | 24 |
| Correções na 2ª execução | 4 |
| Suíte verde na | 3ª execução |
| Recuperação | 28 de 28 (100%) |
| Tempo médio por correção | 69,3 ms |
| Tempo total de reescrita do código | 13,6 ms (0,7% do processamento) |

Comparação com a correção manual: 4,2 minutos por seletor, medidos em amostra
de 15 casos. Os 504 seletores do experimento exigiriam cerca de 35 horas; a
ferramenta os processa em 45 segundos. A comparação pede ressalva: a correção
manual recupera a totalidade, a ferramenta recupera 74,4%, de modo que o
esforço residual sobre 129 casos permanece.

---

### 5.8 Rejeição aprendida contra margem fixa

```bash
make rejeicao              # piso de precisão 99,5%
make rejeicao PISO=0.95    # outro piso
```

Os dois valores de 6.1, o limiar e a margem, são globais: decidem igualmente
sobre um campo de login e sobre uma miniatura, embora a tabela de 5.4 mostre
que os dois não se comportam nada parecido. A limitação é de representação, e
não de calibração, porque nenhum par de números distingue situações cuja
confiabilidade depende do contexto.

Para medir o alcance disso, os dois testes foram substituídos por uma
regressão logística que estima a probabilidade de o primeiro colocado estar
correto, a partir de treze sinais disponíveis no instante da decisão: as
pontuações dos três primeiros, as distâncias entre eles, a quantidade de
candidatos, quantos passaram do limiar e a similaridade individual de cada uma
das seis propriedades do primeiro colocado. É esse último grupo que um par de
números não consegue expressar, pois informa **qual** evidência sustenta a
escolha.

| Validação | Recuperação | Precisão |
|---|---|---|
| Agrupada por elemento | 82,1% | 99,5% |
| Deixando um cenário de fora | 78,2% | 99,0% |
| Deixando um tipo de elemento de fora | 46,8% | 93,7% |
| **margem fixa, nas três** | **74,4%** | **99,5%** |

Com a precisão igualada à da configuração adotada, a rejeição aprendida
recupera **7,7 pontos a mais**. O ganho não se transfere:

- treinada em C1, C2 e C3 e avaliada em C4, recupera 15,9% contra os 38,1% da
  margem fixa, porque nunca viu um caso sem âncora alguma;
- treinada sem o catálogo e avaliada nele, cai a 3,2% contra 77,0%.

A margem fixa não sofre nenhuma dessas quedas, porque não depende de ter visto
o caso antes. **Por isso ela continua sendo o padrão da ferramenta**: um
projeto onde o selfheal acaba de ser instalado está exatamente na terceira
linha da tabela, sem nenhum caso rotulado próprio, e é nela que o modelo fica
27,6 pontos atrás. A rejeição aprendida é uma oportunidade condicionada ao
acúmulo de histórico, não uma substituição.

Três cuidados sustentam esses números, e os dois primeiros são onde avaliações
desse tipo costumam falhar sem avisar:

**Validação agrupada.** Cada elemento aparece oito vezes no experimento, uma
por cenário e densidade. Uma divisão aleatória o colocaria no treino e no teste
ao mesmo tempo, o modelo decoraria aquele elemento e o número sairia inflado.

**Padronização e ponto de operação calculados só no treino.** A média e o
desvio de cada sinal, e o corte de probabilidade, saem apenas da parcela de
treino de cada dobra, nunca do conjunto inteiro.

**Um único trecho de código calcula os sinais.** A função `sinais_de_decisao`
em [similo.py](packages/selfheal/selfheal/similo.py) é usada no treinamento e
de novo na decisão em tempo de execução. Se o vetor fosse montado duas vezes,
qualquer divergência entre as duas versões degradaria o modelo sem produzir
erro algum.

A regressão logística é implementada em Python puro de propósito. O engine é
distribuído como binário e a decisão em tempo de execução precisa de um produto
escalar e uma função logística; carregar scikit-learn, scipy e numpy para isso
multiplicaria o tamanho do pacote sem mudar o resultado. O treinamento roda
offline em [rejeicao.py](experiment/rejeicao.py) e o que viaja para o engine
são os coeficientes, em `.selfheal/rejeicao.json`.

Para usar o modelo em lugar da margem fixa:

```bash
selfheal bridge --confianca .selfheal/rejeicao.json
```

Sem esse argumento, a decisão segue pela margem fixa, que é o padrão.

## 6. Como o algoritmo decide

O Similo trata a localização como um problema de comparação. Durante cada
execução bem-sucedida, a ferramenta fotografa os seis atributos de cada
elemento localizado e os guarda associados ao seletor que consta no código. Na
falha, calcula a similaridade do alvo armazenado contra cada candidato da
página atual:

```
                 Σⱼ wⱼ · simⱼ(cⱼ, tⱼ)
      S(c, t) = ──────────────────────
                       Σⱼ wⱼ
```

onde `t` é o alvo armazenado, `c` um candidato, `wⱼ` o peso da propriedade e
`simⱼ` a similaridade daquela propriedade. Todas as seis são textuais, e para
todas se usa a distância de Levenshtein normalizada no intervalo [0, 1].

A decisão é então filtrada pelos dois critérios:

```
                 ⎧ c₍₁₎,  se S(c₍₁₎,t) ≥ τ  ∧  S(c₍₁₎,t) − S(c₍₂₎,t) ≥ δ
   recupera(t) = ⎨
                 ⎩ ∅,     caso contrário
```

Com `τ = 0,50` e `δ = 0,005`, escolhidos por varredura: τ entre 0,30 e 0,80 em
passos de 0,05, depois δ em 0; 0,005; 0,010; 0,020; 0,030 e 0,050. O critério
de decisão foi a maior taxa de recuperação entre as combinações capazes de
manter a precisão acima de 95%.

Esses são os valores padrão do adaptador, e os dois são o caminho padrão de
decisão da ferramenta; 5.8 descreve a alternativa aprendida e por que ela não
substituiu este critério. Para experimentar outros valores, sem recompilar
nada, declare-os no `use` do `playwright.config.ts`:

```ts
use: { selfheal: { threshold: 0.50, margin: 0.005, autoRetry: true } }
```

`autoRetry` ligado faz a ação prosseguir com o seletor recuperado, de modo que
uma única execução conserte todos os seletores quebrados do teste. Desligado, o
teste para na primeira falha e apenas o primeiro seletor é corrigido por
execução, útil para quem quer ver a falha acontecendo.

### Por que isto é inteligência artificial, e não aprendizado de máquina

O Similo não tem fase de treinamento: os pesos são definidos a priori, a partir
da estabilidade observada de cada propriedade, e não estimados a partir de
dados. A técnica pertence à inteligência artificial simbólica, e
especificamente ao **raciocínio baseado em casos**, cujo ciclo de recuperar,
reutilizar, revisar e reter corresponde diretamente ao código: o sistema
*retém* os atributos de cada elemento localizado; diante de uma falha,
*recupera* o caso armazenado e busca o candidato mais similar; *reutiliza* a
solução como novo seletor; e *revisa* essa solução pelo critério de rejeição. A
decisão ocorre sob informação incompleta, já que nenhuma das seis propriedades
é isoladamente conclusiva, e é a combinação de evidências parciais em uma
inferência que caracteriza a abordagem.

A rejeição por ambiguidade, por sua vez, é a aplicação à relocalização de
elementos web do que o reconhecimento de padrões chama de **opção de
rejeição**: um classificador que pode não decidir troca cobertura por
confiabilidade.

### Os três componentes

```
     Suíte E2E (TypeScript + Playwright)
              │ falha de localização
              ▼
     Adaptador (npm, intercepta a falha) ──── candidatos ◄── DOM renderizado
              │ atributos do alvo
              ▼
     Engine de decisão (Python) ◄──────────► Similo + rejeição
              │                                      
              ├── modo auto-fix ──► reescrita nos arquivos-fonte
              └── relatório JSON ──► painel de revisão (React)
```

A separação atende a um requisito de projeto: a lógica de decisão não conhece o
*framework* de testes, de modo que estender a ferramenta a outra linguagem
exija substituir apenas o adaptador e o módulo de reescrita.

O engine não controla o navegador. Quem o faz é a própria suíte, que já tem a
página aberta no momento da falha, e é dela que vêm os candidatos. A leitura é
feita sobre o DOM **renderizado**, e não sobre o HTML estático, porque o texto
efetivamente visível e o texto dos vizinhos só se definem depois da
renderização.

A varredura da reescrita começa pelo arquivo de teste e só se estende ao resto
do projeto quando o seletor não está nele. Isso mantém barato o caso comum e
alcança os seletores centralizados em objetos de página, como
[`e2e/pages/LoginPage.ts`](e2e/pages/LoginPage.ts).

---

## 7. Os cenários de mudança de interface

```bash
make quebrar CENARIO=c3    # aplica apenas a mudança, sem rodar nada
```

| Cenário | Alteração aplicada | Âncoras destruídas |
|---|---|---|
| C1 | renomeação do atributo `id` | `id` |
| C2 | C1 + substituição das classes CSS + reposicionamento | `id`, classe, posição |
| C3 | C2 + alteração do atributo `name` | `id`, classe, posição, `name` |
| C4 | C3 + reestruturação da hierarquia + reordenação das listas | todas, exceto o texto visível |

Implementação em
[`web/scripts/apply-variant.mjs`](web/scripts/apply-variant.mjs), que gera
`web/app/ui.ts` a partir de `web/app/ui.baseline.ts`. Cada mutação é
determinística, e é isso que permite saber exatamente quais seletores foram
invalidados.

Dois detalhes do desenho experimental são os que sustentam a validade dos
números:

**Os identificadores novos são opacos.** A renomeação gera valores como
`e1ciiox`, no estilo do que bibliotecas de CSS Modules produzem a cada
compilação, e não a conversão para outra convenção de escrita. Converter
`add-produto-1` em `addProduto1` preservaria parte da cadeia original e
transformaria o atributo renomeado em âncora, inflando a recuperação. Essa foi
exatamente a ameaça à validade interna detectada na primeira versão do
experimento, que produzia 100% de recuperação em todos os cenários.

**C4 destrói a vizinhança de verdade.** O componente
[`web/app/Isolado.tsx`](web/app/Isolado.tsx) envolve cada controle em um `div`
próprio apenas neste cenário. Isso importa porque `neighbor_text` lê os irmãos
dentro do mesmo pai: embrulhar o elemento faz o nome e o preço do produto
deixarem de ser seus irmãos, e o rótulo visível, idêntico entre os itens da
lista, passa a ser a única evidência restante.

A verificação do acerto dispensa inspeção manual. O script de mutação emite,
junto com a alteração, um gabarito (`.selfheal/variant-map.json`) que associa
cada seletor original ao elemento correspondente na interface modificada,
definido **antes** da execução. A correção é considerada correta quando o
elemento escolhido coincide, em caminho na árvore do documento, com o
registrado no gabarito.

---

## 8. Reproduzir o experimento

Com `make dev` em outro terminal:

```bash
make experimento      # ~4 min: 4 cenários × 2 densidades = 504 seletores
make tabelas          # as tabelas do TCC, em LaTeX
make experimento-11   # a comparação com as 11 propriedades originais
make rejeicao         # treina e valida a rejeição aprendida
```

O harness aplica os cenários diretamente sobre a aplicação, sem passar pela
suíte, e por isso mede a capacidade de decisão do algoritmo isolada da
mecânica do Playwright. Ele semeia a sessão por `add_init_script` em vez de
preencher o formulário de login, porque os campos desse formulário são
justamente os que a mutação renomeia: autenticar pela interface falharia nos
quatro cenários e o experimento nunca chegaria às páginas internas.

Saída esperada:

```
### densidade: catalogo com 4 produtos ###
linha de base: 43 elementos registrados

  C1: quebrados=43 corrigidos=36 corretos=36 recuperacao=83.7% precisao=100.0%
  ...
============================================================
GLOBAL  recuperacao=74.4%  precisao=99.5%  tempo=89.08ms
============================================================
```

---

## 9. Mapa do repositório

```
self-healing/
├── Makefile                     todos os comandos; `make` sem argumento mostra a ordem
│
├── packages/selfheal/           ENGINE DE DECISÃO (Python)
│   └── selfheal/
│       ├── descriptor.py        as 6 propriedades, os pesos e o vetor original de 11
│       ├── similo.py            S(c,t), Levenshtein e a rejeição por ambiguidade
│       ├── confianca.py         rejeição aprendida: produto escalar + logística
│       ├── engine.py            orquestra recuperação e reescrita
│       ├── rewriter.py          encontra e substitui o seletor nos arquivos-fonte
│       ├── knowledge.py         base de conhecimento (JSON) dos casos retidos
│       ├── extractor.py         coleta os candidatos do DOM renderizado
│       ├── bridge.py            protocolo JSON sobre entrada e saída padrão
│       ├── report.py            relatório consumido pelo painel
│       └── cli.py               init, report, apply, table, bridge, knowledge
│
├── packages/selfheal-playwright/ ADAPTADOR (TypeScript, pacote npm)
│   └── src/
│       ├── fixture.ts           envolve a `page`; intercepta a falha
│       ├── collector.ts         fotografa o alvo e lista os candidatos
│       ├── reporter.ts          o bloco impresso ao fim da suíte
│       ├── bridge-client.ts     conversa com o engine
│       ├── init.ts              `npx selfheal init`: acopla ao projeto
│       └── engine-resolver.ts   localiza o engine embarcado no pacote
│
├── web/                         LOJA DE DEMONSTRAÇÃO (Next.js 14 + TypeScript)
│   ├── app/                     os cinco fluxos, mais /dashboard (painel de revisão)
│   ├── app/ui.baseline.ts       os atributos originais de cada elemento
│   ├── app/ui.ts                gerado pela mutação; é o que a página realmente usa
│   ├── app/Isolado.tsx          destrói a vizinhança no cenário C4
│   └── scripts/apply-variant.mjs  aplica um cenário e emite o gabarito
│
├── e2e/                         SUÍTE DE TESTES
│   ├── tests/                   os 9 testes; a ferramenta reescreve AQUI
│   ├── tests.orig/              cópia intacta, usada por `make restaurar`
│   ├── pages/                   objeto de página (seletor fora do .spec.ts)
│   └── playwright.config.ts     reporter, τ, δ e autoRetry
│
├── experiment/                  EXPERIMENTO CONTROLADO
│   ├── harness.py               aplica os 4 cenários × 2 densidades
│   ├── tabelas.py               emite as tabelas do artigo em LaTeX
│   └── rejeicao.py              treina e valida a rejeição aprendida
│
└── .selfheal/                   SAÍDAS (geradas; não versionadas)
    ├── knowledge.json           os casos retidos: e ENTRADA, nao saida
    ├── report.json              o resultado de uma execução da suíte
    ├── experimento.json         os 504 casos, com pontuação e margem de cada um
    └── variant-map.json         o gabarito da mutação
```

A base de conhecimento merece nota: `knowledge.json` é **entrada** da
ferramenta, não saída. Sem ela não há caso com que comparar e nada é
recuperado. É por isso que `npx selfheal init` ajusta o `.gitignore` para
versioná-la enquanto ignora o resto de `.selfheal/`: em integração contínua
cada execução parte de uma máquina limpa, e sem o arquivo versionado o
self-healing simplesmente não funcionaria lá.

---

## 10. Uso em um projeto real

Quem escreve testes trabalha em um projeto Node, e por isso a instalação é pelo
npm. O engine viaja dentro do pacote e se provisiona sozinho na instalação, por
dois caminhos:

1. **binário compilado**, quando existe um para a plataforma. O pacote os
   procura por nome, no padrão `selfheal-engine-<plataforma>-<arquitetura>`.
   Hoje só está compilado o `darwin-arm64`, e nele a máquina de destino não
   precisa de Python algum. Compilar os demais é uma questão de rodar o
   empacotador (`selfheal build`) em cada plataforma, não de mudança de código.
2. **roda de Python embutida**, no resto dos casos. O `postinstall` cria um
   ambiente virtual dentro do próprio pacote e instala o engine ali, sem tocar
   no Python do sistema. Aqui a máquina precisa de Python 3.9 ou superior
   disponível no `PATH`; se não houver, a instalação avisa em vez de falhar em
   silêncio.

```bash
npm i -D selfheal-playwright
npx selfheal init
```

O `init` registra o reporter no `playwright.config.ts`, liga o Chromium em
janela, ajusta o `.gitignore` e troca a origem do import nos arquivos de teste.
Essa troca é a **única** alteração que os testes existentes sofrem, porque o
adaptador reexporta as mesmas construções do Playwright:

```diff
- import { test, expect } from '@playwright/test';
+ import { test, expect } from 'selfheal-playwright';
```

Daí em diante, `npx playwright test` como sempre.

**Dois modos de operação.** O de sugestão apenas reporta a correção proposta e
a linha a alterar. O *auto-fix* a aplica diretamente, e é o indicado para
*pipelines* sem intervenção humana. Em ambos, os seletores sobre os quais a
ferramenta se absteve são relatados com arquivo, linha e motivo.

**Seletores suportados.** Seletores CSS e XPath escritos no próprio `.spec.ts`;
seletores declarados em classes auxiliares (objeto de página); e os
localizadores semânticos do framework: `getByRole`, `getByLabel`,
`getByTestId`, `getByText`, `getByPlaceholder`, `getByAltText` e `getByTitle`.
Nestes últimos o `Locator` do Playwright é usado tal e qual, preservando a
semântica de correspondência do framework; a chave canônica serve apenas para
indexar a base e reencontrar a chamada no código.

---

## 11. Limitações conhecidas

**Validade externa.** A avaliação usou uma aplicação de demonstração. Aplicações
de produção têm DOM mais profundo e nomenclatura menos consistente. Os
resultados descrevem o comportamento sob os quatro cenários definidos e não
autorizam extrapolação para qualquer tipo de mudança. A escolha por uma
aplicação controlada foi deliberada: em um sistema real não se conhece a priori
quais seletores foram invalidados, o que impediria calcular a taxa de
recuperação com confiança.

**Seletores fora do alcance da reescrita.** Os montados dinamicamente em tempo
de execução, por não existirem como literal no código, e aqueles cujo argumento
é uma expressão regular. Nesses casos a recuperação em tempo de execução
continua operando: apenas a correção permanente deixa de ser aplicada.

**Escopo.** A reescrita suporta testes em TypeScript com Playwright.

**O elemento precisa ter sido visto ao menos uma vez.** O registro acontece a
cada localização bem-sucedida, individualmente, de modo que uma suíte
parcialmente vermelha ainda alimenta a base com os seletores que funcionam. Mas
um seletor nunca localizado com sucesso não pode ser recuperado, por não existir
caso armazenado com que compará-lo.

**Tempo da correção manual.** Os 4,2 minutos foram medidos com o próprio autor
executando as correções, e devem ser lidos como ordem de grandeza.

**O limiar e a margem foram calibrados nos mesmos 504 casos depois reportados.**
Não houve conjunto de teste separado. É um escalar e um par escolhidos em grade
grossa, por um critério declarado antes de olhar o resultado, o que limita o
ajuste, mas o desenho correto teria sido reservar uma parcela para validação. A
avaliação da rejeição aprendida em 5.8, que exigiu validação cruzada agrupada,
supre essa falta para a decisão de aceitar ou abster-se, embora não para a
escolha dos dois valores em si.

**A rejeição aprendida não generaliza para o que não viu.** Ela ganha 7,7 pontos
onde há dados rotulados representativos e perde 27,6 onde não há, o que é
exatamente a situação de um projeto recém-instalado. É a razão de a margem fixa
seguir como padrão, e de o modelo ser uma opção explícita.

### O que resolveria o pior caso

As abstenções se concentraram em controles sem texto visível. Para eles, a
árvore de acessibilidade do DOM oferece o que o DOM visível não carrega: papel
e rótulo acessível. Acrescentar esses atributos ao vetor comparado não exige
alterar o algoritmo nem o critério de rejeição, apenas a lista de propriedades
e seus pesos. A segunda direção, sugerida diretamente por C4, é comparar o texto
do **contêiner** que envolve o elemento, e não apenas o de seus irmãos
imediatos: em C4 o rótulo que identifica cada item permanece na página, mas
deixa de ser irmão do controle, e uma leitura que subisse alguns níveis na
árvore recuperaria essa evidência.

---

## 12. Onde cada parte do TCC está no código

| No artigo | No repositório |
|---|---|
| Equação 1, S(c,t) | [`similo.py`](packages/selfheal/selfheal/similo.py) → `similarity` |
| Equação 2, rejeição por ambiguidade | [`similo.py`](packages/selfheal/selfheal/similo.py) → `locate` |
| Tabela 1, propriedades e pesos | [`descriptor.py`](packages/selfheal/selfheal/descriptor.py) → `WEIGHTS` |
| Tabela 2, os quatro cenários | [`apply-variant.mjs`](web/scripts/apply-variant.mjs) → `SCENARIOS` |
| Tabela 3, efeito da margem | `make tabelas` → `tab:calibracao` |
| Tabela 4, por cenário | `make tabelas` → `tab:resultados` |
| Tabela 5, por tipo de elemento | `make tabelas` → `tab:tipos` |
| Figura 2, arquitetura | seção 6 deste documento |
| Etapa 2, os três componentes | `packages/selfheal/`, `packages/selfheal-playwright/`, `web/app/dashboard/` |
| Etapa 3, calibração de τ e δ | `experimento.json` → `calibracao` e `calibracao_margem` |
| Etapa 4, experimento controlado | [`harness.py`](experiment/harness.py) |
| Comparação 11 × 6 propriedades | `make experimento-11` |
| Tabela 6, rejeição aprendida | `make rejeicao` |
| Verificação de ponta a ponta | `make demo` + `.selfheal/report.json` → `suite` |
| Raciocínio baseado em casos | [`knowledge.py`](packages/selfheal/selfheal/knowledge.py) (retém, recupera) e [`similo.py`](packages/selfheal/selfheal/similo.py) (reutiliza, revisa) |

---

## Licença e autoria

Luiz Fellipe Rocha dos Santos. Ciência da Computação, Universidade do Extremo
Sul Catarinense (Unesc). Orientação: Prof. Luiz Ricardo Fiera.

Código aberto. Todas as dependências são gratuitas e de código aberto.
