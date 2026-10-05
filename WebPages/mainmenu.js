
const loginButton = document.getElementById("login-button");

function updateLoginButton() {
    loginButton.textContent = isLoggedIn() ? "Logout" : "Login";
}

loginButton.addEventListener("click", () => {
    if (isLoggedIn()) {
        logout();
        updateLoginButton();
    } else {
        location.href = "Login.html";
    }
});

updateLoginButton();