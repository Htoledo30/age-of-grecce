# AUTONOMO.md

## Objetivo

Este arquivo define como o Claude deve trabalhar de forma autônoma no desenvolvimento de Age of Grecce.

Autonomia significa implementar, testar, revisar, pesquisar, simular e corrigir trabalho já autorizado.

Autonomia NÃO significa liberdade para redefinir o jogo, escolher arbitrariamente qual grande sistema implementar a seguir ou transformar ideias futuras em tarefas atuais.

---

# 1. Fontes de verdade

Respeite as seguintes funções:

## Código e testes

São a prova final do comportamento que existe atualmente.

Se documentação e código discordarem sobre o que já funciona, o código e os testes vencem.

---

## AGENTS.md

Define:

* o trabalho autorizado agora;
* o objetivo atual;
* o que está dentro do escopo;
* o que está fora do escopo;
* regras operacionais importantes.

`AGENTS.md` é o principal arquivo de trabalho.

Nunca avance autonomamente para algo que esteja explicitamente fora do trabalho atual.

---

## ESTADO_DO_JOGO.md

Resume o que o jogo realmente faz hoje.

Use-o para reconstruir rapidamente o estado atual do projeto.

Se encontrar uma diferença comprovada entre este documento e o código, corrija `ESTADO_DO_JOGO.md`.

---

## GDD.md

Define a visão atual de Age of Grecce.

Consulte somente as seções relevantes à tarefa quando precisar entender:

* direção de design;
* comportamento desejado;
* sistemas futuros relacionados;
* princípios gerais do jogo.

O GDD descreve visão, não ordem automática de implementação.

Uma ideia presente no GDD não está automaticamente autorizada para ser implementada.

---

## STATUS.md

É memória operacional de curto prazo do trabalho autônomo.

Pode registrar:

* o que estava sendo feito;
* o que foi concluído;
* o que falta;
* problemas encontrados;
* dúvidas;
* próximo passo dentro do trabalho atual.

Não é fonte de direção de design.

---

## Henrique

Decisões novas ou mudanças de direção pertencem ao diretor do projeto.

Quando uma escolha relevante não puder ser determinada pelas fontes existentes, pare e peça decisão.

---

# 2. Hierarquia prática

Ao trabalhar, siga esta lógica:

1. instrução explícita atual de Henrique;
2. `AGENTS.md` para saber o trabalho autorizado;
3. código e testes para saber o comportamento real;
4. `ESTADO_DO_JOGO.md` para o resumo do estado atual;
5. `GDD.md` para visão e design;
6. `AUTONOMO.md` para o processo de trabalho;
7. `STATUS.md` para continuidade operacional.

Não trate uma ideia futura do GDD como autorização para implementá-la.

---

# 3. Início obrigatório de cada sessão autônoma

Antes de alterar código:

1. Leia `AGENTS.md` completamente.
2. Leia `STATUS.md`.
3. Consulte `ESTADO_DO_JOGO.md` se precisar reconstruir o que já existe.
4. Consulte somente as seções relevantes de `GDD.md` quando a tarefa envolver design ou direção futura.
5. Inspecione o código e os testes diretamente relacionados ao trabalho atual.

Depois determine:

* qual é o objetivo atual;
* o que ainda falta;
* o que já está implementado;
* quais limites de escopo existem;
* como verificar objetivamente o resultado.

Só depois comece a alterar o projeto.

---

# 4. Regra central de autonomia

Trabalhe autonomamente DENTRO do objetivo atual definido em `AGENTS.md`.

Você pode executar várias etapas necessárias para concluir esse objetivo.

Você NÃO pode, por conta própria, terminar um objetivo e iniciar um grande sistema futuro apenas porque ele aparece no GDD.

Quando o trabalho atual terminar segundo os critérios de `AGENTS.md`, pare.

---

# 5. Ciclo autônomo de trabalho

Para cada unidade de trabalho:

## A — Entender

Determine:

* qual problema está sendo resolvido;
* por que ele existe;
* qual comportamento esperado;
* quais sistemas são afetados;
* quais arquivos provavelmente serão alterados;
* como provar que a solução funciona.

Procure efeitos colaterais antes de programar.

---

## B — Investigar

Leia primeiro:

* implementação atual;
* testes existentes;
* dados relevantes;
* interfaces utilizadas pela funcionalidade.

Não reimplemente algo antes de entender o sistema existente.

---

## C — Planejar

Escolha a menor alteração capaz de resolver corretamente o problema.

Evite aumentar o escopo.

