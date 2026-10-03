/* global login */
// Login.js - page script for Login.html
// login() in BookChat.js calls POST /login and saves the token + username.

const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("formMessage");
const loginButton = loginForm.querySelector("button[type='submit']");

loginForm.addEventListener("submit", async (event) => {
    // Stop the browser from reloading the page.
    event.preventDefault();

    // Prevent double-clicks from sending two requests.
    loginButton.disabled = true;
    loginMessage.textContent = "Logging in...";

    try {
        await login(
            loginForm.username.value.trim(),
            loginForm.password.value
        );
        location.href = "MainMenu.html";
    } catch (error) {
        // ApiError carries a readable message from the server or defaultReason().
        loginMessage.textContent = error.message;
        loginButton.disabled = false;
    }
});