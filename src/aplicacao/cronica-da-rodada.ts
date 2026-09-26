/**
 * O relatório da rodada em frases. **É o único lugar que escreve a notícia.**
 *
 * Fica aqui e não na crônica porque montar a frase exige o que só a campanha e o atlas
 * sabem: o nome da província, o nome do poder e quem é o jogador. A crônica recebe texto
 * pronto e desenha — ela não conhece regra nenhuma.
 *
 * ⚠️ **O tom é do ponto de vista do JOGADOR.** A mesma batalha é ganho para um lado e perda
 * para o outro; este é o lugar que decide o tom e quais conflitos da rodada merecem notícia.
 */

import type { LinhaDaCronica } from '@/ui/cronica';
import type { Jogo } from './contexto';

export function noticiasDaRodada(jogo: Jogo): LinhaDaCronica[] {
  const { campanha, atlas } = jogo;
  const eu = campanha.jogador?.id ?? null;
  const nomeDoPoder = (id: string): string => campanha.poder(id).nome;
  const numero = (n: number): string => n.toLocaleString('pt-BR');
  const linhas: LinhaDaCronica[] = [];
  const relatorio = campanha.rodada;

  /**
   * Este acontecimento me envolve? Decide o TOM e o BLOCO da linha.
   *
   * ⚠️ **Existe porque a crônica estava pintando o mundo inteiro de vermelho.** O padrão antigo
   * era `vencedor === eu ? 'ganho' : 'perda'` — e isso fazia uma batalha entre Corinto e Mégara,
   * que não me custa um homem, sair com moldura de sangue e o mesmo peso da queda da minha
   * capital. Era literalmente a queixa de Henrique: *"a crônica mistura muita coisa pouco
   * relevante com o que é importante"*. Quem não é parte da briga é `neutro` e vai para baixo.
   */
  const envolveMim = (...envolvidos: readonly (string | null | undefined)[]): boolean =>
    eu !== null && envolvidos.includes(eu);
  const peso = (envolvido: boolean): 'grave' | 'normal' => (envolvido ? 'grave' : 'normal');

  // ⚠️ **A diplomacia vem ANTES das batalhas, e a ordem importa.** Declarar guerra e marchar
  // acontecem no mesmo turno: sem esta linha em cima, o jogador leria "Batalha em Elêusis" sem
  // nunca ter sabido que alguém tinha declarado guerra a ele. É por aqui que ele descobre.
  for (const noticia of campanha.diplomaciaDaRodada) {
    const comigo = noticia.de === eu || noticia.com === eu;
    const outro = noticia.de === eu ? noticia.com : noticia.de;
    if (noticia.tipo === 'guerra') {
      linhas.push({
        tom: comigo && noticia.de !== eu ? 'perda' : 'neutro',
        peso: peso(comigo),
        icone: 'lanca',
        texto: comigo
          ? noticia.de === eu
            ? `Você declarou guerra a ${nomeDoPoder(outro)}.`
            : `${nomeDoPoder(outro)} DECLAROU GUERRA a você.`
          : `${nomeDoPoder(noticia.de)} declarou guerra a ${nomeDoPoder(noticia.com)}.`,
      });
      continue;
    }
    linhas.push({
      tom: comigo ? 'ganho' : 'neutro',
      peso: peso(comigo),
      icone: 'templo',
      texto: comigo
        ? `Paz assinada com ${nomeDoPoder(outro)}.`
        : `${nomeDoPoder(noticia.de)} e ${nomeDoPoder(noticia.com)} fizeram as pazes.`,
    });
  }

  for (const batalha of relatorio.batalhas) {
    // ⚠️ Um assalto produz DUAS batalhas na mesma província: o exército de fora contra o de
    // dentro, e depois o vencedor contra a muralha. Se as duas linhas dissessem "Batalha em
    // Elêusis", o jogador leria repetição em vez de sequência.
    const onde =
      batalha.provincia === null
        ? 'Encontro na estrada'
        : batalha.tipo === 'assalto'
          ? `Assalto a ${atlas.nomeDe(batalha.provincia)}`
          : `Batalha em ${atlas.nomeDe(batalha.provincia)}`;
    // Minha ou dos outros? A mesma pergunta serve para os dois casos abaixo.
    const minhaBriga = envolveMim(batalha.vencedor, ...batalha.perdedores);
    if (batalha.vencedor === null) {
      linhas.push({
        tom: minhaBriga ? 'perda' : 'neutro',
        peso: peso(minhaBriga),
        icone: 'lanca',
        // Forças iguais não deixam ninguém em pé: é o único resultado sem vencedor, e sem
        // esta linha o jogador veria as duas peças sumirem sem explicação.
        texto: `${onde} — aniquilação mútua: ninguém ficou de pé.`,
      });
      continue;
    }
    const perdedores = batalha.perdedores.map(nomeDoPoder).join(', ');
    linhas.push({
      tom: batalha.vencedor === eu ? 'ganho' : minhaBriga ? 'perda' : 'neutro',
      peso: peso(minhaBriga),
      icone: 'lanca',
      texto:
        `${onde} — ${nomeDoPoder(batalha.vencedor)} venceu ${perdedores}; ` +
        `${numero(batalha.sobreviventes)} continuam de pé.`,
    });
  }

  for (const morte of relatorio.milicianosMortos) {
    // ⚠️ **De quem era essa milícia?** Do dono de ANTES da rodada. Perguntar ao estado atual
    // erra justamente no caso mais comum — a cidade que acabou de ser tomada, cuja milícia
    // morreu defendendo o dono anterior. Sem isto, conquistar Elêusis pintava a morte da
    // milícia dela como perda do jogador.
    const tomada = relatorio.conquistas.find((c) => c.provincia === morte.provincia);
    const deQuemEra = tomada ? tomada.de : campanha.donoDe(morte.provincia);
    linhas.push({
      tom: deQuemEra === eu ? 'perda' : 'neutro',
      peso: peso(deQuemEra === eu),
      icone: 'capacete',
      texto: `A milícia de ${atlas.nomeDe(morte.provincia)} perdeu ${numero(morte.mortos)} defensores.`,
    });
  }

  for (const conquista of relatorio.conquistas) {
    // ⚠️ **Terra que troca de mãos entre DOIS VIZINHOS não é perda minha.** Era pintada como
    // se fosse — e numa guerra grande longe de mim isso enchia a crônica de vermelho.
    const minha = envolveMim(conquista.de, conquista.para);
    linhas.push({
      tom: conquista.para === eu ? 'ganho' : conquista.de === eu ? 'perda' : 'neutro',
      peso: peso(minha),
      icone: 'territorio',
      texto: `${atlas.nomeDe(conquista.provincia)} passou de ${nomeDoPoder(conquista.de)} para ${nomeDoPoder(conquista.para)}.`,
    });
  }

  // ⚠️ **O saque é notícia SEPARADA da conquista**, e não um adendo dela: nem toda cidade
  // tomada é saqueada — quem marcha para uma província vazia não quebra nada. Juntar as duas
  // linhas faria a crônica anunciar destruição onde não houve luta.
  //
  // O tom é `perda` mesmo para quem tomou a cidade: ela é sua a partir de agora, e o estrago
  // também. É a conta do assalto, e é ela que dá ao cerco um motivo que não é paciência.
  for (const saque of relatorio.saques) {
    if (saque.mortos <= 0 && saque.obra === null) continue;
    const partes: string[] = [];
    if (saque.mortos > 0) partes.push(`${numero(saque.mortos)} moradores morreram`);
    if (saque.obra !== null) {
      const nome = campanha.nomeDaObra(saque.obra);
      partes.push(saque.nivel === 0 ? `${nome} foi ao chão` : `${nome} caiu para o nível ${saque.nivel}`);
    }
    // A cidade saqueada é minha agora, ou era minha até esta rodada? Nos dois casos o estrago
    // é meu, e é o que separa a notícia do saque distante.
    const tomada = relatorio.conquistas.find((c) => c.provincia === saque.provincia);
    const meuEstrago = envolveMim(campanha.donoDe(saque.provincia), tomada?.de);
    linhas.push({
      tom: 'perda',
      peso: peso(meuEstrago),
      icone: 'territorio',
      texto: `${atlas.nomeDe(saque.provincia)} foi tomada à força: ${partes.join(' e ')}.`,
    });
  }

  // A queda de capital é notícia própria: pro jogador ela também diz o que o jogo está
  // esperando dele — sem esta linha, o botão de turno travado pareceria defeito.
  for (const queda of campanha.quedasDeCapital) {
    linhas.push({
      tom: queda.poder === eu ? 'perda' : 'neutro',
      peso: peso(queda.poder === eu),
      icone: 'templo',
      texto:
        queda.poder === eu
          ? `A capital caiu: ${atlas.nomeDe(queda.provincia)} está em mãos inimigas. ` +
            'Assente outra antes de passar o turno.'
          : `${nomeDoPoder(queda.poder)} perdeu a capital, ${atlas.nomeDe(queda.provincia)}.`,
    });
  }

  // Só os cercos NOVOS: um cerco que dura oito rodadas não é oito notícias. Quem quer saber
  // que ele continua olha a bandeira no mapa ou a ficha da província.
  for (const cerco of relatorio.cercos.filter((c) => c.novo)) {
    const sitiado = campanha.donoDe(cerco.provincia);
    linhas.push({
      tom: cerco.sitiante === eu ? 'ganho' : sitiado === eu ? 'perda' : 'neutro',
      peso: peso(envolveMim(cerco.sitiante, sitiado)),
      icone: 'fogo',
      texto: `${nomeDoPoder(cerco.sitiante)} sitia ${atlas.nomeDe(cerco.provincia)}.`,
    });
  }

  // "Fome no reino" só quando o POVO não come (saldo civil negativo). O aperto que é só do
  // exército tem a própria notícia, nas perdas de tropa logo abaixo.
  const comida = eu === null ? null : campanha.balancoAlimentarDe(eu);
  if (comida && comida.saldoCivil < 0) {
    linhas.push({
      tom: 'perda',
      // O reino que passa fome é sempre o meu — a conta só é buscada quando `eu` existe.
      peso: 'grave',
      icone: 'celeiro',
      texto: `Fome no reino: o saldo civil fechou em −${-comida.saldoCivil}.`,
    });
  }

  // ⚠️ A FOME não vem do relatório da resolução: ela acontece no reino, na virada, e não numa
  // província onde uma batalha aconteceu. Vem da campanha, por isso.
  for (const morte of campanha.fome.provincias) {
    linhas.push({
      tom: campanha.donoDe(morte.provincia) === eu ? 'perda' : 'neutro',
      peso: peso(campanha.donoDe(morte.provincia) === eu),
      icone: 'celeiro',
      texto: `${atlas.nomeDe(morte.provincia)} passou fome: ${numero(morte.mortos)} morreram.`,
    });
  }
  for (const perda of campanha.fome.tropas) {
    linhas.push({
      tom: perda.poder === eu ? 'perda' : 'neutro',
      peso: peso(perda.poder === eu),
      icone: 'capacete',
      texto: `Sem mantimento, ${nomeDoPoder(perda.poder)} perdeu ${numero(perda.homens)} homens em armas.`,
    });
  }

  // O levante é notícia de quem SOFRE a revolta: a bandeira antiga voltou a ter braço.
  for (const levante of campanha.revoltas) {
    linhas.push({
      tom: campanha.donoDe(levante.provincia) === eu ? 'perda' : 'neutro',
      peso: peso(campanha.donoDe(levante.provincia) === eu),
      icone: 'fogo',
      texto:
        `${atlas.nomeDe(levante.provincia)} se levanta: ${numero(levante.homens)} ` +
        `rebeldes pegam em armas pela bandeira de ${nomeDoPoder(levante.poder)}.`,
    });
  }

  for (const cerco of relatorio.cercosLevantados) {
    // ⚠️ **`ganho` era o padrão para TODO cerco levantado que não fosse meu** — inclusive o de
    // dois vizinhos do outro lado do mapa, que não me dá nada. Ganho é só quando a cidade
    // livrada é minha.
    const livrada = campanha.donoDe(cerco.provincia);
    linhas.push({
      tom: cerco.sitiante === eu ? 'perda' : livrada === eu ? 'ganho' : 'neutro',
      peso: peso(envolveMim(cerco.sitiante, livrada)),
      icone: 'escudo',
      texto: `O cerco de ${atlas.nomeDe(cerco.provincia)} acabou: ${nomeDoPoder(cerco.sitiante)} não está mais na frente dela.`,
    });
  }

  return linhas;
}
