# AGENTS.md

# Age of Grecce — Regras para agentes de desenvolvimento

Este arquivo define como Claude, Codex e outros agentes devem trabalhar no projeto.

---

# 1. Fontes de verdade

Não existe uma hierarquia única para tudo. A autoridade depende da pergunta.

## O que o jogo faz hoje?

1. código atual;
2. testes atuais;
3. `CLAUDE.md`.

`CLAUDE.md` é memória técnica e fotografia do estado implementado.

## O que foi decidido de design/arquitetura?

`DECISOES.md`.

## O que está autorizado para implementação agora?

`PATCH_ATUAL.md`.

## Para onde o projeto está indo?

`ROADMAP.md`.

## Onde ficam ideias futuras?

`BACKLOG.md`.

## Como os agentes trabalham?

`AGENTS.md`.

Uma decisão futura em `DECISOES.md` não contradiz necessariamente um comportamento atual descrito no `CLAUDE.md`.

---

# 2. Regra principal de escopo

Antes de qualquer implementação, perguntar:

> Isto é necessário para concluir o objetivo do patch atual?

Se sim, pode ser tarefa.

Se não:

- não implementar;
- registrar no backlog quando necessário.

Não adicionar feature apenas porque parece relacionada.

---

# 3. Tamanho dos patches

Cada patch deve possuir um objetivo principal pequeno e testável.

Não juntar vários sistemas grandes no mesmo patch.

Exemplos que devem ser tratados separadamente quando possível:

- economia física;
- alimentação;
- mercado interno;
- tributação;
- felicidade;
- nacionalidade;
- capital;
- construções;
- cerco econômico;
- apresentação de batalha;
- IA.

Se um patch começar a exigir vários desses sistemas ao mesmo tempo, parar e reavaliar o escopo antes de continuar.

---

# 4. Papel da Claude

Claude é o agente principal de implementação.

Responsabilidades:

- executar `PATCH_ATUAL.md`;
- implementar a linha principal do patch;
- criar/ajustar testes;
- manter coerência entre módulos;
- atualizar documentação afetada;
- apontar contradições ou bloqueios;
- parar ao concluir o patch.

Claude NÃO deve:

- iniciar o próximo patch automaticamente;
- implementar backlog sem autorização;
- ampliar o patch silenciosamente;
- transformar preparação para um sistema futuro em autorização para implementá-lo;
- alterar decisões oficiais silenciosamente.

---

# 5. Papel do Codex

Codex é agente secundário/manual.

Usos preferenciais:

- bugs isolados;
- UI;
- revisão de diff;
- auditoria;
- testes;
- refatoração pequena e localizada;
- checagem de regressões;
- segunda opinião técnica.

Codex também deve respeitar `PATCH_ATUAL.md` e `DECISOES.md`.

---

# 6. Trabalho paralelo

Claude e Codex NÃO devem editar simultaneamente os mesmos arquivos ou módulos no mesmo diretório de trabalho.

Para trabalho paralelo real:

- usar branches/worktrees separados;
- dividir claramente os módulos;
- revisar/mesclar depois.

Se ambos precisarem tocar a mesma área, fazer em sequência.

Não atribuir automaticamente a um agente um bug que surgiu enquanto outra sessão estava alterando a mesma área.

---

# 7. Antes de começar uma tarefa

O agente deve identificar:

- patch atual;
- objetivo do patch;
- tarefa atual;
- arquivos prováveis;
- testes relevantes;
- fora de escopo.

Se descobrir que a tarefa exige um novo sistema não autorizado, deve parar essa expansão e reportar.

---

# 8. Testes

Código escrito não significa tarefa concluída.

Uma alteração deve, conforme aplicável, manter:

- testes unitários;
- testes de tela;
- tipos;
- lint.

Adicionar testes novos quando a nova regra precisar ser protegida.

Nunca alterar expectativa de teste apenas para fazê-lo passar sem confirmar a regra correta.

Valores ajustáveis de balanceamento devem ser derivados dos dados ou da fórmula testada.
Não cravar em testes um número que muda legitimamente quando `dados/*.json` é balanceado.

Testes de tela são reservados para UI, DOM, CSS e interação. Quando a suíte de tela falhar,
ler a lista completa de falhas antes de iniciar um ciclo de correções e novas execuções.

---

# 9. Definition of Done de tarefa

Uma tarefa termina quando:

- comportamento funciona;
- testes relevantes passam;
- não existe regressão bloqueante conhecida;
- documentação afetada está coerente;
- não houve expansão indevida de escopo.

---

# 10. Fechamento de patch

Um patch termina apenas quando:

1. tarefas de `PATCH_ATUAL.md` concluídas;
2. testes automatizados relevantes verdes;
3. teste manual feito;
4. Henrique aprova;
5. `CHANGELOG.md` é atualizado;
6. versão é fechada.

Depois disso, o agente deve **parar**.

O próximo patch só começa após autorização explícita.

---

# 11. Commit não é patch

Um patch pode conter vários commits.

Usar commits pequenos/coerentes quando útil, mas não tratar cada commit como versão de jogo.

A versão é fechada somente pelo processo de fechamento do patch.

---

# 12. Código versus documentação

Para comportamento atual, código/testes vencem documentação desatualizada.

Para intenção de design, `DECISOES.md` vence descrições antigas de intenção.

Para trabalho atual, `PATCH_ATUAL.md` determina o que pode ser implementado.

Se houver conflito real:

- não escolher silenciosamente;
- reportar;
- corrigir a fonte apropriada.

Números de decisões funcionam como identificadores estáveis. Não renumerar uma decisão já
referenciada sem atualizar, na mesma tarefa, todas as referências em código, testes e
documentação.

---

# 13. Refatorações

Refatorar quando:

- necessário para o patch;
- reduz risco concreto;
- remove bloqueio real.

Não fazer grande refatoração somente por preferência estética ou arquitetural.

---

# 14. Filosofia técnica

Buscar a solução mais simples que:

- resolve a regra atual;
- é testável;
- não fecha desnecessariamente caminhos futuros.

Evitar microgerenciamento, fórmulas opacas e sistemas auxiliares que não tragam gameplay real.
---

# 15. Regra de versionamento até 0.1.0

Pode haver quantos patches `0.0.x` forem necessários.

Cada `0.0.x` deve ter um objetivo pequeno, claro e testável.

Não acelerar ou juntar sistemas apenas para chegar mais rápido ao `0.1.0`.

`0.1.0` é lançado somente quando a primeira campanha básica completa funcionar do começo ao fim, incluindo IA mínima, save/load e vitória/derrota.

O agente não deve transformar o `0.1.0` em um único mega-patch; ele é o marco alcançado pela soma dos patches `0.0.x` anteriores.
