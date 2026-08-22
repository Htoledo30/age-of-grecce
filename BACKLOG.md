# BACKLOG.md

# Age of Grecce — Backlog de Desenvolvimento

Este arquivo reúne ideias, melhorias e sistemas futuros que **não pertencem necessariamente
ao patch atual**.

Regra principal:

> Uma ideia estar no backlog NÃO significa que deve ser implementada agora.

Ela deve permanecer aqui até ser escolhida explicitamente para um patch futuro.

---

# 1. Combate

## Alta prioridade futura

### Visor de batalha estilo Brasfoot

Problema atual:

O combate é resolvido numericamente de forma quase instantânea e o jogador não sente a
batalha acontecendo.

Direção desejada:

- abrir uma janela/painel de batalha;
- mostrar os dois lados;
- mostrar homens restantes;
- mostrar perdas acontecendo progressivamente;
- mostrar barras;
- permitir velocidade 1x / 2x;
- permitir pular;
- futuramente permitir decisões simples.

Referência conceitual:

**Brasfoot** — simulação simples, mas visível e acompanhável.

Não transformar o jogo em combate tático estilo Total War.

---

### Resolução iterativa da batalha

O 0.0.2 pode usar playback visual de um resultado calculado em um passo.

Para permitir futuramente:

- moral mudando durante a batalha;
- retirada manual;
- decisões no meio da luta;
- eventos de combate;

será necessário um modelo realmente iterativo de resolução.

Essa mudança pertence a um patch futuro de aprofundamento do combate.

---

## Moral

Direção:

- cada lado possui moral;
- moral varia ao longo da batalha;
- quando moral quebra, soldados podem fugir;
- força derrotada não precisa ser destruída completamente;
- sobreviventes recuam para uma província amiga.

Objetivo:

Criar derrotas, fugas e vitórias custosas sem precisar exterminar automaticamente um dos
lados.

---

### Retirada

Futuro:

- retirada automática quando moral quebra;
- opção manual de retirada;
- perdas adicionais dependendo da situação;
- sobreviventes voltam para território amigo.

---

## Tipos de tropas

Não implementar no 0.0.2.

Direção futura inicial:

- Infantaria
- Cavalaria
- Arqueiros
- Siege

O jogador deverá escolher o que recrutar.

A quantidade de soldados não deve ser o único fator de força.

Também devem influenciar:

- tipo de tropa;
- qualidade;
- Quartel;
- moral;
- situação da batalha.

---

## Qualidade militar

Possível força efetiva derivada.

Exemplo conceitual:

`força efetiva = quantidade × qualidade × modificadores`

Qualidade pode ser influenciada por:

- nível do Quartel;
- experiência futura;
- líder;
- moral;
- outros fatores.

Evitar criar uma barra desnecessariamente complexa para o jogador.

---

## Aleatoriedade

Futuramente introduzir alguma variação controlada no resultado de batalha.

Objetivo:

- impedir que o jogador saiba exatamente o resultado antes de atacar;
- manter o sistema compreensível;
- preservar possibilidade de testes determinísticos através de seed.

Não usar aleatoriedade descontrolada.

---

## Terreno

Futuramente terreno pode afetar combate:

- planície;
- montanha;
- rio;
- floresta;
- outros.

Não implementar enquanto os dados geográficos/relevo não forem confiáveis.

---

## Generais e líderes

Desejo futuro:

- líderes;
- personagens;
- comandantes;
- possíveis bônus militares;
- características próprias.

Ainda sem sistema definido.

---

## Family Tree

Referência desejada:

**Rome: Total War 1**

Possível sistema futuro:

- família governante;
- sucessão;
- filhos;
- casamentos;
- líderes;
- generais;
- morte;
- herdeiros.

Não projetar ainda.

---

# 2. Cerco

## Profundidade futura

Além do cerco básico:

- moral dos defensores;
- fome;
- doença;
- perdas graduais;
- deserção;
- eventos;
- rendição;
- chance de abrir portões;
- efeitos de siege;
- escolha de assalto;
- duração baseada em muralha.

---

## Máquinas de cerco

Relacionadas ao futuro tipo de tropa `siege`.

Possibilidades:

- aríetes;
- torres;
- catapultas;
- outros coerentes com período e gameplay.

Não implementar antes do sistema básico de tropas.

---

# 3. Economia

## Comércio internacional

Direção já definida:

- depende de tratado/permissão;
- funciona automaticamente;
- jogador não escolhe manualmente produtos numa negociação;
- mercado procura oferta e demanda;
- dinheiro é intermediário;
- sem dinheiro, importação para;
- conexão válida é necessária.

Futuro aprofundamento:

- oferta e demanda;
- preços variáveis;
- rotas;
- bloqueios;
- custos de transporte;
- mercado regional.

---

## Oferta e demanda

Não implementar inicialmente.

Futuramente:

- excesso reduz preço;
- escassez aumenta preço;
- consumo influencia demanda;
- guerra pode alterar preços;
- bloqueios podem gerar escassez.

Manter simples.

---

## Preços regionais

Preço-base global inicialmente.

