# AGENTS.md

# Age of Grecce — Regras para Agentes de Desenvolvimento

Este arquivo define como agentes de IA devem trabalhar no projeto Age of Grecce.

Objetivo:

- manter coordenação;
- evitar conflito entre agentes;
- impedir expansão indevida de escopo;
- preservar decisões de design;
- tornar o desenvolvimento mais automático sem perder direção humana.

---

# 1. Fontes de verdade e autoridade

Não existe uma única hierarquia linear para todos os tipos de informação.

Cada documento possui uma responsabilidade diferente.

## Para saber o que existe agora

Ordem de autoridade:

1. código atual;
2. testes atuais;
3. `CLAUDE.md`.

`CLAUDE.md` deve funcionar como memória técnica e fotografia do estado atual da
implementação.

Exemplos:

- recrutamento atualmente leva 1 rodada;
- UI atual usa tema escuro;
- módulos e arquivos existentes;
- sistemas que já estão implementados.

## Para saber o que foi decidido

Autoridade:

1. `DECISOES.md`.

Esse arquivo registra decisões intencionais de design e arquitetura.

Se `CLAUDE.md` e `DECISOES.md` falarem sobre a mesma decisão de design, `DECISOES.md`
prevalece como intenção oficial.

`CLAUDE.md` deve continuar descrevendo apenas o que já está implementado.

## Para saber o que fazer agora

Autoridade:

1. `PATCH_ATUAL.md`.

Ele define:

- objetivo atual;
- escopo;
- fora de escopo;
- tarefas;
- critérios de conclusão.

## Para saber para onde o projeto está indo

Autoridade:

1. `ROADMAP.md`.

Ele define direção macro e marcos.

## Para ideias futuras

Autoridade:

1. `BACKLOG.md`.

O backlog registra possibilidades, mas NÃO autoriza implementação.

## Para saber como os agentes devem trabalhar

Autoridade:

1. `AGENTS.md`.

Este arquivo define processo, papéis e regras de coordenação.

## Regra de conflito

Quando houver conflito aparente, primeiro identificar o tipo de informação:

- comportamento atual → código/testes/CLAUDE.md;
- decisão de design → DECISOES.md;
- trabalho atual → PATCH_ATUAL.md;
- direção futura → ROADMAP.md;
- ideia futura → BACKLOG.md;
- processo de trabalho → AGENTS.md.

Não tentar resolver conflitos simplesmente escolhendo "o arquivo mais novo".

---

# 2. Regra principal

Nenhum agente deve implementar uma ideia apenas porque ela parece boa.

Pergunta obrigatória:

> Isso pertence ao escopo do patch atual?

Se sim:

- pode virar tarefa.

Se não:

- registrar no backlog;
- não implementar.

---

# 3. Papel da Claude

Claude é o **agente principal de desenvolvimento**.

Responsabilidades:

- executar o patch atual;
- trabalhar nas tarefas principais;
- implementar features estruturais;
- manter coerência entre módulos;
- criar e atualizar testes;
- atualizar status das tarefas;
- apontar bloqueios;
- parar quando o patch estiver pronto para revisão.

Claude pode:

- criar arquivos novos necessários ao patch;
- alterar arquitetura quando necessário ao escopo;
- corrigir bugs relacionados ao patch;
- ajustar testes;
- atualizar documentação afetada.

Claude NÃO pode:

- iniciar o próximo patch automaticamente;
- implementar itens do backlog sem autorização;
- criar sistemas paralelos fora do escopo;
- reescrever módulos grandes apenas por preferência estética;
- alterar decisões registradas em `DECISOES.md` silenciosamente;
- começar IA antes do fechamento do `0.0.2`.

---

# 4. Papel do Codex

Codex é o **agente secundário e manual**.

Usos recomendados:

- corrigir bugs específicos;
- ajustar UI;
- revisar código;
- criar ou melhorar testes;
- refatorar pequenos trechos;
- investigar regressões;
- revisar implementação da Claude;
- fazer auditoria antes de fechar patch;
- realizar tarefas isoladas.

Codex NÃO deve receber instruções vagas como:

> "melhore o projeto"

ou:

> "faça o que achar melhor"

As tarefas devem ser delimitadas.

Exemplo bom:

> "Revise apenas o recrutamento. Não altere IA, economia ou movimento. Procure bugs e
> testes faltando."

---

# 5. Claude e Codex não devem competir

Se Claude estiver trabalhando em um módulo, Codex não deve alterar esse mesmo módulo ao
mesmo tempo sem autorização explícita.

Exemplo:

Claude:

- `src/ia/`
- integração com turno

Codex pode trabalhar em:

- UI;
- CSS;
- documentação;
- bugs isolados;
- testes não relacionados.

Se ambos precisarem alterar o mesmo arquivo:

1. um termina primeiro;
2. alterações são integradas;
3. o segundo trabalha sobre a versão atualizada.

---

# 6. Trabalho paralelo

Trabalho paralelo é permitido quando as áreas são independentes.

