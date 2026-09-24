/**
 * ============================================================================
 * 錦葳健康美學中心 - 工作人員驗證與隱藏閘道模組 (V3.5 密碼覆寫防禦版)
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
      
      if (staff.authShop && ssoUrls.middle) {
         btnMid.classList.remove("disabled");
      } else {
         btnMid.classList.add("disabled");
      }
      
      if (staff.authFinance && ssoUrls.store) {
         btnStore.classList.remove("disabled");
      } else {
         btnStore.classList.add("disabled");
      }
      
      portal.classList.remove("hidden");
    } catch(e) {}
  }
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
         Swal.fire('錯誤', data.message, 'error');
      }
   }).catch(err => { Swal.fire('錯誤', '網路連線異常', 'error'); });
}

function getStaffStamp() {
  const token = localStorage.getItem("jwStaffToken");
  if (token) {
    try { const staff = JSON.parse(token); return staff.name ? `[由 ${staff.name} 操作]` : ""; } catch(e) { return ""; }
  }
  return "";
}

window.addEventListener("DOMContentLoaded", initHiddenGateway);
