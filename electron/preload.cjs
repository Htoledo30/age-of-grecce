'use strict';

const { contextBridge } = require('electron');

// Ponte mínima. Cresce só quando o jogo precisar de algo do sistema (salvar, ler mods).
contextBridge.exposeInMainWorld('nativo', {
  plataforma: process.platform,
  versoes: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
});
