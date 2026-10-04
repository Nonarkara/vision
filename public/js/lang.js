// Runs before first paint (classic, blocking, tiny): choose the language so
// the page never flashes the wrong one. Thai for Thai browsers, English for
// everyone else; a choice made with the TH/EN button wins after that.
(function () {
  var root = document.documentElement
  var lang = null
  try { lang = localStorage.getItem('vision_lang_v1') } catch (e) {}
  if (lang !== 'th' && lang !== 'en') {
    var nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'th'
    lang = /^th\b/i.test(nav) ? 'th' : 'en'
  }
  root.setAttribute('data-lang', lang)
  root.setAttribute('lang', lang)
})()
