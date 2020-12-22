'use strict';

/*TODO:
- Include position variables and distance functions for range checking
- Add ammo variable to weapons and creature parts
- Function to randomize loot table of a creature (inventory)
- Combat System
    - Types of AI
        - Aggressive // Will attack most of the time, even if close to death, especially if the enemy is weak.
        - Reactive // Smartest AI, reserved for bosses. 
        - Defensive // Will prioritize defensive capabilities over offensive capabilities, such as preferring to counter
        - Survivalist // Focus on survival, will not make risky maneuveurs. May attempt to hide and flee/run more often
        - Chaotic // May do random shit, even when directly in harms way
    - rangedAttack()
    -Attack option, choose hand and use the item in it as a weapon. Items not defined as weapons deal a base 1d4 damage + modifiers if resasonable.
    -Defend option, could be dodging/using a shield/withstanding an incoming blow
- Exploration?
    -https://www.youtube.com/watch?v=ByvAud_2raU
    -Items have a use array, a list of keywords for items that can be a potential alternative use
    EX: .uses = []
= Down the line
- Combat Flavor Function
    - Adds dialogue depending on creatures, weapons, and if the attack misses due to deflection or range.
    - Database of premade possible dialogue options
    - Randomly chosen from the options that fit the attack context
    - Dialogue options dependant on damage type, the amount of damage done, killing blows, hit/miss, 
        if miss due to strength based defense describe how the blow is absorbed/deflected
        if miss due to dex based defense describe how agile the enemy dodges it
- Exp system
    - Some items have level prerequisites for usage (Can still have in inventory)
    - Some items have stat prerequeisites
    - All humanoids have xp values and a level) level will affect the difficulty of tthe creature as it multiplies stats maybe?
    - Stats can be increased by leveling
        - As well as attributes 
        -(and maybe weapons/armor have their own experience?)
- Sanity
    - As it decreases youll see some things that are really there, see reality what its really for
    - Decreases when you get hit/see something crazy
    - Acc Down, Dmg Up
- Stealth
    - Each entity has a stealth variable indicating whether they're currently actively trying to hide.
    - Vision fields for each entity
*/

//#region MAIN CODE

//#region INIT       
let admins = ["REECE","PHILIP","DAVI"];
let debugging = false;
let paused = false;

let damageTypes = ["Bludgeoning","Piercing","Cutting","Explosive","Fire","Cold","Acid","Electric","Poison","Mind"];
let WEAPON_DB = new Map();
let ARMOR_DB = new Map();
let CONSUMABLE_DB = new Map();
let COLLECTIBLE_DB = new Map();
let ENTITY_PART_DB = new Map();
let ENTITY_DB = new Map();
let TILE_DB = new Map();
let MAP_DB = new Map();

let loadedEntities = [];
let currentMap;

let player;

let maxFPS = 30;
let lastFrameTimeMs = 0;


//Combat state variables

//actions per turn;
let aptMAX = 1;
let apt = 1;

// HTML Init
let buttonLeftHand = document.querySelector(`#leftHand`);
let buttonRightHand = document.querySelector(`#rightHand`);
let buttonBelt1 = document.querySelector(`#belt1`);
let buttonBelt2 = document.querySelector(`#belt2`);
let buttonBelt3 = document.querySelector(`#belt3`);

let buttonSwitch = document.querySelector(`#switch`);
let textRangedState = document.querySelector(`#rangeState`);
let rangedSwitch = true; //true = melee

let buttonRestart = document.querySelector('#restart');

let welcomeHeading = document.querySelector('#welcome');
let elemTitleStatus = document.querySelector("#tab-title");
let elemHealth = document.querySelector("#health");
let elemDay = document.querySelector("#day");

let numNotif = 0;

// Duration variables (in s)
let nextDayTime = maxFPS * 120; 

//Status variables
let inCombat = true;

//Event Testing
//let ev1 = new Event("Destroy the village?","The village is in ruin.","The village was spared.",3,[new Item("Flesh",10),new Item("Common Clothes",2)]);

let currentEvent;

itemInit();
entityInit();
tileInit();
mapInit();
currentMap = MAP_DB.get("Practice Map");

load();

showCombatButtons();
updateInventory();
updateEquipment();

welcomeHeading.textContent = player.welcome;
//#endregion

requestAnimationFrame(mainLoop);

function gameSpeed(time, multiplier){
    for(let i = 0; i < multiplier; i++){
        time += time;
    }
    return time;
}

function mainLoop(timestamp) {
    if(timestamp < lastFrameTimeMs + (1000 / maxFPS)){
        requestAnimationFrame(mainLoop);
        return;
    }
    lastFrameTimeMs = timestamp;
    update();
    requestAnimationFrame(mainLoop);
}

function update(){
    //increment time
    if(!paused){
        player.time++;
    }

    //Day Cycle
    if (player.time > nextDayTime) {
        player.time = 0;
        player.hurt(rollDice("1d10",1),"Mind");
        player.day++;
    }

    //Event Testing
    // if(player.day == 1 && ev1.queried == false){
    //     currentEvent = ev1;
    //     currentEvent.query();
    // }

    //Check if paused
 

    //Update HTML
    elemHealth.textContent = player.hp;
    elemDay.textContent = player.day;

    save();
}

