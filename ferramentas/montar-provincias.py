# -*- coding: utf-8 -*-
"""Monta dados/provincias.json — a semente de cada província do mundo grego em 700 a.C."""
import json, colorsys

# (id, nome, regiao, lon, lat, dono)
P = [
 # ---- Ática, Mégara, Egina -------------------------------------------------
 ('atenas','Atenas','atica',23.73,37.98,'atenas'),
 ('maratona','Maratona','atica',23.96,38.13,'atenas'),
 ('sounion','Sunião','atica',23.95,37.78,'atenas'),
 ('eleusis','Elêusis','atica',23.54,38.04,'eleusis'),
 ('megara','Mégara','megarida',23.34,37.99,'megara'),
 ('salamina','Salamina','atica',23.49,37.96,'megara'),
 ('egina','Egina','saronico',23.43,37.75,'egina'),
 # ---- Beócia ---------------------------------------------------------------
 ('tebas','Tebas','beocia',23.32,38.32,'tebas'),
 ('tanagra','Tanagra','beocia',23.53,38.31,'tanagra'),
 ('tespias','Téspias','beocia',23.14,38.31,'tespias'),
 ('plateia','Plateia','beocia',23.27,38.22,'plateia'),
 ('orcomeno','Orcômeno','beocia',22.98,38.49,'orcomeno'),
 ('queroneia','Queroneia','beocia',22.85,38.49,'orcomeno'),
 # ---- Eubeia ---------------------------------------------------------------
 ('calcis','Cálcis','eubeia',23.60,38.46,'calcis'),
 ('histiea','Histieia','eubeia',23.15,38.92,'calcis'),
 ('eretria','Erétria','eubeia',23.79,38.40,'eretria'),
 ('caristo','Cáristo','eubeia',24.42,38.02,'caristo'),
 # ---- Fócida, Lócrida, Dóride ---------------------------------------------
 ('delfos','Delfos','focida',22.50,38.48,'delfos'),
 ('elateia','Elateia','focida',22.77,38.63,'focida'),
 ('opunte','Opunte','locrida',23.09,38.55,'locros-opuntios'),
 ('anfissa','Anfissa','locrida',22.37,38.53,'locros-ozolios'),
 ('doride','Dóride','doride',22.30,38.75,'dorios'),
 # ---- Etólia, Acarnânia, Málide -------------------------------------------
 ('calidao','Calidão','etolia',21.53,38.37,'etolos'),
 ('termo','Termo','etolia',21.66,38.57,'etolos'),
 ('estrato','Estrato','acarnania',21.31,38.67,'acarnanios'),
 ('astaco','Astaco','acarnania',21.10,38.53,'acarnanios'),
 ('lamia','Lâmia','malide',22.43,38.90,'malieus'),
 # ---- Tessália -------------------------------------------------------------
 ('larissa','Larissa','tessalia',22.42,39.64,'larissa'),
 ('feras','Feras','tessalia',22.71,39.44,'feras'),
 ('farsalo','Farsalo','tessalia',22.38,39.29,'farsalo'),
 ('trica','Trica','tessalia',21.77,39.55,'trica'),
 ('iolco','Iolco','magnesia',22.95,39.36,'iolco'),
 ('olooson','Ólooson','perrebia',22.20,39.90,'perrebos'),
 # ---- Epiro e ilhas jônias -------------------------------------------------
 ('dodona','Dodona','epiro',20.79,39.55,'molossos'),
 ('passarao','Passarão','epiro',20.72,39.92,'molossos'),
 ('tesprotia','Tesprótia','epiro',20.51,39.42,'tesprotos'),
 ('cassopia','Cassópia','epiro',20.80,39.10,'tesprotos'),
 ('butroto','Butroto','epiro',20.02,39.75,'caones'),
 ('caonia','Caônia','epiro',20.32,40.05,'caones'),
 ('corcira','Córcira','ionio',19.85,39.62,'corcira'),
 ('cefalenia','Cefalênia','ionio',20.60,38.20,'cefalenia'),
 ('itaca','Ítaca','ionio',20.71,38.40,'itaca'),
 ('zacinto','Zacinto','ionio',20.75,37.79,'zacinto'),
 ('leucade','Lêucade','ionio',20.68,38.72,'acarnanios'),
 # ---- Ilíria ---------------------------------------------------------------
 ('amantes','Amantes','iliria',19.70,40.32,'amantes'),
 ('bulinos','Bulinos','iliria',19.42,40.60,'bulinos'),
 ('partinos','Partinos','iliria',19.78,41.00,'partinos'),
 ('taulantios','Taulântios','iliria',19.58,41.35,'taulantios'),
 ('dassaretios','Dassarétios','iliria',20.60,40.85,'dassaretios'),
 ('enqueleos','Enquéleos','iliria',20.68,41.22,'enqueleos'),
 ('penestas','Penestas','iliria',20.95,41.52,'penestas'),
 # ---- Macedônia e Alta Macedônia ------------------------------------------
 ('egas','Egas','macedonia',22.13,40.48,'macedonia'),
 ('pieria','Piéria','macedonia',22.42,40.18,'macedonia'),
 ('elimeia','Elimeia','alta-macedonia',21.78,40.22,'elimeia'),
 ('orestis','Oréstide','alta-macedonia',21.25,40.52,'orestis'),
 ('lincestis','Lincéstide','alta-macedonia',21.35,40.90,'lincestis'),
 ('eordaia','Eordeia','alta-macedonia',21.78,40.65,'eordaia'),
 ('almopia','Almópia','macedonia',22.05,40.95,'almopes'),
 ('peonia','Peônia','peonia',22.05,41.35,'peones'),
 ('derriopo','Derríopo','peonia',21.55,41.35,'peones'),
 # ---- Trácia ocidental e Calcídica ----------------------------------------
 ('migdonia','Mígdon','tracia',23.00,40.75,'migdones'),
 ('crestonia','Crestônia','tracia',23.15,41.05,'crestones'),
 ('bisaltia','Bisáltia','tracia',23.50,40.90,'bisaltas'),
 ('sintice','Síntica','tracia',23.45,41.32,'sinti'),
 ('odomantes','Odomantes','tracia',23.90,41.15,'odomantes'),
 ('botica','Bótica','calcidica',23.20,40.32,'botieus'),
 ('palene','Palene','calcidica',23.35,40.03,'botieus'),
 ('sitonia','Sitônia','calcidica',23.85,40.10,'sitones'),
 ('acte','Acte','calcidica',24.28,40.25,'sitones'),
 # ---- Trácia oriental ------------------------------------------------------
 ('edones','Édones','tracia',23.98,40.92,'edones'),
 ('pieres','Pieres','tracia',24.32,40.88,'edones'),
 ('sapeus','Sápeos','tracia',24.62,41.05,'sapeus'),
 ('bistones','Bístones','tracia',25.00,41.00,'bistones'),
 ('cicones','Cícones','tracia',25.52,40.95,'cicones'),
 ('apsintios','Apsíntios','tracia',26.10,41.00,'apsintios'),
 ('dolonces','Quersoneso','tracia',26.50,40.35,'dolonces'),
 ('odrisas','Odrisas','tracia',26.40,41.55,'odrisas'),
 ('medos','Medos','tracia',24.60,41.55,'medos'),
 ('agrianes','Agrianes','tracia',23.10,41.58,'agrianes'),
 ('astas','Astas','tracia',27.40,41.55,'astas'),
 ('tinos-tracios','Tinos','tracia',28.00,41.35,'tinos-tracios'),
 ('bizantes','Bizantes','tracia',28.80,41.10,'tinos-tracios'),
 ('perinto','Perinto','tracia',27.85,40.95,'tinos-tracios'),
 # ---- Ilhas do norte e Espórades ------------------------------------------
 ('tasos','Tasos','egeu-norte',24.70,40.68,'tasos'),
 ('samotracia','Samotrácia','egeu-norte',25.53,40.47,'samotracia'),
 ('imbros','Imbros','egeu-norte',25.85,40.15,'imbros'),
 ('lemnos','Lemnos','egeu-norte',25.25,39.90,'lemnos'),
 ('tenedos','Tenedos','egeu-norte',26.06,39.82,'tenedos'),
 # Escíatos (42 km²) e Escópelos (88 km²) ja tinham o mesmo dono e sao vizinhas de
 # vista: viram uma provincia de arquipelago. Escíros fica sozinha, com 204 km².
 ('esporades','Espórades','esporades',23.73,39.12,'esporades'),
 ('esciros','Escíros','esporades',24.55,38.90,'esciros'),
 # ---- Corintia, Sicionia, Acaia, Élida ------------------------------------
 ('corinto','Corinto','corintia',22.93,37.91,'corinto'),
 ('sicion','Sícion','sicionia',22.71,37.98,'sicion'),
 ('egio','Egio','acaia',22.08,38.25,'acaia'),
 ('patras','Patras','acaia',21.73,38.24,'acaia'),
 ('dime','Dime','acaia',21.50,38.13,'acaia'),
 ('elide','Élide','elida',21.37,37.89,'elide'),
 ('olimpia','Olímpia','pisatide',21.63,37.64,'pisa'),
 ('trifilia','Trifília','trifilia',21.63,37.42,'trifilia'),
 # ---- Argólida -------------------------------------------------------------
 ('argos','Argos','argolida',22.72,37.63,'argos'),
 ('micenas','Micenas','argolida',22.76,37.75,'argos'),
 ('cinuria','Cinúria','argolida',22.75,37.30,'argos'),
 ('epidauro','Epidauro','argolida',23.15,37.63,'epidauro'),
 ('trezena','Trezena','argolida',23.36,37.51,'trezena'),
 ('hermione','Hermíone','argolida',23.25,37.38,'hermione'),
 # ---- Arcádia --------------------------------------------------------------
 ('tegeia','Tegeia','arcadia',22.42,37.46,'tegeia'),
 ('mantineia','Mantineia','arcadia',22.40,37.63,'mantineia'),
 ('orcomeno-arcadio','Orcômeno da Arcádia','arcadia',22.32,37.75,'orcomeno-arcadio'),
 ('hereia','Hereia','arcadia',21.85,37.62,'hereia'),
 ('figalia','Figália','arcadia',21.77,37.40,'figalia'),
 # ---- Lacônia e Messênia ---------------------------------------------------
 ('esparta','Esparta','laconia',22.43,37.07,'esparta'),
 ('gitio','Gítio','laconia',22.57,36.76,'esparta'),
 ('maleia','Epidauro Limera','laconia',22.98,36.78,'esparta'),
 ('itome','Ítome','messenia',21.92,37.18,'messenia'),
 ('pilos','Pilos','messenia',21.70,36.94,'messenia'),
 ('citera','Citera','laconia',22.99,36.24,'citera'),
 # ---- Creta ----------------------------------------------------------------
 ('cnossos','Cnossos','creta',25.16,35.30,'cnossos'),
 ('lito','Lito','creta',25.35,35.15,'lito'),
 ('gortina','Górtina','creta',24.95,35.06,'gortina'),
 ('festo','Festo','creta',24.81,35.05,'festo'),
 ('eleuterna','Eleuterna','creta',24.67,35.32,'eleuterna'),
 ('cidonia','Cidônia','creta',24.02,35.51,'cidonia'),
 ('praisos','Praisos','creta',26.10,35.13,'praisos'),
 ('ierapitna','Ierápitna','creta',25.74,35.01,'praisos'),
 # ---- Cíclades -------------------------------------------------------------
 # Doze ilhas minúsculas como doze províncias e doze poderes eram ilegíveis no mapa e
 # inviáveis como campanha. As ilhas continuam desenhadas, mas formam três arquipélagos:
 # Andros, Naxos e Melos são as sementes; as demais massas entram em ANEXOS abaixo.
 ('andros','Cíclades do Norte','cicladas',24.93,37.83,'andros'),
 ('naxos','Cíclades Centrais','cicladas',25.53,37.10,'naxos'),
 ('melos','Cíclades Ocidentais','cicladas',24.42,36.72,'melos'),
 # ---- Rodes e Dodecaneso ---------------------------------------------------
 # Rodes era tres cidades-estado ate 408 a.C. — Lindos, Ialiso e Camiro — e o recorte
 # historico existia. Vira uma provincia so mesmo assim: 1.384 km² partidos em tres
 # davam tres fronteiras e tres poderes num espaco pequeno demais pra ler, e a menor
 # ficava com 242 km². Os tres nomes ficam guardados pra virarem cidades dentro dela.
 ('rodes','Rodes','rodes',28.07,36.26,'rodes'),
 ('cos','Cós','dodecaneso',27.29,36.89,'cos'),
 ('calimno','Calimno','dodecaneso',26.98,36.99,'calimno'),
 ('astipaleia','Astipaleia','dodecaneso',26.35,36.55,'astipaleia'),
 ('carpatos','Cárpatos','dodecaneso',27.15,35.60,'carpatos'),
 # So a ponta oeste de Chipre cabe na janela, e ela e a maior massa de terra que estava
 # sem dono (166 km²). Vira provincia propria: anexa-la a alguma ilha do Egeu seria
 # inventar um vinculo que nao existe.
 ('pafos','Pafos','chipre',32.30,34.90,'cipriotas'),
 # ---- Egeu oriental --------------------------------------------------------
 ('samos','Samos','egeu-leste',26.99,37.75,'samos'),
 ('quios','Quios','egeu-leste',26.05,38.37,'quios'),
 ('icaria','Icária','egeu-leste',26.10,37.60,'icaria'),
 ('mitilene','Mitilene','lesbos',26.55,39.11,'mitilene'),
 ('metimna','Metimna','lesbos',26.17,39.35,'metimna'),
 # ---- Jônia ----------------------------------------------------------------
 ('mileto','Mileto','jonia',27.28,37.53,'mileto'),
 ('priene','Priene','jonia',27.30,37.66,'priene'),
 ('efeso','Éfeso','jonia',27.34,37.94,'efeso'),
 ('colofao','Colofão','jonia',27.14,38.12,'colofao'),
 ('teos','Teos','jonia',26.78,38.18,'teos'),
 ('clazomenas','Clazômenas','jonia',26.77,38.36,'clazomenas'),
 ('eritras','Eritras','jonia',26.48,38.38,'eritras'),
 ('esmirna','Esmirna','jonia',27.14,38.42,'esmirna'),
 ('foceia','Foceia','jonia',26.75,38.67,'foceia'),
 # ---- Eólida, Tróade, Mísia ------------------------------------------------
 ('cime','Cime','eolida',26.93,38.75,'cime'),
 ('pitane','Pitane','eolida',26.93,38.98,'pitane'),
 ('adramitio','Adramítio','eolida',26.94,39.50,'adramitio'),
 ('assos','Assos','troade',26.34,39.49,'assos'),
 ('ilion','Ílion','troade',26.24,39.96,'ilion'),
 ('abido','Abido','troade',26.40,40.19,'abido'),
 ('lampsaco','Lampsaco','troade',26.70,40.35,'lampsaco'),
 ('cizico','Cízico','misia',27.89,40.39,'cizico'),
 ('dascilio','Dascílio','misia',28.10,40.12,'misos'),
 ('pergamo','Pérgamo','misia',27.18,39.13,'misos'),
 ('miletopolis','Miletópolis','misia',28.40,39.95,'misos'),
 # ---- Bitínia --------------------------------------------------------------
 ('calcedonia','Calcedônia','bitinia',29.03,40.98,'bitinos'),
 ('cios','Cios','bitinia',29.15,40.42,'bitinos'),
 ('prusa','Prusa','bitinia',29.06,40.19,'bitinos'),
 ('astaco-bitinia','Astaco','bitinia',29.60,40.72,'bitinos'),
 ('bitinia-leste','Bitínia Interior','bitinia',30.60,40.65,'bitinos'),
 ('mariandinos','Mariandinos','bitinia',31.70,41.05,'mariandinos'),
 # ---- Lídia ----------------------------------------------------------------
 ('sardes','Sardes','lidia',28.04,38.49,'lidia'),
 ('magnesia-sipilo','Magnésia do Sípilo','lidia',27.40,38.61,'lidia'),
 ('tiatira','Tiatira','lidia',27.84,38.92,'lidia'),
 ('hipepa','Hipepa','lidia',27.98,38.10,'lidia'),
 ('filadelfia','Filadélfia','lidia',28.55,38.35,'lidia'),
 ('tripolis','Trípolis','lidia',29.05,38.05,'lidia'),
 # ---- Frígia e Licaônia ----------------------------------------------------
 ('cotieu','Cotieu','frigia',29.98,39.42,'frigia'),
 ('dorileu','Dorileu','frigia',30.52,39.78,'frigia'),
 ('mideu','Mídeo','frigia',30.62,39.35,'frigia'),
 ('gordio','Gordio','frigia',31.99,39.65,'frigia'),
 ('pessinunte','Pessinunte','frigia',31.60,39.30,'frigia'),
 ('celenas','Célenas','frigia',30.17,38.06,'frigia'),
 ('apameia','Apameia','frigia',30.20,38.60,'frigia'),
 ('licaonia','Licaônia','licaonia',32.05,37.85,'licaones'),
 # ---- Cária ----------------------------------------------------------------
 ('halicarnasso','Halicarnasso','caria',27.42,37.04,'caria'),
 ('milasa','Milasa','caria',27.78,37.30,'caria'),
 ('alabanda','Alabanda','caria',27.98,37.60,'caria'),
 ('estratoniceia','Estratoniceia','caria',28.07,37.31,'caria'),
 ('caunos','Caunos','caria',28.62,36.83,'caria'),
 ('afrodisias','Afrodísias','caria',28.72,37.71,'caria'),
 ('cnido','Cnido','caria',27.37,36.68,'cnido'),
 # ---- Lícia, Pisídia, Panfília --------------------------------------------
 ('telmesso','Telmesso','licia',29.12,36.65,'licia'),
 ('xanto','Xanto','licia',29.32,36.36,'licia'),
 ('tlos','Tlos','licia',29.42,36.55,'licia'),
 ('mira','Mira','licia',29.98,36.26,'licia'),
 ('limira','Limira','licia',30.15,36.40,'licia'),
 ('termesso','Termesso','pisidia',30.47,36.98,'pisidas'),
 ('sagalasso','Sagalasso','pisidia',30.52,37.68,'pisidas'),
 ('selge','Selge','pisidia',31.13,37.23,'pisidas'),
 ('faselis','Faselis','panfilia',30.55,36.53,'panfilios'),
 ('perge','Perge','panfilia',30.85,36.96,'panfilios'),
 ('aspendo','Aspendo','panfilia',31.17,36.94,'panfilios'),
 ('side','Side','panfilia',31.39,36.77,'panfilios'),
]


