/**
 * O salvamento: o `EstadoCampanha` indo pro disco e voltando inteiro.
 *
 * A disciplina que paga aqui foi mantida desde o começo: **o estado da campanha é, e
 * sempre foi, exatamente o que vai pro disco.** Este módulo só valida a FORMA do que
 * volta — envelope, versão e a estrutura de cada tabela. Quem confere o CONTEÚDO contra
 * o mundo (a tabela de donos está completa? esta construção existe no catálogo?) é a
 * `Campanha.restaurar`, que é quem tem o atlas e os catálogos na mão.
 *
 * ⚠️ **Efêmeros não viajam.** Crônica da rodada e relatório da fome são notícia, não
 * partida — retomar um salvamento não reexibe a batalha do turno passado. Eles nem
 * aparecem no esquema, e é o esquema que garante que nunca vão aparecer por acidente.
 */

import { z } from 'zod';

import type { EstadoCampanha } from './estado-campanha';

const Postura = z.enum(['assaltar', 'sitiar']);

const Arma = z.enum(['leve', 'hoplita', 'arqueiro', 'cavalaria']);

const Contingente = z.object({
  terra: z.string().min(1),
  arma: Arma,
  qualidade: z.number().positive(),
  homens: z.number().int().positive(),
});

/**
 * ⚠️ **Salvamento de antes das armas ainda carrega.**
 *
 * A hoste guardava `origem: { terra: homens }`, um número por terra natal. Cada entrada
 * daquelas vira um contingente de LEVE com qualidade 1 — que é exatamente o que aqueles
 * homens eram quando arma nenhuma existia: todo soldado do jogo valia um miliciano.
 */
const Exercito = z
  .object({
    id: z.string().min(1),
    posicao: z.string().min(1),
    poder: z.string().min(1),
    origem: z.record(z.string().min(1), z.number().int().positive()).optional(),
    contingentes: z.array(Contingente).optional(),
  })
  .transform(({ origem, contingentes, ...resto }) => ({
    ...resto,
    contingentes:
      contingentes ??
      Object.entries(origem ?? {}).map(([terra, homens]) => ({
        terra,
        arma: 'leve' as const,
        qualidade: 1,
        homens,
      })),
  }));

/** ⚠️ Salvamento de antes das armas ainda carrega: a leva dele era toda de `leve`. */
const Formacao = z
  .object({
    poder: z.string().min(1),
    origem: z.string().min(1),
    homens: z.number().int().positive().optional(),
    contingentes: z
      .array(
        z.object({
          arma: Arma,
          qualidade: z.number().positive(),
          homens: z.number().int().positive(),
        }),
      )
      .optional(),
    prontaNoTurno: z.number().int(),
  })
  .transform(({ homens, contingentes, ...resto }) => ({
    ...resto,
    contingentes:
      contingentes ??
      (homens === undefined
        ? []
        : [{ arma: 'leve' as const, qualidade: 1, homens }]),
  }));

const Ordem = z.object({
  origem: z.string().min(1),
  rota: z.array(z.string().min(1)).min(1),
  homens: z.number().int().positive(),
  postura: Postura,
  // `default` pelo mesmo motivo das revoltas: salvamento de antes do recuo ainda carrega, e
  // a ordem dele simplesmente é a de lutar até a linha ceder.
  recuarAos: z.number().gt(0).max(1).nullable().default(null),
  // Ausente nos salvamentos antigos e nas ordens de uma única rodada da IA.
  continuar: z.literal(true).optional(),
});

const Cerco = z.object({
  sitiante: z.string().min(1),
  postura: Postura,
  rodadas: z.number().int().nonnegative(),
});

const Obra = z.object({
  construcao: z.string().min(1),
  nivelAlvo: z.number().int().min(1).max(3),
  turnosRestantes: z.number().int().positive(),
});

