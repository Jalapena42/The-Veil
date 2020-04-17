'use strict';

let admins = ["REECE","PHILIP","DAVI"];
let debugging = false;

//                     0        1-20       21-40      41-60      61-80       81-100            
let statusOptions = ["Dead","Suffering","Starving", "Hungry", "Satisfied", "Thriving"]
let user = load();
updateInventory();

let maxFPS = 60;
let lastFrameTimeMs = 0; 

// Duration variables (in ms)
let dayTime = 60000;
let nextDay = dayTime; 

let lastHunt = 0;
let huntTime = 10000;
let canHunt = true;

let lastEat = 0;
let eatTime = 5000;
let canEat = true;

let buttonGetFood = document.querySelector('#getFood');
let buttonEatFood = document.querySelector('#eatFood');
let welcomeHeading = document.querySelector('#welcome');
let elemTitleStatus = document.querySelector("#tab-title");
let elemHealth = document.querySelector("#health");
let elemStatus = document.querySelector("#status");
let elemDay = document.querySelector("#day");

addDialogue("Test");
addDialogue("Tes2t");

welcomeHeading.textContent = user.welcome;
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

buttonGetFood.onclick = function(){
    if(canHunt == true){
        let food = new Item("Flesh")
        user.health -= Math.floor(Math.random() * 10);
        addItem(food);
        canHunt = false;
        lastHunt = lastFrameTimeMs;
    } else {
        addDialogue(`You're currently resting, must wait ${Math.round((lastHunt + huntTime - lastFrameTimeMs)/1000)} second(s) to hunt again!`);
    }
}

buttonEatFood.onclick = function(){
    if(canEat == true){
        let eaten = removeItem("Flesh");
        if(eaten == true){
            user.health += 5;
        }
        canEat = false;
        lastEat = lastFrameTimeMs;
    } else {
        addDialogue(`You're currently feasting, must wait ${Math.round((lastEat + eatTime - lastFrameTimeMs)/1000)} second(s) to eat again!`);
    }
}

function addItem(item){
    let itemIdx = getItemInvIdx(item.name);
    if(itemIdx != -1){
        user.inventory[itemIdx].count += item.count;
    } else {
        user.inventory.push(item);
    }
    updateInventory();
    localStorage.setItem('user', JSON.stringify(user));
    console.log(`Added ${item.name} x${item.count} to inventory`);
}

//if count is -1, remove all of that item, 
function removeItem(itemName, count = 1){
    let itemIdx = getItemInvIdx(itemName);
    if(itemIdx == -1){
        console.log(`There is no ${itemName} to remove!`);
        return false;
    }
    if (count >= user.inventory[itemIdx].count || count == -1){
        user.inventory.splice(itemIdx, 1);
    } else {
        user.inventory[itemIdx].count -= count;
    }
    updateInventory();
    localStorage.setItem('user', JSON.stringify(user));
    console.log(`Removed ${(count == -1) ? "all" : count} ${itemName}(s) from inventory`);
    return true;
}

function getItemInvIdx(itemName){
    return user.inventory.findIndex(xItem => xItem['name'] === itemName);
}

function updateInventory(){
    if(!user.inventory) user.inventory = [];
    document.getElementById("Inventory").innerHTML = "";
    user.inventory.forEach(function(item, index, array){
        let node = document.createElement("LI");
        let textNode = document.createTextNode(item);
        node.appendChild(textNode);
        document.getElementById("Inventory").appendChild(node);
    });
}

function addDialogue(text){
    let diaBox = document.getElementById("Dialogue");
    let node = document.createElement("P");
    let textNode = document.createTextNode(text);
    node.appendChild(textNode);
    diaBox.appendChild(node);
}

function User(name, status = "Thriving", health = 40, day = 0){   
    if(name == null){
        name = "UNKNOWN"
    }
    this.inventory = [];
    this.status = status;
    this.health = health;
    this.day = day;
    this.name = name;
    this.isAdmin = admins.includes(name.toUpperCase()) ? true : false;
    this.welcome = (this.isAdmin == true) ? `${this.name}'s Lair` : `${this.name}'s Hovel`;
    this.toString = function(){
        return this.name;
    }
}

function Item(name, count = 1){
    this.name = name;
    this.count = count;
    this.toString = function(){
        return `${this.name} x${this.count}`
    }
}

function changeUser(){
    localStorage.removeItem('user');
    user = new User(prompt("Enter your name"));
    localStorage.setItem('user', JSON.stringify(user));
    welcomeHeading.textContent = user.welcome;
    updateInventory();
}

function load(){
    let user;
    if (!localStorage.getItem('user')) {
        user = new User(prompt("Enter your name"));
        localStorage.setItem('user', JSON.stringify(user));
    } else {
        let tempUser = JSON.parse(localStorage.getItem('user'));
        user = new User(tempUser.name, tempUser.status, tempUser.health, tempUser.day);
        for(let i = 0; i < tempUser.inventory.length; i++){
            let tempItem = tempUser.inventory[i];
            user.inventory[i] = new Item(tempItem.name, tempItem.count);
        }
    }
    return user;
}

function update(){
    //Debug Check
    if (debugging == true) {
        eatTime = 0;
        huntTime = 0;
        dayTime = 10000;
    }

    //Day Cycle
    if (lastFrameTimeMs > nextDay) {
        user.health -= 10;
        user.day++;
        nextDay += dayTime;
    }

    //Hunt Cycle
    if (canHunt == false) {
        canHunt = (lastFrameTimeMs > lastHunt + huntTime) ? true : false;
    }

    //Eat Cycle
    if(canEat == false) {
        canEat = (lastFrameTimeMs > lastEat + eatTime) ? true : false;
    }
    if (getItemInvIdx("Flesh") == -1) buttonEatFood.style.visibility = "hidden";
    else buttonEatFood.style.visibility = "visible";

    //Health
    if(user.health == 0){
        alert("You have died");
        changeUser();
    }

    if(user.health > 100) user.health = 100;
    if(user.health < 0) user.health = 0;

    if(user.health >= 81) user.status = statusOptions[5]
    else if(user.health >= 61) user.status = statusOptions[4];
    else if (user.health >= 41) user.status = statusOptions[3];
    else if (user.health >= 21) user.status = statusOptions[2];
    else if (user.health >= 1) user.status = statusOptions[1];
    else user.status = statusOptions[0];

    //Update HTML
    elemHealth.textContent = user.health;
    elemStatus.textContent = user.status;   
    elemTitleStatus.textContent = `${user.status} Beast`;
    elemDay.textContent = user.day;

    //Save Game
    localStorage.setItem('user', JSON.stringify(user));
}