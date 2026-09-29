/**
 * Número escrito à brasileira — `35.000` —, em uma chamada barata.
 *
 * ⚠️ **Existe porque `valor.toLocaleString('pt-BR')` monta um formatador novo a CADA chamada no
 * Chromium do jogo (Electron).** Medido: ~120 µs cada, contra ~0,5 µs de um `Intl.NumberFormat`
 * reaproveitado. A janela de Diplomacia chegou a gastar 3,7 segundos só nisso, escrevendo o rótulo
 * do ouro dentro de um laço que testa milhares de quantias. Todo texto com milhar passa por aqui.
 */
const FORMATADOR = new Intl.NumberFormat('pt-BR');

export function milhar(valor: number): string {
  return FORMATADOR.format(valor);
}
