# DECISOES.md

# Age of Grecce — Registro de Decisões

Este arquivo registra decisões de design, arquitetura e direção já tomadas para o Age of
Grecce.

Objetivo:

- preservar contexto;
- evitar retrabalho;
- impedir que decisões importantes sejam desfeitas sem discussão;
- dar a Claude, Codex e futuros agentes uma fonte clara sobre **por que** o jogo funciona
  de determinada forma.

Regra:

> Uma decisão registrada aqui não deve ser alterada silenciosamente.

Se surgir motivo para mudar uma decisão:

1. registrar o problema;
2. discutir a mudança;
3. atualizar este arquivo;
4. só depois alterar a implementação.

---

# 1. Estrutura do mundo

## Atlas é imutável

O Atlas representa dados permanentes do mundo.

Exemplos:

- identidade da província;
- posição;
- vizinhança;
- dados geográficos;
- poder inicial;
- informações históricas de base.

O Atlas NÃO deve guardar o estado mutável da campanha.

## Campanha é mutável

A campanha guarda o estado atual da partida.

Exemplos:

- dono atual das províncias;
- população atual;
- estoque;
- felicidade;
- hostes;
- construções;
- cerco;
- capital atual;
- tesouro.

Motivo:

Evitar mistura entre dado histórico/base e estado da partida.

---

# 2. Proprietário atual da província

A posse territorial deve existir na campanha.

Conquista altera o estado da campanha, não os dados originais do mapa.

Um poder pode perder todas as províncias sem necessariamente desaparecer imediatamente se
ainda possuir hostes.

---

# 3. Exílio

Um poder continua existindo enquanto ainda possuir presença militar relevante, mesmo sem
território.

Objetivo:

Permitir:

- reconquista;
- histórias emergentes;
- eliminação menos artificial.

Sem território, o poder perde capacidade econômica e tende a desaparecer naturalmente se
não conseguir se recuperar.

---

# 4. População é recurso real

População não é apenas decoração.

Ela deve participar de múltiplos sistemas:

- impostos;
- produção;
- recrutamento;
- milícia;
- alimentação;
- crescimento.

Quando soldados são recrutados, eles saem da população.

Mortes militares continuam representando perda real daquela população já retirada.

---

# 5. Origem dos soldados

Manter a origem provincial dos soldados.

Exemplo conceitual:

- 700 homens de Atenas;
- 300 homens de Maratona.

Motivos:

- consistência populacional;
- retorno de desertores;
- bônus futuros de Quartel;
- rastreabilidade militar;
- futuras características provinciais.

Não substituir isso por uma força militar genérica sem origem.

---

# 6. Hostes possuem identidade própria

A direção atual é que hostes tenham IDs próprios.

Motivos:

- permitir múltiplas hostes;
- facilitar cerco;
- facilitar movimento;
- permitir referência estável;
- evitar acoplamento excessivo entre "hoste" e "província".

Essa estrutura deve ser estabilizada antes da IA.

---

# 7. Movimento por ordens

Movimento não acontece imediatamente no clique.

O jogador cria uma ordem de marcha.

A ordem é resolvida durante o turno.

Motivo:

Permitir:

- resolução simultânea;
- IA tomando decisões sobre o mesmo estado;
- encontros na estrada;
- comportamento mais previsível.

---

# 8. Resolução simultânea

A ordem de processamento não deve dar vantagem artificial.

Movimentos devem ser resolvidos de forma determinística e simultânea por etapas.

Casos importantes:

- forças se cruzando;
- encontros em arestas;
- múltiplas batalhas no mesmo turno;
- chegada de sobreviventes depois de um encontro.

---

# 9. Combate atual é provisório

A matemática de combate atual existe para fechar o loop militar.

Ela NÃO representa o combate final do jogo.

O objetivo do 0.0.1 é:

- coerência;
- baixas;
- sobreviventes;
- conquista;
- integração com cerco e milícia;
- testes.

Não tratar a fórmula atual como decisão definitiva.

---

# 10. Combate futuro continua numérico

O Age of Grecce não deve virar um jogo de batalha tática em campo aberto.

Direção:

- batalha continua sendo simulação numérica;
- jogador acompanha visualmente;
- referência conceitual: Brasfoot;
- interação futura simples;
- nada de controle estilo Total War.

