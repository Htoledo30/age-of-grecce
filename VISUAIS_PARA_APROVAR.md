# Artes e melhorias visuais para aprovação

Lista solicitada por Henrique. São propostas, não alterações já aprovadas no jogo.
Criar as imagens e apresentá-las antes de integrar. Não fazer commit ou push sem pedido
explícito. Não rodar testes nesta tarefa.

## Direção visual

Grécia antiga, com a campanha começando em 700 a.C. Bronze, linho, lã, couro, madeira e
cerâmica. Nada de soldados medievais, armaduras de placas medievais, cota de malha,
elmos de cavaleiro, brasões medievais, equipamento romano ou fantasia exagerada.
As artes são interpretações para o jogo, não reconstruções arqueológicas exatas.

Manter a família visual das ilustrações atuais: pintura realista, luz quente,
tons terrosos, bronze envelhecido e fundo discreto. Silhuetas legíveis em miniatura.

## Primeiro conjunto: soldados

Quatro imagens individuais geradas para Henrique aprovar, em `artes-para-aprovar/soldados/`.
Ainda não integrar ao recrutamento. Os itens abaixo marcam aprovação, não geração.

- [ ] Infantaria leve: túnica simples, pequena proteção e azagaias; aparência ágil.
- [ ] Hoplita: lança, escudo redondo, capacete e proteção de bronze de inspiração arcaica.
- [ ] Arqueiro: túnica, arco de madeira e aljava; sem armadura pesada.
- [ ] Cavaleiro: guerreiro montado, lança curta/azagaia, cavalo sem armadura e sem estribos.

## Lista de possibilidades

1. Artes próprias das quatro tropas no recrutamento.
2. Completar as imagens de construções: na captura, Templo, Fazenda, Lagar, Porto,
   Estrada e Muralha apareceram com miniaturas vazias; conferir os assets existentes
   antes de criar substitutos.
3. Ícones dos produtos: azeite, vinho, peixe, madeira, mármore, ferro, metais preciosos,
   gado e cavalos; aproveitar o trigo já criado.
4. Pequenas cidades no mapa: aldeia, cidade murada e acrópole para a capital.
5. Relevo e vegetação discretos sob as cores políticas: montanhas, colinas, bosques e campos.
6. Textura do mar, profundidade e acabamento do litoral.
7. Molduras gregas com bronze envelhecido, relevo e cantos trabalhados.
8. Texturas sutis nos fundos dos painéis, preservando a leitura.
9. Ícones de Governo, Diplomacia, Construções e Recrutar no estilo da moeda e do trigo.
10. Medalhão de capital e marca correspondente no mapa.
11. Símbolos para pacto, aliança, comércio, tributo e outros acordos existentes.
12. Tecido, costura e hastes nos estandartes, mantendo os símbolos dos reinos.
13. Faixa ilustrada na ficha provincial: litoral, interior agrícola ou montanhas.
14. Acabamento dos botões e controles: relevo, estados pressionados e puxador de bronze.
15. Medalhão esculpido para a coruja do menu.

## Referências consultadas

- https://www.metmuseum.org/essays/geometric-art-in-ancient-greece
- https://www.metmuseum.org/art/collection/search/253512
- https://camu.gr/en/item/geometrikos-amforeas/

## Geração das propostas de soldados

Ferramenta: geração de imagens integrada. Propostas para aprovação, sem substituir assets.
Os prompts finais usados estão registrados abaixo.

### Infantaria leve

```text
Use case: stylized-concept. Asset type: individual troop recruitment illustration for Age of Grecce, an ancient Greek strategy game whose campaign begins around 700 BCE. Create one polished standalone landscape 3:2 image, no text or UI. Art direction: realistic hand-painted historical game illustration, restrained cinematic warm afternoon light from upper left, aged bronze, muted ochre, cream linen, faded terracotta cloth, dark olive background. Human soldiers, NOT metallic statues or coin reliefs. Earthy colors, textured brushwork and convincing anatomy, clear bold silhouette that reads in a small recruitment thumbnail. Single main subject centered and large with clear negative space around equipment; distant softly blurred dry Greek hills, olive trees and simple archaic stone settlement, no monumental Classical Parthenon. Early archaic Greek interpretation, grounded simple equipment. No medieval or fantasy elements: no chainmail, no medieval plate armor, no greathelm or visor, no gothic shapes, no heraldic surcoat or kite shield, no Roman segmented armor or legionary scutum, no Viking horns, no huge fantasy pauldrons, no medieval castles, no text, no letters, no logos, no watermark, no frame.
Subject: a lightly equipped ancient Greek foot skirmisher, adult man with short dark hair and short beard, bareheaded, weathered cream short wool/linen tunic belted with simple leather, faded russet cloth over one shoulder, bare lower legs. He carries two slender throwing javelins in his right hand and a small plain round wicker-and-hide shield on his left forearm. No metal body armor, no helmet, no sword-centered pose. Three-quarter standing stance, from head to just below knees, alert and capable rather than heroic bodybuilder, face and equipment unobstructed. Emphasize mobility and modest equipment.
```

