(function(){const t=globalThis;function e(n){(n instanceof HTMLInputElement||n instanceof HTMLTextAreaElement||n instanceof HTMLElement&&n.isContentEditable)&&(t.__jptLastEditable=n)}document.addEventListener("focusin",n=>e(n.target),!0);e(document.activeElement);
})()
