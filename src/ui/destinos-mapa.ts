/**
 * Os destinos de uma marcha: onde a hoste escolhida pode pisar.
 *
 * Só existe enquanto o jogador está mandando marchar. Fora disso a camada está vazia, e o
 * mapa não ganha enfeite nenhum.
 *
 * Arquivo próprio, e não uma segunda função dentro de `hostes-mapa.ts`, porque são coisas
 * diferentes: aquele desenha **o que existe no mundo**, este desenha **uma pergunta que
 * está sendo feita agora**. Vão divergir na primeira vez que um destino precisar dizer
 * quantos turnos de marcha custa.
 *
 * ⚠️ **`#ui > .destinos`, nunca `.destinos`.** `base.css` tem
 * `#ui > * { pointer-events: auto }`, e seletor de id vence seletor de classe. Escrita só
 * com a classe, esta camada — que cobre a tela inteira — comeria todos os cliques do mapa,
 * e o sintoma é mudo. É a mesma armadilha de `hostes-mapa.ts`, e ela pega duas vezes.
 */

import type { Camera } from '@/nucleo/camera';

/** Um destino possível, já com o centro da província em unidades de mundo. */
export interface Destino {
  provincia: string;
  nome: string;
  x: number;
  y: number;
  /** Terra de outro poder: clicar aqui é atacar, não apenas transferir. */
  hostil: boolean;
}

export class DestinosMapa {
  private readonly camada = document.createElement('div');
  private readonly marcas = new Map<string, HTMLButtonElement>();
  private atuais: readonly Destino[] = [];
  /** Ver `HostesMapa.ultimaCamera`: alvo novo tem que nascer já no lugar. */
  private ultimaCamera: Camera | null = null;

  aoEscolher: (idProvincia: string) => void = () => {};
  aoDestacar: (idProvincia: string | null) => void = () => {};

  constructor(pai: HTMLElement) {
    this.camada.className = 'destinos';
    pai.appendChild(this.camada);
  }

  /** Lista vazia apaga a camada — é o estado normal, fora de uma ordem de marcha. */
  mostrar(destinos: readonly Destino[]): void {
    this.atuais = destinos;
    const vivos = new Set(destinos.map((d) => d.provincia));

    for (const [id, elemento] of this.marcas) {
      if (vivos.has(id)) continue;
      elemento.remove();
      this.marcas.delete(id);
    }

    for (const destino of destinos) {
      let elemento = this.marcas.get(destino.provincia);
      if (!elemento) {
        elemento = document.createElement('button');
        elemento.type = 'button';
        elemento.className = 'destinos__marca';
        elemento.dataset['provincia'] = destino.provincia;
        const simbolo = document.createElement('span');
        simbolo.className = 'destinos__simbolo';
        simbolo.textContent = '▸';
        const nome = document.createElement('span');
        nome.className = 'destinos__nome';
        elemento.append(simbolo, nome);
        elemento.addEventListener('pointerenter', () => this.aoDestacar(destino.provincia));
        elemento.addEventListener('pointerleave', () => this.aoDestacar(null));
        elemento.addEventListener('focus', () => this.aoDestacar(destino.provincia));
        elemento.addEventListener('blur', () => this.aoDestacar(null));
        elemento.addEventListener('click', () => {
          this.aoDestacar(null);
          this.aoEscolher(destino.provincia);
          elemento?.blur();
        });
        elemento.dataset['posicionada'] = 'nao';
        this.camada.appendChild(elemento);
        this.marcas.set(destino.provincia, elemento);
      }
      if (this.ultimaCamera) this.assentar(elemento, this.ultimaCamera, destino.x, destino.y);
      elemento.dataset['hostil'] = destino.hostil ? 'sim' : 'nao';
      const simbolo = elemento.querySelector<HTMLElement>('.destinos__simbolo');
      if (simbolo) simbolo.textContent = destino.hostil ? '⚔' : '▸';
      const nome = elemento.querySelector<HTMLElement>('.destinos__nome');
      if (nome) nome.textContent = destino.nome;
      const acao = destino.hostil ? 'Atacar' : 'Marchar para';
      elemento.title = `${acao} ${destino.nome}`;
      elemento.setAttribute('aria-label', `${acao} ${destino.nome}`);
    }
  }

  /** Põe cada destino sobre a província dele. Chamado uma vez por quadro. */
  posicionar(camera: Camera): void {
    this.ultimaCamera = camera;
    for (const destino of this.atuais) {
      const elemento = this.marcas.get(destino.provincia);
      if (!elemento) continue;
      this.assentar(elemento, camera, destino.x, destino.y);
    }
  }

  /** Põe o alvo no ponto e o torna visível. É o único lugar que escreve `transform`. */
  private assentar(elemento: HTMLElement, camera: Camera, x: number, y: number): void {
    const p = camera.mundoParaPalco(x, y);
    elemento.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -50%)`;
    elemento.dataset['posicionada'] = 'sim';
  }
}
