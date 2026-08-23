# DECISOES.md

# Age of Grecce — Decisões oficiais

Este arquivo registra decisões intencionais de design e arquitetura.

Ele não descreve necessariamente o que já está implementado hoje. Para estado atual, consultar código, testes e `CLAUDE.md`.

Uma decisão só deixa de valer quando for explicitamente alterada.

---

## 1. O jogo busca profundidade com regras compreensíveis

O objetivo é combinar sistemas que gerem consequências interessantes sem transformar o jogo em microgerenciamento excessivo.

## 2. Realismo deve servir ao gameplay

Usar plausibilidade histórica/geográfica sem exigir falsa precisão quando os dados não forem confiáveis.

## 3. Desenvolvimento será incremental

Trabalhar em patches pequenos, testar cada um e só então avançar.

## 4. Aprovação humana fecha o patch

Um patch não termina automaticamente quando o agente conclui código. Precisa de teste e aprovação de Henrique.

## 5. Atlas representa a base imutável do mundo

Geografia e dados-base pertencem ao Atlas.

## 6. Campanha representa estado mutável

Dono, população atual, hostes, construções, estoques e demais estados variáveis pertencem à campanha.

## 7. Commit não é patch

Um patch pode conter vários commits.

## 8. Um turno representa aproximadamente um ano

Fome, crescimento e outros efeitos anuais precisam ter impacto compatível com essa escala.

## 8A. Rodada e turno representam o mesmo ciclo

A interface usa preferencialmente **rodada**. O código ainda pode usar **turno** como nome
interno enquanto não houver motivo para uma refatoração mecânica. Nos documentos, ambos
representam a mesma passagem anual, salvo decisão futura explícita.

## 9. Dados do mundo priorizam plausibilidade relativa

É melhor ter relações coerentes entre províncias do que números históricos fingidamente exatos.

## 10. Não criar classificação provincial sem função

Não adicionar categorias como cidade/campo/ilha apenas por organização. Só criar se houver consequência de gameplay.

## 11. Região de teste oficial

A primeira validação completa usa:

- Atenas;
- Maratona;
- Sunião;
- Elêusis;
- Tanagra.

Não é necessário preencher as 205 províncias antes de validar cada sistema.

## 11A. Estoques iniciais da região de teste

Para validação, os estoques iniciais podem ser simples e aproximadamente suficientes para alguns turnos; a referência discutida foi cerca de **5 turnos**.

## 12. Hostes possuem identidade própria

Hostes não devem depender apenas da província em que estão. Usar identidade própria permite múltiplas forças e movimentação consistente.

## 13. Soldados preservam origem provincial

A origem dos soldados continua importante para consistência populacional e sistemas futuros.

## 14. Recrutamento leva uma rodada para formar a hoste

A leva não vira força disponível instantaneamente.

## 15. Movimento e resolução podem produzir múltiplos encontros

A base militar deve suportar ordens simultâneas, encontros em estrada e múltiplas batalhas no mesmo turno.

## 16. O mar será recortado em zonas

A direção naval futura usa zonas marítimas em vez de tratar todo o mar como uma única área abstrata.

Não implementar guerra naval antes da base terrestre estar estável.

## 17. Naval não vem antes da IA mínima

Portos podem existir antes por função econômica, mas frotas e guerra naval ficam para depois da fundação terrestre e da primeira IA mínima.

## 18. Não usar teleporte entre portos

Movimento e comércio marítimos futuros precisam respeitar conexão física/coerente.

## 19. Um poder pode sobreviver sem território se ainda possuir hostes

Perder todas as províncias não precisa eliminar imediatamente um poder que ainda tenha força ativa.

## 20. A matemática de combate atual é provisória

Ela serve para fechar o esqueleto e poderá ser substituída quando o combate for aprofundado.

## 21. Quantidade não será o único fator militar final

No futuro, tipo, qualidade, moral, líderes e outros fatores poderão influenciar resultado.

## 22. Aleatoriedade futura deve ser controlada

Evitar resultado totalmente previsível, mas preservar compreensão e testabilidade.

## 23. A batalha deve ser acompanhável visualmente

Direção desejada: apresentação numérica estilo Brasfoot, não campo tático estilo Total War.

## 24. O primeiro visor pode ser apenas playback

A interface pode mostrar progressivamente perdas de um resultado já calculado. Não é necessário criar resolução iterativa só para o primeiro visor.

