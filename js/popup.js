// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be

//키를 이용하여 쿠키 비교 함수
function cookieMatch(c1, c2){
  return (c1.name == c2.name) && (c1.domain == c2.domain) &&
      (c1.hostOnly == c2.hostOnly) && (c1.path == c2.path) &&
      (c1.secure == c2.secure) && (c1.httpOnly == c2.httpOnly) &&
      (c1.session == c2.session) && (c1.storeId == c2.storeId);
}

// 배열 정렬 함수
function sortedKey(array){
  var keys = [];

  for(var i in array){
      keys.push(i);
  }

  keys.sort();

  return keys;
}

//document.querySelector 간소화 함수
function select(selector){
  return document.querySelector(selector);
}

// 리스너가 브라우저의 쿠키 정보를 감시하면서,
// 바뀐 정보가 있으면 CookieCache객체에 캐싱한다.
function CookieCache(){
  this.cookies_ = {};

  // cookies_ 딕셔너리에서 상응하는 도메인에 쿠키정보를 PUSH
  this.add = function(cookie){
      var domain = cookie.domain;

      if(!this.cookies_[domain]){
          this.cookies_[domain] = [];
      }

      this.cookies_[domain].push(cookie);
  };

  // cookies_ 딕셔너리에서 상응하는 도메인에 쿠키정보를 삭제
  this.remove = function(cookie){
      var domain = cookie.domain;

      if(this.cookies_[domain]){
          var i = 0;

          while(i < this.cookies_[domain].length){
              if(cookieMatch(this.cookies_[domain][i], cookie)){
                  this.cookies_[domain].splice(i, 1);
              }
              else{
                  i++;
              }
          }

          if(this.cookies_[domain].length == 0){
              delete this.cookies_[domain];
          }
      }
  };

  //|filter| 값에 매칭되는 쿠키 도메인의 리스트를 정렬해서 보여줌
  //|filter| 값이 null일 경우 모든 도메인을 보여줌
  this.getDomains = function(filter){
      var result = [];

      sortedKey(this.cookies_).forEach(function(domain){
          if(!filter || domain.indexOf(filter) != -1){
              result.push(domain);
          }
      });

      return result;
  };

  this.getCookies = function(domain){
      return this.cookies_[domain];
  };
}

// CookieCache 객체 생성
var cache = new CookieCache();

function removeAllForFilter(){
  var txt = select("#filter").value;

  filter = txt.replace("www.", "");

  cache.getDomains(filter).forEach(function(domain){
      removeCookiesForDomain(domain);
  });
}

//변경된 쿠키값을 적용시키는 함수
function setCookies(){
  var txt = select("#filter").value;
  
  filter = txt.replace("www.", "");

  var domains = cache.getDomains(filter);

  domains.forEach(function(domain){
       // url 정보를 저장하고 기존 쿠키는 삭제
       var cookie = cache.getCookies(domain)[0];
       var url = "http" + (cookie.secure ? "s" : "") + "://" + cookie.domain
           + cookie.path;
      
      removeCookiesForDomain(domain);

      cookiesPac = document.getElementById("ta_" + domain).value;

      var cookies = cookiesPac.split("\n");

      cookies.forEach(function(cookie){
          if(cookie != ""){
              var i = cookie.indexOf("=");
              var cookieName = cookie.slice(0, i);
              var cookieValue = cookie.slice(i + 1);

              // 변형된 쿠키값 적용
              chrome.cookies.set({"url" : url,"name" : cookieName, "value" : cookieValue});
          }
      });
  });
  
  reloadCookieTable();
}

function removeCookie(cookie){
  var url = "http" + (cookie.secure ? "s" : "") + "://" + cookie.domain
       + cookie.path;
  
  chrome.cookies.remove({"url" : url, "name" : cookie.name});
}

function removeCookiesForDomain(domain){
  cache.getCookies(domain).forEach(function(cookie){
      removeCookie(cookie)
  });
}

function resetTable(){
  var table = select("#Cookie");

  while(table.rows.length > 1){
      table.deleteRow(table.rows.length -1);
  }
}

var reload_scheduled = false;

function scheduleReloadCookieTable(){
  if(!reload_scheduled){
      reload_scheduled = true;

      setTimeout(reloadCookieTable, 250);
  }
}

