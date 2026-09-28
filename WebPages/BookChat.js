// api.js the one place the frontend talks to the Go backend.
// Pages import the functions they need, e.g.:
//   import { login, getRooms } from "./BookChat.js";
// and load their script with <script type="module" src="rooms.js"></script>

const BASE_URL ="/api/v1";// same origin as the server 
//the names of the keys in local storage for the token and username
const TOKEN_KEY ="token"
const USERNAME_KEY= "username";

//the token session and helpers

//returns the saved token from local storage, or null if not logged in
export function getToken(){
return localStorage.getItem(TOKEN_KEY);
}

//returns the saved username from local storage, or null if not logged in
export function getUsername(){
return localStorage.getItem(USERNAME_KEY);
}
//returns true if the user is logged in, false otherwise
export function isLoggedIn(){
return getToken() !=null;
}
//save the token and username in local storage
function saveSession(username,token){
localStorage.setItem(USERNAME_KEY,username);
localStorage.setItem(TOKEN_KEY,token);
}
//clear the session  ie logout in the boweser
export function logout(){
localStorage.removeItem(USERNAME_KEY);
localStorage.removeItem(TOKEN_KEY);
}
//error handling for fetch requests, returns a promise that resolves to the json response or rejects with an error
export class ApiError extends Error{
constructor(message, status){
    super(message);
    this.status = status;
}
}
//fetch wrapper that handles errors and returns json
async function request(method, path, body= null){
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
    response = await fetch(BASE_URL + path,{
        method,
        headers,
        body: body !== null ? JSON.stringify(body) : null
    });
}catch(networkError){
    //network error, e.g. server is down
    throw new ApiError(0,"COULD NOT CONNECT TO SERVER");
}

//parse the response body as json and check for errors
const text = await response.text();
const data = text ? JSON.parse(text) : null;

//check for errors
if(!response.ok){
    if(response.status === 401){
        //unauthorized, clear the session
        logout();
    }
    const reason= data?.reason ?? defaultReason(response.status);
    //trow stops this function and sends the error to the caller
    throw new ApiError(reason,response.status);
}
return data;
}

//a request() wrapper for GET requests
function defaultReason(status){
switch(status){
    case 400: return "Invalid information";
    case 401: return "Please log in to continue";
    case 403: return "You do not have permission to access this resource";
    case 404: return "Resource not found";
    case 500: return "That already exists";
    default: return "An unknown error occurred. Please try again later.";
}
}
//end point functions for the frontend to call
//POST /api/v1/login
//login with username and password, returns a promise that resolves to the token and username
export async function login(username,password){
const data = await request("POST","/login",{username,password});
saveSession(data.username,data.token);
return data;
}

//POST /api/v1/register(400 if username already exists)
export async function register(username,password){
const data = await request("POST","/register",{username,password});
saveSession(data.username,data.token);
return data;
}

//GET /api/v1/rooms
//returns a promise that resolves to an array of rooms
export async function getRooms(){
return await request("GET","/rooms");
}

//GET /api/v1/rooms/:roomId
//returns a promise that resolves to the room object
export async function getRoom(roomId){
return await request("GET",`/rooms/${roomId}`);
}
//POST /api/v1/rooms
export async function createRoom(title, bookTitle, bookAuthor){
    return request("POST", "/rooms", { title, bookTitle, bookAuthor });
}
//POST /api/v1/comments
//number because ids from the url are strings, but the backend expects a number --go langauge
export async function createComment(roomId, content){
    return request("POST", "/comments", { roomId: Number(roomId), content });
}
// GET /api/v1/rooms/{id}/moderate -> { moderators: [...], registered: [...] }
export function getModeration(roomId) {
  return request("GET", `/rooms/${encodeURIComponent(roomId)}/moderate`);
}

// POST /api/v1/rooms/{id}/moderate -> { moderators: [...], registered: [...] }
export function updateModeration(roomId, moderators, registered) {
  return request("POST", `/rooms/${encodeURIComponent(roomId)}/moderate`, { username, role });
}
