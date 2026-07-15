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

// ดึงรายชื่อห้องทั้งหมดมาโชว์ที่ Lobby แบบเรียลไทม์
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
        // โชว์เฉพาะห้องที่สถานะ "waiting" เท่านั้น (เกมยังไม่เริ่ม)
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

// สร้างห้องใหม่
function createRoom() {
    const name = document.getElementById('player-name').value.trim();
    let roomCode = document.getElementById('room-code').value.trim().toUpperCase();
    
    if(!name) return alert("โปรดระบุชื่อผู้เล่นกวีก่อนครับ");

    // ถ้าไม่ได้ใส่รหัสห้อง ให้สุ่มเลข 4 หลัก
    if(!roomCode) {
        roomCode = Math.floor(1000 + Math.random() * 9000).toString();
    }

    // สร้างข้อมูลเริ่มต้นของห้องลง Firebase
    db.ref('rooms/' + roomCode).set({
        theme: "กำลังเลือกหัวข้อ...",
        status: "waiting",
        catchingState: { active: false, catcher: "" },
        winner: ""
    }).then(() => {
        // ย้ายหน้าไปยังห้องเล่น โดยส่งตัวแปรผ่าน URL Query Params
        window.location.href = `room.html?room=${roomCode}&name=${encodeURIComponent(name)}&host=true`;
    });
}

// เข้าร่วมห้องผ่านการพิมพ์รหัส
function joinRoom() {
    const name = document.getElementById('player-name').value.trim();
    const roomCode = document.getElementById('room-code').value.trim().toUpperCase();
    
    if(!name || !roomCode) return alert("โปรดกรอกชื่อของคุณและรหัสห้องให้ครบถ้วน");

    // ตรวจสอบว่าห้องนี้มีอยู่จริงหรือไม่
    db.ref('rooms/' + roomCode).once('value', (snapshot) => {
        if (!snapshot.exists()) {
            alert("ไม่พบรหัสห้องนี้ในระบบ กรุณาตรวจสอบอีกครั้ง");
            return;
        }
        
        const room = snapshot.val();
        if (room.status === "playing") {
            alert("ห้องนี้กำลังอยู่ในระหว่างเล่นเกม ไม่สามารถเข้าร่วมได้ในขณะนี้");
            return;
        }

        // ย้ายหน้าไปยังห้องเล่น
        window.location.href = `room.html?room=${roomCode}&name=${encodeURIComponent(name)}`;
    });
}

// ทางลัดกดจากรายการห้องเพื่อเข้าร่วมทันที
function quickJoin(roomCode) {
    const nameInput = document.getElementById('player-name');
    const name = nameInput.value.trim();
    
    if (!name) {
        nameInput.focus();
        alert("กรุณากรอกชื่อของคุณก่อนกดเข้าร่วมห้องนะกวีเอก!");
        return;
    }

    window.location.href = `room.html?room=${roomCode}&name=${encodeURIComponent(name)}`;
}