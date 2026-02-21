# 8comic 章節/內容抓取規則模板

請依下列區塊填寫；每個步驟都盡量附上實際 URL、必要參數、Referer 與 Header 規則。

## 0) 名詞與輸入

- 網址: https://www.8comic.com/html/20133.html
- 漫畫 ID 範例：20133
- 章節 ID/章節序號定義：?ch=2
- 內容頁 page 定義：https://articles.onemoreplace.tw/online/new-20133.html?ch=2

---

## 1) 漫畫 ID -> 章節列表

### 1.1 Request

- Method: Get
- URL 模板: https://www.8comic.com/html/{{漫畫 ID}}.html

### 1.2 Response

- 格式: HTML
- 章節欄位位置: To be determine

### 1.3 解析規則

- 章節 ID 如何取得:
- 章節標題如何取得:
- 章節排序規則:

---

## 2) 章節 -> 內容資訊（頁數、圖片 key、或中繼資料）

### 2.1 Request

- Method: GET
- URL 模板: https://articles.onemoreplace.tw/online/new-{{漫畫 ID}}.html?ch={{章節}}
- Query/Path 參數:
- 必要 Headers:
  - Referer: https://www.8comic.com/

### 2.2 Response

- 格式: HTML

### 2.3 解析規則

- 會有一段 scripts 的功能將章節內的圖片動態新增在網頁上.
- 從中的邏輯分析出圖片網址
- 關鍵字:
  - $("#comics-pics").html(xx) 裡的 xx 是 img elements
  - ch=1 時，前三章圖片網址分別是 //img9.8comic.com/3/20133/1/001_48m.jpg, //img9.8comic.com/3/20133/1/002_4Sn.jpg, //img9.8comic.com/3/20133/1/003_gA8.jpg

---

## 3). dynamic get variable for pharsing

每一個 ch 網頁內的 script 變數或是 function 名稱都會不一樣，所以使用 regex 寫法就不能寫死
例如: https://articles.onemoreplace.tw/online/new-20133.html?ch=1
拿到的script 是