//Roll one, or multiple dice for a specific damage type with a bonus option
function rollDice(dStr = "1d8", bonus = 0){
    let rStr;
    if(bonus != 0) rStr = `Rolling ${dStr} ${(bonus < 0) ? "-":"+"} ${Math.abs(bonus)}`;
    else rStr = `Rolling ${dStr}`;
    let oStr = ":";
    let total = 0; 
    let dIndex = dStr.indexOf("d");
    let num = parseInt(dStr.substring(0,dIndex),10);
    let size = parseInt(dStr.substring(dIndex+1),10);
    if(num <= 0 || size <= 0){
        console.log("Error, cannot roll with non-positive integers");
        return 0;
    }
    for(let j = 0; j < num; j++){
        let result = parseInt(Math.floor(Math.random() * size)+1);
        total += result;
        if(j == 0) oStr += ` ${result}`;
        else oStr += ` + ${result}`;
    }
    total += bonus;
    if(bonus != 0) rStr = rStr + oStr + ` ${(bonus < 0) ? "-":"+"} ${Math.abs(bonus)} = ${total}`;
    else rStr = rStr + oStr + ` = ${total}`;
    console.log(rStr);
    return total;
}

//#endregion

//#region SAVE STATE SYSTEM
function changePlayer(){
    localStorage.removeItem('player');
    player = new Player(prompt("Enter your name"));
    localStorage.setItem('player', JSON.stringify(player, replacer));
    welcomeHeading.textContent = player.welcome;
    lastFrameTimeMs = 0;
    updateInventory();
    updateEquipment(); 
}

function load(){
    let loadplayer;
    if (!localStorage.getItem('player')) {
        loadplayer = new Player(prompt("Enter your name"));
        localStorage.setItem('player', JSON.stringify(loadplayer));
    } else {
        let tempPlayer = JSON.parse(localStorage.getItem('player'), reviver);
        loadplayer = new Player(tempPlayer.name, tempPlayer.id, tempPlayer.x, tempPlayer.y, tempPlayer.type, tempPlayer.size, new Map(tempPlayer.inventory), new Map(tempPlayer.equipment), tempPlayer.hpMax, tempPlayer.hp, tempPlayer.invMaxSize, tempPlayer.invCurSize, tempPlayer.day, tempPlayer.time, tempPlayer.desc, tempPlayer.stats, tempPlayer.aiType, tempPlayer.char, tempPlayer.clr, tempPlayer.race, tempPlayer.gender, tempPlayer.age, tempPlayer.height, tempPlayer.build, tempPlayer.eyecolor, tempPlayer.haircolor, tempPlayer.hairlength);
    }
    player = loadplayer;
    updateInventory();
    return loadplayer;
}

function save(){
    let string = JSON.stringify(player, replacer);
    localStorage.setItem('player', string);
    return string;
}

function replacer(key,value) {
    const origObj = this[key];
    if(origObj instanceof Map){
        return {
            dataType: 'Map',
            value: Array.from(origObj.entries()),
        }
    } else {
        return value;
    }

}

function reviver(key, value) {
    if(typeof value === 'object' && value !== null){
        if(value.dataType === 'Map') {
            let map = new Map();
            if(key == "inventory" || key == "equipment"){
                value.value.forEach(element => {
                    let invItem = new ItemInstance(element[1].name, element[1].type, element[1].count, element[1].durability);
                    map.set(element[0], invItem);
                });
            } else if(key == "stats"){
                value.value.forEach(element => {
                    map.set(element[0], element[1]);
                });
            }
            return map;
        }
    }
    return value;
}

//#endregion

//#region HTML/CSS CODE

//#region Buttons 

buttonRestart.onclick = function(){
    changePlayer();
}

//Player combat buttons
buttonLeftHand.onclick = function() {
    if(rangedSwitch == true){
        
    } else {
        
    }
    apt--;
}
buttonRightHand.onclick = function() {
    if(rangedSwitch == false){

    } else {
        
    }
    apt--;
}
buttonBelt1.onclick = function() {
    apt--;
}
buttonBelt2.onclick = function() {
    apt--;
}
buttonBelt3.onclick = function() {
    apt--;
}

buttonSwitch.onclick = function() {
    if(rangedSwitch){
        textRangedState.textContent = " Range";
        rangedSwitch = !rangedSwitch;
    } else {
        textRangedState.textContent = " Melee ";
        rangedSwitch = !rangedSwitch;
    }
}

function hideCombatButtons(){
    buttonLeftHand.disabled = true;
    buttonRightHand.disabled = true;
    buttonBelt1.disabled = true;
    buttonBelt2.disabled = true;
    buttonBelt3.disabled = true;
}

function showCombatButtons(){
    buttonLeftHand.disabled = false;
    buttonRightHand.disabled = false;
    buttonBelt1.disabled = false;
    buttonBelt2.disabled = false;
    buttonBelt3.disabled = false;
}


//#endregion

function updateInventory(){
    document.getElementById("Inventory").innerHTML = "";
    player.inventory.forEach(function(value, key, map){
        let node = document.createElement("LI");
        let textNode;
        if(value.type != "COLLECTIBLE"){
            textNode = document.createTextNode(`${value.name} x${value.count} <|> ${value.durability}/100 `);
        } else {
            textNode = document.createTextNode(`${value.name} x${value.count}`);
        }
        node.appendChild(textNode);
        document.getElementById("Inventory").appendChild(node);
    });
}

