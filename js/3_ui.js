/**
 * =============================================================================
 * MODULE: UI (Interface & Effets Visuels)
 * =============================================================================
 */

const UI = {
    // --- MISE À JOUR GLOBALE ---
    update: () => {
        // Ressources
        document.getElementById('ui-gold').innerText = State.data.gold;
        document.getElementById('ui-perls').innerText = State.data.perls;
        document.getElementById('ui-lvl').innerText = State.data.level;

        // Stats Run
        if (State.run.active || State.data.char) {
            document.getElementById('ui-hp-txt').innerText = `${Math.floor(State.run.hp)}/${State.run.maxHp}`;
            document.getElementById('ui-hp-bar').style.width = `${(State.run.hp / State.run.maxHp) * 100}%`;
            document.getElementById('ui-shield-txt').innerText = Math.floor(State.run.shield);
            document.getElementById('ui-shield-bar').style.width = State.run.shield > 0 ? '100%' : '0%';
            
            document.getElementById('ui-atk').innerText = State.run.atk;
            document.getElementById('ui-def').innerText = State.run.def;
            document.getElementById('ui-crit').innerText = State.run.crit + "%";
            document.getElementById('ui-spd').innerText = State.run.spd + "x";
            
            document.getElementById('ui-day').innerText = State.run.day;
            document.getElementById('ui-zone').innerText = `${Math.ceil(State.run.day / 20)}-${(State.run.day % 20) || 20}`;
        }

        // Skills Render
        const skillList = document.getElementById('list-skills');
        skillList.innerHTML = '';
        if (State.run.skills.length === 0) {
            skillList.innerHTML = `<div class="text-xs text-slate-600 text-center italic mt-10">Aucun module installé</div>`;
        } else {
            State.run.skills.forEach(s => {
                const def = DB.skills[s.id];
                skillList.innerHTML += `
                    <div class="bg-white/5 border border-white/10 p-2 rounded flex items-center justify-between group hover:bg-white/10 transition cursor-help"
                         onmouseenter="UI.tip(event, '${def.n}', '${def.desc(s.lvl)}', '${def.color}')" onmouseleave="UI.hideTip()">
                        <div class="flex items-center gap-3">
                            <span class="text-2xl">${def.icon}</span>
                            <div>
                                <div class="text-sm font-bold ${def.color}">${def.n}</div>
                                <div class="text-[10px] text-gray-400">Niveau ${s.lvl}</div>
                            </div>
                        </div>
                    </div>`;
            });
        }

        // Slots
        UI.renderSlot('slot-w', State.data.gear.weapon, '⚔️');
        UI.renderSlot('slot-h', State.data.gear.head, '🛡️');
        UI.renderSlot('slot-p', State.data.gear.pet, '🐾');

        // Inventory
        const invGrid = document.getElementById('grid-inv');
        invGrid.innerHTML = '';
        State.data.inventory.forEach((item, idx) => {
            const el = document.createElement('div');
            el.className = `slot r-${item.r}`;
            el.innerHTML = item.i || '?';
            el.onclick = () => Engine.equipItem(idx);
            el.onmouseenter = (e) => UI.tip(e, item.n, `Type: ${item.t}<br>Puissance: +${item.s}<br><i class='text-gray-400'>${item.d}</i>`, 'text-white');
            el.onmouseleave = UI.hideTip;
            invGrid.appendChild(el);
        });

        // Hub Costs
        ['hp','atk','def'].forEach(k => {
            const elLvl = document.getElementById(`lvl-${k}`);
            const elCost = document.getElementById(`cost-${k}`);
            if(elLvl) elLvl.innerText = State.data.stats[k];
            if(elCost) elCost.innerText = 100 + (State.data.stats[k] * 100);
        });
    },

    renderSlot: (id, item, fallback) => {
        const el = document.getElementById(id);
        if (item) {
            el.innerHTML = item.i;
            el.className = `slot r-${item.r}`;
            el.onmouseenter = (e) => UI.tip(e, item.n, `+${item.s} Stats<br><i>${item.d}</i>`, 'text-white');
        } else {
            el.innerHTML = fallback;
            el.className = "slot r-common opacity-50";
            el.onmouseenter = null;
        }
        el.onmouseleave = UI.hideTip;
    },

    renderCombat: () => {
        const hpPct = (State.combat.hp / State.combat.maxHp) * 100;
        document.getElementById('ui-enemy-bar').style.width = `${hpPct}%`;
        
        // Debuffs display
        const dbContainer = document.getElementById('enemy-debuffs');
        dbContainer.innerHTML = ''; // Reset frame
        // (Logique debuff simplifiée pour affichage icones)
    },

    // --- NAVIGATION ---
    switchTab: (tab) => {
        const adv = document.getElementById('view-hub');
        if (tab === 'hub') {
            adv.classList.remove('hidden');
            adv.classList.add('flex'); // Ensure flex display
        } else {
            adv.classList.add('hidden');
            adv.classList.remove('flex');
        }
        
        document.getElementById('nav-adv').classList.toggle('active', tab === 'adventure');
        document.getElementById('nav-hub').classList.toggle('active', tab === 'hub');
    },

    // --- INTERACTION ---
    btn: (txt, cls = '', action = null) => {
        const b = document.getElementById('btn-main');
        b.innerText = txt;
        // Reset classes
        b.className = "btn-mega"; 
        if (cls) b.classList.add(cls);
        
        // Disable state logic
        if (action === false) b.disabled = true;
        else {
            b.disabled = false;
            b.onclick = action || Engine.clickMain;
        }
    },

    txt: (title, sub) => {
        document.getElementById('txt-main').innerText = title;
        document.getElementById('txt-sub').innerText = sub;
    },

    log: (msg, type='info') => {
        const logBox = document.getElementById('game-logs');
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        const time = new Date().toLocaleTimeString().split(' ')[0];
        let color = 'text-slate-400';
        if(type==='combat') color = 'text-red-400';
        if(type==='loot') color = 'text-purple-400';
        
        entry.innerHTML = `<span class="log-time">[${time}]</span> <span class="${color}">${msg}</span>`;
        logBox.prepend(entry);
        if (logBox.children.length > 30) logBox.lastChild.remove();
    },

    // --- VFX (Particules & Feedback) ---
    spawnDmg: (txt, color, targetId) => {
        const target = document.getElementById(targetId);
        if (!target) return;
        const rect = target.getBoundingClientRect();
        
        const el = document.createElement('div');
        el.className = 'fx-float';
        el.innerText = txt;
        el.style.color = color;
        el.style.left = (rect.left + rect.width/2) + 'px';
        el.style.top = (rect.top) + 'px';
        
        // Random drift
        el.style.setProperty('--tx', (Math.random() * 40 - 20) + 'px');
        
        document.getElementById('particle-layer').appendChild(el);
        setTimeout(() => el.remove(), 900);
    },

    shake: (id) => {
        const el = document.getElementById(id);
        el.classList.remove('anim-hit');
        void el.offsetWidth; // Trigger reflow
        el.classList.add('anim-hit');
    },

    toast: (msg, type = 'info') => {
        const c = document.getElementById('toast-container');
        const t = document.createElement('div');
        let border = 'border-blue-500';
        if(type==='loot') border = 'border-purple-500';
        if(type==='error') border = 'border-red-500';
        if(type==='success') border = 'border-green-500';
        
        t.className = `toast ${border}`;
        t.innerHTML = msg;
        c.appendChild(t);
        setTimeout(() => t.remove(), 3000);
    },

    // --- TOOLTIPS ---
    tip: (e, title, body, colorClass) => {
        const tt = document.getElementById('floating-tooltip');
        tt.innerHTML = `<div class="font-bold border-b border-white/10 pb-1 mb-1 ${colorClass}">${title}</div><div class="text-xs text-slate-300">${body}</div>`;
        tt.classList.remove('hidden');
        tt.style.left = (e.clientX + 15) + 'px';
        tt.style.top = (e.clientY + 15) + 'px';
    },
    hideTip: () => document.getElementById('floating-tooltip').classList.add('hidden'),

    // --- MODALS ---
    modal: (type, data = null) => {
        const overlay = document.getElementById('modal-overlay');
        const content = document.getElementById('modal-content');
        overlay.classList.remove('hidden');
        setTimeout(() => overlay.classList.add('active'), 10); // Fade in

        let html = '';
        
        if (type === 'char') {
            html = `<h2 class="text-3xl font-black text-white mb-6">IDENTIFICATION</h2>
                    <div class="grid grid-cols-3 gap-4">
                        ${DB.chars.map(c => `
                            <button onclick="Engine.pickChar('${c.id}')" class="p-4 bg-slate-800 border border-slate-600 rounded-xl hover:border-blue-500 hover:bg-slate-700 transition group">
                                <div class="text-5xl mb-2 group-hover:scale-110 transition">${c.id}</div>
                                <div class="font-bold text-white">${c.name}</div>
                                <div class="text-[10px] text-slate-400">${c.desc}</div>
                            </button>
                        `).join('')}
                    </div>`;
        }
        else if (type === 'shop') {
            html = `<h2 class="text-2xl font-bold text-emerald-400 mb-4">RAVITAILLEMENT</h2>
                    <div class="space-y-2">
                        <button onclick="Engine.applyShop('heal')" class="w-full p-4 bg-slate-800 hover:bg-emerald-900/50 border border-emerald-500/30 rounded text-left flex justify-between items-center group">
                            <span class="font-bold text-emerald-400">💊 Soin d'Urgence</span>
                            <span class="text-xs bg-black/50 px-2 py-1 rounded text-white">50% PV</span>
                        </button>
                        <button onclick="Engine.applyShop('atk')" class="w-full p-4 bg-slate-800 hover:bg-blue-900/50 border border-blue-500/30 rounded text-left flex justify-between items-center group">
                            <span class="font-bold text-blue-400">⚔️ Calibrage Armes</span>
                            <span class="text-xs bg-black/50 px-2 py-1 rounded text-white">+5 ATK</span>
                        </button>
                    </div>`;
        }
        else if (type === 'skill') {
            const keys = Object.keys(DB.skills);
            // Random 3 distinct skills
            let choices = [];
            while(choices.length < 3) {
                let k = keys[Math.floor(Math.random() * keys.length)];
                if(!choices.includes(k)) choices.push(k);
            }
            
            html = `<h2 class="text-2xl font-bold text-yellow-400 mb-4">MODULE D'EXTENSION</h2>
                    <div class="space-y-2">`;
            
            choices.forEach(k => {
                const s = DB.skills[k];
                const current = State.run.skills.find(sk => sk.id === k);
                const lvl = current ? current.lvl + 1 : 1;
                html += `
                    <button onclick="Engine.pickSkill('${k}')" class="w-full p-3 bg-slate-800 hover:bg-slate-700 border border-white/10 hover:border-yellow-500/50 rounded flex items-center gap-4 text-left transition group">
                        <span class="text-3xl filter drop-shadow-lg">${s.icon}</span>
                        <div>
                            <div class="font-bold text-white group-hover:text-yellow-300">${s.n} <span class="text-xs bg-black/50 px-2 rounded text-slate-400 ml-2">Niv.${lvl}</span></div>
                            <div class="text-xs text-slate-400 group-hover:text-white italic">${s.desc(lvl)}</div>
                        </div>
                    </button>`;
            });
            html += `</div>`;
        }

        content.innerHTML = html;
    },

    closeModal: () => {
        const overlay = document.getElementById('modal-overlay');
        overlay.classList.remove('active');
        setTimeout(() => overlay.classList.add('hidden'), 200);
    }
};

// Mouse tracking for tooltip
document.addEventListener('mousemove', (e) => {
    const tt = document.getElementById('floating-tooltip');
    if (!tt.classList.contains('hidden')) {
        tt.style.left = (e.clientX + 15) + 'px';
        tt.style.top = (e.clientY + 15) + 'px';
    }
});
