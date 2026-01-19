/**
 * OCTO GO: V15 ALIVE ENGINE
 * Gestion des FX, Animations et Logique de jeu robuste.
 */

// --- 1. DATA (BASE DE DONNÉES) ---
const DB = {
    chars: [
        {id:"🐙", n:"Poulpe", d:"Équilibré et polyvalent."}, 
        {id:"🦈", n:"Requin", d:"Attaque dévastatrice."}, 
        {id:"🐢", n:"Tortue", d:"Défense impénétrable."},
        {id:"👽", n:"Alien", d:"Technologie avancée."},
        {id:"🤖", n:"Mecha", d:"Immunisé à la douleur."}
    ],
    items: [
        {n:"Trident",e:"🔱",s:15,t:"weapon",r:"r-common",d:"Arme standard"}, {n:"Dague",e:"🗡️",s:10,t:"weapon",r:"r-common",d:"Rapide"},
        {n:"Casque",e:"🪖",s:5,t:"head",r:"r-common",d:"Protection"}, {n:"Armure",e:"🛡️",s:10,t:"head",r:"r-common",d:"Solidité"},
        {n:"Dragon",e:"🐉",s:15,t:"pet",r:"r-rare",elem:"FIRE",d:"Brûle les ennemis"}, {n:"Nuage",e:"☁️",s:10,t:"pet",r:"r-rare",elem:"LIGHT",d:"Électrocute"},
        {n:"Couronne",e:"👑",s:30,t:"head",r:"r-legendary",d:"Pouvoir Royal"}, {n:"Faux",e:"🦠",s:40,t:"weapon",r:"r-epic",d:"Draine la vie"},
        {n:"Mjolnir",e:"🔨",s:50,t:"weapon",r:"r-legendary",d:"Foudre divine"}
    ],
    skills: {
        'fire': {n:"Feu", i:"🔥", c:"text-orange-500", d:l=>`Brûlure ${8*l} dmg/tour`},
        'poison': {n:"Poison", i:"🤢", c:"text-green-500", d:l=>`Poison ${5*l}% PV/tour`},
        'elec': {n:"Foudre", i:"⚡", c:"text-yellow-400", d:l=>`Choc ${15*l} dmg`},
        'chi': {n:"Chi", i:"🧠", c:"text-blue-400", d:l=>`Toutes stats +${5*l}%`},
        'shield': {n:"Bouclier", i:"🛡️", c:"text-cyan-400", d:l=>`Absorbe ${30*l} dmg`},
        'crit': {n:"Précision", i:"🎯", c:"text-red-400", d:l=>`Critique +${5*l}%`},
        'heal': {n:"Soin", i:"💚", c:"text-emerald-400", d:l=>`Régène ${5*l}% fin combat`}
    },
    enemies: {
        z1: [{n:"Crabe", hp:60, atk:6, i:"🦀"}, {n:"Crevette", hp:50, atk:8, i:"🦐"}, {n:"Poisson", hp:70, atk:5, i:"🐟"}],
        z2: [{n:"Murène", hp:180, atk:18, i:"🐍"}, {n:"Tortue", hp:400, atk:10, i:"🐢"}],
        boss: [{n:"KRAKEN", hp:1000, atk:35, i:"🦑"}, {n:"LÉVIATHAN", hp:2500, atk:60, i:"🐋"}]
    }
};

// --- 2. STATE (ÉTAT) ---
let State = {
    data: { gold:0, perls:50, lvl:1, stats:{hp:0,atk:0,def:0}, weapon:null, head:null, pet:null, inv:[], char:null },
    run: { active:false, day:0, hp:100, maxHp:100, atk:10, def:0, crit:5, spd:1, skills:[], shield:0 },
    combat: { active:false, hp:0, max:0, atk:0, boss:false },
    conf: { speed:1, auto:false, tmr:null }
};

let CurrentAction = null;

