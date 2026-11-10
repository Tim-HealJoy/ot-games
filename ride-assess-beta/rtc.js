/* 騎遍台灣：手機和電腦之間的直連通道（WebRTC）。
 * 台灣連 Cloudflare 免費方案會繞到美國，走雲端中繼時手機到電腦單程約 150 ms；能直連就只要幾十 ms。
 * 雲端中繼只負責幫兩邊交換連線資訊。連不上也沒關係，傾斜訊號會自動改走中繼。 */
(function (root) {
  'use strict';
  var ICE = [{urls: 'stun:stun.cloudflare.com:3478'}];
  /** o.signal(d)：經中繼送連線資訊給對方；o.onData(物件)：收到直連資料；o.onChange(是否直連中) */
  function createLink(o) {
    var pc = null, dc = null, pending = [];
    var link = {open: false, start: start, onSignal: onSignal, send: send, close: close};
    function setOpen(v) { if (link.open !== v) { link.open = v; if (o.onChange) o.onChange(v); } }
    function wire(ch) {
      dc = ch;
      ch.onopen = function () { setOpen(true); };
      ch.onclose = function () { if (dc === ch) setOpen(false); };
      ch.onmessage = function (e) { var m; try { m = JSON.parse(e.data); } catch (x) { return; } if (m && typeof m === 'object') o.onData(m); };
    }
    function make() {
      close();
      var p = pc = new root.RTCPeerConnection({iceServers: ICE});
      pending = [];
      p.onicecandidate = function (e) { if (e.candidate && pc === p) o.signal({c: e.candidate}); };
      p.ondatachannel = function (e) { wire(e.channel); };
      p.onconnectionstatechange = function () {
        if (pc !== p) return;
        var s = p.connectionState;
        if (s === 'failed' || s === 'closed' || s === 'disconnected') setOpen(false);
        else if (s === 'connected' && dc && dc.readyState === 'open') setOpen(true);
      };
      return p;
    }
    function flush() {
      var list = pending; pending = [];
      return list.reduce(function (acc, c) { return acc.then(function () { return pc && pc.addIceCandidate(c); }).catch(function () {}); }, Promise.resolve());
    }
    /** 手機這邊主動發起 */
    function start() {
      if (!root.RTCPeerConnection) return Promise.resolve(false);
      try { var p = make(); wire(p.createDataChannel('in', {ordered: false, maxRetransmits: 0})); }
      catch (e) { close(); return Promise.resolve(false); }
      return pc.createOffer().then(function (offer) { return pc.setLocalDescription(offer); }).then(function () {
        o.signal({sdp: {type: pc.localDescription.type, sdp: pc.localDescription.sdp}});
        return true;
      }).catch(function () { close(); return false; });
    }
    function onSignal(d) {
      if (!root.RTCPeerConnection || !d) return Promise.resolve();
      var work = Promise.resolve();
      if (d.sdp && d.sdp.type === 'offer') {
        var p = make();
        work = p.setRemoteDescription(d.sdp).then(flush).then(function () { return p.createAnswer(); }).then(function (a) { return p.setLocalDescription(a); }).then(function () {
          if (pc === p) o.signal({sdp: {type: p.localDescription.type, sdp: p.localDescription.sdp}});
        });
      } else if (d.sdp && d.sdp.type === 'answer' && pc) {
        work = pc.setRemoteDescription(d.sdp).then(flush);
      } else if (d.c) {
        if (pc && pc.remoteDescription) work = pc.addIceCandidate(d.c); else pending.push(d.c);
      }
      return work.catch(function () {});
    }
    /** 直連中才送得出去，回傳是否送出；送不出去就由呼叫的人改走中繼 */
    function send(obj) {
      if (!link.open || !dc || dc.readyState !== 'open') return false;
      try { dc.send(JSON.stringify(obj)); return true; } catch (e) { return false; }
    }
    function close() {
      var p = pc, c = dc;
      pc = null; dc = null; pending = [];
      try { if (c) c.close(); } catch (e) {}
      try { if (p) p.close(); } catch (e) {}
      setOpen(false);
    }
    return link;
  }
  root.createLink = createLink;
})(window);
