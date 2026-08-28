/**
 * O som do jogo: uma trilha discreta e efeitos curtos de interface.
 *
 * A campanha não conhece áudio. Este módulo observa a interface e guarda apenas as duas
 * preferências que pertencem ao som. A tela de opções lê e altera os volumes por esta API.
 */

export type EfeitoDeInterface =
  | 'clique'
  | 'selecionar'
  | 'abrir'
  | 'fechar'
  | 'confirmar'
  | 'erro'
  | 'turno';

export interface VolumesDoAudio {
  readonly musica: number;
  readonly efeitos: number;
}

const CHAVE_ANTIGA = 'age-of-grecce:som-mutado';
const CHAVE_MUSICA = 'age-of-grecce:volume-musica';
const CHAVE_EFEITOS = 'age-of-grecce:volume-efeitos';

function lerVolume(chave: string, padrao: number): number {
  const guardado = localStorage.getItem(chave);
  if (guardado === null) return padrao;
  const numero = Number(guardado);
  return Number.isFinite(numero) ? Math.max(0, Math.min(100, Math.round(numero))) : padrao;
}

export class MotorDeAudio {
  private readonly musica = new Audio(
    new URL('audio/musica/ancient-mysteries.ogg', document.baseURI).href,
  );
  private contexto: AudioContext | null = null;
  private efeitos: GainNode | null = null;
  private iniciado = false;
  private volumeMusica = lerVolume(
    CHAVE_MUSICA,
    localStorage.getItem(CHAVE_ANTIGA) === 'sim' ? 0 : 20,
  );
  private volumeEfeitos = lerVolume(
    CHAVE_EFEITOS,
    localStorage.getItem(CHAVE_ANTIGA) === 'sim' ? 0 : 34,
  );

  constructor() {
    this.musica.loop = true;
    this.musica.preload = 'metadata';
    this.musica.volume = this.volumeMusica / 100;

    // Navegadores só liberam áudio depois de um gesto. O primeiro aperto desbloqueia os dois
    // canais; os seguintes também detectam botões bloqueados, que não chegam a emitir `click`.
    document.addEventListener('pointerdown', (evento) => this.reagirAoPressionar(evento));
    document.addEventListener('click', (evento) => this.reagirAoClique(evento));
    window.addEventListener('keydown', (evento) => {
      if (evento.key === 'Escape') this.tocar('fechar');
    });
    document.addEventListener('visibilitychange', () => this.reagirAVisibilidade());
  }

  get volumes(): VolumesDoAudio {
    return { musica: this.volumeMusica, efeitos: this.volumeEfeitos };
  }

  definirMusica(volume: number): void {
    this.volumeMusica = this.normalizar(volume);
    localStorage.setItem(CHAVE_MUSICA, String(this.volumeMusica));
    localStorage.removeItem(CHAVE_ANTIGA);
    this.musica.volume = this.volumeMusica / 100;
    if (this.volumeMusica === 0) this.musica.pause();
    else if (this.iniciado && !document.hidden) void this.musica.play().catch(() => {});
  }

  definirEfeitos(volume: number): void {
    this.volumeEfeitos = this.normalizar(volume);
    localStorage.setItem(CHAVE_EFEITOS, String(this.volumeEfeitos));
    localStorage.removeItem(CHAVE_ANTIGA);
    if (this.efeitos) this.efeitos.gain.value = this.volumeEfeitos / 100;
  }

  reproduzir(efeito: EfeitoDeInterface): void {
    this.tocar(efeito);
  }

  private desbloquear(): void {
    this.iniciado = true;
    const contexto = this.obterContexto();
    void contexto.resume();
    if (this.volumeMusica > 0 && !document.hidden) void this.musica.play().catch(() => {});
  }

  private reagirAVisibilidade(): void {
    if (document.hidden) this.musica.pause();
    else if (this.iniciado && this.volumeMusica > 0) void this.musica.play().catch(() => {});
  }

  private reagirAoPressionar(evento: PointerEvent): void {
    this.desbloquear();
    if (
      this.volumeEfeitos > 0 &&
      evento.target instanceof Element &&
      evento.target.closest<HTMLButtonElement>('button')?.disabled
    ) {
      this.tocar('erro');
    }
  }

  private reagirAoClique(evento: MouseEvent): void {
    if (this.volumeEfeitos === 0 || !(evento.target instanceof Element)) return;
    const alvo = evento.target;
    const botao = alvo.closest<HTMLButtonElement>('button');
    if (botao) {
      this.tocar(this.efeitoDoBotao(botao));
      return;
    }
    if (alvo.closest('canvas')) this.tocar('selecionar');
  }

