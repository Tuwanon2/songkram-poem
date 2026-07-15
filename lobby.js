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

db.ref('rooms').on('value', (snapshot) => {
    const rooms = snapshot.val();
    renderAvailableRooms(rooms);
});

function renderAvailableRooms(rooms) {
    const container = document.getElementById('available-rooms');
    if (!container) return;
    container.innerHTML = "";
    
    if (!rooms) {
        container.innerHTML = `<p class="text-gray-500 text-sm text-center py-4">ยังไม่มีห้องเปิดอยู่ สร้างห้องใหม่ก่อนเลย!</p>`;
        return;
    }

    let hasWaitingRoom = false;
    Object.keys(rooms).forEach(roomCode => {
        const room = rooms[roomCode];
        if (room.status === "waiting") {
            hasWaitingRoom = true;
            const playerCount = room.players ? Object.keys(room.players).length : 0;
            container.innerHTML += `
                <button onclick="quickJoin('${roomCode}')" class="w-full bg-gray-700 hover:bg-pink-600 text-left p-3 rounded-lg flex justify-between items-center transition shadow border border-gray-600">
                    <span class="font-bold text-white">ห้อง: <span class="text-yellow-400">${roomCode}</span></span>
                    <span class="text-xs bg-gray-950 px-2 py-1 rounded text-pink-300 font-semibold">กวีรอร่วมวง (${playerCount} คน)</span>
                </button>
            `;
        }
    });

    if (!hasWaitingRoom) {
        container.innerHTML = `<p class="text-gray-500 text-sm text-center py-4">ยังไม่มีห้องรอเล่นอยู่ สร้างห้องใหม่เลยนะ!</p>`;
    }
}

function createRoom() {
    const name = document.getElementById('player-name').value.trim();
    let roomCode = document.getElementById('room-code').value.trim().toUpperCase();
    
    if(!name) return alert("โปรดระบุชื่อผู้เล่นกวีก่อนครับ");
    if(!roomCode) roomCode = Math.floor(1000 + Math.random() * 9000).toString();

    db.ref('rooms/' + roomCode).set({
        theme: "กำลังเลือกหัวข้อ...",
        status: "waiting",
        catchingState: { active: false, catcher: "" },
        winner: ""
    }).then(() => {
        window.location.href = `room.html?room=${roomCode}&name=${encodeURIComponent(name)}&host=true`;
    });
}

function joinRoom() {
    const name = document.getElementById('player-name').value.trim();
    const roomCode = document.getElementById('room-code').value.trim().toUpperCase();
    
    if(!name || !roomCode) return alert("โปรดกรอกชื่อของคุณและรหัสห้อง");

    db.ref('rooms/' + roomCode).once('value', (snapshot) => {
        if (!snapshot.exists()) return alert("ไม่พบรหัสห้องนี้ในระบบ");
        if (snapshot.val().status === "playing") return alert("ห้องนี้กำลังอยู่ในระหว่างเล่นเกม");
        window.location.href = `room.html?room=${roomCode}&name=${encodeURIComponent(name)}`;
    });
}

function quickJoin(roomCode) {
    const nameInput = document.getElementById('player-name');
    const name = nameInput.value.trim();
    if (!name) return alert("กรุณากรอกชื่อของคุณก่อนกดเข้าร่วมห้อง!");
    window.location.href = `room.html?room=${roomCode}&name=${encodeURIComponent(name)}`;
}