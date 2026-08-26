/**
 * As três abas do Governo: o balanço em moedas, a conta da comida e o mercado.
 *
 * ⚠️ Derivadas na hora, como todas as vistas: guardar isto seria criar uma segunda verdade
 * sobre os mesmos saldos.
 */

import type { VistaDoAlimento } from '@/ui/balanco-alimentar';
import type { VistaDoBalanco } from '@/ui/balanco';
import type { VistaDaDiplomacia } from '@/ui/diplomacia';
import type { VistaDoMercado } from '@/ui/mercado';
import type { Jogo } from '../contexto';

const ALGARISMOS = ['0', 'I', 'II', 'III'];

/** O nome de uma construção com o nível em romano, como a interface escreve. */
function comNivel(jogo: Jogo, idConstrucao: string, nivel: number): string {
  const nome = jogo.campanha.construcoesDisponiveis[idConstrucao]?.nome ?? idConstrucao;
  return `${nome} ${ALGARISMOS[nivel] ?? String(nivel)}`;
}

/** A tabela do balanço, montada do estado — a mesma verdade que a barra e a ficha. */
export function vistaDoBalanco(jogo: Jogo): VistaDoBalanco | null {
  const { campanha } = jogo;
  const jogador = campanha.jogador;
  if (!jogador) return null;
  return {
    poder: jogador,
    ano: campanha.ano,
    turno: campanha.turno,
    tesouro: campanha.tesouro,
    trocas: campanha.rendaDeTrocas(jogador.id),
    linhas: campanha.provinciasDe(jogador.id).map((id) => {
      const e = campanha.economiaDe(id);
      const obra = campanha.obraEm(id);
      return {
        nome: campanha.nomeDe(id),
        capital: campanha.capitalDe(jogador.id) === id,
        economia: e
          ? {
              produto: e.produto.nome,
              nivel: e.nivel,
              impostos: e.impostos,
              producao: e.producao,
              transito: e.transito,
              manutencao: e.manutencao,
              total: e.total,
              tropa: campanha.custoDaTropaDe(id),
              saldo: campanha.saldoDaProvincia(id) ?? 0,
              imposto: campanha.nivelDeImpostoEm(id),
            }
          : null,
        construcoes: campanha
          .construcoesEm(id)
          .map((c) => comNivel(jogo, c, campanha.nivelDaConstrucaoEm(id, c))),
        obra: obra
          ? {
              nome: comNivel(jogo, obra.construcao, obra.nivelAlvo),
              turnosRestantes: obra.turnosRestantes,
            }
          : null,
      };
    }),
  };
}

/** A conta da comida do reino inteiro, província por província. */
export function vistaDoAlimento(jogo: Jogo): VistaDoAlimento {
  const { campanha } = jogo;
  const jogador = campanha.jogador;
  if (!jogador) {
    return {
      linhas: [],
      subsistencia: 0,
      exercito: 0,
      saldoCivil: 0,
      saldo: 0,
      categoria: 'no-limite',
    };
  }
  const balanco = campanha.balancoAlimentarDe(jogador.id);
  const linhas = campanha.provinciasDe(jogador.id).flatMap((id) =>
    // Província sem ficha autoral não entra na simulação: pôr uma linha de traços aqui só
    // encheria a tabela com as que ainda não são simuladas.
    campanha.perfilDe(id) === null
      ? []
      : [
          {
            nome: campanha.nomeDe(id),
            produtos: campanha
              .produtosAlimentaresEm(id)
              .map((produto) => `${produto.nome} ${produto.nivel}`)
              .join(' · '),
            producao: campanha.contribuicaoAlimentarEm(id),
            populacao: campanha.nivelPopulacionalEm(id),
            faixa: campanha.faixaDaProvinciaEm(id),
            papel: campanha.estadoAlimentarLocalEm(id),
            sitiada: campanha.cercoEm(id) !== undefined,
          },
        ],
  );
  return {
    linhas,
    subsistencia: balanco.subsistencia,
    exercito: balanco.exercito,
    saldoCivil: balanco.saldoCivil,
    saldo: balanco.saldo,
    categoria: balanco.categoria,
  };
}

/**
 * A diplomacia: com quem o jogador faz fronteira, e o que ele é de cada um.
 *
 * ⚠️ **Só os vizinhos.** São 139 poderes no mapa, e uma lista com todos seria um catálogo onde
 * o jogador procura um nome em vez de tomar uma decisão. Guerra só interessa contra quem a
 * hoste alcança — e a vizinhança aqui é a mesma que ela enxerga.
 */
