/**
 * ============================================================================
 * 錦葳健康美學中心 - 工作人員驗證與隱藏閘道模組 (V2.7 實名無聲單擊版)
 * ============================================================================
 */

function initHiddenGateway() {
  const logo = document.getElementById("mainLogo");
  if (!logo) return;
  
  logo.addEventListener("click", (e) => {
    const uid = window.userLineUid || "";
    
    // 實名隱形查核 1：若為創辦人 LINE_ID，或本地已留存授權 Token，直接彈出密碼框
    const isGodMode = (uid === "Udb1efc9c39494178114788d794028649");
    const hasStaffToken = localStorage.getItem("jwStaffToken") !== null;
    
    if (isGodMode || hasStaffToken) {
      promptStaffLogin();
      return;
    }
    
    // 實名隱形查核 2：若為其他使用者，向後端發起無聲查核
    if (uid) {
      fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify({ action: "checkStaffEligibility", lineUid: uid })
      })
      .then(res => res.json())
      .then(data => {
        if (data.isEligible) {
          promptStaffLogin();
        }
        // 若 isEligible 為 false，絕對靜默
      })
      .catch(err => {
        // 發生錯誤時絕對靜默，不干擾一般顧客
      });
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
      if (!pin) {
        Swal.showValidationMessage('PIN 碼不可為空');
        return false;
      }
      return fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify({ action: "staffLogin", lineUid: window.userLineUid || "", pin: pin })
      })
      .then(res => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .catch(error => {
        Swal.showValidationMessage(`請求失敗: ${error}`);
      });
    },
    allowOutsideClick: () => !Swal.isLoading()
  }).then((result) => {
    if (result.isConfirmed) {
      if (result.value.status === "success") {
        localStorage.setItem("jwStaffToken", JSON.stringify(result.value.staff));
        Swal.fire({
          icon: 'success',
          title: '授權成功',
          text: `歡迎回來，${result.value.staff.name}！權限已開通。`,
          confirmButtonColor: '#B9936C'
        });
      } else {
        Swal.fire('驗證失敗', result.value.message, 'error');
      }
    }
  });
}

// 供其他模組呼叫：取得當前操作者戳記
function getStaffStamp() {
  const token = localStorage.getItem("jwStaffToken");
  if (token) {
    try {
      const staff = JSON.parse(token);
      return staff.name ? `[由 ${staff.name} 操作]` : "";
    } catch(e) { return ""; }
  }
  return "";
}

// 綁定 DOM 載入事件
window.addEventListener("DOMContentLoaded", initHiddenGateway);
