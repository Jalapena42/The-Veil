'use strict';

//#region MAIN ENGINE CODE

//#region INIT       
let admins = ["REECE","PHILIP","DAVI"];
let debugging = false;
let paused = false;

//                     0        1-20       21-40      41-60      61-80       81-100   
let statusOptions = ["Dead","Suffering","Starving", "Hungry", "Satisfied", "Thriving"]
let damageTypes = ["Bludgeoning","Piercing","Cutting","Explosive","Fire","Cold","Acid","Electric","Poison","Mind"];
let WEAPON_DB = new Map();
let ARMOR_DB = new Map();
let CONSUMABLE_DB = new Map();
let COLLECTIBLE_DB = new Map();
itemInit();

let user;
load();
updateInventory();

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
let elemStatus = document.querySelector("#status");
let elemDay = document.querySelector("#day");

let numNotif = 0;

let c1 = false;
let c2 = false;

welcomeHeading.textContent = user.welcome;

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
    user.time++;
    if (user.time > nextDayTime) {
        user.time = 0;
        user.damage(rollDice(["1d10"]),"Mind");
        user.day++;
    }

    //Hunt Cycle
    if (canHunt == false) {
        canHunt = (lastFrameTimeMs > lastHunt + huntTime) ? true : false;
    }

    //Eat Cycle
    if(canEat == false) {
        canEat = (lastFrameTimeMs > lastEat + eatTime) ? true : false;
    }
    if (user.inventory.get("Flesh") == undefined) buttonEatFood.style.visibility = "hidden";
    else buttonEatFood.style.visibility = "visible";

    //Event Testing
    // if(user.day == 1 && ev1.queried == false){
    //     currentEvent = ev1;
    //     currentEvent.query();
    // }

    //Check if paused
    if(paused == true){
    }

    //Update HTML
    elemHealth.textContent = user.hp;
    elemStatus.textContent = user.status;
    elemTitleStatus.textContent = `${user.status} Beast`;
    elemDay.textContent = user.day;

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
function changeUser(){
    localStorage.removeItem('user');
    user = new User(prompt("Enter your name"));
    localStorage.setItem('user', JSON.stringify(user, replacer));
    welcomeHeading.textContent = user.welcome;
    lastFrameTimeMs = 0;
    lastHunt = 0;
    lastEat = 0;
    updateInventory();
}

function load(){
    let loaduser;
    if (!localStorage.getItem('user')) {
        loaduser = new User(prompt("Enter your name"));
        localStorage.setItem('user', JSON.stringify(loaduser));
    } else {
        let tempUser = JSON.parse(localStorage.getItem('user'), reviver);
        loaduser = new User(tempUser.name, new Map(tempUser.inventory), new Map(tempUser.equipment), tempUser.status, tempUser.hpMax, tempUser.hp, tempUser.day, tempUser.time);
    }
    user = loaduser;
    updateInventory();
    return loaduser;
}

