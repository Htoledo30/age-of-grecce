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
import type { Ponto } from '@/ui/animacao-de-marcha';
import { definirTooltip } from './tooltip';

/** Uma hoste como o mapa precisa vê-la. */
export interface MarcadorDeHoste {
  /**
   * Quem ela é. **É a chave da camada, e é o que volta no clique.**
   *
   * ⚠️ Era a província, e isso desabou quando sitiar deixou de engajar o exército de
   * dentro: o sitiante e a guarnição ficam na MESMA província, e com a província por
   * chave só cabia um marcador ali — o segundo exército sumia do mapa, e o clique
   * selecionava sempre o mesmo dos dois.
   *
   * Id de hoste, ou `formacao:<provincia>` para a leva, que ainda não é hoste.
   */
  id: string;
  /**
   * Onde ela está. **Descritivo, não endereço** — e muda quando ela marcha.
   *
   * Continua aqui porque os testes de tela procuram a peça pelo lugar, e porque é assim
   * que a camada sabe onde a província está desenhada.
   */
  provincia: string;
  /** Centro da província, em unidades de mundo. */
  x: number;
  y: number;
  /** Homens já prontos para receber ordens. */
  forca: number;
  /** Recrutas pagos que só entram na hoste no próximo turno. */
  emFormacao: number;
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
  /**
   * Está acampada diante da cidade que ela sitia.
   *
   * A peça já é desenhada na divisa por causa disso; a marca serve pro CSS poder dizer
   * visualmente que aquele exército não está DENTRO da cidade — ele está na porta.
   */
  sitiando: boolean;
}

export class HostesMapa {
  private readonly camada = document.createElement('div');
  /** Um botão por HOSTE, reaproveitado entre redesenhos. A chave é o id dela. */
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

  aoSelecionar: (idHoste: string) => void = () => {};

  /**
   * Onde a peça está enquanto marcha, ou `null` se está parada na província.
   *
   * A camada não sabe — nem deve saber — o que é uma marcha; ela pergunta a posição e
   * desenha. Quem responde é `AnimacaoDeMarcha`, ligada em `main.ts`.
   */
  ondeEstaMarchando: (idHoste: string) => Ponto | null = () => null;

  constructor(pai: HTMLElement) {
    this.camada.className = 'hostes';
    pai.appendChild(this.camada);
  }

  /**
   * Redesenha a camada inteira a partir da lista de hostes.
   *
   * Reaproveita os elementos que continuam existindo em vez de recriar tudo: recriar
   * perderia o foco de teclado no meio de uma interação, e com 139 poderes um dia isso
   * seria muitos nós por turno.
   */
  mostrar(hostes: readonly MarcadorDeHoste[]): void {
    this.atual = hostes;
    const vivos = new Set(hostes.map((h) => h.id));

    for (const [id, elemento] of this.marcadores) {
      if (vivos.has(id)) continue;
      elemento.remove();
      this.marcadores.delete(id);
    }

    for (const hoste of hostes) {
      let elemento = this.marcadores.get(hoste.id);
      if (!elemento) {
        const id = hoste.id;
        elemento = document.createElement('button');
        elemento.type = 'button';
        elemento.className = 'hostes__marca';
        elemento.dataset['hoste'] = id;
        elemento.addEventListener('click', () => {
          // `id` e não `hoste.id`: o fecho sobrevive a redesenhos, e `hoste` é o objeto
          // desta passada. O id é o único campo que não muda enquanto a peça existir.
          this.aoSelecionar(id);
          elemento?.blur();
        });
        // Nasce escondida e só aparece quando tiver posição: é a rede que impede o
        // marcador de ser pintado no canto da tela antes do primeiro `posicionar`.
        elemento.dataset['posicionada'] = 'nao';
        this.camada.appendChild(elemento);
        this.marcadores.set(id, elemento);
      }
      if (this.ultimaCamera) this.assentar(elemento, this.ultimaCamera, hoste);
      const pronta = hoste.forca.toLocaleString('pt-BR');
      const formando = hoste.emFormacao.toLocaleString('pt-BR');
      elemento.textContent = hoste.forca > 0 ? pronta : formando;
      definirTooltip(elemento, {
        titulo: hoste.forca > 0 ? `Hoste de ${hoste.nomeDoPoder}` : `Leva de ${hoste.nomeDoPoder}`,
        corpo:
          hoste.emFormacao <= 0
            ? `${pronta} homens em armas.`
            : hoste.forca <= 0
              ? `${formando} recrutas em formação. Ficarão prontos no próximo turno.`
              : `${pronta} homens prontos. ${formando} recrutas ficarão prontos no próximo turno.`,
        tom: hoste.minha ? 'informacao' : 'perigo',
      });
      elemento.style.setProperty('--cor-da-hoste', hoste.cor);
      // ⚠️ **A província é escrita na ATUALIZAÇÃO, não no nascimento.** O mesmo elemento
      // agora sobrevive a uma marcha — a chave é a hoste, e ela muda de lugar. Escrever
      // isto uma vez só deixaria o `data-provincia` mentindo depois do primeiro turno.
      elemento.dataset['provincia'] = hoste.provincia;
      elemento.dataset['sitiando'] = hoste.sitiando ? 'sim' : 'nao';
      elemento.dataset['minha'] = hoste.minha ? 'sim' : 'nao';
      elemento.dataset['selecionada'] = this.selecionada === hoste.id ? 'sim' : 'nao';
      elemento.dataset['escolhendoDestino'] = hoste.escolhendoDestino ? 'sim' : 'nao';
      elemento.dataset['ordem'] = hoste.temOrdem ? 'sim' : 'nao';
      elemento.dataset['chegada'] = hoste.chegadaRecente ? 'sim' : 'nao';
      elemento.dataset['emFormacao'] = hoste.emFormacao > 0 ? 'sim' : 'nao';
      elemento.dataset['somenteFormacao'] = hoste.forca <= 0 ? 'sim' : 'nao';
      elemento.dataset['formacaoQuantidade'] =
        hoste.forca > 0 && hoste.emFormacao > 0 ? `+${formando}` : '';
    }
  }

