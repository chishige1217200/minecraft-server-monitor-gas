// Google Apps Script用スクリプト

var infoSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("サーバ情報");
var systemSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("システム情報");

function getData() {
  let infoRows = infoSheet.getRange(1, 1, 11, 4).getValues();
  let infoKeys = infoRows.splice(0, 1)[0];

  let result = {}

  result = infoRows.map(function (row) {
    let obj = {}
    row.map(function (item, index) {
      obj[infoKeys[index]] = item;
    });
    return obj;
  });

  let obj = {}
  obj["sys_status"] = systemSheet.getRange(2, 3).getValue();
  obj["time"] = systemSheet.getRange(2, 2).getValue();
  result.unshift(obj);

  Logger.log(result);

  return result;
}

// GETリクエストに対する処理
function doGet(e) {
  let data = getData();
  // Logger.log(data);
  return ContentService.createTextOutput(JSON.stringify(data, null, 2))
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function getDate() {
  var date = new Date();

  let result = Utilities.formatDate(date, 'GMT+9', 'yyyy/MM/dd HH:mm:ss').toString();
  // Logger.log(result);

  return result;
}

// POSTリクエストに対する処理
function doPost(e) {
  // JSONをパース
  if (e == null || e.postData == null || e.postData.contents == null) {
    // Logger.log("リクエストデータがありません．");
    return;
  }

  var requestJSON = e.postData.contents;
  var requestObj = JSON.parse(requestJSON); // 要素0に共通鍵(commonKey)，要素1にstatus情報を渡す

  // Logger.log(requestJSON);
  // Logger.log(requestObj);

  // 共通鍵確認
  let commonKey = systemSheet.getRange(2, 1).getValue();
  if (commonKey !== requestObj.commonKey) {
    // Logger.log("共通鍵が正しくありません．");
    return;
  }

  // 最終更新日時更新
  var date = new Date();
  systemSheet.getRange(2, 2).setValue(Utilities.formatDate(date, 'GMT+9', 'yyyy/MM/dd HH:mm:ss').toString());

  // システム稼働状況をスプレッドシートに記録
  if (requestObj.sys_status != null) {
    systemSheet.getRange(2, 3).setValue(requestObj.sys_status);
  }

  // 結果をスプレッドシートに記録
  if (requestObj.id != null && requestObj.status != null) {
    infoSheet.getRange(1 + parseInt(requestObj.id, 10), 4).setValue(requestObj.status);
  }
}

function doPostTest() {
  var e = new Object();
  var postData = new Object();
  postData.type = "application/json";
  postData.contents = "{\"commonKey\":\"\", \"id\":\"1\", \"status\": \"ONLINE\"}";
  e.postData = postData;

  doPost(e);
}

function refreshSysStatus() {
  // 前回の更新時刻から1時間以上空いている場合は，エラーを記録する機能
  // メンテナンス中は変更しない

  let systemText = systemSheet.getRange(2, 3).getValue();

  if (calcTimeDiff > 60 && systemText === "正常稼働中") {
    systemSheet.getRange(2, 3).setValue("障害発生");
  }
}

function calcTimeDiff() {
  let lastConnectionDateText = systemSheet.getRange(2, 2).getValue();
  let lastConnectionDate = new Date(lastConnectionDateText);
  let nowDate = new Date();

  let diff = nowDate.getTime() - lastConnectionDate.getTime();

  // 前回更新時からの経過分を返す
  diff = diff / (60 * 1000);
  return diff;
}
