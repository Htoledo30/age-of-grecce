/**
 * A folha de estilos do jogo, reunida num lugar só.
 *
 * Cada componente tem o seu CSS ao lado do seu TypeScript; é aqui que eles entram no pacote.
 * A ordem importa pouco — as regras são de classes distintas — mas a base vem primeiro, para
 * que o reset e as variáveis existam antes de qualquer componente usá-las.
 */

// ⚠️ As faces vêm ANTES de qualquer folha: `base.css` já pede `--fonte-corpo` no body, e
// declarar a fonte depois de usá-la faz o primeiro quadro sair na fonte de sistema.
import '@/estilo/fontes.css';
import '@/estilo/base.css';
import '@/ui/icones-gregos.css';
import '@/ui/painel-fps.css';
import '@/ui/painel-lateral.css';
import '@/ui/rotulos-mapa.css';
import '@/ui/ficha-provincia.css';
import '@/ui/acoes-provincia.css';
import '@/ui/janela.css';
import '@/ui/governo.css';
import '@/ui/construcoes.css';
import '@/ui/moeda.css';
import '@/ui/diplomacia.css';
import '@/ui/inicio-jogo.css';
import '@/ui/controles.css';
import '@/ui/barra-turno.css';
import '@/ui/recrutamento.css';
import '@/ui/exercito-ficha.css';
import '@/ui/marchas-mapa.css';
import '@/ui/hostes-mapa.css';
import '@/ui/estandartes.css';
import '@/ui/cercos-mapa.css';
import '@/ui/batalha.css';
import '@/ui/cronica.css';
import '@/ui/fim-de-jogo.css';
import '@/ui/tooltip.css';
import '@/ui/menu-pausa.css';
import '@/editor/editor.css';
