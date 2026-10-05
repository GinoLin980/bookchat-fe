// bookchat.js the one place the frontend talks to the Go backend.
// Pages import the functions they need, e.g.:
//   
// and load their script with <script type="module" src="rooms.js"></script>

const BASE_URL ="https://bookchat.ginol.in/api/v1";// the deployed backend
//the names of the keys in local storage for the token and username
const TOKEN_KEY ="token"
const USERNAME_KEY= "username";

//the token session and helpers

//returns the saved token from local storage, or null if not logged in
function getToken(){
return localStorage.getItem(TOKEN_KEY);
}

//returns the saved username from local storage, or null if not logged in
function getUsername(){
return localStorage.getItem(USERNAME_KEY);
}
//returns true if the user is logged in, false otherwise
function isLoggedIn(){
return getToken() !=null;
}
//save the token and username in local storage
function saveSession(username,token){
localStorage.setItem(USERNAME_KEY,username);
localStorage.setItem(TOKEN_KEY,token);
}
//clear the session  ie logout in the browser
function logout(){
localStorage.removeItem(USERNAME_KEY);
localStorage.removeItem(TOKEN_KEY);
}
//error handling for fetch requests, returns a promise that resolves to the json response or rejects with an error
class ApiError extends Error{
constructor(message, status){
    super(message);
    this.status = status;
}
}
//fetch wrapper that handles errors and returns json
async function request(method, path, body= null){
    console.log('Creating a request');
const headers ={};

//if the body is json, set the content type header
if(body !== null){
    headers["Content-Type"] = "application/json";
}
//if the user is logged in, add the authorization header
const token = getToken();
if(token){
    headers["Authorization"] = `Bearer ${token}`;
}
//make the fetch request, catch network errors
let response;
try{
    console.log('we are in the try block');
    response = await fetch(BASE_URL + path,{
        method,
        headers,
        body: body !== null ? JSON.stringify(body) : null
    });
}catch(networkError){
    console.log('we are in the error');
    //network error, e.g. server is down or blocked by cors
    throw new ApiError("COULD NOT CONNECT TO SERVER",0);
}

//parse the response body as json, if it is not json keep the text as the reason
const text = await response.text();
let data = null;
try{
    data = text ? JSON.parse(text) : null;
}catch{
    data = {reason: text};
}

//check for errors
if(!response.ok){
    // show the real status and raw body in the console while developing
    console.error(method, path, response.status, text);
    if(response.status === 401){
        //unauthorized, clear the session
        logout();
    }
    const reason= data?.reason ?? data?.error ?? data?.message ?? defaultReason(response.status);
    //throw stops this function and sends the error to the caller
    throw new ApiError(reason,response.status);
}
return data;
}

//default error messages if the server does not send one
function defaultReason(status){
switch(status){
    case 400: return "Invalid information";
    case 401: return "Please log in to continue";
    case 403: return "You do not have permission to access this resource";
    case 404: return "Resource not found";
    case 409: return "That username is already taken";
    case 422: return "That user has not requested to join this room";
    case 500: return "Server error, please try again later";
    default: return "An unknown error occurred. Please try again later.";
}
}

//turns a date picker value or Date into the iso format go expects
//e.g. "2026-10-15T18:00" -> "2026-10-15T23:00:00.000Z"
function toISODate(value){
const d = value instanceof Date ? value : new Date(value);
if(isNaN(d)){
    throw new ApiError("Invalid scheduled date",400);
}
return d.toISOString();
}

//end point functions for the frontend to call
//note the backend uses snake_case names like book_title, scheduled_date

//POST /api/v1/login
//login with username and password, returns a promise that resolves to { status, token, username }
async function login(username,password){
    console.log('login request sent');
const data = await request("POST","/login",{username,password});
if(data?.token){
    saveSession(data.username,data.token);
}
return data;
}

