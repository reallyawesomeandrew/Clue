const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const { userJoin, getUsers, getCurrentUser, userLeave } = require('./utils/users');
const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 8080;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

var choosePeople = ["Scarlett", "Mustard", "Orchid", "Peacock", "Green", "Plum"];
var currentUser = null;
var suggested = [];
var showed = [];
var chosenPerson;
var chosenWeapon;
var chosenRoom;
var clueShow = false;
var clues = ["BothDrawClue", "OneFaceUpClue","AllRushClue", "SecretPassageClue","ShowLeftClue", "RevealSuspectClue", "AllRevealClue", "RevealLocationClue", "RevealWeaponClue"];
var mixedClues = [];
var pickOneUser = false;
var usersShown = 0;
function chooseRandom(array){
    const num = Math.floor(Math.random() * array.length);
    return array[num]
}
for (let index = 0; index < clues.length; index++) {
    const clue =  chooseRandom(clues);
    mixedClues.push(clue);
}

io.on("connection", socket => {
    socket.on("joinRoom", ({username}) => {
        const users = getUsers();
        let isSameUsername = false;
        users.forEach(user => {
            if (user.username == username) {
                isSameUsername = true;
            }
        });
        if (isSameUsername == true) {
            socket.emit("sameUsername");
        }else{
            if (currentUser != null) {
                socket.emit("cannotJoin");
            }else{
                io.emit("people", {people: choosePeople});
            }
    
        }

    });
    socket.on("personChosen", ({username, person}) => {
        userJoin(socket.id, username, person)
        choosePeople = choosePeople.filter(personItem => personItem !== person);
        io.emit("people",{people: choosePeople})
        io.emit("users", {users: getUsers()})
    });
    socket.on("suggest", ({person, weapon, place}) => {
        const user= getCurrentUser(socket.id);
        io.emit("suggest",{
            user,
            person,
            weapon,
            place
        })
    });
    socket.on("start", () =>  {
        const users= getUsers();
        if (users.length < 2) {
            socket.emit("notEnoughPlayers")
        }else{
            let people = ["Scarlett", "Mustard", "Orchid", "Peacock", "Green", "Plum"];
            let weapons = ["Candlestick", "Dagger", "LeadPipe", "Revolver", "Rope", "Wrench"];
            let rooms = ["BilliardRoom", "Conservatory", "DiningRoom", "Hall", "Kitchen", "Library","Lounge",
            "Study"]
            const peopleNum = Math.floor(Math.random() * people.length);
            chosenPerson = people[peopleNum];
            people.splice(peopleNum, 1)
    
            const weaponNum  = Math.floor(Math.random() * weapons.length);
            chosenWeapon = weapons[weaponNum];
            weapons.splice(weaponNum, 1);
    
    
            const roomNum  = Math.floor(Math.random() * rooms.length);
            chosenRoom = rooms[roomNum];
            rooms.splice(roomNum, 1);
    
            let allCards = people.concat(weapons.concat(rooms));
            let newList = [];
            for (let index = 0; index < users.length; index++) {
                newList.push([])
            }
            while (allCards.length != 0) {
                for (let index = 0; index < users.length; index++) {
                    if (allCards.length != 0) {
                        const num = Math.floor(Math.random() * allCards.length)
                        const element = allCards[num];
                        newList[index].push(element);
                        allCards.splice(num, 1)
                    }else{
                        break;
                    }
    
                }
            }
            for (let index = 0; index < users.length; index++) {
                io.to(users[index].id).emit("yourCards", {cards: newList[index]})
            }
            currentUser = users[0];
            io.emit("whoseTurn", {user:currentUser})
        }


    });
    socket.on("disconnect", () => {
        const user = getCurrentUser(socket.id);
        if (user != undefined) {
            if (currentUser !== null) {
                io.emit("startOver");
                currentUser = null; 
            }
            userLeave(socket.id)
            choosePeople.push(user.suspect);
            io.emit("users", {users: getUsers()});
        }
 
 

    });
    socket.on("position", ({x,y}) => {
        io.emit("position", {
            user: getCurrentUser(socket.id),
            x,
            y
        })
    });
    socket.on("positionNew", ({user, room}) => {
        const users = getUsers();
        users.forEach(usery => {
            if(usery.suspect == user){
                io.to(usery.id).emit("newPosition", {room})
            }
        })
    })
    socket.on("next", () => {
        const users = getUsers();
        currentUser = users[(users.indexOf(currentUser)+1)%users.length];
        io.emit("whoseTurn", {user: currentUser})
    });

    socket.on("show", ({card}) => {
        const user = getCurrentUser(socket.id)
        suggested.push(user);
        io.emit("showing", {
            card: card, 
            user: user
        });
    });
    socket.on("shown", ({user}) => {
        io.emit("shown", {user})
        const users = getUsers();
        showed.push(user);
        if (showed.length == users.length - 1 && suggested.length == users.length - 1 ) {
            suggested = [];
            showed = [];
            currentUser = users[(users.indexOf(currentUser)+1)%users.length];
            io.emit("whoseTurn", {user: currentUser})
        }
    });
    //Clue done
    socket.on("clueDone", () => io.emit("clueDone"))
    // Show Left
    socket.on("showLeft", ({card}) => {
        const users = getUsers();
        const user = getCurrentUser(socket.id);
        for (let index = 0; index < users.length; index++) {
            const element = users[index];
            if (element.id == user.id) {
                console.log(users[index-1+users.length])
                io.to(users[(index-1+users.length)%users.length].id).emit("showLeft",{card, user: users[(index-1+users.length)%users.length]})
            }
        }
    });
    //Shown Left
    socket.on("shownLeft", ({user}) => {
        const users = getUsers();
        showed.push(user);
        if (showed.length == users.length) {
            showed = [];
            io.emit("clueDone");
        }
    });
    // Secret passage
    socket.on("secretPassage", ({from, to}) => {
        io.emit("secretPassage", {from, to});
    })
    socket.on("rolled", ({num1, num2}) =>{
        io.emit("rolled", {num1, num2}) 
    });
    socket.on("chatMessage", ({text, to}) => {
        const user = getCurrentUser(socket.id);
        if (to == "Everyone") {
            io.emit("chatMessage", {text, user, private: false})
        }else{
            const toUser = getCurrentUser(to);
            io.to(to).emit("chatMessage", {text,user, private: toUser});
            socket.emit("chatMessage", {text,user, private: toUser})
        }

    });
    socket.on("clue", ({clue}) => {
        io.emit("clueShow", {clue});
        showed = [];
    }); 
    socket.on("revealCard", ({card}) => {
        io.emit("revealed", {user: getCurrentUser(socket.id), card});
        if (pickOneUser == false) {
            showed.push(getCurrentUser(socket.id));
            const users = getUsers();
            if (showed.length == users.length) {
                io.emit("clueDone");
                showed = [];
                clueShow = false;
            }else{
                clueShow = true;
            }
        }else{
            setTimeout(() => {
                io.emit("clueDone");
                pickOneUser = false;
            }, 3000)
        }

    });
    socket.on("revealThisCard", ({card}) => {
        io.emit("revealThisCard", {card});
    });
    socket.on("revealDone", () => {
        showed = [];
        io.emit("clueDone");
    });
    socket.on("nothingToReveal", ({card}) => {
        showed.push(getCurrentUser(socket.id));
        const users = getUsers();
        if (showed.length == users.length && clueShow == false) {
            showed = [];
            io.emit("nothingToReveal", {card});
            io.emit("clueDone")
        }
    });
    socket.on("revealACard", ({card}) => {
        io.emit("revealed", {card, user: getCurrentUser(socket.id)});
    });
    socket.on("accuse", ({person, weapon, place}) => {
        io.emit("accused", ({
            accused: {
                person, weapon, place
            },
            real: {
                person: chosenPerson,
                weapon: chosenWeapon,
                place: chosenRoom
            },
            user: getCurrentUser(socket.id)
        }))
    });
    socket.on("gimmeClue", () => {
        const clue = mixedClues.shift();
        mixedClues.push(clue);
        socket.emit("yourClue", ({clue}))
    });
    socket.on("revealUser", ({user}) => {
        io.emit("revealUser", {user: getCurrentUser(user)});
        pickOneUser = true;
    });
    socket.on("bothDraw", ({user}) => {
        io.emit("bothDraw", ({user1: getCurrentUser(socket.id), user2: getCurrentUser(user)}));
    });
    socket.on("randomCard", ({user, card}) => {
        io.to(user.id).emit("shownRandomCard", {card, user: getCurrentUser(socket.id)});
    });
    socket.on("drawDone", () => {
        usersShown += 1;
        if (usersShown == 2) {
            io.emit("clueDone");
        }
    })
})