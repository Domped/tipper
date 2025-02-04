const CONST = {
    IFORTUNA_URLS: {
        MAJOR_LEAGUES: [
            "https://www.ifortuna.cz/sazeni/fotbal/1-anglie",
            "https://www.ifortuna.cz/sazeni/fotbal/1-italie",
            "https://www.ifortuna.cz/sazeni/fotbal/1-spanelsko",
            "https://www.ifortuna.cz/sazeni/fotbal/1-nemecko",
            "https://www.ifortuna.cz/sazeni/fotbal/1-francie"
        ],
        DOUBLE_TIP: [
            "https://www.ifortuna.cz/ajax/sazeni/fotbal/1-anglie?timeTo=&rateFrom=&rateTo=&type=M2912%7CM4551",
            "https://www.ifortuna.cz/ajax/sazeni/fotbal/1-italie?timeTo=&rateFrom=&rateTo=&type=M2912%7CM4551",
            "https://www.ifortuna.cz/ajax/sazeni/fotbal/1-spanelsko?timeTo=&rateFrom=&rateTo=&type=M2912%7CM4551",
            "https://www.ifortuna.cz/ajax/sazeni/fotbal/1-nemecko?timeTo=&rateFrom=&rateTo=&type=M2912%7CM4551",
            "https://www.ifortuna.cz/ajax/sazeni/fotbal/1-francie?timeTo=&rateFrom=&rateTo=&type=M2912%7CM4551",
        ]
    },

    TIPSPORT_URLS: {
        MAJOR_LEAGUES: [
            "https://www.tipsport.cz/kurzy/fotbal/fotbal-muzi/1-anglicka-liga-118",
            "https://www.tipsport.cz/kurzy/fotbal/fotbal-muzi/1-italska-liga-127",
            "https://www.tipsport.cz/kurzy/fotbal/fotbal-muzi/1-spanelska-liga-140",
            "https://www.tipsport.cz/kurzy/fotbal/fotbal-muzi/1-nemecka-liga-130",
            "https://www.tipsport.cz/kurzy/fotbal/fotbal-muzi/1-francouzska-liga-124"
        ],
    }
}

class TipComparer {

    platformPairs = {}
}
class TipWrapper{
    platform = "ifortuna";
    match = ""
    oddWinFirst = 0.0;
    oddWinSecond = 0.00;
    oddNotLossFirst = 0.0;
    oddNotLossSecond = 0.00;
    tipRatio = 0.0;
}

function GetProfitMarginCombo(odd1, odd2)
{
    return 1/(1/odd1+1/odd2)-1
}

module.exports = {
    CONST,
    TipComparer,
    TipWrapper,
    GetProfitMarginCombo
}