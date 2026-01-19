/**
 * OCTO GO: INFINITY - STABLE MONOLITH V14
 * Script fusionné pour fiabilité maximale sur GitHub Pages.
 */

// --- BASE DE DONNÉES ---
const DB = {
    chars: [
        {id:"🐙", n:"Poulpe", d:"Équilibré"}, {id:"🦈", n:"Requin", d:"Offensif"}, 
        {id:"🐢", n:"Tortue", d:"Défensif"}, {id:"👽", n:"Alien", d:"Tech"}
    ],
    items: [
        {n:"Trident",e:"🔱",s:15,t:"weapon",r:"r-common",d:"Standard"}, {n:"Dague",e:"🗡️",s:10,t:"weapon",r:"r-common",d:"Rapide"},
        {n:"Casque",e:"🪖",s:5,t:"head",r:"r-common",d:"Def"}, {n:"Armure",e:"🛡️",s:10,t:"head",r:"r-common",d:"Solid"},
        {n:"Dragon",e:"🐉",s:15,t:"pet",r:"r-rare",elem:"FIRE",d:"Feu"}, {n:"Nuage",e:"☁️",s:10,t:"pet",r:"r-rare",elem:"LIGHT",d:"Choc"},
        {n:"Couronne",e:"👑",s:30,t:"head",r:"r-legendary",d:"Royal"}
    ],
    skills: {
        'fire': {n:"Feu", i:"🔥", c:"text-orange-500", d:l=>`Brûlure ${8*l} dmg`},
        'poison': {n:"Poison", i:"🤢", c:"text-green-500", d:l=>`Poison ${5*l}%`},
        'elec': {n:"Foudre", i:"⚡", c:"text-yellow-400", d:l=>`Choc ${10*l} dmg`},
        'chi': {n:"Chi", i:"🧠", c:"text-blue-400", d:l=>`Stats +${5*l}%`},
        'shield': {n:"Bouclier", i:"🛡️", c:"text-cyan-400", d:l=>`Absorbe ${25*l} dmg`},
        'heal': {n:"Soin", i:"💚", c:"text-emerald-400", d:l=>`Régène ${5*l}%`},
        'crit': {n:"Précision", i:"🎯", c:"text-red-400", d:l=>`Critique +${5*l}%`}
    },
    enemies: {
        z1: [{n:"Crabe", hp:50, atk:5, i:"🦀"}, {n:"Crevette", hp:40, atk:8, i:"🦐"}, {n:"Poisson", hp:60, atk:4, i:"🐟"}],
        z2: [{n:"Murène", hp:150, atk:15, i:"🐍"}, {n:"Tortue", hp:300, atk:10, i:"🐢"}],
        boss: [{n:"KRAKEN", hp:1000, atk:30, i:"🦑"}, {n:"LÉVIATHAN", hp:2000, atk:50, i:"🐋"}]
    }
};

// --- ÉTAT ---
let State = {
    data: { gold:0, perls:50, lvl:1, stats:{hp:0,atk:0,def:0}, weapon:null, head:null, pet:null, inv:[], char:null },
    run: { active:false, day:0, hp:100, maxHp:100, atk:10, def:0, crit:5, spd:1, skills:[], shield:0 },
    combat: { active:false, hp:0, max:0, atk:0, boss:false },
    conf: { speed:1, auto:false, tmr:null }
};

