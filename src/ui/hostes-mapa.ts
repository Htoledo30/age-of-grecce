/**
 * Os marcadores de hoste sobre o mapa: onde há gente em armas, e quanta.
 *
 * **HTML posicionado por cima do canvas, não desenho no canvas.** É a regra da casa, e
 * aqui ela paga bem: o marcador carrega o número de homens em texto de verdade — legível,
 * selecionável, com tooltip e com foco de teclado — e muda de cor por variável CSS. Um
 * sprite não daria nada disso, e o projeto não tem sprite nenhum pra dar.
 *
 * O marcador segue o mundo, não a tela: a cada quadro a posição do centro da província é
 * projetada por `camera.mundoParaPalco`. Arrastar e dar zoom levam a peça junto, porque a
 * peça está no mundo — só quem desenha é que é HTML.
 *
 * ⚠️ **O marcador intercepta o clique de propósito.** `Entrada` escuta o CANVAS, então um
 * elemento de `#ui` por cima dele consome o clique antes de a cena ver — é o mesmo
 * mecanismo que já faz os painéis não virarem clique no mapa. Sem isso, clicar na hoste
 * também selecionaria a província debaixo dela.
 */

import type { Camera } from '@/nucleo/camera';

/** Uma hoste como o mapa precisa vê-la. */
export interface MarcadorDeHoste {
  /** Onde ela está. É a chave, e é o que volta no clique. */
  provincia: string;
  /** Centro da província, em unidades de mundo. */
  x: number;
  y: number;
  forca: number;
  /** Cor do poder dono da hoste — não a do dono do chão. */
  cor: string;
  nomeDoPoder: string;
  minha: boolean;
  /** Está recebendo uma ordem agora. */
  escolhendoDestino: boolean;
  /** Já possui ordem registrada nesta rodada. */
  temOrdem: boolean;
  /** Chegou ao local na última resolução e recebe um pulso curto. */
  chegadaRecente: boolean;
}

export class HostesMapa {
  private readonly camada = document.createElement('div');
  /** Um botão por província com tropa, reaproveitado entre redesenhos. */
  private readonly marcadores = new Map<string, HTMLButtonElement>();
  private atual: readonly MarcadorDeHoste[] = [];
  private selecionada: string | null = null;
  /**
   * A última câmera vista, guardada para posicionar peça NOVA no mesmo instante em que
   * ela nasce.
   *
   * ⚠️ Sem isto, um marcador criado fora do laço — e `mostrar` é chamado na virada do
   * turno, fora dele — é pintado uma vez **sem `transform`**, ou seja, no canto superior
   * esquerdo do palco, e só vai pro lugar no quadro seguinte. O sintoma é a hoste
   * aparecendo lá em cima e "descendo" até a província.
   */
  private ultimaCamera: Camera | null = null;

  aoSelecionar: (idProvincia: string) => void = () => {};

  constructor(pai: HTMLElement) {
    this.camada.className = 'hostes';
    pai.appendChild(this.camada);
  }

  /**
   * Redesenha a camada inteira a partir da lista de hostes.
   *
   * Reaproveita os elementos que continuam existindo em vez de recriar tudo: recriar
   * perderia o foco de teclado no meio de uma interação, e com 148 poderes um dia isso
   * seria muitos nós por turno.
   */
  mostrar(hostes: readonly MarcadorDeHoste[]): void {
    this.atual = hostes;
    const vivos = new Set(hostes.map((h) => h.provincia));

    for (const [id, elemento] of this.marcadores) {
      if (vivos.has(id)) continue;
      elemento.remove();
      this.marcadores.delete(id);
    }

    for (const hoste of hostes) {
      let elemento = this.marcadores.get(hoste.provincia);
      if (!elemento) {
        elemento = document.createElement('button');
        elemento.type = 'button';
        elemento.className = 'hostes__marca';
        elemento.dataset['provincia'] = hoste.provincia;
        elemento.addEventListener('click', () => {
          this.aoSelecionar(hoste.provincia);
          elemento?.blur();
        });
        // Nasce escondida e só aparece quando tiver posição: é a rede que impede o
        // marcador de ser pintado no canto da tela antes do primeiro `posicionar`.
        elemento.dataset['posicionada'] = 'nao';
        this.camada.appendChild(elemento);
        this.marcadores.set(hoste.provincia, elemento);
      }
      if (this.ultimaCamera) this.assentar(elemento, this.ultimaCamera, hoste.x, hoste.y);
      elemento.textContent = hoste.forca.toLocaleString('pt-BR');
      elemento.title = `${hoste.nomeDoPoder} · ${hoste.forca.toLocaleString('pt-BR')} homens`;
      elemento.style.setProperty('--cor-da-hoste', hoste.cor);
      elemento.dataset['minha'] = hoste.minha ? 'sim' : 'nao';
      elemento.dataset['selecionada'] = this.selecionada === hoste.provincia ? 'sim' : 'nao';
      elemento.dataset['escolhendoDestino'] = hoste.escolhendoDestino ? 'sim' : 'nao';
      elemento.dataset['ordem'] = hoste.temOrdem ? 'sim' : 'nao';
      elemento.dataset['chegada'] = hoste.chegadaRecente ? 'sim' : 'nao';
    }
  }

  /** Marca uma hoste como escolhida. `null` limpa. */
  selecionar(idProvincia: string | null): void {
    this.selecionada = idProvincia;
    for (const [id, elemento] of this.marcadores) {
      elemento.dataset['selecionada'] = id === idProvincia ? 'sim' : 'nao';
    }
  }

  /**
   * Põe cada marcador onde a província dele está agora na tela.
   *
   * Chamado uma vez por quadro. É barato — uma multiplicação de matriz e uma escrita de
   * `transform` por hoste — e é o que faz a peça pertencer ao mundo em vez de flutuar
   * sobre ele.
   */
  posicionar(camera: Camera): void {
    this.ultimaCamera = camera;
    for (const hoste of this.atual) {
      const elemento = this.marcadores.get(hoste.provincia);
      if (!elemento) continue;
      this.assentar(elemento, camera, hoste.x, hoste.y);
    }
  }

  /** Põe a peça no ponto e a torna visível. É o único lugar que escreve `transform`. */
  private assentar(elemento: HTMLElement, camera: Camera, x: number, y: number): void {
    const p = camera.mundoParaPalco(x, y);
    // `translate(-50%, -50%)` centra a peça no ponto: sem isso ela pende pra baixo e pra
    // direita, e em zoom alto o número deixa de cair sobre a província.
    elemento.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -50%)`;
    elemento.dataset['posicionada'] = 'sim';
  }
}
