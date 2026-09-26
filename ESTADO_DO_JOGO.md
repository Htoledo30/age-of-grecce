# Age of Grecce — estado atual

Este documento é uma fotografia do que o jogo faz hoje. Código e testes são a prova final;
`GDD.md` guarda a visão e as direções futuras. O Git guarda a história das mudanças.

## Versão e escopo

**Versão de desenvolvimento: `0.2.0`.** A `0.1.0` foi o ciclo mínimo de campanha; a versão
atual já integra economia, alimentação, construções, guerra terrestre, mar, diplomacia,
comércio, alianças, ligas, salvamento, áudio e IA.

O mapa contém:

- 196 províncias de terra e 48 zonas marítimas;
- 53 regiões e 139 poderes;
- 25 províncias com economia, população e simulação completas;
- 18 poderes inteiramente configurados e jogáveis;
- 171 províncias de terra desenhadas, mas ainda sem economia e população.

Somente poderes com dados completos participam da campanha e da IA. Isso impede que reinos
simulados conquistem gratuitamente metade de um mapa ainda vazio.

O recorte autoral cobre Ática, Megáris, Coríntia, Beócia, Eubeia, Opunte, Siciônia e Argólida.
O mapa abre em paz e sem hostes iniciais; cada poder decide quanto mobilizar.

## Ciclo de campanha

O jogador consegue:

- escolher qualquer um dos 18 poderes configurados;
- administrar tesouro, províncias, impostos, população, comida e construções;
- recrutar quatro armas, formar, dividir, reunir, dispensar e mover hostes;
- lutar, recuar, perseguir, cercar, assaltar, fazer surtida e conquistar;
- navegar pelas zonas marítimas, desembarcar, interceptar e bloquear Portos;
- negociar presentes, pactos, comércio, tributos, acesso militar, alianças e ligas;
- mudar a capital, enfrentar revoltas e sobreviver no exílio enquanto possuir tropas;
- salvar automaticamente, continuar a campanha, vencer ou perder.

Cada rodada representa aproximadamente um ano. As ordens militares são planejadas no mesmo
mundo e resolvidas simultaneamente. A IA decide antes da resolução, sem enxergar o resultado
das ordens do jogador.

A vitória exige dominar as províncias simuladas; a derrota acontece quando o poder fica sem
território e sem hostes. Perder a última terra não elimina quem ainda possui exército. A tela de
fim aparece uma vez e permite continuar observando o mapa.

A régua de balanceamento usa três fases: início até o turno 79, meio entre 80 e 150 e fim
depois de 150. O alvo do turno 100 é mostrar alguns impérios aparecendo, sem um reino imenso ou
um mapa já consolidado.

## Mundo, capital e posse

O Atlas guarda geografia e identidades imutáveis; a campanha guarda donos, população,
construções, hostes, relações e demais estados vivos. Conquista repinta o mapa sem regenerá-lo.

Cada poder possui uma capital. Se a capital do jogador cair, a próxima virada fica bloqueada
até ele assentar outra gratuitamente. Mudança voluntária custa ouro. A IA reassenta pela regra
derivada dos dados; poder sem território fica sem capital. Cidade sitiada e terra sem economia
não podem virar sede.

Os arquipélagos das Cíclades, Espórades e Calimno são províncias únicas formadas por várias
ilhas. A água reivindicada entre seus pedaços serve apenas à leitura política: canais de mar
continuam separando os territórios e nenhuma falsa passagem terrestre nasce disso.

## Economia

A economia é provincial e automática. Produtos representam capacidade anual e identidade da
terra, não unidades acumuladas. Não há trabalhadores para alocar nem estoque para vender.

Cada província produz três parcelas:

```text
imposto  = população × taxa × decreto × construções
produção = (produto principal + secundário ponderado) × construções
trânsito = posição comercial × construções, se houver rota até a capital
```

