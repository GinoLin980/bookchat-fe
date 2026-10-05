
const loginButton = document.getElementById("login-button");

function updateLoginButton() {
    loginButton.textContent = isLoggedIn() ? "Logout" : "Login";
}

loginButton.addEventListener("click", () => {
    console.log('jz', isLoggedIn())
    if (isLoggedIn()) {
        logout();
        updateLoginButton();
    } else {
        location.href = "Login.html";
    }
});

updateLoginButton();