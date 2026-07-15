// --- Firebase Config ของคุณ ---
const firebaseConfig = {
    apiKey: "AIzaSyBSzrgXsNFBqXYqsFxbeXrrmWBcUPO1DJM",
    authDomain: "songkrampoem.firebaseapp.com",
    databaseURL: "https://songkrampoem-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "songkrampoem",
    storageBucket: "songkrampoem.firebasestorage.app",
    messagingSenderId: "578018297847",
    appId: "1:578018297847:web:e8efabae61aaf98a6210f2",
    measurementId: "G-X1SMGY912T"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ตัวแปรเก็บข้อมูล
let myName = "";
let currentRoom = "";
let isHost = false;
let myCardsArr = [];
let allPlayers = {}; // เก็บรายชื่อและจำนวนไพ่

// หัวข้อกลอนแบบสั้นๆ (ห้วนๆ)
const ALL_THEMES = ["ดอกไม้", "หุ่นไล่กา", "ทะเล", "ภูเขา", "โรงเรียน", "ผีหลอก", "ฝนตก", "ตลาดน้ำ", "ดวงดาว", "สุนัข", "แมว", "รถไฟ", "ความรัก", "ชาวนา"];

// แอคชั่น
const ALL_ACTIONS = [
    "ไอ / จาม", "หัวเราะ", "เกาหัว", "ถอนหายใจ", 
    "ขยี้ตา / จับแว่น", "ดื่มน้ำ", "จับมือถือ", 
    "ยักไหล่", "ส่ายหน้า", "พยักหน้า", "ปรบมือ", "ชี้หน้า"
];

function getRandomCards(num) {
    let shuffled = [...ALL_ACTIONS].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, num);
}

// --- การแสดงผลหน้าจอ ---
function showScreen(id) {
    document.querySelectorAll('div[id^="screen-"]').forEach(el => el.classList.add('hidden-screen'));
    document.getElementById(id).classList.remove('hidden-screen');
}

function showModal(id) {
    document.getElementById('modal-catch').classList.remove('hidden-screen');
    document.getElementById('catch-active').classList.add('hidden-screen');
    document.getElementById('catch-passive').classList.add('hidden-screen');
    document.getElementById(id).classList.remove('hidden-screen');
}

function hideModal() {
    document.getElementById('modal-catch').classList.add('hidden-screen');
}

// --- สร้าง / เข้าร่วมห้อง ---
function createRoom() {
    myName = document.getElementById('player-name').value.trim();
    currentRoom = document.getElementById('room-code').value.trim().toUpperCase();
    if(!myName || !currentRoom) return alert("โปรดใส่ชื่อและรหัสห้อง");

    isHost = true;
    db.ref('rooms/' + currentRoom).set({
        theme: "รอเริ่มเกม...",
        status: "waiting",
        catchingState: { active: false, catcher: "" },
        winner: ""
    });
    
    joinRoomLogic();
}

function joinRoom() {
    myName = document.getElementById('player-name').value.trim();
    currentRoom = document.getElementById('room-code').value.trim().toUpperCase();
    if(!myName || !currentRoom) return alert("โปรดใส่ชื่อและรหัสห้อง");
    
    joinRoomLogic();
}

function joinRoomLogic() {
    myCardsArr = getRandomCards(3); // จั่วไพ่เริ่มเกม 3 ใบ

    db.ref(`rooms/${currentRoom}/players/${myName}`).set({
        name: myName,
        cards: myCardsArr
    });

    document.getElementById('display-room-code').innerText = currentRoom;
    showScreen('screen-waiting');

    if(isHost) {
        document.getElementById('btn-start-game').classList.remove('hidden-screen');
        document.getElementById('btn-change-theme').classList.remove('hidden-screen');
    }

    // ฟังสถานะเรียลไทม์
    db.ref('rooms/' + currentRoom).on('value', (snapshot) => {
        const data = snapshot.val();
        if(!data) return;

        allPlayers = data.players || {};

        // 1. อัปเดตห้องรอ
        const playerList = document.getElementById('player-list');
        playerList.innerHTML = "";
        Object.keys(allPlayers).forEach(pName => {
            playerList.innerHTML += `<li>✅ ${pName}</li>`;
        });

        // 2. ถ้ามีผู้ชนะ
        if(data.winner !== "") {
            showScreen('screen-winner');
            hideModal();
            document.getElementById('winner-name').innerText = data.winner;
            return;
        }

        // 3. เริ่มเกมแล้ว
        if(data.status === "playing") {
            if(document.getElementById('screen-game').classList.contains('hidden-screen')) {
                showScreen('screen-game');
            }
            document.getElementById('current-theme').innerText = data.theme;
            
            // อัปเดตไพ่ในมือเรา
            if(allPlayers[myName] && allPlayers[myName].cards) {
                myCardsArr = allPlayers[myName].cards || [];
                renderMyCards();
            } else {
                myCardsArr = [];
                renderMyCards();
            }

            // อัปเดตสถานะเพื่อน
            renderOpponentsStatus();

            // 4. มีคนกดจับโป๊ะ
            if(data.catchingState && data.catchingState.active) {
                if(data.catchingState.catcher === myName) {
                    setupCatchingUI();
                    showModal('catch-active');
                } else {
                    document.getElementById('catcher-name-display').innerText = data.catchingState.catcher;
                    showModal('catch-passive');
                }
            } else {
                hideModal();
            }
        }
    });
}

