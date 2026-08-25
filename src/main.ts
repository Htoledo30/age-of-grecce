/**
 * O ponto de entrada — e nada além disso.
 *
 * Era aqui que moravam mil e duzentas linhas de vistas, eventos, laço e ganchos; hoje o
 * trabalho está em `src/aplicacao/`, cada etapa num arquivo com um assunto. O que sobra é a
 * única coisa que só o entry point pode fazer: puxar os estilos, subir o jogo e falhar
 * visivelmente se ele não subir.
 */

import './aplicacao/estilos';
import { iniciarJogo } from './aplicacao/iniciar-jogo';

iniciarJogo().catch((erro: unknown) => {
  console.error(erro);
  document.body.dataset['erro'] = String(erro);
});
