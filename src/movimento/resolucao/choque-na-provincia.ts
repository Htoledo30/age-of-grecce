/**
 * FASE CHOQUE — quem ficou junto de quem, agora que todos chegaram.
 *
 * Com três ou mais poderes no mesmo lugar, resolve **aos pares, da maior força para a menor**,
 * e o desempate é por id. É provisório e está marcado como tal: combate de três lados de
 * verdade é assunto de diplomacia, que não existe.
 */

import { soma } from './forcas';
import type { Forca } from './forcas';
import type { Ajustes } from '@/dados/esquema';
import type { RelatorioEmConstrucao } from './relatorio';

type AjustesDaBatalha = Ajustes['jogo']['combate']['batalha'];
import { travarLados } from './travar-lados';

export function naProvincia(
  forcas: Forca[],
  batalhas: RelatorioEmConstrucao['batalhas'],
  batalha: AjustesDaBatalha,
  dispersaram: (porOrigem: Readonly<Record<string, number>>) => void,
  refugio: (provincia: string, poder: string) => string | null,
  donoDe: (idProvincia: string) => string,
  querLutar: (forca: Forca) => boolean,
  choqueObrigado: (provincia: string, presentes: readonly Forca[]) => boolean,
): void {
  const porProvincia = new Map<string, Forca[]>();
  for (const forca of forcas) {
    if (!forca.viva) continue;
    const lista = porProvincia.get(forca.posicao) ?? [];
    lista.push(forca);
    porProvincia.set(forca.posicao, lista);
  }

  for (const provincia of [...porProvincia.keys()].sort()) {
    const presentes = porProvincia.get(provincia) ?? [];
    // A surtida e o socorro que chega são o **contrário** da postura: em vez de deixar cada
    // força escolher, tiram a escolha de todas. Lido uma vez por província e antes do laço —
    // o que obriga o choque é o estado da chegada, não o que sobrar dele.
    const obrigado = choqueObrigado(provincia, presentes);
    for (;;) {
      const vivas = presentes.filter((f) => f.viva);
      // ⚠️ **Estar junto não é lutar.** Só entram no choque os poderes que QUEREM lutar; quem
      // está sitiando fica ao lado, e um poder sozinho a fim de briga não tem com quem brigar.
      // É isto que deixa sitiante e sitiado ocuparem a mesma província sem se aniquilarem — o
      // que a hoste com identidade própria passou a permitir na estrutura, e que a regra ainda
      // proibia.
      //
      // Participação é decidida por PODER, não por hoste: se alguma força de um poder quer
      // lutar, todas as dele que estão ali lutam. Um exército não assiste ao massacre do
      // vizinho de acampamento por causa de uma ordem diferente.
      const poderes = new Set(vivas.filter((f) => obrigado || querLutar(f)).map((f) => f.poder));
      if (poderes.size < 2) break;

      // Ordena por força, e desempata por id: sem isso o resultado dependeria da ordem em que
      // as forças entraram na lista.
      const ordenadas = [...poderes]
        .map((poder) => ({
          poder,
          forca: vivas.filter((f) => f.poder === poder).reduce((s, f) => s + soma(f.contingentes), 0),
        }))
        .sort((x, y) => y.forca - x.forca || x.poder.localeCompare(y.poder));

      const maior = ordenadas[0];
      const segunda = ordenadas[1];
      if (!maior || !segunda) break;
      // ⚠️ **Empate encerra a província nesta rodada.** Com choque e perseguição os dois
      // lados podem terminar de pé, e aí eles continuam sendo os dois maiores presentes: sem
      // esta saída o laço os emparelha de novo, e de novo, até os dois zerarem. Foi
      // exatamente o que aconteceu — onze batalhas na mesma província numa rodada só, e os
      // homens sumindo sem dispersar. Ninguém cedeu hoje; brigam de novo na próxima rodada,
      // ou um deles marcha embora.
      const houveVencedor = travarLados(
        vivas.filter((f) => f.poder === maior.poder),
        vivas.filter((f) => f.poder === segunda.poder),
        provincia,
        batalhas,
        // ⚠️ Quem lutou numa PROVÍNCIA para ali: a rota que sobrava é cancelada. É o contrário
        // do encontro na estrada, e a diferença tem motivo — lá não existe lugar onde ficar,
        // aqui existe. Deixar o vencedor seguir daria um segundo choque no mesmo passo e
        // quebraria a regra de "todos chegam antes de qualquer choque".
        true,
        batalha,
        dispersaram,
        // ⚠️ Quem SEGURA O CHÃO leva o empate: num jogo de conquista, quem ataca precisa
        // vencer, e barrar o invasor já é a vitória de quem defende. Sem dono presente — dois
        // estrangeiros disputando terra de um terceiro — desempata o id, que é arbitrário mas
        // nunca varia.
        segunda.poder === donoDe(provincia)
          ? 'b'
          : maior.poder === donoDe(provincia)
            ? 'a'
            : maior.poder.localeCompare(segunda.poder) <= 0
              ? 'a'
              : 'b',
        refugio,
      );
      if (!houveVencedor) break;
    }
  }
}
