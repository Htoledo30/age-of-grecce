# Salvamento e realce de reino

## Situação: a fazer

Duas peças pequenas e independentes, herdadas do plano do esqueleto de campanha. O resto
daquele plano ou foi implementado ou foi descartado, e o documento original foi removido —
o que valia está aqui, corrigido para os módulos que existem hoje.

⚠️ **O `CLAUDE.md` já afirmou que o realce de reino estava implementado. Não estava.** Não
existe `realcar` em lugar nenhum do código. Se você está lendo isto para saber o que falta,
esta é a resposta.

---

## 1. Realce de reino: o byte de alfa da paleta

### O achado que torna isto barato

A paleta 256×256 de `src/mapa/provincias-mapa.ts` escreve alfa 255 e o chuveirinho lê só
`.rgb`. **O byte de alfa está livre**, e ele vira o *nível de realce* da província:

| nível | quem |
| ---: | --- |
| `1,00` | o reino da província **selecionada**, de qualquer poder |
| `0,35` | o reino do **jogador**, levemente aceso depois que a campanha começa |
| `0,00` | ninguém |

Nível contínuo, e não enumeração: quando o jogador seleciona uma província própria, 1,0
vence por construção, sem tabela de prioridade. Custo: **um byte por província e um envio
de textura por mudança de seleção.** Nenhuma textura nova, nenhuma geometria nova.

### Por que vale a pena

É o realce que faz o **mapa-como-menu** funcionar. Com 148 poderes, uma lista seria pior:
clicar em Egina acende um ponto, clicar em Sardes acende seis províncias. Dá para **ver** o
que se vai jogar antes de escolher.

### O que muda no chuveirinho

A leitura da paleta passa a trazer o alfa, e as duas linhas que montam `corBase`/`alfaBase`
viram:

```glsl
vec4 tinta = texture(uPaleta, (meus + 0.5) / 256.0);
vec3 cor = tinta.rgb;
float realce = tinta.a;
...
vec3 corBase = mix(cor, uCorRealce.rgb, realce * uCorRealce.a);
corBase = mix(corBase, uCorSelecao.rgb, destacada * 0.5);
float alfaBase = max(uOpacidade, max(realce * uCorRealce.a, destacada * uCorSelecao.a));
```

O realce carrega **cobertura própria** pelo mesmo `max(uOpacidade, …)` que a seleção já usa
— é isso que o mantém visível **com as cores dos reinos desligadas**, que é justamente
quando ele mais importa. Nada abaixo dessa linha muda: fronteira, litoral e
pré-multiplicação da saída ficam como estão.

### As duas armadilhas

⚠️ **`escreverNaPaleta` escreve `this.paleta[base + 3] = 255`. Essa linha tem que sair** —
senão o mapa inteiro nasce permanentemente realçado, e vai parecer bug de chuveirinho por
uma hora.

⚠️ **`alphaMode: 'no-premultiply-alpha'` na fonte da paleta passa a ser estrutural.** Se
alguém trocar para pré-multiplicado, escrever alfa 0 zera o RGB e todo reino não realçado
fica preto.

### API nova

```ts
// src/mapa/provincias-mapa.ts
realcar(niveis: ReadonlyMap<string, number>): void;   // o que faltar volta a zero
```

Com repasse fino em `CenaMapa`, no estilo do `pintarDonos` que já existe.

**Já está pronto e não precisa ser refeito:** `pintarDonos`, a flag `paletaSuja` drenada uma
vez por quadro em `CenaMapa.atualizar`, e as chaves de cor em `dados/ajustes.json` seguem o
padrão do bloco `provincias`. Faltam `corRealce`, `forcaRealce` e `realceProprio`.

### Como conferir

`npm run capturar -- realce --visivel`, apontando a câmera para Sardes e para Egina. É
puramente visual e independente das regras.

---

## 2. Salvamento

### A regra que sustenta tudo

> **`campanha.estado` é exatamente o que vai pro disco.** `JSON.stringify(estado)` é o
> salvamento. O que não está nele é, por definição, efêmero.

Essa disciplina foi mantida desde o começo, e é o que faz esta fatia ser barata: não há
caça a estado escondido. Hoje o estado tem jogador, ano, turno, tesouro, **dono das 205
províncias**, população, exércitos, levas em formação, ordens, cercos, investimentos,
construções e obras.

### Onde mora

`src/campanha/salvamento.ts`, recebendo um `Armazem { getItem, setItem, removeItem }`
**injetado**. `window.localStorage` satisfaz estruturalmente, e o vitest injeta um falso com
`Map` — **sem acrescentar jsdom ao projeto**, que é o que mantém os testes rodando em Node.

Chave `age-of-grecce:campanha:1`, **versionada na chave**, para que subir o esquema não
consiga sequer ler bytes velhos.

### Os três portões da leitura, nesta ordem

1. `JSON.parse`
2. **Zod** — reaproveitando o `validar()` de `src/dados/carregar.ts`, que hoje é privado do
   módulo e precisa ser exportado, para manter a mensagem padrão
   `arquivo inválido:\n  campo.caminho: mensagem`
3. **`conferirCoerencia`** — o que o Zod estruturalmente não sabe: a impressão digital do
   recorte, todo id de província e de poder existe, os 205 donos estão lá, `jogador` é um
   poder real

`Atlas.impressaoDigital` **já existe** e devolve `{ epoca, provincias, poderes }`. Ela entra
no estado gravado e é conferida na leitura.

⚠️ **Guardar os 205 donos, não um diff contra o assado.** O diff é menor e é armadilha: com
o `provincias.json` reassado com uma fronteira movida, ele mistura dois recortes em silêncio
e a partida segue rodando errada. A tabela cheia falha alto. *(Esta regra já está
implementada no estado; vale repetir aqui porque o salvamento é onde ela é cobrada.)*

### Alto, mas não fatal

`carregarCampanha()` estoura com o caminho do campo; `main.ts` captura, imprime inteiro no
console, começa campanha nova, e a interface diz `A campanha salva não pôde ser lida.`
**Salvamento corrompido não pode brickar o executável.**

Salvamento automático a cada virada de turno, com `setItem` em try/catch: cota estourada ou
aba anônima avisa e segue, nunca estoura dentro do laço.

### Como testar

Unidade, sem navegador:

- ida e volta iguais;
- poder inexistente no `dono` estoura com o caminho do campo;
- `recorte.epoca` diferente é recusado;
- província faltando é recusada;
- lixo não-JSON é recusado.

Tela: começar como Atenas, passar o turno, **`page.reload()` e a barra ainda diz o mesmo
ano e o mesmo número de províncias** — é o passo que prova a fatia de ponta a ponta.

---

## Fora destas duas peças

Este documento não redesenha movimento, batalha ou cerco, que já existem, nem inclui IA,
diplomacia ou o mar. Ver [Combate, exército e o mar](../design/combate-e-mar.md).
