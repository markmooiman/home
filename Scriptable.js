// ==========================================
// CONFIGURATIE: PAS DIT AAN NAAR JOUW SITUATIE
// ==========================================
// Vul hier EXACT de naam in die dit script heeft in de Scriptable-app (bijv. "Hypotheek Widget")
const SCRIPT_NAAM = "Hypotheek"; 

// De live URL van jouw GitHub Pages website
const WEB_PAGINA_URL = "https://markmooiman.github.io/home/";
// ==========================================

// 1. Start de browser op de achtergrond en laad de URL
let webView = new WebView()
await webView.loadURL(WEB_PAGINA_URL)

// Wacht 800ms zodat de JavaScript op GitHub de actuele hypotheekstand heeft berekend
await new Promise(r => Timer.schedule(800, false, r))

// 2. SCRAPING: Haal alle labels en waarden netjes op uit de tabel-structuur
let scrapeScript = `
  let data = [];
  let rijen = document.querySelectorAll("table tbody tr");
  
  rijen.forEach(rij => {
    let labelEl = rij.querySelector(".label");
    let waardeEl = rij.querySelector(".waarde");
    if (labelEl && waardeEl) {
      data.push({ label: labelEl.innerText, waarde: waardeEl.innerText });
    }
  });
  
  JSON.stringify(data);
`
let gescrapeteDataRaw = await webView.evaluateJavaScript(scrapeScript)
let tabelData = JSON.parse(gescrapeteDataRaw)

// 3. Bouw de native iOS Widget
let widget = new ListWidget()

// Lineair kleurverloop van RGB (60,60,60) naar RGB (10,10,10)
let gradient = new LinearGradient()
gradient.colors = [
  new Color("#3c3c3c", 1.0), // Bovenkant (60, 60, 60)
  new Color("#0a0a0a", 1.0)  // Onderkant (10, 10, 10)
]
gradient.locations = [0.0, 1.0]
widget.backgroundGradient = gradient

// Marges instellen (strakker en passend bij de webpagina)
widget.setPadding(12, 14, 12, 14)

// 4. Voeg de gescrapete data dynamisch toe aan de widget
if (tabelData.length === 0) {
  let foutTekst = widget.addText("Geen data gevonden in tabel")
  foutTekst.fontSize = 12
  foutTekst.textColor = Color.red()
} else {
  tabelData.forEach((item, index) => {
    let rijStack = widget.addStack()
    rijStack.layoutHorizontally()
    rijStack.centerAlignContent()
    
    // Labels een slagje kleiner (fontSize 10.5) en altijd in het grijs (#8e8e93)
    let labelTekst = rijStack.addText(item.label)
    labelTekst.fontSize = 10.5
    labelTekst.textColor = new Color("#8e8e93")
    labelTekst.lineLimit = 1
    
    rijStack.addSpacer() // Duwt de waarde strak naar de rechterkant
    
    let waardeStack = rijStack.addStack()
    waardeStack.layoutHorizontally()
    waardeStack.centerAlignContent()
    
    // Bepaal de hoofdkleur van de tekst (Rij 0 = groen, de rest is grijs)
    let tekstKleur = (index === 0) ? new Color("#30d158") : new Color("#8e8e93");
    
    // De RegEx matcht zowel kleine letters als hoofdletters (a-zA-Z) om ook 'Kr' te herkennen
    let onderdelen = item.waarde.match(/([0-9.,:]+|[a-zA-Z]+)/g) || [item.waarde];
    
    onderdelen.forEach((deel, deelIndex) => {
      let isLetter = /[a-zA-Z]/.test(deel);
      
      let tekstElement = waardeStack.addText(deel)
      tekstElement.lineLimit = 1
      
      if (isLetter) {
        // Zowel duration eenheden als 'Kr'/'kr' worden nu 8.5 groot gemaakt
        tekstElement.fontSize = 8.5
        tekstElement.fontWeight = "normal"
        tekstElement.textColor = new Color("#aaaaaa") 
        
        // Voeg ruimte toe tussen de eenheden indien van toepassing
        if (deelIndex < onderdelen.length - 1) {
          waardeStack.addSpacer(4) 
        }
      } else {
        // De getallen zelf behouden hun grotere, dikgedrukte formaat (fontSize 13)
        tekstElement.fontSize = 13
        tekstElement.fontWeight = "bold"
        tekstElement.textColor = tekstKleur
      }
    })
    
    if (index < tabelData.length - 1) {
      widget.addSpacer(3)
    }
  })
}

// 5. DE VERVERS ACTIE (Gehele widget fungeert als transparante knop)
let encodedNaam = encodeURIComponent(SCRIPT_NAAM)
widget.url = "scriptable:///run/" + encodedNaam

// 6. AFHANDELING EN WEERGAVE
if (config.runsInWidget) {
  Script.setWidget(widget)
} else {
  widget.presentMedium()
  await new Promise(r => Timer.schedule(1000, false, r))
  App.close()
}

Script.complete()
