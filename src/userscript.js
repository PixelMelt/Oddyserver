// ==UserScript==
// @name         Starblast.io local server - peepeepoopoo mod injector
// @description  A mod for starblast.io
// @version      0.1
// @author       Pixelmelt
// @license      MIT
// @namespace    https://greasyfork.org/en/users/226344
// @match        https://starblast.io/
// @run-at       document-start
// @grant        none
// ==/UserScript==

const modName = "LocalServer";

const log = (msg) => console.log(`%c[${modName}] ${msg}`, "color: #0086FF");

function injector(sbCode) {
  let src = sbCode;
  let prevSrc = src;

  function checkSrcChange() {
    if (src == prevSrc) throw new Error("src didn't change");
    prevSrc = src;
  }

  src = src.replace(`new WebSocket("wss://" + e + ":" + i)`, `new WebSocket("ws://localhost:1212")`);
  checkSrcChange();

  log(`Mod injected`);
  return src;
}

if (!window.sbCodeInjectors) window.sbCodeInjectors = [];
window.sbCodeInjectors.push((sbCode) => {
  try {
    return injector(sbCode);
  } catch (error) {
    alert(`${modName} failed to load`);
    throw error;
  }
});
log(`Mod loaded`);