Corrupção e humor multiplicam as três parcelas antes de elas chegarem ao tesouro. Depois são
descontadas as folhas das construções e das tropas. Por isso uma província pode dar saldo
negativo e continuar valendo por comida, recurso, posição, defesa ou negação ao inimigo.

Os decretos são baixo, normal, alto e confisco. O confisco é uma alavanca de guerra com prazo
social curto, não apenas um imposto maior. A interface mostra o efeito monetário previsto e o
impacto no humor; os números vivem em `dados/ajustes.json`.

### Corrupção

A corrupção representa o que se perde entre a província e o tesouro. Ela combina:

- tamanho da população, reduzido pela Ágora;
- distância em saltos até a capital, reduzida pela Estrada.

As duas partes saturam e se compõem sem ultrapassar 100%. Não existe província isenta por um
limiar artificial. Mudar a capital recalcula a distância do reino inteiro.

### Rede interna e comércio externo

A rede interna paga uma vez por cada bem distinto que o reino alcança. Um bem circula quando a
terra é do reino, não está sitiada e chega à capital por terra própria ou entre dois Portos.
Produtos principal e secundário participam da rede.

O acordo externo é outra parcela. Ele acrescenta renda aos dois parceiros a partir do tamanho
do menor mercado, com retorno decrescente para carteiras grandes e sem permitir que um acordo
novo reduza o total. O acordo não entrega o produto nem a comida do parceiro.

A rota comercial é conferida todo turno. Os parceiros precisam fazer fronteira ou possuir
Portos abertos nos dois lados. Guerra desfaz o acordo; perda da fronteira, Porto destruído ou
bloqueio naval suspendem a renda enquanto a conexão não existir.

O Governo separa as abas de Balanço, Alimentação e Mercado. A ficha da província e o Governo
mostram renda líquida, manutenção e causas de corte da rota.

## Alimentação e população

Comida é um saldo anual sem estoque:

```text
saldo civil = subsistência + produção de alimentos + grão comprado − consumo da população
saldo final = saldo civil − consumo do exército
```

O povo come primeiro. Cada província cai numa faixa absoluta de população, e essa faixa decide
seu consumo. Produtos alimentares e Fazenda, Pastagem ou Porto pesqueiro sustentam o reino.
Cada ponto de comida sustenta a quantidade de soldados definida em `dados/ajustes.json`; armas
podem consumir quantidades diferentes, e a cavalaria pesa mais na mesa.

O reino pode COMPRAR grão de fora na aba Alimentação do Governo. Porto e Mercado abrem a porta:
cada nível deixa entrar alguns pontos (`importaGrao` no catálogo). O ponto `n` custa
`n × alimento.importacao.precoPorPonto` por turno, sai da renda como despesa e entra na conta
civil como a colheita. Cidade sitiada não conta, e cais bloqueado não recebe; a encomenda fica
de pé e volta a valer quando a porta reabre. Quem não consegue pagar tem a encomenda cortada
antes da arrecadação. A IA compra contra fome e quando a despensa trava o exército que a folha
de guerra dela bancaria, pagando pela fatia `fatiaParaGrao` da renda ou pelo cofre.

Saldo civil negativo causa fome local nas províncias dependentes e perdas no exército. Saldo
civil fechado com saldo final negativo pune somente as tropas. Crescimento só acontece quando
o novo tamanho continuaria sustentável; não há capacidade populacional artificial.

A taxa de crescimento é de cada província: a natural, baixa, mais a prosperidade das obras
erguidas nela. Ágora, Mercado, Porto, Estrada, Templo e as oficinas de produção somam à taxa
por nível, e obras diferentes se acumulam; obras militares e de comida não somam. A terra nua
cresce devagar e a cidade desenvolvida acelera, então a população sobe pouco no começo da
partida e mais depressa no meio. Os números vivem em `populacao.taxaNatural` e no campo
`prosperidade` de cada obra.

