/**
 * A ALIANÇA: o único acordo do jogo que obriga a FAZER alguma coisa.
 *
 * Todo o resto da mesa é promessa de NÃO fazer — não atacar, não fechar a estrada, não cobrar.
 * A aliança inverte isso: **a guerra de um vira a guerra do outro**, no mesmo turno e sem
 * perguntar. O que se guarda aqui são as cinco regras que a tornam jogável em vez de caótica,
 * e nenhum número de balanço: a régua vive em `dados/ajustes.json`.
 */

import { describe, expect, it } from 'vitest';

import { ajustes, novaCampanha } from '../apoio/mundo';

const PRAZO = ajustes.diplomacia.alianca.prazos[0]!.turnos;

/**
 * Uma campanha com a opinião empurrada para onde a aliança é possível.
 *
 * ⚠️ **O andaime é o PRESENTE, e não um número escrito na mão.** A opinião mínima é balanço e
 * mora nos ajustes; o teste não pode cravá-la nem contorná-la. Dar ouro até a porta abrir é o
 * que um jogador faria, e é a única forma de o cenário continuar de pé no dia em que Henrique
 * mexer no número pelo editor. O laço para assim que ela abre — e se nunca abrir, o teste que
 * depende dela falha dizendo isso, que é a informação certa.
 */
function comAliancaPossivel(a: string, b: string) {
  const c = novaCampanha();
  c.comecar(a);
  c.darOuro(2_000_000, a);
  c.darOuro(2_000_000, b);
  for (let i = 0; i < 60 && !c.prazosDeAlianca(a, b).some((p) => p.pode); i++) {
    c.presentear(b, 30_000, a);
    c.presentear(a, 30_000, b);
    c.passarTurno();
  }
  return c;
}

