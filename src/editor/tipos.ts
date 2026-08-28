export type IdDaAba =
  | 'exercito'
  | 'combate'
  | 'alimentacao'
  | 'economia'
  | 'populacao'
  | 'construcoes'
  | 'ia'
  | 'diplomacia'
  | 'provincias'
  | 'perfis';

export interface AbaDoEditor {
  id: IdDaAba;
  nome: string;
  descricao: string;
  disponivel: boolean;
}

/** Um único botão de balanceamento conhecido e seguro. Nunca é uma chave JSON crua. */
export interface CampoNumerico {
  id: string;
  aba: IdDaAba;
  grupo: string;
  nome: string;
  descricao: string;
  unidade: string;
  minimo: number;
  maximo: number;
  passo: number;
  casas: number;
  /** Converte a unidade interna para a unidade legível. Ex.: 0,012 vira 1,2%. */
  fatorVisual?: number;
  aplica: string;
  ler(): number;
  escrever(valor: number): void;
}

export type ValoresDoEditor = Readonly<Record<string, number>>;