# ---------------------------------------------------------------------------------
# Ilhas anexadas: pertencem a uma provincia mas nao se tocam por terra
# ---------------------------------------------------------------------------------
#
# Sao as ilhotas que nao merecem provincia propria e nao podem ficar sem dono: sem isto
# elas aparecem na camada politica como buraco sem cor, com cara de esquecimento.
#
# `npm run gerar-provincias -- --sugerir` lista as orfas com a provincia mais proxima.
# A sugestao e ponto de partida: as doze mais isoladas o anel de busca nao alcanca, e
# proximidade tambem nao e pertencimento. Cada linha abaixo passou por decisao.

ANEXOS = {
 # Ciclades: cada marcador toma a ilha inteira para o arquipelago da semente.
 'andros': [
     (24.713, 37.613),                                  # ilha menor já ligada a Andros
     (25.16, 37.56), (24.917, 37.436),                  # Tinos e seu antigo anexo
     (25.35, 37.45),                                    # Miconos
     (24.34, 37.62), (24.42, 37.41),                    # Ceos e Citnos
 ],
 'naxos': [
     (25.453, 36.846), (25.813, 37.115), (25.647, 36.894),
     (25.15, 37.08), (25.054, 37.007),                  # Paros e seu antigo anexo
     (25.29, 36.72), (25.125, 36.684), (24.901, 36.633), # Ios e Folegandros
     (25.90, 36.83),                                    # Amorgos
 ],
 'melos': [
     (24.562, 36.817), (24.640, 36.773),
     (24.71, 36.98), (24.49, 37.15),                    # Sifnos e Serifos
     (25.43, 36.42), (25.782, 36.375),                  # Tera e Anafi
 ],
 # Esporades e norte do Egeu
 'esporades': [(23.49, 39.16), (23.910, 39.215), (24.067, 39.332), (24.164, 39.394)],
 'lemnos': [(25.008, 39.526)],                          # Agios Efstratios
 'quios': [(26.229, 38.521), (25.577, 38.578)],         # a segunda e Psara
 'samos': [(26.493, 37.571), (26.518, 37.623)],
 'icaria': [],
 # Dodecaneso e costa caria
 'rodes': [(27.567, 36.230), (27.362, 36.430)],         # a segunda e Telos
 'cos': [(27.166, 36.589), (27.142, 36.940)],
 'calimno': [(26.830, 37.153), (26.751, 37.303), (26.557, 37.334)],  # Leros e vizinhas
 'carpatos': [(26.926, 35.397)],
 'cnido': [(27.828, 36.584)],
 'caunos': [(27.845, 36.638)],
 'priene': [(26.966, 37.463)],
 'eritras': [(26.717, 38.496)],
 # Marmara
 'cizico': [(27.619, 40.626), (27.612, 40.479)],
 # Golfo Saronico e Argolida
 'trezena': [(23.466, 37.336)],
 'hermione': [(23.132, 37.265)],
 'sounion': [(24.127, 37.716)],
 'caristo': [(24.255, 37.999)],
 # Laconia e Creta
 'maleia': [(22.956, 36.487)],
 'citera': [(23.307, 35.865)],                          # Anticitera
 'cnossos': [(25.218, 35.448)],
 'praisos': [(26.301, 35.301)],
 'festo': [(24.093, 34.845)],                           # Gavdos, ao sul de Creta
 # Jonio e Epiro
 'astaco': [(20.908, 38.626)],
 'leucade': [(20.766, 38.654)],
 'tesprotia': [(20.160, 39.210)],
}

