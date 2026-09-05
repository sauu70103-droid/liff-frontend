const GAS_URL = "https://script.google.com/macros/s/AKfycbwApGqvuUMuERNtrlEr1NHSKxooH_fD9XF_t1v-iKg_gDJ0kRBqnrKodhjVlIWa-u16sw/exec"; 
const LIFF_ID = "2011305352-GK5jDrbh"; 

let userLineUid = "";
let currentJwId = "";
let currentMemberName = "";

window.onload = function() {
  setupBookingInputs();
  
  liff.init({ liffId: LIFF_ID }).then(() => {
    if (!liff.isLoggedIn()) {
      liff.login(); 
    } else {
      getUserDataAndLogin();
    }
  }).catch(err => { 
    document.getElementById("loadingMsg").innerHTML = "<h3>LIFF 載入失敗，請確認網路連線</h3>"; 
  });
};

function setupBookingInputs() {
  const todayString = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  
  document.getElementById("date1").min = todayString; 
  document.getElementById("date2").min = todayString; 
  document.getElementById("date3").min = todayString;
  
  let optionsHtml = '<option value="">時間</option>';
  
  for (let h = 9; h <= 16; h++) {
    let hour = h.toString().padStart(2, '0');
    optionsHtml += `<option value="${hour}:00">${hour}:00</option>`;
    optionsHtml += `<option value="${hour}:30">${hour}:30</option>`;
  }
  optionsHtml += `<option value="17:00">17:00</option>`;
  
  document.getElementById("time1").innerHTML = optionsHtml; 
  document.getElementById("time2").innerHTML = optionsHtml; 
  document.getElementById("time3").innerHTML = optionsHtml;
}

function getUserDataAndLogin() {
  liff.getProfile().then(profile => {
    userLineUid = profile.userId;
    fetch(GAS_URL, { 
      method: "POST", 
      body: JSON.stringify({ action: "autoLogin", lineUid: userLineUid }) 
    })
    .then(res => res.json())
    .then(data => {
      document.getElementById("loadingMsg").classList.add("hidden");
      if (data.status === "success") {
        renderDashboard(data); 
      } else {
        document.getElementById("bindSection").classList.remove("hidden");
      }
    }).catch(err => {
      Swal.fire('錯誤', '網路錯誤，請重新開啟。', 'error');
    });
  });
}

function bindAccount() {
  let rawPhone = document.getElementById("phoneInput").value.replace(/\D/g, '');
  
  if(rawPhone.length !== 10 || !rawPhone.startsWith('09')) { 
    Swal.fire('提示', '請輸入完整的 10 碼手機號碼 (09開頭)！', 'warning'); 
    return; 
  }
  
  document.getElementById("bindSection").classList.add("hidden"); 
  document.getElementById("loadingMsg").classList.remove("hidden");
  document.getElementById("loadingMsg").innerHTML = "<h3>綁定資料中...</h3>";

  fetch(GAS_URL, { 
    method: "POST", 
    body: JSON.stringify({ action: "bindAccount", lineUid: userLineUid, phone: rawPhone }) 
  })
  .then(res => res.json())
  .then(data => {
    document.getElementById("loadingMsg").classList.add("hidden");
    if (data.status === "success") { 
      Swal.fire('成功', '綁定成功！歡迎回來', 'success'); 
      renderDashboard(data); 
    } else { 
      Swal.fire('失敗', data.message, 'error'); 
      document.getElementById("bindSection").classList.remove("hidden"); 
    }
  });
}

