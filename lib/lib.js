Const = {
    APP_ID : "lpcbajhjnkmenomfbnglbfelneabncdm",
    UNKNOWN_USER : "unknown",
    CHROM_SYNCED_ALREADY : "chromeSyncedAlready"

};

MSG_IDS = {
    PROFILE_CHANGE : "profileChange",
    GAME_START : "gameStart"
};

I18N = {
    openPlace       : "Free",
    unknownPlace    : "Reserved",
    you             : "You",
    typeHereText	: "Type here to chat",
    sendChat		: "send",
    profileTitle    : "Profile",
    abortButtonTooltip : "Click to abort match",
    undoButtonTooltip : "Click to undo previous abort",
    titleProfile    : "Profile",
    username        : "Username",
    password        : "Password",
    save            : "Save",
    decline         : "Cancel",
    profile : {
         notifyOnStart  : "Notify on gamestart",
         notifyOnMsg  : "Notify on Message",
         notifyAdd  : "Notify on new player",
         notifyOnFull  : "Notify on game ready"
    }
};



var getFormattedTime = function(date) {
    var toTime = function(str) {
        return str.toString().length === 1? "0" + str : str;
    };

    return (toTime(date.getHours()) 
            + ":" + toTime(date.getMinutes()) 
            + ":" + toTime(date.getSeconds())
            );
};

Handlebars.registerHelper('I18N', function (prop) {
    return I18N[prop];
});

Handlebars.registerHelper('I18NProfile', function (prop) {
    return I18N.profile[prop];
});

Handlebars.registerHelper('formatDate', function (date) {
    return getFormattedTime(new Date(date));
});

Handlebars.registerHelper('tooltipRefresh', function () {
    //$('*[data-toggle="tooltip"]').tooltip();
});

Handlebars.registerHelper('logthis', function (prefix) {
    console.log(prefix + ":");
    console.log(this);
});

/*Handlebars.registerHelper('tooltipLeft', function (msg) {
    return 'data-toggle="tooltip" data-placement="left" title="" data-original-title=""';
});*/