# povo de cada poder — é o que dá a família de cor
POVO = {
 'atenas':'jonio','eleusis':'jonio','megara':'dorio','egina':'dorio',
 'tebas':'beocio','tanagra':'beocio','tespias':'beocio','plateia':'beocio','orcomeno':'beocio',
 'calcis':'jonio','eretria':'jonio','caristo':'jonio',
 'delfos':'focio','focida':'focio','locros-opuntios':'locrio','locros-ozolios':'locrio','dorios':'dorio',
 'etolos':'etolio','acarnanios':'etolio','malieus':'etolio',
 'larissa':'tessalio','feras':'tessalio','farsalo':'tessalio','trica':'tessalio',
 'iolco':'tessalio','perrebos':'tessalio',
 'molossos':'epirota','tesprotos':'epirota','caones':'epirota',
 'corcira':'dorio','cefalenia':'aqueu','itaca':'aqueu','zacinto':'aqueu',
 'amantes':'ilirio','bulinos':'ilirio','partinos':'ilirio','taulantios':'ilirio',
 'dassaretios':'ilirio','enqueleos':'ilirio','penestas':'ilirio',
 'macedonia':'macedonio','elimeia':'macedonio','orestis':'macedonio','lincestis':'macedonio',
 'eordaia':'macedonio','almopes':'macedonio','peones':'peonio',
 'migdones':'trace','crestones':'trace','bisaltas':'trace','sinti':'trace','odomantes':'trace',
 'botieus':'trace','sitones':'trace','edones':'trace','sapeus':'trace','bistones':'trace',
 'cicones':'trace','apsintios':'trace','dolonces':'trace','odrisas':'trace','medos':'trace',
 'agrianes':'trace','astas':'trace','tinos-tracios':'trace','tasos':'trace',
 'samotracia':'pelasgo','imbros':'pelasgo','lemnos':'pelasgo','esciros':'pelasgo',
 'tenedos':'eolio','esporades':'jonio',
 'corinto':'dorio','sicion':'dorio','acaia':'aqueu','elide':'aqueu','pisa':'aqueu','trifilia':'aqueu',
 'argos':'dorio','epidauro':'dorio','trezena':'dorio','hermione':'dorio',
 'tegeia':'arcadio','mantineia':'arcadio','orcomeno-arcadio':'arcadio','hereia':'arcadio','figalia':'arcadio',
 'esparta':'dorio','messenia':'dorio','citera':'dorio',
 'cnossos':'cretense','lito':'cretense','gortina':'cretense','festo':'cretense',
 'eleuterna':'cretense','cidonia':'cretense','praisos':'eteocretense',
 # Os antigos poderes insulares continuam nesta régua mesmo depois de agrupados. A posição
 # alfabética é o slot da cor: removê-los daqui repintaria todos os poderes seguintes sem
 # nenhuma razão de jogo.
 'naxos':'jonio','paros':'jonio','andros':'jonio','tinos':'jonio','miconos':'jonio','keos':'jonio',
 'citnos':'jonio','sifnos':'jonio','melos':'dorio','tera':'dorio',
 'ios':'jonio','amorgos':'jonio',
 'rodes':'dorio','cos':'dorio','calimno':'dorio',
 'astipaleia':'dorio','carpatos':'dorio','cnido':'dorio','cipriotas':'cipriota',
 'samos':'jonio','quios':'jonio','icaria':'jonio','mitilene':'eolio','metimna':'eolio',
 'mileto':'jonio','priene':'jonio','efeso':'jonio','colofao':'jonio','teos':'jonio',
 'clazomenas':'jonio','eritras':'jonio','esmirna':'jonio','foceia':'jonio',
 'cime':'eolio','pitane':'eolio','adramitio':'eolio','assos':'eolio','ilion':'eolio',
 'abido':'eolio','lampsaco':'jonio','cizico':'jonio','misos':'misio',
 'bitinos':'bitinio','mariandinos':'bitinio',
 'lidia':'lidio','frigia':'frigio','licaones':'frigio',
 'caria':'cario','cnido':'dorio','licia':'licio','pisidas':'pisidio','panfilios':'panfilio',
}

