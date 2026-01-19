/**
 * =============================================================================
 * MODULE: DATABASE (Données statiques)
 * =============================================================================
 */

const DB = {
    // --- CONFIGURATION ---
    config: {
        version: "13.0.0",
        tickRate: 500, // Vitesse de base (ms)
        critBase: 0.05,
        critMult: 2.0,
        maxLevel: 100,
        dropRate: 0.4
    },

    // --- RARITÉS & COULEURS ---
    rarity: {
        common:     { id:'common',     mult: 1,   color:'#94a3b8', label:'Commun' },
        uncommon:   { id:'uncommon',   mult: 1.5, color:'#2dd4bf', label:'Atypique' },
        rare:       { id:'rare',       mult: 2.5, color:'#3b82f6', label:'Rare' },
        epic:       { id:'epic',       mult: 4.5, color:'#a855f7', label:'Épique' },
        legendary:  { id:'legendary',  mult: 8.0, color:'#f59e0b', label:'Légendaire' },
        mythic:     { id:'mythic',     mult: 15.0, color:'#f43f5e', label:'Mythique' }
    },

    // --- HÉROS ---
    chars: [
        { id: "🐙", name: "Poulpe", desc: "Équilibré et polyvalent." },
        { id: "🦈", name: "Requin", desc: "Attaque élevée, faible défense." },
        { id: "🐢", name: "Tortue", desc: "Défense impénétrable, lent." },
        { id: "👽", name: "Alien", desc: "Maîtrise technologique avancée." },
        { id: "🤖", name: "Mecha", desc: "Immunisé à la douleur." }
    ],

    // --- COMPÉTENCES (15 TYPES) ---
    skills: {
        // Offensif
        'fire':   { n: "Pyromancie", icon: "🔥", color: "text-orange-500", desc: (l) => `Brûlure: ${10 * l} dégâts/tour.` },
        'poison': { n: "Toxine",     icon: "🤢", color: "text-green-500",  desc: (l) => `Poison: ${5 * l}% PV max/tour.` },
        'elec':   { n: "Surcharge",  icon: "⚡", color: "text-yellow-400", desc: (l) => `Choc: Dégâts bruts +${20 * l}.` },
        'bleed':  { n: "Hémorragie", icon: "🩸", color: "text-red-600",    desc: (l) => `Critique: Saignement +${50 * l} dmg.` },
        'boom':   { n: "Détonation", icon: "💥", color: "text-orange-600", desc: (l) => `Explosion tous les 4 coups (${80 * l} dmg).` },
        'chain':  { n: "Ricochet",   icon: "🧲", color: "text-cyan-400",   desc: (l) => `25% Chance de double frappe.` },
        
        // Passif / Stats
        'wind':   { n: "Rafale",     icon: "🌪️", color: "text-slate-300",  desc: (l) => `Vitesse d'attaque +${10 * l}%.` },
        'crit':   { n: "Précision",  icon: "🎯", color: "text-red-400",    desc: (l) => `Chance Critique +${5 * l}%.` },
        'chi':    { n: "Méditation", icon: "🧠", color: "text-indigo-400", desc: (l) => `Toutes les Stats +${8 * l}%.` },
        'shadow': { n: "Vampirisme", icon: "🌑", color: "text-purple-500", desc: (l) => `Vol de vie: ${5 * l}% des dégâts.` },
        
        // Défensif / Contrôle
        'ice':    { n: "Cryostase",  icon: "❄️", color: "text-cyan-200",   desc: (l) => `15% Chance de geler l'ennemi.` },
        'shield': { n: "Barrière",   icon: "🛡️", color: "text-blue-400",   desc: (l) => `Bouclier ${100 * l} PV au début.` },
        'heal':   { n: "Régène",     icon: "💚", color: "text-emerald-400",desc: (l) => `Soin +${3 * l}% PV par tour.` },
        'dodge':  { n: "Reflexes",   icon: "💨", color: "text-white",      desc: (l) => `Esquive +${3 * l}%.` },
        'weak':   { n: "Intimidation", icon: "👁️", color: "text-pink-500", desc: (l) => `Réduit ATK ennemie de ${10 * l}%.` }
    },

    // --- BESTIAIRE (PAR ZONE) ---
    enemies: {
        zone1: [
            { n: "Crabe", hp: 60, atk: 8, xp: 10, i: "🦀" },
            { n: "Crevette", hp: 45, atk: 12, xp: 12, i: "🦐" },
            { n: "Poisson", hp: 70, atk: 6, xp: 15, i: "🐟" }
        ],
        zone2: [
            { n: "Murène", hp: 180, atk: 25, xp: 30, i: "🐍" },
            { n: "Tortue", hp: 400, atk: 15, xp: 45, i: "🐢" },
            { n: "Méduse", hp: 250, atk: 35, xp: 50, i: "🪼" }
        ],
        zone3: [
            { n: "Requin", hp: 800, atk: 60, xp: 100, i: "🦈" },
            { n: "Baleine", hp: 2000, atk: 40, xp: 200, i: "🐋" },
            { n: "Abomination", hp: 1200, atk: 90, xp: 250, i: "🦂" }
        ],
        bosses: [
            { n: "KRAKEN", hp: 3000, atk: 50, xp: 1000, i: "🦑" },
            { n: "LÉVIATHAN", hp: 6000, atk: 80, xp: 2000, i: "🐉" },
            { n: "C'THULHU", hp: 15000, atk: 200, xp: 10000, i: "🐙" }
        ]
    },

    // --- ITEMS (GÉNÉRATEUR DE BASE) ---
    itemPrefixes: ["Rouillé", "Ancien", "Soldat", "Capitaine", "Royal", "Cosmique", "Divin"],
    baseItems: {
        weapon: [
            { n: "Dague", i: "🗡️", s: 10 }, { n: "Épée", i: "⚔️", s: 20 }, { n: "Hache", i: "🪓", s: 30 },
            { n: "Trident", i: "🔱", s: 40 }, { n: "Sceptre", i: "🪄", s: 60 }, { n: "Faux", i: "🦠", s: 80 }
        ],
        head: [
            { n: "Bandana", i: "🧣", s: 5 }, { n: "Casque", i: "🪖", s: 15 }, { n: "Bouclier", i: "🛡️", s: 30 },
            { n: "Masque", i: "👺", s: 45 }, { n: "Couronne", i: "👑", s: 80 }, { n: "Halo", i: "😇", s: 120 }
        ],
        pet: [
            { n: "Crabe", i: "🦀", s: 5, e: "shield" }, { n: "Chien", i: "🐕", s: 10, e: "crit" },
            { n: "Dragon", i: "🐉", s: 25, e: "fire" }, { n: "Nuage", i: "☁️", s: 20, e: "elec" },
            { n: "Fantôme", i: "👻", s: 30, e: "ice" }, { n: "Diable", i: "😈", s: 40, e: "shadow" }
        ]
    }
};
