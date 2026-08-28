import type { CampoNumerico, ValoresDoEditor } from './tipos';

const CHAVE = 'age-of-grecce:editor:balanceamento';

/** Lê apenas números conhecidos e dentro dos limites declarados pelo catálogo. */
export function carregarPerfil(campos: readonly CampoNumerico[]): Record<string, number> {
  try {
    const bruto: unknown = JSON.parse(localStorage.getItem(CHAVE) ?? '{}');
    if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return {};
    const salvos = bruto as Record<string, unknown>;
    return Object.fromEntries(
      campos.flatMap((campo) => {
        const valor = salvos[campo.id];
        return typeof valor === 'number' &&
          Number.isFinite(valor) &&
          valor >= campo.minimo &&
          valor <= campo.maximo
          ? [[campo.id, valor] as const]
          : [];
      }),
    );
  } catch {
    return {};
  }
}

export function salvarPerfil(valores: ValoresDoEditor): void {
  localStorage.setItem(CHAVE, JSON.stringify(valores));
}

export function apagarPerfil(): void {
  localStorage.removeItem(CHAVE);
}