// --- CORE ---
const Core = {
    init: () => {
        console.log("System Init...");
        let s = localStorage.getItem('octo_v14_save');
        if(s) try { State.data = JSON.parse(s); } catch(e) { console.error(e); }

        if(!State.data.char) {
            UI.modal('char');
        } else {
            Core.calcStats();
            UI.updateAll();
            UI.log("Système en ligne.");
            // Restaurer état bouton
            if(State.run.active && !State.combat.active) UI.btn("CONTINUER", "", Core.nextDay);
            else if(State.combat.active) { State.combat.active = false; UI.btn("REPRENDRE", "", Core.nextDay); } // Crash recovery
            else UI.btn("DÉMARRER");
        }
    },

    save: () => localStorage.setItem('octo_v14_save', JSON.stringify(State.data)),
    
    hardReset: () => { 
        if(confirm("FORMATAGE SYSTÈME ?")) { localStorage.clear(); location.reload(); } 
    },

    // Calcul Stats (Important : prend en compte les upgrades du hub)
    calcStats: () => {
        let baseHp = 100 + (State.data.stats.hp * 20);
        let baseAtk = 10 + (State.data.stats.atk * 5);
        let baseDef = 0 + (State.data.stats.def * 2);
        
        if(State.data.weapon) baseAtk += State.data.weapon.s;
        if(State.data.head) { baseDef += State.data.head.s; baseHp += State.data.head.s; }
        if(State.data.pet) baseAtk += State.data.pet.s;

        // Passifs
        if(State.run.active) {
            let chi = State.run.skills.find(s=>s.id==='chi');
            if(chi) { let m = 1+(0.05*chi.lvl); baseHp*=m; baseAtk*=m; baseDef*=m; }
            let crit = State.run.skills.find(s=>s.id==='crit');
            if(crit) State.run.crit = 5 + (5*crit.lvl);
        }

        State.run.maxHp = Math.floor(baseHp);
        State.run.atk = Math.floor(baseAtk);
        State.run.def = Math.floor(baseDef);
        
        // Clamp HP
        if(State.run.hp > State.run.maxHp) State.run.hp = State.run.maxHp;
    },

    pickChar: (c) => {
        State.data.char = c; Core.save(); UI.closeModal(); UI.updateAll();
        UI.log("Pilote identifié.", "success");
    },

    startRun: () => {
        Core.calcStats();
        State.run.hp = State.run.maxHp;
        State.run.day = 0;
        State.run.skills = [];
        State.run.active = true;
        State.run.shield = 0;
        
        // Pet Skill
        if(State.data.pet && State.data.pet.elem) {
            let m={'FIRE':'fire','LIGHT':'elec','EARTH':'shield'};
            Core.addSkill(m[State.data.pet.elem]||'chi', true);
        }

        UI.setStage('adventure');
        UI.btn("JOUR SUIVANT", "btn-pulse", Core.nextDay);
        UI.txt("DÉPLOIEMENT", "Zone 1-1");
        Core.nextDay();
    },

    nextDay: () => {
        if(!State.run.active) return;
        State.run.day++;
        Core.calcStats();
        UI.updateAll();

        // Check Boss
        if(State.run.day % 20 === 0) { Core.startCombat(true); return; }

        let r = Math.random();
        if(State.run.day % 10 === 0) { // Shop
            UI.modal('shop'); UI.txt("REPOS", "Maintenance");
        } else if(r < 0.6) { // Combat
            Core.startCombat(false);
        } else { // Event
            let ev = [
                {t:"Ravitaillement", d:"+30 Crédits", f:()=>{State.data.gold+=30; UI.toast("+30 Crédits", "loot");}},
                {t:"Données", d:"Nouveau module", f:()=>{UI.modal('skill');}},
                {t:"Réparation", d:"Soin 50%", f:()=>{Core.heal(State.run.maxHp/2);}}
            ][Math.floor(Math.random()*3)];
            UI.txt(ev.t, ev.d); ev.f(); UI.updateAll(); Core.checkAuto();
        }
    },

    startCombat: (boss) => {
        State.combat.active = true;
        State.combat.boss = boss;
        
        // Enemy Gen
        let zone = State.run.day < 20 ? 'z1' : 'z2';
        let pool = boss ? DB.bosses : DB.enemies[zone];
        let en = pool[Math.floor(Math.random()*pool.length)];
        
        let scale = 1 + (State.run.day * 0.1);
        State.combat.max = Math.floor(en.hp * scale);
        State.combat.hp = State.combat.max;
        State.combat.atk = Math.floor(en.atk * scale);
        
        // UI
        UI.setStage('combat');
        document.getElementById('vis-enemy').innerText = en.i;
        document.getElementById('enemy-name').innerText = en.n;
        UI.txt(boss?"ALERTE BOSS":"HOSTILE", en.n);
        UI.btn("COMBAT...", "cursor-not-allowed grayscale", null);
        UI.log(`Combat initié: ${en.n}`, 'combat');

        // Start Shield
        let sh = State.run.skills.find(s=>s.id==='shield');
        if(sh) { State.run.shield = 50 * sh.lvl; UI.toast(`Bouclier ${State.run.shield}`, "buff"); }

        setTimeout(Core.combatTurn, 1000/State.conf.speed);
    },

    combatTurn: () => {
        if(!State.combat.active) return;

        // Player
        let dmg = State.run.atk;
        // Skills
        let fire = State.run.skills.find(s=>s.id==='fire'); if(fire) dmg += 10*fire.lvl;
        let isCrit = Math.random() < (State.run.crit/100); if(isCrit) dmg *= 2;

        State.combat.hp -= dmg;
        UI.spawnDmg(dmg, isCrit?'#fbbf24':'#fff', 'vis-enemy');
        UI.updateBar();

        if(State.combat.hp <= 0) {
            setTimeout(()=>Core.endCombat(true), 500/State.conf.speed);
            return;
        }

        // Enemy
        setTimeout(() => {
            if(!State.combat.active) return;
            
            let edmg = State.combat.atk;
            // Shield
            if(State.run.shield > 0) {
                let abs = Math.min(State.run.shield, edmg);
                State.run.shield -= abs; edmg -= abs;
                UI.spawnDmg(`BLOC ${abs}`, '#3b82f6', 'vis-hero');
            }
            
            let final = Math.max(1, edmg - State.run.def);
            State.run.hp -= final;
            UI.spawnDmg(final, '#ef4444', 'vis-hero');
            UI.updateAll();

            if(State.run.hp <= 0) Core.endCombat(false);
            else setTimeout(Core.combatTurn, 800/State.conf.speed);
        }, 500/State.conf.speed);
    },

    endCombat: (win) => {
        State.combat.active = false;
        if(win) {
            UI.log("Cible éliminée.", 'success');
            UI.txt("VICTOIRE", "Zone sécurisée");
            State.data.gold += 10 + State.run.day;
            
            if(State.combat.boss) {
                State.data.perls += 10;
                UI.toast("BOSS VAINCU ! +10 ✨", "loot");
                Core.save();
                UI.btn("RETOUR BASE", "", Core.startRun);
            } else {
                UI.btn("CONTINUER", "", Core.nextDay);
                Core.checkAuto();
            }
        } else {
            UI.log("Signal vital perdu.", 'error');
            UI.txt("ÉCHEC", "Rapatriement...");
            State.run.active = false;
            UI.btn("RELANCER SYSTÈME", "", Core.startRun);
        }
        Core.save();
        UI.setStage('adventure');
    },

    // UTILS
    heal: (v) => { State.run.hp = Math.min(State.run.maxHp, State.run.hp + v); UI.updateAll(); UI.toast(`Réparation +${v}`, "success"); },
    
    addSkill: (id, silent=false) => {
        let x = State.run.skills.find(s=>s.id===id);
        if(x) x.lvl++; else State.run.skills.push({id:id, lvl:1});
        if(!silent) UI.toast(`${DB.skills[id].n} Installé`, "buff");
        Core.calcStats();
    },

    openChest: () => {
        if(State.data.perls >= 5) {
            State.data.perls -= 5;
            let it = JSON.parse(JSON.stringify(DB.items[Math.floor(Math.random()*DB.items.length)]));
            State.data.inv.push(it);
            Core.save(); UI.updateAll(); UI.toast(`Acquis: ${it.n}`, "loot");
        } else UI.toast("5 Perles requises", "error");
    },

    equip: (i) => {
        let it = State.data.inv[i];
        if(State.data[it.t]) State.data.inv.push(State.data[it.t]);
        State.data[it.t] = it; State.data.inv.splice(i,1);
        Core.save(); Core.calcStats(); UI.updateAll();
    },

    upgrade: (t) => {
        let cost = 100 + (State.data.stats[t]*100);
        if(State.data.gold >= cost) {
            State.data.gold -= cost; State.data.stats[t]++;
            Core.save(); Core.calcStats(); UI.updateAll();
            UI.toast("Mise à jour installée", "success");
        } else UI.toast("Crédits insuffisants", "error");
    },

    // AUTO
    toggleAuto: () => {
        State.conf.auto = !State.conf.auto;
        document.getElementById('btn-auto').innerText = State.conf.auto ? "AUTO: ON" : "AUTO: OFF";
        document.getElementById('btn-auto').classList.toggle('active');
        if(State.conf.auto) Core.checkAuto();
    },
    toggleSpeed: () => {
        State.conf.speed = State.conf.speed===1 ? 2 : 1;
        document.getElementById('btn-spd').innerText = `VIT: x${State.conf.speed}`;
    },
    checkAuto: () => {
        if(!State.conf.auto || !State.run.active) return;
        if(!document.getElementById('modal-overlay').classList.contains('hidden')) return;
        clearTimeout(State.conf.tmr);
        State.conf.tmr = setTimeout(() => {
            let b = document.getElementById('btn-main');
            if(!b.disabled && !b.innerText.includes("...")) b.click();
        }, 1000/State.conf.speed);
    },
    
    // Action centrale
    mainAction: () => {
        if(!State.run.active) Core.startRun();
        else Core.nextDay();
    }
};

