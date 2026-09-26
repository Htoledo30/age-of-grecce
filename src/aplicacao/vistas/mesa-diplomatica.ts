/**
 * A MESA: o que a janela de diplomacia mostra, montado a partir da campanha e da IA.
 *
 * ⚠️ **A tela antiga era um dossiê sobre um ALVO, e essa era a queixa.** Ela dizia o nome do
 * vizinho, o exército dele e onde ele encosta na sua fronteira — três dados que descrevem uma
 * presa, não uma contraparte. E toda ação era uma aposta: o jogador apertava o botão para
 * descobrir a resposta depois, numa linha de texto. Isso não é negociar, é tentar.
 *
 * A mesa nova nasceu de olhar como os outros jogos resolvem a mesma tela, e o que se pegou de
 * cada um está escrito onde foi usado. As quatro decisões que mudaram tudo:
 *
 * 1. **Dois cartões espelhados** — você de um lado, ele do outro, na mesma moldura. É a mesa
 *    de negociação sem desenhar uma mesa, e sem uma linha de arte nova.
 * 2. **A resposta ANTES do clique**, em cada botão, pela mesma função que a IA usa quando
 *    decide de verdade. Ver `vontade-do-vizinho.ts`.
 * 3. **Dois números para a opinião** — onde ela está e para onde caminha. O jogo já calculava
 *    os dois desde o primeiro dia e a tela mostrava um só.
 * 4. **Ele tem vida própria**: temperamento, palavra empenhada, guerras e acordos com
 *    terceiros, e uma lista das SUAS províncias que ele considera que valem a marcha.
 */

import type { Jogo } from '../contexto';
import type {
  BrasaoNaMesa,
  CartaoDoPoder,
  GrupoDaMesa,
  Proposta,
  VistaDaDiplomacia,
  VizinhoNaMesa,
} from '@/ui/diplomacia-vista';
import {
  type PrazoComBalanca,
  intencaoDe,
  linhaDeAtaqueDe,
  ouroQueCobre,
  prazosDeAliancaComResposta,
  prazosDePactoComResposta,
  prazosDePazComResposta,
  prazosQueElePagaComResposta,
  prazosQuePagoComResposta,
  respostaALiga,
  respostaAoComercio,
  respostaAPaz,
  semSaida,
} from './vontade-do-vizinho';
import { posturaDaRelacao, retratoDe } from './retrato-do-vizinho';

/**
 * A diplomacia: com quem o jogador faz fronteira, e o que ele é de cada um.
 *
 * ⚠️ **Os 18 com ficha, e não os 139 do mapa.** Uma lista com todos seria um catálogo onde o
 * jogador procura um nome em vez de decidir — a mesma resposta que Age of History 3 deu ao ter
 * 3.665 civilizações: nunca mostrar "todas", mostrar o balde relevante. Mas o balde certo é o
 * dos poderes que arrecadam e decidem, e não o dos que encostam na sua cerca: prender a mesa à
 * fronteira deixava o jogador com 2 parceiros de comércio enquanto a IA negociava com 17.
 */
export function vistaDaDiplomacia(jogo: Jogo): VistaDaDiplomacia {
  const { campanha } = jogo;
  const jogador = campanha.jogador;
  const vazio: CartaoDoPoder = {
    nome: '',
    tesouro: 0,
    aliados: [],
    inimigos: [],
    comercio: [],
    linha: '',
    provincias: 0,
    exercito: 0,
    capital: '',
    palavra: '',
    reputacao: 0,
  };
  if (!jogador) {
    return {
      eu: vazio,
      meuBrasao: { id: '', nome: '', cor: '#000000' },
      ano: campanha.ano,
      turno: campanha.turno,
      vizinhos: [],
    };
  }

  const minhas = new Set(campanha.provinciasDe(jogador.id));
  const fronteiras = new Map<string, string[]>();
  for (const minha of [...minhas].sort()) {
    for (const vizinha of campanha.vizinhasDe(minha)) {
      if (minhas.has(vizinha)) continue;
      const dono = campanha.donoDe(vizinha);
      if (dono === jogador.id) continue;
      const lista = fronteiras.get(dono) ?? [];
      lista.push(campanha.nomeDe(vizinha));
      fronteiras.set(dono, lista);
    }
  }

  // ⚠️ **A mesa deixou de ser só a vizinhança.** Henrique: *"temos que quebrar a ideia que
  // só posso guerrear com quem faz fronteira, não faz sentido isso"* — e ele está certo pela
  // própria história: Atenas guerreou com Siracusa e com a Pérsia, não com o vizinho de muro.
  //
  // A regra NUNCA exigiu fronteira: `podeDeclararGuerra` só olha pacto, trégua e tributo.
  // Quem prendia o jogador era esta lista, e o efeito medido foi cruel — ele alcançava 2
  // parceiros de comércio enquanto a IA, que não passa por tela nenhuma, alcançava 17.
  //
  // ⚠️ **Os 18 com ficha, e não os 139 do mapa.** O balde continua sendo um balde: quem não
  // arrecada nem decide não tem opinião para negociar. A lista põe a fronteira primeiro,
  // porque é dela que sai a decisão mais urgente.
  const naMesaComigo = campanha
    .poderesComFicha()
    .filter((id) => id !== jogador.id && campanha.vivo(id));
  // A régua da barrinha da lista: o maior peso do mapa, incluindo o seu. Uma régua só para as
  // dezessete linhas — comparar cada uma com você daria dezessete réguas diferentes.
  const maiorPeso = Math.max(1, ...[jogador.id, ...naMesaComigo].map((id) => pesoDe(jogo, id)));
  const vizinhos = naMesaComigo
    .map((id) => naMesa(jogo, jogador.id, id, (fronteiras.get(id) ?? []).sort(), maiorPeso))
    .sort(
      (a, b) =>
        // Guerra primeiro: é o que exige decisão. Depois quem encosta em você, porque é com
        // quem a hoste pode marchar hoje. Depois por nome, que é como se procura na lista.
        Number(b.emGuerra) - Number(a.emGuerra) ||
        Number(b.fronteira.length > 0) - Number(a.fronteira.length > 0) ||
        a.nome.localeCompare(b.nome),
    );

  return {
    eu: cartaoDe(jogo, jogador.id, 'você'),
    meuBrasao: brasaoDe(jogo, jogador.id),
    ano: campanha.ano,
    turno: campanha.turno,
    vizinhos,
  };
}