function updateEquipment(){
    document.getElementById("Equipped").innerHTML = "";
    player.equipment.forEach(function(value, key, map){
        let node = document.createElement("LI");
        let textNode = document.createTextNode(`${key}: ${value.name}`);
        node.appendChild(textNode);
        document.getElementById("Equipped").appendChild(node);
    });

    buttonLeftHand.textContent = player.equipment.get("LeftHand").name;
    buttonRightHand.textContent = player.equipment.get("RightHand").name;
    buttonBelt1.textContent = player.equipment.get("Belt1").name;
    buttonBelt2.textContent = player.equipment.get("Belt2").name;
    buttonBelt3.textContent = player.equipment.get("Belt3").name;
}

function addDialogue(text){
    let diaBox = document.getElementById("Dialogue");
    let node = document.createElement("P");
    let textNode = document.createTextNode(text);
    node.appendChild(textNode);
    if(numNotif >= 13){
        diaBox.removeChild(diaBox.childNodes[0]);
    }
    diaBox.appendChild(node);
    numNotif++;
}

//#endregion

//#region ITEM SYSTEM

function itemInit(){
    //#region COLLECTIBLE INIT
    //#region Layout:
    /*
    createCollectibleItem(
        name, 
        desc,  
        size,
        slots,
        value, 
        rarity
        ammo,
    );
    */
    //#endregion
    //Special Case Items
    createCollectibleItem(
        "Empty",
        "There's nothing here.",
        0,
        ["Head", "Body", "Legs", "Hand", "Belt"],
        0,
        "Useless",
        "Empty"
    );//Empty
    createCollectibleItem(
        "Blocked",
        "Unusable",
        0,
        ["Head", "Body", "Legs", "Hand", "Belt"],
        0,
        "Useless",
        "Blocked"
    );//Blocked

    
    createCollectibleItem(
        "Flesh", 
        "Raw meat, still dripping with blood.",  
        1,
        ["Belt"],
        5, 
        "Commodity", 
        "Flesh"
    );//Flesh
    //#endregion

    //#region CONSUMABLE INIT
    //#region Layout:
    
    //#endregion
    //#endregion

    //#region WEAPON INIT
    //#region Layout:
    /*
    createWeaponItem(
        name, 
        desc,  
        size,
        slots,
        value, 
        rarity,
        ammo,
        stat,
        hit,
        damage, 
        type, 
        durabilityLoss, 
        range, 
        range2
    );
    */
   
    //#endregion
    createWeaponItem(
        "Wrench", 
        "A sturdy tool for fixing ... or bludgeoning.", 
        .5,
        ["Hand","Belt"],
        10, 
        "Commodity",
        "Wrench",
        "Strength",
        1,
        "1d6", 
        "Bludgeoning", 
        0.5, 
        1, 
        5
    ); //Wrench
    createWeaponItem(
        "Fist", 
        "Nothin' like a good old knuckle sandwich",
        .25,
        ["Hand"],
        0, 
        "Niche",
        "Fist",
        "Strength",
        0, 
        "1d4", 
        "Bludgeoning", 
        0, 
        1, 
        0
    ); //Fist
    createWeaponItem(
        "Improvised Weapon", 
        "Really? This?",
        0,
        ["Hand"],
        0, 
        "Useless",
        "Improvised Weapon",
        "Strength",
        0, 
        "1d4", 
        "Bludgeoning", 
        0, 
        1, 
        2
    ); //Fist

    //#endregion

    //#region ARMOR INIT
    //#region Layout:
    /*
    createArmorItem(
        name,
        desc,
        size,
        slots,
        value,
        rarity,
        ammo,
        stat,
        defense,
        durabilityLoss
    );
     */
    //#endregion
    createArmorItem(
        "Human Skull",
        "The host of your conscience",
        1,
        ["Head"],
        0,
        "Niche",
        "Blocked",
        "Human Skull",
        "Finesse",
        12,
        0
    ); //Human Torso
    createArmorItem(
        "Human Torso",
        "Flesh mounted upon bone",
        4,
        ["Body"],
        0,
        "Niche",
        "Blocked",
        "Human Torso",
        "Strength",
        10,
        0
    ); //Human Torso
    createArmorItem(
        "Human Legs",
        "Pistons of raw power",
        3,
        ["Legs"],
        0,
        "Niche",
        "Blocked",
        "Human Legs",
        "Finesse",
        11,
        0
    ); //Human Legs
    //#endregion

    //#region ENTITY PART INIT
    //#region Layout:
    /*
    createEntityPart(
        name,
        desc,
        size,
        slots,
        value,
        rarity,
        ammo,
        stat,
        hit,
        damage,
        damage_type,
        range,
        range2
        defense,
        reduction
    );
     */
    //#endregion

    //#region Corpse Feaster Parts
    createEntityPart(
        "Corpse Feaster Muscle",
        "Taught, stubborn, cold meat with an offensive stench",
        2,
        ["Corpse Feaster"],
        0,
        "Useless",
        "Corpse Feaster Muscle",
        "Strength",
        0,
        "0",
        "null",
        0,
        0,
        12,
        0
    ); //Corpse Feaster Muscle
    createEntityPart(
        "Corpse Feaster Maw", 
        "Two gaping maws fused to a single malformed skull, one for crushing bone, the other for tearing flesh. Smaller in size and vaguely human.", 
        1,
        ["Corpse Feaster"],
        0, 
        "Useless",
        "Corpse Feaster Maw",
        "Strength",
        2,
        "1d8", 
        "Piercing", 
        1, 
        0,
        14,
        -3
    ); //Corpse Feaster Maw
    createEntityPart(
        "Corpse Feaster Claws", 
        "An pair of claws primed for rending.", 
        1,
        ["Corpse Feaster"],
        0, 
        "Useless",
        "Corpse Feaster Claws",
        "Finesse",
        1,
        "2d4", 
        "Slashing", 
        1, 
        0,
        12,
        -.5
    ); //Corpse Feaster Maw

    // Object parts
    createEntityPart(
        "Stone",
        "Solid Stone",
        1,
        ["Object"],
        0,
        "Niche",
        "Stone", 
        "Strength",
        0,
        "0",
        "Bludgeoning",
        0,
        0,
        10,
        2
    )
    //#endregion
    
    //#endregion
}

