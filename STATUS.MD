# STATUS.md

> Memória operacional curta do modo autônomo.
>
> O Git guarda o histórico.
>
> Este arquivo existe apenas para permitir que uma nova sessão continue rapidamente de onde a anterior parou.

---

## Trabalho atual

Sequência rumo à campanha completa, autorizada por Henrique (ordem em `AGENTS.md`):
1 manutenção de construção → 2 save/load → 3 capital funcional → 4 corrupção →
5 expansão autoral da Grécia central → 6 felicidade/revoltas + vitória/derrota mínima.
IA fica por último, fora desta sequência.

---

## Estado

Sessão autônoma noturna em curso (24/08/2026). Progresso da sequência:

* **Etapa 1 — manutenção de construção: CONCLUÍDA.** Todo prédio custa ouro/turno (`construcoes.json`); renda provincial líquida; província pode render negativo (Mercado em terra pobre: −5/turno, e a UI avisa); manutenção cobra sob cerco; obra em andamento não cobra; tesouro não desce de zero na arrecadação (dano a construção é questão aberta do GDD). UI: tooltip da ficha, coluna no Balanço, custo no tooltip de construir, tabela do checar com ganhos líquidos.
* **Etapa 2 — save/load: CONCLUÍDA.** Autosalvamento a cada mudança (`localStorage`, gancho no `aoMudar`); menu oferece "Continuar campanha" (turno/ano) e "Iniciar" vira "Nova campanha" com aviso de apagar; `salvamento.ts` valida a forma (Zod, versão 1), `Campanha.restaurar` valida conteúdo contra atlas/catálogos e falha alto (boot ignora salvamento inválido com aviso). Efêmeros não viajam. Referências vivas preservadas (`estado.dono` mutado no lugar + `reindexar()`).
* **Etapa 3 — capital funcional: CONCLUÍDA.** Capital do jogador que cai trava `passarTurno` até assentar outra (grátis; exilado sem chão não trava); mudança voluntária custa `ajustes.capital.custoDeMudanca`; não se assenta em cidade sitiada; demais poderes reassentam na virada pela regra derivada (`melhorCapitalEntre`); poder sem chão fica sem capital; crônica noticia quedas (`quedasDeCapital` efêmero); botão "Tornar/Assentar capital" no painel de ações; marca de sede na ficha e no Balanço.
* **Etapa 4 — corrupção: CONCLUÍDA.** `corrupcao.ts`: fórmula do GDD `1−(1−tamanho)(1−distância)` aplicada ao imposto; fatias hipérbole-saturantes calibradas em `ajustes.json` (distância reproduz a tabela do GDD exatamente; tamanho aproxima a ordem de grandeza); distância por BFS no grafo de vizinhança a partir da capital do dono atual, com cache por capital (geografia, não política); `semCaminho` para ilha/sem capital. Mudar capital muda renda do reino — o custo da mudança agora compra algo real. Tooltip da ficha explica a fração.
* **Etapa 5 — expansão autoral: CONCLUÍDA.** 20 fichas novas em `economia.json` (Megáris com Salamina, Corinto, Beócia — Tebas/Tespias/Plateia/Orcomeno/Queroneia —, Eubeia — Cálcis/Histieia/Erétria/Caristo —, Opunte, Sicião e Argólida — Argos/Micenas/Cinúria/Epidauro/Trezena/Hermione), 18 povos novos no catálogo, 9 guarnições novas em `exercitos.json` (régua: potências e cidades em guerra mantêm tropa). Grécia central = 25 províncias, 18 poderes completos, todos JOGÁVEIS (regra derivada: `semEconomia(poder)===0`; `inicio-jogo` pergunta via `podeJogar`). História em cada `motivo`/`motivoDaFicha` (Lelantina acesa entre Cálcis e Erétria, Fídon em Argos, Baquíadas em Corinto...). NÚMEROS INICIAIS — Henrique deve revisar. Guardas novas: nenhum poder abre em fome/sem renda; poder tocado pela região é completo; 50 turnos de paz sem fome espontânea; contiguidade com ilha declarada (Salamina, naval futuro).
* **Etapa 6 — felicidade funcional, revoltas e vitória/derrota mínima: CONCLUÍDA.** Humor por alvo-e-aproximação (`felicidade.ts`): base 50 ± comida do reino/cerco/domínio estrangeiro/Templo (agora efeito real +5/+8/+12), passo de 4/turno, choque de conquista −25 (no caminho da conquista, não na primitiva). Faixa Revoltosa = greve fiscal (imposto 0); sob bandeira estrangeira, pavio de 3 turnos → levante: 2% da população vira hoste do dono de 700 a.C. (sai da população; revive poder eliminado; cerca a cidade até ser esmagada por surtida ou definhar). Estado novo `revoltas` (pavio) com default no salvamento — saves antigos carregam. Vitória = dominar as simuladas alcançáveis por terra (Salamina fora da régua até o naval — a autocrítica pegou que exigi-la tornava a vitória impossível); derrota = deixar de existir; tela de fim (`fim-de-jogo.ts`) aparece uma vez, com continuar observando/recomeçar. Crônica noticia levantes.

Da sessão anterior: fome em dois regimes implementada (decisão de Henrique); cidade sitiada recruta (guarda obsoleta removida); mercado interno e "graça" das construções aguardam por decisão dele.

---

## O que o agente autônomo está fazendo

Nada — as três frentes do segundo teste manual de Henrique (24/08) foram entregues:

1. **Cerco que estrangula (era o bug das 90 rodadas em Mégara).** Causa: a fome do cerco era condicionada ao saldo do REINO, e o peixe de Salamina (ilha inalcançável) mantinha Mégara em +1 — a cidade cercada não sofria nada. Regra nova: sitiada está cortada da mesa — fome local incondicional (−1% pop, −5% tropas de dentro por turno) e crescimento zero; fome estrutural continua sendo "não fecha nem com as sitiadas livres" e pula as sitiadas. Teste de regressão do caso Mégara incluído; o spec da surtida foi recalculado (os 700 sitiados viram 665 antes da batalha).
2. **Saldo completo por província.** `custoDaTropaDe` (origem rastreada) e `saldoDaProvincia` na campanha; Governo com colunas renda/tropa/saldo e vermelho pelo SALDO; ficha com a linha da tropa de origem no tooltip. Atribuição por origem pode divergir do total do poder em ±1 moeda (arredondamento por província) — anotado no código.
3. **Imposto por níveis substituiu o decreto de investimento.** Resposta à pergunta do Henrique: o investimento não servia mais (redundante com construções, retorno ilegível) e foi REMOVIDO por inteiro (estado, economia, UI, testes; saves antigos carregam — campo ignorado). No lugar, o decreto do GDD: baixo ×0,8/+6 humor, normal, alto ×1,35/−8 humor (`ajustes.economia.imposto`), efeito imediato na renda, humor gradual, conquista zera o decreto. Régua referenciada em Rome: Total War (Low ×0,8 comprando ordem pública; High/Very High ×1,2–1,5 pagando em unrest).

---

## Trabalho restante que pode ser feito automaticamente

Nenhum. A próxima fronteira do jogo é IA mínima + diplomacia necessária — a última etapa, que Henrique reservou para decidir. Trabalhos menores possíveis quando ele quiser: mercado interno mínimo (segue excluído), bônus do Quartel, Ágora/Estrada reduzindo corrupção (prometido nas fichas), naval para Salamina/Egina.

---

## Testes

* `npm run verificar`: verde — tipos, lint, código morto, dados e **297 testes unitários** (os 8 do investimento saíram com ele; entraram os do imposto, do cerco-que-estrangula e do saldo provincial).
* `npm run teste-tela`: verde — **32 testes** (selecao.spec migrado para o decreto de imposto; cerco.spec recalculado pela fome do cerco).
* `npm run build`: produção compila limpa.

---

## Problemas encontrados (autocrítica da sessão)

Corrigidos durante a noite:

* a régua da vitória exigia Salamina, que é inalcançável sem naval — a vitória seria impossível por definição; a régua agora exclui ilhas sem vizinhança terrestre;
* a barra travava o botão de turno para o jogador exilado com capital marcada como perdida, contradizendo a regra da virada (exilado joga); espelhada;
* o `checar.ts` imprimiria "+-5/turno" com ganho líquido negativo; formatação corrigida.

Observações que NÃO são defeitos (para Henrique conhecer):

* revolta é tempestade, não ocupação: sem IA, os rebeldes cercam a cidade mas nunca a assaltam, e definham de fome (~5%/turno) se ignorados — a revolta se esgota sozinha em ~1 década se ninguém a esmagar. Aceito como v1;
* província revoltosa de dono legítimo só faz greve fiscal — o levante exige bandeira antiga contra a atual;
* o jogador que recomeçar com um poder pequeno (Plateia, Hermione) joga em dificuldade brutal — sem balanceamento por poder, é o mapa como ele é;
* Corinto abre com manutenção militar ≈ renda (borderline por design: potência comercial pagando exército grande); Henrique pode achar apertado;
* specs de tela antigos ainda constroem `quartel` antes de recrutar — inócuo, não mexi.

---

## Decisões pendentes

Nenhuma bloqueando. Tudo o que segue é revisão de Henrique sobre números INICIAIS:

1. as 20 fichas novas de `economia.json` (populações, níveis, comercioBase, felicidades, guarnições);
2. manutenção das construções (`construcoes.json`) e a tabela de paybacks do `checar.ts`;
3. curvas de corrupção (`ajustes.corrupcao`) — a distância reproduz a tabela do GDD, o tamanho aproxima;
4. felicidade/revolta (`ajustes.felicidade`): alvos, passo, choque de conquista, pavio e fração rebelde;
5. custo de mudança de capital (2.000);
6. a régua mínima de vitória (Grécia central alcançável por terra) — trocar quando o mapa crescer.

---

## Dependências de Henrique

RETESTAR: (1) sitiar Mégara — a ficha dela agora mostra o relógio ("mantimentos para N turnos" → "o povo passa fome" → "povo e guarnição definham"; com gado II + grãos I, a despensa dura 5 turnos, o povo sofre do 6º em diante e a guarnição a partir do 9º); (2) o tooltip do humor na ficha — a conta parcela a parcela; (3) o painel de imposto e o Governo com renda/tropa/saldo. Números do relógio em `ajustes.alimento.cerco` (mantimentos 2, folgaDaTropa 3) — iniciais, ajustáveis.

---

## Próximo passo

Henrique testa, aponta ajustes, e decide a próxima frente (IA mínima é a última etapa; tooltips do jogo todo é uma revisão que ele já anunciou querer).

---

## Última atualização

2026-08-24, terceira rodada do dia — as duas ideias de Henrique implementadas: mantimentos de cerco à la Bannerlord (despensa = base + comida da terra; povo primeiro, tropa por último; fase visível na ficha; Fazenda virou resistência de cerco) e humor com a conta decomposta na ficha (o sistema de alvo já era soma de pontos — agora ela aparece). 299 testes unitários + 32 de tela + dados + build + captura sem erros. Nada commitado.