/** Um reino reduzido ao estandarte dele: id, nome e cor, que é tudo o que o desenho pede. */
function brasaoDe(jogo: Jogo, id: string): BrasaoNaMesa {
  const poder = jogo.campanha.poder(id);
  return { id, nome: poder.nome, cor: poder.cor };
}

/** Todos os homens em armas deste poder, somando as hostes dele. */
function exercitoDe(jogo: Jogo, id: string): number {
  return jogo.campanha
    .hostes()
    .filter((h) => h.poder === id)
    .reduce((soma, h) => soma + jogo.campanha.forcaDaHoste(h.id), 0);
}

/**
 * O PESO de um reino, para a barrinha da lista: milícia mais tropa levantada.
 *
 * ⚠️ **A milícia entra, e é ela que salva a barra de ser inútil.** Medida na rodada 1: NINGUÉM
 * tem hoste — o mapa abre sem um soldado em campo —, e uma barra de exército daria dezessete
 * barras vazias, que é o mesmo defeito do `0 =` que a lista tinha antes. A milícia sai da
 * população e nunca é zero: é quantos homens aquela terra põe em pé se alguém vier, que é
 * exatamente o que "quão forte é esse reino" quer dizer antes de a guerra começar.
 *
 * O número de hostes continua sozinho na tira de confronto, onde ele decide a batalha.
 */
function pesoDe(jogo: Jogo, id: string): number {
  const milicia = jogo.campanha
    .provinciasDe(id)
    .reduce((soma, provincia) => soma + jogo.campanha.miliciaEm(provincia), 0);
  return milicia + exercitoDe(jogo, id);
}

/** Um lado da mesa. A mesma moldura para os dois — é o espelhamento que dispensa legenda. */
function cartaoDe(jogo: Jogo, id: string, linha: string): CartaoDoPoder {
  const { campanha } = jogo;
  const capital = campanha.capitalDe(id);
  const reputacao = campanha.reputacaoDe(id);
  // Ordenados por nome, e não pela ordem em que o estado guardou: a fileira de escudos tem de
  // ficar parada entre uma virada e outra, senão o jogador reconta a cada abertura.
  const brasoes = (ids: readonly string[]): readonly BrasaoNaMesa[] =>
    [...ids]
      .filter((outro) => campanha.vivo(outro))
      .map((outro) => brasaoDe(jogo, outro))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  return {
    nome: campanha.poder(id).nome,
    tesouro: campanha.tesouroDe(id),
    aliados: brasoes(campanha.aliadosDe(id)),
    inimigos: brasoes(campanha.guerrasDe(id)),
    comercio: brasoes(campanha.acordosDe(id)),
    linha,
    provincias: campanha.provinciasDe(id).length,
    exercito: exercitoDe(jogo, id),
    capital: capital === undefined ? '' : campanha.nomeDe(capital),
    // A reputação dita em vez de numerada: "promessa quebrada" é a informação que decide algo.
    palavra: reputacao < 0 ? 'promessa quebrada' : 'palavra limpa',
    reputacao,
  };
}

function naMesa(
  jogo: Jogo,
  eu: string,
  id: string,
  fronteira: readonly string[],
  maiorPeso: number,
): VizinhoNaMesa {
  const { campanha } = jogo;
  const retrato = retratoDe(jogo, id, eu);
  const relacao = campanha.relacaoEntre(eu, id);
  const parcelas = campanha.parcelasDaRelacaoEntre(eu, id);
  // ⚠️ O alvo é a soma das parcelas, contida — a mesma conta que `alvoDaRelacao` faz por
  // dentro. Somar aqui em vez de abrir mais uma consulta mantém a tela sem uma segunda verdade
  // sobre o mesmo número: se a lista de parcelas muda, o alvo muda junto, sozinho.
  const alvo = Math.max(
    -100,
    Math.min(
      100,
      parcelas.reduce((t, p) => t + p.pontos, 0),
    ),
  );
  const postura = posturaDaRelacao(relacao);
  const intencao = intencaoDe(jogo, id, eu);
  const emCurso = campanha.tributoEntre(eu, id);

  return {
    id,
    nome: campanha.poder(id).nome,
    brasao: brasaoDe(jogo, id),
    emGuerra: campanha.emGuerra(eu, id),
    // Em turnos que faltam, e não no turno em que ela vence: o jogador conta para frente.
    tregoa: Math.max(0, (campanha.tregoaAte(eu, id) ?? campanha.turno) - campanha.turno),
    fronteira,
    cartao: cartaoDe(jogo, id, retrato.temperamento),
    relacao,
    alvo,
    linhaDeAtaque: linhaDeAtaqueDe(jogo, id),
    postura: postura.rotulo,
    tomDaPostura: postura.tom,
    parcelas,
    intencao: intencao.frase,
    tomDaIntencao: intencao.tom,
    cobicadas: intencao.cobicadas,
    conduta: retrato.conduta,
    desde: desdeQuando(jogo, eu, id),
    tributo:
      emCurso === undefined
        ? null
        : {
            euPago: emCurso.pagador === eu,
            ouro: emCurso.ouro,
            turnos: Math.max(0, emCurso.ate - campanha.turno),
          },
    pacto: Math.max(0, (campanha.pactoAte(eu, id) ?? campanha.turno) - campanha.turno),
    alianca: Math.max(0, (campanha.aliancaAte(eu, id) ?? campanha.turno) - campanha.turno),
    liga: campanha.chefeDe(id) === eu ? 'membro' : campanha.chefeDe(eu) === id ? 'chefe' : null,
    temAcordo: campanha.acordosDe(eu).includes(id),
    rendaDoAcordo: campanha.rendaDeUmAcordoCom(id),
    pedido: pedidoDe(jogo, id),
    passagemConcedida: Math.max(0, (campanha.acessoAte(eu, id) ?? campanha.turno) - campanha.turno),
    passagemRecebida: Math.max(0, (campanha.acessoAte(id, eu) ?? campanha.turno) - campanha.turno),
    vinculo: vinculoCom(jogo, eu, id),
    motivo: motivoNaLista(jogo, eu, id, intencao.cobicadas),
    forcaRelativa: Math.min(1, pesoDe(jogo, id) / maiorPeso),
    grupos: gruposDe(jogo, eu, id),
  };
}

