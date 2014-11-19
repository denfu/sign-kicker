

MatchState = {
    INITIALIZED : "initialized",
    STARTED     : "started",
    ABORTED     : "aborted",
    ENDED       : "ended"
}



MatchManager = {
    
    endMatch: function(id) {
       //Matches.remove({_id:id});
        Matches.update({_id:id}, {$set: {ender: Meteor.userId(), state : MatchState.ENDED, endDate: new Date().getTime()}});
        updateBadges();
    },
    updateMatch: function(match) {
        Matches.update({_id:match._id}, match);
        updateBadges();
    },

    abortMatch: function(id) {
       //Matches.remove({_id:id});
        Matches.update({_id:id}, {$set: {aborter: Meteor.userId(), state : MatchState.ABORTED, abortDate: new Date().getTime()}});
        updateBadges();
    },

    startMatch: function(match) {
       //Matches.remove({_id:id});
        //sendMessage(MSG_IDS.GAME_START, match)
        //teor.users.find({$or:match.places});
        //var registrationIds = $.map(Meteor.users.find({"profile.notifyOnStart":true}).fetch(), function(u){ return u.profile.registrationId;});
        //TODO: only those how play
        var registrationIds = $.map(
            Meteor.users.find({$and: [{$or:$.map(match.places, function(id) {return {_id: id}})}, {"profile.notifyOnStart":true}]}).fetch(),
                function(u){ return u.profile.registrationId;}
        );

        // all users in the game
        var gameUsers = Meteor.users.find({$or:$.map(match.places, function(id) {return {_id: id}})}).fetch();
        var gameNames = "";
        $.each(gameUsers, function(i,u){gameNames += u.username + " "}); //TODO: better
        //var registrationIds = $.map(gameUsers, function(u) {return {u}});

        sendGCMMessage(registrationIds, {msgId: MSG_IDS.GAME_START, title : "Game started", message: gameNames});
        Matches.update({_id:match._id}, {$set: {starter: Meteor.userId(), state : MatchState.STARTED, startDate: new Date().getTime()}});
        updateBadges();
    },

    undoAbortMatch: function(id) {
       
        Matches.update({_id:id}, {$set: {state : MatchState.INITIALIZED}});
        updateBadges();
    },

    createMatch: function() {
        var biggestNum = Matches.findOne({},{sort:{num:-1}});
        var match = {
            creator         : Meteor.userId(),
            creationDate    : new Date().getTime(),
            startDate       : null,
            starter         : null,
            endDate         : null,
            abortDate       : null,
            aborter         : null,
            ender           : null,
            state           : MatchState.INITIALIZED,
            placesReservedBy: [null, null, null, null],    
            places          : [null, null, null, null],
            num             : biggestNum? biggestNum.num + 1 : 1
        }

        Matches.insert(match, function(err, matchInserted){
            if (err) {
                //TODO: log fail
            }
        });

        var author = Meteor.user().profile? Meteor.user().profile.username : Meteor.user().username;
        sendGCMMessageWithFilter({msgId: MSG_IDS.NG, author: author, txt:"New match just created (#"+match.num+")."}, function(user){
            return user.profile.notifyAdd && user._id !== Meteor.userId();
        });

        return match;
    },

    getMatches: function() {
        var timeThreshhold = new Date().getTime() - (1000 * 60 * 1);
        return Matches.find(
            {
                $and: [{
                    $or : [
                        {state : {$ne: MatchState.ABORTED}}, 
                        {abortDate: {$gt: timeThreshhold}}
                        ]
                }, {
                    $or : [
                        {state : {$ne: MatchState.ENDED}}, 
                        {endDate: {$gt: timeThreshhold}}
                        ]
                }]                
            },
            {sort: { creationDate: -1 }}
        ).fetch(); //TODO: no ended 
    },

    getMatchById: function(id) {
        return Matches.findOne({_id:id});
    }
};




