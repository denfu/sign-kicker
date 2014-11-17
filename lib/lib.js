Config = new Mongo.Collection("Config");
Matches = new Mongo.Collection("Matches");

Const = {
    //APP_ID : "lpcbajhjnkmenomfbnglbfelneabncdm", //locale
    APP_ID : "mpmampponpogdhdclablndjjimeeamaj",
    UNKNOWN_USER : "unknown",
    CHROM_SYNCED_ALREADY : "chromeSyncedAlready",
    ENABLE_OTHER_BROWSERS : true

};

MSG_IDS = {
    REGISTER_GCM : "registerGCM",
    BAGDE_UPDATE : "badgeUpdate",
    REGISTER_GCM_SUCCED : "registerGCMSuccsess",
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
    keygenerate     : "Generate invitation link",
    profile : {
         notifyOnStart  : "Notify on gamestart",
         notifyOnMsg  : "Notify on Message",
         notifyAdd  : "Notify on new player",
         notifyOnFull  : "Notify on game ready"
    }
};

getUUID = function() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
               .toString(16)
               .substring(1);
  }
  return function() {
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
           s4() + '-' + s4() + s4() + s4();
  };
}();

isChrome = function() {
     try {
        chrome.runtime;
    } catch(e) {
        return false;
    }
    return true;
}

updateBadges = function() {
    //var matches = MatchManager.getMatches();
    var text = "" + $.map($.map(Matches.find({state:MatchState.INITIALIZED}).fetch(), function(m) {return m.places}), function(el) {if (el !== null) return el}).length;//matches.length;
    text += "/" + Matches.find({state: MatchState.INITIALIZED}).count();//matches.length;
    var startedMatches  = Matches.find({state:MatchState.STARTED}).count();
    var registrationIds = $.map(Meteor.users.find({}).fetch(), function(u){return u.profile.registrationId});
    var color = startedMatches;

    sendGCMMessage(registrationIds, {msgId: MSG_IDS.BAGDE_UPDATE, color: color, text: text});   
}


sendMessage = function(msgId, msgObject) {
    if (!isChrome()) {
        return ;
    }

    try {
        var port = chrome.runtime.connect(Const.APP_ID);
        //port.postMessage(...);
        port.postMessage({msgId: MSG_IDS.REGISTER_GCM});
        
        port.onMessage.addListener(function(response) {

            console.log("message received: " + response.registrationId);

            Meteor.users.update({_id:Meteor.userId()}, {$set:{"profile.registrationId": response.registrationId}})
            
            port.postMessage({msgId: MSG_IDS.REGISTER_GCM_SUCCED});

            //set registration id in current user
            //Router.go("/");
        });

        //chrome.runtime.connect(Const.APP_ID);//{name:"test"});
        //chrome.runtime.sendMessage(Const.APP_ID, {msgId: msgId, msgObject: msgObject}, cb);
    } catch (e) {
        console.log("Could not communicate with chrom plugin. Not installed?");
    }
}

/*syncProfileWithChrome = function(chromeUserId) {
    var user = Meteor.user();
    if (chromeUserId) {
        user.profile.chromeUserId = chromeUserId;
        Meteor.users.update({_id:Meteor.userId()}, {$set:{"profile.chromeUserId": chromeUserId}})
    }

    
    sendMessage(MSG_IDS.PROFILE_CHANGE, {userId: Meteor.userId(), profile:user.profile});
}*/

ConfigManager = {
    isAdmin : function() {
        return Config.findOne({})? Config.findOne().admin === Meteor.user().username : false;
    },

    getConfig : function() {
        return Config.findOne({});
    },

    setAllowRegistration : function(bool) {
        var c = Config.findOne({});
        Config.update({_id: c._id}, {$set:{allowRegistration: bool}});
    }
}

sendGCMMessage = function getGists(registrationIds, data) {
    Meteor.call('sendGCMMessage', registrationIds, data);
}

getFormattedTime = function(date) {
    var toTime = function(str) {
        return str.toString().length === 1? "0" + str : str;
    };

    return (toTime(date.getHours()) 
            + ":" + toTime(date.getMinutes()) 
            + ":" + toTime(date.getSeconds())
            );
};

if (Meteor.isClient) {
    Meteor.subscribe('allUsers');
    Meteor.subscribe('allMatches');
    Meteor.subscribe('allChats');
    Meteor.subscribe('configAll');
}



Handlebars.registerHelper('isAdmin', function () {
   return ConfigManager.isAdmin();
});

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