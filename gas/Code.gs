/**
 * COFFEE CRAFT - ユーザー認証 & 決済 API
 * Google Apps Script (Web App として deploy)
 *
 * Google Sheets 構成:
 *   シート名: users
 *   A列: email
 *   B列: password_hash
 *   C列: login_count
 *   D列: created_at
 *   E列: last_login
 */

// ========== Stripe 設定 ==========
// GAS のスクリプトプロパティから取得（GitHub にキーを載せないため）
// GAS エディタ → プロジェクトの設定 → スクリプトプロパティ → STRIPE_SECRET_KEY を追加
var STRIPE_SECRET_KEY = PropertiesService.getScriptProperties().getProperty('STRIPE_SECRET_KEY');

// プラン定義（価格は円）
var PLANS = {
  light: { name: 'ライトプラン', price: 1280, description: '月1回 / 150g' },
  standard: { name: 'スタンダードプラン', price: 2480, description: '月2回 / 200g×2' },
  premium: { name: 'プレミアムプラン', price: 4280, description: '月2回 / 400g×2' }
};

// ========== メインルーター ==========

function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var result;

  if (data.action === 'register') {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('users');
    result = handleRegister(sheet, data.email, data.passwordHash);
  } else if (data.action === 'login') {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('users');
    result = handleLogin(sheet, data.email, data.passwordHash);
  } else if (data.action === 'checkout') {
    result = handleCheckout(data.planId, data.email, data.successUrl, data.cancelUrl);
  } else {
    result = { success: false, error: '不正なリクエストです' };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ========== 認証 ==========

function handleRegister(sheet, email, passwordHash) {
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === email) {
      return { success: false, error: '既に登録されているメールアドレスです' };
    }
  }

  sheet.appendRow([
    email,
    passwordHash,
    0,
    new Date().toISOString(),
    ''
  ]);

  return { success: true };
}

function handleLogin(sheet, email, passwordHash) {
  var rows = sheet.getDataRange().getValues();

  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === email) {
      if (rows[i][1] !== passwordHash) {
        return { success: false, error: 'メールアドレスまたはパスワードが正しくありません' };
      }

      var newCount = (rows[i][2] || 0) + 1;
      var rowIndex = i + 1;
      sheet.getRange(rowIndex, 3).setValue(newCount);
      sheet.getRange(rowIndex, 5).setValue(new Date().toISOString());

      return {
        success: true,
        email: email,
        loginCount: newCount
      };
    }
  }

  return { success: false, error: 'メールアドレスまたはパスワードが正しくありません' };
}

// ========== Stripe Checkout ==========

function handleCheckout(planId, email, successUrl, cancelUrl) {
  var plan = PLANS[planId];
  if (!plan) {
    return { success: false, error: '無効なプランです' };
  }

  var payload = {
    'mode': 'subscription',
    'line_items[0][price_data][currency]': 'jpy',
    'line_items[0][price_data][product_data][name]': plan.name,
    'line_items[0][price_data][product_data][description]': plan.description,
    'line_items[0][price_data][unit_amount]': plan.price,
    'line_items[0][price_data][recurring][interval]': 'month',
    'line_items[0][quantity]': '1',
    'customer_email': email,
    'billing_address_collection': 'required',
    'phone_number_collection[enabled]': 'true',
    'success_url': successUrl,
    'cancel_url': cancelUrl
  };

  var options = {
    method: 'post',
    headers: {
      'Authorization': 'Bearer ' + STRIPE_SECRET_KEY
    },
    payload: payload,
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch('https://api.stripe.com/v1/checkout/sessions', options);
  var session = JSON.parse(response.getContentText());

  if (session.error) {
    return { success: false, error: session.error.message };
  }

  return { success: true, url: session.url };
}

// ========== 初期セットアップ ==========

function setupSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('users');
  if (!sheet) {
    sheet = ss.insertSheet('users');
  }
  sheet.getRange(1, 1, 1, 5).setValues([
    ['email', 'password_hash', 'login_count', 'created_at', 'last_login']
  ]);
}
