/**
 * As três abas do Governo: o balanço em moedas, a conta da comida e o mercado.
 *
 * ⚠️ Derivadas na hora, como todas as vistas: guardar isto seria criar uma segunda verdade
 * sobre os mesmos saldos.
 */

import type { VistaDoAlimento } from '@/ui/balanco-alimentar';
import type { VistaDoBalanco } from '@/ui/balanco';
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
              comercio: e.comercio,
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