/**
 * POR QUE este reino está na sua frente agora — a linha de baixo da lista.
 *
 * ⚠️ **A lista não respondia a pergunta que a faz existir.** Medido na rodada 1 de Atenas:
 * dezessete reinos e dezesseis deles dizendo a mesma coisa, `0 =`. E naquela mesma rodada
 * Corinto tinha declarado guerra a Tebas — a lista não mencionava isso em canto nenhum.
 * Henrique, olhando: *"com quem eu devo fazer diplomacia?"*.
 *
 * ⚠️ **Uma frase só, a mais forte, e na ORDEM DA CONSEQUÊNCIA.** Duas caberiam na largura e
 * nenhuma seria lida: quem corre uma lista de dezessete linhas lê a primeira coisa de cada
 * uma. A precedência é a mesma de `vinculoCom` e de `desdeQuando`, para as três nunca
 * discordarem — o que muda é só quanto espaço há para dizer.
 */
function motivoNaLista(
  jogo: Jogo,
  eu: string,
  id: string,
  cobicadas: readonly string[],
): string {
  const { campanha } = jogo;
  if (campanha.emGuerra(eu, id)) {
    const inicio = campanha.guerraDesde(eu, id);
    const duracao = inicio === undefined ? 0 : campanha.turno - inicio;
    return duracao <= 0 ? 'Guerra declarada agora' : `Em guerra há ${duracao} turnos`;
  }
  // A cobiça vem antes do vínculo: um aliado que já olha para a sua terra é a notícia mais
  // urgente que uma linha desta lista pode dar.
  const alvo = cobicadas[0];
  if (alvo !== undefined && campanha.relacaoEntre(eu, id) <= linhaDeAtaqueDe(jogo, id)) {
    return cobicadas.length === 1
      ? `Cobiça ${alvo}`
      : `Cobiça ${alvo} e mais ${cobicadas.length - 1}`;
  }
  const vinculo = vinculoCom(jogo, eu, id);
  if (vinculo !== '') return maiuscula(vinculo);
  // ⚠️ **A fronteira NÃO entra aqui, e a tentativa de pôr ensinou por quê.** O selo
  // `FRONTEIRA` ao lado do nome já a anuncia, e a frase saía tautológica: 106 dos 139 poderes
  // têm uma província homônima, de modo que a linha de Elêusis lia-se *"Elêusis · FRONTEIRA ·
  // Encosta em Elêusis"*. Duas marcas dizendo a mesma coisa e uma delas repetindo o nome que
  // está logo acima. O motivo fica para o que o selo NÃO diz.
  // ⚠️ **A guerra dos OUTROS, e era a ausência mais cara da lista.** Um reino de mãos ocupadas
  // é uma oportunidade; um reino que procura aliado é uma proposta que vai chegar. Medido na
  // rodada 1: Corinto tinha acabado de declarar guerra a Tebas e a lista não dizia uma palavra.
  const brigas = campanha.guerrasDe(id).filter((outro) => outro !== eu && campanha.vivo(outro));
  const primeiraBriga = brigas[0];
  if (primeiraBriga !== undefined) {
    return brigas.length === 1
      ? `Em guerra com ${campanha.poder(primeiraBriga).nome}`
      : `Em ${brigas.length} guerras`;
  }
  // ⚠️ **Sem sufixo repetido.** A primeira versão fechava toda linha com "· N em armas", e na
  // rodada 1 isso deu dezessete linhas terminando em "0 em armas" — o mesmo defeito do `0 =`
  // que a lista tinha antes, com outras palavras. O tamanho já está na barra embaixo.
  const provincias = campanha.provinciasDe(id).length;
  return `${provincias} ${provincias === 1 ? 'província' : 'províncias'}`;
}

function maiuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * O QUE VOCÊS SÃO UM DO OUTRO, em uma frase inteira, para o alto da mesa.
 *
 * ⚠️ **É a frase que a tela nunca teve, e é a primeira que qualquer um procura.** A opinião, a
 * faixa dela, o prazo do pacto e o da aliança estavam todos lá — cada um num canto — e em
 * lugar nenhum a situação escrita por extenso. Quem nunca jogou tinha de montá-la a partir de
 * cinco pedaços; agora a mesa abre com a resposta.
 *
 * ⚠️ **Irmã de `vinculoCom`, e a divisão é de propósito.** Aquela cabe em 248 px de lista e
 * diz *"pacto 34t"*; esta ocupa a largura da mesa e diz *"Pacto de não-agressão por mais 34
 * turnos"*. Mesma precedência nas duas, para a lista e a mesa nunca discordarem — o que muda
 * é só quanto espaço há para dizer.
 */
function desdeQuando(jogo: Jogo, eu: string, id: string): string {
  const { campanha } = jogo;
  const turnos = (n: number): string => `${n} ${n === 1 ? 'turno' : 'turnos'}`;
  if (campanha.emGuerra(eu, id)) {
    const inicio = campanha.guerraDesde(eu, id);
    const duracao = inicio === undefined ? 0 : campanha.turno - inicio;
    return duracao <= 0 ? 'Guerra declarada nesta virada' : `Em guerra há ${turnos(duracao)}`;
  }
  const faltam = (ate: number | undefined): number =>
    Math.max(0, (ate ?? campanha.turno) - campanha.turno);

  const alianca = faltam(campanha.aliancaAte(eu, id));
  if (alianca > 0) return `Aliados por mais ${turnos(alianca)}`;
  if (campanha.chefeDe(id) === eu) return 'Membro da sua liga';
  if (campanha.chefeDe(eu) === id) return `Você é membro da liga de ${campanha.poder(id).nome}`;
  const pacto = faltam(campanha.pactoAte(eu, id));
  if (pacto > 0) return `Pacto de não-agressão por mais ${turnos(pacto)}`;
  const tregoa = faltam(campanha.tregoaAte(eu, id));
  if (tregoa > 0) return `Trégua por mais ${turnos(tregoa)}`;
  if (campanha.acordosDe(eu).includes(id)) return 'Em paz, com comércio aberto';
  // ⚠️ **A paz se conta da trégua, e não de um registro próprio.** O turno em que a última
  // trégua venceu é a data em que a última guerra entre os dois deixou de doer; quem nunca
  // guerreou conta desde o começo da campanha, que é a resposta certa — não ter história de
  // sangue é a paz mais longa que dois reinos podem ter. Mesma conta de `relacoes.ts`.
  const fimDaTregoa = campanha.tregoaAte(eu, id);
  const paz = fimDaTregoa === undefined ? campanha.turno : Math.max(0, campanha.turno - fimDaTregoa);
  return paz <= 1 ? 'Em paz' : `Em paz há ${turnos(paz)}`;
}

