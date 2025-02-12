const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const started = require('electron-squirrel-startup');
const {CONST, TipWrapper, TipComparer} = require("./constants.js");
const {JSDOM} = require("jsdom");
const {readFileSync} = require("node:fs");
const { updateElectronApp, UpdateSourceType} = require('update-electron-app');
const log = require('electron-log');
const ws = require('ws');
const stringSimilarity = require('string-similarity');
const {GetProfitMarginCombo} = require("./constants");
// Set the log level to 'debug' for more verbose output
log.transports.file.level = 'debug';

const socket = new ws("wss://tipperproxy-f5ba7b604485.herokuapp.com/")

socket.on('open', () => {
  console.log("WebSocket connected");
})

socket.on('message', async (data) => {
  // scrapeForData()
  let bongData = scrapeBong(data.toString())
  await scrapeForData(bongData)
});

updateElectronApp({
  updateSource:{
    type: UpdateSourceType.ElectronPublicUpdateService,
    repo: "Domped/tipper"
  },
  logger: log,
});
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
  // scrapeForData()
  // scrapingInterval = setInterval(() => {
  //   scrapeForData()
  // }, 30 * 1000)

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
async function scrapeForData(bongData)
{

  var ret = {
    "fortuna": [],
    "tipsport": []
  };

  for(var i  = 0; i < CONST.IFORTUNA_URLS.DOUBLE_TIP.length; i++  ) {
    // var baseTip = CONST.IFORTUNA_URLS.MAJOR_LEAGUES[i];
    var doubleTip = CONST.IFORTUNA_URLS.DOUBLE_TIP[i];
    //
    // const resp = await fetch(baseTip)
    // var baseString =await resp.text();

    const respD = await fetch(doubleTip)
    var doubleString = await respD.text();

    ret.fortuna.push(doubleString);
  }

  var tipComparer = new TipComparer();
  ret.fortuna.forEach(function(item, idx) {
    var baseTip = item
    var doc = new JSDOM(baseTip).window.document;
    var marketWrapper = doc.getElementsByClassName("market-with-header")

    for(let matchIndex = 0; matchIndex < marketWrapper.length; matchIndex++)
    {
      let currentMatch = marketWrapper[matchIndex]
      let marketTypes = currentMatch.getElementsByClassName("market")
      let title = currentMatch.querySelectorAll('a[class="names"]')[0].textContent.trim();

      if(marketTypes.length !== 3)
        continue;


      //doubleTip
      var doubleTipMarket = marketTypes[0];
      var doubleTipOddsGroups = doubleTipMarket.getElementsByClassName("odds-group")[0].getElementsByClassName("odds-button");

      if(doubleTipOddsGroups.length === 3)
      {
        let n =new TipWrapper()
        n.match = title;
        n.type = "DOUBLE_TIP";

        n.oddWinFirst = parseFloat(doubleTipOddsGroups[0].querySelector('span[class="odds-value"]').innerHTML)
        n.oddWinSecond = parseFloat(doubleTipOddsGroups[2].querySelector('span[class="odds-value"]').innerHTML)



        if(tipComparer['fortuna'] === undefined)
          tipComparer['fortuna'] = [n];
        else
          tipComparer['fortuna'].push(n)

      }

      //handicap
      var handicapMarket = marketTypes[2];
      var handicapOddsGroups = handicapMarket.querySelectorAll("div[class='odds-group']");
      handicapOddsGroups.forEach((oddsGroup, index) => {
        let oddsValTemp = oddsGroup.querySelectorAll("span[class='odds-value']");
        let oddsHandicapType = oddsGroup.querySelector("span[class='odds-name']");
        let handicapType = oddsHandicapType.childNodes[0].nodeValue.trim().match(/[-+]?\d*\.?\d+/g)[0].replace(/^[-+]/, '');

        let oddsValueLeft = oddsValTemp[0].innerHTML;
        let oddsValueRight = oddsValTemp[1].innerHTML;

        if(properOdds(oddsValueLeft) || properOdds(oddsValueRight))
        {
          let n = new TipWrapper()
          n.match = title;
          n.type = "HANDICAP";

          n.oddWinFirst = properOdds(oddsValueLeft) ? parseFloat(oddsValTemp[0].innerHTML) : 0;
          n.oddWinSecond = properOdds(oddsValueRight) ? parseFloat(oddsValTemp[1].innerHTML) : 0;
          n.hendicap = parseFloat(handicapType);

          if(tipComparer['fortuna'] === undefined)
            tipComparer['fortuna'] = [n];
          else
            tipComparer['fortuna'].push(n)
        }
      })

      //goalsOverUnder
      var goalsMarket = marketTypes[1];
      var goalsOddsGroups = goalsMarket.querySelectorAll("div[class='odds-group']");
      goalsOddsGroups.forEach((oddsGroup, index) => {
        let oddsValTemp = oddsGroup.querySelectorAll("span[class='odds-value']");
        let oddsGoalsType = oddsGroup.querySelector("span[class='odds-name']");
        let goalsType = oddsGoalsType.childNodes[0].nodeValue.trim().match(/\d*\.?\d+/g)[0];

        let oddsValueLeft = oddsValTemp[0].innerHTML;
        let oddsValueRight = oddsValTemp[1].innerHTML;

        if(properOdds(oddsValueLeft))
        {
          let n = new TipWrapper()
          n.match = title;
          n.type = "GOALS_OVER_UNDER";

          n.oddWinFirst = parseFloat(oddsValueLeft);
          n.oddWinSecond = 0;
          n.goals = parseFloat(goalsType);

          if(tipComparer['fortuna'] === undefined)
            tipComparer['fortuna'] = [n];
          else
            tipComparer['fortuna'].push(n)
        }
      })
    }
  })

  siftData(tipComparer, bongData)
  return;
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
        webSecurity: true,
      }
    });

    scraperWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      console.error(`Failed to load ${validatedURL}: [${errorCode}] ${errorDescription} (isMainFrame: ${isMainFrame})`);
    });

    scraperWindow.webContents.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36"
    );
    await scraperWindow.loadURL(baseTip).catch(error => {
      console.error(error)
    })
    // const savePath = path.join(app.getPath('temp'), `scraped_page_${i}.html`);
    // await scraperWindow.webContents.savePage(savePath, "HTMLComplete");

    // const html = readFileSync(savePath, 'utf8');
    const html = await scraperWindow.webContents.executeJavaScript(`
                document.documentElement.outerHTML;
            `);

    const docTipsport = new JSDOM(html).window.document;

    mainWindow.webContents.send("test", {"docTipsport": html});

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


}

