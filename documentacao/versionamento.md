# Versionamento do Age of Grecce

## Regra simples

O jogo está em **pré-alpha**. A versão atual fica em `package.json` e o histórico legível
fica em `CHANGELOG.md`.

Enquanto o esqueleto estiver sendo construído, usamos:

- `0.0.x` para cada novo patch jogável e testável (`0.0.1`, `0.0.2`, `0.0.3`...);
- `0.x.0` quando houver um salto grande de fase, como completar o esqueleto ou iniciar uma
  pré-alpha pública;
- `1.0.0` somente quando o jogo puder ser considerado uma versão completa.

Não precisamos decidir agora quais sistemas pertencem a cada número. A versão descreve o
que realmente ficou pronto; ela não serve como promessa de conteúdo futuro.

## Durante o desenvolvimento

Toda mudança relevante já concluída entra primeiro em `CHANGELOG.md`, dentro de
**Não lançado**. Use categorias curtas:

- **Adicionado** — sistema ou conteúdo novo;
- **Alterado** — comportamento ou apresentação que mudou;
- **Corrigido** — defeito eliminado;
- **Removido** — algo que deixou de existir.

Mudança ainda incompleta ou apenas imaginada fica nos documentos de design, não no
changelog.

## Quando o dono pedir “atualize o patch”

1. conferir o código, os dados e os testes desde a última versão;
2. revisar a seção **Não lançado**, sem anunciar coisa que não está pronta;
3. criar a próxima versão de patch, por exemplo `0.0.2`, com a data;
4. mover para ela todas as entradas concluídas de **Não lançado**;
5. atualizar a versão em `package.json` e `package-lock.json`;
6. deixar uma seção **Não lançado** vazia para o próximo ciclo;
7. executar a verificação proporcional às mudanças.

Uma versão já publicada não é reescrita para receber novidades. Correções de texto são
permitidas, mas mudanças do jogo pertencem ao próximo patch.

## Git

Um commit não é um patch: podem existir muitos commits dentro de `0.0.2`. Quando o projeto
passar a distribuir builds, cada versão poderá receber uma tag Git (`v0.0.2`) e um arquivo
executável correspondente. Isso é útil depois, mas não é necessário para o fluxo atual.
