Const = {
    APP_ID : "lpcbajhjnkmenomfbnglbfelneabncdm",
    UNKNOWN_USER : "unknown",
    CHROM_SYNCED_ALREADY : "chromeSyncedAlready",
    ENABLE_OTHER_BROWSERS : true

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
    profileTitle    : "Settings",
    abortButtonTooltip : "Click to abort match",
    undoButtonTooltip : "Click to undo previous abort",
    username        : "Username",
    password        : "Password",
    save            : "Save",
    decline         : "Cancel",
    initialized     : "new",
    profile : {
         notifyOnStart  : "Notify on gamestart",
         notifyOnMsg  : "Notify on Message",
         notifyAdd  : "Notify on new player",
         notifyOnFull  : "Notify on game ready"
    }
};

isChrome = function() {
     try {
        chrome.runtime;
    } catch(e) {
        return false;
    }
    return true;
}

sendMessage = function(msgId, msgObject, cb) {
    if (!isChrome()) {
        return ;
    }

    chrome.runtime.sendMessage(Const.APP_ID, {msgId: msgId, msgObject: msgObject}, function(response) {
        //TODO: cb
    });
}

syncProfileWithChrome = function() {
    sendMessage(MSG_IDS.PROFILE_CHANGE, {userId: Meteor.userId(), profile:Meteor.user().profile});
}

var getFormattedTime = function(date) {
    var toTime = function(str) {
        return str.toString().length === 1? "0" + str : str;
    };

    return (toTime(date.getHours()) 
            + ":" + toTime(date.getMinutes()) 
            + ":" + toTime(date.getSeconds())
            );
};

Handlebars.registerHelper('isChrome', function () {
   return isChrome();
});

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