/**
 * O vínculo mais forte entre os dois, em uma palavra — e só um, o mais forte.
 *
 * ⚠️ **A ordem de precedência é a da consequência, não a do alfabeto:** guerra manda em tudo,
 * depois quem manda em quem, depois quem luta com quem, depois o papel que impede a marcha, e
 * por último o dinheiro. Mostrar dois vínculos numa linha de 248px seria mostrar nenhum.
 */
function vinculoCom(jogo: Jogo, eu: string, id: string): string {
  const { campanha } = jogo;
  if (campanha.emGuerra(eu, id)) return 'guerra';
  if (campanha.chefeDe(id) === eu) return 'membro da sua liga';
  if (campanha.chefeDe(eu) === id) return 'seu chefe';
  const alianca = (campanha.aliancaAte(eu, id) ?? campanha.turno) - campanha.turno;
  if (alianca > 0) return `aliado por ${alianca} turnos`;
  const pacto = (campanha.pactoAte(eu, id) ?? campanha.turno) - campanha.turno;
  if (pacto > 0) return `pacto por ${pacto} turnos`;
  const tributo = campanha.tributoEntre(eu, id);
  if (tributo !== undefined) {
    const faltam = Math.max(0, tributo.ate - campanha.turno);
    return `${tributo.pagador === eu ? 'paga' : 'recebe'} tributo por ${faltam} turnos`;
  }
  if (campanha.acordosDe(eu).includes(id)) return 'comércio aberto';
  const tregoa = (campanha.tregoaAte(eu, id) ?? campanha.turno) - campanha.turno;
  if (tregoa > 0) return `trégua por ${tregoa} turnos`;
  return '';
}

/**
 * As propostas, agrupadas por ASSUNTO e não empilhadas numa lista só.
 *
 * ⚠️ **Nenhum jogo pesquisado usa lista plana, e o motivo é o mesmo em todos**: com cinco
 * grupos de botão do mesmo tamanho, a decisão que abre o resto do jogo — guerra ou paz — vira
 * mais uma linha entre outras. Aqui ela é sempre o primeiro grupo e tem peso próprio no CSS.
 *
 * ⚠️ **Em guerra, só existe o grupo da PAZ.** Oferecer pacto, comércio e presente a quem já
 * está marchando sobre você é oferecer proteção contra uma invasão que já aconteceu — e as
 * regras recusariam tudo, deixando quatro grupos de botão cinza na tela para o jogador ler.
 */
function gruposDe(jogo: Jogo, eu: string, id: string): readonly GrupoDaMesa[] {
  if (jogo.campanha.emGuerra(eu, id)) return [grupoDaPaz(jogo, eu, id)];
  // ⚠️ **A guerra desceu para o fim, e a ordem é a do uso.** Ela era o primeiro grupo — pela
  // razão certa, de ser a decisão que abre o resto do jogo —, e o efeito na tela era o
  // contrário: a primeira coisa oferecida numa coluna chamada *"o que se pode propor"* era
  // declarar guerra. Quem abre a mesa pela primeira vez lê o topo da coluna como o começo da
  // conversa. Agora ela fecha a coluna, sozinha na largura toda e em vermelho, que é o peso
  // que ela merece sem ser a porta de entrada.
  return [
    grupoDoComercio(jogo, eu, id),
    grupoDoPacto(jogo, eu, id),
    grupoDaAlianca(jogo, eu, id),
    grupoDaLiga(jogo, eu, id),
    grupoDaPassagem(jogo, eu, id),
    grupoDoTributo(jogo, eu, id),
    grupoDoPresente(jogo, id),
    grupoDaGuerra(jogo, eu, id),
  ];
}

/**
 * O que ESTE reino está te pedindo nesta virada. `null` quando ele não pediu nada.
 *
 * A frase é montada aqui, e não na tela, pela regra da casa: a vista traduz o dado em palavra e
 * a tela decide a tipografia.
 */
function pedidoDe(jogo: Jogo, id: string): VizinhoNaMesa['pedido'] {
  const proposta = jogo.campanha.propostas().find((p) => p.de === id);
  if (!proposta) return null;
  const frase = {
    pacto: `Propõe um pacto de não-agressão por ${proposta.turnos ?? 0} turnos.`,
    alianca:
      `Propõe uma ALIANÇA por ${proposta.turnos ?? 0} turnos: ` +
      'as guerras dele passam a ser suas, e as suas dele.',
    liga:
      'Convida você para a LIGA dele: você continua sendo você, mas paga tributo todo turno ' +
      'e entra nas guerras dele. Em troca, ninguém te ataca sem enfrentá-lo.',
    // ⚠️ A frase mais pesada da mesa, e ela tem de doer ao ler: aceitar é ENTREGAR o reino.
    anexacao:
      'Pede que o seu reino passe a fazer parte do dele. Aceitar é o fim da sua campanha — ' +
      'recusar não custa nada, e ele só pode insistir rompendo a liga e invadindo.',
    comercio: 'Propõe abrir comércio: rende dos dois lados, e a guerra desfaz.',
    acesso: `Pede passagem pela sua terra por ${proposta.turnos ?? 0} turnos.`,
    paz: 'Propõe a paz, sem tributo.',
  }[proposta.tipo];
  return { tipo: proposta.tipo, frase };
}

/**
 * A PASSAGEM: a licença de atravessar a sua terra sem guerra.
 *
 * ⚠️ **É o único grupo em que quem concede é VOCÊ.** Todos os outros são coisas que você pede
 * e ele aceita ou não; aqui é a sua estrada, e a decisão é inteira sua — por isso não há
 * "vontade dele" a consultar e o botão nunca fica cinza por opinião.
 */
