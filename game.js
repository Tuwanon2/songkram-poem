// --- Firebase Config ---
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

// ดึงตัวแปรจาก URL Query
const urlParams = new URLSearchParams(window.location.search);
const currentRoom = urlParams.get('room');
const myName = urlParams.get('name');
const isHost = urlParams.get('host') === 'true';

// ถ้าไม่มีตัวแปรส่งมา ให้เตะกลับหน้าแรกทันที ป้องกันแอบเนียนเข้าหน้าห้องตรงๆ
if (!currentRoom || !myName) {
    window.location.href = 'index.html';
}

let myCardsArr = [];
let allPlayers = {}; 

const ALL_THEMES = ["ดอกไม้", "หุ่นไล่กา", "ทะเล", "ภูเขา", "โรงเรียน", "ผีหลอก", "ฝนตก", "ตลาดน้ำ", "ดวงดาว", "สุนัข", "แมว", "รถไฟ", "ความรัก", "ชาวนา"];

const ALL_ACTIONS = [
    "ไอ / จาม", "หัวเราะ", "เกาหัว", "ถอนหายใจ", 
    "ขยี้ตา / จับแว่น", "ดื่มน้ำ", "จับมือถือ", 
    "ยักไหล่", "ส่ายหน้า", "พยักหน้า", "ปรบมือ", "ชี้หน้า"
];

function getRandomCards(num) {
    let shuffled = [...ALL_ACTIONS].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, num);
}

// เริ่มต้นเช็คการเข้าร่วมห้อง
function initRoom() {
    document.getElementById('display-room-code').innerText = currentRoom;
    
    if (isHost) {
        document.getElementById('host-badge').classList.remove('hidden-screen');
        document.getElementById('btn-start-game').classList.remove('hidden-screen');
        document.getElementById('btn-change-theme').classList.remove('hidden-screen');
    }

    // จั่วไพ่เริ่มเกมของตัวเอง (3 ใบ)
    myCardsArr = getRandomCards(3);

    // อัปเดตข้อมูลของตัวเองลงใต้ห้องนั้น
    db.ref(`rooms/${currentRoom}/players/${myName}`).set({
        name: myName,
        cards: myCardsArr
    });

    // ทำความสะอาดห้องตอนปิดแท็บหรือโหลดหน้าใหม่ (ลบชื่อเราออกจากห้องนั้น)
    db.ref(`rooms/${currentRoom}/players/${myName}`).onDisconnect().remove();

    // คอยฟังความเปลี่ยนแปลงของห้องแบบเรียลไทม์
    db.ref('rooms/' + currentRoom).on('value', (snapshot) => {
        const data = snapshot.val();
        if(!data) {
            alert("ห้องนี้ได้ถูกปิดไปแล้ว");
            window.location.href = 'index.html';
            return;
        }

        allPlayers = data.players || {};

        // 1. อัปเดตรายชื่อผู้เล่นในห้องรอ
        const playerList = document.getElementById('player-list');
        if (playerList) {
            playerList.innerHTML = "";
            Object.keys(allPlayers).forEach(pName => {
                const isPlayerHost = pName === Object.keys(allPlayers)[0]; // สมมติคนแรกคือ host ถ้าออกจากระบบ
                playerList.innerHTML += `
                    <li class="flex items-center justify-between bg-gray-900 p-2.5 rounded-lg border border-gray-800">
                        <span class="flex items-center gap-2">🟢 <span>${pName}</span></span>
                        ${pName === myName ? '<span class="text-xs bg-pink-600 px-2 py-0.5 rounded font-bold">ฉัน</span>' : ''}
                    </li>
                `;
            });
        }

        // 2. ถ้ามีผู้ชนะแล้ว
        if(data.winner && data.winner !== "") {
            showScreen('screen-winner');
            hideModal();
            document.getElementById('winner-name').innerText = data.winner;
            return;
        }

        // 3. เริ่มเกมแล้ว (สลับหน้าจอ)
        if(data.status === "playing") {
            showScreen('screen-game');
            document.getElementById('current-theme').innerText = data.theme;
            
            // ดึงข้อมูลไพ่ที่อยู่ในมือเราจากเซิร์ฟเวอร์
            if(allPlayers[myName] && allPlayers[myName].cards) {
                myCardsArr = allPlayers[myName].cards || [];
                renderMyCards();
            } else {
                myCardsArr = [];
                renderMyCards();
            }

            // แสดงไพ่ที่เหลืออยู่ของคนอื่น
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
        } else {
            showScreen('screen-waiting');
        }
    });
}

