/**
 * A porta única dos esquemas de dados do jogo.
 *
 * Regra do projeto: **nenhum dado de conteúdo mora em código** — tudo em JSON, validado por
 * Zod. Cada arquivo de dados tem o seu esquema em `esquemas/`, e este arquivo é só o
 * endereço por onde o resto do jogo os pede.
 *
 * O nome do tipo é o mesmo do esquema de propósito (`Economia` é o validador E o tipo
 * inferido): quem importa não precisa decidir entre dois nomes para a mesma coisa.
 */

export { Ajustes } from './esquemas/ajustes';
export { Construcoes } from './esquemas/construcoes';
export { Economia } from './esquemas/economia';
export { Exercitos } from './esquemas/exercitos';
export { Mundo } from './esquemas/mundo';
export { Provincias } from './esquemas/provincias';
