'use strict';

/*TODO:
= UPDATE CORPSE FEEDER STATBLOCK
- Include position variables and distance functions for range checking
- Add ammo variable to weapons and creature parts
- Function to randomize loot table of a creature (inventory)
- Sanity
    - As it decreases youll see some things that are really there, see reality what its really for
    - Decreases when you get hit/see something crazy
    - Acc Down, Dmg Up
- Combat System
    -Attack option, choose hand and use the item in it as a weapon. Items not defined as weapons deal a base 1d4 damage + modifiers if resasonable.
    -Defend option, could be dodging/using a shield/withstanding an incoming blow
- Exploration?
    -Items have a use array, a list of keywords for items that can be a potential alternative use
    EX: .uses = []
*/

//#region MAIN ENGINE CODE

//#region INIT       
let admins = ["REECE","PHILIP","DAVI"];
let debugging = false;
let paused = false;

let damageTypes = ["Bludgeoning","Piercing","Cutting","Explosive","Fire","Cold","Acid","Electric","Poison","Mind"];
let WEAPON_DB = new Map();
let ARMOR_DB = new Map();
let CONSUMABLE_DB = new Map();
let COLLECTIBLE_DB = new Map();
let CREATURE_PART_DB = new Map();
let ENTITY_DB = new Map();
itemInit();
entityInit();

let player;
load();
updateInventory();
updateEquipment();

let maxFPS = 30;
let lastFrameTimeMs = 0; 

// Duration variables (in ms)
let nextDayTime = 3600; 

let lastHunt = 0;
let huntTime = 10000;
let canHunt = true;

let lastEat = 0;
let eatTime = 5000;
let canEat = true;

let buttonGetFood = document.querySelector('#getFood');
let buttonEatFood = document.querySelector('#eatFood');
let buttonChoice1 = document.querySelector('#choice1');
let buttonChoice2 = document.querySelector('#choice2');
let buttonRestart = document.querySelector('#restart');
let welcomeHeading = document.querySelector('#welcome');
let elemTitleStatus = document.querySelector("#tab-title");
let elemHealth = document.querySelector("#health");
let elemDay = document.querySelector("#day");

let numNotif = 0;

let c1 = false;
let c2 = false;

welcomeHeading.textContent = player.welcome;

//Event Testing
//let ev1 = new Event("Destroy the village?","The village is in ruin.","The village was spared.",3,[new Item("Flesh",10),new Item("Common Clothes",2)]);

let currentEvent;
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

    //Day Cycle
    player.time++;
    if (player.time > nextDayTime) {
        player.time = 0;
        player.hurt(rollDice(["1d10"]),"Mind");
        player.day++;
    }

    //Hunt Cycle
    if (canHunt == false) {
        canHunt = (lastFrameTimeMs > lastHunt + huntTime) ? true : false;
    }

    //Eat Cycle
    if(canEat == false) {
        canEat = (lastFrameTimeMs > lastEat + eatTime) ? true : false;
    }
    if (player.inventory.get("Flesh") == undefined) buttonEatFood.style.visibility = "hidden";
    else buttonEatFood.style.visibility = "visible";

    //Event Testing
    // if(player.day == 1 && ev1.queried == false){
    //     currentEvent = ev1;
    //     currentEvent.query();
    // }

    //Check if paused
    if(paused == true){
    }

    //Update HTML
    elemHealth.textContent = player.hp;
    elemDay.textContent = player.day;

    save();
}

//Roll one, or multiple dice for a specific damage type
function rollDice(dArr = ["1d8"]){
    let rStr = "Rolling";
    let oStr = ":";
    let total = 0;
    for(let i = 0; i < dArr.length; i++){
        let dStr = dArr[i];
        if(i == 0) rStr = rStr + ` ${dStr}`;
        else rStr = rStr + ` + ${dStr}`;
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
            if(i == 0 && j == 0) oStr += ` ${result}`;
            else oStr += ` + ${result}`;
        }
    }
    rStr = rStr + oStr + ` = ${total}`;
    console.log(rStr);
    return total;
}

//#region SAVE STATE SYSTEM
function changePlayer(){
    localStorage.removeItem('player');
    player = new Player(prompt("Enter your name"));
    localStorage.setItem('player', JSON.stringify(player, replacer));
    welcomeHeading.textContent = player.welcome;
    lastFrameTimeMs = 0;
    lastHunt = 0;
    lastEat = 0;
    updateInventory();
    updateEquipment(); 

/*
    0   0
      |
      |
      V
*/
}

