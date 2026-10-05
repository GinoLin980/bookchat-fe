// ManageRoom.js - page script for ManageRoom.html (ManageRoom.html?id=5)
// moderator side of the state diagram: allow/deny, give turn, end discussion
// uses BookChat.js: isLoggedIn, getUsername, getRoom, approveUser, denyUser, updateRoom

//room id from the url
const roomId = new URLSearchParams(location.search).get("id");

//page elements
const roomInfo = document.getElementById("roomInfo");
const permissionList = document.getElementById("userPermissionList");
const currentTurn = document.getElementById("currentTurn");
const turnList = document.getElementById("userTurnList");
const endButton = document.getElementById("endDiscussionButton");
const backButton = document.getElementById("backToRoom");


//helpers

//true if the scheduled time has passed
function isTimeToStart(room) {
    const now = new Date();
    const scheduled = new Date(room.scheduled_date);
    return now >= scheduled;
}

//button that runs onClick
function makeButton(text, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "basic-button";
    button.textContent = text;
    button.addEventListener("click", onClick);
    return button;
}

//line like "Book: Moby Dick"
function makeLine(label, value) {
    const p = document.createElement("p");
    const strong = document.createElement("strong");
    strong.textContent = label + ": ";
    p.append(strong, value);
    return p;
}

//run an action then reload the room
async function doAction(action) {
    try {
        await action();
        await loadRoom();
    } catch (error) {
        alert(error.message);
    }
}


//rendering

//room details
function showRoomInfo(room) {
    const date = new Date(room.scheduled_date);

    let state = "Not started";
    if (room.state === "ended") {
        state = "Ended";
    } else if (isTimeToStart(room)) {
        state = "In progress";
    }

    const title = document.createElement("h2");
    title.textContent = room.title;

    roomInfo.replaceChildren(
        title,
        makeLine("Book", room.book_title),
        makeLine("Author", room.book_author),
        makeLine("Date", date.toLocaleDateString()),
        makeLine("Time", date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })),
        makeLine("Moderator", room.moderator.username),
        makeLine("State", state)
    );
}

//permission requests: allow -> approved, deny -> permission not given
function showRequests(room) {
    permissionList.replaceChildren();

    if (!room.requested || room.requested.length === 0) {
        permissionList.textContent = "No pending requests.";
        return;
    }

    for (const user of room.requested) {
        const row = document.createElement("div");
        row.className = "user-item";

        //backend wants the user id not the username
        const allow = makeButton("Allow", function () {
            doAction(() => approveUser(roomId, user.user_id));
        });
        const deny = makeButton("Deny", function () {
            doAction(() => denyUser(roomId, user.user_id));
        });

        row.append(user.username + " ", allow, deny);
        permissionList.append(row);
    }
}

//user list: approved users that can get the turn
function showUsers(room) {
    turnList.replaceChildren();

    //skip the moderator, they can always comment
    const users = (room.registered || []).filter(
        (user) => user.user_id !== room.moderator.user_id
    );

    if (users.length === 0) {
        turnList.textContent = "No approved users yet.";
        return;
    }

    //only during the discussion
    const canGiveTurn = isTimeToStart(room) && room.state !== "ended";

    for (const user of users) {
        const row = document.createElement("div");
        row.className = "user-item";

        //PATCH /rooms/:id needs a state in the body or it returns 400
        const giveTurn = makeButton("Give Turn", function () {
            doAction(() => updateRoom(roomId, { assigned_to_comment: user.user_id, state: "started" }));
        });
        giveTurn.disabled = !canGiveTurn;

        row.append(user.username + " ", giveTurn);
        turnList.append(row);
    }
}

//current turn, assigned_to_comment is a user id
function showCurrentTurn(room) {
    const turnUser = (room.registered || []).find(
        (user) => user.user_id === room.assigned_to_comment
    );

    if (turnUser) {
        currentTurn.textContent = turnUser.username;
    } else {
        currentTurn.textContent = "No one yet";
    }
}


//load the room

async function loadRoom() {
    const room = await getRoom(roomId);

    //only the moderator can use this page
    if (room.moderator.username !== getUsername()) {
        alert("Only the moderator can manage this room.");
        location.replace("Room.html?id=" + roomId);
        return;
    }

    showRoomInfo(room);
    showRequests(room);
    showCurrentTurn(room);
    showUsers(room);
    endButton.disabled = room.state === "ended";
}


//buttons

//end discussion -> no one can comment
endButton.addEventListener("click", function () {
    if (confirm("End the discussion for everyone?")) {
        doAction(() => updateRoom(roomId, { state: "ended" }));
    }
});

//back to this room
backButton.addEventListener("click", function () {
    location.href = "Room.html?id=" + roomId;
});


//start

function start() {
    //no room id, go pick one
    if (!roomId) {
        location.replace("JoinRoom.html");
        return;
    }
    //not logged in
    if (!isLoggedIn()) {
        location.replace("Login.html");
        return;
    }

    loadRoom().catch((error) => alert(error.message));

    //reload every 3 seconds
    setInterval(() => loadRoom().catch(console.error), 3000);
}

start();