```javascript
function request(qs) {
  var r = '';
  var u = new String(document.location);
  var s = -1;
  var l = qs.length;
  do {
    s = u.indexOf(qs + '\=');
    if (s != -1) {
      if (u.charAt(s - 1) == '?' || u.charAt(s - 1) == '&') {
        u = u.substr(s);
        break;
      }
      u = u.substr(s + l + 1);
    }
  } while (s != -1);
  if (s != -1) {
    var p = u.indexOf('&');
    if (p == -1) {
      r = u.substr(l + 1);
    } else {
      r = u.substring(l + 1, p);
    }
  }
  return r;
}
var ch = request('ch').split('#')[0];
var pg = ch.indexOf('-') > 0 ? ch.split('-')[1] : 1;
ch = ch.split('-')[0];
var part = ch.match(/[a-z]$/) ? ch.match(/[a-z]$/)[0] : '';
if (part != '' && ch.length > 1) ch = ch.slice(0, -1);
if (ch == '') ch = 1;
var pi = ch;
var ni = ch;
var ci = 0;
var ps = 0;
function ge(e) {
  return document.getElementById(e);
}
var chs = 57;
var ti = 20133;
var rp = '/ReadComic/';
var mk = 0;
var fz = 'G8l85YY2E861x4z6O7Hv_9u6404_13Q25_F366KzY59aUD3u4X6m_u8165N61NC5Ge_215B___wIa0A21Rc36Fp6076L1_W55e_Q';
var un6x9g68g = '%';
var u7y417338 = un6x9g68g + '2f';
var wl39_0trq1 = 48;
var n404d_0 = 46;
var d0v0rh_x = 49;
function qtrq1_p(upmdc0fdx, ffdxz1c33, lc33n0) {
  if (lc33n0 == null) lc33n0 = 40;
  var wl9pel91gm = (upmdc0fdx + '').substring(ffdxz1c33, ffdxz1c33 + lc33n0);
  return wl9pel91gm;
}
function v32aawq5e(upmdc0fdx) {
  return a91gm63(l095_6.substring(l095_6.length - 47 - upmdc0fdx * 6, l095_6.length - 47 - upmdc0fdx * 6 + 6));
}
var y338q6v97t = un6x9g68g + '38';
var iq5efcn6x = un6x9g68g + '5f';
var l095_6 =
  '48m4SngA8EbhSC4C3EpEmK8FArHp3PrrA66Ne6M5abbPas0NxjcWacE5Nyh8ESK2NrMhV8XTv8yjBv38np62w5RacbPak0PwmkTt6X8K2uC2KG7QjM6M92RsH744py9ysMpmJQadbPan0JtrpMgfQVXuj57K3cWrEj9K52r6eeC25XgwJq8K8aebPao03yyvAx7P7H97XCGJrVa8yGPSCe3gxAfn4mmYewYHafbPak0Vyg5UttPYT8wUHD9mGkGnJPF7eC8jFa7FcgWquUMagbPak0Ses3EnpHC7xj8MKJ57256GSKYxJykRkeNypTutR9ahbPal04phrNw6U6B2tRXQ47HsKr7Y8S8VmhYq3CcaEspCYaibPaj086h95hd7NRcnVUFTuVeUdPTJPt4j6Jbh6maU9pGSajbval0Dq5j8qmPUT8qQ4GEtMm2mS537d59aTgxFavRswG4akbval09835AjuDQ6dt66BFeAfY9CH8XePngB2bMppQtkWGalbval0JyghFt6Y85n34XYS9E35g8HEEm5gdH9gAxy3ynB4ambuar0Br6h97488Kah6E3AsNdY2RP3C2DpbFbgXccUd9QJanbuap0Rg4sFg4NWPye445Mk2xCj8P6S2C95HfpK43JcxAKaobuap03mcu33aTSQ8eHS8Uy4vXqC4TFrJdfVefDdrEfh9Eapbuam0Px9j86sGQMdyXANG6UhF5G6C4kY7pJrgKrr8xfBXaqbuan0T35fEhhQ39ha75NW2NbNqUT9TmCwcAecVanAwuBEarbuam07fy9HshKTDmsENXKhA2Xr3MDNbKvdFwx7c59g3BAasbuar0YdpnWtuG4NtbT6J5qBpJmRSDA9FcdUdrGah23tJRatbuao05q8mNusEFVfaM2K3vYjUyG98Xs8hqR6sTjyHm2AXaubuaq0H968C8aT5Bw95J9937gG3MPQPhJjsCj94r5G2sR9avbPap04hwnQmjUCKpdXPSRpVbUtMW6P3QckWqfH5kYh7DSawbPap03f75Ue74WP2s2YVPpJ34x4DAB4Q38Gr5D7s7f8GNaxbPap0Ckg8EyeASR9tGQYW3KyP58SYYtX7jVqu7gg4jrFFaybPap0G59hRpcYGBjh88KGrXb492QV574m3C8j27eM4j2SazbPao0Nn2s4daQ8Vt9YR74fBpGeTNSAj73jUq9Uuc7mbJ6aAbPaq0Adrs2rb6NX76H4M8kXsFtC885k7txPnuYmtXwsDVaBbPas0Ewh4Ce9UCHfv9M8TaB6Uy6559xB9f66jTbsHekW8aCbPap05yysVqm7KJquG9QP5Ef8dGEJQ5FnhAkp92nHte3MaDbPao0Dvv37bcT6B8fYMF4nGs5mP2QDtEj6Ax8Re2Yy2GWaEbPat02swcVjaXVFg6TUMKeBeEpR572x57f8v9B7rSahYFaFbvat0Jmu9AqhUW4bhB8UGu7gEyQ2JAmPk4R6wP2dHhnGKaGbtas0974n3p84DJg6DXH62As99GHND935r89nBj86uwX7aHbjat0NygyExbE278u99EGmXt5wNFQ9w4g4Q773t3RbpPVaIbjaq0Khfw4h6UBQqcDMK6rN4HpTVVQtMddT3bKgf2w2YKaJbjas0K2qeT695F7f8S6WEeR9VrHQVB7Ydu32mAwm6t343aKbjaq0V97h9xx296m3JQCCcP9E6BKW5xP2jUua8u6Jk3KVaLbjas06aksXaa544akF7ASsWsS7B43KxB37KuhCrf4qf2SaMbjav0QegpC4aRPPs3FTFKcCjSs954727gwPxnG26QubYTaNbkat0QgdnRe9CHNd7F7G76PvAy5KTD7U97Dmd4e72e82MaObkaq09b6g3xgD94yjM2KPrQcGjWG63hX7nF7tX9gKphMBaPbkat0Tn446pcGNFftETUVnB4G9Y6K8eMntKqdB9u63757aQbkaw04ddjPdhN3Nh488J32QnV8W97JvSwtG4dJ3c4xn47aRbkaq04wg6H2b6NPdnPJXW675PpFX75k28yR9j2vbMdaHCaSbkap0DpkcUfpNHP6tJ9C2p2rV6NMPSxGxvUcuExsTygSFaTbkat0KbcjQ8cQX6ukCPE9vP2PqSKHDjDgm4y7CjjP58H8aUbkap0RfxxTreQQPngH8BQqT3P7NSAGkQgnAmeSy9J6mDUaVbkat04q8xVddAANajYUWJm7xPr58UNjQq9FqtP8sSt6J4aWbkax0Q5qtN4rFNQ6aSMTRpHxAuY23HbNwp8y2CevEyh97aXbkav05muyH2pJRQfxFX77mAm4pQQ9Fp7mmGes3u2Yr5RSaYbtas07rcgTce68E2y38HT8ExBxU5SXs6gq5sv7dsRw2QMaZbkap0Esa8Qh3G8Xym5R9T42aStT4VVfTdrQptTan6akWMbabkap0Jueg4ubCYQ8sEYS7bK3Xt7JXBvXtrSccJ878kuT5bbbkar0F7ef6t6PH6dsMX4UhUc6r3HKYaNj6WtyPxjBgkA6bcbkar0Ufg738aKMWqs6VCMkNaXuSJ4F6X9nApnRf2TvtSGbdbkap0RanrQef89Acu59ARe2dYfKCBP6Ug3Gd3M75K7j6Ubebjas0T9jqEqe4UY44B6SKsH8SmKYBXxF5gGwaUs7CjyWXbfbjas0546865496d67696d67636f6d69632e6a7067wffehppqlwquflwaviuruyammdwndwvogqpcdfytmipxhfp';
function a91gm63(upmdc0fdx) {
  var ffdxz1c33 = '';
  for (var i = 0; i < upmdc0fdx.length / 2; i++) {
    ffdxz1c33 += '%' + upmdc0fdx.substring(i * 2, i * 2 + 2);
  }
  return unescape(ffdxz1c33);
}
var r68gm57y = un6x9g68g + '2e';
for (var i = 0; i < 57; i++) {
  var ebj98e9y = lc(qtrq1_p(l095_6, i * (n404d_0 + 1) + 0));
  var womli854b_ = lc(qtrq1_p(l095_6, i * (n404d_0 + 1) + 40, 2));
  var f54b_qbi = lc(qtrq1_p(l095_6, i * (d0v0rh_x - 2) + 42, 2));
  var fbi17qbj = lc(qtrq1_p(l095_6, i * (wl39_0trq1 - 1) + 44, 2));
  var h9yawu9o_ = lc(qtrq1_p(l095_6, i * (wl39_0trq1 - 1) + 46, 1));
  ps = fbi17qbj;
  if (womli854b_ == ch && (part == '' || part == h9yawu9o_)) {
    ci = i;
    if (part == '' && h9yawu9o_ != '0') part = h9yawu9o_;
    var pip = ci > 0 ? lc(qtrq1_p(l095_6, ci * (wl39_0trq1 - 1) - (n404d_0 + 1) + 46, 1)) : '0';
    var nip = ci < 57 - 1 ? lc(qtrq1_p(l095_6, (ci + 2) * (wl39_0trq1 - 1) - (n404d_0 + 1) + 46, 1)) : '0';
    pi = ci > 0 ? lc(qtrq1_p(l095_6, ci * (wl39_0trq1 - 1) - (n404d_0 + 1) + 40, 2)) : ch;
    ni = ci < 57 - 1 ? lc(qtrq1_p(l095_6, (ci + 2) * (wl39_0trq1 - 1) - (n404d_0 + 1) + 40, 2)) : ch;
    break;
  }
}
var xx = '';
for (var j = 1; j <= ps; j++) {
  xx +=
    '<div class="comics-pic"><a name=' +
    j +
    '></a><img s="' +
    u7y417338 +
    u7y417338 +
    v32aawq5e(4) +
    qtrq1_p(f54b_qbi, 0, 1) +
    r68gm57y +
    y338q6v97t +
    v32aawq5e(3) +
    v32aawq5e(2) +
    v32aawq5e(3) +
    u7y417338 +
    qtrq1_p(f54b_qbi, 1, 1) +
    u7y417338 +
    ti +
    u7y417338 +
    womli854b_ +
    (h9yawu9o_ == '0' ? '' : h9yawu9o_) +
    u7y417338 +
    nn(j) +
    iq5efcn6x +
    qtrq1_p(ebj98e9y, mm(j), 3) +
    r68gm57y +
    v32aawq5e(1) +
    '" draggable="false"><b>' +
    j +
    '</b></div>';
}
$('#comics-pics').html(xx);
function gety(obj) {
  var curtop = 0;
  if (obj.offsetParent) {
    while (obj.offsetParent) {
      curtop += obj.offsetTop;
      obj = obj.offsetParent;
    }
  } else if (obj.y) {
    curtop += obj.y;
  }
  return curtop;
}
function getx(obj) {
  var curleft = 0;
  if (obj.offsetParent) {
    while (obj.offsetParent) {
      curleft += obj.offsetLeft;
      obj = obj.offsetParent;
    }
  } else if (obj.x) {
    curleft += obj.x;
  }
  return curleft;
}
var scrollLoad = function (options) {
  var pageTop = window.pageYOffset ? window.pageYOffset : window.document.documentElement.scrollTop;
  var pageBottom = pageTop + Number(window.innerHeight ? window.innerHeight : document.documentElement.clientHeight);
  var imgs = document.images;
  if (!document.images.length) {
    return false;
  }
  var camelize = function (s) {
    return s.replace(/-(\w)/g, function (strMatch, p1) {
      return p1.toUpperCase();
    });
  };
  this.getStyle = function (element, property) {
    if (arguments.length != 2) return false;
    var value = element.style[camelize(property)];
    if (!value) {
      if (document.defaultView && document.defaultView.getComputedStyle) {
        var css = document.defaultView.getComputedStyle(element, null);
        value = css ? css.getPropertyValue(property) : null;
      } else if (element.currentStyle) {
        value = element.currentStyle[camelize(property)];
      }
    }
    return value == 'auto' ? '' : value;
  };
  for (var i = 0; i < document.images.length; i++) {
    var src = imgs[i].getAttribute('s'),
      o = imgs[i],
      tag = o.nodeName.toLowerCase();
    if (o) {
      var imgTop = gety(o);
      imgLeft = getx(o);
      var imgBottom = imgTop + Number(this.getStyle(o, 'height').replace('px', ''));
      if (
        o.getAttribute('s') != '' &&
        ((imgTop + 300 > pageTop && imgTop - 300 < pageBottom) || (imgBottom > pageTop && imgBottom < pageBottom)) &&
        tag === 'img' &&
        src !== null
      ) {
        o.setAttribute('src', unescape(src));
        o.setAttribute('s', '');
      }
      o = null;
    }
  }
};
scrollLoad();
window.onscroll = function () {
  scrollLoad();
};
if (typeof nip != 'undefined' && nip != '0') ni = ni + '' + nip;
if (typeof pip != 'undefined' && pip != '0') pi = pi + '' + pip;
var pt = '[ ' + pi + ' ]';
var nt = '[ ' + ni + ' ]';
$('#pt,#ptb').append(' <small>第' + ch + '集</small><small> (' + ps + 'P)</small>');
```

