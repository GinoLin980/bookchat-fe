/* global isLoggedIn, getUsername, getRoom, createComment, applyToRoom, passTurn */
// Room.js - page script for Room.html  (URL: Room.html?id=5)
// GET /rooms/:id returns:
//   { room_id, title, book_title, book_author, scheduled_date, created_at,
//     moderator, registered, requested, role, comments, assigned_to_comment, state }
// The page re-fetches the room every few seconds so new comments,
// turn changes and approvals show up without reloading.

const roomId = new URLSearchParams(location.search).get("id");
const REFRESH_MS = 3000;

// TODO: confirm the exact value the backend uses for an ended room
const ENDED_STATE = "ended";

// Page elements
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

if (!roomId) {
    location.href = "JoinRoom.html";
}

/* Small helpers */

// Users may come back as a plain username or as an object; handle both.
// TODO: once you've seen a real response, simplify this to the one shape.
function nameOf(user) {
    if (user == null) return null;
    if (typeof user === "string") return user;
    return user.username ?? user.name ?? null;
}

// assigned_to_comment may be a user id (number) or a user/username.
// If it's an id, look the name up in the registered list.
function assignedName(room) {
    const a = room.assigned_to_comment;
    if (a == null || a === 0) return null;
    if (typeof a === "number") {
        const user = (room.registered ?? []).find((u) => (u.user_id ?? u.id) === a);
        return nameOf(user) ?? `User #${a}`;
    }
    return nameOf(a);
}

function listHasMe(list) {
    const me = getUsername();
    return (list ?? []).some((u) => nameOf(u) === me);
}

function infoLine(label, value) {
    const p = document.createElement("p");
    const strong = document.createElement("strong");
    strong.textContent = label + ": ";
    p.append(strong, value ?? "");
    return p;
}

/* Participation states (from the state diagram)
   */
const State = {
    NOT_LOGGED_IN: "NOT_LOGGED_IN", // must log in to participate
    NO_PERMISSION: "NO_PERMISSION", // Confirm Read Book -> Submit Permission Request
    PENDING:       "PENDING",       // Permission Pending
    WAITING:       "WAITING",       // Approved to Comment / Waiting for Turn
    MY_TURN:       "MY_TURN",       // User Given Turn -> Post Comment or Pass Turn
    MODERATOR:     "MODERATOR",     // backend rule: moderators can always speak
    ENDED:         "ENDED",         // Discussion Ended, no one can comment
};

const STATUS_TEXT = {
    NOT_LOGGED_IN: "You must be logged in to participate/comment.",
    NO_PERMISSION: "You do not have permission to participate/comment yet.",
    PENDING:       "Your request was sent. Waiting for the moderator to approve it.",
    WAITING:       "You have permission to participate. Waiting for the moderator to give you a turn.",
    MY_TURN:       "It is your turn! Post a comment or pass your turn.",
    MODERATOR:     "You are the moderator. You can comment at any time.",
    ENDED:         "The discussion has ended. No one can comment.",
};

// Decide which state this user is in, based on the room data.
function computeState(room) {
    if (room.state === ENDED_STATE) return State.ENDED;
    if (!isLoggedIn()) return State.NOT_LOGGED_IN;

    const me = getUsername();
    if (room.role === "moderator" || nameOf(room.moderator) === me) return State.MODERATOR;
    if (listHasMe(room.registered)) {
        return assignedName(room) === me ? State.MY_TURN : State.WAITING;
    }
    if (listHasMe(room.requested)) return State.PENDING;
    return State.NO_PERMISSION;
}

