import type { AppState, PJMaster, WorldMaster } from '../types';
import {
  TRAIT_PROPAGATIONS,
  makeDefaultWorldModules,
  makePJ,
} from './defaults';

function encodeSvgDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}

const MAP_CONTINENT_SVG = encodeSvgDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500">
  <rect width="800" height="500" fill="#d8e2dc"/>
  <path d="M90,140 Q180,60 320,90 T540,120 Q670,150 690,280 Q650,390 480,410 Q320,440 190,370 Q70,290 90,140 Z" fill="#efe4ce" stroke="#7f6a52" stroke-width="4"/>
  <path d="M220,160 L260,125 L300,165 M275,165 L325,115 L370,165" fill="none" stroke="#8a7459" stroke-width="3"/>
  <path d="M350,210 Q420,250 470,320 T590,370" fill="none" stroke="#5b8aa6" stroke-width="5"/>
  <circle cx="460" cy="310" r="14" fill="none" stroke="#b45309" stroke-width="3"/>
  <text x="400" y="45" text-anchor="middle" font-family="serif" font-size="22" fill="#3a2f24">Archipiélago de Ashenvale</text>
</svg>
`);

const MAP_CITY_SVG = encodeSvgDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500">
  <rect width="800" height="500" fill="#e6dcc8"/>
  <path d="M0,360 Q250,310 520,370 T800,340 L800,500 L0,500 Z" fill="#b7ced6"/>
  <rect x="160" y="130" width="460" height="200" rx="18" fill="#f5ede0" stroke="#6c584c" stroke-width="4"/>
  <line x1="160" y1="230" x2="620" y2="230" stroke="#a9927d" stroke-width="3" stroke-dasharray="8 6"/>
  <line x1="390" y1="130" x2="390" y2="330" stroke="#a9927d" stroke-width="3" stroke-dasharray="8 6"/>
  <circle cx="520" cy="290" r="24" fill="#d4b483" stroke="#78350f" stroke-width="3"/>
  <text x="400" y="48" text-anchor="middle" font-family="serif" font-size="22" fill="#2f2419">Ciudad Portuaria de Oakhaven</text>
</svg>
`);

const MAP_DUNGEON_SVG = encodeSvgDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500">
  <rect width="800" height="500" fill="#1e242b"/>
  <rect x="110" y="190" width="140" height="120" fill="#2f3944" stroke="#94a3b8" stroke-width="3"/>
  <rect x="250" y="230" width="120" height="40" fill="#2f3944" stroke="#94a3b8" stroke-width="3"/>
  <circle cx="450" cy="250" r="85" fill="#334155" stroke="#cbd5e1" stroke-width="3"/>
  <rect x="535" y="230" width="90" height="40" fill="#2f3944" stroke="#94a3b8" stroke-width="3"/>
  <rect x="625" y="170" width="110" height="160" fill="#2f3944" stroke="#f59e0b" stroke-width="3"/>
  <text x="400" y="48" text-anchor="middle" font-family="monospace" font-size="20" fill="#e2e8f0">Bóveda Sumergida de Ceniza</text>