function properOdds(odds)
{
  return parseFloat(odds) >= 1.69 && parseFloat(odds) < 2.41;
}
function properHandicap(handicap)
{
  return handicap === "0.5" ||
      handicap === "1.0" ||
      handicap === "1.5" ||
      handicap === "2.0" ||
      handicap === "2.5" ||
      handicap === "3.0" ||
      handicap === "3.5" ||
      handicap === "4.0" ||
      handicap === "4.5" ||
      handicap === "5.0" ||
      handicap === "5.5" ||
      handicap === "6.0" ||
      handicap === "6.5";
}

function bongGetOverAndUnder(groups)
{

}

function bongGetOddsFromCol(groups)
{

  let odds = [];

  for(let i = 0; i < groups.length; i++) {
    let group = groups[i];
    let row = {}
    let rowGoals = {}
    if(i === 0)
    {
      const teamsNamesRows = group.getElementsByClassName("c-match__event")[0];
      const teamsNames = teamsNamesRows.getElementsByClassName("c-match__team");
      const teamNameOne = teamsNames[0].getElementsByTagName("span")[0].textContent;
      const teamNameTwo = teamsNames[1].getElementsByTagName("span")[0].textContent;
      row['teamOneName'] = teamNameOne;
      row['teamTwoName'] = teamNameTwo;

      rowGoals['teamOneName'] = teamNameOne;
      rowGoals['teamTwoName'] = teamNameTwo;
    }

    let directOrHendicap = group.getElementsByClassName("c-bettype-col")[0]
    const firstColumnTeamOdds = directOrHendicap.getElementsByClassName("c-odds-button");


    if(firstColumnTeamOdds.length !== 0)
    {
      const TEMPHandicapRowOne = firstColumnTeamOdds[0].getElementsByClassName("c-text-goal");
      const TEMPHandicapRowTwo = firstColumnTeamOdds[1].getElementsByClassName("c-text-goal");

      const actualBettingOddsFirstTeam =  firstColumnTeamOdds[0].getElementsByClassName("c-odds")[0].textContent;
      const actualBettingOddsSecondTeam =  firstColumnTeamOdds[1].getElementsByClassName("c-odds")[0].textContent;

      const hendiNumberFirst = TEMPHandicapRowOne[0] !== undefined ? TEMPHandicapRowOne[0].innerHTML : 0;
      const hendiNumberSecond = TEMPHandicapRowTwo[0] !== undefined ? TEMPHandicapRowTwo[0].innerHTML : 0;
      const isDoubletipFirst = TEMPHandicapRowOne.length > 0 && hendiNumberFirst === '0.5';
      const isDoubletipSecond = TEMPHandicapRowTwo.length > 0 && hendiNumberSecond === '0.5';

      // console.log(hendiNumberFirst + " " +
      //     hendiNumberSecond + " " +
      //     actualBettingOddsFirstTeam + " " +
      //     actualBettingOddsSecondTeam)
      //
      // console.log(properHandicap(hendiNumberFirst) + " " +
      //     properHandicap(hendiNumberSecond) + " " +
      //     properOdds(actualBettingOddsFirstTeam) + " " +
      //     properOdds(actualBettingOddsSecondTeam))
      if(
          (properHandicap(hendiNumberFirst) ||
          properHandicap(hendiNumberSecond)) &&
          properOdds(actualBettingOddsFirstTeam) &&
          properOdds(actualBettingOddsSecondTeam)
      )
      {
        row['isDoubletipFirst'] = isDoubletipFirst;
        row['isDoubletipSecond'] = isDoubletipSecond;
        row['hendicapFactorFirst'] = hendiNumberFirst;
        row['hendicapFactorSecond'] = hendiNumberSecond;
        row['actualBettingOddsFirstTeam'] = actualBettingOddsFirstTeam;
        row['actualBettingOddsSecondTeam'] = actualBettingOddsSecondTeam;
      }
    }

    odds.push(row);
    let overUnderGoals = group.getElementsByClassName("c-bettype-col")[1]
    const secondColumnOdds = overUnderGoals.getElementsByClassName("c-odds-button");

    if(secondColumnOdds.length!== 0)
    {
      const TEMPoverUnderRowOne = secondColumnOdds[0].getElementsByClassName("c-text-goal");
      const TEMPoverUnderRowTwo = secondColumnOdds[1].getElementsByClassName("c-text-goal");

      const actualBettingOddsFirstTeam =  secondColumnOdds[0].getElementsByClassName("c-odds")[0].textContent;
      const actualBettingOddsSecondTeam =  secondColumnOdds[1].getElementsByClassName("c-odds")[0].textContent;

      const hendiNumberFirst = TEMPoverUnderRowOne[0] !== undefined ? TEMPoverUnderRowOne[0].innerHTML : 0;
      const hendiNumberSecond = TEMPoverUnderRowTwo[0] !== undefined ? TEMPoverUnderRowTwo[0].innerHTML : 0;

      if(
          (properHandicap(hendiNumberFirst) ||
              properHandicap(hendiNumberSecond)) &&
          properOdds(actualBettingOddsFirstTeam) &&
          properOdds(actualBettingOddsSecondTeam)
      )
      {
        rowGoals['isGoals'] = true; // 0 or 1
        rowGoals['goalsOverFirst'] = parseFloat(hendiNumberFirst);
        rowGoals['goalsOverSecond'] = parseFloat(hendiNumberSecond);
        rowGoals['actualBettingOddsFirstTeam'] = parseFloat(actualBettingOddsFirstTeam);
        rowGoals['actualBettingOddsSecondTeam'] = parseFloat(actualBettingOddsSecondTeam);

      }
    }

    odds.push(rowGoals);
  }

  return odds;
}