function grupoDaPassagem(jogo: Jogo, eu: string, id: string): GrupoDaMesa {
  const { campanha, ajustes } = jogo;
  const dada = Math.max(0, (campanha.acessoAte(eu, id) ?? campanha.turno) - campanha.turno);
  const recebida = Math.max(0, (campanha.acessoAte(id, eu) ?? campanha.turno) - campanha.turno);
  // A recíproca entra como segunda frase, e não como fragmento colado com ponto médio: a
  // coluna inteira passou a escrever frases, e uma linha meio frase meio telegrama denuncia
  // a costura.
  const nota = recebida > 0 ? ` Ele te dá ${recebida} turnos da dele.` : '';
  if (dada > 0) {
    return {
      titulo: 'Passagem militar',
      resumo: `concedida · ${dada} ${dada === 1 ? 'turno' : 'turnos'}`,
      propostas: [
        {
          acao: 'revogar-acesso',
          rotulo: 'Fechar',
          custo: '—',
          prazo: `faltam ${dada} ${dada === 1 ? 'turno' : 'turnos'}`,
          valor: 0,
          pode: true,
          aceita: true,
          bloqueio: '',
        },
      ],
      fala: `Passagem aberta por ${dada} turnos.${nota}`,
      tom: 'bom',
    };
  }
  const prazos = ajustes.jogo.diplomacia.acesso.prazos;
  const propostas = prazos.map((p) => {
    const permissao = campanha.podeConcederAcesso(eu, id, p.turnos);
    return {
      acao: 'acesso',
      rotulo: 'Conceder',
      custo: '—',
      prazo: `${p.turnos} turnos`,
      valor: p.turnos,
      pode: permissao.pode,
      aceita: true,
      bloqueio: permissao.pode ? '' : permissao.motivo,
    };
  });
  // ⚠️ **A estrada é SUA, e por isso aqui não há vontade dele a consultar**: o botão só fica
  // cinza por regra — guerra em curso, passagem já aberta —, e nunca porque ele não gosta de
  // você. Quem precisa de confiança é o contrário: ele abrir a dele.
  const travado = propostas.every((p) => !p.pode);
  return {
    titulo: 'Passagem militar',
    resumo: recebida > 0 ? `ele te dá ${recebida} turnos` : '',
    propostas,
    // Travado, o motivo já está no `bloqueio` de cada prazo — repeti-lo aqui era dizer duas vezes.
    fala: travado ? '' : `Ele atravessa a sua terra sem declarar guerra.${nota}`,
    tom: travado ? 'ruim' : 'neutro',
  };
}

function grupoDaGuerra(jogo: Jogo, eu: string, id: string): GrupoDaMesa {
  const { campanha } = jogo;
  const permissao = campanha.podeDeclararGuerra(id, eu);
  const tregoa = Math.max(0, (campanha.tregoaAte(eu, id) ?? campanha.turno) - campanha.turno);
  return {
    titulo: 'Guerra',
    fixo: true,
    resumo: tregoa > 0 ? `trégua · ${tregoa} turnos` : '',
    propostas: [
      {
        acao: 'guerra',
        rotulo: 'Declarar guerra',
        custo: '—',
        prazo: '—',
        valor: 0,
        pode: permissao.pode,
        // ⚠️ Guerra não se propõe, se declara: não há resposta dele a esperar, e por isso
        // `aceita` é sempre verdadeiro. Um sinal de recusa aqui mentiria sobre a mecânica.
        aceita: true,
        bloqueio: permissao.pode ? '' : permissao.motivo,
      },
    ],
    // ⚠️ **A trégua é dita UMA vez, e antes eram três** — aqui, na leitura da postura e no
    // bloqueio do botão. E a frase que sobrava sem trégua ("sem guerra declarada, sua hoste não
    // marcha") era tautologia: dizia o nome do botão de novo.
    fala: tregoa > 0 ? `A trégua ainda segura por ${tregoa} turnos.` : '',
    tom: 'ruim',
  };
}

function grupoDaPaz(jogo: Jogo, eu: string, id: string): GrupoDaMesa {
  const resposta = respostaAPaz(jogo, id, eu);
  const prazos = prazosDePazComResposta(jogo, id, eu);
  const propostas: Proposta[] = [
    {
      acao: 'paz',
      rotulo: 'Propor',
      custo: '—',
      prazo: '—',
      valor: 0,
      pode: jogo.campanha.podeFazerPaz(id).pode,
      aceita: resposta.aceita,
      bloqueio: '',
    },
    ...prazos.map((p) => ({
      acao: 'paz-com-tributo',
      // ⚠️ **O verbo sozinho, porque o título da ficha completa a frase.** `Comprar a paz`
      // dentro de uma ficha chamada PAZ é o título dito de novo — e o mesmo valia para `Abrir
      // comércio`, `Sair da liga` e `Fechar a estrada`. A exceção é DECLARAR GUERRA, que
      // continua escrita por extenso: é o único ato desta tela que não se desfaz, e o único em
      // que a economia de uma palavra trabalharia contra o jogador.
      rotulo: 'Comprar',
      custo: emOuro(p.ouro, false),
      prazo: `${p.turnos} turnos`,
      valor: p.turnos,
      pode: p.pode,
      aceita: p.resposta.aceita,
      bloqueio: p.pode ? '' : 'seu tesouro não cobre a primeira parcela',
    })),
  ];
  // A fala é a do caminho que interessa: se ele aceita de graça, é essa; senão, a da compra —
  // e o jogador precisa saber QUAL parcela o demoveria, não só que ele recusou.
  const comprada = prazos.find((p) => p.pode && p.resposta.aceita);
  return {
    titulo: 'Paz',
    fixo: true,
    vontadeDele: true,
    resumo: '',
    propostas,
    // ⚠️ **A ÚNICA voz que sobrou na tela inteira, e ela mora aqui de propósito**: a fala dele
    // só aparece onde a decisão é a guerra. Em todo o resto da mesa, o estado é factual.
    fala: resposta.aceita
      ? resposta.fala
      : comprada
        ? `«${resposta.fala}» ${comprada.ouro}/turno o demoveria.`
        : `«${resposta.fala}»`,
    tom: resposta.aceita || comprada ? 'bom' : 'ruim',
    vozDele: true,
  };
}

