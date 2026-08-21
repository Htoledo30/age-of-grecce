// Processo principal do Electron.
// Deliberadamente em JavaScript simples: são poucas linhas de configuração de janela
// que quase nunca mudam, e assim o projeto tem um único empacotador (Vite) em vez de dois.
'use strict';

const { app, BrowserWindow } = require('electron');
const path = require('node:path');

const URL_DEV = process.env.URL_DEV;
// JANELA=1 abre em janela em vez de tela cheia (útil pra testar sem roubar a tela)
const EM_JANELA = Boolean(process.env.JANELA);
const LARGURA_BASE = 1920;
const ALTURA_BASE = 1080;

function criarJanela() {
  const janela = new BrowserWindow({
    width: LARGURA_BASE,
    height: ALTURA_BASE,
    minWidth: 1280,
    minHeight: 720,
    fullscreen: !EM_JANELA,
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  janela.once('ready-to-show', () => janela.show());

  janela.webContents.on('before-input-event', (evento, entrada) => {
    if (entrada.type !== 'keyDown') return;
    if (entrada.key === 'F11') {
      janela.setFullScreen(!janela.isFullScreen());
      evento.preventDefault();
    }
    if (entrada.key === 'F12') {
      janela.webContents.toggleDevTools();
      evento.preventDefault();
    }
  });

  if (URL_DEV) {
    void janela.loadURL(URL_DEV);
  } else {
    void janela.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  criarJanela();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) criarJanela();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
