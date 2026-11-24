// LoreForge Studio — World Bible & Homebrew Taxonomy View
import { t } from '../i18n';
import { appStore } from '../state/store';
import { h } from '../ui/dom';
import { icon } from '../ui/icons';
import { field, selectBox, textArea, textInput, openModal } from '../ui/widgets';
import type { HomebrewTab } from '../types/state';
import type { MagicSystemType, WorldRealismOptions } from '../types/world';

export function renderWorldView(): HTMLElement {
  const world = appStore.getActiveWorld();
  const state = appStore.getState();
  const activeTab: HomebrewTab = state.activeHomebrewTab || 'species';

  const container = h('div', { class: 'world-view', style: 'padding:24px; display:flex; flex-direction:column; gap:20px; overflow-y:auto; height:100%;' }, [
    h('div', { style: 'display:flex; justify-content:space-between; align-items:center;' }, [
      h('div', {}, [
        h('h1', { style: 'font-size:20px; font-weight:700; display:flex; align-items:center; gap:8px;' }, [
          icon('globe', 20),
          document.createTextNode(`${world.name} — Biblia & Reglas del Mundo`)
        ]),
        h('p', { class: 'text-muted text-sm', style: 'margin-top:4px;' }, [
          world.genre_tone || 'Configura leyes fundamentales, metafísica, especies, facciones y taxonomía homebrew.'
        ])
      ])
    ])
  ]);

  // World fundamental laws & metaphysics
  const lawsCard = h('div', { class: 'panel-card', style: 'background:var(--surface-elevated); padding:18px; border-radius:10px; border:1px solid var(--border-subtle); display:flex; flex-direction:column; gap:16px;' }, [
    h('h3', { style: 'font-size:15px; font-weight:600; display:flex; align-items:center; gap:8px;' }, [
      icon('book-open', 16),
      document.createTextNode('Leyes Fundamentales & Cosmovisión')
    ]),
    field('Tono / Género', textInput({
      value: world.genre_tone || 'Fantasía Oscura',
      onInput: (val: string) => {
        appStore.mutate((s) => {
          const w = s.worlds.find((x) => x.id === world.id);
          if (w) w.genre_tone = val;
        });
      }
    })),
    field('Reglas Inquebrantables del Mundo (Internal Laws)', textArea({
      value: Array.isArray(world.internal_laws) ? world.internal_laws.join('\n') : (world.internal_laws || ''),
      onInput: (val: string) => {
        appStore.mutate((s) => {
          const w = s.worlds.find((x) => x.id === world.id);
          if (w) w.internal_laws = val.split('\n').filter((l) => l.trim().length > 0);
        });
      },
      rows: 4,
      placeholder: 'Escribe una regla por línea. E.g.: "Los muertos vinculados por sangre no pueden mentir."'
    })),
    field('Metafísica, Magia o Sistemas y Límites', textArea({
      value: world.systems_and_limits || '',
      onInput: (val: string) => {
        appStore.mutate((s) => {
          const w = s.worlds.find((x) => x.id === world.id);
          if (w) w.systems_and_limits = val;
        });
      },
      rows: 3,
      placeholder: 'Descripción del coste o funcionamiento de la energía mística, tecnología o prodigio...'
    }))
  ]);

  container.appendChild(lawsCard);

  // Magic System (Hard / Soft / Hybrid) & World Realism Frictions
  const realismKeys: Array<keyof WorldRealismOptions> = [
    'economy_inflation',
    'travel_logistics',
    'crude_medicine',
    'borders_bureaucracy',
    'resource_ecology',
  ];

  const realismGrid = h('div', { style: 'display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:10px;' },
    realismKeys.map((rKey) => {
      const checked = Boolean(world.realism_options?.[rKey]);
      const cb = h('input', { type: 'checkbox', checked });
      cb.addEventListener('change', () => {
        appStore.mutate((s) => {
          const w = s.worlds.find((x) => x.id === world.id);
          if (!w) return;
          w.realism_options = { ...(w.realism_options || {}), [rKey]: cb.checked };
        });
      });
      return h('label', {
        style: 'display:flex; align-items:center; gap:8px; padding:8px 10px; border-radius:6px; background:var(--surface-sunken); border:1px solid var(--border-subtle); cursor:pointer; font-size:13px;'
      }, [cb, document.createTextNode(t(`realism.${rKey}`))]);
    })
  );

  const realismCard = h('div', { class: 'panel-card', style: 'background:var(--surface-elevated); padding:18px; border-radius:10px; border:1px solid var(--border-subtle); display:flex; flex-direction:column; gap:14px;' }, [
    h('h3', { style: 'font-size:15px; font-weight:600; display:flex; align-items:center; gap:8px;' }, [
      icon('sliders', 16),
      document.createTextNode(t('realism.sectionTitle'))
    ]),
    field(
      t('realism.magicTypeLabel'),
      selectBox(
        [
          { value: 'hard', label: t('realism.magicHard') },
          { value: 'soft', label: t('realism.magicSoft') },
          { value: 'hybrid', label: t('realism.magicHybrid') },
        ],
        world.magic_system_type || 'hard',
        (val: string) => {
          appStore.mutate((s) => {
            const w = s.worlds.find((x) => x.id === world.id);
            if (w) w.magic_system_type = val as MagicSystemType;
          });
        }
      )
    ),
    h('div', { style: 'display:flex; flex-direction:column; gap:8px;' }, [
      h('span', { class: 'text-muted text-xs', style: 'font-weight:600;' }, [t('realism.optionsLabel')]),
      realismGrid
    ])
  ]);

  container.appendChild(realismCard);

  // Modular Studio 1: Generic Magic System Builder (Levels I-VII + 4 Rules + Paths)
  const magicStudio = world.magic_studio || {};
  const magicToggle = h('input', { type: 'checkbox', checked: Boolean(magicStudio.enabled) });
  magicToggle.addEventListener('change', () => {
    appStore.mutate((s) => {
      const w = s.worlds.find((x) => x.id === world.id);
      if (!w) return;
      w.magic_studio = { ...(w.magic_studio || {}), enabled: magicToggle.checked };
    });
  });

  const magicStudioCard = h(
    'div',
    {
      class: 'panel-card',
      style:
        'background:var(--surface-elevated); padding:18px; border-radius:10px; border:1px solid var(--border-subtle); display:flex; flex-direction:column; gap:14px;',
    },
    [
      h('div', { style: 'display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;' }, [
        h('h3', { style: 'font-size:15px; font-weight:600; display:flex; align-items:center; gap:8px;' }, [
          icon('sparkles', 16),
          document.createTextNode('Laboratorio de Sistema Mágico (Niveles I–VII & 4 Reglas)'),
        ]),
        h(
          'label',
          {
            style:
              'display:flex; align-items:center; gap:8px; min-height:36px; padding:4px 10px; border-radius:6px; background:var(--surface-sunken); border:1px solid var(--border-subtle); font-size:12px; cursor:pointer;',
          },
          [magicToggle, document.createTextNode('Activar módulo en este mundo')]
        ),
      ]),
    ]
  );

  if (magicStudio.enabled) {
    const mutateMagic = (patch: Partial<typeof magicStudio>) => {
      appStore.mutate((s) => {
        const w = s.worlds.find((x) => x.id === world.id);
        if (!w) return;
        w.magic_studio = { ...(w.magic_studio || {}), ...patch };
      });
    };

    magicStudioCard.appendChild(
      field(
        'Nivel de Sistematización (Escala I–VII)',
        selectBox(
          [
            { value: 'I', label: 'Nivel I — Magia Ornamental (ambiental sin reglas)' },
            { value: 'II', label: 'Nivel II — Magia Blanda Simple (origen sin lógica fija)' },
            { value: 'III', label: 'Nivel III — Magia Blanda Compleja (límites míticos)' },
            { value: 'IV', label: 'Nivel IV — Blanda con Toques Duros (academias)' },
            { value: 'V', label: 'Nivel V — Dura no Sistematizada (precio claro)' },
            { value: 'VI', label: 'Nivel VI — Sistema Táctico (recursos y restricciones)' },
            { value: 'VI+III', label: 'Híbrido Nivel VI (Mortal) + Nivel III (Mítico/Divino)' },
            { value: 'VII', label: 'Nivel VII — Sistema Científico Integral' },
          ],
          magicStudio.hardness_level || 'VI+III',
          (v: string) => mutateMagic({ hardness_level: v as any })
        )
      )
    );

    const rulesGrid = h('div', { style: 'display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:12px;' }, [
      field(
        'Regla Constructiva (Lógica física/biológica madre)',
        textArea({
          value: magicStudio.constructive_rule || '',
          rows: 3,
          placeholder: 'Ej. Todo acto mágico convierte hierro, calcio y calor corporal en presión o temperatura.',
          onInput: (v: string) => mutateMagic({ constructive_rule: v }),
        })
      ),
      field(
        'Regla Categórica (Ramas o disciplinas opuestas)',
        textArea({
          value: magicStudio.categorical_rule || '',
          rows: 3,
          placeholder: 'Ej. Hechicería viva vs. Brujería fúnebre vs. Magitecnología industrial.',
          onInput: (v: string) => mutateMagic({ categorical_rule: v }),
        })
      ),
      field(
        'Regla Estática (Leyes universales inquebrantables)',
        textArea({
          value: magicStudio.static_rule || '',
          rows: 3,
          placeholder: 'Ej. Nadie crea materia de la nada ni resucita muertos.',
          onInput: (v: string) => mutateMagic({ static_rule: v }),
        })
      ),
      field(
        'Regla Vacía (Frontera del misterio sin explicar)',
        textArea({
          value: magicStudio.empty_rule || '',
          rows: 3,
          placeholder: 'Ej. Territorios míticos o deidades donde fallan las fórmulas humanas.',
          onInput: (v: string) => mutateMagic({ empty_rule: v }),
        })
      ),
    ]);
    magicStudioCard.appendChild(rulesGrid);

    const tactics = magicStudio.everyday_tactics || {};
    const tacticsGrid = h('div', { style: 'display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:12px;' }, [
      field(
        'Medir poder (cotidiano)',
        textArea({
          value: tactics.sense || '',
          rows: 2,
          placeholder: 'Olor a cobre, escarcha, dentera, secuelas físicas...',
          onInput: (v: string) => mutateMagic({ everyday_tactics: { ...tactics, sense: v } }),
        })
      ),
      field(
        'Defensa táctica',
        textArea({
          value: tactics.defend || '',
          rows: 2,
          placeholder: 'Descarga a tierra, aislantes, armaduras conductoras...',
          onInput: (v: string) => mutateMagic({ everyday_tactics: { ...tactics, defend: v } }),
        })
      ),
      field(
        'Escalada / Sacrificio',
        textArea({
          value: tactics.escalate || '',
          rows: 2,
          placeholder: 'Quema de vena, peaje de recuerdo, pactos de sangre...',
          onInput: (v: string) => mutateMagic({ everyday_tactics: { ...tactics, escalate: v } }),
        })
      ),
    ]);
    magicStudioCard.appendChild(tacticsGrid);

    const paths = magicStudio.paths || [];
    if (paths.length > 0) {
      magicStudioCard.appendChild(
        h('div', { style: 'display:flex; flex-direction:column; gap:8px;' }, [
          h('strong', { style: 'font-size:13px; color:var(--text-primary);' }, [
            `Caminos / Disciplinas (${paths.length})`,
          ]),
          h(
            'div',
            { style: 'display:grid; grid-template-columns:repeat(auto-fill, minmax(240px, 1fr)); gap:10px;' },
            paths.map((p) =>
              h(
                'div',
                {
                  style:
                    'background:var(--surface-sunken); padding:10px 12px; border-radius:8px; border:1px solid var(--border-subtle); display:flex; flex-direction:column; gap:4px;',
                },
                [
                  h('strong', { style: 'font-size:13px; color:var(--text-primary);' }, [
                    `${p.name}${p.nickname ? ` (${p.nickname})` : ''}`,
                  ]),
                  p.ancient_name
                    ? h('span', { class: 'text-muted text-xs' }, [`Raíz antigua: ${p.ancient_name}`])
                    : null,
                  h('p', { class: 'text-xs', style: 'line-height:1.4; color:var(--text-secondary);' }, [p.domain]),
                  h('span', { class: 'text-xs', style: 'color:var(--status-warning);' }, [`Coste: ${p.cost}`]),
                ]
              )
            )
          ),
        ])
      );
    }
  }
  container.appendChild(magicStudioCard);

  // Modular Studio 2: Generic Conlang & Phonology Lab (3-Step Phrase Assembler)
  const conlang = world.conlang_studio || {};
  const conlangToggle = h('input', { type: 'checkbox', checked: Boolean(conlang.enabled) });
  conlangToggle.addEventListener('change', () => {
    appStore.mutate((s) => {
      const w = s.worlds.find((x) => x.id === world.id);
      if (!w) return;
      w.conlang_studio = { ...(w.conlang_studio || {}), enabled: conlangToggle.checked };
    });
  });

  const conlangCard = h(
    'div',
    {
      class: 'panel-card',
      style:
        'background:var(--surface-elevated); padding:18px; border-radius:10px; border:1px solid var(--border-subtle); display:flex; flex-direction:column; gap:14px;',
    },
    [
      h('div', { style: 'display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;' }, [
        h('h3', { style: 'font-size:15px; font-weight:600; display:flex; align-items:center; gap:8px;' }, [
          icon('languages', 16),
          document.createTextNode(
            `Laboratorio de Conlang & Fonética${conlang.name ? ` — ${conlang.name}` : ''}`
          ),
        ]),
        h(
          'label',
          {
            style:
              'display:flex; align-items:center; gap:8px; min-height:36px; padding:4px 10px; border-radius:6px; background:var(--surface-sunken); border:1px solid var(--border-subtle); font-size:12px; cursor:pointer;',
          },
          [conlangToggle, document.createTextNode('Activar módulo en este mundo')]
        ),
      ]),
    ]
  );

  if (conlang.enabled) {
    const mutateConlang = (patch: Partial<typeof conlang>) => {
      appStore.mutate((s) => {
        const w = s.worlds.find((x) => x.id === world.id);
        if (!w) return;
        w.conlang_studio = { ...(w.conlang_studio || {}), ...patch };
      });
    };

    const conlangGrid = h('div', { style: 'display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:12px;' }, [
      field(
        'Nombre de la Lengua',
        textInput({
          value: conlang.name || '',
          placeholder: 'Ej. Ka\'rdan',
          onInput: (v: string) => mutateConlang({ name: v }),
        })
      ),
      field(
        'Familia Fonética / Identidad Sonora',
        textInput({
          value: conlang.sound_family || '',
          placeholder: 'Ej. Hitita/Sumerio + Celta antiguo',
          onInput: (v: string) => mutateConlang({ sound_family: v }),
        })
      ),
      field(
        'Orden Sintáctico',
        textInput({
          value: conlang.syntax_order || '',
          placeholder: 'Ej. VSO en conjuros / SOV en prosa',
          onInput: (v: string) => mutateConlang({ syntax_order: v }),
        })
      ),
      field(
        'Diacríticos y Acentuación',
        textInput({
          value: conlang.diacritics || '',
          placeholder: 'Ej. ê/î/û largas, ä abierta de pecho, apóstrofo glotal',
          onInput: (v: string) => mutateConlang({ diacritics: v }),
        })
      ),
      field(
        'Casos Nominales',
        textInput({
          value: conlang.cases || '',
          placeholder: 'Ej. -k (ergativo), -n (presa), -ar (de), -th (medio), -ur (en)',
          onInput: (v: string) => mutateConlang({ cases: v }),
        })
      ),
      field(
        'Conjugación Verbal',
        textInput({
          value: conlang.verb_modes || '',
          placeholder: 'Ej. -a (presente), -ik/-vik (imperativo), -ûr (eterno), -en (pasiva)',
          onInput: (v: string) => mutateConlang({ verb_modes: v }),
        })
      ),
    ]);
    conlangCard.appendChild(conlangGrid);

    // 3-Step Interactive Phrase / Spell Assembler
    const glossary = conlang.glossary || [];
    const nounRoots = glossary.filter((g) => g.category !== 'verbo');
    const verbRoots = glossary.filter((g) => g.category === 'verbo');

    if (nounRoots.length > 0 && verbRoots.length > 0) {
      let selRoot = nounRoots[0].root;
      let selCase = '-ur';
      let selVerb = verbRoots[0].root;
      let selMode = '-ik';
      const previewEl = h('code', {
        style:
          'font-family:var(--font-mono); font-size:14px; font-weight:700; color:var(--accent-primary); padding:8px 12px; border-radius:6px; background:var(--surface-base); border:1px solid var(--border-subtle); display:inline-block;',
      });

      const updateAssembler = () => {
        const cleanCase = selCase.replace('-', '');
        const cleanMode = selMode.replace('-', '');
        const rootObj = nounRoots.find((n) => n.root === selRoot);
        const verbObj = verbRoots.find((v) => v.root === selVerb);
        previewEl.textContent = `${selRoot}${cleanCase} ${selVerb}${cleanMode}!  (${rootObj?.gloss || selRoot} + ${verbObj?.gloss || selVerb})`;
      };
      updateAssembler();

      conlangCard.appendChild(
        h(
          'div',
          {
            style:
              'background:var(--surface-sunken); padding:14px; border-radius:8px; border:1px solid var(--border-subtle); display:flex; flex-direction:column; gap:10px;',
          },
          [
            h('strong', { style: 'font-size:13px; color:var(--text-primary);' }, [
              'Ensamblador Rápido de Conjuros / Frases (3 Pasos)',
            ]),
            h('div', { style: 'display:flex; flex-wrap:wrap; gap:8px; align-items:center;' }, [
              selectBox(
                nounRoots.map((n) => ({ value: n.root, label: `${n.root} (${n.gloss})` })),
                selRoot,
                (v: string) => {
                  selRoot = v;
                  updateAssembler();
                }
              ),
              selectBox(
                [
                  { value: '-ur', label: '-ur (en / dentro de)' },
                  { value: '-ar', label: '-ar (de / origen)' },
                  { value: '-th', label: '-th (mediante)' },
                  { value: '-n', label: '-n (presa / blanco)' },
                  { value: '-k', label: '-k (sangre activa)' },
                ],
                selCase,
                (v: string) => {
                  selCase = v;
                  updateAssembler();
                }
              ),
              selectBox(
                verbRoots.map((v) => ({ value: v.root, label: `${v.root} (${v.gloss})` })),
                selVerb,
                (v: string) => {
                  selVerb = v;
                  updateAssembler();
                }
              ),
              selectBox(
                [
                  { value: '-ik', label: '-ik (¡imperativo!)' },
                  { value: '-vik', label: '-vik (¡orden seca!)' },
                  { value: '-a', label: '-a (presente)' },
                  { value: '-ûr', label: '-ûr (pacto eterno)' },
                  { value: '-en', label: '-en (pasiva)' },
                ],
                selMode,
                (v: string) => {
                  selMode = v;
                  updateAssembler();
                }
              ),
            ]),
            previewEl,
          ]
        )
      );
    }

    const spells = conlang.spells || [];
    if (spells.length > 0) {
      conlangCard.appendChild(
        h('div', { style: 'display:flex; flex-direction:column; gap:8px;' }, [
          h('strong', { style: 'font-size:13px; color:var(--text-primary);' }, [
            'Conjuros, Ritos y Frases Oficiales',
          ]),
          ...spells.map((sp) =>
            h(
              'div',
              {
                style:
                  'background:var(--surface-sunken); padding:10px 12px; border-radius:8px; border:1px solid var(--border-subtle); display:flex; flex-direction:column; gap:4px;',
              },
              [
                h('strong', { style: 'font-size:12px; color:var(--text-primary);' }, [sp.title]),
                h('code', { style: 'font-family:var(--font-mono); font-size:12px; color:var(--accent-primary);' }, [
                  sp.text,
                ]),
                h('span', { class: 'text-muted text-xs' }, [sp.translation]),
              ]
            )
          ),
        ])
      );
    }
  }
  container.appendChild(conlangCard);

  // Homebrew Tabs: Species | Languages | Traits
  const homebrewSection = h('div', { class: 'panel-card', style: 'background:var(--surface-elevated); padding:18px; border-radius:10px; border:1px solid var(--border-subtle); display:flex; flex-direction:column; gap:16px;' }, [
    h('div', { style: 'display:flex; justify-content:space-between; align-items:center;' }, [
      h('h3', { style: 'font-size:15px; font-weight:600; display:flex; align-items:center; gap:8px;' }, [
        icon('layers', 16),
        document.createTextNode('Taxonomía Homebrew del Mundo')
      ]),
      h('div', { style: 'display:flex; gap:6px;' }, [
        createTabBtn('species', 'Especies / Razas', activeTab),
        createTabBtn('languages', 'Idiomas', activeTab),
        createTabBtn('traits', 'Rasgos & Facciones', activeTab)
      ])
    ]),
    renderHomebrewTabContent(activeTab, world)
  ]);

  container.appendChild(homebrewSection);
  return container;

  function createTabBtn(tab: HomebrewTab, label: string, current: HomebrewTab) {
    const isActive = tab === current;
    return h('button', {
      class: `btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`,
      onclick: () => {
        appStore.mutate((s) => {
          s.activeHomebrewTab = tab;
        });
      }
    }, [label]);
  }

  function renderHomebrewTabContent(tab: HomebrewTab, w: typeof world): HTMLElement {
    const tabContainer = h('div', { style: 'display:flex; flex-direction:column; gap:12px;' });

    let items: Array<{ id: string; name: string; desc?: string }> = [];

    if (tab === 'species') {
      items = (w.homebrew?.species || []).map((s) => ({ id: s.slug, name: s.label, desc: s.notes }));
    } else if (tab === 'traits') {
      items = (w.homebrew?.traits || []).map((t) => ({ id: t.slug, name: t.label, desc: t.category }));
    } else if (tab === 'languages') {
      items = (w.homebrew?.languages?.registered || []).map((l) => ({ id: l.slug, name: l.label, desc: l.custom ? 'Personalizado' : 'Estándar' }));
    }

    const header = h('div', { style: 'display:flex; justify-content:space-between; align-items:center;' }, [
      h('span', { class: 'text-muted text-xs' }, [`${items.length} elemento(s) registrados`]),
      h('button', {
        class: 'btn btn-secondary btn-sm',
        onclick: () => {
          openCreateHomebrewItemModal(tab);
        }
      }, [icon('plus', 14), document.createTextNode('Añadir')])
    ]);

    tabContainer.appendChild(header);

    if (items.length === 0) {
      tabContainer.appendChild(h('p', { class: 'text-muted text-sm' }, ['No hay elementos registrados en esta categoría.']));
      return tabContainer;
    }

    const itemsGrid = h('div', { style: 'display:grid; grid-template-columns:repeat(auto-fill, minmax(240px, 1fr)); gap:12px;' });

    items.forEach((item, idx) => {
      const card = h('div', {
        style: 'background:var(--surface-sunken); padding:12px; border-radius:8px; border:1px solid var(--border-subtle); display:flex; flex-direction:column; gap:4px;'
      }, [
        h('div', { style: 'display:flex; justify-content:space-between; align-items:center;' }, [
          h('strong', { style: 'font-size:13px; color:var(--text-primary);' }, [item.name]),
          h('button', {
            class: 'btn-icon-subtle',
            style: 'color:var(--status-danger); cursor:pointer; background:none; border:none;',
            onclick: () => {
              appStore.mutate((s) => {
                const targetWorld = s.worlds.find((x) => x.id === world.id);
                if (!targetWorld?.homebrew) return;
                if (tab === 'species') targetWorld.homebrew.species.splice(idx, 1);
                else if (tab === 'traits') targetWorld.homebrew.traits.splice(idx, 1);
                else if (tab === 'languages') targetWorld.homebrew.languages.registered.splice(idx, 1);
              });
            }
          }, [icon('trash-2', 14)])
        ]),
        item.desc ? h('p', { class: 'text-muted text-xs', style: 'line-height:1.4;' }, [item.desc]) : null
      ]);
      itemsGrid.appendChild(card);
    });

    tabContainer.appendChild(itemsGrid);
    return tabContainer;
  }

  function openCreateHomebrewItemModal(tab: HomebrewTab) {
    let name = '';
    let description = '';

    const content = h('div', { style: 'display:flex; flex-direction:column; gap:12px; padding:16px;' }, [
      h('label', { class: 'field-label' }, ['Nombre']),
      h('input', {
        class: 'input-text',
        placeholder: 'E.g. Humano de la Frontera, Lengua Antigua...',
        oninput: (e: any) => { name = e.target.value; }
      }),
      h('label', { class: 'field-label' }, ['Descripción / Notas']),
      h('textarea', {
        class: 'input-textarea',
        rows: 3,
        placeholder: 'Detalles culturales, fisiológicos o mecánicos...',
        oninput: (e: any) => { description = e.target.value; }
      }),
      h('div', { style: 'display:flex; justify-content:flex-end; gap:8px; margin-top:8px;' }, [
        h('button', {
          class: 'btn btn-primary',
          onclick: () => {
            if (!name.trim()) return;
            const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
            appStore.mutate((s) => {
              const targetWorld = s.worlds.find((x) => x.id === world.id);
              if (!targetWorld) return;
              if (tab === 'species') {
                targetWorld.homebrew.species.push({ slug, label: name.trim(), notes: description.trim() });
              } else if (tab === 'traits') {
                targetWorld.homebrew.traits.push({ slug, label: name.trim(), category: description.trim() || 'General' });
              } else if (tab === 'languages') {
                targetWorld.homebrew.languages.registered.push({ slug, label: name.trim(), custom: true });
              }
            });
            closeModal();
          }
        }, ['Guardar'])
      ])
    ]);

    const closeModal = openModal(`Añadir a ${tab === 'species' ? 'Especies' : tab === 'languages' ? 'Idiomas' : 'Rasgos'}`, content);
  }
}