function renderDashboard(data) {
  document.getElementById("mainSystem").classList.remove("hidden");
  
  currentJwId = data.profile.id;
  currentMemberName = data.profile.name; 
  
  sessionStorage.setItem("jwProfile", JSON.stringify(data.profile));
  
  // 【首頁問候語優化】：變更為更具歸屬感的問候
  document.getElementById("displayName").textContent = data.profile.name + "，歡迎回家！";
  document.getElementById("userJwId").textContent = data.profile.id;
  document.getElementById("displayTier").textContent = data.profile.tier || "一般會員";
  document.getElementById("displayPartner").textContent = data.profile.partner ? ("特約：" + data.profile.partner) : "無特約";
  document.getElementById("displayPackages").textContent = data.profile.packages || 0;
  document.getElementById("displayPhone").textContent = data.profile.phone || "尚未填寫";
  
  if(data.profile.birthday) {
    let d = new Date(data.profile.birthday); 
    if(!isNaN(d)) {
      document.getElementById("editBirthday").value = d.toISOString().split('T')[0];
    }
  }
  
  document.getElementById("editName").value = (data.profile.name && data.profile.name.includes("新會員")) ? "" : (data.profile.name || "");
  document.getElementById("editPhone").value = data.profile.phone || "";
  document.getElementById("editGender").value = data.profile.gender || "";

  if (!data.profile.phone || !data.profile.birthday || !data.profile.gender || data.profile.name.includes("新會員")) {
    document.getElementById("profileEditCard").classList.remove("hidden"); 
    document.getElementById("toggleEditBtn").textContent = "隱藏修改表單";
  } else {
    document.getElementById("profileEditCard").classList.add("hidden"); 
    document.getElementById("toggleEditBtn").textContent = "修改個人資料";
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
      
      if (lightColor === "green" || lightColor === "blue") {
        extraInfo = `安排師傅：${b.therapist}`;
      } else if (lightColor === "yellow") {
        if (b.status === "處理改期要求中" && b.newTime) {
          extraInfo = `👉 期望新時間：<strong style="color:var(--yellow-light);">${b.newTime}</strong>`;
        } else {
          extraInfo = `請等候店鋪回覆確認`;
        }
      } else if (lightColor === "red") {
        extraInfo = `此時段無空檔，請重新預約或洽客服`;
      }

      // 【報到按鈕更名】：將按鈕文字精簡為「我要報到」
      bookingHtml += `
        <div class="booking-box ${lightColor}">
          <div class="title">${b.time} - ${b.service}</div>
          <div class="detail">${statusHtml} | ${extraInfo}</div>
          ${lightColor !== 'red' ? `
          <div style="text-align: right; padding-right: 8px;">
            ${(lightColor === 'green' || lightColor === 'blue') ? `<button class="btn-small" onclick="goToCheckIn('${b.time}', '${b.service}')" style="margin-right: 5px; background:var(--green-light);">我要報到</button>` : ''}
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
      let contentHtml = "";
      
      if (record.focusAreas) {
        contentHtml += `
          <div style="margin: 8px 0; padding: 8px; background: var(--secondary-bg); border-radius: 6px; font-size: 14px;">
            <strong style="color:var(--primary-color);">📌 會員填寫重點：</strong><br>${record.focusAreas}
          </div>
        `;
      }
      
      if (record.checkInImg) {
         contentHtml += `
           <p style="margin-bottom:5px; font-size:13px; font-weight:bold; color:var(--primary-color);">📋 當次報到紀錄表：</p>
           <img src="${record.checkInImg}" class="img-preview" alt="報到表單" onclick="openLightbox(this.src)">
         `;
      }
      if (record.beforeImg) {
         contentHtml += `
           <p style="margin-bottom:5px; margin-top:10px; font-size:13px;">調理前：</p>
           <img src="${record.beforeImg}" class="img-preview" alt="調理前照片" onclick="openLightbox(this.src)">
         `;
      }
      if (record.afterImg) {
         contentHtml += `
           <p style="margin-bottom:5px; margin-top:10px; font-size:13px;">調理後：</p>
           <img src="${record.afterImg}" class="img-preview" alt="調理後照片" onclick="openLightbox(this.src)">
         `;
      }

      historyContainer.innerHTML += `
        <div class="record-item">
          <strong>🗓️ ${record.date}</strong> | 師傅：${record.therapist}<br>
          <span style="color: var(--text-muted); font-size: 14px;">方案：${record.serviceType}</span>
          ${contentHtml}
        </div>
      `;
    });
  } else { 
    historyContainer.innerHTML = "<p style='color: var(--text-muted);'>尚無調理紀錄。</p>"; 
  }
}