function save(){
    let string = JSON.stringify(user, replacer);
    localStorage.setItem('user', string);
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

function User(name = "Poor Soul", inventory = null, equipment = null, status = statusOptions[2], hpMax = 100, hp = 40, day = 0, time = 0){   
    if(name == null){
        name = "Poor Soul"
    }
    this.inventory = (inventory == null) ? new Map():inventory;
    this.equipment = (equipment == null) ? new Map([["Head", new InvItem("Human Skull", "ARMOR")],["Body", new InvItem("Human Torso", "ARMOR")], ["Legs", new InvItem("Human Legs", "ARMOR")], ["LeftHand", new InvItem("Fist", "WEAPON")], ["RightHand", new InvItem("Fist", "WEAPON")],["Belt1", new InvItem("Empty","COLLECTIBLE")], ["Belt2", new InvItem("Empty","COLLECTIBLE")], ["Belt3", new InvItem("Empty","COLLECTIBLE")]]):equipment;
    this.status = status;
    this.hpMax = hpMax;
    this.hp = hp; 
    this.day = day;
    this.time = time;
    this.name = name;
    this.isAdmin = admins.includes(name.toUpperCase()) ? true : false;
    this.welcome = (this.isAdmin == true) ? `${this.name}'s Lair` : `${this.name}'s Hovel`;
    this.toString = function(){
        return this.name;
    }
    //User Methods
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
    this.damage = function(amt = 1, type = "Slashing"){
        let amtDmg = amt;
        if(amtDmg < 0) amtDmg = 0;
        //TODO: Check for resistances and recalculate amtDmg
        this.hp -= amtDmg;
        //Death
        if(this.hp <= 0){
            this.hp = 0;
            this.status = statusOptions[0];
            addDialogue(`You've succumbed to your wounds after taking ${amtDmg} ${type} damage.`)
            changeUser();
            return amtDmg;
        } else {
            addDialogue(`You take ${amtDmg} ${type} damage.`);
            if(this.hp >= 81) this.status = statusOptions[5]
            else if(this.hp >= 61) this.status = statusOptions[4];
            else if (this.hp >= 41) this.status = statusOptions[3];
            else if (this.hp >= 21) this.status = statusOptions[2];
            else if (this.hp >= 1) this.status = statusOptions[1];
            return amtDmg;
        }
    }

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
        user.damage(rollDice(["1d8","1d4"]), damageTypes[Math.floor(Math.random()*4)]);
        addItem("Flesh", "COLLECTIBLE", 1);
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
        let eaten = removeItem("Flesh");
        if(eaten == true){
            user.recover(rollDice(["1d8"]));
        }
        canEat = false;
        lastEat = lastFrameTimeMs;
        addDialogue(`Must wait ${Math.round(eatTime /1000)} seconds to devour more.`);
    } 
    buttonEatFood.disabled = true
    setTimeout(function() {buttonEatFood.disabled = false}, eatTime);
}

buttonRestart.onclick = function(){
    changeUser();
}
//#endregion