Futuramente regiões podem ter variações.

Só implementar se trouxer decisão real de gameplay.

---

## Estoque limitado

No 0.0.2, estoque pode ser ilimitado.

Problema futuro:

estoque infinito pode quebrar o late game.

Possíveis soluções:

- capacidade-base por província;
- Celeiro aumenta capacidade;
- diferentes limites por recurso;
- deterioração;
- custo de armazenamento.

---

## Deterioração avançada

Alimentos já devem deteriorar.

Futuramente avaliar:

- taxas diferentes;
- clima;
- Celeiro;
- eventos;
- cerco.

---

## Recursos para construções

Hoje construções usam dinheiro.

Futuramente avaliar uso de:

- madeira;
- pedra/mármore;
- ferro;
- outros.

Exemplo:

`Muralha = moedas + pedra + madeira`

Não implementar sem necessidade.

---

## Recursos para recrutamento

Possibilidade discutida e NÃO escolhida por enquanto.

Exemplos futuros:

- comida;
- ferro;
- cavalos.

Reavaliar somente se trouxer gameplay melhor.

---

## Logística militar

Futuro:

- hostes consomem comida;
- campanhas longas exigem abastecimento;
- falta de suprimento reduz força/moral;
- cercos consomem estoques;
- linhas de abastecimento.

Direção desejada, mas deve permanecer simples.

---

# 4. População

## Migração

Não implementar agora.

Futuramente:

- fome gera êxodo;
- cidades ricas atraem população;
- guerra desloca população;
- capital pode atrair moradores;
- regiões inseguras perdem população.

---

## Nacionalidade

Base já prevista no 0.0.2.

Aprofundamentos futuros:

- assimilação;
- políticas;
- revoltas nacionais;
- mudanças demográficas;
- colonização.

Não criar grupos culturais complexos por enquanto.

---

## Crescimento populacional avançado

Futuramente avaliar efeitos de:

- prosperidade;
- segurança;
- guerra;
- infraestrutura;
- doenças;
- migração.

Evitar fórmulas excessivamente opacas.

---

# 5. Felicidade e revoltas

## Revoltas

Base:

- felicidade muito baixa gera risco;
- revolta tenta restaurar poder local;
- se não for possível, cria poder rebelde.

Futuro:

- força da revolta baseada em população;
- apoio externo;
- repressão;
- autonomia;
- eventos;
- líderes rebeldes.

---

## Presença militar

Futuramente decidir se tropas:

- aumentam ordem;
- reduzem felicidade;
- fazem ambos dependendo da situação.

---

# 6. Administração

## Ineficiência administrativa

Direção:

- distância da capital;
- tamanho do território;
- felicidade baixa;
- governadores futuros.

Possíveis efeitos:

- menor arrecadação;
- pior comércio interno;
- maior risco de revolta.

Evitar uma barra explícita de corrupção inicialmente.

---

## Governadores

Sistema futuro.

Possibilidades:

- administrar províncias;
- reduzir ineficiência;
- aumentar impostos;
- melhorar felicidade;
- possuir características próprias;
- participar do sistema de personagens/family tree.

---

## Tamanho do império

Futuramente, territórios muito grandes podem gerar:

- maior ineficiência;
- dificuldade administrativa;
- maior risco de revolta;
- necessidade de infraestrutura.

Não aplicar penalidades arbitrárias sem uma razão clara.

---

# 7. Capitais

## Capital como centro administrativo

Base prevista no 0.0.2.

Futuro:

- distância impacta administração;
- comércio interno;
- governadores;
- revoltas;
- infraestrutura.

---

## Captura da capital

Base:

- jogador deve escolher uma nova.

Futuro:

- impacto de felicidade;
- prestígio;
- moral;
- diplomacia;
- saque maior.

---

# 8. Construções

## Novas construções

O sistema terá apenas 4 slots por província.

Isso permite adicionar novas construções futuras sem permitir que toda cidade tenha tudo.

Possíveis futuras construções:

- Porto avançado;
- Estradas;
- Templo, caso exista função real;
- infraestrutura administrativa;
- edifícios militares;
- edifícios comerciais;
- edifícios especializados em recursos.

Só adicionar construção se ela criar decisão de gameplay clara.

---

## Estradas

Futuro:

- aumentar movimento terrestre;
- melhorar comércio interno;
- reduzir ineficiência administrativa;
- talvez níveis I / II / III.

---

## Porto

Base mínima deve existir no 0.0.2 para conexão marítima.

Futuro:

- níveis;
- comércio;
- capacidade naval;
- construção de navios;
- bloqueio;
- defesa naval.

---

## Danos em construções

Futuro:

- conquista pode danificar;
- assalto pode destruir;
- saque pode destruir;
- reparo pode custar dinheiro/recursos.

---

# 9. Naval

Não implementar antes da base terrestre estar estável.

Direção desejada:

- zonas marítimas;
- frotas;
- movimento entre zonas;
- portos;
- bloqueios;
- transporte;
- comércio marítimo.

Evitar teleport entre portos.

---

## Bloqueios

Futuro:

- cortam comércio marítimo;
- cortam alimentação importada;
- reduzem renda;
- afetam cerco de cidades costeiras.

---

# 10. Diplomacia

Não implementar antes da IA mínima.

Possíveis sistemas:

- guerra;
- paz;
- tratado comercial;
- aliança;
- acesso militar;
- tributação;
- vassalagem;
- garantias;
- relações.

Começar sempre pelo mínimo necessário.

---

## Tratados comerciais

Direção:

- tratado libera os mercados;
- comércio acontece automaticamente;
- jogador não escolhe produto por produto.

---

# 11. IA

Provável foco do próximo patch, cuja versão ainda não foi definida.

IA mínima deve inicialmente:

- entender território;
- entender tesouro;
- entender população;
- recrutar;
- formar hostes;
- escolher alvo;
- marchar;
- lutar;
- cercar;
- conquistar.

Não começar com:

- personalidade complexa;
- comportamento histórico;
- cheats;
- estratégias diplomáticas avançadas.

---

## IA avançada

Futuro:

- personalidades;
- agressividade;
- cautela;
- prioridades econômicas;
- expansão;
- defesa;
- planejamento de longo prazo;
- diplomacia;
- comércio;
- comportamento por líder.

---

# 12. Mundo

## Expansão dos recursos para o mapa completo

Hoje apenas 5 de 205 províncias possuem economia/recurso configurado:

- Atenas;
- Maratona;
- Sunião;
- Elêusis;
- Tanagra.

As outras 200 ainda precisam receber dados econômicos futuramente, depois que o modelo for
validado na região de teste.

Para cada província configurada no futuro:

- definir recurso principal;
- definir recurso secundário mais fraco;
- população;
- estoque;
- nacionalidades;
- construções e demais dados mínimos.

Regra:

- principal forte;
- secundário bem menor.

---

## Dados econômicos do mapa completo

Não necessário para fechar 0.0.2.

Depois do modelo ser validado na região de teste:

- expandir população;
- recursos;
- estoques;
- capitais;
- nacionalidades;
- felicidade;
- construções;
- economia.

Priorizar plausibilidade de gameplay em vez de falsa precisão histórica.

---

## Classificação territorial

Não criar tipos de província sem função.

Se futuramente surgir necessidade concreta, avaliar:

- ilha;
- costeira;
- interior;
- cidade importante;
- outros.

---

# 13. Interface

## Painel econômico

Futuro:

- alimento agregado;
- tooltip detalhando produtos;
- estoques;
- produção;
- consumo;
- excedente;
- déficit;
- conexão.

---

## Painel de felicidade

Mostrar categoria clara.

Evitar despejar fórmulas no jogador.

Possível tooltip:

- imposto: -X
- comida: +X
- conquista recente: -X
- nacionalidade: -X
- prosperidade: +X

---

## Painel de batalha

Alta prioridade após matemática estabilizada.

Ver seção Combate.

---

## Mensagens de turno

Futuro:

- capital perdida;
- fome;
- revolta;
- construção concluída;
- cerco;
- comércio interrompido;
- eventos importantes.

Evitar spam.

---

# 14. Histórico e atmosfera

## Eventos

Futuro:

- eventos políticos;
- econômicos;
- militares;
- familiares;
- históricos.

Não criar antes do loop básico estar estável.

---

## Identidade dos poderes

Futuro:

- características próprias;
- líderes;
- famílias;
- comportamento;
- possíveis vantagens.

Evitar bônus arbitrários sem contexto.

---

# 15. Vitória e derrota

Ainda não definida completamente.

Futuramente decidir:

- conquista total;
- objetivos;
- hegemonia;
- pontuação;
- sobrevivência;
- cenários.

Não bloquear fundação por isso agora.

---

# 16. Save / Load

Sistema necessário antes de campanha longa.

Possível patch futuro antes ou depois de IA, dependendo da necessidade.

Deve salvar o estado mutável da campanha.

Incluir futuramente:

- versão do save;
- validação;
- incompatibilidade segura;
- autosave;
- slots.

---

# 17. Prioridade aproximada do backlog

Esta ordem NÃO representa patches fixos.

## Próximos sistemas mais importantes

1. Fechar 0.0.2
2. IA mínima
3. Save/Load
4. Diplomacia mínima
5. Combate visual / aprofundamento militar
6. Comércio internacional
7. Naval
8. Administração avançada
9. Personagens / líderes / family tree

A ordem pode mudar conforme testes reais do jogo.

---

# 18. Regra de entrada no backlog

Quando surgir uma ideia:

### Se for necessária para o patch atual

Ela pode virar tarefa do patch.

### Se não for necessária

Adicionar aqui.

Toda entrada deve responder, quando possível:

- qual problema resolve;
- qual direção desejada;
- por que não entra agora.

---

# 19. Regra de saída do backlog

Uma ideia só sai deste arquivo quando:

1. Henrique decidir que ela será trabalhada;
2. ela receber escopo;
3. ela entrar em um `PATCH_ATUAL.md`.

Nenhum agente deve implementar itens deste backlog apenas porque parecem interessantes.
