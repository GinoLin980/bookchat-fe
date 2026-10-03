/* global register */
// Register.js - page script for Register.html
// register() in BookChat.js calls POST /register.
// The backend returns a token, so the user is logged in right away.

const registerForm = document.getElementById("registerForm");
const registerMessage = document.getElementById("formMessage");
const registerButton = registerForm.querySelector("button[type='submit']");

registerForm.addEventListener("submit", async (event) => {
    // Stop the browser from reloading the page.
    event.preventDefault();

    // Check that the password and confirm password fields match.
    if (registerForm.password.value !== registerForm.confirmPassword.value) {
        registerMessage.textContent = "Passwords do not match.";
        return;
    }

    registerButton.disabled = true;
    registerMessage.textContent = "Creating account...";

    try {
        const data = await register(
            registerForm.username.value.trim(),
            registerForm.password.value
        );
        // register() saved the session if a token came back,
        // otherwise send them to log in.
        location.href = data?.token ? "MainMenu.html" : "Login.html";
    } catch (error) {
        // 400 here usually means the username is taken.
        registerMessage.textContent = error.message;
        registerButton.disabled = false;
    }
});