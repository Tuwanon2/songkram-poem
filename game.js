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

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const urlParams = new URLSearchParams(window.location.search);
const currentRoom = urlParams.get('room');
const myName = urlParams.get('name');
const isHost = urlParams.get('host') === 'true';

if (!currentRoom || !myName) {
    window.location.href = 'index.html';
}

let myCardsArr = [];
let allPlayers = {}; 

const ALL_THEMES = ["ดอกไม้", "หุ่นไล่กา", "ทะเล", "ภูเขา", "โรงเรียน", "ผีหลอก", "ฝนตก", "ตลาดน้ำ", "ดวงดาว", "สุนัข", "แมว", "ความรัก", "ชาวนา", "อวกาศ", "เงินทอง"];

const ALL_WORDS = ["ต้นไม้", "กิน", "หิว", "รัก", "น้ำ", "ฟ้า", "ดิน", "ลม", "ไฟ", "เดิน", "นอน", "วิ่ง", "สวย", "รวย", "นก", "ปลา", "ดอกไม้", "หมา", "แมว", "ใจ", "ตา", "หู", "ปาก", "ดี", "ตาย", "คน"];
const ALL_ACTIONS = ["จับมือถือ / วางมือถือ", "เกาหัว", "ถอนหายใจ", "พยักหน้า", "ส่ายหน้า", "หัวเราะ", "ไอ / จาม", "ขยี้ตา / จับแว่น", "ดื่มน้ำ", "จับคาง / กุมขมับ", "กอดอก", "ยักไหล่"];

function generateCards(numCards) {
    let newCards = [];
    for (let i = 0; i < numCards; i++) {
        let shuffledWords = [...ALL_WORDS].sort(() => 0.5 - Math.random()).slice(0, 3);
        let randomAction = ALL_ACTIONS[Math.floor(Math.random() * ALL_ACTIONS.length)];
        
        newCards.push({
            words: shuffledWords,
            action: randomAction
        });
    }
    return newCards;
}

function initRoom() {
    document.getElementById('display-room-code').innerText = currentRoom;
    
    if (isHost) {
        document.getElementById('host-badge').classList.remove('hidden-screen');
        document.getElementById('btn-start-game').classList.remove('hidden-screen');
        document.getElementById('btn-change-theme').classList.remove('hidden-screen');
    }

    myCardsArr = generateCards(3);

    db.ref(`rooms/${currentRoom}/players/${myName}`).set({
        name: myName,
        cards: myCardsArr
    });

    db.ref(`rooms/${currentRoom}/players/${myName}`).onDisconnect().remove();

    db.ref('rooms/' + currentRoom).on('value', (snapshot) => {
        const data = snapshot.val();
        if(!data) {
            alert("ห้องนี้ถูกปิดไปแล้ว");
            window.location.href = 'index.html';
            return;
        }
        
        // อัปเดตแสดงชื่อห้องให้เด่นๆ
        document.getElementById('display-room-name').innerText = data.roomName || "ห้องกลอนลับ";

        allPlayers = data.players || {};

        const playerList = document.getElementById('player-list');
        if (playerList) {
            playerList.innerHTML = "";
            Object.keys(allPlayers).forEach(pName => {
                playerList.innerHTML += `
                    <li class="flex items-center justify-between bg-gray-900 p-2.5 rounded-lg border border-gray-800">
                        <span class="flex items-center gap-2">🟢 <span>${pName}</span></span>
                        ${pName === myName ? '<span class="text-xs bg-pink-600 px-2 py-0.5 rounded font-bold">ฉัน</span>' : ''}
                    </li>
                `;
            });
        }

        if(data.winner && data.winner !== "") {
            showScreen('screen-winner');
            hideModal();
            document.getElementById('winner-name').innerText = data.winner;
            return;
        }

        if(data.status === "playing") {
            showScreen('screen-game');
            document.getElementById('current-theme').innerText = data.theme;
            
            if(allPlayers[myName] && allPlayers[myName].cards) {
                myCardsArr = allPlayers[myName].cards || [];
            } else {
                myCardsArr = [];
            }
            renderMyCards();
            renderOpponentsStatus();

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

function hideModal() { document.getElementById('modal-catch').classList.add('hidden-screen'); }

function startGame() {
    if(!isHost) return;
    const randomTheme = ALL_THEMES[Math.floor(Math.random() * ALL_THEMES.length)];
    db.ref('rooms/' + currentRoom).update({ status: "playing", theme: randomTheme });
}

function changeTheme() {
    if(!isHost) return;
    const randomTheme = ALL_THEMES[Math.floor(Math.random() * ALL_THEMES.length)];
    db.ref('rooms/' + currentRoom).update({ theme: randomTheme });
}

function renderMyCards() {
    const cardContainer = document.getElementById('my-cards');
    document.getElementById('my-card-count').innerText = myCardsArr.length;
    cardContainer.innerHTML = "";
    
    myCardsArr.forEach((card, idx) => {
        const wordsStr = card.words.join(", ");
        cardContainer.innerHTML += `
        <div class="bg-gradient-to-r from-gray-800 to-gray-700 p-4 rounded-xl shadow-lg border border-gray-600 text-left relative">
            <div class="text-green-400 text-xs font-bold mb-1">💬 หากมีคนพูดคำว่า:</div>
            <div class="text-white font-extrabold text-base mb-3">${wordsStr}</div>
            <div class="text-yellow-400 text-xs font-bold mb-1">🎬 หรือทำท่าทาง:</div>
            <div class="text-white font-extrabold text-base">${card.action}</div>
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
            <span class="bg-gray-800 px-2.5 py-1.5 rounded-lg text-pink-300 shadow-sm border border-gray-700 font-semibold">
                👤 ${pName}: <span class="text-white font-extrabold">${cardCount} ใบ</span>
            </span>`;
        }
    });
}

function triggerCatch() {
    if(myCardsArr.length === 0) return alert("คุณไม่มีไพ่เหลือแล้ว!");
    db.ref('rooms/' + currentRoom + '/catchingState').set({ active: true, catcher: myName });
}

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
    myCardsArr.forEach((card, index) => {
        let previewText = `ใช้คำ: [${card.words.join(", ")}] หรือ ท่า: [${card.action}]`;
        cardSelect.innerHTML += `<option value="${index}">${previewText}</option>`;
    });
}

function confirmCatch() {
    const victim = document.getElementById('select-victim').value;
    const cardIndex = document.getElementById('select-card').value;
    
    if(!victim || cardIndex === "") return alert("กรุณาเลือกให้ครบ");

    myCardsArr.splice(cardIndex, 1);
    db.ref(`rooms/${currentRoom}/players/${myName}/cards`).set(myCardsArr);

    let victimCards = allPlayers[victim].cards || [];
    let newCard = generateCards(1)[0]; 
    victimCards.push(newCard);
    db.ref(`rooms/${currentRoom}/players/${victim}/cards`).set(victimCards);

    if(myCardsArr.length === 0) {
        db.ref('rooms/' + currentRoom).update({ winner: myName });
    }

    alert(`แฉสำเร็จ! คุณทิ้งไพ่เรียบร้อย และสั่งให้ [${victim}] จั่วเพิ่ม 1 ใบ!`);
    
    db.ref('rooms/' + currentRoom + '/catchingState').set({ active: false, catcher: "" });
}

function cancelCatch() {
    db.ref('rooms/' + currentRoom + '/catchingState').set({ active: false, catcher: "" });
}

function leaveRoom() {
    db.ref(`rooms/${currentRoom}/players/${myName}`).remove().then(() => {
        window.location.href = "index.html";
    });
}

window.onload = initRoom;