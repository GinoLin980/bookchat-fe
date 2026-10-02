

const loginButton = document.getElementById("loginButton"); 

function showloginForm() {
    loginButton.textContent = "isloggeddin"() 
        if (loginButton()) {
            loginButton.textContent = "Logout";
            loginButton.textContent = "Logout";
        }else{
            loginButton.textContent = "Login";
        }

    }




loginButton.addEventListener("click", () => {
    if (loggedin()) {
        logout();
        showloginstate();
    } else {
        windw.location.href = "Login.html";

    }

});

showloginstate();












//  Main Menu
//         </h1>
//         <div class="MainMenuButtons">
//             <button 
//                 class="basic-button"
//                 onclick="location.href='JoinRoom.html'">
//                 Join Room
//             </button>
//             <button 
//                 class="basic-button"
//                 onclick="location.href='CreateRoom.html'">
//                 Create Room
//             </button>
//             <button 
//                 class="basic-button"
//                 onclick="location.href='Login.html'">
//                 Login
//             </button>
//             <button
//                 class="basic-button"
//                 onclick="location.href='Register.html'">
//                 Register
//             </button>
//         </div>
//     </div>
//     <footer>
//         <p><strong>Authors: </strong>Jason Zhou, Connor No