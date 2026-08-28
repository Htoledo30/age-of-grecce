import type { AbaDoEditor } from './tipos';

export const ABAS_DO_EDITOR: readonly AbaDoEditor[] = [
  {
    id: 'exercito',
    nome: 'Exército',
    descricao: 'Recrutamento, folha, alimento militar e milícia.',
    disponivel: true,
  },
  { id: 'combate', nome: 'Combate', descricao: 'Choque, quebra, recuo e armas.', disponivel: true },
  {
    id: 'alimentacao',
    nome: 'Alimentação',
    descricao: 'Subsistência, consumo e consequências da fome.',
    disponivel: true,
  },
  { id: 'economia', nome: 'Economia', descricao: 'Impostos, trânsito e corrupção.', disponivel: true },
  {
    id: 'populacao',
    nome: 'População',
    descricao: 'Crescimento, faixas e consumo civil.',
    disponivel: true,
  },
  { id: 'construcoes', nome: 'Construções', descricao: 'Preço, duração, folha e efeitos.', disponivel: true },
  { id: 'ia', nome: 'IA', descricao: 'Economia, defesa e agressividade.', disponivel: false },
  { id: 'diplomacia', nome: 'Diplomacia', descricao: 'Relação, pactos, comércio e tributo.', disponivel: false },
  { id: 'provincias', nome: 'Províncias', descricao: 'Dados autorais de cada terra.', disponivel: false },
  { id: 'perfis', nome: 'Perfis', descricao: 'Comparar, importar e exportar ajustes.', disponivel: false },
] as const;
