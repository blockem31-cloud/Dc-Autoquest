// ============================================================
// DISCORD QUEST INSTANT COMPLETER - 100% DIREKT
// Setzt ALLE Quests sofort auf 100% - KEINE WARTEZEIT!
// ============================================================

delete window.$;
let wpRequire = webpackChunkdiscord_app.push([[Symbol()], {}, r => r]);
webpackChunkdiscord_app.pop();

// Module laden
let QuestsStore = Object.values(wpRequire.c).find(x => x?.exports?.A?.__proto__?.getQuest)?.exports?.A;
let api = Object.values(wpRequire.c).find(x => x?.exports?.Bo?.get)?.exports?.Bo;
let FluxDispatcher = Object.values(wpRequire.c).find(x => x?.exports?.h?.__proto__?.flushWaitQueue)?.exports?.h;

const TASKS = ["WATCH_VIDEO", "WATCH_VIDEO_ON_MOBILE", "PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP", "PLAY_ACTIVITY"];

// ============================================================
// ALLE QUESTS FINDEN
// ============================================================
function getAllQuests() {
    let quests = [];
    if(QuestsStore?.quests) {
        for(let q of QuestsStore.quests.values()) quests.push(q);
    }
    return quests.filter(q => 
        q.userStatus?.enrolledAt && 
        !q.userStatus?.completedAt && 
        new Date(q.config.expiresAt).getTime() > Date.now()
    );
}

// ============================================================
// DIREKTER PROGRESS (KEIN WARTEN!)
// ============================================================
async function completeQuestInstant(quest, taskName, needed) {
    try {
        // Für Video-Quests: Direkt auf 100% setzen
        if(taskName.includes("VIDEO")) {
            await api.post({
                url: `/quests/${quest.id}/video-progress`,
                body: {timestamp: needed}
            });
            console.log(`✅ VIDEO "${quest.config.messages.questName}" sofort abgeschlossen!`);
            return true;
        }
        
        // Für Game/Stream/Activity Quests: Direktes Heartbeat mit Terminal
        await api.post({
            url: `/quests/${quest.id}/heartbeat`,
            body: {
                terminal: true,
                stream_key: `call:${Date.now()}:1`
            }
        });
        
        // Zusätzlich: Direktes Setzen des Progress via internal
        if(quest.userStatus) {
            quest.userStatus.progress[taskName] = {value: needed};
            if(FluxDispatcher) {
                FluxDispatcher.dispatch({type: "QUESTS_SEND_HEARTBEAT_SUCCESS", userStatus: quest.userStatus});
            }
        }
        
        console.log(`✅ QUEST "${quest.config.messages.questName}" sofort abgeschlossen!`);
        return true;
    } catch(e) {
        console.log(`⚠️ Fehler bei "${quest.config.messages.questName}": ${e.message}`);
        return false;
    }
}

// ============================================================
// FORCIERTES BEENDEN (Alternativ-Methode)
// ============================================================
async function forceCompleteQuest(quest, taskName, needed) {
    // Methode 2: Direktes Claimen der Belohnung
    try {
        await api.post({
            url: `/quests/${quest.id}/claim-reward`
        });
        console.log(`🎉 "${quest.config.messages.questName}" Belohnung eingefordert!`);
        return true;
    } catch(e) {}
    
    // Methode 3: Local Storage manipulieren
    try {
        let cached = JSON.parse(localStorage.getItem("quests_cache") || "{}");
        if(cached[quest.id]) {
            cached[quest.id].userStatus.completedAt = new Date().toISOString();
            cached[quest.id].userStatus.completed = true;
            if(cached[quest.id].userStatus.progress?.[taskName]) {
                cached[quest.id].userStatus.progress[taskName].value = needed;
            }
            localStorage.setItem("quests_cache", JSON.stringify(cached));
            console.log(`📦 "${quest.config.messages.questName}" via Cache abgeschlossen!`);
        }
    } catch(e) {}
}

// ============================================================
// HAUPTFUNKTION
// ============================================================
(async function() {
    console.log("\n" + "=".repeat(60));
    console.log("🎮 DISCORD QUEST INSTANT COMPLETER");
    console.log("⚡ 100% SOFORT - KEINE WARTEZEIT!");
    console.log("=".repeat(60) + "\n");
    
    let quests = getAllQuests();
    
    if(quests.length === 0) {
        console.log(" Keine aktiven Quests gefunden!");
        console.log("\n Starte eine Quest in Discord und führe das Skript erneut aus.\n");
        return;
    }
    
    console.log(` ${quests.length} Quest(s) gefunden. Bearbeite...\n`);
    
    for(let quest of quests) {
        const taskConfig = quest.config?.taskConfig ?? quest.config?.taskConfigV2;
        if(!taskConfig?.tasks) continue;
        
        const taskName = Object.keys(taskConfig.tasks).find(t => TASKS.includes(t));
        if(!taskName) continue;
        
        const needed = taskConfig.tasks[taskName].target;
        const qName = quest.config?.messages?.questName || quest.id;
        
        console.log(`📌 "${qName}" (${taskName}) → wird sofort abgeschlossen...`);
        
        await completeQuestInstant(quest, taskName, needed);
        await forceCompleteQuest(quest, taskName, needed);
        
        // Kurze Pause zwischen Quests (um Rate Limits zu vermeiden)
        await new Promise(r => setTimeout(r, 1000));
    }
    
    console.log("\n" + "=".repeat(60));
    console.log(" ALLE QUESTS SOFORT ABGESCHLOSSEN!");
    console.log(" Lade Discord neu, um die Änderungen zu sehen (F5)");
    console.log("=".repeat(60) + "\n");
})();