Exemplo:

Claude implementando economia; Codex corrigindo painel de província. Permitido.

Exemplo ruim:

Claude refatorando `resolucao.ts`; Codex corrigindo combate dentro de `resolucao.ts`.
Evitar.

---

# 7. Branches / Worktrees

Quando Claude e Codex estiverem trabalhando ao mesmo tempo, preferir branches ou worktrees
separadas.

Estrutura sugerida:

```text
AgeOfGrecce/
AgeOfGrecce-claude/
AgeOfGrecce-codex/
```

Exemplo de branches:

```text
main
claude/0.0.2-economia
codex/ui-provincia
```

Branches isolam trabalho, mas não eliminam conflitos.

Ainda é necessário evitar que ambos modifiquem a mesma área simultaneamente.

---

# 8. Tarefa atual

Antes de começar qualquer trabalho, o agente deve identificar:

- patch atual;
- tarefa atual;
- objetivo;
- arquivos prováveis;
- dependências;
- fora de escopo.

Se a tarefa não estiver clara:

- não inventar uma feature;
- pedir ou inferir apenas o mínimo necessário a partir do `PATCH_ATUAL.md`.

---

# 9. Atualização de status

Quando uma tarefa começar:

- marcar como `EM ANDAMENTO` quando aplicável.

Quando terminar:

- marcar como `CONCLUÍDA` somente se:
  - código estiver implementado;
  - testes relevantes passarem;
  - comportamento estiver coerente.

Não marcar tarefa como concluída apenas porque o código foi escrito.

---

# 10. Definition of Done

Uma tarefa só está concluída quando:

- objetivo funciona;
- não existe erro conhecido bloqueante;
- testes existentes continuam passando;
- testes novos foram adicionados quando necessário;
- documentação afetada foi atualizada;
- não houve expansão indevida de escopo.

Um patch só está concluído quando os critérios de `PATCH_ATUAL.md` forem atendidos.

---

# 11. Testes

Toda alteração estrutural importante deve ter cobertura de teste quando possível.

Priorizar testes para:

- economia;
- população;
- recrutamento;
- movimento;
- combate;
- cerco;
- conquista;
- estado da campanha;
- IA futura.

Nunca "consertar" um teste alterando a expectativa apenas para fazê-lo passar sem
verificar o comportamento real.

## Teste guarda REGRA, não número de balanço

⚠️ Um teste que crava `expect(populacao).toBe(35_280)` quebra a cada ajuste de taxa, sem
que nada esteja errado. Ele deve derivar o valor esperado da regra ou do dado:

```ts
// ruim — quebra quando a taxa mudar
expect(c.crescimentoDe('atenas')?.crescimento).toBe(70);

// bom — guarda a regra, ignora o número
const esperado = Math.floor(c.populacaoDe('atenas') * ajustes.populacao.taxaNatural);
expect(c.crescimentoDe('atenas')?.crescimento).toBe(esperado);
```

Vale em dobro para os testes de TELA, que custam ~96 segundos por rodada contra 2
segundos dos de unidade: número cravado ali transforma um ajuste de balanço numa hora de
tentativa e erro.

Cravar número continua certo quando o número **é** a regra — o piso de 2.000 habitantes,
o custo de uma construção no catálogo, a fração da milícia.

## Descobrir todas as falhas de uma vez

⚠️ Rodar a suíte, corrigir uma falha, rodar de novo é o pior laço possível quando a suíte
custa minutos. Rodar UMA vez, ler a lista inteira e corrigir tudo junto.

---

# 12. Código e documentação divergentes

Primeiro identificar se a divergência é de **estado atual** ou de **decisão futura**.

## Estado atual

Para saber o que o jogo realmente faz agora:

1. código;
2. testes;
3. `CLAUDE.md`.

Se o código estiver claramente no meio de uma refatoração incompleta, não tratá-lo
automaticamente como design final.

## Decisão de design

Para saber o que o projeto pretende fazer:

1. `DECISOES.md`;
2. `PATCH_ATUAL.md`, quando a decisão estiver sendo implementada agora;
3. `ROADMAP.md`, para direção macro.

Exemplo válido:

`CLAUDE.md`:

> Quartel atualmente é requisito para recrutamento.

`DECISOES.md`:

> Quartel deixará de ser requisito e passará a melhorar qualidade.

Não é contradição:

- o primeiro descreve o presente;
- o segundo descreve a decisão a implementar.

Se encontrar divergência real:

- registrar;
- não esconder;
- reportar antes de alterar silenciosamente.

---

# 13. Refatorações

Refatoração é permitida quando:

- necessária para implementar o patch;
- reduz risco real;
- resolve acoplamento que bloqueia tarefa.

Não fazer grandes refatorações apenas porque:

- "fica mais elegante";
- "é padrão melhor";
- "eu faria diferente".

Mudanças estruturais amplas exigem justificativa.

---

# 14. Simplicidade

O Age of Grecce busca profundidade com sistemas relativamente simples.

Evitar:

