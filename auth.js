/**
 * ============================================================================
 * 錦葳健康美學中心 - 工作人員驗證與隱藏閘道模組 (V3.8 SuperAdmin 派發引擎版)
 * ============================================================================
 */

let ssoUrls = { middle: "", store: "" };

function initHiddenGateway() {
  const logo = document.getElementById("mainLogo");
  if (!logo) return;
  
  logo.addEventListener("click", (e) => {
    const uid = window.userLineUid || "";
    const isGodMode = (uid === "Udb1efc9c39494178114788d794028649");
    const hasStaffToken = localStorage.getItem("jwStaffToken") !== null;
    
    const savedUrls = localStorage.getItem("jwSsoUrls");
    if (savedUrls && hasStaffToken) {
       ssoUrls = JSON.parse(savedUrls);
       showAdminPortal();
       return;
    }
    
    if (isGodMode || hasStaffToken) {
      promptStaffLogin();
      return;
    }
    
    if (uid) {
      fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify({ action: "checkStaffEligibility", lineUid: uid })
      }).then(res => res.json()).then(data => {
        if (data.isEligible) promptStaffLogin();
      }).catch(err => {});
    }
  });
}

function promptStaffLogin() {
  Swal.fire({
    title: '🔒 工作人員驗證',
    input: 'password',
    inputPlaceholder: '請輸入專屬 PIN 碼',
    inputAttributes: { autocapitalize: 'off' },
    showCancelButton: true,
    confirmButtonText: '登入授權',
    cancelButtonText: '取消',
    confirmButtonColor: '#B9936C',
    showLoaderOnConfirm: true,
    preConfirm: (pin) => {
      if (!pin) { Swal.showValidationMessage('PIN 碼不可為空'); return false; }
      return fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify({ action: "staffLogin", lineUid: window.userLineUid || "", pin: pin })
      }).then(res => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      }).catch(error => { Swal.showValidationMessage(`請求失敗: ${error}`); });
    },
    allowOutsideClick: () => !Swal.isLoading()
  }).then((result) => {
    if (result.isConfirmed) {
      if (result.value.status === "success") {
        localStorage.setItem("jwStaffToken", JSON.stringify(result.value.staff));
        if (result.value.urls) {
           ssoUrls = result.value.urls;
           localStorage.setItem("jwSsoUrls", JSON.stringify(ssoUrls));
        }
        Swal.fire({ icon: 'success', title: '授權成功', text: `歡迎回來，${result.value.staff.name}！權限已開通。`, confirmButtonColor: '#B9936C' }).then(() => {
           showAdminPortal();
        });
      } else {
        Swal.fire('驗證失敗', result.value.message, 'error');
      }
    }
  });
}

function showAdminPortal() {
  const portal = document.getElementById("adminPortal");
  if (!portal) return;
  
  const token = localStorage.getItem("jwStaffToken");
  if (token) {
    try {
      const staff = JSON.parse(token);
      document.getElementById("staffPortalName").textContent = staff.name;
      
      const btnMid = document.getElementById("btnMiddle");
      const btnStore = document.getElementById("btnStore");
      
      if (staff.authMiddle && ssoUrls.middle) btnMid.classList.remove("disabled");
      else btnMid.classList.add("disabled");
      
      if (staff.authStore && ssoUrls.store) btnStore.classList.remove("disabled");
      else btnStore.classList.add("disabled");
      
      portal.classList.remove("hidden");

      // 🛡️ 若為第一管理員，載入並展開人員權限管理模組
      if (staff.isSuperAdmin) {
        document.getElementById("superAdminPanel").classList.remove("hidden");
        loadStaffList();
      }

    } catch(e) {}
  }
}

