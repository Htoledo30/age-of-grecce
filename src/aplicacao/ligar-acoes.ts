/**
 * Onde a interface vira comando: **o único lugar que liga clique a regra.**
 *
 * Nenhum painel conhece a campanha e nenhuma regra conhece o DOM — cada componente expõe um
 * `ao...` e é aqui que ele encontra o método correspondente. É por isso que trocar um painel
 * de lugar não toca em regra nenhuma, e mudar uma regra não toca em painel nenhum.
 */

import { coresDasRelacoes } from './vistas/mapa-de-relacoes';
import { nomesNoMapa } from '@/ui/menu-pausa';
import { atualizarInterface } from './atualizar-interface';
import { entrarNaCampanha } from './comecar-campanha';
import type { Jogo } from './contexto';
import { esquecerCampanha, salvarCampanha } from './salvamento-local';
import { aceitaPacto } from '@/ia/diplomacia/pactos';
import { aceitaPagarTributo, aceitaTributo } from '@/ia/diplomacia/tributos';
import { querPaz, querPazComTributo } from '@/ia/diplomacia/paz';
import { estiloDe } from '@/ia/estilo';
import { virarTurno } from './virar-turno';
import { vistaDoAlimento, vistaDoBalanco, vistaDoMercado } from './vistas/governo';
import { vistaDaDiplomacia } from './vistas/mesa-diplomatica';
import { vistaDeConstrucoes, vistaDeRecrutamento } from './vistas/provincia';
import { formatarAno } from '@/campanha/estado-campanha';

