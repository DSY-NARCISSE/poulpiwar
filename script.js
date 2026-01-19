/**
 * OCTO GO: INFINITY - STABLE V14 MONOLITH
 * Architecture simplifiée pour garantir le chargement sur GitHub Pages.
 */

// --- BASE DE DONNÉES ---
const DB = {
    chars: ["🐙", "🦈", "🐢", "👽", "🤖"],
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
        'heal': {n:"Soin", i:"💚", c:"text-emerald-400", d:l=>`Régène ${5*l}%`}
    },
    enemies: [
        {n:"Crabe", hp:50, atk:5, i:"🦀"}, {n:"Méduse", hp:40, atk:8, i:"🪼"}, {n:"Requin", hp:80, atk:12, i:"🦈"}
    ],
    bosses: [
        {n:"KRAKEN", hp:500, atk:20, i:"🦑"}, {n:"LÉVIATHAN", hp:800, atk:30, i:"🐉"}
    ]
};

// --- ÉTAT DU JEU ---
let State = {
    data: { gold:0, perls:50, lvl:1, stats:{hp:0,atk:0,def:0}, weapon:null, head:null, pet:null, inv:[], char:null },
    run: { active:false, day:0, hp:100, maxHp:100, atk:10, def:0, skills:[] },
    combat: { active:false, hp:0, max:0, atk:0, boss:false },
    conf: { speed:1, auto:false, tmr:null }
};

let CurrentAction = null;