if (Meteor.isClient) {
    Router.configure({layoutTemplate:"main"});

    Router.route('/', function () {
        this.render('masterTemplate');
        this.render("matchList", {to:"containerContent"});
        this.render("chat", {to:"footer"});
    });

   
    Router.route('/users', function () {
        this.render('masterTemplate');
        this.render('users', {to:"containerContent"});
    });

    Router.route('/registerGCM', function () {
        //this.render("matchList", {to:"containerContent"});
        this.render('masterTemplate', {
            data : function() {
                return {registerGCM: true};
            }
        });
    });

   

    Router.route('/invitation/:_id', function () {

        this.render('registration', {
            data: function () {
              return {url: this.params._id};//Posts.findOne({_id: this.params._id});
            }
        });
    });



    /*Meteor.subscribe('allUsers');
    Meteor.subscribe('allMatches');
    Meteor.subscribe('allChats');
    Meteor.subscribe('configAll');*/

    Accounts.ui.config({      
        passwordSignupFields: 'USERNAME_ONLY'
    });

    


    Template.statelabel.helpers({
        getStateLabelName : function() {
            if (this.state.toString() === MatchState.STARTED) {
                return "started at " + getFormattedTime(new Date(this.startDate));// + "/ " + I18N[this.state.toString()];
            }
            return I18N[this.state.toString()] || this.state.toString();
        },
        getStateLabelCls : function() {
            switch (this.state.toString()) {
                case MatchState.STARTED:
                    return "success";
                case MatchState.ABORTED:
                    return "danger";
                case MatchState.INITIALIZED:
                    return "default";
                case MatchState.ENDED:
                    return "primary";
            }
        }
    });

    isMatchAboutToStart = function(match) {
        if (MatchState.ABORTED === match.state || match.state === MatchState.STARTED) {
            return false;
        }

        var foundEmpty = false;
        $.each(match.places, function(index, value) {
            if (value === null) {
                foundEmpty = true;
                return;
            }
        });

        return !foundEmpty;
    },

    Template.matchList.helpers({

        calloutIfStarted : function() {
            if (this.state === MatchState.STARTED) {
                return "bs-callout bs-callout-green"
            }
            return "";
        },

        isStarted :     function() {
            return this.state === MatchState.STARTED;
        },

        isEnded :     function() {
            return this.state === MatchState.ENDED;
        },

        isMatchAboutToStart : function() {
            return isMatchAboutToStart(this);
            /*
            if (MatchState.ABORTED === this.state || this.state === MatchState.STARTED) {
                return false;
            }

            var foundEmpty = false;
            $.each(this.places, function(index, value) {
                if (value === null) {
                    foundEmpty = true;
                    return;
                }
            });

            return !foundEmpty;*/
        },

        isMatchAbortedOrStarted : function() {
            return MatchState.ABORTED === this.state || this.state === MatchState.STARTED;           
        },

        getMatches: function() {
            return MatchManager.getMatches();
        },

        isMatchAborted: function() {
            return MatchState.ABORTED === this.state;
        },

        getStateClass: function() {
            return "";//"y-state-"+this.state;
        }
    });

    Template.switch.helpers({
        getName: function(match, i) {
            var userId = match.places[i];
            if (!userId) {
                return I18N.openPlace;
            } else if (userId === Const.UNKNOWN_USER) {
                return I18N.unknownPlace;
            } 

            var user = Meteor.users.findOne({_id: userId});
            if (!user) {                    
                return I18N.unknownPlace;
            }

            if (userId === Meteor.userId()) {
                return I18N.you;
            }
            
            return user.profile? user.profile.username : user.username;//emails[0].address.substr(0, 5);
        }
    });

    Template.placeButton.helpers({
       
       disableoverlay: function() {
            if (this.match.state === MatchState.ABORTED || this.match.state === MatchState.STARTED || this.match.state === MatchState.ENDED) {
                return "y-disable-overlay";
            }
       },
       
       //unused
        getPlace: function(places, index) {
            return places[index] === null? "Leer" : places[index];
        },

        isUnset: function(places, index) {
            return !places[index];
        },

        isThisUser: function(places, index) {
            return Meteor.userId() === places[index];
        }
    });


    Template.actionbar.helpers({
        isNotHome : function() {
            if (!Session.get("switchPath")) {
                return location.pathname !== "/";
            }
            return Session.get("switchPath") !== "/"
        }
        /*,

        switchPathIcons : function() {
            if (Session.get("switchPath") === "/games") {
                return "gamepad";
            }

            return "key";        
        },

        switchPath : function() {
            if (location.pathname === "/games") {
                Session.set("switchPath", "/");
                
            } else {
                Session.set("switchPath", "/games");                
            }

            return Session.get("switchPath");
        }*/
    });

  Template.actionbar.events({
    'click .y-switchpath' :function() {
        if (Session.get("switchPath") !== "/") {
            Session.set("switchPath", "/");                
        } else {
            Session.set("switchPath", "/games");                
        }
    },
    'click .y-profile-btn' : function() {
           
        $('#modal-profile').modal();
    },

    'click .y-create-match' :  function() {
        //MatchManager.createMatch(); 
        var newMatch = MatchManager.createMatch();
        var target = "#num-" + (newMatch.num-1);
        var targetTag = $(target);
        
        if (!target) {
            return ;
        }

        //targetTag[0].scrollIntoView();
        
    }
  });

    Template.masterTemplate.rendered = function() {
        if (!Meteor.userId()) {
            Accounts._loginButtonsSession.set('dropdownVisible', true);
        }
    };

    

    Template.masterTemplate.helpers({
        registerGCM : function() {
            if (this.registerGCM) {
                //if ready
                sendMessage(MSG_IDS.REGISTER_GCM, Meteor.user(), function(result) {
                    //console.log(result);
                    Router.go("/");
                });
                Router.go("/");
            }
            //return location.pathname;
        },
        isNotChrome: function() {
            if (Const.ENABLE_OTHER_BROWSERS) {
                return false;
            } 
            return !isChrome();            
        }
        /*,
        syncChromeWithAccount : function() {//TODO: can be removed
            if (!Session.get(Const.CHROM_SYNCED_ALREADY)) {
                Session.set(Const.CHROM_SYNCED_ALREADY, true);
                // send chrome message to have set the current users profile and id                
                syncProfileWithChrome(this.chromeUserId);
            }
            //return this.chromeUserId;
        }*/
    });

  
    
    Template.profile_dialog.events({
        'click .save-profile-btn' : function() {
            
            var form = {profile:{}};

            $.each($('#profile-form input'), function(){
                if (this.id.indexOf("y-admin") >= 0) {
                    ConfigManager.setAllowRegistration(this.checked);
                } else {
                    switch(this.type) {
                    case 'text':
                        if (this.value) {
                            form.profile[this.id] = this.value;                            
                        }
                        break;
                    case 'checkbox':
                        form.profile[this.id] = this.checked;
                        break;
                    default:
                        break;
                    }
                }
            });

            var userprofile = $.extend(Meteor.user().profile, form.profile);
            form.profile = userprofile;
            Meteor.users.update({_id: Meteor.userId()}, {$set:form}, function(){
                //syncProfileWithChrome();
                 //sendMessage(MSG_IDS.PROFILE_CHANGE, form);
            });
            
            $('#modal-profile').modal('hide');


           
            

            //do validation on form={firstname:'first name', lastname: 'last name', email: 'email@email.com'}



        }
    });
    
    var canPlayerChangeMatch = function(match) {
        if (ConfigManager.isAdmin()) {
            return true;
        }

        var players = $.map(match.places, function(p) {if (p !== Const.UNKNOWN_USER) {return p}}).length;
        if (players > 0 && match.places.indexOf(Meteor.userId()) < 0) {
            return false; // not allowed
        }
        return true;
    }
 

    Template.matchList.events({
        'click .y-about-to-start-btn': function (e,a) {
        //var matchId = e.currentTarget.dataset.matchid;
        if (!canPlayerChangeMatch(this)) {
            return ; // not allowed
        }
        MatchManager.startMatch(this);
    }, 

    'click .y-ended-btn': function (e,a) {
        //var matchId = e.currentTarget.dataset.matchid;
       if (!canPlayerChangeMatch(this)) {
            return ; // not allowed
        }
        MatchManager.endMatch(this._id);
    },




    'click .y-abort-btn': function (e,a) {
        //var matchId = e.currentTarget.dataset.matchid;
        if (!canPlayerChangeMatch(this)) {
            return ; // not allowed
        }
        MatchManager.abortMatch(this._id);
    },

    'click .y-abort-undo-btn': function (e,a) {
       if (!canPlayerChangeMatch(this)) {
            return ; // not allowed
        }
        MatchManager.undoAbortMatch(this._id);
    },

    'click a.y-btn-place': function (e,a) {
        var matchId = $(e.currentTarget).parents(".list-group-item")[0].dataset.matchid;
        //var state = e.currentTarget.dataset.state;
        var index = e.currentTarget.dataset.index;
        var match = MatchManager.getMatchById(matchId);
        var place = match.places[index];
        var userId = Meteor.userId();
        var alreadSet = match.places.indexOf(userId) >= 0;
        
        if (!place && !alreadSet) {
            match.places[index] = Meteor.userId()
        } else if (!place) {
            match.places[index] = Const.UNKNOWN_USER;
        } 
        //else if (place === Meteor.userId()) {
        //    match.places[index] = null;
        else if (place !== Const.UNKNOWN_USER && place !== userId) {
            
        }
        else {
                match.places[index] = null;
        }

        if (isMatchAboutToStart(match)) {

            var registrationIds = $.map(
            Meteor.users.find({$and: [{$or:$.map(match.places, function(id) {return {_id: id}})}, {"profile.notifyOnFull":true}]}).fetch(),
                function(u){ return u.profile.registrationId;}
            );

            // all users in the game
            var gameUsers = Meteor.users.find({$or:$.map(match.places, function(id) {return {_id: id}})}).fetch();
            var gameNames = "";
            $.each(gameUsers, function(i,u){gameNames += u.username + " "}); //TODO: better
            //var registrationIds = $.map(gameUsers, function(u) {return {u}});

            sendGCMMessage(registrationIds, {msgId: MSG_IDS.GAME_ABOUT_TO_START, title : "Game may start", message: gameNames});

            

        }

        

        MatchManager.updateMatch(match);
    } 
  });

    

}