- microgerenciamento excessivo;
- fórmulas opacas;
- muitas barras;
- dezenas de exceções;
- sistemas que exigem outros três sistemas só para funcionar.

Sempre perguntar:

> Qual é a solução mais simples que mantém a direção futura aberta?

---

# 15. Não aprofundar antes da hora

Durante `0.0.x`, prioridade é fechar esqueleto.

Exemplo:

Se combate funciona, mas ainda não tem:

- generais;
- moral avançada;
- terreno;
- tipos de tropa;

isso não significa que o patch precisa implementar tudo.

Se essas features não são necessárias para o contrato atual:

- backlog.

---

# 16. Backlog

`BACKLOG.md` é leitura informativa.

Ele NÃO é uma lista de tarefas autorizadas.

Nenhum agente pode:

- escolher item do backlog por conta própria;
- implementar porque "já estava listado";
- misturar backlog com patch atual.

Um item só vira trabalho quando entra explicitamente no `PATCH_ATUAL.md`.

---

# 17. Decisões

`DECISOES.md` contém escolhas deliberadas.

Antes de alterar algo importante:

- procurar decisão relacionada;
- respeitar a decisão;
- se ela bloquear a solução, explicar o motivo;
- não contornar silenciosamente.

---

# 18. Mudança de decisão

Se uma decisão precisar mudar:

1. explicar por que a decisão atual não funciona;
2. propor alternativa;
3. avaliar impacto;
4. obter aprovação;
5. atualizar `DECISOES.md`;
6. alterar código.

---

# 19. Bugs encontrados fora do escopo

Se o agente encontrar um bug não relacionado:

### Bloqueia o patch atual?

Sim:

- corrigir ou reportar imediatamente.

Não:

- registrar para backlog / buglist;
- não interromper a tarefa principal.

---

# 20. UI

Ajustes de UI isolados são bons candidatos para Codex.

Exemplos:

- alinhamento;
- tooltip;
- painel;
- CSS;
- informação faltando;
- textos;
- bugs visuais.

Evitar misturar UI e grande refatoração de lógica numa mesma tarefa quando não for
necessário.

---

# 21. Revisão independente

Antes de fechar um patch, Codex pode ser usado como auditor independente.

Prompt recomendado:

> Revise as alterações do patch atual sem implementar novas features. Procure regressões,
> bugs, acoplamento ruim, divergências com `PATCH_ATUAL.md`, testes faltando e
> documentação desatualizada.

Depois da revisão:

- corrigir somente problemas relevantes;
- não transformar revisão em novo ciclo de features.

---

# 22. Aprovação humana

Nenhum agente decide que uma versão está oficialmente fechada.

Fluxo:

1. agente conclui trabalho técnico;
2. testes passam;
3. revisão acontece;
4. Henrique testa manualmente;
5. Henrique aprova;
6. changelog/versionamento é fechado.

Sem aprovação humana:

- patch continua em desenvolvimento.

---

# 23. Próximo patch

Agentes não escolhem automaticamente o próximo patch.

Mesmo se o patch atual estiver pronto:

- parar;
- apresentar resultado;
- aguardar nova definição.

---

# 24. Versionamento

Commit não é patch.

Durante um patch podem existir vários commits.

Exemplo:

```text
0.0.2
├── commit: hostes por ID
├── commit: corrige cerco
├── commit: estoque
├── commit: alimentação
└── commit: mercado interno
```

A versão só muda quando o patch for formalmente fechado.

---

# 25. Changelog

Ao fechar patch:

- atualizar `CHANGELOG.md`;
- registrar:
  - adicionado;
  - alterado;
  - corrigido;
  - removido quando necessário.

Não atualizar número de versão futura sem aprovação.

---

# 26. Estado atual do projeto

Enquanto o `0.0.2` estiver aberto:

Foco:

- mundo;
- economia;
- guerra terrestre.

Não iniciar:

- IA;
- diplomacia completa;
- naval;
- tipos de tropa;
- generais;
- family tree;
- comércio internacional completo.

---

# 27. Fluxo recomendado da Claude

```text
Ler PATCH_ATUAL.md
      ↓
Identificar próxima tarefa
      ↓
Ver DECISOES.md
      ↓
Implementar
      ↓
Testar
      ↓
Atualizar status
      ↓
Próxima tarefa do mesmo patch
      ↓
Critérios concluídos?
   ├── não → continuar
   └── sim
          ↓
      parar
          ↓
  apresentar para revisão
```

---

# 28. Fluxo recomendado do Codex

```text
Receber tarefa específica
      ↓
Confirmar escopo
      ↓
Evitar área ativa da Claude
      ↓
Investigar
      ↓
Alterar somente o necessário
      ↓
Testar
      ↓
Apresentar resultado
```

---

# 29. Regra final

Claude executa o plano.

Codex resolve problemas específicos e revisa.

Henrique decide o jogo.

O roadmap e o patch definem o trabalho.

Nenhum agente deve substituir direção de produto por iniciativa própria.