// --- MOTEUR (CORE) ---
const Core = {
    init: () => {
        UI.log("Initialisation du noyau...", "sys");
        const s = localStorage.getItem('octo_v14_stable');
        if(s) try { State.data = JSON.parse(s); } catch(e) { console.error(e); }

        if(!State.data.char) {
            UI.showModal('char');
        } else {
            Core.calcStats();
            UI.updateAll();
            UI.log("Système prêt.", "success");
            
            // État du bouton
            if(State.run.active && !State.combat.active) {
                UI.btn("CONTINUER MISSION", "", Core.nextDay);
                UI.txt("EN ATTENTE", "Mission en cours");
            } else if(State.combat.active) {
                // Crash recovery
                State.combat.active = false; // Reset combat buggé
                UI.btn("REPRENDRE", "", Core.nextDay);
            } else {
                UI.btn("DÉMARRER MISSION", "", Core.startRun);
            }
        }
    },

    save: () => localStorage.setItem('octo_v14_stable', JSON.stringify(State.data)),
    
    hardReset: () => { 
        if(confirm("⚠ ATTENTION : FORMATAGE COMPLET ?")) { 
            localStorage.clear(); location.reload(); 
        } 
    },

    calcStats: () => {
        State.run.maxHp = 100 + (State.data.stats.hp * 20);
        State.run.atk = 10 + (State.data.stats.atk * 5);
        State.run.def = 0 + (State.data.stats.def * 2);
        
        if(State.data.weapon) State.run.atk += State.data.weapon.s;
        if(State.data.head) { State.run.def += State.data.head.s; State.run.maxHp += State.data.head.s; }
        if(State.data.pet) State.run.atk += State.data.pet.s;
        
        State.run.hp = Math.min(State.run.hp, State.run.maxHp);
    },

    pickChar: (c) => {
        State.data.char = c;
        Core.save();
        UI.closeModal();
        UI.updateAll();
        UI.log(`Pilote identifié : ${c}`, "success");
        UI.btn("DÉMARRER MISSION", "", Core.startRun);
    },

    startRun: () => {
        Core.calcStats();
        State.run.hp = State.run.maxHp;
        State.run.day = 0;
        State.run.skills = [];
        State.run.active = true;
        
        if(State.data.pet && State.data.pet.elem) {
            let m={'FIRE':'fire','LIGHT':'elec','EARTH':'shield'};
            Core.addSkill(m[State.data.pet.elem]||'chi', true);
        }

        UI.setStage('adventure');
        UI.btn("JOUR SUIVANT", "btn-pulse", Core.nextDay);
        UI.txt("DÉPLOIEMENT", "Zone 1-1");
        UI.log("Nouvelle mission lancée.");
        Core.nextDay();
    },

    nextDay: () => {
        if(!State.run.active) return;
        State.run.day++;
        UI.updateAll();
        
        if(State.run.day % 10 === 0) { // Shop
            UI.showModal('shop');
            UI.txt("MAINTENANCE", "Ravitaillement");
        } 
        else if(Math.random() < 0.5) { // Combat
            Core.startCombat(State.run.day % 20 === 0);
        } 
        else { // Event
            let ev = [
                {t:"Coffre", d:"30 Crédits trouvés", f:()=>{State.data.gold+=30; UI.toast("+30 Crédits", "loot");}},
                {t:"Données", d:"Nouveau module", f:()=>{UI.showModal('skill');}},
                {t:"Réparation", d:"Soin 50%", f:()=>{Core.heal(50);}}
            ][Math.floor(Math.random()*3)];
            UI.txt(ev.t, ev.d); ev.f(); UI.updateAll(); Core.checkAuto();
        }
    },

    startCombat: (boss) => {
        State.combat.active = true;
        State.combat.boss = boss;
        
        // Stats ennemi
        let scale = 1 + (State.run.day * 0.1);
        let base = boss ? DB.bosses[0] : DB.enemies[Math.floor(Math.random()*DB.enemies.length)];
        
        State.combat.max = Math.floor(base.hp * scale);
        State.combat.hp = State.combat.max;
        State.combat.atk = Math.floor(base.atk * scale);
        
        UI.setStage('combat');
        document.getElementById('vis-enemy').innerText = base.i;
        document.getElementById('enemy-name').innerText = base.n;
        
        UI.txt(boss ? "ALERTE BOSS" : "HOSTILE", base.n);
        UI.btn("COMBAT...", "cursor-not-allowed grayscale", null);
        
        UI.log(`Engagement: ${base.n} (PV:${State.combat.max})`, 'combat');
        setTimeout(Core.combatTurn, 1000 / State.conf.speed);
    },

    combatTurn: () => {
        if(!State.combat.active) return;

        // Player Hit
        let dmg = State.run.atk;
        // Skills
        let fire = State.run.skills.find(s=>s.id==='fire'); if(fire) dmg += 10*fire.lvl;
        let crit = Math.random() < 0.1; if(crit) dmg *= 2;

        State.combat.hp -= dmg;
        UI.spawnDmg(dmg, crit?'#facc15':'#fff', 'vis-enemy');
        UI.updateBar();

        if(State.combat.hp <= 0) {
            setTimeout(()=>Core.endCombat(true), 500/State.conf.speed);
            return;
        }

        // Enemy Hit
        setTimeout(() => {
            if(!State.combat.active) return;
            
            let shield = State.run.skills.find(s=>s.id==='shield');
            let reduction = (State.run.def) + (shield ? 10*shield.lvl : 0);
            let edmg = Math.max(1, State.combat.atk - reduction);
            
            State.run.hp -= edmg;
            UI.spawnDmg(edmg, '#ef4444', 'vis-hero');
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
            
            // Skill Regen
            let reg = State.run.skills.find(s=>s.id==='heal');
            if(reg) Core.heal(reg.lvl*5);

            if(State.combat.boss) {
                State.data.perls += 10;
                UI.toast("BOSS VAINCU ! +10 ✨", "loot");
                Core.save();
                UI.btn("RETOUR BASE", "", Core.startRun); // Loop ou retour
            } else {
                UI.btn("CONTINUER", "", Core.nextDay);
                Core.checkAuto();
            }
        } else {
            UI.log("Signal perdu.", 'error');
            UI.txt("ÉCHEC", "Rapatriement...");
            State.run.active = false;
            UI.btn("RELANCER SYSTÈME", "", Core.startRun);
        }
        Core.save();
        UI.setStage('adventure'); // Cache l'ennemi
    },

    // --- UTILS ---
    heal: (amount) => {
        State.run.hp = Math.min(State.run.maxHp, State.run.hp + amount);
        UI.updateAll();
        UI.toast(`Réparation +${amount}`, "success");
    },

    addSkill: (id, silent=false) => {
        let x = State.run.skills.find(s=>s.id===id);
        if(x) x.lvl++; else State.run.skills.push({id:id, lvl:1});
        if(!silent) UI.toast(`${DB.skills[id].n} Installé`, "buff");
    },

    openChest: () => {
        if(State.data.perls >= 5) {
            State.data.perls -= 5;
            let it = JSON.parse(JSON.stringify(DB.items[Math.floor(Math.random()*DB.items.length)]));
            State.data.inv.push(it);
            Core.save(); UI.updateAll();
            UI.toast(`Acquis: ${it.n}`, "loot");
        } else UI.toast("Ressources insuffisantes", "error");
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
            UI.toast("Amélioration confirmée", "buff");
        } else UI.toast("Crédits insuffisants", "error");
    },

    // --- AUTO ---
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
            let btn = document.getElementById('btn-main');
            if(!btn.disabled && !btn.innerText.includes("...")) btn.click();
        }, 1000 / State.conf.speed);
    }
};