---

# 11. Tipos de tropas ficam para depois

Não entram no 0.0.1.

Direção futura inicial:

- Infantaria
- Cavalaria
- Arqueiros
- Siege

O jogador deverá poder escolher o que recrutar.

---

# 12. Número de soldados não será o único fator

No combate futuro, quantidade deve importar, mas não dominar tudo.

Outros fatores previstos:

- qualidade;
- tipo de tropa;
- Quartel;
- moral;
- líderes;
- terreno;
- situação da batalha.

Uma força menor poderá derrotar uma maior em certas circunstâncias, mas superioridade
numérica extrema ainda deve pesar muito.

---

# 13. Moral e retirada são futuras

Direção desejada:

- batalha reduz moral;
- quando moral quebra, tropas fogem;
- perdedor não precisa ser exterminado;
- sobreviventes recuam.

Isso será aprofundado em patch futuro.

---

# 14. Generais e family tree são futuros

Há interesse em:

- líderes;
- personagens;
- comandantes;
- family tree inspirado em Rome: Total War 1.

Ainda não existe design fechado.

Não implementar antes de uma especificação própria.

---

# 15. Terreno não entra no combate agora

Terreno pode ser importante no futuro.

Porém os dados atuais de relevo ainda não são confiáveis o suficiente para virarem regra
de gameplay.

Não usar relevo procedural como verdade histórica.

---

# 16. Naval não entra antes da base terrestre

O jogo deve fechar primeiro o mundo terrestre.

Direção futura:

- zonas marítimas;
- frotas;
- portos;
- bloqueios;
- transporte;
- comércio marítimo.

Evitar teleport automático entre portos.

---

# 17. Economia deve usar recursos físicos

Produtos não devem existir apenas para gerar dinheiro.

Eles devem ser recursos quantificáveis.

Exemplos:

- 100 grãos;
- 40 peixe;
- 25 madeira;
- 10 ferro.

Motivo:

Permitir futuramente:

- consumo;
- estoque;
- comércio;
- fome;
- cerco;
- logística;
- bloqueio.

---

# 18. Cada província terá dois recursos naturais iniciais

Direção:

- 1 recurso principal;
- 1 recurso secundário mais fraco.

Cadastrar somente os recursos que realmente existem naquela província.

Não cadastrar uma lista completa com vários zeros.

---

# 19. Potencial natural é fixo

O nível natural de um recurso representa a capacidade geográfica daquela região.

Ele não deve aumentar com investimento.

Exemplo:

Se uma província possui potencial 3 em ferro, ela continua sendo 3.

Construções podem aumentar a exploração, não a natureza.

---

# 20. Produção depende de população

Direção conceitual:

`produção = potencial natural × população produtiva × modificadores`

Uma província devastada populacionalmente deve produzir menos.

Não haverá microgerenciamento manual de trabalhadores.

Uma porcentagem da população total representa população produtiva.

---

# 21. Alimentos continuam individuais

Produtos alimentares podem ser:

- grãos;
- peixe;
- carne;
- outros.

Na interface, podem ser agregados como "Alimento".

Exemplo:

Alimento: 500

Tooltip:

- 300 grãos
- 120 peixe
- 80 carne

---

# 22. População consome alimento por turno

Cada turno representa aproximadamente um ano.

Toda população consome alimento.

Falta de comida deve ter consequências relevantes.

---

# 23. Comida modifica crescimento, não controla tudo

Direção:

- alimento suficiente → crescimento normal;
- excedente → pequeno bônus;
- escassez → crescimento menor;
- déficit → crescimento para e população cai;
- déficit severo → queda forte.

Comida não deve ser o único fator de crescimento.

---

# 24. Não usar capacidade máxima artificial de população

Remover a filosofia de limite fixo baseado em população inicial ×2.

O sistema deve ser controlado por mecanismos mais naturais:

- alimento;
- felicidade;
- economia;
- condições futuras.

Se um limite físico for necessário depois, criar uma solução específica.

---

# 25. Estoque é provincial

Cada província guarda seu próprio estoque.

O poder pode visualizar o total agregado.

Motivo:

Permitir:

- cerco;
- conquista;
- bloqueio;
- isolamento;
- logística.

---

