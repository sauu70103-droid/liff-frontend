/**
 * ============================================================================
 * 錦葳健康美學中心 - 工作人員驗證與隱藏閘道模組 (V2.5.1 快速點擊切換版)
 * ============================================================================
 */

let clickCount = 0;
let lastClickTime = 0;

function initHiddenGateway() {
  const logo = document.getElementById("mainLogo");
  if (!logo) return;
  
  logo.addEventListener("click", (e) => {
    const currentTime = new Date().getTime();
    
    // 防呆：如果距離上次點擊超過 500 毫秒，則重新計數
    if (currentTime - lastClickTime > 500) {
      clickCount = 0;
    }
    
    clickCount++;
    lastClickTime = currentTime;

    // 當連續合法點擊達到 5 次時，觸發隱藏閘道
    if (clickCount === 5) {
      clickCount = 0; // 觸發後重置計數器
      promptStaffLogin();
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
        // 將權限 Token 存入本地端
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
