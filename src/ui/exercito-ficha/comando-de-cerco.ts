/**
 * As duas decisões que só existem onde há cerco: sair de dentro, ou ir para cima de fora.
 *
 * A surtida é a decisão de QUEM ESTÁ DENTRO, e some assim que a cidade se solta. A troca de
 * postura é a de quem está sentado na frente dela — e mora na ficha da hoste, não na da
 * província, porque quem decide assaltar é o comandante, não a cidade.
 */

import { rotularComIcone } from '../icones-gregos';
import { definirTooltip } from '../tooltip';
import type { Postura } from '@/combate/cerco';
import type { VistaDoExercito } from './vista';

export class ComandoDeCerco {
  private readonly botaoSurtida = document.createElement('button');
  private readonly linhaCerco = document.createElement('p');
  private readonly botaoTrocarPostura = document.createElement('button');
  private vista: VistaDoExercito | null = null;

  aoSurtir: (idHoste: string) => void = () => {};
  aoTrocarPostura: (idProvincia: string, postura: Postura) => void = () => {};

  constructor(pai: HTMLElement) {
    this.botaoSurtida.className = 'botao exercito__botao exercito__botao--surtida';
    this.botaoSurtida.type = 'button';
    this.botaoSurtida.addEventListener('click', () => {
      const vista = this.vista;
      if (!vista?.minha || !vista.surtida) return;
      this.aoSurtir(vista.hoste.id);
      this.botaoSurtida.blur();
    });

    this.linhaCerco.className = 'exercito__cerco';
    this.botaoTrocarPostura.className = 'botao exercito__botao';
    this.botaoTrocarPostura.type = 'button';
    this.botaoTrocarPostura.addEventListener('click', () => {
      const vista = this.vista;
      if (!vista?.cerco) return;
      this.aoTrocarPostura(
        vista.provincia.id,
        vista.cerco.postura === 'sitiar' ? 'assaltar' : 'sitiar',
      );
      this.botaoTrocarPostura.blur();
    });

    pai.append(this.botaoSurtida, this.linhaCerco, this.botaoTrocarPostura);
  }

  mostrar(vista: VistaDoExercito, temOrdem: boolean): void {
    this.vista = vista;
    const surtida = vista.surtida;

    // O botão só existe para quem está sitiado. Some também durante a escolha de destino,
    // que é a outra decisão.
    this.botaoSurtida.hidden =
      !vista.minha || surtida === null || temOrdem || vista.marchando;
    if (surtida) {
      rotularComIcone(this.botaoSurtida, 'capacete', `Surtida contra ${surtida.contra}`);
      definirTooltip(this.botaoSurtida, {
        titulo: 'Atacar o sitiante',
        corpo: 'Vencendo, o cerco termina. A milícia fica na cidade.',
        tom: 'perigo',
      });
    }

    const cerco = vista.cerco;
    this.linhaCerco.hidden = cerco === null;
    this.botaoTrocarPostura.hidden = cerco === null || !vista.minha;
    if (!cerco) return;

    this.linhaCerco.textContent =
      cerco.postura === 'sitiar'
        ? `Acampado diante de ${vista.provincia.nome}`
        : `Assaltando ${vista.provincia.nome} na próxima virada`;
    // A muralha tranca o assalto até o cerco ter durado o bastante. O botão fica na tela
    // dizendo quanto falta — sumir em silêncio seria o jogador achando que o comando sumiu.
    const faltam = cerco.faltamParaAssaltar;
    const trancado = cerco.postura === 'sitiar' && faltam > 0;
    this.botaoTrocarPostura.disabled = trancado;
    rotularComIcone(
      this.botaoTrocarPostura,
      cerco.postura === 'sitiar' ? 'lanca' : 'muralha',
      cerco.postura !== 'sitiar'
        ? 'Voltar a sitiar'
        : trancado
          ? `Passar ao assalto · faltam ${faltam}`
          : 'Passar ao assalto',
    );
    definirTooltip(this.botaoTrocarPostura, {
      titulo: trancado
        ? 'A muralha ainda segura'
        : cerco.postura === 'sitiar'
          ? 'Passar ao assalto'
          : 'Voltar a sitiar',
      corpo: trancado
        ? `Faltam ${faltam} ${faltam === 1 ? 'rodada' : 'rodadas'} para assaltar.`
        : 'A nova postura vale na próxima virada.',
    });
  }
}
