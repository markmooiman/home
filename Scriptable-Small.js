// ==========================================
// CONFIGURATIE: PAS DIT AAN NAAR JOUW SITUATIE
// ==========================================
const SCRIPT_NAAM = "Hypotheek Small"; 
const WEB_PAGINA_URL = "https://github.io";
// ==========================================

// 1. Start de browser op de achtergrond en laad de URL
let webView = new WebView()
await webView.loadURL(WEB_PAGINA_URL)

// Wacht 800ms zodat de JavaScript op GitHub de actuele hypotheekstand heeft berekend
await new Promise(r => Timer.schedule(800, false, r))

// 2. SCRAPING: Haal alle labels en waarden op uit de tabel-structuur
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

// 3. Bouw de native iOS Small Widget
let widget = new ListWidget()

// Het vertrouwde lineaire kleurverloop (van RGB 60,60,60 naar 10,10,10)
let gradient = new LinearGradient()
gradient.colors = [
  new Color("#3c3c3c", 1.0), 
  new Color("#0a0a0a", 1.0)  
]
gradient.locations = [0.0, 1.0]
widget.backgroundGradient = gradient

// Ruime marges omdat de knop nu in de regel zelf is weggewerkt
widget.setPadding(14, 14, 14, 14)

if (tabelData.length === 0) {
  let foutTekst = widget.addText("Geen data")
  foutTekst.fontSize = 12
  foutTekst.textColor = Color.red()
} else {
  // Indexen van de grote tabel: 0=Nu, 1=Half Jaar, 2=Jaar, 5=Next 10K, 10=Updated
  let rowsToInclude = [0, 1, 2, 5, 10];

  rowsToInclude.forEach((targetIndex, sIdx) => {
    let item = tabelData[targetIndex];
    if (!item) return;

    let rijStack = widget.addStack()
    rijStack.layoutHorizontally()
    rijStack.centerAlignContent()
    
    // De 'Nu' rij (index 0) is Groen, de rest is grijs (#8e8e93)
    let tekstKleur = (targetIndex === 0) ? new Color("#30d158") : new Color("#8e8e93");
    
    // GEVRAAGD: Plaats de transparante verversknop exact VÓÓR de Updated time (index 10)
    if (targetIndex === 10) {
      let refreshKnop = rijStack.addStack()
      refreshKnop.backgroundColor = Color.transparent() // Volledig transparant
      refreshKnop.setPadding(10, 20, 10, 20) // Maakt een lekker groot onzichtbaar klikgebied links van de tijd
      
      let encodedNaam = encodeURIComponent(SCRIPT_NAAM)
      refreshKnop.url = "scriptable:///run/" + encodedNaam
    }
    
    rijStack.addSpacer() // Duwt de waarden strak naar de rechterkant
    
    let waardeStack = rijStack.addStack()
    waardeStack.layoutHorizontally()
    waardeStack.centerAlignContent()
    
    // Splits de cijfers en letters
    let onderdelen = item.waarde.match(/([0-9.,:]+|[a-zA-Z]+)/g) || [item.waarde];
    
    onderdelen.forEach((deel, deelIndex) => {
      let isLetter = /[a-zA-Z]/.test(deel);
      
      if (isLetter) {
        if (deel.toLowerCase() === "kr") return; // Verberg 'kr'
        
        let tekstElement = waardeStack.addText(deel)
        tekstElement.lineLimit = 1
        tekstElement.fontSize = 7.5
        tekstElement.fontWeight = "normal"
        tekstElement.textColor = new Color("#aaaaaa") 
        
        if (deelIndex < onderdelen.length - 1) {
          waardeStack.addSpacer(3) 
        }
      } else {
        let tekstElement = waardeStack.addText(deel)
        tekstElement.lineLimit = 1
        tekstElement.fontSize = 12.5 // Weer mooi groot nu de knop geen extra regel inneemt
        tekstElement.fontWeight = "bold"
        tekstElement.textColor = tekstKleur
      }
    })
    
    if (sIdx < rowsToInclude.length - 1) {
      widget.addSpacer(5)
    }
  })
}

// AFHANDELING EN WEERGAVE
if (config.runsInWidget) {
  Script.setWidget(widget)
} else {
  widget.presentSmall()
}

Script.complete()