Antes de implementar, considere:

* fluxo normal;
* valores extremos;
* estados inválidos;
* regressões possíveis;
* testes necessários;
* interação com sistemas existentes.

---

## D — Implementar

Priorize:

* código simples;
* comportamento previsível;
* nomes claros;
* arquitetura existente;
* baixo acoplamento;
* reutilização do que já existe;
* mudanças localizadas.

Evite:

* abstrações prematuras;
* dependências desnecessárias;
* duplicação;
* refatorações gigantes sem necessidade;
* criar sistemas futuros para facilitar uma tarefa atual.

---

## E — Testar

Depois da implementação:

1. rode os testes diretamente relacionados;
2. crie testes quando comportamento importante ainda não estiver protegido;
3. rode verificações mais amplas quando apropriado;
4. corrija regressões introduzidas.

Use os comandos definidos pelo projeto.

Quando apropriado, utilize:

* `npm run verificar`;
* `npm run teste-tela`;
* `npm run build`;
* outras verificações específicas existentes.

Nunca considere algo correto apenas porque compilou.

---

# 6. Autocrítica obrigatória

Após implementar e testar, faça uma nova revisão como se estivesse avaliando código produzido por outra pessoa.

Pergunte:

* isso realmente resolve o problema?
* a implementação está mais complicada do que precisa?
* quebrei alguma coisa existente?
* existe estado que não testei?
* existe exploit?
* algum número gera comportamento absurdo?
* o usuário consegue entender causa e efeito?
* isso ainda combina com Age of Grecce?
* fiz algo que estava fora do trabalho autorizado?
* adicionei algo apenas porque parecia interessante?

Não aceite automaticamente a primeira solução.

Corrija problemas concretos encontrados.

---

# 7. Sistemas numéricos

Sempre que trabalhar com sistemas como:

* alimentação;
* população;
* crescimento;
* construções;
* dinheiro;
* produção;
* recrutamento;
* exército;
* combate;
* cerco;
* comércio;
* felicidade;
* corrupção;
* IA;
* qualquer fórmula;

não valide apenas um exemplo.

Teste situações representativas e extremas.

Quando aplicável, inclua:

* valores mínimos;
* valores altos;
* ausência do recurso;
* abundância;
* uma única província;
* várias províncias;
* exército pequeno;
* exército grande;
* vários turnos consecutivos;
* perda repentina de uma fonte importante.

Quando existir infraestrutura adequada, faça simulações automáticas.

Procure:

* crescimento infinito;
* colapso inevitável;
* valores irrelevantes;
* custos insignificantes;
* bônus excessivos;
* efeitos exponenciais;
* estratégia dominante;
* comportamento matematicamente incorreto.

---

# 8. Balanceamento não é correção matemática

Diferencie:

## Fórmula errada

Exemplo:

* sinal invertido;
* arredondamento incorreto;
* dupla contagem;
* valor não aplicado;
* população descontada duas vezes.

Isso deve ser corrigido.

## Número de balanceamento discutível

Exemplo:

* Fazenda deveria custar 150 ou 180;
* Farto deveria começar em +3 ou +4;
* bônus deveria ser 10% ou 12%.

Não altere automaticamente apenas porque outro número parece melhor.

Valores ajustáveis devem permanecer nos dados apropriados.

Testes devem proteger relações e fórmulas, não congelar números que podem mudar legitimamente.

---

# 9. Pesquisa externa

Quando existir dúvida real, pesquisa externa é permitida e recomendada.

Pesquise quando precisar entender:

* documentação técnica atual;
* APIs;
* bibliotecas;
* matemática;
* algoritmos;
* game design;
* UX;
* sistemas históricos;
* funcionamento de jogos comparáveis.

Referências possíveis incluem:

* Total War;
* Age of History;
* Crusader Kings;
* Europa Universalis;
* Civilization;
* Mount & Blade;
* outros jogos relevantes.

Use referências como material de análise.

Nunca implemente automaticamente uma mecânica apenas porque outro jogo utiliza aquilo.

Age of Grecce continua sendo a autoridade sobre Age of Grecce.

---

# 10. Quando pesquisar antes de decidir

Pesquise quando:

* não tiver confiança na fórmula;
* não entender comportamento de uma biblioteca;
* houver risco de usar informação técnica desatualizada;
* uma solução de design tiver precedentes úteis em outros jogos;
* precisar comparar abordagens.

Depois da pesquisa, ainda confronte o resultado com `GDD.md` e `AGENTS.md`.

---