function scrapeBong(htmlString)
{
  const doc = new JSDOM(htmlString).window.document;
  const rows = doc.getElementsByClassName("c-match");

  let tips = []

  for(let i = 0; i < rows.length; i++) {
    let row = rows[i];
    const matchOdssColumnsRows = row.getElementsByClassName("c-match__odds")

    let hendicapDoubletipExtracted = bongGetOddsFromCol(matchOdssColumnsRows);

    hendicapDoubletipExtracted.forEach((extract, index) => {
      let newTip = new TipWrapper();
      newTip.platform = "";
      newTip.match = hendicapDoubletipExtracted[0]['teamOneName'] + " - " + hendicapDoubletipExtracted[0]['teamTwoName'];

      if(extract.isDoubletipFirst)
      {
        newTip.type = "DOUBLE_TIP_FIRST";
        newTip.oddWinFirst = parseFloat(extract['actualBettingOddsFirstTeam']);
      }
      else if(extract.isDoubletipSecond)
      {
        newTip.type = "DOUBLE_TIP_SECOND";
        newTip.oddWinSecond = parseFloat(extract['actualBettingOddsSecondTeam']);
      }
      else if(extract.hendicapFactorFirst !== 0 && extract.hendicapFactorFirst !== undefined)
      {
        newTip.type = "HANDICAP_FIRST";
        newTip.oddWinFirst = parseFloat(extract['actualBettingOddsFirstTeam']);
        newTip.hendicap = parseFloat(extract['hendicapFactorFirst']);
      }
      else if(extract.hendicapFactorSecond !== 0 && extract.hendicapFactorFirst !== undefined){
        newTip.type = "HANDICAP_SECOND";
        newTip.oddWinSecond = parseFloat(extract['actualBettingOddsSecondTeam']);
        newTip.hendicap = parseFloat(extract['hendicapFactorSecond']);
      }
      else if(extract['isGoals'] !== undefined && extract['isGoals'] === true && extract.goalsOverFirst !== 0)
      {
        newTip.type = "GOALS_OVER_FIRST";
        newTip.oddWinFirst = parseFloat(extract['actualBettingOddsFirstTeam']);
        newTip.goals = extract['goalsOverFirst'];
      }
      else if(extract['isGoals'] !== undefined && extract['isGoals'] === true && extract.goalsOverSecond !== 0)
      {
        newTip.type = "GOALS_OVER_SECOND";
        newTip.oddWinSecond = parseFloat(extract['actualBettingOddsSecondTeam']);
        newTip.goals = extract['goalsOverSecond'];
      }

      if(extract !== {} && newTip.type !== "")
      {
        tips.push(newTip);
      }
    })

    // const directOrHendicapOddsSecond = oddsRowTwo.getElementsByClassName("c-bettype-col")[0];
    // const teamOdds = directOrHendicapOdds.getElementsByClassName("c-odds-button");
    //
    // const teamOneHendicap = teamOdds[0].textContent;
    // const teamTwoHendicap = teamOdds[1].textContent;

  }
  // mainWindow.webContents.send("test", {"testPairs" : tips});

  return tips;
}

