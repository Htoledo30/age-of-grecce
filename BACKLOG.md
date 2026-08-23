# BACKLOG.md

# Age of Grecce — Backlog

Este arquivo contém aprofundamentos e ideias futuras.

**Estar aqui não autoriza implementação.**

Se algo já aparece num patch futuro do `ROADMAP.md`, ainda assim só pode ser implementado quando aquele patch virar `PATCH_ATUAL.md`.

---

# Combate futuro

## Resolução iterativa

O visor inicial pode apenas reproduzir visualmente um resultado já calculado.

No futuro, uma resolução realmente iterativa poderá permitir:

- moral mudando durante a luta;
- retirada;
- decisões durante a batalha;
- eventos de combate.

## Moral

- moral por lado;
- quebra de moral;
- fuga;
- sobreviventes recuando para território amigo.

## Retirada

- retirada automática por moral;
- retirada manual futura;
- possíveis perdas durante retirada.

## Tipos de tropas

Direção inicial discutida:

- infantaria;
- cavalaria;
- arqueiros;
- tropas/máquinas de cerco.

Quantidade não deve ser o único fator de força.

## Qualidade militar

Pode ser derivada de:

- Quartel;
- experiência futura;
- líder;
- moral;
- outros modificadores coerentes.

Evitar barra extra sem necessidade.

## Aleatoriedade controlada

Introduzir variação suficiente para evitar resultados totalmente óbvios, preservando entendimento e testes determinísticos por seed.

## Terreno

Futuro:

- planície;
- montanha;
- rio;
- floresta;
- outros somente quando dados geográficos forem confiáveis.

## Generais e líderes

Sistema futuro de comandantes/personagens.

## Family Tree

Referência desejada: **Rome: Total War 1**.

Possibilidades futuras:

- família governante;
- sucessão;
- filhos;
- casamentos;
- herdeiros;
- generais;
- morte.

Ainda não especificar em detalhe.

---

# Cerco futuro

Aprofundamentos possíveis:

- moral de defensores;
- doença;
- deserção;
- rendição;
- eventos;
- máquinas de cerco;
- aríetes;
- torres;
- catapultas.

A surtida e a regra básica de muralha pertencem à base, não a este aprofundamento.

---

# Economia futura

## Comércio internacional

Direção já decidida:

- exige tratado/permissão;
- tratado abre mercados;
- comércio é automático;
- dinheiro é intermediário;
- sem dinheiro, importação para;
- conexão válida é obrigatória;
- receita de exportação entra no tesouro estatal;
- bloqueios futuros podem cortar comércio e abastecimento marítimo.

## Oferta e demanda

Futuro:

- excesso reduz preço;
- escassez aumenta preço;
- guerra/bloqueio alteram disponibilidade.

Preço-base global deve ser suficiente inicialmente.

## Estoque limitado

Estoque ilimitado pode ser aceito na primeira versão do sistema físico.

Reavaliar depois:

- capacidade;
- Celeiro;
- limites por produto;
- custos;
- deterioração.

## Recursos em construções

Hoje a direção imediata é dinheiro.

Futuramente avaliar madeira, pedra, ferro etc. como custos físicos de construção.

## Recursos em recrutamento

Foi discutido e não escolhido para a base.

Reavaliar somente se melhorar gameplay.

## Logística militar

Futuro desejado:

- hostes consumindo alimento;
- linhas de abastecimento;
- falta de suprimento afetando campanha;
- bloqueios cortando suprimento.

Manter simples quando chegar a hora.

---

# População e política futura

## Migração

Possíveis causas:

- fome;
- prosperidade;
- guerra;
- segurança;
- atração de centros importantes.

## Revoltas

Direção:

- primeiro penalidades;
- felicidade baixa persistente aumenta risco;
- revolta tenta restaurar poder local/original quando fizer sentido;
- caso contrário pode criar poder rebelde.

Aprofundar depois:

- força rebelde;
- repressão;
- autonomia;
- apoio externo;
- líderes rebeldes.

## Administração

Não criar barra explícita de corrupção.

Futuro pode usar **ineficiência administrativa** influenciada por:

- distância da capital;
- tamanho do território;
- felicidade;
- governadores.

Referência conceitual discutida: distância da capital em **Rome: Total War 1**, adaptada de forma simples.

## Governadores

Futuro, possivelmente ligado a personagens/family tree.

---

# Infraestrutura futura

## Estradas

Possíveis efeitos:

- movimento;
- mercado interno;
- eficiência administrativa.

## Portos avançados

A base econômica usa Porto como requisito de conexão marítima.

Aprofundamentos futuros:

- níveis;
- comércio;
- construção naval;
- bloqueios;
- defesa.

## Danos em construções

Construções normalmente sobrevivem à conquista, mas futuramente assalto/saque pode danificar ou destruir algumas delas.

---

# Naval

Não implementar antes da base terrestre e da IA mínima.

Direção futura:

- zonas marítimas;
- frotas;
- movimento entre zonas;
- transporte;
- bloqueios;
- guerra naval;
- comércio marítimo.

Não usar teleporte abstrato entre portos.

---

# Diplomacia

Não implementar antes da IA mínima. Depois disso, começar somente quando houver necessidade clara.

Possibilidades:

- guerra;
- paz;
- tratado comercial;
- aliança;
- acesso militar;
- tributo;
- vassalagem;
- garantias;
- relações.

Tratado comercial deve liberar mercados, não criar barter manual produto por produto.

---

# IA

Planejar em patch `0.0.x` próprio quando a base necessária estiver estável. A IA mínima é parte do caminho para o `0.1.0`.

IA mínima futura deve usar as mesmas regras do jogador e poder, progressivamente:

- entender território;
- entender tesouro/população;
- recrutar;
- formar hostes;
- mover;
- escolher alvos;
- lutar;
- cercar;
- conquistar.

Não começar com:

- cheats econômicos;
- personalidade complexa;
- comportamento histórico detalhado;
- diplomacia avançada.

---

# Campanha

Itens que devem continuar separados em patches próprios:

- save/load;
- vitória;
- derrota;
- seleção/início de campanha mais completo.

Os quatro primeiros fazem parte do caminho para o `0.1.0`.

Outros aprofundamentos continuam futuros:

- mensagens/eventos de campanha;
- expansão dos dados para as 205 províncias.

A região de teste deve validar o modelo antes de preencher o mapa inteiro.

---

# Mundo completo

Hoje a validação econômica usa cinco províncias:

- Atenas;
- Maratona;
- Sunião;
- Elêusis;
- Tanagra.

Depois que cada sistema estiver validado nessa região, expandir gradualmente para as demais províncias.

Priorizar plausibilidade relativa e gameplay em vez de falsa precisão histórica.