function startGame() {
    changeTheme();
    db.ref('rooms/' + currentRoom).update({ status: "playing" });
}

function changeTheme() {
    const randomTheme = ALL_THEMES[Math.floor(Math.random() * ALL_THEMES.length)];
    db.ref('rooms/' + currentRoom).update({ theme: randomTheme });
}

function renderMyCards() {
    const cardContainer = document.getElementById('my-cards');
    document.getElementById('my-card-count').innerText = myCardsArr.length;
    cardContainer.innerHTML = "";
    
    myCardsArr.forEach(card => {
        cardContainer.innerHTML += `
        <div class="bg-gradient-to-r from-purple-600 to-indigo-600 p-3 rounded-lg font-bold shadow border border-purple-400 text-center">
            ${card}
        </div>`;
    });
}

function renderOpponentsStatus() {
    const oppContainer = document.getElementById('opponents-status');
    oppContainer.innerHTML = "";
    Object.keys(allPlayers).forEach(pName => {
        if(pName !== myName) {
            let cardCount = allPlayers[pName].cards ? allPlayers[pName].cards.length : 0;
            oppContainer.innerHTML += `
            <span class="bg-gray-700 px-2 py-1 rounded text-pink-300">
                ${pName}: <span class="text-white">${cardCount} ใบ</span>
            </span>`;
        }
    });
}

// --- ระบบจับโป๊ะ ---
function triggerCatch() {
    if(myCardsArr.length === 0) return alert("ไพ่คุณหมดแล้ว!");
    db.ref('rooms/' + currentRoom + '/catchingState').set({
        active: true,
        catcher: myName
    });
}

function setupCatchingUI() {
    // โหลดรายชื่อเหยื่อ (ตัดชื่อตัวเองออก)
    const victimSelect = document.getElementById('select-victim');
    victimSelect.innerHTML = "";
    Object.keys(allPlayers).forEach(pName => {
        if(pName !== myName) {
            victimSelect.innerHTML += `<option value="${pName}">${pName}</option>`;
        }
    });

    // โหลดไพ่ของตัวเอง
    const cardSelect = document.getElementById('select-card');
    cardSelect.innerHTML = "";
    myCardsArr.forEach(card => {
        cardSelect.innerHTML += `<option value="${card}">${card}</option>`;
    });
}

function confirmCatch() {
    const victim = document.getElementById('select-victim').value;
    const usedCard = document.getElementById('select-card').value;
    
    if(!victim || !usedCard) return;

    // 1. ลดไพ่ตัวเอง (ลบใบที่เลือกใช้)
    const cardIndex = myCardsArr.indexOf(usedCard);
    if (cardIndex > -1) {
        myCardsArr.splice(cardIndex, 1);
    }
    db.ref(`rooms/${currentRoom}/players/${myName}/cards`).set(myCardsArr);

    // 2. เพิ่มไพ่ให้เหยื่อ (สุ่ม 1 ใบ)
    let victimCards = allPlayers[victim].cards || [];
    let newCard = getRandomCards(1)[0];
    victimCards.push(newCard);
    db.ref(`rooms/${currentRoom}/players/${victim}/cards`).set(victimCards);

    // 3. ตรวจสอบว่าเราไพ่หมดชนะหรือยัง?
    if(myCardsArr.length === 0) {
        db.ref('rooms/' + currentRoom).update({ winner: myName });
    }

    // 4. ปิด Modal แจ้งเตือนเพื่อน
    alert(`คุณจับโป๊ะ ${victim} สำเร็จ!\nคุณทิ้งไพ่ [${usedCard}]\n${victim} โดนจั่วเพิ่ม 1 ใบ!`);
    
    db.ref('rooms/' + currentRoom + '/catchingState').set({
        active: false,
        catcher: ""
    });
}

function cancelCatch() {
    db.ref('rooms/' + currentRoom + '/catchingState').set({
        active: false,
        catcher: ""
    });
}