/* Rendering*/
function renderRoomInfo(room, state) {
    const when = new Date(room.scheduled_date);
    const heading = document.createElement("h2");
    heading.textContent = room.title;

    roomInfo.replaceChildren(
        heading,
        infoLine("Book", room.book_title),
        infoLine("Author", room.book_author),
        infoLine("Date", when.toLocaleDateString(undefined, { dateStyle: "long" })),
        infoLine("Time", when.toLocaleTimeString(undefined, { timeStyle: "short" })),
        infoLine("Moderator", nameOf(room.moderator))
    );

    // Manage Room button only for the moderator, linked to THIS room
    if (state === State.MODERATOR) {
        const manage = document.createElement("button");
        manage.id = "manageRoomButton";
        manage.className = "basic-button";
        manage.textContent = "Manage Room";
        manage.addEventListener("click", () => {
            location.href = "ManageRoom.html?id=" + roomId;
        });
        roomInfo.append(manage);
    }
}

function renderComments(comments) {
    commentsBox.replaceChildren();
    if (!comments || comments.length === 0) {
        commentsBox.textContent = "No comments yet.";
        return;
    }
    for (const c of comments) {
        const div = document.createElement("div");
        div.className = "comment";

        const author = document.createElement("div");
        author.className = "comment-author";
        // TODO: confirm the author field name in a real comment
        author.textContent = nameOf(c.user) ?? c.username ?? c.author ?? "Unknown";

        const body = document.createElement("div");
        body.textContent = c.content;

        div.append(author, body);
        commentsBox.append(div);
    }
}

// One function controls every participation switch on the page,
// so the UI can't get into a half-updated state.
function renderParticipation(state) {
    participationStatus.textContent = STATUS_TEXT[state];

    const canComment = state === State.MY_TURN || state === State.MODERATOR;
    commentText.disabled = !canComment;
    postButton.disabled = !canComment;
    passButton.disabled = state !== State.MY_TURN; // moderators don't take turns

    commentText.placeholder = canComment
        ? "Write your comment..."
        : "You can comment when it is your turn";

    // Comment box only once you're approved (or the moderator)
    const showCommentArea = canComment || state === State.WAITING;
    commentArea.hidden = !showCommentArea;

    // Permission form only when you can actually request
    permissionSection.hidden = state !== State.NO_PERMISSION;

    // Login button for logged-out users (added once, removed when not needed)
    let loginButton = document.getElementById("loginToParticipate");
    if (state === State.NOT_LOGGED_IN && !loginButton) {
        loginButton = document.createElement("button");
        loginButton.id = "loginToParticipate";
        loginButton.className = "basic-button";
        loginButton.textContent = "Login";
        loginButton.addEventListener("click", () => (location.href = "Login.html"));
        participationStatus.after(loginButton);
    } else if (state !== State.NOT_LOGGED_IN && loginButton) {
        loginButton.remove();
    }
}

async function refreshRoom() {
    const room = await getRoom(roomId);
    const state = computeState(room);

    renderRoomInfo(room, state);
    currentTurn.textContent = assignedName(room) ?? "No one yet";
    renderComments(room.comments);
    renderParticipation(state);
}

/* Action*/

// Post Comment -> Comment Added to Discussion Room -> Turn Ends
commentForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const content = commentText.value.trim();
    if (!content) return;

    postButton.disabled = true;
    try {
        await createComment(roomId, content);
        commentText.value = "";
        await refreshRoom();
    } catch (error) {
        alert(error.message);
        postButton.disabled = false;
    }
});

// Pass Turn -> Turn Ends
passButton.addEventListener("click", async () => {
    passButton.disabled = true;
    try {
        await passTurn(roomId);
        await refreshRoom();
    } catch (error) {
        alert(error.message);
        passButton.disabled = false;
    }
});

// Confirm Read Book -> Submit Permission Request -> Permission Pending
permissionForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!permissionForm.readBook.checked) {
        alert("You must confirm you have read this book.");
        return;
    }
    try {
        await applyToRoom(roomId);
        await refreshRoom();
    } catch (error) {
        alert(error.message);
    }
});

/*  Start */
commentText.value = ""; // clear the whitespace inside <textarea> in the HTML

refreshRoom().catch((error) => {
    participationStatus.textContent = error.message;
});

// Keep the page current. Errors here just get logged so a brief network
// blip doesn't spam alerts every 3 seconds.
setInterval(() => refreshRoom().catch(console.error), REFRESH_MS);
