/* ===================================
   COFFEE CRAFT - Authentication
   =================================== */

(function () {
  'use strict';

  // ========== 設定 ==========
  var GAS_URL = 'https://script.google.com/macros/s/AKfycbyt24ulpS_QLwKzR39mgDjHL-63nyZmj7-gSF1M1ITSWPytxJ2qQcbG-kD9iPgbULw/exec';
  var AUTH_KEY = 'coffeecraft_auth';

  // ========== ユーティリティ ==========

  /** SHA-256 ハッシュ（Web Crypto API） */
  async function hashPassword(password) {
    var encoder = new TextEncoder();
    var data = encoder.encode(password);
    var hashBuffer = await crypto.subtle.digest('SHA-256', data);
    var hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  /** GAS API リクエスト */
  async function authRequest(action, email, password) {
    var passwordHash = await hashPassword(password);
    var response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: action, email: email, passwordHash: passwordHash })
    });
    return response.json();
  }

  /** リダイレクト先を取得（URLパラメータ ?redirect=xxx） */
  function getRedirectUrl() {
    var params = new URLSearchParams(window.location.search);
    return params.get('redirect') || 'index.html';
  }

  // ========== セッション管理 ==========

  function saveSession(email, loginCount) {
    var name = email.split('@')[0];
    localStorage.setItem(AUTH_KEY, JSON.stringify({
      email: email,
      name: name,
      loginCount: loginCount,
      isLoggedIn: true
    }));
  }

  function getSession() {
    var data = localStorage.getItem(AUTH_KEY);
    return data ? JSON.parse(data) : null;
  }

  function clearSession() {
    localStorage.removeItem(AUTH_KEY);
  }

  // ========== ヘッダー更新（全ページ共通） ==========

  function updateHeader() {
    var session = getSession();
    var authBtn = document.getElementById('authButton');
    if (!authBtn) return;

    if (session && session.isLoggedIn) {
      var greeting = session.loginCount === 1
        ? 'ようこそ。' + session.name + 'さん'
        : 'おかえりなさい。' + session.name + 'さん';

      authBtn.textContent = greeting;
      authBtn.href = '#';
      authBtn.classList.add('header__nav-auth--loggedin');

      authBtn.addEventListener('click', function (e) {
        e.preventDefault();
        if (confirm('ログアウトしますか？')) {
          clearSession();
          location.reload();
        }
      });
    }
  }

  // ========== 未ログイン時リダイレクト制御 ==========

  function guardLinks() {
    var session = getSession();
    if (session && session.isLoggedIn) return; // ログイン済みなら何もしない

    // 未ログイン時: 対象リンクをクリックしたらログインページへ
    var guardedLinks = document.querySelectorAll('a[href="diagnosis.html"], a[href="#cta"], .header__nav-cta');

    guardedLinks.forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        // 元の遷移先を保存してログインへ
        var dest = link.getAttribute('href');
        if (dest === '#cta' || dest === '#pricing') {
          dest = 'diagnosis.html';
        }
        window.location.href = 'login.html?redirect=' + encodeURIComponent(dest);
      });
    });
  }

  // ========== ログインページ処理 ==========

  function initLoginPage() {
    var loginForm = document.getElementById('loginForm');
    var registerForm = document.getElementById('registerForm');
    if (!loginForm) return;

    var redirectUrl = getRedirectUrl();

    // 既にログイン済みならリダイレクト先へ
    var session = getSession();
    if (session && session.isLoggedIn) {
      window.location.href = redirectUrl;
      return;
    }

    // フォーム切替
    var showRegisterLink = document.getElementById('showRegister');
    var showLoginLink = document.getElementById('showLogin');

    if (showRegisterLink) {
      showRegisterLink.addEventListener('click', function (e) {
        e.preventDefault();
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
      });
    }

    if (showLoginLink) {
      showLoginLink.addEventListener('click', function (e) {
        e.preventDefault();
        registerForm.style.display = 'none';
        loginForm.style.display = 'block';
      });
    }

    // ログイン送信
    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var email = document.getElementById('loginEmail').value.trim();
      var password = document.getElementById('loginPassword').value;
      var errorEl = document.getElementById('loginError');
      var submitBtn = loginForm.querySelector('button[type="submit"]');
      errorEl.textContent = '';

      if (password.length < 8) {
        errorEl.textContent = 'パスワードは8文字以上で入力してください';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'ログイン中...';

      try {
        var result = await authRequest('login', email, password);
        if (result.success) {
          saveSession(result.email, result.loginCount);
          window.location.href = redirectUrl;
        } else {
          errorEl.textContent = result.error;
          submitBtn.disabled = false;
          submitBtn.textContent = 'ログイン';
        }
      } catch (err) {
        errorEl.textContent = '通信エラーが発生しました。もう一度お試しください。';
        submitBtn.disabled = false;
        submitBtn.textContent = 'ログイン';
      }
    });

    // 登録送信
    registerForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var email = document.getElementById('regEmail').value.trim();
      var password = document.getElementById('regPassword').value;
      var errorEl = document.getElementById('registerError');
      var submitBtn = registerForm.querySelector('button[type="submit"]');
      errorEl.textContent = '';

      if (password.length < 8) {
        errorEl.textContent = 'パスワードは8文字以上で入力してください';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = '登録中...';

      try {
        var result = await authRequest('register', email, password);
        if (result.success) {
          // 登録成功 → 自動ログイン
          var loginResult = await authRequest('login', email, password);
          if (loginResult.success) {
            saveSession(loginResult.email, loginResult.loginCount);
            window.location.href = redirectUrl;
          }
        } else {
          errorEl.textContent = result.error;
          submitBtn.disabled = false;
          submitBtn.textContent = '登録する';
        }
      } catch (err) {
        errorEl.textContent = '通信エラーが発生しました。もう一度お試しください。';
        submitBtn.disabled = false;
        submitBtn.textContent = '登録する';
      }
    });
  }

  // ========== Stripe Checkout ==========

  function initCheckout() {
    var checkoutBtn = document.querySelector('.dx-checkout-btn');
    if (!checkoutBtn) return;

    checkoutBtn.addEventListener('click', async function () {
      var session = getSession();
      if (!session || !session.isLoggedIn) {
        window.location.href = 'login.html?redirect=diagnosis.html';
        return;
      }

      var errorEl = document.getElementById('checkoutError');
      errorEl.textContent = '';
      checkoutBtn.disabled = true;
      checkoutBtn.textContent = '処理中...';

      var baseUrl = window.location.origin + window.location.pathname.replace(/[^/]*$/, '');

      try {
        var response = await fetch(GAS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            action: 'checkout',
            planId: 'standard',
            email: session.email,
            successUrl: baseUrl + 'success.html',
            cancelUrl: baseUrl + 'diagnosis.html'
          })
        });
        var result = await response.json();

        if (result.success && result.url) {
          window.location.href = result.url;
        } else {
          errorEl.textContent = result.error || '決済の開始に失敗しました';
          checkoutBtn.disabled = false;
          checkoutBtn.textContent = 'このセットで申し込む';
        }
      } catch (err) {
        errorEl.textContent = '通信エラーが発生しました。もう一度お試しください。';
        checkoutBtn.disabled = false;
        checkoutBtn.textContent = 'このセットで申し込む';
      }
    });
  }

  // ========== 初期化 ==========

  document.addEventListener('DOMContentLoaded', function () {
    updateHeader();
    guardLinks();
    initLoginPage();
    initCheckout();
  });

})();
