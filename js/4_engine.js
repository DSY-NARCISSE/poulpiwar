/**
 * =============================================================================
 * MODULE: ENGINE (Logique de Jeu & Boucle Principale)
 * =============================================================================
 */

const Engine = {
    // --- INITIALISATION ---
    init: () => {
        console.log("[ENGINE] Starting...");
        StateManager.load();
        
        if (!State.data.char) {
            UI.modal('char');
        } else {
            StateManager.recalc();
            UI.update();
            
            // Restore button state if needed
            if (!State.run.active) {
                UI.btn("DÉMARRER");
            } else if (State.combat.active) {
                // Si on a rechargé pendant un combat, on le relance
                Engine.resumeCombat();
            } else {
                UI.btn("CONTINUER", "bg-emerald-600", Engine.nextDay);
            }
        }
        
        // Auto-Play Loop
        setInterval(Engine.autoLoop, 1000);
    },

    // --- ACTIONS JOUEUR ---
    clickMain: () => {
        if (!State.run.active) Engine.startRun();
        else Engine.nextDay();
    },

    pickChar: (id) => {
        State.data.char = id;
        StateManager.save();
        UI.closeModal();
        UI.update();
        UI.toast("Système initialisé.", "success");
    },

    // --- GAME LOOP (RUN) ---
    startRun: () => {
        StateManager.recalc();
        State.run.active = true;
        State.run.day = 0;
        State.run.hp = State.run.maxHp;
        State.run.skills = [];
        State.run.shield = 0;
        
        // Pet Skill Injection
        if (State.data.gear.pet && State.data.gear.pet.e) {
            const map = {'fire':'fire','ice':'ice','elec':'elec','shield':'shield','shadow':'shadow'};
            Engine.addSkill(map[State.data.gear.pet.e] || 'chi', true);
        }

        document.getElementById('enemy-container').classList.add('hidden');
        document.getElementById('narrative-layer').classList.remove('hidden');
        
        UI.switchTab('adventure');
        UI.btn("JOUR SUIVANT", "bg-emerald-600", Engine.nextDay);
        UI.txt("MISSION DÉMARRÉE", "Secteur 1");
        UI.log("Nouvelle run démarrée.");
        
        Engine.nextDay(); // Start directly day 1
    },

    nextDay: () => {
        if (!State.run.active || State.combat.active) return;
        
        State.run.day++;
        StateManager.recalc(); // Update stats
        UI.update();

        // Check Boss
        if (State.run.day % 20 === 0) {
            Engine.initCombat(true);
            return;
        }

        const rng = Math.random();
        
        if (State.run.day % 10 === 0) {
            UI.modal('shop');
            UI.txt("REPOS", "Maintenance");
        } 
        else if (rng < 0.5) {
            Engine.initCombat(false);
        } 
        else {
            Engine.triggerEvent();
        }
    },

    // --- COMBAT SYSTEM ---
    initCombat: (isBoss) => {
        State.combat.active = true;
        State.combat.turnCount = 0;
        
        // Generate Enemy
        const zoneIdx = Math.min(3, Math.ceil(State.run.day / 20));
        const pool = isBoss ? DB.enemies.bosses : DB.enemies['zone'+zoneIdx] || DB.enemies.zone1;
        const template = pool[Math.floor(Math.random() * pool.length)];
        
        // Scaling
        const scale = 1 + (State.run.day * 0.15);
        State.combat.maxHp = Math.floor(template.hp * scale * (isBoss ? 2 : 1));
        State.combat.hp = State.combat.maxHp;
        State.combat.atk = Math.floor(template.atk * scale);
        State.combat.enemy = template;

        // UI Setup
        document.getElementById('enemy-container').classList.remove('hidden');
        document.getElementById('narrative-layer').classList.add('hidden');
        document.getElementById('vis-enemy').innerText = template.i;
        document.getElementById('enemy-name').innerText = template.n;
        
        UI.txt(isBoss ? "ALERTE BOSS" : "HOSTILE DÉTECTÉ", template.n);
        UI.btn("COMBAT...", "cursor-not-allowed grayscale", null);
        UI.log(`Combat: ${template.n} (PV: ${State.combat.maxHp})`, 'combat');

        // Apply Start-of-Combat Skills
        const shield = State.run.skills.find(s => s.id === 'shield');
        if (shield) {
            State.run.shield = 100 * shield.lvl;
            UI.spawnDmg(`BOUCLIER ${State.run.shield}`, '#3b82f6', 'vis-hero');
        }

        setTimeout(Engine.combatTurn, 1000 / State.config.speed);
    },

    resumeCombat: () => {
        // En cas de F5 pendant un combat
        document.getElementById('enemy-container').classList.remove('hidden');
        document.getElementById('narrative-layer').classList.add('hidden');
        UI.btn("COMBAT...", "cursor-not-allowed grayscale", null);
        setTimeout(Engine.combatTurn, 1000 / State.config.speed);
    },

    combatTurn: () => {
        if (!State.run.active || State.run.hp <= 0 || State.combat.hp <= 0) return;

        State.combat.turnCount++;

        // --- PLAYER TURN ---
        let dmg = State.run.atk;
        
        // Crit Check
        let isCrit = Math.random() < (State.run.crit / 100);
        if (isCrit) {
            dmg *= CONFIG.critMult;
            const bleed = State.run.skills.find(s => s.id === 'bleed');
            if (bleed) dmg += (50 * bleed.lvl);
        }

        // Variance
        dmg = Math.floor(dmg * (0.9 + Math.random() * 0.2));

        // Skill: Boom
        const boom = State.run.skills.find(s => s.id === 'boom');
        if (boom && State.combat.turnCount % 4 === 0) {
            const boomDmg = 80 * boom.lvl;
            dmg += boomDmg;
            setTimeout(() => UI.spawnDmg("BOOM!", '#f97316', 'vis-enemy'), 200);
        }

        // Apply Damage
        State.combat.hp -= dmg;
        UI.spawnDmg(dmg, isCrit ? '#facc15' : '#fff', 'vis-enemy');
        UI.shake('vis-enemy');

        // Skill: Lifesteal
        const shadow = State.run.skills.find(s => s.id === 'shadow');
        if (shadow) {
            const heal = Math.floor(dmg * (0.05 * shadow.lvl));
            Engine.heal(heal, false); // silent heal
        }

        // Check Win
        if (State.combat.hp <= 0) {
            setTimeout(() => Engine.endCombat(true), 500 / State.config.speed);
            return;
        }

        // --- ENEMY TURN (Delayed) ---
        setTimeout(() => {
            if (State.combat.hp <= 0) return;

            // Skill: Ice (Freeze)
            const ice = State.run.skills.find(s => s.id === 'ice');
            if (ice && Math.random() < (0.15 * ice.lvl)) {
                UI.spawnDmg("GELÉ!", "#06b6d4", "vis-enemy");
                setTimeout(Engine.combatTurn, 800 / State.config.speed);
                return;
            }

            let eDmg = State.combat.atk;

            // Debuffs
            const weak = State.run.skills.find(s => s.id === 'weak');
            if (weak) eDmg *= (1 - (0.10 * weak.lvl));

            // Mitigation
            let reduction = State.run.def * 0.5; // Armor formula
            let finalDmg = Math.max(1, Math.floor(eDmg - reduction));

            // Dodge
            const dodge = State.run.skills.find(s => s.id === 'dodge');
            if (dodge && Math.random() < (0.03 * dodge.lvl)) {
                UI.spawnDmg("ESQUIVE", "#fff", "vis-hero");
                finalDmg = 0;
            }

            // Shield Absorb
            if (finalDmg > 0 && State.run.shield > 0) {
                const absorb = Math.min(State.run.shield, finalDmg);
                State.run.shield -= absorb;
                finalDmg -= absorb;
                UI.spawnDmg(`BLOCK ${absorb}`, "#3b82f6", "vis-hero");
            }

            // Apply Dmg
            if (finalDmg > 0) {
                State.run.hp -= finalDmg;
                UI.spawnDmg(finalDmg, "#ef4444", "vis-hero");
                UI.shake('vis-hero');
            }

            // DOTS (End of turn)
            const poison = State.run.skills.find(s => s.id === 'poison');
            if (poison) {
                const dot = Math.floor(State.combat.maxHp * 0.05 * poison.lvl);
                State.combat.hp -= dot;
                UI.spawnDmg(dot, "#22c55e", "vis-enemy");
            }

            UI.renderCombat();
            UI.update();

            // Check Defeat
            if (State.run.hp <= 0) {
                Engine.endCombat(false);
            } else {
                setTimeout(Engine.combatTurn, 800 / State.config.speed);
            }

        }, 600 / State.config.speed);
    },

    endCombat: (win) => {
        State.combat.active = false;
        
        if (win) {
            UI.log("Cible éliminée.", 'success');
            UI.txt("VICTOIRE", "Zone Sécurisée");
            
            // Loot
            const gold = (State.run.day * 5) + 10;
            State.data.gold += gold;
            UI.toast(`+${gold} Crédits`, 'success');

            // Boss Loot
            if (State.combat.enemy.hp > 2000) {
                State.data.perls += 10;
                UI.toast("+10 Perles", 'loot');
            }

            // Skill Regen
            const regen = State.run.skills.find(s => s.id === 'heal');
            if (regen) Engine.heal(Math.floor(State.run.maxHp * 0.03 * regen.lvl));

            UI.btn("CONTINUER", "", Engine.nextDay);
            Engine.checkAuto();
        } else {
            UI.log("Signaux vitaux perdus.", 'error');
            UI.txt("ÉCHEC CRITIQUE", "Rapatriement...");
            State.run.active = false;
            UI.btn("RELANCER SYSTÈME", "", Engine.startRun);
        }
        StateManager.save();
        UI.update();
        
        // Hide Combat
        document.getElementById('enemy-container').classList.add('hidden');
        document.getElementById('narrative-layer').classList.remove('hidden');
    },

    // --- EVENTS & UTILS ---
    triggerEvent: () => {
        const evs = [
            { t: "Caisse de Ravitaillement", d: "Crédits trouvés", f:()=>{ State.data.gold += 50; UI.toast("+50 Crédits"); }},
            { t: "Terminal de Données", d: "Nouveau module", f:()=>{ UI.modal('skill'); }},
            { t: "Nano-Réparateurs", d: "Soin 30%", f:()=>{ Engine.heal(State.run.maxHp * 0.3); }}
        ];
        const e = evs[Math.floor(Math.random() * evs.length)];
        UI.txt(e.t, e.d);
        e.f();
        UI.btn("CONTINUER", "", Engine.nextDay);
        Engine.checkAuto();
    },

    heal: (amount, showToast = true) => {
        State.run.hp = Math.min(State.run.maxHp, State.run.hp + amount);
        if (showToast) UI.toast(`Réparation +${Math.floor(amount)}`, 'success');
        UI.update();
    },

    openChest: () => {
        if (State.data.perls >= 5) {
            State.data.perls -= 5;
            // Generate Item
            const type = ['weapon', 'head', 'pet'][Math.floor(Math.random()*3)];
            const pool = DB.baseItems[type];
            const base = pool[Math.floor(Math.random()*pool.length)];
            
            // Determine Rarity
            const roll = Math.random();
            let rarity = 'common';
            if (roll < 0.01) rarity = 'mythic';
            else if (roll < 0.05) rarity = 'legendary';
            else if (roll < 0.15) rarity = 'epic';
            else if (roll < 0.30) rarity = 'rare';
            else if (roll < 0.60) rarity = 'uncommon';

            const rData = DB.rarity[rarity];
            const stats = Math.floor(base.s * rData.mult);
            
            const newItem = {
                uid: Date.now(),
                n: `${DB.itemPrefixes[Math.floor(Math.random()*DB.itemPrefixes.length)]} ${base.n}`,
                i: base.i,
                s: stats,
                t: type,
                r: rarity,
                d: base.e ? "Effet élémentaire" : "Statistiques pures",
                e: base.e || null
            };

            State.data.inventory.push(newItem);
            StateManager.save();
            UI.update();
            UI.toast(`Obtenu: ${newItem.n}`, 'loot');
        } else {
            UI.toast("Ressources insuffisantes (5✨)", 'error');
        }
    },

    equipItem: (idx) => {
        const item = State.data.inventory[idx];
        const type = item.t;
        
        if (State.data.gear[type]) {
            State.data.inventory.push(State.data.gear[type]);
        }
        State.data.gear[type] = item;
        State.data.inventory.splice(idx, 1);
        
        // Full heal at hub
        if (!State.run.active) State.run.hp = 99999;
        
        StateManager.save();
        StateManager.recalc();
        UI.update();
    },

    addSkill: (id, silent = false) => {
        const exists = State.run.skills.find(s => s.id === id);
        if (exists) {
            exists.lvl++;
            if(!silent) UI.toast(`${DB.skills[id].n} Amélioré`, 'success');
        } else {
            State.run.skills.push({ id: id, lvl: 1 });
            if(!silent) UI.toast(`${DB.skills[id].n} Acquis`, 'success');
        }
        StateManager.recalc();
        UI.update();
    },

    pickSkill: (id) => {
        Engine.addSkill(id);
        UI.closeModal();
        Engine.checkAuto();
    },

    applyShop: (type) => {
        if(type==='heal') Engine.heal(State.run.maxHp);
        if(type==='atk') { State.run.atk += 10; UI.toast("Armes calibrées", 'success'); }
        UI.closeModal();
        Engine.checkAuto();
    },

    upgrade: (stat) => {
        const cost = 100 + (State.data.stats[stat] * 100);
        if (State.data.gold >= cost) {
            State.data.gold -= cost;
            State.data.stats[stat]++;
            StateManager.save();
            UI.update();
            UI.toast("Mise à jour installée", 'success');
        } else {
            UI.toast("Crédits insuffisants", 'error');
        }
    },

    // --- AUTOMATION ---
    toggleAuto: () => {
        State.config.auto = !State.config.auto;
        document.getElementById('btn-auto').innerText = State.config.auto ? "AUTO: ON" : "AUTO: OFF";
        document.getElementById('btn-auto').classList.toggle('active');
        if(State.config.auto) Engine.checkAuto();
    },

    toggleSpeed: () => {
        State.config.speed = State.config.speed === 1 ? 2 : 1;
        document.getElementById('btn-spd').innerText = `VIT: x${State.config.speed}`;
    },

    checkAuto: () => {
        if (!State.config.auto || !State.run.active) return;
        // Don't click if modal is open
        if (!document.getElementById('modal-overlay').classList.contains('hidden')) return;

        clearTimeout(State.config.timer);
        State.config.timer = setTimeout(() => {
            const btn = document.getElementById('btn-main');
            if (!btn.disabled && !btn.innerText.includes("...")) {
                btn.click();
            }
        }, 800 / State.config.speed);
    },

    autoLoop: () => {
        if(State.config.auto && !State.combat.active) {
            Engine.checkAuto();
        }
    }
};

// --- BOOT ---
window.onload = Engine.init;