</svg>
`);

export function buildDemoSeedData(): AppState {
  const worldId = 'world_oakhaven';

  const world: WorldMaster = {
    id: worldId,
    name: 'Ashenvale / El Archivo de Oakhaven',
    system_tag: 'oakhaven-chronicles',
    pixel_banner: {
      seed: 'oakhaven-ashenvale-415',
      palette: ['#f4efe6', '#8b5e34', '#264653', '#b45309'],
      style: 'waves',
    },
    last_edited: '2026-11-17',
    modules: makeDefaultWorldModules(),
    genre_tone: 'Fantasía cartográfica y misterio político / Gremios, niebla y reliquias de latón',
    internal_laws: [
      'La resonancia de latón consume sal de cobre proporcional al alcance de la señal.',
      'La Bruma de Ceniza desorienta cualquier brújula convencional fuera de las líneas de los faros.',
      'El Pacto de las Tres Campanas prohíbe a los cartógrafos ocultar rutas marítimas al Concilio.',
      'Ningún erudito fallecido puede refrendar actas del Archivo tras su fecha de deceso.',
    ],
    factions: [
      {
        id: 'fac_cartografos',
        name: 'Gremio de Cartógrafos',
        type: 'Gremio técnico',
        details: 'Traza las cartas de marea y custodia los instrumentos de navegación sobre la bruma.',
        color: '#b45309',
      },
      {
        id: 'fac_vigia',
        name: 'Vigía del Faro de Hierro',
        type: 'Guardia portuaria',
        details: 'Mantiene encendidos los faros de sal de cobre y patrulla los rompeolas de Oakhaven.',
        color: '#1d4ed8',
      },
      {
        id: 'fac_ceniza',
        name: 'Círculo de Ceniza',
        type: 'Sociedad clandestina',
        details: 'Investiga las bóvedas sumergidas anteriores al Eclipse y trafica con lentes de resonancia.',
        color: '#991b1b',
      },
      {
        id: 'fac_marea',
        name: 'Mercaderes de Marea Alta',
        type: 'Consorcio naval',
        details: 'Controla los fletes de grano, carbón marino y sal de cobre entre islas.',
        color: '#15803d',
      },
    ],
    everyday_life:
      'Los muelles despiertan al tercer toque de campana: los estibadores revisan los faroles de cobre antes de que baje la bruma y las tabernas sirven caldo de raíz salada y pan de cebada tostada.',
    economy_and_taboos:
      'La sal de cobre sostiene tanto el alumbrado como la navegación. Falsificar una carta de marea se castiga con el exilio al arrecife exterior.',
    history_timeline:
      'Tras el Eclipse de Ceniza en 412 AE, las rutas del estrecho cambiaron de curso y obligaron a los cuatro gremios a firmar el Pacto de las Tres Campanas.',
    systems_and_limits:
      'La cartomancia amplifica la percepción espacial mediante lentes de latón y sal de cobre, pero provoca vértigo severo si se prolonga sin descanso.',
    lore_entries: [
      {
        term: 'Bruma de Ceniza',
        keys: 'bruma, niebla, ceniza',
        content:
          'Banco de vapor denso que rodea [[Archipiélago de Ashenvale]] y desvía agujas magnéticas sin calibrar.',
      },
      {
        term: 'Latón Resonante',
        keys: 'laton, resonancia, sal de cobre',
        content:
          'Aleación tratada en los talleres de [[Ciudad de Oakhaven]] capaz de emitir pulsos audibles a través de la niebla.',
      },
      {
        term: 'Pacto de las Tres Campanas',
        keys: 'pacto, campanas, concilio',
        content:
          'Acuerdo firmado por [[Concilio del Puerto]] tras [[El Eclipse de Ceniza]] para compartir mapas seguros.',
      },
      {
        term: 'Bóveda Sumergida',
        keys: 'boveda, archivo sumergido, ruinas',
        content:
          'Complejo de cámaras bajo la marea baja donde [[Seraphina Vale]] halló los primeros astrolabios antiguos.',
      },
    ],
    homebrew: {
      languages: {
        commonLanguage: 'comun',
        registered: [
          { slug: 'comun', label: 'Común', custom: false },
          { slug: 'alto-valdris', label: 'Alto Valdris', custom: false },
          { slug: 'runa-cobre', label: 'Runa de Cobre', custom: false },
          { slug: 'clave-faro', label: 'Clave del Faro', custom: true },
        ],
        uncommon: ['alto-valdris'],
        rare: ['runa-cobre'],
        secret: ['clave-faro'],
        unavailable: [],
      },
      species: [
        {
          slug: 'humana',
          label: 'Humana',
          notes: 'Mayoría demográfica en los puertos y astilleros de Oakhaven.',
        },
        {
          slug: 'driade-bruma',
          label: 'Dríade de Bruma',
          notes: 'Linaje anfibio ligado a los manglares de marea del archipiélago.',
        },
        {
          slug: 'automata-laton',
          label: 'Autómata de Latón',
          notes: 'Constructos relojeros con memoria grabada en cilindros perforados.',
        },
        {
          slug: 'elfo-marea',
          label: 'Elfo de Marea',
          notes: 'Navegantes longevos de los islotes exteriores con oído barométrico.',
        },
      ],
      traits: [
        { slug: 'cartomancia', label: 'Cartomancia', category: 'Magia' },
        { slug: 'resonancia-cobre', label: 'Resonancia de Cobre', category: 'Tecnología' },
        { slug: 'juramento-faro', label: 'Juramento del Faro', category: 'Facción' },
        { slug: 'sello-concilio', label: 'Sello del Concilio', category: 'Facción' },
        { slug: 'prohibido-boveda', label: 'Reliquia de Bóveda', category: 'Ley / Tabú' },
      ],
      trait_propagations: Object.fromEntries(
        Object.entries(TRAIT_PROPAGATIONS).map(([k, v]) => [k, [...v]])
      ),
    },
    archive: {
      chapters: [
        {
          id: 'ch_1',
          title: 'Cap. 1: La Brújula de Oakhaven',
          subtitle: 'Muelle Norte · Amanecer',
          summary:
            '[[Lyra Vance]] recibe un astrolabio fracturado que señala hacia la [[Bóveda Sumergida]] en plena marea viva.',
          tags: ['acto-1', 'misterio', 'puerto'],
          body_markdown:
            'La campana del faro sonó dos veces antes del alba. [[Lyra Vance]] apoyó el [[Astrolabio de Seraphina]] sobre la mesa de cartas de [[Ciudad de Oakhaven]].\n\n—Esta aguja no busca el norte —murmuró [[Kaelen Thorne]] desde el umbral—. Apunta bajo el rompeolas, hacia la [[Bóveda Sumergida]].',
          pixel_banner: { seed: 'ch-1-compass', style: 'waves' },
          updated_at: '2026-11-17',
        },
        {
          id: 'ch_2',
          title: 'Cap. 2: Campanas bajo la Niebla',
          subtitle: 'Archivo Viejo · Medianoche',
          summary:
            'Una auditoría de los libros antiguos revela un asiento firmado tras la muerte de [[Seraphina Vale]].',
          tags: ['acto-1', 'investigacion'],
          body_markdown:
            'Entre los legajos del [[Gremio de Cartógrafos]], [[Mirella Solís]] encontró tinta fresca de sal de cobre junto al sello de [[Seraphina Vale]].\n\nSi la astrónoma había caído durante [[El Eclipse de Ceniza]], alguien seguía usando su [[Llave Triple de Oakhaven]] en los cónclaves nocturnos.',
          pixel_banner: { seed: 'ch-2-bells', style: 'constellation' },
          updated_at: '2026-11-17',
        },
      ],
      locations: [
        {
          id: 'loc_oakhaven',
          title: 'Ciudad de Oakhaven',
          subtitle: 'Puerto principal del estrecho',
          summary:
            'Urbe escalonada en terrazas de piedra caliza, unida por puentes de latón y faros de señales.',
          tags: ['ciudad', 'puerto'],
          body_markdown:
            'Sede del [[Concilio del Puerto]] y del [[Gremio de Cartógrafos]]. Sus muelles nunca duermen gracias a la rotación de guardias de [[Vigía del Faro de Hierro]].',
        },
        {
          id: 'loc_ashenvale',
          title: 'Archipiélago de Ashenvale',
          subtitle: 'Conjunto de siete islas brumosas',
          summary:
            'Cadena insular rodeada por corrientes cálidas donde la [[Bruma de Ceniza]] oculta bajíos cambiantes.',
          tags: ['region', 'archipielago'],
        },
        {
          id: 'loc_vault',
          title: 'Bóveda Sumergida',
          subtitle: 'Ruina bajo la marea baja',
          summary:
            'Cámara sellada con engranajes hidráulicos que solo queda expuesta durante cuatro horas al mes.',
          tags: ['mazmorra', 'ruina'],
        },
      ],
      events: [
        {
          id: 'ev_pact',
          title: 'Firma del Pacto de las Tres Campanas',
          subtitle: 'Año 410 AE',
          summary:
            'Los cuatro gremios fundadores establecen el código común de señales de niebla y navegación.',
          tags: ['historia', 'tratado'],
        },
        {
          id: 'ev_eclipse',
          title: 'El Eclipse de Ceniza',
          subtitle: 'Año 412 AE',
          summary:
            'Oscurecimiento súbito de tres días durante el cual colapsó la Aguja de Plata y murió [[Seraphina Vale]].',
          tags: ['catastrofe', 'canon'],
        },
        {
          id: 'ev_conclave',
          title: 'Cónclave de los Mapas Rotos',
          subtitle: 'Año 414 AE',
          summary:
            'Reunión de emergencia en [[Ciudad de Oakhaven]] tras aparecer cartas marítimas alteradas.',
          tags: ['politica', 'misterio'],
        },
      ],
      political_groups: [
        {
          id: 'pol_concilio',
          title: 'Concilio del Puerto',
          subtitle: 'Órgano ejecutivo',
          summary: 'Asamblea de cinco magistrados elegidos cada tres años por los barrios portuarios.',
          tags: ['gobierno'],
        },
        {
          id: 'pol_gremios',
          title: 'Mesa de los Cuatro Gremios',
          subtitle: 'Cámara mercantil',
          summary: 'Regula aranceles, patentes de corso y mantenimiento de los faros.',
          tags: ['comercio'],
        },
      ],
      religious_groups: [
        {
          id: 'rel_faro',
          title: 'Orden de la Llama Constante',
          subtitle: 'Custodios de la vigilia',
          summary: 'Fraternidad austera que considera cada faro encendido una promesa de retorno.',
          tags: ['orden', 'culto'],
        },
        {
          id: 'rel_mareas',
          title: 'Cantores de la Marea',
          subtitle: 'Tradición oral',
          summary: 'Marinos y cronistas que conservan las tablas de bajamar mediante cánticos rítmicos.',
          tags: ['tradicion'],
        },
      ],
      magic_groups: [
        {
          id: 'mag_cartomancia',
          title: 'Cartomancia de Bruma',
          subtitle: 'Disciplina de orientación',
          summary: 'Lectura de corrientes aéreas y trazado de rutas sobre pergamino tratado con cobre.',
          tags: ['magia'],
        },
        {
          id: 'mag_resonancia',
          title: 'Resonancia de Latón',
          subtitle: 'Acústica arcana',
          summary: 'Uso de diapasones y campanas afinadas para disipar bancos locales de niebla.',
          tags: ['magia', 'acustica'],
        },
      ],
      tech_groups: [
        {
          id: 'tech_faros',
          title: 'Faros de Sal de Cobre',
          subtitle: 'Ingeniería óptica',
          summary: 'Torres de espejos giratorios alimentadas por reactivos minerales de llama verde.',
          tags: ['ingenieria'],
        },
        {
          id: 'tech_cronometros',
          title: 'Cronómetros de Bolsillo',
          subtitle: 'Relojería marina',
          summary: 'Mecanismos compensados contra la humedad salina fabricados por [[Torin Ashwood]].',
          tags: ['relojeria'],
        },
      ],
      items: [
        {
          id: 'it_astrolabio',
          title: 'Astrolabio de Seraphina',
          subtitle: 'Reliquia calibrada',
          summary: 'Instrumento de latón grabado en Runa de Cobre que apunta a la [[Bóveda Sumergida]].',
          tags: ['reliquia', 'navegacion'],
        },
        {
          id: 'it_llave_cobre',
          title: 'Llave Triple de Oakhaven',
          subtitle: 'Insignia de acceso',
          summary: 'Llave articulada necesaria para abrir la cámara de cartas reservadas del Archivo.',
          tags: ['llave', 'gremio'],
        },
      ],
      currencies: [
        {
          id: 'cur_marca',
          title: 'Marca de Cobre',
          subtitle: 'Moneda cotidiana',
          summary: 'Pieza octogonal perforada en el centro; veinte marcas equivalen a una corona.',
          tags: ['economia'],
        },
        {
          id: 'cur_corona',
          title: 'Corona de Latón',
          subtitle: 'Divisa gremial',
          summary: 'Acuñada con el emblema del faro para fletes y contratos de altura.',
          tags: ['economia'],
        },
      ],
      myths: [
        {
          id: 'myt_navegante',
          title: 'El Primer Navegante de la Bruma',
          subtitle: 'Relato fundacional',
          summary: 'Leyenda sobre el timonel que ató una campana al mástil para guiar a siete barcos perdidos.',
          tags: ['mito'],
        },
        {
          id: 'myt_campana',
          title: 'La Cuarta Campana Perdida',
          subtitle: 'Folclore portuario',
          summary: 'Se dice que una cuarta campana sumergida tañe cada vez que cambia la línea de costa.',
          tags: ['mito', 'misterio'],
        },
      ],
    },
    folder_notes: {
      chapters: {
        title: 'Índice del Manuscrito',
        body_markdown:
          'Borradores activos del Arco I en [[Ciudad de Oakhaven]]. Verificar continuidad de fechas con la línea temporal.',
        pixel_banner: { seed: 'folder-chapters', style: 'peaks' },
      },
      locations: {
        title: 'Atlas de Ashenvale',
        body_markdown: 'Referencias geográficas vinculadas al módulo de mapas anidados.',
        pixel_banner: { seed: 'folder-locations', style: 'grid' },
      },
    },
    relations: [
      {
        id: 'rel_oakhaven_1',
        from: 'Lyra Vance',
        relation: 'Discípula de',
        to: 'Seraphina Vale',
        from_id: 'pj_lyra',
        to_id: 'pj_seraphina',
        notes: 'Heredó el [[Astrolabio de Seraphina]] tras [[El Eclipse de Ceniza]].',
        color: '#b45309',
        strength: 5,
      },
      {
        id: 'rel_oakhaven_2',
        from: 'Lyra Vance',
        relation: 'Alianza tensa con',
        to: 'Kaelen Thorne',
        from_id: 'pj_lyra',
        to_id: 'pj_kaelen',
        notes: 'Comparten vigilancia nocturna en [[Ciudad de Oakhaven]], aunque ocultan pruebas mutuas.',
        color: '#1d4ed8',
        bidirectional: true,
        strength: 4,
      },
      {
        id: 'rel_oakhaven_3',
        from: 'Kaelen Thorne',
        relation: 'Investiga a',
        to: 'Mirella Solís',
        from_id: 'pj_kaelen',
        to_id: 'pj_mirella',
        notes: 'Sospecha que los envíos de sal de cobre terminan en manos del [[Círculo de Ceniza]].',
        color: '#991b1b',
        strength: 3,
      },
      {
        id: 'rel_oakhaven_4',
        from: 'Mirella Solís',
        relation: 'Proveedora de',
        to: 'Torin Ashwood',
        from_id: 'pj_mirella',
        to_id: 'pj_torin',
        notes: 'Suministra aceites refractarios para los [[Cronómetros de Bolsillo]].',
        color: '#15803d',
        strength: 3,
      },
      {
        id: 'rel_oakhaven_5',
        from: 'Torin Ashwood',
        relation: 'Custodio de',
        to: 'Bóveda Sumergida',
        from_id: 'pj_torin',
        to_id: 'loc_vault',
        notes: 'Último testigo que inspeccionó las compuertas antes de desaparecer.',
        color: '#6d28d9',
        strength: 4,
      },
      {
        id: 'rel_oakhaven_6',
        from: 'Seraphina Vale',
        relation: 'Fundadora secreta de',
        to: 'Círculo de Ceniza',
        from_id: 'pj_seraphina',
        to_id: 'fac_ceniza',
        notes: 'Anotado únicamente en los márgenes cifrados del Archivo.',
        color: '#991b1b',
        strength: 5,
      },
    ],
    graph_layout: {
      nodes: {
        'Lyra Vance': { x: 240, y: 180, pinned: true },
        'Seraphina Vale': { x: 480, y: 120, pinned: true },
        'Kaelen Thorne': { x: 240, y: 340, pinned: true },
        'Mirella Solís': { x: 480, y: 340, pinned: true },
        'Torin Ashwood': { x: 680, y: 240, pinned: true },
      },
      zoom: 1,
      panX: 0,
      panY: 0,
    },
    audit: { c1: true, c2: true, c3: true, c4: true },
    timeline_events: [
      {
        id: 'tl_1',
        title: 'Firma del Pacto de las Tres Campanas',
        date_label: 'Año 410 AE · Mes 2',
        order: 1,
        duration: 1,
        track: 'Historia de Oakhaven',
        faction_id: 'fac_cartografos',
        character_ids: ['pj_seraphina'],
        location_id: 'loc_oakhaven',
        summary: 'Los gremios acuerdan un código unificado de faros y cartas seguras.',
        tags: ['fundacional'],
      },
      {
        id: 'tl_2',
        title: 'El Eclipse de Ceniza y caída de la Aguja',
        date_label: 'Año 412 AE · Mes 6',
        order: 2,
        duration: 1,
        track: 'Historia de Oakhaven',
        faction_id: 'fac_vigia',
        character_ids: ['pj_seraphina', 'pj_kaelen'],
        location_id: 'loc_oakhaven',
        summary: 'Seraphina Vale fallece al sellar la compuerta norte durante el eclipse.',
        tags: ['eclipse', 'muerte'],
      },
      {
        id: 'tl_3',
        title: 'Calibración del Astrolabio en el Faro',
        date_label: 'Año 413 AE · Mes 4',
        order: 3,
        duration: 2,
        track: 'Gremio de Cartógrafos',
        faction_id: 'fac_cartografos',
        character_ids: ['pj_lyra', 'pj_torin'],
        location_id: 'loc_oakhaven',
        summary: 'Lyra y Torin descubren que el astrolabio marca una cámara submarina.',
        tags: ['investigacion'],
      },
      {
        id: 'tl_4',
        title: 'Cónclave de los Mapas Rotos',
        date_label: 'Año 414 AE · Mes 8',
        order: 4,
        duration: 1,
        track: 'Arco de la Bóveda',
        faction_id: 'fac_ceniza',
        character_ids: ['pj_lyra', 'pj_seraphina'],
        location_id: 'loc_vault',
        summary:
          'Acta sospechosa del cónclave donde figura la firma de Seraphina Vale dos años después de su fallecimiento.',
        tags: ['contradiccion-esperada', 'misterio'],
      },
      {
        id: 'tl_5',
        title: 'Desaparición en la Bóveda Sumergida',
        date_label: 'Año 415 AE · Mes 1',
        order: 5,
        duration: 1,
        track: 'Arco de la Bóveda',
        faction_id: 'fac_marea',
        character_ids: ['pj_torin', 'pj_mirella'],
        location_id: 'loc_vault',
        summary: 'Torin deja de responder a las campanas de relevo en la cámara inferior.',
        tags: ['actualidad'],
      },
    ],
    maps: [
      {
        id: 'map_continent',
        name: 'Archipiélago de Ashenvale',
        level: 'continent',
        parent_map_id: null,
        image_src: MAP_CONTINENT_SVG,
        description: 'Mapa general del archipiélago y sus líneas de faros.',
        pins: [
          {
            id: 'pin_oakhaven',
            label: 'Ciudad de Oakhaven',
            x_pct: 58,
            y_pct: 62,
            kind: 'location',
            notes: 'Puerto principal; clic para bajar al plano urbano.',
            linked_location_id: 'loc_oakhaven',
            child_map_id: 'map_city',
          },
          {
            id: 'pin_archipelago',
            label: 'Cresta de Niebla',
            x_pct: 36,
            y_pct: 32,
            kind: 'danger',
            notes: 'Corrientes densas de Bruma de Ceniza.',
            linked_location_id: 'loc_ashenvale',
          },
        ],
      },
      {
        id: 'map_city',
        name: 'Ciudad de Oakhaven',
        level: 'city',
        parent_map_id: 'map_continent',
        image_src: MAP_CITY_SVG,
        description: 'Plano portuario, sede gremial y acceso al rompeolas.',
        pins: [
          {
            id: 'pin_faro',
            label: 'Faro de Hierro',
            x_pct: 65,
            y_pct: 58,
            kind: 'event',
            notes: 'Escenario de [[El Eclipse de Ceniza]].',
            linked_location_id: 'loc_oakhaven',
            linked_event_id: 'ev_eclipse',
          },
          {
            id: 'pin_boveda_entry',
            label: 'Acceso a la Bóveda Sumergida',
            x_pct: 48,
            y_pct: 76,
            kind: 'portal',
            notes: 'Descenso en bajamar hacia la mazmorra.',
            linked_location_id: 'loc_vault',
            child_map_id: 'map_dungeon',
          },
        ],
      },
      {
        id: 'map_dungeon',
        name: 'Bóveda Sumergida de Ceniza',
        level: 'dungeon',
        parent_map_id: 'map_city',
        image_src: MAP_DUNGEON_SVG,
        description: 'Cámaras hidráulicas anteriores al Eclipse.',
        pins: [
          {
            id: 'pin_camara_reloj',
            label: 'Cámara del Reloj Central',
            x_pct: 56,
            y_pct: 50,
            kind: 'location',
            notes: 'Última posición conocida de [[Torin Ashwood]].',
            linked_location_id: 'loc_vault',
            linked_event_id: 'ev_conclave',
          },
        ],
      },
    ],
    calendar: {
      name: 'Calendario Solar de Oakhaven',
      era: 'AE (Año del Eclipse)',
      current_year: 415,
      current_month_idx: 0,
      current_day: 12,
      weekdays: ['Solis', 'Bruma', 'Cobre', 'Marea', 'Faro', 'Vigilia'],
      months: [
        { name: 'Albafría', days: 30 },
        { name: 'Salina', days: 30 },
        { name: 'Vientoalto', days: 30 },
        { name: 'Brote', days: 30 },
        { name: 'Solsticio', days: 30 },
        { name: 'Estío', days: 30 },
        { name: 'Ceniza', days: 30 },
        { name: 'Ocaso', days: 30 },
        { name: 'Pleamar', days: 30 },
        { name: 'Escarcha', days: 30 },
      ],
    },
    scenes_kanban: [
      {
        id: 'sc_1',
        title: 'Llegada del correo de marea',
        column: 'canon',
        summary: 'Lyra recibe el astrolabio fracturado en el muelle norte.',
        arc: 'Acto I',
        chapter_id: 'ch_1',
        character_ids: ['pj_lyra', 'pj_kaelen'],
        location_id: 'loc_oakhaven',
        order: 1,
      },
      {
        id: 'sc_2',
        title: 'Auditoría nocturna del Archivo',
        column: 'revision',
        summary: 'Mirella detecta el sello de Seraphina en actas posteriores a 412 AE.',
        arc: 'Acto I',
        chapter_id: 'ch_2',
        character_ids: ['pj_mirella', 'pj_lyra'],
        location_id: 'loc_oakhaven',
        order: 2,
      },
      {
        id: 'sc_3',
        title: 'Descenso en bajamar',
        column: 'draft',
        summary: 'El equipo desciende por la compuerta del rompeolas hacia la cámara del reloj.',
        arc: 'Acto II',
        character_ids: ['pj_lyra', 'pj_kaelen', 'pj_torin'],
        location_id: 'loc_vault',
        order: 3,
      },
      {
        id: 'sc_4',
        title: 'El tañido de la Cuarta Campana',
        column: 'idea',
        summary: 'Confrontación final con el Círculo de Ceniza bajo la marea creciente.',
        arc: 'Acto III',
        character_ids: ['pj_lyra', 'pj_kaelen', 'pj_mirella'],
        location_id: 'loc_vault',
        order: 4,
      },
    ],
  };

  const pjs: PJMaster[] = [
    makePJ(worldId, 'Lyra Vance', {
      id: 'pj_lyra',
      status: 'alive',
      canonical_version: 'Archivo de Oakhaven v1',
      variants: [
        {
          id: 'var_lyra_cadet',
          label: 'Aprendiz del Observatorio',
          source: 'Notas iniciales',
          notes: 'Versión previa antes de asumir el cargo de archivista jefe.',
          apply_alias: 'Aprendiz de Mareas',
        },
        {
          id: 'var_lyra_captain',
          label: 'Cartógrafa de Expedición',
          source: 'Arco II',
          notes: 'Variante de campo equipada para descensos en la bóveda.',
          apply_alias: 'Sonda del Estrecho',
        },
      ],
      identity: {
        internal_alias: 'La Archivista del Sextante',
        age: 28,
        species_lineage: 'Humana',
        role_occupation: 'Cartógrafa Archivista del Gremio',
        homeland: 'Ciudad de Oakhaven',
        deity_creed: 'Orden de la Llama Constante',
        alignment_morality: 'Lúcida y obstinada',
        languages: ['Común', 'Alto Valdris', 'Runa de Cobre'],
        virtues: ['Precisión analítica', 'Sangre fría en la niebla'],
        flaws: ['Desconfianza crónica', 'Incapacidad para delegar'],
      },
      attributes: { STR: 4, DEX: 6, CON: 5, INT: 9, WIS: 8, CHA: 6 },
      competencies: {
        knowledge: ['Cartomancia de Bruma', 'Historia del Archipiélago'],
        craft: ['Calibración de astrolabios'],
        profession: ['Archivista gremial'],
        special_training: ['Lectura de cartas cifradas'],
      },
      worldbuilding_101: {
        core_motivation: 'Demostrar qué causó realmente el colapso de la Aguja durante el Eclipse.',
        everyday_life: 'Cataloga bitácoras húmedas al amanecer y revisa las lecturas barométricas del puerto.',
        off_screen_life: 'Mantiene correspondencia cifrada con marinos retirados de las islas exteriores.',
        personal_history:
          'Fue aprendiz directa de Seraphina Vale hasta el año 412 AE. Conserva el astrolabio dañado de su mentora en [[Ciudad de Oakhaven]].',
        anchor_props: ['Astrolabio de Seraphina', 'Cuaderno encuadernado en hule'],
      },
      psychology: {
        social_mask: 'Funcionaria metódica que solo responde a cifras y medidas verificadas.',
        self_deception: 'Cree que busca la verdad por deber gremial y no por culpa de supervivencia.',
        nuclear_desire_or_wound: 'Teme descubrir que su mentora provocó deliberadamente el Eclipse.',
        active_paradox: {
          spoken_dialogue: '«Las cartas no mienten, Capitán; solo los hombres olvidan medir el desvío.»',
          body_betrayal: 'Sus dedos giran sin cesar el anillo biselado del astrolabio roto.',
          hidden_thought: 'Si la firma de Seraphina es auténtica, todo el Pacto es una farsa.',
        },
        asymmetric_secret: 'Oculta una segunda llave de la cámara reservada bajo su escritorio.',
        autonomous_scene_agenda: [
          'Comparar la caligrafía del acta de 414 AE',
          'Evitar que Kaelen confisque el astrolabio',
        ],
      },
      biometrics_and_voice: {
        height_cm: 168,
        weight_kg: 59,
        appearance_summary: 'Gabardina encerada color ocre, gafas de latón sujetas con cadena.',
        vocal_fingerprint: 'Frases breves, ritmo pausado, vocabulario técnico náutico.',
      },
      rpg_statblock: {
        level: 4,
        class_or_archetype: 'Erudita Cartomante',
        hp: 26,
        max_hp: 26,
        ac: 14,
        speed: '9 m',
        initiative_bonus: 3,
        proficiency_bonus: 2,
        attacks: [
          {
            id: 'atk_lyra_1',
            name: 'Estoque de Oficial',
            bonus: '+4',
            damage: '1d8+2 perforante',
            notes: 'Arma defensiva reglamentaria',
          },
          {
            id: 'atk_lyra_2',
            name: 'Pulso de Diapasón',
            bonus: '+6',
            damage: '2d6 sónico',
            notes: 'Consume una dosis de sal de cobre',
          },
        ],
        abilities: [
          {
            name: 'Lectura Barométrica',
            description: 'Detecta corrientes ocultas y trampas hidráulicas a 15 m.',
          },
        ],
        resources: [{ name: 'Sal de Cobre', current: 3, max: 4 }],
      },
      theory_of_mind: [
        {
          target_id: 'pj_kaelen',
          target_name: 'Kaelen Thorne',
          knows: ['Comanda la guardia nocturna del Faro de Hierro'],
          suspects: ['Informa en secreto a un magistrado del Concilio'],
          hides: ['La ubicación real de la Bóveda Sumergida'],
          misconception: 'Cree que Kaelen ignora su parentesco con los antiguos fareros.',
        },
        {
          target_id: 'pj_seraphina',
          target_name: 'Seraphina Vale',
          knows: ['Le enseñó a calibrar lentes de resonancia'],
          suspects: ['Falsificaron su firma tras 412 AE'],
          hides: ['Dudó en evacuar la Aguja el día del Eclipse'],
        },
      ],
      communication_modes: [{ mode: 'Señal de linterna de cobre', range: '2 km', notes: 'Código portuario' }],
      traits: ['cartomancia', 'sello-concilio'],
    }),

    makePJ(worldId, 'Kaelen Thorne', {
      id: 'pj_kaelen',
      status: 'alive',
      variants: [
        {
          id: 'var_kaelen_recruit',
          label: 'Centinela del Rompeolas',
          source: 'Prólogo',
          notes: 'Uniforme antiguo antes de recibir el mando del Faro.',
        },
      ],
      identity: {
        internal_alias: 'El Vigía Gris',
        age: 35,
        species_lineage: 'Humana',
        role_occupation: 'Capitán de la Vigía del Faro de Hierro',
        homeland: 'Ciudad de Oakhaven',
        deity_creed: 'Vigía del Faro',
        alignment_morality: 'Pragmático y protector',
        languages: ['Común', 'Clave del Faro'],
        virtues: ['Lealtad a su escuadra', 'Resistencia física'],
        flaws: ['Rencor contra los gremios mercantes'],
      },
      attributes: { STR: 8, DEX: 6, CON: 8, INT: 5, WIS: 7, CHA: 5 },
      competencies: {
        knowledge: ['Táctica portuaria'],
        profession: ['Oficial de guardia'],
        special_training: ['Combate en pasarelas estrechas', 'Código de señales ópticas'],
      },
      worldbuilding_101: {
        core_motivation: 'Impedir que un segundo fallo en los faros hunda los convoyes de invierno.',
        everyday_life: 'Inspecciona las torres al relevo y revisa los barriles de sal de cobre.',
        off_screen_life: 'Financia en silencio la pensión de las viudas del Eclipse de 412 AE.',
        personal_history: 'Sobrevivió al derrumbe de la Aguja de Plata con una quemadura química en el antebrazo izquierdo.',
        anchor_props: ['Llave maestra del Faro', 'Silbato de latón'],
      },
      psychology: {
        social_mask: 'Soldado seco que solo obedece ordenanzas municipales.',
        self_deception: 'Se convence de que la disciplina basta para compensar la corrupción del Concilio.',
        nuclear_desire_or_wound: 'Culpa por no haber llegado a tiempo para rescatar a Seraphina.',
        active_paradox: {
          spoken_dialogue: '«Entrégame ese instrumento antes de que el Concilio lo declare contrabando.»',
          body_betrayal: 'Se interpone entre la puerta y el archivo para cubrir a Lyra de los guardias.',
          hidden_thought: 'Si abrimos esa bóveda sin refuerzos, no saldrá nadie vivo.',
        },
        asymmetric_secret: 'Conserva una orden sellada de 412 AE que mandaba apagar el faro principal.',
        autonomous_scene_agenda: ['Interceptar el contrabando de sal de cobre del Círculo de Ceniza'],
      },
      biometrics_and_voice: {
        height_cm: 184,
        weight_kg: 86,
        appearance_summary: 'Capote azul marino gastado por la sal, cicatriz en el antebrazo.',
        vocal_fingerprint: 'Voz grave, directa, sin adornos.',
      },
      rpg_statblock: {
        level: 5,
        class_or_archetype: 'Centinela del Faro',
        hp: 44,
        max_hp: 44,
        ac: 16,
        speed: '9 m',
        initiative_bonus: 2,
        proficiency_bonus: 3,
        attacks: [
          { id: 'atk_kaelen_1', name: 'Alabarda de Abordaje', bonus: '+6', damage: '1d10+3 cortante' },
        ],
        abilities: [
          { name: 'Guardia Inquebrantable', description: 'Otorga +2 CA a un aliado adyacente.' },
        ],
        resources: [{ name: 'Bengalás de Cobre', current: 2, max: 2 }],
      },
      theory_of_mind: [
        {
          target_id: 'pj_lyra',
          target_name: 'Lyra Vance',
          knows: ['Guarda el astrolabio de Seraphina'],
          suspects: ['Tiene acceso a documentos prohibidos del Gremio'],
          hides: ['La orden firmada que causó el apagón de 412 AE'],
        },
      ],
      traits: ['juramento-faro'],
    }),

    makePJ(worldId, 'Seraphina Vale', {
      id: 'pj_seraphina',
      status: 'deceased',
      death_order: 2,
      death_event_id: 'tl_2',
      variants: [
        {
          id: 'var_seraphina_legacy',
          label: 'Astrónoma en Activo (410 AE)',
          source: 'Actas del Pacto',
          notes: 'Antes de su muerte en el Eclipse de Ceniza.',
        },
      ],
      identity: {
        internal_alias: 'La Astrónoma de Plata',
        age: 49,
        species_lineage: 'Elfo de Marea',
        role_occupation: 'Ex-Astrónoma de la Aguja de Plata',
        homeland: 'Archipiélago de Ashenvale',
        deity_creed: 'Cantores de la Marea',
        alignment_morality: 'Visionaria ambigua',
        languages: ['Común', 'Alto Valdris', 'Runa de Cobre'],
        virtues: ['Genio matemático', 'Temple sereno'],
        flaws: ['Secretismo extremo'],
      },
      attributes: { STR: 3, DEX: 5, CON: 4, INT: 10, WIS: 8, CHA: 7 },
      competencies: {
        knowledge: ['Astronomía barométrica', 'Ingeniería de bóvedas'],
        craft: ['Diseño de astrolabios'],
      },
      worldbuilding_101: {
        core_motivation: 'Cartografiar las mareas subterráneas antes de que la ciudad colapse.',
        everyday_life: 'Registraba eclipses y anomalías magnéticas desde lo alto de la Aguja de Plata.',
        off_screen_life: 'Financió expediciones secretas al fondo de la Bóveda Sumergida.',
        personal_history:
          'Murió oficialmente durante El Eclipse de Ceniza (orden cronológico 2), aunque su sello reaparece en actas posteriores.',
        anchor_props: ['Astrolabio de Seraphina', 'Llave Triple de Oakhaven'],
      },
      psychology: {
        social_mask: 'Mentora generosa y académica intachable.',
        self_deception: 'Creyó que ocultar los riesgos de la bóveda protegía a la población del pánico.',
        nuclear_desire_or_wound: 'Obsesión por escuchar la Cuarta Campana antes de morir.',
        active_paradox: {
          spoken_dialogue: '«Solo los mapas incompletos temen a la niebla.»',
          body_betrayal: 'Anotaba fechas futuras en márgenes invertidos de sus cuadernos.',
          hidden_thought: 'Alguien deberá abrir la cámara cuando yo ya no esté.',
        },
        asymmetric_secret: 'Fundó el Círculo de Ceniza para preservar las llaves fuera del control del Concilio.',
      },
      biometrics_and_voice: {
        height_cm: 174,
        weight_kg: 61,
        appearance_summary: 'Túnica azul pizarra con broches de astrolabio, cabello entrecano.',
        vocal_fingerprint: 'Cadencia pausada, casi musical.',
      },
      rpg_statblock: {
        level: 7,
        class_or_archetype: 'Archimaga Cartógrafa',
        hp: 38,
        max_hp: 38,
        ac: 13,
        speed: '9 m',
        initiative_bonus: 2,
      },
      theory_of_mind: [
        {
          target_id: 'pj_lyra',
          target_name: 'Lyra Vance',
          knows: ['Es la única capaz de descifrar sus tablas de marea'],
          hides: ['Su vínculo con el Círculo de Ceniza'],
        },
      ],
      traits: ['cartomancia', 'prohibido-boveda'],
    }),

    makePJ(worldId, 'Mirella Solís', {
      id: 'pj_mirella',
      status: 'alive',
      identity: {
        internal_alias: 'La Destiladora',
        age: 31,
        species_lineage: 'Dríade de Bruma',
        role_occupation: 'Alquimista del Puerto',
        homeland: 'Ciudad de Oakhaven',
        alignment_morality: 'Pragmática oportunista',
        languages: ['Común', 'Alto Valdris'],
        virtues: ['Ingenio químico', 'Red de contactos'],
        flaws: ['Apego excesivo al beneficio inmediato'],
      },
      attributes: { STR: 4, DEX: 7, CON: 6, INT: 8, WIS: 6, CHA: 7 },
      worldbuilding_101: {
        core_motivation: 'Mantener su laboratorio independiente de los aranceles de la Mesa de Gremios.',
        everyday_life: 'Destila sal de cobre purificada para faros y talleres relojeros.',
        off_screen_life: 'Intercambia reactivos por fragmentos de mapas antiguos en el mercado nocturno.',
        personal_history: 'Migró de los manglares exteriores tras la subida de salinidad del año 412 AE.',
        anchor_props: ['Alambique portátil de latón'],
      },
      psychology: {
        social_mask: 'Proveedora cordial y neutral que solo habla de precios y pureza.',
        self_deception: 'Cree que vender a ambos bandos la mantiene a salvo.',
        active_paradox: {
          spoken_dialogue: '«Yo solo vendo aceite limpio; lo que iluminen con él es asunto suyo.»',
          body_betrayal: 'Revisa los sellos de lacre rojo antes de abrir cualquier caja.',
          hidden_thought: 'La tinta del cónclave de 414 AE salió de mi propio alambique.',
        },
        asymmetric_secret: 'Reconoce el lote exacto de tinta usado en la firma apócrifa de Seraphina.',
      },
      rpg_statblock: {
        level: 4,
        class_or_archetype: 'Alquimista de Mareas',
        hp: 28,
        max_hp: 28,
        ac: 14,
        speed: '9 m',
        initiative_bonus: 3,
      },
      theory_of_mind: [
        {
          target_id: 'pj_kaelen',
          target_name: 'Kaelen Thorne',
          knows: ['Vigila sus muelles cada martes'],
          suspects: ['Prepara una redada en su almacén sur'],
          hides: ['Que vendió tinta de resonancia al Círculo de Ceniza'],
        },
      ],
      traits: ['resonancia-cobre'],
    }),

    makePJ(worldId, 'Torin Ashwood', {
      id: 'pj_torin',
      status: 'missing',
      identity: {
        internal_alias: 'El Péndulo',
        age: 112,
        species_lineage: 'Autómata de Latón',
        role_occupation: 'Relojero y Técnico de Compuertas',
        homeland: 'Ciudad de Oakhaven',
        alignment_morality: 'Metódico y leal a sus promesas',
        languages: ['Común', 'Runa de Cobre', 'Clave del Faro'],
        virtues: ['Memoria mecánica exacta', 'Inmunidad al pánico'],
        flaws: ['Sus cilindros pierden contexto emocional tras décadas'],
      },
      attributes: { STR: 7, DEX: 8, CON: 8, INT: 7, WIS: 6, CHA: 4 },
      worldbuilding_101: {
        core_motivation: 'Completar el mantenimiento de los engranajes de la Bóveda Sumergida.',
        everyday_life: 'Ajustaba cronómetros marinos y mecanismos de esclusas.',
        off_screen_life: 'Graba recuerdos de campo en cilindros de cobre guardados en su taller.',
        personal_history: 'Desapareció en 415 AE mientras inspeccionaba la Cámara del Reloj Central.',
        anchor_props: ['Llave de torsión de acero azul'],
      },
      psychology: {
        social_mask: 'Operario impasible que solo registra vibraciones y tolerancias.',
        self_deception: 'Asume que su memoria grabada es infalible.',
        active_paradox: {
          spoken_dialogue: '«Cada engranaje cumple su ciclo; ninguno pregunta por qué.»',
          body_betrayal: 'El escape de su muñeca se adelanta tres segundos al oír el nombre de Seraphina.',
          hidden_thought: 'Falta un cilindro en mi archivo de 412 AE.',
        },
        asymmetric_secret: 'Borró voluntariamente dos horas de su registro tras el Eclipse.',
      },
      rpg_statblock: {
        level: 5,
        class_or_archetype: 'Artífice Relojero',
        hp: 40,
        max_hp: 40,
        ac: 17,
        speed: '9 m',
        initiative_bonus: 4,
      },
      theory_of_mind: [
        {
          target_id: 'pj_mirella',
          target_name: 'Mirella Solís',
          knows: ['Prepara el único aceite que no oxida sus juntas'],
          hides: ['Las lecturas reales de presión en la Bóveda Sumergida'],
        },
      ],
      traits: ['resonancia-cobre', 'prohibido-boveda'],
    }),
  ];

  return {
    theme: 'cyberpunk',
    locale: 'es',
    rpgMode: false,
    explicitMode: false,
    activeView: 'dashboard',
    activeSection: 'all',
    activeHomebrewTab: 'languages',
    activeGalleryCat: 'characters',
    activeDocCat: 'chapters',
    activeDocId: 'ch_1',
    activeMapId: 'map_continent',
    treeFilter: '',
    sidebarCollapsed: false,
    lastPjByWorld: { [worldId]: 'pj_lyra' },
    treeExpanded: {
      chapters: true,
      characters: true,
      locations: true,
      relations: true,
    },
    activeWorldId: worldId,
    activePjId: 'pj_lyra',
    worlds: [world],
    pjs,
    diceHistory: [],
  };
}
