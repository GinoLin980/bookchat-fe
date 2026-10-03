// Import the function that sends a GET request to the backend and returns the available rooms.
// import getRooms

//Hello!!!



const roomList = document.getElementById("roomList");

// Fetch rooms and show request failures in the list.
async function loadRooms() {
  roomList.replaceChildren(createMessage("Loading rooms..."));


// get rooms

  try {
    // Wait for the API request to finish before trying to render its response.
    // const response = await getRooms();

    // // Support either an API response that is the room array itself or one that wraps it in a `rooms` property.
    // const rooms = Array.isArray(response) ? response : response?.rooms;

    // // Stop with a clear error if the API returned neither of the expected response shapes.
    // if (!Array.isArray(rooms)) {
    //   throw new Error("Unexpected rooms response");



const rooms = await getRooms();

    // }

    // Give users helpful feedback when the API succeeded but there are currently no rooms to show.
    if (rooms.length === 0) {
      roomList.replaceChildren(createMessage("No rooms yet. Create one from the Main Menu."));
      return;
    }

    renderRooms(rooms);
  } catch (error) {
    console.error(error);
    roomList.replaceChildren(createMessage(error.message || "Could not load rooms."));
  }
}

// Replace the loading message with one item for each room returned by the API.
function renderRooms(rooms) {
  roomList.replaceChildren(...rooms.map(createRoomItem));
}

// Build a room item from the fields returned by the backend.
function createRoomItem(room) {
  const item = document.createElement("article");
  item.className = "room-item";

  const title = document.createElement("h2");
  title.textContent = room.title;

  const book = createDetail("Book", room.book_title);
  const author = createDetail("Author", room.book_author);
  const scheduledDate = new Date(room.scheduled_date);
  // The API date is UTC; the browser formats it in the viewer's local time.
  const date = scheduledDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
  const time = scheduledDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });

  const button = document.createElement("button");
  button.type = "button";
  button.className = "basic-button";
  button.textContent = "Join Room";
  button.addEventListener("click", () => joinRoom(room.room_id));

  item.append(title, book, author, createDetail("Date", date), createDetail("Time", time), button);
  return item;
}

// Create a labeled detail line for a room.
function createDetail(label, value) {
  const line = document.createElement("p");
  const strong = document.createElement("strong");
  strong.textContent = `${label}:`;
  line.append(strong, ` ${value ?? ""}`);
  return line;
}

// Pass the selected room ID to Room.html so it can load that room's details.
function joinRoom(roomId) {
  const query = new URLSearchParams({ id: String(roomId) });
  window.location.href = `Room.html?${query}`;
}

// Create a message element for loading, empty, and error states.
function createMessage(text) {
  const message = document.createElement("div");
  message.textContent = text;
  return message;
}

// Load the rooms into the list when the page opens.
loadRooms();