function Item(name = "UNIDENTIFIED", desc = "An item shrouded in mystery", size = 1, slots = ["Belt"], value = 0, rarity = "Commodity", ammo = "UNIDENTIFIED"){
    this.name = name;
    this.size = size;
    this.value = value;
    this.desc = desc;
    this.slots = slots;
    this.rarity = rarity;
    this.ammo = ammo;
}

function Weapon(name = "UNIDENTIFIED", desc = "An item shrouded in mystery", size = 1, slots = ["Hand","Belt"], value = 0, rarity = "Commodity", ammo = "UNIDENTIFIED", stat = "Strength", hit = 0, damage = "1d8", damage_type = "Bludgeoning", durabilityLoss = 10, range = 1, range2 = 0){
    Item.call(this, name, desc, size, slots, value, rarity, ammo);
    this.hit = hit;
    this.stat = stat;
    this.damage = damage;
    this.damage_type = damage_type;
    this.durabilityLoss = durabilityLoss;
    this.range = range;
    this.range2 = range2;
}

function Armor(name = "UNIDENTIFIED", desc = "An item shrouded in mystery", size = 1, slots = ["Head","Body","Legs"], value = 0, rarity = "Niche", ammo = "UNIDENTIFIED", stat = "Strength", defense = 10, durabilityLoss = -1, reduction = 0){
    Item.call(this, name, desc, size, slots, value, rarity, ammo);
    this.defense = defense;
    this.stat = stat;
    this.durabilityLoss = durabilityLoss;
    this.reduction = reduction;
}

function CreaturePart(name = "UNIDENTIFIED", desc = "A part belonging to a mysterious creature", size = 1, slots = ["Creature"], value = 0, rarity = "Useless", ammo = "UNIDENTIFIED", stat = "Strength", hit = 0, damage = "1d8", damage_type = "Slashing", range = 1, range2 = 0, defense = 5, reduction = 0) {
    Item.call(this, name, desc, size, slots, value, rarity, ammo);
    this.stat = stat;
    this.hit = hit;
    this.damage = damage;
    this.damage_type = damage_type;
    this.range = range;
    this.range2 = range2;
    this.defense = defense;
    this.reduction = reduction;
}

function ItemInstance(name = "UNIDENTIFIED", type = "COLLECTIBLE", count = 1, durability = 100){
    this.name = name;
    this.type = type;
    this.count = count;
    this.durability = durability;
}

function reduceDurability(invItem = new ItemInstance(), entity = new Entity()){
    if(invItem.type == "WEAPON") {
        invItem.durability -= WEAPON_DB.get(invItem.name).durabilityLoss;
    }
    else if(invItem.type == "ARMOR") {
        invItem.durability -= ARMOR_DB.get(invItem.name).durabilityLoss;
    }
    if(invItem.durability <= 0) {
        invItem.count--;
        if (invItem.count == 0) {
            entity.inventory.delete(invItem.name);
        } else {
            invItem.durability = 100;
        }
    }
}

function createCollectibleItem(name = "UNIDENTIFIED", desc = "An item shrouded in mystery", size = 1, slots = ["Belt"], value = 0, rarity = "Commodity", ammo = "UNIDENTIFIED"){
    let item = new Item(name, desc, size, slots, value, rarity, ammo);
    COLLECTIBLE_DB.set(item.name, item);
}

function createArmorItem(name = "UNIDENTIFIED", desc = "An item shrouded in mystery", size = 1, slots = ["Head","Body","Legs"], value = 0, rarity = "Niche", ammo = "UNIDENTIFIED", stat = "Strength", defense = 10, durabilityLoss = -1, reduction = 0){
    let armor = new Armor(name, desc, size, slots, value, rarity, ammo, stat, defense, durabilityLoss, reduction);
    ARMOR_DB.set(armor.name, armor);
} 

function createWeaponItem(name = "UNIDENTIFIED", desc = "An item shrouded in mystery", size = 1, slots = ["Hands","Belt"], value = 0, rarity = "Commodity", ammo = "UNIDENTIFIED", stat = "Strength", hit = 0, damage = "1d8", type = "Bludgeoning", durabilityLoss = 10, range = 1, range2 = 0){
    let weapon = new Weapon(name, desc, size, slots, value, rarity, ammo, stat, hit, damage, type, durabilityLoss, range, range2);
    WEAPON_DB.set(weapon.name, weapon)
    
}

function createEntityPart(name = "UNIDENTIFIED", desc = "A part belonging to a mysterious creature", size = 1, slots = ["Creature"], value = 0, rarity = "Useless", ammo = "UNIDENTIFIED", stat = "Strength", hit = 0, damage = "1d8", damage_type = "Slashing", range = 1, range2 = 0, defense = 5, reduction = 0){
    let creature_part = new CreaturePart(name, desc, size, slots, value, rarity, ammo, stat, hit, damage, damage_type, range, range2, defense, reduction);
    ENTITY_PART_DB.set(name, creature_part);
}