function TipPair(bongTip, tip)
{
  if((bongTip.type === "DOUBLE_TIP_FIRST" && tip.type === "DOUBLE_TIP") || (bongTip.type === "HANDICAP_FIRST" && tip.type === "HANDICAP"))
  {
    if(bongTip.oddWinFirst !== 0)
    {
      let pl = GetProfitMarginCombo(bongTip.oddWinFirst, tip.oddWinSecond) * 100;
      if( bongTip.hendicap === tip.hendicap) // pl > -0.9 && parseFloat(tip.oddWinSecond) !== 0 &&
      {
        return {
          match: tip.match,
          pl: pl,
          TEMPoddFirst: parseFloat(bongTip.oddWinFirst),
          TEMPoddSecond: parseFloat(tip.oddWinSecond),
          type: bongTip.type.toString().includes("DOUBLE_TIP") ? "Dvojtip" : "Handicap"
        }
      }
    }
  }
  else if((bongTip.type === "DOUBLE_TIP_SECOND" && tip.type === "DOUBLE_TIP") || (bongTip.type === "HANDICAP_SECOND" && tip.type === "HANDICAP"))
  {
    let pl = GetProfitMarginCombo(tip.oddWinFirst, bongTip.oddWinSecond) * 100
    if(bongTip.hendicap === tip.hendicap) //pl > -0.9 && parseFloat(tip.oddWinFirst)!== 0
    {
      return {
        match: tip.match,
        pl: pl,
        TEMPoddFirst: parseFloat(tip.oddWinFirst),
        TEMPoddSecond: parseFloat(bongTip.oddWinSecond),
        type: bongTip.type.toString().includes("DOUBLE_TIP") ? "Dvojtip" : "Handicap"
      }
    }
  }
  // else if((bongTip.type === "GOALS_OVER_FIRST" && tip.type === "GOALS_OVER_UNDER"))
  // {
  //   console.log("-------------------------")
  //   console.log(bongTip)
  //   console.log(tip)
  //   console.log("-------------------------")
  // }
  else if((bongTip.type === "GOALS_OVER_FIRST" && tip.type === "GOALS_OVER_UNDER") && parseFloat(bongTip.goals) === parseFloat(tip.goals))
  {
    let pl = GetProfitMarginCombo(bongTip.oddWinFirst, tip.oddWinFirst) * 100;
    return {
      match: tip.match,
      pl: pl,
      TEMPoddFirst: parseFloat(bongTip.oddWinFirst),
      TEMPoddSecond: parseFloat(tip.oddWinFirst),
      type: "GOLY 1"
    }
  }
  else if((bongTip.type === "GOALS_OVER_SECOND" && tip.type === "GOALS_OVER_UNDER") && parseFloat(bongTip.goals) === parseFloat(tip.goals))
  {
    let pl = GetProfitMarginCombo(bongTip.oddWinSecond, tip.oddWinFirst) * 100;
    return {
      match: tip.match,
      pl: pl,
      TEMPoddFirst: parseFloat(bongTip.oddWinSecond),
      TEMPoddSecond: parseFloat(tip.oddWinFirst),
      type: "GOLY 2"
    }
  }

  return undefined;
}