# matiz por povo — famílias culturais legíveis de longe, saturação baixa (papel e tinta)
MATIZ = {
 'jonio':0.58,'dorio':0.02,'eolio':0.72,'aqueu':0.10,'arcadio':0.14,'beocio':0.44,
 'focio':0.36,'locrio':0.32,'etolio':0.28,'tessalio':0.50,'epirota':0.80,'ilirio':0.87,
 'macedonio':0.92,'peonio':0.95,'trace':0.66,'pelasgo':0.62,'cretense':0.06,'eteocretense':0.98,
 'misio':0.76,'bitinio':0.70,'lidio':0.19,'frigio':0.23,'cario':0.54,'licio':0.48,
 'pisidio':0.40,'panfilio':0.16,'cipriota':0.11,
}

contagem = {}
for _, _, _, _, _, dono in P:
    contagem[dono] = contagem.get(dono, 0) + 1

faltando = sorted(d for d in contagem if d not in POVO)
if faltando:
    raise SystemExit(f'poder sem povo: {faltando}')

poderes = []
for i, dono in enumerate(sorted(POVO)):
    if dono not in contagem:
        continue
    povo = POVO[dono]
    passo = (i * 7) % 5
    h = (MATIZ[povo] + (passo - 2) * 0.012) % 1.0
    s = 0.30 + (passo % 3) * 0.055
    v = 0.56 + (passo % 4) * 0.055
    r, g, b = colorsys.hsv_to_rgb(h, s, v)
    poderes.append({
        'id': dono,
        'nome': dono.replace('-', ' ').title(),
        'povo': povo,
        'cor': '#%02x%02x%02x' % (round(r * 255), round(g * 255), round(b * 255)),
    })

