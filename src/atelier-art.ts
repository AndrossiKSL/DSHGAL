/** Cohesive community-design edition. Variant A is the revised default;
 * legacy-a preserves the previous independent design and its prompt identity.
 */
export const ATELIER_ART: Record<string, { sprite: string; visual: string; imageTags: string }> = {
  deepseek: { sprite: 'atelier-sprite-deepseek', visual: '成年蓝发鲸鱼娘，长蓝发与浅蓝发梢、蓝眼、鲸鳍耳、白色女仆头饰，深蓝与象牙白长裙女仆装、白色鲸鱼图案围裙、金色细刺绣、深蓝低跟鞋，身后有清楚的鲸尾', imageTags: 'adult woman, long blue hair, azure hair tips, blue eyes, whale fin ears, white frilled maid headdress, long navy and ivory maid dress, white whale motif apron, delicate gold embroidery, navy low heel shoes, blue whale tail' },
  claude: { sprite: 'atelier-sprite-claude', visual: '成年女性，极长铜橙色头发、琥珀眼、橙色花朵与黑丝带发饰，象牙白高领长裙、焦橙色与深棕叠层裙摆、细金色植物刺绣、棕色束腰、奶油白系带短靴，手持棕色书本', imageTags: 'adult woman, very long copper orange hair, amber eyes, orange flower hair ornament, black hair ribbon, ivory high neck long dress, burnt orange and dark brown overskirt, botanical gold embroidery, brown waist belt, cream lace-up ankle boots, holding brown book' },
  chatgpt: { sprite: 'atelier-sprite-chatgpt', visual: '成年白龙娘，极长银白发、浅紫眼、两只珍珠白弯曲龙角、尖耳、小型象牙白龙翼与白色鳞片长尾，象牙白与淡紫色高领长裙、银色结形饰品、垂袖与白色低跟鞋', imageTags: 'adult white dragon woman, long silver white hair, pale violet eyes, two pearl white dragon horns, pointed ears, small ivory dragon wings, white scaled dragon tail, ivory lavender high neck long dress, silver knot ornaments, draped sleeves, ivory shoes' },
  gemini: { sprite: 'atelier-sprite-gemini', visual: '成年猫娘，蓝到紫罗兰渐变长发、紫色猫耳和蓬松长尾、品红与琥珀异色瞳、四色四芒星发饰，深蓝白紫星纹服装、垂袖、叠层短裙、不透明深蓝连裤袜和蓝白短靴', imageTags: 'adult cat woman, long blue lavender gradient hair, purple cat ears, fluffy purple cat tail, heterochromia magenta amber eyes, iridescent four point star hairpin, navy white violet star outfit, flowing sleeves, layered skirt, opaque navy tights, blue white boots' },
  kimi: { sprite: 'atelier-sprite-kimi', visual: '成年女性，极长银白发、浅紫眼、白色褶边头饰、深蓝丝带与银色月牙棱镜发饰，象牙白高领衬衫、深海军蓝长裙和披肩、细金色月亮星辰与乐谱花纹、银色腰链、深蓝低跟鞋，持深蓝笔记本', imageTags: 'adult woman, very long silver white hair, pale lavender eyes, white frilled headband, navy ribbon, silver crescent prism ornament, ivory high neck blouse, long midnight blue skirt, navy capelet, delicate gold moon star musical motifs, silver waist chains, navy low heel shoes, navy notebook' },
  grok: { sprite: 'atelier-sprite-grok', visual: '成年女性，金色长双马尾、蓝眼、黑色蝴蝶结、小型黑色王冠与蝙蝠翼发饰，黑色和酒红色哥特长裙、白色蕾丝边、细金色纹样和腰链、黑袜短靴，持黑金色巨型双刃斧', imageTags: 'adult woman, long blonde twin tails, bright blue eyes, black hair bows, small dark crown, bat wing hair ornaments, modest long black burgundy gothic dress, white lace trim, antique gold embroidery, waist chains, black stockings, black ankle boots, ornate black gold double headed axe' },
}

export function applyAtelierArt(roster: Record<string, any>): void {
  for (const [id, spec] of Object.entries(ATELIER_ART)) {
    const role = roster[id]
    if (!role) continue
    const previous = { sprite: role.sprite, avatar: role.avatar, visual: role.visual, imageTags: role.imageTags }
    role.legacyAppearance = previous
    role.sprite = spec.sprite
    role.avatar = 'portrait-' + id
    role.visual = spec.visual
    role.imageTags = spec.imageTags
    role.sprites = [
      { id: 'A', label: '工坊定稿（默认）', key: spec.sprite },
      ...(role.sprites || []).filter((row: any) => row.id !== 'A'),
      { id: 'legacy-a', label: '旧版默认形象', key: previous.sprite },
    ]
    role.defaultBackground = 'bg-atelier-night'
    role.backgrounds = [
      { key: 'bg-atelier-night', label: '工坊 · 夜间' },
      { key: 'bg-atelier-day', label: '工坊 · 白日' },
      ...(role.backgrounds || []),
    ]
  }
}