export function vistaDaDiplomacia(jogo: Jogo): VistaDaDiplomacia {
  const { campanha } = jogo;
  const jogador = campanha.jogador;
  if (!jogador) return { vizinhos: [], guerras: 0 };

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

  const vizinhos = [...fronteiras.keys()]
    .map((id) => ({
      id,
      nome: campanha.poder(id).nome,
      emGuerra: campanha.emGuerra(jogador.id, id),
      // Em turnos que faltam, e não no turno em que ela vence: o jogador conta para frente.
      tregoa: Math.max(0, (campanha.tregoaAte(jogador.id, id) ?? campanha.turno) - campanha.turno),
      fronteira: (fronteiras.get(id) ?? []).sort(),
      exercito: campanha
        .hostes()
        .filter((h) => h.poder === id)
        .reduce((soma, h) => soma + campanha.forcaDaHoste(h.id), 0),
      relacao: campanha.relacaoEntre(jogador.id, id),
      // A conta inteira, como a do humor do povo: o número sozinho parece arbitrário.
      parcelas: campanha.parcelasDaRelacaoEntre(jogador.id, id),
      presentes: presentesPara(jogo, id),
      pacto: Math.max(0, (campanha.pactoAte(jogador.id, id) ?? campanha.turno) - campanha.turno),
      prazos: campanha.prazosDePacto(id),
      temAcordo: campanha.acordosDe(jogador.id).includes(id),
      rendaDoAcordo: campanha.rendaDeUmAcordoCom(id),
      acordoBloqueado: bloqueioDoAcordo(jogo, id),
    }))
    // Guerra primeiro: é o que exige decisão. Depois por nome, que é como se procura na lista.
    .sort((a, b) => Number(b.emGuerra) - Number(a.emGuerra) || a.nome.localeCompare(b.nome));

  return { vizinhos, guerras: campanha.guerrasDe(jogador.id).length };
}

/** Por que o acordo de comércio não sai. Vazio quando ele sai. */
function bloqueioDoAcordo(jogo: Jogo, id: string): string {
  const r = jogo.campanha.podeAcordarComercio(id);
  return r.pode ? '' : r.motivo;
}

/**
 * As três quantias de presente que fazem sentido para ESTE vizinho, já cotadas.
 *
 * ⚠️ **A escala sai da renda DELE, não do seu cofre.** Um presente vale "quantos turnos de
 * renda dele você está entregando" — então oferecer 5.000 a quem arrecada 120 seria absurdo, e
 * oferecer 500 a quem arrecada 2.000 seria quase ofensa. As quantias nascem na escala certa e o
 * jogador não precisa fazer essa conta de cabeça.
 *
 * Só entram as que cabem no cofre: botão que não dá para apertar é botão que frustra.
 */
function presentesPara(jogo: Jogo, id: string): readonly { ouro: number; pontos: number }[] {
  const { campanha } = jogo;
  const renda = Math.max(1, campanha.rendaDe(id));
  return [1, 3, 8]
    .map((turnos) => Math.round((renda * turnos) / 50) * 50)
    .filter((ouro) => ouro > 0 && campanha.podePresentear(id, ouro).pode)
    .map((ouro) => ({ ouro, pontos: campanha.valorDoPresente(id, ouro) }));
}

/**
 * O mercado: o que o reino ALCANÇA, e o que ele não alcança.
 *
 * As duas listas juntas dão o catálogo inteiro — é isso que faz a segunda ser útil, e não
 * só a ausência da primeira.
 */
export function vistaDoMercado(jogo: Jogo): VistaDoMercado {
  const { campanha } = jogo;
  const jogador = campanha.jogador;
  if (!jogador) return { circulando: [], ausentes: [], total: 0, semCapital: false };

  const circulando = campanha.bensEmCirculacao(jogador.id).map((bem) => ({
    id: bem.id,
    nome: bem.nome,
    troca: bem.troca,
    provincias: bem.provincias.map((id) => campanha.nomeDe(id)),
  }));
  return {
    circulando,
    ausentes: campanha.bensAusentes(jogador.id).map((bem) => ({ ...bem, provincias: [] })),
    total: campanha.rendaDeTrocas(jogador.id),
    // Sem sede não há rede. É consequência da capital caída, não tabela vazia por acaso.
    semCapital: campanha.capitalDe(jogador.id) === undefined,
  };
}
