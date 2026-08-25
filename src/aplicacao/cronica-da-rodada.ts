/**
 * O relatório da rodada em frases. **É o único lugar que escreve a notícia.**
 *
 * Fica aqui e não na crônica porque montar a frase exige o que só a campanha e o atlas
 * sabem: o nome da província, o nome do poder e quem é o jogador. A crônica recebe texto
 * pronto e desenha — ela não conhece regra nenhuma.
 *
 * ⚠️ **O tom é do ponto de vista do JOGADOR.** A mesma batalha é ganho para um lado e perda
 * para o outro; uma crônica que pintasse tudo de neutro obrigaria a ler o nome do vencedor
 * para saber se a notícia é boa. Hoje toda batalha é dele — quando a IA existir, é aqui que
 * se decide o que ainda vale ser contado.
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
    if (batalha.vencedor === null) {
      linhas.push({
        tom: 'perda',
        icone: 'lanca',
        // Forças iguais não deixam ninguém em pé: é o único resultado sem vencedor, e sem
        // esta linha o jogador veria as duas peças sumirem sem explicação.
        texto: `${onde} — aniquilação mútua: ninguém ficou de pé.`,
      });
      continue;
    }
    const perdedores = batalha.perdedores.map(nomeDoPoder).join(', ');
    linhas.push({
      tom: batalha.vencedor === eu ? 'ganho' : 'perda',
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
      icone: 'capacete',
      texto: `A milícia de ${atlas.nomeDe(morte.provincia)} perdeu ${numero(morte.mortos)} defensores.`,
    });
  }

  for (const conquista of relatorio.conquistas) {
    linhas.push({
      tom: conquista.para === eu ? 'ganho' : 'perda',
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
    linhas.push({
      tom: 'perda',
      icone: 'territorio',
      texto: `${atlas.nomeDe(saque.provincia)} foi tomada à força: ${partes.join(' e ')}.`,
    });
  }

  // A queda de capital é notícia própria: pro jogador ela também diz o que o jogo está
  // esperando dele — sem esta linha, o botão de turno travado pareceria defeito.
  for (const queda of campanha.quedasDeCapital) {
    linhas.push({
      tom: queda.poder === eu ? 'perda' : 'neutro',
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
    linhas.push({
      tom: cerco.sitiante === eu ? 'ganho' : 'perda',
      icone: 'fogo',
      texto: `${nomeDoPoder(cerco.sitiante)} sitia ${atlas.nomeDe(cerco.provincia)} — sem produção nem trânsito lá dentro.`,
    });
  }

  // "Fome no reino" só quando o POVO não come (saldo civil negativo). O aperto que é só do
  // exército tem a própria notícia, nas perdas de tropa logo abaixo.
  const comida = eu === null ? null : campanha.balancoAlimentarDe(eu);
  if (comida && comida.saldoCivil < 0) {
    linhas.push({
      tom: 'perda',
      icone: 'celeiro',
      texto: `Fome no reino: o saldo civil fechou em −${-comida.saldoCivil}.`,
    });
  }

  // ⚠️ A FOME não vem do relatório da resolução: ela acontece no reino, na virada, e não numa
  // província onde uma batalha aconteceu. Vem da campanha, por isso.
  for (const morte of campanha.fome.provincias) {
    linhas.push({
      tom: campanha.donoDe(morte.provincia) === eu ? 'perda' : 'neutro',
      icone: 'celeiro',
      texto: `${atlas.nomeDe(morte.provincia)} passou fome: ${numero(morte.mortos)} morreram.`,
    });
  }
  for (const perda of campanha.fome.tropas) {
    linhas.push({
      tom: perda.poder === eu ? 'perda' : 'neutro',
      icone: 'capacete',
      texto: `Sem mantimento, ${nomeDoPoder(perda.poder)} perdeu ${numero(perda.homens)} homens em armas.`,
    });
  }

  // O levante é notícia de quem SOFRE a revolta: a bandeira antiga voltou a ter braço.
  for (const levante of campanha.revoltas) {
    linhas.push({
      tom: campanha.donoDe(levante.provincia) === eu ? 'perda' : 'neutro',
      icone: 'fogo',
      texto:
        `${atlas.nomeDe(levante.provincia)} se levanta: ${numero(levante.homens)} ` +
        `rebeldes pegam em armas pela bandeira de ${nomeDoPoder(levante.poder)}.`,
    });
  }

  for (const cerco of relatorio.cercosLevantados) {
    linhas.push({
      tom: cerco.sitiante === eu ? 'perda' : 'ganho',
      icone: 'escudo',
      texto: `O cerco de ${atlas.nomeDe(cerco.provincia)} acabou: ${nomeDoPoder(cerco.sitiante)} não está mais na frente dela.`,
    });
  }

  return linhas;
}