export function ligarAcoes(jogo: Jogo): void {
  const { campanha, atlas, ajustes, cena, tela, selecao } = jogo;
  const repintar = (): void => atualizarInterface(jogo);

  // O mapa se repinta junto com a interface: mudou o dono nas regras, mudou a cor na tela, no
  // mesmo instante e pela mesma verdade. E o disco acompanha: o que se vê é o que está salvo
  // — e é aqui que a vitória e a derrota são percebidas, porque só mudança de estado pode
  // produzi-las.
  /**
   * Repinta o mapa com o modo vigente: político por padrão, relações quando há um sujeito.
   *
   * Uma porta só, porque as duas pinturas competem pela mesma paleta: dois lugares chamando
   * `pintarDonos` e `pintarCores` fariam o modo voltar sozinho ao político na primeira
   * conquista.
   */
  const repintarMapa = (): void => {
    const sujeito = selecao.relacoesDe;
    if (sujeito === null) cena.pintarDonos((id) => campanha.donoDe(id));
    else cena.pintarCores(coresDasRelacoes(jogo, sujeito));
  };

  campanha.aoMudar = () => {
    repintarMapa();
    repintar();
    salvarCampanha(campanha);
    conferirFimDeJogo(jogo);
  };

  tela.lateral.aoTrocarCores = (ligadas) => cena.mostrarCoresDosPoderes(ligadas);

  // Os nomes são montados uma vez e vivem escondidos: ligar não recria nada, só revela.
  tela.rotulosMapa.desenhar(
    atlas.provincias
      .filter((p) => p.rotulo !== undefined)
      .map((p) => ({
        id: p.id,
        nome: p.nome,
        x: p.rotulo?.x ?? 0,
        y: p.rotulo?.y ?? 0,
        raio: p.rotulo?.raio ?? 0,
        mar: p.mar === true,
      })),
  );
  // ⚠️ **Ligado de saída**, e a opção de desligar vive no menu de pausa: decisão de Henrique
  // — *"tem que estar ativa 24 horas por dia; o único jeito de desligar seria indo em opções"*.
  tela.rotulosMapa.mostrar(nomesNoMapa());
  tela.pausa.aoTrocarNomes = (ligados) => tela.rotulosMapa.mostrar(ligados);

  // ⚠️ **O sujeito das relações troca por CLIQUE NO MAPA**, e é o pedido de Henrique ao pé da
  // letra: *"a cor de um reino que eu selecionar"*. Uma lista de dezessete nomes no painel
  // responderia a pergunta errada — a dele é sobre o mapa, e é no mapa que ela se aponta.
  tela.lateral.aoTrocarRelacoes = (ligado) => {
    selecao.relacoesDe = ligado ? (campanha.jogador?.id ?? null) : null;
    tela.lateral.marcarRelacoes(
      selecao.relacoesDe === null ? null : campanha.poder(selecao.relacoesDe).nome,
    );
    repintarMapa();
  };

  // ── A barra de turno e o Governo ────────────────────────────────────────────────────
  tela.barraTurno.aoPassarTurno = () => virarTurno(jogo);
  tela.barraTurno.aoAbrirGoverno = () => {
    const vista = vistaDoBalanco(jogo);
    if (!vista) return;
    tela.balanco.desenhar(vista);
    tela.balancoAlimentar.desenhar(vistaDoAlimento(jogo));
    tela.mercado.desenhar(vistaDoMercado(jogo));
    tela.governo.alternar();
  };
  tela.barraTurno.aoAbrirDiplomacia = () => {
    tela.diplomacia.desenhar(vistaDaDiplomacia(jogo));
    tela.diplomacia.alternar();
  };

  // ── O painel da província e as duas janelas que ele abre ────────────────────────────
  tela.acoes.aoDefinirImposto = (id, nivel) => campanha.definirImposto(id, nivel);
  tela.acoes.aoTornarCapital = (id) => campanha.mudarCapital(id);
  // Desenhar ANTES de abrir, e não depois: abrir uma janela que só se preenche no próximo
  // desenho a faria piscar vazia por um quadro.
  tela.acoes.aoAbrirConstrucoes = () => {
    tela.construcoes.desenhar(vistaDeConstrucoes(jogo));
    tela.construcoes.abrir();
  };
  tela.acoes.aoAbrirRecrutamento = () => {
    tela.recrutamento.mostrar(vistaDeRecrutamento(jogo));
    tela.recrutamento.abrir();
  };
  tela.construcoes.aoConstruir = (id, construcao) => campanha.construir(id, construcao);
  tela.recrutamento.aoRecrutar = (id, homens, arma) => campanha.recrutar(id, homens, arma);

  // ── A ficha do exército ─────────────────────────────────────────────────────────────
  tela.exercitoFicha.aoDispensar = (idHoste, homens) => campanha.dispensarHoste(idHoste, homens);
  tela.exercitoFicha.aoAlternarMarcha = (idHoste) => {
    selecao.marchando = selecao.marchando === idHoste ? null : idHoste;
    repintar();
  };
  tela.exercitoFicha.aoMudarQuantidade = (homens) => {
    selecao.homensParaMarchar = homens;
  };
  tela.exercitoFicha.aoCancelarOrdem = (idHoste) => campanha.cancelarOrdem(idHoste);
  tela.exercitoFicha.aoSurtir = (idHoste) => campanha.surtir(idHoste);
  // Confirma a ordem contra o alvo já apontado. É aqui que assaltar e sitiar deixam de ser um
  // ajuste e viram a decisão que fecha a ordem.
  tela.exercitoFicha.aoTrocarRecuo = (recuar) => {
    selecao.recuarNaProximaMarcha = recuar;
  };
  tela.exercitoFicha.aoEscolherPostura = (postura) => {
    if (selecao.marchando === null || selecao.alvoHostil === null) return;
    // ⚠️ **Confere antes de mandar, porque a regra ATIRA.** O painel já desabilita os botões
    // quando a ordem não pode sair, mas o clique não pode depender só disso: um clique que
    // escape da tela vira exceção engolida pelo navegador, e o jogador fica clicando sem
    // nada acontecer e sem nada explicar. Foi assim que este defeito viveu — Henrique o
    // encontrou jogando, não os testes.
    if (
      !campanha.podeOrdenarMarcha(selecao.marchando, selecao.alvoHostil, selecao.homensParaMarchar)
        .pode
    ) {
      repintar();
      return;
    }
    campanha.ordenarMarcha(
      selecao.marchando,
      selecao.alvoHostil,
      selecao.homensParaMarchar,
      undefined,
      postura,
      // A ordem de recuo é dada com a marcha e vale só para ela: a próxima começa em
      // "lutar até o fim", que é o padrão de quem não disse nada.
      selecao.recuarNaProximaMarcha ? ajustes.jogo.combate.batalha.limiarDeRecuo : null,
    );
    selecao.marchando = null;
    selecao.alvoHostil = null;
    selecao.recuarNaProximaMarcha = false;
    repintar();
  };
  tela.exercitoFicha.aoTrocarPosturaDoCerco = (id, postura) => campanha.mudarPostura(id, postura);

  // ── Diplomacia ─────────────────────────────────────────────────────────────────────
  tela.diplomacia.aoDeclararGuerra = (idPoder) => {
    const r = campanha.podeDeclararGuerra(idPoder);
    if (!r.pode) {
      tela.diplomacia.dizer(r.motivo);
      return;
    }
    campanha.declararGuerra(idPoder);
    tela.diplomacia.dizer(`Guerra declarada a ${campanha.poder(idPoder).nome}.`);
  };

  /**
   * ⚠️ **A paz precisa dos DOIS, e é aqui que as duas respostas se encontram.**
   *
   * A regra do jogo (`campanha.fazerPaz`) só REGISTRA o acordo — ela não sabe negociar, e não
   * deve saber: se soubesse, a regra dependeria da cabeça de um dos jogadores. Quem responde
   * pelo outro lado é a IA, pela mesma função que ela usa para decidir as pazes dela. A
   * aplicação é o lugar onde o clique do jogador e a cabeça da IA se juntam.
   */
  tela.diplomacia.aoPresentear = (idPoder, ouro) => {
    const r = campanha.podePresentear(idPoder, ouro);
    if (!r.pode) {
      tela.diplomacia.dizer(r.motivo);
      return;
    }
    const pontos = campanha.presentear(idPoder, ouro);
    const nome = campanha.poder(idPoder).nome;
    tela.diplomacia.dizer(
      pontos > 0
        ? `${nome} agradeceu o presente. Opinião +${pontos}.`
        : `${nome} aceitou o ouro, mas já estava tão bem disposto quanto o ouro consegue deixá-lo.`,
    );
  };

  tela.diplomacia.aoAcordarComercio = (idPoder) => {
    const r = campanha.podeAcordarComercio(idPoder);
    if (!r.pode) {
      tela.diplomacia.dizer(r.motivo);
      return;
    }
    const renda = campanha.rendaDeUmAcordoCom(idPoder);
    campanha.acordarComercio(idPoder);
    tela.diplomacia.dizer(
      `Comércio aberto com ${campanha.poder(idPoder).nome}: +${renda} por turno para os dois.`,
    );
  };

  tela.diplomacia.aoConcederAcesso = (idPoder, turnos) => {
    const eu = campanha.jogador?.id;
    if (eu === undefined) return;
    const r = campanha.podeConcederAcesso(eu, idPoder, turnos);
    if (!r.pode) {
      tela.diplomacia.dizer(r.motivo);
      return;
    }
    campanha.concederAcesso(idPoder, turnos);
    tela.diplomacia.dizer(
      `${campanha.poder(idPoder).nome} pode atravessar a sua terra por ${turnos} turnos. ` +
        'Passagem não é conquista: ele não toma nada.',
    );
  };

  tela.diplomacia.aoRevogarAcesso = (idPoder) => {
    campanha.revogarAcesso(idPoder);
    tela.diplomacia.dizer(
      `Estrada fechada para ${campanha.poder(idPoder).nome}. ` +
        'Quem já estava dentro fica onde está — e não avança mais.',
    );
  };

  // ⚠️ **A resposta ao pedido DELE.** É a única ação da mesa em que o jogador não propõe: ele
  // responde. Recusar não custa nada, de propósito — ver `diplomacia/propostas.ts`.
  tela.diplomacia.aoResponderPedido = (idPoder, tipo, aceita) => {
    const nome = campanha.poder(idPoder).nome;
    if (!aceita) {
      campanha.recusarProposta(idPoder, tipo as 'pacto' | 'comercio' | 'acesso');
      tela.diplomacia.dizer(`Você recusou ${nome}. Recusar não custa nada.`);
      return;
    }
    const r = campanha.aceitarProposta(idPoder, tipo as 'pacto' | 'comercio' | 'acesso');
    tela.diplomacia.dizer(r.pode ? `Acertado com ${nome}.` : r.motivo);
  };

  tela.diplomacia.aoDesfazerAcordo = (idPoder) => {
    campanha.desfazerAcordo(idPoder);
    tela.diplomacia.dizer(`Comércio encerrado com ${campanha.poder(idPoder).nome}.`);
  };

  tela.diplomacia.aoFirmarPacto = (idPoder, turnos) => {
    const eu = campanha.jogador?.id;
    if (eu === undefined) return;
    const r = campanha.podeFirmarPacto(idPoder, turnos);
    if (!r.pode) {
      tela.diplomacia.dizer(r.motivo);
      return;
    }
    // ⚠️ **A opinião abre a porta, mas ele ainda precisa QUERER** — a mesma pergunta que a IA
    // faz antes de assinar com outro computador. Sem ela o jogador amarraria as mãos de um
    // vizinho que está justamente juntando exército para atacá-lo, e foi assim que a medição
    // pulou para 46 conquistas e 12 poderes eliminados.
    if (!aceitaPacto(campanha, idPoder, eu, estiloDe(jogo.ia, idPoder))) {
      tela.diplomacia.dizer(
        `${campanha.poder(idPoder).nome} recusou: não pretende amarrar as próprias mãos.`,
      );
      return;
    }
    campanha.firmarPacto(idPoder, turnos);
    tela.diplomacia.dizer(
      `Pacto de ${turnos} turnos assinado com ${campanha.poder(idPoder).nome}.`,
    );
  };

  tela.diplomacia.aoRomperPacto = (idPoder) => {
    campanha.romperPacto(idPoder);
    tela.diplomacia.dizer(
      `Pacto rompido. ${campanha.poder(idPoder).nome} não esquece, e o mapa inteiro viu.`,
    );
  };

  /**
   * OFERECER tributo: o jogador paga, e o outro precisa ter um ano para vender.
   *
   * ⚠️ **A recusa aqui é a informação mais valiosa da tela.** "Não tenho nada contra você" diz
   * ao jogador, de graça e sem custo nenhum, que daquele vizinho não vem invasão — e é o que
   * impede o tesouro cheio de comprar o mapa inteiro no primeiro turno.
   */
  tela.diplomacia.aoPagarTributo = (idPoder, turnos) => {
    const eu = campanha.jogador?.id;
    if (eu === undefined) return;
    const nome = campanha.poder(idPoder).nome;
    const r = campanha.podeFirmarTributo(eu, idPoder, turnos);
    if (!r.pode) {
      tela.diplomacia.dizer(r.motivo);
      return;
    }
    const ajustes = jogo.ajustes.jogo.diplomacia.tributo;
    const ouro = campanha.valorDeUmTributoDe(eu, turnos);
    // ⚠️ A quantia CONCRETA entra na pergunta, e não uma média: o prazo longo é a parcela
    // barata, então o mesmo vizinho pode aceitar dez turnos e recusar quarenta.
    if (!aceitaTributo(campanha, idPoder, eu, ouro, estiloDe(jogo.ia, idPoder), ajustes)) {
      tela.diplomacia.dizer(
        `${nome} recusou ${ouro} por turno: ou não tem ano nenhum para te vender, ou é troco perto do que ele arrecada.`,
      );
      return;
    }
    campanha.pagarTributoA(idPoder, turnos);
    tela.diplomacia.dizer(
      `${nome} aceita o tributo: ${ouro} por turno durante ${turnos} turnos, e ele não marcha.`,
    );
  };

  /** EXIGIR tributo: o jogador recebe, e o outro só paga a quem realmente o alcança. */
  tela.diplomacia.aoExigirTributo = (idPoder, turnos) => {
    const eu = campanha.jogador?.id;
    if (eu === undefined) return;
    const nome = campanha.poder(idPoder).nome;
    const r = campanha.podeFirmarTributo(idPoder, eu, turnos);
    if (!r.pode) {
      tela.diplomacia.dizer(r.motivo);
      return;
    }
    if (!aceitaPagarTributo(campanha, idPoder, eu, jogo.ajustes.jogo.diplomacia.tributo)) {
      tela.diplomacia.dizer(`${nome} recusou: não teme o bastante o seu exército.`);
      return;
    }
    campanha.exigirTributoDe(idPoder, turnos);
    tela.diplomacia.dizer(
      `${nome} paga ${campanha.valorDeUmTributoDe(idPoder, turnos)} por turno durante ${turnos} turnos.`,
    );
  };

  /**
   * **COMPRAR A PAZ**: a saída de uma guerra que está sendo perdida.
   *
   * ⚠️ **Se ele já queria a paz, o jogador não paga.** `querPazComTributo` devolve `true` de
   * graça nesse caso, e cobrar por uma coisa que sairia sozinha seria roubar o jogador com uma
   * informação que só o jogo tinha. Assina-se a paz simples e diz-se o que aconteceu.
   */
  tela.diplomacia.aoPazComTributo = (idPoder, turnos) => {
    const eu = campanha.jogador?.id;
    if (eu === undefined) return;
    const nome = campanha.poder(idPoder).nome;
    const r = campanha.podeFazerPazComTributo(idPoder, turnos);
    if (!r.pode) {
      tela.diplomacia.dizer(r.motivo);
      return;
    }
    const estilo = estiloDe(jogo.ia, idPoder);
    const combate = jogo.ajustes.jogo.combate;
    if (querPaz(campanha, idPoder, eu, estilo, combate)) {
      campanha.fazerPaz(idPoder);
      tela.diplomacia.dizer(`${nome} aceitou a paz sem cobrar nada. Guarde o ouro.`);
      return;
    }
    const ouro = campanha.valorDeUmTributoDe(eu, turnos);
    const aceita = querPazComTributo(
      campanha,
      idPoder,
      eu,
      ouro,
      turnos,
      estilo,
      combate,
      jogo.ajustes.jogo.diplomacia.tributo,
    );
    if (!aceita) {
      tela.diplomacia.dizer(
        `${nome} recusou: ${ouro} por turno é menos do que ele ainda pretende tomar de você.`,
      );
      return;
    }
    campanha.fazerPazComTributo(idPoder, turnos);
    tela.diplomacia.dizer(
      `Paz comprada com ${nome}: ${ouro} por turno durante ${turnos} turnos.`,
    );
  };

  tela.diplomacia.aoRomperTributo = (idPoder) => {
    campanha.romperTributo(idPoder);
    tela.diplomacia.dizer(
      `Tributo rompido. ${campanha.poder(idPoder).nome} não esquece, e o mapa inteiro viu.`,
    );
  };

  tela.diplomacia.aoProporPaz = (idPoder) => {
    const eu = campanha.jogador?.id;
    if (eu === undefined) return;
    const nome = campanha.poder(idPoder).nome;
    if (!campanha.podeFazerPaz(idPoder).pode) {
      tela.diplomacia.dizer(`Você não está em guerra com ${nome}.`);
      return;
    }
    if (!querPaz(campanha, idPoder, eu, estiloDe(jogo.ia, idPoder), jogo.ajustes.jogo.combate)) {
      tela.diplomacia.dizer(`${nome} recusou: acha que ainda tem o que ganhar.`);
      return;
    }
    campanha.fazerPaz(idPoder);
    tela.diplomacia.dizer(`Paz assinada com ${nome}.`);
  };

  // ── As camadas do mapa ──────────────────────────────────────────────────────────────
  tela.destinosMapa.aoEscolher = (destino) => {
    if (selecao.marchando === null) return;
    // Terra alheia não vira ordem no clique: primeiro o jogador diz o que fazer ao chegar.
    // Apontar de novo troca o alvo, e clicar fora cancela tudo.
    const poder = campanha.hoste(selecao.marchando)?.poder;
    if (poder !== undefined && campanha.donoDe(destino) !== poder) {
      selecao.alvoHostil = destino;
      repintar();
      return;
    }
    // Destino amigo: registra a ORDEM. Nada se move agora — a marcha acontece na virada do
    // turno, junto com as de todo mundo.
    campanha.ordenarMarcha(selecao.marchando, destino, selecao.homensParaMarchar);
    selecao.marchando = null;
    repintar();
  };
  tela.destinosMapa.aoDestacar = (destino) => tela.marchasMapa.destacar(destino);

  // Enquanto marcha, a peça está entre duas províncias; quem responde onde ela está é a
  // animação, e a camada só desenha.
  tela.hostesMapa.ondeEstaMarchando = (idHoste) => tela.animacaoDeMarcha.posicaoDe(idHoste);
  tela.hostesMapa.aoSelecionar = (idHoste) => {
    // Clicar na hoste escolhe as DUAS coisas: a tropa e o chão sob ela. Os dois painéis ficam
    // verdadeiros ao mesmo tempo, e o jogador não precisa clicar duas vezes.
    //
    // A peça de uma leva em formação não é hoste ainda: ela não aceita comando, então só o
    // chão é escolhido. Clicar nela não pode acender uma ficha de exército vazia.
    const hoste = campanha.hoste(idHoste);
    selecao.hoste = hoste ? idHoste : null;
    selecao.provincia = hoste?.posicao ?? idHoste.replace('formacao:', '');
    repintar();
  };

  // O pulso de chegada dispara quando a peça ASSENTA, não quando o turno vira: antes ele
  // acontecia enquanto a hoste ainda estaria a caminho, e confirmava uma chegada que o jogador
  // ainda não tinha visto.
  tela.animacaoDeMarcha.aoChegar = (hostes) => {
    for (const id of hostes) selecao.chegadasRecentes.add(id);
    repintar();
    if (selecao.temporizadorDaChegada !== undefined) {
      window.clearTimeout(selecao.temporizadorDaChegada);
    }
    selecao.temporizadorDaChegada = window.setTimeout(() => {
      selecao.chegadasRecentes.clear();
      repintar();
    }, ajustes.animacao.segundosDoPulsoDeChegada * 1000);
  };

  cena.aoSelecionar = (indice) => {
    const provincia = indice === null ? null : (atlas.porIndice(indice) ?? null);
    if (selecao.fase === 'escolha') {
      // Água não é reino: escolher com quem jogar é escolher terra, e perguntar o dono do
      // mar devolveria o poder vazio.
      if (!provincia || atlas.ehMar(provincia.id)) {
        tela.inicio.selecionar(null);
        return;
      }
      const dono = campanha.poder(campanha.donoDe(provincia.id));
      tela.inicio.selecionar({ poder: dono, provincias: campanha.provinciasDe(dono.id).length });
      return;
    }
    if (selecao.fase !== 'campanha') return;
    // Clicar fora dos destinos cancela a marcha em vez de recusar com mensagem: os alvos
    // legais estão desenhados, e reclamar de cada clique errado seria ruído.
    selecao.marchando = null;
    selecao.alvoHostil = null;
    selecao.provincia = provincia?.id ?? null;
    // No modo de relações, clicar numa terra é perguntar "e este aqui, o que os outros acham
    // dele?" — o mapa inteiro se reescreve do ponto de vista do dono dela.
    if (selecao.relacoesDe !== null && provincia) {
      const dono = campanha.donoDe(provincia.id);
      if (dono !== '') {
        selecao.relacoesDe = dono;
        tela.lateral.marcarRelacoes(campanha.poder(dono).nome);
        repintarMapa();
      }
    }
    // Clicar no mapa é escolher CHÃO: solta a hoste. Sem isto, a ficha do exército ficaria em
    // pé descrevendo uma tropa que o jogador não está mais olhando.
    selecao.hoste = null;
    repintar();
  };

  // ── O menu e o fim de jogo ──────────────────────────────────────────────────────────
  tela.inicio.aoPedirEscolha = () => {
    selecao.fase = 'escolha';
    selecao.provincia = null;
    tela.ficha.mostrar(null);
    if (!atlas.existe('atenas')) throw new Error('província de Atenas ausente dos dados');
    const atenas = atlas.provincia('atenas');
    cena.posicionar(atenas.centro.x, atenas.centro.y, ajustes.camera.zoomMaximo);
  };
  // Um poder é jogável quando TODAS as suas províncias têm economia configurada — a regra
  // deriva dos dados, e liberar uma cidade nova é só escrever a ficha dela.
  tela.inicio.podeJogar = (idPoder) => campanha.semEconomia(idPoder) === 0;
  tela.inicio.aoContinuar = () => {
    selecao.fase = 'campanha';
    tela.inicio.encerrar(campanha.jogador?.id ?? '');
    // A câmera abre na capital do jogador: quem retoma quer ver a própria casa, não o canto do
    // mapa onde a sessão anterior parou de olhar.
    const capital = campanha.jogador ? campanha.capitalDe(campanha.jogador.id) : undefined;
    if (capital !== undefined && atlas.existe(capital)) {
      const casa = atlas.provincia(capital);
      cena.posicionar(casa.centro.x, casa.centro.y, ajustes.camera.zoomMaximo);
    }
    repintar();
  };
  tela.inicio.aoRecomecar = () => {
    // A decisão destrutiva já foi explícita no rótulo do botão. Recarregar a página é o que
    // garante que a partida nova nasce do zero de verdade, sem estado herdado.
    esquecerCampanha();
    location.reload();
  };
  tela.inicio.aoComecarCampanha = (idPoder) => {
    if (campanha.semEconomia(idPoder) > 0) return;
    // Nem notícia: a crônica da partida anterior fala de um mundo que deixou de existir.
    tela.cronica.esconder();
    entrarNaCampanha(jogo, idPoder);
  };
  tela.pausa.aoSairParaMenu = () => {
    salvarCampanha(campanha);
    tela.pausa.fechar();
    tela.construcoes.fechar();
    tela.recrutamento.fechar();
    tela.governo.fechar();
    tela.diplomacia.fechar();
    tela.batalha.esconder();
    tela.animacaoDeMarcha.parar();
    selecao.fase = 'menu';
    selecao.provincia = null;
    selecao.hoste = null;
    selecao.marchando = null;
    selecao.alvoHostil = null;
    tela.inicio.oferecerContinuacao(
      `${campanha.jogador?.nome ?? ''} · turno ${campanha.turno} · ${formatarAno(campanha.ano)}`,
    );
    tela.inicio.mostrarMenu();
    repintar();
  };
  tela.pausa.aoSairDoJogo = () => {
    salvarCampanha(campanha);
    if (window.nativo) window.nativo.sair();
    else window.close();
  };
  tela.fimDeJogo.aoNovaCampanha = () => {
    esquecerCampanha();
    location.reload();
  };
}

/** A campanha acabou? A tela de fim aparece uma vez; o resto do jogo continua vivo. */
function conferirFimDeJogo(jogo: Jogo): void {
  if (jogo.selecao.fase !== 'campanha') return;
  const resultado = jogo.campanha.resultado();
  if (resultado) {
    jogo.tela.fimDeJogo.mostrar(resultado, jogo.campanha.jogador?.nome ?? 'Seu poder');
  }
}