function getItem(invItem = null){
    if(invItem == null){
        console.log("ERROR: attempting to retrieve a null item.")
    }
    let database;
    switch(invItem.type){
        case "COLLECTIBLE":
            database = COLLECTIBLE_DB;
            if(COLLECTIBLE_DB.get(invItem.name) == undefined) {
                console.log(`Failed to get ${invItem.name}, item DNE`);
                return false;
            }
            break;
        case "CONSUMABLE":
            database = CONSUMABLE_DB;
            if(CONSUMABLE_DB.get(invItem.name) == undefined) {
                console.log(`Failed to get ${invItem.name}, item DNE`);
                return false;
            }
            break;
        case "ARMOR":
            database = ARMOR_DB;
            if(ARMOR_DB.get(invItem.name) == undefined) {
                console.log(`Failed to get ${invItem.name}, item DNE`);
                return false;
            }
            break;
        case "WEAPON":
            database = WEAPON_DB;
            if(WEAPON_DB.get(invItem.name) == undefined) {
                console.log(`Failed to get ${invItem.name}, item DNE`);
                return false;
            }
            break;
        case "ENTITY_PART":
            database = ENTITY_PART_DB;
            if(database.get(invItem.name) == undefined) {
                console.log(`Failed to get ${invItem.name}, item DNE`);
                return false;
            }
            break;
    }
    return database.get(invItem.name);
}

//#endregion

//#region STORY CODE

// Risk [1-5] 
// 1: Trivial, 2: Minor, 3: Challenge, 4: Major, 5: Deadly

// function Event(prompt = "RANDOM", c1text = "DONE", c2text = "FAILED", risk = 1, loot = []){
//     this.prompt = prompt;
//     this.c1text = c1text;
//     this.c2text = c2text;
//     this.risk = risk;
//     this.loot = loot;
//     this.queried = false;
//     this.ran = false;
//     this.query = function(){
//         this.queried = true;
//         addDialogue(this.prompt);
//         c1 = false;
//         c2 = false;
//         buttonChoice1.style.visibility = "visible";
//         buttonChoice2.style.visibility = "visible"; 
//     }
//     this.run = function(){
//         this.ran = true;
//         if(c1 == true){
//             for (let i = 0; i < this.loot.length; i++) {
//                 addItem(this.loot[i]);
//             }
//             addDialogue(this.c1text);
//         }
//         else {
//             addDialogue(this.c2text);
//         }
//     }
// }
//#endregion 

//#region ENTITY SYSTEM
function entityInit(){
    //#region ENTITY INIT
    /*#region Layout:
    /*
    createEntity(
        name,
        id, 
        x,
        y,
        type, 
        size, 
        inventory, 
        equipment, 
        hpMax, 
        hp, 
        desc, 
        createStatBlock([10,10,10,10,10,10]),
        aiType,
        char,
        clr
    );
    */
    //#endregion
    createEntity(
        "Corpse Feaster",
        -1, 
        0,
        0,
        "Creature", 
        3, 
        new Map([["Corpse Feaster Maw", new ItemInstance("Corpse Feaster Maw", "ENTITY")],["Corpse Feaster Claws", new ItemInstance("Corpse Feaster Claws", "ENTITY")],["Corpse Feaster Muscle", new ItemInstance("Corpse Feaster Muscle", "ENTITY"),3]]),
        new Map([["Offense1", new ItemInstance("Corpse Feaster Maw", "ENTITY")],["Offense2", new ItemInstance("Corpse Feaster Claws", "ENTITY")],["Defense1", new ItemInstance("Corpse Feaster Muscle", "ENTITY")]]),
        50, 
        50, 
        "A stout and foul creature, reminiscent of a humanoid with malformed features. Two mouthes afixed to the same skull drool and chatter their teeth, primed to tear flesh from bone.", 
        createStatBlock(12,14,10,8,6,2),
        "Aggressive",
        "C",
        "red"
    );

    //#region OBJECT INIT
    createEntity(
        "Stone Wall",
        -1,
        0,
        0,
        "Object", 
        5, 
        new Map([["Stone", new ItemInstance("Stone", "ENTITY")]]),
        new Map([["Defense1", new ItemInstance("Stone", "ENTITY")]]),
        200, 
        200, 
        "A solid stone wall", 
        createStatBlock([20,0,20,0,0,0]),
        "None",
        "#",
        "white"
    );
    //#endregion
}

function createStatBlock(str = 10, fin = 10, vig = 10, will = 10, int = 10, soc = 10){
    let map = new Map([["Strength", str], ["Finesse", fin],["Vigor", vig],["Will-Power", will],["Intelligence", int],["Social", soc]]);
    return map;
}

function getStatModifier(entity = player, stat = "Strength"){
    let statVal = entity.stats.get(stat);
    return Math.floor((statVal-10)/2);
}

//buff/debuff
function tempStatChange(entity = player, stat = "Strength", val = "2", time = 30000){
    let oldVal = entity.stats.get(stat);
    entity.stats.set(stat, oldVal+val);
    setTimeout(function(){entity.stats.set(stat, oldVal);},time);
}