// --- UI ---
const UI = {
    updateAll: () => {
        // Resources
        document.getElementById('ui-gold').innerText = State.data.gold;
        document.getElementById('ui-perls').innerText = State.data.perls;
        
        // Hub Costs
        ['hp','atk','def'].forEach(k => {
            document.getElementById(`lvl-${k}`).innerText = State.data.stats[k];
            document.getElementById(`cost-${k}`).innerText = 100 + (State.data.stats[k]*100);
        });

        // Run Infos
        if(State.run.active || State.data.char) {
            document.getElementById('ui-hp-txt').innerText = `${Math.floor(State.run.hp)}/${State.run.maxHp}`;
            document.getElementById('ui-hp-bar').style.width = (State.run.hp/State.run.maxHp*100) + "%";
            document.getElementById('ui-shield-txt').innerText = Math.floor(State.run.shield);
            document.getElementById('ui-shield-bar').style.width = State.run.shield > 0 ? "100%" : "0%";
            
            document.getElementById('ui-atk').innerText = State.run.atk;
            document.getElementById('ui-def').innerText = State.run.def;
            document.getElementById('ui-crit').innerText = State.run.crit + "%";
            document.getElementById('ui-spd').innerText = State.run.spd + "x";
            document.getElementById('ui-day').innerText = State.run.day;
            
            let sl = document.getElementById('list-skills'); sl.innerHTML = '';
            State.run.skills.forEach(s => {
                let d = DB.skills[s.id];
                sl.innerHTML += `<div class="bg-white/5 p-2 rounded text-xs flex justify-between items-center mb-1 group hover:bg-white/10" onmouseenter="UI.tip(event, '${d.n}', '${d.d(s.lvl)}')" onmouseleave="UI.untip()">
                    <span class="${d.c} font-bold text-lg">${d.i} ${d.n}</span><span class="text-slate-400">Niv.${s.lvl}</span>
                </div>`;
            });
        }

        // Slots
        const setS = (id, it, p) => { 
            let el = document.getElementById(id);
            if(it) {
                el.innerText = it.e; el.className = `slot ${it.r}`;
                el.onmouseenter = (e) => UI.tip(e, it.n, `+${it.s} Stats`);
            } else {
                el.innerText = p; el.className = "slot border-slate-700 text-slate-700"; el.onmouseenter = null;
            }
            el.onmouseleave = UI.untip;
        };
        setS('slot-w', State.data.weapon, '⚔️'); setS('slot-h', State.data.head, '🛡️'); setS('slot-p', State.data.pet, '🐾');

        // Inv
        let gi = document.getElementById('grid-inv'); gi.innerHTML = '';
        State.data.inv.forEach((it, i) => {
            let d = document.createElement('div'); d.className = `slot ${it.r}`; d.innerText = it.e;
            d.onclick = () => Core.equip(i);
            d.onmouseenter = (e) => UI.tip(e, it.n, `+${it.s} Stats`); d.onmouseleave = UI.untip;
            gi.appendChild(d);
        });

        if(State.data.char) document.getElementById('vis-hero').innerText = State.data.char;
    },

    updateBar: () => document.getElementById('ui-enemy-bar').style.width = (State.combat.hp/State.combat.max*100)+"%",

    setStage: (mode) => {
        let c = document.getElementById('enemy-container');
        let t = document.getElementById('narrative-layer');
        if(mode === 'combat') {
            c.classList.remove('hidden', 'opacity-0');
            t.classList.add('hidden');
        } else {
            c.classList.add('hidden', 'opacity-0');
            t.classList.remove('hidden');
        }
    },

    switchTab: (tab) => {
        document.getElementById('view-hub').classList.toggle('hidden', tab !== 'hub');
        document.getElementById('nav-adv').classList.toggle('active', tab === 'adventure');
        document.getElementById('nav-hub').classList.toggle('active', tab === 'hub');
    },

    btn: (txt, cls, act) => {
        let b = document.getElementById('btn-main');
        b.innerText = txt; b.className = `btn-mega ${cls||''}`;
        if(act === null) b.disabled = true;
        else { b.disabled = false; b.onclick = act || Core.mainAction; }
    },

    txt: (t, s) => { document.getElementById('txt-main').innerText=t; document.getElementById('txt-sub').innerText=s; },
    
    log: (m, type='info') => {
        let b = document.getElementById('game-logs');
        let c = type==='combat' ? 'text-red-400' : (type==='success' ? 'text-green-400' : 'text-slate-400');
        b.innerHTML = `<div class="mb-1"><span class="${c}">> ${m}</span></div>` + b.innerHTML;
    },

    // MODALS
    modal: (type) => {
        let o = document.getElementById('modal-overlay');
        let c = document.getElementById('modal-content');
        o.classList.remove('hidden');
        
        if(type === 'char') {
            c.innerHTML = `<h2 class="text-2xl font-bold text-white mb-4">IDENTIFICATION</h2><div class="flex gap-4 justify-center">${DB.chars.map(x=>`<button onclick="Core.pickChar('${x.id}')" class="text-6xl hover:scale-110 transition p-4 bg-slate-800 rounded-xl">${x.id}</button>`).join('')}</div>`;
        }
        else if(type === 'shop') {
            c.innerHTML = `<h2 class="text-xl font-bold text-emerald-400 mb-4">RAVITAILLEMENT</h2>
            <button onclick="Core.heal(State.run.maxHp/2);UI.closeModal();Core.checkAuto()" class="w-full p-3 bg-slate-800 mb-2 hover:bg-emerald-900 text-emerald-400 font-bold rounded">💊 Soin 50%</button>
            <button onclick="State.run.atk+=5;UI.toast('+5 ATK','buff');UI.closeModal();Core.checkAuto()" class="w-full p-3 bg-slate-800 hover:bg-blue-900 text-blue-400 font-bold rounded">⚔️ Calibrage (+5 ATK)</button>`;
        }
        else if(type === 'skill') {
            let keys = Object.keys(DB.skills);
            let k = keys[Math.floor(Math.random()*keys.length)];
            let s = DB.skills[k];
            c.innerHTML = `<h2 class="text-xl font-bold text-yellow-400 mb-4">MODULE TROUVÉ</h2>
            <div class="p-4 bg-slate-800 rounded text-center">
                <div class="text-4xl mb-2">${s.i}</div>
                <div class="font-bold text-white">${s.n}</div>
                <button onclick="Core.addSkill('${k}');UI.closeModal();Core.checkAuto()" class="mt-4 w-full py-2 bg-yellow-600 text-black font-bold rounded hover:bg-yellow-500">INSTALLER</button>
            </div>`;
        }
    },
    closeModal: () => document.getElementById('modal-overlay').classList.add('hidden'),

    // FX
    toast: (m, t) => {
        let d = document.createElement('div');
        let c = t==='loot'?'border-purple-500':(t==='buff'?'border-yellow-500':'border-blue-500');
        d.className = `toast ${c}`; d.innerText = m;
        document.getElementById('toast-container').appendChild(d); setTimeout(()=>d.remove(), 2500);
    },
    spawnDmg: (t, c, id) => {
        let el = document.createElement('div'); el.className='dmg-text'; el.style.color=c; el.innerText=t;
        let r = document.getElementById(id).getBoundingClientRect();
        el.style.left=(r.left+r.width/2)+"px"; el.style.top=r.top+"px";
        document.getElementById('particle-layer').appendChild(el); setTimeout(()=>el.remove(), 800);
    },
    tip: (e, t, b) => {
        let el = document.getElementById('floating-tooltip');
        el.innerHTML = `<div class="font-bold border-b border-white/10 pb-1 mb-1">${t}</div><div class="text-xs text-slate-300">${b}</div>`;
        el.classList.remove('hidden');
        el.style.left=(e.clientX+15)+'px'; el.style.top=(e.clientY+15)+'px';
    },
    hideTip: () => document.getElementById('floating-tooltip').classList.add('hidden')
};

// BOOT
window.onload = Core.init;
