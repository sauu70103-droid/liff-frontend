const GAS_URL = "https://script.google.com/macros/s/AKfycbwApGqvuUMuERNtrlEr1NHSKxooH_fD9XF_t1v-iKg_gDJ0kRBqnrKodhjVlIWa-u16sw/exec"; 
const LIFF_ID = "2011305352-GK5jDrbh"; 

let userLineUid = "";
let currentJwId = "";
let currentMemberName = "";

window.onload = function() {
  setupBookingInputs();
  liff.init({ liffId: LIFF_ID }).then(() => {
    if (!liff.isLoggedIn()) liff.login(); else getUserDataAndLogin();
  }).catch(err => { document.getElementById("loadingMsg").innerHTML = "<h3>LIFF 載入失敗，請確認網路連線</h3>"; });
};

function setupBookingInputs() {
  const todayString = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  document.getElementById("date1").min = todayString; 
  document.getElementById("date2").min = todayString; 
  document.getElementById("date3").min = todayString;
  
  let optionsHtml = '<option value="">時間</option>';
  for (let h = 9; h <= 16; h++) {
    let hour = h.toString().padStart(2, '0');
    optionsHtml += `<option value="${hour}:00">${hour}:00</option><option value="${hour}:30">${hour}:30</option>`;
  }
  optionsHtml += `<option value="17:00">17:00</option>`;
  document.getElementById("time1").innerHTML = optionsHtml; 
  document.getElementById("time2").innerHTML = optionsHtml; 
  document.getElementById("time3").innerHTML = optionsHtml;
}

function getUserDataAndLogin() {
  liff.getProfile().then(profile => {
    userLineUid = profile.userId;
    fetch(GAS_URL, { method: "POST", body: JSON.stringify({ action: "autoLogin", lineUid: userLineUid }) })
    .then(res => res.json())
    .then(data => {
      document.getElementById("loadingMsg").classList.add("hidden");
      if (data.status === "success") renderDashboard(data); else document.getElementById("bindSection").classList.remove("hidden");
    }).catch(err => Swal.fire('錯誤', '網路錯誤，請重新開啟。', 'error'));
  });
}

function bindAccount() {
  const phone = document.getElementById("phoneInput").value.trim();
  if(phone.length !== 10) { Swal.fire('提示', '請輸入完整的 10 碼手機號碼！', 'warning'); return; }
  
  document.getElementById("bindSection").classList.add("hidden"); 
  document.getElementById("loadingMsg").classList.remove("hidden");
  document.getElementById("loadingMsg").innerHTML = "<h3>綁定資料中...</h3>";

  fetch(GAS_URL, { method: "POST", body: JSON.stringify({ action: "bindAccount", lineUid: userLineUid, phone: phone }) })
  .then(res => res.json())
  .then(data => {
    document.getElementById("loadingMsg").classList.add("hidden");
    if (data.status === "success") { Swal.fire('成功', '綁定成功！歡迎回來', 'success'); renderDashboard(data); } 
    else { Swal.fire('失敗', data.message, 'error'); document.getElementById("bindSection").classList.remove("hidden"); }
  });
}

