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
  CartaoDoPoder,
  GrupoDaMesa,
  Proposta,
  VistaDaDiplomacia,
  VizinhoNaMesa,
} from '@/ui/diplomacia-vista';
import {
  aberturaDe,
  intencaoDe,
  linhaDeAtaqueDe,
  ouroQueCobre,
  prazosDePazComResposta,
  prazosQueElePagaComResposta,
  prazosQuePagoComResposta,
  respostaAoComercio,
  respostaAoPacto,
  respostaAPaz,
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
    linha: '',
    provincias: 0,
    exercito: 0,
    capital: '',
    palavra: '',
    reputacao: 0,
  };
  if (!jogador) return { eu: vazio, vizinhos: [], guerras: 0 };

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
  const vizinhos = naMesaComigo
    .map((id) => naMesa(jogo, jogador.id, id, (fronteiras.get(id) ?? []).sort()))
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
    vizinhos,
    guerras: campanha.guerrasDe(jogador.id).length,
  };
}

/** Um lado da mesa. A mesma moldura para os dois — é o espelhamento que dispensa legenda. */
function cartaoDe(jogo: Jogo, id: string, linha: string): CartaoDoPoder {
  const { campanha } = jogo;
  const capital = campanha.capitalDe(id);
  const reputacao = campanha.reputacaoDe(id);
  return {
    nome: campanha.poder(id).nome,
    linha,
    provincias: campanha.provinciasDe(id).length,
    exercito: campanha
      .hostes()
      .filter((h) => h.poder === id)
      .reduce((soma, h) => soma + campanha.forcaDaHoste(h.id), 0),
    capital: capital === undefined ? '' : campanha.nomeDe(capital),
    // A reputação dita em vez de numerada: "promessa quebrada" é a informação que decide algo.
    palavra: reputacao < 0 ? 'promessa quebrada' : 'palavra limpa',
    reputacao,
  };
}

