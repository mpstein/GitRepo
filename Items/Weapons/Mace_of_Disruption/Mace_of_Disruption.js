const MACRONAME = "Mace_of_Disruption.js"
/*****************************************************************************************
 * Crymic's code imported and rolled back for Foundry 8.9 compatibility
 * 
 * 04/23/22 0.1 Import of macro and initial compatibility effort
 *****************************************************************************************/
const MACRO = MACRONAME.split(".")[0]     // Trim of the version number and extension
jez.log(`============== Starting === ${MACRONAME} =================`);
for (let i = 0; i < args.length; i++) jez.log(`  args[${i}]`, args[i]);
// Crymic 21.12.25
// Midi-qol On Use
// Requires 1 callback macros ActorUpdate
const lastArg = args[args.length - 1];
if (lastArg.hitTargets.length === 0) return {};
let ActorUpdate = game.macros.find(i=> i.name === "ActorUpdate");
jez.log("ActorUpdate",ActorUpdate)
if(!ActorUpdate) return ui.notifications.error("REQUIRED: ActorUpdate macro is missing.");
let AdvancedMacros = getProperty(ActorUpdate.data.flags, "advanced-macros");
jez.log("AdvancedMacros", AdvancedMacros)
if(!AdvancedMacros) return ui.notifications.error("REQUIRED: Advanced macros is missing."); 
jez.log("AdvancedMacros.runAsGM",AdvancedMacros.runAsGM)
if(!AdvancedMacros.runAsGM) return ui.notifications.error("REQUIRED: ActorUpdate must be set to RunAsGM");
const actorD = game.actors.get(lastArg.actor._id);
jez.log("actorD", actorD)
const tokenD = canvas.tokens.get(lastArg.tokenId);
jez.log("tokenD", tokenD)
const target = canvas.tokens.get(lastArg.hitTargets[0].id);
jez.log("target", target )
const type = target.actor.data.type === "npc" ? ["undead", "fiend"].some(value => (target.actor.data.data.details.type.value || "").toLowerCase().includes(value)) : ["undead", "fiend"].some(race => (target.actor.data.data.details.race || "").toLowerCase().includes(race));
jez.log("type", type)
if (type) {
    runVFX(target)  // Added a VFX
    let crit = lastArg.isCritical ? 4 : 2;
    let damageType = "radiant";
    let saveType = "wis";
    let damageRoll = new Roll(`${crit}d6[radiant]`).evaluate({ async: false });
    let npcCheck = target.actor.data.type === "character" ? { chatMessage: false, fastForward: false } : { chatMessage: false, fastForward: true };
    await new MidiQOL.DamageOnlyWorkflow(actorD, tokenD, damageRoll.total, damageType, [target], damageRoll, { flavor: `(${CONFIG.DND5E.damageTypes[damageType]})`, itemCardId: lastArg.itemCardId, damageList: lastArg.damageList });
    let save = await MidiQOL.socket().executeAsGM("rollAbility", { request: "save", targetUuid: target.actor.uuid, ability: saveType, options: npcCheck });
    let dc = 15;
    console.log(save.total);
    // adjust for latency
    let saved = "";
    if (target.actor.data.data.attributes.hp.value <= 25) {
        if (target.actor.data.data.attributes.hp.value === 0) return {};
        if (save.total >= dc) {
            saved = "saves";
            let gameRound = game.combat ? game.combat.round : 0;
            let effectData = {
                label: "Frightened",
                icon: "icons/svg/terror.svg",
                origin: lastArg.uuid,
                disabled: false,
                duration: { rounds: 10, seconds: 60, startRound: gameRound, startTime: game.time.worldTime },
                changes: [{ key: `flags.midi-qol.disadvantage.ability.check.all`, mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM, value: 1, priority: 20 },
                { key: `flags.midi-qol.disadvantage.skill.all`, mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM, value: 1, priority: 20 },
                { key: `flags.midi-qol.disadvantage.attack.all`, mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM, value: 1, priority: 20 }]
            };
            let effect = target.actor.effects.find(ef => ef.data.label === game.i18n.localize("Frightened"));
            if (!effect) await MidiQOL.socket().executeAsGM("createEffects", { actorUuid: target.uuid, effects: [effectData] });
        } else {
            saved = "fails";
            ActorUpdate.execute(target.id, { "data.attributes.hp.value": 0 });
        }
        await jez.wait(500);
        let the_message = `<div class="midi-qol-nobox midi-qol-bigger-text">${CONFIG.DND5E.abilities[saveType]} Saving Throw: DC ${dc}</div><div><div class="midi-qol-nobox"><div class="midi-qol-flex-container"><div class="midi-qol-target-npc midi-qol-target-name" id="${target.id}"> ${target.name} ${saved} with ${save.total}</div><div><img src="${target.data.img}" width="30" height="30" style="border:0px" /></div></div></div></div>`;
        let chatMessage = await game.messages.get(lastArg.itemCardId);
        let content = await duplicate(chatMessage.data.content);
        let searchString = /<div class="midi-qol-saves-display">[\s\S]*<div class="end-midi-qol-saves-display">/g;
        let replaceString = `<div class="midi-qol-saves-display"><div class="end-midi-qol-saves-display">${the_message}`;
        content = await content.replace(searchString, replaceString);
        await chatMessage.update({ content: content });
        await ui.chat.scrollBottom();
    }
}
/***************************************************************************************************
 * Perform the VFX code that runs when the mace hits a special target
 ***************************************************************************************************/
 async function runVFX(token1) {
    const VFX_NAME = `${MACRO}`
    const VFX_LOOP = "jb2a.template_circle.out_pulse.02.burst.tealyellow"
    const VFX_OPACITY = 1.0;
    const VFX_SCALE = 0.3;
    new Sequence()
    .effect()
        .file(VFX_LOOP)
        .atLocation(token1)     // Effect will appear at  template, center
        .scale(VFX_SCALE)
        //.scaleIn(0.25, 1000)    // Expand from 0.25 to 1 size over 1 second
        //.rotateIn(180, 1000)    // 1/2 Rotation over 1 second 
        //.scaleOut(0.25, 1000)   // Contract from 1 to 0.25 size over 1 second
        //.rotateOut(180, 1000)   // 1/2 Counter Rotation over 1 second
        .opacity(VFX_OPACITY)
        //.duration(6000)
        .name(VFX_NAME)         // Give the effect a uniqueish name
        //.fadeIn(10)             // Fade in for specified time in milliseconds
        //.fadeOut(1000)          // Fade out for specified time in milliseconds
        //.extraEndDuration(1200) // Time padding on exit to connect to Outro effect
    .play();
    await jez.wait(100)         // Don't delete till VFX established
}