Desde 31/08/2026 a subsistência que todo reino recebe de graça é 1, por decisão de Henrique, e
isso faz da Fazenda a primeira obra da partida: **Atenas abre com saldo alimentar ZERO**. Sem
comida nova ela não cresce um habitante e não sustenta um soldado, porque não há ponto sobrando;
cada ponto de comida alimenta 1.000 homens.
Cercar Mégara com 800 homens custa 319 deles em 30 turnos, de fome, sem um combate.

Cidade sitiada sai da circulação do reino e vive dos próprios mantimentos. Enquanto a despensa
dura, não cresce nem morre. Depois dela, população e guarnição definham a cada turno.

Recrutar retira pessoas e imposto da província de origem. Cada contingente preserva terra,
arma, treino e quantidade; dispensar devolve sobreviventes à população correta.

## Felicidade, nacionalidade e revoltas

O humor de cada província caminha para um alvo legível. Pesam imposto, fome, cerco, guerra,
isolamento da capital, tamanho, nacionalidade, guarnição e Templo. Conquista provoca um choque
imediato. O humor também multiplica imposto, produção e trânsito.

A nacionalidade possui duas camadas: cidade de origem, inclusive com população mista, e povo
grego — jônio, dório, beócio ou lócrio. Mandar na própria cidade não pesa; mandar em outra
cidade da mesma tribo pesa menos do que governar outra tribo. A conta é proporcional às fatias
da população e hoje não existe assimilação.

Tropa do dono parada na província funciona como guarnição e melhora a ordem pública até um
teto. Tropa inimiga não conta: ela produz cerco.

Na faixa revoltosa, a província entra em greve fiscal. Sob governante estrangeiro, o pavio pode
levantar uma hoste rebelde do dono original e iniciar um cerco. Uma revolta pode reviver um
poder eliminado.

## Construções

Cada província possui quatro slots. Em regra, os prédios têm níveis I, II e III; upgrade ocupa
o mesmo slot, paga o novo nível e leva prazo próprio. Uma província executa uma obra por vez.
Construções concluídas normalmente sobrevivem à conquista.

O preço e a manutenção das obras comuns usam o peso econômico autoral da província, não sua
riqueza viva. Isso mantém a obra acessível numa terra pequena sem permitir que um império rico
barateie a mesma melhoria numa conquista pobre.

Armaria, Acampamento de arqueiro e Treinamento de cavaleiros são exceções de nível único. Cada
uma custa 8.000 e cobra 25 por turno em qualquer província. Elas liberam respectivamente
hoplita, arqueiro e cavalaria naquela terra; arqueiro exige madeira e cavalaria exige cavalos.

Papéis atuais:

- **Ágora:** reduz corrupção por tamanho e recupera a renda que seria perdida;
- **Mercado:** melhora o trânsito local e a rede nacional de bens distintos, e deixa entrar
  grão comprado;
- **Quartel:** carimba treino melhor nas tropas recrutadas naquela província;
- **Muralha:** aumenta a milícia e exige 2/3/4 rodadas completas de cerco;
- **Templo:** aumenta o alvo de felicidade em 9/15/22 e acelera a recuperação da ordem em
  1/2/3 pontos por turno, sem amortecer quedas causadas por fome, cerco ou imposto;
- **Porto:** liga terras por mar, dá alcance ao comércio, permite embarque, aumenta trânsito e
  deixa entrar grão comprado enquanto o cais não estiver bloqueado;
- **Estrada:** reduz corrupção por distância e corta 3%/5%/7% da folha das hostes paradas
  naquela província própria; a taxa de campanha em terra alheia continua integral;
- **Explorações:** Fazenda, Pastagem, Porto pesqueiro, Lagar, Vinhedo, Serraria, Mina e Pedreira
  dependem dos produtos locais e melhoram comida ou produção.

Toda obra erguida cobra manutenção, inclusive sob cerco; obra em andamento ainda não cobra. Se
o tesouro zerar, a obra continua funcionando hoje. A direção já decidida, mas não implementada,
é deixá-la inativa naquele turno sem destruí-la e mostrar claramente quais obras pararam.

## Guerra terrestre