## 25. Moral pertence ao aprofundamento futuro do combate

Moral poderá quebrar e causar fuga/retirada.

## 26. Retirada pertence ao aprofundamento futuro

Sobreviventes poderão recuar para território amigo e, futuramente, o jogador poderá ordenar retirada.

## 27. Tipos de tropas ficam para depois da base

Direção inicial discutida: infantaria, cavalaria, arqueiros e tropas/máquinas de cerco.

## 28. Generais não entram antes da IA mínima

Líderes e comandantes serão especificados em sistema próprio depois que a base e a IA mínima estiverem estabelecidas.

## 29. Family tree é direção futura

Referência desejada: Rome: Total War 1, sem especificação detalhada por enquanto.

## 30. Terreno de combate fica para depois

Só implementar quando houver dados confiáveis e quando trouxer decisão real.

## 31. Milícia é defesa automática provincial

Milícia parte da população e pode receber modificadores como Muralha e outros fatores futuros.

## 32. Cerco persiste ao longo dos turnos

Cerco é um estado real, não apenas uma batalha instantânea.

## 32A. A postura decide se há batalha, não só o destino da cidade

Sitiar não engaja o exército que estiver na província: o sitiante acampa ao lado da guarnição e os dois ocupam o mesmo território. Assaltar engaja — o choque de campo acontece antes da muralha.