// --- UI MANAGER ---
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
            document.getElementById('ui-atk').innerText = State.run.atk;
            document.getElementById('ui-def').innerText = State.run.def;
            document.getElementById('ui-day').innerText = State.run.day;
            
            // Skills
            let sl = document.getElementById('list-skills'); sl.innerHTML = '';
            State.run.skills.forEach(s => {
                let d = DB.skills[s.id];
                sl.innerHTML += `<div class="bg-white/5 p-2 rounded text-xs flex justify-between items-center mb-1">
                    <span class="${d.c} font-bold">${d.i} ${d.n}</span><span class="text-slate-400">Niv.${s.lvl}</span>
                </div>`;
            });
        }

        // Slots
        const setS = (id, it, p) => { document.getElementById(id).innerText = it ? it.e : p; };
        setS('slot-w', State.data.weapon, '⚔️');
        setS('slot-h', State.data.head, '🛡️');
        setS('slot-p', State.data.pet, '🐾');

        // Inv
        let gi = document.getElementById('grid-inv'); gi.innerHTML = '';
        State.data.inv.forEach((it, i) => {
            let d = document.createElement('div'); d.className = `slot ${it.r}`; d.innerText = it.e;
            d.onclick = () => Core.equip(i);
            d.onmouseenter = (e) => UI.tip(e, it.n, `+${it.s} Stats`); d.onmouseleave = UI.hideTip;
            gi.appendChild(d);
        });

        if(State.data.char) document.getElementById('vis-hero').innerText = State.data.char;
    },

    updateBar: () => {
        document.getElementById('ui-enemy-bar').style.width = (State.combat.hp/State.combat.max*100)+"%";
    },

    // --- NAVIGATION ---
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

    // --- INTERACTION ---
    btn: (txt, cls, act) => {
        let b = document.getElementById('btn-main');
        b.innerText = txt;
        b.className = `btn-mega ${cls||''}`;
        CurrentAction = act;
        b.disabled = (act === null);
    },

    txt: (t, s) => {
        document.getElementById('txt-main').innerText = t;
        document.getElementById('txt-sub').innerText = s;
    },

    log: (m, type='info') => {
        let b = document.getElementById('game-logs');
        let c = 'text-slate-400';
        if(type==='combat') c='text-red-400';
        if(type==='success') c='text-green-400';
        if(type==='loot') c='text-purple-400';
        b.innerHTML = `<div class="log-line"><span class="${c}">> ${m}</span></div>` + b.innerHTML;
    },

    // --- MODALS ---
    showModal: (type) => {
        let o = document.getElementById('modal-overlay');
        let c = document.getElementById('modal-content');
        o.classList.remove('hidden'); setTimeout(()=>o.classList.add('active'),10);
        
        if(type === 'char') {
            c.innerHTML = `<h2 class="text-2xl font-bold text-white mb-4">IDENTIFICATION</h2>
            <div class="flex gap-4 justify-center">
                ${DB.chars.map(x=>`<button onclick="Core.pickChar('${x}')" class="text-6xl hover:scale-110 transition p-4 bg-slate-800 rounded-xl">${x}</button>`).join('')}
            </div>`;
        }
        else if(type === 'shop') {
            c.innerHTML = `<h2 class="text-xl font-bold text-emerald-400 mb-4">RAVITAILLEMENT</h2>
            <button onclick="Core.heal(50);UI.closeModal();Core.checkAuto()" class="w-full p-3 bg-slate-800 mb-2 hover:bg-emerald-900 text-emerald-400 font-bold rounded">💊 Soin 50%</button>
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
                <div class="text-xs text-slate-400 mt-1">Amélioration disponible</div>
                <button onclick="Core.addSkill('${k}');UI.closeModal();Core.checkAuto()" class="mt-4 w-full py-2 bg-yellow-600 text-black font-bold rounded hover:bg-yellow-500">INSTALLER</button>
            </div>`;
        }
    },
    closeModal: () => {
        let o = document.getElementById('modal-overlay');
        o.classList.remove('active'); setTimeout(()=>o.classList.add('hidden'),200);
    },

    // --- FX ---
    toast: (m, t) => {
        let d = document.createElement('div');
        let c = 'border-blue-500';
        if(t==='loot') c='border-purple-500'; if(t==='buff') c='border-yellow-500';
        d.className = `toast ${c}`; d.innerText = m;
        document.getElementById('toast-container').appendChild(d);
        setTimeout(()=>d.remove(), 2500);
    },
    spawnDmg: (t, c, id) => {
        let el = document.createElement('div'); el.className='dmg-text'; el.style.color=c; el.innerText=t;
        let r = document.getElementById(id).getBoundingClientRect();
        el.style.left=(r.left+r.width/2)+"px"; el.style.top=r.top+"px";
        document.getElementById('particle-layer').appendChild(el);
        setTimeout(()=>el.remove(), 800);
    },
    tip: (e, t, b) => {
        let el = document.getElementById('floating-tooltip');
        el.innerHTML = `<div class="font-bold border-b border-white/10 pb-1 mb-1">${t}</div><div class="text-xs text-slate-300">${b}</div>`;
        el.classList.remove('hidden');
        el.style.left=(e.clientX+15)+'px'; el.style.top=(e.clientY+15)+'px';
    },
    hideTip: () => document.getElementById('floating-tooltip').classList.add('hidden')
};

// --- BOOT ---
window.onload = Core.init;