function Entity(name = "UNKNOWN", id = -1, x = 0, y = 0, type = "Object", size = 1, inventory = null, equipment = null, hpMax = 50, hp = 50, desc = "", stats = createStatBlock(), aiType = "Aggressive", char = "?", clr = "white"){
    this.name = name;
    this.id = id;
    this.x = x;
    this.y = y;
    this.type = type;
    this.size = size;
    this.inventory = (inventory == null) ? new Map():inventory;
    this.equipment = (equipment == null) ? new Map():equipment;
    this.stats = stats;
    this.hpMax = hpMax;
    this.hp = hp;
    this.desc = desc;
    this.aiType = aiType;
    this.char = char;
    this.clr = clr;
    this.toString = function(){
        return this.desc;
    }

    this.recover = function(amt = 0){ //
        if(amt < 0) amt = 0;
        let amtRec = amt + getStatModifier(this, "Vigor");
        if(this.hp + amtRec > this.hpMax){
            amtRec = this.hpMax - this.hp;
        } else if(amtRec < 0){
            amtRec = 0;
        }
        console.log(`${this.name} recovered `)
        this.hp += amtRec;

    }
    this.hurt = function(amt = 1, type = "Slashing"){
        let amtDmg = amt;
        if(amtDmg < 0) amtDmg = 0;
        //TODO: Check for resistances and recalculate amtDmg
        this.hp -= amtDmg;
    
        return amtDmg;
    }

    this.isAlive = function(){
        return (this.hp <= 0) ? true:false;
    }
}

function Humanoid(name = "UNKNOWN", id = -1, x = 0, y = 0, type = "Humanoid", size = 4, inventory = null, equipment = null, hpMax = 100, hp = 100, desc = "A human being with rugged and worn facial features.", stats = createStatBlock(), aiType = "Survivalist", char = "!", clr = "blue", race = "European", gender = "Male", age = 30, height = "5'10", build = "slim", eyecolor = "Brown", haircolor = "Black", hairlength = "Short"){
    Entity.call(this, name, id, x, y, type, size, inventory, equipment, hpMax, hp, desc, stats, aiType, char, clr);
    Humanoid.prototype = Object.create(Entity.prototype);
    this.equipment = (equipment == null) ? new Map([["Head", new ItemInstance("Human Skull", "ARMOR")],["Body", new ItemInstance("Human Torso", "ARMOR")], ["Legs", new ItemInstance("Human Legs", "ARMOR")], ["LeftHand", new ItemInstance("Fist", "WEAPON")], ["RightHand", new ItemInstance("Fist", "WEAPON")],["Belt1", new ItemInstance("Empty","COLLECTIBLE")], ["Belt2", new ItemInstance("Empty","COLLECTIBLE")], ["Belt3", new ItemInstance("Empty","COLLECTIBLE")]]):equipment;
    this.race = race;
    this.eyecolor = eyecolor;
    this.haircolor = haircolor;
    this.gender = gender;
    this.age = age;
    this.height = height;
    this.build = build;
    this.hairlength = hairlength;
    this.char = name[0];
}

function Player(name = "Poor Soul", id = -1, x = 0, y = 0, type = "Humanoid", size = 4, inventory = null, equipment = null, hpMax = 100, hp = 40, invMaxSize = 20, invCurSize = 0, day = 0, time = 0, desc = "This is you!", stats = createStatBlock(), aiType = "None", char="@", clr="green", race = "European", gender = "Male", age = 30, height = "5'10", build = "slim", eyecolor = "Brown", haircolor = "Black", hairlength = "Short"){   
    Humanoid.call(this, name, id, x, y, type, size, inventory, equipment, hpMax, hp, desc, stats, aiType, char, clr, race, gender, age, height, build, eyecolor, haircolor, hairlength);
    Player.prototype = Object.create(Humanoid.prototype);
    if(this.name == ""){
        this.name = "Poor Soul";
    }
    this.invMaxSize = invMaxSize;
    this.invCurSize = invCurSize;
    this.day = day;
    this.time = time;
    this.char = char;
    this.isAdmin = admins.includes(name.toUpperCase()) ? true : false;
    this.welcome = (this.isAdmin == true) ? `${this.name}'s Lair` : `${this.name}'s Hovel`;
    this.recover = function(amt = 1){ //
        let amtRec;
        if(amt <= 0) amtRec = 0;
        else if(this.hp+amt > this.hpMax){
            amtRec = this.hpMax - this.hp;
        } else {
            amtRec = amt;
        }
        this.hp += amtRec;
        addDialogue(`Recovered ${amtRec} hitpoints.`)

    }
    this.addItem = function(name = "UNIDENTIFIED", type = "COLLECTIBLE", count = 1){
        let invItem = new ItemInstance(name, type, count);
        let item = getItem(invItem);
        if(item == false){
            return false;
        }
        if(this.inventory.get(name) != undefined){
            invItem.count += player.inventory.get(name).count;
            invItem.durability = player.inventory.get(name).durability;
        }
        this.invCurSize += item.size;
        if(this.invCurSize > this.invMaxSize){
            this.invCurSize = this.invCurSize - item.size;
            addDialogue(`Failed to add ${name} to inventory: item too large.`);
            return false;
        }
        player.inventory.set(name, invItem)
        updateInventory();
        localStorage.setItem('player', JSON.stringify(player));
        addDialogue(`Added ${name} x${count} to inventory`);
        return true;
    
    }
    this.removeItem = function(itemName, count = 1){
        if(this.inventory.get(itemName) == undefined){
            console.log(`There is no ${itemName} to remove!`);
            return false;
        }
        let invItem = this.inventory.get(itemName);
        if (count >= this.inventory.get(itemName).count || count == -1){
            this.invCurSize -= getItem(invItem).size*invItem.count;
            this.inventory.delete(itemName);
        } else { 
            invItem.count -= count;
            this.invCurSize -= getItem(invItem).size*count;
            this.inventory.set(itemName, invItem);
        }
        updateInventory();
        localStorage.setItem('player', JSON.stringify(player));
        console.log(`Removed ${(count == -1) ? "all" : count} ${itemName}(s) from inventory`);
        return true;
    }
    this.equip = function(slot = "LeftHand", invItem = new ItemInstance("Empty","COLLECTIBLE")){
        let item = getItem(invItem);
        if(this.inventory.get(item.name) == undefined){
            console.log(`ERROR: Player doesn't have ${item.name} and can't equip it!`);
            return false;
        }
        if(slot.includes("Head") && !(item.slots.includes("Head"))){
            addDialogue(`Cannot equip ${item.name}! Invalid slot.`)
            return false;
        }
        else if(slot.includes("Body") && !(item.slots.includes("Body"))) {
            addDialogue(`Cannot equip ${item.name}! Invalid slot.`)
        }
        else if(slot.includes("Legs") && !(item.slots.includes("Legs"))){
            addDialogue(`Cannot equip ${item.name}! Invalid slot.`)
            return false;
        }
        else if(slot.includes("Hand") && !(item.slots.includes("Hand"))){
            addDialogue(`Cannot equip ${item.name}! Invalid slot.`)
            return false;
        }
        else if(slot.includes("Belt") && !(item.slots.includes("Belt"))){
            addDialogue(`Cannot equip ${item.name}! Invalid slot.`)
            return false;
        } 
        if(this.equipment.get(slot).name == "Blocked"){
            addDialogue(`Cannot equip ${item.name}! The slot is currently blocked.`);
            return false;
        }
        //Two handed item!
        if((slot == "LeftHand" || slot == "RightHand") && getItem(invItem).size >= 3){
            let oppHand = (slot == "LeftHand") ? "RightHand":"LeftHand";
            this.equipment.set(oppHand, new ItemInstance("Blocked"));
        }
        updateEquipment();
        return true;
    }

}

