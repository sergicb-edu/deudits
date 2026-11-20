/**
 * Base de dades de dites catalanes, frases fetes i embarbussaments per a DeuDits.
 * Ortografia 100% revisada en català normatiu.
 * Fàcil d'ampliar amb els llibres de dites i embarbussaments del centre!
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

  // Embarbussaments catalans divertits (100% normatius!)
  embarbussaments: [
    { text: "setze jutges d'un jutjat mengen fetge d'un penjat", meaning: "L'embarbussament més famós de Catalunya!" },
    { text: "una plata plena de pebre negre", meaning: "Compte amb les p i les r!" },
    { text: "en cap cap cap el que cap en aquest cap", meaning: "Joc de paraules amb la paraula cap." },
    { text: "duc pa sec al sac m'assec on soc i el suco amb suc", meaning: "Ideal per agafar ritme amb les vocals!" },
    { text: "tres tristos tigres traguen blat en un trigal", meaning: "Un clàssic per entrenar la velocitat dels dits." },
    { text: "plou poc però pel poc que plou plou prou", meaning: "Un repte genial per a la lletra p!" }
  ]
};
