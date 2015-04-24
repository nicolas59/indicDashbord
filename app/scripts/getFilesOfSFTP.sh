#! /bin/sh
# Ce script permet de se connecter sur le serveur SFTP dans le but de recuperer les fichiers de log mis à disposition.
# Une fois les fichiers recuperés, des traitements avec awk sont réalisés:
#   - ajout des entetes CSV.
#   - suppression des données inutiles sur les logs apaches

#########################################################################################################################
#                                                                                                                       #
# Verification des parametres                                                                                           #
#                                                                                                                       #
#########################################################################################################################
if [ $# -ne 2 ]
then
        echo "Le nombre de parametre est incorrect."
        echo "sh getFilesOfSFTP.sh <CONNEXION_SFTP> <DIR_LOG>"
        echo ""
        echo "Pour plus d'information: sh getFilesOfSFTP.sh --help"
        exit
fi;
if [ $1 == "--help" ]
then
        echo "Pour lancer le script :"
        echo ""
        echo "sh getFilesOfSFTP.sh <CONNEXION_SFTP> <DIR_LOG>"
        echo ""
        echo "<CONNEXION_SFTP> correspond a la chaine de connexion au serveur SFTP"
        echo "<DIR_LOG> correspond au répertoire ou son copier les logs."
        exit
fi;

#########################################################################################################################
#                                                                                                                       #
# Declaration des variables                                                                                             #
#                                                                                                                       #
#########################################################################################################################
CONNEXION_SFTP=$1
DIR_LOG=$2
sourceDir=/SARA/echange/intercosigaes/production/
DAY_DATE=$(date "+%Y%m%d")
DAY_DATE_DIR=$(date "+%Y%m%d")
DAY_DATE_LOG4J=$(date  "+%Y-%m-%d")

#########################################################################################################################
#                                                                                                                       #
# Declaration des fonctions                                                                                             #
#                                                                                                                       #
#########################################################################################################################

##
# Permet de créer les répertoire de log nécéssaire au bon fonctionnement du script
##
function createDirectory(){
	if [ -d ${DIR_LOG} ]
	then
	    mkdir -p  ${DIR_LOG}/${DAY_DATE_DIR}
		mkdir -p  ${DIR_LOG}/${DAY_DATE_DIR}/node1
	    mkdir -p  ${DIR_LOG}/${DAY_DATE_DIR}/node2
        mkdir -p  ${DIR_LOG}/${DAY_DATE_DIR}/node3
        mkdir -p  ${DIR_LOG}/${DAY_DATE_DIR}/node4
		rm -rf ${DIR_LOG}/${DAY_DATE_DIR}/node1/*
		rm -rf ${DIR_LOG}/${DAY_DATE_DIR}/node2/*
        rm -rf ${DIR_LOG}/${DAY_DATE_DIR}/node3/*
        rm -rf ${DIR_LOG}/${DAY_DATE_DIR}/node4/*
	else
	 	echo "ERREUR - Le répertoire ${DIR_LOG} n'est pas présent."
        exit 1
	fi
}


##
# Permet de récuperer les logs du jour sur le SFTP pour le serveur tomcat.
##
function get_log_tomcat(){
    nodeIndex=$1
    echo "recupération des fichiers pour le serveur node$nodeIndex "
    cd ${DIR_LOG}/${DAY_DATE_DIR}/node${nodeIndex}/

    #-- Recuperation fichier via sftp --
    sftp ${CONNEXION_SFTP} << EOF
            cd $sourceDir/logs_tomcat${nodeIndex}/monitoring/
            get -p monitoring_app_thread_http_${DAY_DATE}.log
            get -p monitoringLogin.log
            get -p monitoringPoolPageTapestry.log
            get -p monitoringPoolDatabase.log
            ##get -p monitoringSession.log
            quit
EOF
    #Ajout des entetes aux fichiers CSV
    echo "date;dateHeure;login;ip" >> temp
    cat monitoringLogin.log >> temp
    mv temp monitoringLogin.log

    echo "date;heure;nbrConnexion;nbrConnexionOccupe;nbrIdleUseConnexion;maxPoolSize;numUncloseOrthanConnexion;numUserPool" >> temp
    cat monitoringPoolDatabase.log >> temp
    mv temp monitoringPoolDatabase.log

    echo "date;heure;page;inuse;available;max" >> temp
    cat monitoringPoolPageTapestry.log >> temp
    mv temp monitoringPoolPageTapestry.log

    ##echo "date;dateHeure;tomcatSession;userSession" >> temp
    ##cat monitoringSesssion.log >> temp
    ##mv temp monitoringSesssion.log

    mv monitoring_app_thread_http_* monitoring_app_thread_http.log
}

#########################################################################################################################
#                                                                                                                       #
# MAIN                                                                                                                  #
#                                                                                                                       #
#########################################################################################################################
createDirectory;
get_log_tomcat "1";
get_log_tomcat "2";
get_log_tomcat "3";
get_log_tomcat "4";