ids = [p[0] for p in P]
if len(set(ids)) != len(ids):
    raise SystemExit('id de província repetido')

saida = {
    'versao': 1,
    'epoca': '700 a.C.',
    'comentario': (
        'Sementes de provincia do mundo grego arcaico. Cada uma e um lugar REAL, em '
        'longitude e latitude de verdade: o gerador projeta o ponto e faz a provincia '
        'crescer dali ate encontrar a vizinha, custando caro pra subir serra. Nenhum '
        'ponto e sorteado, e mover uma fronteira e mover a semente.'
    ),
    'poderes': poderes,
    'provincias': [
        {
            'id': i, 'nome': n, 'regiao': r, 'lon': lo, 'lat': la, 'dono': d,
            **({'anexos': [{'lon': x, 'lat': y} for (x, y) in ANEXOS[i]]} if ANEXOS.get(i) else {}),
        }
        for (i, n, r, lo, la, d) in P
    ],
}
json.dump(saida, open('dados/provincias.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
open('dados/provincias.json', 'a', encoding='utf-8').write('\n')

desconhecidas = sorted(set(ANEXOS) - {x[0] for x in P})
if desconhecidas:
    raise SystemExit(f'anexo apontando pra provincia inexistente: {desconhecidas}')

print(f'{len(P)} provincias, {len(poderes)} poderes')
print(f'{sum(len(v) for v in ANEXOS.values())} ilhas anexadas em {len([v for v in ANEXOS.values() if v])} provincias')
maiores = sorted(contagem.items(), key=lambda kv: -kv[1])[:8]
print('maiores poderes:', maiores)
