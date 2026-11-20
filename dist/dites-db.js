/**
 * Base de dades de dites catalanes, frases fetes i embarbussaments per a DeuDits.
 * Ortografia 100% revisada en català normatiu (IEC 2016: soc, un llaç, tots els accents).
 */
window.DEUDITS_DB = {
  // 5 nivells il·lustratius per a "Comprova el teu nivell!"
  diagnosticLevels: [
    {
      level: 1,
      icon: "🐣",
      name: "Nivell 1 — Pollet Explorador",
      desc: "Estàs descobrint el teclat! A poc a poc i amb bona lletra aniràs volant."
    },
    {
      level: 2,
      icon: "🐢",
      name: "Nivell 2 — Tortuga Constant",
      desc: "Bon pas i molta tranquil·litat! Ja domines les primeres combinacions."
    },
    {
      level: 3,
      icon: "🦊",
      name: "Nivell 3 — Guineu Àgil",
      desc: "Molt bon ritme i bona punteria! Els teus dits ja es mouen amb soltesa."
    },
    {
      level: 4,
      icon: "🦅",
      name: "Nivell 4 — Àguila del Pedraforca",
      desc: "Impressionant! Escrius ràpid, segur i gairebé sense errades."
    },
    {
      level: 5,
      icon: "⚡",
      name: "Nivell 5 — Llamp de Catalunya",
      desc: "Mestre dels deu dits! Velocitat i precisió de campió!"
    }
  ],

  // Frases fetes i dites catalanes (100% normatives amb tots els accents!)
  dites: [
    { text: "qui dia passa any empeny", meaning: "Anant pas a pas cada dia avancem molt." },
    { text: "a poc a poc es fa camí", meaning: "Sense presses s'arriba molt lluny." },
    { text: "cada ovella al seu corral", meaning: "Cada cosa i cada dit al seu lloc." },
    { text: "al maig cada dia un raig", meaning: "A la primavera sol ploure sovint." },
    { text: "qui no s'arrisca no pisca", meaning: "Cal atrevir-se a provar coses noves." },
    { text: "val més prevenir que curar", meaning: "És millor anar amb compte abans que passi res." },
    { text: "bon vent i barca nova", meaning: "Desig de bona sort en un nou camí." },
    { text: "a la taula i al llit al primer crit", meaning: "Cal ser puntual quan et criden." }
  ],

  // Embarbussaments generals per a "Comprova el teu nivell!"
  embarbussaments: [
    { text: "setze jutges d'un jutjat mengen fetge d'un penjat", meaning: "L'embarbussament més famós de Catalunya!" },
    { text: "una plata plena de pebre negre", meaning: "Compte amb les p i les r!" },
    { text: "al joc juguem en Jep i jo", meaning: "Ideal per a la lletra J!" },
    { text: "duc pa sec al sac, m'assec on soc i el suco amb suc", meaning: "Ideal per agafar ritme amb les vocals!" },
    { text: "fan flam a la fira del Garraf", meaning: "Un clàssic amb la lletra F!" },
    { text: "saps que sé que són les set", meaning: "Molt curt i divertit amb la S!" }
  ],

  // Embarbussaments classificats per nivell i lletres protagonistes (ortografia 100% revisada!)
  // Ordenats de Curt -> Mitjà -> Reptador per al Jardí d'Embarbussaments (Línia d'Ampliació 🌸)
  embarbussamentsPerNivell: {
    L01: [
      { id: "EMB.L01.1", tier: "🌱 Curt", flower: "🌸", flowerName: "Genciana del Pedraforca", focus: ["f", "j"], text: "Quin fum fa? Fa un fum fi." },
      { id: "EMB.L01.2", tier: "🌱 Curt", flower: "🌼", flowerName: "Narcís dels Poetes", focus: ["f", "j"], text: "Al joc juguem en Jep i jo." },
      { id: "EMB.L01.3", tier: "🌿 Mitjà", flower: "🌺", flowerName: "Marcòlic Vermell", focus: ["f", "j"], text: "Fan flam a la fira del Garraf." },
      { id: "EMB.L01.4", tier: "🌿 Mitjà", flower: "🌷", flowerName: "Orquídia del Berguedà", focus: ["f", "j"], text: "La figuera d'en Feliu fa figues fines." },
      { id: "EMB.L01.5", tier: "🔥 Reptador", flower: "🌻", flowerName: "Àrnica de Muntanya", focus: ["f", "j"], text: "Setze jutges d'un jutjat mengen fetge d'un penjat." },
      { id: "EMB.L01.6", tier: "🔥 Reptador", flower: "🌸", flowerName: "Rosa del Pedraforca", focus: ["f", "j"], text: "En Feliu fa foc de fusta a la festa de la Floresta." },
      { id: "EMB.L01.7", tier: "🔥 Reptador", flower: "🌼", flowerName: "Flor de Neu", focus: ["f", "j"], text: "Una bajoca és una bajoca, però un bajoc no és una bajoca." },
      { id: "EMB.L01.8", tier: "🔥 Reptador", flower: "🌺", flowerName: "Viola del Berguedà", focus: ["f", "j"], text: "En Ferran, ferrer, feia fum i foc ferrant ferro fort." }
    ],
    L02: [
      { id: "EMB.L02.1", tier: "🌱 Curt", flower: "🌸", flowerName: "Genciana del Pedraforca", focus: ["d"], text: "Digues dues dames i dues dagues." },
      { id: "EMB.L02.2", tier: "🌿 Mitjà", flower: "🌼", flowerName: "Narcís dels Poetes", focus: ["d"], text: "Diu dos, diu deu; ni dos ni deu. No deu res." },
      { id: "EMB.L02.3", tier: "🌿 Mitjà", flower: "🌺", flowerName: "Marcòlic Vermell", focus: ["d"], text: "Deu dits, dues mans té en Dídac, el didot Amadeu." },
      { id: "EMB.L02.4", tier: "🔥 Reptador", flower: "🌻", flowerName: "Àrnica de Muntanya", focus: ["d"], text: "Si qui deu deu diu que deu deu, diu el que deu i deu el que diu." }
    ],
    L03: [
      { id: "EMB.L03.1", tier: "🌱 Curt", flower: "🌸", flowerName: "Genciana del Pedraforca", focus: ["s", "l"], text: "A la Lali li cal sal." },
      { id: "EMB.L03.2", tier: "🌱 Curt", flower: "🌼", flowerName: "Narcís dels Poetes", focus: ["s", "l"], text: "Saps que sé que són les set." },
      { id: "EMB.L03.3", tier: "🌿 Mitjà", flower: "🌺", flowerName: "Marcòlic Vermell", focus: ["s", "l"], text: "La Bel vol el bell bol per a la mel." },
      { id: "EMB.L03.4", tier: "🔥 Reptador", flower: "🌻", flowerName: "Àrnica de Muntanya", focus: ["s", "l"], text: "Duc pa sec al sac, m'assec on soc i el suco amb suc." }
    ],
    L04: [
      { id: "EMB.L04.1", tier: "🌱 Curt", flower: "🌸", flowerName: "Genciana del Pedraforca", focus: ["a"], text: "Ca la Clara és a la cala d'Alacant." },
      { id: "EMB.L04.2", tier: "🌿 Mitjà", flower: "🌼", flowerName: "Narcís dels Poetes", focus: ["a"], text: "Cap cap pla cap al cap del replà." },
      { id: "EMB.L04.3", tier: "🔥 Reptador", flower: "🌺", flowerName: "Marcòlic Vermell", focus: ["a"], text: "El pare Gegantàs, que té boca de cabàs, amb un llaç s'aguanta el nas." }
    ]
  }
};