// --- 3. CORE ENGINE ---
const Core = {
    init: () => {
        console.log(">> SYSTEM INIT v15");
        const s = localStorage.getItem('octo_v15_alive');
        if(s) try { State.data = JSON.parse(s); } catch(e) { console.error(e); }

        if(!State.data.char) {
            UI.modal('char');
        } else {
            Core.calcStats();
            UI.updateAll();
            Core.checkState(); // Force UI consistency
        }
    },

    save: () => localStorage.setItem('octo_v15_alive', JSON.stringify(State.data)),
    
    hardReset: () => { 
        if(confirm("⚠ WARNING : EFFACEMENT COMPLET ?")) { localStorage.clear(); location.reload(); } 
    },

    // Analyse l'état et met à jour les boutons (Débug auto)
    checkState: () => {
        if(State.combat.active) {
            // Si on est bloqué en combat au chargement, on reset le combat pour éviter le softlock
            console.warn("Combat interrompu détecté. Reset.");
            State.combat.active = false;
            UI.btn("REPRENDRE MISSION", "btn-mega", Core.nextDay);
            UI.setStage('adventure');
        } 
        else if(State.run.active) {
            UI.btn("JOUR SUIVANT", "btn-mega", Core.nextDay);
            UI.txt("EN ATTENTE", `Jour ${State.run.day}`);
        } 
        else {
            UI.btn("DÉMARRER", "btn-mega", Core.startRun);
            UI.txt("SYSTÈME PRÊT", "En attente...");
        }
    },

    clickMain: () => {
        if(CurrentAction) CurrentAction();
        else Core.startRun();
    },

    calcStats: () => {
        let hp = 100 + (State.data.stats.hp * 25);
        let atk = 10 + (State.data.stats.atk * 5);
        let def = 0 + (State.data.stats.def * 2);
        
        if(State.data.weapon) atk += State.data.weapon.s;
        if(State.data.head) { def += State.data.head.s; hp += State.data.head.s * 2; }
        if(State.data.pet) atk += State.data.pet.s;

        // Skills Run
        if(State.run.active) {
            let chi = State.run.skills.find(s=>s.id==='chi');
            if(chi) { let m=1+(0.05*chi.lvl); hp*=m; atk*=m; def*=m; }
            let crit = State.run.skills.find(s=>s.id==='crit');
            if(crit) State.run.crit = 5 + (5*crit.lvl);
        }

        State.run.maxHp = Math.floor(hp);
        State.run.atk = Math.floor(atk);
        State.run.def = Math.floor(def);
        
        // Clamp HP (ne pas dépasser max, mais ne pas tuer le joueur si max baisse)
        if(State.run.hp > State.run.maxHp) State.run.hp = State.run.maxHp;
    },

    pickChar: (c) => {
        State.data.char = c;
        Core.save(); UI.closeModal(); UI.updateAll();
        UI.toast("Identité confirmée.", "success");
        UI.btn("DÉMARRER", "btn-mega", Core.startRun);
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
            const map = {'FIRE':'fire','LIGHT':'elec','EARTH':'shield'};
            Core.addSkill(map[State.data.pet.elem]||'chi', true);
        }

        UI.setStage('adventure');
        UI.btn("JOUR SUIVANT", "btn-mega", Core.nextDay);
        UI.txt("DÉPLOIEMENT", "Zone 1-1");
        UI.log("Séquence de mission initialisée.");
        Core.nextDay();
    },

    nextDay: () => {
        if(!State.run.active) return;
        State.run.day++;
        Core.calcStats();
        UI.updateAll();

        // Check Boss
        if(State.run.day % 20 === 0) { Core.initCombat(true); return; }

        let rng = Math.random();
        if(State.run.day % 10 === 0) {
            UI.modal('shop'); UI.txt("REPOS", "Maintenance");
        } else if(rng < 0.6) {
            Core.initCombat(false);
        } else {
            let ev = [
                {t:"Coffre", d:"30 Crédits trouvés", f:()=>{State.data.gold+=30; UI.toast("+30 Crédits", "loot");}},
                {t:"Données", d:"Nouveau module", f:()=>{UI.modal('skill');}},
                {t:"Réparation", d:"Soin 50%", f:()=>{Core.heal(State.run.maxHp/2);}}
            ][Math.floor(Math.random()*3)];
            UI.txt(ev.t, ev.d); ev.f(); UI.updateAll(); Core.checkAuto();
        }
    },

    initCombat: (isBoss) => {
        State.combat.active = true;
        State.combat.boss = isBoss;
        
        // Enemy Gen
        let zone = State.run.day < 20 ? 'z1' : 'z2';
        let pool = isBoss ? DB.bosses : DB.enemies[zone];
        let en = pool[Math.floor(Math.random()*pool.length)];
        
        let scale = 1 + (State.run.day * 0.15);
        State.combat.max = Math.floor(en.hp * scale * (isBoss?2:1));
        State.combat.hp = State.combat.max;
        State.combat.atk = Math.floor(en.atk * scale);
        
        // UI Setup
        UI.setStage('combat');
        document.getElementById('vis-enemy').innerText = en.i;
        document.getElementById('enemy-name').innerText = en.n;
        UI.txt(isBoss?"ALERTE BOSS":"HOSTILE", en.n);
        UI.btn("COMBAT...", "grayscale cursor-not-allowed", null);
        
        // Shield Start
        let sh = State.run.skills.find(s=>s.id==='shield');
        if(sh) { State.run.shield = 50*sh.lvl; UI.fxDmg(`BOUCLIER ${State.run.shield}`, '#3b82f6', 'vis-hero'); }

        setTimeout(Core.combatTurn, 1000/State.conf.speed);
    },

    combatTurn: () => {
        if(!State.combat.active) return;

        // --- PLAYER HIT ---
        let dmg = State.run.atk;
        
        // Skills
        let fire = State.run.skills.find(s=>s.id==='fire'); if(fire) dmg += 10*fire.lvl;
        let crit = Math.random() < (State.run.crit/100); 
        if(crit) { dmg *= 2; UI.flashScreen(); }

        // Variance
        dmg = Math.floor(dmg * (0.9 + Math.random()*0.2));

        State.combat.hp -= dmg;
        
        // FX
        UI.fxDmg(dmg, crit?'#fbbf24':'#fff', 'vis-enemy');
        UI.animShake('vis-enemy');
        UI.updateBar();

        if(State.combat.hp <= 0) {
            setTimeout(()=>Core.endCombat(true), 500/State.conf.speed);
            return;
        }

        // --- ENEMY HIT ---
        setTimeout(() => {
            if(!State.combat.active) return;
            
            let edmg = State.combat.atk;
            
            // Shield Logic
            if(State.run.shield > 0) {
                let absorb = Math.min(State.run.shield, edmg);
                State.run.shield -= absorb; edmg -= absorb;
                UI.fxDmg(`BLOC ${absorb}`, '#3b82f6', 'vis-hero');
            }
            
            let final = Math.max(1, edmg - State.run.def);
            State.run.hp -= final;
            
            // FX
            UI.fxDmg(final, '#ef4444', 'vis-hero');
            UI.animShake('hero-visual'); // Secoue le héros
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
            State.data.gold += 15 + State.run.day;
            
            // Regen
            let reg = State.run.skills.find(s=>s.id==='heal');
            if(reg) Core.heal(reg.lvl*5);

            if(State.combat.boss) {
                State.data.perls += 10;
                UI.toast("BOSS VAINCU ! +10 ✨", "loot");
                Core.save();
                UI.btn("RETOUR BASE", "btn-mega", Core.startRun);
            } else {
                UI.btn("CONTINUER", "btn-mega", Core.nextDay);
                Core.checkAuto();
            }
        } else {
            UI.log("Signaux vitaux perdus.", 'error');
            UI.txt("ÉCHEC CRITIQUE", "Rapatriement...");
            State.run.active = false;
            UI.btn("RELANCER SYSTÈME", "btn-mega", Core.startRun);
        }
        Core.save();
        UI.setStage('adventure');
    },

    // --- UTILS ---
    heal: (v) => { State.run.hp = Math.min(State.run.maxHp, State.run.hp + v); UI.updateAll(); UI.toast(`Réparation +${Math.floor(v)}`, "success"); },
    
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
            // Ajout UID pour unicité
            it.uid = Date.now() + Math.random();
            State.data.inv.push(it);
            Core.save(); UI.updateAll(); UI.toast(`Acquis: ${it.n}`, "loot");
            // Anim Button
            document.getElementById('btn-chest').classList.add('anim-pop');
            setTimeout(()=>document.getElementById('btn-chest').classList.remove('anim-pop'), 200);
        } else UI.toast("Perles insuffisantes (5)", "error");
    },

    equip: (i) => {
        let it = State.data.inv[i];
        let type = it.t;
        
        if(State.data[type]) State.data.inv.push(State.data[type]); // Déséquipe
        State.data[type] = it; // Équipe
        State.data.inv.splice(i,1); // Retire inventaire
        
        Core.save(); Core.calcStats(); UI.updateAll();
        UI.toast("Équipement configuré.");
    },

    upgrade: (t) => {
        let cost = 100 + (State.data.stats[t]*100);
        if(State.data.gold >= cost) {
            State.data.gold -= cost; State.data.stats[t]++;
            Core.save(); Core.calcStats(); UI.updateAll();
            UI.toast("Amélioration installée", "success");
        } else UI.toast("Crédits insuffisants", "error");
    },

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
            if(!b.disabled) b.click();
        }, 1000/State.conf.speed);
    }
};

