// ==========================================
// CONFIGURATIE: PAS DIT AAN NAAR JOUW SITUATIE
// ==========================================
// Vul hier de exacte naam in die DIT specifieke script heeft in Scriptable (bijv. "Hypotheek Small")
const SCRIPT_NAAM = "Hypotheek Small"; 

// Dezelfde live URL van jouw GitHub Pages website
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

// Iets ruimere verticale marges omdat we minder rijen tonen in de Small widget
widget.setPadding(14, 14, 14, 14)

if (tabelData.length === 0) {
  let foutTekst = widget.addText("Geen data")
  foutTekst.fontSize = 12
  foutTekst.textColor = Color.red()
} else {
  // Mapping tabel om de exacte posities van de grote tabel te koppelen aan je nieuwe Small labels
  // Index: 0=Nu, 1=Half Jaar, 2=Jaar, 5=Next 10K, 10=Updated
  let smallWidgetConfig = [
    { index: 0, label: "Nu" },
    { index: 1, label: "HJr" },
    { index: 2, label: "Jr" },
    { index: 5, label: "10K" },
    { index: 10, label: "Upd" }
  ];

  smallWidgetConfig.forEach((cfg, sIdx) => {
    let item = tabelData[cfg.index];
    if (!item) return;

    let rijStack = widget.addStack()
    rijStack.layoutHorizontally()
    rijStack.centerAlignContent()
    
    // Gevraagd: De nieuwe compacte labels in het grijs (#8e8e93)
    let labelTekst = rijStack.addText(cfg.label)
    labelTekst.fontSize = 10.5
    labelTekst.textColor = new Color("#8e8e93")
    labelTekst.lineLimit = 1
    
    rijStack.addSpacer() // Duwt de waarde strak naar de rechterkant
    
    let waardeStack = rijStack.addStack()
    waardeStack.layoutHorizontally()
    waardeStack.centerAlignContent()
    
    // Gevraagd: 'Nu' rij (index 0) is Groen, de rest is grijs
    let tekstKleur = (cfg.index === 0) ? new Color("#30d158") : new Color("#8e8e93");
    
    // Splits de cijfers en letters
    let onderdelen = item.waarde.match(/([0-9.,:]+|[a-zA-Z]+)/g) || [item.waarde];
    
    onderdelen.forEach((deel, deelIndex) => {
      let isLetter = /[a-zA-Z]/.test(deel);
      
      if (isLetter) {
        // Gevraagd: Verberg de 'kr'/'Kr' eenheid voor alle bedragen volledig
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
        // De getallen zelf (fontSize 12.5 om perfect te passen in het kleine vierkant)
        let tekstElement = waardeStack.addText(deel)
        tekstElement.lineLimit = 1
        tekstElement.fontSize = 12.5
        tekstElement.fontWeight = "bold"
        tekstElement.textColor = tekstKleur
      }
    })
    
    // Geef de Small widget een mooie gebalanceerde tussenruimte tussen de 5 rijen
    if (sIdx < smallWidgetConfig.length - 1) {
      widget.addSpacer(5)
    }
  })
}

// 4. DE VERVERS ACTIE (Gehele widget fungeert als transparante knop)
let encodedNaam = encodeURIComponent(SCRIPT_NAAM)
widget.url = "scriptable:///run/" + encodedNaam

// 5. AFHANDELING EN WEERGAVE
if (config.runsInWidget) {
  Script.setWidget(widget)
} else {
  widget.presentSmall() // Small widget testweergave
}

Script.complete()