function getIcon(light) {
  if(light === 'green') return '✅'; 
  if(light === 'blue') return '🔵'; 
  if(light === 'red') return '❌'; 
  return '⏳';
}

function goToGeneralCheckIn() {
  window.location.href = `checkin.html?time=未指定預約&service=一般報到`;
}

function goToCheckIn(timeStr, serviceStr) {
  window.location.href = `checkin.html?time=${timeStr}&service=${serviceStr}`;
}

function changeBookingHandler(timeStr, serviceStr, actionType) {
  if (actionType === "modify") {
    let timeOptions = '<option value="">時間</option>';
    for (let h = 9; h <= 16; h++) {
      let hour = h.toString().padStart(2, '0');
      timeOptions += `<option value="${hour}:00">${hour}:00</option>`;
      timeOptions += `<option value="${hour}:30">${hour}:30</option>`;
    }
    timeOptions += `<option value="17:00">17:00</option>`;

    Swal.fire({
      title: '申請改期',
      html: `
        <p style="font-size:14px; color:#8C7B70;">原預約：${timeStr}<br>方案：${serviceStr}</p>
        <p style="font-size:15px; margin-bottom:5px; text-align:left;">請選擇您期望的新日期與時間：</p>
        <div style="display:flex; gap:10px;">
          <input type="date" id="swal-date" class="swal2-input" style="margin:0; width:50%; font-size:15px;">
          <select id="swal-time" class="swal2-select" style="margin:0; width:50%; display:flex; font-size:15px;">
            ${timeOptions}
          </select>
        </div>
      `,
      showCancelButton: true, 
      confirmButtonText: '送出改期要求', 
      cancelButtonText: '返回', 
      confirmButtonColor: '#B9936C',
      didOpen: () => { 
        document.getElementById('swal-date').min = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0]; 
      },
      preConfirm: () => {
        const date = document.getElementById('swal-date').value;
        const time = document.getElementById('swal-time').value;
        
        if (!date || !time) { 
          Swal.showValidationMessage('請完整選擇新的日期與時間喔！'); 
          return false; 
        }
        return `${date} ${time}`;
      }
    }).then((result) => { 
      if (result.isConfirmed) { 
        sendChangeRequest(timeStr, serviceStr, actionType, result.value); 
      } 
    });
  } else {
    Swal.fire({
      title: '確認取消預約？', 
      text: `原預約：${timeStr} (${serviceStr})`, 
      icon: 'warning', 
      input: 'text', 
      inputPlaceholder: '可簡單描述取消原因 (選填)',
      showCancelButton: true, 
      confirmButtonText: '確定取消', 
      cancelButtonText: '返回', 
      confirmButtonColor: '#d33'
    }).then((result) => { 
      if (result.isConfirmed) { 
        sendChangeRequest(timeStr, serviceStr, actionType, result.value || "無提供原因"); 
      } 
    });
  }
}

function sendChangeRequest(timeStr, serviceStr, actionType, userMessage) {
  document.getElementById("loadingMsg").classList.remove("hidden"); 
  document.getElementById("mainSystem").classList.add("hidden");
  
  fetch(GAS_URL, { 
    method: "POST", 
    body: JSON.stringify({ 
      action: "changeBooking", 
      memberId: currentJwId, 
      bookingTime: timeStr, 
      serviceType: serviceStr, 
      changeType: actionType, 
      userMessage: userMessage 
    }) 
  })
  .then(res => res.json())
  .then(data => { 
    getUserDataAndLogin(); 
    Swal.fire('已送出', '系統已同步更新您的需求，請稍待店務人員回覆😌', 'success'); 
  })
  .catch(err => { 
    Swal.fire('錯誤', '網路錯誤，請稍後再試。', 'error'); 
    getUserDataAndLogin(); 
  });
}