function updateInventory(){
    if(!user.inventory) user.inventory = new Map();
    document.getElementById("Inventory").innerHTML = "";
    user.inventory.forEach(function(value, key, map){
        let node = document.createElement("LI");
        let textNode
        if(value.type != "COLLECTIBLE"){
            textNode = document.createTextNode(`${value.name} x${value.count} <|> Dur: ${value.durability}/100 `);
        } else {
            textNode = document.createTextNode(`${value.name} x${value.count}`);
        }
        node.appendChild(textNode);
        document.getElementById("Inventory").appendChild(node);
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
        weight, 
        value, 
        rarity
    );
    */
    //#endregion
    createCollectibleItem(
        "Empty",
        "There's nothing here.",
        0,
        0,
        "Useless"
    );//Empty
    createCollectibleItem(
        "Flesh", 
        "Raw meat, still dripping with blood.",  
        3, 
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
        weight, 
        value, 
        rarity,
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
        2, 
        10, 
        "Commodity",
        "1d4", 
        "Bludgeoning", 
        0.5, 
        1, 
        10
    ); //Wrench
    createWeaponItem(
        "Corpse Feasters Maw", 
        "Two gaping maws fused to a single malformed skull, one for crushing bone, the other for tearing flesh. Smaller in size and vaguely human.", 
        10, 
        0, 
        "Useless",
        "1d8", 
        "Piercing", 
        0, 
        1,
        0
    ); //Corpse Feasters Maw
    createWeaponItem(
        "Fist", 
        "Nothin' like a good old knuckle sandwich",
        3, 
        0, 
        "Niche", 
        "1d4", 
        "Bludgeoning", 
        0, 
        1, 
        0
    ); //Fist


    //#endregion

    //#region ARMOR INIT
    //#region Layout:
    /*
    createArmorItem(
        name,
        desc,
        weight,
        value,
        rarity,
        defense,
        type,
        durabilityLoss
    );
     */
    //#endregion
    createArmorItem(
        "Human Torso",
        "Flesh mounted upon bone",
        0,
        0,
        "Niche",
        10,
        "Natural",
        0
    ); //Human Torso

    createArmorItem(
        "Corpse Feaster Muscle",
        "Taught, stubborn, cold meat with an offensive stench",
        5,
        0,
        "Useless",
        14,
        "Natural",
        0
    ); //Corpse Feaster Muscle
    //#endregion
}

function Item(name = "UNIDENTIFIED", desc = "An item shrouded in mystery", weight = 0, value = 0, rarity = "Commodity"){
    this.name = name;
    this.weight = weight;
    this.value = value;
    this.desc = desc;
    this.rarity = rarity;
}

function Weapon(name = "UNIDENTIFIED", desc = "An item shrouded in mystery", weight = 0, value = 0, rarity = "Commodity", damage = "1d8", type = "bludgeoning", durabilityLoss = 10, range = 1, range2 = 0){
    Item.call(this, name, desc, weight, value, rarity);
    this.damage = damage;
    this.type = type;
    this.durabilityLoss = durabilityLoss;
    this.range = range;
    this.range2 = range2;

}

function Armor(name = "UNIDENTIFIED", desc = "An item shrouded in mystery", weight = 0, value = 0, rarity = "Niche", defense = 10, type = "natural", durabilityLoss = -1, reduction = 0){
    Item.call(this, name, desc, weight, value);
    this.defense = defense;
    this.type = type;
    this.durabilityLoss = durabilityLoss;
    this.reduction = reduction;
}

function InvItem(name = "UNIDENTIFIED", type = "COLLECTIBLE", count = 1, durability = 100){
    this.name = name;
    this.type = type;
    this.count = count;
    this.durability = durability;
}

function createCollectibleItem(name = "UNIDENTIFIED", desc = "An item shrouded in mystery", weight = 0, value = 0, rarity = "Commodity"){
    let item = new Item(name, desc, weight, value, rarity);
    COLLECTIBLE_DB.set(item.name, item);
}
function createArmorItem(name = "UNIDENTIFIED", desc = "An item shrouded in mystery", weight = 0, value = 0, rarity = "Niche", defense = 10, type = "natural", durabilityLoss = -1, reduction = 0){
    let armor = new Armor(name, desc, weight, value, rarity, defense, type, durabilityLoss, reduction);
    ARMOR_DB.set(armor.name, armor);
} 
function createWeaponItem(name = "UNIDENTIFIED", desc = "An item shrouded in mystery", weight = 0, value = 0, rarity = "Commodity", damage = "1d8", type = "bludgeoning", durabilityLoss = 10, range = 1, range2 = 0){
    let weapon = new Weapon(name, desc, weight, value, rarity, damage, type, durabilityLoss, range, range2);
    WEAPON_DB.set(weapon.name, weapon)
}

function addItem(name = "UNIDENTIFIED", type = "COLLECTIBLE", count = 1){
    switch(type){
        case "COLLECTIBLE":
            if(COLLECTIBLE_DB.get(name) == undefined) {
                console.log(`Failed to add ${name} to inventory, item DNE`);
                return false;
            }
            break;
        case "CONSUMABLE":
            if(CONSUMABLE_DB.get(name) == undefined) {
                console.log(`Failed to add ${name} to inventory, item DNE`);
                return false;
            }
            break;
        case "ARMOR":
            if(ARMOR_DB.get(name) == undefined) {
                console.log(`Failed to add ${name} to inventory, item DNE`);
                return false;
            }
            break;
        case "WEAPON":
            if(WEAPON_DB.get(name) == undefined) {
                console.log(`Failed to add ${name} to inventory, item DNE`);
                return false;
            }
            break;
    }
    let invItem = new InvItem(name, type, count);
    if(user.inventory.get(name) != undefined){
        invItem.count += user.inventory.get(name).count;
        invItem.durability = user.inventory.get(name).durability;
    }
    user.inventory.set(name, invItem);
    updateInventory();
    localStorage.setItem('user', JSON.stringify(user));
    console.log(`Added ${name} x${count} to inventory`);
    return true;
}
//if count is -1, remove all of that item, 
function removeItem(itemName, count = 1){
    if(user.inventory.get(itemName) == undefined){
        console.log(`There is no ${itemName} to remove!`);
        return false;
    }
    if (count >= user.inventory.get(itemName).count || count == -1){
        user.inventory.delete(itemName);
    } else {
        let invItem = user.inventory.get(itemName);
        invItem.count -= count;
        user.inventory.set(itemName, invItem);
    }
    updateInventory();
    localStorage.setItem('user', JSON.stringify(user));
    console.log(`Removed ${(count == -1) ? "all" : count} ${itemName}(s) from inventory`);
    return true;
}

//#endregion

//// STORY CODE

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

//// COMBAT MECHANICS

//Damage Types []

// Stat Ratings [1-5] 
// 1: Minima, 2: Low, 3: Average, 4: High, 5: Maxima