function load(){
    let loadplayer;
    if (!localStorage.getItem('player')) {
        loadplayer = new Player(prompt("Enter your name"));
        localStorage.setItem('player', JSON.stringify(loadplayer));
    } else {
        let tempPlayer = JSON.parse(localStorage.getItem('player'), reviver);
        loadplayer = new Player(tempPlayer.name, tempPlayer.type, tempPlayer.size, new Map(tempPlayer.inventory), new Map(tempPlayer.equipment), tempPlayer.hpMax, tempPlayer.hp, tempPlayer.invMaxSize, tempPlayer.invCurSize, tempPlayer.day, tempPlayer.time, tempPlayer.desc, tempPlayer.stats, tempPlayer.race, tempPlayer.gender, tempPlayer.age, tempPlayer.height, tempPlayer.build, tempPlayer.eyecolor, tempPlayer.haircolor, tempPlayer.hairlength);
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
            let map = new Map()
            value.value.forEach(element => {
                let invItem = new InvItem(element[1].name, element[1].type, element[1].count, element[1].durability);
                map.set(element[0], invItem);
            });
            return map;
        }
    }
    return value;
}

//#endregion
//#endregion

//#region HTML/CSS CODE

//#region Buttons 
buttonChoice1.onclick = function(){
    c1 = true;
    buttonChoice1.style.visibility = "hidden";
    buttonChoice2.style.visibility = "hidden";
    currentEvent.run();
}

buttonChoice2.onclick = function () {
    c2 = true;
    buttonChoice1.style.visibility = "hidden";
    buttonChoice2.style.visibility = "hidden";
    currentEvent.run();
}

buttonGetFood.onclick = function(){
    
    if(canHunt == true){
        addDialogue(`The hunt commences...`);
        player.hurt(rollDice(["1d8","1d4"]), damageTypes[Math.floor(Math.random()*4)]);
        player.addItem("Flesh", "COLLECTIBLE", 1);
        canHunt = false;
        lastHunt = lastFrameTimeMs;
        addDialogue(`Must rest and wait ${Math.round(huntTime /1000)} seconds to hunt again.`);
    } 
    buttonGetFood.disabled = true
    setTimeout(function() {buttonGetFood.disabled = false}, huntTime);
}

buttonEatFood.onclick = function(){
    if(canEat == true){
        addDialogue(`You begin feasting...`);
        let eaten = player.removeItem("Flesh");
        if(eaten == true){
            player.recover(rollDice(["1d8"]));
        }
        canEat = false;
        lastEat = lastFrameTimeMs;
        addDialogue(`Must wait ${Math.round(eatTime /1000)} seconds to devour more.`);
    } 
    buttonEatFood.disabled = true
    setTimeout(function() {buttonEatFood.disabled = false}, eatTime);
}