function naMesa(jogo: Jogo, eu: string, id: string, fronteira: readonly string[]): VizinhoNaMesa {
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
    emGuerra: campanha.emGuerra(eu, id),
    // Em turnos que faltam, e não no turno em que ela vence: o jogador conta para frente.
    tregoa: Math.max(0, (campanha.tregoaAte(eu, id) ?? campanha.turno) - campanha.turno),
    fronteira,
    cartao: cartaoDe(jogo, id, retrato.temperamento),
    relacao,
    alvo,
    linhaDeAtaque: linhaDeAtaqueDe(jogo, id),
    abertura: aberturaDe(jogo, id, eu),
    postura: postura.rotulo,
    leitura: postura.leitura,
    tomDaPostura: postura.tom,
    parcelas,
    intencao: intencao.frase,
    tomDaIntencao: intencao.tom,
    cobicadas: intencao.cobicadas,
    lacos: retrato.lacos.map((l) => ({ tipo: l.tipo, nome: l.nome })),
    conduta: retrato.conduta,
    tributo:
      emCurso === undefined
        ? null
        : {
            euPago: emCurso.pagador === eu,
            ouro: emCurso.ouro,
            turnos: Math.max(0, emCurso.ate - campanha.turno),
          },
    pacto: Math.max(0, (campanha.pactoAte(eu, id) ?? campanha.turno) - campanha.turno),
    temAcordo: campanha.acordosDe(eu).includes(id),
    rendaDoAcordo: campanha.rendaDeUmAcordoCom(id),
    pedido: pedidoDe(jogo, id),
    passagemConcedida: Math.max(0, (campanha.acessoAte(eu, id) ?? campanha.turno) - campanha.turno),
    passagemRecebida: Math.max(0, (campanha.acessoAte(id, eu) ?? campanha.turno) - campanha.turno),
    grupos: gruposDe(jogo, eu, id),
  };
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
  return [
    grupoDaGuerra(jogo, eu, id),
    grupoDoComercio(jogo, eu, id),
    grupoDoPacto(jogo, eu, id),
    grupoDaAlianca(jogo, eu, id),
    grupoDaPassagem(jogo, eu, id),
    grupoDoTributo(jogo, eu, id),
    grupoDoPresente(jogo, id),
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
    comercio: 'Propõe abrir comércio: rende dos dois lados, e a guerra desfaz.',
    acesso: `Pede passagem pela sua terra por ${proposta.turnos ?? 0} turnos.`,
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
  const nota = recebida > 0 ? ` Ele te deixa passar por ${recebida} turnos.` : '';
  if (dada > 0) {
    return {
      titulo: 'Passagem',
      propostas: [
        {
          acao: 'revogar-acesso',
          rotulo: `Fechar · faltam ${dada} ${dada === 1 ? 'turno' : 'turnos'}`,
          valor: 0,
          pode: true,
          aceita: true,
          bloqueio: '',
        },
      ],
      fala: `O exército dele atravessa a sua terra sem guerra.${nota} Fechar antes do prazo custa a opinião dele.`,
      tom: 'bom',
    };
  }
  const prazos = ajustes.jogo.diplomacia.acesso.prazos;
  const propostas = prazos.map((p) => {
    const permissao = campanha.podeConcederAcesso(eu, id, p.turnos);
    return {
      acao: 'acesso',
      rotulo: `${p.turnos} turnos`,
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
  const porque = propostas.find((p) => p.bloqueio !== '')?.bloqueio ?? '';
  return {
    titulo: 'Passagem',
    propostas,
    fala: travado
      ? `${porque}. Passagem é decisão sua — mas não se abre estrada para quem está em armas contra você.`
      : `Deixa o exército dele atravessar a sua terra sem guerra — e não deixa conquistar nada.${nota}`,
    tom: travado ? 'ruim' : 'neutro',
  };
}

function grupoDaGuerra(jogo: Jogo, eu: string, id: string): GrupoDaMesa {
  const { campanha } = jogo;
  const permissao = campanha.podeDeclararGuerra(id, eu);
  const tregoa = Math.max(0, (campanha.tregoaAte(eu, id) ?? campanha.turno) - campanha.turno);
  return {
    titulo: 'Guerra',
    propostas: [
      {
        acao: 'guerra',
        rotulo: 'Declarar guerra',
        valor: 0,
        pode: permissao.pode,
        // ⚠️ Guerra não se propõe, se declara: não há resposta dele a esperar, e por isso
        // `aceita` é sempre verdadeiro. Um sinal de recusa aqui mentiria sobre a mecânica.
        aceita: true,
        bloqueio: permissao.pode ? '' : permissao.motivo,
      },
    ],
    fala:
      tregoa > 0
        ? `A trégua ainda segura por ${tregoa} ${tregoa === 1 ? 'turno' : 'turnos'}.`
        : 'Sem guerra declarada, sua hoste não marcha sobre a terra dele.',
    tom: 'ruim',
  };
}

function grupoDaPaz(jogo: Jogo, eu: string, id: string): GrupoDaMesa {
  const resposta = respostaAPaz(jogo, id, eu);
  const prazos = prazosDePazComResposta(jogo, id, eu);
  const propostas: Proposta[] = [
    {
      acao: 'paz',
      rotulo: 'Propor paz',
      valor: 0,
      pode: jogo.campanha.podeFazerPaz(id).pode,
      aceita: resposta.aceita,
      bloqueio: '',
    },
    ...prazos.map((p) => ({
      acao: 'paz-com-tributo',
      rotulo: `Comprar · ${p.ouro}/turno por ${p.turnos}`,
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
    propostas,
    fala: resposta.aceita
      ? resposta.fala
      : comprada
        ? `«${resposta.fala}» Mas ${comprada.ouro} por turno o demoveria.`
        : `«${resposta.fala}» E nem o ouro que você tem o demove.`,
    tom: resposta.aceita || comprada ? 'bom' : 'ruim',
  };
}

function grupoDoComercio(jogo: Jogo, eu: string, id: string): GrupoDaMesa {
  const { campanha } = jogo;
  const tem = campanha.acordosDe(eu).includes(id);
  const renda = campanha.rendaDeUmAcordoCom(id);
  const permissao = campanha.podeAcordarComercio(id);
  const resposta = respostaAoComercio(jogo, id, eu);
  return {
    titulo: 'Comércio',
    propostas: [
      tem
        ? {
            acao: 'desfazer-acordo',
            rotulo: `Encerrar · rende ${renda}/turno`,
            valor: 0,
            pode: true,
            aceita: true,
            bloqueio: '',
          }
        : {
            acao: 'acordo',
            rotulo: `Acordo · +${renda}/turno para os dois`,
            valor: 0,
            pode: permissao.pode,
            aceita: resposta.aceita,
            bloqueio: permissao.pode ? '' : permissao.motivo,
          },
    ],
    fala: tem ? `Rende ${renda} por turno a cada um. A guerra desfaz na hora.` : resposta.fala,
    tom: tem || resposta.aceita ? 'bom' : 'ruim',
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
      titulo: 'Aliança',
      propostas: [
        {
          acao: 'romper-alianca',
          rotulo: `Romper · faltam ${emPe} ${emPe === 1 ? 'turno' : 'turnos'}`,
          valor: 0,
          pode: true,
          aceita: true,
          bloqueio: '',
        },
      ],
      fala:
        guerras > 0
          ? `Ele tem ${guerras} ${guerras === 1 ? 'guerra' : 'guerras'} em curso, e elas são suas. Romper custa mais que romper um pacto.`
          : 'As guerras dele são suas, e as suas dele. Romper custa mais que romper um pacto.',
      tom: 'bom',
    };
  }
  const resposta = respostaAoPacto(jogo, id, eu);
  const relacao = campanha.relacaoEntre(eu, id);
  return {
    titulo: 'Aliança',
    propostas: campanha.prazosDeAlianca(eu, id).map((p) => ({
      acao: 'alianca',
      rotulo: `${p.turnos} turnos`,
      valor: p.turnos,
      pode: p.pode,
      aceita: resposta.aceita,
      bloqueio: p.pode ? '' : precoDaConfianca(jogo, id, p.opiniaoMinima - relacao),
    })),
    fala: resposta.aceita
      ? 'As guerras dele passam a ser suas, no mesmo turno e sem perguntar. Pede muito mais confiança que um pacto.'
      : `«${resposta.fala}» Nenhum presente resolve: ele não empresta o exército dele a você.`,
    tom: resposta.aceita ? 'bom' : 'ruim',
  };
}

function grupoDoPacto(jogo: Jogo, eu: string, id: string): GrupoDaMesa {
  const { campanha } = jogo;
  const emPe = Math.max(0, (campanha.pactoAte(eu, id) ?? campanha.turno) - campanha.turno);
  if (emPe > 0) {
    return {
      titulo: 'Pacto',
      propostas: [
        {
          acao: 'romper',
          rotulo: `Romper · faltam ${emPe} ${emPe === 1 ? 'turno' : 'turnos'}`,
          valor: 0,
          pode: true,
          aceita: true,
          bloqueio: '',
        },
      ],
      fala: 'Nenhum dos dois marcha enquanto durar. Romper custa a opinião dele e a sua palavra.',
      tom: 'bom',
    };
  }
  const resposta = respostaAoPacto(jogo, id, eu);
  const relacao = campanha.relacaoEntre(eu, id);
  return {
    titulo: 'Pacto',
    propostas: campanha.prazosDePacto(id).map((p) => ({
      acao: 'pacto',
      rotulo: `${p.turnos} turnos`,
      valor: p.turnos,
      pode: p.pode,
      aceita: resposta.aceita,
      // ⚠️ **A recusa vira PREÇO, e não veredito.** A tela tinha as duas metades da conta — o
      // quanto falta de opinião e três presentes cotados em pontos a três centímetros dali — e
      // nunca fazia a subtração. Dizer "faltam 13 pontos, e 2.500 de ouro cobrem" é a diferença
      // entre fechar uma porta e mostrar a chave.
      bloqueio: p.pode ? '' : precoDaConfianca(jogo, id, p.opiniaoMinima - relacao),
    })),
    // ⚠️ Confiança e vontade são duas travas diferentes, e a fala diz QUAL fechou a porta.
    // Sem isso o jogador com opinião de sobra fica dando presente para destravar um botão que
    // não é a opinião que trava — foi a reclamação mais citada nos fóruns de Total War.
    fala: resposta.aceita
      ? `«${resposta.fala}» O prazo é o quanto ele confia; os trancados dizem o que falta.`
      : `«${resposta.fala}» Aqui nenhum presente resolve: ele pretende te atacar.`,
    tom: resposta.aceita ? 'bom' : 'ruim',
  };
}

function grupoDoTributo(jogo: Jogo, eu: string, id: string): GrupoDaMesa {
  const { campanha } = jogo;
  const emCurso = campanha.tributoEntre(eu, id);
  if (emCurso !== undefined) {
    const faltam = Math.max(0, emCurso.ate - campanha.turno);
    const euPago = emCurso.pagador === eu;
    return {
      titulo: 'Tributo',
      propostas: [
        {
          acao: 'romper-tributo',
          rotulo: `Romper · faltam ${faltam} ${faltam === 1 ? 'turno' : 'turnos'}`,
          valor: 0,
          pode: true,
          aceita: true,
          bloqueio: '',
        },
      ],
      fala: euPago
        ? `Você paga ${emCurso.ouro} por turno e ele não marcha. Romper custa a sua palavra.`
        : `Ele paga ${emCurso.ouro} por turno e você abriu mão de marchar sobre ele.`,
      tom: euPago ? 'ruim' : 'bom',
    };
  }

  const pago = prazosQuePagoComResposta(jogo, id, eu);
  const paga = prazosQueElePagaComResposta(jogo, id, eu);
  const propostas: Proposta[] = [
    ...pago.map((p) => ({
      acao: 'pagar-tributo',
      rotulo: `Pagar ${p.ouro}/turno por ${p.turnos}`,
      valor: p.turnos,
      pode: p.pode,
      aceita: p.resposta.aceita,
      bloqueio: p.pode ? '' : 'as regras não deixam agora',
    })),
    ...paga.map((p) => ({
      acao: 'exigir-tributo',
      rotulo: `Exigir ${p.ouro}/turno por ${p.turnos}`,
      valor: p.turnos,
      pode: p.pode,
      aceita: p.resposta.aceita,
      bloqueio: p.pode ? '' : 'as regras não deixam agora',
    })),
  ];
  const querPagar = paga[0]?.resposta;
  const querReceber = pago.find((p) => p.resposta.aceita)?.resposta ?? pago[0]?.resposta;
  return {
    titulo: 'Tributo',
    propostas,
    fala: `«${querReceber?.fala ?? ''}» · «${querPagar?.fala ?? ''}»`,
    tom: querReceber?.aceita === true || querPagar?.aceita === true ? 'bom' : 'ruim',
  };
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
        rotulo: `${ouro.toLocaleString('pt-BR')} ouro · +${campanha.valorDoPresente(id, ouro)}`,
        valor: ouro,
        pode: permissao.pode,
        // Presente ninguém recusa: o que ele muda é a opinião, e o teto dela é a trava.
        aceita: true,
        bloqueio: permissao.pode ? '' : permissao.motivo,
      };
    });
  return {
    titulo: 'Ouro',
    propostas,
    fala: 'Presente compra TEMPO, não amizade: a opinião volta a cair para o que os fatos dizem.',
    tom: 'morno',
  };
}