//POST /api/v1/register(400 if username already exists)
//returns { status, token, username }
async function register(username,password){
    console.log('register request sent');
const data = await request("POST","/register",{username,password});
//only save the session if the backend sent a token back
if(data?.token){
    saveSession(data.username,data.token);
}
return data;
}

// async function register(event, form){
//     username = form.username.value;
//     password = form.password.value;
// const data = await request("POST","/register",{username,password});
// //only save the session if the backend sent a token back
// if(data?.token){
//     saveSession(data.username,data.token);
// }
// return data;
// }

//GET /api/v1/rooms
//returns a promise that resolves to an array of room previews
//{ room_id, title, book_title, book_author, scheduled_date, moderator }
//optional search, check the param names in swagger e.g. getRooms({ keyword: "dune" })
async function getRooms(params = {}){
const query = new URLSearchParams(params).toString();
return await request("GET",`/rooms${query ? "?" + query : ""}`);
}

//GET /api/v1/rooms/:roomId
//returns a promise that resolves to the room object
//{ room_id, title, book_title, book_author, scheduled_date, created_at,
//  moderator, registered, requested, role, comments, assigned_to_comment }
async function getRoom(roomId){
return await request("GET",`/rooms/${encodeURIComponent(roomId)}`);
}
//POST /api/v1/rooms
//all four fields are required by the backend
async function createRoom(title, bookTitle, bookAuthor, scheduledDate){
    return request("POST", "/rooms", {
        title,
        book_title: bookTitle,
        book_author: bookAuthor,
        scheduled_date: toISODate(scheduledDate)
    });
}
//GET /api/v1/rooms/{id}/comments
//returns an array of { content, user_id, username }
async function getComments(roomId){
    return request("GET", `/rooms/${encodeURIComponent(roomId)}/comments`);
}

async function createComment(roomId, content){
    return request("POST", `/rooms/${encodeURIComponent(roomId)}/comments`, { content });
}
// PATCH /rooms/{id} — moderator only
// pass only what you want to change, using the backend names, e.g.
//   updateRoom(5, { title: "New title" })
//   updateRoom(5, { assigned_to_comment: userId })
//   updateRoom(5, { state: "started" })
// allowed: title, book_title, book_author, scheduled_date, state,
//          add_user_id, approve_user_id, assigned_to_comment

// fields the Go backend expects as integers
const INT_FIELDS = ["add_user_id", "approve_user_id", "assigned_to_comment"];

function updateRoom(roomId, changes) {
  // copy so we never modify the caller's object
  const body = { ...changes };

  // convert any id fields to real numbers so Go can decode them
  for (const key of INT_FIELDS) {
    if (key in body) {
      body[key] = Number(body[key]);
    }
  }

  if (body.scheduled_date) {
    body.scheduled_date = toISODate(body.scheduled_date);
  }

  // the room id goes in the URL only, not the body
  return request("PATCH", `/rooms/${encodeURIComponent(roomId)}`, body);
}

// POST /rooms/{id}/apply — returns 200 even if already applied
function applyToRoom(roomId) {
  return request("POST", `/rooms/${encodeURIComponent(roomId)}/apply`);
}

// POST /rooms/{id}/approve — moderator only, 422 if user never applied
//takes the user id not the username, get it from room.requested in getRoom()
function approveUser(roomId, userId) {
  return request("POST", `/rooms/${encodeURIComponent(roomId)}/approve`, { approve_user_id: Number(userId) });
}
// Deny a permission request — moderator only
//TODO: match the path/body to the deny route in swagger
//takes the user id, same as approveUser()
function denyUser(roomId, userId) {
  return request("POST", `/rooms/${encodeURIComponent(roomId)}/deny`, { deny_user_id: Number(userId) });
}

// Pass the turn — only the user whose turn it is
//TODO: match the path/body to the pass turn route in swagger
function passTurn(roomId) {
  return request("POST", `/rooms/${encodeURIComponent(roomId)}/pass`);
}

