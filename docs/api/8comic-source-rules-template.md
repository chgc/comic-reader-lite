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

而 https://articles.onemoreplace.tw/online/new-23095.html?ch=1 拿到的 script 是

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
var ti = 23095;
var rp = '/ReadComic/';
var mk = 0;
var fz = 'f_14WlTy63pmsexyIe7bh6BQbW_Alz2_1Y78mo307R_P_pMV__9ivh25493a2_04Dg0s3f9068t2u48A4X52t_6_4Ms3531o4knt';
var b1u6m1_ = '%';
function hj5w7brg_(nrg_59, nrv_vg, w4sgrc_r57) {
  if (w4sgrc_r57 == null) w4sgrc_r57 = 40;
  var u_r579bec = (nrg_59 + '').substring(nrv_vg, nrv_vg + w4sgrc_r57);
  return u_r579bec;
}
var g2t04152s =
  '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';
var g52s7fj5w = 48;
var d26k8ide = 49;
var n9b_0p = b1u6m1_ + '38';
var bmk6739 = b1u6m1_ + '2f';
function o0ry4p2(nrg_59) {
  return jbeclv0ry4(g2t04152s.substring(g2t04152s.length - 47 - nrg_59 * 6, g2t04152s.length - 47 - nrg_59 * 6 + 6));
}
var qv81b426 = 46;
function jbeclv0ry4(nrg_59) {
  var nrv_vg = '';
  for (var i = 0; i < nrg_59.length / 2; i++) {
    nrv_vg += '%' + nrg_59.substring(i * 2, i * 2 + 2);
  }
  return unescape(nrv_vg);
}
var l2vb0_ = b1u6m1_ + '5f';
var w_3xm9mk67 = b1u6m1_ + '2e';
for (var i = 0; i < 53; i++) {
  var ac0232_ = lc(hj5w7brg_(g2t04152s, i * (d26k8ide - 2) + 0, 2));
  var l6bgly = lc(hj5w7brg_(g2t04152s, i * (qv81b426 + 1) + 2, 2));
  var b_y_q9r = lc(hj5w7brg_(g2t04152s, i * (g52s7fj5w - 1) + 4, 2));
  var fr_71_gx = lc(hj5w7brg_(g2t04152s, i * (qv81b426 + 1) + 6));
  var ngx_t4 = lc(hj5w7brg_(g2t04152s, i * (g52s7fj5w - 1) + 46, 1));
  ps = b_y_q9r;
  if (l6bgly == ch && (part == '' || part == ngx_t4)) {
    ci = i;
    if (part == '' && ngx_t4 != '0') part = ngx_t4;
    var pip = ci > 0 ? lc(hj5w7brg_(g2t04152s, ci * (g52s7fj5w - 1) - (qv81b426 + 1) + 46, 1)) : '0';
    var nip = ci < 53 - 1 ? lc(hj5w7brg_(g2t04152s, (ci + 2) * (g52s7fj5w - 1) - (qv81b426 + 1) + 46, 1)) : '0';
    pi = ci > 0 ? lc(hj5w7brg_(g2t04152s, ci * (g52s7fj5w - 1) - (qv81b426 + 1) + 2, 2)) : ch;
    ni = ci < 53 - 1 ? lc(hj5w7brg_(g2t04152s, (ci + 2) * (g52s7fj5w - 1) - (qv81b426 + 1) + 2, 2)) : ch;
    break;
  }
}
var xx = '';
for (var j = 1; j <= ps; j++) {
  xx +=
    '<div class="comics-pic"><a name=' +
    j +
    '></a><img s="' +
    bmk6739 +
    bmk6739 +
    o0ry4p2(4) +
    hj5w7brg_(ac0232_, 0, 1) +
    w_3xm9mk67 +
    n9b_0p +
    o0ry4p2(3) +
    o0ry4p2(2) +
    o0ry4p2(3) +
    bmk6739 +
    hj5w7brg_(ac0232_, 1, 1) +
    bmk6739 +
    ti +
    bmk6739 +
    l6bgly +
    (ngx_t4 == '0' ? '' : ngx_t4) +
    bmk6739 +
    nn(j) +
    l2vb0_ +
    hj5w7brg_(fr_71_gx, mm(j), 3) +
    w_3xm9mk67 +
    o0ry4p2(1) +
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
