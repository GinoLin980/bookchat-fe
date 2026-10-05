/* global isLoggedIn, getUsername, getRoom, approveUser, denyUser, updateRoom */
// ManageRoom.js - page script for ManageRoom.html  (URL: ManageRoom.html?id=5)
// Moderator side of the state diagram:
//   Moderator Decision (Allow / Deny), Moderator Gives Turn, Ends Discussion
// The backend checks moderator-only actions too; the checks here just
// keep non-moderators from seeing a page that won't work for them.

const roomId = new URLSearchParams(location.search).get("id");
const REFRESH_MS = 3000;

// TODO: confirm the exact value the backend uses for an ended room
const ENDED_STATE = "ended";

// Page elements
const roomInfo = document.getElementById("roomInfo");
const permissionList = document.getElementById("userPermissionList");
const currentTurn = document.getElementById("currentTurn");
const turnList = document.getElementById("userTurnList");
const endButton = document.getElementById("endDiscussionButton");
const backButton = document.getElementById("backToRoom");



/*
   Small helpers (same as Room.js)TODO: once you've seen a real response, simplify to the one shape.*/
function nameOf(user) {
    if (user == null) return null;
    if (typeof user === "string") return user;
    return user.username ?? user.name ?? null;
}

// The backend takes user ids for approve/deny/assign
function idOf(user) {
    if (user == null || typeof user !== "object") return null;
    return user.user_id ?? user.id ?? null;
}

function assignedName(room) {
    const a = room.assigned_to_comment;
    if (a == null || a === 0) return null;
    if (typeof a === "number") {
        const user = (room.registered ?? []).find((u) => idOf(u) === a);
        return nameOf(user) ?? `User #${a}`;
    }
    return nameOf(a);
}

function infoLine(label, value) {
    const p = document.createElement("p");
    const strong = document.createElement("strong");
    strong.textContent = label + ": ";
    p.append(strong, value ?? "");
    return p;
}

function actionButton(label, onClick) {
    const b = document.createElement("button");
    b.className = "basic-button";
    b.textContent = label;
    b.addEventListener("click", onClick);
    return b;
}

// Run a moderator action, then refresh so the lists update
async function moderatorAction(action) {
    try {
        await action();
        await refreshManage();
    } catch (error) {
        alert(error.message);
    }
}

/* Rendering */
function renderRoomInfo(room) {
    const when = new Date(room.scheduled_date);
    const heading = document.createElement("h2");
    heading.textContent = room.title;

    roomInfo.replaceChildren(
        heading,
        infoLine("Book", room.book_title),
        infoLine("Author", room.book_author),
        infoLine("Date", when.toLocaleDateString(undefined, { dateStyle: "long" })),
        infoLine("Time", when.toLocaleTimeString(undefined, { timeStyle: "short" })),
        infoLine("Moderator", nameOf(room.moderator)),
        infoLine("State", room.state)
    );
}

// Permission Requests: Allow -> Approved, Deny -> Permission Not Given
function renderRequests(room) {
    permissionList.replaceChildren();
    const requested = room.requested ?? [];
    if (requested.length === 0) {
        permissionList.textContent = "No pending requests.";
        return;
    }
    for (const user of requested) {
        const row = document.createElement("div");
        row.className = "user-item";
        row.append(
            nameOf(user) + " ",
            actionButton("Allow", () => moderatorAction(() => approveUser(roomId, idOf(user)))),
            actionButton("Deny", () => moderatorAction(() => denyUser(roomId, idOf(user))))
        );
        permissionList.append(row);
    }
}

// User List: approved users the moderator can give the turn to
function renderTurnList(room) {
    turnList.replaceChildren();
    const registered = room.registered ?? [];
    if (registered.length === 0) {
        turnList.textContent = "No approved users yet.";
        return;
    }
    const ended = room.state === ENDED_STATE;
    for (const user of registered) {
        const row = document.createElement("div");
        row.className = "user-item";

        // Moderator Gives Turn -> PATCH /rooms/:id { assigned_to_comment }
        // TODO: confirm assigned_to_comment takes the user id (not the username)
        const give = actionButton("Give Turn", () =>
            moderatorAction(() => updateRoom(roomId, { assigned_to_comment: idOf(user) }))
        );
        give.disabled = ended;

        row.append(nameOf(user) + " ", give);
        turnList.append(row);
    }
}

async function refreshManage() {
    const room = await getRoom(roomId);

    // Only the moderator should be here
    const isModerator = room.role === "moderator" || nameOf(room.moderator) === getUsername();
    if (!isModerator) {
        alert("Only the moderator can manage this room.");
        location.href = "Room.html?id=" + roomId;
        return;
    }

    renderRoomInfo(room);
    renderRequests(room);
    currentTurn.textContent = assignedName(room) ?? "No one yet";
    renderTurnList(room);
    endButton.disabled = room.state === ENDED_STATE;
}

/*  Actions */

// Moderator Ends Discussion -> Discussion Ended, No One Can Comment
endButton.addEventListener("click", () => {
    if (!confirm("End the discussion for everyone?")) return;
    moderatorAction(() => updateRoom(roomId, { state: ENDED_STATE }));
});

// Back to THIS room, not a hardcoded Room.html
backButton.addEventListener("click", () => {
    location.href = "Room.html?id=" + roomId;
});

/* Start */
/* Start */
function start() {
    if (!roomId) {
        location.replace("JoinRoom.html");
        return;
    }
    if (!isLoggedIn()) {
        location.replace("Login.html");
        return;
    }
    refreshManage().catch((error) => alert(error.message));
    setInterval(() => refreshManage().catch(console.error), REFRESH_MS);
}

start();