if (Meteor.isServer) {
    //Meteor.users.allow({update: function () { return true; }});

    Meteor.publish("allUsers", function () {
      return Meteor.users.find({});
    });

    Meteor.publish("allMatches", function () {
      return Matches.find({});
    }); 

    Meteor.publish("allChats", function () {
      return Chats.find({});
    });

    Meteor.publish("configAll", function () {
      return Config.find({});
    });

    Accounts.onCreateUser(function(options, user) {
        var registrationAllowed = ConfigManager.getConfig().allowRegistration;
        var isAdminCreation = user.username === "dennisf";
        console.log("registrationAllowed: " + registrationAllowed);
        console.log("isAdminCreation: " + isAdminCreation);
        
        if (!isAdminCreation && !registrationAllowed) {

            var invitation = Invitations.findOne({url:options.url, inUse:false});
            console.log("invitation: ");
            console.log(invitation);

            if (!invitation) {
                throw new Error("invalid.invitation.error");
            }

            Invitations.remove({_id:invitation._id});
            //Invitations.update({_id:invitation._id}, {$set: {inUse:true}});
        }

        user.profile = {
            notifyOnStart : true,
            notifyOnMsg : true,
            notifyAdd : true,
            notifyOnFull : true,
            username : user.username
        }
        return user;
    });

    gcm = Meteor.npmRequire('node-gcm');
    sender = new gcm.Sender(Const.GCM_ID);

    Meteor.methods({
        'sendGCMMessage': function sendGCMMessage(registrationIds, data) {
            if (!registrationIds || registrationIds.length < 1) {
                return ;
            }

            /*if (!msgId || typeof(msgId) !== "string") {
                console.log("[sendGCMMessage] : illegal msgId");
                throw new Error("illegal msgId");
            }*/

            console.log("[" + data.msgId + "] try send");//"to " + registrationIds);

            //data.msgId = msgId;

            /*var gcm = Meteor.npmRequire('node-gcm');
            var sender = new gcm.Sender(Const.GCM_ID);*/

            // or with object values
            var message = new gcm.Message({
                //collapseKey: 'demo',
                delayWhileIdle: false,
                timeToLive: 10,
                data: data
            });

            
            
            /**
             * Params: message-literal, registrationIds-array, No. of retries, callback-function
             **/
            sender.send(message, registrationIds, 4, function (err, result) {
                if (err) {
                    console.log(err);
                }
                /*console.log("result:");
                console.log(result);*/
            });

        }
    });


    Meteor.startup(function () {
        var dennis = Meteor.users.findOne({username: "dennisf"});
        if (!dennis) {
            console.log("Created Admin");
            Accounts.createUser({username: "dennisf", password: "admin"}); 
        } else {
            console.log("Admin creation skipped");
        }

        var config = Config.findOne({});
        if (!config) {
            var c = {
                admin : "dennisf",
                allowRegistration : true
            }
            Config.insert(c);
            console.log("Config created");
        } else {
            console.log("Config creation skipped");
        }
    // code to run on server at startup

    });
}
