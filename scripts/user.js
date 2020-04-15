'use strict';

let admins = ["REECE","PHILIP"];

//                     0        1-20       21-40      41-60      61-80       81-100            
let statusOptions = ["Dead","Suffering","Starving", "Hungry", "Satisfied", "Thriving"]
let user = load();
updateInventory();

let maxFPS = 10;
let lastFrameTimeMs = 0;    
let nextDay = 60000;//speed of days in milliseconds

let buttonGetFood = document.querySelector('#getFood');
let buttonEatFood = document.querySelector('#eatFood');
let welcomeHeading = document.querySelector('#welcome');
let elemHealth = document.querySelector("#health");
let elemStatus = document.querySelector("#status");
let elemDay = document.querySelector("#day");

let elapsedTime;

welcomeHeading.textContent = user.welcome;
requestAnimationFrame(mainLoop);

function mainLoop(timestamp) {
    if(timestamp < lastFrameTimeMs + (1000 / maxFPS)){
        requestAnimationFrame(mainLoop);
        return;
    }
    lastFrameTimeMs = timestamp;
    if(timestamp > nextDay){
        user.day++;
        nextDay += 60000;
    }
    update();
    requestAnimationFrame(mainLoop);
}

buttonGetFood.onclick = function(){
    let food = new Item("Flesh")
    user.health -= Math.floor(Math.random() * 10);
    addItem(food);
}

buttonEatFood.onclick = function(){
    let eaten = removeItem("Flesh");
    if(eaten == true){
        user.health += 5;
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

function User(name, status = "Thriving", health = 100, day = 0){   
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
    if(user.health == 0){
        alert("You have died");
        changeUser();
    }

    if(getItemInvIdx("Flesh") == -1) buttonEatFood.style.visibility = "hidden";
    else buttonEatFood.style.visibility = "visible";

    if(user.health > 100) user.health = 100;
    if(user.health < 0) user.health = 0;

    if(user.health >= 81) user.status = statusOptions[5]
    else if(user.health >= 61) user.status = statusOptions[4];
    else if (user.health >= 41) user.status = statusOptions[3];
    else if (user.health >= 21) user.status = statusOptions[2];
    else if (user.health >= 1) user.status = statusOptions[1];
    else user.status = statusOptions[0];


    elemHealth.textContent = user.health;
    elemStatus.textContent = user.status;
    elemDay.textContent = user.day;
    localStorage.setItem('user', JSON.stringify(user));
}
