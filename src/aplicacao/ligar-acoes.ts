/**
 * Onde a interface vira comando: **o único lugar que liga clique a regra.**
 *
 * Nenhum painel conhece a campanha e nenhuma regra conhece o DOM — cada componente expõe um
 * `ao...` e é aqui que ele encontra o método correspondente. É por isso que trocar um painel
 * de lugar não toca em regra nenhuma, e mudar uma regra não toca em painel nenhum.
 */

import { atualizarInterface } from './atualizar-interface';
import { entrarNaCampanha } from './comecar-campanha';
import type { Jogo } from './contexto';
import { esquecerCampanha, salvarCampanha } from './salvamento-local';
import { virarTurno } from './virar-turno';
import { vistaDoAlimento, vistaDoBalanco, vistaDoMercado } from './vistas/governo';

export function ligarAcoes(jogo: Jogo): void {
  const { campanha, atlas, ajustes, cena, tela, selecao } = jogo;
  const repintar = (): void => atualizarInterface(jogo);

  // O mapa se repinta junto com a interface: mudou o dono nas regras, mudou a cor na tela, no
  // mesmo instante e pela mesma verdade. E o disco acompanha: o que se vê é o que está salvo
  // — e é aqui que a vitória e a derrota são percebidas, porque só mudança de estado pode
  // produzi-las.
  campanha.aoMudar = () => {
    cena.pintarDonos((id) => campanha.donoDe(id));
    repintar();
    salvarCampanha(campanha);
    conferirFimDeJogo(jogo);
  };

  tela.lateral.aoTrocarCores = (ligadas) => cena.mostrarCoresDosPoderes(ligadas);

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

  // ── Os painéis da província ─────────────────────────────────────────────────────────
  tela.acoes.aoDefinirImposto = (id, nivel) => campanha.definirImposto(id, nivel);
  tela.acoes.aoConstruir = (id, construcao) => campanha.construir(id, construcao);
  tela.acoes.aoTornarCapital = (id) => campanha.mudarCapital(id);
  tela.recrutamento.aoRecrutar = (id, homens) => campanha.recrutar(id, homens);

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
      if (!provincia) {
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
