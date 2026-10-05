// Room.js - page script for Room.html (Room.html?id=5)
// user side of the state diagram: request permission, wait for turn, post or pass
// uses BookChat.js: isLoggedIn, getUsername, getRoom, createComment, applyToRoom, passTurn

//room id from the url
const roomId = new URLSearchParams(location.search).get("id");

//page elements
const roomInfo = document.getElementById("roomInfo");
const currentTurn = document.getElementById("currentTurn");
const participationStatus = document.getElementById("participationStatus");
const commentsBox = document.getElementById("comments");
const commentArea = document.getElementById("commentArea");
const commentForm = document.getElementById("commentForm");
const commentText = document.getElementById("commentText");
const postButton = document.getElementById("postButton");
const passButton = document.getElementById("passButton");
const permissionSection = document.querySelector(".permission-request");
const permissionForm = document.getElementById("permissionForm");

//the user's state, updated every time the room loads
let myState = null;


//participation states from the state diagram
const State = {
    NOT_LOGGED_IN: "NOT_LOGGED_IN", // must log in first
    NOT_STARTED:   "NOT_STARTED",   // before the scheduled time
    NO_PERMISSION: "NO_PERMISSION", // confirm read book -> submit permission request
    PENDING:       "PENDING",       // permission pending
    WAITING:       "WAITING",       // approved, waiting for turn
    MY_TURN:       "MY_TURN",       // user given turn -> post comment or pass
    MODERATOR:     "MODERATOR",     // moderator can always comment
    ENDED:         "ENDED",         // discussion ended, no one can comment
};

const STATUS_TEXT = {
    NOT_LOGGED_IN: "You must be logged in to participate/comment.",
    NOT_STARTED:   "The discussion hasn't started yet. Check back at the scheduled time.",
    NO_PERMISSION: "You do not have permission to participate/comment yet.",
    PENDING:       "Your request was sent. Waiting for the moderator to approve it.",
    WAITING:       "You have permission to participate. Waiting for the moderator to give you a turn.",
    MY_TURN:       "It is your turn! Post a comment or pass your turn.",
    MODERATOR:     "You are the moderator. You can comment at any time.",
    ENDED:         "The discussion has ended. No one can comment.",
};


//helpers

//true if the scheduled time has passed
function isTimeToStart(room) {
    const now = new Date();
    const scheduled = new Date(room.scheduled_date);
    return now >= scheduled;
}

//true if the logged in user is in the list
function listHasMe(list) {
    const me = getUsername();
    return (list || []).some((user) => user.username === me);
}

//name of the user who has the turn, assigned_to_comment is a user id
function turnName(room) {
    const turnUser = (room.registered || []).find(
        (user) => user.user_id === room.assigned_to_comment
    );
    return turnUser ? turnUser.username : null;
}

//line like "Book: Moby Dick"
function makeLine(label, value) {
    const p = document.createElement("p");
    const strong = document.createElement("strong");
    strong.textContent = label + ": ";
    p.append(strong, value);
    return p;
}

//work out which state the user is in
function getState(room) {
    if (room.state === "ended") return State.ENDED;
    if (!isLoggedIn()) return State.NOT_LOGGED_IN;
    if (room.role === "moderator") return State.MODERATOR;
    if (!isTimeToStart(room)) return State.NOT_STARTED;

    if (listHasMe(room.registered)) {
        if (turnName(room) === getUsername()) return State.MY_TURN;
        return State.WAITING;
    }
    if (listHasMe(room.requested)) return State.PENDING;
    return State.NO_PERMISSION;
}


//rendering