/** O envelope completo de um salvamento. A versão é o primeiro portão. */
const SalvamentoCampanha = z.object({
  versao: z.literal(1),
  estado: z.object({
    jogador: z.string().min(1).nullable(),
    ano: z.number().int(),
    turno: z.number().int().nonnegative(),
    tesouros: z.record(z.string().min(1), z.number().nonnegative()),
    dono: z.record(z.string().min(1), z.string().min(1)),
    populacao: z.record(z.string().min(1), z.number().int().nonnegative()),
    nacionalidades: z.record(z.string().min(1), z.record(z.string().min(1), z.number())),
    felicidade: z.record(z.string().min(1), z.number()),
    hostes: z.record(z.string().min(1), Exercito),
    proximaHoste: z.number().int().nonnegative(),
    formacoes: z.record(z.string().min(1), Formacao),
    ordens: z.record(z.string().min(1), Ordem),
    surtidas: z.array(z.string().min(1)),
    cercos: z.record(z.string().min(1), Cerco),
    capitais: z.record(z.string().min(1), z.string().min(1)),
    // `default` e não obrigatório: salvamentos de antes do sistema de revoltas ainda
    // carregam — o pavio deles simplesmente começa apagado.
    revoltas: z.record(z.string().min(1), z.number().int().nonnegative()).default({}),
    // ⚠️ **Os reinos que a PARTIDA criou, e sem eles o mapa não volta.** Uma província que
    // declarou independência pertence a um poder que não existe em `provincias.json`; carregar
    // sem esta lista devolveria terra de dono desconhecido, e a pintura estouraria na hora.
    // `default` pela mesma razão dos outros: salvamento de antes da independência ainda carrega,
    // e o mundo dele simplesmente não teve nenhuma.
    poderesNascidos: z
      .array(
        z.object({
          id: z.string().min(1),
          nome: z.string().min(1),
          povo: z.string().min(1),
          cor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        }),
      )
      .default([]),
    // `default` pelo mesmo motivo das revoltas: salvamentos de antes do decreto de
    // imposto ainda carregam — toda terra volta cobrando o normal.
    // ⚠️ **`confisco` faltava aqui, e isso quebrava o jogo salvo.** O decreto existe desde que
    // o imposto foi refeito, mas o esquema ficou nos três antigos: qualquer partida com uma
    // província confiscada era recusada na carga como salvamento corrompido. Achado em
    // 31/08/2026 ao escrever o teste da independência, que confisca para azedar a cidade.
    nivelDeImposto: z
      .record(z.string().min(1), z.enum(['baixo', 'normal', 'alto', 'confisco']))
      .default({}),
    construcoes: z.record(
      z.string().min(1),
      z.record(z.string().min(1), z.number().int().min(1).max(3)),
    ),
    obras: z.record(z.string().min(1), Obra),
    // `default` pelo mesmo motivo das revoltas: salvamento de antes da diplomacia ainda
    // carrega — e o mundo dele volta em paz, que é como toda campanha começa. Guerra em
    // curso é a única coisa que se perde, e ela é justamente o que aquele mundo não tinha.
    guerras: z.record(z.string().min(1), z.number().int().nonnegative()).default({}),
    tregoas: z.record(z.string().min(1), z.number().int().nonnegative()).default({}),
    // `default` pelo mesmo motivo: salvamento de antes da relação ainda carrega, e o mundo
    // dele volta com todo mundo indiferente — que é onde uma campanha começa.
    relacoes: z.record(z.string().min(1), z.number().min(-100).max(100)).default({}),
    pactos: z.record(z.string().min(1), z.number().int().nonnegative()).default({}),
    // ⚠️ `default({})` e não campo obrigatório: salvamento anterior à aliança abre sem ela.
    aliancas: z.record(z.string().min(1), z.number().int().nonnegative()).default({}),
    /** Pela mesma razão: salvamento anterior à liga abre sem liga nenhuma. */
    ligas: z
      .record(
        z.string().min(1),
        z.object({
          chefe: z.string().min(1),
          desde: z.number().int().nonnegative(),
          tributo: z.string().min(1),
          desejoDeSair: z.number().min(0).max(100),
        }),
      )
      .default({}),
    // A chave aqui é DIRECIONAL — `concedente>beneficiário` —, e é o único registro do
    // arquivo que não usa o par ordenado: dar passagem não é receber passagem.
    acessos: z.record(z.string().min(1), z.number().int().nonnegative()).default({}),
    // Propostas que a IA fez ao jogador e que esperam resposta. `default` como todos os
    // outros: salvamento de antes delas volta sem nenhuma na mesa, que é o começo de tudo.
    propostas: z
      .array(
        z.object({
          de: z.string().min(1),
          tipo: z.enum(['pacto', 'comercio', 'acesso']),
          turnos: z.number().int().positive().optional(),
        }),
      )
      .default([]),
    acordos: z.record(z.string().min(1), z.number().int().nonnegative()).default({}),
    reputacao: z.record(z.string().min(1), z.number().min(-100).max(0)).default({}),
    // `default` pelo mesmo motivo de todos os outros: salvamento de antes do tributo carrega,
    // e o mundo dele volta sem tributo nenhum — que é como toda campanha começa.
    tributos: z
      .record(
        z.string().min(1),
        z.object({
          pagador: z.string().min(1),
          ate: z.number().int().nonnegative(),
          ouro: z.number().int().positive(),
        }),
      )
      .default({}),
  }),
});

/** Escreve o salvamento como texto. É o que vai pro `localStorage` ou pro arquivo. */
export function serializarCampanha(estado: EstadoCampanha): string {
  return JSON.stringify({ versao: 1, estado });
}

/**
 * Lê um salvamento e devolve o estado com a FORMA garantida.
 *
 * Lança em texto que não é JSON, versão desconhecida ou estrutura errada — quem chama
 * decide se isso vira aviso e partida nova, ou erro na cara do desenvolvedor.
 */
export function lerSalvamento(texto: string): EstadoCampanha {
  const bruto: unknown = JSON.parse(texto);
  const salvo = SalvamentoCampanha.parse(bruto);
  return salvo.estado;
}
