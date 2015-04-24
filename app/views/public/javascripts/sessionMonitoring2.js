(function(){
/**
 * Created by ymatagne on 26/03/2014.
 */
var width = 960;
var height = 500;
var barWidth = Math.floor(width / 19) - 1;


// Creation du SVG
var svgSessions = d3.select('#graphSession').append('svg')
    .attr('width', 1000)
    .attr('height', 600)
    .append('g')
    .attr('transform', 'translate(50,50)');



//creation de la popin permettant de donner les stats.
var popinGraphPointStat = d3.select('body').append('div').attr('class', 'popinGraphPointStat').style('opacity', 0);


//Creation du graphique
d3.csv = d3.dsv(';', 'text/log');
d3.csv(getPathFiles('/monitoringSession.log'), function (error, data) {
    'use strict';
    


    if(typeof data == "undefined"){
        return;
    }

    var maxY = 0;
    var dateDuJour = null;
    var maxSessionTomcat = 0;
    var maxUtilisateursConnectes = 0;


    var validateNumber = function(data, defaultValue){
        if(isNaN(data)){
            return defaultValue!== undefined?defaultValue:0;
        }
        return data;
    }

    // Recuperation des données dans le CSV
    var lastData = null;
    data.forEach(function (d) {
        if (dateDuJour === null) {
            dateDuJour = d.date;
        }

        d.hourForPopin = formatDateToHour(d.dateHeure);
        d.heure = getHourInDate(d.dateHeure);
        d.dateHeure = formatDate(d.date, d.dateHeure);
        d.userSession = getNumber(d.userSession);
        d.tomcatSession = getNumber(d.tomcatSession);

        //calcul du maxY
        maxY = Math.max(maxY, d.userSession, d.tomcatSession);

        //calcul max Session Tomcat
         maxSessionTomcat = Math.max(maxSessionTomcat, d.tomcatSession);;
     
        //calcul max Utilisateurs Connectes
        maxUtilisateursConnectes = Math.max(maxUtilisateursConnectes, d.userSession);;
    });

//gestion des axes X et Y.
    var x = d3.time.scale()
        .domain([ formatDate(dateDuJour, '00:00:00'), formatDate(dateDuJour, '23:59:00')])
        .range([barWidth / 2, width - barWidth / 2]);

// Definition des domaines sur les axes
    var y = d3.scale.linear()
        .domain([0, maxY])
        .range([height, 0]);
    var yAxis = d3.svg.axis()
        .scale(y)
        .orient('left')
        .tickSize(-width)
        .tickFormat(function (d) {
            return d;
        });

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .ticks(d3.time.minute, 60)
        .tickFormat(d3.time.format('%H h'));


//ajout des axes dans le graphique
    svgSessions.append('g')
        .attr('class', 'y axis')
        .attr('transform', 'translate(0)')
        .call(yAxis)
        .selectAll('g');
    svgSessions.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis);

//creation d'un filtre au dessus du graphique pour permettre de creer une ligne qui se balade
    var rect = svgSessions.append('rect').attr({
        w: 0,
        h: 0,
        width: width,
        height: height,
        fill: '#ffffff'
    });

//creation de la ligne 'tomcat session'
    var createTomcatSession = d3.svg.line()
        .x(function (d) {
            return x(d.dateHeure);
        })
        .y(function (d) {
           return y(d.tomcatSession);
        });

    var lineTomcatSession = svgSessions.append('path')
        .datum(data)
        .style('stroke',function () {
            return 'blue';
        }).attr('d', createTomcatSession);

    var circleTomcatSession = svgSessions.append('circle')
        .attr('opacity', 0)
        .attr({
            r: 6,
            fill: 'darkred'

        });

//creation de la ligne 'user session'
    var createUserSession = d3.svg.line()
        .x(function (d) {
            return x(d.dateHeure);
        })
        .y(function (d) {
            return y(validateNumber(d.userSession));
        });

    var lineUserSession = svgSessions.append('path').datum(data).style('stroke',function () {
        return 'pink';
    }).attr('d', createUserSession);

    var circleUserSession = svgSessions.append('circle')
        .attr('opacity', 0)
        .attr({
            r: 6,
            fill: 'darkred'

        });


//Creation de l'axe se baladant sur le graphqique
    svgSessions.append('line').classed('linePointerX', 1).style('stroke', 'black');

//ajout du titre
    svgSessions.append('text')
        .attr('class', 'titleConnexions')
        .attr('dy', '1em')
        .text('Nombre de sessions');

//Action sur le mouvement de la souris
    rect.on('mousemove', function () {

            //declaration des variables
            var pathLength = lineUserSession.node().getTotalLength();
            var xPos = d3.mouse(this)[0];
            var beginning = xPos;
            var end = pathLength;
            var target;
            var pos;
            var valueYTomcatSession = 0;
            var valueYUserSession = 0;
          
            //deplacement de l'axe
            svgSessions.select('.linePointerX').attr('y1', 0).attr('y2', height).attr('x1', xPos).attr('x2', xPos);

            //Modification de l'emplacement pour le cercle sur la ligne 'current thread count'
            while (true) {
                target = Math.floor((beginning + end) / 2);
                pos = lineUserSession.node().getPointAtLength(target);
                if ((target === end || target === beginning) && pos.x !== xPos) {
                    break;
                }
                if (pos.x > xPos) {
                    end = target;
                }
                else if (pos.x < xPos) {
                    beginning = target;
                }
                else {
                    break; //position found
                }
            }
            circleUserSession.attr('opacity', 1)
                .attr('cx', xPos)
                .attr('cy', pos.y);

            valueYUserSession = parseInt(y.invert(pos.y));

            //Modification de l'emplacement pour le cercle sur la ligne 'current thread count'
            pathLength = lineTomcatSession.node().getTotalLength();
            xPos = d3.mouse(this)[0];
            beginning = xPos;
            end = pathLength;

            while (true) {
                target = Math.floor((beginning + end) / 2);
                pos = lineTomcatSession.node().getPointAtLength(target);
                if ((target === end || target === beginning) && pos.x !== xPos) {
                    break;
                }
                if (pos.x > xPos) {
                    end = target;
                }
                else if (pos.x < xPos) {
                    beginning = target;
                }
                else {
                    break; //position found
                }
            }
            circleTomcatSession.attr('opacity', 1)
                .attr('cx', xPos)
                .attr('cy', pos.y);


            valueYTomcatSession = parseInt(y.invert(pos.y));

            displayPopin(popinGraphPointStat, createHtmlForSesssionpPopin(x, xPos, valueYTomcatSession, valueYUserSession), d3);

        });
    //Ajout des valeurs dans le tableau des statistiques
    putInResumeStat('resume_nbrSessionTomcat', maxSessionTomcat);
    putInResumeStat('resume_nbrUtilisateursConnectes', maxUtilisateursConnectes);

    setTimeout(function(){
        updateIndicateur()
    }, 1000);

});
})();