function findMatchingBeads(analysis: any, isFallback: boolean = false) {
  const suggestions = [];
  
  // Get top characteristics
  const topMaterial = analysis.materials[0];
  const topColor = analysis.colors[0];
  const topShape = analysis.shapes[0];
  const topFinish = analysis.finishes[0];
  
  // Extract specific bead types from the AI description
  const description = analysis.description || '';
  const lowerDesc = description.toLowerCase();
  
  // Specific bead type detection from AI analysis
  const specificTypes = {
    // Glass types
    lampwork: lowerDesc.includes('lampwork'),
    venetian: lowerDesc.includes('venetian glass') || lowerDesc.includes('venetian'),
    murano: lowerDesc.includes('murano'),
    silverfoil: lowerDesc.includes('silver foil') || lowerDesc.includes('silver leafing') || lowerDesc.includes('silver leaf'),
    goldfoil: lowerDesc.includes('gold foil') || lowerDesc.includes('gold leafing') || lowerDesc.includes('gold leaf'),
    
    // Stone types  
    jasper: lowerDesc.includes('jasper'),
    agate: lowerDesc.includes('agate'),
    quartz: lowerDesc.includes('quartz'),
    turquoise: lowerDesc.includes('turquoise'),
    jade: lowerDesc.includes('jade'),
    amethyst: lowerDesc.includes('amethyst'),
    
    // Specific terms
    gemstone: lowerDesc.includes('gemstone'),
    crystal: lowerDesc.includes('crystal'),
    faceted: lowerDesc.includes('faceted'),
  };

  // PRIORITY 1: Specific bead types identified by AI
  if (specificTypes.jasper) {
    suggestions.push({
      title: `Imperial Jasper Beads`,
      slug: 'imperial-jasper-beads',
      description: `Natural jasper gemstone beads with beautiful earth-tone patterns and variations, perfect for rustic and natural jewelry designs`,
      confidence: 0.95,
      category: 'gemstone',
      tags: ['jasper', 'gemstone', 'natural', 'earth-tones', topColor?.type].filter(Boolean)
    });
  }

  if (specificTypes.silverfoil && topMaterial?.type === 'glass') {
    suggestions.push({
      title: `Silver Foil Glass Beads`,
      slug: 'silver-foil-glass-beads', 
      description: `Glass beads with silver foil inclusions that create beautiful metallic effects and sparkle`,
      confidence: 0.94,
      category: 'glass',
      tags: ['glass', 'silver-foil', 'metallic', 'sparkle', topShape?.type].filter(Boolean)
    });
  }

  if (specificTypes.venetian && topMaterial?.type === 'glass') {
    suggestions.push({
      title: `Venetian Glass Beads`,
      slug: 'venetian-glass-beads',
      description: `Traditional Venetian glass beads with distinctive patterns and superior craftsmanship from Murano glassmakers`,
      confidence: 0.93,
      category: 'glass',
      tags: ['venetian', 'glass', 'traditional', 'murano', topShape?.type].filter(Boolean)
    });
  }

  if (specificTypes.lampwork && topMaterial?.type === 'glass') {
    suggestions.push({
      title: `Lampwork Glass Beads`,
      slug: 'lampwork-glass-beads',
      description: `Handcrafted lampwork glass beads made using traditional flame-working techniques`,
      confidence: 0.92,
      category: 'glass', 
      tags: ['lampwork', 'glass', 'handcrafted', 'artisan', topColor?.type].filter(Boolean)
    });
  }

  if (specificTypes.agate) {
    suggestions.push({
      title: `Agate Gemstone Beads`,
      slug: 'agate-beads',
      description: `Natural agate beads with beautiful banded patterns and translucent qualities`,
      confidence: 0.94,
      category: 'gemstone',
      tags: ['agate', 'gemstone', 'natural', 'banded', topColor?.type].filter(Boolean)
    });
  }

  if (specificTypes.quartz) {
    suggestions.push({
      title: `Quartz Crystal Beads`,
      slug: 'quartz-beads',
      description: `Clear quartz crystal beads known for their clarity and healing properties`,
      confidence: 0.93,
      category: 'crystal',
      tags: ['quartz', 'crystal', 'clear', 'healing', topColor?.type].filter(Boolean)
    });
  }

  // PRIORITY 2: Shape-based suggestions for specialty shapes
  if (topShape?.type === 'heart' && !specificTypes.silverfoil && !specificTypes.venetian) {
    const materialType = topMaterial?.type || 'Glass';
    suggestions.push({
      title: `Heart-Shaped ${materialType} Beads`,
      slug: 'heart-shaped-beads',
      description: `Beautiful heart-shaped ${materialType.toLowerCase()} beads ${topColor ? `in ${topColor.type} ` : ''}perfect for romantic jewelry and special occasion designs`,
      confidence: 0.89,
      category: 'specialty',
      tags: ['heart', 'specialty', 'romantic', topColor?.type, topMaterial?.type].filter(Boolean)
    });
  }

  if (topShape?.type === 'star') {
    suggestions.push({
      title: `Star-Shaped ${topMaterial?.type || 'Glass'} Beads`,
      slug: 'star-shaped-beads',
      description: `Celestial star-shaped beads ${topColor ? `in ${topColor.type} ` : ''}that add cosmic sparkle to jewelry designs`,
      confidence: 0.89,
      category: 'specialty',
      tags: ['star', 'specialty', 'celestial', topColor?.type, topMaterial?.type].filter(Boolean)
    });
  }

  // PRIORITY 3: Material-based suggestions (only if no specific types found)
  if (suggestions.length === 0 || suggestions.length === 1) {
    if (topMaterial?.type === 'stone' && !specificTypes.jasper && !specificTypes.agate) {
      suggestions.push({
        title: `Natural ${topColor?.type || ''} Stone Beads`.trim(),
        slug: 'natural-stone-beads',
        description: `Genuine natural stone beads ${topColor ? `in beautiful ${topColor.type} tones ` : ''}with unique patterns and earthy appeal`,
        confidence: 0.87,
        category: 'stone',
        tags: ['stone', 'natural', 'gemstone', topColor?.type].filter(Boolean)
      });
    }

    if (topMaterial?.type === 'glass' && !specificTypes.silverfoil && !specificTypes.venetian && !specificTypes.lampwork) {
      const shapeDesc = topShape?.type === 'round' ? 'round ' : '';
      const colorDesc = topColor?.type && topColor.type !== 'clear' ? `${topColor.type} ` : '';
      suggestions.push({
        title: `${colorDesc}${shapeDesc}Glass Beads`.trim(),
        slug: 'glass-beads',
        description: `High-quality ${shapeDesc}glass beads ${colorDesc ? `in stunning ${topColor.type} ` : ''}perfect for jewelry making and crafts`,
        confidence: 0.85,
        category: 'glass',
        tags: ['glass', 'jewelry', topColor?.type, topShape?.type].filter(Boolean)
      });
    }

    if (topMaterial?.type === 'seed') {
      suggestions.push({
        title: 'Seed Beads',
        slug: 'seed-beads',
        description: `Tiny, uniform seed beads ${topColor ? `in ${topColor.type} ` : ''}perfect for intricate beadwork and detailed patterns`,
        confidence: 0.88,
        category: 'seed',
        tags: ['seed', 'small', 'detailed', 'beadwork', topColor?.type].filter(Boolean)
      });
    }
  }

  // PRIORITY 4: Multi-color suggestions (ONLY if no material-specific matches and truly multicolored)
  if (suggestions.length < 2 && analysis.colors.length > 3 && !specificTypes.jasper && !specificTypes.agate) {
    suggestions.push({
      title: 'Mixed Color Bead Collection',
      slug: 'mixed-color-beads',
      description: 'Diverse assortment of beads in multiple colors for vibrant, creative jewelry projects',
      confidence: 0.75,
      category: 'mixed',
      tags: ['colorful', 'variety', 'creative', 'assorted']
    });
  }

  // PRIORITY 5: Ensure we have at least one suggestion
  if (suggestions.length === 0) {
    suggestions.push({
      title: 'Artisan Craft Beads',
      slug: 'craft-beads',
      description: 'Quality beads perfect for handmade jewelry and creative craft projects',
      confidence: 0.75,
      category: 'craft',
      tags: ['craft', 'handmade', 'creative', 'quality']
    });
  }
  
  // Return top 3 suggestions, sorted by confidence
  return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
}