buttonRestart.onclick = function(){
    changePlayer();
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
    );
    */
    //#endregion
    createCollectibleItem(
        "Empty",
        "There's nothing here.",
        0,
        ["Head", "Body", "Legs", "Hand", "Belt"],
        0,
        "Useless"
    );//Empty
    createCollectibleItem(
        "Blocked",
        "Unusable",
        0,
        ["Head", "Body", "Legs", "Hand", "Belt"],
        0,
        "Useless"
    );//Blocked
    createCollectibleItem(
        "Flesh", 
        "Raw meat, still dripping with blood.",  
        1,
        ["Belt"],
        5, 
        "Commodity"
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
        "Strength",
        1,
        "1d6", 
        "Bludgeoning", 
        0.5, 
        1, 
        10
    ); //Wrench
    createWeaponItem(
        "Fist", 
        "Nothin' like a good old knuckle sandwich",
        .25,
        ["Hand"],
        0, 
        "Niche",
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
        "Strength",
        0, 
        "1d4", 
        "Bludgeoning", 
        0, 
        0, 
        0
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
        defense,
        type,
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
        12,
        "Natural",
        0
    ); //Human Torso
    createArmorItem(
        "Human Torso",
        "Flesh mounted upon bone",
        4,
        ["Body"],
        0,
        "Niche",
        10,
        "Natural",
        0
    ); //Human Torso
    createArmorItem(
        "Human Legs",
        "Pistons of raw power",
        3,
        ["Legs"],
        0,
        "Niche",
        11,
        "Natural",
        0
    ); //Human Legs
    //#endregion

    //#region CREATURE PART INIT
    //#region Layout:
    /*
    createCreaturePart(
        name,
        desc,
        size,
        slots,
        value,
        rarity,
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
    createCreaturePart(
        "Corpse Feaster Muscle",
        "Taught, stubborn, cold meat with an offensive stench",
        2,
        ["Corpse Feaster"],
        0,
        "Useless",
        "Strength",
        0,
        "0",
        "null",
        0,
        0,
        13,
        0
    ); //Corpse Feaster Muscle
    createCreaturePart(
        "Corpse Feaster Maw", 
        "Two gaping maws fused to a single malformed skull, one for crushing bone, the other for tearing flesh. Smaller in size and vaguely human.", 
        1,
        ["Corpse Feaster"],
        0, 
        "Useless",
        "Strength",
        2,
        "1d8", 
        "Piercing", 
        1, 
        0,
        16,
        -3
    ); //Corpse Feaster Maw
    createCreaturePart(
        "Corpse Feaster Claws", 
        "A ", 
        1,
        ["Corpse Feaster"],
        0, 
        "Useless",
        "Finesse",
        1,
        "2d4", 
        "Slashing", 
        1, 
        0,
        14,
        -.5
    ); //Corpse Feaster Maw
    //#endregion
    
    //#endregion
}

function Item(name = "UNIDENTIFIED", desc = "An item shrouded in mystery", size = 1, slots = ["Belt"], value = 0, rarity = "Commodity"){
    this.name = name;
    this.size = size;
    this.value = value;
    this.desc = desc;
    this.slots = slots;
    this.rarity = rarity;
}

function Weapon(name = "UNIDENTIFIED", desc = "An item shrouded in mystery", size = 1, slots = ["Hand","Belt"], value = 0, rarity = "Commodity", stat = "Strength", hit = 0, damage = "1d8", damage_type = "Bludgeoning", durabilityLoss = 10, range = 1, range2 = 0){
    Item.call(this, name, desc, size, slots, value, rarity);
    this.hit = hit;
    this.stat = stat;
    this.damage = damage;
    this.damage_type = damage_type;
    this.durabilityLoss = durabilityLoss;
    this.range = range;
    this.range2 = range2;


}

function Armor(name = "UNIDENTIFIED", desc = "An item shrouded in mystery", size = 1, slots = ["Head","Body","Legs"], value = 0, rarity = "Niche", defense = 10, type = "Natural", durabilityLoss = -1, reduction = 0){
    Item.call(this, name, desc, size, slots, value, rarity);
    this.defense = defense;
    this.type = type;
    this.durabilityLoss = durabilityLoss;
    this.reduction = reduction;
}

function CreaturePart(name = "UNIDENTIFIED", desc = "A part belonging to a mysterious creature", size = 1, slots = ["Creature"], value = 0, rarity = "Useless", stat = "Strength", hit = 0, damage = "1d8", damage_type = "Slashing", range = 1, range2 = 0, defense = 5, reduction = 0) {
    Item.call(this, name, desc, size, slots, value, rarity);
    this.stat = stat;
    this.hit = hit;
    this.damage = damage;
    this.damage_type = damage_type;
    this.range = range;
    this.range2 = range2;
    this.defense = defense;
    this.reduction = reduction;
}

function InvItem(name = "UNIDENTIFIED", type = "COLLECTIBLE", count = 1, durability = 100){
    this.name = name;
    this.type = type;
    this.count = count;
    this.durability = durability;
}

function reduceDurability(invItem = new InvItem(), entity = new Entity()){
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

function createCollectibleItem(name = "UNIDENTIFIED", desc = "An item shrouded in mystery", size = 1, slots = ["Belt"], value = 0, rarity = "Commodity"){
    let item = new Item(name, desc, size, slots, value, rarity);
    COLLECTIBLE_DB.set(item.name, item);
}

function createArmorItem(name = "UNIDENTIFIED", desc = "An item shrouded in mystery", size = 1, slots = ["Head","Body","Legs"], value = 0, rarity = "Niche", defense = 10, type = "Natural", durabilityLoss = -1, reduction = 0){
    let armor = new Armor(name, desc, size, slots, value, rarity, defense, type, durabilityLoss, reduction);
    ARMOR_DB.set(armor.name, armor);
} 
function createWeaponItem(name = "UNIDENTIFIED", desc = "An item shrouded in mystery", size = 1, slots = ["Hands","Belt"], value = 0, rarity = "Commodity", stat = "Strength", hit = 0, damage = "1d8", type = "Bludgeoning", durabilityLoss = 10, range = 1, range2 = 0){
    let weapon = new Weapon(name, desc, size, slots, value, rarity, stat, hit, damage, type, durabilityLoss, range, range2);
    WEAPON_DB.set(weapon.name, weapon)
    
}
function createCreaturePart(name = "UNIDENTIFIED", desc = "A part belonging to a mysterious creature", size = 1, slots = ["Creature"], value = 0, rarity = "Useless", stat = "Strength", hit = 0, damage = "1d8", damage_type = "Slashing", range = 1, range2 = 0, defense = 5, reduction = 0){
    let creature_part = new CreaturePart(name, desc, size, slots, value, rarity, stat, hit, damage, damage_type, range, range2, defense, reduction);
    CREATURE_PART_DB.set(name, creature_part);
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
        case "CREATURE_PART":
            database = CREATURE_PART_DB;
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

function Event(prompt = "RANDOM", c1text = "DONE", c2text = "FAILED", risk = 1, loot = []){
    this.prompt = prompt;
    this.c1text = c1text;
    this.c2text = c2text;
    this.risk = risk;
    this.loot = loot;
    this.queried = false;
    this.ran = false;
    this.query = function(){
        this.queried = true;
        addDialogue(this.prompt);
        c1 = false;
        c2 = false;
        buttonChoice1.style.visibility = "visible";
        buttonChoice2.style.visibility = "visible"; 
    }
    this.run = function(){
        this.ran = true;
        if(c1 == true){
            for (let i = 0; i < this.loot.length; i++) {
                addItem(this.loot[i]);
            }
            addDialogue(this.c1text);
        }
        else {
            addDialogue(this.c2text);
        }
    }
}
//#endregion 

//#region ENTITY SYSTEM
function entityInit(){
    //#region CREATURE INIT
    /*#region Layout:
    /*
    createEntity(
        name, 
        type, 
        size, 
        inventory, 
        equipment, 
        hpMax, 
        hp, 
        desc, 
        createStatBlock([10,10,10,10,10,10])
    );
    */
    //#endregion
    createEntity(
        "Corpse Feaster", 
        "Creature", 
        3, 
        new Map([["Corpse Feaster Maw", new InvItem("Corpse Feaster Maw", "CREATURE")],["Corpse Feaster Claws", new InvItem("Corpse Feaster Claws", "CREATURE")],["Corpse Feaster Muscle", new InvItem("Corpse Feaster Muscle", "CREATURE"),3]]),
        new Map([["Offense1", new InvItem("Corpse Feaster Maw", "CREATURE")],["Offense2", new InvItem("Corpse Feaster Claws", "CREATURE")],["Defense1", new InvItem("Corpse Feaster Muscle", "CREATURE")]]),
        50, 
        50, 
        "A stout and foul creature, reminiscent of a humanoid with malformed features. Two mouthes drool and chatter their teeth, primed to tear flesh from bone.", 
        createStatBlock(12,14,10,8,6,2)
    );
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


