/**
 * ============================================================================
 * 錦葳健康美學中心 - 總署入口與驗證模組 (V4.0 極簡解耦版)
 * ============================================================================
 */

function initHiddenGateway() {
  const logo = document.getElementById("mainLogo");
  if (!logo) return;
  
  logo.addEventListener("click", () => {
    try {
      const uid = window.userLineUid || "";
      const isGodMode = (uid === "Udb1efc9c39494178114788d794028649");
      const hasStaffToken = localStorage.getItem("jwStaffToken") !== null;
      
      if (hasStaffToken) {
        showAdminPortal();
        return;
      }
      
      if (isGodMode) {
        promptStaffLogin();
        return;
      }
      
      if (uid) {
        fetch(GAS_URL, {
          method: 'POST',
          body: JSON.stringify({ action: "checkStaffEligibility", lineUid: uid })
        }).then(res => res.json()).then(data => {
          if (data && data.isEligible === true) promptStaffLogin();
        }).catch(() => {});
      }
    } catch (e) {
      console.error("Hidden gateway error:", e);
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
    if (result.isConfirmed && result.value) {
      if (result.value.status === "success") {
        const rawStaff = result.value.staff || {};
        const normalizedStaff = {
          name: rawStaff.name || "工作人員",
          isSuperAdmin: Boolean(rawStaff.isSuperAdmin)
        };
        localStorage.setItem("jwStaffToken", JSON.stringify(normalizedStaff));
        Swal.fire({ 
          icon: 'success', 
          title: '授權成功', 
          text: `歡迎回來，${normalizedStaff.name}！`, 
          confirmButtonColor: '#B9936C' 
        }).then(() => {
          showAdminPortal();
        });
      } else {
        Swal.fire('驗證失敗', result.value.message || 'PIN 碼錯誤', 'error');
      }
    }
  });
}

function showAdminPortal() {
  try {
    const portal = document.getElementById("adminPortal");
    if (!portal) return;
    
    const token = localStorage.getItem("jwStaffToken");
    if (!token) return;

    const staff = JSON.parse(token);
    document.getElementById("staffPortalName").textContent = staff.name || "工作人員";
    
    portal.classList.remove("hidden");

    if (staff.isSuperAdmin === true || window.userLineUid === "Udb1efc9c39494178114788d794028649") {
      const adminPanel = document.getElementById("superAdminPanel");
      if (adminPanel) {
        adminPanel.classList.remove("hidden");
        loadStaffList();
      }
    }
  } catch (e) {
    console.error("Render Admin Portal Error:", e);
  }
}

function loadStaffList() {
  const listContainer = document.getElementById("staffAuthList");
  if (!listContainer) return;
  listContainer.innerHTML = "<p style='color:#bbb; text-align:center;'>名單載入中...</p>";
  
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
              <label style="font-size: 12px; color: #ccc; flex: 1;">中台(D欄):
                <select class="sel-middle" style="width: 100%; background:#222; color:#fff; border:1px solid #555; padding: 4px; border-radius: 4px; margin-top: 4px;">
                  <option value="允許" ${s.middle === '允許' ? 'selected' : ''}>允許</option>
                  <option value="關閉" ${s.middle !== '允許' ? 'selected' : ''}>關閉</option>
                </select>
              </label>
              <label style="font-size: 12px; color: #ccc; flex: 1;">店務(E欄):
                <select class="sel-store" style="width: 100%; background:#222; color:#fff; border:1px solid #555; padding: 4px; border-radius: 4px; margin-top: 4px;">
                  <option value="允許" ${s.store === '允許' ? 'selected' : ''}>允許</option>
                  <option value="關閉" ${s.store !== '允許' ? 'selected' : ''}>關閉</option>
                </select>
              </label>
              <label style="font-size: 12px; color: #ccc; flex: 1;">財務(F欄):
                <select class="sel-finance" style="width: 100%; background:#222; color:#fff; border:1px solid #555; padding: 4px; border-radius: 4px; margin-top: 4px;">
                  <option value="允許" ${s.finance === '允許' ? 'selected' : ''}>允許</option>
                  <option value="關閉" ${s.finance !== '允許' ? 'selected' : ''}>關閉</option>
                </select>
              </label>
            </div>
          </div>
        `;
      });
      listContainer.innerHTML = html;
    } else {
      listContainer.innerHTML = `<p style='color:#d9534f; text-align:center;'>${data.message}</p>`;
    }
  }).catch(() => {
    listContainer.innerHTML = "<p style='color:#d9534f; text-align:center;'>載入失敗，網路異常。</p>";
  });
}

function saveStaffAuth() {
  const rows = document.querySelectorAll(".staff-auth-row");
  const updates = [];
  rows.forEach(row => {
    updates.push({
      row: parseInt(row.getAttribute("data-row")),
      middle: row.querySelector(".sel-middle").value,
      store: row.querySelector(".sel-store").value,
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
  }).catch(() => {
    Swal.fire('錯誤', '網路連線異常，請稍後再試。', 'error');
  });
}

function updateMyPin() {
  const newPin = document.getElementById("newStaffPin").value.trim();
  if (!newPin || newPin.length < 4) {
    Swal.fire('提示', '密碼不得為空且需至少 4 碼！', 'warning'); 
    return;
  }
  if (newPin === "888888888") {
    Swal.fire('警告', '為保障安全，禁止將自訂密碼設定為通用密碼。', 'error'); 
    return;
  }
   
  Swal.fire({ title: '變更中...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
   
  fetch(GAS_URL, {
    method: 'POST',
    body: JSON.stringify({ action: "updateStaffPin", lineUid: window.userLineUid || "", newPin: newPin })
  }).then(res => res.json()).then(data => {
    if (data.status === "success") {
      Swal.fire('成功', '專屬密碼已更新寫入第 3 欄！通用密碼已對您永久失效。', 'success');
      document.getElementById("newStaffPin").value = "";
    } else {
      let errMsg = data.message || "發生未知錯誤";
      if (data.stack) console.error("Backend Error Stack:", data.stack);
      Swal.fire('更新失敗', errMsg, 'error');
    }
  }).catch(() => { 
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