function grupoDoComercio(jogo: Jogo, eu: string, id: string): GrupoDaMesa {
  const { campanha } = jogo;
  const tem = campanha.acordosDe(eu).includes(id);
  const minhaRenda = campanha.rendaDeUmAcordoCom(id, eu);
  const rendaDele = campanha.rendaDeUmAcordoCom(eu, id);
  // "por turno" por extenso, como nos outros cinco grupos: `/turno` era a última abreviação
  // sobrando numa coluna que passou a escrever frases.
  const valores =
    minhaRenda === rendaDele
      ? 'Rende o mesmo para os dois lados.'
      : `Ele ganha +${rendaDele} por turno com isto.`;
  const permissao = campanha.podeAcordarComercio(id);
  const resposta = respostaAoComercio(jogo, id, eu);
  return {
    titulo: 'Comércio',
    vontadeDele: true,
    resumo: tem ? 'em vigor' : '',
    propostas: [
      tem
        ? {
            acao: 'desfazer-acordo',
            rotulo: 'Encerrar',
            custo: emOuro(minhaRenda, false),
            prazo: '—',
            valor: 0,
            pode: true,
            aceita: true,
            bloqueio: '',
          }
        : {
            acao: 'acordo',
            rotulo: 'Abrir',
            custo: emOuro(minhaRenda, true),
            // ⚠️ **`até a guerra` é prazo, e é o único que este acordo tem.** Um traço aqui
            // faria o comércio parecer eterno; ele não é — e a fala de baixo dizendo "a guerra
            // o desfaz" ficava sendo a única aviso, três linhas longe da escolha.
            prazo: 'até a guerra',
            valor: 0,
            pode: permissao.pode,
            aceita: resposta.aceita,
            bloqueio: permissao.pode ? '' : permissao.motivo,
          },
    ],
    // ⚠️ **A fala diz o LADO DELE, porque o seu já está na coluna do ouro.** Ela dizia "Rende
    // +23 por turno para os dois. A guerra o desfaz." ao lado de uma linha que já mostrava
    // `+23 por turno` e `até a guerra`: a frase inteira era a linha de baixo repetida. O que a
    // coluna não tem como dizer é quanto ELE ganha — e é isso que decide se o acordo te
    // interessa.
    fala: valores,
    tom: tem || resposta.aceita ? 'bom' : 'ruim',
  };
}

/**
 * A LIGA: mandar nele sem tomá-lo — e o único grupo com TRÊS caras.
 *
 * Ele muda inteiro conforme quem manda em quem, porque as três situações são jogos diferentes:
 * liderar é escolher quanto apertar; servir é decidir quando fugir; e nenhum dos dois é a
 * decisão de entrar. Um grupo só com tudo dentro seria uma tela que ninguém lê.
 */
function grupoDaLiga(jogo: Jogo, eu: string, id: string): GrupoDaMesa {
  const { campanha } = jogo;
  const niveis = Object.entries(jogo.ajustes.jogo.diplomacia.liga.niveisDeTributo).sort(
    (a, b) => a[1].desejo - b[1].desejo,
  );

  // ── eu lidero ele ──────────────────────────────────────────────────────────
  if (campanha.chefeDe(id) === eu) {
    const vinculo = campanha.ligaDe(id);
    const desejo = Math.round(vinculo?.desejoDeSair ?? 0);
    const paga = campanha.tributoDaLigaDe(id);
    const aceita = campanha.aceitaSerAnexado(id);
    return {
      titulo: 'Liga (vassalagem)',
      resumo: 'você lidera',
      propostas: [
        ...niveis.map(([nome]) => ({
          acao: `tributo-liga:${nome}`,
          // ⚠️ `leve` ao lado de `Anexar` e `Soltar` não dizia leve O QUÊ. O substantivo entra.
          rotulo: `Tributo ${nome}`,
          custo: '—',
          // O nível em pé se marca na coluna do prazo, e não com uma seta grudada no verbo:
          // a seta desalinhava a única coluna da ficha que existe para alinhar.
          prazo: vinculo?.tributo === nome ? 'em vigor' : '—',
          valor: 0,
          pode: vinculo?.tributo !== nome,
          aceita: true,
          bloqueio: '',
        })),
        {
          acao: 'anexar-membro',
          rotulo: 'Anexar',
          custo: '—',
          prazo: 'para sempre',
          valor: 0,
          pode: aceita,
          aceita: true,
          // ⚠️ A recusa vira PRAZO ou PREÇO, e não veredito — a mesma lição do pacto.
          bloqueio: aceita ? '' : 'ele ainda não aceitaria: baixe o tributo e espere',
        },
        {
          acao: 'soltar-membro',
          rotulo: 'Soltar',
          custo: emOuro(paga, false),
          prazo: '—',
          valor: 0,
          pode: true,
          aceita: true,
          bloqueio: '',
        },
      ],
      // Os NÚMEROS sobrevivem, a explicação vai para o tooltip do título. A regra da liga se
      // aprende uma vez; o tributo e a vontade de sair mudam todo turno.
      fala: `Você paga ${paga} moedas por turno. Vontade de sair: ${desejo} de 100.`,
      tom: desejo >= 40 ? 'ruim' : 'bom',
    };
  }

  // ── ele lidera a mim ───────────────────────────────────────────────────────
  if (campanha.chefeDe(eu) === id) {
    const vinculo = campanha.ligaDe(eu);
    return {
      titulo: 'Liga (vassalagem)',
      resumo: 'você serve a ele',
      propostas: [
        {
          acao: 'sair-da-liga',
          rotulo: 'Sair',
          custo: emOuro(campanha.tributoDaLigaDe(eu), true),
          prazo: '—',
          valor: 0,
          pode: true,
          aceita: true,
          bloqueio: '',
        },
      ],
      fala:
        `Você paga ${campanha.tributoDaLigaDe(eu)} moedas por turno. ` +
        `Vontade de sair: ${Math.round(vinculo?.desejoDeSair ?? 0)} de 100.`,
      tom: 'ruim',
    };
  }

  // ── nem um nem outro ───────────────────────────────────────────────────────
  const permissao = campanha.podeFormarLiga(id);
  const relacao = campanha.relacaoEntre(eu, id);
  const minima = jogo.ajustes.jogo.diplomacia.liga.opiniaoMinima;
  // ⚠️ A vontade dele, que o clique ignorava: o jogador punha na liga um reino que nenhuma
  // IA convidaria. A balança da liga vem depois; até lá é a mesma pergunta que a IA se faz.
  const resposta = respostaALiga(jogo, id, eu);
  return {
    titulo: 'Liga (vassalagem)',
    vontadeDele: true,
    resumo: '',
    propostas: [
      {
        acao: 'formar-liga',
        rotulo: 'Pôr na minha liga',
        custo: '—',
        prazo: 'sem prazo',
        valor: 0,
        pode: permissao.pode,
        aceita: resposta.aceita,
        bloqueio: permissao.pode
          ? ''
          : relacao < minima
            ? precoDaConfianca(jogo, id, minima - relacao)
            : permissao.motivo,
      },
    ],
    fala: resposta.fala,
    tom: resposta.aceita ? 'bom' : 'ruim',
    vozDele: true,
  };
}