// ย้ายหน้าจอใน SPA
function showScreen(id) {
    document.getElementById('screen-waiting').classList.add('hidden-screen');
    document.getElementById('screen-game').classList.add('hidden-screen');
    document.getElementById('screen-winner').classList.add('hidden-screen');
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

// เริ่มเกม (เฉพาะ Host)
function startGame() {
    if(!isHost) return;
    
    // สุ่มหัวข้อแรกก่อนเข้าเล่น
    const randomTheme = ALL_THEMES[Math.floor(Math.random() * ALL_THEMES.length)];
    
    db.ref('rooms/' + currentRoom).update({ 
        status: "playing",
        theme: randomTheme
    });
}

// เปลี่ยนหัวข้อ (เฉพาะ Host)
function changeTheme() {
    if(!isHost) return;
    const randomTheme = ALL_THEMES[Math.floor(Math.random() * ALL_THEMES.length)];
    db.ref('rooms/' + currentRoom).update({ theme: randomTheme });
}

// แสดงไพ่ของตัวเอง
function renderMyCards() {
    const cardContainer = document.getElementById('my-cards');
    document.getElementById('my-card-count').innerText = myCardsArr.length;
    cardContainer.innerHTML = "";
    
    myCardsArr.forEach(card => {
        cardContainer.innerHTML += `
        <div class="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 rounded-xl font-bold shadow-md border border-purple-400 text-center tracking-wide text-sm">
            🎯 ${card}
        </div>`;
    });
}

// แสดงจำนวนไพ่ที่เหลือของเพื่อน
function renderOpponentsStatus() {
    const oppContainer = document.getElementById('opponents-status');
    oppContainer.innerHTML = "";
    Object.keys(allPlayers).forEach(pName => {
        if(pName !== myName) {
            let cardCount = allPlayers[pName].cards ? allPlayers[pName].cards.length : 0;
            oppContainer.innerHTML += `
            <span class="bg-gray-800 px-2.5 py-1.5 rounded-lg text-pink-300 shadow-sm border border-gray-700 font-semibold">
                👤 ${pName}: <span class="text-white font-extrabold">${cardCount} ใบ</span>
            </span>`;
        }
    });
}

// ลั่นระฆังจับโป๊ะ
function triggerCatch() {
    if(myCardsArr.length === 0) return alert("คุณไม่มีไพ่เหลือในมือแล้ว!");
    
    db.ref('rooms/' + currentRoom + '/catchingState').set({
        active: true,
        catcher: myName
    });
}

// ดึงข้อมูลสำหรับใส่ลงใน Select Box ของ Modal จับโป๊ะ
function setupCatchingUI() {
    const victimSelect = document.getElementById('select-victim');
    victimSelect.innerHTML = "";
    Object.keys(allPlayers).forEach(pName => {
        if(pName !== myName) {
            victimSelect.innerHTML += `<option value="${pName}">${pName}</option>`;
        }
    });

    const cardSelect = document.getElementById('select-card');
    cardSelect.innerHTML = "";
    myCardsArr.forEach(card => {
        cardSelect.innerHTML += `<option value="${card}">${card}</option>`;
    });
}

// กดยืนยันจับโป๊ะ
function confirmCatch() {
    const victim = document.getElementById('select-victim').value;
    const usedCard = document.getElementById('select-card').value;
    
    if(!victim || !usedCard) return alert("กรุณาเลือกชื่อกวีที่โดนจับและไพ่ที่จับคู่ด้วยครับ");

    // 1. ทิ้งไพ่ใบนั้นของเรา (ลบออกจากอาร์เรย์)
    const cardIndex = myCardsArr.indexOf(usedCard);
    if (cardIndex > -1) {
        myCardsArr.splice(cardIndex, 1);
    }
    
    // อัปเดตลงเซิร์ฟเวอร์
    db.ref(`rooms/${currentRoom}/players/${myName}/cards`).set(myCardsArr);

    // 2. ลงโทษเพื่อนด้วยการบวกไพ่เพิ่ม 1 ใบ
    let victimCards = allPlayers[victim].cards || [];
    let newCard = getRandomCards(1)[0];
    victimCards.push(newCard);
    db.ref(`rooms/${currentRoom}/players/${victim}/cards`).set(victimCards);

    // 3. เช็คสถานะการจบเกม
    if(myCardsArr.length === 0) {
        db.ref('rooms/' + currentRoom).update({ winner: myName });
    }

    alert(`ยอดเยี่ยม! คุณแฉการทำท่าของ [${victim}] ได้ถูกใบ!\nคุณได้ทิ้งไพ่ [${usedCard}] และเพื่อนโดนสั่งจั่วบวก 1 ใบ`);
    
    // รีเซ็ตสถานะการจับโป๊ะกลับมาปกติ
    db.ref('rooms/' + currentRoom + '/catchingState').set({
        active: false,
        catcher: ""
    });
}

// ยกเลิกการจับโป๊ะ
function cancelCatch() {
    db.ref('rooms/' + currentRoom + '/catchingState').set({
        active: false,
        catcher: ""
    });
}

// ออกจากห้อง ย้ายกลับหน้าแรก
function leaveRoom() {
    // ลบข้อมูลตัวเองก่อนออก
    db.ref(`rooms/${currentRoom}/players/${myName}`).remove().then(() => {
        window.location.href = "index.html";
    });
}

// เรียกให้ระบบทำงานเมื่อพร้อม
window.onload = initRoom;