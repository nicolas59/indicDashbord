/**
 * Created by nrousseau on 17/09/2014.
 */
(function ($) {
    var file = getPathFiles('/access.log');

    var Statistique = function(){};

    Statistique.prototype.extractData = function (dateExtract, callback) {
        d3.csv = d3.dsv(';', 'text/log');
        d3.csv(getPathFiles('/access.log', dateExtract), function (error, data) {
            if(error){
                callback();
                return;
            }
            var specialUrl = [
                "/main/prerapport/graphiques/pratiquesexigibles:radarPlotSansTitre",
                "/main/demarche/detailDemarche/MethodeEvaluation:getIdTypeDecision",
                "/main/demarche/detaildemarche/demsuivi.menu.redirectionniv3",
                "/main/demarche/detaildemarche/contributeures/gestion.menu.redirectionniv3",
                "/main/prerapport/graphiques/ensemblethematique:radarPlotSansTitre",
                "/main/referentiel/detailstructuremodifier.verifierexistencefinessgcs",
                "/main/prerapport/graphiques/criteresselectionnes:chartBarSansTitre"
            ];

            data = data.filter(function (item) {
                return item.page.indexOf("/static/") < 0;
            });

            var result = {};

            var calculPage = function (page) {
                var ret;
                specialUrl.forEach(function (item) {
                    if (page.indexOf(item) >= 0) {
                        ret = item;
                    }
                });
                if (ret === undefined) {
                    var path = page.indexOf("?") >= 0 ? page.substr(0, page.indexOf("?")) : page;
                    var pos = path.lastIndexOf("/");
                    var data = path.substr(pos + 1);
                    ret = !isNaN(data) ? path.substr(path, pos) : path
                }

                return ret;
            };

            data.forEach(function (item) {

                var page = calculPage(item.page);
                if (result[page] === undefined) {
                    result[page] = {"page": page,
                        totalTime: 0,
                        count: 0,
                        min: -1,
                        max: 0,
                        delay: [],
                        average: function () {
                            return Math.round(this.totalTime / this.count * 100) / 100;
                        },
                        calculateAverage: function (pourcentage) {
                            this.delay.sort(function (a, b) {
                                return a - b;
                            });
                            var nb = Math.floor(this.delay.length * pourcentage);
                            if (nb < 1) {
                                nb = 1;
                            }
                            var total = 0;
                            for (var index = 0; index < nb; index++) {
                                total += this.delay[index];
                            }
                            return isNaN(total) ? 0 : Math.round((total / nb) * 100) / 100;
                        }
                    }
                }
                var currentResult = result[page];
                var delay = parseInt(item.temps.split('/')[0]);
                currentResult.totalTime += delay;
                currentResult.min = currentResult.min == -1 || delay < currentResult.min ? delay : currentResult.min;
                currentResult.max = delay > currentResult.max ? delay : currentResult.max;
                currentResult.delay.push(delay);
                currentResult.count++;
            });

            callback(result);
        });
    };

    Statistique.prototype.render = function(result){
        var apacheReport = $("#apacheReport");

        var tmp = [];
        for (var key in (result)) {
            var r = result[key];
            tmp.push(r)
        }
        tmp.sort(function (a, b) {
            return b.average() - a.average();
        });
        apacheReport.find("tr").remove();
        var dt = [];
        tmp.forEach(function (item) {
            if (item.page !== "") {
                    dt.push({
                        page: item.page.length > 70 ? item.page.substr(0, 69) : item.page,
                        count: item.count,
                        min: item.min,
                        pourc80: item.calculateAverage(0.8),
                        pourc90: item.calculateAverage(0.9),
                        pourc95: item.calculateAverage(0.95),
                        max: item.max,
                        average: item.average()
                    });
            }

        });

        var table = apacheReport.parent().dataTable({
            "bPaginate": false,
            "bFilter": false,
            "bDestroy":true,
            "data": dt,
            "columns": [
                { "data": "page" },
                { "data": "count" },
                { "data": "min" },
                { "data": "pourc80" },
                { "data": "pourc90" },
                { "data": "pourc95" },
                { "data": "max" },
                { "data": "average" }
            ]
        });

        table.fnSort([
            [7, 'desc']
        ]);
        $("#export").off("click");
        $("#export").on("click", function () {
            var dt = {};
            dt.headers = [];
            dt.headers.push("page");
            dt.headers.push("count");
            dt.headers.push("min");
            dt.headers.push("80%");
            dt.headers.push("90%");
            dt.headers.push("95%");
            dt.headers.push("max");
            dt.headers.push("average");
            dt.rows = [];
            tmp.forEach(function (item) {
                dt.rows.push({
                    page: item.page,
                    count: item.count,
                    min: item.min,
                    pourc80: item.calculateAverage(0.8),
                    pourc90: item.calculateAverage(0.9),
                    pourc95: item.calculateAverage(0.95),
                    max: item.max,
                    average: item.average()
                });
            });

            $("#uploadCSV").remove();

            $("body").append("<div id='uploadCSV' style='display:none'>"+
               "<form method='post' action='/exportCSV' id='theForm'><textarea name='data'>" + JSON.stringify(dt) + "</textarea></form></div>");

            $("#theForm").submit();

        });
    }

    var stat = new Statistique();
    stat.extractData(null, stat.render);

    $("#rechercher").on("click", function (e) {
        e.preventDefault();
        var parseDate = function(date){
            return moment(date, "DD/MM/YYYY");
        }

        var dateDeb = parseDate($("#dateDeb").val());
        var dateFin = parseDate($("#dateFin").val());


        var nbDays =dateFin.diff(dateDeb,'days');
        if(nbDays<=0){
            alert("Dates de recherche invalides.");
            return;
        }
        var fullData = [];
        var callbackIndex=0;
        var callback = function(data){
             if(data && data!=null){
                for(key in data){
                    if(fullData[key] === undefined){
                        fullData[key] = data[key];
                    }else{
                        var item = fullData[key];
                        var itemData = data[key];
                        item.count+=itemData.count ;
                        item.delay = item.delay.concat(itemData.delay);
                        item.max = (item.max>itemData.max?item.max:itemData.max);
                        item.min = (item.min<itemData.min?item.min:itemData.min);
                        item.totalTime += itemData.totalTime;
                    }
                }
            }
            callbackIndex++;

            if(callbackIndex==nbDays) {
                console.log("Rafraichissement du tableau");
                stat.render(fullData);
            }
        }
        for(var index=0;index<=nbDays;index++){
            console.log("Recherche pour date : " + dateDeb.toString());
            //var dtRech = dateDeb;
            //dtRech.setDate(dateDeb.getDate());
            stat.extractData(dateDeb.toDate(), callback)
            dateDeb.add(1, "days");
        }

    });

    function addDays(date, days) {
        var result = new Date(date);
        result.setDate(date.getDate() + days);
        return result;
    }

    function daydiff(first, second) {
        return (second-first)/(1000*60*60*24);
    }

})
(jQuery);