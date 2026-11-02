
const $ = id => document.getElementById(id);

// URL Google Apps Script
const GOOGLE_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbzA-NnIFbVh_Yk107p1fgwP6qB0FfbaFGmnpSeD8L9p6C59ECukQXHEbd5Cpfkzq8X00g/exec";

function showScreen(id) {
    document.querySelectorAll(".screen").forEach(screen => {
        screen.classList.toggle("active", screen.id === id);
    });
}

// Nút đồng ý
$("yesBtn").onclick = () => showScreen("booking");

// Nút từ chối tự động né
const noBtn = $("noBtn");
const area = noBtn.parentElement;

function dodgeButton() {
    const maxX = Math.max(0, area.clientWidth - noBtn.offsetWidth);
    const maxY = Math.max(0, area.clientHeight - noBtn.offsetHeight);

    noBtn.style.right = "auto";
    noBtn.style.left = Math.random() * maxX + "px";
    noBtn.style.top = Math.random() * maxY + "px";
}

area.addEventListener("pointermove", (e) => {
    const rect = noBtn.getBoundingClientRect();

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const distance = Math.hypot(
        e.clientX - centerX,
        e.clientY - centerY
    );

    if (distance < 50) {
        dodgeButton();
    }
});

noBtn.addEventListener("click", (e) => {
    e.preventDefault();
    dodgeButton();
});

// Lịch
let currentMonth = new Date();
let selectedDate = null;

const monthNames = [
    "Tháng 1", "Tháng 2", "Tháng 3",
    "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9",
    "Tháng 10", "Tháng 11", "Tháng 12"
];

function renderCalendar() {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    $("monthTitle").textContent =
        `${monthNames[month]} ${year}`;

    const days = $("days");
    days.innerHTML = "";

    const firstDay = new Date(year, month, 1);
    const offset = (firstDay.getDay() + 6) % 7;
    const totalDays = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < offset; i++) {
        days.appendChild(document.createElement("span"));
    }

    for (let d = 1; d <= totalDays; d++) {
        const btn = document.createElement("button");
        btn.className = "day";
        btn.textContent = d;

        if (
            selectedDate &&
            selectedDate.getFullYear() === year &&
            selectedDate.getMonth() === month &&
            selectedDate.getDate() === d
        ) {
            btn.classList.add("selected");
        }

        btn.onclick = () => {
            selectedDate = new Date(year, month, d);
            renderCalendar();
        };

        days.appendChild(btn);
    }
}

$("prevMonth").onclick = () => {
    currentMonth.setMonth(currentMonth.getMonth() - 1);
    renderCalendar();
};

$("nextMonth").onclick = () => {
    currentMonth.setMonth(currentMonth.getMonth() + 1);
    renderCalendar();
};

renderCalendar();

// Gửi dữ liệu lên Google Sheets
async function saveToGoogleSheet(data) {
    await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: {
            "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(data)
    });

    // no-cors không đọc được phản hồi từ Google.
    // Vì vậy không thể xác nhận chắc chắn dữ liệu đã được ghi.
}

// Xác nhận đặt lịch
$("confirmBtn").onclick = async () => {
    if (!selectedDate) {
        alert("Em hãy chọn ngày hẹn nhé 💗");
        return;
    }

    const hour = Number($("hour").value);
    const minute = Number($("minute").value);

    if (
        !Number.isInteger(hour) || hour < 0 || hour > 23 ||
        !Number.isInteger(minute) || minute < 0 || minute > 59
    ) {
        alert("Giờ hoặc phút không hợp lệ!");
        return;
    }

    const date = [
        selectedDate.getFullYear(),
        String(selectedDate.getMonth() + 1).padStart(2, "0"),
        String(selectedDate.getDate()).padStart(2, "0")
    ].join("-");

    const time =
        String(hour).padStart(2, "0") + ":" +
        String(minute).padStart(2, "0");

    const data = {
        date: date,
        time: time,
        created: new Date().toLocaleString("vi-VN")
    };

    const confirmBtn = $("confirmBtn");

    confirmBtn.disabled = true;
    confirmBtn.classList.add("spinning");

    const oldText = confirmBtn.textContent;
    confirmBtn.textContent = "💗 Đang chốt lịch...";

    try {
        await saveToGoogleSheet(data);

        // Lưu dự phòng trên thiết bị
        const bookings = JSON.parse(
            localStorage.getItem("henHoBookings") || "[]"
        );

        bookings.push(data);

        localStorage.setItem(
            "henHoBookings",
            JSON.stringify(bookings)
        );

        $("summary").textContent =
            `Hẹn em ngày ${date}, lúc ${time} nhé 💕`;

        showScreen("done");

    } catch (error) {
        console.error("Lỗi gửi lịch:", error);
        alert("Không thể gửi lịch hẹn. Em thử lại nhé!");
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.classList.remove("spinning");
        confirmBtn.textContent = oldText;
    }
};

// Xuất toàn bộ dữ liệu dự phòng thành CSV
$("exportBtn").onclick = () => {
    const bookings = JSON.parse(
        localStorage.getItem("henHoBookings") || "[]"
    );

    if (!bookings.length) {
        alert("Chưa có lịch hẹn nào!");
        return;
    }

    const csv = [
        "Ngay hen,Gio hen,Thoi gian xac nhan",
        ...bookings.map(item =>
            `${item.date},${item.time},${item.created}`
        )
    ].join("\n");

    const blob = new Blob(
        ["\uFEFF" + csv],
        { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "lich-hen.csv";
    link.click();

    URL.revokeObjectURL(url);
};