//room details, plus the manage button for the moderator
function showRoomInfo(room, state) {
    const date = new Date(room.scheduled_date);

    const title = document.createElement("h2");
    title.textContent = room.title;

    roomInfo.replaceChildren(
        title,
        makeLine("Book", room.book_title),
        makeLine("Author", room.book_author),
        makeLine("Date", date.toLocaleDateString()),
        makeLine("Time", date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })),
        makeLine("Moderator", room.moderator.username)
    );

    //manage button only for the moderator, with this room's id
    if (state === State.MODERATOR) {
        const manage = document.createElement("button");
        manage.type = "button";
        manage.className = "basic-button";
        manage.textContent = "Manage Room";
        manage.addEventListener("click", function () {
            location.href = "ManageRoom.html?id=" + roomId;
        });
        roomInfo.append(manage);
    }
}

//the discussion
function showComments(comments) {
    commentsBox.replaceChildren();

    if (!comments || comments.length === 0) {
        commentsBox.textContent = "No comments yet.";
        return;
    }

    for (const comment of comments) {
        const div = document.createElement("div");
        div.className = "comment";

        const author = document.createElement("div");
        author.className = "comment-author";
        author.textContent = comment.username;

        const body = document.createElement("div");
        body.textContent = comment.content;

        div.append(author, body);
        commentsBox.append(div);
    }
}

//turn buttons and sections on/off for the user's state
function showParticipation(state) {
    participationStatus.textContent = STATUS_TEXT[state];

    const canComment = state === State.MY_TURN || state === State.MODERATOR;
    commentText.disabled = !canComment;
    postButton.disabled = !canComment;
    passButton.disabled = state !== State.MY_TURN;// moderator has no turn to pass

    if (canComment) {
        commentText.placeholder = "Write your comment...";
    } else {
        commentText.placeholder = "You can comment when it is your turn";
    }

    //comment box once approved or moderator
    commentArea.hidden = !(canComment || state === State.WAITING);

    //permission form only when they can request
    permissionSection.hidden = state !== State.NO_PERMISSION;

    //login button for logged out users, only add it once
    let loginButton = document.getElementById("loginToParticipate");
    if (state === State.NOT_LOGGED_IN && !loginButton) {
        loginButton = document.createElement("button");
        loginButton.type = "button";
        loginButton.id = "loginToParticipate";
        loginButton.className = "basic-button";
        loginButton.textContent = "Login";
        loginButton.addEventListener("click", function () {
            location.href = "Login.html";
        });
        participationStatus.after(loginButton);
    } else if (state !== State.NOT_LOGGED_IN && loginButton) {
        loginButton.remove();
    }
}


//load the room

async function loadRoom() {
    const room = await getRoom(roomId);
    myState = getState(room);

    showRoomInfo(room, myState);
    currentTurn.textContent = turnName(room) || "No one yet";
    showComments(room.comments);
    showParticipation(myState);
}


//actions

//post comment -> comment added -> turn ends
commentForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    const local_time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'});
    const content = getUsername() + " (" + local_time + "): " + commentText.value.trim();
    if (!content) return;

    postButton.disabled = true;
    try {
        await createComment(roomId, content);
        commentText.value = "";
        //backend lets you post more than once a turn, so end it here
        //the moderator has no turn to pass
        if (myState === State.MY_TURN) {
            await passTurn(roomId);
        }
        await loadRoom();
    } catch (error) {
        alert(error.message);
        postButton.disabled = false;
    }
});

//pass turn -> turn ends
passButton.addEventListener("click", async function () {
    passButton.disabled = true;
    try {
        await passTurn(roomId);
        await loadRoom();
    } catch (error) {
        alert(error.message);
        passButton.disabled = false;
    }
});

//confirm read book -> submit permission request -> permission pending
permissionForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (!permissionForm.readBook.checked) {
        alert("You must confirm you have read this book.");
        return;
    }
    try {
        await applyToRoom(roomId);
        await loadRoom();
    } catch (error) {
        alert(error.message);
    }
});


//start

function start() {
    //no room id, go pick one
    if (!roomId) {
        location.replace("JoinRoom.html");
        return;
    }

    loadRoom().catch(function (error) {
        participationStatus.textContent = error.message;
    });

    //reload every 3 seconds
    setInterval(() => loadRoom().catch(console.error), 3000);
}

start();