  private efeitoDoBotao(botao: HTMLButtonElement): EfeitoDeInterface {
    if (botao.disabled) return 'erro';
    if (botao.closest('.hostes__marca')) return 'selecionar';

    const nome = `${botao.textContent ?? ''} ${botao.getAttribute('aria-label') ?? ''}`
      .trim()
      .toLocaleLowerCase('pt-BR');
    if (nome.includes('fechar') || nome === '×') return 'fechar';
    if (/passar o turno|próxima rodada|proxima rodada/.test(nome)) return 'turno';
    if (/governo|diplomacia|construções|construcoes|recrutamento|opções|opcoes|abrir/.test(nome)) {
      return 'abrir';
    }
    if (/construir|recrutar|confirmar|aceitar|declarar|oferecer|pagar|assentar/.test(nome)) {
      return 'confirmar';
    }
    return 'clique';
  }

  /** Efeitos curtos: resposta tátil, sem virar uma segunda trilha em cada clique. */
  private tocar(efeito: EfeitoDeInterface): void {
    if (this.volumeEfeitos === 0 || !this.iniciado) return;
    const agora = this.obterContexto().currentTime;
    switch (efeito) {
      case 'selecionar':
        this.tom(330, 235, 0.075, 0.18, 'sine', agora);
        this.ruido(0.025, 0.07, 1700, agora);
        break;
      case 'abrir':
        this.tom(205, 270, 0.11, 0.13, 'triangle', agora);
        this.tom(305, 360, 0.12, 0.09, 'sine', agora + 0.035);
        break;
      case 'fechar':
        this.tom(190, 105, 0.09, 0.15, 'triangle', agora);
        this.ruido(0.035, 0.055, 900, agora);
        break;
      case 'confirmar':
        this.tom(392, 392, 0.14, 0.11, 'sine', agora);
        this.tom(587, 520, 0.17, 0.09, 'sine', agora + 0.055);
        break;
      case 'erro':
        this.tom(125, 92, 0.13, 0.16, 'triangle', agora);
        this.ruido(0.045, 0.04, 500, agora);
        break;
      case 'turno':
        this.tom(142, 118, 0.34, 0.19, 'sine', agora);
        this.tom(213, 168, 0.3, 0.1, 'triangle', agora + 0.025);
        this.ruido(0.055, 0.045, 750, agora);
        break;
      case 'clique':
        this.tom(205, 155, 0.055, 0.12, 'triangle', agora);
        this.ruido(0.02, 0.055, 1300, agora);
        break;
    }
  }

  private obterContexto(): AudioContext {
    if (this.contexto) return this.contexto;
    this.contexto = new AudioContext();
    this.efeitos = this.contexto.createGain();
    this.efeitos.gain.value = this.volumeEfeitos / 100;
    this.efeitos.connect(this.contexto.destination);
    return this.contexto;
  }

  private tom(
    inicio: number,
    fim: number,
    duracao: number,
    volume: number,
    forma: OscillatorType,
    quando: number,
  ): void {
    const contexto = this.obterContexto();
    const saida = contexto.createGain();
    const oscilador = contexto.createOscillator();
    oscilador.type = forma;
    oscilador.frequency.setValueAtTime(inicio, quando);
    oscilador.frequency.exponentialRampToValueAtTime(Math.max(1, fim), quando + duracao);
    saida.gain.setValueAtTime(0.0001, quando);
    saida.gain.exponentialRampToValueAtTime(volume, quando + 0.006);
    saida.gain.exponentialRampToValueAtTime(0.0001, quando + duracao);
    oscilador.connect(saida);
    saida.connect(this.efeitos!);
    oscilador.start(quando);
    oscilador.stop(quando + duracao + 0.01);
  }

  private ruido(duracao: number, volume: number, corte: number, quando: number): void {
    const contexto = this.obterContexto();
    const quadros = Math.max(1, Math.floor(contexto.sampleRate * duracao));
    const buffer = contexto.createBuffer(1, quadros, contexto.sampleRate);
    const dados = buffer.getChannelData(0);
    for (let i = 0; i < dados.length; i += 1) dados[i] = Math.random() * 2 - 1;

    const fonte = contexto.createBufferSource();
    const filtro = contexto.createBiquadFilter();
    const saida = contexto.createGain();
    fonte.buffer = buffer;
    filtro.type = 'lowpass';
    filtro.frequency.value = corte;
    saida.gain.setValueAtTime(volume, quando);
    saida.gain.exponentialRampToValueAtTime(0.0001, quando + duracao);
    fonte.connect(filtro);
    filtro.connect(saida);
    saida.connect(this.efeitos!);
    fonte.start(quando);
  }

  private normalizar(volume: number): number {
    return Math.max(0, Math.min(100, Math.round(volume)));
  }
}

export function iniciarAudio(): MotorDeAudio {
  return new MotorDeAudio();
}