# 26. Todos os recursos podem ser estocados

Não apenas comida.

Exemplos:

- grãos;
- peixe;
- madeira;
- ferro;
- mármore;
- produtos de luxo.

---

# 27. Estoque pode ser ilimitado no início

No 0.0.1, priorizar simplicidade.

Depois avaliar limites porque estoque infinito pode quebrar o late game.

---

# 28. Alimento deteriora

Comida armazenada deve perder parte do estoque ao longo do tempo.

A taxa será balanceada depois.

Celeiros devem ajudar a reduzir essa perda.

---

# 29. Mercado interno é automático

O jogador não deve transferir recursos manualmente entre províncias do mesmo poder.

Fluxo:

1. consumo local;
2. cobrir déficits internos;
3. estoque;
4. exportação futura.

Motivo:

Evitar microgerenciamento excessivo.

---

# 30. Mercado interno exige conexão

Recursos só circulam se houver conexão válida.

Pode ser:

- terrestre;
- marítima.

Ilhas isoladas não recebem recursos magicamente.

---

# 31. Capital tem prioridade alimentar

Em escassez:

- capital recebe prioridade;
- o restante é distribuído proporcionalmente à necessidade.

---

# 32. Comércio internacional será automático

No futuro:

- tratado/permissão abre o comércio;
- mercado encontra oferta e demanda;
- jogador não negocia produto por produto;
- dinheiro é intermediário;
- sem dinheiro, importação para.

---

# 33. Comércio internacional exige conexão

Não usar comércio abstrato atravessando qualquer território.

Direção:

- conexão própria por terra;
- ou conexão marítima válida.

Rotas mais avançadas podem vir depois.

---

# 34. Preço global fixo inicialmente

Cada recurso terá valor-base global.

Oferta e demanda ficam para depois.

Motivo:

Evitar complexidade prematura.

---

# 35. Dinheiro estatal continua existindo

Recursos físicos não substituem o tesouro.

Dinheiro serve para:

- construções;
- recrutamento;
- manutenção;
- comércio;
- outros gastos.

---

# 36. Impostos terão três níveis

Direção:

- Baixo
- Normal
- Alto

Efeitos:

Baixo:

- menos receita;
- mais felicidade.

Normal:

- equilíbrio.

Alto:

- mais receita;
- menos felicidade;
- mais pressão de revolta.

Evitar sliders muito detalhados.

---

# 37. Receita fiscal não será só população

Direção conceitual:

`receita fiscal = população × atividade econômica × taxa × eficiência`

Não expor fórmula completa ao jogador.

---

# 38. Conquista gera saque simples

Não existe tesouro provincial separado.

Ao conquistar uma província:

- ganhar aproximadamente uma renda daquela província;
- capturar estoque;
- perder parte do estoque durante ataque/conquista.

---

# 39. Felicidade existe por província

Internamente:

`0–100`

Na interface:

- Muito feliz
- Satisfeita
- Neutra
- Insatisfeita
- Revoltosa

---

# 40. Felicidade é influenciada por sistemas reais

Fatores previstos:

- imposto;
- alimentação;
- fome;
- conquista recente;
- nacionalidade;
- distância da capital;
- ineficiência;
- presença militar;
- construções;
- guerra;
- prosperidade.

Evitar bônus aleatórios sem contexto.

---

# 41. Nacionalidade pertence à população

Uma província pode possuir múltiplas nacionalidades.

Exemplo:

- 70% tebana;
- 20% ateniense;
- 10% outras.

Nacionalidade muda lentamente.

---

# 42. Nacionalidade diferente gera tensão

Se o governante controla uma população de outra nacionalidade, isso deve prejudicar
felicidade.

Não criar grupos culturais intermediários por enquanto.

Diferença já gera problema.

---

# 43. Migração fica para depois

População não precisa se mover entre províncias no 0.0.1.

Futuro possível:

- fome;
- guerra;
- prosperidade;
- capital;
- segurança.

---

# 44. Revolta vem depois de deterioração

Não deve ser instantânea.

Direção:

1. felicidade cai;
2. surgem penalidades;
3. risco de revolta aumenta;
4. eventualmente explode revolta.

---

# 45. Revolta tenta restaurar identidade local

Quando uma província se revolta:

1. tentar restaurar poder/nacionalidade local;
2. se não fizer sentido, criar novo poder rebelde.

---

# 46. População conquistada continua utilizável

Não criar bloqueios complexos.

Depois da conquista:

- população continua existindo;
- gera economia;
- pode ser recrutada;
- problemas aparecem principalmente em felicidade e nacionalidade.

---

# 47. Capital é obrigatória

Cada poder começa com uma capital.

Se ela cair:

- notificação no início do turno;
- jogador deve escolher outra;
- não pode continuar sem capital.

---

# 48. Capital é centro administrativo

A capital não precisa dar bônus artificial.

Ela serve como referência para sistemas futuros:

- ineficiência administrativa;
- revolta;
- comércio interno;
- governadores.

---

# 49. Corrupção não terá barra própria inicialmente

Usar conceito de **ineficiência administrativa**.

Fatores futuros:

- distância da capital;
- território grande;
- felicidade baixa;
- governador.

---

# 50. Portos são necessários para conexão marítima

Província costeira não ganha conexão marítima automaticamente.

Precisa de Porto.

Motivo:

Dar função real à construção.

---

# 51. Estradas devem existir futuramente

Possíveis efeitos:

- movimento;
- comércio interno;
- eficiência administrativa.

Não precisam estar completas no 0.0.1.

---

# 52. Construções têm slots

Cada província terá:

**4 slots de construção**

Motivo:

Criar especialização.

Não permitir que todas as cidades tenham tudo.

---

# 53. Construções possuem níveis

Direção:

- I
- II
- III

Máximo: III.

---

# 54. Não criar "Desenvolvimento 3/5"

Não haverá um número genérico de desenvolvimento por enquanto.

O desenvolvimento deve emergir de:

- população;
- construções;
- economia;
- felicidade;
- estoque;
- recursos.

---

# 55. Ágora é econômica e administrativa

Funções possíveis:

- atividade econômica;
- impostos;
- administração;
- felicidade.

Valores serão balanceados depois.

---

# 56. Mercado melhora circulação/comércio

Função:

- mercado interno;
- comércio futuro;
- eficiência comercial;
- renda derivada de atividade.

---

# 57. Oficina aumenta produção geral

Ela melhora exploração dos recursos.

Não altera potencial natural.

---

# 58. Celeiro passa a trabalhar com alimento

Funções:

- armazenamento;
- deterioração;
- resistência à fome.

O bônus antigo direto de crescimento deve ser revisto.

---

# 59. Quartel não bloqueia recrutamento

Uma província própria com população suficiente deve poder recrutar sem Quartel.

A existência ou não de economia configurada não deve funcionar como requisito conceitual
de recrutamento. Essa trava atual deve desaparecer conforme a economia for generalizada.

Quartel melhora qualidade dos soldados recrutados naquela província.

O valor exato não está definido.

---

# 60. Muralha melhora defesa real

Funções:

- milícia;
- assalto;
- cerco;
- resistência defensiva.

---

# 61. Construções podem sofrer dano

Conquista não destrói tudo automaticamente.

Futuramente:

- assalto;
- saque;
- guerra

podem danificar ou destruir construções.

---

# 62. Cerco deve conversar com economia

Durante cerco:

- comércio externo é cortado;
- produção cai muito;
- população continua consumindo;
- estoque cai;
- fome pode surgir.

Motivo:

Cerco deve funcionar através dos sistemas normais do jogo, não por um timer artificial
isolado.

---

# 63. Muralha altera regra de assalto e fortalece defesa

Muralha possui duas funções:

1. fortalecer a defesa/milícia no assalto;
2. impedir assalto imediato.

Direção inicial:

- sem muralha → assalto pode acontecer imediatamente;
- com muralha → período mínimo de cerco antes de assalto;
- quando o assalto ocorrer, a muralha continua dando vantagem defensiva.

Referência inicial:

**2 turnos de cerco**

Valores não são definitivos.

---

# 64. Milícia é defesa automática

Toda província pode levantar milícia.

Base:

- porcentagem da população;
- bônus defensivos.

Futuro:

- felicidade;
- muralha;
- outros fatores.

# 64A. Surtida faz parte do cerco-base

O defensor sitiado deve poder atacar o exército sitiador.

