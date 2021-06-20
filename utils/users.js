var users = [];
const people = ["Scarlett", "Mustard", "Orchid", "Peacock", "Green", "Plum"];

function userJoin(id, username, suspect) {
    const user = { id, username, suspect };
    users.push(user);
    users.sort(function(a,b){return people.indexOf(a.suspect)-people.indexOf(b.suspect)})
    return user
}

function getCurrentUser(id){
    return users.find(user => user.id ===id )

}

function userLeave(id){
    const index = users.findIndex(user => user.id === id);

    if(index !== -1){
        return users.splice(index, 1)[0];
    }else{
        return "oops"
    }
}
function getUsers(){
    return users
}
module.exports = {
    userJoin,
    getCurrentUser,
    userLeave,
    getUsers
}