Quem defende a própria terra luta sempre. A escolha do defensor é a surtida (#33), não uma postura de deixar passar.

O cerco acaba quando o sitiante sai, não quando o dono aparece. Província despovoada não cai enquanto houver exército do dono nela: sem milícia, é o exército que fecha o portão.

Razão: sem isso, sitiar significava "lute com o exército deles e depois sente", que é o assalto com um passo a mais — e o cerco existe justamente para quem não tem gente para vencer o exército de dentro. Depende de hostes com identidade própria, porque duas forças inimigas precisam poder ocupar a mesma província.

## 33. Surtida faz parte do cerco-base

O defensor sitiado pode atacar o exército sitiador usando o sistema básico de combate.

Vitória defensiva quebra o cerco. Em derrota o cerco continua.

Detalhamento fechado no `0.0.2`:

- **a milícia não sai junto.** Ela é defesa da cidade (#31); quem surte é a hoste do
  defensor. Sair da muralha para o campo é justamente abrir mão do que a muralha dá;
- **a hoste derrotada na surtida se desfaz**, como qualquer perdedor do choque atual (#20).
  Sobrevivente que recua para dentro dos muros depende de retirada, que pertence ao visor
  de batalha (#26 e patch `0.0.13`);
- **surtir é a ordem da rodada daquela hoste.** Quem surte não marcha no mesmo turno;
- a surtida é o único ato do defensor que obriga o sitiante a lutar. Sem ela, sitiante e
  guarnição continuam acampados lado a lado (#32A).

## 33A. Socorro que entra em província sitiada engaja o sitiante

Mandar tropa para uma cidade que está sendo sitiada é atacar quem a sitia. O choque
acontece na chegada, sem o jogador precisar declarar nada: o destino é terra própria, e
quem defende a própria terra luta sempre (#32A).

Razão: sem isso, um exército de socorro entraria na província e acamparia ao lado do
sitiante sem tocá-lo, e quebrar um cerco de fora seria impossível.

## 34. Muralha tem duas funções

Muralha:

1. fortalece a defesa/milícia;
2. impede assalto imediato.

Referência inicial: 2 turnos de cerco antes do assalto.

Detalhamento fechado no `0.0.2`:

- **o número de rodadas é balanceamento e mora em `dados/ajustes.json`**, nunca cravado no
  TypeScript nem em teste;
- **quem diz que uma obra exige cerco é o catálogo de construções**, por campo próprio, e
  não o id `muralha` escrito na regra. O `0.0.10` vai refazer o catálogo, e a regra não
  pode depender do nome do conteúdo;
- **a contagem começa em zero na rodada em que o exército senta** e libera o assalto depois
  de duas viradas de cerco;
- **a contagem zera** quando o sitiante sai, morre ou é substituído por outro poder;
- **o botão de assaltar só existe depois das duas rodadas.** A interface diz o motivo em
  vez de aceitar uma ordem que a resolução vai recusar.

Este contador NÃO é progresso de conquista: o cerco continua não andando em direção a nada
(#32A). Ele só marca há quanto tempo a cidade está apertada.

## 35. Sem Muralha, assalto imediato é possível

A regra serve para diferenciar províncias fortificadas de não fortificadas.

## 36. Conquista altera propriedade da província

O sistema de guerra deve manter dono, população, hostes e demais estados coerentes após conquista.

## 37. Conquista pode causar perda populacional controlada

Evitar extermínio arbitrário ou regras excessivamente complexas.

## 38. Construções normalmente sobrevivem à conquista

Assalto/saque podem futuramente causar dano ou destruição parcial.

## 39. Produtos são recursos físicos

Produtos não devem ser apenas abstrações de renda.

Exemplos: grão, peixe, madeira, ferro etc. em quantidades.

## 39A. Recursos possuem funções diferentes

Recursos podem cumprir papéis como alimento, matéria-prima, luxo/comércio e outros que tenham função real. Não criar categorias sem consequência de gameplay.

## 40. Cada província pode ter recurso principal e secundário

Direção:

- 1 recurso principal forte;
- 1 secundário mais fraco.

A validação começa na região de teste; o restante do mapa será preenchido depois.

## 41. Potencial natural é fixo

Se uma região possui determinado potencial natural, investimento não transforma a natureza. População/construções melhoram exploração, não potencial.

## 42. Produção depende de potencial, população e modificadores

Direção conceitual:

`produção = potencial natural × população produtiva × modificadores`

## 43. Não haverá microalocação de trabalhadores

Uma parcela implícita da população é produtiva.

## 44. Perda de população reduz produção

A economia deve responder à demografia. População também participa de recrutamento, milícia, consumo, crescimento e arrecadação.

## 45. Toda província deve conseguir produzir algum alimento coerente

Não precisa ser grão. Ilhas e costas podem depender de peixe, por exemplo.

## 46. Alimentos permanecem recursos individuais

Grão, peixe, carne etc. continuam separados internamente.

A UI pode mostrar categoria agregada de alimento com detalhamento por tooltip.

## 47. Toda população consome alimento

Consumo ocorre por turno.

## 48. Alimento modifica crescimento populacional

Direção:

- suficiente → crescimento normal;
- excedente → pequeno bônus;
- escassez → crescimento reduzido;
- déficit → perda;
- déficit severo → perda forte.

Como um turno representa aproximadamente um ano, fome precisa ter impacto perceptível.

## 48A. Não usar capacidade populacional artificial

Remover a regra do tipo `população inicial × 2`. Crescimento deve ser limitado por sistemas reais como alimento, felicidade e condições futuras, não por teto arbitrário.

## 49. Estoque existe por província

O poder pode enxergar agregados, mas o recurso está fisicamente armazenado em províncias.

## 50. Porto é requisito para conexão econômica marítima

Ser costeira ou possuir ancoradouro não basta para integração econômica marítima completa.

A construção **Porto** é a infraestrutura que libera essa conexão.

Isso também prepara sistemas navais futuros.

## 51. Todos os recursos físicos podem ser estocados

Não limitar estoque apenas a alimento.

## 52. Estoque pode começar ilimitado

É simplificação inicial. Limites podem ser introduzidos posteriormente se estoque infinito quebrar o jogo.

## 53. Alimentos estocados deterioram

Celeiros poderão reduzir deterioração.

## 54. Mercado interno é automático

O jogador não deve mover recurso por recurso manualmente.

## 55. Ordem conceitual do fluxo interno

1. produção local;
2. consumo local;
3. cobrir déficits de províncias conectadas;
4. estoque;
5. exportação futura.

## 56. Escassez é distribuída proporcionalmente, com prioridade da capital

A capital recebe prioridade sem transformar todo o sistema em microgerenciamento.

## 57. Recursos só circulam por conexão válida

Conexão pode ser terrestre ou marítima quando houver infraestrutura adequada.

No comércio internacional futuro, usar rota própria/conectada; não assumir passagem abstrata por território de terceiros sem regra que permita isso.

## 58. Comércio internacional depende de permissão/tratado

Tratado abre os mercados; o jogador não negocia produto por produto manualmente.

## 59. Comércio internacional usa dinheiro, não barter manual

Compras e vendas futuras são automáticas conforme oferta/necessidade.

## 60. Sem dinheiro, importações param

Não criar dívida automática para sustentar importações.

## 61. Preço-base global é suficiente inicialmente

Oferta/demanda e preços regionais podem vir depois.

## 62. Receita de exportação entra no tesouro estatal

Não criar uma carteira separada por província para comércio.

## 63. Tesouro pertence a cada poder

Cada poder possui seu próprio tesouro.

Isso permite jogador e IA usarem as mesmas regras de recrutamento, manutenção, construção e comércio.

## 64. Não existe tesouro provincial independente

Ao conquistar, o vencedor pode receber saque monetário aproximado à produção de um turno e capturar estoque com perdas.

## 64A. Batalha por si só não gera saque

O saque está ligado à conquista/assalto da província, não simplesmente a vencer um combate em campo.

## 65. Imposto possui três níveis

- baixo;
- normal;
- alto.

Baixo favorece felicidade; alto favorece receita e pressiona felicidade.

## 66. Receita fiscal considera mais que população

Direção conceitual:

`população × atividade econômica × taxa × eficiência administrativa`

## 67. Atividade econômica pode gerar dinheiro automaticamente

Não exigir ações manuais repetitivas para transformar toda produção em renda.

## 68. Felicidade é provincial e internamente vai de 0 a 100

Na interface usar categorias como:

- Muito feliz;
- Satisfeita;
- Neutra;
- Insatisfeita;
- Revoltosa.

## 69. Felicidade recebe efeitos coerentes dos sistemas existentes

Exemplos:

- impostos;
- comida/fome;
- conquista recente;
- nacionalidade;
- administração/distância da capital no futuro;
- presença militar;
- construções;
- guerra prolongada;
- prosperidade.

Conquista recente causa penalidade que deve se recuperar ao longo do tempo, em vez de durar para sempre.

## 70. Nacionalidade pertence à população e pode ser misturada

Uma província pode ter várias nacionalidades em proporções/quantidades.

## 71. Nacionalidade muda lentamente

Não transformar população conquistada em outra nacionalidade instantaneamente.

## 72. Nacionalidade diferente do governante gera tensão

Não criar grupos culturais intermediários complexos por enquanto. Diferença de nacionalidade já basta para gerar problema.

## 73. Província conquistada continua usando sua população normalmente

Não criar trava especial de recrutamento em recém-conquistadas. Problemas aparecem por felicidade/nacionalidade.

## 74. Revolta vem depois de penalidades

Felicidade baixa primeiro prejudica a província; se persistir, pode gerar risco/chance de revolta.

Quando ocorrer, tentar restaurar poder local/original quando fizer sentido; caso contrário criar poder rebelde.

## 75. Migração fica para depois

Pode futuramente responder a fome, prosperidade, guerra e segurança.

## 76. Autoridade é separada por assunto

Não existe hierarquia linear única.

- comportamento atual → código, testes, `CLAUDE.md`;
- decisão de design → `DECISOES.md`;
- trabalho atual → `PATCH_ATUAL.md`;
- direção macro → `ROADMAP.md`;
- ideias futuras → `BACKLOG.md`;
- processo de agentes → `AGENTS.md`.

## 76A. Identificadores de decisões são estáveis

Depois que uma decisão é referenciada pelo código, por testes ou por documentação, seu
número não deve ser reutilizado para outro assunto. Reorganizar o arquivo não autoriza
renumerar silenciosamente decisões existentes.

## 77. Cada poder possui capital

Capital é centro administrativo, não máquina arbitrária de bônus.

## 78. Perder a capital exige escolher outra

No início do próximo turno, o jogador deve selecionar nova capital antes de continuar.

## 79. Não usar barra explícita de corrupção inicialmente

Usar conceito de **ineficiência administrativa** quando esse sistema for aprofundado.

## 80. Distância da capital é direção futura

Referência conceitual: Rome: Total War 1.

Pode afetar arrecadação, administração, revolta e circulação, mas só quando houver necessidade e sem fórmula excessivamente complexa.

## 81. Estradas são construção futura

Podem afetar movimento, mercado interno e administração.

## 82. Província terá 4 slots de construção

Objetivo: forçar especialização e impedir que toda província possua tudo.

## 83. Construções terão níveis I, II e III

Usar evolução clara em vez de dezenas de variantes desconectadas.

## 84. Não criar atributo genérico de desenvolvimento por enquanto

Desenvolvimento emerge de população, economia, construções e outros sistemas concretos.

## 85. Ágora é econômica e administrativa

Pode melhorar atividade, arrecadação e felicidade conforme balanceamento.

## 86. Mercado melhora circulação/comércio

Serve ao mercado interno e prepara comércio internacional.

## 87. Oficina melhora produção geral

Aumenta exploração produtiva, mas não altera potencial natural.

## 88. Celeiro passa a servir alimento/estoque

Deve melhorar armazenamento, reduzir deterioração e aumentar resistência a escassez.

Não deve continuar sendo apenas `+50% crescimento` desconectado de alimento.

## 89. Quartel não desbloqueia recrutamento

Uma província própria com população suficiente pode recrutar sem Quartel.

A ausência de economia configurada não deve ser uma trava conceitual do recrutamento.

Quartel melhora qualidade/força dos soldados recrutados ali. Valores exatos ficam para balanceamento.

## 90. Muralha integra defesa e cerco

Além da decisão 34, a construção Muralha deve conservar seu papel de bônus defensivo quando o sistema de construções for refeito.

## 91. Porto conecta economia marítima e prepara naval

Conforme decisão 50, Porto é infraestrutura econômica necessária e depois poderá receber funções navais.

## 92. A migração das construções preserva a regra de conquista

Ao adaptar o catálogo para slots e níveis, preservar a decisão 38: construções normalmente
sobrevivem à conquista. A migração estrutural não pode apagá-las silenciosamente.

## 93. Cerco econômico vem depois da economia física

Quando alimento/estoque/mercado existirem, cerco deve:

- cortar circulação externa;
- reduzir fortemente produção;
- consumir estoque;
- permitir fome.

## 94. Exércitos consumindo alimento é direção futura

É desejável para limitar acúmulo infinito e criar logística, mas não pertence à primeira economia física.

## 95. Recursos em construções não entram na base

Madeira, pedra, ferro etc. podem futuramente virar custos de construção se isso melhorar gameplay.

## 96. Recursos em recrutamento não entram na base

Foi considerado, mas não escolhido por enquanto.

## 97. Jogador e IA devem usar as mesmas regras

IA futura não deve recrutar, manter tropas ou sustentar economia gratuitamente.

## 98. IA começa em patch próprio quando a base necessária estiver estável

Não desenvolver IA só porque os dados já permitem.

Primeiro estabilizar os contratos de mundo, economia e guerra dos quais a IA depende. Depois abrir um patch `0.0.x` específico para IA mínima.

A IA mínima faz parte do caminho para o `0.1.0`, que representa a primeira campanha básica completa.

## 99. IA inicial deve ser simples

Começar por ações básicas e mesmas regras do jogador; personalidade, cheats e estratégia sofisticada ficam para depois.

## 100. Diplomacia vem depois da IA mínima

Não implementar diplomacia antes de existir IA mínima. Quando chegar a hora, começar apenas pelo mínimo que a campanha realmente precise.

## 101. Save/load, vitória e derrota são patches próprios antes do 0.1.0

Não empurrar esses sistemas para um patch de economia, guerra ou política provincial.

Eles devem ser implementados separadamente em patches `0.0.x` e estar funcionando antes de lançar o `0.1.0`.

## 101A. 0.1.0 significa primeira campanha básica completa

O projeto pode usar quantos patches `0.0.x` forem necessários.

Cada patch `0.0.x` deve representar um objetivo pequeno, claro e testável.

O `0.1.0` só é lançado quando existe um loop básico de campanha do começo ao fim, incluindo IA mínima, save/load e condições básicas de vitória e derrota.

`0.1.0` é um marco de integração, não um mega-patch.

## 102. Novas ideias não desviam o patch atual

Se forem indispensáveis ao objetivo atual, podem virar tarefa. Caso contrário vão para backlog/roadmap e aguardam.

## 103. Claude é agente principal e Codex é agente secundário/manual

Claude executa a linha principal; Codex é preferencial para bugs isolados, UI, revisão, testes e auditoria.

## 104. Agentes não devem editar a mesma área simultaneamente

Para paralelismo real, usar branches/worktrees separados ou dividir módulos claramente.

## 105. Nenhum agente começa o próximo patch automaticamente

Depois de concluir o patch atual, parar e aguardar teste/aprovação/novo `PATCH_ATUAL.md`.