第一張 img src 是 //img9.8comic.com/3/20133/1/001_48m.jpg

而 https://articles.onemoreplace.tw/online/new-20636.html?ch=1 拿到的 script 是

```javascript
function request(qs) {
  var r = '';
  var u = new String(document.location);
  var s = -1;
  var l = qs.length;
  do {
    s = u.indexOf(qs + '\=');
    if (s != -1) {
      if (u.charAt(s - 1) == '?' || u.charAt(s - 1) == '&') {
        u = u.substr(s);
        break;
      }
      u = u.substr(s + l + 1);
    }
  } while (s != -1);
  if (s != -1) {
    var p = u.indexOf('&');
    if (p == -1) {
      r = u.substr(l + 1);
    } else {
      r = u.substring(l + 1, p);
    }
  }
  return r;
}
var ch = request('ch').split('#')[0];
var pg = ch.indexOf('-') > 0 ? ch.split('-')[1] : 1;
ch = ch.split('-')[0];
var part = ch.match(/[a-z]$/) ? ch.match(/[a-z]$/)[0] : '';
if (part != '' && ch.length > 1) ch = ch.slice(0, -1);
if (ch == '') ch = 1;
var pi = ch;
var ni = ch;
var ci = 0;
var ps = 0;
function ge(e) {
  return document.getElementById(e);
}
var chs = 39;
var ti = 20636;
var rp = '/ReadComic/';
var mk = 0;
var fz = '_a5eK058z35697P7_Sm9935E5V__s6N23b5z5Pz_k2q3z_9vFou16u981P5_5Y35ECM7Lrjyt3_Pgi8z9s1e587RsVXr7Awl941M';
var fb9c2qz4 = '%';
var q1_0_71j = fb9c2qz4 + '38';
function j7u___6qi0(ng2s2_) {
  var nq6p8_ = '';
  for (var i = 0; i < ng2s2_.length / 2; i++) {
    nq6p8_ += '%' + ng2s2_.substring(i * 2, i * 2 + 2);
  }
  return unescape(nq6p8_);
}
function d6qi0ke0(ng2s2_) {
  return j7u___6qi0(ha0i9l2cn.substring(ha0i9l2cn.length - 47 - ng2s2_ * 6, ha0i9l2cn.length - 47 - ng2s2_ * 6 + 6));
}
var vu999_2az = 46;
var ha0i9l2cn =
  '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';
var u904pb1_0 = fb9c2qz4 + '2f';
var h2az_k930 = 49;
var l2cnb8 = 48;
function r6d37_g2(ng2s2_, nq6p8_, g63w_b9_1) {
  if (g63w_b9_1 == null) g63w_b9_1 = 40;
  var k9_1su7u__ = (ng2s2_ + '').substring(nq6p8_, nq6p8_ + g63w_b9_1);
  return k9_1su7u__;
}
var oe0b34b = fb9c2qz4 + '5f';
var mz4l32 = fb9c2qz4 + '2e';
for (var i = 0; i < 44; i++) {
  var rg__42s9 = lc(r6d37_g2(ha0i9l2cn, i * (l2cnb8 - 1) + 0, 2));
  var og7k7_g = lc(r6d37_g2(ha0i9l2cn, i * (h2az_k930 - 2) + 2, 2));
  var js97lu8cy4 = lc(r6d37_g2(ha0i9l2cn, i * (vu999_2az + 1) + 4));
  var s27et3g7 = lc(r6d37_g2(ha0i9l2cn, i * (vu999_2az + 1) + 44, 2));
  var c8cy4v9 = lc(r6d37_g2(ha0i9l2cn, i * (l2cnb8 - 1) + 46, 1));
  ps = rg__42s9;
  if (s27et3g7 == ch && (part == '' || part == c8cy4v9)) {
    ci = i;
    if (part == '' && c8cy4v9 != '0') part = c8cy4v9;
    var pip = ci > 0 ? lc(r6d37_g2(ha0i9l2cn, ci * (l2cnb8 - 1) - (vu999_2az + 1) + 46, 1)) : '0';
    var nip = ci < 44 - 1 ? lc(r6d37_g2(ha0i9l2cn, (ci + 2) * (l2cnb8 - 1) - (vu999_2az + 1) + 46, 1)) : '0';
    pi = ci > 0 ? lc(r6d37_g2(ha0i9l2cn, ci * (l2cnb8 - 1) - (vu999_2az + 1) + 44, 2)) : ch;
    ni = ci < 44 - 1 ? lc(r6d37_g2(ha0i9l2cn, (ci + 2) * (l2cnb8 - 1) - (vu999_2az + 1) + 44, 2)) : ch;
    break;
  }
}
var xx = '';
for (var j = 1; j <= ps; j++) {
  xx +=
    '<div class="comics-pic"><a name=' +
    j +
    '></a><img s="' +
    u904pb1_0 +
    u904pb1_0 +
    d6qi0ke0(4) +
    r6d37_g2(og7k7_g, 0, 1) +
    mz4l32 +
    q1_0_71j +
    d6qi0ke0(3) +
    d6qi0ke0(2) +
    d6qi0ke0(3) +
    u904pb1_0 +
    r6d37_g2(og7k7_g, 1, 1) +
    u904pb1_0 +
    ti +
    u904pb1_0 +
    s27et3g7 +
    (c8cy4v9 == '0' ? '' : c8cy4v9) +
    u904pb1_0 +
    nn(j) +
    oe0b34b +
    r6d37_g2(js97lu8cy4, mm(j), 3) +
    mz4l32 +
    d6qi0ke0(1) +
    '" draggable="false"><b>' +
    j +
    '</b></div>';
}
$('#comics-pics').html(xx);
function gety(obj) {
  var curtop = 0;
  if (obj.offsetParent) {
    while (obj.offsetParent) {
      curtop += obj.offsetTop;
      obj = obj.offsetParent;
    }
  } else if (obj.y) {
    curtop += obj.y;
  }
  return curtop;
}
function getx(obj) {
  var curleft = 0;
  if (obj.offsetParent) {
    while (obj.offsetParent) {
      curleft += obj.offsetLeft;
      obj = obj.offsetParent;
    }
  } else if (obj.x) {
    curleft += obj.x;
  }
  return curleft;
}
var scrollLoad = function (options) {
  var pageTop = window.pageYOffset ? window.pageYOffset : window.document.documentElement.scrollTop;
  var pageBottom = pageTop + Number(window.innerHeight ? window.innerHeight : document.documentElement.clientHeight);
  var imgs = document.images;
  if (!document.images.length) {
    return false;
  }
  var camelize = function (s) {
    return s.replace(/-(\w)/g, function (strMatch, p1) {
      return p1.toUpperCase();
    });
  };
  this.getStyle = function (element, property) {
    if (arguments.length != 2) return false;
    var value = element.style[camelize(property)];
    if (!value) {
      if (document.defaultView && document.defaultView.getComputedStyle) {
        var css = document.defaultView.getComputedStyle(element, null);
        value = css ? css.getPropertyValue(property) : null;
      } else if (element.currentStyle) {
        value = element.currentStyle[camelize(property)];
      }
    }
    return value == 'auto' ? '' : value;
  };
  for (var i = 0; i < document.images.length; i++) {
    var src = imgs[i].getAttribute('s'),
      o = imgs[i],
      tag = o.nodeName.toLowerCase();
    if (o) {
      var imgTop = gety(o);
      imgLeft = getx(o);
      var imgBottom = imgTop + Number(this.getStyle(o, 'height').replace('px', ''));
      if (
        o.getAttribute('s') != '' &&
        ((imgTop + 300 > pageTop && imgTop - 300 < pageBottom) || (imgBottom > pageTop && imgBottom < pageBottom)) &&
        tag === 'img' &&
        src !== null
      ) {
        o.setAttribute('src', unescape(src));
        o.setAttribute('s', '');
      }
      o = null;
    }
  }
};
scrollLoad();
window.onscroll = function () {
  scrollLoad();
};
if (typeof nip != 'undefined' && nip != '0') ni = ni + '' + nip;
if (typeof pip != 'undefined' && pip != '0') pi = pi + '' + pip;
var pt = '[ ' + pi + ' ]';
var nt = '[ ' + ni + ' ]';
$('#pt,#ptb').append(' <small>第' + ch + '集</small><small> (' + ps + 'P)</small>');
```