Hostes possuem identidade e podem ser divididas ou reunidas. A folha militar depende do chão:
taxa de casa em território próprio e taxa maior de campanha em território alheio, inclusive em
cerco. Conquistar a província transforma imediatamente a força invasora em guarnição local.

As quatro armas são leve, hoplita, arqueiro e cavalaria:

- leves são a referência barata e podem ser recrutados em qualquer província;
- hoplitas, arqueiros e cavalaria exigem a obra local correspondente;
- o triângulo é hoplita contra cavalaria, cavalaria contra arqueiro e arqueiro contra hoplita;
- treino multiplica ataque e fica gravado no contingente;
- cavalaria melhora a perseguição com saturação e consome mais comida;
- milícia é leve de treino comum; somente a Muralha aumenta sua quantidade.

A batalha possui choque, linha de quebra e perseguição. Não existe empate: barrar o atacante é
vitória do defensor. Recuar antes da quebra paga perdas menores e evita a perseguição quando há
refúgio válido. Quem quebra perde a hoste, mas os sobreviventes dispersos voltam às populações
de origem.

A resolução produz a lista de rounds usada pela janela de batalha; a interface não recalcula o
resultado. O jogador pode avançar round a round ou deixar a animação correr, mas não comanda
uma batalha tática.

Sitiar ocupa o campo sem conquistar. Assaltar enfrenta milícia e guarnição; Muralha exige
preparação prévia. O defensor pode fazer surtida e reforços externos podem romper o cerco.
Tomar à força mata civis e reduz uma construção — Muralha primeiro, depois a obra mais cara —,
mas não entrega ouro nem estoque ao vencedor.

## Mar

Não existe unidade de frota. A própria hoste atravessa as 48 zonas marítimas, uma zona por
rodada. Zona de mar não tem dono, produção, milícia, cerco nem conquista.

Embarcar exige Porto numa província própria; desembarcar é livre em qualquer costa. Voltar ao
mar depois de um desembarque exige conquistar ou alcançar um Porto próprio, de modo que uma
expedição malsucedida pode ficar presa em terra inimiga.

Encontro de inimigos na água gera batalha sem conquista. A IA navega, desembarca, intercepta
ameaças próximas da costa e escolhe bloqueios.

Uma hoste inimiga parada numa zona que banha um Porto bloqueia o cais. O bloqueio corta ligação
marítima e alcance comercial, mas não impede embarque — sair do Porto é a resposta militar ao
bloqueio. Uma zona pode bloquear vários cais por causa da própria geografia.

Ainda não existe desgaste adicional por permanecer no mar nem proteção de rota escoltada.

## Diplomacia

A opinião é um número simétrico por par, de −100 a +100, que caminha para um alvo composto por
parcelas visíveis. Pesam guerra, fronteira, conquistas, tratados, tribo comum, inimigo em comum,
paz longa, diferença de porte e amizade com inimigos. Atos imediatos, como presente ou saque,
empurram o valor no momento.

A diplomacia possui:

- presente, que troca ouro por um choque temporário de opinião;
- pacto de não-agressão com prazo e reputação ao romper;
- acordo de comércio com renda para os dois lados;
- tributo pago por turno, inclusive como preço de uma paz recusada de graça;
- acesso militar unilateral;
- aliança, que convoca automaticamente o aliado para a guerra;
- liga, em que o chefe recebe tributo e controla guerra e paz enquanto o membro conserva
  território, tesouro e exército;
- anexação de membro de liga somente com consentimento dele.

Quem decide se um acordo é assinado é a balança de interesse: cada reino soma parcelas com
sinal e aceita em saldo zero ou mais. Pacto e aliança pesam confiança (a opinião, multiplicada
pelo gosto do temperamento), temperamento, cobiça pelas terras do outro que valem a marcha,
prazo acima do mais curto e ouro oferecido. Só o pacto pesa medo do outro em terra e em armas e
mãos ocupadas em outra guerra; só a aliança pesa o custo de emprestar o exército, inimigo em
comum, proteção, patrocínio, guerras herdadas e fraqueza do parceiro. Pacto e aliança usam a
balança nos dois
sentidos, na mesa, no clique e entre computadores; a regra só barra guerra, acordo em pé e
prazo inexistente. O ouro rende no máximo um teto de pontos, então ódio não se compra. Comércio
ainda decide por opinião dos dois lados, liga por opinião e razão, e passagem por opinião. A IA
propõe quando a própria
balança passa da iniciativa e a do outro fecha.

