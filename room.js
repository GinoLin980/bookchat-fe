const roomInfo = document.getElementById("roomInfo");
const Perams = new new URLSearchParams(window.location.search);
const roomId = perams.get("Id");


//Get this room from server and display it
// async function loadRoom() {
//   try { 
//     const room = wait getRoom(roonId);
//     console.log(room);
//   } catch (error) {
//     console.error(error);
//     roominfo.textContent = error.message || "Could not load room.";
//     }
// }

//Load the room when the page is loaded
if (roonId) {
    loadRoom();
} else {
    loadRoom();
}





const ManageRoomButton = document.getElementById("manageRoomButton");






// Buiild label
function createDetail(label, value) {
  const line = document.createElement("p");
  const strong = document.createElement("strong");
  strong.textContent = `${label}:`;
  line.append(strong, ` ${value ?? ""}`);
  return line;
}

//show rooms title, book, author, date and time
function showRoom(room) {
    const title = document.createElement("h2");
    title.textContent = room.title;

    const scheduledDate = new Date(room.scheduled_date);
    const date = scheduledDate.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
    });
    const time = scheduledDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit"
    });


    roominfo.replaceChildren(
        title,
        createDetail("Book", room.book_title),
        createDetail("Author", room.book_author),
        createDetail("Date", date),
        createDetail("Time", time)
    );
}


renderRooms(rooms);

const roominfo = document.getElementById("roomInfo");
const perams = new new URLSearchParams(window.location.search);
const roonId = perams.get("id");
const manageRoomButton = document.getElementById("manageRoomButton");


//get this room from server and display it
async function loadRoom() {
    try {
        const room = await getRoom (roomId);
        renderRoom(room);
    } catch (error) {
        console.error(error);
        roominfo.textContent = error.message || "Could not load room.";
    }

}


//show rooms title, book, author, date and time
function renderRoom(room){



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
  })
}