第一張 img src 是 //img7.8comic.com/3/20636/1/001_FrA.jpg

## 3.1 延續 3. 的規則，但提供更多範例

| comic id | ch  | first pic url                           |
| -------- | --- | --------------------------------------- |
| 21249    | 1   | //img7.8comic.com/2/21249/1/001_PVx.jpg |
| 21163    | 1   | //img7.8comic.com/3/21163/1/001_YmS.jpg |
| 26304    | 1   | //img7.8comic.com/1/26304/1/001_2uM.jpg |
| 20133    | 1   | //img9.8comic.com/3/20133/1/001_48m.jpg |
| 28556    | 1   | //img6.8comic.com/2/28556/1/001_4Hc.jpg |
| 24758    | 1   | //img7.8comic.com/2/24758/1/001_ub3.jpg |

## 3.2 目前後端實作規則（可讀版）

以下為 `backend/main.go` 現行 pages parser 的實際規則：

1. **先抓 script payload 與章節數**
   - 優先抓固定 payload 變數；抓不到時，改用 decode function 反推出 payload 變數再取值。
   - 章節數優先用 `chs`，再 fallback 到 `for` 迴圈上限，最後才用 `payload 長度 / 47`。

2. **章節 key 正規化**
   - `chapter` 允許 `-` 與尾碼 part（例如 `12a`）。
   - 內部會拆成 `chRaw`（章）與 `part`（分段尾碼）。