function createEntity(name = "UNKNOWN", id = -1, x=0, y=0, type = "Object", size = 1, inventory = null, equipment = null, hpMax = 50, hp = 50, desc = "", stats = createStatBlock(), aiType = "Aggressive", char = "?", clr="white"){
    let entity = new Entity(name, id, x, y, type, size, inventory, equipment, hpMax, hp, desc, stats, aiType, char, clr);
    ENTITY_DB.set(entity.name, entity);
}

//#endregion

//#region COMBAT SYSTEM
/*
Combat:
1. Decide turn order
    - Check for surprises, if an attacker engages combat and surprises the enemy then they essentially get a free turn.
2. Can do a number of actions on a turn
*/
function initCompare(i1 = new InitElem(), i2 = new InitElem()){
    //Tie Case
    if(i2.init == i1.init){
        return i2.entity.stats.get("Finesse")-i1.entity.stats.get("Finesse");
    }
    return i2.init - i1.init;
}

function InitElement(init = 0, entity = new Entity()){
    this.init = init;
    this.entity = entity;
}

function combat(enemyArr = []){ //allyArr = [], neutralArr = []
    let initArr = [];
    //Initiate initiative array to determine combat order
    let initVal = new InitElement(rollDice("1d20", getStatModifier(player, "Finesse")), player);
    initArr.push(initVal);
    for(let i = 0; i < enemyArr.length; i++){
        let enemy = enemyArr[i];
        initVal = new InitElement(rollDice("1d20", getStatModifier(enemy, "Finesse")), enemy);
        initArr.push(initVal);
    }
    //Sort
    initArr.sort(initCompare);
    let rounds = 0;
    //Combat loop
    inCombat = true;
    while(inCombat) {   
        for(let i = 0; i < initArr.length; i++){
            currEntity = initArr[i].entity;
            if(currEntity.isAlive() == true){
                inCombat = awaitTurn(currEntity);
            }
        }
        rounds++;
        //Check if all enemies are dead
        let dead_count = 0;
        for(let i = 0; i < enemyArr.length; i++) {
            if (enemyArr[i].isAlive() == false) {
                dead_count++;
            }
        }
        inCombat = (player.hp > 0 && (dead_count != enemyArr.length));
    }
    inCombat = false;
    hideCombatButtons();
    return rounds;
}

function awaitTurn(entity = new Entity()){
    apt = aptMAX;
    if(player = entity){
        showCombatButtons();
        hideCombatButtons();
    } else {

    }
}

function meleeAttack(attacker = player, weapon = WEAPON_DB.get("Fist"), target = player, part = ARMOR_DB.get("Human Torso")){
    let ammo = weapon.ammo;
    if(weapon.damage == undefined) weapon = WEAPON_DB.get("Improvised Weapon");
    /*Check range
    if(distanceBetween(attacker, target) > weapon.range2) {
        miss retard too far idiot retard
        return false;
    }
    */
    let hitBonus = weapon.hit + getStatModifier(attacker, weapon.stat); // + attacker.buffs.get("hit") + expLevel;
    let hitVal = rollDice("1d20",hitBonus);
    let defVal = part.defense + getStatModifier(target, part.stat); // + target.buffs.get("defense") + expLevel;
    if(hitVal >= defVal){ // Hit!
        let dmgBonus = getStatModifier(attacker, weapon.stat) - part.reduction; // + attacker.buffs.get("damage") + expLevel;
        let dmgVal = rollDice(weapon.damage, dmgBonus);
        target.hurt(dmgVal, weapon.damage_type);
        reduceDurability(attacker.inventory.get(weapon.name), attacker);
        return true;
    }
    else return false;
}