/**
 * A ALIANÇA: o topo da escada, e o único grupo que promete FAZER alguma coisa.
 *
 * ⚠️ **A fala precisa dizer o preço antes do botão**, porque este é o único acordo do jogo cuja
 * consequência não é uma coisa que deixa de acontecer: as guerras dele passam a ser suas, no
 * mesmo turno e sem perguntar. Um jogador que assina sem ler isso vai se ver em guerra com um
 * reino que ele nunca viu, e vai achar que é defeito.
 */
function grupoDaAlianca(jogo: Jogo, eu: string, id: string): GrupoDaMesa {
  const { campanha } = jogo;
  const emPe = Math.max(0, (campanha.aliancaAte(eu, id) ?? campanha.turno) - campanha.turno);
  if (emPe > 0) {
    const guerras = campanha.guerrasDe(id).length;
    return {
      titulo: 'Aliança militar',
      vontadeDele: true,
      resumo: `em vigor · ${emPe} ${emPe === 1 ? 'turno' : 'turnos'}`,
      propostas: [
        {
          acao: 'romper-alianca',
          rotulo: 'Romper',
          custo: '—',
          prazo: `faltam ${emPe} ${emPe === 1 ? 'turno' : 'turnos'}`,
          valor: 0,
          pode: true,
          aceita: true,
          bloqueio: '',
        },
      ],
      fala:
        guerras > 0
          ? `Em vigor. Ele está em ${guerras} guerra${guerras === 1 ? '' : 's'}, e elas são suas.`
          : 'Em vigor.',
      tom: 'bom',
    };
  }
  return grupoComBalanca('Aliança militar', 'alianca', prazosDeAliancaComResposta(jogo, id, eu));
}

/**
 * Um grupo de prazos decidido pela BALANÇA — pacto e aliança, por enquanto.
 *
 * ⚠️ **A fala é a resposta dele ao melhor prazo que fecha, ou a recusa com o PEDIDO.** Cada
 * linha leva o saldo dela no lugar do selo; as parcelas do grupo são as do prazo mais curto,
 * que é a conta sem o custo do prazo — o resto é a coluna do prazo somando contra.
 */
function grupoComBalanca(
  titulo: string,
  acao: string,
  prazos: readonly PrazoComBalanca[],
): GrupoDaMesa {
  // `prazosDe*` vem do mais longo ao mais curto: o primeiro que fecha é o mais longo que fecha.
  const fecha = prazos.find((p) => p.pode && p.resposta.aceita);
  const curto = prazos[prazos.length - 1];
  const fala =
    fecha !== undefined
      ? fecha.resposta.fala
      : curto === undefined
        ? ''
        : `«${curto.resposta.fala}» ${curto.resposta.pedido}.`;
  return {
    titulo,
    vontadeDele: true,
    resumo: '',
    ...(curto !== undefined ? { balanca: curto.resposta.balanca.parcelas } : {}),
    ...(curto !== undefined && semSaida(curto.resposta.pedido) ? { semSaida: true as const } : {}),
    propostas: prazos.map((p) => ({
      acao,
      rotulo: 'Propor',
      custo: p.ouro > 0 ? emOuro(p.ouro, false, false) : '—',
      prazo: `${p.turnos} turnos`,
      valor: p.turnos,
      ouro: p.ouro,
      pode: p.pode,
      aceita: p.resposta.aceita,
      bloqueio: p.pode ? '' : p.motivo,
      saldo: p.resposta.balanca.saldo,
      pedido: p.resposta.pedido,
    })),
    fala,
    tom: fecha !== undefined ? 'bom' : 'ruim',
    vozDele: true,
  };
}

function grupoDoPacto(jogo: Jogo, eu: string, id: string): GrupoDaMesa {
  const { campanha } = jogo;
  const emPe = Math.max(0, (campanha.pactoAte(eu, id) ?? campanha.turno) - campanha.turno);
  if (emPe > 0) {
    return {
      titulo: 'Pacto de não-agressão',
      vontadeDele: true,
      resumo: `em vigor · ${emPe} ${emPe === 1 ? 'turno' : 'turnos'}`,
      propostas: [
        {
          acao: 'romper',
          rotulo: 'Romper',
          custo: '—',
          prazo: `faltam ${emPe} ${emPe === 1 ? 'turno' : 'turnos'}`,
          valor: 0,
          pode: true,
          aceita: true,
          bloqueio: '',
        },
      ],
      fala: 'Em vigor. Nenhum dos dois marcha sobre o outro.',
      tom: 'bom',
    };
  }
  // ⚠️ **A recusa vira PEDIDO, e não veredito.** A tela tinha as duas metades da conta — o
  // quanto falta e os presentes cotados a três centímetros dali — e nunca fazia a subtração.
  // Agora a conta é a balança dele, linha a linha, e a fala diz o que a viraria.
  return grupoComBalanca('Pacto de não-agressão', 'pacto', prazosDePactoComResposta(jogo, id, eu));
}

