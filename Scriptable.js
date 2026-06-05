// ==========================================
// CONFIGURATIE: PAS DIT AAN NAAR JOUW SITUATIE
// ==========================================
// Vul hier EXACT de naam in die dit script heeft in de Scriptable-app (bijv. "Hypotheek Widget")
const SCRIPT_NAAM = "Hypotheek"; 

// De live URL van jouw GitHub Pages website
const WEB_PAGINA_URL = "https://markmooiman.github.io/home/";
// ==========================================

let webView = new WebView()
await webView.loadURL(WEB_PAGINA_URL)
await new Promise(r => Timer.schedule(800, false, r))

// De nieuwe scraper leest de cellen nu volledig onafhankelijk van elkaar uit via de classes
let scrapeScript = `
  let data = [];
  let rijen = document.querySelectorAll("table tbody tr");
  rijen.forEach(rij => {
    let label = rij.querySelector(".label").innerText;
    let cijfer = rij.querySelector(".cijfer").innerText;
    let eenheid = rij.querySelector(".eenheid").innerText;
    data.push({ label: label, cijfer: cijfer, eenheid: eenheid });
  });
  JSON.stringify(data);
`
let gescrapeteDataRaw = await webView.evaluateJavaScript(scrapeScript)
let tabelData = JSON.parse(gescrapeteDataRaw)

let widget = new ListWidget()
let gradient = new LinearGradient()
gradient.colors = [new Color("#3c3c3c", 1.0), new Color("#0a0a0a", 1.0)]
gradient.locations = [0.0, 1.0]
widget.backgroundGradient = gradient
widget.setPadding(12, 14, 12, 14)

if (tabelData.length > 0) {
  tabelData.forEach((item, index) => {
    let rijStack = widget.addStack()
    rijStack.layoutHorizontally()
    rijStack.centerAlignContent()
    
    // 1. LABELS: Nu dwingen we iOS naar exact 9.5
    let labelTekst = rijStack.addText(item.label)
    labelTekst.fontSize = 9.5
    labelTekst.textColor = new Color("#8e8e93")
    
    rijStack.addSpacer()
    
    let waardeStack = rijStack.addStack()
    waardeStack.layoutHorizontally()
    waardeStack.centerAlignContent()
    
    let hoofdKleur = (index === 0) ? new Color("#30d158") : new Color("#8e8e93");
    
    // Controleer of het een duration-rij is (bevat '|')
    if (item.cijfer.includes("|")) {
      let blokken = item.cijfer.trim().split(" ");
      blokken.forEach((blok, bIdx) => {
        let delen = blok.split("|");
        let getal = delen[0];
        let eenheidLetter = delen[1];
        
        let nrTxt = waardeStack.addText(getal)
        nrTxt.fontSize = 13
        nrTxt.fontWeight = "bold"
        nrTxt.textColor = hoofdKleur
        
        if (eenheidLetter) {
          waardeStack.addSpacer(1)
          let letTxt = waardeStack.addText(eenheidLetter)
          letTxt.fontSize = 7.5 // Gevraagd: Eenheden exact 7.5
          letTxt.textColor = new Color("#aaaaaa")
        }
        if (bIdx < blokken.length - 1) waardeStack.addSpacer(4)
      })
    } else {
      // Normale valuta of tijdstempel rij
      let nrTxt = waardeStack.addText(item.cijfer)
      nrTxt.fontSize = 13
      nrTxt.fontWeight = "bold"
      nrTxt.textColor = hoofdKleur
      
      if (item.eenheid) {
        waardeStack.addSpacer(2)
        let letTxt = waardeStack.addText(item.eenheid)
        letTxt.fontSize = 7.5 // Gevraagd: 'Kr' exact naar 7.5
        letTxt.textColor = hoofdKleur // 'Kr' kleurt groen mee op rij 0
      }
    }
    
    if (index < tabelData.length - 1) widget.addSpacer(3)
  })
}

let encodedNaam = encodeURIComponent(SCRIPT_NAAM)
widget.url = "scriptable:///run/" + encodedNaam

if (config.runsInWidget) {
  Script.setWidget(widget)
} else {
  widget.presentMedium()
  await new Promise(r => Timer.schedule(1000, false, r))
  App.close()
}
Script.complete()