function reloadCookieTable(){
  reload_scheduled = false;

  //필터
  var txt = select("#filter").value

  filter = txt.replace("www.", "");

  var domains = cache.getDomains(filter);

  select("#filter_count").innerText = domains.length;
  select("#total_count").innerText = cache.getDomains().length;

  resetTable();

  var table = select("#Cookie");

  if(domains.length != 0){
      domains.forEach(function(domain){
          var cookies = cache.getCookies(domain);
          var row = table.insertRow(-1);

          row.insertCell(-1).innerText = domain;

          var cell = row.insertCell(-1);
          var textarea = document.createElement("textarea");

          textarea.setAttribute("id", "ta_" + domain);

          cookieValue = "";
          
          cookies.forEach(function(cookie){
              cookieValue += cookie.name + "=" + cookie.value + "\n";
          });

          textarea.value =cookieValue;
          cell.appendChild(textarea);

          textarea.style.height = textarea.scrollHeight + "px";
          textarea.setAttribute("spellcheck", "false");
      });
  } 
  else{
      var row = table.insertRow(-1);
      var cell = row.insertCell(-1);

      cell.innerText = "Cookie Not Found!";
      cell.colSpan = 2;
      cell.setAttribute("class", "cookie_not_found");
  }
}

function focusFilter(){
  select("#filter").focus();
}

function resetFilter(){
  var filter = select("#filter");
  filter.focus();

  if(filter.value.length > 0){
      filter.value = "";

      reloadCookieTable();
  }
}

// 참고: https://developer.chrome.com/extensions/cookies#event-onChanged
// chrome.cookies.onChanged.addListener(function callback)
// callback = function(object changeInfo)
//  --> listener(info)
// 쿠키의 변경 정보를 함수로 전달해주는 리스너 --> changeInfo 객체를 통해 정보를 전달
//  cookie:  Information about the cookie that was set or removed.
//  removed: True if a cookie was removed.

// listener함수에서 이 객체를 info매개변수로 명명함.
function listener(info){
  // 변경사항이 있는 쿠키는 객체에서 모두 지우고
  cache.remove(info.cookie);

  // 만약 삭제된게 아니라 변경된거라면 바뀐 정보로 재등록한다.
  if(!info.removed){
      cache.add(info.cookie);
  }

  scheduleReloadCookieTable();
}

function startListening(){
  chrome.cookies.onChanged.addListener(listener);
}

function stopListening(){
  chrome.cookies.onChanged.removeListener(listener);
}

// 필터값에 따라 도메인-쿠키 테이블을 reload한다.
function onload(){
  focusFilter();

  chrome.tabs.query({"active" : true}, function(tabs){
      var url = tabs[0].url;

      url = url.split("/")[2]

      select("#filter").value = url.split(".")[1];

      if(!url.split(".")[1]){
          select("#filter").value = url;
      }
  });

  chrome.cookies.getAll({}, function(cookies){
      startListening();

      for(var i in cookies){
          cache.add(cookies[i]);
      }

      reloadCookieTable();
  });
}

function uploadFile(){
  var file = select("#file");
  
  file.onchang = function(){
    var fileList = file.files;

    for(var i = 0; i < fileList.length; i++){
      var reader = new FileReader();

      reader.readAsText(fileList[i]);
      reader.onload = function(e){
        var text = e.target.result.split("\n");

        text.forEach(function(text){
          if (text.length > 1){
            if(text.indexOf("[") != -1){
              var index = text.indexOf("]");

              filter = text.slice(1, index);

              if(!document.getElementById("ta_" + filter)){}
              else{
                document.getElementById('ta_' + filter).value = "";
              }
            }
            else{
              if(!document.getElementById("ta_" + filter)){}
              else{
                document.getElementById('ta_' + filter).value += text;
              }
            }
          }
        });
      }
    }
  }
}

document.addEventListener("DOMContentLoaded", function(){
  onload();

  select("#check").addEventListener("click", setCookies);
  select("#times").addEventListener("click", removeAllForFilter);
  select("#reset").addEventListener("click", resetFilter);

  document.querySelector("#URL_div input").addEventListener("input", reloadCookieTable);
  document.querySelector("#Summary_div input").addEventListener("input", uploadFile);
})