# 11. Bugs encontrados durante outra tarefa

## Bug pequeno e diretamente relacionado

Pode corrigir.

## Bug pequeno e não relacionado

Registre em `STATUS.md`.

Não desvie automaticamente do objetivo atual.

## Bug grande ou estrutural

Registre em `STATUS.md`.

Se bloquear o trabalho atual, investigue.

Se não bloquear, não transforme a sessão em uma reestruturação completa.

---

# 12. Controle de escopo

Antes de qualquer expansão de trabalho pergunte:

* isso é necessário para completar o objetivo atual de `AGENTS.md`?
* existe um problema real sendo resolvido?
* a implementação existente realmente impede a solução?

Se não, não faça.

Evite:

"Já que estou aqui, também vou implementar..."

---

# 13. GDD não é backlog

Não percorra `GDD.md` implementando itens sequencialmente.

Itens de:

* sistemas futuros;
* questões abertas;
* possíveis aprofundamentos;
* ideias futuras;

não são tarefas automaticamente autorizadas.

Só implemente um sistema novo quando o trabalho atual definido por Henrique e `AGENTS.md` permitir.

---

# 14. STATUS.md

Atualize `STATUS.md` durante o trabalho autônomo quando isso ajudar uma sessão futura a continuar.

Ele deve responder rapidamente:

* qual é o trabalho atual?
* o que já foi feito?
* o que ainda falta?
* quais testes passaram?
* existe algum problema conhecido?
* existe decisão pendente?
* qual é o próximo passo dentro do objetivo atual?

Mantenha-o curto.

O Git guarda histórico.

---

# 15. Atualização da documentação

Ao concluir trabalho relevante:

* atualize `AGENTS.md` quando o estado do trabalho atual mudar;
* atualize `ESTADO_DO_JOGO.md` quando o comportamento real do jogo mudar;
* altere `GDD.md` somente quando a visão do jogo mudar;
* atualize `STATUS.md` para permitir continuidade autônoma.

Não crie:

* roadmap;
* backlog;
* changelog;
* diário de decisões;

a menos que Henrique determine explicitamente uma mudança de organização.

---

# 16. Critério de conclusão

Uma unidade de implementação está concluída quando:

* o comportamento esperado existe;
* testes relevantes passam;
* não existe regressão bloqueante conhecida;
* a implementação foi revisada criticamente;
* documentação necessária foi atualizada.

O trabalho atual completo termina de acordo com os critérios definidos em `AGENTS.md`.

---

# 17. Trabalho que depende de teste humano

Se `AGENTS.md` definir que Henrique precisa testar manualmente algo, você não pode declarar o trabalho completo no lugar dele.

Nesse caso:

1. conclua tudo que puder automaticamente;
2. execute verificações automatizadas;
3. deixe o jogo em estado testável;
4. registre em `STATUS.md` exatamente o que Henrique precisa observar;
5. pare quando a próxima etapa depender desse teste humano.

---

# 18. Quando continuar

Continue autonomamente quando:

* ainda existir trabalho claramente pertencente ao objetivo atual;
* não houver decisão importante pendente;
* as próximas etapas puderem ser verificadas com segurança;
* `AGENTS.md` autorizar implicitamente aquele trabalho como parte do objetivo.

Você não precisa pedir autorização para cada pequena implementação.

---

# 19. Quando parar

Pare quando:

* o objetivo atual chegar ao ponto definido como conclusão em `AGENTS.md`;
* a próxima etapa exigir teste ou aprovação de Henrique;
* surgir decisão importante de design não resolvida;
* existirem alternativas estruturalmente diferentes sem direção suficiente;
* a mudança necessária estiver fora do trabalho atual;
* houver risco significativo de perda de dados;
* não for possível determinar com segurança o comportamento desejado.

Antes de parar:

1. deixe o projeto em estado consistente;
2. atualize `STATUS.md`;
3. diga claramente o que foi concluído;
4. diga o que está impedindo continuar;
5. informe exatamente o que Henrique precisa decidir ou testar.

---

# 20. Filosofia

O objetivo não é produzir o máximo possível de código.

O objetivo é melhorar Age of Grecce mantendo:

* consistência;
* clareza;
* profundidade;
* verificabilidade;
* simplicidade;
* capacidade de evolução.

Prefira consequências interessantes entre sistemas a excesso de botões e números.

Não confunda quantidade de funcionalidades com qualidade.

Não implemente futuro por ansiedade de progresso.

Complete e valide bem o trabalho atual antes de abrir a próxima frente.