A IA apresenta ao jogador propostas que faria a outro poder, e o jogador pode aceitar ou
recusar. Recusar uma proposta não custa opinião. A régua de acordos vai de comércio e pacto até
aliança e liga; a liga é o único vínculo desigual. Em guerra com o jogador, a IA que assinaria
a paz com outro computador pede a paz na mesa, sem tributo.

Toda ordem de marcha é reconferida na virada: a que aponta para terra de quem deixou de ser
inimigo, sem passagem, é cancelada e a hoste fica onde está. Uma cidade muda de mão uma vez por
rodada, e só a hoste que chega nesta rodada declara postura sobre o cerco.

A IA não exige tributo e não rompe o tributo que recebe. Também não existem ainda aliança
defensiva, recusa de convocação mediante reputação ou memória longa de trégua violada.

## IA

Os poderes não controlados pelo jogador usam a mesma fachada e as mesmas regras. A IA:

- administra imposto, tesouro, construções e alimentação;
- recruta respeitando população, comida, ouro, armas e manutenção local;
- reage a ameaças, socorre cidades, faz surtidas e abandona campanhas que perderam sentido;
- escolhe guerras, alvos, concentração, assalto, cerco, retirada e paz; para COMEÇAR uma guerra
  exige a casa sem ameaça e gente livre para sair, mas para CONTINUAR só pergunta se o exército
  inteiro, inclusive o que já está em campo, ainda toma alguma terra do inimigo;
- navega, desembarca, intercepta e bloqueia;
- usa presente, pacto, comércio, tributo, acesso, aliança, liga e anexação.

A folha militar da IA é uma fatia da renda (maior com inimigo na porta) mais uma fatia do
cofre: o que passa de 20 turnos de renda, descontada a guarda do estilo, vira folha à razão de
`cofreNaFolha` por turno. Cofre de reserva não arma ninguém; cofre cheio vira exército, e a
tropa que ele deixa de pagar deserta como a de qualquer reino.

Os estilos guerreiro, mercador, cauteloso e equilibrado mudam prioridades econômicas e
militares e os gostos da balança diplomática: o guerreiro pesa força, o mercador pesa ouro, o
cauteloso pesa segurança e confiança. A IA é determinística e decide novamente a cada turno;
planos que precisem sobreviver a uma virada exigirão memória salva no estado.

## Interface, áudio e acessibilidade

O mapa é o protagonista. A ficha da província mostra identidade, alertas, saldo, humor,
população e milícia; Construções e Recrutamento usam janelas próprias. A mesa de Construções
mostra os quatro espaços da terra, organiza o catálogo em Cidade, Guerra, Rotas e Terra e
separa a escolha da compra: a obra selecionada revela efeito, custo, prazo, folha e retorno
antes do comando. Cada tipo possui uma vinheta arquitetônica própria; ela identifica a escolha
no detalhe e reaparece como faixa no patrimônio assim que a obra ocupa um slot. Governo,
Diplomacia, crônica, ficha de hoste e janela de batalha apresentam os mesmos números usados
pelas regras.

Mandar PARTE de uma hoste a divide na hora: os homens saem da conta de quem fica, viram hoste
própria com a ordem, e o resto continua livre para receber outra ordem na mesma rodada — três
colunas saindo da mesma cidade para três destinos é uma sequência de cliques, não uma exceção.
Cancelar a ordem reúne o destacamento de volta. A guarnição de uma província cercada não se
divide: ela sai inteira, surte, ou fica.

