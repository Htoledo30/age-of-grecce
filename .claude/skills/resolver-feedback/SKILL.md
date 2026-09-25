---

name: resolver-feedback
description: Investiga e resolve feedback de Henrique sobre bugs, comportamento errado, regressões, desequilíbrio, desempenho ou problemas de interface no Age of Grecce. Use quando Henrique disser que algo está errado, estranho, quebrado, forte demais, fraco demais, lento, feio ou diferente do esperado.
----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

# Resolver feedback do Age of Grecce

Quando Henrique relatar um problema no jogo, assuma que ele quer que o problema seja investigado e, quando tecnicamente possível, corrigido.

Não responda apenas com hipóteses ou instruções sobre o que Henrique poderia verificar.

O Claude principal deve conduzir a investigação e implementação.

## Objetivo

Transformar relatos informais como:

* “isso aqui está errado”;
* “a IA está fazendo uma merda”;
* “isso ficou forte demais”;
* “essa tela está cortando”;
* “quando faço isso começa a lagar”;
* “antes funcionava”;
* “não era para acontecer isso”;

em um fluxo técnico de:

problema → investigação → causa raiz → correção → teste → validação.

## Primeiro princípio

Não pergunte a Henrique algo que o próprio projeto consegue responder.

Antes de perguntar:

1. procure no código;
2. procure nos testes;
3. consulte `ESTADO_DO_JOGO.md`;
4. consulte somente a seção relevante de `GDD.md`, quando necessário;
5. consulte as instruções do projeto;
6. verifique decisões já registradas.

Não repita perguntas cuja resposta já esteja disponível.

## Fluxo obrigatório

### 1. Entender o relato

Converta o feedback de Henrique em um comportamento verificável.

Exemplo:

“a cavalaria está forte demais”

não significa alterar imediatamente o dano da cavalaria.

Primeiro determine:

* em relação a quê;
* em qual sistema;
* quais números participam;
* se o problema é realmente numérico ou estrutural.

### 2. Localizar o sistema

Identifique:

* arquivos relevantes;
* dados relevantes;
* testes relacionados;
* sistemas que interagem com o comportamento.

Não leia o projeto inteiro sem necessidade.

### 3. Determinar o comportamento esperado

Descubra se o comportamento esperado já está definido.

Use a hierarquia do projeto:

1. código e testes para comportamento atual;
2. `ESTADO_DO_JOGO.md` para estado implementado;
3. `GDD.md` para visão e decisões;
4. Henrique para decisões ainda não resolvidas.

Não transforme conteúdo futuro do GDD em bug atual.

### 4. Reproduzir ou medir

Quando possível, reproduza o problema antes de alterar código.

Use:

* testes existentes;
* testes direcionados;
* ferramentas de simulação;
* ferramentas de medição;
* Playwright;
* scripts já existentes no projeto.

Para problemas subjetivos de balanceamento, procure transformar a percepção em evidência mensurável antes de alterar valores.

### 5. Escolher subagent quando útil

Use subagents quando eles melhorarem a investigação.

#### `balanceador`

Use para:

* economia;
* alimentação;
* população;
* construções;
* combate;
* IA;
* diplomacia;
* relações numéricas;
* efeitos sistêmicos;
* simulações.

#### `sentinela-regressao`

Use para:

* bugs;
* regressões;
* invariantes;
* testes quebrados;
* segunda análise independente;
* efeitos colaterais;
* confirmação de causa raiz.

#### `revisor-interface`

Use para:

* CSS;
* DOM;
* layout;
* overflow;
* interação;
* Playwright;
* escalas 90%, 100%, 115% e 130%;
* regressões visuais.

Não invoque um subagent apenas porque ele existe.

Para problemas simples e locais, investigue diretamente.

### 6. Encontrar a causa raiz

Não corrija apenas o primeiro sintoma encontrado.

Pergunte tecnicamente:

* por que isso acontece?
* qual sistema produz esse estado?
* a regra está errada ou a implementação?
* o dado está errado ou a fórmula?
* o problema surgiu nesta alteração ou já existia?
* outro sistema está produzindo o efeito observado?

Prefira corrigir a origem do problema.

### 7. Implementar

Quando a causa for técnica e a solução estiver determinada, implemente sem pedir confirmação adicional.

Faça a menor alteração suficiente.

Evite:

* refatorações não relacionadas;
* redesign desnecessário;
* implementação de sistemas futuros;
* mudanças amplas apenas para corrigir um caso localizado.

Preserve alterações locais que não pertencem à tarefa.

### 8. Testar

Quando o comportamento puder ser protegido automaticamente:

* crie um teste de regressão; ou
* ajuste um teste existente se o comportamento esperado realmente mudou.

Não altere um teste válido apenas para fazê-lo passar.

Não congele números deliberadamente ajustáveis de balanceamento quando o que deve ser protegido é uma relação ou regra.

Comece por verificações específicas e amplie conforme necessário.

### 9. Revisar efeitos colaterais

Depois da correção:

* verifique sistemas relacionados;
* considere casos extremos relevantes;
* use `sentinela-regressao` quando uma segunda análise trouxer valor;
* confirme que a correção não apenas deslocou o problema.

### 10. Executar o portão final

O Claude principal deve seguir as regras de entrega existentes em `AGENTS.md`.

Não delegue commit, push ou controle de Git a subagents.

### 11. Documentação

Atualize documentação somente quando necessário.

Atualize `ESTADO_DO_JOGO.md` se o comportamento implementado realmente mudou.

Atualize `GDD.md` somente quando Henrique mudar a visão ou tomar uma nova decisão de design.

Não registre cada correção técnica como nova decisão de game design.

## Quando perguntar a Henrique

Pare e pergunte somente quando houver uma decisão real ainda não definida.

Exemplos:

### Não precisa perguntar

* qual função contém o cálculo;
* onde fica determinado valor;
* qual teste está falhando;
* qual CSS controla o painel;
* por que determinado resultado matemático ocorre;
* como reproduzir algo que pode ser descoberto tecnicamente.

### Pode precisar perguntar

* cavalaria deveria vencer infantaria pesada em condições iguais?
* uma rebelião deveria criar sempre um novo poder ou restaurar um anterior?
* determinada mecânica nova deveria existir?
* qual entre duas direções de design incompatíveis Henrique prefere?

Antes de perguntar, confirme que essa decisão realmente não está registrada.

## Problemas de balanceamento

Não altere valores apenas porque Henrique disse que algo “parece forte” ou “parece fraco”.

O relato é motivo para investigar, não prova da causa.

Quando houver ferramentas disponíveis:

1. estabeleça referência;
2. meça;
3. identifique variável dominante;
4. altere somente depois de entender o efeito esperado;
5. meça novamente após a implementação.

## Problemas de interface

Não use redesign como primeira solução.

Primeiro determine:

* qual escala falha;
* qual dimensão ou regra causa o problema;
* se conteúdo dinâmico participa;
* se o problema está no CSS, DOM ou estado;
* se outras telas compartilham a mesma estrutura.

Preserve as regras permanentes de escala do projeto.

## Problemas de desempenho

Quando Henrique relatar lentidão:

1. descubra quando começa;
2. identifique o caminho executado;
3. procure crescimento inesperado de trabalho;
4. procure loops, buscas repetidas, recomputações ou renderizações excessivas;
5. meça quando houver ferramenta adequada;
6. não faça micro-otimização sem evidência.

## Resultado esperado

Ao terminar, informe de forma objetiva:

* o que estava errado;
* causa encontrada;
* o que foi alterado;
* testes ou medições realizados;
* resultado final;
* qualquer risco ou limitação restante.

Não transforme a resposta final em relatório enorme quando uma explicação curta for suficiente.
