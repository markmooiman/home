// ==========================================
// CONFIGURATIE: PAS DIT AAN NAAR JOUW SITUATIE
// ==========================================
// Vul hier de exacte naam in die DIT specifieke script heeft in Scriptable (bijv. "Hypotheek Small")
const SCRIPT_NAAM = "Hypotheek Small"; 

// Dezelfde live URL van jouw GitHub Pages website
const WEB_PAGINA_URL = "https://markmooiman.github.io/home/";
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
  new Color("#3c3c3c", 1.0), // Bovenkant
  new Color("#0a0a0a", 1.0)  // Onderkant
]
gradient.locations = [0.0, 1.0]
widget.backgroundGradient = gradient

// Marges strakker ingesteld om ruimte te maken voor de fysieke knop onderin
widget.setPadding(10, 12, 10, 12)

if (tabelData.length === 0) {
  let foutTekst = widget.addText("Geen data")
  foutTekst.fontSize = 12
  foutTekst.textColor = Color.red()
} else {
  // Configuratielijst op basis van de indexen van de grote tabel
  // Index: 0=Nu, 1=Half Jaar, 2=Jaar, 5=Next 10K, 10=Updated
  let rowsToInclude = [0, 1, 2, 5, 10];

  rowsToInclude.forEach((targetIndex, sIdx) => {
    let item = tabelData[targetIndex];
    if (!item) return;

    let rijStack = widget.addStack()
    rijStack.layoutHorizontally()
    rijStack.centerAlignContent()
    
    rijStack.addSpacer() // Duwt de complete waarde-stack strak naar de rechterkant
    
    let waardeStack = rijStack.addStack()
    waardeStack.layoutHorizontally()
    waardeStack.centerAlignContent()
    
    // 'Nu' rij (index 0) is Groen, de rest is grijs (#8e8e93)
    let tekstKleur = (targetIndex === 0) ? new Color("#30d158") : new Color("#8e8e93");
    
    // Splits de cijfers en letters
    let onderdelen = item.waarde.match(/([0-9.,:]+|[a-zA-Z]+)/g) || [item.waarde];
    
    onderdelen.forEach((deel, deelIndex) => {
      let isLetter = /[a-zA-Z]/.test(deel);
      
      if (isLetter) {
        // Verberg de 'kr'/'Kr' eenheid voor alle bedragen volledig
        if (deel.toLowerCase() === "kr") {
          return;
        }
        
        // Toon de duration eenheden (j, m, d, u, s) op grootte 7.5
        let tekstElement = waardeStack.addText(deel)
        tekstElement.lineLimit = 1
        tekstElement.fontSize = 7.5
        tekstElement.fontWeight = "normal"
        tekstElement.textColor = new Color("#aaaaaa") 
        
        if (deelIndex < onderdelen.length - 1) {
          waardeStack.addSpacer(3) 
        }
      } else {
        // De getallen zelf (fontSize 11.5 om perfect te passen inclusief de knop)
        let tekstElement = waardeStack.addText(deel)
        tekstElement.lineLimit = 1
        tekstElement.fontSize = 11.5
        tekstElement.fontWeight = "bold"
        tekstElement.textColor = tekstKleur
      }
    })
    
    // Compacte tussenruimte tussen de 5 rijen met waarden
    if (sIdx < rowsToInclude.length - 1) {
      widget.addSpacer(4)
    }
  })
}

widget.addSpacer(6) // Ruimte tussen de waarden en de verversknop

// 4. DE FYSIEKE VERVERS KNOP (Exact gebaseerd op het andere script)
let knopStack = widget.addStack()
knopStack.layoutHorizontally()
knopStack.addSpacer() // Centreert de knop horizontaal in de Small widget

let refreshKnop = knopStack.addStack()
refreshKnop.backgroundColor = new Color("#2c2c2e") // Iets lichtere knop achtergrond
refreshKnop.setPadding(4, 10, 4, 10) // Iets compacter voor de Small container
refreshKnop.cornerRadius = 6

let knopTekst = refreshKnop.addText("🔄 Ververs")
knopTekst.fontSize = 9.5
knopTekst.fontWeight = "bold"
knopTekst.textColor = new Color("#0a84ff") // Blauwe letters

// Koppel de dynamische URL op basis van de ingevulde scriptnaam
let encodedNaam = encodeURIComponent(SCRIPT_NAAM)
refreshKnop.url = "scriptable:///run/" + encodedNaam

knopStack.addSpacer() // Sluit de centrering af

// 5. AFHANDELING EN WEERGAVE
if (config.runsInWidget) {
  Script.setWidget(widget)
} else {
  widget.presentSmall() // Small widget testweergave binnen de app
}

Script.complete()
