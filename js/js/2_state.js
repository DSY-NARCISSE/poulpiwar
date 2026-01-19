/**
 * =============================================================================
 * MODULE: STATE (Gestion de l'état)
 * =============================================================================
 */

const State = {
    // DONNÉES SAUVEGARDÉES (Long terme)
    data: {
        heroName: "Octo",
        level: 1,
        xp: 0,
        xpToNext: 100,
        gold: 0,
        perls: 0,
        stats: { hp: 0, atk: 0, def: 0, spd: 0, crit: 0 }, // Niveaux upgrades
        gear: { weapon: null, head: null, pet: null },
        inventory: [],
        maxInventory: 24,
        char: null
    },

    // DONNÉES TEMPORAIRES (Run actuelle)
    run: {
        active: false,
        day: 1,
        zone: 1,
        hp: 100,
        maxHp: 100,
        atk: 10,
        def: 0,
        crit: 5,
        spd: 1.0,
        shield: 0,
        skills: [], // { id: 'fire', lvl: 1 }
        buffs: []
    },

    // DONNÉES DE COMBAT (Instantané)
    combat: {
        active: false,
        hp: 0,
        maxHp: 0,
        atk: 0,
        enemy: null,
        turnCount: 0,
        frozen: false
    },

    // OPTIONS
    config: {
        speed: 1,
        auto: false,
        timer: null
    }
};

// --- MÉTHODES DE GESTION ---
const StateManager = {
    save: () => {
        localStorage.setItem('octo_infinity_v13', JSON.stringify(State.data));
    },

    load: () => {
        const s = localStorage.getItem('octo_infinity_v13');
        if (s) {
            try {
                const loaded = JSON.parse(s);
                State.data = { ...State.data, ...loaded }; // Merge pour compatibilité
            } catch (e) {
                console.error("Save corrompue, démarrage à zéro.");
            }
        }
    },

    reset: () => {
        if (confirm("RÉINITIALISATION TOTALE DU SYSTÈME ?")) {
            localStorage.clear();
            location.reload();
        }
    },

    // Calculateur de Stats Complexe
    recalc: () => {
        // Base via Hub Upgrades
        let hp = 100 + (State.data.stats.hp * 25);
        let atk = 10 + (State.data.stats.atk * 5);
        let def = 0 + (State.data.stats.def * 2);
        let crit = 5 + (State.data.stats.crit * 1);
        let spd = 1.0 + (State.data.stats.spd * 0.05);

        // Equipement
        if (State.data.gear.weapon) atk += State.data.gear.weapon.s;
        if (State.data.gear.head) { def += State.data.gear.head.s; hp += State.data.gear.head.s * 2; }
        if (State.data.gear.pet) atk += State.data.gear.pet.s;

        // Skills Passifs (Seulement si Run Active)
        if (State.run.active) {
            const chi = State.run.skills.find(s => s.id === 'chi');
            if (chi) {
                const mult = 1 + (0.08 * chi.lvl);
                hp *= mult; atk *= mult; def *= mult;
            }
            
            const wind = State.run.skills.find(s => s.id === 'wind');
            if (wind) spd += (0.10 * wind.lvl);

            const precision = State.run.skills.find(s => s.id === 'crit');
            if (precision) crit += (5 * precision.lvl);
        }

        // Application
        State.run.maxHp = Math.floor(hp);
        State.run.atk = Math.floor(atk);
        State.run.def = Math.floor(def);
        State.run.crit = parseFloat(crit.toFixed(1));
        State.run.spd = parseFloat(spd.toFixed(2));

        // Clamp HP
        if (State.run.hp > State.run.maxHp) State.run.hp = State.run.maxHp;
    }
};