function grupoDoTributo(jogo: Jogo, eu: string, id: string): GrupoDaMesa {
  const { campanha } = jogo;
  const emCurso = campanha.tributoEntre(eu, id);
  if (emCurso !== undefined) {
    const faltam = Math.max(0, emCurso.ate - campanha.turno);
    const euPago = emCurso.pagador === eu;
    return {
      titulo: 'Tributo',
      vontadeDele: true,
      resumo: euPago ? 'você paga' : 'ele paga',
      propostas: [
        {
          acao: 'romper-tributo',
          rotulo: 'Romper',
          custo: emOuro(emCurso.ouro, !euPago),
          prazo: `faltam ${faltam} ${faltam === 1 ? 'turno' : 'turnos'}`,
          valor: 0,
          pode: true,
          aceita: true,
          bloqueio: '',
        },
      ],
      fala: euPago
        ? `Você paga ${emCurso.ouro} moedas por turno, e ele não te ataca.`
        : `Ele paga ${emCurso.ouro} moedas por turno, e você não o ataca.`,
      tom: euPago ? 'ruim' : 'bom',
    };
  }

  const pago = prazosQuePagoComResposta(jogo, id, eu);
  const paga = prazosQueElePagaComResposta(jogo, id, eu);
  const propostas: Proposta[] = [
    ...pago.map((p) => ({
      acao: 'pagar-tributo',
      // ⚠️ **São SEIS linhas, e é a ficha que mais precisava de coluna.** O rótulo dizia
      // `Pagar 155 · 20 turnos` e as seis se embaralhavam em duas colunas de largura variável:
      // para comparar a terceira parcela com a quinta era preciso caçar o número dentro da
      // frase. Verbo à esquerda, ouro e prazo alinhados à direita — a comparação é uma descida
      // de olho.
      rotulo: 'Pagar',
      custo: emOuro(p.ouro, false),
      prazo: `${p.turnos} turnos`,
      valor: p.turnos,
      pode: p.pode,
      aceita: p.resposta.aceita,
      // ⚠️ O motivo VERDADEIRO, que `prazosDeTributo` agora devolve. Antes eram seis botões
      // dizendo "as regras não deixam agora" enquanto a regra sabia dizer *"há pacto em pé:
      // você já tem esse sossego de graça"*.
      bloqueio: p.motivo,
    })),
    ...paga.map((p) => ({
      acao: 'exigir-tributo',
      rotulo: 'Exigir',
      custo: emOuro(p.ouro, true),
      prazo: `${p.turnos} turnos`,
      valor: p.turnos,
      pode: p.pode,
      aceita: p.resposta.aceita,
      bloqueio: p.motivo,
    })),
  ];
  const querPagar = paga[0]?.resposta;
  const querReceber = pago.find((p) => p.resposta.aceita)?.resposta ?? pago[0]?.resposta;
  return {
    titulo: 'Tributo',
    vontadeDele: true,
    resumo: '',
    propostas,
    // ⚠️ **A função escrita, e ela faltava.** Henrique, no inventário: *"Tributo — não
    // aprovado, porque não entendo a função"*. O que a tela mostrava eram seis botões com
    // quantias e prazos, e em lugar nenhum o que o acordo FAZ: quem paga compra sossego.
    fala: 'Quem paga não é atacado por quem recebe, enquanto durar.',
    tom: querReceber?.aceita === true || querPagar?.aceita === true ? 'bom' : 'ruim',
  };
}

/**
 * O ouro de uma linha de proposta, com SINAL — `−155 por turno`, `+23 por turno`.
 *
 * ⚠️ **O sinal é a única coisa que o jogador precisa ler nessa coluna, e ela não o tinha.**
 * `Pagar 155` e `Exigir 39` eram dois verbos com dois números crus, e para saber de que lado
 * o ouro andava era preciso ler o verbo e lembrar o que ele quer dizer. Com o sinal, a coluna
 * inteira se lê de relance: o que é vermelho sai do cofre, o que é verde entra.
 */
function emOuro(valor: number, entra: boolean, porTurno = true): string {
  const quanto = valor.toLocaleString('pt-BR');
  return `${entra ? '+' : '−'}${quanto}${porTurno ? ' por turno' : ' de ouro'}`;
}

/** Quanto ouro cobre os pontos que faltam para este prazo — ou por que não há preço. */
function precoDaConfianca(jogo: Jogo, id: string, falta: number): string {
  const ouro = ouroQueCobre(jogo, id, falta);
  if (ouro === null) {
    return `faltam ${falta} de opinião, e o seu cofre não alcança — mude os fatos`;
  }
  return `faltam ${falta} de opinião · ${ouro.toLocaleString('pt-BR')} de ouro cobrem`;
}

/**
 * O presente: três quantias que fazem sentido para ESTE vizinho, já cotadas.
 *
 * ⚠️ **A escala sai da renda DELE, não do seu cofre.** Oferecer 5.000 a quem arrecada 120 é
 * absurdo, e 500 a quem arrecada 2.000 é quase ofensa. As quantias nascem na escala certa e o
 * jogador não precisa fazer essa conta de cabeça.
 */
function grupoDoPresente(jogo: Jogo, id: string): GrupoDaMesa {
  const { campanha } = jogo;
  const renda = Math.max(1, campanha.rendaDe(id));
  const propostas: Proposta[] = [1, 3, 8]
    .map((turnos) => Math.round((renda * turnos) / 50) * 50)
    .filter((ouro) => ouro > 0)
    .map((ouro) => {
      const permissao = campanha.podePresentear(id, ouro);
      return {
        acao: 'presente',
        rotulo: 'Dar',
        custo: emOuro(ouro, false, false),
        // ⚠️ **A exceção da coluna, e ela é honesta:** um presente não dura, ele muda alguma
        // coisa — e o que se quer saber ao escolher entre 200 e 1.550 moedas é justamente
        // quanto cada quantia compra. O rendimento cai com o tamanho, então as três linhas
        // dizem coisas diferentes e a comparação é o assunto inteiro desta ficha.
        prazo: `+${campanha.valorDoPresente(id, ouro)} de opinião`,
        valor: ouro,
        pode: permissao.pode,
        // Presente ninguém recusa: o que ele muda é a opinião, e o teto dela é a trava.
        aceita: true,
        bloqueio: permissao.pode ? '' : permissao.motivo,
      };
    });
  return {
    titulo: 'Presente em ouro',
    resumo: '',
    propostas,
    // "Presente compra tempo, não amizade" é regra que se aprende uma vez: vai para o tooltip.
    fala: '',
    tom: 'morno',
  };
}