No 0.0.1, a surtida reutiliza o combate básico.

Não criar um subsistema tático separado.

Resultado principal:

- vitória defensiva quebra o cerco;
- derrota mantém o cerco e aplica as baixas normalmente.

---

# 65. Recursos não serão exigidos no recrutamento agora

Não exigir ferro, madeira etc. para criar tropas no 0.0.1.

Possibilidade futura permanece aberta.

---

# 66. Hostes podem consumir comida futuramente

Direção desejada para logística.

Objetivo:

- limitar campanhas enormes;
- criar valor para abastecimento;
- evitar estoque infinito inútil.

Não implementar antes de haver necessidade.

---

# 67. Uma região jogável basta para validar o 0.0.1

Não é necessário configurar as 205 províncias.

Primeiro validar o sistema completo em uma região de teste.

Depois escalar.

---

# 68. Dados devem priorizar plausibilidade de gameplay

População e economia não precisam fingir precisão histórica absoluta.

Objetivo:

- relações plausíveis;
- boa experiência;
- coerência histórica razoável.

---

# 69. Estoque inicial deve permitir teste

Na região de teste, valores iniciais devem permitir aproximadamente alguns turnos de
sobrevivência, referência inicial de cerca de 5 turnos.

O objetivo é permitir teste, não balanceamento final.

---

# 69A. Tesouro existe por poder

O estado da campanha deve armazenar tesouro para cada poder participante, não apenas para
o jogador.

Motivo:

IA precisa recrutar, manter tropas, construir e comerciar pelas mesmas regras do jogador.

Consequências:

- manutenção é cobrada por poder;
- recrutamento consome o tesouro do poder;
- receitas entram no tesouro do poder;
- IA não recebe economia gratuita.

Isso é pré-requisito estrutural para a IA.

---

# 70. IA só começa depois do 0.0.1

A IA depende de:

- mundo;
- economia;
- guerra.

Portanto esses contratos precisam estar minimamente estáveis primeiro.

Não iniciar IA por conveniência enquanto a fundação ainda muda.

---

# 71. IA deve usar as mesmas regras do jogador

Direção:

- sem recursos mágicos;
- sem tropas mágicas;
- sem movimento mágico;
- sem visão especial sem motivo.

Dificuldade artificial pode ser discutida depois, mas não é a base.

---

# 72. Claude é agente principal do patch

Fluxo decidido:

Claude:

- implementação principal;
- execução sequencial do patch;
- testes;
- atualização de status.

Codex:

- tarefas manuais;
- revisão;
- bugs;
- UI;
- pequenos ajustes;
- auditoria.

---

# 73. Codex não deve competir com Claude

Enquanto Claude estiver responsável por um módulo:

- Codex não deve mexer silenciosamente nos mesmos arquivos;
- tarefas paralelas devem ser isoladas;
- alterações conflitantes devem ser coordenadas.

---

# 74. Próximo patch não começa automaticamente

Mesmo que o patch atual esteja tecnicamente concluído:

- agente para;
- testes são revisados;
- Henrique joga;
- Henrique aprova;
- só então a próxima versão é planejada.

---

# 75. Ideias futuras vão para o backlog

Nova ideia não deve sequestrar o patch atual.

Pergunta obrigatória:

> Isso é necessário para concluir o patch atual?

Se não:

- registrar no backlog;
- continuar o trabalho.

---

# 76. Hierarquia de verdade do projeto

Quando houver divergência:

1. código atual;
2. testes atuais;
3. decisões registradas;
4. documentação recente;
5. documentação antiga.

Documentos antigos podem estar desatualizados.

---

# 77. Alterações estruturais exigem aviso

Agentes não devem realizar grandes refatorações não solicitadas só porque parecem "mais
limpas".

Antes de alterar estrutura central:

- explicar o problema;
- propor mudança;
- avaliar impacto;
- atualizar decisão se aprovada.

---

# 78. Simplicidade é uma regra do projeto

O Age of Grecce pode ser profundo sem ser excessivamente complexo.

Evitar sistemas que exigem:

- microgerenciamento excessivo;
- muitas barras;
- muitas exceções;
- fórmulas opacas;
- ações repetitivas.

Sempre buscar:

> maior consequência de gameplay com menor complexidade necessária.