// --- 4. VISUALS (UI) ---
const UI = {
    updateAll: () => {
        // Resources
        document.getElementById('ui-gold').innerText = State.data.gold;
        document.getElementById('ui-perls').innerText = State.data.perls;
        document.getElementById('ui-inv-count').innerText = State.data.inv.length;
        
        // Hub Costs
        ['hp','atk','def'].forEach(k => {
            document.getElementById(`lvl-${k}`).innerText = State.data.stats[k];
            document.getElementById(`cost-${k}`).innerText = 100 + (State.data.stats[k]*100);
        });

        // Run Stats
        if(State.run.active || State.data.char) {
            document.getElementById('ui-hp-txt').innerText = `${Math.floor(State.run.hp)}/${State.run.maxHp}`;
            document.getElementById('ui-hp-bar').style.width = (State.run.hp/State.run.maxHp*100) + "%";
            document.getElementById('ui-shield-bar').style.width = State.run.shield > 0 ? "100%" : "0%";
            
            document.getElementById('ui-atk').innerText = State.run.atk;
            document.getElementById('ui-def').innerText = State.run.def;
            document.getElementById('ui-crit').innerText = State.run.crit + "%";
            document.getElementById('ui-spd').innerText = State.run.spd.toFixed(1);
            document.getElementById('ui-day').innerText = State.run.day;
            document.getElementById('ui-zone').innerText = Math.ceil(State.run.day/20) + "-1";
            
            let sl = document.getElementById('list-skills'); sl.innerHTML = '';
            if(State.run.skills.length === 0) sl.innerHTML = `<div class="text-xs text-slate-600 text-center italic mt-10">Aucun module</div>`;
            State.run.skills.forEach(s => {
                let d = DB.skills[s.id];
                sl.innerHTML += `<div class="bg-white/5 p-2 rounded text-xs flex justify-between items-center mb-1 group hover:bg-white/10" onmouseenter="UI.tip(event,'${d.n}','${d.d(s.lvl)}')" onmouseleave="UI.untip()">
                    <span class="${d.c} font-bold text-lg">${d.i} ${d.n}</span><span class="text-slate-400">Niv.${s.lvl}</span>
                </div>`;
            });
        }

        // Slots
        const setS = (id, it, type) => { 
            let el = document.getElementById(id);
            if(it) {
                el.innerText = it.e; el.className = `slot ${it.r}`;
                el.onmouseenter = (e) => UI.tip(e, it.n, `+${it.s} Stats<br><i>${it.d}</i>`);
            } else {
                el.innerText = type==='weapon'?'⚔️':type==='head'?'🛡️':'🐾'; 
                el.className = "slot border-slate-700 text-slate-700"; el.onmouseenter = null;
            }
            el.onmouseleave = UI.untip;
        };
        setS('slot-w', State.data.weapon, 'weapon'); setS('slot-h', State.data.head, 'head'); setS('slot-p', State.data.pet, 'pet');

        // Inventory
        let gi = document.getElementById('grid-inv'); gi.innerHTML = '';
        State.data.inv.forEach((it, i) => {
            let d = document.createElement('div'); d.className = `slot ${it.r} scale-75`; d.innerText = it.e;
            d.onclick = () => Core.equip(i);
            d.onmouseenter = (e) => UI.tip(e, it.n, `+${it.s} Stats`); d.onmouseleave = UI.untip;
            gi.appendChild(d);
        });

        if(State.data.char) document.getElementById('hero-visual').innerText = State.data.char;
    },

    updateBar: () => document.getElementById('ui-enemy-bar').style.width = (State.combat.hp/State.combat.max*100)+"%",

    setStage: (mode) => {
        let c = document.getElementById('enemy-container');
        let t = document.getElementById('narrative-box');
        if(mode === 'combat') {
            c.classList.remove('hidden', 'opacity-0', 'translate-y-10');
            t.classList.add('hidden');
        } else {
            c.classList.add('hidden', 'opacity-0', 'translate-y-10');
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
        CurrentAction = act;
        b.disabled = (act === null);
    },

    txt: (t, s) => { document.getElementById('txt-main').innerText=t; document.getElementById('txt-sub').innerText=s; },
    
    log: (m, type='info') => {
        let b = document.getElementById('game-logs');
        let c = type==='combat' ? 'text-red-400' : (type==='success' ? 'text-green-400' : 'text-slate-400');
        b.innerHTML = `<div class="mb-1 border-b border-white/5 pb-1"><span class="${c}">> ${m}</span></div>` + b.innerHTML;
    },

    // VISUAL FX
    animShake: (id) => {
        let el = document.getElementById(id);
        el.classList.remove('anim-shake'); void el.offsetWidth; el.classList.add('anim-shake');
    },
    
    flashScreen: () => {
        let f = document.getElementById('flash-overlay');
        f.classList.remove('opacity-0'); setTimeout(()=>f.classList.add('opacity-0'), 100);
    },

    fxDmg: (t, c, id) => {
        let el = document.createElement('div'); el.className='dmg-float'; el.style.color=c; el.innerText=t;
        let r = document.getElementById(id).getBoundingClientRect();
        el.style.left=(r.left+r.width/2)+"px"; el.style.top=r.top+"px";
        document.getElementById('particle-layer').appendChild(el); setTimeout(()=>el.remove(), 800);
    },

    toast: (m, t) => {
        let d = document.createElement('div');
        let c = t==='loot'?'border-purple-500 text-purple-200':(t==='success'?'border-green-500 text-green-200':'border-blue-500');
        d.className = `toast ${c}`; d.innerText = m;
        document.getElementById('toast-container').appendChild(d); setTimeout(()=>d.remove(), 2500);
    },

    tip: (e, t, b) => {
        let el = document.getElementById('tooltip');
        el.innerHTML = `<div class="font-bold border-b border-white/20 pb-1 mb-1 text-blue-300">${t}</div><div class="text-slate-300">${b}</div>`;
        el.classList.remove('hidden');
        el.style.left=(e.clientX+15)+'px'; el.style.top=(e.clientY+15)+'px';
    },
    untip: () => document.getElementById('tooltip').classList.add('hidden'),

    modal: (type) => {
        let o = document.getElementById('modal-overlay');
        let c = document.getElementById('modal-content');
        o.classList.remove('hidden'); 
        setTimeout(()=> { c.classList.remove('scale-95', 'opacity-0'); }, 10);
        
        if(type === 'char') {
            c.innerHTML = `<h2 class="text-2xl font-bold text-white mb-6 tracking-widest font-tech">IDENTIFICATION PILOTE</h2>
            <div class="flex gap-4 justify-center">
                ${DB.chars.map(x=>`<button onclick="Core.pickChar('${x.id}')" class="text-6xl hover:scale-125 transition p-4 bg-slate-800 border border-slate-600 rounded-xl hover:border-blue-500 hover:shadow-[0_0_20px_#3b82f6] group"><div class="group-hover:animate-bounce">${x.id}</div><div class="text-xs mt-2 text-slate-400 font-bold tracking-widest">${x.n}</div></button>`).join('')}
            </div>`;
        }
        else if(type === 'shop') {
            c.innerHTML = `<h2 class="text-xl font-bold text-emerald-400 mb-4 tracking-widest">RAVITAILLEMENT</h2>
            <button onclick="Core.heal(State.run.maxHp/2);UI.closeModal();Core.checkAuto()" class="w-full p-4 bg-slate-800 mb-3 hover:bg-emerald-900/50 border border-emerald-500/50 text-emerald-300 font-bold rounded flex justify-between items-center group"><span class="group-hover:translate-x-2 transition-transform">💊 Soin d'Urgence</span> <span class="bg-black/50 px-2 rounded">50% MAX</span></button>
            <button onclick="State.run.atk+=5;UI.toast('+5 ATK','buff');UI.closeModal();Core.checkAuto()" class="w-full p-4 bg-slate-800 hover:bg-blue-900/50 border border-blue-500/50 text-blue-300 font-bold rounded flex justify-between items-center group"><span class="group-hover:translate-x-2 transition-transform">⚔️ Calibrage Armes</span> <span class="bg-black/50 px-2 rounded">+5 ATK</span></button>`;
        }
        else if(type === 'skill') {
            let keys = Object.keys(DB.skills);
            let k = keys[Math.floor(Math.random()*keys.length)];
            let s = DB.skills[k];
            c.innerHTML = `<h2 class="text-xl font-bold text-yellow-400 mb-4 tracking-widest">MODULE TROUVÉ</h2>
            <div class="p-6 bg-slate-800 rounded border border-yellow-500/30 text-center relative overflow-hidden">
                <div class="absolute inset-0 bg-yellow-500/5 animate-pulse"></div>
                <div class="text-5xl mb-2 filter drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]">${s.i}</div>
                <div class="font-bold text-white text-xl mb-1">${s.n}</div>
                <div class="text-xs text-yellow-200/70 mb-4">Mise à niveau disponible</div>
                <button onclick="Core.addSkill('${k}');UI.closeModal();Core.checkAuto()" class="w-full py-3 bg-yellow-600 text-black font-bold rounded hover:bg-yellow-500 transition-all hover:scale-105">INSTALLER</button>
            </div>`;
        }
    },
    closeModal: () => {
        let c = document.getElementById('modal-content');
        c.classList.add('scale-95', 'opacity-0');
        setTimeout(()=>document.getElementById('modal-overlay').classList.add('hidden'), 200);
    }
};

// BOOT
window.onload = Core.init;
