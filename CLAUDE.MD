@AGENTS.md

# Claude Code — coordenação do Age of Grecce

O Claude principal é o coordenador e implementador da sessão.

## Autoridade e fontes

Respeite esta ordem:

1. código e testes definem o comportamento implementado atualmente;
2. `ESTADO_DO_JOGO.md` registra o estado implementado do jogo;
3. `GDD.md` registra visão, direção e decisões de design;
4. Henrique decide mudanças de direção ou decisões de game design ainda não resolvidas.

Não invente uma decisão de game design quando ela não estiver definida.

Antes de perguntar algo a Henrique, procure a resposta no código, testes, `ESTADO_DO_JOGO.md`, `GDD.md` e demais instruções existentes no projeto.

## Autonomia

Quando Henrique relatar:

* bug;
* comportamento estranho;
* comportamento diferente do esperado;
* regressão;
* problema de interface;
* problema de desempenho;
* desequilíbrio;
* sistema forte ou fraco demais;

trate o relato como autorização para investigar.

Não pare apenas em sugestões quando o problema puder ser investigado e corrigido tecnicamente.

O fluxo normal é:

1. localizar o sistema relevante;
2. entender o comportamento atual;
3. reproduzir, medir ou confirmar o problema quando possível;
4. consultar as decisões existentes;
5. identificar a causa raiz;
6. usar um subagent especializado quando isso melhorar a investigação;
7. implementar a menor correção suficiente;
8. criar ou ajustar testes quando houver comportamento verificável;
9. executar verificações proporcionais à alteração;
10. corrigir regressões causadas pela mudança;
11. executar o portão final exigido pelo projeto;
12. atualizar documentação quando as regras do projeto exigirem.

Não transforme automaticamente um relato simples em uma longa conversa de planejamento.

Exemplo:

`a cavalaria parece forte demais`

Normalmente exige investigação e medição antes de qualquer pergunta.

Já:

`quero mudar completamente como a cavalaria funciona`

pode exigir uma nova decisão de game design de Henrique.

## Quando perguntar

Pergunte a Henrique somente quando:

* existir uma decisão de game design ainda não respondida;
* houver duas ou mais direções materialmente diferentes;
* a escolha não puder ser determinada pelo código, testes ou documentação existente.

Não pergunte por detalhes técnicos que possam ser investigados diretamente no projeto.

Não repita perguntas cuja resposta já esteja registrada.

## Subagents

O projeto pode possuir subagents especializados.

Eles servem principalmente para investigação independente, medições, simulações, testes e revisão.

O Claude principal continua responsável por:

* coordenar a tarefa;
* decidir a implementação técnica final;
* editar o código;
* integrar alterações;
* controlar Git;
* executar a entrega final.

Não delegue trabalho apenas para usar um subagent.

Use um especialista quando ele economizar contexto, fornecer uma segunda análise ou possuir um procedimento adequado ao problema.

## Git

Somente o agente principal da sessão controla o Git.

Subagents nunca devem:

* executar `git pull`;
* executar `git commit`;
* executar `git push`;
* trocar branches;
* executar checkout, reset, rebase ou merge;
* resolver conflitos;
* editar código, dados ou outros arquivos versionados do projeto.

Subagents podem:

* ler arquivos;
* consultar Git com comandos de leitura;
* executar testes;
* executar medições;
* executar simulações;
* gerar artefatos temporários necessários para testes;
* devolver conclusões ao Claude principal.

Quando um subagent possuir acesso a Bash, Bash deve ser usado somente para investigação, testes, medições, simulações e comandos de leitura.

Subagents não devem usar Bash para reescrever código ou arquivos versionados, incluindo redirecionamentos para arquivos, `sed -i` ou mecanismos equivalentes.

## Implementação

Prefira corrigir a causa raiz em vez de mascarar sintomas.

Faça a menor alteração que resolva corretamente o problema.

Não implemente sistemas futuros apenas porque estão relacionados à área modificada.

Não altere balanceamento por palpite quando houver ferramentas de medição disponíveis.

Não altere ou enfraqueça um teste válido apenas para obter resultado verde.

Preserve alterações locais que não pertencem à tarefa.

## Documentação

Não duplique documentação sem necessidade.

Use os documentos já existentes conforme suas responsabilidades.

Atualize `ESTADO_DO_JOGO.md` quando o comportamento realmente implementado mudar.

Atualize `GDD.md` somente quando houver mudança de visão ou decisão de design correspondente.

Siga todas as demais regras importadas de `AGENTS.md`.