Para mandar uma hoste marchar, o jogador a seleciona no mapa, aperta **Mover** e clica na
província ou zona de mar de destino — qualquer uma. Nada é marcado de antemão: a rota aparece só
sob o ponteiro, e um clique impossível recebe o motivo escrito no painel em vez de silêncio.
Terra alheia continua pedindo a segunda decisão, assaltar ou sitiar, antes de virar ordem.

A mesa de Diplomacia tem três colunas: a lista de reinos agrupada por estado, a leitura do que
os dois são um do outro e a coluna de propostas. Os tratados são uma lista de fichas que abre
uma por vez; fechada, cada ficha mostra o que já está em pé e a palavra dele (assinaria,
relutante ou fechado), e aberta mostra a conta da balança dele, a frase com o que a viraria e as
opções com ouro, prazo e saldo em colunas alinhadas. Não há selo de sim ou não. Guerra e paz
não fecham e ficam presas ao pé da coluna.

Os 18 poderes com economia completa possuem estandartes vetoriais próprios inspirados em tipos
monetários, cultos locais e mitos reconhecíveis. A mesma cor e insígnia aparece na escolha de poder, barra principal, ficha da
província, ficha da hoste, marcador no mapa e mesa de Diplomacia, onde identifica cada linha da
lista, os dois lados da tira de confronto e as fileiras de aliado, inimigo e parceiro. Os demais poderes do Atlas e reinos nascidos por
independência recebem uma marca determinística. Os vetores são empacotados no jogo, portanto
nenhuma identidade depende da rede em execução nem fica sem representação.

O modo político mostra posse; o modo de relações repinta o mapa segundo a opinião sobre o poder
selecionado. Nomes de província vivem no mapa, encolhem para caber e podem ser ocultados nas
opções. Dois reinos visíveis próximos não recebem cores indistinguíveis.

O palco usa `zoom`, nunca `transform: scale()`. `Opções > Tamanho da interface` oferece 90%,
100%, 115% e 130%, persistidos no navegador. O tamanho lógico vem de `src/estilo/escala.ts`;
CSS interno usa as variáveis do palco e consultas de contenedor, não `100vw`, `100vh` ou media
queries baseadas na janela.

O menu de pausa oferece continuar, opções, menu principal e saída. Música e efeitos têm volumes
separados. A trilha é ambiente; os efeitos sintetizados usam vozes de lira e bronze.

## Salvamento e ferramentas

A campanha salva automaticamente no `localStorage` depois de mudanças. O menu oferece continuar
e avisa antes de substituir uma campanha. O esquema de salvamento possui versão própria,
independente da versão `0.2.0` do jogo, e migra hostes antigas quando necessário.

Os números de balanço vivem em `dados/*.json`. O editor F2 permite alterá-los durante a partida
e, em desenvolvimento, gravá-los de volta em `dados/`.

Comandos principais:

- `npm run dev`: servidor de desenvolvimento;
- `npm run app`: aplicativo Electron;
- `npm run verificar`: tipos, lint, código morto, testes unitários e checagem dos dados;
- `npm run teste-tela`: testes de interface;
- `npm run build`: build de produção;
- `npm run entregar`: verificação, tela e build;
- `npm run economia`: mede a economia do menor ao maior poder;
- `npm run armas`: mede combate junto com ouro, comida e população;
- `npm run partida`: simula uma campanha inteira com IA;
- `npm run medir-diplomacia`: mede a aba de Diplomacia (botões, prosa, conteúdo escondido);
- `npm run medir-balanca`: mede a balança de interesse par a par em quatro cortes da partida;
- `npm run medir-tamanho`: verifica os quatro tamanhos de interface e transbordos.

## Limitações atuais conhecidas

- 171 províncias de terra ainda não possuem autoria econômica e social;
- assimilação, migração, governadores e espionagem não existem;
- construções continuam ativas quando a manutenção não pode ser paga;
- comércio, liga, passagem e tributo ainda não usam a balança de interesse;
- alianças e tréguas ainda têm as arestas descritas na seção de Diplomacia;
- não há desgaste naval adicional nem escolta de rota;
- oferta, demanda e preços regionais não existem;
- terreno, generais e líderes não participam do combate;
- tooltips ainda precisam de uma limpeza dedicada para reduzir explicações longas.