// 撈取員工清單並渲染三維下拉選單
function loadStaffList() {
  document.getElementById("staffAuthList").innerHTML = "<p style='color:#bbb; text-align:center;'>名單載入中...</p>";
  
  fetch(GAS_URL, {
    method: 'POST',
    body: JSON.stringify({ action: "getStaffList", lineUid: window.userLineUid || "" })
  }).then(res => res.json()).then(data => {
    if (data.status === "success") {
      let html = "";
      data.list.forEach(s => {
        html += `
          <div class="staff-auth-row" data-row="${s.row}" style="background: rgba(255,255,255,0.05); padding: 10px; margin-bottom: 10px; border-radius: 5px;">
            <strong style="color: white; font-size: 15px;">👤 ${s.name}</strong>
            <div style="display: flex; gap: 8px; margin-top: 10px;">
              <label style="font-size: 12px; color: #ccc; flex: 1;">店務:
                <select class="sel-store" style="width: 100%; background:#222; color:#fff; border:1px solid #555; padding: 4px; border-radius: 4px; margin-top: 4px;">
                  <option value="允許" ${s.store === '允許' ? 'selected' : ''}>允許</option>
                  <option value="關閉" ${s.store !== '允許' ? 'selected' : ''}>關閉</option>
                </select>
              </label>
              <label style="font-size: 12px; color: #ccc; flex: 1;">中台:
                <select class="sel-middle" style="width: 100%; background:#222; color:#fff; border:1px solid #555; padding: 4px; border-radius: 4px; margin-top: 4px;">
                  <option value="允許" ${s.middle === '允許' ? 'selected' : ''}>允許</option>
                  <option value="關閉" ${s.middle !== '允許' ? 'selected' : ''}>關閉</option>
                </select>
              </label>
              <label style="font-size: 12px; color: #ccc; flex: 1;">財務:
                <select class="sel-finance" style="width: 100%; background:#222; color:#fff; border:1px solid #555; padding: 4px; border-radius: 4px; margin-top: 4px;">
                  <option value="允許" ${s.finance === '允許' ? 'selected' : ''}>允許</option>
                  <option value="關閉" ${s.finance !== '允許' ? 'selected' : ''}>關閉</option>
                </select>
              </label>
            </div>
          </div>
        `;
      });
      document.getElementById("staffAuthList").innerHTML = html;
    } else {
      document.getElementById("staffAuthList").innerHTML = `<p style='color:#d9534f; text-align:center;'>${data.message}</p>`;
    }
  }).catch(err => {
    document.getElementById("staffAuthList").innerHTML = "<p style='color:#d9534f; text-align:center;'>載入失敗，網路異常。</p>";
  });
}

// 儲存權限變更發送至後端
function saveStaffAuth() {
  const rows = document.querySelectorAll(".staff-auth-row");
  const updates = [];
  rows.forEach(row => {
    updates.push({
      row: parseInt(row.getAttribute("data-row")),
      store: row.querySelector(".sel-store").value,
      middle: row.querySelector(".sel-middle").value,
      finance: row.querySelector(".sel-finance").value
    });
  });

  if (updates.length === 0) return;

  Swal.fire({ title: '儲存中...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
  
  fetch(GAS_URL, {
    method: 'POST',
    body: JSON.stringify({ action: "manageStaffAuth", lineUid: window.userLineUid || "", updates: updates })
  }).then(res => res.json()).then(data => {
    if (data.status === "success") {
      Swal.fire('成功', '所有員工權限變更已生效！', 'success');
    } else {
      Swal.fire('錯誤', data.message, 'error');
    }
  }).catch(err => {
    Swal.fire('錯誤', '網路連線異常，請稍後再試。', 'error');
  });
}

function jumpToSso(target) {
   if (target === 'middle' && ssoUrls.middle && !document.getElementById("btnMiddle").classList.contains("disabled")) {
       window.location.href = ssoUrls.middle + "?sso_auth=true&source=hq";
   } else if (target === 'store' && ssoUrls.store && !document.getElementById("btnStore").classList.contains("disabled")) {
       window.location.href = ssoUrls.store + "?sso_auth=true&source=hq";
   } else {
       Swal.fire('權限不足', '您無權限進入此系統，或系統尚未設定對應網址。', 'warning');
   }
}

function updateMyPin() {
   const newPin = document.getElementById("newStaffPin").value;
   if (!newPin || newPin.length < 4) {
       Swal.fire('提示', '密碼不得為空且需大於 4 碼！', 'warning'); return;
   }
   if (newPin === "888888888") {
       Swal.fire('警告', '為保障安全，禁止將自訂密碼設定為通用密碼。', 'error'); return;
   }
   
   Swal.fire({ title: '變更中...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
   
   fetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify({ action: "updateStaffPin", lineUid: window.userLineUid || "", newPin: newPin })
   }).then(res => res.json()).then(data => {
      if (data.status === "success") {
         Swal.fire('成功', '專屬密碼已更新！通用密碼已對您永久失效。', 'success');
         document.getElementById("newStaffPin").value = "";
      } else {
         let errMsg = data.message || "發生未知錯誤";
         if (data.stack) {
             console.error("Backend Error Stack:", data.stack);
             errMsg += "\n(詳情請見控制台或通報中央)";
         }
         Swal.fire('更新失敗', errMsg, 'error');
      }
   }).catch(err => { 
      Swal.fire('錯誤', '網路連線異常，請稍後再試。', 'error'); 
   });
}

function getStaffStamp() {
  const token = localStorage.getItem("jwStaffToken");
  if (token) {
    try { const staff = JSON.parse(token); return staff.name ? `[由 ${staff.name} 操作]` : ""; } catch(e) { return ""; }
  }
  return "";
}

window.addEventListener("DOMContentLoaded", initHiddenGateway);