function toggleEditForm() {
  const editCard = document.getElementById("profileEditCard");
  const toggleBtn = document.getElementById("toggleEditBtn");
  
  if (editCard.classList.contains("hidden")) { 
    editCard.classList.remove("hidden"); 
    toggleBtn.textContent = "隱藏修改表單"; 
  } else { 
    editCard.classList.add("hidden"); 
    toggleBtn.textContent = "修改個人資料"; 
  }
}

function updateProfile() {
  const name = document.getElementById("editName").value;
  const phone = document.getElementById("editPhone").value;
  const birthday = document.getElementById("editBirthday").value;
  const gender = document.getElementById("editGender").value;
  
  if (!name.trim()) { 
    Swal.fire('提示', '請輸入您的姓名！', 'warning'); 
    return; 
  }
  
  fetch(GAS_URL, { 
    method: "POST", 
    body: JSON.stringify({ 
      action: "updateProfile", 
      memberId: currentJwId, 
      name: name, 
      phone: phone, 
      birthday: birthday, 
      gender: gender 
    }) 
  })
  .then(res => res.json())
  .then(data => { 
    if (data.status === "success") { 
      Swal.fire('成功', '資料更新成功！', 'success'); 
      renderDashboard(data); 
    } else { 
      Swal.fire('錯誤', data.message, 'error'); 
    } 
  });
}

function submitBooking() {
  const date1 = document.getElementById("date1").value;
  const time1 = document.getElementById("time1").value;
  const date2 = document.getElementById("date2").value;
  const time2 = document.getElementById("time2").value;
  const date3 = document.getElementById("date3").value;
  const time3 = document.getElementById("time3").value;
  const serviceType = document.getElementById("serviceType").value;
  const remarks = document.getElementById("bookingRemarks").value; 
  
  if (!date1 || !time1) { 
    Swal.fire('提示', '期望時間 1 為必填！', 'warning'); 
    return; 
  }

  const fullTime1 = `${date1} ${time1}`;
  const fullTime2 = (date2 && time2) ? `${date2} ${time2}` : "";
  const fullTime3 = (date3 && time3) ? `${date3} ${time3}` : "";
  
  Swal.fire({ 
    title: '處理中...', 
    text: '正在送出您的預約', 
    allowOutsideClick: false, 
    didOpen: () => { 
      Swal.showLoading(); 
    } 
  });

  fetch(GAS_URL, { 
    method: "POST", 
    body: JSON.stringify({ 
      action: "submitBooking", 
      memberId: currentJwId, 
      time1: fullTime1, 
      time2: fullTime2, 
      time3: fullTime3, 
      serviceType: serviceType, 
      remarks: remarks 
    }) 
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === "success") {
      Swal.fire('申請已送出', '我們會盡快確認您的預約時間。', 'success');
      
      document.getElementById("date1").value = ""; 
      document.getElementById("time1").value = ""; 
      document.getElementById("date2").value = ""; 
      document.getElementById("time2").value = ""; 
      document.getElementById("date3").value = ""; 
      document.getElementById("time3").value = ""; 
      document.getElementById("bookingRemarks").value = ""; 
      
      document.getElementById("loadingMsg").classList.remove("hidden"); 
      document.getElementById("mainSystem").classList.add("hidden");
      
      getUserDataAndLogin();
    } else { 
      Swal.fire('錯誤', data.message, 'error'); 
    }
  });
}

function switchTab(tabIndex) {
  document.querySelectorAll('.tab-content').forEach(el => {
    el.classList.add('hidden');
  }); 
  
  document.querySelectorAll('.tab-btn').forEach(el => {
    el.classList.remove('active');
  });
  
  document.getElementById('tab' + tabIndex).classList.remove('hidden'); 
  document.getElementById('btnTab' + tabIndex).classList.add('active');
}

function openLightbox(imageSrc) {
  const overlay = document.getElementById("globalLightbox");
  const imgElement = document.getElementById("lightboxImage");
  
  if (overlay && imgElement) {
    imgElement.src = imageSrc;
    overlay.style.display = "flex";
  }
}

function closeLightbox() {
  const overlay = document.getElementById("globalLightbox");
  if (overlay) {
    overlay.style.display = "none";
    document.getElementById("lightboxImage").src = "";
  }
}
