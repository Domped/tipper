const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const started = require('electron-squirrel-startup');
const {CONST, TipWrapper, TipComparer} = require("./constants.js");
const {JSDOM} = require("jsdom");
const {readFileSync} = require("node:fs");
const { updateElectronApp } = require('update-electron-app');

let scraperWindow;
let scrapingInterval;
let mainWindow;
let updates = 0;
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}
const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  updateElectronApp();
  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  if(scrapingInterval)
  {
    clearInterval(scrapingInterval);
  }
  scrapeForData()
  scrapingInterval = setInterval(() => {
    scrapeForData()
  }, 30 * 1000)

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
async function scrapeForData()
{

  var ret = {
    "fortuna": [],
    "tipsport": []
  };

  for(var i  = 0; i < CONST.IFORTUNA_URLS.DOUBLE_TIP.length; i++  ) {
    var baseTip = CONST.IFORTUNA_URLS.MAJOR_LEAGUES[i];
    var doubleTip = CONST.IFORTUNA_URLS.DOUBLE_TIP[i];

    const resp = await fetch(baseTip)
    var baseString =await resp.text();

    const respD = await fetch(doubleTip)
    var doubleString = await respD.text();

    ret.fortuna.push(doubleString);
  }

  var tipComparer = new TipComparer();
  ret.fortuna.forEach(function(item, idx) {
    var baseTip = item
    var doc = new JSDOM(baseTip).window.document;
    var rows = doc.querySelectorAll('tr[class=""]');
    var doubleTipDiv = doc.getElementsByClassName("market")

    let pair = [];

    var pairPushed = false;
    rows.forEach((tr, index) => {

      let tip = new TipWrapper()
      tip.match = tr.getElementsByClassName("col-title")[0].getAttribute("data-value")
      let odds = tr.getElementsByClassName("odds-value");
      if(odds.length === 3)
      {
        tip.oddWinFirst = parseFloat(odds[0].textContent)
        tip.oddWinSecond = parseFloat(odds[2].textContent)

        var assoc = doubleTipDiv[index];
        var oddsDouble = assoc.getElementsByClassName("odds-value");

        tip.oddNotLossFirst = parseFloat(oddsDouble[0].textContent)
        tip.oddNotLossSecond = parseFloat(oddsDouble[2].textContent)

        if(tipComparer['fortuna'] === undefined)
          tipComparer['fortuna'] = [tip];
        else
          tipComparer['fortuna'].push(tip)
      }
    })


  })

  for(var i =0; i < CONST.TIPSPORT_URLS.MAJOR_LEAGUES.length; i++) {
    var baseTip = CONST.TIPSPORT_URLS.MAJOR_LEAGUES[i];

    if(scraperWindow) {
      scraperWindow.close();
    }

    scraperWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: false,
      }
    });

    await scraperWindow.loadURL(baseTip)
    // const savePath = path.join(app.getPath('temp'), `scraped_page_${i}.html`);
    // await scraperWindow.webContents.savePage(savePath, "HTMLComplete");

    // const html = readFileSync(savePath, 'utf8');
    const html = await scraperWindow.webContents.executeJavaScript(`
                document.documentElement.outerHTML;
            `);

    const docTipsport = new JSDOM(html).window.document;

    let pair = [];
    var matchRowsDivs = Array.from(docTipsport.getElementsByClassName("Matchstyled__Row-sc-5rxr4z-1"));

    matchRowsDivs.forEach((matchDiv) => {
      var tip = new TipWrapper()

      var matchNameDiv = matchDiv.getElementsByClassName("Matchstyled__Name-sc-5rxr4z-6");
      tip.match = matchNameDiv[0].getElementsByTagName("span")[0].textContent

      var matchOdds = Array.from(matchDiv.getElementsByClassName("BetButtonstyled__BetButton-sc-1tviux5-0"));
      if(matchOdds !== undefined && matchOdds.length === 5)
      {
        tip.platform = "tipsport"
        tip.oddWinFirst = parseFloat(matchOdds[0].getElementsByTagName("span")[0].textContent)
        tip.oddWinSecond = parseFloat(matchOdds[4].getElementsByTagName("span")[0].textContent)
        tip.oddNotLossFirst = parseFloat(matchOdds[1].getElementsByTagName("span")[0].textContent)
        tip.oddNotLossSecond = parseFloat(matchOdds[3].getElementsByTagName("span")[0].textContent)

        if(tipComparer['tipsport'] === undefined)
          tipComparer['tipsport'] = [tip]
        else
          tipComparer['tipsport'].push(tip)
      }
    })

  }

  siftData(tipComparer)
}

function siftData(data)
{
  var existingPairs = []

  data['fortuna'].forEach((tip) => {
    let s = data['tipsport'].find((val) => val.match === tip.match);
    if(s)
    {
      existingPairs.push({
        "fortuna": tip,
        "tipsport": s
      })
    }
  })

  if(mainWindow)
  {
    updates++;
    mainWindow.webContents.send("scraped", {"pairs" : existingPairs, "updates" : updates});
  }

}