describe('a aliança obriga, e é isso que a separa do pacto', () => {
  it('não se declara guerra a um aliado', () => {
    const c = comAliancaPossivel('atenas', 'eleusis');
    c.firmarAlianca('eleusis', PRAZO);
    expect(c.aliancaAte('atenas', 'eleusis')).toBeDefined();
    const r = c.podeDeclararGuerra('eleusis');
    expect(r.pode).toBe(false);
    // ⚠️ A palavra importa: quem vai atacar um aliado precisa ler "aliado", não "pacto".
    expect(r.pode === false ? r.motivo : '').toContain('ALIADO');
  });

  it('a guerra do aliado vira a sua, no mesmo turno e dos dois lados', () => {
    const c = comAliancaPossivel('atenas', 'eleusis');
    c.firmarAlianca('eleusis', PRAZO);
    expect(c.emGuerra('eleusis', 'tebas')).toBe(false);

    c.declararGuerra('tebas');
    // Quem declarou arrasta o aliado dele...
    expect(c.emGuerra('eleusis', 'tebas')).toBe(true);
    // ...e o alvo arrastaria os dele: a convocação vale para os dois lados.
    expect(c.aliadosDe('atenas')).toContain('eleusis');
  });

  it('⚠️ aliado de aliado NÃO é aliado — a chamada morre num salto', () => {
    // Sem esta regra, uma escaramuça de fronteira viraria guerra mundial em três turnos.
    const c = comAliancaPossivel('atenas', 'eleusis');
    c.firmarAlianca('eleusis', PRAZO);
    // Elêusis se alia a Mégara, que não tem nada com Atenas.
    c.darOuro(2_000_000, 'megara');
    for (let i = 0; i < 60 && !c.prazosDeAlianca('eleusis', 'megara').some((p) => p.pode); i++) {
      c.presentear('megara', 30_000, 'eleusis');
      c.presentear('eleusis', 30_000, 'megara');
      c.passarTurno();
    }
    // ⚠️ O cenário TEM de montar: um `if` aqui faria o teste passar em silêncio no dia em que
    // a aliança ficasse inalcançável, que é exatamente o defeito que ele deveria denunciar.
    expect(c.prazosDeAlianca('eleusis', 'megara').some((p) => p.pode)).toBe(true);
    c.firmarAlianca('megara', PRAZO, 'eleusis');
    c.declararGuerra('tebas');
    expect(c.emGuerra('eleusis', 'tebas')).toBe(true);
    // Mégara é aliada de Elêusis, não de Atenas: ela fica de fora.
    expect(c.emGuerra('megara', 'tebas')).toBe(false);
    // Elêusis tem dois aliados; Atenas continua com um. A corrente não se propaga.
    expect(c.aliadosDe('eleusis')).toEqual(['atenas', 'megara']);
    expect(c.aliadosDe('atenas')).toEqual(['eleusis']);
  });

  it('promessa que já existe segura a convocação', () => {
    // ⚠️ A aliança não faz você quebrar de GRAÇA uma promessa que te custaria reputação
    // quebrar sozinho. Quem tem pacto com o inimigo do aliado não é arrastado contra ele.
    const c = comAliancaPossivel('atenas', 'eleusis');
    c.firmarAlianca('eleusis', PRAZO);
    // Elêusis já tinha um pacto com Tebas quando a guerra estourou.
    c.darOuro(2_000_000, 'tebas');
    for (let i = 0; i < 60 && !c.prazosDePacto('eleusis', 'tebas').some((p) => p.pode); i++) {
      c.presentear('tebas', 30_000, 'eleusis');
      c.presentear('eleusis', 30_000, 'tebas');
      c.passarTurno();
    }
    const prazo = c.prazosDePacto('eleusis', 'tebas').find((p) => p.pode);
    expect(prazo, 'o cenário precisa do pacto para provar o que promete').toBeDefined();
    c.firmarPacto('tebas', prazo!.turnos, 'eleusis');
    c.declararGuerra('tebas');
    expect(c.emGuerra('atenas', 'tebas')).toBe(true);
    expect(c.emGuerra('eleusis', 'tebas')).toBe(false);
  });

  it('romper custa MAIS que romper um pacto, e o mapa inteiro vê', () => {
    const c = comAliancaPossivel('atenas', 'eleusis');
    c.firmarAlianca('eleusis', PRAZO);
    const antes = c.reputacaoDe('atenas');
    c.romperAlianca('eleusis');
    expect(c.aliancaAte('atenas', 'eleusis')).toBeUndefined();
    const perdaDaAlianca = antes - c.reputacaoDe('atenas');
    expect(perdaDaAlianca).toBeGreaterThan(0);
    // ⚠️ Abandonar quem contava com você é pior que voltar atrás numa promessa de não atacar.
    // A relação entre os dois preços é regra; os valores são balanço.
    expect(perdaDaAlianca).toBeGreaterThan(-ajustes.diplomacia.pacto.reputacaoDaRuptura);
  });

  it('a aliança substitui o pacto na conta da opinião, e não soma com ele', () => {
    // Somar as duas pagaria duas vezes pela mesma promessa: a aliança já contém a
    // não-agressão. E ela vale mais, porque quem entra nas suas guerras não é apenas alguém
    // que prometeu não te atacar.
    const c = comAliancaPossivel('atenas', 'eleusis');
    c.firmarAlianca('eleusis', PRAZO);
    const rotulos = c.parcelasDaRelacaoEntre('atenas', 'eleusis').map((p) => p.rotulo);
    expect(rotulos).toContain('aliança');
    expect(rotulos).not.toContain('pacto de não-agressão');
    expect(ajustes.diplomacia.alianca.pontos).toBeGreaterThan(ajustes.diplomacia.pacto.pontos);
  });

  it('vencida, ela some sozinha e a guerra volta a ser possível', () => {
    const c = comAliancaPossivel('atenas', 'eleusis');
    c.firmarAlianca('eleusis', PRAZO);
    for (let i = 0; i <= PRAZO; i++) c.passarTurno();
    expect(c.aliancaAte('atenas', 'eleusis')).toBeUndefined();
    expect(c.aliadosDe('atenas')).not.toContain('eleusis');
  });
});