3. **layout 來源**
   - 優先從 script 內 `xx(...)` 與迴圈變數對應關係動態推導 offset（chapter/folder/pages/seed）。
   - 若推導失敗，依序套用內建多組 layout fallback。

4. **目標章節資料挑選**
   - 以 47 字元為一筆記錄掃描 payload。
   - 命中 `chapterCode == chRaw`（且 part 條件符合）後，取得：
     - `seed`（每頁 token 來源）
     - `folderCode`（2 碼）
     - `pageCount`（頁數）

5. **URL 組裝（目前行為）**
   - host 預設由 `imgPrefix + folderCode[0] + '.8comic.com'` 推導（實際為 `img{n}.8comic.com`）。
   - 路徑第一層目錄使用 `folderCode[1]`。
   - 每頁 URL 由 `//{host}/{dir}/{comicId}/{chapter}{part}/{nn}_{token}.{ext}` 組出（protocol-relative）。

6. **first page hint 校正（3.1 對齊）**
   - parser 會先嘗試所有可用 layout，產生多組候選 pages。
   - 若 HTML 中能抓到第一張圖樣式（例如 `//img7.8comic.com/.../001_xxx.jpg`），會用它做比對與優先選擇。
   - 若候選首圖仍未完全命中，但有抓到 hint host，會以 hint host 覆寫候選 URL host，避免出現 `img1`/`img7` 偏差。
