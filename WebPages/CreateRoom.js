/* global isLoggedIn, createRoom */
// CreateRoom.js - page script for CreateRoom.html
// Creating a room needs a token, so send logged-out users to log in first.
// if (!isLoggedIn()) {
//     location.href = "Login.html"; // change if your login page is named differently
// }
const createRoomForm = document.getElementById("createRoomForm");
const createRoomMessage = document.getElementById("formMessage");
const createRoomButton = createRoomForm.querySelector("button[type='submit']");
createRoomForm.addEventListener("submit", async (event) => {
    // Stop the browser from reloading the page.
    event.preventDefault();
 
    // Combine date + time into "2026-10-15T18:00".
    // toISODate() in BookChat.js converts it to the UTC format Go expects.
    const scheduled = createRoomForm.discussionDate.value + "T" + createRoomForm.discussionTime.value;
 
    // Prevent double-clicks from creating two rooms.
    createRoomButton.disabled = true;
    createRoomMessage.textContent = "Creating room...";
 
    try {
        const room = await createRoom(
            createRoomForm.roomTitle.value.trim(),
            createRoomForm.bookTitle.value.trim(),
            createRoomForm.bookAuthor.value.trim(),
            scheduled
        );
 
        // Go to the new room if the backend returned its id, otherwise the main menu.
        if (room && room.room_id) {
            location.href = "Room.html?id=" + room.room_id;
        } else {
            location.href = "MainMenu.html";
        }
    } catch (error) {
        // request() already cleared the session on 401.
        if (error.status === 401) {
            location.href = "Login.html";
            return;
        }
        // ApiError carries a readable message from the server or defaultReason().
        createRoomMessage.textContent = error.message;
        createRoomButton.disabled = false;
    }
});
 