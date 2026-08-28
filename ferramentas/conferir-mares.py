"""Confere se cada semente de mar caiu MESMO na água, lendo o mapa de biomas assado.

Existe porque semente de mar plantada em terra firme é uma zona que nunca nasce — e
descobrir isso depois de rodar o gerador inteiro custa minutos de máquina. Aqui custa
segundos: projeta a coordenada, lê o pixel, e diz o bioma que há ali.
"""

import json
import struct
import zlib

MARGEM = 48
# ⚠️ O biomas.png guarda o ÍNDICE do bioma no primeiro canal, e não a cor dele: 0 e 1 são
# mar-fundo e mar-raso, 2 é praia, e daí para cima é terra.
BIOMAS = ['mar-fundo', 'mar-raso', 'praia', 'planicie', 'estepe', 'floresta', 'colina',
          'montanha', 'pico']


def ler_png(caminho):
    with open(caminho, 'rb') as f:
        dados = f.read()
    pos, largura, altura, idat, profundidade, cor = 8, 0, 0, b'', 8, 2
    while pos < len(dados):
        tamanho = struct.unpack('>I', dados[pos:pos + 4])[0]
        tipo = dados[pos + 4:pos + 8]
        corpo = dados[pos + 8:pos + 8 + tamanho]
        if tipo == b'IHDR':
            largura, altura, profundidade, cor = struct.unpack('>IIBB', corpo[:10])
        elif tipo == b'IDAT':
            idat += corpo
        pos += tamanho + 12
    canais = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[cor]
    cru = zlib.decompress(idat)
    passo = largura * canais
    linhas = []
    anterior = bytearray(passo)
    i = 0
    for _ in range(altura):
        filtro = cru[i]
        linha = bytearray(cru[i + 1:i + 1 + passo])
        i += 1 + passo
        for x in range(passo):
            a = linha[x - canais] if x >= canais else 0
            b = anterior[x]
            c = anterior[x - canais] if x >= canais else 0
            if filtro == 1:
                linha[x] = (linha[x] + a) & 255
            elif filtro == 2:
                linha[x] = (linha[x] + b) & 255
            elif filtro == 3:
                linha[x] = (linha[x] + (a + b) // 2) & 255
            elif filtro == 4:
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                linha[x] = (linha[x] + pr) & 255
        linhas.append(bytes(linha))
        anterior = linha
    return largura, altura, canais, linhas


mapa = json.load(open('assets/mundo/mapa.json', encoding='utf-8'))
mares = json.load(open('dados/mares.json', encoding='utf-8'))['mares']
largura, altura, canais, linhas = ler_png('assets/mundo/biomas.png')
unidades = mapa['dimensoes']['largura'] / largura
lim = mapa['limitesReferencia']

print(f'biomas {largura}x{altura}, {canais} canais, {unidades:.2f} unidades por pixel\n')
ruins = []
for m in mares:
    u = (m['lon'] - lim['oeste']) / (lim['leste'] - lim['oeste'])
    v = (lim['norte'] - m['lat']) / (lim['norte'] - lim['sul'])
    x = round((MARGEM + u * (mapa['dimensoes']['largura'] - MARGEM * 2)) / unidades)
    y = round((MARGEM + v * (mapa['dimensoes']['altura'] - MARGEM * 2)) / unidades)
    if not (0 <= x < largura and 0 <= y < altura):
        ruins.append((m['id'], 'FORA DA MOLDURA', x, y))
        continue
    indice = linhas[y][x * canais]
    bioma = BIOMAS[indice] if indice < len(BIOMAS) else f'?{indice}'
    if indice > 1:
        # A água mais próxima, em anéis crescentes — o espelho do `terraMaisProxima` que o
        # gerador de províncias usa para salvar semente que caiu meio pixel no mar.
        achou = None
        for raio in range(1, 90):
            for dx in range(-raio, raio + 1):
                for dy in (-raio, raio):
                    ax, ay = x + dx, y + dy
                    if 0 <= ax < largura and 0 <= ay < altura and linhas[ay][ax * canais] <= 1:
                        achou = (ax, ay)
                        break
                if achou:
                    break
            if not achou:
                for dy in range(-raio, raio + 1):
                    for dx in (-raio, raio):
                        ax, ay = x + dx, y + dy
                        if 0 <= ax < largura and 0 <= ay < altura and linhas[ay][ax * canais] <= 1:
                            achou = (ax, ay)
                            break
                    if achou:
                        break
            if achou:
                break
        if achou:
            ax, ay = achou
            uu = (ax * unidades - MARGEM) / (mapa['dimensoes']['largura'] - MARGEM * 2)
            vv = (ay * unidades - MARGEM) / (mapa['dimensoes']['altura'] - MARGEM * 2)
            lon = lim['oeste'] + uu * (lim['leste'] - lim['oeste'])
            lat = lim['norte'] - vv * (lim['norte'] - lim['sul'])
            ruins.append((m['id'], f'em {bioma}', f'{lon:.2f}, {lat:.2f}'))
        else:
            ruins.append((m['id'], f'em {bioma}', 'sem água por perto'))

print(f'{len(mares)} sementes de mar, {len(mares) - len(ruins)} na agua, {len(ruins)} fora')
for id_, motivo, sugestao in ruins:
    print(f'  {id_:26} {motivo:14} tente: {sugestao}')