  /** Marca uma hoste como escolhida, pelo id dela. `null` limpa. */
  selecionar(idHoste: string | null): void {
    this.selecionada = idHoste;
    for (const [id, elemento] of this.marcadores) {
      elemento.dataset['selecionada'] = id === idHoste ? 'sim' : 'nao';
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
      const elemento = this.marcadores.get(hoste.id);
      if (!elemento) continue;
      this.assentar(elemento, camera, hoste);
    }
  }

  /**
   * Põe a peça no ponto e a torna visível. **É o único lugar que escreve `transform`**, e
   * o único que decide se ela está no centro da província ou no meio de uma marcha.
   *
   * ⚠️ Ser único importa: foi ter duas rotas até a tela — uma no nascimento e outra no
   * laço de quadro — que fez a peça nascer sem posição e ser pintada no canto do palco.
   */
  private assentar(elemento: HTMLElement, camera: Camera, hoste: MarcadorDeHoste): void {
    const emMarcha = this.ondeEstaMarchando(hoste.id);
    const onde = emMarcha ?? hoste;
    const p = camera.mundoParaPalco(onde.x, onde.y);
    // ⚠️ **A posição vai na propriedade `translate`, NUNCA em `transform`.** A matriz final
    // do CSS é `translate · rotate · scale · transform`, ou seja, um `scale` independente
    // MULTIPLICA o que estiver em `transform`. Com o pulso de chegada indo de `scale: 0.72`
    // a 1, um `transform: translate(1010px, 471px)` virava 727px, 339px: a peça saltava pra
    // cima e pra esquerda e voltava deslizando até o lugar. Era o "a tropa surge no topo da
    // tela e vem descendo" — e não tinha nada a ver com o marcador nascer sem posição.
    //
    // Separadas, cada canal cuida do seu: `translate` diz ONDE ela está, `scale` diz COMO
    // ela é desenhada, e uma animação não empurra mais a outra. O `- 50%` centra a peça no
    // ponto; sem ele ela pende pra baixo e pra direita, e em zoom alto o número deixa de
    // cair sobre a província.
    elemento.style.translate = `calc(${p.x}px - 50%) calc(${p.y}px - 50%)`;
    elemento.dataset['posicionada'] = 'sim';
    // Tropa em movimento não se pega no meio do passo: durante a marcha a peça deixa de
    // aceitar clique, senão selecioná-la abriria a ficha de uma província onde ela ainda
    // não está desenhada.
    elemento.dataset['marchando'] = emMarcha ? 'sim' : 'nao';
  }
}
