// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
if (!chrome.cookies) {
    chrome.cookies = chrome.experimental.cookies;
  }
  // A simple Timer class.
  function Timer() {
    this.start_ = new Date();
    this.elapsed = function() {
      return (new Date()) - this.start_;
    }
    this.reset = function() {
      this.start_ = new Date();
    }
  }
  // Compares cookies for "key" (name, domain, etc.) equality, but not "value"
  // equality.
  function cookieMatch(c1, c2) {
    return (c1.name == c2.name) && (c1.domain == c2.domain) &&
           (c1.hostOnly == c2.hostOnly) && (c1.path == c2.path) &&
           (c1.secure == c2.secure) && (c1.httpOnly == c2.httpOnly) &&
           (c1.session == c2.session) && (c1.storeId == c2.storeId);
  }
  // Returns an array of sorted keys from an associative array.
  function sortedKeys(array) {
    var keys = [];
    for (var i in array) {
      keys.push(i);
    }
    keys.sort();
    return keys;
  }
  // Shorthand for document.querySelector.
  function select(selector) {
    return document.querySelector(selector);
  }
  // An object used for caching data about the browser's cookies, which we update
  // as notifications come in.
  function CookieCache() {
    this.cookies_ = {};
    this.reset = function() {
      this.cookies_ = {};
    }
    this.add = function(cookie) {
      var domain = cookie.domain;
      if (!this.cookies_[domain]) {
        this.cookies_[domain] = [];
      }
      this.cookies_[domain].push(cookie);
    };
    this.remove = function(cookie) {
      var domain = cookie.domain;
      if (this.cookies_[domain]) {
        var i = 0;
        while (i < this.cookies_[domain].length) {
          if (cookieMatch(this.cookies_[domain][i], cookie)) {
            this.cookies_[domain].splice(i, 1);
          } else {
            i++;
          }
        }
        if (this.cookies_[domain].length == 0) {
          delete this.cookies_[domain];
        }
      }
    };
    // Returns a sorted list of cookie domains that match |filter|. If |filter| is
    //  null, returns all domains.
    this.getDomains = function(filter) {
      var result = [];
      sortedKeys(this.cookies_).forEach(function(domain) {
        if (!filter || domain.indexOf(filter) != -1) {
          result.push(domain);
        }
      });
      return result;
    }
    this.getCookies = function(domain) {
      return this.cookies_[domain];
    };
  }
  var cache = new CookieCache();
  function removeAllForFilter() {
    var txt = select("#filter").value;
    filter = txt.replace('www.', '');
    var timer = new Timer();
    cache.getDomains(filter).forEach(function(domain) {
      removeCookiesForDomain(domain);
    });
  }

  // 변경된 쿠기값을 적용시킬 함수
  function setCookies(){
    var txt = select("#filter").value;
    filter = txt.replace('www.', '');
    var domains = cache.getDomains(filter);
    domains.forEach(function(domain){
      cookiesPac = document.getElementById('ta_' + domain).value;
      var cookies = cookiesPac.split('\n');
      // \n으로 나눈 쿠키값
      cookies.forEach(function(cookie){
        if (cookie != ''){
          var i = cookie.indexOf('=');
          var cookieName = cookie.slice(0, i);
          var cookieValue = cookie.slice(i + 1);
          alert(cookieName + '\n' + cookieValue);
        }
      });
    });
  }
  
  function removeCookie(cookie) {
    var url = "http" + (cookie.secure ? "s" : "") + "://" + cookie.domain +
              cookie.path;
    chrome.cookies.remove({"url": url, "name": cookie.name});
  }
  function removeCookiesForDomain(domain) {
    var timer = new Timer();
    cache.getCookies(domain).forEach(function(cookie) {
      removeCookie(cookie);
    });
  }
  function resetTable() {
    var table = select("#cookies");
    while (table.rows.length > 1) {
      table.deleteRow(table.rows.length - 1);
    }
  }
  var reload_scheduled = false;
  function scheduleReloadCookieTable() {
    if (!reload_scheduled) {
      reload_scheduled = true;
      setTimeout(reloadCookieTable, 250);
    }
  }
  function reloadCookieTable() {
    reload_scheduled = false;
    // 필터
    var txt = select("#filter").value;
    filter = txt.replace('www.', '');
    var domains = cache.getDomains(filter);
    select("#filter_count").innerText = domains.length;
    select("#total_count").innerText = cache.getDomains().length;
    select("#delete_all_button").innerHTML = "";
    select("#set_cookies_button").innerHTML = "";
    if (domains.length) {
      var button = document.createElement("button");
      button.onclick = removeAllForFilter;
      button.innerText = "delete all " + domains.length;
      select("#delete_all_button").appendChild(button);
      // setCookies Button
      var button = document.createElement("button");
      button.onclick = setCookies;
      button.style.marginLeft = '5px';
      button.innerText = "set cookies";
      select("#set_cookies_button").appendChild(button);
    }
    resetTable();
    var table = select("#cookies");
    if (domains.length != 0){
        domains.forEach(function(domain) {
            var cookies = cache.getCookies(domain);
            var row = table.insertRow(-1);
            row.insertCell(-1).innerText = domain;
            var cell = row.insertCell(-1);
            var textarea = document.createElement("textarea");
            // textarea.name 설정
            textarea.setAttribute('id', 'ta_' + domain);
            // 쿠키값 보이기
            cookieValue = '';
            cookies.forEach(function(cookie){
                cookieValue += cookie.name + '=' + cookie.value + '\n';
            })
            textarea.value = cookieValue;
            cell.appendChild(textarea);
            textarea.style.height = textarea.scrollHeight + "px";
            textarea.setAttribute('spellcheck', 'false');
          });
    } else{
        var row = table.insertRow(-1);
        var cell = row.insertCell(-1);
        cell.innerText = "Cookie Not Found!";
        cell.colSpan = 2;
        cell.setAttribute("class", "cookie_not_found");
    }
  }
  function focusFilter() {
    select("#filter").focus();
  }
  function resetFilter() {
    var filter = select("#filter");
    filter.focus();
    if (filter.value.length > 0) {
      filter.value = "";
      reloadCookieTable();
    }
  }
  var ESCAPE_KEY = 27;
  window.onkeydown = function(event) {
    if (event.keyCode == ESCAPE_KEY) {
      resetFilter();
    }
  }
  function listener(info) {
    cache.remove(info.cookie);
    if (!info.removed) {
      cache.add(info.cookie);
    }
    scheduleReloadCookieTable();
  }
  function startListening() {
    chrome.cookies.onChanged.addListener(listener);
  }
  function stopListening() {
    chrome.cookies.onChanged.removeListener(listener);
  }
  function onload() {
    focusFilter();
    var timer = new Timer();
    chrome.tabs.query({'active': true}, function (tabs) {
        var url = tabs[0].url;
        url = url.split('/')[2]
        document.querySelector('#filter_div input').value = url
    });
    chrome.cookies.getAll({}, function(cookies) {
      startListening();
      start = new Date();
      for (var i in cookies) {
        cache.add(cookies[i]);
      }
      timer.reset();
      reloadCookieTable();
    });
  }
  document.addEventListener('DOMContentLoaded', function() {
    onload();
    document.querySelector('#filter_div input').addEventListener(
        'input', reloadCookieTable);
    document.querySelector('#filter_div button').addEventListener(
        'click', resetFilter);
  });