Simulações medem regressões e relações; não substituem a sensação de jogar. O que ainda depende
do olho do jogador está resumido em `AGENTS.md`, sem alterar o que este documento declara como
implementado.

## A INDEPENDÊNCIA: o próprio povo pega em armas, e nasce um reino

Henrique, 31/08/2026, ao descobrir que a terra legítima nunca se revoltava: *"revolta ali é
impossível? não era para ser impossível, se eu meter o louco tem q se revoltar sim"*.

### O buraco, e por que ele existia

O levante sempre nasceu **em nome do dono de 700 a.C.** — os rebeldes erguem a bandeira de quem
mandava ali antes da conquista, e esse poder volta ao jogo para sitiar a cidade. Na terra que
sempre foi sua, esse dono antigo é **você**: não havia contra quem se levantar, e o código
desistia numa linha. O efeito colateral era o Confisco eterno sair de graça em casa.

### A regra nova

Duas revoltas diferentes, e a diferença é CONTRA QUEM:

- **terra sob bandeira estrangeira** (maioria que não reconhece o dono): como sempre — levanta
  em nome do rei de 700 a.C., e basta ela ferver ("Insatisfeita" já acende o pavio);
- **terra do próprio povo**: declara **independência**. Nasce um reino com o nome da província,
  cor própria no mapa e opinião própria na diplomacia. Você não perde só o imposto: perde a
  terra, e ela vira um vizinho para reconquistar ou negociar.

⚠️ **Só o FUNDO da régua arma o próprio povo, e a escolha é de Henrique.** A faixa "Insatisfeita"
(20–39) azeda a cidade e não arma ninguém; só "Revoltosa" (≤19) acende o pavio, em 3 turnos.

### Quanto é preciso apertar — medido em Maratona

| o que pesa | alvo de humor |
| --- | --- |
| nada | 53 |
| + Confisco | 33 |
| + guerra do reino | 27 |
| + cidade sitiada | **12** ← só aqui a independência acende |

**O Confisco sozinho não derruba ninguém, e nem Confisco somado à guerra.** É preciso o mundo
desabar em cima da província. É o que separa "apertei demais" de "perdi a terra".

### As três coisas que isso obrigou

⚠️ **A lista de poderes do atlas virou VIVA.** `Atlas.poderes` era o arquivo e ponto; hoje é o
arquivo mais `registrarPoder`. A impressão digital do recorte continua contando só os do
arquivo — contar os que a partida criou faria todo salvamento com uma independência dentro
parecer de outro mundo, e ser recusado.

⚠️ **O estado carrega `poderesNascidos`, e o salvamento os restaura ANTES de validar.** A
conferência recusa província de dono desconhecido, e uma terra livre pertence justamente a um
dono que o mundo de 700 a.C. nunca teve.

⚠️ **A paleta do mapa aprende cor nova a cada repintura** (`aprenderPoderes`). A cor do reino
livre é a do rei que ele deixou, 38% mais clara, com um empurrão vindo do índice da província:
quem olha o mapa lê "aquele pedaço claro era do azul ao lado" — que um reino RACHOU, e não que
um reino apareceu.

### Um defeito achado no caminho

**Jogo salvo com Confisco ligado não carregava.** O esquema do salvamento listava
`baixo | normal | alto` e o decreto de confisco existe desde que o imposto foi refeito: qualquer
partida com uma província confiscada era recusada na carga como corrompida. Achado ao escrever o
teste da independência, que confisca para azedar a cidade.

## Crédito de asset

Os placeholders de cidades e aldeias em `assets/placeholders/kenney-medieval-rts/` são do pacote
Kenney Medieval RTS, licença CC0. A licença está em `assets/placeholders/kenney-medieval-rts/LICENCA.txt`.
