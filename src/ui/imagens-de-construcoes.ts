/**
 * O catálogo visual das construções.
 *
 * As artes pertencem à interface, não ao balanceamento: o ID continua vindo das regras e
 * este manifesto só diz qual vinheta pública o representa. Manter a lista explícita faz uma
 * construção nova falhar de modo visível nos testes, em vez de produzir uma URL quebrada.
 */

const ARQUIVOS: Readonly<Record<string, string>> = {
  agora: 'agora-v1.webp',
  mercado: 'mercado-v1.webp',
  armaria: 'armaria-v1.webp',
  'acampamento-de-arqueiro': 'acampamento-de-arqueiro-v1.webp',
  'treinamento-de-cavaleiros': 'treinamento-de-cavaleiros-v1.webp',
  quartel: 'quartel-v1.webp',
  muralha: 'muralha-v1.webp',
  templo: 'templo-v1.webp',
  porto: 'porto-v1.webp',
  estrada: 'estrada-v1.webp',
  fazenda: 'fazenda-v1.webp',
  pastagem: 'pastagem-v1.webp',
  'porto-pesqueiro': 'porto-pesqueiro-v1.webp',
  lagar: 'lagar-v1.webp',
  vinhedo: 'vinhedo-v1.webp',
  serraria: 'serraria-v1.webp',
  mina: 'mina-v1.webp',
  pedreira: 'pedreira-v1.webp',
};

/** O nome público é separado da URL para que o catálogo possa ser conferido sem DOM. */
export function arquivoDaConstrucao(id: string): string | null {
  return ARQUIVOS[id] ?? null;
}

/** Retorna `null` para um ID sem arte; a janela preserva um fundo de categoria como fallback. */
export function imagemDaConstrucao(id: string): string | null {
  const arquivo = arquivoDaConstrucao(id);
  return arquivo ? new URL(`interface/construcoes/${arquivo}`, document.baseURI).href : null;
}