### Hoplita

```text
Create one landscape 3:2 recruitment-card illustration of an ancient Greek hoplite for the historical strategy game Age of Grecce. A fully clothed adult Greek soldier stands calmly in a sunlit olive grove, seen in three-quarter view from head to knees. He wears a plain early Greek bronze helmet with cheek guards and a modest dark horsehair crest, a simple archaic bell-shaped bronze cuirass over a cream linen tunic, and a muted terracotta cloak. His left arm carries a large plain round bronze-faced wooden shield; his right hand holds a slender spear vertically. Equipment inspired by early archaic Greece around 700 BCE. Peaceful character portrait, no fighting or injuries. Realistic painterly historical game art, warm afternoon sunlight, aged bronze, cream and russet fabric, dusty olive-green and ochre palette, natural human proportions and convincing hands. Subject large, centered, readable as a small thumbnail. Background is a softly blurred Greek coastal hillside with olive trees and modest stone houses. All clothing and armor should be ancient Greek; no medieval armor, chainmail, knight helmet, medieval castle, Roman legionary equipment or fantasy decorations. No text, no letters, no watermark, no UI or decorative frame.
```

### Arqueiro

```text
Use case: stylized-concept. Asset type: individual troop recruitment illustration for Age of Grecce, an ancient Greek strategy game whose campaign begins around 700 BCE. Create one polished standalone landscape 3:2 image, no text or UI. Art direction: realistic hand-painted historical game illustration, restrained cinematic warm afternoon light from upper left, aged bronze, muted ochre, cream linen, faded terracotta cloth, dark olive background. Human soldiers, NOT metallic statues or coin reliefs. Earthy colors, textured brushwork and convincing anatomy, clear bold silhouette that reads in a small recruitment thumbnail. Single main subject centered and large with clear negative space around equipment; distant softly blurred dry Greek hills, olive trees and simple archaic stone settlement, no monumental Classical Parthenon. Early archaic Greek interpretation, grounded simple equipment. No medieval or fantasy elements: no chainmail, no medieval plate armor, no greathelm or visor, no gothic shapes, no heraldic surcoat or kite shield, no Roman segmented armor or legionary scutum, no Viking horns, no huge fantasy pauldrons, no medieval castles, no text, no letters, no logos, no watermark, no frame.
Subject: an ancient Greek light archer, adult male with dark curly hair, bareheaded, simple faded terracotta short tunic, linen wrap and narrow leather belt, bare forearms, small quiver of feathered arrows visible at his hip/back. No metal body armor, no helmet, no hood or medieval leather ranger costume. He holds a modest curved wooden bow in his left hand, with one arrow nocked and right hand gently drawing the string in a credible anatomically correct preparatory archery pose, bow and string clearly readable and separate. Three-quarter view, head to just below knees, face visible, functional plain equipment. Read instantly as an archer rather than a swordsman.
```

### Cavaleiro

```text
Use case: stylized-concept. Asset type: individual troop recruitment illustration for Age of Grecce, an ancient Greek strategy game whose campaign begins around 700 BCE. Create one polished standalone landscape 3:2 image, no text or UI. Art direction: realistic hand-painted historical game illustration, restrained cinematic warm afternoon light from upper left, aged bronze, muted ochre, cream linen, faded terracotta cloth, dark olive background. Human soldiers, NOT metallic statues or coin reliefs. Earthy colors, textured brushwork and convincing anatomy, clear bold silhouette that reads in a small recruitment thumbnail. Single main subject centered and large with clear negative space around equipment; distant softly blurred dry Greek hills, olive trees and simple archaic stone settlement, no monumental Classical Parthenon. Early archaic Greek interpretation, grounded simple equipment. No medieval or fantasy elements: no chainmail, no medieval plate armor, no greathelm or visor, no gothic shapes, no heraldic surcoat or kite shield, no Roman segmented armor or legionary scutum, no Viking horns, no huge fantasy pauldrons, no medieval castles, no text, no letters, no logos, no watermark, no frame.
Subject: one early archaic Greek mounted warrior on a compact bay horse, horse in clear three-quarter side view facing left, rider upright and alert. Rider wears a simple bronze open-faced archaic helmet, short cream tunic with a modest faded russet shoulder cloak, plain light protective torso garment without medieval plating. Holds a slender short spear or javelin in right hand and simple reins in left hand. Bareback or a simple woven saddlecloth only: absolutely NO stirrups, no stirrup leathers, no high medieval saddle, no couched knight's lance, no horse armor, no medieval tack decorations. Show the complete horse and rider within the landscape frame, all four horse legs anatomically correct, horse walking calmly. Scale the pair to fill the frame while preserving head and hooves. This is a light ancient Greek horseman, not a medieval knight.
```