function renderDashboard(data) {
  document.getElementById("mainSystem").classList.remove("hidden");
  currentJwId = data.profile.id;
  currentMemberName = data.profile.name; 
  
  document.getElementById("displayName").textContent = data.profile.name + "，您好！";
  document.getElementById("userJwId").textContent = data.profile.id;
  document.getElementById("displayTier").textContent = data.profile.tier || "一般會員";
  document.getElementById("displayPartner").textContent = data.profile.partner ? ("特約：" + data.profile.partner) : "無特約";
  document.getElementById("displayPackages").textContent = data.profile.packages || 0;
  document.getElementById("displayPhone").textContent = data.profile.phone || "尚未填寫";
  
  if(data.profile.birthday) {
    let d = new Date(data.profile.birthday); 
    if(!isNaN(d)) document.getElementById("editBirthday").value = d.toISOString().split('T')[0];
  }
  
  document.getElementById("editName").value = (data.profile.name && data.profile.name.includes("新會員")) ? "" : (data.profile.name || "");
  document.getElementById("editPhone").value = data.profile.phone || "";
  document.getElementById("editGender").value = data.profile.gender || "";

  if (!data.profile.phone || !data.profile.birthday || !data.profile.gender || data.profile.name.includes("新會員")) {
    document.getElementById("profileEditCard").classList.remove("hidden"); document.getElementById("toggleEditBtn").textContent = "隱藏修改表單";
  } else {
    document.getElementById("profileEditCard").classList.add("hidden"); document.getElementById("toggleEditBtn").textContent = "修改個人資料";
  }

  const bookingContainer = document.getElementById("upcomingBookingsContainer");
  let bookingHtml = "";
  const allUpcoming = [];
  
  if (data.confirmedBookings) allUpcoming.push(...data.confirmedBookings);
  if (data.pendingBookings) allUpcoming.push(...data.pendingBookings);
  if (data.cancelledBookings) allUpcoming.push(...data.cancelledBookings); 
  
  if (allUpcoming.length > 0) {
    allUpcoming.forEach(b => {
      let lightColor = b.light; 
      let statusHtml = `<span class="status-text ${lightColor}">${getIcon(lightColor)} ${b.status}</span>`;
      let extraInfo = "";
      
      if (lightColor === "green" || lightColor === "blue") extraInfo = `安排師傅：${b.therapist}`;
      else if (lightColor === "yellow") {
        if (b.status === "處理改期要求中" && b.newTime) extraInfo = `👉 期望新時間：<strong style="color:var(--yellow-light);">${b.newTime}</strong>`;
        else extraInfo = `請等候店鋪回覆確認`;
      } 
      else if (lightColor === "red") extraInfo = `此時段無空檔，請重新預約或洽客服`;

      bookingHtml += `
        <div class="booking-box ${lightColor}">
          <div class="title">${b.time} - ${b.service}</div>
          <div class="detail">${statusHtml} | ${extraInfo}</div>
          ${lightColor !== 'red' ? `
          <div style="text-align: right; padding-right: 8px;">
            ${(lightColor === 'green' || lightColor === 'blue') ? `<button class="btn-small" onclick="goToCheckIn('${b.time}', '${b.service}')" style="margin-right: 5px; background:var(--green-light);">即時調理資料產生</button>` : ''}
            <button class="btn-small btn-outline" onclick="changeBookingHandler('${b.time}', '${b.service}', 'modify')">要求改期</button>
            <button class="btn-small btn-secondary" onclick="changeBookingHandler('${b.time}', '${b.service}', 'cancel')" style="margin-left: 5px;">取消</button>
          </div>` : ''}
        </div>
      `;
    });
  } else {
    bookingHtml = "<p style='color: var(--text-muted); font-size: 14px;'>目前無未來的預約紀錄。</p>";
  }
  bookingContainer.innerHTML = bookingHtml;

  const historyContainer = document.getElementById("historyList");
  historyContainer.innerHTML = ""; 
  
  if (data.history && data.history.length > 0) {
    data.history.forEach(record => {
      let imgsHtml = "";
      if (record.checkInImg) imgsHtml += `<p style="margin-bottom:5px; font-size:13px; font-weight:bold; color:var(--primary-color);">📋 當次報到紀錄表：</p><img src="${record.checkInImg}" class="img-preview" alt="報到表單">`;
      if (record.beforeImg) imgsHtml += `<p style="margin-bottom:5px; margin-top:10px; font-size:13px;">調理前：</p><img src="${record.beforeImg}" class="img-preview">`;
      if (record.afterImg) imgsHtml += `<p style="margin-bottom:5px; margin-top:10px; font-size:13px;">調理後：</p><img src="${record.afterImg}" class="img-preview">`;

      historyContainer.innerHTML += `
        <div class="record-item">
          <strong>🗓️ ${record.date}</strong> | 師傅：${record.therapist}<br>
          <span style="color: var(--text-muted); font-size: 14px;">方案：${record.serviceType}</span>
          ${imgsHtml}
        </div>
      `;
    });
  } else { 
    historyContainer.innerHTML = "<p style='color: var(--text-muted);'>尚無調理紀錄。</p>"; 
  }
}

function getIcon(light) {
  if(light === 'green') return '✅'; if(light === 'blue') return '🔵'; if(light === 'red') return '❌'; return '⏳';
}

function goToCheckIn(timeStr, serviceStr) {
  window.location.href = `checkin.html?id=${currentJwId}&name=${currentMemberName}&time=${timeStr}&service=${serviceStr}`;
}

function changeBookingHandler(timeStr, serviceStr, actionType) {
  // 原有邏輯保持不變...
}

function sendChangeRequest(timeStr, serviceStr, actionType, userMessage) {
  // 原有邏輯保持不變...
}

function toggleEditForm() {
  const editCard = document.getElementById("profileEditCard");
  const toggleBtn = document.getElementById("toggleEditBtn");
  if (editCard.classList.contains("hidden")) { editCard.classList.remove("hidden"); toggleBtn.textContent = "隱藏修改表單"; } 
  else { editCard.classList.add("hidden"); toggleBtn.textContent = "修改個人資料"; }
}

function updateProfile() {
  // 原有邏輯保持不變...
}

function submitBooking() {
  // 原有邏輯保持不變...
}

function switchTab(tabIndex) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden')); 
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById('tab' + tabIndex).classList.remove('hidden'); 
  document.getElementById('btnTab' + tabIndex).classList.add('active');
}