function Entity(name = "UNKNOWN", type = "Object", size = 1, inventory = null, equipment = null, hpMax = 50, hp = 50, desc = "", stats = createStatBlock()){
    this.name = name;
    this.type = type;
    this.size = size;
    this.inventory = (inventory == null) ? new Map():inventory;
    this.equipment = (equipment == null) ? new Map():equipment;
    this.stats = stats;
    this.hpMax = hpMax;
    this.hp = hp;
    this.desc = desc;
    this.toString = function(){
        return this.desc;
    }
    this.recover = function(amt = 1){ //
        let amtRec;
        if(amt <= 0) amtRec = 0;
        else if(this.hp+amt > this.hpMax){
            amtRec = this.hpMax - this.hp;
        } else {
            amtRec = amt;
        }
        this.hp += amtRec;

    }
    this.hurt = function(amt = 1){
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

function Humanoid(name = "UNKNOWN", type = "Humanoid", size = 4, inventory = null, equipment = null, hpMax = 100, hp = 100, desc = "A human being with rugged and worn facial features.", stats = createStatBlock(), race = "European", gender = "Male", age = 30, height = "5'10", build = "slim", eyecolor = "Brown", haircolor = "Black", hairlength = "Short"){
    Entity.call(this, name, type, size, inventory, equipment, hpMax, hp, desc, stats);
    this.equipment = (equipment == null) ? new Map([["Head", new InvItem("Human Skull", "ARMOR")],["Body", new InvItem("Human Torso", "ARMOR")], ["Legs", new InvItem("Human Legs", "ARMOR")], ["LeftHand", new InvItem("Fist", "WEAPON")], ["RightHand", new InvItem("Fist", "WEAPON")],["Belt1", new InvItem("Empty","COLLECTIBLE")], ["Belt2", new InvItem("Empty","COLLECTIBLE")], ["Belt3", new InvItem("Empty","COLLECTIBLE")]]):equipment;
    this.race = race;
    this.eyecolor = eyecolor;
    this.haircolor = haircolor;
    this.gender = gender;
    this.age = age;
    this.height = height;
    this.build = build;
    this.hairlength = hairlength;
}

function Player(name = "Poor Soul", type = "Humanoid", size = 4, inventory = null, equipment = null, hpMax = 100, hp = 40, invMaxSize = 20, invCurSize = 0, day = 0, time = 0, desc = "This is you!", stats = createStatBlock(), race = "European", gender = "Male", age = 30, height = "5'10", build = "slim", eyecolor = "Brown", haircolor = "Black", hairlength = "Short"){   
    Humanoid.call(this, name, type, size, inventory, equipment, hpMax, hp, desc, stats, race, gender, age, height, build, eyecolor, haircolor, hairlength)
    if(this.name == ""){
        this.name = "Poor Soul";
    }
    this.invMaxSize = invMaxSize;
    this.invCurSize = invCurSize;
    this.day = day;
    this.time = time;
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
        let invItem = new InvItem(name, type, count);
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
    this.equip = function(slot = "LeftHand", invItem = new InvItem("Empty","COLLECTIBLE")){
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
            this.equipment.set(oppHand, new InvItem("Blocked"));
        }
        updateEquipment();
        return true;
    }

}

function createEntity(name = "UNKNOWN", type = "Object", size = 1, inventory = null, equipment = null, hpMax = 50, hp = 50, desc = "", stats = createStatBlock()){
    let entity = new Entity(name, type, size, inventory, equipment, hpMax, hp, desc, stats);
    ENTITY_DB.set(entity.name, entity);
}




//#endregion

//#endregion
//#region COMBAT SYSTEM

// function meleeAttack(attacker = player, weapon = WEAPON_DB.get("Fist"), target = player, part = ARMOR_DB.get("Human Torso")){
//     if(weapon.damage == undefined) weapon = WEAPON_DB.get("Improvised Weapon");
//     let toHit = weapon.hit + getStatModifier(attacker, wepStat); // + attacker.buffs.get("hit");
//     let hitVal = rollDice("1d20") + toHit;
//     if(hitVal >= part.defense){ // Hit!
//         let dmgVal = rollDice(wepDmg) + getStatModifier(attacker, wepStat) - part.reduction;
//         target.hurt(dmgVal);
//         reduceDurability(attacker.inventory.get(weapon.name), attacker);
//     }
// }

// function rangedAttack(weapon = WEAPON_DB.get("Wrench"), attacker = player, target = player, part = ARMOR_DB.get("Human Torso")){
//     /*Check range
//     lose ammo
//     if(distanceBetween(attacker, target) > weapon.range) {
//         miss retard too far idiot
//     }
//     */
//     let toHit = weapon.hit + getStatModifier(attacker, weapon.stat); // + attacker.buffs.get("hit");
//     let hitVal = rollDice("1d20") + toHit;
//     if(hitVal >= part.defense){ // Hit!
//         let dmgVal = rollDice(weapon.damage) + getStatModifier(attacker, weapon.stat);
//         target.hurt(dmgVal);
//         reduceDurability(attacker.inventory.get(weapon.name), attacker);
//     } else { // Miss!
        
//     }
// }

//#endregion
