
function clipboardCopy(text) {
  var textArea = document.createElement("textarea"), success;

  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.select();

  try {
    success = document.execCommand('copy');
  } catch (err) {
    success = false;
  }

  document.body.removeChild(textArea);

  return success;
}

function placeCaretAtEnd(el) {
    el.focus();
    if (typeof window.getSelection != "undefined"
            && typeof document.createRange != "undefined") {
        var range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    } else if (typeof document.body.createTextRange != "undefined") {
        var textRange = document.body.createTextRange();
        textRange.moveToElementText(el);
        textRange.collapse(false);
        textRange.select();
    }
}
