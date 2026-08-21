# -*- coding: utf-8 -*-
"""Prévia colorida do recorte de províncias, por cima do terreno."""
import json, sys
import numpy as np
from PIL import Image

ALVO = sys.argv[1] if len(sys.argv) > 1 else 'provincias-previa'
CORTE = sys.argv[2] if len(sys.argv) > 2 else None  # "x0,y0,x1,y1" em fração 0..1

meta = json.load(open('assets/mundo/provincias.json', encoding='utf-8'))
cor_do_poder = {p['id']: p['cor'] for p in meta['poderes']}

n = max(p['indice'] for p in meta['provincias']) + 1
paleta = np.zeros((n, 3), dtype=np.uint8)
for p in meta['provincias']:
    h = cor_do_poder[p['dono']].lstrip('#')
    paleta[p['indice']] = [int(h[i:i + 2], 16) for i in (0, 2, 4)]

idx_img = np.array(Image.open('assets/mundo/provincias.png').convert('RGB'))
indice = idx_img[:, :, 0].astype(np.uint16) | (idx_img[:, :, 1].astype(np.uint16) << 8)

terreno = np.array(Image.open('assets/mundo/terreno.png').convert('RGB')).astype(np.float32)
politico = paleta[np.clip(indice, 0, n - 1)].astype(np.float32)

terra = indice > 0
saida = terreno.copy()
saida[terra] = terreno[terra] * 0.42 + politico[terra] * 0.58

# fronteira: pixel cujo vizinho tem outro índice
dif = np.zeros(indice.shape, dtype=bool)
dif[:, :-1] |= indice[:, :-1] != indice[:, 1:]
dif[:-1, :] |= indice[:-1, :] != indice[1:, :]
borda = dif & terra
saida[borda] = saida[borda] * 0.30 + np.array([38, 32, 26], dtype=np.float32) * 0.70

im = Image.fromarray(saida.astype(np.uint8))
if CORTE:
    x0, y0, x1, y1 = (float(v) for v in CORTE.split(','))
    w, h = im.size
    im = im.crop((int(x0 * w), int(y0 * h), int(x1 * w), int(y1 * h)))

im.thumbnail((1600, 1600), Image.LANCZOS)
destino = f'C:/Users/henry/AppData/Local/Temp/claude/c--jogos/189a0ea8-7963-4db8-bafc-6f162323cf6a/scratchpad/{ALVO}.png'
im.save(destino)
print(destino, im.size)
