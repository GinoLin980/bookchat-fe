/* global getRooms */
// JoinRoom.js - page script for JoinRoom.html
// Lists rooms from GET /rooms. Each preview looks like:
//   { room_id, title, book_title, book_author, scheduled_date, moderator }
// Anyone can browse rooms, so no login check here.

const roomList = document.getElementById("roomList");

// Build one <p><strong>Label:</strong> value</p> line.
// textContent (not innerHTML) so titles like "<b>hi</b>" show as text.
function roomLine(label, value) {
    const p = document.createElement("p");
    const strong = document.createElement("strong");
    strong.textContent = label + ": ";
    p.append(strong, value ?? "");
    return p;
}

// Build one room card, matching the example markup in JoinRoom.html.
function roomCard(room) {
    const card = document.createElement("div");
    card.className = "room-item";

    const heading = document.createElement("h2");
    heading.textContent = room.title;

    // scheduled_date comes back as ISO (UTC); show it in the user's local time.
    const when = new Date(room.scheduled_date);

    const joinButton = document.createElement("button");
    joinButton.className = "basic-button";
    joinButton.textContent = "Join Room";
    joinButton.addEventListener("click", () => {
        location.href = "Room.html?id=" + room.room_id;
    });

    card.append(
        heading,
        roomLine("Book", room.book_title),
        roomLine("Author", room.book_author),
        roomLine("Date", when.toLocaleDateString(undefined, { dateStyle: "long" })),
        roomLine("Time", when.toLocaleTimeString(undefined, { timeStyle: "short" })),
        roomLine("Moderator", room.moderator),
        joinButton
    );
    return card;
}

async function loadRooms() {
    roomList.textContent = "Loading rooms...";
    try {
        const rooms = await getRooms();
        roomList.replaceChildren(); // remove the loading text / example cards

        if (!rooms || rooms.length === 0) {
            roomList.textContent = "No rooms yet. Create one from the main menu!";
            return;
        }
        for (const room of rooms) {
            roomList.append(roomCard(room));
        }
    } catch (error) {
        roomList.textContent = error.message;
    }
}

loadRooms();