// function rangedAttack(weapon = WEAPON_DB.get("Wrench"), attacker = player, target = player, part = ARMOR_DB.get("Human Torso")){
//     /*Check range
//     lose ammo
//     if(distanceBetween(attacker, target) > weapon.range2) {
//         miss retard too far idiot
//     }
// }

//#endregion

//MAP SYSTEM

function tileInit(){
    initTile("Void",
        "The ceaseless void.",
        0,
        0,
        " ",
        "grey",
    );
    initTile("Grass",
        "A patch of green grass.",
        0, 
        0, 
        ",", 
        "green"   
    );
    initTile("Stone",
        "Cold stone",
        0, 
        0, 
        ".", 
        "white"   
    );
}

function Tile(env = "Void", desc=null, pos_x = 0, pos_y = 0, char = "x", clr = "white"){
    this.env = env;
    this.pos_x = pos_x;
    this.pos_y = pos_y;
    this.desc = `This is a ${this.env} tile`;
    this.char = char;
    this.clr = clr;
}

function initTile(env = "Void", desc=null, pos_x = 0, pos_y = 0, char = "x", clr = "white"){
    let tile = new Tile(env, desc, pos_x, pos_y, char, clr);
    TILE_DB.set(env, tile);
}

function mapInit(){
    //#regionPractice Map
    let tMap = new tileMap("Practice Map", 10, 10, 1, true, "practice");
    tMap.setTile([[4,1],[4,2],[4,3],[4,4],[4,5],[4,6],[4,7],[4,8]],"Stone");
    tMap.setTile([[5,1],[5,2],[5,3],[5,4],[5,5],[5,6],[5,7],[5,8]],"Stone");
    tMap.setTile([[1,4],[2,4],[3,4],[6,4],[7,4],[8,4]],"Stone");
    tMap.setTile([[1,5],[2,5],[3,5],[6,5],[7,5],[8,5]],"Stone");
    tMap.setTile([[3,3],[3,6],[6,3],[6,6]],"Stone");
    MAP_DB.set(tMap.name, tMap );
    //#endregion
}
    

function tileMap(name = "UNNAMED MAP", height = 2, width = 2, scale = 1, indoor = true, region = "grassland"){
    //Stores the actual map array
    this.name = name;
    this.entities = [];
    this.width = width;
    this.height = height;
    this.scale = scale;
    this.indoor = indoor;
    this.map = [];
    this.setTile = function(coords = [],tileEnv,nDesc = null){
        for(let i = 0; i < coords.length; i++){
            let x = coords[i][0];
            let y = coords[i][1];
            let tile = TILE_DB.get(tileEnv);
            let tDesc = (nDesc == null) ? tile.desc:nDesc;
            let tileClone = new Tile(tile.env, tDesc, x, y, tile.char, tile.clr);
            this.map[x][y] = tileClone;
        }
    };

    this.isBound = function(pos_x = 0, pos_y = 0){
        return (pos_x == 0 || pos_y == 0 || pos_x == width || pos_y == height );
    };

    if(indoor){
        for(let x = 0; x < this.width; x++){
            this.map[x] = [];
            for(let y = 0; y < height; y++){
                this.setTile([[x, y]], "Void");
            } 
        }
    } else {
        for(let x = 0; x < this.width; x++){
            this.map.map[x] = [];
            for(let y = 0; y < height; y++){
                this.setTile([[x, y]], "Grass");
            }
        }
    }
}

function printMap(){
    let char_arr = []
    for(let x = 0; x < currentMap.width; x++){
        let rStr = "";
        char_arr[x] = [];
        for(let y = 0; y < currentMap.height; y++){
            if(isOccupied(x,y)){
                entity = getEntityAt(x, y);
                char_arr[x][y] = entity.char;
            }
            else char_arr[x][y] = currentMap.map[x][y].char;
            rStr += char_arr[x][y];
        } 
        addDialogue(rStr);
    }
}

function addEntity(entityName, x, y){
    let entity = ENTITY_DB.get(entityName);
    if(!validTile(x,y)) return false;
    let id = 0; //determine id
    for(let i = 0; i < loadedEntities.length; i++){
        if(loadedEntities[i].name == entity.name) id++;
    }
    //randomize loot table for inventory
    let entityClone = new Entity(entity.name, id, entity.type, entity.size, entity.inventory, entity.equipment, entity.hpMax, entity.hp, entity.desc, entity.stats, entity.aiType, entity.char, entity.clr);
    this.entities.push(entityClone);
    return true;
}

function removeEntity(entity){
    let ind = loadedEntities.indexOf(entity);
    if(ind == -1) return false;
    loadedEntities.splice(ind, 1);
    return true;
}

function isOccupied(x, y){
    let entity_occ = false;
    for(let i = 0; i < currentMap.entities.length; i++){
        if(entities[i].x == x && entities[i].y == y) {
            entity_occ = true;
        }
    }
    return entity_occ;
}

function getEntityAt(x,y){
    let entity = null;
    for(let i = 0; i < currentMap.entities.length; i++){
        if(entities[i].x == x && entities[i].y == y) {
            entity = entities[i];
        }
    }
    return entity;
}

function validTile(x, y){
    return (!isOccupied(x, y) && curretMap.env != "Void");
    
}


//PLAYER MAP EXAMPLE
/*
         ___________________________
        |                           |
        |       ...........         |
        |         ............      |
        |      ...o..      .......  | 
        |    .....    ,,,    .......|
        |    ^^^.....        .....  |
        |   ^^^.^^..@.........      |
        |          ...              | 
        |___________________________|
*/
