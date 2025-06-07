function analyzeDescription(description: string) {
  const beadKeywords = {
    materials: {
      glass: [
        'glass', 'crystal', 'transparent', 'clear', 'shiny', 'smooth', 'translucent', 'vitreous',
        'venetian glass', 'murano', 'lampwork', 'blown glass', 'fused glass',
        'silver leafing', 'gold leafing', 'foil', 'leafing', 'silver leaf', 'gold leaf',
        'metallic effect within', 'metallic inclusions', 'incorporated into the glass',
        'flecks and swirls', 'effect incorporated', 'within the glass'
      ],
      metal: ['solid metal', 'pure metal', 'metal bead', 'steel bead', 'brass bead', 'copper bead', 'silver bead', 'gold bead'],
      stone: ['stone', 'marble', 'granite', 'quartz', 'agate', 'natural', 'jasper', 'rock', 'mineral', 'gemstone', 'jade', 'turquoise'],
      wood: ['wood', 'wooden', 'natural', 'brown', 'grain', 'timber', 'bamboo'],
      ceramic: ['ceramic', 'porcelain', 'clay', 'glazed', 'pottery', 'fired'],
      plastic: ['plastic', 'acrylic', 'synthetic', 'resin', 'polymer'],
      pearl: ['pearl', 'nacre', 'lustrous', 'iridescent', 'mother-of-pearl'],
      seed: ['seed', 'small', 'tiny', 'delicate', 'fine']
    },
    colors: {
      blue: ['blue', 'navy', 'cobalt', 'azure', 'sapphire', 'turquoise', 'aqua', 'teal', 'cerulean'],
      red: ['red', 'crimson', 'ruby', 'burgundy', 'scarlet', 'maroon', 'cherry'],
      green: ['green', 'emerald', 'jade', 'olive', 'forest', 'lime', 'mint'],
      yellow: ['yellow', 'gold', 'amber', 'citrine', 'golden', 'lemon'],
      purple: ['purple', 'violet', 'amethyst', 'lavender', 'lilac', 'plum'],
      clear: ['clear', 'transparent', 'crystal', 'see-through', 'colorless'],
      black: ['black', 'ebony', 'onyx', 'dark', 'jet'],
      white: ['white', 'pearl', 'ivory', 'cream', 'pale', 'snow'],
      pink: ['pink', 'rose', 'magenta', 'blush', 'salmon'],
      orange: ['orange', 'coral', 'peach', 'tangerine', 'apricot'],
      brown: ['brown', 'tan', 'beige', 'coffee', 'chocolate', 'earth', 'natural', 'umber'],
      colorful: ['colorful', 'multicolored', 'various colors', 'different colors', 'mixed colors', 'rainbow', 'varied']
    },
    shapes: {
      round: ['round', 'sphere', 'ball', 'circular', 'spherical', 'globular'],
      oval: ['oval', 'elliptical', 'egg', 'elongated', 'oblong'],
      cylinder: ['cylinder', 'tube', 'barrel', 'cylindrical', 'tubular'],
      faceted: ['faceted', 'cut', 'geometric', 'angular', 'crystalline', 'multi-sided'],
      irregular: ['irregular', 'organic', 'freeform', 'natural shape', 'random'],
      flat: ['flat', 'disc', 'coin', 'button', 'tablet'],
      heart: ['heart', 'heart-shaped', 'heart shaped'],
      star: ['star', 'star-shaped', 'star shaped'],
      square: ['square', 'cube', 'cubic', 'rectangular'],
      small: ['small', 'tiny', 'little', 'mini', 'miniature'],
      large: ['large', 'big', 'chunky', 'oversized', 'substantial']
    },
    finishes: {
      glossy: ['glossy', 'shiny', 'polished', 'lustrous', 'reflective'],
      matte: ['matte', 'dull', 'frosted', 'non-reflective'],
      textured: ['textured', 'rough', 'bumpy', 'ridged', 'etched']
    }
  };

  const analysis = {
    materials: [] as Array<{type: string, confidence: number, matched_words: string[]}>,
    colors: [] as Array<{type: string, confidence: number, matched_words: string[]}>,
    shapes: [] as Array<{type: string, confidence: number, matched_words: string[]}>,
    finishes: [] as Array<{type: string, confidence: number, matched_words: string[]}>
  };

  const lowercaseDesc = description.toLowerCase();
  
  // Smart glass detection - if we see specific phrases about glass with metallic effects
  const glassWithMetallicPhrases = [
    'metallic effect within the glass',
    'silver leafing',
    'gold leafing', 
    'venetian glass',
    'murano',
    'incorporated into the glass',
    'effect incorporated',
    'metallic inclusions',
    'leafing or a similar effect',
    'glass heart beads'
  ];
  
  let hasGlassWithMetallic = false;
  for (const phrase of glassWithMetallicPhrases) {
    if (lowercaseDesc.includes(phrase)) {
      hasGlassWithMetallic = true;
      break;
    }
  }
  
  for (const [category, items] of Object.entries(beadKeywords)) {
    for (const [item, words] of Object.entries(items)) {
      const matches = words.filter(word => lowercaseDesc.includes(word));
      if (matches.length > 0) {
        let confidence = Math.min(matches.length / words.length * 1.2, 1.0);
        
        // Special logic for materials
        if (category === 'materials') {
          if (item === 'glass' && hasGlassWithMetallic) {
            // Boost glass confidence if we detected glass with metallic effects
            confidence = Math.min(confidence + 0.3, 0.95);
          } else if (item === 'metal' && hasGlassWithMetallic) {
            // Reduce metal confidence if this is actually glass with metallic effects
            confidence = Math.max(confidence - 0.4, 0.1);
          }
        }
        
        (analysis as any)[category].push({
          type: item,
          confidence: confidence,
          matched_words: matches
        });
      }
    }
  }

  // Sort by confidence
  Object.keys(analysis).forEach(key => {
    (analysis as any)[key].sort((a: any, b: any) => b.confidence - a.confidence);
  });

  return analysis;
}