function TransformTeamName(team)
{

  if(team === "PSG")
  {
    return "Paris Saint Germain";
  }
  if(team === "Dortmund")
  {
    return "Borussia Dortmund";
  }
  if(team === "Sporting CP")
  {
    return "Sporting Lisbon"
  }
  if(team === "Man.City")
  {
    return "Manchester City";
  }
  return team;
}
function PreprocessMatchNames(matchName)
{
  let matchParts = matchName.split(" - ");
  let teamOne = TransformTeamName(matchParts[0].trim());
  let teamTwo = TransformTeamName(matchParts[1].trim());
  return teamOne + " - " + teamTwo;
}
function siftData(data, bongData)
{
  var existingPairs = []

  let comparer = []
  bongData.forEach((bongTip) => {
    let tipsportCompare = undefined
    // let tip = data['tipsport'].find((tip) => stringSimilarity.compareTwoStrings(tip.match, bongTip.match) >= 0.5);
    //
    // if(tip !== undefined)
    // {
    //   let double =TipPair(bongTip, tip)
    //   if(double!== undefined)
    //     comparer.push(double);
    // }
    let d = data['fortuna'].filter((tip) => stringSimilarity
        .compareTwoStrings(PreprocessMatchNames(tip.match), PreprocessMatchNames(bongTip.match)) >= 0.7);


    if(d !== undefined)
    {
      d.forEach((dd) => {
        let double = TipPair(bongTip, dd)
        if(double!== undefined)
        {
          comparer.push(double);
        }
      })


    }
  });

  // data['fortuna'].forEach((tip) => {
  //   let s = data['tipsport'].find((val) => val.match === tip.match);
  //   if(s)
  //   {
  //     existingPairs.push({
  //       "fortuna": tip,
  //       "tipsport": s
  //     })
  //   }
  // })

  if(mainWindow)
  {
    updates++;
    mainWindow.webContents.send("scraped", {"pairs" : comparer, "updates" : updates});
  }

}

//multi-pc support
//fortuna,tipsport (chance),bong88
//fortuna-tipsport
// --favorit 1,7 az 2,4 primy .... pocet golu... hedicap (0, -1, -1.5)... jestli sedi rozmezi, muzeme srovnat
// --pl < 1%.... kdyz se blizi k 0, upozornit say
// {predcisli, kdo vyhraje}
// {}
// 0,5 ==> hledam dvjotip else hendicap
//